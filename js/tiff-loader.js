/**
 * tiff-loader.js — reads GeoTIFFs and paints them onto the map.
 *
 * We use the geotiff.js library (loaded globally as window.GeoTIFF) to
 * decode the raster, then we draw it onto an off-screen canvas and hand
 * that canvas to Mapbox as an image source.
 *
 * Two raster types are handled:
 *
 *   Single-band  (all our pollution TIFFs are single-band)
 *   — pixel values are raw concentration numbers (e.g. µg/m³)
 *   — we scan all valid pixels to find min/max, normalise to [0,1],
 *     then run each pixel through our color ramp (dark blue → gold → red)
 *   — NODATA pixels go fully transparent so the basemap shows through
 *   — we return min/max to the caller so the legend can label the scale
 *
 *   Multi-band RGB/RGBA  (not used yet but supported just in case)
 *   — bands are copied directly to canvas channels, no remapping
 *
 * The color ramp here MUST stay in sync with TIFF_GRADIENT in legend.js.
 * If you change one, change both or the legend will show wrong colors.
 */

/**
 * Fetches a GeoTIFF from url, renders it to an off-screen canvas, and
 * returns that canvas plus the geographic bounding box and value range.
 *
 * You probably don't need to call this directly — use addTiffLayer instead.
 *
 * @param {string} url - path or URL to the .tif file
 * @returns {Promise<{ canvas: HTMLCanvasElement, bbox: number[], min: number|null, max: number|null }>}
 *   bbox is [west, south, east, north] in WGS-84 degrees
 */
export async function loadTiffAsCanvas(url) {
  const GeoTIFF = window.GeoTIFF;
  const tiff    = await GeoTIFF.fromUrl(url);
  const image   = await tiff.getImage();

  const bbox            = image.getBoundingBox(); // [W, S, E, N]
  const width           = image.getWidth();
  const height          = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  // interleave: true gives us R₀G₀B₀R₁G₁B₁… instead of separate band arrays.
  const samples         = await image.readRasters({ interleave: true });

  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  let min = null, max = null;

  if (samplesPerPixel >= 3) {
    // Multi-band: copy R, G, B (and optional A) straight to the canvas.
    for (let i = 0; i < width * height; i++) {
      imgData.data[i * 4]     = samples[i * samplesPerPixel];
      imgData.data[i * 4 + 1] = samples[i * samplesPerPixel + 1];
      imgData.data[i * 4 + 2] = samples[i * samplesPerPixel + 2];
      imgData.data[i * 4 + 3] = samplesPerPixel === 4 ? samples[i * 4 + 3] : 255;
    }
  } else {
    // Single-band: find value range, then map each pixel through the color ramp.

    // GDAL stores the no-data sentinel in the file's metadata.
    const nodata = image.fileDirectory.GDAL_NODATA
      ? parseFloat(image.fileDirectory.GDAL_NODATA)
      : null;

    // First pass — find min/max ignoring nodata and non-finite values.
    min = Infinity; max = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      if (nodata !== null && v === nodata) continue;
      if (!isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1; // avoid divide-by-zero on flat rasters

    // Second pass — color each pixel.
    for (let i = 0; i < width * height; i++) {
      const v = samples[i];

      // Transparent for nodata so the basemap shows through.
      if (nodata !== null && v === nodata) {
        imgData.data[i * 4 + 3] = 0;
        continue;
      }

      const t = Math.max(0, Math.min(1, (v - min) / range));
      const [r, g, b] = colormap(t);
      imgData.data[i * 4]     = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 200; // slightly transparent so basemap context remains
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, bbox, min, max };
}

/**
 * Loads a GeoTIFF and registers it on the map as an image source + raster layer.
 *
 * If the same id was loaded before (e.g. the user switched tabs and came back)
 * we update the image in place instead of adding a duplicate source.
 *
 * @param {mapboxgl.Map} map     - the live map to add the layer to
 * @param {string}       id      - used as both the Mapbox source id and layer id
 * @param {string}       url     - path or URL to the .tif file
 * @param {number}      [opacity=0.85] - how opaque the raster should be
 * @returns {Promise<{ min: number|null, max: number|null }>}
 *   returned to layer-manager so it can pass min/max to the legend
 */
export async function addTiffLayer(map, id, url, opacity = 0.85) {
  const { canvas, bbox, min, max } = await loadTiffAsCanvas(url);
  const dataUrl = canvas.toDataURL('image/png');

  // Mapbox image source corners: NW, NE, SE, SW in [lng, lat] order.
  const coordinates = [
    [bbox[0], bbox[3]], // NW
    [bbox[2], bbox[3]], // NE
    [bbox[2], bbox[1]], // SE
    [bbox[0], bbox[1]], // SW
  ];

  if (map.getSource(id)) {
    // Already on the map from a previous visit — just swap the pixel data.
    map.getSource(id).updateImage({ url: dataUrl, coordinates });
  } else {
    map.addSource(id, { type: 'image', url: dataUrl, coordinates });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': opacity } });
  }

  return { min, max };
}

/**
 * Maps a normalised pixel value t ∈ [0,1] to an RGB color.
 *
 * Two-segment linear gradient:
 *   t = 0.0  →  #1e3a5f  (dark blue  — low pollution)
 *   t = 0.5  →  #f0c040  (gold       — medium)
 *   t = 1.0  →  #c0392b  (dark red   — high pollution)
 *
 * These three stops must match the TIFF_GRADIENT constant in legend.js.
 *
 * @param {number} t - normalized value, already clamped to [0, 1]
 * @returns {[number, number, number]} [R, G, B] each 0–255
 */
function colormap(t) {
  if (t < 0.5) {
    const s = t * 2; // remap [0, 0.5] → [0, 1]
    return [
      Math.round(30  + s * (240 - 30)),  // R: 30  → 240
      Math.round(58  + s * (192 - 58)),  // G: 58  → 192
      Math.round(95  + s * (64  - 95)),  // B: 95  → 64
    ];
  }
  const s = (t - 0.5) * 2; // remap [0.5, 1] → [0, 1]
  return [
    Math.round(240 + s * (192 - 240)), // R: 240 → 192
    Math.round(192 + s * (57  - 192)), // G: 192 → 57
    Math.round(64  + s * (43  - 64)),  // B: 64  → 43
  ];
}
