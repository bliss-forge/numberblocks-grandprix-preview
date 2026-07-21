# Numberblocks Magnitude Scaling Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the current 1–10 character size while making every 11–150 character visibly larger by its approved numeric band, with a safe cap on very short landscape screens.

**Architecture:** Keep number-to-band selection as a pure function in `src/app-behavior.mjs`, continue attaching the selected band through `src/app.mjs`, and express all visual scaling and short-screen caps in `styles.css`. Extend the existing Node contract tests instead of regenerating character assets or changing game/audio behavior.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js `node:test`, in-app browser visual QA.

## Global Constraints

- The 1–10 character size remains exactly 1.0×.
- Numeric bands are exactly 11–20 at 1.2×, 21–50 at 1.4×, 51–100 at 1.6×, and 101–150 at 1.8× on ordinary desktop and mobile screens.
- Addition, subtraction, multiplication, count scenes, and celebration scenes all consume the same `characterSizeBand(number)` result.
- Under `@media (max-width: 900px) and (max-height: 500px)`, full character visibility takes priority and each enlarged tier receives an explicit reduced cap while retaining ascending relative order.
- Existing character image assets, audio, keyboard/mobile input, game rules, and the flat visual style remain unchanged.
- Every production change follows RED → GREEN → full regression test → commit.

---

### Task 1: Five Numeric Size Bands

**Files:**
- Modify: `tests/app-behavior.test.mjs`
- Modify: `src/app-behavior.mjs`

**Interfaces:**
- Produces: `characterSizeBand(number: number): "base" | "scale-120" | "scale-140" | "scale-160" | "scale-180"`
- Consumes later: `src/app.mjs` assigns the returned value to `image.dataset.sizeBand` for every character.

- [ ] **Step 1: Replace the old three-band test with failing boundary tests**

In `tests/app-behavior.test.mjs`, replace the existing character-size test with:

```js
test("캐릭터 숫자를 지정된 다섯 배율 단계로 나눈다", () => {
  const boundaries = [
    [1, "base"],
    [10, "base"],
    [11, "scale-120"],
    [20, "scale-120"],
    [21, "scale-140"],
    [50, "scale-140"],
    [51, "scale-160"],
    [100, "scale-160"],
    [101, "scale-180"],
    [150, "scale-180"]
  ];

  for (const [number, band] of boundaries) {
    assert.equal(characterSizeBand(number), band, `number ${number}`);
  }
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test tests/app-behavior.test.mjs`

Expected: FAIL at number 11 because the existing function returns `base` instead of `scale-120`.

- [ ] **Step 3: Implement the five exact bands**

Replace `characterSizeBand` in `src/app-behavior.mjs` with:

```js
export function characterSizeBand(number) {
  if (number >= 101) return "scale-180";
  if (number >= 51) return "scale-160";
  if (number >= 21) return "scale-140";
  if (number >= 11) return "scale-120";
  return "base";
}
```

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `node --test tests/app-behavior.test.mjs`

Expected: all app-behavior tests PASS.

- [ ] **Step 5: Commit the band-selection change**

```bash
git add src/app-behavior.mjs tests/app-behavior.test.mjs
git commit -m "feat: 숫자별 캐릭터 크기 단계 확장"
```

---

### Task 2: Exact Scales and Short-Screen Caps

**Files:**
- Modify: `tests/responsive-layout.test.mjs`
- Modify: `styles.css`

**Interfaces:**
- Consumes: `data-size-band="base|scale-120|scale-140|scale-160|scale-180"` from `src/app.mjs`.
- Produces: ordinary-screen scales `1/1.2/1.4/1.6/1.8` and short-landscape capped scales `1/1.1/1.15/1.2/1.25`.

- [ ] **Step 1: Write failing CSS contract tests for exact ordinary-screen scales**

Replace the old medium/large assertions in the first test of `tests/responsive-layout.test.mjs` with:

```js
for (const [band, scale] of [
  ["scale-120", "1.2"],
  ["scale-140", "1.4"],
  ["scale-160", "1.6"],
  ["scale-180", "1.8"]
]) {
  assert.match(
    css,
    new RegExp(`\\.character\\[data-size-band="${band}"\\]\\s*\\{[^}]*--number-scale:\\s*${scale.replace(".", "\\.")};`, "s")
  );
}
```

Replace the old mobile-reduction test with a test proving that the ordinary mobile block does not override those exact scales:

```js
test("일반 모바일은 데스크톱과 같은 숫자 배율을 사용한다", () => {
  const mobileCss = mediaBlock("@media (max-width: 640px)");
  assert.doesNotMatch(mobileCss, /data-size-band=[^}]+--number-scale:/s);
  assert.match(
    mobileCss,
    /#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto\s+auto\s+auto;/s
  );
});
```

