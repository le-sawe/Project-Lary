import { initCompareSection }    from '../sections/compare.js';
import { initPopulationSection } from '../sections/population.js';
import { initBivariateSection }  from '../sections/bivariate.js';
import { DATA_PATHS }            from '../config.js';
import { observeSection }        from '../utils.js';

const p = DATA_PATHS.no2;

export function initNo2Tab() {
  observeSection('no2-s1', () => initCompareSection({
    beforeId:           'no2-map-s1-before',
    afterId:            'no2-map-s1-after',
    compareContainerId: 'no2-map-s1-compare',
    changeMapId:        'no2-map-s1-change',
    legendBeforeId:     'no2-legend-s1-before',
    legendAfterId:      'no2-legend-s1-after',
    legendChangeId:     'no2-legend-s1-change',
    tiff2021:           p.avg2021,
    tiff2023:           p.avg2023,
    tiffChange:         p.change,
    label:              'no2',
  }));

  observeSection('no2-s2', () => initPopulationSection({
    mapId:       'no2-map-s2',
    pieCanvasId: 'no2-pie-canvas',
    geojson:     p.population,
  }));

  observeSection('no2-s3', () => initBivariateSection({
    mapId:    'no2-map-s3',
    legendId: 'no2-legend-s3',
    geojson:  p.bivariate,
    label:    'NO₂',
  }));
}
