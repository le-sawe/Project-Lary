/**
 * Section 2 – Zonal statistics map (zonal.geojson)
 */
import { createMap }  from '../map-factory.js';
import { DATA_PATHS } from '../config.js';

const SOURCE = 'zonal';
const LAYER  = 'zonal-fill';

export async function initSection2() {
  const map = await createMap('map-s2');

  const res  = await fetch(DATA_PATHS.no2.zonal);
  const data = await res.json();

  // Detect numeric property to choropleth on (first numeric feature property)
  const firstFeature = data.features[0]?.properties ?? {};
  const numericProp  = Object.keys(firstFeature).find(
    k => typeof firstFeature[k] === 'number'
  ) ?? null;

  map.addSource(SOURCE, { type: 'geojson', data });

  if (numericProp) {
    const values = data.features
      .map(f => f.properties[numericProp])
      .filter(v => v !== null && isFinite(v));
    const [minVal, maxVal] = [Math.min(...values), Math.max(...values)];

    map.addLayer({
      id: LAYER,
      type: 'fill',
      source: SOURCE,
      paint: {
        'fill-color': [
          'interpolate', ['linear'],
          ['get', numericProp],
          minVal, '#1e3a5f',
          (minVal + maxVal) / 2, '#f0c040',
          maxVal, '#c0392b',
        ],
        'fill-opacity': 0.75,
      },
    });

    addZonalLegend('legend-s2', numericProp, minVal, maxVal);
  } else {
    // No numeric property — plain fill
    map.addLayer({
      id: LAYER,
      type: 'fill',
      source: SOURCE,
      paint: { 'fill-color': '#818cf8', 'fill-opacity': 0.6 },
    });
  }

  map.addLayer({
    id: 'zonal-outline',
    type: 'line',
    source: SOURCE,
    paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 0.4 },
  });

  // Hover tooltip
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });

  map.on('mousemove', LAYER, e => {
    map.getCanvas().style.cursor = 'pointer';
    const props = e.features[0].properties;
    popup
      .setLngLat(e.lngLat)
      .setHTML(buildTooltipHtml(props))
      .addTo(map);
  });
  map.on('mouseleave', LAYER, () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

function buildTooltipHtml(props) {
  const rows = Object.entries(props)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `<tr><td>${k}</td><td><strong>${typeof v === 'number' ? v.toFixed(3) : v}</strong></td></tr>`)
    .join('');
  return `<table class="map-tooltip-table">${rows}</table>`;
}

function addZonalLegend(containerId, prop, min, max) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <span class="legend-label">${prop}</span>
    <div class="legend-gradient" style="background:linear-gradient(to right,#1e3a5f,#f0c040,#c0392b)"></div>
    <div class="legend-ticks"><span>${min.toFixed(2)}</span><span>${max.toFixed(2)}</span></div>
  `;
}
