# Numberblocks Two-Neighborhood Safety Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current sparse route map with a validated 32×16 two-neighborhood safety map where children collect friends 2–10, learn alley detours, avoid slow patrol riders, and cross one central two-lane road at either of two synchronized crosswalks.

**Architecture:** Add a pure seeded layout generator and a pure patrol-mover state machine, then keep `safety-route-model.mjs` as the gameplay coordinator. The scene remains DOM/CSS based, while the camera becomes a player-centered clamped offset. `app.mjs` creates one seed per round and owns the existing render/tick/audio lifecycle.

**Tech Stack:** Browser-native ES modules, DOM/CSS, Node.js built-in test runner (`node --test`), existing character PNG assets, GitHub Pages static hosting.

## Global Constraints

- Preserve the existing counting, addition, subtraction, and multiplication games.
- Keep the safety game non-punitive: no collision, score loss, reset, or game over.
- Do not use emoji or third-party image assets for safety objects; render flat CSS illustrations.
- Use one random seed per game round so rerenders never move friends or obstacles.
- Keep the existing signal phase durations and Korean/English audio system.
- Treat the approved design spec as authoritative: `docs/superpowers/specs/2026-07-26-numberblocks-two-neighborhood-safety-route-design.md`.
- Run each task's focused test before its commit. Do not combine failing tasks into one commit.

---

## File and Interface Map

### New files

- `src/safety-route-layout.mjs`
  - `createSafetyRouteMap(difficulty, options)`
  - `validateCandidateLayout(map)`
  - `SAFE_LAYOUT_FALLBACKS`
- `src/safety-route-movers.mjs`
  - `createPatrolMover(definition)`
  - `advancePatrolMover(definition, mover, context)`
  - `moverPoint(map, mover)`
- `tests/safety-route-layout.test.mjs`
- `tests/safety-route-movers.test.mjs`

### Modified files

- `src/safety-route-model.mjs`: state creation, movement rules, signal coordination, pathfinding, map validation.
- `src/safety-route-camera.mjs`: centered, clamped camera offset.
- `src/safety-route-scene.mjs`: zone layers, multi-cell obstacles, mover direction/state hooks.
- `src/safety-route-controller.mjs`: new child-safe cues.
- `src/app.mjs`: per-round seed, world tick integration, render lifecycle.
- `styles.css`: two-neighborhood map styling and visible flat illustrations.
- `index.html`: stylesheet cache-busting version.
- Existing focused tests under `tests/`.

### Shared data contracts

Use these shapes consistently across layout, model, scene, and tests:

```js
// Static blocking object. x/y is the illustration anchor; cells is collision footprint.
{
  id: "left-manhole-1",
  type: "manhole",
  x: 8,
  y: 11,
  cells: [{ x: 8, y: 11 }]
}

// Patrol definition stored on map. All points are safe pedestrian cells.
{
  id: "left-scooter",
  type: "scooter",
  intervalMs: 1000,
  points: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }]
}

// Runtime patrol state stored on safety state.
{
  id: "left-scooter",
  type: "scooter",
  pathIndex: 0,
  direction: 1,
  elapsedMs: 0,
  pauseMs: 0,
  stopped: false
}
```

The generated map must expose `zones`, `pedestrianCells`, `roadCells`, `crossings`, `friends`, `places`, `entrances`, `hazards`, `trafficPaths`, `start`, `goal`, and `signalGate`. Keep `walkable` as an alias of `pedestrianCells` during this change so existing callers remain compatible.

---

### Task 1: Build the deterministic 32×16 layout generator

**Files:**
- Create: `src/safety-route-layout.mjs`
- Create: `tests/safety-route-layout.test.mjs`

- [ ] **Step 1: Write failing structure and determinism tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createSafetyRouteMap,
  validateCandidateLayout
} from "../src/safety-route-layout.mjs";

