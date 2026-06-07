/**
 * @fileoverview GeoTIFF loading and rendering utilities.
 *
 * Uses the `geotiff.js` library (loaded globally as `window.GeoTIFF`) to read
 * raster files, convert pixel values to RGBA colours via a custom colour ramp,
 * and register the result as a Mapbox `image` source so it can be displayed as
 * a `raster` layer.
 *
 * Supported raster types:
 * - **Single-band** (most pollution GeoTIFFs): pixel values are normalised to
 *   [0, 1] and passed through {@link colormap} to produce RGBA.  NODATA pixels
 *   are made fully transparent.
 * - **Multi-band (RGB / RGBA)**: bands are read directly as display colours
 *   with no remapping.
 *
 * Public API:
 *  - {@link loadTiffAsCanvas} – decode a GeoTIFF URL into an HTML canvas.
 *  - {@link addTiffLayer}     – load a GeoTIFF and add/update it on the map.
 *
 * @module tiff-loader
 */

// ── Public ────────────────────────────────────────────────────────────────────

/**
 * Fetches a GeoTIFF from `url`, renders it onto an off-screen `<canvas>`, and
 * returns the canvas together with the bounding box and value range.
 *
 * The function handles two raster variants automatically:
 *
 * **Single-band (e.g. pollution concentration μg/m³):**
 * 1. Scan all valid pixels to find `min` and `max`.
 * 2. Normalise each pixel to `t ∈ [0, 1]`.
 * 3. Map `t` through {@link colormap} (dark-blue → gold → crimson).
 * 4. Set alpha to 200 (slightly transparent) so the basemap shows through.
 * 5. NODATA pixels receive alpha = 0 (fully transparent).
 *
 * **Multi-band (RGB or RGBA):**
 * Copy band values directly to canvas RGBA channels.  Alpha defaults to 255
 * for RGB files and uses the fourth band for RGBA files.
 *
 * @param {string} url - URL or relative path to the GeoTIFF file.
 * @returns {Promise<{ canvas: HTMLCanvasElement, bbox: number[], min: number|null, max: number|null }>}
 *   - `canvas` – off-screen canvas with the raster painted on it.
 *   - `bbox`   – geographic bounding box `[west, south, east, north]` in EPSG:4326.
 *   - `min`    – minimum valid pixel value (null for multi-band files).
 *   - `max`    – maximum valid pixel value (null for multi-band files).
 */
