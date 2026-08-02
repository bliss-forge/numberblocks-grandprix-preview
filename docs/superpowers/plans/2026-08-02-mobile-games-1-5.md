# Mobile Games 1–5 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the home screen and games 1–5 easy to play on portrait phones while leaving desktop behavior and the Number 6 subway game unchanged.

**Architecture:** Add one cascade-layer stylesheet, `mobile-games.css`, after the existing stylesheet. It contains only `max-width: 640px` rules scoped to home or modes `count`, `add`, `sub`, `mul`, and `safety`; existing JavaScript and models remain untouched. Static contracts protect scope and layout tokens, while a Playwright geometry test proves that the visible controls fit real mobile viewports.

**Tech Stack:** Static HTML, CSS media queries and dynamic viewport units, Node.js built-in test runner, optional globally installed Playwright.

## Global Constraints

- Primary viewport: `390×844`.
- Supported portrait range: `360×640` through `430×932`.
- Home may scroll vertically but must never scroll horizontally.
- Games 1–5 stay inside one portrait viewport.
- Touch targets are at least `48×48px` at `390×844` and at least `44×44px` at `360×640`.
- Preserve math generation, answer evaluation, difficulty, score, audio, character assets, and 1–150 character scaling.
- Preserve safety-route movement, camera, traffic, obstacle, bus, SRT, and guidance logic.
- Do not target `body[data-mode="subway"]` or modify Number 6 game files.
- Keep desktop rules unchanged.

---

### Task 1: Add an isolated mobile stylesheet contract

**Files:**
- Create: `mobile-games.css`
- Modify: `index.html:9-11`
- Modify: `tests/app-contract.test.mjs:5-16`

**Interfaces:**
- Consumes: the existing `styles.css` cascade and body `data-state`/`data-mode` attributes.
- Produces: a final stylesheet layer loaded from `mobile-games.css?v=20260802-games-1-5`.

- [ ] **Step 1: Write the failing shell contract**

Extend the static shell test with an exact link-order check:

```js
test("1~5 모바일 보정 스타일은 기본 스타일 뒤에 로드된다", () => {
  const baseIndex = html.indexOf('href="styles.css?v=20260726-pc-route-visual"');
  const mobileIndex = html.indexOf(
    'href="mobile-games.css?v=20260802-games-1-5"'
  );

  assert.ok(baseIndex >= 0);
  assert.ok(mobileIndex > baseIndex);
});
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `node --test tests/app-contract.test.mjs`

Expected: FAIL because `mobile-games.css?v=20260802-games-1-5` is not loaded.

- [ ] **Step 3: Add the stylesheet link and scoped file header**

Add after the existing stylesheet:

```html
<link rel="stylesheet" href="mobile-games.css?v=20260802-games-1-5">
```

Create the stylesheet with an explicit scope comment and empty mobile query:

```css
/* Portrait-phone presentation for home and games 1–5 only. */
@media (max-width: 640px) {
}
```

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `node --test tests/app-contract.test.mjs`

Expected: all app-contract tests pass.

- [ ] **Step 5: Commit the isolated stylesheet shell**

```bash
git add index.html mobile-games.css tests/app-contract.test.mjs
git commit -m "feat: isolate mobile styles for games 1-5"
```

---

### Task 2: Make the mobile home a readable two-column document

**Files:**
- Create: `tests/mobile-games-styles.test.mjs`
- Modify: `mobile-games.css`

**Interfaces:**
- Consumes: `#home`, `.mode-grid`, `.mode-card`, `.difficulty-picker`, and `.creator-credit` from the existing shell.
- Produces: two-column cards 1–4, a full-width card 5, vertical document scrolling, and zero horizontal overflow.

- [ ] **Step 1: Write the failing home-style contracts**

