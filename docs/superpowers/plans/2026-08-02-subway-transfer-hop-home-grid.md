# Subway Transfer Hop and Ten-Game Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Require the gap-timing hop before entering a transfer corridor, keep destination arrival music only at the final stop, and reshape the home screen for ten short game cards without global number-key shortcuts.

**Architecture:** Extend the existing `arriving` model state with a `kind` discriminator so destination and transfer alighting share one timing engine and one scene. Keep audio branching in `src/app.mjs`, where transfer alighting plays only the gap warning and destination alighting keeps the arrival melody. Treat the home redesign as a semantic-input task followed by an isolated responsive-layout task.

**Tech Stack:** HTML, CSS Grid, vanilla JavaScript ES modules, Node.js test runner, Playwright browser tests.

## Global Constraints

- Final-destination flow remains `melody → hop → arrived`.
- Transfer flow becomes `hop → corridor`; no arrival melody or celebration music plays on the transfer-hop screen.
- The fourth hop attempt always succeeds; reduced-motion assist succeeds immediately; misses never deduct stars.
- Ordinary wrong-stop alighting remains blocked.
- PC home uses five columns and fills cards 1–10 in two rows; current cards 1–7 use the first seven cells.
- Mobile home uses two columns; only the final odd card spans both columns.
- Remove only home game/difficulty number shortcuts. Subway destination/line digits and arithmetic answer digits remain unchanged.
- Add no games 8–10 and no new audio assets.

---

### Task 1: Gate transfer corridors behind the shared hop model

**Files:**
- Modify: `src/subway-journey.mjs`
- Test: `tests/subway-journey.test.mjs`

**Interfaces:**
- Consumes: `buildRoom("corridor", options)`, `hopInWindow(phaseMs)`, `subwayCompass(state)`.
- Produces: `state.arriving.kind: "destination" | "transfer"`; an `arriving` event with matching `kind`; a successful transfer hop returning event `transfer-start` and phase `corridor`.

- [ ] **Step 1: Replace the direct-transfer test with a failing staged-hop test**

Add a helper that drives to the first planned transfer and assert:

```js
const requested = attemptSubwayMove(state, "space");
assert.equal(requested.event.type, "arriving");
assert.equal(requested.event.kind, "transfer");
assert.equal(requested.state.phase, "arriving");
assert.deepEqual(
  [requested.state.arriving.kind, requested.state.arriving.stage],
  ["transfer", "hop"]
);
assert.equal(requested.state.room.kind, "train");

const landed = attemptSubwayMove(
  advanceSubwayWorld(requested.state, HOP_PERIOD_MS / 4),
  "space"
);
assert.equal(landed.event.type, "transfer-start");
assert.equal(landed.state.phase, "corridor");
assert.equal(landed.state.room.kind, "corridor");
```

