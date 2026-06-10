/**
 * layer-manager.js — owns the lifecycle of every map layer.
 *
 * This module is the bridge between the sidebar UI and the actual Mapbox
 * sources/layers.  Its main jobs are:
 *
 *   1. Keep track of which layers are loaded, loading, and active.
 *      Only one layer is visible at a time across all groups.
 *
 *   2. Load layer data on first use, then cache it so switching back to a
 *      previously visited layer is instant (no re-fetch, no re-render).
 *
 *   3. Dispatch to the right loader depending on layer type:
 *        tiff               → tiff-loader.js (canvas → Mapbox image source)
 *        geojson-choropleth → fetch + addChoropleth()
 *        geojson-bivariate  → fetch + addBivariate()
 *
 *   4. Call legend.js after every activation so the legend always matches
 *      what's on the map.
 *
 * Mapbox layers added per type:
 *   tiff               → one raster layer: <id>
 *   geojson-choropleth → two layers: <id>-fill, <id>-line
 *   geojson-bivariate  → two layers: <id>-fill, <id>-line
 *
 * Call activateLayer(map, def) from the sidebar whenever the user selects a
 * different layer.
 */

import { addTiffLayer }             from './tiff-loader.js';
import { renderLegend, hideLegend } from './legend.js';

// Layers that have been fully added to the map (source + layers created).
const loaded = new Set();

// Layers currently being fetched/decoded — prevents duplicate requests if
// the user clicks the same layer twice before it finishes loading.
const loading = new Set();

// Loader-computed metadata keyed by layer id, e.g. { min, max, prop } for
// rasters or { swatches } for bivariate layers.  Cached so we can re-render
// the legend without re-loading data when the user switches tabs and back.
const metaCache = {};

// The layer id that is currently set to visible.  Null before first activation.
let activeLayerId = null;

// ── Public ────────────────────────────────────────────────────────────────────

/** Reserved for any future setup that needs to happen before first use. */
export function initLayerManager() {}

/**
 * Makes def the active (visible) layer.
 *
 *   1. Hides the previously active layer (if any).
 *   2. Loads the data if this layer hasn't been seen before.
 *   3. Sets the layer visible.
 *   4. Re-renders the legend.
 *
 * @param {mapboxgl.Map} map - the live map instance
 * @param {object}       def - layer definition from layers.js
 */
export async function activateLayer(map, def) {
  // Hide the old layer before showing the new one.
  if (activeLayerId && activeLayerId !== def.id) {
    const { LAYERS } = await import('./layers.js');
    const prev = LAYERS.find(l => l.id === activeLayerId);
    if (prev) hideLayer(map, prev);
  }
  activeLayerId = def.id;

  // First visit: load and register the layer.  The loading set prevents a
  // second fetch if the user clicks the same layer again while it's still
  // being decoded (e.g. a large TIFF).
  if (!loaded.has(def.id) && !loading.has(def.id)) {
    loading.add(def.id);
    const meta = await loadLayer(map, def);
    metaCache[def.id] = meta;
    loading.delete(def.id);
    loaded.add(def.id);
  }

  showLayer(map, def);
  renderLegend(def, metaCache[def.id] ?? {});
}

/**
 * Returns the id of the currently visible layer.
 * Used by sidebar.js to restore the correct radio-button state when the
 * user switches pollutant tabs.
 */
export function getActiveLayerId() { return activeLayerId; }

/**
 * Re-adds the active layer to the map after a basemap style swap.
 *
 * map.setStyle() wipes every source and layer we added at runtime.  Call
 * this inside a map.once('style.load') handler to restore the active layer
 * on top of the new basemap tiles.
 *
 * @param {mapboxgl.Map} map
 */
export async function reloadAfterStyleSwap(map) {
  if (!activeLayerId) return;
  // Remove from cache so activateLayer re-adds sources + layers to the map.
  loaded.delete(activeLayerId);
  loading.delete(activeLayerId);
  const { LAYERS } = await import('./layers.js');
  const def = LAYERS.find(l => l.id === activeLayerId);
  if (def) await activateLayer(map, def);
}

// ── Visibility ────────────────────────────────────────────────────────────────

function showLayer(map, def) {
  layerIds(def).forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
  });
}

function hideLayer(map, def) {
  layerIds(def).forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  });
}

/**
 * Returns all Mapbox layer ids that belong to def.
 * TIFFs use a single raster layer; GeoJSON types use a fill + a line layer.
 */
function layerIds(def) {
  return def.type === 'tiff'
    ? [def.id]
    : [def.id + '-fill', def.id + '-line'];
}

// ── Loaders ───────────────────────────────────────────────────────────────────

/**
 * Dispatches to the right loader for def.type and returns legend metadata.
 */
