# SRT Time-of-Day Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce ten geometry-locked photoreal SRT time-of-day and terrain assets at the exact requested paths.

**Architecture:** Each asset starts from an existing repository image used as an ImageGen edit reference. Generated lighting or scenery is blended back onto the resized original so the train alpha silhouette, cockpit frame, station architecture, rails, and vanishing point remain fixed; deterministic post-processing then enforces dimensions, format, and size.

**Tech Stack:** Built-in ImageGen, macOS `sips`, `cwebp`, ImageMagick/Pillow when available, Git, existing Node asset tests.

## Global Constraints

- Photoreal Korean high-speed rail tone; no new people, faces, readable text, logos, or watermarks.
- Use the named existing source file as the edit reference for every output.
- Train output is a 2400×640 transparent PNG; its alpha silhouette is copied from the original.
- All cockpit and station outputs are exactly 1672×941 WebP.
- WebP conversion uses `cwebp -q 82`; target size is 100–350KB per file.
- Geometry may deviate by no more than 1% from the resized reference.
- This branch adds image assets and validation records only; Claude owns manifest and runtime wiring.

---

### Task 1: Prepare deterministic asset workspace and validation baseline

**Files:**
- Create: `.superpowers/sdd/2026-08-10-srt-time-of-day-assets/generated/`
- Create: `.superpowers/sdd/2026-08-10-srt-time-of-day-assets/validation/`
- Inspect: `assets/train-realistic/motion/srt-side-transparent.png`
- Inspect: `assets/train-realistic/cab-day.webp`
- Inspect: `assets/train-realistic/cab-night.webp`
- Inspect: `assets/train-realistic/motion/station-platform-a.webp`

**Interfaces:**
- Consumes: approved design and four reference assets.
- Produces: source measurements and writable staging directories used by Tasks 2–6.

- [ ] **Step 1: Record source dimensions, alpha, and sizes**

Run:
```bash
sips -g pixelWidth -g pixelHeight -g hasAlpha \
  assets/train-realistic/motion/srt-side-transparent.png \
  assets/train-realistic/cab-day.webp \
  assets/train-realistic/cab-night.webp \
  assets/train-realistic/motion/station-platform-a.webp
```
Expected: train 2400×640 with alpha, station 1672×941, cockpit references 2560×1440.

- [ ] **Step 2: Confirm conversion tools**

Run:
```bash
command -v cwebp
command -v sips
```
Expected: both commands resolve to executable paths.

- [ ] **Step 3: Create staging folders**

Run:
```bash
mkdir -p .superpowers/sdd/2026-08-10-srt-time-of-day-assets/{generated,validation}
```

### Task 2: Generate the geometry-locked night train sprite

**Files:**
- Reference: `assets/train-realistic/motion/srt-side-transparent.png`
- Create: `assets/train-realistic/motion/srt-side-transparent-night.png`

**Interfaces:**
- Consumes: original RGBA train and its alpha channel.
- Produces: a pixel-aligned night train sprite for Claude's `data-sky="night"` swap.

- [ ] **Step 1: Generate a night-lit edit on a removable flat chroma background**

Built-in ImageGen edit prompt:
```text
Use case: lighting-weather
Asset type: side-view transparent game sprite for a Korean high-speed train
Input image: the supplied srt-side-transparent.png is the edit target and exact geometry reference.
Primary request: relight only this exact train for nighttime. Keep every pixel-level silhouette, vehicle count, coupling position, wheel position, streamlined noses, pantograph, purple stripe, scale, and placement unchanged. Darken the body naturally, light every passenger window with warm soft yellow interior light, turn on subtle headlights at both streamlined ends, and deepen the undercarriage shadow.
Scene/backdrop: perfectly flat solid #00ff00 chroma-key background for removal.
Constraints: preserve the entire train geometry exactly; do not redraw, crop, resize, rotate, translate, or add cars. The flat background must be uniform with no shadow, gradient, reflection, or texture. No people, faces, new readable text, new logo, watermark, ground, rails, or scenery.
```

