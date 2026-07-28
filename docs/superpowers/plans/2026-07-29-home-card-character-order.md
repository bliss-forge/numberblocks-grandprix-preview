# Home Card Character Order Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every home game card display the Numberblock friend whose number matches the card shortcut, and leave a precise Claude Code brief for a later visual redesign.

**Architecture:** Keep the existing static HTML card structure and replace only the three incorrect image paths. Strengthen the static shell contract so each mode card is checked independently, then add a root `CLAUDE.md` that limits a future Claude redesign to presentation work.

**Tech Stack:** Static HTML, CSS, Node.js built-in test runner, Playwright browser QA.

## Global Constraints

- The card mapping is exactly `1→one.png`, `2→two.png`, `3→three.png`, `4→four.png`, `5→five.png`.
- Preserve card order, labels, background colors, sizes, and keyboard shortcuts.
- Reuse the existing 2D character assets; do not create or replace images.
- Do not change game rules, audio, safety-route logic, or answer input behavior.
- Keep 1280×720 desktop and 390×844 mobile layouts free of clipping and horizontal scrolling.

---

### Task 1: Enforce and fix exact card-to-character mapping

**Files:**
- Modify: `tests/app-contract.test.mjs`
- Modify: `index.html`

**Interfaces:**
- Consumes: existing `.mode-card`, `data-mode`, `.card-number`, and static image paths.
- Produces: an exact contract between modes `count/add/sub/mul/safety` and assets `one/two/three/four/five.png`.

- [ ] **Step 1: Replace the loose asset assertions with a failing per-card contract**

```js
for (const [mode, key, asset] of [
  ["count", "1", "one"],
  ["add", "2", "two"],
  ["sub", "3", "three"],
  ["mul", "4", "four"],
  ["safety", "5", "five"]
]) {
  const card = html.match(
    new RegExp(`<button class="[^"]*mode-card[^"]*"[^>]*data-mode="${mode}"[\\s\\S]*?</button>`)
  )?.[0];
  assert.ok(card, `${mode} card`);
  assert.match(card, new RegExp(`<span class="card-number">${key}</span>`));
  assert.match(
    card,
    new RegExp(`<img src="assets/characters/${asset}\\.png" alt="">`)
  );
}
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `node --test tests/app-contract.test.mjs`

Expected: FAIL on the `add`, `sub`, and `safety` cards because they currently use `three.png`, `five.png`, and `one.png`.

- [ ] **Step 3: Apply the minimal HTML mapping change**

```html
<!-- count -->  <img src="assets/characters/one.png" alt="">
<!-- add -->    <img src="assets/characters/two.png" alt="">
<!-- sub -->    <img src="assets/characters/three.png" alt="">
<!-- mul -->    <img src="assets/characters/four.png" alt="">
<!-- safety --> <img src="assets/characters/five.png" alt="">
```

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `node --test tests/app-contract.test.mjs`

Expected: all app-contract tests pass.

- [ ] **Step 5: Commit the mapping change**

```bash
git add tests/app-contract.test.mjs index.html
git commit -m "fix: align home cards with numbered friends"
```

### Task 2: Add Claude Code redesign guardrails

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: the approved mapping specification and existing project test commands.
- Produces: automatically loaded Claude Code instructions for a later home-screen visual redesign.

- [ ] **Step 1: Write the Claude project brief**

```markdown
# Numberblocks Minigame Claude Instructions

## Current redesign assignment

Redesign only the home selection screen. Preserve all game behavior and reuse the existing character assets.

## Non-negotiable card contract

- Card order and shortcuts: 1 count, 2 add, 3 subtract, 4 multiply, 5 safety route.
- Character mapping: 1 one.png, 2 two.png, 3 three.png, 4 four.png, 5 five.png.
- Keep all Korean titles and subtitles unless the user explicitly approves copy changes.

## Visual constraints

- Keep the playful pastel, flat 2D direction; do not introduce 3D-rendered characters.
- Preserve character identity and proportions by using files under assets/characters/.
- Fit 1280×720 desktop and 390×844 mobile without clipping or horizontal scrolling.
- Maintain visible keyboard shortcuts, focus states, and touch targets.

## Protected behavior

Do not change math generation, difficulty ranges, Korean/English audio, answer input, character files, or safety-route gameplay.

## Required verification

Run npm test. Capture the home screen at 1280×720 and 390×844. Report changed files and ask for approval before merging or pushing.
```

- [ ] **Step 2: Check the brief for placeholders and protected-scope omissions**

Run: `rg -n "T[B]D|T[O]DO|FIX[M]E" CLAUDE.md`

Expected: no matches. Manually confirm the brief names both viewport sizes, all five mappings, protected behavior, and `npm test`.

- [ ] **Step 3: Commit the Claude brief**

```bash
git add CLAUDE.md
git commit -m "docs: guide Claude home screen redesign"
```

### Task 3: Verify the complete change visually and functionally

**Files:**
- Verify: `index.html`
- Verify: `CLAUDE.md`
- Verify: `tests/app-contract.test.mjs`

**Interfaces:**
- Consumes: Tasks 1 and 2.
- Produces: test and browser evidence that the mapping is correct without layout regression.

- [ ] **Step 1: Run the full automated test suite**

Run: `npm test`

Expected: all tests pass with zero failures.

- [ ] **Step 2: Check formatting and repository state**

Run: `git diff --check && git status --short --branch`

Expected: no whitespace errors and only expected branch state.

- [ ] **Step 3: Capture both home layouts**

Use Playwright to open the home page at 1280×720 and 390×844. Confirm each card shows the matching numbered friend, all five cards fit, and the page has no horizontal scroll.

- [ ] **Step 4: Record the verification result**

Report the focused RED/GREEN evidence, final full-test count, screenshot paths, and any residual visual limitations. Do not merge or push without explicit user approval.
