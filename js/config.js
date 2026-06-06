export { MAPBOX_TOKEN } from '../env.js';
export const HUNGARY_CENTER = [19.5033, 47.1624];
export const HUNGARY_ZOOM   = 6.4;
export const BASE_STYLE     = 'mapbox://styles/mapbox/dark-v11';

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
