/**
 * Generic population map + auto-generated Chart.js pie.
 * Pie slices come directly from the GeoJSON feature properties —
 * one slice per feature, labelled by the first string property,
 * sized by the first numeric property.
 *
 * @param {{ mapId: string, pieCanvasId: string, geojson: string }} cfg
 */
import { createMap } from '../map-factory.js';

const PIE_PALETTE = [
  '#4f46e5','#38bdf8','#f0c040','#c0392b','#2ecc71',
  '#e67e22','#9b59b6','#1abc9c','#e74c3c','#3498db',
];

export async function initPopulationSection(cfg) {
  const res  = await fetch(cfg.geojson);
  const data = await res.json();

  // ── Map ──────────────────────────────────────────────────────────────────
  const map = await createMap(cfg.mapId);
  map.addSource('population', { type: 'geojson', data });

  const firstProps  = data.features[0]?.properties ?? {};
  const numericProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'number') ?? null;

  if (numericProp) {
    const values  = data.features.map(f => f.properties[numericProp]).filter(v => isFinite(v));
    const [lo, hi] = [Math.min(...values), Math.max(...values)];
    map.addLayer({
      id: 'population-fill', type: 'fill', source: 'population',
      paint: {
        'fill-color': [
          'interpolate', ['linear'], ['get', numericProp],
          lo, '#0d47a1', hi, '#e3f2fd',
        ],
        'fill-opacity': 0.75,
      },
    });
  } else {
    map.addLayer({
      id: 'population-fill', type: 'fill', source: 'population',
      paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.6 },
    });
  }

  map.addLayer({
    id: 'population-outline', type: 'line', source: 'population',
    paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 0.35 },
  });

  // ── Pie chart ─────────────────────────────────────────────────────────────
  buildPieChart(cfg.pieCanvasId, data);
}

function buildPieChart(canvasId, geojson) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === 'undefined') return;

  const features = geojson.features;
  if (!features.length) return;

  const firstProps = features[0].properties ?? {};

  // Label: first string property, fallback to feature index
  const labelProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'string') ?? null;
  // Value: first numeric property
  const valueProp = Object.keys(firstProps).find(k => typeof firstProps[k] === 'number') ?? null;

  const labels = features.map((f, i) =>
    labelProp ? f.properties[labelProp] : `Zone ${i + 1}`
  );
  const values = features.map(f =>
    valueProp ? Math.abs(f.properties[valueProp]) : 1
  );
  const colors = features.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length]);

  new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{ data: values, backgroundColor: colors, borderColor: '#0f172a', borderWidth: 2 }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 12 }, padding: 12 },
        },
        tooltip: {
          callbacks: {
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((ctx.parsed / total) * 100).toFixed(1);
              return ` ${ctx.label}: ${ctx.parsed.toLocaleString()} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}
