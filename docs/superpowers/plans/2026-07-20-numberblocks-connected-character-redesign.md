# Connected Number Characters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the existing 1–10 characters, rebuild 11–100 as connected reference-guided characters with normalized visual size, and show both operand characters above the equation in addition and multiplication.

**Architecture:** A single asset-routing function chooses legacy files for 1–10 and generated files for 11–100. A focused reference-design catalog supplies connected cell coordinates and visual regions to the SVG renderer, which regenerates only 11–100. The app renders a shared two-operand scene for addition and multiplication, while count mode and all audio/game logic remain unchanged.

**Tech Stack:** Browser-native ES modules, DOM/CSS, Node.js test runner, SVG generation, macOS `sips` PNG rasterization.

## Global Constraints

- Existing `one.png` through `ten.png` remain the runtime assets for 1–10.
- Characters 11–100 must contain exactly their number of cells.
- Every 11–100 body must form one connected component with no visual gap between adjacent cells.
- Character silhouettes, color bands, accessories, and face positions use the user-provided [1–100 reference artwork](https://www.deviantart.com/angrycreeper123/art/My-fanmade-numberblocks-from-1-100-1054381704) as design guidance; the external artwork itself is not bundled or cropped into the app.
- Character 38 uses the approved `3 + 7×5` connected layout, pink cap, thin pink belt, yellow body, and low face placement.
- Visible character bounds are normalized into a shared safe area while preserving each silhouette’s aspect ratio.
- Addition and multiplication show two character operands with the equation beneath them.
- Count mode dots/hints, difficulty limits, problem generation, answer input, Korean/English voice, and sound effects do not change.
- No new runtime dependencies.

---

### Task 1: Route 1–10 to the existing character files

**Files:**
- Modify: `src/character-spec.mjs`
- Modify: `src/game-model.mjs`
- Modify: `index.html`
- Modify: `tests/character-spec.test.mjs`
- Modify: `tests/character-assets.test.mjs`
- Modify: `tests/app-contract.test.mjs`

**Interfaces:**
- Produces: `characterAsset(number: number): string`, returning legacy names for 1–10 and `number-NNN.png` for 11–100.
- Consumes: Existing `NUMBERBLOCKS[number].asset` calls in `src/app.mjs`.

- [ ] **Step 1: Write failing asset-routing tests**

Replace the filename test in `tests/character-spec.test.mjs` with:

```js
test("1~10은 기존 자산, 11~100은 숫자 자산을 사용한다", () => {
  assert.equal(characterAsset(1), "one.png");
  assert.equal(characterAsset(6), "six.png");
  assert.equal(characterAsset(10), "ten.png");
  assert.equal(characterAsset(11), "number-011.png");
  assert.equal(characterAsset(38), "number-038.png");
  assert.equal(characterAsset(100), "number-100.png");
  assert.throws(() => characterAsset(0), RangeError);
});
```

Update `tests/character-assets.test.mjs` so the existing 1–10 assets are checked without imposing the generated pack’s 1024×1536 contract:

```js
test("1~10 기존 캐릭터 PNG가 존재한다", async () => {
  for (let number = 1; number <= 10; number += 1) {
    const asset = characterAsset(number);
    const png = await readFile(
      new URL(`../assets/characters/${asset}`, import.meta.url)
    );
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
  }
});

test("11~100 연결형 캐릭터 PNG가 고해상도 RGBA로 존재한다", async () => {
  for (let number = 11; number <= 100; number += 1) {
    const asset = characterAsset(number);
    const png = await readFile(
      new URL(`../assets/characters/${asset}`, import.meta.url)
    );
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
    assert.equal(png[25], 6, `${asset} must be RGBA`);
    assert.equal(png.readUInt32BE(16), 1024, `${asset} width`);
    assert.equal(png.readUInt32BE(20), 1536, `${asset} height`);
  }
});
```

Update the home-card expectations in `tests/app-contract.test.mjs`:

```js
assert.match(html, /assets\/characters\/one\.png/);
assert.match(html, /assets\/characters\/three\.png/);
assert.match(html, /assets\/characters\/four\.png/);
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run:

```bash
node --test tests/character-spec.test.mjs tests/character-assets.test.mjs tests/app-contract.test.mjs
```

Expected: FAIL because `characterAsset(1)` still returns `number-001.png` and `index.html` still references numbered home assets.

- [ ] **Step 3: Implement the legacy asset map**

Add to `src/character-spec.mjs`:

```js
const LEGACY_ASSETS = Object.freeze([
  "",
  "one.png",
  "two.png",
  "three.png",
  "four.png",
  "five.png",
  "six.png",
  "seven.png",
  "eight.png",
  "nine.png",
  "ten.png"
]);

export function characterAsset(number) {
  assertNumber(number);
  if (number <= 10) return LEGACY_ASSETS[number];
  return `number-${String(number).padStart(3, "0")}.png`;
}
```

Change the three mode-card image paths in `index.html` to:

```html
<img src="assets/characters/one.png" alt="">
<img src="assets/characters/three.png" alt="">
<img src="assets/characters/four.png" alt="">
```

No special case is required in `src/game-model.mjs`; verify that its existing `asset: characterAsset(number)` call now supplies the routed names.

- [ ] **Step 4: Run the focused tests**

Run:

```bash
node --test tests/character-spec.test.mjs tests/character-assets.test.mjs tests/app-contract.test.mjs
```

Expected: all focused tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/character-spec.mjs src/game-model.mjs index.html \
  tests/character-spec.test.mjs tests/character-assets.test.mjs \
  tests/app-contract.test.mjs
git commit -m "fix: 1부터 10 기존 캐릭터 복원"
```

---

### Task 2: Define the connected reference-design catalog for 11–100

**Files:**
- Create: `src/character-designs.mjs`
- Modify: `src/character-spec.mjs`
- Modify: `tests/character-spec.test.mjs`

**Interfaces:**
- Produces: `referenceDesign(number: number): { rows, regions, face, accessory }`.
- Produces: `buildCharacterSpec(number)` with `cells`, `regions`, `face`, `accessory`, and `canvas.grid`.
- Consumes: The renderer in Task 3.

- [ ] **Step 1: Write failing catalog completeness and connectivity tests**

Add these helpers and tests to `tests/character-spec.test.mjs`:

```js
function connectedCellCount(cells) {
  const keys = new Set(cells.map(({ x, y }) => `${x}:${y}`));
  const first = cells[0];
  const queue = [first];
  const seen = new Set([`${first.x}:${first.y}`]);

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx}:${y + dy}`;
      if (keys.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push({ x: x + dx, y: y + dy });
      }
    }
  }

  return seen.size;
}

