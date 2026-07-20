# Final whole-branch review fix report

## Status

PASS. All final-review geometry findings and the named report cleanup are addressed. No gameplay, difficulty, audio, input, or problem-scene behavior changed.

## Root cause

- The original renderer fitted only the rectangular cell grid to `SAFE`, then drew limbs and accessories outside that fitted body.
- Arm starts used the grid-wide `layout.left` and `layout.left + bodyWidth`, even when the selected pose row had empty cells at those edges.
- Top accessories used the fixed canvas center instead of the occupied cells in the actual top row.
- The old `data-safe-fill` test measured body metadata rather than rasterized visible pixels.

## RED evidence

Focused geometry tests were added before production changes.

```text
node --test tests/character-renderer.test.mjs tests/character-assets.test.mjs
```

Result: exit 1, 12 tests, 8 passed, 4 failed as expected.

- Full visible bounds: `number-011.png visible bottom 1371` failed the required `< 1240` safe bound.
- Uniform full-character transform: the SVG had no `#character` matrix transform.
- Stepped anatomy: `15 left arm starts at occupied cell` failed.
- Top silhouette: `15 left ear overlap` failed.

The failures reproduced the review findings rather than syntax, fixture, or environment errors.

## GREEN implementation

- `rowSilhouette()` derives occupied-cell bounds for the selected pose row; left and right arms start five units inside those actual edge cells.
- `topSilhouette()` derives the occupied top-row left, right, center, and width. Hats, crowns, flowers, pom-poms, gems, antennae, plumes, stars, ears, and horns now anchor from that silhouette.
- The CLI performs a two-pass render. It first rasterizes the complete raw SVG, decodes the PNG alpha channel, measures every visible pixel, then applies one uniform matrix to the complete `#character` group.
- The target fill is 0.86 of the shared safe area, preserving aspect ratio while centering the complete silhouette.
- The body-only `data-safe-fill` claim was removed.
- All `number-011.png` through `number-100.png` assets were regenerated.

Focused GREEN:

```text
node --test tests/character-renderer.test.mjs tests/character-spec.test.mjs tests/character-assets.test.mjs
```

Result: exit 0, 17 passed, 0 failed.

The asset test decodes and asserts the complete alpha bounds of all 90 connected PNGs; it does not rely on SVG data attributes.

## Representative visible bounds

Shared safe area: x=120..903 and y=190..1239.

```text
number-015.png: x=175..848, y=324..1105, 674x782, fill=0.8597
number-045.png: x=174..848, y=361..1068, 675x708, fill=0.8610
number-055.png: x=174..848, y=328..1101, 675x774, fill=0.8610
number-066.png: x=174..848, y=328..1101, 675x774, fill=0.8610
number-078.png: x=174..848, y=328..1101, 675x774, fill=0.8610
number-038.png: x=175..848, y=303..1126, 674x824, fill=0.8597
number-100.png: x=175..848, y=416..1013, 674x598, fill=0.8597
```

## Visual verification

Artifact:

- `.superpowers/sdd/final-review-fix-artifacts/representative-contact-sheet.png`
- Absolute path: `/Users/bosung_kim/bliss/bliss_github/D_ETC/numberblocks_minigame/.worktrees/connected-character-redesign/.superpowers/sdd/final-review-fix-artifacts/representative-contact-sheet.png`

Contact-sheet order is 15, 45, 55, 66 across the first row, then 78, 38, 100 on the second row.

Findings from the generated PNGs:

- 15, 45, 55, 66, and 78 have continuous left and right arm joins at occupied step cells.
- 15, 55, 66, and 78 have both ear bases attached to their one-cell top silhouettes; 15's former floating left ear is resolved.
- 38 retains the approved three-cell pink top, five-cell body, pink belt, low face, and connected geometry.
- 100 retains its square silhouette and single eye; hands and feet are fully inside the safe area.
- No representative has clipping or detached visible anatomy.

## Full verification

```text
npm test
git diff --check
```

- `npm test`: exit 0, 72 passed, 0 failed, 0 skipped.
- `git diff --check`: exit 0, no whitespace errors.

## Report cleanup

- `.superpowers/sdd/task-5-report.md` now classifies itself as the tracked QA report and keeps only the harness/screenshots under ignored artifacts.
- The known agent-created `.superpowers/sdd/task-4-report.md` scratch modification was restored exactly to `HEAD`; it has no remaining diff.

## Files

- Added: `scripts/png_alpha_bounds.mjs`
- Modified: `scripts/render_character_pack.mjs`
- Modified: `tests/character-renderer.test.mjs`
- Modified: `tests/character-assets.test.mjs`
- Modified: `.superpowers/sdd/task-5-report.md`
- Regenerated: `assets/characters/number-011.png` through `number-100.png`
- Added report/artifact: `.superpowers/sdd/final-review-fix-report.md`, `.superpowers/sdd/final-review-fix-artifacts/representative-contact-sheet.png`

## Self-review

- The normalization matrix uses one scale value for x and y, so intrinsic aspect ratios are preserved.
- Safe-area verification is independent of renderer metadata and covers every visible alpha pixel in every generated asset.
- Attachment tests inspect actual path starts and actual rendered body rectangles.
- Accessory tests inspect actual ear triangle bases against actual top-row rectangles.
- Changes are limited to the reviewed renderer, generated assets, focused tests, and named report cleanup.

## Concerns

No known functional concerns. The renderer continues to use macOS `sips`, as it did before this fix; the new alpha decoder intentionally validates the non-interlaced 8-bit RGBA PNG format produced by that existing pipeline.
