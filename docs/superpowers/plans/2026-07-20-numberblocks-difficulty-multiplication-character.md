# Numberblocks Difficulty and Multiplication Character Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent shared difficulty selector, bounded 1~100 problem generation, grouped counting hints, and post-answer multiplication characters without revealing answers early.

**Architecture:** Keep game rules pure in `game-model.mjs`, isolate storage fallbacks in a new `difficulty-preference.mjs`, and keep DOM rendering in `app.mjs`. Reuse the current static HTML/CSS/module architecture, add one transparent mascot asset, and expand the existing offline voice manifest to 1~100.

**Tech Stack:** HTML5, CSS, browser ES modules, Node.js built-in test runner, PNG character assets, Python `edge-tts` production script.

## Global Constraints

- Audience is children aged 3~5 using a PC number keyboard.
- Difficulty is shared by all modes and defaults to `차근차근`.
- `쉬움`: count 1~10, addition result 2~10, multiplication result 1~10.
- `차근차근`: count 1~20, addition result 2~50, multiplication result 1~50.
- `도전`: count is unavailable, addition result 2~100, multiplication result 1~100.
- Multiplication operands are always within the 1단~10단 range.
- Counting never exceeds 20 and 11~20 uses tens-and-ones grouping hints.
- Multiplication answers 1~9 reveal the matching number character only after success.
- Multiplication answers 10~100 reveal the original multiplication helper only after success.
- Existing mouse, number-key, numpad, `Escape`, mute, audio cancellation, and reduced-motion behavior must remain working.
- Do not copy supplied Numberblocks images or third-party soundboard clips into the project.
- Do not add a runtime network dependency.

---

## File Structure

- Modify `src/game-model.mjs`: difficulty limits, normalized difficulty, mode availability, bounded problem generation.
- Create `src/difficulty-preference.mjs`: safe local-storage load/save behavior.
- Modify `src/app-behavior.mjs`: pure quantity grouping and celebration-view selection.
- Modify `src/app.mjs`: difficulty controls, grouped quantity rendering, hints, large-number celebration, mascot rendering.
- Modify `index.html`: difficulty selector and challenge-mode availability copy.
- Modify `styles.css`: difficulty control, quantity groups, 10×10 grid, result board, mascot animation.
- Create `assets/characters/multiply-helper.png`: transparent original multiplication helper.
- Modify `src/audio-manifest.mjs`: number voice entries 1~100.
- Modify `scripts/generate_voice_pack.py`: Korean and British-English number phrases 1~100.
- Modify `tests/game-model.test.mjs`: difficulty and 100-answer rule coverage.
- Create `tests/difficulty-preference.test.mjs`: storage behavior coverage.
- Modify `tests/app-behavior.test.mjs`: grouping and celebration selection coverage.
- Modify `tests/app-contract.test.mjs`: difficulty and keyboard contract coverage.
- Modify `tests/character-assets.test.mjs`: mascot PNG contract.
- Modify `tests/voice-assets.test.mjs`: 1~100 voice-pack contract.
- Update `docs/superpowers/specs/2026-07-20-numberblocks-difficulty-multiplication-character-design.md`: implementation status after verification.

---

### Task 1: Difficulty-Bounded Problem Model

**Files:**
- Modify: `src/game-model.mjs`
- Modify: `tests/game-model.test.mjs`

**Interfaces:**
- Produces: `DIFFICULTY_LIMITS`, `normalizeDifficulty(value)`, `isModeAvailable(mode, difficulty)`, `problemKey(problem)`, and `createProblem(mode, difficulty, rng, recentKeys)`.
- Preserves: `NUMBERBLOCKS` and `applyDigit(buffer, digit, answer)`.
- Consumed by: Tasks 2 and 3.

- [ ] **Step 1: Replace streak-based tests with failing difficulty tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  NUMBERBLOCKS,
  applyDigit,
  createProblem,
  isModeAvailable,
  normalizeDifficulty,
  problemKey
} from "../src/game-model.mjs";

test("1~10 캐릭터 메타데이터가 모두 존재한다", () => {
  assert.deepEqual(Object.keys(NUMBERBLOCKS).map(Number), [1,2,3,4,5,6,7,8,9,10]);
});

test("잘못된 난이도는 차근차근으로 정규화한다", () => {
  assert.equal(normalizeDifficulty("easy"), "easy");
  assert.equal(normalizeDifficulty("steady"), "steady");
  assert.equal(normalizeDifficulty("challenge"), "challenge");
  assert.equal(normalizeDifficulty("unknown"), "steady");
});

test("숫자 세기는 쉬움 10, 차근차근 20까지만 만든다", () => {
  assert.equal(createProblem("count", "easy", () => 0.999).answer, 10);
  assert.equal(createProblem("count", "steady", () => 0.999).answer, 20);
  assert.equal(isModeAvailable("count", "challenge"), false);
  assert.throws(
    () => createProblem("count", "challenge", () => 0.5),
    /unavailable/
  );
});

test("더하기 정답은 난이도 한도에 맞는다", () => {
  assert.equal(createProblem("add", "easy", () => 0.999).answer, 10);
  assert.equal(createProblem("add", "steady", () => 0.999).answer, 50);
  assert.equal(createProblem("add", "challenge", () => 0.999).answer, 100);
});

