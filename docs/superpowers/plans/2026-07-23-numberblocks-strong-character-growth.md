# Numberblocks Strong Character Growth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every 11–150 character visibly larger than 1–10 in problem scenes, enlarge it again after a correct answer, and guarantee that no character enters the protected equation row.

**Architecture:** Generate normalized visible-body metrics from each PNG's alpha channel, then use a pure scene-growth calculation on top of the existing number and shape scales. Add a pure layout-cap calculation that fits the visible silhouette inside 88% of the character row width and 82% of its height. Problem and celebration scenes get separate character zones; CSS combines desired growth, ordinary screen caps, and measured layout caps while the equation stays in its own grid row.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js `node:test`, Node `zlib` PNG decoding, generated ES module metadata, in-app browser responsive QA.

## Global Constraints

- The approved direction is C2 `매우 강하게`.
- 1–10 assets and displayed sizes remain unchanged.
- Problem-scene minimum visible-body area ratios are exactly `1.5`, `1.7`, `1.9`, and `2.1` for 11–20, 21–50, 51–100, and 101–150.
- Celebration target area is exactly `1.4 ×` the same number's problem target.
- Existing `--number-scale`, `--shape-scale`, and `--shape-width-scale` remain part of the calculation.
- Character zones use at most 88% of available width and 82% of available height.
- The equation row is protected even when the desired target cannot fit.
- Short landscape keeps final caps `1`, `1.1`, `1.15`, `1.2`, and `1.25`, and keeps horizontal extra widening capped at `1`.
- Count-mode decomposition, home cards, result boards above 150, audio, input, problem generation, and answer behavior remain unchanged.
- Every production change follows RED → GREEN → full relevant regression → commit.

---

### Task 1: Generated Visible-Body Metrics

**Files:**
- Create: `scripts/generate_character_visual_metrics.mjs`
- Create: `src/character-visual-metrics.mjs` (generated output)
- Create: `tests/character-visual-metrics.test.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `CHARACTER_VISUAL_METRICS: Readonly<Record<number, { area: number, width: number, height: number }>>`
- Produces: `REFERENCE_VISUAL_AREA: number`, the largest normalized opaque area among 1–10.
- Consumes: `visiblePngBounds(png)` and `characterAsset(number)`.

- [ ] **Step 1: Write the failing generated-metric contract**

Create `tests/character-visual-metrics.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { characterAsset } from "../src/character-spec.mjs";
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "../src/character-visual-metrics.mjs";
import { visiblePngBounds } from "../scripts/png_alpha_bounds.mjs";

test("1~150 몸체 메타데이터는 실제 PNG 알파 영역과 일치한다", async () => {
  assert.equal(Object.keys(CHARACTER_VISUAL_METRICS).length, 150);

  for (let number = 1; number <= 150; number += 1) {
    const png = await readFile(
      new URL(
        `../assets/characters/${characterAsset(number)}`,
        import.meta.url
      )
    );
    const pngWidth = png.readUInt32BE(16);
    const pngHeight = png.readUInt32BE(20);
    const bounds = visiblePngBounds(png);
    const actual = {
      area: bounds.opaquePixels / (pngWidth * pngHeight),
      width: bounds.width / pngWidth,
      height: bounds.height / pngHeight
    };

    for (const key of ["area", "width", "height"]) {
      assert.ok(
        Math.abs(CHARACTER_VISUAL_METRICS[number][key] - actual[key]) < 1e-12,
        `${number} ${key}`
      );
    }
  }
});

test("1~10 중 가장 큰 몸체 면적을 기준값으로 내보낸다", () => {
  const expected = Math.max(
    ...Array.from(
      { length: 10 },
      (_, index) => CHARACTER_VISUAL_METRICS[index + 1].area
    )
  );
  assert.equal(REFERENCE_VISUAL_AREA, expected);
});
```

- [ ] **Step 2: Run the metric test and verify RED**

Run:

```bash
node --test tests/character-visual-metrics.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/character-visual-metrics.mjs`.

- [ ] **Step 3: Implement the deterministic metric generator**

Create `scripts/generate_character_visual_metrics.mjs`:

```js
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { characterAsset } from "../src/character-spec.mjs";
import { visiblePngBounds } from "./png_alpha_bounds.mjs";

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = dirname(scriptsDirectory);

