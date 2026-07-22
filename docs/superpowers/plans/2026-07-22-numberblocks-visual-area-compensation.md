# Numberblocks Visual Area Compensation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make narrow 11–150 characters, especially 18, occupy a visibly larger body area than smaller characters without changing 1–10 assets or sizes.

**Architecture:** Add one pure shape-compensation function beside the existing numeric band selector, attach its result as `--shape-scale` through the shared `character()` factory, and let CSS combine band and shape scales under screen-specific caps. Extend the existing PNG alpha decoder with an opaque-pixel count so tests verify the actual visible asset area rather than only CSS declarations.

**Browser QA deviation:** The scalar implementation made 18 pass the area regression, but 19 still rendered about 18% smaller than 6 and its transparent canvas extended above the stage. The approved correction keeps the capped vertical scale, centers the transform origin, and adds a bounded horizontal-only scale for narrow characters.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js `node:test`, Node `zlib` PNG decoding, in-app browser visual QA.

## Global Constraints

- The 1–10 character assets and displayed sizes remain unchanged at shape compensation `1`.
- Shape density is `number / max(rows, cols)²`, reference density is exactly `2 / 3`, and 11–150 shape compensation is clamped to `1...1.75`.
- Ordinary-screen final scale is `number band scale × shape compensation`, capped at `2.2`.
- The existing band scales remain 1–10 at 1.0, 11–20 at 1.2, 21–50 at 1.4, 51–100 at 1.6, and 101–150 at 1.8.
- Under `@media (max-width: 900px) and (max-height: 500px)`, final caps remain 1.0, 1.1, 1.15, 1.2, and 1.25 for those five bands.
- Addition, subtraction, multiplication, count, and celebration scenes all use the shared `character()` path.
- Character PNGs, render scripts, audio, problem rules, answer behavior, keyboard input, and mobile keypad behavior remain unchanged.
- Every production change follows RED → GREEN → full regression test → commit.
- Horizontal shape compensation is `1 + (shape compensation - 1) × 0.5`, bounded by the existing shape range to `1...1.375`.
- Short landscape disables the additional horizontal widening by capping it at `1`.

---

### Task 1: Pure Shape Compensation

**Files:**
- Modify: `tests/app-behavior.test.mjs`
- Modify: `src/app-behavior.mjs`

**Interfaces:**
- Produces: `characterShapeScale(number: number, rows: number, cols: number): number`
- Consumes later: `src/app.mjs` writes the returned number to the character element's `--shape-scale` custom property.

- [ ] **Step 1: Import the new function and write failing formula tests**

Add `characterShapeScale` to the named imports in `tests/app-behavior.test.mjs`, then append:

```js
test("1~10은 형태 보정 없이 기존 크기를 유지한다", () => {
  assert.equal(characterShapeScale(1, 1, 1), 1);
  assert.equal(characterShapeScale(6, 3, 2), 1);
  assert.equal(characterShapeScale(10, 5, 2), 1);
});

test("11 이상 세로형은 블록 배치 밀도로 자동 확대한다", () => {
  assert.ok(Math.abs(characterShapeScale(18, 9, 2) - Math.sqrt(3)) < 1e-12);
  assert.equal(characterShapeScale(20, 4, 5), 1);
  assert.equal(characterShapeScale(19, 10, 2), 1.75);
  assert.ok(Math.abs(1.2 * characterShapeScale(18, 9, 2) - 2.0784609690826525) < 1e-12);
});

test("잘못된 캐릭터 치수는 안전하게 보정 1을 사용한다", () => {
  for (const args of [
    [18, 0, 2],
    [18, 9, -1],
    [18, Number.NaN, 2],
    [18.5, 9, 2],
    [18, 9.5, 2]
  ]) {
    assert.equal(characterShapeScale(...args), 1);
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/app-behavior.test.mjs`

Expected: FAIL because `characterShapeScale` is not exported.

- [ ] **Step 3: Implement the exact density formula and guards**

Add to `src/app-behavior.mjs` immediately after `characterSizeBand`:

```js
const SHAPE_REFERENCE_DENSITY = 2 / 3;
const MAX_SHAPE_SCALE = 1.75;

export function characterShapeScale(number, rows, cols) {
  if (
    !Number.isInteger(number) ||
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    number <= 10 ||
    rows <= 0 ||
    cols <= 0
  ) {
    return 1;
  }

  const longestSide = Math.max(rows, cols);
  const density = number / (longestSide ** 2);
  const scale = Math.sqrt(SHAPE_REFERENCE_DENSITY / density);
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_SHAPE_SCALE, Math.max(1, scale));
}
```

