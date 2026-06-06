/**
 * Loads a GeoTIFF and paints it as a Mapbox image source.
 * addTiffLayer returns { min, max } for single-band files so callers can build legends.
 */
export async function loadTiffAsCanvas(url) {
  const GeoTIFF = window.GeoTIFF;
  const tiff    = await GeoTIFF.fromUrl(url);
  const image   = await tiff.getImage();

  const bbox             = image.getBoundingBox(); // [W, S, E, N]
  const width            = image.getWidth();
  const height           = image.getHeight();
  const samplesPerPixel  = image.getSamplesPerPixel();
  const samples          = await image.readRasters({ interleave: true });

  const canvas = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  let min = null, max = null;

  if (samplesPerPixel >= 3) {
    for (let i = 0; i < width * height; i++) {
      imgData.data[i * 4]     = samples[i * samplesPerPixel];
      imgData.data[i * 4 + 1] = samples[i * samplesPerPixel + 1];
      imgData.data[i * 4 + 2] = samples[i * samplesPerPixel + 2];
      imgData.data[i * 4 + 3] = samplesPerPixel === 4 ? samples[i * 4 + 3] : 255;
    }
  } else {
    const nodata = image.fileDirectory.GDAL_NODATA
      ? parseFloat(image.fileDirectory.GDAL_NODATA)
      : null;

    min = Infinity; max = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      if (nodata !== null && v === nodata) continue;
      if (!isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;

    for (let i = 0; i < width * height; i++) {
      const v = samples[i];
      if (nodata !== null && v === nodata) { imgData.data[i * 4 + 3] = 0; continue; }
      const t        = Math.max(0, Math.min(1, (v - min) / range));
      const [r, g, b] = colormap(t);
      imgData.data[i * 4]     = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 200;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, bbox, min, max };
}

function colormap(t) {
  if (t < 0.5) {
    const s = t * 2;
    return [
      Math.round(30  + s * (240 - 30)),
      Math.round(58  + s * (192 - 58)),
      Math.round(95  + s * (64  - 95)),
    ];
  }
  const s = (t - 0.5) * 2;
  return [
    Math.round(240 + s * (192 - 240)),
    Math.round(192 + s * (57  - 192)),
    Math.round(64  + s * (43  - 64)),
  ];
}

/**
 * @returns {{ min: number|null, max: number|null }}
 */
export async function addTiffLayer(map, id, url, opacity = 0.85) {
  const { canvas, bbox, min, max } = await loadTiffAsCanvas(url);
  const dataUrl = canvas.toDataURL('image/png');

  const coordinates = [
    [bbox[0], bbox[3]],
    [bbox[2], bbox[3]],
    [bbox[2], bbox[1]],
    [bbox[0], bbox[1]],
  ];

  if (map.getSource(id)) {
    map.getSource(id).updateImage({ url: dataUrl, coordinates });
  } else {
    map.addSource(id, { type: 'image', url: dataUrl, coordinates });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': opacity } });
  }
  return { min, max };
}