export async function collectCharacterVisualMetrics(
  assetsDirectory = join(projectRoot, "assets", "characters")
) {
  const metrics = {};

  for (let number = 1; number <= 150; number += 1) {
    const png = await readFile(join(assetsDirectory, characterAsset(number)));
    const pngWidth = png.readUInt32BE(16);
    const pngHeight = png.readUInt32BE(20);
    const bounds = visiblePngBounds(png);
    metrics[number] = {
      area: bounds.opaquePixels / (pngWidth * pngHeight),
      width: bounds.width / pngWidth,
      height: bounds.height / pngHeight
    };
  }

  return metrics;
}

export function characterVisualMetricsModule(metrics) {
  const referenceArea = Math.max(
    ...Array.from({ length: 10 }, (_, index) => metrics[index + 1].area)
  );
  return [
    "// Generated by scripts/generate_character_visual_metrics.mjs.",
    "// Do not edit by hand.",
    `export const CHARACTER_VISUAL_METRICS = Object.freeze(${JSON.stringify(metrics, null, 2)});`,
    `export const REFERENCE_VISUAL_AREA = ${JSON.stringify(referenceArea)};`,
    ""
  ].join("\n");
}

export async function writeCharacterVisualMetrics() {
  const metrics = await collectCharacterVisualMetrics();
  await writeFile(
    join(projectRoot, "src", "character-visual-metrics.mjs"),
    characterVisualMetricsModule(metrics),
    "utf8"
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await writeCharacterVisualMetrics();
}
```

Run:

```bash
node scripts/generate_character_visual_metrics.mjs
```

Expected: `src/character-visual-metrics.mjs` is generated with 150 entries and a reference area.

- [ ] **Step 4: Connect metric regeneration to the asset pipeline**

Change `package.json` scripts to:

```json
{
  "scripts": {
    "metrics:characters": "node scripts/generate_character_visual_metrics.mjs",
    "render:characters": "node scripts/render_character_pack.mjs --from 11 --to 150 && npm run metrics:characters",
    "test": "node --test tests/*.test.mjs"
  }
}
```

At the end of the CLI path in `scripts/render_character_pack.mjs`, do not duplicate metric generation. The chained package script is the single integration point, while renderer unit tests can continue importing the renderer without writing files.

- [ ] **Step 5: Verify generated metrics and existing asset tests**

Run:

```bash
node --test tests/character-visual-metrics.test.mjs tests/character-assets.test.mjs tests/character-renderer.test.mjs
```

Expected: all metric, asset, and renderer tests PASS.

Run:

```bash
git diff --check
```

Expected: no output.

- [ ] **Step 6: Commit the visible-body metadata pipeline**

```bash
git add package.json scripts/generate_character_visual_metrics.mjs \
  src/character-visual-metrics.mjs tests/character-visual-metrics.test.mjs
git commit -m "feat: 캐릭터 보이는 몸체 메타데이터 생성"
```

---

### Task 2: Pure Problem and Celebration Growth

**Files:**
- Modify: `src/app-behavior.mjs`
- Modify: `tests/app-behavior.test.mjs`
- Create: `tests/character-growth.test.mjs`

**Interfaces:**
- Consumes: `CHARACTER_VISUAL_METRICS[number]` and `REFERENCE_VISUAL_AREA`.
- Produces: `characterNumberScale(number: number): number`
- Produces: `characterSceneAreaTarget(number: number, scene: "problem" | "celebration"): number`
- Produces: `characterSceneScale({ number, scene, rows, cols, metric, referenceArea }): number`

- [ ] **Step 1: Write failing target and scale tests**

Add imports to `tests/app-behavior.test.mjs`:

```js
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "../src/character-visual-metrics.mjs";
```

Add the following named imports from `app-behavior.mjs`:

```js
characterNumberScale,
characterSceneAreaTarget,
characterSceneScale
```

Append:

```js
test("장면별 큰 수 몸체 면적 목표를 정확히 고른다", () => {
  for (const [number, target] of [
    [10, 1],
    [11, 1.5],
    [20, 1.5],
    [21, 1.7],
    [50, 1.7],
    [51, 1.9],
    [100, 1.9],
    [101, 2.1],
    [150, 2.1]
  ]) {
    assert.equal(characterSceneAreaTarget(number, "problem"), target);
    assert.equal(
      characterSceneAreaTarget(number, "celebration"),
      number <= 10 ? 1 : target * 1.4
    );
  }
});

test("1~10과 잘못된 장면은 추가 확대를 사용하지 않는다", () => {
  assert.equal(characterSceneAreaTarget(1, "problem"), 1);
  assert.equal(characterSceneAreaTarget(10, "celebration"), 1);
  assert.equal(characterSceneAreaTarget(19, "other"), 1);
  assert.equal(characterSceneAreaTarget(0, "problem"), 1);
  assert.equal(characterSceneAreaTarget(151, "problem"), 1);
});

test("19의 문제와 정답 몸체 면적이 각 목표에 도달한다", () => {
  const number = 19;
  const { rows, cols } = NUMBERBLOCKS[number];
  const metric = CHARACTER_VISUAL_METRICS[number];

  for (const scene of ["problem", "celebration"]) {
    const sceneScale = characterSceneScale({
      number,
      scene,
      rows,
      cols,
      metric,
      referenceArea: REFERENCE_VISUAL_AREA
    });
    const baseScale =
      characterNumberScale(number) * characterShapeScale(number, rows, cols);
    const displayedArea =
      metric.area *
      (baseScale ** 2) *
      characterShapeWidthScale(number, rows, cols) *
      (sceneScale ** 2);
    const targetArea =
      REFERENCE_VISUAL_AREA * characterSceneAreaTarget(number, scene);

    assert.ok(displayedArea >= targetArea - 1e-12, scene);
  }
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/app-behavior.test.mjs
```

Expected: FAIL because `characterNumberScale`, `characterSceneAreaTarget`, and `characterSceneScale` are not exported.

- [ ] **Step 3: Implement exact scene area targets**

Add beside `characterSizeBand` in `src/app-behavior.mjs`:

```js
const NUMBER_SCALE_BY_BAND = Object.freeze({
  base: 1,
  "scale-120": 1.2,
  "scale-140": 1.4,
  "scale-160": 1.6,
  "scale-180": 1.8
});

export function characterNumberScale(number) {
  return NUMBER_SCALE_BY_BAND[characterSizeBand(number)] ?? 1;
}

export function characterSceneAreaTarget(number, scene) {
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 150 ||
    !["problem", "celebration"].includes(scene) ||
    number <= 10
  ) {
    return 1;
  }

  const problemTarget =
    number >= 101 ? 2.1 :
      number >= 51 ? 1.9 :
        number >= 21 ? 1.7 :
          1.5;
  return scene === "celebration" ? problemTarget * 1.4 : problemTarget;
}
```

- [ ] **Step 4: Implement guarded area-to-linear growth**

Add after the existing shape functions:

```js
export function characterSceneScale({
  number,
  scene,
  rows,
  cols,
  metric,
  referenceArea
}) {
  if (
    !metric ||
    !Number.isFinite(metric.area) ||
    metric.area <= 0 ||
    !Number.isFinite(referenceArea) ||
    referenceArea <= 0 ||
    number <= 10
  ) {
    return 1;
  }

  const baseScale =
    characterNumberScale(number) * characterShapeScale(number, rows, cols);
  const widthScale = characterShapeWidthScale(number, rows, cols);
  const existingArea = metric.area * (baseScale ** 2) * widthScale;
  const targetArea =
    referenceArea * characterSceneAreaTarget(number, scene);
  const scale = Math.sqrt(targetArea / existingArea);
  return Number.isFinite(scale) ? Math.max(1, scale) : 1;
}
```

- [ ] **Step 5: Add the all-character pre-layout regression**

Create `tests/character-growth.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  characterNumberScale,
  characterSceneAreaTarget,
  characterSceneScale,
  characterShapeScale,
  characterShapeWidthScale
} from "../src/app-behavior.mjs";
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "../src/character-visual-metrics.mjs";
import { NUMBERBLOCKS } from "../src/game-model.mjs";

test("11~150 전체가 문제와 정답 장면의 최소 몸체 면적에 도달한다", () => {
  for (let number = 11; number <= 150; number += 1) {
    const { rows, cols } = NUMBERBLOCKS[number];
    const metric = CHARACTER_VISUAL_METRICS[number];

    for (const scene of ["problem", "celebration"]) {
      const sceneScale = characterSceneScale({
        number,
        scene,
        rows,
        cols,
        metric,
        referenceArea: REFERENCE_VISUAL_AREA
      });
      const baseScale =
        characterNumberScale(number) * characterShapeScale(number, rows, cols);
      const displayedArea =
        metric.area *
        (baseScale ** 2) *
        characterShapeWidthScale(number, rows, cols) *
        (sceneScale ** 2);
      const minimum =
        REFERENCE_VISUAL_AREA * characterSceneAreaTarget(number, scene);

      assert.ok(
        displayedArea >= minimum - 1e-12,
        `${number} ${scene}: ${displayedArea} < ${minimum}`
      );
    }
  }
});
```

- [ ] **Step 6: Verify growth math and commit**

Run:

```bash
node --test tests/app-behavior.test.mjs tests/character-growth.test.mjs
```

Expected: all tests PASS.

Commit:

```bash
git add src/app-behavior.mjs tests/app-behavior.test.mjs \
  tests/character-growth.test.mjs
git commit -m "feat: 문제와 정답 캐릭터 확대 목표 계산"
```

---

### Task 3: Measured Layout Cap and Shared Scene Wiring

**Files:**
- Create: `src/character-layout.mjs`
- Create: `tests/character-layout.test.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/app-contract.test.mjs`

**Interfaces:**
- Consumes: Task 1 metrics and Task 2 `characterSceneScale`.
- Produces: `characterLayoutScaleCap({ zoneWidth, zoneHeight, imageWidth, imageHeight, metric, widthScale }): number`
- Produces DOM contract: scene images have `data-scene`, `--scene-scale`, and `--layout-scale-cap`.

- [ ] **Step 1: Write the failing pure layout-cap tests**

Create `tests/character-layout.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { characterLayoutScaleCap } from "../src/character-layout.mjs";

test("보이는 실루엣을 캐릭터 구역 88% × 82% 안에 맞춘다", () => {
  const cap = characterLayoutScaleCap({
    zoneWidth: 500,
    zoneHeight: 300,
    imageWidth: 200,
    imageHeight: 240,
    metric: { width: 0.8, height: 0.75 },
    widthScale: 1.25
  });
  assert.equal(cap, Math.min(
    (500 * 0.88) / (200 * 0.8 * 1.25),
    (300 * 0.82) / (240 * 0.75)
  ));
});

test("잘못된 측정값은 확대 없는 안전 상한 1을 사용한다", () => {
  for (const input of [
    {},
    { zoneWidth: 0, zoneHeight: 100, imageWidth: 20, imageHeight: 20,
      metric: { width: 1, height: 1 }, widthScale: 1 },
    { zoneWidth: 100, zoneHeight: 100, imageWidth: 20, imageHeight: 20,
      metric: null, widthScale: 1 }
  ]) {
    assert.equal(characterLayoutScaleCap(input), 1);
  }
});
```

- [ ] **Step 2: Run the layout test and verify RED**

Run:

```bash
node --test tests/character-layout.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/character-layout.mjs`.

- [ ] **Step 3: Implement the pure fit calculation**

Create `src/character-layout.mjs`:

```js
const finitePositive = value => Number.isFinite(value) && value > 0;

export function characterLayoutScaleCap({
  zoneWidth,
  zoneHeight,
  imageWidth,
  imageHeight,
  metric,
  widthScale
}) {
  if (
    ![zoneWidth, zoneHeight, imageWidth, imageHeight, widthScale]
      .every(finitePositive) ||
    !metric ||
    !finitePositive(metric.width) ||
    !finitePositive(metric.height)
  ) {
    return 1;
  }

  const horizontalCap =
    (zoneWidth * 0.88) / (imageWidth * metric.width * widthScale);
  const verticalCap =
    (zoneHeight * 0.82) / (imageHeight * metric.height);
  return Math.min(horizontalCap, verticalCap);
}
```

- [ ] **Step 4: Write failing app wiring contracts**

Add to `tests/app-contract.test.mjs`:

```js
test("문제와 정답 캐릭터는 장면 확대와 실측 상한을 공유한다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*CHARACTER_VISUAL_METRICS[^}]*REFERENCE_VISUAL_AREA[^}]*\}\s*from "\.\/character-visual-metrics\.mjs";/s
  );
  assert.match(
    app,
    /image\.dataset\.scene\s*=\s*scene;/
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--scene-scale",[\s\S]*?characterSceneScale\(/s
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--layout-scale-cap",\s*String\(cap\)\s*\);/s
  );
  assert.match(
    app,
    /className\s*=\s*"celebration-character-zone"/
  );
});
```

Run:

```bash
node --test tests/app-contract.test.mjs
```

Expected: FAIL because the app does not import metrics, assign scene variables, fit characters, or create a celebration zone.

- [ ] **Step 5: Wire scene growth through the shared character factory**

Import the generated metrics, `characterSceneScale`, and `characterLayoutScaleCap` in `src/app.mjs`.

Change the factory signature and add scene metadata:

```js
function character(number, className = "", scene = "neutral") {
  const { asset, rows, cols } = NUMBERBLOCKS[number];
  const metric = CHARACTER_VISUAL_METRICS[number];
  const image = document.createElement("img");
  image.className = `character enter ${className}`.trim();
  image.src = `assets/characters/${asset}`;
  image.alt = `숫자 ${number} 블록 캐릭터`;
  image.dataset.number = String(number);
  image.dataset.sizeBand = characterSizeBand(number);
  image.dataset.scene = scene;
  image.style.setProperty(
    "--shape-scale",
    String(characterShapeScale(number, rows, cols))
  );
  image.style.setProperty(
    "--shape-width-scale",
    String(characterShapeWidthScale(number, rows, cols))
  );
  image.style.setProperty(
    "--scene-scale",
    String(characterSceneScale({
      number,
      scene,
      rows,
      cols,
      metric,
      referenceArea: REFERENCE_VISUAL_AREA
    }))
  );
  image.dataset.shape =
    cols > rows
      ? "wide"
      : rows > cols * 2
        ? "tall"
        : "balanced";
  retireAnimationClass(image, "enter");
  return image;
}
```

Use a problem-scene closure:

```js
const scene = operandScene(
  document,
  problem,
  (number, className) => character(number, className, "problem")
);
dom.stage.append(scene);
scheduleCharacterFit(scene);
```

Keep count friends on the default `neutral` scene.

- [ ] **Step 6: Add the celebration character zone**

In `renderCelebration`, wrap the image before the equation:

```js
const characterZone = document.createElement("div");
characterZone.className = "celebration-character-zone";
const image = character(
  presentation.characterNumber,
  "correct",
  "celebration"
);
characterZone.append(image);
wrapper.append(characterZone);
```

Append the completed equation after `characterZone`, replace the stage children, then call:

```js
scheduleCharacterFit(wrapper);
```

Keep the existing image-error fallback on the image.

- [ ] **Step 7: Measure and apply the layout cap after rendering**

Add to `src/app.mjs`:

```js
function fitSceneCharacter(image) {
  const zone = image.closest(
    ".operand-slot, .celebration-character-zone"
  );
  const metric = CHARACTER_VISUAL_METRICS[Number(image.dataset.number)];
  if (!zone || !metric) return;

  const cap = characterLayoutScaleCap({
    zoneWidth: zone.clientWidth,
    zoneHeight: zone.clientHeight,
    imageWidth: image.clientWidth,
    imageHeight: image.clientHeight,
    metric,
    widthScale: Number(
      image.style.getPropertyValue("--shape-width-scale")
    )
  });
  image.style.setProperty("--layout-scale-cap", String(cap));
}