test("지도는 14:4:14 구역과 32×16 크기를 사용한다", () => {
  const map = createSafetyRouteMap("easy", { seed: 17 });
  assert.deepEqual({ width: map.width, height: map.height }, { width: 32, height: 16 });
  assert.deepEqual(map.zones, {
    left: { x: 0, width: 14 },
    road: { x: 14, width: 4 },
    right: { x: 18, width: 14 }
  });
});

test("각 동네에 1칸 골목 2개와 2칸 보행길 2개가 있다", () => {
  const map = createSafetyRouteMap("steady", { seed: 9 });
  assert.deepEqual(map.alleys.map(item => item.width), [1, 1, 1, 1]);
  assert.deepEqual(map.sidewalkBands.map(item => item.height), [2, 2, 2, 2]);
});

test("두 횡단보도는 도로 4칸 전체를 가로지르고 높이가 2칸이다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 2 });
  assert.equal(map.crossings.length, 2);
  for (const crossing of map.crossings) {
    assert.equal(new Set(crossing.cells.map(cell => cell.x)).size, 4);
    assert.equal(new Set(crossing.cells.map(cell => cell.y)).size, 2);
  }
});

test("같은 시드는 같은 안전 배치를 만든다", () => {
  assert.deepEqual(
    createSafetyRouteMap("challenge", { seed: 20260726 }),
    createSafetyRouteMap("challenge", { seed: 20260726 })
  );
});

test("생성 지도는 연결성 검증을 통과한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    for (let seed = 0; seed < 30; seed += 1) {
      assert.deepEqual(validateCandidateLayout(
        createSafetyRouteMap(difficulty, { seed })
      ), { valid: true, errors: [] });
    }
  }
});
```

- [ ] **Step 2: Run the focused test and verify it fails because the module is absent**

Run: `node --test tests/safety-route-layout.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `safety-route-layout.mjs`.

- [ ] **Step 3: Implement fixed geometry, candidate slots, and seeded selection**

Implement a small integer PRNG and geometry helpers in the new module:

```js
const WIDTH = 32;
const HEIGHT = 16;

function seededRandom(seed) {
  let value = (Number(seed) || 0) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function createSafetyRouteMap(
  difficulty,
  { seed = 0, maxAttempts = 20 } = {}
) {
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = assembleCandidate(difficulty, random);
    if (validateCandidateLayout(candidate).valid) return freezeMap(candidate);
  }
  return SAFE_LAYOUT_FALLBACKS[normalizeDifficulty(difficulty)];
}
```

Use explicit fixed geometry constants:

- left `x=0..13`, road `x=14..17`, right `x=18..31`;
- two 2-cell-high horizontal sidewalk bands shared with the two crosswalk heights;
- two 1-cell-wide vertical alleys per neighborhood;
- road cells cover all four center columns, with two lane records and direction metadata;
- friend candidates 2–5 only in the left zone and 6–10 only in the right zone;
- hazard and patrol candidates never overlap crossings, entrances, friends, start, or goal.

`validateCandidateLayout()` must verify dimensions, widths, bounds, non-overlap, difficulty counts, ordered friend numbers, and path connectivity from start through 2–10 to goal. Keep path validation local for now to avoid a circular import with the model.

- [ ] **Step 4: Add a forced-fallback test**

```js
test("재시도를 사용하지 않으면 검증된 고정 배치를 반환한다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 5, maxAttempts: 0 });
  assert.equal(map.layoutSource, "fallback");
  assert.deepEqual(validateCandidateLayout(map), { valid: true, errors: [] });
});
```

- [ ] **Step 5: Run the focused test and verify it passes**

Run: `node --test tests/safety-route-layout.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit the generator**

```bash
git add src/safety-route-layout.mjs tests/safety-route-layout.test.mjs
git commit -m "feat: 안전길 두 동네 지도 생성"
```

---

### Task 2: Integrate generated maps and neighborhood progression into the model

**Files:**
- Modify: `src/safety-route-model.mjs`
- Modify: `tests/safety-route-model.test.mjs`
- Modify: `tests/safety-route-guidance.test.mjs`

- [ ] **Step 1: Write failing state and crossing-gate tests**

Add tests that establish the new public contract:

```js
test("게임 상태는 한 시드로 생성한 32×16 지도를 유지한다", () => {
  const first = createSafetyRouteState("easy", { seed: 42 });
  const second = createSafetyRouteState("easy", { seed: 42 });
  assert.equal(first.seed, 42);
  assert.deepEqual(first.map, second.map);
  assert.deepEqual({ width: first.map.width, height: first.map.height }, { width: 32, height: 16 });
});

