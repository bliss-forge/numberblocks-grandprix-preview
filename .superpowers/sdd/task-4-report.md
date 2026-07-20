# Task 4 — Character catalog and renderer through 150

## Status

PASS. The connected character catalog now contains 140 designs for 11–150,
`buildCharacterSpec()` and `characterAsset()` support every integer through
150, the renderer accepts reference and extension specs through 150, and
`NUMBERBLOCKS` consumes all 150 specs. No PNG files were rendered or modified.

## Commit

- `9476e3a feat: 연결형 캐릭터 카탈로그를 150까지 확장`

## RED evidence

The range, catalog, representative renderer, and game metadata tests were
changed before production code.

```text
node --test tests/character-spec.test.mjs tests/character-renderer.test.mjs tests/game-model.test.mjs
```

Result: exit 1, 26 tests, 21 passed, 5 failed.

- 101 failed at the existing `character number must be between 1 and 100`
  guard in the all-spec, extension-spec, asset, and representative-renderer
  tests.
- `NUMBERBLOCKS` contained only 1–100 instead of the expected 1–150.

Palette coverage was tightened in a separate RED/GREEN cycle:

```text
node --test tests/character-spec.test.mjs
```

RED result: exit 1, 6 tests, 5 passed, 1 failed. Character 101 exposed the old
100 palette instead of its extension body/cap palette.

## Implementation

- Added compact connected rows for 101–150 and validated a 140-entry catalog.
- Added three flat extension palettes for 101–119, 120–139, and 140–150.
- Every extension has a one-row accent cap, base body, and a face centered on
  an occupied lower-middle cell.
- Every fifth extension uses the already-supported `single-eye` accessory.
- Extension specs report `source: "extension"` and use matching palette data.
- Raised spec, renderer, CLI, package-script, and `NUMBERBLOCKS` ranges to 150.
- Preserved all 11–100 reference design and renderer behavior.

## Verification

Focused character GREEN after catalog implementation:

```text
node --test tests/character-spec.test.mjs tests/character-renderer.test.mjs
```

Result: exit 0, 16 passed, 0 failed.

Focused game-model GREEN after the spec supported 150:

```text
node --test tests/game-model.test.mjs
```

Result: exit 0, 10 passed, 0 failed.

Palette GREEN:

```text
node --test tests/character-spec.test.mjs
```

Result: exit 0, 6 passed, 0 failed.

Fresh final focused verification:

```text
node --test tests/character-spec.test.mjs tests/character-renderer.test.mjs tests/game-model.test.mjs
git diff --check
```

Result: exit 0, 26 passed, 0 failed; no whitespace errors.

Fresh full verification:

```text
npm test
git diff --check
```

Result: exit 0, 83 passed, 0 failed, 0 skipped; no whitespace errors.

Additional invariant audit:

```text
node --input-type=module - <<'NODE'
// Assert required cap/body regions and single-eye exactly every fifth extension.
NODE
```

Result: `extension invariant audit: 50/50 passed`.

## Changed files

- `src/character-designs.mjs`
- `src/character-spec.mjs`
- `scripts/render_character_pack.mjs`
- `src/game-model.mjs`
- `package.json`
- `tests/character-spec.test.mjs`
- `tests/character-renderer.test.mjs`
- `tests/game-model.test.mjs`
- `.superpowers/sdd/task-4-report.md`

## Self-review

- Verified every 1–150 spec has the exact requested number of unique,
  four-directionally connected cells.
- Verified all 50 extension faces land on occupied cells.
- Verified every extension palette matches its rendered body and cap colors.
- Verified 101, 111, 125, 140, and 150 paint every non-overlay region and
  include body, face, and limb groups.
- Audited all 50 accessories: only multiples of five use `single-eye`.
- Checked the staged implementation diff contained only Task 4 files.

## Concerns

No known functional concerns. Character PNG generation is intentionally
deferred to Task 5; assets 101–150 do not exist yet.
