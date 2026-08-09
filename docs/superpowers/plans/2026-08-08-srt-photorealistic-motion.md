# SRT Photorealistic Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static SRT photos in game 7 with speed-driven photorealistic exterior, cab-window, landscape, track, tunnel, and station motion while preserving the approved train composition and existing controls.

**Architecture:** A pure motion-model module converts journey position, speed, phase, and marker distance into deterministic CSS values. The scene renderer mounts a separate motion asset rig only for SRT, keeps the current static realistic scene as the first fallback, and keeps the train-specific SVG as the final fallback. One native-resolution complete environment plate (sky + far + mid) pans only inside its safe crop range and crossfades to another complete plate; photographic plates are never stitched or tiled. CSS/SVG near objects and track patterns provide uninterrupted high-speed motion beneath a fixed train or cab shell.

**Tech Stack:** Native ES modules, DOM/SVG/CSS transforms, WebP/PNG assets, Node `node:test`, existing fake DOM test harness, browser visual QA.

## Global Constraints

- At 0km/h every motion layer must stop completely.
- `speedRatio = clamp(state.v / 300, 0, 1)` is the single speed normalization rule.
- Position multipliers are sky `0.01`, far `0.06`, mid `0.22`, near `0.85`, and track `1.00`.
- The exterior SRT and cab shell remain sharp; blur applies only to near scenery and track cues.
- The station enters at 600m, gains readable details at 320m, stops at the marker, and recedes after departure.
- SRT keeps `motion-ready → realistic-ready → fallback` degradation; KTX never requests SRT motion or realistic assets.
- Exterior uses at most four large moving raster layers and cab uses at most three.
- `prefers-reduced-motion: reduce` removes blur, vibration, and speed streaks while preserving low-frequency position changes.
- Desktop 1280×720 and mobile landscape 844×390 must have no clipping, horizontal overflow, or control overlap.
- Existing SRT visual fidelity remains at least 95/100.
- Never stitch, mirror, or tile generated photographic plates. A photographic edge must never meet another photographic edge inside the viewport.
- At 0km/h both plate panning and any in-progress plate crossfade must freeze.

---

### Task 1: Deterministic motion model

**Files:**
- Create: `src/ktx-realistic-motion.mjs`
- Create: `tests/ktx-realistic-motion.test.mjs`

**Interfaces:**
- Consumes: `{ x, v, phase, markerDistance, land }` from journey state.
- Produces: `realisticMotionFrame(input)` returning `{ speedRatio, moving, speedBand, offsets, stationStage, brakePitch, blurPx }`.
- Produces: `REALISTIC_PARALLAX` with exact multipliers `{ sky: .01, far: .06, mid: .22, near: .85, track: 1 }`.

- [ ] **Step 1: Write failing tests for stopped, accelerating, and position-deterministic frames**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  REALISTIC_PARALLAX,
  realisticMotionFrame
} from "../src/ktx-realistic-motion.mjs";

test("정차하면 모든 실사 모션 오프셋과 효과가 멈춘다", () => {
  const frame = realisticMotionFrame({
    x: 2500, v: 0, phase: "stopped", markerDistance: 0, land: "city"
  });
  assert.equal(frame.speedRatio, 0);
  assert.equal(frame.moving, false);
  assert.deepEqual(frame.offsets, { sky: 25, far: 150, mid: 550, near: 2125, track: 2500 });
  assert.equal(frame.blurPx, 0);
});

