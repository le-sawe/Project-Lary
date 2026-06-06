/**
 * Generic swipe-compare + change map section.
 * @param {{
 *   beforeId: string, afterId: string, compareContainerId: string,
 *   changeMapId: string,
 *   legendBeforeId: string, legendAfterId: string, legendChangeId: string,
 *   tiff2021: string, tiff2023: string, tiffChange: string,
 *   label: string
 * }} cfg
 */
import { createMap }    from '../map-factory.js';
import { addTiffLayer } from '../tiff-loader.js';

export async function initCompareSection(cfg) {
  const [mapBefore, mapAfter] = await Promise.all([
    createMap(cfg.beforeId),
    createMap(cfg.afterId),
  ]);

  await Promise.all([
    addTiffLayer(mapBefore, `${cfg.label}-2021`, cfg.tiff2021),
    addTiffLayer(mapAfter,  `${cfg.label}-2023`, cfg.tiff2023),
  ]);

  new mapboxgl.Compare(mapBefore, mapAfter, `#${cfg.compareContainerId}`, {
    mousemove: false,
    orientation: 'vertical',
  });

  addGradientLegend(cfg.legendBeforeId, `Avg ${cfg.label.toUpperCase()} 2021`);
  addGradientLegend(cfg.legendAfterId,  `Avg ${cfg.label.toUpperCase()} 2023`);

  const mapChange = await createMap(cfg.changeMapId);
  await addTiffLayer(mapChange, `${cfg.label}-change`, cfg.tiffChange);
  addGradientLegend(cfg.legendChangeId, `${cfg.label.toUpperCase()} Change 2021→2023`);
}

function addGradientLegend(id, label) {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = `
    <span class="legend-label">${label}</span>
    <div class="legend-gradient" style="background:linear-gradient(to right,#1e3a5f,#f0c040,#c0392b)"></div>
    <div class="legend-ticks"><span>Low</span><span>High</span></div>
  `;
}