test("11~100은 완전한 참고 디자인과 연결된 몸체를 가진다", () => {
  for (let number = 11; number <= 100; number += 1) {
    const spec = buildCharacterSpec(number);
    assert.equal(spec.source, "reference");
    assert.equal(spec.cells.length, number);
    assert.equal(connectedCellCount(spec.cells), number);
    assert.ok(spec.regions.length > 0, `${number} regions`);
    assert.ok(Number.isFinite(spec.face.x), `${number} face.x`);
    assert.ok(Number.isFinite(spec.face.y), `${number} face.y`);
  }
});

test("38은 승인된 연결 구조와 색 영역을 사용한다", () => {
  const spec = buildCharacterSpec(38);
  const widths = Array.from(
    { length: spec.canvas.grid[1] },
    (_, y) => spec.cells.filter(cell => cell.y === y).length
  );
  assert.deepEqual(widths, [3, 5, 5, 5, 5, 5, 5, 5]);
  assert.equal(spec.canvas.grid[0], 5);
  assert.equal(spec.regions.find(region => region.id === "cap").rows, 2);
  assert.equal(spec.regions.find(region => region.id === "belt").afterRow, 4);
  assert.ok(spec.face.y >= 5);
});
```

Replace the obsolete assertion that 11 uses `[1, 11]`; it conflicts with the approved compact reference-directed catalog.

- [ ] **Step 2: Run the focused test and verify failure**

Run:

```bash
node --test tests/character-spec.test.mjs
```

Expected: FAIL because `source`, `regions`, and `face` do not exist and the current 38 rows do not match the approved design.

- [ ] **Step 3: Create the focused design-catalog module**

Create `src/character-designs.mjs` around this exact data contract:

```js
function row(width, offset = 0) {
  return Object.freeze({ width, offset });
}

