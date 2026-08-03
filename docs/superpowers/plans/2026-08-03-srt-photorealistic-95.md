# SRT Photorealistic 95% Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild game 7 with a photorealistic layered SRT exterior, cockpit, and six route environments while preserving its existing child-friendly controls, audio, and game model.

**Architecture:** Add a small asset manifest that maps the existing `sky`, `land`, and train state to versioned WebP files. Mount raster scene layers behind the existing interactive DOM/SVG instruments, retain the canonical SVG as a load-failure fallback, and use CSS variables for parallax and state transitions. Generated assets remain presentation-only; `ktx-journey.mjs` remains the authoritative simulation.

**Tech Stack:** Static ES modules, DOM, CSS, WebP raster assets, Node built-in test runner, local browser screenshots.

## Global Constraints

- Preserve all game rules, station order, input handling, star scoring, boarding, speech, and audio.
- Primary reference viewport is 1280×720; mobile validation viewport is 844×390 landscape.
- New assets live only under `assets/train-realistic/` and may not contain watermarks or baked UI text.
- Keep the existing canonical SVG scene as the image-load and reduced-motion fallback.
- New assets should remain under 6MB total where practical and load per scene, not all at initial home load.
- Completion requires all existing tests plus the new asset and scene tests to pass.
- Completion requires a 95/100 or higher score against the approved visual checklist in the design spec.

---

### Task 1: Realistic asset manifest and fallback contract

**Files:**
- Create: `src/ktx-realistic-assets.mjs`
- Create: `tests/ktx-realistic-assets.test.mjs`

**Interfaces:**
- Consumes: current journey values `state.train.id`, `currentBand(state).land`, and `currentBand(state).sky`.
- Produces: `REALISTIC_TRAIN_ASSETS`, `realisticExteriorAsset(trainId, land)`, `realisticCabAsset(sky, land)`, and `realisticAssetAlt(kind, context)`.

- [ ] **Step 1: Write the failing manifest tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  REALISTIC_TRAIN_ASSETS,
  realisticCabAsset,
  realisticExteriorAsset
} from "../src/ktx-realistic-assets.mjs";

test("실사 SRT는 여섯 환경과 세 운전실 상태를 제공한다", () => {
  assert.deepEqual(Object.keys(REALISTIC_TRAIN_ASSETS.srt.exterior).sort(),
    ["city", "field", "mountain", "river", "sea", "tunnel"]);
  assert.equal(realisticCabAsset("night", "mountain"),
    "assets/train-realistic/cab-night.webp");
  assert.equal(realisticCabAsset("day", "tunnel"),
    "assets/train-realistic/cab-tunnel.webp");
});

