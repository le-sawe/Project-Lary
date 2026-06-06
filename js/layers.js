import { DATA_PATHS } from './config.js';

export const LAYERS = [
  // ── NO2 ───────────────────────────────────────────────────────────────────
  { id: 'no2-avg-2021',   label: 'Avg NO₂ 2021',          group: 'no2',  type: 'tiff',              src: DATA_PATHS.no2.avg2021,   default: true  },
  { id: 'no2-avg-2023',   label: 'Avg NO₂ 2023',          group: 'no2',  type: 'tiff',              src: DATA_PATHS.no2.avg2023                   },
  { id: 'no2-change',     label: 'NO₂ Change 2021→2023',  group: 'no2',  type: 'tiff',              src: DATA_PATHS.no2.change                    },
  { id: 'no2-population', label: 'NO₂ Population Exposure',group: 'no2', type: 'geojson-choropleth', src: DATA_PATHS.no2.population, pie: true     },
  { id: 'no2-bivariate',  label: 'NO₂ Bivariate',         group: 'no2',  type: 'geojson-bivariate', src: DATA_PATHS.no2.bivariate                 },

  // ── PM10 ──────────────────────────────────────────────────────────────────
  { id: 'pm10-avg-2021',   label: 'Avg PM10 2021',          group: 'pm10', type: 'tiff',              src: DATA_PATHS.pm10.avg2021                  },
  { id: 'pm10-avg-2023',   label: 'Avg PM10 2023',          group: 'pm10', type: 'tiff',              src: DATA_PATHS.pm10.avg2023                  },
  { id: 'pm10-change',     label: 'PM10 Change 2021→2023',  group: 'pm10', type: 'tiff',              src: DATA_PATHS.pm10.change                   },
  { id: 'pm10-population', label: 'PM10 Population Exposure',group: 'pm10',type: 'geojson-choropleth', src: DATA_PATHS.pm10.population, pie: true    },
  { id: 'pm10-bivariate',  label: 'PM10 Bivariate',         group: 'pm10', type: 'geojson-bivariate', src: DATA_PATHS.pm10.bivariate                },

  // ── PM2.5 ─────────────────────────────────────────────────────────────────
  { id: 'pm25-avg-2021',   label: 'Avg PM2.5 2021',          group: 'pm25', type: 'tiff',              src: DATA_PATHS.pm25.avg2021                  },
  { id: 'pm25-avg-2023',   label: 'Avg PM2.5 2023',          group: 'pm25', type: 'tiff',              src: DATA_PATHS.pm25.avg2023                  },
  { id: 'pm25-change',     label: 'PM2.5 Change 2021→2023',  group: 'pm25', type: 'tiff',              src: DATA_PATHS.pm25.change                   },
  { id: 'pm25-population', label: 'PM2.5 Population Exposure',group: 'pm25',type: 'geojson-choropleth', src: DATA_PATHS.pm25.population, pie: true    },
  { id: 'pm25-bivariate',  label: 'PM2.5 Bivariate',         group: 'pm25', type: 'geojson-bivariate', src: DATA_PATHS.pm25.bivariate                },
];

export const GROUPS = [
  { id: 'no2',  label: 'NO₂'   },
  { id: 'pm10', label: 'PM10'  },
  { id: 'pm25', label: 'PM2.5' },
];