test("곱셈은 1~10단 안에서 난이도별 결과 상한을 지킨다", () => {
  for (const [difficulty, max] of [["easy", 10], ["steady", 50], ["challenge", 100]]) {
    for (const rng of [() => 0, () => 0.37, () => 0.999]) {
      const problem = createProblem("mul", difficulty, rng);
      assert.ok(problem.operands.every(value => value >= 1 && value <= 10));
      assert.ok(problem.answer <= max);
    }
  }
  assert.deepEqual(
    createProblem("mul", "challenge", () => 0.999).operands,
    [10, 10]
  );
});

test("최근에 나온 교환식은 다음 후보에서 피한다", () => {
  const first = createProblem("mul", "easy", () => 0);
  const second = createProblem("mul", "easy", () => 0, [problemKey(first)]);
  assert.notEqual(problemKey(second), problemKey(first));
});

test("100 입력은 1과 10을 접두사로 유지한다", () => {
  assert.deepEqual(applyDigit("", "1", 100), { buffer: "1", status: "prefix" });
  assert.deepEqual(applyDigit("1", "0", 100), { buffer: "10", status: "prefix" });
  assert.deepEqual(applyDigit("10", "0", 100), { buffer: "100", status: "correct" });
});
```

- [ ] **Step 2: Run the model tests and verify failure**

Run: `node --test tests/game-model.test.mjs`

Expected: FAIL because `normalizeDifficulty` and `isModeAvailable` are not exported and `createProblem` still expects streak state.

- [ ] **Step 3: Implement the explicit difficulty model**

Replace the streak constants and `createProblem` in `src/game-model.mjs` with:

```js
export const DIFFICULTY_LIMITS = Object.freeze({
  easy: Object.freeze({ count: 10, add: 10, mul: 10 }),
  steady: Object.freeze({ count: 20, add: 50, mul: 50 }),
  challenge: Object.freeze({ count: null, add: 100, mul: 100 })
});

const pick = (items, rng) =>
  items[Math.min(items.length - 1, Math.floor(rng() * items.length))];

export function normalizeDifficulty(value) {
  return Object.hasOwn(DIFFICULTY_LIMITS, value) ? value : "steady";
}

export function isModeAvailable(mode, difficulty) {
  const normalized = normalizeDifficulty(difficulty);
  return mode !== "count" || DIFFICULTY_LIMITS[normalized].count !== null;
}

function multiplicationPairs(maxAnswer) {
  const pairs = [];
  for (let left = 1; left <= 10; left += 1) {
    for (let right = 1; right <= 10; right += 1) {
      if (left * right <= maxAnswer) pairs.push([left, right]);
    }
  }
  return pairs;
}

export function problemKey(problem) {
  if (problem.mode === "count") return `count:${problem.answer}`;
  const [left, right] = problem.operands;
  const [first, second] = [left, right].sort((a, b) => a - b);
  return `${problem.mode}:${first}:${second}`;
}

function pickFresh(candidates, recentKeys, rng) {
  const recent = new Set(recentKeys);
  const fresh = candidates.filter(problem => !recent.has(problemKey(problem)));
  return pick(fresh.length > 0 ? fresh : candidates, rng);
}

function countProblems(maxAnswer) {
  return Array.from({ length: maxAnswer }, (_, index) => {
    const answer = index + 1;
    return { mode: "count", answer, characters: [answer], promptKey: "prompt-count" };
  });
}

function additionProblems(maxAnswer) {
  const problems = [];
  for (let left = 1; left < maxAnswer; left += 1) {
    for (let right = 1; right <= maxAnswer - left; right += 1) {
      problems.push({
        mode: "add",
        answer: left + right,
        characters: [left, right],
        operands: [left, right],
        promptKey: "prompt-add"
      });
    }
  }
  return problems;
}

function multiplicationProblems(maxAnswer) {
  return multiplicationPairs(maxAnswer).map(([left, right]) => ({
    mode: "mul",
    answer: left * right,
    characters: [],
    operands: [left, right],
    promptKey: "prompt-mul"
  }));
}

export function createProblem(
  mode,
  difficulty,
  rng = Math.random,
  recentKeys = []
) {
  const normalized = normalizeDifficulty(difficulty);
  const limits = DIFFICULTY_LIMITS[normalized];

  if (mode === "count") {
    if (limits.count === null) {
      throw new RangeError("count mode is unavailable for challenge");
    }
    return pickFresh(countProblems(limits.count), recentKeys, rng);
  }

  if (mode === "add") {
    return pickFresh(additionProblems(limits.add), recentKeys, rng);
  }

  if (mode === "mul") {
    return pickFresh(multiplicationProblems(limits.mul), recentKeys, rng);
  }

  throw new TypeError(`Unknown mode: ${mode}`);
}
```

- [ ] **Step 4: Run the model tests**

Run: `node --test tests/game-model.test.mjs`

Expected: all model tests PASS.

- [ ] **Step 5: Commit the model change**

```bash
git add src/game-model.mjs tests/game-model.test.mjs
git commit -m "feat: 난이도별 문제 범위 추가"
```

---

### Task 2: Persistent Shared Difficulty Controls

**Files:**
- Create: `src/difficulty-preference.mjs`
- Create: `tests/difficulty-preference.test.mjs`
- Modify: `index.html`
- Modify: `src/app.mjs`
- Modify: `tests/app-contract.test.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `normalizeDifficulty` and `isModeAvailable` from Task 1.
- Produces: `loadDifficulty(storage) -> string` and `saveDifficulty(storage, value) -> string`.
- Produces DOM: `#difficulty-picker`, three `.difficulty-button` controls, and `#count-unavailable`.

