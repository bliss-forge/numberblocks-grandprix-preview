# Task 5 report — browser QA and final regression verification

## Status

DONE_WITH_CONCERNS. The connected-character redesign passes 69 automated tests and the required desktop/mobile browser scenarios. Browser QA found two responsive layout defects, captured both in failing regression tests, and verified minimal CSS fixes.

## Browser setup and URLs

- Worktree server: `http://127.0.0.1:4174/`
- Deterministic addition harness:
  `http://127.0.0.1:4174/.superpowers/sdd/task-5-artifacts/qa-harness.html?rng=0.10555555555555556`
- Deterministic multiplication harness:
  `http://127.0.0.1:4174/.superpowers/sdd/task-5-artifacts/qa-harness.html?rng=0.575`
- Safe image-error harness: addition URL plus `&break=38`; it substitutes an invalid data-image URL after the operand listener is installed, so no production code or asset is changed and no network 404 is created.
- Representative-answer harnesses used deterministic challenge-addition RNG values for answers 10, 11, 20, 38, 50, 72, 99, and 100.
- Viewports: 1280×720 and 390×844.
- Browser surface: Chrome extension backend through the Browser plugin/browser-client. Standalone Playwright was not used.

The harness fetches the production `index.html`, adds a root `<base>`, installs only the requested deterministic RNG or image-error hook, then imports the production `src/app.mjs`. It lives only in the ignored QA artifact directory and is not production code.

## Scenario outcomes

### Addition: 6 + 38

- PASS: left operand is `assets/characters/six.png`.
- PASS: right operand is `assets/characters/number-038.png`.
- PASS: both slots are equal at 1280×720 (371.20 px each) and rendered operands occupy equal 330 px boxes.
- PASS: at 390×844 both rendered operand boxes are equal (112.13 px wide).
- PASS: 38 visibly has a 3-wide pink cap, 5-wide yellow body, pink belt, and low face.
- PASS: 38 has comparable visual presence to 6 at both sizes.
- PASS: the operator is centered, `6 + 38` is visible below, and old quantity cards are absent.
- PASS after fix: document bounds equal the viewport at both sizes with no horizontal overflow.

Evidence:

- `.superpowers/sdd/task-5-artifacts/add-6-plus-38-1280x720-after.png`
- `.superpowers/sdd/task-5-artifacts/add-6-plus-38-390x844.png`
- Before-fix evidence:
  `.superpowers/sdd/task-5-artifacts/add-6-plus-38-1280x720.png` and
  `.superpowers/sdd/task-5-artifacts/add-6-plus-38-mobile-before.png`

### Multiplication: 6 × 8

- PASS: both operands are legacy character images, `six.png` and `eight.png`.
- PASS: `6 × 8` is visible below the characters.
- PASS: `.multiplication-grid`, `.multiplication-scene`, and quantity visuals are absent.
- PASS: keyboard `9` triggers retry, resets the answer to `?`, marks both characters wrong, and shows `괜찮아요! 천천히 다시 눌러 봐요.`
- PASS: keyboard `4` preserves the prefix, then `8` enters the correct answer 48.
- PASS: correct-answer celebration displays `number-048.png`, increments stars, and shows the cheer.
- PASS: server logs show Korean retry audio plus Korean and English number-48 audio requests returning 200.
- PASS: the same two-character layout remains unclipped at 390×844.

Evidence:

- `.superpowers/sdd/task-5-artifacts/mul-6-times-8-1280x720.png`
- `.superpowers/sdd/task-5-artifacts/mul-6-times-8-390x844.png`
- `.superpowers/sdd/task-5-artifacts/mul-48-correct.png`

### Representative correct-answer celebrations

All required answers entered the `celebrating` phase, showed the exact answer in the answer box, incremented the star count, and loaded the expected asset:

| Answer | Asset |
| --- | --- |
| 10 | `ten.png` |
| 11 | `number-011.png` |
| 20 | `number-020.png` |
| 38 | `number-038.png` |
| 50 | `number-050.png` |
| 72 | `number-072.png` |
| 99 | `number-099.png` |
| 100 | `number-100.png` |

Visual review found no clipped bodies or faces. Shape differences remain intentional: tall characters stay tall, while wide characters keep their proportions. The set does not show a jarring scale discontinuity between legacy 10 and connected 11.

Evidence:

- `.superpowers/sdd/task-5-artifacts/representative-celebrations-contact-sheet.png`
- Individual files:
  `.superpowers/sdd/task-5-artifacts/celebration-{10,11,20,38,50,72,99,100}-1280x720.png`