test("2~5 친구 전에는 횡단보도 너머 오른쪽 동네로 갈 수 없다", () => {
  const state = stateAtLeftCrossing({ collected: [1, 2, 3, 4], nextFriend: 5 });
  const result = attemptSafetyMove(state, "right");
  assert.deepEqual(result.event, { type: "blocked", reason: "left-friends-first" });
  assert.deepEqual(result.state.position, state.position);
});

test("5 친구를 만나면 위와 아래 횡단보도를 모두 사용할 수 있다", () => {
  for (const state of statesAtBothCrossings({
    collected: [1, 2, 3, 4, 5],
    nextFriend: 6,
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  })) {
    assert.equal(attemptSafetyMove(state, "right").event.type, "moved");
  }
});
```

Use test helpers that derive the entry cells from `map.crossings` instead of hard-coding an implementation coordinate.

- [ ] **Step 2: Run the model and guidance tests and verify the new tests fail**

Run: `node --test tests/safety-route-model.test.mjs tests/safety-route-guidance.test.mjs`

Expected: FAIL because `createSafetyRouteState` does not accept a seed and the old map has no zones.

- [ ] **Step 3: Replace static maps with the generator**

In `src/safety-route-model.mjs`:

```js
import { createSafetyRouteMap } from "./safety-route-layout.mjs";

export function createSafetyRouteState(difficulty, { seed = 0 } = {}) {
  const normalized = normalizeDifficulty(difficulty);
  const map = createSafetyRouteMap(normalized, { seed });
  return {
    difficulty: normalized,
    seed,
    map,
    position: { ...map.start },
    nextFriend: 2,
    collected: [1],
    signal: { phase: "vehicle-go", elapsedMs: 0 },
    crossingId: null,
    checkedEntrance: null,
    tick: 0,
    movers: map.trafficPaths.map(definition => ({
      id: definition.id,
      type: definition.type,
      pathIndex: 0,
      direction: 1,
      elapsedMs: 0,
      pauseMs: 0,
      stopped: false
    }))
  };
}
```

Retain `SAFETY_ROUTE_MAPS` as deterministic fallback-compatible exports for guidance and older tests:

```js
export const SAFETY_ROUTE_MAPS = Object.freeze({
  easy: createSafetyRouteMap("easy", { seed: 0 }),
  steady: createSafetyRouteMap("steady", { seed: 0 }),
  challenge: createSafetyRouteMap("challenge", { seed: 0 })
});
```

Add a zone-boundary rule before entering any road crossing cell from the left: when `nextFriend <= 5`, return blocked reason `left-friends-first`. Keep the existing red-light and green-ending checks after this rule.

- [ ] **Step 4: Make pathfinding understand multi-cell hazard footprints**

Add one helper and reuse it in movement, pathfinding, and validation:

```js
function hazardCells(hazard) {
  return hazard.cells?.length ? hazard.cells : [hazard];
}
```

Build blockers with `map.hazards.flatMap(hazardCells)`. Validate each footprint cell, not only the anchor.

- [ ] **Step 5: Update guidance fixtures and run focused tests**

Run: `node --test tests/safety-route-layout.test.mjs tests/safety-route-model.test.mjs tests/safety-route-guidance.test.mjs`

Expected: PASS.

- [ ] **Step 6: Commit model integration**

```bash
git add src/safety-route-model.mjs tests/safety-route-model.test.mjs tests/safety-route-guidance.test.mjs
git commit -m "feat: 두 동네 수집 순서와 횡단 규칙 연결"
```

---

### Task 3: Enforce obstacle footprints and safe detours

**Files:**
- Modify: `src/safety-route-layout.mjs`
- Modify: `src/safety-route-model.mjs`
- Modify: `tests/safety-route-layout.test.mjs`
- Modify: `tests/safety-route-model.test.mjs`

- [ ] **Step 1: Write failing difficulty and detour tests**

```js
test("난이도별 장애물과 이동체 수가 확정값을 따른다", () => {
  const counts = difficulty => {
    const map = createSafetyRouteMap(difficulty, { seed: 8 });
    return {
      manholes: map.hazards.filter(item => item.type === "manhole").length,
      construction: map.hazards.filter(item => item.type === "construction").length,
      riders: map.trafficPaths.filter(item => ["scooter", "bicycle"].includes(item.type)).length
    };
  };
  assert.deepEqual(counts("easy"), { manholes: 1, construction: 0, riders: 1 });
  assert.deepEqual(counts("steady"), { manholes: 1, construction: 1, riders: 1 });
  assert.deepEqual(counts("challenge"), { manholes: 2, construction: 1, riders: 2 });
});