test("알 수 없는 열차와 환경은 안전한 기본 장면을 고른다", () => {
  assert.equal(realisticExteriorAsset("unknown", "unknown"),
    "assets/train-realistic/srt-exterior-city.webp");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/ktx-realistic-assets.test.mjs`
Expected: FAIL because `src/ktx-realistic-assets.mjs` does not exist.

- [ ] **Step 3: Implement the immutable manifest**

```js
const ROOT = "assets/train-realistic";

export const REALISTIC_TRAIN_ASSETS = Object.freeze({
  srt: Object.freeze({
    exterior: Object.freeze(Object.fromEntries(
      ["city", "field", "mountain", "river", "sea", "tunnel"]
        .map(land => [land, `${ROOT}/srt-exterior-${land}.webp`]))),
    cab: Object.freeze({
      day: `${ROOT}/cab-day.webp`,
      night: `${ROOT}/cab-night.webp`,
      tunnel: `${ROOT}/cab-tunnel.webp`
    })
  })
});
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/ktx-realistic-assets.test.mjs`
Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/ktx-realistic-assets.mjs tests/ktx-realistic-assets.test.mjs
git commit -m "feat: define realistic train asset manifest"
```

### Task 2: Generate and validate project-bound raster assets

**Files:**
- Create: `assets/train-realistic/srt-exterior-city.webp`
- Create: `assets/train-realistic/srt-exterior-field.webp`
- Create: `assets/train-realistic/srt-exterior-river.webp`
- Create: `assets/train-realistic/srt-exterior-mountain.webp`
- Create: `assets/train-realistic/srt-exterior-sea.webp`
- Create: `assets/train-realistic/srt-exterior-tunnel.webp`
- Create: `assets/train-realistic/cab-day.webp`
- Create: `assets/train-realistic/cab-night.webp`
- Create: `assets/train-realistic/cab-tunnel.webp`
- Modify: `tests/ktx-realistic-assets.test.mjs`

**Interfaces:**
- Consumes: exact paths from `REALISTIC_TRAIN_ASSETS`.
- Produces: nine WebP images with 16:9 framing, consistent SRT livery, and no baked UI.

- [ ] **Step 1: Add a failing filesystem and dimension test**

```js
test("매니페스트의 실사 자산이 모두 존재하고 비어 있지 않다", async () => {
  const paths = realisticAssetPaths();
  assert.equal(paths.length, 9);
  for (const file of paths) {
    const stat = await fs.stat(new URL(`../${file}`, import.meta.url));
    assert.ok(stat.size > 20_000, `${file} is a real image asset`);
  }
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/ktx-realistic-assets.test.mjs`
Expected: FAIL with `ENOENT` for the first missing WebP.

- [ ] **Step 3: Generate exterior assets from one locked prompt family**

Use the approved concept board as a composition reference. Keep the train facing right, the camera height, daylight direction, white-silver body, and deep plum roof/stripe consistent. Generate 16:9 images without UI, text, people, or watermarks.

- [ ] **Step 4: Generate cockpit assets from one locked prompt family**

Keep identical dashboard geometry across day, night, and tunnel. Leave the central lower area visually calm for the live speedometer and leave the left edge clear for the live lever.

- [ ] **Step 5: Convert selected outputs to WebP and inspect every asset**

Run: `sips -s format webp generated.png --out assets/train-realistic/name.webp`
Expected: each output opens, is 16:9, contains no text artifacts, and matches the shared SRT geometry.

- [ ] **Step 6: Run the focused test and verify GREEN**

Run: `node --test tests/ktx-realistic-assets.test.mjs`
Expected: all manifest and filesystem tests pass.

- [ ] **Step 7: Commit**

```bash
git add assets/train-realistic tests/ktx-realistic-assets.test.mjs
git commit -m "feat: add photorealistic SRT scene assets"
```

### Task 3: Mount realistic layers behind existing controls

**Files:**
- Modify: `src/ktx-scene.mjs`
- Create: `tests/ktx-realistic-scene.test.mjs`

**Interfaces:**
- Consumes: `realisticExteriorAsset`, `realisticCabAsset`, and current scene state.
- Produces: `.ktx-real-scene`, `.ktx-real-cab-image`, `.ktx-real-exterior-image`, `data-realistic`, and SVG fallback visibility state.

- [ ] **Step 1: Write a failing DOM contract test**

```js
test("운전실과 바깥 뷰는 실사 이미지와 기존 SVG 폴백을 함께 마운트한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "cab");
  assert.ok(root.querySelector(".ktx-real-cab-image"));
  assert.ok(root.querySelector(".ktx-real-exterior-image"));
  assert.ok(root.querySelector(".ktx-cab-backdrop"), "기존 폴백 유지");
  assert.ok(root.querySelector(".ktx-side-train"), "기존 폴백 유지");
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs`
Expected: FAIL because the realistic image elements are absent.

- [ ] **Step 3: Add image-layer builders and load/error state**

```js
function realisticImage(document, className, src, alt) {
  const image = document.createElement("img");
  image.className = className;
  image.src = src;
  image.alt = alt;
  image.decoding = "async";
  image.addEventListener?.("load", () => image.dataset.loaded = "true");
  image.addEventListener?.("error", () => image.dataset.failed = "true");
  return image;
}
```

- [ ] **Step 4: Update scene state without remounting images**

`updateKtxScene` changes image `src` only when the selected land/sky path changes. It also mirrors load failure to `root.dataset.realistic="fallback"` and otherwise uses `"ready"`.

- [ ] **Step 5: Run focused scene tests and verify GREEN**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey.test.mjs`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/ktx-scene.mjs tests/ktx-realistic-scene.test.mjs
git commit -m "feat: mount realistic SRT scene layers"
```

### Task 4: Match the approved exterior and cockpit composition

**Files:**
- Modify: `styles.css`
- Modify: `tests/ktx-journey-art.test.mjs`

**Interfaces:**
- Consumes: classes mounted by Task 3 and existing `data-view`, `data-speed-tier`, `data-sky`, `data-land`, and `data-tunnel` attributes.
- Produces: 65/35 exterior composition, large clear train, photographic cockpit, live instrument hierarchy, and state-based motion.

- [ ] **Step 1: Write failing CSS contract assertions**

```js
test("실사 장면은 승인된 구도와 폴백 계약을 가진다", () => {
  assert.match(css, /\.ktx-real-cab-image\s*\{/);
  assert.match(css, /\.ktx-real-exterior-image\s*\{/);
  assert.match(css, /data-realistic="ready"/);
  assert.match(css, /object-fit:\s*cover/);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test tests/ktx-journey-art.test.mjs`
Expected: FAIL because the realistic CSS selectors do not exist.

- [ ] **Step 3: Implement the exterior composition**

The realistic exterior fills the view, uses `object-fit: cover`, anchors the rails to the lower third, and keeps the train visually dominant. Existing SVG layers become hidden only after the raster image reports loaded.

- [ ] **Step 4: Implement the cockpit composition**

The cockpit image fills the view; live speedometer, lever, destination board, approach strip, and door lamp sit above it. Increase lever scale to 1.4 and dim noninteractive decorative gauges.

- [ ] **Step 5: Implement speed and environment motion**

Use a subtle `scale(1.01)` camera drift, foreground streaks, and speed-tier blur. Never blur the train body or live instruments. Disable these effects under `prefers-reduced-motion`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run: `node --test tests/ktx-journey-art.test.mjs tests/ktx-realistic-scene.test.mjs`
Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add styles.css tests/ktx-journey-art.test.mjs
git commit -m "feat: compose photorealistic SRT driving views"
```

### Task 5: Landscape mobile and loading behavior

**Files:**
- Modify: `mobile-games.css`
- Modify: `src/ktx-scene.mjs`
- Modify: `tests/mobile-games-browser-layout.test.mjs`
- Modify: `tests/ktx-realistic-scene.test.mjs`

**Interfaces:**
- Consumes: the same scene tree and loaded/fallback attributes from Task 3.
- Produces: 844×390 landscape composition with 48px controls, no clipping, and a neutral loading veil.

- [ ] **Step 1: Write failing responsive and loading tests**

```js
test("가로 모바일에서 실사 기관사 화면은 조작부를 48px 이상 유지한다", () => {
  assert.match(mobileCss, /\.ktx-game \.ktx-lever[\s\S]*min-width:\s*48px/);
  assert.match(mobileCss, /\.ktx-game \.ktx-speedo[\s\S]*min-height:\s*48px/);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `node --test tests/mobile-games-browser-layout.test.mjs tests/ktx-realistic-scene.test.mjs`
Expected: FAIL because the mobile realistic rules and loading veil are absent.

- [ ] **Step 3: Add the loading veil and preload the next route asset**

The current image stays visible until the next one loads. On failure, the SVG fallback is shown immediately and gameplay continues.

- [ ] **Step 4: Add 844×390 landscape rules**

Keep the front window or exterior train above the fold; shrink secondary route badges before shrinking the speedometer, lever, or stop prompt.

- [ ] **Step 5: Run responsive tests and verify GREEN**

Run: `node --test tests/mobile-games-browser-layout.test.mjs tests/ktx-realistic-scene.test.mjs`
Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add mobile-games.css src/ktx-scene.mjs tests/mobile-games-browser-layout.test.mjs tests/ktx-realistic-scene.test.mjs
git commit -m "feat: adapt realistic train game for landscape mobile"
```

### Task 6: Full regression and visual acceptance

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/specs/2026-08-03-srt-photorealistic-95-design.md` only if the verified asset set differs from the original list.

**Interfaces:**
- Consumes: complete implementation.
- Produces: verified branch, comparison screenshots, and an explicit 95-point visual score.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`
Expected: 0 failures.

- [ ] **Step 2: Serve the worktree and capture desktop states**

Capture 1280×720 picker, exterior stopped, exterior 83km/h, exterior 209km/h, cockpit day, cockpit night, cockpit tunnel, and result.

- [ ] **Step 3: Capture mobile landscape states**

Capture 844×390 exterior, cockpit, picker, and result. Confirm no horizontal scroll and no clipped primary control.

- [ ] **Step 4: Score the reference checklist**

Record a score for all seven categories in the design spec. If the total is below 95, identify the lowest category, make one targeted visual pass, and recapture.

- [ ] **Step 5: Update README implementation notes**

Document that game 7 uses project-owned WebP scene layers with SVG fallback and retains the dependency-free static deployment.

- [ ] **Step 6: Run final verification**

Run: `git diff --check && npm test`
Expected: clean diff check and 0 test failures.

- [ ] **Step 7: Commit**

```bash
git add README.md
git commit -m "docs: describe realistic SRT scene pipeline"
```