- [ ] **Step 2: Write failing short-landscape cap assertions**

Add this test to `tests/responsive-layout.test.mjs`:

```js
test("높이 500px 이하 가로 화면은 확대 배율에 안전 상한을 둔다", () => {
  const shortHeightCss = mediaBlock(shortHeightMarker);
  for (const [band, scale] of [
    ["scale-120", "1.1"],
    ["scale-140", "1.15"],
    ["scale-160", "1.2"],
    ["scale-180", "1.25"]
  ]) {
    assert.match(
      shortHeightCss,
      new RegExp(`\\.character\\[data-size-band="${band}"\\]\\s*\\{[^}]*--number-scale:\\s*${scale.replace(".", "\\.")};`, "s")
    );
  }
});
```

- [ ] **Step 3: Run the responsive test and verify RED**

Run: `node --test tests/responsive-layout.test.mjs`

Expected: FAIL because the new band selectors and four explicit short-screen caps are absent.

- [ ] **Step 4: Implement the exact ordinary-screen scales**

In the base character section of `styles.css`, replace the two old selectors with:

```css
.character[data-size-band="scale-120"] {
  --number-scale: 1.2;
}

.character[data-size-band="scale-140"] {
  --number-scale: 1.4;
}

.character[data-size-band="scale-160"] {
  --number-scale: 1.6;
}

.character[data-size-band="scale-180"] {
  --number-scale: 1.8;
}
```

Remove the old `medium` and `large` scale overrides from `@media (max-width: 640px)` so ordinary mobile retains the exact base rules.

- [ ] **Step 5: Implement explicit low-landscape caps**

Inside `@media (max-width: 900px) and (max-height: 500px)`, replace its old medium/large overrides with:

```css
  .character[data-size-band="scale-120"] {
    --number-scale: 1.1;
  }

  .character[data-size-band="scale-140"] {
    --number-scale: 1.15;
  }

  .character[data-size-band="scale-160"] {
    --number-scale: 1.2;
  }

  .character[data-size-band="scale-180"] {
    --number-scale: 1.25;
  }
```

Keep the existing short-screen `.character`, `.operand-character`, `.count-character`, and celebration maximum dimensions intact; together with the reduced scale values they keep limbs and accessories inside the stage.

- [ ] **Step 6: Verify GREEN and run all regressions**

Run: `node --test tests/responsive-layout.test.mjs`

Expected: all responsive-layout tests PASS.

Run: `npm test`

Expected: all tests PASS, including app behavior, DOM contracts, responsive layout, audio, and assets.

- [ ] **Step 7: Commit the responsive scale rules**

```bash
git add styles.css tests/responsive-layout.test.mjs
git commit -m "feat: 캐릭터 크기 배율과 화면 상한 적용"
```

---

### Task 3: Runtime and Visual Regression Verification

**Files:**
- Verify only: `index.html`
- Verify only: `src/app.mjs`
- Verify only: `styles.css`

**Interfaces:**
- Consumes: the five-band selector and CSS scale contracts from Tasks 1–2.
- Produces: evidence that the application loads, `20 − 6` renders 20 larger than 6, mobile controls remain usable, and short landscape characters remain fully visible.

- [ ] **Step 1: Run static and full automated verification**

Run:

```bash
git diff --check
npm test
```

Expected: `git diff --check` prints nothing and all tests PASS.

- [ ] **Step 2: Start the local application and confirm loading**

Run: `python3 -m http.server 4174 --bind 0.0.0.0`

Open: `http://127.0.0.1:4174/`

Expected: the home screen loads without console errors and the existing mode/difficulty controls work.

- [ ] **Step 3: Verify the representative desktop subtraction scene**

At a 1280×720 viewport, enter subtraction and advance until the operands are 20 and 6. Inspect both character elements with:

```js
[...document.querySelectorAll(".operand-character")].map((element) => ({
  number: element.dataset.number,
  band: element.dataset.sizeBand,
  width: element.getBoundingClientRect().width,
  height: element.getBoundingClientRect().height
}));
```

Expected: number 20 has band `scale-120`, number 6 has band `base`, and the rendered 20 character is visually larger without overlapping the operator, equation, or answer controls.

- [ ] **Step 4: Verify ordinary mobile and short landscape safety**

At 390×844, verify a 101–150 character uses `scale-180`, remains fully visible, and does not overlap the expression, answer box, or numeric keypad. At 640×360, verify the same character is capped to 1.25, all limbs/accessories remain inside the stage, and the two-row keypad remains tappable.

- [ ] **Step 5: Record final repository state**

Run:

```bash
git status --short
git log -3 --oneline
```

Expected: the worktree is clean and the two implementation commits appear above the design/plan commits.
