/**
 * @fileoverview Layer lifecycle management.
 *
 * This module owns the state machine for map layers:
 * - Tracks which layers have been loaded and which is currently visible.
 * - Loads layer data on first use and caches the result so switching back to a
 *   previously visited layer is instant.
 * - Delegates to `tiff-loader.js` for GeoTIFF rasters and adds GeoJSON sources
 *   directly via the Mapbox GL API for vector layers.
 * - Calls `legend.js` after each activation so the legend always matches the
 *   visible layer.
 *
 * Layer types and their Mapbox representations:
 *
 * | Type                   | Mapbox source | Mapbox layers added          |
 * |------------------------|---------------|------------------------------|
 * | `tiff`                 | `image`       | `<id>` (raster)              |
 * | `geojson-choropleth`   | `geojson`     | `<id>-fill`, `<id>-line`     |
 * | `geojson-bivariate`    | `geojson`     | `<id>-fill`, `<id>-line`     |
 *
 * Public API:
 *  - {@link initLayerManager} – reserved for future setup.
 *  - {@link activateLayer}    – make a layer visible (loads it first if needed).
 *  - {@link getActiveLayerId} – returns the id of the currently visible layer.
 *
 * @module layer-manager
 */

import { addTiffLayer }                from './tiff-loader.js';
import { renderLegend, hideLegend }    from './legend.js';

/** @type {Set<string>} Layer ids that have been fully loaded into the map. */
const loaded  = new Set();

/** @type {Set<string>} Layer ids currently being loaded (prevents duplicate fetches). */
const loading = new Set();

/**
 * Cache of loader-computed metadata keyed by layer id.
 * Stored so `renderLegend` can be called again without re-loading the data.
 *
 * @type {Object.<string, { min?: number, max?: number, prop?: string, swatches?: Array }>}
 */
const metaCache = {};

/**
 * Id of the layer that is currently visible.
 * Only one layer can be active at a time across all groups.
 *
 * @type {string|null}
 */
let activeLayerId = null;

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * No-op placeholder.  Reserved for any future imperative setup that may be
 * needed before the first `activateLayer` call.
 *
 * @returns {void}
 */
export function initLayerManager() {}

/**
 * Makes `def` the active (visible) layer.
 *
 * Sequence of operations:
 * 1. If a different layer is currently active, hide it.
 * 2. If `def` has never been loaded, fetch its data and build Mapbox sources/layers.
 *    Concurrent calls for the same id are de-duped via the `loading` set.
 * 3. Set the new layer visible.
 * 4. Re-render the legend using the cached or freshly computed metadata.
 *
 * @param {mapboxgl.Map}              map - The live Mapbox GL map instance.
 * @param {import('./layers.js').LayerDef} def - The layer definition to activate.
 * @returns {Promise<void>}
 */
export async function activateLayer(map, def) {
  // Hide the previously active layer before showing the new one
  if (activeLayerId && activeLayerId !== def.id) {
    const { LAYERS } = await import('./layers.js');
    const prev = LAYERS.find(l => l.id === activeLayerId);
    if (prev) hideLayer(map, prev);
  }
  activeLayerId = def.id;

  // Load data on first use; skip if already loaded or currently loading
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
 * Returns the id of the currently active (visible) layer, or `null` if no
 * layer has been activated yet.
 *
 * Used by `sidebar.js` to restore the correct radio-button state when the user
 * switches pollutant tabs.
 *
 * @returns {string|null}
 */
export function getActiveLayerId() { return activeLayerId; }

// ── Visibility helpers ────────────────────────────────────────────────────────

/**
 * Sets all Mapbox layers associated with `def` to `visibility: visible`.
 *
 * @param {mapboxgl.Map}              map
 * @param {import('./layers.js').LayerDef} def
 * @returns {void}
 */
function showLayer(map, def) {
  layerIds(def).forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'visible');
  });
}

/**
 * Sets all Mapbox layers associated with `def` to `visibility: none`.
 *
 * @param {mapboxgl.Map}              map
 * @param {import('./layers.js').LayerDef} def
 * @returns {void}
 */
function hideLayer(map, def) {
  layerIds(def).forEach(id => {
    if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none');
  });
}

/**
 * Returns the list of Mapbox layer ids that represent `def` on the map.
 *
 * TIFF layers use a single raster layer with the same id as the definition.
 * GeoJSON layers (choropleth and bivariate) use a fill layer and a line layer
 * (the line layer draws the polygon borders).
 *
 * @param {import('./layers.js').LayerDef} def
 * @returns {string[]}
 */
function layerIds(def) {
  return def.type === 'tiff'
    ? [def.id]
    : [def.id + '-fill', def.id + '-line'];
}

// ── Loaders ───────────────────────────────────────────────────────────────────

/**
 * Dispatches to the appropriate loader based on `def.type` and returns the
 * legend metadata produced by that loader.
 *
 * @param {mapboxgl.Map}              map
 * @param {import('./layers.js').LayerDef} def
 * @returns {Promise<{ min?: number, max?: number, prop?: string, swatches?: Array }>}
 */
