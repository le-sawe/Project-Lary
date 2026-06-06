/**
 * Section 3 – Population chart map + pie chart image
 */
import { createMap }  from '../map-factory.js';
import { DATA_PATHS } from '../config.js';

export async function initSection3() {
  const map = await createMap('map-s3');

  const res  = await fetch(DATA_PATHS.no2.population);
  const data = await res.json();

  map.addSource('population', { type: 'geojson', data });

  // Detect a numeric property for coloring
  const firstFeature = data.features[0]?.properties ?? {};
  const numericProp  = Object.keys(firstFeature).find(
    k => typeof firstFeature[k] === 'number'
  ) ?? null;

  if (numericProp) {
    const values = data.features
      .map(f => f.properties[numericProp])
      .filter(v => v !== null && isFinite(v));
    const [minVal, maxVal] = [Math.min(...values), Math.max(...values)];

    map.addLayer({
      id: 'population-fill',
      type: 'fill',
      source: 'population',
      paint: {
        'fill-color': [
          'interpolate', ['linear'],
          ['get', numericProp],
          minVal, '#0d47a1',
          maxVal, '#e3f2fd',
        ],
        'fill-opacity': 0.75,
      },
    });
  } else {
    map.addLayer({
      id: 'population-fill',
      type: 'fill',
      source: 'population',
      paint: { 'fill-color': '#38bdf8', 'fill-opacity': 0.6 },
    });
  }

  map.addLayer({
    id: 'population-outline',
    type: 'line',
    source: 'population',
    paint: { 'line-color': '#ffffff', 'line-width': 0.5, 'line-opacity': 0.35 },
  });

  // Show pie chart image
  const img = document.getElementById('population-pie');
  if (img) img.src = DATA_PATHS.no2.pieChart;
}