Also assert an off-window press stays in `arriving` and increments `misses` without creating a corridor.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test --test-name-pattern="환승역" tests/subway-journey.test.mjs`

Expected: FAIL because the current model returns `transfer-start` and `corridor` immediately.

- [ ] **Step 3: Start both alighting paths in a discriminated `arriving` state**

Change `alightHere(state)` so destination returns:

```js
arriving: {
  kind: "destination",
  stage: "melody",
  phaseMs: 0,
  misses: 0
}
```

and a valid transfer returns:

```js
state: {
  ...state,
  phase: "arriving",
  arriving: {
    kind: "transfer",
    stage: "hop",
    phaseMs: 0,
    misses: 0,
    offPlan
  }
},
event: { type: "arriving", kind: "transfer", station: state.station }
```

The destination event must include `kind: "destination"`.

- [ ] **Step 4: Route a successful hop by `arriving.kind`**

In the successful branch of `attemptSubwayMove`, keep the existing destination result. For `kind === "transfer"`, build the corridor with the same parameters formerly used in `alightHere`, increment `moveCount`, preserve `showRecommended`, clear `arriving`, and return:

```js
event: {
  type: "transfer-start",
  station: state.station,
  offPlan: Boolean(state.arriving.offPlan),
  fromHop: true
}
```

- [ ] **Step 5: Keep destination and assistance behavior covered**

Extend the destination test to assert `arriving.kind === "destination"`. Add a transfer case to the fourth-attempt and `assist: true` test so both kinds use the same pity rule.

- [ ] **Step 6: Run model tests to verify GREEN**

Run: `node --test tests/subway-journey.test.mjs`

Expected: all subway journey tests pass.

- [ ] **Step 7: Commit the model change**

```bash
git add src/subway-journey.mjs tests/subway-journey.test.mjs
git commit -m "feat: require hop before subway transfers"
```

---

### Task 2: Render and sound the transfer-hop variant

**Files:**
- Modify: `src/subway-scene.mjs`
- Modify: `src/app.mjs`
- Modify: `src/app-behavior.mjs`
- Test: `tests/subway-scene.test.mjs`
- Test: `tests/app-behavior.test.mjs`

**Interfaces:**
- Consumes: `state.arriving.kind`, `event.kind`, `playSubwayReal(key, fallback, nextKey)`.
- Produces: `data-kind` on `.subway-arriving`; transfer station sign and instruction copy; `subwayArrivingCue(kind, travelSide)` returning the exact real-audio key, fallback, next key, SFX, and hint for the app.

- [ ] **Step 1: Write failing transfer-scene assertions**

Create an arriving state with:

```js
arriving: { kind: "transfer", stage: "hop", phaseMs: 0, misses: 0 }
```

Assert:

```js
assert.equal(byClass(scene, "subway-arriving")[0].dataset.kind, "transfer");
assert.equal(byClass(scene, "subway-arriving-door")[0].dataset.open, "true");
assert.equal(byClass(scene, "subway-hop-meter")[0].dataset.active, "true");
assert.match(byClass(scene, "subway-station-sign")[0].textContent, /· 환승$/);
assert.doesNotMatch(byClass(scene, "subway-arriving-note")[0].textContent, /멜로디/);
```

- [ ] **Step 2: Write a failing audio-plan behavior test**

In `tests/app-behavior.test.mjs`, import `subwayArrivingCue` and assert hand-derived results:

```js
assert.deepEqual(subwayArrivingCue("transfer", "forward"), {
  realKey: "mind-gap",
  fallback: "subway-mind-gap",
  nextKey: null,
  sfx: "door",
  hint: "환승역이에요! 빨간 표시가 노란 칸에 올 때 ⎵!"
});
assert.deepEqual(subwayArrivingCue("destination", "back"), {
  realKey: "arrive-melody-up",
  fallback: null,
  nextKey: "mind-gap",
  sfx: "win",
  hint: "도착 멜로디가 나와요! 곧 문이 열려요"
});
```

The transfer literal proves no arrival melody or chained music is selected.

- [ ] **Step 3: Run focused scene and contract tests to verify RED**

Run: `node --test tests/subway-scene.test.mjs tests/app-behavior.test.mjs`

Expected: FAIL because the scene has no `data-kind` and `subwayArrivingCue` does not exist.

- [ ] **Step 4: Add the transfer variant to `renderArrivingPhase`**

Set `room.dataset.kind`, append ` · 환승` to the station sign for transfer, start with the existing opened-door and active-meter state, and use the concise instruction:

```text
빨간 표시가 노란 칸에 올 때 ⎵! 폴짝 뛰어 내려요
```

Leave destination copy and melody stage unchanged.

- [ ] **Step 5: Implement and consume the alighting audio plan**

Export `subwayArrivingCue(kind, travelSide)` from `src/app-behavior.mjs` using the two literal plans from Step 2. In the app's `arriving` event, consume the returned plan:

```js
const cue = subwayArrivingCue(event.kind, state.subway.travelSide);
state.subwayDoorCue = event.kind === "transfer";
playSubwayReal(cue.realKey, cue.fallback, cue.nextKey);
audio.playSfx(cue.sfx);
showHint(cue.hint);
```

Do not call `audio.playSfx("win")` or an arrival melody in this branch. Keep the existing destination branch unchanged. Let the post-hop `transfer-start` event switch to the corridor and play its existing transfer guidance only after success.

- [ ] **Step 6: Run focused tests to verify GREEN**

Run: `node --test tests/subway-scene.test.mjs tests/app-behavior.test.mjs`

Expected: all focused tests pass.

- [ ] **Step 7: Commit scene and audio behavior**

```bash
git add src/subway-scene.mjs src/app.mjs src/app-behavior.mjs tests/subway-scene.test.mjs tests/app-behavior.test.mjs
git commit -m "feat: add quiet subway transfer hop"
```

---

### Task 3: Remove global home number-key selection

**Files:**
- Modify: `index.html`
- Modify: `src/app.mjs`
- Modify: `tests/app-contract.test.mjs`
- Test: `tests/mobile-games-browser-layout.test.mjs`

**Interfaces:**
- Consumes: native button click, Enter, and Space behavior.
- Produces: home cards and difficulty buttons with no `aria-keyshortcuts` or visible numeric keycaps; preserved digit handling inside games.

- [ ] **Step 1: Write failing browser behavior for home keys and controls**

At 390×844, focus the page and press `1`, `7`, `8`, and `9`. Assert `body.dataset.state` remains `home` and the selected difficulty remains unchanged. Then click the first card and assert the game opens; reload, click `도전`, and assert it becomes selected. Inspect the rendered DOM:

```js
assert.equal(await page.locator(".lead").count(), 0);
assert.equal(await page.locator(".keyboard-note").count(), 0);
assert.equal(await page.locator(".mode-card[aria-keyshortcuts]").count(), 0);
assert.equal(await page.locator(".difficulty-button kbd").count(), 0);
```

Keep the existing app contract assertions that prove subway destination/line digits and arithmetic `onDigit(digit)` remain wired.

- [ ] **Step 2: Run the contract test to verify RED**

Run: `node --test --test-name-pattern="홈 숫자키" tests/mobile-games-browser-layout.test.mjs`

Expected: FAIL because digit presses still open games or change difficulty and shortcut markup remains.

- [ ] **Step 3: Remove shortcut markup and update neutral copy**

In `index.html`:

- Replace `키보드로 만나는 작은 숫자 친구들` with `숫자 친구들과 만나는 즐거운 놀이터`.
- Delete the `.lead` paragraph.
- Remove every home `aria-keyshortcuts` attribute.
- Remove difficulty `<kbd>` children.
- Delete `.keyboard-note`.
- Keep `.card-number` spans as visible ordering badges.

- [ ] **Step 4: Remove only the home digit maps**

Delete the `if (state.phase === "home")` digit branch that maps 7–9 to difficulty and 1–6 to modes. Leave arrow-key focus navigation, subway digit selection, subway gate line selection, and playing-mode arithmetic digits unchanged.

- [ ] **Step 5: Run the contract test to verify GREEN**

Run: `node --test tests/app-contract.test.mjs tests/mobile-games-browser-layout.test.mjs`

Expected: all app contract tests pass.

- [ ] **Step 6: Commit semantic input cleanup**

```bash
git add index.html src/app.mjs tests/app-contract.test.mjs
git commit -m "feat: remove home number key shortcuts"
```

---

### Task 4: Fit seven current and ten future cards into the home layout

**Files:**
- Modify: `styles.css`
- Modify: `mobile-games.css`
- Test: `tests/mobile-games-browser-layout.test.mjs`

**Interfaces:**
- Consumes: `.mode-grid`, `.mode-card`, `.mode-card:last-child:nth-child(odd)`.
- Produces: five desktop columns with shorter cards; two mobile columns with only the final odd card spanning.

- [ ] **Step 1: Add failing desktop browser metrics**

At 1366×768 and 1920×1080, collect every current card rectangle and assert:

```js
assert.equal(metrics.columns, 5);
assert.equal(metrics.horizontalOverflow, false);
assert.ok(metrics.maximumCardHeight <= metrics.viewportHeight * 0.34);
assert.ok(
  metrics.cards.every(
    rect => rect.left >= 0 && rect.right <= metrics.viewportWidth
  )
);
assert.ok(metrics.secondRowTop > metrics.firstRowTop);
```

Also verify the first row contains five cards by comparing `top` values.

- [ ] **Step 2: Rewrite the failing mobile home test**

At 390×844, assert two columns, equal widths for cards 1–6, card 7 at least 1.8 times card 1, and no horizontal overflow. Remove the old assertion that card 5 spans.

- [ ] **Step 3: Run browser tests to verify RED**

Run: `node --test --test-name-pattern="홈" tests/mobile-games-browser-layout.test.mjs`

Expected: FAIL because desktop has six columns and mobile card 5 spans.

- [ ] **Step 4: Implement the desktop 5×2 grid**

In the final desktop override in `styles.css`, use:

```css
.mode-grid {
  grid-template-columns: repeat(5, minmax(0, 220px));
  justify-content: center;
  gap: clamp(12px, 1.6vw, 24px);
  width: min(96vw, 1180px);
}

