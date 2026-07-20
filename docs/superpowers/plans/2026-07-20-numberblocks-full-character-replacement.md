# Numberblocks 1~100 Full Character Replacement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every result character from 1 through 100 with a cohesive, high-resolution transparent PNG while preserving the approved audio and game mechanics.

**Architecture:** A deterministic character specification module owns each number's exact block geometry, decade palette, pose, and asset name. A dependency-free Node renderer converts those specifications into shaded SVG scenes and uses the already-installed `ffmpeg` binary to rasterize transparent PNGs; the app lazily loads the matching result character and falls back to the existing result board on image failure.

**Tech Stack:** Browser-native ES modules, Node.js test runner, SVG, PNG, installed `ffmpeg`, HTML/CSS.

## Global Constraints

- Replace the full 1~100 character set, including the existing 1~10 images.
- Preserve Korean/English voice assets, audio order, SFX ducking, difficulty limits, problem generation, hints, score flow, and PC keyboard controls.
- Every body must contain exactly the number of visible block cells represented by the character.
- Final assets are high-resolution RGBA PNG files with fully transparent outer backgrounds.
- All three modes show the answer character only after a correct answer.
- Missing or failed images must fall back to the current formula/quantity result board.
- Do not add a new package or network runtime dependency.

---

### Task 1: Define Exact 1~100 Character Geometry

**Files:**
- Create: `src/character-spec.mjs`
- Create: `tests/character-spec.test.mjs`

**Interfaces:**
- Produces: `characterAsset(number: number): string`
- Produces: `buildCharacterSpec(number: number): { number, cells, palette, pose, accessory, canvas }`
- `cells` is an array of unique `{ x, y }` integer coordinates whose length equals `number`.

- [ ] **Step 1: Write the failing specification tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCharacterSpec,
  characterAsset
} from "../src/character-spec.mjs";

test("1~100은 정확한 수의 겹치지 않는 블록 좌표를 가진다", () => {
  for (let number = 1; number <= 100; number += 1) {
    const { cells } = buildCharacterSpec(number);
    assert.equal(cells.length, number);
    assert.equal(
      new Set(cells.map(({ x, y }) => `${x}:${y}`)).size,
      number
    );
  }
});

test("대표 합성수는 읽기 쉬운 직사각형 몸체를 사용한다", () => {
  assert.deepEqual(buildCharacterSpec(12).canvas.grid, [3, 4]);
  assert.deepEqual(buildCharacterSpec(25).canvas.grid, [5, 5]);
  assert.deepEqual(buildCharacterSpec(36).canvas.grid, [6, 6]);
  assert.deepEqual(buildCharacterSpec(100).canvas.grid, [10, 10]);
});

test("캐릭터 파일 이름은 숫자 기반으로 안정적이다", () => {
  assert.equal(characterAsset(1), "number-001.png");
  assert.equal(characterAsset(100), "number-100.png");
  assert.throws(() => characterAsset(0), RangeError);
});
```

- [ ] **Step 2: Run the tests and verify the module is missing**

Run: `node --test tests/character-spec.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement geometry, palette, pose, and naming**

```js
const DECADE_PALETTES = [
  ["#ef2b2d", "#b91522"],
  ["#fff9ef", "#e6272f"],
  ["#edae4b", "#b86c23"],
  ["#f2da42", "#b89d19"],
  ["#5acb69", "#238b45"],
  ["#57c7dc", "#2388aa"],
  ["#7755c6", "#432989"],
  ["#8158cb", "#513199"],
  ["#e95aa8", "#a62b72"],
  ["#818b93", "#4b555e"],
  ["#f06461", "#b92e31"]
];

const FACTOR_PREFERENCES = new Map([
  [12, [3, 4]], [20, [4, 5]], [25, [5, 5]], [36, [6, 6]],
  [48, [6, 8]], [64, [8, 8]], [81, [9, 9]], [100, [10, 10]]
]);

function assertNumber(number) {
  if (!Number.isInteger(number) || number < 1 || number > 100) {
    throw new RangeError("character number must be between 1 and 100");
  }
}

function closestGrid(number) {
  if (FACTOR_PREFERENCES.has(number)) return FACTOR_PREFERENCES.get(number);
  for (let rows = Math.floor(Math.sqrt(number)); rows >= 2; rows -= 1) {
    if (number % rows === 0) return [number / rows, rows];
  }
  const cols = Math.ceil(Math.sqrt(number));
  return [cols, Math.ceil(number / cols)];
}

export function characterAsset(number) {
  assertNumber(number);
  return `number-${String(number).padStart(3, "0")}.png`;
}

export function buildCharacterSpec(number) {
  assertNumber(number);
  const [cols, rows] = closestGrid(number);
  const cells = Array.from({ length: number }, (_, index) => ({
    x: index % cols,
    y: Math.floor(index / cols)
  }));
  const decade = Math.min(10, Math.floor(number / 10));
  return {
    number,
    cells,
    palette: DECADE_PALETTES[decade],
    pose: number % 4,
    accessory: number % 10,
    canvas: { grid: [cols, rows], width: 1024, height: 1536 }
  };
}
```