Create `tests/mobile-games-styles.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(
  new URL("../mobile-games.css", import.meta.url),
  "utf8"
);

test("모바일 홈은 세로 문서와 두 열 카드로 구성된다", () => {
  assert.match(css, /body\[data-state="home"\]\s*\{[^}]*overflow-x:\s*clip;[^}]*overflow-y:\s*auto;/s);
  assert.match(css, /body\[data-state="home"\]\s+#home\s*\{[^}]*min-height:\s*100dvh;[^}]*height:\s*auto;/s);
  assert.match(css, /body\[data-state="home"\]\s+\.mode-grid\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(css, /body\[data-state="home"\]\s+\.mode-card:nth-child\(5\)\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
});

test("홈 카드와 제작자 표시는 모바일 문서 안에 머문다", () => {
  assert.match(css, /body\[data-state="home"\]\s+\.mode-card\s*\{[^}]*min-width:\s*0;[^}]*transform:\s*none;/s);
  assert.match(css, /body\[data-state="home"\]\s+\.creator-credit\s*\{[^}]*position:\s*relative;/s);
});
```

- [ ] **Step 2: Run the style test to verify RED**

Run: `node --test tests/mobile-games-styles.test.mjs`

Expected: FAIL because the home rules do not exist.

- [ ] **Step 3: Implement the mobile home rules**

Inside `@media (max-width: 640px)` add:

```css
body[data-state="home"] {
  min-height: 100vh;
  min-height: 100dvh;
  overflow-x: clip;
  overflow-y: auto;
}

body[data-state="home"] #home {
  height: auto;
  min-height: 100dvh;
  padding: max(72px, env(safe-area-inset-top)) 12px
    max(20px, env(safe-area-inset-bottom));
  gap: 14px;
}

body[data-state="home"] .mode-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
}

body[data-state="home"] .mode-card {
  min-width: 0;
  min-height: clamp(190px, 54vw, 230px);
  transform: none;
}

body[data-state="home"] .mode-card:nth-child(5) {
  grid-column: 1 / -1;
  min-height: 170px;
}

body[data-state="home"] .creator-credit {
  position: relative;
  right: auto;
  bottom: auto;
  justify-self: center;
}
```

Also compact the logo, lead, difficulty picker, card images, and copy with `clamp()` values while keeping titles inside each card. Do not hide a game card.

- [ ] **Step 4: Run the style and existing responsive tests**

Run: `node --test tests/mobile-games-styles.test.mjs tests/responsive-layout.test.mjs tests/task-5-browser-regression.test.mjs`

Expected: all tests pass. If an old test requires three mobile columns, update that assertion to two columns and retain its no-desktop-min-width assertion.

- [ ] **Step 5: Commit the mobile home**

```bash
git add mobile-games.css tests/mobile-games-styles.test.mjs tests/task-5-browser-regression.test.mjs
git commit -m "feat: fit home cards on portrait phones"
```

---

### Task 3: Keep the complete math interaction visible

**Files:**
- Modify: `tests/mobile-games-styles.test.mjs`
- Modify: `mobile-games.css`

**Interfaces:**
- Consumes: `#game`, `.problem-pill`, `.stage-frame`, `.stage`, `.answer-dock`, `.number-pad`, and existing math scene classes.
- Produces: one-viewport layouts for `count`, `add`, `sub`, and `mul` with a three-column keypad.

- [ ] **Step 1: Write the failing math-shell contracts**

Append:

```js
test("1~4 수학 게임은 한 화면에 무대와 숫자판을 유지한다", () => {
  assert.match(css, /body:is\(\[data-mode="count"\],\s*\[data-mode="add"\],\s*\[data-mode="sub"\],\s*\[data-mode="mul"\]\)\s+#game\s*\{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /body:is\([^)]*data-mode="mul"[^)]*\)\s+\.number-pad\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\);/s);
  assert.match(css, /body:is\([^)]*data-mode="mul"[^)]*\)\s+\.number-pad button\s*\{[^}]*min-height:\s*48px;/s);
  assert.match(css, /body:is\([^)]*data-mode="mul"[^)]*\)\s+\.number-pad \[data-digit="0"\]\s*\{[^}]*grid-column:\s*2\s*\/\s*4;/s);
});

test("작은 휴대전화도 44px 조작 목표를 보장한다", () => {
  assert.match(css, /@media\s*\(max-width:\s*380px\),\s*\(max-height:\s*700px\)[\s\S]*?\.number-pad button\s*\{[^}]*min-height:\s*44px;/s);
});
```

- [ ] **Step 2: Run the style test to verify RED**

Run: `node --test tests/mobile-games-styles.test.mjs`

Expected: FAIL on the missing math shell and keypad rules.

- [ ] **Step 3: Implement the scoped math shell**

Use the exact shared selector:

