/**
 * sidebar.js — builds the layer-picker UI and handles selection.
 *
 * We have two levels of UI here:
 *   1. Group tabs (NO₂ / PM10 / PM2.5) at the top of the sidebar.
 *      Clicking a tab swaps out the list below it.
 *   2. Layer rows inside the active tab — one radio button per layer.
 *      All radios share the name "active-layer" so the browser enforces
 *      exactly one selection at a time across all groups, even when you
 *      switch tabs.
 *
 * Layers flagged with pie: true also get a small ◑ button that opens the
 * pie chart panel independently from activating the layer itself — handy
 * if you just want a quick look at the distribution without switching the
 * map view.
 *
 * Call buildSidebar(map) once after the map finishes loading.
 */

import { LAYERS, GROUPS }                   from './layers.js';
import { activateLayer, getActiveLayerId }  from './layer-manager.js';
import { showPiePanel }                     from './pie-panel.js';

/**
 * Creates the group tabs and the initial layer list, then activates
 * whichever layer has default: true in layers.js.
 *
 * @param {mapboxgl.Map} map - passed through to layer-manager when a layer is selected
 */
export function buildSidebar(map) {
  const tabsEl = document.getElementById('group-tabs');
  const listEl = document.getElementById('layer-list');

  GROUPS.forEach((g, i) => {
    const btn = document.createElement('button');
    btn.className     = 'group-tab' + (i === 0 ? ' active' : '');
    btn.textContent   = g.label;
    btn.dataset.group = g.id;

    btn.addEventListener('click', () => {
      document.querySelectorAll('.group-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLayerList(map, listEl, g.id);
    });

    tabsEl.appendChild(btn);
  });

  // Show the first group right away so the sidebar isn't empty on load.
  renderLayerList(map, listEl, GROUPS[0].id);

  // Activate the default layer so the map has something on it immediately.
  const first = LAYERS.find(l => l.default);
  if (first) activateLayer(map, first);
}

/**
 * Clears the layer list and re-builds it for the given group.
 * Called on tab click and once during initial setup.
 *
 * We re-check getActiveLayerId() each time so the correct radio stays
 * checked after the user switches tabs and comes back.
 *
 * @param {mapboxgl.Map} map       - passed through to activateLayer
 * @param {HTMLElement}  container - the #layer-list element
 * @param {string}       groupId   - 'no2', 'pm10', or 'pm25'
 */
function renderLayerList(map, container, groupId) {
  container.innerHTML = '';

  LAYERS.filter(l => l.group === groupId).forEach(def => {
    const row = document.createElement('div');
    row.className = 'layer-row';

    // Radio — all share the same name so only one can be selected globally.
    const radio = document.createElement('input');
    radio.type      = 'radio';
    radio.name      = 'active-layer';
    radio.id        = 'radio-' + def.id;
    radio.className = 'layer-radio';
    radio.checked   = getActiveLayerId() === def.id;

    const lbl = document.createElement('label');
    lbl.htmlFor     = radio.id;
    lbl.className   = 'layer-label';
    lbl.textContent = def.label;

    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      await activateLayer(map, def);
      // Population-exposure layers auto-open the pie chart on selection.
      if (def.pie) showPiePanel(def);
    });

    row.appendChild(radio);
    row.appendChild(lbl);

    // Pie-chart shortcut button — only shown for population layers.
    if (def.pie) {
      const btn = document.createElement('button');
      btn.className   = 'pie-btn';
      btn.title       = 'Show pie chart';
      btn.textContent = '◑';
      btn.addEventListener('click', () => showPiePanel(def));
      row.appendChild(btn);
    }

    container.appendChild(row);
  });
}
