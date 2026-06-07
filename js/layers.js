/**
 * @fileoverview Layer catalogue for the WebGIS application.
 *
 * Every map layer the user can activate is described here as a plain object.
 * Keeping all layer definitions in one place makes it easy to add, remove, or
 * reorder layers without touching any rendering code.
 *
 * Layer objects are consumed by:
 * - `sidebar.js`       – builds the UI radio buttons and group tabs
 * - `layer-manager.js` – loads data and adds Mapbox GL layers
 * - `pie-panel.js`     – shows the pie chart when `def.pie === true`
 * - `legend.js`        – renders the appropriate legend for each type
 *
 * @module layers
 */

import { DATA_PATHS } from './config.js';

/**
 * @typedef {Object} LayerDef
 * @property {string}  id      - Unique layer identifier used as the Mapbox source/layer id.
 * @property {string}  label   - Human-readable name shown in the sidebar and panel title.
 * @property {string}  group   - Pollutant group id ('no2' | 'pm10' | 'pm25'); controls which
 *                               tab the layer appears under.
 * @property {'tiff'|'geojson-choropleth'|'geojson-bivariate'} type
 *                             - Determines how layer-manager loads and styles the data.
 * @property {string}  src     - URL / path to the data file (GeoTIFF or GeoJSON).
 * @property {boolean} [default] - If true this layer is activated automatically on startup.
 * @property {boolean} [pie]    - If true a pie-chart button is shown next to the layer and
 *                               the chart is opened automatically when the layer is selected.
 */

/**
 * Complete list of all map layers available in the application.
 * The order within each group is the order they appear in the sidebar.
 *
 * Three pollutant groups, five layers each:
 * 1. Average concentration 2021 (GeoTIFF raster)
 * 2. Average concentration 2023 (GeoTIFF raster)
 * 3. Change 2021→2023          (GeoTIFF raster, signed difference)
 * 4. Population exposure        (GeoJSON choropleth + pie chart)
 * 5. Bivariate                  (GeoJSON with pre-computed fill colours)
 *
 * @type {LayerDef[]}
 */
export const LAYERS = [
  // ── NO₂ ───────────────────────────────────────────────────────────────────
  { id: 'no2-avg-2021',   label: 'Avg NO₂ 2021',           group: 'no2',  type: 'tiff',               src: DATA_PATHS.no2.avg2021,   default: true },
  { id: 'no2-avg-2023',   label: 'Avg NO₂ 2023',           group: 'no2',  type: 'tiff',               src: DATA_PATHS.no2.avg2023                  },
  { id: 'no2-change',     label: 'NO₂ Change 2021→2023',   group: 'no2',  type: 'tiff',               src: DATA_PATHS.no2.change                   },
  { id: 'no2-population', label: 'NO₂ Population Exposure', group: 'no2', type: 'geojson-choropleth', src: DATA_PATHS.no2.population, pie: true    },
  { id: 'no2-bivariate',  label: 'NO₂ Bivariate',          group: 'no2',  type: 'geojson-bivariate',  src: DATA_PATHS.no2.bivariate                },

  // ── PM10 ──────────────────────────────────────────────────────────────────
  { id: 'pm10-avg-2021',   label: 'Avg PM10 2021',           group: 'pm10', type: 'tiff',               src: DATA_PATHS.pm10.avg2021                 },
  { id: 'pm10-avg-2023',   label: 'Avg PM10 2023',           group: 'pm10', type: 'tiff',               src: DATA_PATHS.pm10.avg2023                 },
  { id: 'pm10-change',     label: 'PM10 Change 2021→2023',   group: 'pm10', type: 'tiff',               src: DATA_PATHS.pm10.change                  },
  { id: 'pm10-population', label: 'PM10 Population Exposure', group: 'pm10',type: 'geojson-choropleth', src: DATA_PATHS.pm10.population, pie: true   },
  { id: 'pm10-bivariate',  label: 'PM10 Bivariate',          group: 'pm10', type: 'geojson-bivariate',  src: DATA_PATHS.pm10.bivariate               },

  // ── PM2.5 ─────────────────────────────────────────────────────────────────
  { id: 'pm25-avg-2021',   label: 'Avg PM2.5 2021',           group: 'pm25', type: 'tiff',               src: DATA_PATHS.pm25.avg2021                 },
  { id: 'pm25-avg-2023',   label: 'Avg PM2.5 2023',           group: 'pm25', type: 'tiff',               src: DATA_PATHS.pm25.avg2023                 },
  { id: 'pm25-change',     label: 'PM2.5 Change 2021→2023',   group: 'pm25', type: 'tiff',               src: DATA_PATHS.pm25.change                  },
  { id: 'pm25-population', label: 'PM2.5 Population Exposure', group: 'pm25',type: 'geojson-choropleth', src: DATA_PATHS.pm25.population, pie: true   },
  { id: 'pm25-bivariate',  label: 'PM2.5 Bivariate',          group: 'pm25', type: 'geojson-bivariate',  src: DATA_PATHS.pm25.bivariate               },
];

/**
 * Ordered list of pollutant groups shown as tabs in the sidebar.
 * Each group id must match the `group` field used in {@link LAYERS}.
 *
 * @type {{ id: string, label: string }[]}
 */
export const GROUPS = [
  { id: 'no2',  label: 'NO₂'   },
  { id: 'pm10', label: 'PM10'  },
  { id: 'pm25', label: 'PM2.5' },
];
