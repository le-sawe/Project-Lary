import { LAYERS, GROUPS }         from './layers.js';
import { activateLayer, getActiveLayerId } from './layer-manager.js';
import { showPiePanel }           from './pie-panel.js';

export function buildSidebar(map) {
  const tabsEl = document.getElementById('group-tabs');
  const listEl = document.getElementById('layer-list');

  GROUPS.forEach((g, i) => {
    const btn = document.createElement('button');
    btn.className   = 'group-tab' + (i === 0 ? ' active' : '');
    btn.textContent = g.label;
    btn.dataset.group = g.id;
    btn.addEventListener('click', () => {
      document.querySelectorAll('.group-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderLayerList(map, listEl, g.id);
    });
    tabsEl.appendChild(btn);
  });

  renderLayerList(map, listEl, GROUPS[0].id);

  // Activate the first default layer
  const first = LAYERS.find(l => l.default);
  if (first) activateLayer(map, first);
}

function renderLayerList(map, container, groupId) {
  container.innerHTML = '';
  const groupLayers = LAYERS.filter(l => l.group === groupId);

  groupLayers.forEach(def => {
    const row = document.createElement('div');
    row.className = 'layer-row';

    const radio = document.createElement('input');
    radio.type      = 'radio';
    radio.name      = 'active-layer';   // one global radio group
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
      if (def.pie) showPiePanel(def);
    });

    row.appendChild(radio);
    row.appendChild(lbl);

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
