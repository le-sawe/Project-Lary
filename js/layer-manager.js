import { addTiffLayer }       from './tiff-loader.js';
import { renderLegend, hideLegend } from './legend.js';

const loaded   = new Set();
const loading  = new Set();
const metaCache = {};        // id → legend metadata
let activeLayerId = null;

export function initLayerManager() {}

export async function activateLayer(map, def) {
  if (activeLayerId && activeLayerId !== def.id) {
    const { LAYERS } = await import('./layers.js');
    const prev = LAYERS.find(l => l.id === activeLayerId);
    if (prev) hideLayer(map, prev);
  }
  activeLayerId = def.id;

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

export function getActiveLayerId() { return activeLayerId; }

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

function layerIds(def) {
  return def.type === 'tiff' ? [def.id] : [def.id + '-fill', def.id + '-line'];
}

// ── Loaders (return legend metadata) ─────────────────────────────────────────

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

function addChoropleth(map, def, data) {
  const firstProps  = data.features[0]?.properties ?? {};
  const numericProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'number');
  let fillColor = '#38bdf8';
  let lo = null, hi = null;

  if (numericProp) {
    const vals = data.features.map(f => f.properties[numericProp]).filter(isFinite);
    lo = Math.min(...vals);
    hi = Math.max(...vals);
    fillColor = ['interpolate', ['linear'], ['get', numericProp], lo, '#0d47a1', hi, '#e3f2fd'];
  }

  map.addLayer({ id: def.id + '-fill', type: 'fill', source: def.id,
    paint: { 'fill-color': fillColor, 'fill-opacity': 0.75 } });
  map.addLayer({ id: def.id + '-line', type: 'line', source: def.id,
    paint: { 'line-color': '#fff', 'line-width': 0.5, 'line-opacity': 0.3 } });
  addHoverPopup(map, def.id + '-fill');

  return { min: lo, max: hi, prop: numericProp };
}

function addBivariate(map, def, data) {
  const firstProps = data.features[0]?.properties ?? {};
  const fillProp   = ['fill', 'color', 'hex', 'bivariate_color'].find(k => k in firstProps);

  map.addLayer({ id: def.id + '-fill', type: 'fill', source: def.id,
    paint: { 'fill-color': fillProp ? ['get', fillProp] : '#818cf8', 'fill-opacity': 0.85 } });
  map.addLayer({ id: def.id + '-line', type: 'line', source: def.id,
    paint: { 'line-color': '#fff', 'line-width': 0.4, 'line-opacity': 0.25 } });
  addHoverPopup(map, def.id + '-fill');

  // Collect unique color+label pairs for swatches (capped at 12)
  const seen = new Map();
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

function addHoverPopup(map, layerId) {
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
  map.on('mousemove', layerId, e => {
    map.getCanvas().style.cursor = 'pointer';
    const rows = Object.entries(e.features[0].properties)
      .filter(([, v]) => v !== null)
      .map(([k, v]) => `<tr><td>${k}</td><td><b>${typeof v === 'number' ? v.toFixed(3) : v}</b></td></tr>`)
      .join('');
    popup.setLngLat(e.lngLat).setHTML(`<table class="map-tooltip-table">${rows}</table>`).addTo(map);
  });
  map.on('mouseleave', layerId, () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}