const DESIGNS = new Map([
  [38, Object.freeze({
    rows: Object.freeze([
      row(3, 1),
      row(5),
      row(5),
      row(5),
      row(5),
      row(5),
      row(5),
      row(5)
    ]),
    regions: Object.freeze([
      Object.freeze({ id: "cap", rows: 2, color: "#f23dcd" }),
      Object.freeze({ id: "body", color: "#fff38b" }),
      Object.freeze({
        id: "belt",
        afterRow: 4,
        color: "#d736b6"
      })
    ]),
    face: Object.freeze({ x: 2, y: 6, scale: 1 }),
    accessory: null
  })]
]);
```

Populate `DESIGNS` with one explicit entry for every integer 11–100 while inspecting the supplied 2000×2000 reference artwork. Each entry must:

- use `rows` whose widths sum to the number;
- keep adjacent rows horizontally overlapping so the body is connected;
- encode the reference silhouette with row widths and offsets;
- encode the dominant base color plus visible cap, side stripe, rainbow band, belt, crown, glasses, or step motif in `regions` and `accessory`;
- place `face` at the same relative vertical region as the reference;
- avoid a generic fallback, so a missing number fails immediately.

Export a strict accessor:

```js
export function referenceDesign(number) {
  const design = DESIGNS.get(number);
  if (!design) {
    throw new RangeError(`missing reference design for ${number}`);
  }
  return design;
}
```

This task is complete only when `DESIGNS.size === 90`; the completeness test prevents partial catalog work from being accepted.

- [ ] **Step 4: Convert catalog rows to cells in `buildCharacterSpec`**

Update `src/character-spec.mjs`:

```js
import { referenceDesign } from "./character-designs.mjs";

function cellsFromRows(rows) {
  return rows.flatMap(({ width, offset }, y) =>
    Array.from({ length: width }, (_, index) => ({
      x: offset + index,
      y
    }))
  );
}

function boundsFor(cells) {
  return {
    cols: Math.max(...cells.map(cell => cell.x)) + 1,
    rows: Math.max(...cells.map(cell => cell.y)) + 1
  };
}
```

For 11–100, return:

```js
const design = referenceDesign(number);
const cells = cellsFromRows(design.rows);
const bounds = boundsFor(cells);

return Object.freeze({
  number,
  source: "reference",
  cells: Object.freeze(cells),
  regions: design.regions,
  face: design.face,
  accessory: design.accessory,
  canvas: Object.freeze({
    grid: Object.freeze([bounds.cols, bounds.rows]),
    width: 1024,
    height: 1536
  })
});
```

Keep a metadata-only specification for 1–10 so `NUMBERBLOCKS` still exposes `rows` and `cols`, but do not feed those specs to the generated renderer.

- [ ] **Step 5: Run the spec tests**

Run:

```bash
node --test tests/character-spec.test.mjs tests/game-model.test.mjs
```

Expected: all tests PASS, including 90 catalog entries, exact cell counts, and connected bodies.

- [ ] **Step 6: Commit**

```bash
git add src/character-designs.mjs src/character-spec.mjs \
  tests/character-spec.test.mjs
git commit -m "feat: 11부터 100 연결형 캐릭터 설계 추가"
```

---

### Task 3: Render connected, size-normalized 11–100 PNGs

**Files:**
- Modify: `scripts/render_character_pack.mjs`
- Modify: `package.json`
- Modify: `tests/character-renderer.test.mjs`
- Modify: `tests/character-assets.test.mjs`
- Regenerate: `assets/characters/number-011.png` through `assets/characters/number-100.png`

**Interfaces:**
- Consumes: `buildCharacterSpec(number)` from Task 2.
- Produces: `renderCharacterSvg(spec): string`.
- Produces: 90 RGBA PNG files at 1024×1536.

- [ ] **Step 1: Write failing renderer-contract tests**

Replace the renderer tests with:

```js
test("연결형 렌더러는 11~100의 모든 셀을 빈틈없이 출력한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(38));
  assert.match(svg, /viewBox="0 0 1024 1536"/);
  assert.equal((svg.match(/data-cell=/g) ?? []).length, 38);
  assert.match(svg, /data-cell-gap="0"/);
  assert.doesNotMatch(svg, /id="blockFill"/);
  assert.match(svg, /aria-label="숫자 38 블록 캐릭터"/);
});

