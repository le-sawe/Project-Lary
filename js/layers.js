/**
 * layers.js — the master list of every layer in the app.
 *
 * If you want to add, remove, or reorder a layer, this is the only file
 * you need to edit.  Nothing here does any rendering — it just describes
 * what exists so sidebar.js, layer-manager.js, and pie-panel.js can work
 * off a single source of truth.
 *
 * Each layer object has these fields:
 *   id      — unique string used as the Mapbox source/layer id internally
 *   label   — the name shown in the sidebar and the pie chart panel title
 *   group   — which pollutant tab it lives under ('no2', 'pm10', or 'pm25')
 *   type    — controls how layer-manager loads and styles it:
 *               'tiff'               → GeoTIFF raster, rendered via tiff-loader.js
 *               'geojson-choropleth' → vector polygons, colored by a numeric value
 *               'geojson-bivariate'  → vector polygons, color already baked in
 *   src     — path to the data file (GeoTIFF or GeoJSON)
 *   default — (optional) if true, this layer is activated automatically on startup
 *   pie     — (optional) if true, the sidebar shows a chart button and the pie
 *             panel opens automatically when the layer is selected
 *
 * We have 3 pollutants × 5 layers each = 15 layers total.
 */

import { DATA_PATHS } from './config.js';

export const LAYERS = [
  // ── NO₂ ───────────────────────────────────────────────────────────────────
  { id: 'no2-avg-2021',   label: 'Avg NO₂ 2021',            group: 'no2',  type: 'tiff',               src: DATA_PATHS.no2.avg2021,   default: true },
  { id: 'no2-avg-2023',   label: 'Avg NO₂ 2023',            group: 'no2',  type: 'tiff',               src: DATA_PATHS.no2.avg2023                  },
  { id: 'no2-change',     label: 'NO₂ Change 2021→2023',    group: 'no2',  type: 'tiff',               src: DATA_PATHS.no2.change                   },
  { id: 'no2-population', label: 'NO₂ Population Exposure', group: 'no2',  type: 'geojson-choropleth', src: DATA_PATHS.no2.population, pie: true, prop: 'pop_sum' },
  { id: 'no2-bivariate',  label: 'NO₂ Bivariate',           group: 'no2',  type: 'geojson-bivariate',  src: DATA_PATHS.no2.bivariate                },

  // ── PM10 ──────────────────────────────────────────────────────────────────
  { id: 'pm10-avg-2021',   label: 'Avg PM10 2021',            group: 'pm10', type: 'tiff',               src: DATA_PATHS.pm10.avg2021                 },
  { id: 'pm10-avg-2023',   label: 'Avg PM10 2023',            group: 'pm10', type: 'tiff',               src: DATA_PATHS.pm10.avg2023                 },
  { id: 'pm10-change',     label: 'PM10 Change 2021→2023',    group: 'pm10', type: 'tiff',               src: DATA_PATHS.pm10.change                  },
  { id: 'pm10-population', label: 'PM10 Population Exposure', group: 'pm10', type: 'geojson-choropleth', src: DATA_PATHS.pm10.population, pie: true, prop: 'pop_sum' },
  { id: 'pm10-bivariate',  label: 'PM10 Bivariate',           group: 'pm10', type: 'geojson-bivariate',  src: DATA_PATHS.pm10.bivariate               },

  // ── PM2.5 ─────────────────────────────────────────────────────────────────
  { id: 'pm25-avg-2021',   label: 'Avg PM2.5 2021',            group: 'pm25', type: 'tiff',               src: DATA_PATHS.pm25.avg2021                 },
  { id: 'pm25-avg-2023',   label: 'Avg PM2.5 2023',            group: 'pm25', type: 'tiff',               src: DATA_PATHS.pm25.avg2023                 },
  { id: 'pm25-change',     label: 'PM2.5 Change 2021→2023',    group: 'pm25', type: 'tiff',               src: DATA_PATHS.pm25.change                  },
  { id: 'pm25-population', label: 'PM2.5 Population Exposure', group: 'pm25', type: 'geojson-choropleth', src: DATA_PATHS.pm25.population, pie: true, prop: 'pop_sum' },
  { id: 'pm25-bivariate',  label: 'PM2.5 Bivariate',           group: 'pm25', type: 'geojson-bivariate',  src: DATA_PATHS.pm25.bivariate               },
];

/**
 * The three pollutant tabs shown at the top of the sidebar, in display order.
 * The id here must match the group field used in LAYERS above.
 */
export const GROUPS = [
  { id: 'no2',  label: 'NO₂'   },
  { id: 'pm10', label: 'PM10'  },
  { id: 'pm25', label: 'PM2.5' },
];
