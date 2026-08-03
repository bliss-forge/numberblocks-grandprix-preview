# Task 3 report — realistic scene layers

## Result

Mounted persistent cab and exterior WebP nodes in the existing two-view stage.
The canonical cab backdrop and side-train SVG layers remain mounted as fallbacks.
Scene updates select assets from `ktx-realistic-assets.mjs`, update `src` only when
the relative asset path changes, and expose `data-realistic="fallback"` immediately
after either image reports an error.

## RED evidence

Command for every cycle:

```sh
node --test tests/ktx-realistic-scene.test.mjs
```

- Mount contract: 0 passed, 1 failed because `.ktx-real-scene` was absent.
- Update/fallback contract: 1 passed, 2 failed because the exterior path stayed
  on `city` and `root.dataset.realistic` was unset.
- Browser-normalized `img.src`: 2 passed, 1 failed because the same path was
  assigned three times instead of once.
- NodeList compatibility: 3 passed, 1 failed with
  `images.some is not a function`.

## GREEN evidence

```sh
node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey.test.mjs
```

Result before final verification: 32 passed, 0 failed.

Final relevant verification:

```sh
node --test tests/ktx-realistic-scene.test.mjs \
  tests/ktx-realistic-assets.test.mjs tests/ktx-journey.test.mjs \
  tests/ktx-train-model.test.mjs
```

Result: 44 passed, 0 failed.

Full regression:

```sh
npm test
```

Result: 398 passed, 0 failed.

## Files

- `src/ktx-scene.mjs`
- `tests/ktx-realistic-scene.test.mjs`
- `.superpowers/sdd/2026-08-03-srt-photorealistic-95/task-3-report.md`

## Commit

`feat: mount realistic SRT scene layers` (final SHA is reported in the handoff).

## Concerns

No simulation code changed. Task 3 intentionally leaves loading-veil and
keep-current-image-until-next-load behavior to Task 5, as scoped by the plan.

## Review fix round 1

Review identified two state-contract gaps: the scene reported `ready` before
both current images loaded, and same-path cab updates skipped alt synchronization.

RED command:

```sh
node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey.test.mjs
```

RED result: 30 passed, 5 failed. The new regressions observed `ready` instead
of `pending` on initial render/path change, and stale
`실사 SRT morning city 운전실` alt text after moving to the day/field band.

GREEN command:

```sh
node --test tests/ktx-realistic-scene.test.mjs tests/ktx-journey.test.mjs
```

GREEN result: 35 passed, 0 failed. The scene now requires both current images'
`data-loaded="true"` before `ready`, enters `fallback` on any current failure,
returns to `pending` when a selected path changes, and refreshes alt text without
rewriting an unchanged `src`.
