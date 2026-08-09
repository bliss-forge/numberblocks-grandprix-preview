# SRT Living Motion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the static-looking SRT photo presentation with distance-driven cab-track perspective, layered exterior parallax, and visible train-door animation.

**Architecture:** Keep existing photographic assets as fixed train/cab frames and far scenery. Extend the deterministic motion frame with normalized, wrapping phases, render separate DOM layers for depth and cab perspective, and drive all transforms from journey state rather than time-only CSS animations.

**Tech Stack:** Vanilla JavaScript ES modules, DOM/CSS transforms, Node.js test runner, optional Playwright Chromium browser regression tests.

## Global Constraints

- Preserve the existing photorealistic SRT train and cab assets.
- Do not add video, WebGL, third-party runtime dependencies, or network asset loading.
- Motion must derive from `x`, `v`, `phase`, `doors`, and `markerDistance`.
- Stop all travel motion at `v === 0`, while preserving visible door state transitions.
- Do not modify or merge `main`; work only on `codex/srt-photorealistic-95` and PR #4.
- Preserve `prefers-reduced-motion` and landscape-mobile fallbacks.

---

### Task 1: Deterministic depth and cab phases

**Files:**
- Modify: `src/ktx-realistic-motion.mjs`
- Test: `tests/ktx-realistic-motion.test.mjs`

**Interfaces:**
- Consumes: `{ x, v, phase, markerDistance, land }` passed to `realisticMotionFrame(input)`.
- Produces: `frame.offsets` with ordered depth movement and `frame.cab` with `sleeperPhase`, `polePhase`, and `groundRatio`.

- [ ] **Step 1: Write failing tests for depth ordering and stopped phase stability**

```js
test("외부 깊이 레이어는 원경보다 선로가 빠르게 이동한다", () => {
  const frame = realisticMotionFrame({
    x: 2400, v: 240, phase: "driving", markerDistance: 1800, land: "field"
  });
  assert.ok(frame.offsets.far < frame.offsets.mid);
  assert.ok(frame.offsets.mid < frame.offsets.near);
  assert.ok(frame.offsets.near < frame.offsets.track);
});

test("운전실 원근 위상은 주행 거리에 따라 변하고 정차 프레임은 고정된다", () => {
  const moving = realisticMotionFrame({
    x: 900, v: 180, phase: "driving", markerDistance: 2000, land: "city"
  });
  const stopped = realisticMotionFrame({
    x: 900, v: 0, phase: "stopped", markerDistance: 0, land: "city"
  });
  assert.ok(Number.isFinite(moving.cab.sleeperPhase));
  assert.ok(Number.isFinite(moving.cab.polePhase));
  assert.equal(stopped.moving, false);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/ktx-realistic-motion.test.mjs`

Expected: FAIL because `frame.cab` is undefined.

- [ ] **Step 3: Add deterministic cab phases to `realisticMotionFrame`**

```js
const CAB_PERIOD = Object.freeze({ sleeper: 120, pole: 480 });

const cab = Object.freeze({
  sleeperPhase: round(-(offsets.track % CAB_PERIOD.sleeper)),
  polePhase: round(-(offsets.near % CAB_PERIOD.pole)),
  groundRatio: round(Math.min(1, Math.max(0, speedRatio)))
});
```