- [ ] **Step 1: Write failing preference and HTML contract tests**

Create `tests/difficulty-preference.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTY_STORAGE_KEY,
  loadDifficulty,
  saveDifficulty
} from "../src/difficulty-preference.mjs";

test("저장값이 없거나 잘못되면 차근차근을 사용한다", () => {
  assert.equal(loadDifficulty({ getItem: () => null }), "steady");
  assert.equal(loadDifficulty({ getItem: () => "broken" }), "steady");
});

test("저장소 오류가 나도 차근차근으로 계속한다", () => {
  assert.equal(loadDifficulty({ getItem() { throw new Error("blocked"); } }), "steady");
  assert.equal(
    saveDifficulty({ setItem() { throw new Error("blocked"); } }, "challenge"),
    "challenge"
  );
});

test("정규화한 난이도를 저장한다", () => {
  const writes = [];
  const storage = { setItem: (...args) => writes.push(args) };
  assert.equal(saveDifficulty(storage, "easy"), "easy");
  assert.deepEqual(writes, [[DIFFICULTY_STORAGE_KEY, "easy"]]);
});
```

Append to `tests/app-contract.test.mjs`:

```js
test("홈에는 세 난이도 버튼과 도전 세기 안내가 있다", () => {
  assert.match(html, /id="difficulty-picker"/);
  assert.equal((html.match(/class="difficulty-button"/g) ?? []).length, 3);
  assert.match(html, /data-difficulty="easy"/);
  assert.match(html, /data-difficulty="steady"/);
  assert.match(html, /data-difficulty="challenge"/);
  assert.match(html, /id="count-unavailable"/);
});
```

- [ ] **Step 2: Run the new tests and verify failure**

Run: `node --test tests/difficulty-preference.test.mjs tests/app-contract.test.mjs`

Expected: FAIL because the preference module and difficulty DOM do not exist.

- [ ] **Step 3: Implement safe preference storage**

Create `src/difficulty-preference.mjs`:

```js
import { normalizeDifficulty } from "./game-model.mjs";

export const DIFFICULTY_STORAGE_KEY = "numberblocks-difficulty";

export function loadDifficulty(storage = globalThis.localStorage) {
  try {
    return normalizeDifficulty(storage?.getItem(DIFFICULTY_STORAGE_KEY));
  } catch {
    return "steady";
  }
}

export function saveDifficulty(storage, value) {
  const normalized = normalizeDifficulty(value);
  try {
    storage?.setItem(DIFFICULTY_STORAGE_KEY, normalized);
  } catch {
    // Storage can be blocked for local files or strict privacy settings.
  }
  return normalized;
}
```

- [ ] **Step 4: Add the difficulty selector to the home screen**

Insert between `.home-heading` and `.mode-grid` in `index.html`:

```html
<div id="difficulty-picker" class="difficulty-picker" role="group" aria-label="난이도 선택">
  <span class="difficulty-label">난이도</span>
  <button class="difficulty-button" type="button" data-difficulty="easy" aria-keyshortcuts="4">쉬움 <kbd>4</kbd></button>
  <button class="difficulty-button" type="button" data-difficulty="steady" aria-keyshortcuts="5">차근차근 <kbd>5</kbd></button>
  <button class="difficulty-button" type="button" data-difficulty="challenge" aria-keyshortcuts="6">도전 <kbd>6</kbd></button>
</div>
```

Add inside the count mode card after `.card-copy`:

```html
<span id="count-unavailable" class="mode-unavailable" hidden>도전에서는 더하기와 곱하기를 해요</span>
```

- [ ] **Step 5: Wire pointer and number-key selection**

In `src/app.mjs`, import preference and model availability helpers:

```js
import {
  NUMBERBLOCKS,
  applyDigit,
  createProblem,
  isModeAvailable,
  problemKey
} from "./game-model.mjs";
import {
  loadDifficulty,
  saveDifficulty
} from "./difficulty-preference.mjs";
```

Add controls and replace the existing state literal with:

```js
const difficultyControls = [...document.querySelectorAll(".difficulty-button")];
const countControl = document.querySelector('[data-mode="count"]');
const countUnavailable = $("count-unavailable");

const state = {
  phase: "home",
  mode: null,
  difficulty: loadDifficulty(),
  problem: null,
  buffer: "",
  stars: 0,
  streak: { count: 0, add: 0, mul: 0 },
  wrongCount: 0,
  round: 0,
  hintTimer: 0,
  timers: new Map(),
  recentProblemKeys: []
};

function syncDifficulty() {
  difficultyControls.forEach(button => {
    const selected = button.dataset.difficulty === state.difficulty;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  const countAvailable = isModeAvailable("count", state.difficulty);
  countControl.disabled = !countAvailable;
  countControl.setAttribute("aria-disabled", String(!countAvailable));
  countUnavailable.hidden = countAvailable;
}

function setDifficulty(value) {
  state.difficulty = saveDifficulty(globalThis.localStorage, value);
  state.recentProblemKeys = [];
  syncDifficulty();
}
```