function fitSceneCharacters(root = dom.stage) {
  root
    .querySelectorAll('.character[data-scene="problem"], .character[data-scene="celebration"]')
    .forEach(fitSceneCharacter);
}

function scheduleCharacterFit(root = dom.stage) {
  requestAnimationFrame(() => {
    fitSceneCharacters(root);
    root.querySelectorAll(".character").forEach(image => {
      if (!image.complete) {
        image.addEventListener(
          "load",
          () => fitSceneCharacter(image),
          { once: true }
        );
      }
    });
  });
}

window.addEventListener("resize", () => scheduleCharacterFit());
```

- [ ] **Step 8: Verify layout math, app contracts, and commit**

Run:

```bash
node --test tests/character-layout.test.mjs tests/app-contract.test.mjs \
  tests/problem-scene.test.mjs
```

Expected: all tests PASS.

Commit:

```bash
git add src/character-layout.mjs src/app.mjs \
  tests/character-layout.test.mjs tests/app-contract.test.mjs
git commit -m "feat: 장면별 캐릭터 확대와 실측 상한 연결"
```

---

### Task 4: Protected Equation Rows and Responsive Caps

**Files:**
- Modify: `styles.css`
- Modify: `tests/responsive-layout.test.mjs`

**Interfaces:**
- Consumes DOM variables: `--scene-scale`, `--layout-scale-cap`.
- Produces layout contract: character zones clip overflow before the equation row, and short-landscape caps keep final priority.

- [ ] **Step 1: Write failing CSS composition and boundary contracts**

Update the base-character assertion in `tests/responsive-layout.test.mjs` to require:

```js
assert.match(
  css,
  /\.character\s*\{[^}]*--scene-scale:\s*1;[^}]*--layout-scale-cap:\s*999;[^}]*--resolved-character-scale:\s*min\([^}]*var\(--scene-scale\)[^}]*var\(--screen-scale-cap\)[^}]*var\(--layout-scale-cap\)[^}]*\);/s
);
```

Add:

```js
test("문제와 정답 캐릭터 구역은 수식 행 침범을 차단한다", () => {
  assert.match(
    css,
    /\.operand-scene\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto;/s
  );
  assert.match(
    css,
    /\.operand-slot\s*\{[^}]*overflow:\s*clip;/s
  );
  assert.match(
    css,
    /\.celebration-character-zone\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*clip;/s
  );
  assert.match(
    css,
    /\.equation-label,\s*\.completed-equation\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;/s
  );
});

