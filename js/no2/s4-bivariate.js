/**
 * Section 4 – Bivariate choropleth map
 * Colors each feature using the 'fill' property in bivariate_color.geojson
 */
import { createMap }  from '../map-factory.js';
import { DATA_PATHS } from '../config.js';

export async function initSection4() {
  const map = await createMap('map-s4');

  const res  = await fetch(DATA_PATHS.no2.bivariate);
  const data = await res.json();

  map.addSource('bivariate', { type: 'geojson', data });

  // Use 'fill' property directly for color — bivariate GeoJSON carries hex colors
  const firstProps = data.features[0]?.properties ?? {};
  const fillProp   = ['fill', 'color', 'hex', 'bivariate_color'].find(k => k in firstProps);

  if (fillProp) {
    map.addLayer({
      id: 'bivariate-fill',
      type: 'fill',
      source: 'bivariate',
      paint: {
        'fill-color': ['get', fillProp],
        'fill-opacity': 0.85,
      },
    });
  } else {
    // Fallback — color by first numeric property
    map.addLayer({
      id: 'bivariate-fill',
      type: 'fill',
      source: 'bivariate',
      paint: { 'fill-color': '#818cf8', 'fill-opacity': 0.7 },
    });
  }

  map.addLayer({
    id: 'bivariate-outline',
    type: 'line',
    source: 'bivariate',
    paint: { 'line-color': '#ffffff', 'line-width': 0.4, 'line-opacity': 0.3 },
  });

  // Render 3×3 bivariate legend from unique colors in the data
  buildBivariateLegend(data, fillProp);

  // Hover tooltip
  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
  map.on('mousemove', 'bivariate-fill', e => {
    map.getCanvas().style.cursor = 'pointer';
    const p = e.features[0].properties;
    popup.setLngLat(e.lngLat)
      .setHTML(buildTooltip(p))
      .addTo(map);
  });
  map.on('mouseleave', 'bivariate-fill', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

function buildBivariateLegend(data, fillProp) {
  const el = document.getElementById('legend-s4');
  if (!el || !fillProp) return;

  // Collect unique fill values and associated labels if present
  const uniqueColors = [...new Set(
    data.features.map(f => f.properties[fillProp]).filter(Boolean)
  )].slice(0, 9);

  // Try to find axis label properties
  const firstProps = data.features[0]?.properties ?? {};
  const xProp = Object.keys(firstProps).find(k => /x|no2|poll/i.test(k) && k !== fillProp);
  const yProp = Object.keys(firstProps).find(k => /y|pop/i.test(k) && k !== fillProp && k !== xProp);

  const swatches = uniqueColors.map(c =>
    `<span class="bv-swatch" style="background:${c}" title="${c}"></span>`
  ).join('');

  el.innerHTML = `
    <div class="bv-legend-title">Bivariate Legend</div>
    ${xProp ? `<div class="bv-axis-x">→ ${xProp}</div>` : ''}
    ${yProp ? `<div class="bv-axis-y">↑ ${yProp}</div>` : ''}
    <div class="bv-swatches">${swatches}</div>
  `;
}

function buildTooltip(props) {
  const rows = Object.entries(props)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `<tr><td>${k}</td><td><strong>${typeof v === 'number' ? v.toFixed(3) : v}</strong></td></tr>`)
    .join('');
  return `<table class="map-tooltip-table">${rows}</table>`;
}