Change `newProblem()` to:

```js
state.problem = createProblem(
  state.mode,
  state.difficulty,
  Math.random,
  state.recentProblemKeys
);
state.recentProblemKeys = [
  ...state.recentProblemKeys,
  problemKey(state.problem)
].slice(-4);
```

Guard `startMode(mode)`:

```js
function startMode(mode) {
  if (!isModeAvailable(mode, state.difficulty)) {
    showHint("도전에서는 더하기와 곱하기를 해요.");
    return;
  }
  setMode(mode);
  newProblem();
  focusPhase(state.phase, {
    game: dom.game,
    homeControl: modeControls[0]
  });
}
```

Register controls:

```js
difficultyControls.forEach(button => {
  button.addEventListener("click", () => setDifficulty(button.dataset.difficulty));
});
```

Replace the existing `if (state.phase === "home")` key block with:

```js
if (state.phase === "home") {
  const difficulties = { 4: "easy", 5: "steady", 6: "challenge" };
  if (difficulties[digit]) {
    event.preventDefault();
    setDifficulty(difficulties[digit]);
    return;
  }

  const modes = { 1: "count", 2: "add", 3: "mul" };
  if (modes[digit]) {
    event.preventDefault();
    startMode(modes[digit]);
  }
  return;
}
```

Before the digit-only key guard, add arrow navigation for the difficulty controls:

```js
if (
  state.phase === "home" &&
  ["ArrowLeft", "ArrowRight"].includes(event.key) &&
  difficultyControls.includes(document.activeElement)
) {
  event.preventDefault();
  const current = difficultyControls.indexOf(document.activeElement);
  const offset = event.key === "ArrowRight" ? 1 : -1;
  const next = (current + offset + difficultyControls.length) %
    difficultyControls.length;
  difficultyControls[next].focus();
  return;
}
```

Call `syncDifficulty()` during initialization after `syncMuteButton()`.

- [ ] **Step 6: Style the selector and disabled count card**

Add complete control states to `styles.css`:

```css
.difficulty-picker {
  z-index: 3;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px;
  border: 4px solid #fff;
  border-radius: 999px;
  background: rgba(255, 253, 246, .94);
  box-shadow: 0 8px 0 rgba(37, 52, 93, .12);
}

.difficulty-label {
  padding: 0 10px;
  color: var(--ink-soft);
  font-weight: 900;
}

.difficulty-button {
  min-height: 46px;
  padding: 8px 14px;
  border: 0;
  border-radius: 999px;
  background: #eaf4fa;
  font-weight: 900;
  cursor: pointer;
}

.difficulty-button.selected {
  color: #fff;
  background: var(--blue);
  box-shadow: inset 0 -4px rgba(0, 0, 0, .18);
}

.difficulty-button kbd {
  min-width: 1.45em;
  height: 1.45em;
  font-size: .78em;
}

.mode-card:disabled {
  cursor: not-allowed;
  filter: grayscale(.55);
  opacity: .62;
}

.mode-unavailable {
  position: absolute;
  inset: auto 12px 12px;
  z-index: 3;
  padding: 8px;
  border-radius: 12px;
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  background: var(--ink);
}
```

- [ ] **Step 7: Run focused and full tests**

Run: `node --test tests/difficulty-preference.test.mjs tests/app-contract.test.mjs tests/game-model.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all existing and new tests PASS.

- [ ] **Step 8: Commit the difficulty UI**

```bash
git add index.html styles.css src/app.mjs src/difficulty-preference.mjs tests/difficulty-preference.test.mjs tests/app-contract.test.mjs
git commit -m "feat: 공통 난이도 선택 추가"
```

---

### Task 3: Grouped Counting, Large-Number Addition, and Hints

**Files:**
- Modify: `src/app-behavior.mjs`
- Modify: `tests/app-behavior.test.mjs`
- Modify: `src/app.mjs`
- Modify: `styles.css`

**Interfaces:**
- Produces: `quantityParts(number) -> { tens, ones }`.
- Produces: `celebrationView(mode, answer) -> "number" | "multiply-helper" | "result-board"`.
- Consumes: difficulty-aware problems from Task 1.

- [ ] **Step 1: Write failing pure behavior tests**

Append to `tests/app-behavior.test.mjs` and import the new functions:

```js
import {
  celebrationView,
  formatProblemText,
  focusPhase,
  playPromptCue,
  playRetryCue,
  quantityParts,
  retireAnimationClass
} from "../src/app-behavior.mjs";

test("큰 수를 십 묶음과 낱개로 나눈다", () => {
  assert.deepEqual(quantityParts(7), { tens: 0, ones: 7 });
  assert.deepEqual(quantityParts(17), { tens: 1, ones: 7 });
  assert.deepEqual(quantityParts(50), { tens: 5, ones: 0 });
  assert.deepEqual(quantityParts(100), { tens: 10, ones: 0 });
});

test("모드와 정답에 따라 정답 화면을 고른다", () => {
  assert.equal(celebrationView("mul", 6), "number");
  assert.equal(celebrationView("mul", 10), "multiply-helper");
  assert.equal(celebrationView("mul", 100), "multiply-helper");
  assert.equal(celebrationView("add", 10), "number");
  assert.equal(celebrationView("add", 11), "result-board");
});
```

- [ ] **Step 2: Run behavior tests and verify failure**

Run: `node --test tests/app-behavior.test.mjs`

Expected: FAIL because `quantityParts` and `celebrationView` are not exported.

- [ ] **Step 3: Add the pure view helpers**

Append to `src/app-behavior.mjs`:

```js
export function quantityParts(number) {
  return {
    tens: Math.floor(number / 10),
    ones: number % 10
  };
}