Return `cab` with the existing frame object without changing existing offset factors.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test tests/ktx-realistic-motion.test.mjs`

Expected: all tests pass.

- [ ] **Step 5: Commit the deterministic frame contract**

```bash
git add src/ktx-realistic-motion.mjs tests/ktx-realistic-motion.test.mjs
git commit -m "feat: model layered SRT motion phases"
```

### Task 2: Continuous photographic and exterior parallax motion

**Files:**
- Modify: `src/ktx-realistic-motion-scene.mjs`
- Modify: `styles.css`
- Test: `tests/ktx-realistic-scene.test.mjs`
- Test: `tests/ktx-journey-art.test.mjs`

**Interfaces:**
- Consumes: `frame.offsets.far`, `frame.offsets.mid`, `frame.offsets.near`, and `frame.offsets.track`.
- Produces: CSS custom properties `--motion-far-x`, `--motion-mid-phase-x`, `--motion-near-phase-x`, and `--motion-track-phase-x`; DOM nodes `.ktx-motion-mid` and `.ktx-motion-wheel-shadow`.

- [ ] **Step 1: Replace the old 120px clamp expectations with failing continuous-motion tests**

```js
test("사진 원경은 플레이트 전체 구간에서 계속 왼쪽으로 진행한다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  const scene = root.querySelector(".ktx-motion-scene");
  const pans = [200, 450, 700].map(x => {
    updateRealisticMotionScene(root,
      { ...initial, phase: "driving", x, v: 240 }, { land: "field" });
    return Number.parseFloat(scene.style.getPropertyValue("--motion-far-x"));
  });
  assert.ok(pans[0] > pans[1] && pans[1] > pans[2]);
});
```

Add assertions that `.ktx-motion-mid` and `.ktx-motion-wheel-shadow` exist and that far/mid/near/track custom properties have distinct values.

- [ ] **Step 2: Run focused scene and art tests and confirm RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: FAIL because `--motion-far-x`, `.ktx-motion-mid`, and `.ktx-motion-wheel-shadow` do not exist.

- [ ] **Step 3: Drive all exterior layers from deterministic offsets**

In `applyFrame` set each property through the existing safe CSSOM path:

```js
scene.style.setProperty("--motion-far-x", `${photoPan(state.x)}px`);
setPatternMotion(scene, "mid", frame.offsets.mid, 960);
setPatternMotion(scene, "near", frame.offsets.near, 720);
setPatternMotion(scene, "track", frame.offsets.track, 144);
```

Reduce `PLATE_SPAN` so a 240–300km/h run reaches the next scene before the photographic pan becomes visually static. Keep two loaded plate slots and the existing preload/crossfade lifecycle.

- [ ] **Step 4: Render the midground and wheel-shadow nodes**

```js
const mid = el(document, "div", "ktx-motion-mid");
const wheelShadow = el(document, "div", "ktx-motion-wheel-shadow");
scene.append(...plates, stationViewport, stationSign,
  mid, track, near, cabWindow, wheelShadow, train, cabFrame);
```

- [ ] **Step 5: Style visible depth separation**

Use a slow photographic far layer, tree/building silhouettes for `.ktx-motion-mid`, clearer ballast/rails for `.ktx-motion-track`, fast fence and catenary poles for `.ktx-motion-near`, and a speed-responsive shadow under the train. Bind every transform to the custom properties from Step 3. Do not use an infinite time-only animation.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 7: Commit exterior movement**

```bash
git add src/ktx-realistic-motion-scene.mjs styles.css tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs
git commit -m "feat: animate layered SRT exterior scenery"
```

### Task 3: Cab ground, perspective rails, sleepers, and catenary poles

**Files:**
- Modify: `src/ktx-realistic-motion-scene.mjs`
- Modify: `styles.css`
- Test: `tests/ktx-realistic-scene.test.mjs`
- Test: `tests/ktx-journey-art.test.mjs`

**Interfaces:**
- Consumes: `frame.cab.sleeperPhase`, `frame.cab.polePhase`, `frame.speedRatio`, and existing tunnel state.
- Produces: `.ktx-motion-cab-ground`, `.ktx-motion-cab-ballast`, `.ktx-motion-cab-poles`, and cab custom properties `--cab-sleeper-phase` and `--cab-pole-phase`.

- [ ] **Step 1: Write failing structural and motion tests**

```js
assert.ok(root.querySelector(".ktx-motion-cab-ground"));
assert.ok(root.querySelector(".ktx-motion-cab-ballast"));
assert.ok(root.querySelector(".ktx-motion-cab-poles"));
```

Update two driving frames at different `x` values and assert both cab phase properties change; update two stopped frames with the same `x` and assert they remain equal.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: FAIL because the ground, ballast, and pole layers do not exist.

- [ ] **Step 3: Build the cab-world layers in back-to-front order**

```js
const cabGround = el(document, "div", "ktx-motion-cab-ground");
const cabBallast = el(document, "div", "ktx-motion-cab-ballast");
const cabPoles = el(document, "div", "ktx-motion-cab-poles");
cabWindow.append(cabGround, cabBallast, cabSleepers,
  cabRailLeft, cabRailRight, cabPoles, cabCatenary, tunnel);
```

- [ ] **Step 4: Correct the windshield composition**

Move the horizon below the current floating-wire area, fill the lower windshield with ground and ballast, draw rails as converging polygons rather than rotated vertical bars, and let sleepers widen toward the dashboard edge. Place poles on both sides of the track and keep the overhead wire centered on the vanishing point.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 6: Commit cab perspective motion**

```bash
git add src/ktx-realistic-motion-scene.mjs styles.css tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs
git commit -m "feat: animate SRT cab track perspective"
```

### Task 4: Visible SRT train-door animation

**Files:**
- Modify: `src/ktx-realistic-motion-scene.mjs`
- Modify: `styles.css`
- Test: `tests/ktx-realistic-scene.test.mjs`
- Test: `tests/ktx-journey-art.test.mjs`

**Interfaces:**
- Consumes: `state.doors`, `state.phase`, and `frame.stationStage`.
- Produces: `.ktx-motion-door`, `.ktx-motion-door-leaf-left`, `.ktx-motion-door-leaf-right`, and scene dataset `doors`.

- [ ] **Step 1: Write failing door-state tests**

```js
const door = root.querySelector(".ktx-motion-door");
assert.ok(door);
updateRealisticMotionScene(root,
  { ...initial, phase: "stopped", doors: "open", x: 0, v: 0 }, { land: "city" });