export async function loadTiffAsCanvas(url) {
  const GeoTIFF = window.GeoTIFF;
  const tiff    = await GeoTIFF.fromUrl(url);
  const image   = await tiff.getImage();

  const bbox            = image.getBoundingBox(); // [W, S, E, N] in the file's CRS (assumed 4326)
  const width           = image.getWidth();
  const height          = image.getHeight();
  const samplesPerPixel = image.getSamplesPerPixel();
  // interleave:true → single typed array ordered R₀G₀B₀R₁G₁B₁… instead of band planes
  const samples         = await image.readRasters({ interleave: true });

  const canvas  = document.createElement('canvas');
  canvas.width  = width;
  canvas.height = height;
  const ctx     = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);

  let min = null, max = null;

  if (samplesPerPixel >= 3) {
    // ── Multi-band: copy bands directly to RGBA ──────────────────────────────
    for (let i = 0; i < width * height; i++) {
      imgData.data[i * 4]     = samples[i * samplesPerPixel];       // R
      imgData.data[i * 4 + 1] = samples[i * samplesPerPixel + 1];   // G
      imgData.data[i * 4 + 2] = samples[i * samplesPerPixel + 2];   // B
      // Use the alpha band if present; otherwise fully opaque
      imgData.data[i * 4 + 3] = samplesPerPixel === 4 ? samples[i * 4 + 3] : 255;
    }
  } else {
    // ── Single-band: normalise then apply colour ramp ────────────────────────

    // Read the NODATA value from GDAL metadata (may be absent)
    const nodata = image.fileDirectory.GDAL_NODATA
      ? parseFloat(image.fileDirectory.GDAL_NODATA)
      : null;

    // First pass: find the range of valid (non-nodata, finite) pixel values
    min = Infinity; max = -Infinity;
    for (let i = 0; i < samples.length; i++) {
      const v = samples[i];
      if (nodata !== null && v === nodata) continue;
      if (!isFinite(v)) continue;
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const range = max - min || 1; // guard against flat rasters (all pixels same value)

    // Second pass: colour each pixel
    for (let i = 0; i < width * height; i++) {
      const v = samples[i];

      // Make NODATA pixels fully transparent so the basemap shows underneath
      if (nodata !== null && v === nodata) {
        imgData.data[i * 4 + 3] = 0;
        continue;
      }

      const t = Math.max(0, Math.min(1, (v - min) / range));
      const [r, g, b] = colormap(t);
      imgData.data[i * 4]     = r;
      imgData.data[i * 4 + 1] = g;
      imgData.data[i * 4 + 2] = b;
      imgData.data[i * 4 + 3] = 200; // slight transparency to preserve basemap context
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return { canvas, bbox, min, max };
}

/**
 * Loads a GeoTIFF and registers (or updates) it as a Mapbox image source, then
 * adds a `raster` layer if one does not already exist.
 *
 * Calling this function a second time with the same `id` updates the image in
 * place via `source.updateImage()` rather than adding a duplicate layer.
 *
 * @param {mapboxgl.Map} map     - The live Mapbox GL map to add the layer to.
 * @param {string}       id      - Unique id used for both the source and the layer.
 * @param {string}       url     - URL / path to the GeoTIFF file.
 * @param {number}      [opacity=0.85] - Raster opacity (0 = transparent, 1 = opaque).
 * @returns {Promise<{ min: number|null, max: number|null }>}
 *   The pixel value range of the raster, forwarded to {@link renderLegend} via
 *   the layer-manager.
 */
export async function addTiffLayer(map, id, url, opacity = 0.85) {
  const { canvas, bbox, min, max } = await loadTiffAsCanvas(url);
  // Convert canvas to a data-URL so Mapbox can use it as a static image source
  const dataUrl = canvas.toDataURL('image/png');

  // Mapbox image sources use corner coordinates in [lng, lat] order:
  // top-left, top-right, bottom-right, bottom-left
  const coordinates = [
    [bbox[0], bbox[3]], // NW
    [bbox[2], bbox[3]], // NE
    [bbox[2], bbox[1]], // SE
    [bbox[0], bbox[1]], // SW
  ];

  if (map.getSource(id)) {
    // Already loaded on a previous visit — just swap the pixel data
    map.getSource(id).updateImage({ url: dataUrl, coordinates });
  } else {
    map.addSource(id, { type: 'image', url: dataUrl, coordinates });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': opacity } });
  }

  return { min, max };
}

// ── Internal ──────────────────────────────────────────────────────────────────

/**
 * Maps a normalised value `t ∈ [0, 1]` to an RGB colour using a two-segment
 * linear gradient:
 *
 * - `t = 0.0` → `#1e3a5f` (dark blue   — low pollution)
 * - `t = 0.5` → `#f0c040` (gold        — medium pollution)
 * - `t = 1.0` → `#c0392b` (crimson red — high pollution)
 *
 * This ramp mirrors the TIFF legend gradient in `legend.js` so the map colours
 * and the legend are always in sync.
 *
 * @param {number} t - Normalised pixel value clamped to [0, 1].
 * @returns {[number, number, number]} RGB channel values in the range [0, 255].
 */
function colormap(t) {
  if (t < 0.5) {
    // First segment: dark blue → gold
    const s = t * 2; // remap [0, 0.5] → [0, 1]
    return [
      Math.round(30  + s * (240 - 30)),  // R: 30  → 240
      Math.round(58  + s * (192 - 58)),  // G: 58  → 192
      Math.round(95  + s * (64  - 95)),  // B: 95  → 64
    ];
  }
  // Second segment: gold → crimson
  const s = (t - 0.5) * 2; // remap [0.5, 1] → [0, 1]
  return [
    Math.round(240 + s * (192 - 240)), // R: 240 → 192
    Math.round(192 + s * (57  - 192)), // G: 192 → 57
    Math.round(64  + s * (43  - 64)),  // B: 64  → 43
  ];
}
