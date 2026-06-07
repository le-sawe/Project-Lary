/**
 * config.js — all the stuff that changes between environments.
 *
 * We keep the Mapbox token, map defaults, and file paths here so nothing
 * else in the codebase ever hard-codes them.  If you need to swap a data
 * file or change the starting view, this is the only file you touch.
 *
 * The token lives in env.js (git-ignored) so we never accidentally commit
 * it.  In the Mapbox dashboard we also restrict it to our GitHub Pages
 * domain so if it leaks it's useless anywhere else.
 */

/** Mapbox public token — pulled from env.js, never committed. */
export { MAPBOX_TOKEN } from '../env.js';

/** [lng, lat] center of Hungary — where the map opens on load. */
export const HUNGARY_CENTER = [19.5033, 47.1624];

/** Zoom 6.4 shows the whole country with a little breathing room. */
export const HUNGARY_ZOOM = 6.4;

/** Dark basemap as default — the pollution color ramps read better on dark. */
export const BASE_STYLE = 'mapbox://styles/mapbox/dark-v11';

/**
 * Paths to every data file, grouped by pollutant.
 *
 * Each pollutant has 5 datasets:
 *   avg2021    — GeoTIFF, annual average concentration 2021
 *   avg2023    — GeoTIFF, annual average concentration 2023
 *   change     — GeoTIFF, pixel-wise difference (2023 minus 2021, can be negative)
 *   population — GeoJSON, sub-national polygons with population-weighted
 *                exposure stats; this is what drives the choropleth + pie chart
 *   bivariate  — GeoJSON, polygons pre-colored for the two-variable map
 *                (pollution level × population density combined into one color)
 *
 * Paths are relative to the repo root so they work on localhost and
 * GitHub Pages without any rewriting.
 */
export const DATA_PATHS = {
  no2: {
    avg2021:    'Data/no2/Average_NO2_pollution_for_2021_map.tif',
    avg2023:    'Data/no2/Average_NO2_pollution_for_2023_map.tif',
    change:     'Data/no2/NO2_Change_2023_2021.tif',
    population: 'Data/no2/popullation_chart.geojson',
    bivariate:  'Data/no2/bivariate_color.geojson',
  },
  pm10: {
    avg2021:    'Data/pm10/Average_PM10_pollution_for_2021_map.tif',
    avg2023:    'Data/pm10/Average_PM10_pollution_for_2023_map.tif',
    change:     'Data/pm10/PM10_Change_2023_2021.tif',
    population: 'Data/pm10/popullation_chart.geojson',
    bivariate:  'Data/pm10/bivariate_color.geojson',
  },
  pm25: {
    avg2021:    'Data/pm2p5/Average_PM2P5_pollution_for_2021_map.tif',
    avg2023:    'Data/pm2p5/Average_PM2P5_pollution_for_2023_map.tif',
    change:     'Data/pm2p5/PM2P5_Change_2023_2021.tif',
    population: 'Data/pm2p5/popullation_chart.geojson',
    bivariate:  'Data/pm2p5/bivariate_color.geojson',
  },
};