### Image-error fallback

- PASS: the injected 38 image error replaces only the right operand with `<strong class="operand-fallback">38</strong>`.
- PASS: the 6 image, equation, active playing phase, and answer input remain intact.
- PASS: the invalid data-image injection creates no missing server request.

Evidence: `.superpowers/sdd/task-5-artifacts/operand-fallback-38.png`

## Console and network

- Final fresh browser tab, application-origin console errors: 0.
- Final fresh browser tab, application warnings: 0.
- Raw console errors: 3, all from the installed PDF extension
  (`chrome-extension://efaidnbmnnnibpcajpcglclefindmkaj`), with no application stack.
- Missing character asset requests: 0.
- Character-asset 404 responses: 0.
- Application resource/network errors: 0.
- Chrome still requested `/favicon.ico` once and received 404 despite the production data-URL favicon. This is isolated from character/application resources.
- Required prompt, retry, Korean answer, English answer, and character requests observed during the scenarios returned 200 or 304.

## Bugs found and RED/GREEN evidence

### QA-001: equation clipped below the stage

At 1280×720, `6 + 38` had a DOM box ending at y=630 while the clipped stage frame ended at y=537. At 390×844, the equation ended at y=689 while the stage ended at y=676, leaving only the top of the text visible.

Regression test created before the production fix:

```text
node --test tests/task-5-browser-regression.test.mjs
```

RED: 0 passed, 2 failed. The operand scene had a fixed 560 px height, the character had no container max-height, the equation allowed wrapping, and the narrow rule forced a 560 px minimum page width.

Minimal fix in `styles.css`:

- fit `.operand-scene` to the actual stage with `height: 100%` and `min-height: 0`;
- cap `.operand-character` at the available row height;
- keep `.equation-label` on one line;
- remove the 560 px document-width floor.

Focused GREEN:

```text
node --test tests/task-5-browser-regression.test.mjs tests/app-contract.test.mjs
```

Result: 9 passed, 0 failed.

### QA-002: third home mode card clipped at 390 px

After removing the legacy page-width floor, the third card ended at x=511.67 in a 390 px viewport because the three grid tracks still had 155 px minimum widths.

Regression test created before the production fix:

```text
node --test --test-name-pattern='세 놀이 카드' tests/task-5-browser-regression.test.mjs
```

RED: 0 passed, 1 failed.

Minimal fix: at 640 px and narrower, allow all three grid tracks to shrink with `minmax(0, 1fr)`, reduce the gap/padding, and use compact card copy. Browser recheck placed the third card at x=262.24–385.27 inside the 390 px viewport.

Focused GREEN:

```text
node --test tests/task-5-browser-regression.test.mjs tests/app-contract.test.mjs
```

Result: 10 passed, 0 failed.

## Final verification

```text
npm test
git diff --check
```

- `npm test`: 69 passed, 0 failed, 0 skipped.
- `git diff --check`: exit 0, no whitespace errors.

## Files

Production/spec/test changes:

- `styles.css`
- `tests/task-5-browser-regression.test.mjs`
- `docs/superpowers/specs/2026-07-20-numberblocks-connected-character-redesign-design.md`

QA-only ignored artifacts:

- `.superpowers/sdd/task-5-report.md`
- `.superpowers/sdd/task-5-artifacts/qa-harness.html`
- `.superpowers/sdd/task-5-artifacts/*.png`

No character catalog, renderer, PNG, `src/app.mjs`, audio, difficulty, count, or input logic change was needed.

## Self-review

- Both fixes are limited to evidence-backed scene/responsive CSS and one new regression file.
- The scene fix uses the parent’s actual available height, so it covers both target sizes without another hard-coded viewport height.
- Equal operand slots, intrinsic image proportions, and the connected-character asset catalog remain unchanged.
- The representative screenshots visually confirm faces, accessories, belts, and bodies rather than relying only on DOM presence.
- The deterministic hook is outside production code and was not staged.
- The pre-existing modification to `.superpowers/sdd/task-4-report.md` was preserved and excluded from Task 5.

## Concerns

- The connected Chrome profile injects a PDF extension that logs three errors on every navigation. Application-origin error count remains zero, but the raw browser console cannot be literally empty in this profile.
- Chrome’s automatic `/favicon.ico` request produces one non-application 404 even though `index.html` declares a data-URL favicon. No character or application resource is missing.