test("맨홀은 2칸 길 한 칸만 막고 옆 칸은 통과 가능하다", () => {
  const state = stateBesideHazard("manhole");
  assert.equal(attemptSafetyMove(state, directionIntoHazard(state)).event.reason, "manhole");
  assert.ok(findSafetyPath(state.map, state.position, nextCellPastHazard(state)).length > 0);
});

test("공사장은 골목 한 줄을 막지만 같은 동네의 다른 골목은 연결된다", () => {
  const map = createSafetyRouteMap("steady", { seed: 8 });
  const construction = map.hazards.find(item => item.type === "construction");
  assert.ok(construction.cells.length > 1);
  assert.ok(findSafetyPath(map, map.start, map.friends[3]).length > 0);
});
```

- [ ] **Step 2: Run focused tests and verify they fail on old hazard semantics**

Run: `node --test tests/safety-route-layout.test.mjs tests/safety-route-model.test.mjs`

Expected: FAIL on footprint and difficulty count assertions.

- [ ] **Step 3: Implement candidate constraints and complete-alley construction footprints**

Update layout assembly so:

- every manhole candidate has a `pairedBypassCell` that remains walkable and unoccupied;
- construction `cells` cover the selected alley connector between the two horizontal sidewalk bands;
- the other alley in that neighborhood is excluded from construction candidates;
- rider patrols exclude all crosswalk, entrance, friend, start, and goal cells;
- the two central vehicle paths stay inside their respective 2-cell lanes and include stop indices before both crosswalks;
- layout validation executes ordered reachability both with static blockers and with each rider cell temporarily blocked.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test tests/safety-route-layout.test.mjs tests/safety-route-model.test.mjs`

Expected: PASS.

```bash
git add src/safety-route-layout.mjs src/safety-route-model.mjs tests/safety-route-layout.test.mjs tests/safety-route-model.test.mjs
git commit -m "feat: 맨홀과 공사 골목 안전 우회 추가"
```

---

### Task 4: Add slow back-and-forth scooter and bicycle patrols

**Files:**
- Create: `src/safety-route-movers.mjs`
- Create: `tests/safety-route-movers.test.mjs`
- Modify: `src/safety-route-model.mjs`
- Modify: `tests/safety-route-model.test.mjs`

- [ ] **Step 1: Write failing mover state-machine tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  advancePatrolMover,
  createPatrolMover
} from "../src/safety-route-movers.mjs";

const definition = {
  id: "test-scooter",
  type: "scooter",
  intervalMs: 1000,
  points: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }]
};

test("이동체는 0.9~1.2초 간격으로 최대 한 칸만 움직인다", () => {
  const start = createPatrolMover(definition);
  assert.equal(advancePatrolMover(definition, start, { elapsedMs: 999, player: { x: 9, y: 9 } }).pathIndex, 0);
  assert.equal(advancePatrolMover(definition, start, { elapsedMs: 5000, player: { x: 9, y: 9 } }).pathIndex, 1);
});