test("38의 분홍 머리와 허리띠가 별도 레이어로 존재한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(38));
  assert.match(svg, /id="region-cap"/);
  assert.match(svg, /id="region-belt"/);
  assert.match(svg, /id="face"/);
  assert.match(svg, /id="limbs"/);
});

test("서로 다른 비율도 같은 안전 영역에 맞춘다", () => {
  for (const number of [11, 38, 50, 72, 99, 100]) {
    const svg = renderCharacterSvg(buildCharacterSpec(number));
    assert.match(svg, /data-safe-fill="0\.(82|83|84|85|86|87|88)"/);
  }
});
```

- [ ] **Step 2: Run the renderer test and verify failure**

Run:

```bash
node --test tests/character-renderer.test.mjs
```

Expected: FAIL because the current renderer uses rounded inset rectangles, gradients, and gap values.

- [ ] **Step 3: Replace block layout with connected-cell geometry**

Change `fitGrid(spec)` so the body’s longest axis fills 82–88% of a common safe region and every cell uses the same `step` as its width and height:

```js
const SAFE = Object.freeze({
  left: 120,
  right: 904,
  top: 190,
  bottom: 1240
});

function fitGrid(spec) {
  const [cols, rows] = spec.canvas.grid;
  const safeWidth = SAFE.right - SAFE.left;
  const safeHeight = SAFE.bottom - SAFE.top;
  const cell = Math.floor(
    Math.min(safeWidth / cols, safeHeight / rows) * .86
  );
  const bodyWidth = cols * cell;
  const bodyHeight = rows * cell;
  return {
    cols,
    rows,
    cell,
    step: cell,
    gap: 0,
    bodyWidth,
    bodyHeight,
    left: Math.round((1024 - bodyWidth) / 2),
    top: Math.round(
      SAFE.top + (safeHeight - bodyHeight) / 2
    ),
    safeFill: Math.max(bodyWidth / safeWidth, bodyHeight / safeHeight)
  };
}
```

Render each cell with no inset and no rounded gap:

```js
function blockMarkup(spec, cell, index, layout) {
  const x = layout.left + cell.x * layout.step;
  const y = layout.top + cell.y * layout.step;
  const fill = fillForCell(spec, cell);
  return `
    <rect data-cell="${index + 1}" x="${x}" y="${y}"
      width="${layout.cell}" height="${layout.cell}"
      fill="${fill}" stroke="#7f7832"
      stroke-width="${Math.max(2, Math.round(layout.cell * .025))}"/>`;
}
```

The root body group must include:

```html
<g id="body" data-cell-gap="0" data-safe-fill="...">
```

Remove the per-cell highlight and `blockFill`/`accentFill` gradients. A single subtle whole-character drop shadow is permitted; individual cells must not appear separated or newly 3D.

- [ ] **Step 4: Render regions, face, limbs, and accessories from catalog data**

Implement `fillForCell(spec, cell)` so region order selects cap, body, side stripes, and rainbow cells without changing geometry. Render belt-type regions as a thin overlay at `afterRow`, spanning the occupied row bounds.

Place the face from `spec.face` in grid coordinates:

```js
const centerX = layout.left + (spec.face.x + .5) * layout.cell;
const centerY = layout.top + (spec.face.y + .5) * layout.cell;
```

Clamp eye and mouth sizes to remain readable:

```js
const eyeRadius = Math.max(24, Math.min(58, layout.cell * .28));
const mouthWidth = Math.max(58, Math.min(132, layout.cell * .9));
```

Keep `id="face"`, `id="limbs"`, and one group per named region so the tests can verify layer structure.

- [ ] **Step 5: Limit the CLI to generated assets**

Change the default range in `scripts/render_character_pack.mjs` and the package script:

```js
const from = Number(fromIndex >= 0 ? argv[fromIndex + 1] : 11);
```

```json
"render:characters": "node scripts/render_character_pack.mjs --from 11 --to 100"
```

Reject `--from` values below 11 so the renderer cannot overwrite legacy 1–10 files accidentally.

- [ ] **Step 6: Run tests, render the pack, and verify assets**

Run:

```bash
node --test tests/character-renderer.test.mjs tests/character-spec.test.mjs
npm run render:characters
node --test tests/character-assets.test.mjs
```

Expected:

- renderer/spec tests PASS;
- output lists `number-011.png` through `number-100.png`;
- asset test reports 90 high-resolution RGBA PNGs and PASS.

- [ ] **Step 7: Inspect representative contact sheets**

Create a temporary contact sheet outside the repository containing:

- 11, 12, 17, 20, 38
- 50, 64, 72, 81, 90, 99, 100

Verify:

- no cell gaps;
- no clipped limbs or accessories;
- faces remain readable;
- 38 matches the approved attached silhouette;
- wide, tall, square, and stepped characters occupy comparable visual bounds.

If a representative fails, change its catalog record, regenerate only that range, and rerun the focused tests before committing.

- [ ] **Step 8: Commit**

```bash
git add scripts/render_character_pack.mjs package.json \
  tests/character-renderer.test.mjs tests/character-assets.test.mjs \
  assets/characters/number-0*.png assets/characters/number-100.png
