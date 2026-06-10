/**
 * main.js — entry point, wires everything together.
 *
 * This file is intentionally small.  It creates the map, waits for it to
 * load, then hands off to the sidebar and pie panel modules.  All the real
 * logic lives elsewhere.
 *
 * It also handles the basemap switcher buttons at the bottom of the UI.
 * Worth noting: calling map.setStyle() nukes every source and layer we
 * added at runtime.  We handle this by listening for style.load and calling
 * reloadAfterStyleSwap(), which evicts the active layer from the loaded cache
 * and re-adds it on top of the new basemap tiles.
 */

import { MAPBOX_TOKEN, HUNGARY_CENTER, HUNGARY_ZOOM, BASE_STYLE } from './config.js';
import { buildSidebar }           from './sidebar.js';
import { initPiePanel }           from './pie-panel.js';
import { reloadAfterStyleSwap }   from './layer-manager.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

class CursorCoordsControl {
  onAdd(map) {
    this._map = map;
    this._container = document.createElement('div');
    this._container.className = 'mapboxgl-ctrl mapboxgl-ctrl-group cursor-coords-ctrl';
    this._container.textContent = '—';
    map.on('mousemove', e => {
      this._container.textContent =
        `${e.lngLat.lng.toFixed(5)},  ${e.lngLat.lat.toFixed(5)}`;
    });
    map.getCanvas().addEventListener('mouseleave', () => {
      this._container.textContent = '—';
    });
    return this._container;
  }
  onRemove() {
    this._container.remove();
    this._map = undefined;
  }
}

/**
 * The one shared map instance.  We pass this into other modules as a
 * function argument rather than exporting it, so each module stays easy
 * to reason about in isolation.
 */
const map = new mapboxgl.Map({
  container: 'map',       // the <div id="map"> in webgis.html
  style:     BASE_STYLE,
  center:    HUNGARY_CENTER,
  zoom:      HUNGARY_ZOOM,
});

map.addControl(new mapboxgl.NavigationControl(), 'top-left');
map.addControl(new mapboxgl.FullscreenControl(), 'top-left');
map.addControl(new mapboxgl.ScaleControl(), 'top-left');
map.addControl(new CursorCoordsControl(), 'top-left');

// Wait for the base style tiles to finish before we try to add sources/layers.
map.on('load', () => {
  initPiePanel();    // attaches the close-button listener on the floating panel
  buildSidebar(map); // builds the tab + layer list and activates the default layer
});

// ── Basemap switcher ──────────────────────────────────────────────────────────

/**
 * Each button in the HTML has a data-style attribute that maps to one of
 * these keys.  The OSM entry is a full inline style object because OSM
 * tiles don't use the Mapbox style spec — we build the minimum needed.
 */
const STYLES = {
  dark:      'mapbox://styles/mapbox/dark-v11',
  streets:   'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  osm: {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors',
      },
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
  },
};

// Hook up each basemap button: clear the active class from all, set it on the
// clicked one, then swap the style.  After the new style tiles load we
// re-add the active data layer on top so it isn't lost.
document.querySelectorAll('[data-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-style]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    map.once('style.load', () => reloadAfterStyleSwap(map));
    map.setStyle(STYLES[btn.dataset.style]);
  });
});
