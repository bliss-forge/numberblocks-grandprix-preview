# Task 2 report — photorealistic SRT raster assets

Date: 2026-08-03 (Asia/Seoul)

## Status

Complete. Nine project-owned WebP assets were generated, converted, opened, and visually inspected. The focused asset test and the full project test suite pass.

Commit: `feat: add photorealistic SRT scene assets` (this Task 2 commit; final SHA is reported in the task handoff).

## Tool mode and source reference

- Image generation mode: built-in `image_gen` workflow (default mode from the imagegen skill), not CLI/API fallback.
- User concept-board reference: `/var/folders/jj/5xlwy57n4q15_2jfr8xvb5jm0000gn/T/codex-clipboard-2eb30e2d-179a-4b34-bef7-180525b6eb2b.png`.
- The exterior city master and cockpit day master were generated directly against the concept board.
- Exterior environment variants were generated as edits of the approved city master, locking the train silhouette, livery, camera position, scale, and daylight direction.
- Cockpit night/tunnel variants were generated as lighting/environment edits of the corrected day master, locking windshield, dashboard, display, console, and reserved-overlay geometry.
- Local conversion: `sips` was attempted first exactly as planned but this macOS build returned `Can't write format: org.webmproject.webp` / error 13. The installed `/opt/homebrew/bin/cwebp` was used instead with `-q 88 -m 6 -resize 1600 900`. The resulting assets are valid RIFF WebP files.

## Final locked prompt family

### Exterior master

Use case: `photorealistic-natural`.

- 16:9 landscape game environment raster matching the approved concept-board composition and realism.
- One modern Korean SRT-inspired high-speed train moving left-to-right, nose fully visible on the right.
- Low trackside three-quarter side view at wheel-to-window camera height.
- Locked white-silver body, continuous deep-plum roof and slim side stripe, dark passenger windows, realistic bogies, rails, ballast, catenary, and metal/glass texture.
- Crisp late-morning daylight from upper left; train sharp with restrained background/wheel motion blur.
- Explicitly excluded UI, speedometer, speed numbers, text, lettering, logos, people, watermarks, borders, split screens, extra trains, toy/CGI/illustrated surfaces, malformed wheels, and left-facing geometry.

### Exterior variants

Use case: `lighting-weather`.

Each prompt identified the city master as the edit target and repeated the invariant: preserve the train exactly (right-facing silhouette, nose, windows, car proportions, white-silver/deep-plum livery, camera height, scale, framing, sharp materials, and daylight direction); change only the environment.

- `field`: flat green Korean rice fields and sparse distant farm buildings.
- `river`: electrified bridge beside/over a broad calm Korean river with wooded banks.
- `mountain`: green Korean mountain valley with steep rocky forested slopes.
- `sea`: elevated electrified coastal railway beside deep-blue sea, rocky shoreline, and distant headlands.
- `tunnel`: fully inside a concrete high-speed rail tunnel with realistic catenary, repeating lights, low-key illumination, and readable livery.

### Cockpit master and correction

Use case: `photorealistic-natural`, followed by one `precise-object-edit`.

- 16:9 symmetrical centered driver's viewpoint through a broad panoramic windshield onto straight electrified tracks.
- Unoccupied charcoal high-speed-train console with realistic matte polymer, satin metal, anti-glare glass, subtle wear, subdued unreadable displays, and sparse indicators.
- Broad calm dark center-lower surface reserved for the live circular speedometer.
- The initial master had excess controls in the lower-left overlay zone. A targeted correction removed only those controls and replaced them with a perspective-matched clean dark matte panel reserved for the live lever.
- Explicitly excluded UI, speedometer/gauge dial, numbers, readable text, logos, people/hands, seats, watermarks, road steering wheels, aircraft/fantasy controls, and geometry drift.

### Cockpit variants

Use case: `lighting-weather`.

Both prompts locked the corrected day cockpit exactly: windshield/pillars, dashboard outline and depth, display bezels, blank center panels, right controls, clear lower-left surface, center-lower overlay zone, camera, crop, and perspective.

- `night`: same track/city at deep-blue night with sparse city lights and controlled interior fill.
- `tunnel`: modern concrete high-speed tunnel with repeating warm-white safety lights and corresponding reflections.

## Final assets

All assets are 1600×900 (exact 16:9), WebP, and larger than the 20,000-byte filesystem-test threshold.

| Manifest path | Bytes | Visual review |
| --- | ---: | --- |
| `assets/train-realistic/srt-exterior-city.webp` | 196,136 | right-facing city master; clean |
| `assets/train-realistic/srt-exterior-field.webp` | 225,126 | locked train; field environment |
| `assets/train-realistic/srt-exterior-river.webp` | 186,092 | locked train; bridge/river environment |
| `assets/train-realistic/srt-exterior-mountain.webp` | 349,296 | locked train; mountain environment |
| `assets/train-realistic/srt-exterior-sea.webp` | 216,194 | locked train; coastal environment |
| `assets/train-realistic/srt-exterior-tunnel.webp` | 111,092 | locked train; readable tunnel lighting |
| `assets/train-realistic/cab-day.webp` | 125,396 | corrected overlay zones; daylight |
| `assets/train-realistic/cab-night.webp` | 74,618 | identical cockpit; night lighting |
| `assets/train-realistic/cab-tunnel.webp` | 85,242 | identical cockpit; tunnel lighting |

Every final WebP was reopened with the local image viewer after conversion. No visible text artifacts, baked UI, speed numbers, people, watermarks, malformed train wheels, incorrect exterior direction, or cockpit-geometry drift were found.

## RED / GREEN evidence

RED command:

```text
node --test tests/ktx-realistic-assets.test.mjs
```

RED result: 3 passed, 1 failed. The new manifest filesystem test failed at the intended boundary with `ENOENT` for `assets/train-realistic/srt-exterior-city.webp`.

GREEN focused command/result:

```text
node --test tests/ktx-realistic-assets.test.mjs
4 tests, 4 passed, 0 failed
```

Full regression command/result:

```text
npm test
394 tests, 394 passed, 0 failed
```

## Self-review and concerns

- Scope review: only Task 2 assets, `tests/ktx-realistic-assets.test.mjs`, and this report were changed; simulation and scene code were not altered.
- Exterior consistency review: all six exteriors use the same generated train master family and preserve a right-facing white-silver/deep-plum silhouette.
- Cockpit consistency review: day/night/tunnel use the corrected day master family and preserve the same dashboard geometry and overlay-safe zones.
- Known tooling concern: `sips` could read but not encode WebP on this host, so conversion used `cwebp`; this does not affect runtime assets or tests.
- Visual similarity is a manual composition/realism assessment against the approved board; there is no automated perceptual 95% metric in the repository.