test("순찰 끝에서는 방향을 바꿔 왕복한다", () => {
  const end = { ...createPatrolMover(definition), pathIndex: 2, direction: 1 };
  const next = advancePatrolMover(definition, end, { elapsedMs: 1000, player: { x: 9, y: 9 } });
  assert.deepEqual({ pathIndex: next.pathIndex, direction: next.direction }, { pathIndex: 1, direction: -1 });
});

test("다음 칸에 아이가 있으면 0.6초 멈춘 뒤 반전한다", () => {
  const start = createPatrolMover(definition);
  const paused = advancePatrolMover(definition, start, { elapsedMs: 1000, player: { x: 3, y: 4 } });
  assert.deepEqual({ pathIndex: paused.pathIndex, stopped: paused.stopped }, { pathIndex: 0, stopped: true });
  const reversed = advancePatrolMover(definition, paused, { elapsedMs: 600, player: { x: 3, y: 4 } });
  assert.equal(reversed.direction, -1);
  assert.equal(reversed.pathIndex, 0);
});
```

- [ ] **Step 2: Run the mover test and verify module-not-found failure**

Run: `node --test tests/safety-route-movers.test.mjs`

Expected: FAIL with `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the pure patrol state machine**

```js
export function createPatrolMover(definition) {
  return {
    id: definition.id,
    type: definition.type,
    pathIndex: 0,
    direction: 1,
    elapsedMs: 0,
    pauseMs: 0,
    stopped: false
  };
}

export function moverPoint(map, mover) {
  return map.trafficPaths.find(item => item.id === mover.id)
    ?.points[mover.pathIndex] ?? null;
}
```

`advancePatrolMover()` must:

1. accumulate elapsed time but move at most one path index per call;
2. reverse at either endpoint instead of wrapping;
3. when the proposed point equals the player, stay in place, set `stopped`, and accumulate `pauseMs`;
4. after at least 600ms paused, reverse without entering the player cell;
5. discard excess delay after the single move so background-tab delays never cause a jump.

- [ ] **Step 4: Connect movers to world advancement and player collision checks**

Import `createPatrolMover`, `advancePatrolMover`, and `moverPoint` into `safety-route-model.mjs`, then replace the temporary runtime-object initializer in `createSafetyRouteState()` with `map.trafficPaths.map(createPatrolMover)`. In `advanceSafetyWorld`, update cars using the existing signal-stop behavior and update scooter/bicycle definitions through `advancePatrolMover`. In `attemptSafetyMove`, block a candidate occupied by a live scooter/bicycle and return:

```js
{ type: "blocked", reason: "moving-rider", moverType: mover.type }
```

Do not move the player, mover, or score for this event.

- [ ] **Step 5: Run mover and model tests and commit**

Run: `node --test tests/safety-route-movers.test.mjs tests/safety-route-model.test.mjs`

Expected: PASS.

```bash
git add src/safety-route-movers.mjs src/safety-route-model.mjs tests/safety-route-movers.test.mjs tests/safety-route-model.test.mjs
git commit -m "feat: 킥보드와 자전거 안전 왕복 이동"
```

---

### Task 5: Center the camera without crossing map bounds

**Files:**
- Modify: `src/safety-route-camera.mjs`
- Modify: `tests/safety-route-camera.test.mjs`

- [ ] **Step 1: Replace dead-zone expectations with centered-camera tests**

```js
test("지도 중앙에서는 플레이어가 뷰포트 정중앙에 온다", () => {
  const camera = cameraOffset({
    world: { width: 32, height: 16 },
    viewport: { width: 7, height: 5 },
    player: { x: 15, y: 8 },
    previous: { x: 0, y: 0 }
  });
  assert.deepEqual(camera, { x: 12, y: 6 });
});

test("모바일 5×5에서도 플레이어를 중앙에 둔다", () => {
  assert.deepEqual(cameraOffset({
    world: { width: 32, height: 16 },
    viewport: { width: 5, height: 5 },
    player: { x: 20, y: 9 },
    previous: { x: 0, y: 0 }
  }), { x: 18, y: 7 });
});

test("지도 가장자리에서는 카메라만 경계에 고정한다", () => {
  assert.deepEqual(cameraOffset({
    world: { width: 32, height: 16 },
    viewport: { width: 7, height: 5 },
    player: { x: 31, y: 15 },
    previous: { x: 0, y: 0 }
  }), { x: 25, y: 11 });
});
```

