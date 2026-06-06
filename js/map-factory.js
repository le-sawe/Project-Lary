import { MAPBOX_TOKEN, BASE_STYLE, HUNGARY_CENTER, HUNGARY_ZOOM } from './config.js';

mapboxgl.accessToken = MAPBOX_TOKEN;

/**
 * Creates a Mapbox GL map and waits for it to load.
 * @param {string} containerId  - DOM element id
 * @param {object} opts         - Mapbox Map option overrides
 * @returns {Promise<mapboxgl.Map>}
 */
export function createMap(containerId, opts = {}) {
  const map = new mapboxgl.Map({
    container: containerId,
    style: BASE_STYLE,
    center: HUNGARY_CENTER,
    zoom: HUNGARY_ZOOM,
    ...opts,
  });
  map.addControl(new mapboxgl.NavigationControl(), 'top-left');
  map.addControl(new mapboxgl.ScaleControl(), 'bottom-left');

  return new Promise(resolve => map.on('load', () => resolve(map)));
}