```css
body:is(
  [data-mode="count"],
  [data-mode="add"],
  [data-mode="sub"],
  [data-mode="mul"]
) #game {
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: 6px;
  padding: max(62px, env(safe-area-inset-top)) 8px
    max(8px, env(safe-area-inset-bottom));
  overflow: hidden;
}
```

For the same selector group:

- hide `.game-keyboard-note` so the four declared rows match the DOM;
- keep `.stage-frame`, `.stage`, `.operand-scene`, `.count-friends`, and `.celebration-result` at `min-height: 0`;
- cap the problem prompt at two lines;
- keep the answer dock compact and visible;
- render `.number-pad` as a three-column grid with `48px` minimum buttons;
- set `.number-pad [data-digit="0"] { grid-column: 2 / 4; }`;
- retain existing character scale custom properties and use only container `max-width`/`max-height` limits.

Add the compact minimum-device rule:

```css
@media (max-width: 380px), (max-height: 700px) {
  body:is(
    [data-mode="count"],
    [data-mode="add"],
    [data-mode="sub"],
    [data-mode="mul"]
  ) .number-pad button {
    min-height: 44px;
  }
}
```

- [ ] **Step 4: Run the focused math and responsive tests**

Run: `node --test tests/mobile-games-styles.test.mjs tests/responsive-layout.test.mjs tests/problem-scene.test.mjs tests/app-behavior.test.mjs`

Expected: all tests pass without changing JavaScript or character scaling.

- [ ] **Step 5: Commit the math mobile shell**

```bash
git add mobile-games.css tests/mobile-games-styles.test.mjs
git commit -m "feat: keep math controls visible on phones"
```

---

### Task 4: Refine the safety-route viewport and thumb controls

**Files:**
- Modify: `tests/mobile-games-styles.test.mjs`
- Modify: `mobile-games.css`

**Interfaces:**
- Consumes: the existing `.safety-route`, `.safety-route-top`, `.safety-viewport`, `.route-minimap`, and `.route-pad` DOM.
- Produces: a one-viewport safety layout with a safe-area-aware lower-right direction pad.

- [ ] **Step 1: Write the failing safety contracts and Number 6 guard**

Append:

```js
test("5번 길찾기는 지도 안에 안전한 방향키를 둔다", () => {
  assert.match(css, /body\[data-mode="safety"\]\s+#game\s*\{[^}]*height:\s*100dvh;[^}]*overflow:\s*hidden;/s);
  assert.match(css, /body\[data-mode="safety"\]\s+\.route-pad\s*\{[^}]*right:\s*max\(8px,\s*env\(safe-area-inset-right\)\);[^}]*bottom:\s*max\(8px,\s*env\(safe-area-inset-bottom\)\);/s);
  assert.match(css, /body\[data-mode="safety"\]\s+\.route-pad button\s*\{[^}]*min-width:\s*48px;[^}]*min-height:\s*48px;/s);
});

test("6번 지하철 게임은 전용 모바일 보정 대상이 아니다", () => {
  assert.doesNotMatch(css, /data-mode="subway"/);
});
```

- [ ] **Step 2: Run the style test to verify RED**

Run: `node --test tests/mobile-games-styles.test.mjs`

Expected: FAIL on the missing safety layout; the Number 6 guard already passes.

- [ ] **Step 3: Implement the safety layout**

Add only `data-mode="safety"` rules:

```css
body[data-mode="safety"] #game {
  height: 100vh;
  height: 100svh;
  height: 100dvh;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  padding: max(62px, env(safe-area-inset-top)) 5px 5px;
  overflow: hidden;
}

body[data-mode="safety"] .route-pad {
  right: max(8px, env(safe-area-inset-right));
  bottom: max(8px, env(safe-area-inset-bottom));
  opacity: .94;
}

body[data-mode="safety"] .route-pad button {
  min-width: 48px;
  min-height: 48px;
}
```

Compact `.safety-route-top`, keep `.safety-viewport` at `min-height: 0`, and move `.route-minimap` away from the pad. At the minimum-device query reduce direction buttons to exactly `44px`, never smaller. Do not change camera width/height custom properties or route cell calculations beyond using dynamic viewport height.

- [ ] **Step 4: Run safety-focused tests**

