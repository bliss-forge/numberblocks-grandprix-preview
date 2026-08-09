# SRT Space Booster Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Space activate a 500 km/h SRT boost for five seconds during ordinary driving, followed by a ten-second cooldown, without changing station Space actions.

**Architecture:** Keep boost timing in the immutable journey model so the existing elapsed-time tick is the only clock. Expose boost state through model events and state fields; the scene renders a shared HUD badge and capped analogue needle, while the app converts events to existing sound and hint feedback. SRT-only activation is enforced in the model, leaving the selectable KTX train unchanged.

**Tech Stack:** Browser ES modules, immutable JavaScript state, DOM/CSS rendering, Node `node:test`, gstack headless Chromium QA.

## Global Constraints

- Boost speed is exactly `500` km/h for `5,000` ms.
- Cooldown is `10,000` ms and begins after boost expiry, so successful activations are at least `15,000` ms apart.
- Boost activates only for train ID `srt`, phase `driving`, outside the station approach zone.
- Space keeps all approach, precision-stop, door, boarding, and branch behavior.
- Entering a station approach zone cancels boost and applies the normal speed envelope.
- Cooldown continues through every phase and route segment.
- Missing, negative, or non-finite boost counters behave as zero.
- Reduced-motion mode keeps readable state but removes new animation.
- No new dependency, voice asset, scoring rule, route distance, or station window.

---

### Task 1: Deterministic Booster State Machine

**Files:**
- Modify: `src/ktx-journey.mjs`
- Test: `tests/ktx-journey.test.mjs`

**Interfaces:**
- Consumes: `pressKtxSpace(state)`, `tickKtx(state, held, elapsedMs)`, `state.train.id`, `state.zoneEntered`.
- Produces: exported `BOOST_SPEED`, `BOOST_DURATION_MS`, `BOOST_COOLDOWN_MS`; state fields `boostRemainingMs`, `boostCooldownMs`; events `boost-start`, `boost-end`, `boost-ready`, `boost-unavailable`.

- [ ] **Step 1: Write failing model tests**

Add imports for the three constants and tests with these concrete assertions:

```js
test("SRT 일반 주행 Space는 500km/h 부스터를 5초 시작한다", () => {
  const driving = { ...readyToDrive(createKtxJourney(3, "srt")), phase: "driving" };
  const result = pressKtxSpace(driving);
  assert.equal(result.state.v, BOOST_SPEED);
  assert.equal(result.state.boostRemainingMs, BOOST_DURATION_MS);
  assert.equal(result.state.boostCooldownMs, 0);
  assert.equal(result.events[0].type, "boost-start");
});

test("부스터 종료 뒤 10초 쿨다운을 모두 기다려야 다시 쓴다", () => {
  let state = pressKtxSpace({
    ...readyToDrive(createKtxJourney(3, "srt")), phase: "driving"
  }).state;
  state = tickKtx(state, {}, BOOST_DURATION_MS).state;
  assert.equal(state.boostRemainingMs, 0);
  assert.equal(state.boostCooldownMs, BOOST_COOLDOWN_MS);
  assert.equal(pressKtxSpace(state).events[0].type, "boost-unavailable");
  state = tickKtx(state, {}, BOOST_COOLDOWN_MS).state;
  assert.equal(state.boostCooldownMs, 0);
  assert.equal(pressKtxSpace(state).events[0].type, "boost-start");
});

test("역 진입과 기존 Space 문맥은 부스터보다 우선한다", () => {
  const base = { ...readyToDrive(createKtxJourney(3, "srt")), phase: "driving" };
  const approach = pressKtxSpace({ ...base, zoneEntered: true });
  assert.notEqual(approach.events[0].type, "boost-start");
  const ktx = pressKtxSpace({
    ...readyToDrive(createKtxJourney(3, "ktx")), phase: "driving"
  });
  assert.equal(ktx.events[0].type, "horn");
});
```

Also add cases for repeated Space not extending active time, malformed counters normalising to zero, a `15,000` ms tick producing ready state, cooldown continuing while stopped, and an active boost cancelling when a tick crosses `ZONE_LENGTH` into approach.

- [ ] **Step 2: Run the model test and verify RED**

Run: `node --test tests/ktx-journey.test.mjs`

Expected: FAIL because the constants and boost state/events do not exist and ordinary SRT Space still emits `horn`.

- [ ] **Step 3: Implement the minimal immutable state machine**

Add exact constants and safe counter normalisation near existing journey constants:

```js
export const BOOST_SPEED = 500;
export const BOOST_DURATION_MS = 5000;
export const BOOST_COOLDOWN_MS = 10000;

function boostCounter(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}
```

Initialise both counters to zero in `createKtxJourney`. In `pressKtxSpace`, before the existing horn branch but after the station-zone guard, activate only SRT and return `boost-unavailable` when either safe counter is positive. Do not alter the current boarding, stopped, branch, early-stop, or precision-stop branches.

