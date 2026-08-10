# SRT Time-of-Day Asset Validation

Generated on 2026-08-10 with the built-in ImageGen edit workflow using each named repository asset as its geometry reference. Final raster conversion used `cwebp -q 82 -m 6` for WebP files.

## Result

- Manual visual review: **PASS** for all ten assets.
- Required dimensions: **PASS** — train is 2400×640; every cab and station plate is 1672×941.
- Train transparency: **PASS** — alpha channel matches the original pixel-for-pixel; visible bounding box is `(373, 240, 2027, 396)`.
- Geometry: **PASS** — train silhouette is copied from the reference; cockpit pixels outside the windshield mask remain the resized reference; station camera, roof, central column, platform and rail layout remain aligned.
- Content safety: **PASS** — no people, faces, new readable text, new logos, or watermarks were introduced.
- Visual contact sheet: `contact-sheet.png`.
- Machine-readable measurements: `metrics.json`.

## Measurements

| Asset | Dimensions | Bytes | Alpha | Edge alignment | Manual |
|---|---:|---:|---|---:|---|
| `assets/train-realistic/motion/srt-side-transparent-night.png` | 2400×640 | 251,671 | RGBA, exact reference alpha | 98.22 | PASS |
| `assets/train-realistic/cab-dawn.webp` | 1672×941 | 77,964 | No | 98.28 | PASS |
| `assets/train-realistic/cab-sunset.webp` | 1672×941 | 81,038 | No | 98.37 | PASS |
| `assets/train-realistic/motion/station-platform-sunset.webp` | 1672×941 | 137,624 | No | 92.35 | PASS |
| `assets/train-realistic/motion/station-platform-night.webp` | 1672×941 | 110,622 | No | 84.82 | PASS |
| `assets/train-realistic/motion/station-platform-dawn.webp` | 1672×941 | 135,750 | No | 92.60 | PASS |
| `assets/train-realistic/cab-field.webp` | 1672×941 | 86,206 | No | 95.94 | PASS |
| `assets/train-realistic/cab-river.webp` | 1672×941 | 82,880 | No | 94.48 | PASS |
| `assets/train-realistic/cab-sea.webp` | 1672×941 | 80,452 | No | 95.73 | PASS |
| `assets/train-realistic/cab-mountain.webp` | 1672×941 | 130,862 | No | 93.00 | PASS |

The edge score compares reference and output edge maps. It intentionally drops for the night station because switched-on fluorescent strips and city lights add valid edges; visual inspection confirms that the fixed roof, central column, benches, platform edge and rail geometry remain aligned.

Several cab files are below the nominal 100KB lower budget. They were retained because they were encoded at the required quality setting and increasing size without adding information would not improve fidelity.

## Prompt Set

- Mode/taxonomy: `lighting-weather` ImageGen edits.
- Night train: exact train reference; preserve silhouette, scale, cars, wheels, couplings and purple stripe; dark body, warm passenger windows, headlights and deeper undercarriage shadow on removable chroma.
- Dawn/sunset cabs: exact day/night cab references; preserve dashboard, frame, wipers, tracks, catenary and vanishing point; alter time-of-day illumination only.
- Station variants: exact station reference; preserve roof, beams, column, benches, bins, platform and rails; apply sunset, illuminated night and lamp-lit dawn conditions.
- Route cabs: exact day cab reference; preserve cab and rail perspective; replace only the visible route with rice fields, river, sea or mountains/tunnel.

## Reproduction

`process_asset.py` performs alpha restoration, geometry-preserving lighting transfer and windshield masking. `create_contact_sheet.py` rebuilds the contact sheet and `metrics.json` from the final repository assets.
