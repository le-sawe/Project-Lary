/**
 * @fileoverview Application entry point.
 *
 * Responsibilities:
 * 1. Initialise the Mapbox GL JS map with the configured centre, zoom, and style.
 * 2. Add the Navigation and Scale controls.
 * 3. On map load, wire up the sidebar (layer switcher) and the pie-chart panel.
 * 4. Register the basemap-switcher buttons so users can change the background
 *    tile style without reloading the page.
 *
 * This file is intentionally thin — all domain logic lives in the imported modules.
 *
 * @module main
 */

import { MAPBOX_TOKEN, HUNGARY_CENTER, HUNGARY_ZOOM, BASE_STYLE } from './config.js';
import { buildSidebar }  from './sidebar.js';
import { initPiePanel }  from './pie-panel.js';

// ── Map initialisation ────────────────────────────────────────────────────────

/** Set the Mapbox public token before constructing the map object. */
mapboxgl.accessToken = MAPBOX_TOKEN;

/**
 * The single shared Mapbox GL JS map instance.
 * All modules that need to add sources or layers receive this reference
 * through function arguments rather than importing it directly, which makes
 * each module easier to test in isolation.
 *
 * @type {mapboxgl.Map}
 */
const map = new mapboxgl.Map({
  container: 'map',       // id of the <div> in webgis.html
  style:     BASE_STYLE,
  center:    HUNGARY_CENTER,
  zoom:      HUNGARY_ZOOM,
});

// Standard navigation widget (zoom +/- and compass) placed top-left.
map.addControl(new mapboxgl.NavigationControl(), 'top-left');

// Distance scale bar placed bottom-left next to the legend.
map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

// ── Post-load setup ───────────────────────────────────────────────────────────

/**
 * Wait for the base style to finish loading before adding any sources or
 * layers, and before building the sidebar (which immediately activates the
 * default layer).
 */
map.on('load', () => {
  initPiePanel();   // attach the close-button listener on the floating panel
  buildSidebar(map); // render group tabs + layer rows and activate the default layer
});

// ── Basemap switcher ──────────────────────────────────────────────────────────

/**
 * Available basemap styles keyed by the value of each button's `data-style`
 * attribute in the HTML.
 *
 * - `dark`      – Mapbox dark theme (default; best contrast for data overlays)
 * - `streets`   – Mapbox streets theme
 * - `satellite` – Mapbox satellite + streets labels
 * - `osm`       – OpenStreetMap raster tiles via a minimal inline style object
 *                 (no Mapbox account usage, useful for demos)
 *
 * @type {Record<string, string|object>}
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

/**
 * Attach click listeners to every element that carries a `data-style`
 * attribute.  Clicking one button:
 * 1. Removes the `active` class from all style buttons.
 * 2. Adds `active` to the clicked button for visual feedback.
 * 3. Calls `map.setStyle()` which triggers a full style reload.
 *
 * Note: `setStyle()` removes all sources and layers added at runtime.
 * If you need data layers to survive a style swap, re-add them inside a
 * `map.once('style.load', ...)` callback after calling setStyle.
 */
document.querySelectorAll('[data-style]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('[data-style]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    map.setStyle(STYLES[btn.dataset.style]);
  });
});
