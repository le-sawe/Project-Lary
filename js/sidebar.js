/**
 * @fileoverview Sidebar UI — group tabs and layer-selection rows.
 *
 * The sidebar lets users switch between pollutant groups (NO₂ / PM10 / PM2.5)
 * and select exactly one layer within the active group.  Each layer with
 * `def.pie === true` also gets a small button that opens the pie-chart panel.
 *
 * Public API:
 *  - {@link buildSidebar} – called once after the map loads.
 *
 * @module sidebar
 */

import { LAYERS, GROUPS }                      from './layers.js';
import { activateLayer, getActiveLayerId }     from './layer-manager.js';
import { showPiePanel }                        from './pie-panel.js';

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Builds the full sidebar UI and wires up all event listeners.
 *
 * Steps:
 * 1. Creates one `<button class="group-tab">` per pollutant group and appends
 *    them to `#group-tabs`.  Clicking a tab re-renders the layer list below.
 * 2. Renders the layer list for the first group immediately.
 * 3. Activates the first layer that has `default: true` in its definition so
 *    the map is not blank on startup.
 *
 * @param {mapboxgl.Map} map - The live Mapbox GL map instance passed through to
 *                             layer-manager when a layer is selected.
 * @returns {void}
 */
export function buildSidebar(map) {
  const tabsEl = document.getElementById('group-tabs');
  const listEl = document.getElementById('layer-list');

  // Create one tab button per pollutant group
  GROUPS.forEach((g, i) => {
    const btn = document.createElement('button');
    btn.className    = 'group-tab' + (i === 0 ? ' active' : '');
    btn.textContent  = g.label;
    btn.dataset.group = g.id;

    btn.addEventListener('click', () => {
      // Deactivate all tabs, then mark this one active
      document.querySelectorAll('.group-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLayerList(map, listEl, g.id);
    });

    tabsEl.appendChild(btn);
  });

  // Show the first group's layers immediately
  renderLayerList(map, listEl, GROUPS[0].id);

  // Activate the default layer so the map is not empty on load
  const first = LAYERS.find(l => l.default);
  if (first) activateLayer(map, first);
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Clears and re-populates the layer list for the given group.
 *
 * Each layer gets a row containing:
 * - A radio button (all layers share the name `"active-layer"` so only one
 *   can be selected at a time across all groups).
 * - A `<label>` displaying the layer's human-readable name.
 * - Optionally, a small `◑` button that opens the pie-chart panel without
 *   requiring the layer to be activated first (useful for quick comparisons).
 *
 * Selecting a radio button:
 * 1. Calls {@link activateLayer} which loads the data if needed and shows it.
 * 2. If the layer has `pie: true`, automatically opens the pie-chart panel.
 *
 * @param {mapboxgl.Map} map        - Passed through to activateLayer.
 * @param {HTMLElement}  container  - The `#layer-list` element to populate.
 * @param {string}       groupId    - The pollutant group whose layers to show.
 * @returns {void}
 */
function renderLayerList(map, container, groupId) {
  container.innerHTML = '';
  const groupLayers = LAYERS.filter(l => l.group === groupId);

  groupLayers.forEach(def => {
    // ── Row wrapper ──────────────────────────────────────────────────────────
    const row = document.createElement('div');
    row.className = 'layer-row';

    // ── Radio button ─────────────────────────────────────────────────────────
    const radio = document.createElement('input');
    radio.type      = 'radio';
    radio.name      = 'active-layer'; // single global radio group — one layer at a time
    radio.id        = 'radio-' + def.id;
    radio.className = 'layer-radio';
    // Preserve the selected state when the user switches tabs and comes back
    radio.checked   = getActiveLayerId() === def.id;

    // ── Label ────────────────────────────────────────────────────────────────
    const lbl = document.createElement('label');
    lbl.htmlFor    = radio.id;
    lbl.className  = 'layer-label';
    lbl.textContent = def.label;

    // ── Radio change handler ─────────────────────────────────────────────────
    radio.addEventListener('change', async () => {
      if (!radio.checked) return;
      await activateLayer(map, def);
      // Automatically show the pie chart for population-exposure layers
      if (def.pie) showPiePanel(def);
    });

    row.appendChild(radio);
    row.appendChild(lbl);

    // ── Optional pie-chart button ────────────────────────────────────────────
    if (def.pie) {
      const btn = document.createElement('button');
      btn.className   = 'pie-btn';
      btn.title       = 'Show pie chart';
      btn.textContent = '◑';
      // Allow opening the chart independently from activating the layer
      btn.addEventListener('click', () => showPiePanel(def));
      row.appendChild(btn);
    }

    container.appendChild(row);
  });
}