async function loadLayer(map, def) {
  if (def.type === 'tiff') {
    // GeoTIFF: decoded to a canvas image source by tiff-loader
    const { min, max } = await addTiffLayer(map, def.id, def.src);
    return { min, max };
  }

  // GeoJSON: fetch once and add as a vector source
  const res  = await fetch(def.src);
  const data = await res.json();
  map.addSource(def.id, { type: 'geojson', data });

  return def.type === 'geojson-bivariate'
    ? addBivariate(map, def, data)
    : addChoropleth(map, def, data);
}

/**
 * Adds a choropleth fill + outline layer for a GeoJSON source.
 *
 * The fill colour is a Mapbox `interpolate` expression that maps the first
 * numeric property found in the feature properties linearly from `#0d47a1`
 * (dark blue, low value) to `#e3f2fd` (light blue, high value).  If no numeric
 * property is found, a flat `#38bdf8` fill is used as a fallback.
 *
 * The gradient endpoints MUST match `CHORO_GRADIENT` in `legend.js` and
 * `CHORO_LO / CHORO_HI` in `pie-panel.js` so all three components agree on
 * what the colours mean.
 *
 * @param {mapboxgl.Map}              map
 * @param {import('./layers.js').LayerDef} def
 * @param {GeoJSON.FeatureCollection} data - Pre-fetched GeoJSON data.
 * @returns {{ min: number|null, max: number|null, prop: string|undefined }}
 *   Metadata forwarded to the legend renderer.
 */
function addChoropleth(map, def, data) {
  const firstProps  = data.features[0]?.properties ?? {};
  // Auto-detect the first numeric property to drive the colour ramp
  const numericProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'number');

  let fillColor = '#38bdf8'; // fallback flat colour (sky blue)
  let lo = null, hi = null;

  if (numericProp) {
    const vals = data.features.map(f => f.properties[numericProp]).filter(isFinite);
    lo = Math.min(...vals);
    hi = Math.max(...vals);
    // Mapbox expression: linear interpolation between dark-blue (low) and light-blue (high)
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

  // Attach hover popup for feature property inspection
  addHoverPopup(map, def.id + '-fill');

  return { min: lo, max: hi, prop: numericProp };
}

/**
 * Adds a bivariate fill + outline layer for a GeoJSON source.
 *
 * Bivariate GeoJSONs carry a pre-computed fill colour per feature in one of
 * the recognised property names: `fill`, `color`, `hex`, or `bivariate_color`.
 * If none of these is found, a flat indigo is used as a fallback.
 *
 * Also collects up to 12 unique `{color, label}` pairs for the legend swatches
 * by scanning all features (capped at 12 to keep the legend compact).
 *
 * @param {mapboxgl.Map}              map
 * @param {import('./layers.js').LayerDef} def
 * @param {GeoJSON.FeatureCollection} data - Pre-fetched GeoJSON data.
 * @returns {{ swatches: { color: string, label: string }[] }}
 *   Metadata forwarded to the legend renderer.
 */
function addBivariate(map, def, data) {
  const firstProps = data.features[0]?.properties ?? {};
  // Find which property holds the pre-computed fill colour
  const fillProp = ['fill', 'color', 'hex', 'bivariate_color'].find(k => k in firstProps);

  map.addLayer({
    id: def.id + '-fill', type: 'fill', source: def.id,
    // Use the per-feature colour from the GeoJSON, or fall back to flat indigo
    paint: { 'fill-color': fillProp ? ['get', fillProp] : '#818cf8', 'fill-opacity': 0.85 },
  });
  map.addLayer({
    id: def.id + '-line', type: 'line', source: def.id,
    paint: { 'line-color': '#fff', 'line-width': 0.4, 'line-opacity': 0.25 },
  });

  addHoverPopup(map, def.id + '-fill');

  // Collect unique colour → label mappings for the legend swatches
  const seen      = new Map();
  const labelProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'string' && k !== fillProp);
  data.features.forEach(f => {
    const color = f.properties[fillProp];
    if (!color || seen.has(color)) return;
    const label = labelProp ? f.properties[labelProp] : color;
    seen.set(color, label);
  });
  const swatches = [...seen.entries()].slice(0, 12).map(([color, label]) => ({ color, label }));

  return { swatches };
}

// ── Hover popup ───────────────────────────────────────────────────────────────

/**
 * Attaches `mousemove` and `mouseleave` listeners to `layerId` so hovering
 * over a polygon shows a floating table of all its properties.
 *
 * The popup is destroyed on `mouseleave` so it does not linger when the cursor
 * leaves the layer.
 *
 * @param {mapboxgl.Map} map     - The live map instance.
 * @param {string}       layerId - The fill layer id to listen on.
 * @returns {void}
 */
function addHoverPopup(map, layerId) {
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

  map.on('mousemove', layerId, e => {
    map.getCanvas().style.cursor = 'pointer';

    // Build an HTML table row for each non-null property
    const rows = Object.entries(e.features[0].properties)
      .filter(([, v]) => v !== null)
      .map(([k, v]) =>
        `<tr><td>${k}</td><td><b>${typeof v === 'number' ? v.toFixed(3) : v}</b></td></tr>`
      )
      .join('');

    popup
      .setLngLat(e.lngLat)
      .setHTML(`<table class="map-tooltip-table">${rows}</table>`)
      .addTo(map);
  });

  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}