export function celebrationView(mode, answer) {
  if (mode === "mul") return answer <= 9 ? "number" : "multiply-helper";
  if (mode === "add") return answer <= 10 ? "number" : "result-board";
  return "number";
}
```

- [ ] **Step 4: Implement reusable quantity rendering**

Import `quantityParts` in `src/app.mjs`, then add:

```js
function quantityVisual(number, { countable = false } = {}) {
  const visual = document.createElement("div");
  visual.className = `quantity-visual${countable ? " countable" : ""}`;
  visual.dataset.value = String(number);
  visual.setAttribute("aria-label", `${number}개`);

  const { tens, ones } = quantityParts(number);
  for (let groupIndex = 0; groupIndex < tens; groupIndex += 1) {
    const group = document.createElement("span");
    group.className = "ten-group";
    for (let index = 0; index < 10; index += 1) {
      const block = document.createElement("i");
      block.setAttribute("aria-hidden", "true");
      group.append(block);
    }
    visual.append(group);
  }

  if (ones > 0) {
    const group = document.createElement("span");
    group.className = "ones-group";
    for (let index = 0; index < ones; index += 1) {
      const block = document.createElement("i");
      block.setAttribute("aria-hidden", "true");
      group.append(block);
    }
    visual.append(group);
  }
  return visual;
}

function operandVisual(number) {
  if (number <= 10) return character(number);
  const card = document.createElement("div");
  card.className = "operand-card";
  const label = document.createElement("strong");
  label.textContent = String(number);
  card.append(label, quantityVisual(number));
  return card;
}
```

Update count rendering:

```js
if (problem.mode === "count") {
  dom.problem.textContent = formatProblemText(problem);
  if (problem.answer <= 10) {
    dom.stage.append(character(problem.answer));
  } else {
    dom.stage.append(quantityVisual(problem.answer, { countable: true }));
  }
  scheduleCountHint(problem.answer);
  return;
}
```

Update addition rendering to use `operandVisual(problem.operands[0])` and `operandVisual(problem.operands[1])`.

While creating multiplication cells in `renderProblem`, mark alternating rows
and each fifth column:

```js
const row = Math.floor(index / problem.operands[1]);
const column = index % problem.operands[1];
block.classList.toggle("row-shade", row % 2 === 1);
block.classList.toggle("column-marker", (column + 1) % 5 === 0);
```

- [ ] **Step 5: Add progressive grouped hints**

Add to `src/app.mjs`:

```js
function countHintText(answer) {
  const { tens, ones } = quantityParts(answer);
  if (tens === 0) return "블록을 하나씩 짚어 보세요.";
  if (ones === 0) return `10개 묶음이 ${tens}개예요.`;
  return `10개 묶음 ${tens}개와 낱개 ${ones}개예요.`;
}

function scheduleCountHint(answer) {
  if (answer <= 10) return;
  schedule(() => {
    if (state.phase !== "playing" || state.problem?.answer !== answer) return;
    dom.stage.querySelector(".quantity-visual")?.classList.add("hint-groups");
    showHint(countHintText(answer));
  }, 4500);
}
```

In `wrongAnswer()`, use grouped count copy after the second wrong answer:

```js
const retryMessage =
  state.mode === "count" && state.wrongCount >= 2
    ? countHintText(state.problem.answer)
    : "괜찮아요! 천천히 다시 눌러 봐요.";
showHint(retryMessage);
```

- [ ] **Step 6: Style grouped quantities and large operands**

Add to `styles.css`:

```css
.quantity-visual {
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: 12px;
  width: min(64vw, 720px);
}

.ten-group,
.ones-group {
  display: grid;
  grid-template-columns: repeat(5, 22px);
  gap: 4px;
  padding: 8px;
  border: 3px solid transparent;
  border-radius: 14px;
}

.quantity-visual i {
  width: 22px;
  aspect-ratio: 1;
  border: 2px solid rgba(37, 52, 93, .18);
  border-radius: 5px;
  background: #ffd349;
  box-shadow: inset 0 -3px rgba(167, 111, 0, .14);
}

.quantity-visual.hint-groups .ten-group,
.quantity-visual.hint-groups .ones-group {
  border-color: var(--blue);
  background: rgba(255, 255, 255, .72);
}

.operand-card {
  display: grid;
  place-items: center;
  gap: 8px;
  min-width: 190px;
  padding: 16px;
  border: 4px solid #fff;
  border-radius: 24px;
  background: rgba(255, 253, 246, .94);
  box-shadow: 0 8px 0 rgba(37, 52, 93, .12);
}

.operand-card > strong {
  font-family: var(--display-font);
  font-size: clamp(34px, 5vw, 60px);
}

.operand-card .quantity-visual {
  width: min(28vw, 300px);
  gap: 5px;
}

.operand-card .ten-group,
.operand-card .ones-group {
  grid-template-columns: repeat(5, 11px);
  gap: 2px;
  padding: 3px;
}