- [ ] **Step 4: Run the specification tests**

Run: `node --test tests/character-spec.test.mjs`  
Expected: 3 tests pass.

- [ ] **Step 5: Commit the geometry layer**

```bash
git add src/character-spec.mjs tests/character-spec.test.mjs
git commit -m "feat: 1부터 100 캐릭터 배열 정의"
```

### Task 2: Build the High-Resolution Character Renderer

**Files:**
- Create: `scripts/render_character_pack.mjs`
- Create: `tests/character-renderer.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes: `buildCharacterSpec(number)` and `characterAsset(number)`.
- Produces: `renderCharacterSvg(spec): string`.
- CLI: `node scripts/render_character_pack.mjs --from 1 --to 20`.

- [ ] **Step 1: Generate and inspect a visual style anchor**

Use the built-in image-generation tool with the user-provided 1~100 chart as the number-shape reference and `assets/characters/ten.png` as the current rendering-quality reference. Generate one polished 12-block character on a flat chroma-key background, remove the key locally, and save the reviewed output as `docs/superpowers/specs/assets/character-style-anchor-12.png`.

The prompt must require: exactly twelve visible rounded blocks in a 3×4 body, warm white faces with red outlines, large reflective cartoon eyes, smiling mouth with teeth and tongue, red arms and legs, soft 3D highlights, no text, no extra blocks, no watermark, and generous padding.

Inspect the result for exactly 12 blocks and transparent corners. This file is a rendering reference, not a runtime asset, so the deterministic renderer remains authoritative for cell count.

- [ ] **Step 2: Write failing renderer contract tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterSpec } from "../src/character-spec.mjs";
import { renderCharacterSvg } from "../scripts/render_character_pack.mjs";

test("렌더러는 투명 캔버스와 모든 블록을 출력한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(17));
  assert.match(svg, /viewBox="0 0 1024 1536"/);
  assert.equal((svg.match(/data-cell=/g) ?? []).length, 17);
  assert.match(svg, /radialGradient/);
  assert.match(svg, /aria-label="숫자 17 블록 캐릭터"/);
});

test("얼굴과 팔다리가 몸체와 별도 레이어로 존재한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(100));
  assert.match(svg, /id="face"/);
  assert.match(svg, /id="limbs"/);
  assert.match(svg, /id="body"/);
});
```

- [ ] **Step 3: Run the tests and verify the renderer is missing**