.mode-card {
  min-height: clamp(210px, 29vh, 285px);
  padding: 13px 14px 16px;
}

.mode-card img {
  height: clamp(112px, 17vh, 165px);
}
```

Use a compact `#home` gap and padding so 1366×768 remains within one viewport. Keep individual card colors and subtle transforms.

- [ ] **Step 5: Replace mobile card-5 specialization with final-odd specialization**

In `mobile-games.css`, remove the three `nth-child(5)` layout rules. Add:

```css
body[data-state="home"] .mode-card:last-child:nth-child(odd) {
  grid-column: 1 / -1;
  grid-template-columns: minmax(100px, .8fr) minmax(0, 1.2fr);
  grid-template-rows: 1fr;
  min-height: 160px;
}
```

Apply the matching centered image and copy rules to that selector. Keep all other cards uniform in two columns.

- [ ] **Step 6: Run browser tests to verify GREEN**

Run: `node --test tests/mobile-games-browser-layout.test.mjs`

Expected: every portrait, compact portrait, landscape, safety, and math layout test passes.

- [ ] **Step 7: Commit responsive home layout**

```bash
git add styles.css mobile-games.css tests/mobile-games-browser-layout.test.mjs
git commit -m "feat: fit ten short cards on the home screen"
```

---

### Task 5: Verify the integrated branch and capture review evidence

