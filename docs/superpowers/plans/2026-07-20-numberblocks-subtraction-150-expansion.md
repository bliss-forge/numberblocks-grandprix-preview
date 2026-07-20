# Numberblocks Subtraction and 150 Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add mobile numeric input, subtraction, count decomposition with character friends, and connected character/audio coverage through 150.

**Architecture:** Keep problem rules and buffer transforms pure in `game-model.mjs`, keep reusable visual composition in `problem-scene.mjs`, and let `app.mjs` only bind DOM events and state transitions. Extend the existing procedural SVG/PNG character pipeline and Edge TTS voice generator rather than introducing a second asset system.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js `node:test`, SVG rendered through macOS `sips`, Python `edge-tts`, Playwright browser QA.

## Global Constraints

- Games use keys `1=count`, `2=add`, `3=sub`, `4=mul`.
- Difficulties use keys `7=easy`, `8=steady`, `9=challenge`; old `4/5/6` difficulty shortcuts are removed.
- Count limits remain 10/20/unavailable, and 11–19 render as `10 + remainder` characters while 20 renders as `10 + 10`.
- Addition limits are 10/50/150; subtraction limits are 10/20/50 with positive answers only.
- Challenge multiplication uses one factor from 1–10 and the other from 1–15, with answers through 150.
- Character display scale bands are 1–50 baseline, 51–100 approximately 1.1×, and 101–150 approximately 1.2×, clamped on mobile and operand scenes.
- Existing 1–100 character files, audio behavior, physical-keyboard input, and flat connected visual style remain intact.
- Every production change follows RED → GREEN → full regression test → commit.

---

### Task 1: Problem Rules, Subtraction, and Buffer Editing

**Files:**
- Modify: `src/game-model.mjs`
- Modify: `tests/game-model.test.mjs`

**Interfaces:**
- Produces: `DIFFICULTY_LIMITS[difficulty].sub: number`
- Produces: `createProblem("sub", difficulty, rng, recentKeys): Problem`
- Produces: `deleteLastDigit(buffer: string): string`
- Consumes later: `app.mjs` calls `deleteLastDigit`; scene code consumes subtraction problems.

- [ ] **Step 1: Write failing range and input tests**

Add tests that assert:

