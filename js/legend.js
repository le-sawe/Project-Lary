/**
 * legend.js — draws the legend panel in the bottom-left of the map.
 *
 * Call renderLegend(def, meta) whenever a new layer is activated.
 * The function picks the right legend style based on the layer type:
 *
 *   tiff               → gradient bar (dark blue → gold → red)
 *   geojson-choropleth → gradient bar (dark blue → light blue)
 *   geojson-bivariate  → color swatches, one row per class
 *
 * The meta object comes from the layer loader in layer-manager.js and carries
 * the data-specific bits we need to annotate the legend:
 *   min, max  — actual data value range, used for the tick labels
 *   prop      — name of the property driving the choropleth color
 *   swatches  — array of { color, label } pairs for the bivariate legend
 *
 * IMPORTANT: the gradient constants here must stay in sync with:
 *   tiff-loader.js  → colormap()          (TIFF color ramp)
 *   layer-manager.js → addChoropleth()     (Mapbox fill expression stops)
 *   pie-panel.js    → CHORO_LO / CHORO_HI (pie slice colors)
 * If you change any one of those, update the others too.
 */

// Matches the two-segment ramp in tiff-loader.js: dark blue → gold → red.
const TIFF_GRADIENT  = 'linear-gradient(to right, #1e3a5f, #f0c040, #c0392b)';

// Matches the Mapbox interpolate expression in layer-manager.js: dark → light blue.
const CHORO_GRADIENT = 'linear-gradient(to right, #0d47a1, #e3f2fd)';

/**
 * Renders the correct legend for the given layer into #legend.
 *
 * @param {object} def  - layer definition from layers.js (needs .type and .label)
 * @param {object} meta - metadata returned by the layer loader:
 *                          { min, max, prop }  for tiff and choropleth
 *                          { swatches }        for bivariate
 */
export function renderLegend(def, meta = {}) {
  const el = document.getElementById('legend');
  if (!el) return;

  el.innerHTML = '';
  el.style.display = 'block';

  // Layer name as the panel title.
  const title = document.createElement('div');
  title.className   = 'legend-title';
  title.textContent = def.label;
  el.appendChild(title);

  if (def.type === 'tiff') {
    renderGradientBar(el, TIFF_GRADIENT, meta.min, meta.max);
  } else if (def.type === 'geojson-choropleth') {
    renderGradientBar(el, CHORO_GRADIENT, meta.min, meta.max, meta.prop);
  } else if (def.type === 'geojson-bivariate') {
    renderSwatches(el, meta.swatches ?? []);
  }
}

/** Hides the legend panel without clearing its content. */
export function hideLegend() {
  const el = document.getElementById('legend');
  if (el) el.style.display = 'none';
}

// ── Gradient bar (used for tiff and choropleth layers) ────────────────────────

/**
 * Appends a colored gradient bar with low/high tick labels.
 * If a property name is provided it appears above the bar — useful for the
 * choropleth so the user knows what value is being colored.
 *
 * If min/max are null (can happen for multi-band TIFFs) the ticks fall back
 * to the strings "Low" and "High".
 *
 * @param {HTMLElement} el       - the legend container
 * @param {string}      gradient - CSS linear-gradient string
 * @param {number|null} min      - left tick value
 * @param {number|null} max      - right tick value
 * @param {string}     [prop]    - optional property name shown above the bar
 */
function renderGradientBar(el, gradient, min, max, prop) {
  if (prop) {
    const propEl = document.createElement('div');
    propEl.className   = 'legend-prop';
    propEl.textContent = prop;
    el.appendChild(propEl);
  }

  const bar = document.createElement('div');
  bar.className        = 'legend-gradient-bar';
  bar.style.background = gradient;
  el.appendChild(bar);

  const ticks = document.createElement('div');
  ticks.className = 'legend-ticks';
  ticks.innerHTML = `<span>${min != null ? fmt(min) : 'Low'}</span>`
                  + `<span>${max != null ? fmt(max) : 'High'}</span>`;
  el.appendChild(ticks);
}

// ── Color swatches (used for bivariate layers) ────────────────────────────────

/**
 * Appends a list of colored squares with labels — one row per class.
 * The swatches array comes from addBivariate() in layer-manager.js which
 * scans the GeoJSON for unique fill color + label pairs (capped at 12).
 *
 * If swatches is empty (the GeoJSON didn't have a recognized fill property)
 * we show a short message instead of an empty legend.
 *
 * @param {HTMLElement} el       - the legend container
 * @param {{ color: string, label: string }[]} swatches
 */
function renderSwatches(el, swatches) {
  if (!swatches.length) {
    const msg = document.createElement('div');
    msg.className   = 'legend-prop';
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

// ── Number formatting ─────────────────────────────────────────────────────────

/**
 * Formats a number for the tick labels, keeping them short without losing
 * meaningful precision.
 *
 *   |n| >= 1000  → integer          e.g. "12345"
 *   |n| >= 1     → 2 decimal places  e.g. "3.14"
 *   |n| < 1      → scientific        e.g. "3.14e-5"
 *
 * @param {number} n
 * @returns {string}
 */
function fmt(n) {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1)    return n.toFixed(2);
  return n.toExponential(2);
}