- [ ] **Step 2: Run the camera tests and verify the first test fails**

Run: `node --test tests/safety-route-camera.test.mjs`

Expected: FAIL because the dead-zone algorithm does not center the player.

- [ ] **Step 3: Implement direct centered offsets**

```js
export function cameraOffset({ world, viewport, player }) {
  return {
    x: clamp(
      player.x - Math.floor(viewport.width / 2),
      0,
      Math.max(0, world.width - viewport.width)
    ),
    y: clamp(
      player.y - Math.floor(viewport.height / 2),
      0,
      Math.max(0, world.height - viewport.height)
    )
  };
}
```

Leave `targetArrow()` behavior intact. Keep accepting `previous` in callers for compatibility, although the pure camera function no longer needs it.

- [ ] **Step 4: Run and commit**

Run: `node --test tests/safety-route-camera.test.mjs`

Expected: PASS.

```bash
git add src/safety-route-camera.mjs tests/safety-route-camera.test.mjs
git commit -m "feat: 길찾기 플레이어 중심 카메라 적용"
```

---

### Task 6: Render distinct neighborhoods, footprints, and visible safety illustrations

**Files:**
- Modify: `src/safety-route-scene.mjs`
- Modify: `styles.css`
- Modify: `tests/safety-route-scene.test.mjs`
- Modify: `tests/safety-route-styles.test.mjs`

- [ ] **Step 1: Write failing scene contract tests**

```js
test("장면은 좌우 동네와 중앙 2차선 구역을 표시한다", () => {
  const scene = renderSafetyRouteScene(document, createSafetyRouteState("easy", { seed: 1 }));
  assert.equal(byClass(scene, "route-zone-left").length, 1);
  assert.equal(byClass(scene, "route-zone-road").length, 1);
  assert.equal(byClass(scene, "route-zone-right").length, 1);
  assert.equal(byClass(scene, "route-crosswalk").length, 16);
});

test("다칸 공사장은 발자국 전부를 막힘 레이어로 표시하고 그림은 한 번만 만든다", () => {
  const scene = renderSafetyRouteScene(document, createSafetyRouteState("steady", { seed: 8 }));
  const state = createSafetyRouteState("steady", { seed: 8 });
  const construction = state.map.hazards.find(item => item.type === "construction");
  assert.equal(byClass(scene, "route-hazard-footprint").length >= construction.cells.length, true);
  assert.equal(byClass(scene, "route-construction").length, 1);
});

test("이동체는 방향과 정지 상태를 색 이외 데이터로 노출한다", () => {
  const state = createSafetyRouteState("challenge", { seed: 3 });
  state.movers[0] = { ...state.movers[0], direction: -1, stopped: true };
  const mover = byClass(renderSafetyRouteScene(document, state), "route-moving-rider")[0];
  assert.equal(mover.dataset.direction, "-1");
  assert.equal(mover.dataset.stopped, "true");
});
```

- [ ] **Step 2: Add failing CSS illustration and reduced-motion assertions**

Extend `tests/safety-route-styles.test.mjs` to require:

```js
assert.match(css, /\.route-zone-road\s*\{[^}]*#536477/s);
assert.match(css, /\.route-sidewalk\s*\{[^}]*#ead9b8/s);
assert.match(css, /\.route-bicycle::before/);
assert.match(css, /\.route-scooter::before/);
assert.match(css, /\.route-manhole::after/);
assert.match(css, /\.route-construction::after/);
assert.match(css, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.route-moving-rider/s);
```

- [ ] **Step 3: Run scene/style tests and verify they fail**

Run: `node --test tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs`

Expected: FAIL because zone layers, footprint nodes, and mover data attributes are absent.