test("일반 화면만 C2 상한을 열고 낮은 가로 화면은 기존 상한을 유지한다", () => {
  assert.match(
    css,
    /\.character\[data-scene="problem"\]\s*\{[^}]*--screen-scale-cap:\s*3\.1;/s
  );
  assert.match(
    css,
    /\.character\[data-scene="celebration"\]\s*\{[^}]*--screen-scale-cap:\s*3\.6;/s
  );

  const shortHeightCss = mediaBlock(shortHeightMarker);
  assert.match(
    shortHeightCss,
    /\.character\s*\{[^}]*--screen-scale-cap:\s*1;[^}]*--screen-width-scale-cap:\s*1;/s
  );
});
```

- [ ] **Step 2: Run responsive contracts and verify RED**

Run:

```bash
node --test tests/responsive-layout.test.mjs
```

Expected: FAIL because scene/layout variables, scene caps, celebration zone, and equation boundary rules do not exist.

- [ ] **Step 3: Compose scene growth and measured layout cap**

Change the base `.character` variables and resolved scale:

```css
.character {
  --number-scale: 1;
  --shape-scale: 1;
  --shape-width-scale: 1;
  --scene-scale: 1;
  --screen-scale-cap: 2.2;
  --screen-width-scale-cap: 1.375;
  --layout-scale-cap: 999;
  --resolved-character-scale: min(
    calc(
      var(--number-scale) *
      var(--shape-scale) *
      var(--scene-scale)
    ),
    var(--screen-scale-cap),
    var(--layout-scale-cap)
  );
  /* Keep existing display, sizing, filter, two-axis scale, and origin rules. */
}