.operand-card .quantity-visual i {
  width: 11px;
  border-width: 1px;
}

.multiplication-grid {
  --grid-cell: clamp(
    22px,
    min(
      6vmin,
      calc(42vmin / var(--cols)),
      calc(42vmin / var(--rows))
    ),
    68px
  );
  grid-template-columns: repeat(var(--cols), var(--grid-cell));
  gap: clamp(3px, .7vmin, 7px);
  padding: clamp(8px, 1.8vmin, 18px);
}

.multiplication-grid i.row-shade {
  background: #8d8fe6;
}

.multiplication-grid i.column-marker {
  box-shadow:
    inset -4px 0 rgba(53, 44, 140, .18),
    inset 0 -7px rgba(53, 44, 140, .2),
    0 4px 7px rgba(37, 52, 93, .16);
}
```

- [ ] **Step 7: Run behavior and full regression tests**

Run: `node --test tests/app-behavior.test.mjs tests/game-model.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 8: Commit grouped visuals**

```bash
git add src/app-behavior.mjs src/app.mjs styles.css tests/app-behavior.test.mjs
git commit -m "feat: 큰 수 묶음 표현과 세기 힌트 추가"
```

---

### Task 4: Multiplication Result Character and Original Helper

**Files:**
- Create: `assets/characters/multiply-helper.png`
- Modify: `tests/character-assets.test.mjs`
- Modify: `src/app.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `celebrationView(mode, answer)` from Task 3.
- Produces: `multiply-helper.png`, `.multiplication-result`, and `.result-board`.

- [ ] **Step 1: Add a failing mascot asset contract**

Append to `tests/character-assets.test.mjs`:

```js
test("곱셈 도우미 PNG가 충분한 크기와 투명 채널을 가진다", async () => {
  const png = await readFile(
    new URL("../assets/characters/multiply-helper.png", import.meta.url)
  );
  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.ok([4, 6].includes(png[25]), "multiply helper must include alpha");
  assert.ok(png.readUInt32BE(16) >= 512, "multiply helper width");
  assert.ok(png.readUInt32BE(20) >= 512, "multiply helper height");
});
```

- [ ] **Step 2: Run the asset test and verify failure**

Run: `node --test tests/character-assets.test.mjs`

Expected: FAIL with `ENOENT` for `multiply-helper.png`.

- [ ] **Step 3: Generate and clean the original helper asset**

Use the image generation tool with this exact prompt:

```text
Create one original friendly multiplication-helper character for a preschool
math web game. Flat 2D children's TV animation, front-facing full body,
rounded purple 2-by-2 block-shaped body that reads as a single mascot rather
than a number, large warm expressive eyes, small smiling mouth, short flexible
arms and legs, bright golden multiplication-sign emblem centered on the chest,
one hand raised as if it will hold a result sign. Match a colorful soft-edged
block-character ensemble without copying any existing copyrighted character.
No text, no digits, no props, no shadows outside the character. Centered,
generous margin, solid bright green chroma-key background #00FF00, square image.
```

Copy the exact source path returned by the generation tool to
`/tmp/numberblocks-multiply-helper-source.png`, then run:

```bash
python3 "$CODEX_HOME/skills/.system/imagegen/scripts/remove_chroma_key.py" \
  --input /tmp/numberblocks-multiply-helper-source.png \
  --out assets/characters/multiply-helper.png \
  --key-color '#00ff00' \
  --soft-matte \
  --spill-cleanup \
  --force
```

Visually inspect the transparent PNG at original resolution. Regenerate once if the eyes, `×` emblem, limbs, alpha edge, or silhouette are unclear.

- [ ] **Step 4: Render the correct post-answer view**

Import `celebrationView` in `src/app.mjs` and add:

```js
function resultBoard(problem) {
  const board = document.createElement("div");
  board.className = "result-board";
  const equation =
    problem.mode === "mul"
      ? `${problem.operands[0]} × ${problem.operands[1]} = ${problem.answer}`
      : `${problem.operands[0]} + ${problem.operands[1]} = ${problem.answer}`;
  const formula = document.createElement("strong");
  formula.textContent = equation;
  board.append(formula, quantityVisual(problem.answer));
  return board;
}

function multiplicationHelper(problem) {
  const scene = document.createElement("div");
  scene.className = "multiplication-result";
  const image = document.createElement("img");
  image.className = "multiply-helper";
  image.src = "assets/characters/multiply-helper.png";
  image.alt = "곱셈 정답을 축하하는 보라색 곱셈 도우미";
  const sign = document.createElement("strong");
  sign.className = "result-sign";
  sign.textContent =
    `${problem.operands[0]} × ${problem.operands[1]} = ${problem.answer}`;
  scene.append(image, sign);
  return scene;
}

function renderCelebration(problem) {
  const view = celebrationView(problem.mode, problem.answer);
  if (view === "number") {
    dom.stage.replaceChildren(character(problem.answer, "correct"));
  } else if (view === "multiply-helper") {
    dom.stage.replaceChildren(multiplicationHelper(problem));
  } else {
    dom.stage.replaceChildren(resultBoard(problem));
  }
}
```

In `celebrate()`, replace the add-only character replacement with:

```js
renderCelebration(state.problem);
```

- [ ] **Step 5: Style helper, result sign, and reduced motion**

Add to `styles.css`:

```css
.multiplication-result {
  position: relative;
  display: grid;
  grid-template-columns: minmax(180px, 330px) minmax(240px, 420px);
  align-items: center;
  gap: clamp(16px, 3vw, 42px);
}