- [ ] **Step 4: Verify GREEN and focused regressions**

Run: `node --test tests/app-behavior.test.mjs`

Expected: all app-behavior tests PASS.

- [ ] **Step 5: Commit the pure compensation function**

```bash
git add src/app-behavior.mjs tests/app-behavior.test.mjs
git commit -m "feat: 캐릭터 형태 면적 보정 계산 추가"
```

---

### Task 2: Shared Character Wiring and Screen Caps

**Files:**
- Modify: `tests/app-contract.test.mjs`
- Modify: `tests/responsive-layout.test.mjs`
- Modify: `src/app.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `characterShapeScale(number, rows, cols): number` from Task 1.
- Produces DOM/CSS contract: every `.character` has inline `--shape-scale`; final scale is `min(number scale × shape scale, screen cap)`.

- [ ] **Step 1: Write failing app wiring contracts**

In `tests/app-contract.test.mjs`, expand the size-band test into:

```js
test("모든 캐릭터 이미지에 숫자 단계와 형태 보정을 표시한다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*characterShapeScale[^}]*characterSizeBand|import\s*\{[^}]*characterSizeBand[^}]*characterShapeScale/s
  );
  assert.match(
    app,
    /image\.dataset\.sizeBand\s*=\s*characterSizeBand\(number\);/
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--shape-scale",\s*String\(characterShapeScale\(number,\s*rows,\s*cols\)\)\s*\);/s
  );
});
```

- [ ] **Step 2: Write failing CSS composition and cap contracts**

In the first test of `tests/responsive-layout.test.mjs`, replace the base `.character` assertion with:

```js
assert.match(
  css,
  /\.character\s*\{[^}]*--number-scale:\s*1;[^}]*--shape-scale:\s*1;[^}]*--screen-scale-cap:\s*2\.2;[^}]*scale:\s*min\(calc\(var\(--number-scale\)\s*\*\s*var\(--shape-scale\)\),\s*var\(--screen-scale-cap\)\);/s
);
```

Change the short-landscape test's expected property from `--number-scale` to `--screen-scale-cap`, and add base coverage:

```js
for (const [band, cap] of [
  ["base", "1"],
  ["scale-120", "1.1"],
  ["scale-140", "1.15"],
  ["scale-160", "1.2"],
  ["scale-180", "1.25"]
]) {
  const selector = band === "base"
    ? "\\.character"
    : `\\.character\\[data-size-band="${band}"\\]`;
  assert.match(
    shortHeightCss,
    new RegExp(`${selector}\\s*\\{[^}]*--screen-scale-cap:\\s*${cap.replace(".", "\\.")};`, "s")
  );
}
```

- [ ] **Step 3: Run the focused contracts and verify RED**

Run: `node --test tests/app-contract.test.mjs tests/responsive-layout.test.mjs`

Expected: FAIL because `app.mjs` does not set `--shape-scale`, base CSS uses `scale: var(--number-scale)`, and short media still overrides `--number-scale`.

- [ ] **Step 4: Wire metadata through the shared character factory**

Add `characterShapeScale` to the `./app-behavior.mjs` import in `src/app.mjs`. At the start of `character(number, className)`, read the shared metadata once and apply the variable:

```js
const { asset, rows, cols } = NUMBERBLOCKS[number];
const image = document.createElement("img");
image.className = `character enter ${className}`.trim();
image.src = `assets/characters/${asset}`;
image.alt = `숫자 ${number} 블록 캐릭터`;
image.dataset.number = String(number);
image.dataset.sizeBand = characterSizeBand(number);
image.style.setProperty(
  "--shape-scale",
  String(characterShapeScale(number, rows, cols))
);
image.dataset.shape =
  cols > rows
    ? "wide"
    : rows > cols * 2
      ? "tall"
      : "balanced";