.character[data-scene="problem"] {
  --screen-scale-cap: 3.1;
}

.character[data-scene="celebration"] {
  --screen-scale-cap: 3.6;
}
```

Do not change 1–10 sizes: their `--scene-scale` stays `1`, so the larger cap alone has no effect.

- [ ] **Step 4: Protect the problem and celebration equation rows**

Keep `.operand-scene` at two rows and add:

```css
.operand-friends {
  overflow: clip;
}

.operand-slot {
  overflow: clip;
}

.celebration-character-zone {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: clip;
}

.equation-label,
.completed-equation {
  position: relative;
  z-index: 1;
}
```

Remove `.operand-slot` from the earlier shared `overflow: visible` rule, leaving count friends unchanged:

```css
.count-friends {
  overflow: visible;
}
```

- [ ] **Step 5: Preserve responsive priorities**

Keep the existing short-landscape `.character` and band cap declarations later in the stylesheet so they override the ordinary `problem` and `celebration` caps.

In mobile celebration sizing, move the `max-width` and `max-height` rules from the direct character to its new zone-aware selector without changing the reserved equation row:

```css
body[data-state="celebrating"] .celebration-character-zone .character {
  max-width: min(68vw, 260px);
  max-height: min(20vh, 180px);
}
```

Apply the equivalent selector change to desktop and short-landscape celebration rules.

- [ ] **Step 6: Verify CSS contracts and full regressions**

Run:

```bash
node --test tests/responsive-layout.test.mjs tests/app-contract.test.mjs
git diff --check
npm test
```

Expected: all tests PASS, `git diff --check` prints nothing, and the total test count is greater than the current 109-test baseline.

- [ ] **Step 7: Commit protected responsive layout**

```bash
git add styles.css tests/responsive-layout.test.mjs
git commit -m "feat: 큰 캐릭터와 수식 영역 경계 보호"
```

---

### Task 5: Browser Regression at Three Viewports

**Files:**
- Verify: `src/app.mjs`
- Verify: `styles.css`
- Verify: `src/character-visual-metrics.mjs`

**Interfaces:**
- Consumes the completed feature.
- Produces release evidence only; no source change is expected unless a verified browser defect is found.

- [ ] **Step 1: Start the feature server**

Run:

```bash
python3 -m http.server 4175 --bind 0.0.0.0
```

Open `http://127.0.0.1:4175/`.