test("속도와 위치는 실사 흐름을 단조롭게 키운다", () => {
  const slow = realisticMotionFrame({ x: 1000, v: 80, phase: "driving", markerDistance: 900, land: "field" });
  const fast = realisticMotionFrame({ x: 2000, v: 240, phase: "driving", markerDistance: 900, land: "field" });
  assert.equal(REALISTIC_PARALLAX.track, 1);
  assert.ok(fast.speedRatio > slow.speedRatio);
  assert.ok(fast.offsets.near > slow.offsets.near);
  assert.ok(fast.blurPx > slow.blurPx);
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/ktx-realistic-motion.test.mjs`
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/ktx-realistic-motion.mjs`.

- [ ] **Step 3: Implement the minimal pure model**

```js
export const REALISTIC_PARALLAX = Object.freeze({
  sky: 0.01, far: 0.06, mid: 0.22, near: 0.85, track: 1
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function realisticMotionFrame({ x, v, phase, markerDistance, land }) {
  const speedRatio = clamp(v / 300, 0, 1);
  const offsets = Object.fromEntries(Object.entries(REALISTIC_PARALLAX)
    .map(([name, ratio]) => [name, x * ratio]));
  const stationStage = markerDistance <= 0 ? "stopped"
    : markerDistance <= 320 ? "detail"
      : markerDistance <= 600 ? "approach" : "hidden";
  return {
    speedRatio,
    moving: speedRatio > 0 && ["driving", "stopping", "correcting"].includes(phase),
    speedBand: speedRatio >= .8 ? "very-fast" : speedRatio >= .533 ? "fast"
      : speedRatio >= .267 ? "cruise" : speedRatio > 0 ? "slow" : "stopped",
    offsets,
    stationStage,
    brakePitch: phase === "stopping" ? clamp(speedRatio * 1.8, 0, 1.8) : 0,
    blurPx: speedRatio < .533 ? 0 : Number(((speedRatio - .533) * 5.6).toFixed(2)),
    land
  };
}
```

- [ ] **Step 4: Add boundary tests for 600m, 320m, 0m, 300km/h clamp, and deterministic replay**

Run: `node --test tests/ktx-realistic-motion.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/ktx-realistic-motion.mjs tests/ktx-realistic-motion.test.mjs
git commit -m "feat: model speed-driven SRT motion"
```

### Task 2: Native scene-plate manifest and generated scene pack

**Files:**
- Modify: `src/ktx-realistic-assets.mjs`
- Modify: `tests/ktx-realistic-assets.test.mjs`
- Create: `assets/train-realistic/motion/srt-side-transparent.png`
- Create: `assets/train-realistic/motion/cab-window-mask.png`
- Create: `assets/train-realistic/motion/station-platform-a.webp`
- Create: `assets/train-realistic/motion/{city,field,mountain,river,sea,tunnel}-{a,b,c}.webp`
- Create: `assets/train-realistic/motion/quality-metrics.json`

**Interfaces:**
- Produces: `realisticMotionAssets(trainId, land)` returning `null` for non-SRT and `{ train, cabMask, station, scenes }` for SRT, where `station` and `scenes` are frozen arrays of native scene-plate paths.
- Produces: `REALISTIC_MOTION_ASSETS` as the immutable source manifest.

- [ ] **Step 1: Write failing manifest tests**

```js
test("SRT 모션 팩은 환경별 하늘·원경·중경과 공용 열차·역을 제공한다", () => {
  const pack = realisticMotionAssets("srt", "river", "day");
  assert.equal(pack.train, "assets/train-realistic/motion/srt-side-transparent.png");
  assert.deepEqual(pack.scenes, [
    "assets/train-realistic/motion/river-a.webp",
    "assets/train-realistic/motion/river-b.webp",
    "assets/train-realistic/motion/river-c.webp"
  ]);
  assert.deepEqual(pack.station, ["assets/train-realistic/motion/station-platform-a.webp"]);
});

test("KTX는 SRT 모션 자산을 선택하지 않는다", () => {
  assert.equal(realisticMotionAssets("ktx", "city", "day"), null);
});
```

- [ ] **Step 2: Run the asset test and verify RED**

Run: `node --test tests/ktx-realistic-assets.test.mjs`
Expected: FAIL because `realisticMotionAssets` is not exported.

- [ ] **Step 3: Generate the assets with the image generation tool**

Generate one clean transparent SRT side profile, one full-screen cab frame with transparency
only in the windshield, one native station plate, and at least three independent native complete
scene plates for every environment. Every landscape prompt must say: realistic Korean
high-speed railway, no train, no people close-up, no text, no watermark, level horizon,
correct environment, neutral daylight. Do not request or construct seamless horizontal edges.
The SRT prompt must say: complete right-facing white/silver SRT, plum roof and stripe,
pantograph visible, both ends inside frame, transparent background, no text except SRT logo.

- [ ] **Step 4: Normalize dimensions and encoding**

Keep every landscape and station plate at its native aspect ratio and at least 1600×850;
down-encode to WebP without spatial upscaling. Keep the train at 2400×640 transparent PNG
and the cab frame at 2560×1440 transparent PNG. Do not stitch, mirror, tile, stretch, or
extend any photographic plate. If a native source is below the minimum, regenerate it.

- [ ] **Step 5: Implement and freeze the manifest**

```js
const MOTION_ROOT = `${ROOT}/motion`;
const MOTION_LANDS = ["city", "field", "mountain", "river", "sea", "tunnel"];

export function realisticMotionAssets(trainId, land) {
  if (trainId !== "srt") return null;
  const selected = MOTION_LANDS.includes(land) ? land : "city";
  return {
    train: `${MOTION_ROOT}/srt-side-transparent.png`,
    cabMask: `${MOTION_ROOT}/cab-window-mask.png`,
    station: [`${MOTION_ROOT}/station-platform-a.webp`],
    scenes: ["a", "b", "c"].map((variant) => `${MOTION_ROOT}/${selected}-${variant}.webp`)
  };
}
```

- [ ] **Step 6: Add existence, dimensions, alpha, and budget assertions**

Verify all assets exist, every photographic plate is at least 1600×850, train and mask
retain alpha, and the cab is opaque outside representative windshield points. Validate
asset bytes and dimensions with Node built-ins plus committed SHA-256-bound metadata;
tests must not shell out to platform-only tools such as `sips`. Reject same-hash variants,
obvious mirrored duplicates, any dimension implying a stitched 3840×720 strip, and any
metadata whose SHA no longer matches the asset. Each raster is at most 1.2MB and the full
motion pack is at most 28MB.

Run: `node --test tests/ktx-realistic-assets.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ktx-realistic-assets.mjs tests/ktx-realistic-assets.test.mjs assets/train-realistic/motion
git commit -m "feat: add layered SRT motion assets"
```

### Task 3: Scene-plate rig mounting, readiness, and fallback

**Files:**
- Create: `src/ktx-realistic-motion-scene.mjs`
- Modify: `src/ktx-scene.mjs`
- Modify: `tests/ktx-realistic-scene.test.mjs`

**Interfaces:**
- Consumes: `realisticMotionAssets(trainId, land)` and `realisticMotionFrame(input)`.
- Produces: `buildRealisticMotionScene(document, state, onStateChange)`.
- Produces: `updateRealisticMotionScene(root, state, band)`.
- Sets `root.dataset.motionRealistic` to `pending`, `ready`, or `fallback`.

- [ ] **Step 1: Write a failing SRT rig contract test**

```js
test("SRT는 분리 실사 모션 리그와 정적 폴백을 함께 마운트한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "side");
  assert.ok(root.querySelector(".ktx-motion-scene"));
  assert.equal(root.querySelectorAll(".ktx-motion-plate").length, 2);
  assert.ok(root.querySelector(".ktx-motion-track"));
  assert.ok(root.querySelector(".ktx-motion-train"));
  assert.ok(root.querySelector(".ktx-real-exterior-image"), "정적 실사 폴백 유지");
});
```

- [ ] **Step 2: Write a failing KTX isolation test**

Assert KTX mounts no `.ktx-motion-scene` and creates no image whose source contains
`assets/train-realistic/motion/`.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs`
Expected: FAIL because the motion rig is absent.

- [ ] **Step 4: Implement the focused motion-scene module**

Build two complete-scene image slots, one fixed train/cab frame, one station slot,
plus CSS nodes for track and near objects. Only one scene slot is visible normally;
the second slot exists only for a full-frame crossfade. Track all required image load/error
events. Only set `ready`
when the current view's required assets are loaded. On failure, set `fallback` without
changing the existing `data-realistic` static fallback state.

- [ ] **Step 5: Mount and update the module from `ktx-scene.mjs`**

Call `buildRealisticMotionScene` during SRT scene construction and
`updateRealisticMotionScene` before the legacy real-scene update. Pass actual position,
speed, phase, land, and `distanceToMarker(state)`.

- [ ] **Step 6: Add recovery tests**

Cover pending → ready, one plate failure → static realistic fallback, environment switch
preload, inactive-slot preload before crossfade, retry after returning to a loaded environment,
and KTX zero-request isolation.

Run: `node --test tests/ktx-realistic-scene.test.mjs`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/ktx-realistic-motion-scene.mjs src/ktx-scene.mjs tests/ktx-realistic-scene.test.mjs
git commit -m "feat: mount resilient SRT motion rig"
```

### Task 4: Exterior parallax, train response, and high-speed effects

**Files:**
- Modify: `src/ktx-realistic-motion-scene.mjs`
- Modify: `styles.css`
- Modify: `tests/ktx-journey-art.test.mjs`
- Modify: `tests/ktx-realistic-scene.test.mjs`

**Interfaces:**
- Consumes: `realisticMotionFrame` values.
- Produces CSS variables `--motion-scene-x`, `--motion-near-x`, `--motion-track-x`,
  `--motion-speed`, `--motion-blur`, and
  `--motion-brake-pitch`.

- [ ] **Step 1: Write failing renderer tests for exact CSS variables**

At `x=2000`, `v=240`, assert the root receives scene `-120px`, near `-1700px`,
track `-2000px`, a speed ratio of `.8`, and a positive blur.
At `v=0`, assert `data-motion-moving="false"` and blur `0px`.

- [ ] **Step 2: Write failing CSS contract tests**

Require position-driven transforms for every layer, the train above scenery, blur only on
near/track effects, high-speed streaks only in `fast`/`very-fast`, and no infinite drift
animation on the fixed train.

- [ ] **Step 3: Run tests and verify RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`
Expected: FAIL on missing motion variables and selectors.

- [ ] **Step 4: Implement exterior CSS composition**

Use `object-fit: cover` scene plates translated only within their computed safe crop range.
Choose a deterministic active plate from position, preload the next plate in the inactive
slot, and crossfade the two complete slots for 450–900ms; never place their horizontal edges
beside each other. Keep CSS/SVG near objects and track looping continuously across plate
changes. Keep the train at the approved center scale. Add a 1–2% pitch/settle transform for braking and a
maximum 1.5px vertical vibration above 160km/h. Never blur `.ktx-motion-train` or controls.

- [ ] **Step 5: Connect motion values on every state update**

Write the frame values to style properties synchronously in
`updateRealisticMotionScene`. Use 120ms linear transform transitions while moving and
`transition: none` at zero speed to prevent post-stop sliding.

- [ ] **Step 6: Run focused tests and commit**

Run: `node --test tests/ktx-realistic-motion.test.mjs tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`
Expected: PASS.

```bash
git add src/ktx-realistic-motion-scene.mjs styles.css tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs
git commit -m "feat: animate photorealistic SRT exterior"
```

### Task 5: Cab-window world, tunnel, and station lifecycle

**Files:**
- Modify: `src/ktx-realistic-motion.mjs`
- Modify: `src/ktx-realistic-motion-scene.mjs`
- Modify: `styles.css`
- Modify: `tests/ktx-realistic-motion.test.mjs`
- Modify: `tests/ktx-realistic-scene.test.mjs`
- Modify: `tests/ktx-journey-art.test.mjs`

**Interfaces:**
- Extends `realisticMotionFrame` with `stationProgress` in `[0,1]` and `departing`.
- Produces CSS variables `--station-progress`, `--cab-track-phase`, and `--tunnel-phase`.

- [ ] **Step 1: Write failing station lifecycle tests**

```js
test("역은 600m에서 나타나 0m에서 정위치에 멈춘다", () => {
  const far = realisticMotionFrame({ x: 0, v: 200, phase: "driving", markerDistance: 600, land: "city" });
  const near = realisticMotionFrame({ x: 500, v: 60, phase: "stopping", markerDistance: 100, land: "city" });
  const stop = realisticMotionFrame({ x: 600, v: 0, phase: "stopped", markerDistance: 0, land: "city" });
  assert.equal(far.stationProgress, 0);
  assert.ok(near.stationProgress > far.stationProgress);
  assert.equal(stop.stationProgress, 1);
});
```

- [ ] **Step 2: Write failing cab and station DOM/CSS tests**

Require a clipped `.ktx-motion-cab-window`, converging track strips, catenary objects,
tunnel light strips, station panorama, readable station sign at detail/stopped stages,
and hidden ordinary near-object spawns inside 320m.

- [ ] **Step 3: Run focused tests and verify RED**

Run: `node --test tests/ktx-realistic-motion.test.mjs tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`
Expected: FAIL on missing station progress and cab selectors.

- [ ] **Step 4: Implement cab-window projection**

Clip scenery to the approved windshield polygon. Keep the existing cab photo and live
controls fixed. Move rail and wire strips from the 40% vanishing point toward the bottom
using position variables; increase sleeper and tunnel-light density with speed.

- [ ] **Step 5: Implement station approach, stop, and departure**

Map 600→0m to progress 0→1. Place the platform at the vanishing point at progress 0,
grow/translate it to the door alignment at 1, freeze it at stopped, and move it behind the
train after departure. Suppress random near scenery inside 320m.

- [ ] **Step 6: Add tunnel entry/exit and exact-stop tests**

Verify tunnel layers only in tunnel, portal progression is monotonic, station transforms
stop changing at `v=0`, and departure clears the prior station after its exit animation.

- [ ] **Step 7: Run tests and commit**

Run: `node --test tests/ktx-realistic-motion.test.mjs tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`
Expected: PASS.

```bash
git add src/ktx-realistic-motion.mjs src/ktx-realistic-motion-scene.mjs styles.css tests/ktx-realistic-motion.test.mjs tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs
git commit -m "feat: animate SRT cab and station approach"
```

### Task 6: Accessibility, responsive performance, browser QA, and PR update

**Files:**
- Modify: `styles.css`
- Modify: `tests/ktx-journey-art.test.mjs`
- Modify: `tests/mobile-games-browser-layout.test.mjs`
- Modify: `README.md`
- Create: `.superpowers/sdd/2026-08-08-srt-photorealistic-motion/task-6-report.md`

**Interfaces:**
- No new public API.
- Final output is a verified branch update for PR #3.

- [ ] **Step 1: Write failing reduced-motion and mobile contracts**

Require reduced motion to disable blur, vibration, streaks, and transform transitions while
keeping position state; require mobile to cap moving large raster layers at three, preserve
48×48 controls, and avoid overflow at 844×390.

- [ ] **Step 2: Run focused contracts and verify RED**

Run: `node --test tests/ktx-journey-art.test.mjs tests/mobile-games-browser-layout.test.mjs`
Expected: FAIL on the new selectors/contracts.

- [ ] **Step 3: Implement the accessibility and mobile CSS**

Pause hidden-view layers, remove GPU-expensive filters on mobile, retain exact position
updates under reduced motion, and keep the approved 71/29 exterior composition.

- [ ] **Step 4: Run the complete automated suite**

Run: `git diff --check && npm test`
Expected: all tests PASS with zero failures.

- [ ] **Step 5: Run desktop browser scenarios**

Capture 1280×720 exterior and cab at 0, 80, 160, 240, and 300km/h plus approach 600m,
320m, 100m, stopped, and departure. Confirm scenery displacement increases monotonically,
station alignment freezes at stop, controls remain live, and console has no errors.

- [ ] **Step 6: Run mobile and reduced-motion scenarios**

Capture 844×390 exterior and cab, check no horizontal scroll or overlap, verify all touch
targets are at least 48×48, then enable reduced motion and confirm blur/vibration/streaks are
off while position still updates.

- [ ] **Step 7: Measure performance and visual fidelity**

During 300km/h motion, verify no repeated asset network loads, no more than four large
exterior and three large cab raster layers animate, and no long task over 100ms in the
sampled interaction. Compare against the approved reference and retain at least 95/100.

- [ ] **Step 8: Update documentation and commit**

Document the motion asset pipeline, fallback order, supported environments, and latest test
count in README and the task report.

```bash
git add styles.css tests/ktx-journey-art.test.mjs tests/mobile-games-browser-layout.test.mjs README.md
git commit -m "docs: verify photorealistic SRT motion"
```

- [ ] **Step 9: Request independent whole-branch review**

Review the complete branch against
`docs/superpowers/specs/2026-08-08-srt-photorealistic-motion-design.md`. Fix every
Critical/Important finding with a focused TDD commit and scoped re-review. After a clean
review, push the branch to update PR #3; do not merge it from this worktree.
