/**
 * Legend panel — renders into #legend (bottom-left of the map).
 * Call renderLegend(def, meta) after a layer is activated.
 * `meta` carries whatever the loader computed (min/max for tiff, stops/swatches for GeoJSON).
 */

const TIFF_GRADIENT = 'linear-gradient(to right, #1e3a5f, #f0c040, #c0392b)';
const CHORO_GRADIENT = 'linear-gradient(to right, #0d47a1, #e3f2fd)';

export function renderLegend(def, meta = {}) {
  const el = document.getElementById('legend');
  if (!el) return;

  el.innerHTML = '';
  el.style.display = 'block';

  const title = document.createElement('div');
  title.className = 'legend-title';
  title.textContent = def.label;
  el.appendChild(title);

  if (def.type === 'tiff') {
    renderGradientLegend(el, TIFF_GRADIENT, meta.min, meta.max);
  } else if (def.type === 'geojson-choropleth') {
    renderGradientLegend(el, CHORO_GRADIENT, meta.min, meta.max, meta.prop);
  } else if (def.type === 'geojson-bivariate') {
    renderSwatchLegend(el, meta.swatches ?? []);
  }
}

export function hideLegend() {
  const el = document.getElementById('legend');
  if (el) el.style.display = 'none';
}

// ── Gradient bar (tiff + choropleth) ─────────────────────────────────────────

function renderGradientLegend(el, gradient, min, max, prop) {
  if (prop) {
    const propEl = document.createElement('div');
    propEl.className = 'legend-prop';
    propEl.textContent = prop;
    el.appendChild(propEl);
  }

  const bar = document.createElement('div');
  bar.className = 'legend-gradient-bar';
  bar.style.background = gradient;
  el.appendChild(bar);

  const ticks = document.createElement('div');
  ticks.className = 'legend-ticks';
  const lo = min != null ? fmt(min) : 'Low';
  const hi = max != null ? fmt(max) : 'High';
  ticks.innerHTML = `<span>${lo}</span><span>${hi}</span>`;
  el.appendChild(ticks);
}

// ── Swatches (bivariate) ──────────────────────────────────────────────────────

function renderSwatchLegend(el, swatches) {
  if (!swatches.length) {
    const msg = document.createElement('div');
    msg.className = 'legend-prop';
    msg.textContent = 'Colors from fill property';
    el.appendChild(msg);
    return;
  }

  const wrap = document.createElement('div');
  wrap.className = 'legend-swatches';
  swatches.forEach(({ color, label }) => {
    const row = document.createElement('div');
    row.className = 'legend-swatch-row';
    row.innerHTML = `<span class="legend-swatch" style="background:${color}"></span><span class="legend-swatch-label">${label}</span>`;
    wrap.appendChild(row);
  });
  el.appendChild(wrap);
}

function fmt(n) {
  if (Math.abs(n) >= 1000) return n.toFixed(0);
  if (Math.abs(n) >= 1)    return n.toFixed(2);
  return n.toExponential(2);
}
