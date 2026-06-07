/**
 * @fileoverview Floating pie-chart panel.
 *
 * Shows a Chart.js pie chart that breaks down population exposure by pollution
 * class for the currently active color-graduated map layer.  The chart uses the same
 * color gradient as the color-graduated map map (`#0d47a1` → `#e3f2fd`) so slices are
 * immediately recognizable relative to the map colors: darker blue = lower
 * exposure, lighter blue = higher exposure.
 *
 * Expected GeoJSON feature properties:
 * - `pol_class_max` {string} – Pollution class label shown in the legend.
 * - `pop_sum`       {number} – Total population exposed in that class (drives
 *                              the slice size and tooltip value).
 *
 * Public API:
 *  - {@link initPiePanel}  – attach DOM event listeners (call once on map load).
 *  - {@link showPiePanel}  – fetch data and render/update the chart.
 *  - {@link hidePiePanel}  – dismiss the panel.
 *
 * @module pie-panel
 */

// ── Colour gradient (must match legend.js + layer-manager.js) ─────────────────

/**
 * RGB components of the low-end color-graduated map color (`#0d47a1`, dark blue).
 * Slices with the smallest `pop_sum` are colored closest to this value.
 *
 * @constant {[number, number, number]}
 */
const CHORO_LO = [13, 71, 161];    // #0d47a1 — low value (dark blue)

/**
 * RGB components of the high-end color-graduated map color (`#e3f2fd`, light blue).
 * Slices with the largest `pop_sum` are colored closest to this value.
 *
 * @constant {[number, number, number]}
 */
const CHORO_HI = [227, 242, 253];  // #e3f2fd — high value (light blue)

/**
 * Linearly interpolates between two RGB colors.
 *
 * @param {[number,number,number]} lo - Start color as [R, G, B] (0–255 each).
 * @param {[number,number,number]} hi - End   color as [R, G, B] (0–255 each).
 * @param {number} t                  - Blend factor clamped to [0, 1].
 *                                      0 → lo, 1 → hi.
 * @returns {string} CSS `rgb(r,g,b)` string.
 */
function lerpColor(lo, hi, t) {
  const r = Math.round(lo[0] + (hi[0] - lo[0]) * t);
  const g = Math.round(lo[1] + (hi[1] - lo[1]) * t);
  const b = Math.round(lo[2] + (hi[2] - lo[2]) * t);
  return `rgb(${r},${g},${b})`;
}

// ── Module state ──────────────────────────────────────────────────────────────

/**
 * The active Chart.js instance.  Kept so it can be destroyed before creating a
 * new one (Chart.js throws if you call `new Chart()` on a canvas that already
 * has a chart attached).
 *
 * @type {Chart|null}
 */
let chartInstance = null;

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Attaches the close-button click listener.
 * Must be called once after the DOM is ready (i.e. inside `map.on('load', …)`).
 *
 * @returns {void}
 */
export function initPiePanel() {
  document.getElementById('pie-panel-close')
    .addEventListener('click', hide);
}

/**
 * Makes the pie-chart panel visible, updates its title, fetches the GeoJSON
 * for `layerDef`, and draws (or redraws) the pie chart.
 *
 * If the panel is already visible with a different layer's data it is
 * re-rendered in place without an animation flash.
 *
 * @param {import('./layers.js').LayerDef} layerDef - The layer whose GeoJSON
 *   should be charted.  Must have a `src` path pointing to a valid GeoJSON
 *   FeatureCollection and a human-readable `label`.
 * @returns {Promise<void>}
 */
export async function showPiePanel(layerDef) {
  const panel = document.getElementById('pie-panel');
  panel.classList.add('visible');

  document.getElementById('pie-panel-title').textContent = layerDef.label;

  const res  = await fetch(layerDef.src);
  const data = await res.json();
  renderPie(data);
}

/**
 * Hides the pie-chart panel.
 * Thin public wrapper around the internal {@link hide} function so callers do
 * not need to know about the DOM class name.
 *
 * @returns {void}
 */
export function hidePiePanel() { hide(); }

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Removes the `visible` class from the panel, hiding it via CSS transition.
 *
 * @returns {void}
 */
function hide() {
  document.getElementById('pie-panel').classList.remove('visible');
}

/**
 * Creates (or replaces) the Chart.js pie chart from a GeoJSON FeatureCollection.
 *
 * Data mapping:
 * - **Labels** come from the `pol_class_max` string property of each feature
 *   (e.g. "Low", "Medium", "High").
 * - **Slice sizes** come from the `pop_sum` numeric property — the total
 *   population exposed in that pollution class.
 * - **Slice colors** are interpolated along the color-graduated map gradient
 *   (`CHORO_LO` → `CHORO_HI`) proportional to each feature's `pop_sum`
 *   relative to the min/max across all features.  This keeps the chart colors
 *   semantically consistent with the map.
 *
 * @param {GeoJSON.FeatureCollection} geojson - The data to visualise.
 * @returns {void}
 */
function renderPie(geojson) {
  const canvas   = document.getElementById('pie-panel-canvas');
  const features = geojson.features;
  if (!features.length) return;

  // Fixed property names for the population-exposure GeoJSONs
  const labelProp = 'pol_class_max'; // string: pollution class name per polygon
  const valueProp = 'pop_sum';       // number: total population in that class

  const labels = features.map((f, i) => labelProp ? f.properties[labelProp] : `Zone ${i + 1}`);
  const values = features.map(f => valueProp ? Math.abs(f.properties[valueProp]) : 1);

  // Derive per-slice colors from the same gradient as the color-graduated map map
  let colors;
  if (valueProp) {
    const rawVals = features.map(f => f.properties[valueProp]).filter(isFinite);
    const lo      = Math.min(...rawVals);
    const hi      = Math.max(...rawVals);
    const range   = hi - lo || 1; // guard against all-equal values
    colors = features.map(f => {
      const t = (f.properties[valueProp] - lo) / range; // 0 = lowest pop → dark blue
      return lerpColor(CHORO_LO, CHORO_HI, t);
    });
  } else {
    // No numeric property: distribute evenly across the gradient
    const n = Math.max(features.length - 1, 1);
    colors = features.map((_, i) => lerpColor(CHORO_LO, CHORO_HI, i / n));
  }

  // Destroy any previous chart before re-using the canvas
  if (chartInstance) { chartInstance.destroy(); chartInstance = null; }

  chartInstance = new Chart(canvas, {
    type: 'pie',
    data: {
      labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     '#0f172a', // dark border between slices for separation
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
            color:   '#94a3b8',  // muted text color to suit the dark UI theme
            font:    { size: 11 },
            padding: 10,
          },
        },
        tooltip: {
          callbacks: {
            /** Show the polygon's pollution class as the tooltip title. */
            title: ctx => ctx[0].label,

            /**
             * Show two lines per slice:
             * 1. The raw `pop_sum` value with the property name as context.
             * 2. The percentage share of total population represented by that slice.
             *
             * @param {import('chart.js').TooltipItem<'pie'>} ctx
             * @returns {string[]}
             */
            label: ctx => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct   = ((ctx.parsed / total) * 100).toFixed(1);
              const val   = ctx.parsed.toLocaleString(undefined, { maximumFractionDigits: 3 });
              return [
                ` ${valueProp ?? 'value'}: ${val}`,
                ` Share: ${pct}% of total`,
              ];
            },
          },
        },
      },
    },
  });
}