- [ ] **Step 2: Restore original geometry and alpha**

Resize the generated edit to 2400×640, align it to the reference, composite its colour and lighting inside the original alpha mask, and copy the original alpha channel verbatim to the final PNG.

- [ ] **Step 3: Validate train invariants**

Check exact 2400×640 RGBA dimensions, transparent corners, original alpha bounding box, wheel bottom near 61.7%, and unchanged coupling x positions at 32%, 43.9%, 55.7%, 67.6%, and 79.5%.

- [ ] **Step 4: Commit the sprite**

```bash
git add assets/train-realistic/motion/srt-side-transparent-night.png
git commit -m "feat: add night SRT train sprite"
```

### Task 3: Generate dawn and sunset cockpit variants

**Files:**
- References: `assets/train-realistic/cab-day.webp`, `assets/train-realistic/cab-night.webp`
- Create: `assets/train-realistic/cab-dawn.webp`
- Create: `assets/train-realistic/cab-sunset.webp`

**Interfaces:**
- Consumes: day cockpit as geometry source and night cockpit as low-light reference.
- Produces: two 1672×941 cockpit variants with identical interior and track vanishing point.

- [ ] **Step 1: Generate dawn cockpit edit**

Built-in ImageGen edit prompt:
```text
Use case: lighting-weather
Asset type: photoreal train-driving game background
Input images: cab-day.webp is the exact edit target and geometry reference; cab-night.webp is a supporting low-light reference.
Primary request: change only the time of day to just before sunrise. Preserve the cockpit dashboard, screens, controls, window frame, wipers, rail geometry, catenary geometry, camera position, and vanishing point exactly. Through the windshield show a pale pink to blue-violet dawn gradient with a bright horizon and subtle reddish first light along the twin rails. Keep the instrument panel dim and pre-sunrise.
Constraints: no structural changes, no camera movement, no new objects, no people, no readable text, no new logos, no watermark, no fantasy colours, no heavy fog.
```

- [ ] **Step 2: Generate sunset cockpit edit**

Built-in ImageGen edit prompt:
```text
Use case: lighting-weather
Asset type: photoreal train-driving game background
Input images: cab-day.webp is the exact edit target and geometry reference; cab-night.webp is a supporting low-light reference.
Primary request: change only the time of day to sunset. Preserve the cockpit dashboard, screens, controls, window frame, wipers, rail geometry, catenary geometry, camera position, and vanishing point exactly. Through the windshield show an orange to deep magenta sunset sky, low backlight glinting on the twin rails, and restrained warm orange light spilling into the cab.
Constraints: no structural changes, no camera movement, no new objects, no people, no readable text, no new logos, no watermark, no fantasy colours, no excessive HDR.
```

- [ ] **Step 3: Geometry-lock and encode both outputs**

Blend each generated lighting edit with the resized 1672×941 day reference, preserve high-frequency cockpit edges from the reference, and encode with:
```bash
cwebp -q 82 input.png -o output.webp
```

- [ ] **Step 4: Validate and commit**

Confirm both files are 1672×941, 100–350KB where visually practical, and that windshield corners and rail vanishing point differ by less than 1% from the resized day reference.

```bash
git add assets/train-realistic/cab-dawn.webp assets/train-realistic/cab-sunset.webp
git commit -m "feat: add dawn and sunset SRT cabs"
```

### Task 4: Generate sunset, night, and dawn station variants

**Files:**
- Reference: `assets/train-realistic/motion/station-platform-a.webp`
- Create: `assets/train-realistic/motion/station-platform-sunset.webp`
- Create: `assets/train-realistic/motion/station-platform-night.webp`
- Create: `assets/train-realistic/motion/station-platform-dawn.webp`

**Interfaces:**
- Consumes: station-platform-a as the exact camera and architecture reference.
- Produces: three 1672×941 station plates for time-of-day swapping.

- [ ] **Step 1: Generate sunset station edit**

Prompt: preserve the exact roof, beams, central column, benches, bins, platform edges and rails; replace only daylight with orange sunset sky, long roof shadows, and restrained warm reflections; no people, text, logos, watermark, structural or camera changes.

