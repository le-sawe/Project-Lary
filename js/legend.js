/**
 * @fileoverview Legend panel renderer.
 *
 * Renders contextual legends into the `#legend` element (bottom-left of the
 * map).  The correct legend type is chosen automatically based on the active
 * layer's `type` field:
 *
 * | Layer type             | Legend style                                  |
 * |------------------------|-----------------------------------------------|
 * | `tiff`                 | Gradient bar: dark-blue → gold → crimson      |
 * | `geojson-choropleth`   | Gradient bar: dark-blue → light-blue          |
 * | `geojson-bivariate`    | Colour swatches with one row per class        |
 *
 * The gradient colours in this file MUST stay in sync with:
 * - `tiff-loader.js`    → `colormap()` (TIFF gradient)
 * - `layer-manager.js`  → `addChoropleth()` (choropleth fill expression)
 * - `pie-panel.js`      → `CHORO_LO / CHORO_HI` (pie slice colours)
 *
 * Public API:
 *  - {@link renderLegend} – draw the legend for the newly active layer.
 *  - {@link hideLegend}   – hide the legend panel (e.g. when no layer is active).
 *
 * @module legend
 */

/**
 * CSS gradient string for single-band GeoTIFF layers.
 * Matches the two-segment colour ramp in `tiff-loader.js:colormap()`.
 * Low → mid → high pollution: dark blue → gold → crimson.
 *
 * @constant {string}
 */
const TIFF_GRADIENT = 'linear-gradient(to right, #1e3a5f, #f0c040, #c0392b)';

/**
 * CSS gradient string for GeoJSON choropleth layers.
 * Matches the Mapbox `interpolate` expression in `layer-manager.js:addChoropleth()`.
 * Low → high value: dark blue → light blue.
 *
 * @constant {string}
 */
const CHORO_GRADIENT = 'linear-gradient(to right, #0d47a1, #e3f2fd)';

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Renders the legend for the layer described by `def`.
 *
 * The `meta` object is produced by the layer loader (`layer-manager.js`) and
 * carries the data-specific information needed to annotate the legend:
 * - `min` / `max` – actual value range for gradient tick labels.
 * - `prop`        – name of the choropleth property shown above the bar.
 * - `swatches`    – array of `{ color, label }` pairs for bivariate layers.
 *
 * @param {import('./layers.js').LayerDef} def  - The active layer definition.
 * @param {{ min?: number, max?: number, prop?: string,
 *           swatches?: { color: string, label: string }[] }} [meta={}]
 *                                              - Loader-computed metadata.
 * @returns {void}
 */
export function renderLegend(def, meta = {}) {
  const el = document.getElementById('legend');
  if (!el) return;

  // Clear previous legend content and make the panel visible
  el.innerHTML = '';
  el.style.display = 'block';

  // Layer name as the legend title
  const title = document.createElement('div');
  title.className  = 'legend-title';
  title.textContent = def.label;
  el.appendChild(title);

  // Delegate to the appropriate renderer based on layer type
  if (def.type === 'tiff') {
    renderGradientLegend(el, TIFF_GRADIENT, meta.min, meta.max);
  } else if (def.type === 'geojson-choropleth') {
    renderGradientLegend(el, CHORO_GRADIENT, meta.min, meta.max, meta.prop);
  } else if (def.type === 'geojson-bivariate') {
    renderSwatchLegend(el, meta.swatches ?? []);
  }
}

/**
 * Hides the legend panel without destroying its content.
 * Call this when no layer is active or during a layer transition if needed.
 *
 * @returns {void}
 */
export function hideLegend() {
  const el = document.getElementById('legend');
  if (el) el.style.display = 'none';
}

// ── Gradient legend (tiff + choropleth) ──────────────────────────────────────

/**
 * Appends a horizontal colour-gradient bar with min/max tick labels to `el`.
 *
 * Layout:
 * ```
 * [prop name]           ← optional, choropleth only
 * [████████████████]    ← gradient bar
 *  lo value   hi value  ← tick labels
 * ```
 *
 * If `min` or `max` is null (e.g. a multi-band TIFF), the ticks fall back to
 * the strings "Low" and "High".
 *
 * @param {HTMLElement}  el       - Container element to append into.
 * @param {string}       gradient - CSS `linear-gradient(...)` string.
 * @param {number|null}  min      - Minimum data value (for the left tick label).
 * @param {number|null}  max      - Maximum data value (for the right tick label).
 * @param {string}      [prop]    - Optional property name shown above the bar.
 * @returns {void}
 */
function renderGradientLegend(el, gradient, min, max, prop) {
  // Optional property label above the bar
  if (prop) {
    const propEl = document.createElement('div');
    propEl.className  = 'legend-prop';
    propEl.textContent = prop;
    el.appendChild(propEl);
  }

  // Colour-gradient bar
  const bar = document.createElement('div');
  bar.className       = 'legend-gradient-bar';
  bar.style.background = gradient;
  el.appendChild(bar);

  // Tick labels below the bar
  const ticks = document.createElement('div');
  ticks.className = 'legend-ticks';
  const lo = min != null ? fmt(min) : 'Low';
  const hi = max != null ? fmt(max) : 'High';
  ticks.innerHTML = `<span>${lo}</span><span>${hi}</span>`;
  el.appendChild(ticks);
}

// ── Swatch legend (bivariate) ─────────────────────────────────────────────────

/**
 * Appends a list of coloured square swatches with labels to `el`.
 * Used for bivariate layers where each class has a distinct categorical colour.
 *
 * If `swatches` is empty (e.g. the GeoJSON lacks a recognised fill property),
 * a short explanatory message is shown instead.
 *
 * @param {HTMLElement} el       - Container element to append into.
 * @param {{ color: string, label: string }[]} swatches
 *                               - Up to 12 colour/label pairs extracted by
 *                                 `layer-manager.js:addBivariate()`.
 * @returns {void}
 */
function renderSwatchLegend(el, swatches) {
  if (!swatches.length) {
    const msg = document.createElement('div');
    msg.className  = 'legend-prop';
    msg.textContent = 'Colors from fill property';
    el.appendChild(msg);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'legend-swatches';

  swatches.forEach(({ color, label }) => {
    const row = document.createElement('div');
    row.className = 'legend-swatch-row';
    row.innerHTML = `<span class="legend-swatch" style="background:${color}"></span>`
                  + `<span class="legend-swatch-label">${label}</span>`;
    wrap.appendChild(row);
  });

  el.appendChild(wrap);
}

// ── Formatting helper ─────────────────────────────────────────────────────────

/**
 * Formats a numeric value for display in legend tick labels.
 *
 * Rules (chosen to keep labels short without losing meaningful precision):
 * - |n| ≥ 1000 → integer (e.g. "12345")
 * - |n| ≥ 1    → two decimal places (e.g. "3.14")
 * - |n| < 1    → scientific notation with two significant digits (e.g. "3.14e-5")
 *
 * @param {number} n - The value to format.
 * @returns {string} Human-readable string representation.
 */
function fmt(n) {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1)    return n.toFixed(2);
  return n.toExponential(2);
}
