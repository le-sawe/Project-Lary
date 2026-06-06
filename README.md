# Project Lary — Hungary Air Quality WebGIS

An interactive WebGIS application for exploring NO₂, PM10, and PM2.5 atmospheric pollution across Hungary (2021–2023), with land cover analysis and population exposure assessment.

**Study area:** Hungary · 93,030 km² · 45.7°N–48.6°N, 16.1°E–22.9°E  
**Time period:** 2021–2023  
**Key finding:** NO₂ reduced by −2.3 µg/m³ overall; urban areas −3.1 µg/m³

---

## Features

- Side-by-side GeoTIFF raster layers (annual averages + change maps) for NO₂, PM10, PM2.5
- Choropleth population-exposure layers with hover popups
- Bivariate colour-encoded analysis layers
- Floating pie chart panel showing pollutant distribution by administrative zone
- Dynamic legend that adapts per layer type
- Four basemap options: Dark (default), Streets, Satellite, OSM
- No backend required — fully client-side, static file serving

---

## Project Structure

```
Project-Lary/
├── webgis.html          # Interactive map application
├── home.html            # Landing / project overview page
├── results.html         # Analysis results dashboard (Chart.js)
├── env.js               # Mapbox public token
├── style.css            # Global styles
├── css/
│   └── webgis.css       # Map interface layout
├── js/
│   ├── main.js          # Map initialisation & basemap switcher
│   ├── config.js        # Centralised constants (coordinates, data paths)
│   ├── layers.js        # Layer metadata definitions (15 layers × 3 groups)
│   ├── layer-manager.js # Layer lifecycle: load, show, hide
│   ├── sidebar.js       # Sidebar UI builder (group tabs + radio buttons)
│   ├── tiff-loader.js   # GeoTIFF decode → canvas → Mapbox raster source
│   ├── legend.js        # Dynamic legend (gradient or colour swatches)
│   └── pie-panel.js     # Floating Chart.js pie panel
└── Data/
    ├── no2/             # NO₂ GeoTIFF & GeoJSON files (2021, 2023, change)
    ├── pm10/            # PM10 equivalent files
    └── pm2p5/           # PM2.5 equivalent files
```

---

## Technical Flow

```mermaid
flowchart TD
    subgraph Browser["Browser — client-side only"]
        direction TB

        subgraph Pages["HTML Pages"]
            H[home.html\nProject overview]
            W[webgis.html\nInteractive map]
            R[results.html\nAnalysis dashboard]
        end

        subgraph Init["Initialisation — main.js"]
            M1[Create Mapbox GL JS map\ncentre: Hungary 47.16°N 19.50°E\nzoom 6.4]
            M2[Add nav & scale controls]
            M3[on map load →\ninitPiePanel + buildSidebar]
        end

        subgraph Config["config.js"]
            C1[HUNGARY_CENTER\nHUNGARY_ZOOM\nDATA_PATHS]
        end

        subgraph UI["UI Layer"]
            direction LR
            SB[sidebar.js\nGroup tabs: NO₂ · PM10 · PM2.5\nRadio buttons per layer]
            LG[legend.js\nGradient bar or colour swatches]
            PP[pie-panel.js\nFloating Chart.js pie]
        end

        subgraph LayerMeta["layers.js"]
            LY[15 layer definitions\nid · label · type · src · group\npie flag · default flag]
        end

        subgraph LM["layer-manager.js"]
            LA[activateLayer]
            HL[hideLayer / showLayer]
        end

        subgraph TiffPath["GeoTIFF path"]
            TL[tiff-loader.js\nGeoTIFF.fromUrl\nreadRasters → single band]
            TC[Build canvas\nExtract min / max\nApply blue → yellow → red gradient]
            TS[map.addSource\ntype: image\nbbox from TIFF metadata]
            TR[map.addLayer\ntype: raster]
        end

        subgraph VectorPath["GeoJSON path"]
            GF[fetch Data/*.geojson]
            CH[Choropleth\nAuto colour-map\nnumeric property]
            BV[Bivariate\nUse pre-computed\nbivariate_color hex]
            GP[addHoverPopup\nAll properties\nas HTML table]
        end

        subgraph Basemap["Basemap switcher — main.js"]
            BS[map.setStyle\nDark · Streets\nSatellite · OSM]
        end

        subgraph Data["Data — static files"]
            TIFF["GeoTIFF rasters\n*.tif — 9–64 KB each\n3 pollutants × 3 years + change"]
            GJ["GeoJSON vectors\npopulation_chart.geojson ~756 KB\nbivariate_color.geojson ~2.3 MB"]
        end

        subgraph CDN["CDN dependencies"]
            MB[Mapbox GL JS v2.15.0]
            GT[geotiff.js v2.1.3]
            CJ[Chart.js v4.4.3]
            BS2[Bootstrap 5.3.3]
        end
    end

    W --> Init
    Init --> Config
    M3 --> SB
    M3 --> PP
    SB --> LayerMeta
    SB -->|user selects layer| LA
    LA -->|type: tiff| TL
    LA -->|type: geojson choropleth| GF
    LA -->|type: geojson bivariate| GF
    TL --> TC --> TS --> TR
    GF --> CH & BV --> GP
    TR & GP --> LG
    PP -->|user opens pie| GF
    GF -->|renders pie| CJ
    BS -->|style swap| MB
    TL --> GT
    TR --> MB
    CH & BV --> MB
    TIFF --> TL
    GJ --> GF
```

---

## Data Sources

| Dataset | Source | Format |
|---|---|---|
| NO₂ concentration maps | CAMS (Copernicus Atmosphere Monitoring Service) | GeoTIFF |
| PM10 & PM2.5 concentration maps | CAMS | GeoTIFF |
| Administrative boundaries | EuroGeographics | GeoJSON |
| Land cover | CORINE Land Cover | (analysis input) |
| Population grid | Derived from admin zones | GeoJSON |
| Background tiles | OpenStreetMap / Mapbox | Vector tiles |

---

## Layer Catalogue

Each pollutant group contains five layers:

| # | Layer | Type | Notes |
|---|---|---|---|
| 1 | Avg concentration 2021 | GeoTIFF | Default layer on load |
| 2 | Avg concentration 2023 | GeoTIFF | |
| 3 | Change 2021 → 2023 | GeoTIFF | Negative = improvement |
| 4 | Population exposure | GeoJSON choropleth | Pie chart enabled |
| 5 | Bivariate analysis | GeoJSON bivariate | Pre-computed hex colours |

Groups: **NO₂** · **PM10** · **PM2.5** — 15 layers total.

---

## Getting Started

1. Clone the repository
2. Add your Mapbox public token to [env.js](env.js):
   ```js
   export const MAPBOX_TOKEN = 'pk.eyJ...';
   ```
3. Serve the directory over HTTP (ES modules require a server):
   ```bash
   npx serve .
   # or
   python -m http.server 8080
   ```
4. Open `http://localhost:8080/webgis.html`

> **Note:** Opening `webgis.html` directly as a `file://` URL will fail due to ES module and fetch CORS restrictions.

---

## Dependencies

All loaded from CDN — no `npm install` required.

| Library | Version | Purpose |
|---|---|---|
| [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/) | 2.15.0 | Map engine (vector tiles + raster layers) |
| [geotiff.js](https://geotiffjs.github.io/) | 2.1.3 | GeoTIFF decode in the browser |
| [Chart.js](https://www.chartjs.org/) | 4.4.3 | Pie charts & bar charts |
| [Bootstrap](https://getbootstrap.com/) | 5.3.3 | Responsive UI layout |