async function loadLayer(map, def) {
  if (def.type === 'tiff') {
    const { min, max } = await addTiffLayer(map, def.id, def.src);
    return { min, max };
  }

  const res  = await fetch(def.src);
  const data = await res.json();
  map.addSource(def.id, { type: 'geojson', data });

  return def.type === 'geojson-bivariate'
    ? addBivariate(map, def, data)
    : addChoropleth(map, def, data);
}

/**
 * Adds a choropleth fill + border for a GeoJSON source.
 *
 * We auto-detect the first numeric property in the features and use a
 * Mapbox interpolate expression to shade it from dark blue (low) to light
 * blue (high).  These two color stops must match CHORO_GRADIENT in legend.js
 * and CHORO_LO / CHORO_HI in pie-panel.js — all three need to agree on what
 * the colors mean.
 *
 * If no numeric property is found we fall back to a flat sky-blue fill.
 *
 * @returns {{ min, max, prop }} forwarded to the legend
 */
function addChoropleth(map, def, data) {
  const firstProps  = data.features[0]?.properties ?? {};
  const numericProp = def.prop ?? Object.keys(firstProps).find(k => typeof firstProps[k] === 'number');

  let fillColor = '#38bdf8'; // fallback flat color
  let lo = null, hi = null;

  if (numericProp) {
    const vals = data.features.map(f => f.properties[numericProp]).filter(isFinite);
    lo = Math.min(...vals);
    hi = Math.max(...vals);
    fillColor = ['interpolate', ['linear'], ['get', numericProp], lo, '#0d47a1', hi, '#e3f2fd'];
  }

  map.addLayer({
    id: def.id + '-fill', type: 'fill', source: def.id,
    paint: { 'fill-color': fillColor, 'fill-opacity': 0.75 },
  });
  map.addLayer({
    id: def.id + '-line', type: 'line', source: def.id,
    paint: { 'line-color': '#fff', 'line-width': 0.5, 'line-opacity': 0.3 },
  });

  addHoverPopup(map, def.id + '-fill');
  return { min: lo, max: hi, prop: numericProp };
}

/**
 * Adds a bivariate fill + border for a GeoJSON source.
 *
 * Bivariate GeoJSONs have a pre-computed fill color per feature stored in
 * one of these property names: 'fill', 'color', 'hex', 'bivariate_color'.
 * If none of those exist we fall back to flat indigo.
 *
 * We also scan all features to collect unique color→label pairs for the
 * legend swatches (capped at 12 so the legend doesn't overflow).
 *
 * @returns {{ swatches }} forwarded to the legend
 */
function addBivariate(map, def, data) {
  const firstProps = data.features[0]?.properties ?? {};
  const fillProp   = ['fill', 'color', 'hex', 'bivariate_color'].find(k => k in firstProps);

  map.addLayer({
    id: def.id + '-fill', type: 'fill', source: def.id,
    paint: { 'fill-color': fillProp ? ['get', fillProp] : '#818cf8', 'fill-opacity': 0.85 },
  });
  map.addLayer({
    id: def.id + '-line', type: 'line', source: def.id,
    paint: { 'line-color': '#fff', 'line-width': 0.4, 'line-opacity': 0.25 },
  });

  addHoverPopup(map, def.id + '-fill');

  // Build the swatch list for the legend.
  const seen      = new Map();
  const labelProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'string' && k !== fillProp);
  data.features.forEach(f => {
    const color = f.properties[fillProp];
    if (!color || seen.has(color)) return;
    seen.set(color, labelProp ? f.properties[labelProp] : color);
  });
  const swatches = [...seen.entries()].slice(0, 12).map(([color, label]) => ({ color, label }));

  return { swatches };
}

// ── Hover popup ───────────────────────────────────────────────────────────────

/**
 * Attaches a floating property table to layerId that appears on hover.
 *
 * We show every non-null property from the hovered feature in a small table.
 * Numbers are shown with 3 decimal places; strings are shown as-is.
 * The popup is removed on mouseleave so it doesn't stick around.
 *
 * @param {mapboxgl.Map} map
 * @param {string}       layerId - the fill layer to listen on
 */
function addHoverPopup(map, layerId) {
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

  map.on('mousemove', layerId, e => {
    map.getCanvas().style.cursor = 'pointer';
    const rows = Object.entries(e.features[0].properties)
      .filter(([, v]) => v !== null)
      .map(([k, v]) =>
        `<tr><td>${k}</td><td><b>${typeof v === 'number' ? v.toFixed(3) : v}</b></td></tr>`
      )
      .join('');
    popup.setLngLat(e.lngLat)
         .setHTML(`<table class="map-tooltip-table">${rows}</table>`)
         .addTo(map);
  });

  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}
