import { initCompareSection }    from '../sections/compare.js';
import { initPopulationSection } from '../sections/population.js';
import { initBivariateSection }  from '../sections/bivariate.js';
import { DATA_PATHS }            from '../config.js';
import { observeSection }        from '../utils.js';

const p = DATA_PATHS.pm10;

export function initPm10Tab() {
  observeSection('pm10-s1', () => initCompareSection({
    beforeId:           'pm10-map-s1-before',
    afterId:            'pm10-map-s1-after',
    compareContainerId: 'pm10-map-s1-compare',
    changeMapId:        'pm10-map-s1-change',
    legendBeforeId:     'pm10-legend-s1-before',
    legendAfterId:      'pm10-legend-s1-after',
    legendChangeId:     'pm10-legend-s1-change',
    tiff2021:           p.avg2021,
    tiff2023:           p.avg2023,
    tiffChange:         p.change,
    label:              'pm10',
  }));

  observeSection('pm10-s2', () => initPopulationSection({
    mapId:       'pm10-map-s2',
    pieCanvasId: 'pm10-pie-canvas',
    geojson:     p.population,
  }));

  observeSection('pm10-s3', () => initBivariateSection({
    mapId:    'pm10-map-s3',
    legendId: 'pm10-legend-s3',
    geojson:  p.bivariate,
    label:    'PM10',
  }));
}