git commit -m "feat: 11부터 100 연결형 캐릭터 이미지 제작"
```

---

### Task 4: Show two operand characters and the equation

**Files:**
- Create: `src/problem-scene.mjs`
- Modify: `src/app.mjs`
- Modify: `styles.css`
- Create: `tests/problem-scene.test.mjs`
- Modify: `tests/app-contract.test.mjs`

**Interfaces:**
- Produces: `equationText(problem): string`.
- Produces: `operandScene(document, problem, createCharacter): HTMLElement`.
- Consumes: `character(number)` from `src/app.mjs`.

- [ ] **Step 1: Write failing scene-unit tests**

Create `tests/problem-scene.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { equationText } from "../src/problem-scene.mjs";

test("더하기와 곱셈 식을 화면용 기호로 만든다", () => {
  assert.equal(
    equationText({ mode: "add", operands: [6, 38] }),
    "6 + 38"
  );
  assert.equal(
    equationText({ mode: "mul", operands: [6, 8] }),
    "6 × 8"
  );
});

test("숫자 세기는 피연산자 장면을 만들지 않는다", () => {
  assert.throws(
    () => equationText({ mode: "count", answer: 6 }),
    TypeError
  );
});
```

Add static-contract expectations to `tests/app-contract.test.mjs`:

```js
assert.match(css, /\.operand-scene\s*\{/);
assert.match(css, /\.operand-slot\s*\{/);
assert.match(css, /\.equation-label\s*\{/);
assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/);
```

- [ ] **Step 2: Run the scene tests and verify failure**

Run:

```bash
node --test tests/problem-scene.test.mjs tests/app-contract.test.mjs
```

Expected: FAIL because `src/problem-scene.mjs` and the new CSS classes do not exist.

- [ ] **Step 3: Implement the shared operand scene**

Create `src/problem-scene.mjs`:

```js
export function equationText(problem) {
  if (!["add", "mul"].includes(problem.mode)) {
    throw new TypeError("operand scene requires add or mul mode");
  }
  const operator = problem.mode === "mul" ? "×" : "+";
  return `${problem.operands[0]} ${operator} ${problem.operands[1]}`;
}

export function operandScene(document, problem, createCharacter) {
  const scene = document.createElement("div");
  scene.className = "operand-scene";

  const friends = document.createElement("div");
  friends.className = "operand-friends";

  const left = document.createElement("div");
  left.className = "operand-slot";
  left.append(createCharacter(problem.operands[0], "operand-character"));

  const operator = document.createElement("span");
  operator.className = "operator";
  operator.textContent = problem.mode === "mul" ? "×" : "+";
  operator.setAttribute("aria-hidden", "true");

  const right = document.createElement("div");
  right.className = "operand-slot";
  right.append(createCharacter(problem.operands[1], "operand-character"));

  const label = document.createElement("strong");
  label.className = "equation-label";
  label.textContent = equationText(problem);

  friends.append(left, operator, right);
  scene.append(friends, label);
  return scene;
}
```

- [ ] **Step 4: Use the shared scene for both modes**

Import `operandScene` in `src/app.mjs`.

Delete `operandVisual`, the addition-specific append block, and the multiplication grid/caption construction. Replace the non-count branches in `renderProblem` with:

```js
dom.problem.textContent = formatProblemText(problem);
dom.stage.append(
  operandScene(document, problem, character)
);
```

Keep `quantityVisual` because count mode, result fallback, and hints still use it.

Add one-shot image fallback in `operandScene` through an optional error handler supplied by `src/app.mjs`, or attach it immediately after scene creation. A failed operand must be replaced by:

```html
<strong class="operand-fallback">38</strong>
```

The fallback must not replace the other operand or stop the round.

- [ ] **Step 5: Add equal-slot responsive CSS**

Add:

```css
.operand-scene {
  display: grid;
  grid-template-rows: minmax(0, 1fr) auto;
  width: min(94%, 980px);
  height: min(78vh, 560px);
}

.operand-friends {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(8px, 2vw, 28px);
  min-height: 0;
}

.operand-slot {
  display: grid;
  place-items: center;
  min-width: 0;
  height: 100%;
}

.operand-character {
  width: min(100%, 330px);
  height: min(42vh, 330px);
  object-fit: contain;
}

.equation-label {
  justify-self: center;
  color: var(--ink);
  font-family: var(--display-font);
  font-size: clamp(34px, 5vw, 62px);
  font-weight: 900;
  line-height: 1;
}
```

On narrow screens, retain the three-column character/operator layout but reduce the character height and operator font size; do not stack operands vertically because the equation relationship becomes harder to scan.

Remove or leave unused only after confirming no selectors depend on `.operand-card`, `.multiplication-scene`, `.multiplication-grid`, and `.multiplication-caption`. Prefer deleting the dead CSS in the same commit.

- [ ] **Step 6: Run focused and full automated tests**

Run:

```bash
node --test tests/problem-scene.test.mjs tests/app-contract.test.mjs
npm test
```

Expected: focused tests PASS and the full suite reports zero failures.

- [ ] **Step 7: Commit**

```bash
git add src/problem-scene.mjs src/app.mjs styles.css \
  tests/problem-scene.test.mjs tests/app-contract.test.mjs
git commit -m "feat: 더하기와 곱셈에 두 블록 친구 표시"
```

---

### Task 5: Browser QA and final regression verification

**Files:**
- Modify: `src/character-designs.mjs`
- Modify: `styles.css`
- Modify: `src/app.mjs`
- Modify: `docs/superpowers/specs/2026-07-20-numberblocks-connected-character-redesign-design.md`

**Interfaces:**
- Consumes: Completed character pack and operand scene.
- Produces: Verified behavior at desktop and narrow viewport sizes.

- [ ] **Step 1: Run the full suite from a clean state**

Run:

```bash
npm test
git diff --check
```

Expected: all tests PASS, zero whitespace errors.

- [ ] **Step 2: Verify addition in the browser**

At 1280×720, force or play until a problem such as `6 + 38` appears.

Verify:

- 6 uses `six.png`;
- 38 uses the new connected `number-038.png`;
- both occupy similar visual slots;
- 38 shows the 3-wide cap, 5-wide body, pink belt, and low face;
- the operator is centered between characters;
- `6 + 38` is readable below;
- there are no numeric quantity cards.

- [ ] **Step 3: Verify multiplication in the browser**

Play a problem such as `6 × 8`.

Verify:

- both operands are character images;
- `6 × 8` appears below;
- the old multiplication grid is absent;
- keyboard input, retry, correct answer, Korean voice, and English voice still work.

- [ ] **Step 4: Verify representative answers and responsive layout**

Check correct-answer celebrations for 10, 11, 20, 38, 50, 72, 99, and 100.

Repeat addition/multiplication checks at a narrow viewport around 390×844.

Verify:

- no clipping or overlap;
- faces remain visible;
- character size differences are not visually jarring;
- the equation remains on one line;
- console errors are zero;
- server requests contain no missing character assets.

- [ ] **Step 5: Apply only evidence-backed QA fixes**

If QA finds a catalog-specific silhouette issue, modify only that number’s record and regenerate only the affected range:

```bash
node scripts/render_character_pack.mjs --from 38 --to 38
```

If QA finds scene sizing issues, modify only `.operand-scene`, `.operand-slot`, `.operand-character`, or responsive rules. Rerun the focused tests and `npm test` after every fix.

- [ ] **Step 6: Record verification and commit**

Append a short verification section to the design spec with:

- automated test count;
- representative character numbers checked;
- desktop and narrow viewport sizes;
- console/network error count.

Then:

```bash
git add docs/superpowers/specs/2026-07-20-numberblocks-connected-character-redesign-design.md \
  src/character-designs.mjs src/app.mjs styles.css assets/characters
git commit -m "docs: 연결형 캐릭터 재설계 검증 완료"
```