Run: `node --test tests/character-renderer.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 4: Implement the SVG renderer and PNG CLI**

Implement `renderCharacterSvg` with:

```js
export function renderCharacterSvg(spec) {
  const layout = fitGrid(spec);
  const blocks = spec.cells.map((cell, index) =>
    blockMarkup(cell, index, layout, spec.palette)
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1024 1536"
    role="img" aria-label="숫자 ${spec.number} 블록 캐릭터">
    ${definitions(spec)}
    <g id="limbs">${limbMarkup(spec, layout)}</g>
    <g id="body">${blocks}</g>
    <g id="face">${faceMarkup(spec, layout)}</g>
    ${accessoryMarkup(spec, layout)}
  </svg>`;
}
```

The CLI must parse `--from` and `--to`, write SVG to a temporary directory, and invoke the installed binary without a shell:

```js
await execFile("ffmpeg", [
  "-loglevel", "error", "-y",
  "-i", svgPath,
  "-vf", "scale=1024:1536:flags=lanczos",
  outputPath
]);
```

Use SVG gradients, edge highlights, eye reflections, teeth, tongue, and soft body shadows. Keep the SVG root background empty so PNG corners remain transparent.

- [ ] **Step 5: Add the reproducible render command**

```json
{
  "scripts": {
    "render:characters": "node scripts/render_character_pack.mjs --from 1 --to 100"
  }
}
```

- [ ] **Step 6: Run renderer contract tests**

Run: `node --test tests/character-renderer.test.mjs`  
Expected: 2 tests pass.

- [ ] **Step 7: Commit the rendering pipeline and style anchor**

```bash
git add scripts/render_character_pack.mjs tests/character-renderer.test.mjs package.json \
  docs/superpowers/specs/assets/character-style-anchor-12.png
git commit -m "feat: 고해상도 캐릭터 렌더러 추가"
```

### Task 3: Produce and Review the 1~20 Character Set

**Files:**
- Create: `assets/characters/number-001.png` through `assets/characters/number-020.png`
- Modify: `tests/character-assets.test.mjs`

**Interfaces:**
- Consumes: character renderer CLI.
- Produces: first visually reviewed batch of RGBA PNG assets.

- [ ] **Step 1: Expand the asset test to require 1~20**

```js
test("1~20 캐릭터 PNG가 고해상도 RGBA로 존재한다", async () => {
  for (let number = 1; number <= 20; number += 1) {
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

- [ ] **Step 2: Run the test and verify the new files are absent**

Run: `node --test tests/character-assets.test.mjs`  
Expected: FAIL with `ENOENT` for `number-001.png`.

- [ ] **Step 3: Generate the first batch**

Run: `node scripts/render_character_pack.mjs --from 1 --to 20`  
Expected: 20 PNG files written.

- [ ] **Step 4: Run the asset tests**

Run: `node --test tests/character-assets.test.mjs`  
Expected: all asset tests pass.

- [ ] **Step 5: Review representative images**

Inspect `number-001.png`, `number-006.png`, `number-010.png`, `number-011.png`, `number-012.png`, `number-017.png`, and `number-020.png`. Verify transparent corners, exact visible cells, readable face, non-clipped limbs, and decade colors. Make only renderer-level corrections so the full set stays coherent.

- [ ] **Step 6: Commit the first character batch**

```bash
git add assets/characters/number-0{01..20}.png tests/character-assets.test.mjs
git commit -m "feat: 1부터 20 새 캐릭터 이미지 추가"
```

### Task 4: Connect All Correct Answers to Character Assets

**Files:**
- Modify: `src/game-model.mjs`
- Modify: `src/app-behavior.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/app-behavior.test.mjs`
- Modify: `tests/game-model.test.mjs`

**Interfaces:**
- Consumes: `characterAsset(number)`.
- Produces: `celebrationView(mode, answer)` returning `"number"` for 1~100.
- Produces: `answerCharacter(problem)` that installs a one-shot error fallback.

- [ ] **Step 1: Update tests for the unified result rule**

```js
test("모든 게임은 1~100 정답 캐릭터를 선택한다", () => {
  for (const mode of ["count", "add", "mul"]) {
    for (const answer of [1, 10, 11, 20, 50, 100]) {
      assert.equal(celebrationView(mode, answer), "number");
    }
  }
});
```

Add a model assertion that `NUMBERBLOCKS` contains keys 1 through 100 and each asset equals `characterAsset(number)`.

- [ ] **Step 2: Run affected tests and verify the old helper/board expectations fail**

Run: `node --test tests/app-behavior.test.mjs tests/game-model.test.mjs`  
Expected: FAIL because 11~100 still select helper or result board.

- [ ] **Step 3: Expand metadata and result rendering**

In `game-model.mjs`:

```js
import { buildCharacterSpec, characterAsset } from "./character-spec.mjs";

export const NUMBERBLOCKS = Object.freeze(Object.fromEntries(
  Array.from({ length: 100 }, (_, index) => {
    const number = index + 1;
    const spec = buildCharacterSpec(number);
    return [number, {
      rows: spec.canvas.grid[1],
      cols: spec.canvas.grid[0],
      asset: characterAsset(number)
    }];
  })
));
```

In `app-behavior.mjs`:

```js
export function celebrationView(_mode, answer) {
  return Number.isInteger(answer) && answer >= 1 && answer <= 100
    ? "number"
    : "result-board";
}
```

In `app.mjs`, replace helper routing with a result character that falls back safely:

```js
function answerCharacter(problem) {
  const image = character(problem.answer, "correct");
  image.addEventListener("error", () => {
    if (state.problem === problem) {
      dom.stage.replaceChildren(resultBoard(problem));
    }
  }, { once: true });
  return image;
}
```

Do not preload 100 images. Preload only 1~10 home/game-entry assets and lazy-load each answer character.

- [ ] **Step 4: Run affected tests**

Run: `node --test tests/app-behavior.test.mjs tests/game-model.test.mjs`  
Expected: all affected tests pass.

- [ ] **Step 5: Commit application integration**

```bash
git add src/game-model.mjs src/app-behavior.mjs src/app.mjs \
  tests/app-behavior.test.mjs tests/game-model.test.mjs
git commit -m "feat: 모든 정답에 숫자 캐릭터 연결"
```

### Task 5: Render and Validate 21~100

**Files:**
- Create: `assets/characters/number-021.png` through `assets/characters/number-100.png`
- Modify: `tests/character-assets.test.mjs`

**Interfaces:**
- Consumes: stable renderer and character specifications.
- Produces: complete 1~100 image pack.

- [ ] **Step 1: Expand the asset loop from 20 to 100**

```js
for (let number = 1; number <= 100; number += 1) {
  // same PNG signature, RGBA, width, and height assertions
}
```

- [ ] **Step 2: Run the asset test and verify 21 is absent**

Run: `node --test tests/character-assets.test.mjs`  
Expected: FAIL with `ENOENT` for `number-021.png`.

- [ ] **Step 3: Render the remaining assets**

Run: `node scripts/render_character_pack.mjs --from 21 --to 100`  
Expected: 80 PNG files written.

- [ ] **Step 4: Run all automated tests**

Run: `npm test`  
Expected: all tests pass with zero failures.

- [ ] **Step 5: Review decade and shape representatives**

Inspect 25, 36, 48, 50, 64, 72, 81, 90, 99, and 100. Verify the decade palette, exact visible cells, balanced face placement, transparent background, and no clipped limbs. Apply corrections in `character-spec.mjs` or the renderer, regenerate the affected range, and rerun `npm test`.

- [ ] **Step 6: Commit the complete image pack**

```bash
git add assets/characters/number-*.png tests/character-assets.test.mjs \
  src/character-spec.mjs scripts/render_character_pack.mjs
git commit -m "feat: 1부터 100 캐릭터 이미지 완성"
```

### Task 6: Browser QA and Release Documentation

**Files:**
- Modify: `styles.css`
- Modify: `docs/superpowers/specs/2026-07-20-numberblocks-full-character-replacement-design.md`

**Interfaces:**
- Consumes: full character pack and unified celebration rendering.
- Produces: responsive character sizing and verified completion notes.

- [ ] **Step 1: Add shape-aware sizing only if QA exposes clipping**

Use grid shape data on the image:

```js
image.dataset.shape =
  NUMBERBLOCKS[number].cols > NUMBERBLOCKS[number].rows ? "wide" :
  NUMBERBLOCKS[number].rows > NUMBERBLOCKS[number].cols * 2 ? "tall" :
  "balanced";
```

Add bounded CSS:

```css
.character[data-shape="wide"] {
  max-width: min(52vw, 520px);
  max-height: min(43vh, 360px);
}

.character[data-shape="tall"] {
  max-width: min(25vw, 270px);
  max-height: min(51vh, 450px);
}
```

- [ ] **Step 2: Run automated regression tests**

Run: `npm test`  
Expected: all tests pass with zero failures.

- [ ] **Step 3: Perform browser checks**

At 1280×720, verify correct-answer scenes for count 11/17/20, addition 25/48/50/99, and multiplication 12/36/64/100. Confirm:

- the matching number character appears only after correctness;
- no helper or generic result board appears while the image loads normally;
- tall, balanced, wide, and 10×10 characters fit the stage;
- Korean then English audio still plays;
- keyboard entry, home navigation, and next-round timing are unchanged;
- console errors and missing-image responses are zero.

- [ ] **Step 4: Record completion**

Update the design document status to `구현 및 검증 완료` and append the final test count plus the representative browser checks.

- [ ] **Step 5: Commit QA documentation**

```bash
git add styles.css \
  docs/superpowers/specs/2026-07-20-numberblocks-full-character-replacement-design.md
git commit -m "docs: 1부터 100 캐릭터 교체 검증 완료"
```
