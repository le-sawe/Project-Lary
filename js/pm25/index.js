import { initCompareSection }    from '../sections/compare.js';
import { initPopulationSection } from '../sections/population.js';
import { initBivariateSection }  from '../sections/bivariate.js';
import { DATA_PATHS }            from '../config.js';
import { observeSection }        from '../utils.js';

const p = DATA_PATHS.pm25;

export function initPm25Tab() {
  observeSection('pm25-s1', () => initCompareSection({
    beforeId:           'pm25-map-s1-before',
    afterId:            'pm25-map-s1-after',
    compareContainerId: 'pm25-map-s1-compare',
    changeMapId:        'pm25-map-s1-change',
    legendBeforeId:     'pm25-legend-s1-before',
    legendAfterId:      'pm25-legend-s1-after',
    legendChangeId:     'pm25-legend-s1-change',
    tiff2021:           p.avg2021,
    tiff2023:           p.avg2023,
    tiffChange:         p.change,
    label:              'pm25',
  }));

  observeSection('pm25-s2', () => initPopulationSection({
    mapId:       'pm25-map-s2',
    pieCanvasId: 'pm25-pie-canvas',
    geojson:     p.population,
  }));

  observeSection('pm25-s3', () => initBivariateSection({
    mapId:    'pm25-map-s3',
    legendId: 'pm25-legend-s3',
    geojson:  p.bivariate,
    label:    'PM2.5',
  }));
}