```

Keep `retireAnimationClass(image, "enter")` and the function return unchanged.

- [ ] **Step 5: Compose scales and convert short overrides to caps**

Change the base `.character` declarations in `styles.css` to:

```css
.character {
  --number-scale: 1;
  --shape-scale: 1;
  --screen-scale-cap: 2.2;
  display: block;
  width: auto;
  max-width: min(34vw, 350px);
  max-height: min(49vh, 430px);
  object-fit: contain;
  filter: drop-shadow(0 13px 9px rgba(37, 52, 93, .22));
  scale: min(
    calc(var(--number-scale) * var(--shape-scale)),
    var(--screen-scale-cap)
  );
  transform-origin: 50% 90%;
}
```

Inside `@media (max-width: 900px) and (max-height: 500px)`, set the final caps without changing the ordinary band scales:

```css
  .character {
    max-width: min(48vw, 240px);
    max-height: min(16vh, 64px);
    --screen-scale-cap: 1;
  }

  .character[data-size-band="scale-120"] {
    --screen-scale-cap: 1.1;
  }

  .character[data-size-band="scale-140"] {
    --screen-scale-cap: 1.15;
  }

  .character[data-size-band="scale-160"] {
    --screen-scale-cap: 1.2;
  }

  .character[data-size-band="scale-180"] {
    --screen-scale-cap: 1.25;
  }
```

- [ ] **Step 6: Verify GREEN and full regressions**

Run: `node --test tests/app-contract.test.mjs tests/responsive-layout.test.mjs`

Expected: both suites PASS.

Run: `npm test`

Expected: all tests PASS with no regressions in game, audio, input, character assets, or layout contracts.

- [ ] **Step 7: Commit shared rendering and CSS caps**

```bash
git add src/app.mjs styles.css tests/app-contract.test.mjs tests/responsive-layout.test.mjs
git commit -m "feat: 캐릭터 면적 보정을 화면에 적용"
```

---

### Task 3: Opaque-Area Regression and Browser Verification

**Files:**
- Modify: `scripts/png_alpha_bounds.mjs`
- Modify: `tests/character-assets.test.mjs`
- Verify only: `src/app.mjs`
- Verify only: `styles.css`

**Interfaces:**
- Extends: `visiblePngBounds(png)` return value with `opaquePixels: number` while preserving `left/right/top/bottom/width/height`.
- Consumes: `characterShapeScale(number, rows, cols)` and `NUMBERBLOCKS[number]` for actual displayed-area comparison.

- [ ] **Step 1: Write the failing opaque-area regression**

Add these imports to `tests/character-assets.test.mjs`:

```js
import { characterShapeScale } from "../src/app-behavior.mjs";
import { NUMBERBLOCKS } from "../src/game-model.mjs";
```

Append:

```js
test("18의 보정된 불투명 몸체 면적은 6보다 크다", async () => {
  const metrics = {};
  for (const number of [6, 18]) {
    const png = await readFile(
      new URL(`../assets/characters/${characterAsset(number)}`, import.meta.url)
    );
    metrics[number] = visiblePngBounds(png);
  }

  const eighteen = NUMBERBLOCKS[18];
  const eighteenScale = Math.min(
    2.2,
    1.2 * characterShapeScale(18, eighteen.rows, eighteen.cols)
  );
  const sixDisplayedArea = metrics[6].opaquePixels;
  const eighteenDisplayedArea = metrics[18].opaquePixels * (eighteenScale ** 2);

  assert.ok(
    eighteenDisplayedArea > sixDisplayedArea,
    `18 area ${eighteenDisplayedArea} must exceed 6 area ${sixDisplayedArea}`
  );
});
```

- [ ] **Step 2: Run the asset test and verify RED**

Run: `node --test tests/character-assets.test.mjs`

Expected: FAIL because `visiblePngBounds` does not return `opaquePixels`.

- [ ] **Step 3: Count opaque pixels during existing PNG decoding**

In `scripts/png_alpha_bounds.mjs`, initialize `let opaquePixels = 0;` beside the bounds variables. In the decoded row loop, after the alpha-zero guard, increment it:

```js
if (current[x * bytesPerPixel + 3] === 0) continue;
opaquePixels += 1;
left = Math.min(left, x);
right = Math.max(right, x);
top = Math.min(top, y);
bottom = Math.max(bottom, y);
```

Add the count to the frozen return value:

```js
return Object.freeze({
  left,
  right,
  top,
  bottom,
  width: right - left + 1,
  height: bottom - top + 1,
  opaquePixels
});
```

- [ ] **Step 4: Verify the opaque-area regression and full suite**

Run: `node --test tests/character-assets.test.mjs`

Expected: all character-asset tests PASS, including 18 displayed opaque area greater than 6.

Run:

```bash
git diff --check
npm test
```

Expected: `git diff --check` prints nothing and the full suite PASSes.

- [ ] **Step 5: Commit the alpha-area regression**

```bash
git add scripts/png_alpha_bounds.mjs tests/character-assets.test.mjs
git commit -m "test: 18 캐릭터 보이는 면적 회귀 검증"
```

- [ ] **Step 6: Verify ordinary desktop and mobile rendering**

Start the branch server with `python3 -m http.server 4175 --bind 0.0.0.0` and open `http://127.0.0.1:4175/`.

