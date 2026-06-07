/**
 * @fileoverview Central configuration for the WebGIS application.
 *
 * All environment-sensitive values (API token, map defaults, file paths) live
 * here so the rest of the codebase never hard-codes them.  
 *
 * @module config
 */

/**
 * Mapbox GL JS public access token.
 * Sourced from `env.js` which is excluded from version control.
 * Restricting this token to your GitHub Pages origin in the Mapbox dashboard
 * prevents unauthorised map tile usage.
 *
 * @type {string}
 */
export { MAPBOX_TOKEN } from '../env.js';

/**
 * Default map centre coordinates for Hungary.
 * Format: [longitude, latitude] as required by Mapbox GL JS.
 *
 * @type {[number, number]}
 */
export const HUNGARY_CENTER = [19.5033, 47.1624];

/**
 * Default zoom level that shows the whole of Hungary at startup.
 * Zoom 6–7 gives a good overview of country-level data.
 *
 * @type {number}
 */
export const HUNGARY_ZOOM = 6.4;

/**
 * Mapbox style URL for the initial dark basemap.
 * Users can switch basemaps at runtime via the switcher buttons in main.js.
 *
 * @type {string}
 */
export const BASE_STYLE = 'mapbox://styles/mapbox/dark-v11';

/**
 * Paths to every data file used by the application, grouped by pollutant.
 * All paths are relative to the repository root so they work on both
 * localhost and GitHub Pages without any path rewriting.
 *
 * Each pollutant has five datasets:
 * - `avg2021`    – GeoTIFF: annual average concentration for 2021
 * - `avg2023`    – GeoTIFF: annual average concentration for 2023
 * - `change`     – GeoTIFF: pixel-level difference (2023 − 2021)
 * - `population` – GeoJSON: sub-national polygons with population-weighted
 *                  exposure statistics (drives choropleth + pie chart)
 * - `bivariate`  – GeoJSON: polygons pre-coloured for the bivariate map
 *                  (pollution level × population density)
 *
 * @type {{
 *   no2:  { avg2021: string, avg2023: string, change: string, population: string, bivariate: string },
 *   pm10: { avg2021: string, avg2023: string, change: string, population: string, bivariate: string },
 *   pm25: { avg2021: string, avg2023: string, change: string, population: string, bivariate: string },
 * }}
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