- [ ] **Step 2: Verify desktop problem scenes at 1280×720**

Inspect `19 − 3`, one 21–50 example, one 51–100 example, and one 101–150 example.

For every scene, capture:

```js
({
  characters: [...document.querySelectorAll(".operand-character")].map(image => ({
    number: image.dataset.number,
    sceneScale: image.style.getPropertyValue("--scene-scale"),
    layoutCap: image.style.getPropertyValue("--layout-scale-cap"),
    finalScale: getComputedStyle(image).scale,
    rect: image.getBoundingClientRect().toJSON()
  })),
  visualBottom: document.querySelector(".operand-friends")
    .getBoundingClientRect().bottom,
  equationTop: document.querySelector(".equation-label")
    .getBoundingClientRect().top
})
```

Expected:

- every 11–150 visible body is clearly larger than 1–10;
- `visualBottom <= equationTop`;
- the operator is not covered;
- no visible limb or accessory is clipped.

- [ ] **Step 3: Verify desktop celebration scenes**

Answer representative problems whose results are 19, 50, 100, and 150.

Expected:

- the result body is visibly larger than its problem-scene body;
- the result equation remains fully visible;
- the character zone bottom does not cross the completed-equation top;
- the next problem still starts after voice playback.

- [ ] **Step 4: Verify mobile portrait at 390×844**

Repeat `19 − 3` and one 101–150 celebration.

Expected:

- the equation, answer box, and all keypad buttons remain visible and usable;
- the character is reduced only when required by the measured layout cap;
- no horizontal scrolling occurs.

- [ ] **Step 5: Verify short landscape at 640×360**

Inspect computed styles for a large-number problem and celebration.

Expected:

- final base scale is no greater than the existing band cap;
- `--screen-width-scale-cap` resolves to `1`;
- equation, answer box, and two-row keypad do not overlap;
- character limbs remain visible.

- [ ] **Step 6: Verify console and clean repository state**

Check browser errors and warnings. Expected: no application errors.

Run:

```bash
npm test
git diff --check
git status --short
git log -6 --oneline
```

Expected:

- all tests PASS;
- `git diff --check` prints nothing;
- the worktree is clean;
- four feature commits appear above the design and plan commits.