- [ ] **Step 2: Generate night station edit**

Prompt: preserve the exact station geometry; use deep navy sky, lit fluorescent strips under the roof, believable pools of light on the platform, dark rails and distant skyline; no people, text, logos, watermark, structural or camera changes.

- [ ] **Step 3: Generate dawn station edit**

Prompt: preserve the exact station geometry; use pale pink-blue dawn sky, cool ambient light and platform lamps still on; no people, text, logos, watermark, structural or camera changes.

- [ ] **Step 4: Geometry-lock, encode, validate, and commit**

Blend the generated lighting into the reference structure, encode all three with `cwebp -q 82`, confirm 1672×941 dimensions and less than 1% movement of the central column, platform edge, and rail horizon.

```bash
git add assets/train-realistic/motion/station-platform-{sunset,night,dawn}.webp
git commit -m "feat: add SRT station time variants"
```

### Task 5: Generate four cockpit terrain variants

**Files:**
- Reference: `assets/train-realistic/cab-day.webp`
- Create: `assets/train-realistic/cab-field.webp`
- Create: `assets/train-realistic/cab-river.webp`
- Create: `assets/train-realistic/cab-sea.webp`
- Create: `assets/train-realistic/cab-mountain.webp`

**Interfaces:**
- Consumes: cab-day cockpit and windshield geometry.
- Produces: four 1672×941 daytime terrain variants.

- [ ] **Step 1: Generate field variant**

Prompt: change only the landscape visible through the windshield to broad green Korean rice fields; preserve cockpit, window, twin rails, catenary, camera and vanishing point exactly; no people, text, logos or watermark.

- [ ] **Step 2: Generate river variant**

Prompt: change only the windshield landscape to a Korean riverside railway with bridge railing and visible water; preserve cockpit, window, twin rails, catenary, camera and vanishing point exactly; no people, text, logos or watermark.

- [ ] **Step 3: Generate sea variant**

Prompt: change only the windshield landscape to a Korean coastal high-speed rail corridor with blue sea beyond a low acoustic barrier; preserve cockpit, window, twin rails, catenary, camera and vanishing point exactly; no people, text, logos or watermark.

- [ ] **Step 4: Generate mountain variant**

Prompt: change only the windshield landscape to a Korean mountain corridor with forested slopes and distant tunnel portals; preserve cockpit, window, twin rails, catenary, camera and vanishing point exactly; no people, text, logos or watermark.

- [ ] **Step 5: Geometry-lock, encode, validate, and commit**

Limit generated changes to the windshield polygon, keep the resized original cockpit outside that mask, encode with `cwebp -q 82`, and confirm 1672×941 dimensions and under 1% vanishing-point drift.

```bash
git add assets/train-realistic/cab-{field,river,sea,mountain}.webp
git commit -m "feat: add SRT cockpit terrain variants"
```

### Task 6: Final contact sheet, asset budget, and regression verification

**Files:**
- Create: `.superpowers/sdd/2026-08-10-srt-time-of-day-assets/validation/contact-sheet.png`
- Create: `.superpowers/sdd/2026-08-10-srt-time-of-day-assets/validation/report.md`

**Interfaces:**
- Consumes: all ten final assets and their references.
- Produces: visual comparison and measurement record for Claude's integration review.

- [ ] **Step 1: Build reference-versus-output contact sheets**

Place each reference next to its output at matching scale. For the transparent sprite, use a neutral checkerboard background only in the contact sheet.

- [ ] **Step 2: Record automated measurements**

Record path, dimensions, byte size, alpha presence, bounding box, structural alignment score, and manual pass/fail for all ten files in `report.md`.

- [ ] **Step 3: Run repository tests**

Run:
```bash
git diff --check
npm test
```
Expected: all tests pass, no skipped browser regressions caused by the assets.

- [ ] **Step 4: Commit validation records**

```bash
git add .superpowers/sdd/2026-08-10-srt-time-of-day-assets/validation
git commit -m "test: verify SRT time-of-day assets"
```