```js
assert.equal(createProblem("add", "challenge", () => 0.9999999).answer, 150);

for (const [difficulty, max] of [["easy", 10], ["steady", 20], ["challenge", 50]]) {
  for (const rng of [() => 0, () => .41, () => .999999]) {
    const problem = createProblem("sub", difficulty, rng);
    assert.equal(problem.mode, "sub");
    assert.ok(problem.operands[0] > problem.operands[1]);
    assert.equal(problem.answer, problem.operands[0] - problem.operands[1]);
    assert.ok(problem.operands[0] <= max);
    assert.ok(problem.answer >= 1 && problem.answer <= max);
    assert.equal(problem.promptKey, "prompt-sub");
  }
}

assert.deepEqual(
  createProblem("mul", "challenge", () => .9999999).operands,
  [10, 15]
);
assert.equal(createProblem("mul", "challenge", () => .9999999).answer, 150);
assert.equal(deleteLastDigit("150"), "15");
assert.equal(deleteLastDigit("1"), "");
assert.equal(deleteLastDigit(""), "");
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `node --test tests/game-model.test.mjs`

Expected: FAIL because `sub`, the 150 limits, challenge factor 15, and `deleteLastDigit` do not exist.

- [ ] **Step 3: Implement the minimal rules**

Change the limits to:

```js
easy: Object.freeze({ count: 10, add: 10, sub: 10, mul: 10 }),
steady: Object.freeze({ count: 20, add: 50, sub: 20, mul: 50 }),
challenge: Object.freeze({ count: null, add: 150, sub: 50, mul: 150 })
```

Add `subtractionProblems(maxAnswer)`, generating `right` from 1 through `left - 1`, and returning `{ mode: "sub", answer: left - right, characters: [left, right], operands: [left, right], promptKey: "prompt-sub" }`. Extend `multiplicationProblems` with `rightMax`, passing 15 only for challenge. Export:

```js
export function deleteLastDigit(buffer) {
  return String(buffer).slice(0, -1);
}
```

Keep `problemKey` order-sensitive for subtraction:

```js
if (problem.mode === "sub") return `sub:${left}:${right}`;
```

- [ ] **Step 4: Verify GREEN and regressions**

Run: `node --test tests/game-model.test.mjs`

Expected: all game-model tests PASS.

Run: `node --test tests/*.test.mjs`

Expected: all existing tests plus the new game-model tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/game-model.mjs tests/game-model.test.mjs
git commit -m "feat: 뺄셈과 150 문제 범위 추가"
```

---

### Task 2: Subtraction and Count Character Scenes

**Files:**
- Modify: `src/problem-scene.mjs`
- Modify: `src/app-behavior.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/problem-scene.test.mjs`
- Modify: `tests/app-behavior.test.mjs`

**Interfaces:**
- Produces: `operatorFor(mode: "add" | "sub" | "mul"): "+" | "−" | "×"`
- Produces: `countCharacterValues(answer: number): number[]`
- Consumes: `operandScene(document, problem, createCharacter)` and existing `character(number)`.

- [ ] **Step 1: Write failing scene tests**

Add:

```js
assert.equal(equationText({ mode: "sub", operands: [38, 6] }), "38 − 6");
assert.deepEqual(countCharacterValues(1), [1]);
assert.deepEqual(countCharacterValues(10), [10]);
assert.deepEqual(countCharacterValues(13), [10, 3]);
assert.deepEqual(countCharacterValues(20), [10, 10]);
assert.throws(() => countCharacterValues(21), RangeError);
assert.equal(
  formatProblemText({ mode: "sub", operands: [38, 6] }),
  "38 빼기 6의 답은 얼마일까요?"
);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/problem-scene.test.mjs tests/app-behavior.test.mjs`

Expected: FAIL for unsupported `sub` and missing `countCharacterValues`.

- [ ] **Step 3: Implement shared operator and decomposition**

In `problem-scene.mjs`:

```js
export function operatorFor(mode) {
  const operators = { add: "+", sub: "−", mul: "×" };
  if (!operators[mode]) throw new TypeError("operand scene requires add, sub, or mul mode");
  return operators[mode];
}

export function countCharacterValues(answer) {
  if (!Number.isInteger(answer) || answer < 1 || answer > 20) {
    throw new RangeError("count answer must be between 1 and 20");
  }
  if (answer <= 10) return [answer];
  if (answer === 20) return [10, 10];
  return [10, answer - 10];
}
```

Use `operatorFor(problem.mode)` in both `equationText` and `operandScene`. In `app-behavior.mjs`, map `sub` to `빼기`. In `app.mjs`, replace count-mode `quantityVisual` branching with a `.count-friends` container populated from `countCharacterValues(problem.answer)`, and keep `scheduleCountHint` for answers above 10 without adding a visible equation.

- [ ] **Step 4: Verify GREEN and regressions**

Run: `node --test tests/problem-scene.test.mjs tests/app-behavior.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: no new scene/model failures.

- [ ] **Step 5: Commit**

```bash
git add src/problem-scene.mjs src/app-behavior.mjs src/app.mjs tests/problem-scene.test.mjs tests/app-behavior.test.mjs
git commit -m "feat: 뺄셈과 세기 친구 장면 추가"
```

---

### Task 3: Four-Mode Home and Mobile Numeric Keypad

**Files:**
- Modify: `index.html`
- Modify: `styles.css`
- Modify: `src/app.mjs`
- Modify: `tests/app-contract.test.mjs`

**Interfaces:**
- Consumes: `onDigit(digit)` and `deleteLastDigit(buffer)`.
- Produces DOM: `#number-pad`, `[data-digit]`, `#number-pad-delete`, and four `.mode-card` controls.

- [ ] **Step 1: Write failing shell contract tests**

Assert four mode cards, exact shortcut mappings, and keypad controls:

```js
assert.equal((html.match(/class="mode-card"/g) ?? []).length, 4);
for (const [mode, key] of [["count", "1"], ["add", "2"], ["sub", "3"], ["mul", "4"]]) {
  assert.match(html, new RegExp(`data-mode="${mode}"[^>]*aria-keyshortcuts="${key}"`));
}
for (const [difficulty, key] of [["easy", "7"], ["steady", "8"], ["challenge", "9"]]) {
  assert.match(html, new RegExp(`data-difficulty="${difficulty}"[^>]*aria-keyshortcuts="${key}"`));
}
assert.match(html, /id="number-pad"/);
assert.equal((html.match(/data-digit="[0-9]"/g) ?? []).length, 10);
assert.match(html, /id="number-pad-delete"[^>]*aria-label="마지막 숫자 지우기"/);
assert.match(css, /\.number-pad\s*\{[^}]*display:\s*none;/s);
assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?\.number-pad\s*\{[^}]*display:\s*grid;/s);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/app-contract.test.mjs`

Expected: FAIL because the fourth card, new keys, and number pad are missing.

- [ ] **Step 3: Add markup, styling, and event wiring**

Add the subtraction card using `assets/characters/five.png`, relabel multiplication as key 4, and change difficulty labels to 7/8/9. Add after `.answer-dock`:

```html
<div id="number-pad" class="number-pad" aria-label="숫자 입력">
  <button type="button" data-digit="1">1</button>
  <button type="button" data-digit="2">2</button>
  <button type="button" data-digit="3">3</button>
  <button type="button" data-digit="4">4</button>
  <button type="button" data-digit="5">5</button>
  <button type="button" data-digit="6">6</button>
  <button type="button" data-digit="7">7</button>
  <button type="button" data-digit="8">8</button>
  <button type="button" data-digit="9">9</button>
  <button id="number-pad-delete" type="button" aria-label="마지막 숫자 지우기">⌫</button>
  <button type="button" data-digit="0">0</button>
</div>
```

Set `.number-pad { display: none; }`; within `@media (max-width: 640px)`, use a centered three-column grid with buttons at least 48px high. In `app.mjs`, bind `[data-digit]` clicks to `onDigit(button.dataset.digit)`, bind delete to update `state.buffer` and `dom.answer`, and change home mappings to `{7,8,9}` and `{1,2,3,4}`.

- [ ] **Step 4: Verify GREEN and regressions**

Run: `node --test tests/app-contract.test.mjs tests/game-model.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: only not-yet-generated character/audio asset failures remain.

- [ ] **Step 5: Commit**

```bash
git add index.html styles.css src/app.mjs tests/app-contract.test.mjs
git commit -m "feat: 모바일 숫자패드와 네 놀이 홈 추가"
```

---

### Task 4: Character Catalog and Renderer Through 150

**Files:**
- Modify: `src/character-designs.mjs`
- Modify: `src/character-spec.mjs`
- Modify: `scripts/render_character_pack.mjs`
- Modify: `package.json`
- Modify: `tests/character-spec.test.mjs`
- Modify: `tests/character-renderer.test.mjs`

**Interfaces:**
- Produces: `buildCharacterSpec(number)` and `characterAsset(number)` for every integer 1–150.
- Produces: a 140-entry design catalog for 11–150.
- Consumes: existing `rows`, `regions`, `body`, `cap`, `face`, and renderer normalization helpers.

- [ ] **Step 1: Write failing 150 catalog tests**

Expand loops and add representative assertions:

```js
for (let number = 1; number <= 150; number += 1) {
  const spec = buildCharacterSpec(number);
  assert.equal(spec.cells.length, number);
  assert.equal(new Set(spec.cells.map(({x, y}) => `${x}:${y}`)).size, number);
  assert.equal(connectedCellCount(spec.cells), number);
}
assert.equal(characterAsset(101), "number-101.png");
assert.equal(characterAsset(150), "number-150.png");
assert.equal(buildCharacterSpec(150).source, "extension");
assert.ok(buildCharacterSpec(150).regions.length > 0);
```

Add renderer tests for 101, 111, 125, 140, and 150 that assert every non-overlay region paints real cells and SVG output contains body, face, and limbs.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/character-spec.test.mjs tests/character-renderer.test.mjs`

Expected: FAIL with the current 100 upper bound and missing extension designs.

- [ ] **Step 3: Add connected extension designs**

Raise `assertNumber` and palette coverage to 150. In `character-designs.mjs`, generate 101–150 with a compact connected body:

```js
function compactRows(number) {
  const cols = Math.ceil(Math.sqrt(number));
  const fullRows = Math.floor(number / cols);
  const remainder = number % cols;
  const output = Array.from({ length: fullRows }, () => cols);
  if (remainder > 0) output.unshift([remainder, Math.floor((cols - remainder) / 2)]);
  return rows(...output);
}
```

Define three extension palettes for 101–119, 120–139, and 140–150. Insert designs with `regions(cap(1, accent), body(base))`, a face centered on an occupied lower-middle row, and use the already supported `single-eye` accessory for every fifth character. Mark 101–150 specs with `source: "extension"`. In `game-model.mjs`, expand `NUMBERBLOCKS` from 100 to 150 only after the spec supports the full range.

Raise catalog validation to 140 designs and CLI validation to `to <= 150`. Change the package script to:

```json
"render:characters": "node scripts/render_character_pack.mjs --from 11 --to 150"
```

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/character-spec.test.mjs tests/character-renderer.test.mjs`

Expected: PASS for all 1–150 connectivity and representative renderer assertions.

- [ ] **Step 5: Commit**

```bash
git add src/character-designs.mjs src/character-spec.mjs scripts/render_character_pack.mjs package.json tests/character-spec.test.mjs tests/character-renderer.test.mjs
git commit -m "feat: 연결형 캐릭터 카탈로그를 150까지 확장"
```

---

### Task 5: Render and Validate Character Assets

**Files:**
- Create: `assets/characters/number-101.png` through `assets/characters/number-150.png`
- Modify: `tests/character-assets.test.mjs`

**Interfaces:**
- Consumes: Task 4 renderer and catalog.
- Produces: 1024×1536 RGBA PNG assets for app preload and celebration scenes.

- [ ] **Step 1: Write failing asset tests**

Extend asset and visible-bound loops through 150. Preserve `SAFE = { left: 120, right: 904, top: 190, bottom: 1240 }`, PNG signature, RGBA color type 6, and 1024×1536 assertions.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/character-assets.test.mjs`

Expected: FAIL with `ENOENT` for `number-101.png`.

- [ ] **Step 3: Render the new pack**

Run:

```bash
node scripts/render_character_pack.mjs --from 101 --to 150
```

Expected: 50 lines from `rendered number-101.png` through `rendered number-150.png`.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/character-assets.test.mjs`

Expected: PASS for 1–150 assets and normalized visible bounds.

Create a representative contact sheet for 101, 110, 120, 130, 140, and 150 under `.superpowers/sdd/subtraction-150-artifacts/` and visually confirm flat connected bodies, readable faces, and no clipped limbs.

- [ ] **Step 5: Commit**

```bash
git add assets/characters/number-1*.png tests/character-assets.test.mjs
git commit -m "feat: 101부터 150 캐릭터 이미지 제작"
```

---

### Task 6: Character Size Bands and Responsive Layout

**Files:**
- Modify: `src/app.mjs`
- Modify: `src/app-behavior.mjs`
- Modify: `styles.css`
- Modify: `tests/app-contract.test.mjs`
- Modify: `tests/responsive-layout.test.mjs`

**Interfaces:**
- Produces DOM attribute: `data-size-band="base" | "medium" | "large"` on `.character`.
- Consumes: all character scenes, `.operand-slot`, `.count-friends`, and mobile `.number-pad`.

- [ ] **Step 1: Write failing scale/layout tests**

Import `characterSizeBand` from `src/app-behavior.mjs` in `tests/app-behavior.test.mjs` and assert the 50/51/100/101/150 boundaries:

```js
assert.equal(characterSizeBand(50), "base");
assert.equal(characterSizeBand(51), "medium");
assert.equal(characterSizeBand(100), "medium");
assert.equal(characterSizeBand(101), "large");
assert.equal(characterSizeBand(150), "large");
```

Assert CSS contains ordered custom scales:

```js
assert.match(css, /data-size-band="medium"[^}]*--number-scale:\s*1\.1/s);
assert.match(css, /data-size-band="large"[^}]*--number-scale:\s*1\.2/s);
assert.match(css, /\.count-friends\s*\{/);
assert.match(css, /@media\s*\(max-width:\s*640px\)[\s\S]*?--number-scale:\s*1\.1/s);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/app-contract.test.mjs tests/responsive-layout.test.mjs`

Expected: FAIL because size bands and count-friends layout are absent.

- [ ] **Step 3: Implement scale bands without breaking animations**

Place `characterSizeBand(number)` in `app-behavior.mjs`, import it in `app.mjs`, and assign `image.dataset.sizeBand`. Use the independent CSS `scale` property so existing `transform` animations continue:

```css
.character { --number-scale: 1; scale: var(--number-scale); }
.character[data-size-band="medium"] { --number-scale: 1.1; }
.character[data-size-band="large"] { --number-scale: 1.2; }
.operand-slot, .count-friends { overflow: visible; }
```

On mobile, clamp medium/large to 1.05/1.1, reduce stage padding, reserve vertical space for the keypad, and use two equal count-friend slots. Update the stylesheet cache query in `index.html`.

- [ ] **Step 4: Verify GREEN and full regressions**

Run: `node --test tests/app-contract.test.mjs tests/responsive-layout.test.mjs tests/app-behavior.test.mjs`

Expected: PASS.

Run: `node --test tests/*.test.mjs`

Expected: only audio asset failures remain.

- [ ] **Step 5: Commit**

```bash
git add src/app-behavior.mjs src/app.mjs styles.css index.html tests/app-contract.test.mjs tests/responsive-layout.test.mjs tests/app-behavior.test.mjs
git commit -m "feat: 숫자 크기 단계와 모바일 게임 배치 적용"
```

---

### Task 7: Subtraction and 101–150 Voice Pack

**Files:**
- Modify: `scripts/generate_voice_pack.py`
- Modify: `src/audio-manifest.mjs`
- Create: `assets/audio/voice/ko/prompt-sub.mp3`
- Create: `assets/audio/voice/ko/number-101.mp3` through `number-150.mp3`
- Create: `assets/audio/voice/en/number-101.mp3` through `number-150.mp3`
- Modify: `tests/voice-assets.test.mjs`
- Modify: `tests/audio-manager.test.mjs`

**Interfaces:**
- Produces: `VOICE["prompt-sub"]` and `VOICE["number-1"]` through `VOICE["number-150"]`.
- Consumes: existing `AudioManager.playVoice` and `playAnswer`.

- [ ] **Step 1: Write failing voice tests**

Extend required number ranges to 150, add `prompt-sub` to Korean prompts, and assert:

```js
await manager.playAnswer(150);
assert.deepEqual(played, [
  "assets/audio/voice/ko/number-150.mp3",
  "assets/audio/voice/en/number-150.mp3"
]);
```

- [ ] **Step 2: Verify RED**

Run: `node --test tests/voice-assets.test.mjs tests/audio-manager.test.mjs`

Expected: FAIL because manifest entries and MP3 files above 100 are absent.

- [ ] **Step 3: Extend number wording and generate assets**

Add `"prompt-sub": "큰 수에서 작은 수를 빼면 몇이 될까요?"`. Extend Korean wording so 101–150 produces `백일` through `백오십`, and English wording produces natural British forms `One hundred and one` through `One hundred and fifty`. Change all generator and manifest ranges from 100 to 150.

Run:

```bash
python3 scripts/generate_voice_pack.py
```

Expected: existing files print `skip`; new prompt and 100 number files are written.

- [ ] **Step 4: Verify GREEN**

Run: `node --test tests/voice-assets.test.mjs tests/audio-manager.test.mjs`

Expected: PASS, with every MP3 larger than 1024 bytes.

- [ ] **Step 5: Commit**

```bash
git add scripts/generate_voice_pack.py src/audio-manifest.mjs tests/voice-assets.test.mjs tests/audio-manager.test.mjs assets/audio/voice
git commit -m "feat: 뺄셈과 150까지 한국어 영어 음성 추가"
```

---

### Task 8: End-to-End Browser QA and Final Verification

**Files:**
- Modify: `docs/superpowers/plans/2026-07-20-numberblocks-subtraction-150-expansion.md`
- Create QA artifacts under: `.superpowers/sdd/subtraction-150-artifacts/`

**Interfaces:**
- Consumes: completed Tasks 1–7.
- Produces: verified browser behavior and recorded evidence; no new runtime API.

- [ ] **Step 1: Run clean automated verification**

Run:

```bash
node --test tests/*.test.mjs
git diff --check
```

Expected: all tests PASS and `git diff --check` prints nothing.

- [ ] **Step 2: Verify desktop behavior at 1280×720**

Using the browser QA skill:

1. Confirm four cards fit without overlap.
2. Select difficulty with key 9 and subtraction with key 3.
3. Confirm subtraction shows two characters and `−`.
4. Confirm key 4 starts multiplication.
5. Force or sample a challenge result above 100 and confirm the character is visible, larger than base characters, and unclipped.
6. Confirm console errors and missing asset responses are zero.

- [ ] **Step 3: Verify mobile behavior at 390×844**

Using the browser QA skill:

1. Confirm all four home cards are reachable and legible.
2. Start a game by tapping.
3. Enter a two-digit answer with the on-screen keypad.
4. Enter a digit, tap `⌫`, and confirm only the last digit disappears.
5. Complete a three-digit answer without a physical keyboard.
6. Open count 13 and confirm 10 and 3 characters appear in equal, large slots with no equation.
7. Open count 20 and confirm two 10 characters.
8. Confirm keypad, answer dock, stage, footer, and characters do not overlap.

- [ ] **Step 4: Record QA evidence**

Save desktop subtraction, mobile keypad, count 13, count 20, and 150 celebration screenshots. Append an `## Execution Record` section containing the final test count, viewport results, console error count, missing asset count, and artifact paths.

- [ ] **Step 5: Final commit**

```bash
git add docs/superpowers/plans/2026-07-20-numberblocks-subtraction-150-expansion.md
git commit -m "docs: 뺄셈과 150 확장 검증 완료"
```

## Execution Record

**Completed:** 2026-07-20
**Verified revision:** `4b6a21f`
**Result:** PASS

- Automated verification: `node --test tests/*.test.mjs` passed **93/93** tests,
  with 0 failures, 0 skipped, and 0 cancelled.
- Diff verification: `git diff --check` passed with no output.
- 1280×720: four home cards fit with zero overlap; key `9` plus key `3` opens
  subtraction with two characters and `−`; key `4` opens multiplication; number
  115 renders in the `large` size band at 396 px versus a 330 px base character,
  with visible overflow and no clipping.
- 390×844: all four cards are reachable; touch input, `⌫`, two-digit and
  three-digit answers pass; count 13 shows 10+3 in equal visual slots without an
  equation; count 20 shows two 10 characters; the answer dock and keypad have an
  8 px gap; gameplay hides the creator credit, leaving **0 px** footer/keypad
  overlap.
- 640×360: all four home cards fit fully inside the viewport; count 20 shows two
  complete number-10 characters. Each character is 44.78×64 px at
  y=117.75–181.75, fully inside the stage at y=104.5–197 and fully inside the
  viewport.
- Application console errors: **0**. Three raw console errors came only from an
  installed Chrome extension and had `chrome-extension://` source URLs.
- Missing assets: **0**. Final observed asset verification downloaded **11/11**
  images/stylesheets with 0 failures, and all visible images had non-zero natural
  dimensions.

QA artifacts:

- `.superpowers/sdd/subtraction-150-artifacts/desktop-subtraction-1280x720.png`
- `.superpowers/sdd/subtraction-150-artifacts/desktop-high-result-121-1280x720.png`
- `.superpowers/sdd/subtraction-150-artifacts/celebration-150-1280x720.png`
- `.superpowers/sdd/subtraction-150-artifacts/mobile-keypad-two-digit-390x844.png`
- `.superpowers/sdd/subtraction-150-artifacts/mobile-three-digit-121-390x844.png`
- `.superpowers/sdd/subtraction-150-artifacts/count-13-390x844.png`
- `.superpowers/sdd/subtraction-150-artifacts/count-20-390x844.png`
- `.superpowers/sdd/subtraction-150-artifacts/final-mobile-game-390x844.png`
- `.superpowers/sdd/subtraction-150-artifacts/final-home-640x360.png`
- `.superpowers/sdd/subtraction-150-artifacts/final-count20-640x360.png`
