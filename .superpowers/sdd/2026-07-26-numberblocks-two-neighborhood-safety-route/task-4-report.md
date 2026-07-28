# Task 4 report — slow scooter and bicycle patrols

## Implementation

- Added `src/safety-route-movers.mjs`: a pure patrol state machine with a
  1,000 ms default cadence (or a valid definition interval), endpoint reversal,
  player-cell stop/reversal after 600 ms, and one-index-per-call delay handling.
- `src/safety-route-model.mjs` now creates mover runtime state through the
  shared constructor, advances only scooter/bicycle movers with the patrol
  state machine, and retains the existing signal/stop behavior for cars.
- Player moves into an occupied live scooter/bicycle cell return the required
  non-punitive `blocked` / `moving-rider` event and leave position, movers, and
  collected friends unchanged.
- Added mover unit coverage and updated model integration coverage.

Files changed:

- `src/safety-route-movers.mjs` (new)
- `tests/safety-route-movers.test.mjs` (new)
- `src/safety-route-model.mjs`
- `tests/safety-route-model.test.mjs`

## TDD evidence

RED:

```sh
node --test tests/safety-route-movers.test.mjs
```

Result: failed as intended with `ERR_MODULE_NOT_FOUND` for
`src/safety-route-movers.mjs`.

GREEN (pure state machine):

```sh
node --test tests/safety-route-movers.test.mjs
```

Result: 3 passing, 0 failing.

RED/GREEN (model integration):

```sh
node --test tests/safety-route-movers.test.mjs tests/safety-route-model.test.mjs
```

Before integration, the two new model tests failed because riders moved with
cars every tick and occupied rider cells allowed player movement. After
integration, the command reported 23 passing, 0 failing.

## Full verification

```sh
npm test
```

Result: 195 passing, 0 failing (exit 0).

`git diff --check` also completed with no whitespace errors.

## Self-review and concerns

- Cars retain their legacy wrap and signal-stop branch; the new rider branch is
  limited to scooter/bicycle paths.
- Long elapsed ticks discard excess time after one rider move, preventing
  background-tab jumps.
- The map currently supplies no per-rider interval, so the pure module uses the
  task’s 1,000 ms cadence as a safe default while accepting `definition.intervalMs`.
- No remaining concerns.