At 1280×720, inspect a subtraction scene containing one 11–19 character and one 1–10 character. The larger number must expose `--shape-scale` greater than 1, remain below the final 2.2 cap, and visibly occupy more body area without covering the operator or equation.

At 390×844, inspect a narrow 11–19 character and a 101–150 character. Both must remain fully visible with the answer box and keypad usable.

- [ ] **Step 7: Verify the short-landscape cap and console**

At 640×360, inspect the computed style and layout with:

```js
[...document.querySelectorAll(".character")].map((element) => ({
  number: element.dataset.number,
  band: element.dataset.sizeBand,
  shapeScale: element.style.getPropertyValue("--shape-scale"),
  finalScale: getComputedStyle(element).scale,
  rect: element.getBoundingClientRect().toJSON()
}));
```

Expected: final scale is no greater than the character's band cap, limbs/accessories remain visible, and the expression, answer box, and two-row keypad do not overlap. Browser console errors and warnings are empty.

- [ ] **Step 8: Record the clean final state**

Run:

```bash
git status --short
git log -5 --oneline
```

Expected: the feature worktree is clean and the three implementation commits appear above the design and plan commits.

---

### Task 4: Axis-Separated Correction After Browser QA

**Files:**
- Modify: `tests/app-behavior.test.mjs`
- Modify: `tests/app-contract.test.mjs`
- Modify: `tests/responsive-layout.test.mjs`
- Modify: `tests/character-assets.test.mjs`
- Modify: `src/app-behavior.mjs`
- Modify: `src/app.mjs`
- Modify: `styles.css`

**Interfaces:**
- Produces: `characterShapeWidthScale(number, rows, cols): number`
- Produces DOM/CSS contract: `--shape-width-scale` controls only the horizontal axis; `--shape-scale` continues to control both axes under the vertical screen cap.

- [x] **Step 1: Write failing unit, wiring, CSS, and alpha-area tests**

Verify the width function returns `1` for 6, `1 + (sqrt(3) - 1) / 2` for 18, `1.375` for 19, and `1` for invalid metadata. Require the shared character factory to set `--shape-width-scale`. Require two-value CSS `scale`, centered transform origin, and a short-landscape horizontal cap of `1`. Change the alpha regression to compare both 18 and 19 against 6 using `opaquePixels × verticalScale² × widthScale`.

- [x] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/app-behavior.test.mjs tests/app-contract.test.mjs tests/responsive-layout.test.mjs tests/character-assets.test.mjs
```

Expected: FAIL because the width function, DOM variable, and axis-separated CSS do not exist and 19 remains smaller than 6.

- [x] **Step 3: Implement the bounded horizontal correction**

Add `characterShapeWidthScale(number, rows, cols)` beside `characterShapeScale`. It reuses the shape scale and returns:

```js
1 + (characterShapeScale(number, rows, cols) - 1) * 0.5
```

Set the result as `--shape-width-scale` in `character()`. In CSS, introduce a resolved vertical scale and apply a second scale value for the horizontal axis:

```css
--shape-width-scale: 1;
--screen-width-scale-cap: 1.375;
--resolved-character-scale: min(
  calc(var(--number-scale) * var(--shape-scale)),
  var(--screen-scale-cap)
);
scale:
  calc(
    var(--resolved-character-scale) *
    min(var(--shape-width-scale), var(--screen-width-scale-cap))
  )
  var(--resolved-character-scale);
transform-origin: 50% 50%;
```

Inside short landscape, set `--screen-width-scale-cap: 1`.

- [x] **Step 4: Verify GREEN and full regressions**

Run the focused command, `git diff --check`, and `npm test`. Expected: all tests PASS.

- [x] **Step 5: Commit the browser-QA correction**

```bash
git add src/app-behavior.mjs src/app.mjs styles.css tests/app-behavior.test.mjs tests/app-contract.test.mjs tests/responsive-layout.test.mjs tests/character-assets.test.mjs docs/superpowers
git commit -m "fix: 좁은 큰 수 캐릭터 가로 면적 보정"
```

- [x] **Step 6: Verify three responsive viewports**

At 1280×720 verify a 19 versus 1–10 scene: 19 has a larger visible body, stays within the stage, and does not cover the operator. At 390×844 verify the mobile keypad and answer field remain usable. At 640×360 verify horizontal widening resolves to `1` and all controls remain visible. Check the browser console at every size.