assert.equal(root.querySelector(".ktx-motion-scene").dataset.doors, "open");
```

Add a CSS contract asserting left and right leaves translate in opposite directions only for `[data-doors="open"]`.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: FAIL because the visible train door does not exist.

- [ ] **Step 3: Wrap the train and add a two-leaf door module**

```js
const trainRig = el(document, "div", "ktx-motion-train-rig");
const door = el(document, "div", "ktx-motion-door");
door.append(
  el(document, "span", "ktx-motion-door-leaf ktx-motion-door-leaf-left"),
  el(document, "span", "ktx-motion-door-leaf ktx-motion-door-leaf-right")
);
trainRig.append(train, door);
```

Set `scene.dataset.doors` to `open` only when `state.doors === "open"` and the phase is `stopped` or `boarding`; otherwise set it to `closed`.

- [ ] **Step 4: Style the door to match the SRT body and animate both leaves**

Align the module over a carriage doorway, include the purple belt line and dark window, reveal a dark vestibule behind the leaves, and use a 500–650ms eased transform. Preserve the final open state under reduced-motion rather than disabling the transform result.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 6: Commit visible door animation**

```bash
git add src/ktx-realistic-motion-scene.mjs styles.css tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs
git commit -m "feat: animate visible SRT train doors"
```

### Task 5: Real-browser regression, screenshots, and full verification

**Files:**
- Modify: `tests/ktx-realistic-browser-motion.test.mjs`
- Modify: `.superpowers/sdd/2026-08-08-srt-photorealistic-motion/task-6-artifacts/qa-install.js`
- Create: `.superpowers/sdd/2026-08-09-srt-living-motion/qa/cab-240.png`
- Create: `.superpowers/sdd/2026-08-09-srt-living-motion/qa/side-300.png`
- Create: `.superpowers/sdd/2026-08-09-srt-living-motion/qa/door-open.png`

**Interfaces:**
- Consumes: rendered `.ktx-motion-scene` in real Chromium and QA method `window.__srtQa.set(view, speed, extra)`.
- Produces: browser regression evidence for continuous parallax, cab track composition, and opposing door transforms.

- [ ] **Step 1: Write a failing Playwright regression**

Capture computed transforms before and after advancing `x`, then assert:

```js
assert.notEqual(after.far, before.far);
assert.notEqual(after.mid, before.mid);
assert.notEqual(after.near, before.near);
assert.ok(Math.abs(after.nearPx - before.nearPx) >
  Math.abs(after.farPx - before.farPx));
assert.notEqual(open.leftDoor, closed.leftDoor);
assert.notEqual(open.rightDoor, closed.rightDoor);
```

- [ ] **Step 2: Run the browser test and confirm RED**

Run: `node --test tests/ktx-realistic-browser-motion.test.mjs`

Expected: FAIL on the new layer and door assertions.

- [ ] **Step 3: Complete only the integration adjustments required by the browser test**

Use `getComputedStyle(element).transform` and `style.getPropertyValue(name)` in the test. Do not add fake style access or production-only test hooks.

- [ ] **Step 4: Run the browser test and confirm GREEN**

Run: `node --test tests/ktx-realistic-browser-motion.test.mjs`

Expected: pass, or explicit Playwright-unavailable skip on an environment without global Playwright.

- [ ] **Step 5: Run all automated tests**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 6: Capture visual evidence at the reported problem states**

Serve the worktree locally, install the existing QA helper, and capture:

- cab view at 240km/h with rails and ground occupying the lower windshield;
- exterior view at 300km/h with clear depth layers;
- exterior stopped view with doors open.

Verify no horizontal/vertical overflow at 1228×620 and landscape mobile 844×390.

- [ ] **Step 7: Commit browser coverage and evidence metadata**

```bash
git add tests/ktx-realistic-browser-motion.test.mjs \
  .superpowers/sdd/2026-08-08-srt-photorealistic-motion/task-6-artifacts/qa-install.js \
  .superpowers/sdd/2026-08-09-srt-living-motion/qa
git commit -m "test: verify living SRT motion in browser"
```

- [ ] **Step 8: Request explicit push approval**

Before updating PR #4, report the commit list, test results, and screenshots. Push only after the user explicitly approves the external write.