.multiply-helper {
  width: min(31vw, 330px);
  max-height: 48vh;
  object-fit: contain;
  animation: helper-arrive .62s cubic-bezier(.2, .8, .25, 1.25) both;
}

.result-sign {
  display: grid;
  place-items: center;
  min-height: 150px;
  padding: 24px;
  border: 8px solid #8c5bd4;
  border-radius: 28px;
  color: var(--ink);
  font-family: var(--display-font);
  font-size: clamp(38px, 5vw, 72px);
  background: #fff8c9;
  box-shadow: 0 12px 0 rgba(37, 52, 93, .16);
  transform-origin: left center;
  animation: sign-arrive .58s .18s cubic-bezier(.2, .8, .25, 1.2) both;
}

.result-board {
  display: grid;
  place-items: center;
  gap: 16px;
  width: min(78vw, 860px);
  padding: 22px;
  border: 6px solid #fff;
  border-radius: 28px;
  background: rgba(255, 253, 246, .96);
  box-shadow: 0 12px 0 rgba(37, 52, 93, .14);
}

.result-board > strong {
  font-family: var(--display-font);
  font-size: clamp(38px, 6vw, 76px);
}

@keyframes helper-arrive {
  from { opacity: 0; transform: translateY(24px) scale(.82); }
  70% { transform: translateY(-10px) scale(1.04); }
  to { opacity: 1; transform: none; }
}

@keyframes sign-arrive {
  from { opacity: 0; transform: rotate(-8deg) scale(.72); }
  to { opacity: 1; transform: none; }
}

@media (prefers-reduced-motion: reduce) {
  .multiply-helper,
  .result-sign {
    animation: none;
  }
}
```

- [ ] **Step 6: Run asset and regression tests**

Run: `node --test tests/character-assets.test.mjs tests/app-behavior.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the multiplication helper**

```bash
git add assets/characters/multiply-helper.png src/app.mjs styles.css tests/character-assets.test.mjs
git commit -m "feat: 곱셈 정답 캐릭터와 도우미 추가"
```

---

### Task 5: Natural Korean and English Answers Through 100

**Files:**
- Modify: `scripts/generate_voice_pack.py`
- Modify: `src/audio-manifest.mjs`
- Modify: `tests/voice-assets.test.mjs`
- Modify: `tests/audio-manager.test.mjs`
- Create: `assets/audio/voice/ko/number-11.mp3` through `number-100.mp3`
- Create: `assets/audio/voice/en/number-11.mp3` through `number-100.mp3`

**Interfaces:**
- Preserves: `AudioManager.playAnswer(number)`.
- Produces: `VOICE["number-1"]` through `VOICE["number-100"]`.

- [ ] **Step 1: Expand tests to require 1~100**

Change `tests/voice-assets.test.mjs`:

```js
const ko = [
  "prompt-count", "prompt-add", "prompt-mul",
  ...Array.from({ length: 100 }, (_, i) => `number-${i + 1}`),
  "cheer-1", "cheer-2", "cheer-3", "cheer-4",
  "retry-1", "retry-2", "retry-3"
];
const en = Array.from({ length: 100 }, (_, i) => `number-${i + 1}`);
```

Append to `tests/audio-manager.test.mjs`:

```js
test("100 정답도 한국어 뒤 영어 음성을 재생한다", async () => {
  const { manager, played } = harness();
  await manager.playAnswer(100);
  assert.deepEqual(played, [
    "assets/audio/voice/ko/number-100.mp3",
    "assets/audio/voice/en/number-100.mp3"
  ]);
});
```

- [ ] **Step 2: Run voice tests and verify failure**

Run: `node --test tests/voice-assets.test.mjs tests/audio-manager.test.mjs`

Expected: FAIL because number files and manifest entries above 10 do not exist.

- [ ] **Step 3: Extend deterministic number phrases**

In `scripts/generate_voice_pack.py`, replace the fixed number dictionaries with:

```python
KO_ONES = ["", "일", "이", "삼", "사", "오", "육", "칠", "팔", "구"]
EN_ONES = [
    "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
    "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
    "seventeen", "eighteen", "nineteen",
]
EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]


def korean_number(number):
    if number == 100:
        return "백!"
    tens, ones = divmod(number, 10)
    if tens == 0:
        return f"{KO_ONES[ones]}!"
    prefix = "" if tens == 1 else KO_ONES[tens]
    return f"{prefix}십{KO_ONES[ones]}!"


def english_number(number):
    if number == 100:
        return "One hundred!"
    if number < 20:
        return f"{EN_ONES[number].capitalize()}!"
    tens, ones = divmod(number, 10)
    phrase = EN_TENS[tens] if ones == 0 else f"{EN_TENS[tens]}-{EN_ONES[ones]}"
    return f"{phrase.capitalize()}!"


KO_NUMBERS = {
    f"number-{number}": korean_number(number)
    for number in range(1, 101)
}
EN = {
    f"number-{number}": english_number(number)
    for number in range(1, 101)
}
```

At the top of the existing `render_pack` loop, preserve already approved audio
and make interrupted generation resumable:

