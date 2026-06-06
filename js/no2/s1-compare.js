/**
 * Section 1 – Average NO2 in 2021 vs 2023 (swipe compare) + Change map
 */
import { createMap }    from '../map-factory.js';
import { addTiffLayer } from '../tiff-loader.js';
import { DATA_PATHS }   from '../config.js';

export async function initSection1() {
  // ── Swipe map ──────────────────────────────────────────────────────────────
  const [mapBefore, mapAfter] = await Promise.all([
    createMap('map-s1-before'),
    createMap('map-s1-after'),
  ]);

  await Promise.all([
    addTiffLayer(mapBefore, 'no2-2021', DATA_PATHS.no2.avg2021),
    addTiffLayer(mapAfter,  'no2-2023', DATA_PATHS.no2.avg2023),
  ]);

  const compare = new mapboxgl.Compare(mapBefore, mapAfter, '#map-s1-compare', {
    mousemove: false,
    orientation: 'vertical',
  });

  // Add simple legends
  addSingleBandLegend('legend-s1-before', 'Avg NO₂ 2021', '#1e3a5f', '#f0c040', '#c0392b');
  addSingleBandLegend('legend-s1-after',  'Avg NO₂ 2023', '#1e3a5f', '#f0c040', '#c0392b');

  // ── Change map ─────────────────────────────────────────────────────────────
  const mapChange = await createMap('map-s1-change');
  await addTiffLayer(mapChange, 'no2-change', DATA_PATHS.no2.change);
  addSingleBandLegend('legend-s1-change', 'NO₂ Change 2021→2023', '#1e3a5f', '#f0c040', '#c0392b');
}

function addSingleBandLegend(containerId, label, lowColor, midColor, highColor) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = `
    <span class="legend-label">${label}</span>
    <div class="legend-gradient" style="background:linear-gradient(to right,${lowColor},${midColor},${highColor})"></div>
    <div class="legend-ticks"><span>Low</span><span>High</span></div>
  `;
}
