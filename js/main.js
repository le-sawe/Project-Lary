import { MAPBOX_TOKEN, HUNGARY_CENTER, HUNGARY_ZOOM, BASE_STYLE } from './config.js';
import { buildSidebar }     from './sidebar.js';
import { initPiePanel }     from './pie-panel.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

const map = new mapboxgl.Map({
  container: 'map',
  style:     BASE_STYLE,
  center:    HUNGARY_CENTER,
  zoom:      HUNGARY_ZOOM,
});

map.addControl(new mapboxgl.NavigationControl(), 'top-left');
map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

map.on('load', () => {
  initPiePanel();
  buildSidebar(map);
});

// Basemap switcher
const STYLES = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  streets:   'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  osm: {
    version: 8,
    sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
    layers:  [{ id: 'osm', type: 'raster', source: 'osm' }],
  },
};

document.querySelectorAll('[data-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-style]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    map.setStyle(STYLES[btn.dataset.style]);
  });
});
