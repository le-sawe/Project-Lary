/**
 * Floating pie-chart panel.
 * Call show(layerDef) to fetch the GeoJSON and draw/update the chart.
 * Call hide() to dismiss.
 */
const PIE_PALETTE = [
  '#4f46e5','#38bdf8','#f0c040','#c0392b','#2ecc71',
  '#e67e22','#9b59b6','#1abc9c','#e74c3c','#3498db',
];

let chartInstance = null;

export function initPiePanel() {
  document.getElementById('pie-panel-close')
    .addEventListener('click', hide);
}

export async function showPiePanel(layerDef) {
  const panel = document.getElementById('pie-panel');
  panel.classList.add('visible');

  document.getElementById('pie-panel-title').textContent = layerDef.label;

  const res  = await fetch(layerDef.src);
  const data = await res.json();
  renderPie(data);
}

export function hidePiePanel() { hide(); }

// ── Internal ─────────────────────────────────────────────────────────────────

function hide() {
  document.getElementById('pie-panel').classList.remove('visible');
}

function renderPie(geojson) {
  const canvas = document.getElementById('pie-panel-canvas');
  const features = geojson.features;
  if (!features.length) return;

  const firstProps = features[0].properties ?? {};
  const labelProp  = Object.keys(firstProps).find(k => typeof firstProps[k] === 'string') ?? null;
  const valueProp  = Object.keys(firstProps).find(k => typeof firstProps[k] === 'number') ?? null;

  const labels = features.map((f, i) => labelProp ? f.properties[labelProp] : `Zone ${i + 1}`);
  const values = features.map(f => valueProp ? Math.abs(f.properties[valueProp]) : 1);
  const colors = features.map((_, i) => PIE_PALETTE[i % PIE_PALETTE.length]);

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(canvas, {
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
          labels: { color: '#94a3b8', font: { size: 11 }, padding: 10 },
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