**Files:**
- Modify only if verification exposes a regression.
- Verify: all `tests/*.test.mjs`

**Interfaces:**
- Consumes: all earlier tasks.
- Produces: a clean branch with fresh automated and visual evidence ready for a pull request.

- [ ] **Step 1: Run focused subway tests together**

Run: `node --test tests/subway-journey.test.mjs tests/subway-scene.test.mjs tests/app-contract.test.mjs`

Expected: all focused tests pass, including transfer hop and destination melody contracts.

- [ ] **Step 2: Run the complete test suite**

Run: `npm test`

Expected: zero failures.

- [ ] **Step 3: Capture and inspect home screenshots**

Capture 1366×768, 1920×1080, 390×844, and 360×640. Confirm five desktop columns, two mobile columns, no clipping, readable titles, full characters, and no numeric shortcut row.

- [ ] **Step 4: Capture and inspect both alighting variants**

Capture one final-destination `melody` frame, one final-destination `hop` frame, and one transfer `hop` frame. Confirm transfer is labeled `· 환승`, has an active meter immediately, and shows no melody copy.

- [ ] **Step 5: Check repository hygiene**

Run: `git diff --check`

Run: `git status --short --branch`

Expected: no whitespace errors and no uncommitted tracked changes.

- [ ] **Step 6: Commit any verification-only correction**

If a correction was required, stage only its exact files and commit:

```bash
git commit -m "fix: polish transfer hop and home grid"
```

If no correction was required, create no empty commit.