Run: `node --test tests/mobile-games-styles.test.mjs tests/safety-route-browser-layout.test.mjs tests/safety-route-styles.test.mjs tests/safety-route-camera.test.mjs`

Expected: all tests pass, including the existing `5×5` mobile camera and `48px` direction-button assertions.

- [ ] **Step 5: Commit the safety mobile shell**

```bash
git add mobile-games.css tests/mobile-games-styles.test.mjs
git commit -m "feat: improve safety route phone controls"
```

---

### Task 5: Prove geometry across the mobile matrix

**Files:**
- Create: `tests/mobile-games-browser-layout.test.mjs`
- Verify: `index.html`
- Verify: `mobile-games.css`

**Interfaces:**
- Consumes: the completed mobile stylesheet and existing mode buttons.
- Produces: browser-level proof that home and games 1–5 fit supported portrait viewports.

- [ ] **Step 1: Add reusable Playwright test helpers**

Copy the static-server and global-Playwright loading pattern from `tests/safety-route-browser-layout.test.mjs`. Add geometry helpers:

```js
function contained(rect, viewport) {
  return rect.left >= -0.5 && rect.right <= viewport.width + 0.5 &&
    rect.top >= -0.5 && rect.bottom <= viewport.height + 0.5;
}

function separated(upper, lower) {
  return upper.bottom <= lower.top + 0.5;
}
```

- [ ] **Step 2: Write the mobile matrix browser test**

For each viewport `360×640`, `390×844`, and `430×932`:

1. Open home and assert `scrollWidth <= innerWidth`.
2. Assert cards 1–5 are within the document width and card 5 is wider than card 1.
3. Open a fresh page for each mode `count`, `add`, `sub`, and `mul`.
4. Assert the problem, stage, answer dock, and keypad are contained and vertically separated.
5. Assert every keypad button is at least `48px`, except `44px` is allowed at `360×640`.
6. Open safety and assert the map, route pad, and all direction buttons are contained.
7. Collect `console.error` and `pageerror` and require empty arrays.

Use the existing skip behavior when Playwright is not installed globally.

- [ ] **Step 3: Run the browser test and fix CSS-only geometry failures**

Run: `node --test tests/mobile-games-browser-layout.test.mjs`

Expected: PASS at all three portrait viewports. Fix only `mobile-games.css`; do not weaken containment or touch-size assertions.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`

Expected: all tests pass with zero failures, including Number 6 subway and desktop safety tests.

- [ ] **Step 5: Capture visual QA evidence**

Use Playwright to save home and modes 1–5 at `390×844`, plus home, one math mode, and safety at `360×640` and `430×932`. Save screenshots under the ignored `.gstack/qa-reports/screenshots/mobile-games-1-5/` directory. Inspect every screenshot for text clipping, overlaps, missing images, and unsafe control placement.

- [ ] **Step 6: Check formatting and repository state**

Run: `git diff --check && git status --short --branch`

Expected: no whitespace errors and only the expected feature branch state.

- [ ] **Step 7: Commit browser verification**

```bash
git add tests/mobile-games-browser-layout.test.mjs
git commit -m "test: verify mobile games across phone sizes"
```

---

### Task 6: Prepare a conflict-safe handoff

**Files:**
- Verify: all changed files
- Verify: `docs/superpowers/specs/2026-08-02-mobile-games-1-5-design.md`

**Interfaces:**
- Consumes: all implementation commits and the latest Claude-integrated `origin/main`.
- Produces: a reviewed feature branch ready for explicit merge approval.

- [ ] **Step 1: Fetch and inspect concurrent changes**

Run: `git fetch origin main && git log --oneline --left-right HEAD...origin/main`

Expected: any new Claude commits are visible before handoff.

- [ ] **Step 2: Rebase only if `origin/main` advanced**

Run when needed: `git rebase origin/main`

Expected: the dedicated stylesheet minimizes conflicts. Resolve only the stylesheet link or test expectations if necessary; do not overwrite Claude changes.

- [ ] **Step 3: Re-run complete verification after integration**

Run: `npm test && git diff --check && git status --short --branch`

Expected: zero test failures, clean diff check, and no uncommitted tracked changes.

- [ ] **Step 4: Report without merging or pushing**

Provide the branch name, commit list, test count, screenshot paths, and any residual mobile limitations. Merging, remote pushing, and Pages deployment require a separate explicit user request.
