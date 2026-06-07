/**
 * pie-panel.js — the floating pie chart that shows population exposure by class.
 *
 * This panel is only relevant for the three "Population Exposure" layers
 * (one per pollutant).  It fetches the same GeoJSON that the choropleth map
 * uses, reads two specific properties from each feature, and draws a pie chart
 * with Chart.js.
 *
 * Properties we read from each feature:
 *   pol_class_max  {string}  — the pollution class label, e.g. "Low", "High"
 *   pop_sum        {number}  — total population living in that class zone
 *
 * Color rule: each slice is tinted along the same blue gradient used by the
 * choropleth map (#0d47a1 dark blue → #e3f2fd light blue).  The slice with the
 * smallest pop_sum gets the darkest blue; the largest gets the lightest blue.
 * This way a user can glance between the map and the chart and the colors mean
 * the same thing in both places.
 *
 * The three constants that define this gradient (CHORO_LO, CHORO_HI here;
 * CHORO_GRADIENT in legend.js; and the interpolate stops in layer-manager.js)
 * must all stay in sync.  If you change the map color scale, update all three.
 *
 * Public functions:
 *   initPiePanel()        — attach the close button listener (call once on load)
 *   showPiePanel(layerDef)— fetch data and draw/update the chart
 *   hidePiePanel()        — close the panel
 */

// ── Color gradient (must match legend.js + layer-manager.js) ──────────────────

/** RGB for #0d47a1 — dark blue, used for the lowest pop_sum value. */
const CHORO_LO = [13, 71, 161];

/** RGB for #e3f2fd — light blue, used for the highest pop_sum value. */
const CHORO_HI = [227, 242, 253];

/**
 * Linear interpolation between two RGB colors.
 * t = 0 returns lo exactly, t = 1 returns hi exactly.
 *
 * @param {[number,number,number]} lo - start color [R, G, B]
 * @param {[number,number,number]} hi - end color   [R, G, B]
 * @param {number} t - blend factor in [0, 1]
 * @returns {string} CSS rgb(r,g,b) string
 */
function lerpColor(lo, hi, t) {
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
  const b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
  return `rgb(${r},${g},${b})`;
}

// ── State ─────────────────────────────────────────────────────────────────────

// We keep a reference to the active Chart.js instance so we can destroy it
// before creating a new one.  Chart.js throws if you call new Chart() on a
// canvas that already has a chart attached.
let chartInstance = null;

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Attaches the close-button listener.  Must be called once after the DOM
 * is ready — we do this inside map.on('load') in main.js.
 */
export function initPiePanel() {
  document.getElementById('pie-panel-close')
    .addEventListener('click', hide);
}

/**
 * Shows the panel, updates its title to the layer name, fetches the GeoJSON,
 * and renders the pie chart.  If the chart is already open it's replaced
 * in place without closing and reopening the panel.
 *
 * @param {object} layerDef - layer definition from layers.js (.label and .src)
 */
export async function showPiePanel(layerDef) {
  document.getElementById('pie-panel').classList.add('visible');
  document.getElementById('pie-panel-title').textContent = layerDef.label;

  const res  = await fetch(layerDef.src);
  const data = await res.json();
  renderPie(data);
}

/** Closes the panel. */
export function hidePiePanel() { hide(); }

// ── Internal ──────────────────────────────────────────────────────────────────

function hide() {
  document.getElementById('pie-panel').classList.remove('visible');
}

/**
 * Builds (or rebuilds) the Chart.js pie chart from a GeoJSON feature collection.
 *
 * Each feature becomes one slice:
 *   label → pol_class_max property  (the pollution class name)
 *   value → pop_sum property        (population count, drives slice size)
 *   color → interpolated along CHORO_LO→CHORO_HI proportional to pop_sum
 *
 * The color interpolation means the slice that represents the smallest
 * exposed population is dark blue, the largest is light blue — same
 * direction as the choropleth map.
 *
 * @param {object} geojson - GeoJSON FeatureCollection from the population file
 */
function renderPie(geojson) {
  const canvas   = document.getElementById('pie-panel-canvas');
  const features = geojson.features;
  if (!features.length) return;

  const labelProp = 'pol_class_max'; // pollution class label per polygon
  const valueProp = 'pop_sum';       // total population in that class

  const labels = features.map((f, i) => f.properties[labelProp] ?? `Zone ${i + 1}`);
  const values = features.map(f => Math.abs(f.properties[valueProp] ?? 1));

  // Compute per-slice colors from the choropleth gradient.
  const rawVals = features.map(f => f.properties[valueProp]).filter(isFinite);
  const lo      = Math.min(...rawVals);
  const hi      = Math.max(...rawVals);
  const range   = hi - lo || 1; // guard against all features having the same value
  const colors  = features.map(f => {
    const t = (f.properties[valueProp] - lo) / range;
    return lerpColor(CHORO_LO, CHORO_HI, t);
  });

  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     '#0f172a', // dark border between slices
        borderWidth:     2,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color:   '#94a3b8', // muted to suit the dark UI
            font:    { size: 11 },
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            // Show the pollution class name as the tooltip header.
            title: ctx => ctx[0].label,
            // Two lines: the raw population value and its share of the total.
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((ctx.parsed / total) * 100).toFixed(1);
              const val   = ctx.parsed.toLocaleString(undefined, { maximumFractionDigits: 3 });
              return [
                ` ${valueProp}: ${val}`,
                ` Share: ${pct}% of total`,
              ];
            },
          },
        },
      },
    },
  });
}