At the start of `tickKtx`, advance the boost clock with the supplied `elapsedMs` before any phase-specific return. Consume active time first; when it reaches zero, set cooldown to `BOOST_COOLDOWN_MS` and apply only remaining elapsed time to cooldown. Emit each transition event once. While driving and active, force `v = BOOST_SPEED`; if the tick reaches the zone start, clear active time, start cooldown, emit safety `boost-end`, and run the existing envelope logic before updating the final state.

- [ ] **Step 4: Run model tests and verify GREEN**

Run: `node --test tests/ktx-journey.test.mjs`

Expected: all journey tests PASS, including the existing finite-route, stopping, boarding, horn-for-KTX, and random-input tests.

- [ ] **Step 5: Commit the model**

```bash
git add tests/ktx-journey.test.mjs src/ktx-journey.mjs
git commit -m "feat: model SRT space booster"
```

---

### Task 2: Booster HUD and 500 km/h Presentation

**Files:**
- Modify: `src/ktx-scene.mjs`
- Modify: `styles.css`
- Test: `tests/ktx-realistic-scene.test.mjs`
- Test: `tests/ktx-journey-art.test.mjs`

**Interfaces:**
- Consumes: Task 1 state fields and constants, `renderKtxScene`, `updateKtxScene`, existing `.ktx-hud`, `.ktx-speed-number`, and `--needle-deg`.
- Produces: `.ktx-boost-badge`, root `data-boost="ready|active|cooldown|unavailable"`, readable badge text, capped analogue needle, boost-specific motion intensity.

- [ ] **Step 1: Write failing scene and CSS tests**

Add a real fake-DOM scene test:

```js
test("SRT 부스터 HUD는 준비·작동·충전을 두 뷰에서 같은 상태로 보인다", () => {
  const initial = { ...createKtxJourney(3, "srt"), phase: "driving" };
  const root = renderKtxScene(fakeDocument(), initial, "cab");
  assert.equal(root.querySelector(".ktx-boost-badge").textContent, "BOOST 준비");
  updateKtxScene(root, {
    ...initial, v: 500, boostRemainingMs: 4200, boostCooldownMs: 0
  }, "side");
  assert.equal(root.dataset.boost, "active");
  assert.equal(root.querySelector(".ktx-boost-badge").textContent, "BOOST 5");
  assert.equal(root.querySelector(".ktx-speed-number").textContent, "500");
  assert.equal(root.style["--needle-deg"], "120.0deg");
});
```

In `tests/ktx-journey-art.test.mjs`, assert that `.ktx-boost-badge` has a compact HUD position, `data-boost="active"` has cyan styling, `data-boost="cooldown"` has neutral styling, and `prefers-reduced-motion: reduce` disables its animation.

- [ ] **Step 2: Run focused UI tests and verify RED**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: FAIL because the badge, dataset, capped needle, and boost styles do not exist.

- [ ] **Step 3: Implement the shared HUD and visual state**

Import `MAX_SPEED` in `src/ktx-scene.mjs`. Append one `ktx-boost-badge` to `.ktx-hud` before `.ktx-view-keys`. Add a pure local formatter:

```js
function boostPresentation(state) {
  const active = Math.max(0, Number(state.boostRemainingMs) || 0);
  const cooldown = Math.max(0, Number(state.boostCooldownMs) || 0);
  if (active > 0) return { mode: "active", text: `BOOST ${Math.ceil(active / 1000)}` };
  if (cooldown > 0) return { mode: "cooldown", text: `충전 ${Math.ceil(cooldown / 1000)}` };
  return { mode: state.train.id === "srt" ? "ready" : "unavailable",
    text: state.train.id === "srt" ? "BOOST 준비" : "BOOST 없음" };
}
```

Update `root.dataset.boost` and badge text on every `updateKtxScene` call. Clamp the analogue calculation while leaving the digital number unchanged:

```js
const needleSpeed = Math.min(MAX_SPEED, Math.max(0, state.v));
root.style.setProperty("--needle-deg", `${(needleSpeed * 0.8 - 120).toFixed(1)}deg`);
```

Keep the existing 0–300 motion bands stable. In CSS, place the badge inside the HUD without hiding station chips or view keys; active uses cyan glow and a restrained pulse, cooldown uses slate, and `.ktx-game[data-boost="active"] .ktx-motion-near::after` strengthens the existing speed-line layer. Reduced motion sets badge animation to `none` while preserving its text and colour.

- [ ] **Step 4: Run focused UI tests and verify GREEN**

Run: `node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs`

Expected: all focused scene/style tests PASS in cab and exterior views.

- [ ] **Step 5: Commit the presentation**

```bash
git add tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs src/ktx-scene.mjs styles.css
git commit -m "feat: show SRT booster status"
```

---

### Task 3: App Feedback and Input Contract

**Files:**
- Modify: `src/app-behavior.mjs`
- Modify: `src/app.mjs`
- Test: `tests/app-behavior.test.mjs`

**Interfaces:**
- Consumes: Task 1 model events through `handleKtxEvents`; existing `audio.playSfx`, `showHint`, `moveKtxSpace`, and keydown repeat guard.
- Produces: exported pure `ktxBoosterCue(event)` from `src/app-behavior.mjs`; child-readable boost start/end/ready/cooldown hints with existing sound effects; unchanged repeat-key suppression.