- [ ] **Step 4: Update scene rendering**

In `renderSafetyRouteScene()`:

- append three zone background nodes using `map.zones` before individual cells;
- render `map.roadCells` independently from `trafficPaths` so the full central road always appears;
- render each hazard footprint as `route-hazard-footprint`, then render one accessible illustration at its anchor;
- use `moverPoint()` from `safety-route-movers.mjs`;
- add `route-moving-rider`, `data-direction`, and `data-stopped` to scooter/bicycle nodes;
- keep one signal node, but render visual signal markers at both crossing entrances if the map supplies `signalMarkers`;
- retain target arrow, three-cell guidance, route pad, friend assets, and accessible labels.

- [ ] **Step 5: Rebuild CSS illustrations and camera transition**

Implement flat, high-contrast shapes with white outlines:

- `.route-car`: top-down body, windows, four wheels, front/rear distinction;
- `.route-bicycle`: two circular wheels, frame triangle, handlebar;
- `.route-scooter`: two wheels, deck, tall handlebar;
- `.route-manhole`: dark open center, circular rim, grid lines;
- `.route-construction`: orange/white barrier, cones, `공사중` sign;
- `.route-sidewalk`: beige paving with curb/entrance details and no road markings;
- `.route-zone-road`: asphalt, center line, lane arrows kept under actors;
- `.safety-world`: `transition: transform 160ms ease-out`.

For `@media (prefers-reduced-motion: reduce)`, disable decorative wheel/spin/wobble animations and the world transform transition, but do not hide actors or stop logical grid updates.

- [ ] **Step 6: Run scene/style tests and commit**

Run: `node --test tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs`

Expected: PASS.

```bash
git add src/safety-route-scene.mjs styles.css tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs
git commit -m "feat: 두 동네 안전길 장면과 장애물 그림 개선"
```

---

### Task 7: Connect seed, cues, ticks, and cleanup in the app

**Files:**
- Modify: `src/safety-route-controller.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/safety-route-controller.test.mjs`
- Modify: `tests/app-contract.test.mjs`

- [ ] **Step 1: Write failing cue tests**

```js
test("왼쪽 친구를 먼저 만나도록 횡단을 안내한다", () => {
  assert.deepEqual(
    safetyCueForEvent({ type: "blocked", reason: "left-friends-first" }, 5),
    {
      message: "먼저 이 동네의 5 친구를 만나고 횡단보도로 가요!",
      voiceKey: "safety-next-5",
      tone: "guide"
    }
  );
});

test("움직이는 자전거와 킥보드는 기다리거나 옆줄로 피하라고 안내한다", () => {
  const cue = safetyCueForEvent({
    type: "blocked",
    reason: "moving-rider",
    moverType: "bicycle"
  }, 6);
  assert.match(cue.message, /기다리|옆줄/);
  assert.equal(cue.voiceKey, "safety-bicycle");
});
```

- [ ] **Step 2: Add failing app contract assertions**

Require `startSafetyRoute()` to create one integer seed and pass it to `createSafetyRouteState`:

```js
assert.match(app, /const seed = Math\.floor\(Math\.random\(\) \* 0x100000000\);/);
assert.match(app, /createSafetyRouteState\(state\.difficulty,\s*\{ seed \}\)/);
assert.match(app, /Math\.min\(250,\s*nowMs - previousMs\)/);
```

- [ ] **Step 3: Run controller/app tests and verify failure**

Run: `node --test tests/safety-route-controller.test.mjs tests/app-contract.test.mjs`

Expected: FAIL on the two new cue reasons and seed creation.

- [ ] **Step 4: Implement cues and per-round seeded state**

In `safetyCueForEvent`, special-case `left-friends-first` as a guide cue before generic blocked cues. For `moving-rider`, choose `safety-bicycle` or `safety-scooter` from `event.moverType` and describe waiting or changing rows.

In `startSafetyRoute()`:

```js
const seed = Math.floor(Math.random() * 0x100000000);
state.safety = createSafetyRouteState(state.difficulty, { seed });
```