```python
for name, text in lines.items():
    target = output / f"{name}.mp3"
    if target.exists() and target.stat().st_size > 1024:
        print(f"skip {target.relative_to(ROOT.parent)}")
        continue
    communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await communicate.save(str(target))
    print(target.relative_to(ROOT.parent))
```

Change `src/audio-manifest.mjs` to:

```js
const numbers = Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => {
    const number = index + 1;
    return [
      `number-${number}`,
      {
        ko: `assets/audio/voice/ko/number-${number}.mp3`,
        en: `assets/audio/voice/en/number-${number}.mp3`
      }
    ];
  })
);
```

- [ ] **Step 4: Request the required network approval before production**

Before running `edge-tts`, ask for explicit approval with this scope:

```text
외부 TTS에 숫자 11~100의 한국어·영어 문구 180개를 전송해 로컬 MP3를 생성합니다.
게임 실행 중 네트워크 연결은 생기지 않으며, 영향 범위는 assets/audio/voice의 새 파일뿐입니다. 진행할까요?
```

Do not install packages. Confirm the already-declared tool is available with:

Run: `python3 -c "from importlib.metadata import version; print(version('edge-tts'))"`

Expected: prints the installed `edge-tts` version.

- [ ] **Step 5: Generate and validate the expanded offline voice pack**

After explicit approval, run:

```bash
python3 scripts/generate_voice_pack.py
```

Expected: exits 0 and writes non-empty Korean and English MP3s through `number-100.mp3`.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/voice-assets.test.mjs tests/audio-manager.test.mjs`

Expected: PASS.

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 7: Commit the voice expansion**

```bash
git add scripts/generate_voice_pack.py src/audio-manifest.mjs tests/voice-assets.test.mjs tests/audio-manager.test.mjs assets/audio/voice
git commit -m "feat: 100까지 한국어 영어 정답 음성 확장"
```

---

### Task 6: Responsive Browser QA and Documentation

**Files:**
- Modify: `styles.css`
- Modify: `docs/superpowers/specs/2026-07-20-numberblocks-difficulty-multiplication-character-design.md`

**Interfaces:**
- Consumes all earlier tasks.
- Produces verified mouse, keyboard, layout, animation, audio, and console behavior.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: every test PASS with zero failures.

- [ ] **Step 2: Start or reuse the private-network development server**

Run:

```bash
python3 -m http.server 4173 --bind 0.0.0.0
```

Expected: serves the project on localhost and the machine's private-network address.

- [ ] **Step 3: Verify the complete desktop flow**

Using the browser at 1280×720 and 1440×900, verify:

1. Click `쉬움`, `차근차근`, and `도전`; reload after each and confirm persistence.
2. Press `4`, `5`, and `6`; confirm difficulty changes without starting a game.
3. Click all enabled game cards and verify keys `1`, `2`, and `3`.
4. In challenge, confirm count is disabled and key `1` only shows the availability message.
5. In steady count, continue until an 11~20 problem appears; wait 4.5 seconds and confirm grouped highlighting.
6. In multiplication, answer `2×3`; confirm character 6 appears only after the correct answer.
7. Answer a multiplication result of 10 or more; confirm helper and full equation appear only after success.
8. Reach or force 10×10; enter `1`, `0`, `0` and confirm no premature wrong state.
9. Toggle mute, return home with `Escape`, and confirm no stale audio or timers continue.
10. Enable reduced motion and confirm helper information remains visible.
11. Confirm the browser console contains no errors and the network panel contains no missing local asset requests.

- [ ] **Step 4: Correct responsive issues with bounded media rules**

If the verified 1280×720 layout needs compaction, add:

```css
@media (max-height: 760px) {
  #home {
    gap: 10px;
    padding-top: 18px;
  }

  .mode-card {
    min-height: 220px;
  }

  .multiplication-result {
    transform: scale(.88);
  }

  .operand-card {
    padding: 10px;
  }
}

@media (max-width: 900px) {
  .difficulty-picker {
    flex-wrap: wrap;
    justify-content: center;
    border-radius: 24px;
  }

  .multiplication-result {
    grid-template-columns: 1fr;
    justify-items: center;
  }
}
```

Re-run the two target viewports after applying only the rules proven necessary by browser inspection.

- [ ] **Step 5: Mark the approved spec implemented**

Change the spec status to:

```markdown
상태: 구현 및 검증 완료
```

Append:

```markdown
## 11. 구현 결과

- 공통 난이도 선택과 저장을 적용했다.
- 숫자 세기 묶음 힌트와 큰 수 화면 표현을 적용했다.
- 곱셈 정답 캐릭터와 10 이상 전용 도우미를 적용했다.
- 1~100 한국어·영어 정답 음성을 오프라인 자산으로 적용했다.
- 자동 테스트와 1280×720, 1440×900 브라우저 검증을 통과했다.
```

- [ ] **Step 6: Run final verification and inspect the diff**

Run: `npm test`

Expected: all tests PASS.

Run: `git diff --check`

Expected: no output.

Run: `git status --short`

Expected: only the intended Task 6 documentation or responsive CSS files are modified.

- [ ] **Step 7: Commit final QA documentation**

```bash
git add styles.css docs/superpowers/specs/2026-07-20-numberblocks-difficulty-multiplication-character-design.md
git commit -m "docs: 난이도와 곱셈 확장 검증 완료"
```