- [ ] **Step 1: Write failing app behavior tests**

Import the wished-for `ktxBoosterCue` and assert real return values rather than searching source text:

```js
test("SRT 부스터 이벤트는 아이가 읽는 효과음과 안내로 바뀐다", () => {
  assert.deepEqual(ktxBoosterCue({ type: "boost-start" }), {
    sfx: "win", hint: "🚄 부스터 출발! 5초 동안 500!"
  });
  assert.deepEqual(ktxBoosterCue({ type: "boost-unavailable", remainingMs: 5200 }), {
    sfx: "key", hint: "충전 중이에요! 6초"
  });
  assert.deepEqual(ktxBoosterCue({ type: "boost-end" }), {
    sfx: "pop", hint: "부스터 끝! 안전 운전해요"
  });
  assert.deepEqual(ktxBoosterCue({ type: "boost-ready" }), {
    sfx: "key", hint: "부스터 준비 완료!"
  });
  assert.equal(ktxBoosterCue({ type: "zone-enter" }), null);
});
```

- [ ] **Step 2: Run app tests and verify RED**

Run: `node --test tests/app-behavior.test.mjs`

Expected: FAIL because `ktxBoosterCue` is not exported.

- [ ] **Step 3: Add minimal event feedback**

Implement the pure mapper in `src/app-behavior.mjs`:

```js
export function ktxBoosterCue(event) {
  if (event.type === "boost-start") {
    return { sfx: "win", hint: "🚄 부스터 출발! 5초 동안 500!" };
  }
  if (event.type === "boost-unavailable") {
    return { sfx: "key",
      hint: `충전 중이에요! ${Math.ceil(event.remainingMs / 1000)}초` };
  }
  if (event.type === "boost-end") {
    return { sfx: "pop", hint: "부스터 끝! 안전 운전해요" };
  }
  if (event.type === "boost-ready") {
    return { sfx: "key", hint: "부스터 준비 완료!" };
  }
  return null;
}
```

Import it in `src/app.mjs`; at the top of each `handleKtxEvents` iteration, map the event and, when non-null, play its existing SFX and show its hint before continuing to the next event. Do not change the document keydown routing: its existing `event.preventDefault()`, `!event.repeat`, and contextual `moveKtxSpace()` call remain the single input path. Task 4 verifies the live wiring in Chromium.

- [ ] **Step 4: Run app tests and verify GREEN**

Run: `node --test tests/app-behavior.test.mjs`

Expected: PASS without changing subway or other game Space handling.

- [ ] **Step 5: Commit app integration**

```bash
git add tests/app-behavior.test.mjs src/app-behavior.mjs src/app.mjs
git commit -m "feat: add SRT booster feedback"
```

---

### Task 4: Regression and Browser Acceptance

**Files:**
- Modify if required by a reproduced failure: `styles.css`, `src/ktx-scene.mjs`, or `src/ktx-journey.mjs`
- Test if required by a reproduced failure: the matching existing test file
- Create local evidence only: `.superpowers/sdd/2026-08-09-srt-space-booster/`

**Interfaces:**
- Consumes: completed Tasks 1–3.
- Produces: green full suite, clean diff, desktop/mobile screenshots, and an evidence report; no product API.

- [ ] **Step 1: Run the full automated suite**

Run: `npm test`

Expected: all tests PASS, including the pre-existing 471 tests plus new booster tests.

- [ ] **Step 2: Run static integrity checks**

Run: `git diff --check && git status --short`

Expected: no whitespace errors and only intentional product/test/plan files.

- [ ] **Step 3: Exercise the real browser flow**

At `1280×720`, enter game 7, choose SRT, complete boarding, start driving, and press Space. Verify the digital speed is 500, badge counts `5…1`, the exterior/cab scenes animate without overflow, approach-zone Space still stops, and console errors are empty. Repeat at the existing mobile landscape viewport; verify the badge does not cover the speedometer, door control, or view buttons.

- [ ] **Step 4: Verify cooldown timing with browser state**

Capture screenshots and computed state at active start, active end, cooldown midpoint, ready state, and station safety cancellation. Record exact `boostRemainingMs`, `boostCooldownMs`, speed, `data-boost`, viewport dimensions, overflow, and console status in `.superpowers/sdd/2026-08-09-srt-space-booster/report.md`.

- [ ] **Step 5: Fix only reproduced acceptance failures with TDD**

For each failure, first add a focused failing assertion to the matching existing test, run it to see the intended RED, apply the minimal product fix, and rerun focused plus full tests. Do not add unrequested controls, assets, scoring, or route changes.

- [ ] **Step 6: Commit final verified corrections**

If tracked corrections were needed:

```bash
git add -- src/ktx-journey.mjs src/ktx-scene.mjs src/app-behavior.mjs src/app.mjs styles.css tests/ktx-journey.test.mjs tests/ktx-realistic-scene.test.mjs tests/ktx-journey-art.test.mjs tests/app-behavior.test.mjs
git commit -m "fix: verify SRT booster experience"
```

If no tracked correction was needed, do not create an empty commit.