Keep the existing 100ms scheduler and 250ms elapsed clamp. Keep `clearTimers()`, `stopSafetyHold()`, and mode-exit cleanup unchanged. Confirm the state seed is never regenerated from `renderSafetyRoute()`.

- [ ] **Step 5: Run focused tests and commit**

Run: `node --test tests/safety-route-controller.test.mjs tests/app-contract.test.mjs`

Expected: PASS.

```bash
git add src/safety-route-controller.mjs src/app.mjs tests/safety-route-controller.test.mjs tests/app-contract.test.mjs
git commit -m "feat: 안전길 랜덤 시드와 회피 안내 연결"
```

---

### Task 8: Run full regression and browser visual QA

**Files:**
- Modify: `index.html`
- Modify only if QA finds a defect: `styles.css`, `src/safety-route-scene.mjs`, `src/safety-route-camera.mjs`
- Modify matching test whenever a defect fix changes behavior.

- [ ] **Step 1: Update the stylesheet cache key and contract test**

Change the stylesheet URL to:

```html
<link rel="stylesheet" href="styles.css?v=20260726-two-neighborhood-route">
```

Update the exact cache-key assertion in `tests/app-contract.test.mjs`.

- [ ] **Step 2: Run all automated verification**

Run:

```bash
npm test
git diff --check
```

Expected: all tests PASS and `git diff --check` produces no output.

- [ ] **Step 3: Start the local static server and test the safety game**

Use the existing local preview command for this repository. Open the app, choose each difficulty, start `안전한 길찾기`, and inspect these viewports:

- desktop: 1280×720;
- mobile portrait: 390×844;
- short landscape: 640×360.

Verify visually and interactively:

1. the full world is 14:4:14 and the center road visibly has two lanes;
2. each neighborhood has two 1-cell alleys and two 2-cell pedestrian paths;
3. upper and lower crosswalks run in the correct horizontal direction and share one signal phase;
4. 2–5 remain on the left, 6–10 and school on the right;
5. the player remains centered except at map edges and can see the next travel direction;
6. a manhole leaves the adjacent pedestrian row open;
7. construction blocks one alley and the other alley remains usable;
8. scooter/bicycle patrol slowly, reverse at endpoints, stop/reverse before the player, and never overlap the player;
9. car, bicycle, scooter, manhole, and construction are recognizable without text or emoji;
10. target arrow and three-cell guidance still appear;
11. mobile direction buttons remain reachable and there is no horizontal page scroll;
12. browser console has zero new errors or warnings.

- [ ] **Step 4: Verify reduced motion**

Enable reduced motion in browser emulation. Confirm wheel/wobble/world interpolation stops while logical actor movement and keyboard/touch movement still work.

- [ ] **Step 5: Fix only observed defects with focused regression tests**

For every browser defect, first add or tighten the smallest relevant test, observe it fail, apply the minimal fix, and rerun that focused test plus `npm test`.

- [ ] **Step 6: Commit the verified release state**

```bash
git add index.html tests/app-contract.test.mjs
git add styles.css src/safety-route-scene.mjs src/safety-route-camera.mjs tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs tests/safety-route-camera.test.mjs
git commit -m "test: 두 동네 안전길 브라우저 검증 마무리"
```

Only stage optional QA-fix files that actually changed. Do not create an empty commit.

---

## Completion Gate

Before claiming completion:

- [ ] Run `npm test` from the repository root and record the exact pass count.
- [ ] Run `git diff --check` and confirm no whitespace errors.
- [ ] Run `git status --short --branch` and list every remaining change.
- [ ] Review `git diff --stat` to confirm only safety-route and cache-key files changed.
- [ ] Confirm no generated screenshots, temporary browser files, or local server logs are staged.
- [ ] Use `superpowers:verification-before-completion` before the final implementation report.
- [ ] Use `superpowers:finishing-a-development-branch` to offer merge/push choices. Do not merge to `main` or push to `origin` without the user's explicit selection and the required HOTL confirmation.
