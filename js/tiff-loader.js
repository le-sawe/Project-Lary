/**
 * Loads a GeoTIFF file and returns { canvas, bbox } where bbox is [W, S, E, N] in WGS84.
 * Requires: <script src="https://cdn.jsdelivr.net/npm/geotiff@2.1.3/dist-browser/geotiff.js"></script>
 */
export async function loadTiffAsCanvas(url) {
  const GeoTIFF = window.GeoTIFF;
  const tiff    = await GeoTIFF.fromUrl(url);
  const image   = await tiff.getImage();

  const bbox     = image.getBoundingBox(); // [W, S, E, N]
  const width    = image.getWidth();
  const height   = image.getHeight();
  const samples  = await image.readRasters({ interleave: true });

  // Determine channel layout
  const samplesPerPixel = image.getSamplesPerPixel();
  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  if (samplesPerPixel >= 3) {
    // RGB or RGBA
    for (let i = 0; i < width * height; i++) {
      imgData.data[i * 4]     = samples[i * samplesPerPixel];
      imgData.data[i * 4 + 1] = samples[i * samplesPerPixel + 1];
      imgData.data[i * 4 + 2] = samples[i * samplesPerPixel + 2];
      imgData.data[i * 4 + 3] = samplesPerPixel === 4 ? samples[i * 4 + 3] : 255;
    }
  } else {
    // Single-band — apply a simple colormap (white→purple for NO2)
    const raw    = samples;
    const nodata = image.fileDirectory.GDAL_NODATA
      ? parseFloat(image.fileDirectory.GDAL_NODATA)
      : null;

    let min = Infinity, max = -Infinity;
    for (let i = 0; i < raw.length; i++) {
      const v = raw[i];
      if (nodata !== null && v === nodata) continue;
      if (!isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1;

    for (let i = 0; i < width * height; i++) {
      const v = raw[i];
      if (nodata !== null && v === nodata) {
        imgData.data[i * 4 + 3] = 0;
        continue;
      }
      const t = Math.max(0, Math.min(1, (v - min) / range));
      // Colormap: low=blue (#1e3a5f), mid=yellow (#f0c040), high=red (#c0392b)
      const [r, g, b] = colormap(t);
      imgData.data[i * 4]     = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 200;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, bbox };
}

function colormap(t) {
  // 3-stop gradient: blue → yellow → red
  if (t < 0.5) {
    const s = t * 2;
    return [
      Math.round(30  + s * (240 - 30)),
      Math.round(58  + s * (192 - 58)),
      Math.round(95  + s * (64  - 95)),
    ];
  } else {
    const s = (t - 0.5) * 2;
    return [
      Math.round(240 + s * (192 - 240)),
      Math.round(192 + s * (57  - 192)),
      Math.round(64  + s * (43  - 64)),
    ];
  }
}

/**
 * Add (or update) a GeoTIFF as an image source + raster layer in a Mapbox map.
 * Returns the layer id so callers can manage visibility.
 */
export async function addTiffLayer(map, id, url, opacity = 0.85) {
  const { canvas, bbox } = await loadTiffAsCanvas(url);
  const dataUrl = canvas.toDataURL('image/png');

  const coordinates = [
    [bbox[0], bbox[3]], // NW
    [bbox[2], bbox[3]], // NE
    [bbox[2], bbox[1]], // SE
    [bbox[0], bbox[1]], // SW
  ];

  if (map.getSource(id)) {
    map.getSource(id).updateImage({ url: dataUrl, coordinates });
  } else {
    map.addSource(id, { type: 'image', url: dataUrl, coordinates });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': opacity } });
  }
  return id;
}
