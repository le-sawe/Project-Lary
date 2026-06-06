/**
 * Generic bivariate choropleth section.
 * @param {{ mapId: string, legendId: string, geojson: string, label: string }} cfg
 */
import { createMap } from '../map-factory.js';

export async function initBivariateSection(cfg) {
  const map = await createMap(cfg.mapId);

  const res  = await fetch(cfg.geojson);
  const data = await res.json();

  map.addSource('bivariate', { type: 'geojson', data });

  const firstProps = data.features[0]?.properties ?? {};
  const fillProp   = ['fill', 'color', 'hex', 'bivariate_color'].find(k => k in firstProps);

  map.addLayer({
    id: 'bivariate-fill',
    type: 'fill',
    source: 'bivariate',
    paint: {
      'fill-color':   fillProp ? ['get', fillProp] : '#818cf8',
      'fill-opacity': 0.85,
    },
  });

  map.addLayer({
    id: 'bivariate-outline',
    type: 'line',
    source: 'bivariate',
    paint: { 'line-color': '#ffffff', 'line-width': 0.4, 'line-opacity': 0.3 },
  });

  buildBivariateLegend(cfg.legendId, data, fillProp, cfg.label);

  const popup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false });
  map.on('mousemove', 'bivariate-fill', e => {
    map.getCanvas().style.cursor = 'pointer';
    popup.setLngLat(e.lngLat).setHTML(tooltipHtml(e.features[0].properties)).addTo(map);
  });
  map.on('mouseleave', 'bivariate-fill', () => {
    map.getCanvas().style.cursor = '';
    popup.remove();
  });
}

function buildBivariateLegend(containerId, data, fillProp, label) {
  const el = document.getElementById(containerId);
  if (!el || !fillProp) return;

  const uniqueColors = [...new Set(
    data.features.map(f => f.properties[fillProp]).filter(Boolean)
  )].slice(0, 9);

  const firstProps = data.features[0]?.properties ?? {};
  const xProp = Object.keys(firstProps).find(k => /x|no2|pm|poll/i.test(k) && k !== fillProp);
  const yProp = Object.keys(firstProps).find(k => /y|pop/i.test(k) && k !== fillProp && k !== xProp);

  el.innerHTML = `
    <div class="bv-legend-title">${label} Bivariate</div>
    ${xProp ? `<div class="bv-axis-x">→ ${xProp}</div>` : ''}
    ${yProp ? `<div class="bv-axis-y">↑ ${yProp}</div>` : ''}
    <div class="bv-swatches">${uniqueColors.map(c => `<span class="bv-swatch" style="background:${c}" title="${c}"></span>`).join('')}</div>
  `;
}

function tooltipHtml(props) {
  const rows = Object.entries(props)
    .filter(([, v]) => v !== null)
    .map(([k, v]) => `<tr><td>${k}</td><td><strong>${typeof v === 'number' ? v.toFixed(3) : v}</strong></td></tr>`)
    .join('');
  return `<table class="map-tooltip-table">${rows}</table>`;
}
