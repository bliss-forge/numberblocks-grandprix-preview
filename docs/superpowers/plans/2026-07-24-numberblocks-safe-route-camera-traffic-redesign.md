# Numberblocks Safe Route Camera and Traffic Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `안전한 길찾기` as an 18×12 layered neighborhood with separate pedestrian and traffic networks, a player-following camera, realistic signal behavior, conditional route guidance, and hold-to-move input.

**Architecture:** Keep all movement, signal, entrance-check, and route-validation rules in the DOM-free safety model. Add two small pure modules for camera math and conditional BFS guidance, then let the scene renderer project the layered world through a translated camera viewport. `app.mjs` remains the coordinator for timers, input, audio, and rendering.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js `node:test`, existing `AudioManager`, existing flat Numberblocks character assets, in-app browser QA.

## Global Constraints

- The neighborhood is exactly 18 columns × 12 rows.
- Desktop shows about 7×5 world cells; mobile shows about 5×5 world cells.
- Players and friends use only `sidewalk`, `crosswalk`, and `entrance` pedestrian cells.
- Cars and bicycles use only traffic paths and never occupy or block ordinary sidewalk cells.
- Signal timing is `vehicle-go` 5000ms → `vehicle-clearance` 1000ms → `pedestrian-go` 7000ms → `pedestrian-clearance` 1000ms.
- New crosswalk entry is blocked during the final 2000ms of `pedestrian-go`; a player already inside may exit.
- Guidance appears after 5000ms idle or two accumulated wrong-direction inputs and shows exactly the next three safe cells.
- Keyboard and mobile hold repeat no faster than once every 140ms and never skip a safety checkpoint.
- No collision animation, score loss, reset, game over, minimap, random map generation, or character-asset replacement.
- Existing count, addition, subtraction, multiplication, audio, difficulty, character-size, and footer behavior must remain unchanged.
- Every production behavior follows RED → GREEN → focused regression → commit.

---

### Task 1: Layered 18×12 Pedestrian and Traffic Map

**Files:**
- Modify: `src/safety-route-model.mjs`
- Modify: `tests/safety-route-model.test.mjs`

**Interfaces:**
- Produces: `SAFETY_ROUTE_MAPS: Readonly<Record<Difficulty, SafetyRouteMap>>`
- `SafetyRouteMap` adds `pedestrianCells`, `trafficPaths`, `crossings`, and `entrances`.
- Produces: `findSafetyPath(map, start, goal): Point[]`
- Preserves: `createSafetyRouteState`, `attemptSafetyMove`, `advanceSafetyWorld`, and `validateSafetyRouteMap`.

- [ ] **Step 1: Replace the old shared-road assertions with failing layer contracts**

Add focused tests:

```js
test("18×12 지도는 보행망과 교통망을 분리한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    const map = SAFETY_ROUTE_MAPS[difficulty];
    assert.equal(map.width, 18);
    assert.equal(map.height, 12);

    const pedestrian = new Set(map.pedestrianCells.map(pointKey));
    const crossings = new Set(
      map.crossings.flatMap(crossing => crossing.cells).map(pointKey)
    );
    for (const path of map.trafficPaths) {
      for (const point of path.points) {
        const overlapsPedestrian = pedestrian.has(pointKey(point));
        assert.equal(
          overlapsPedestrian && !crossings.has(pointKey(point)),
          false,
          `${path.type} ${pointKey(point)} overlaps an ordinary sidewalk`
        );
      }
    }
    assert.deepEqual(validateSafetyRouteMap(map), {
      valid: true,
      errors: []
    });
  }
});

test("모든 친구와 학교는 보행 경로로 연결된다", () => {
  for (const map of Object.values(SAFETY_ROUTE_MAPS)) {
    let position = map.start;
    for (const target of [...map.friends, map.goal]) {
      const path = findSafetyPath(map, position, target);
      assert.ok(path.length > 0, `${target.number ?? "school"} unreachable`);
      position = target;
    }
  }
});
```

Define this helper in the test file:

```js
const pointKey = ({ x, y }) => `${x},${y}`;
```

- [ ] **Step 2: Run the focused model test and verify RED**

Run:

```bash
node --test tests/safety-route-model.test.mjs
```

Expected: FAIL because maps are still 12×8 and `pedestrianCells`,
`trafficPaths`, and `findSafetyPath` do not exist.

- [ ] **Step 3: Implement the layered map schema and deterministic BFS**

Replace `walkable` with explicit cell constructors and export the path finder:

```js
const WIDTH = 18;
const HEIGHT = 12;

const line = (from, to) => {
  const points = [];
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  for (
    let point = { ...from };
    point.x !== to.x || point.y !== to.y;
    point = { x: point.x + dx, y: point.y + dy }
  ) {
    points.push(point);
  }
  return [...points, { ...to }];
};

const pedestrianCells = uniquePoints([
  ...line({ x: 1, y: 10 }, { x: 16, y: 10 }),
  ...line({ x: 2, y: 1 }, { x: 2, y: 10 }),
  ...line({ x: 2, y: 2 }, { x: 15, y: 2 }),
  ...line({ x: 8, y: 2 }, { x: 8, y: 10 }),
  ...line({ x: 14, y: 2 }, { x: 14, y: 10 }),
  ...line({ x: 2, y: 6 }, { x: 14, y: 6 })
]);

const crossings = Object.freeze([
  Object.freeze({
    id: "west-crossing",
    cells: Object.freeze([
      Object.freeze({ x: 8, y: 4 })
    ])
  }),
  Object.freeze({
    id: "east-crossing",
    cells: Object.freeze([
      Object.freeze({ x: 14, y: 8 })
    ])
  })
]);

const trafficPaths = Object.freeze([
  Object.freeze({
    id: "main-car-lane",
    type: "car",
    stopIndex: 5,
    points: Object.freeze(line({ x: 3, y: 4 }, { x: 15, y: 4 }))
  }),
  Object.freeze({
    id: "cycle-lane",
    type: "bicycle",
    stopIndex: 8,
    points: Object.freeze(line({ x: 4, y: 7 }, { x: 15, y: 7 }))
  })
]);
```

Traffic points may overlap `pedestrianCells` only at the exact points listed in
`crossings`; reject every other overlap. Implement:

```js
export function findSafetyPath(map, start, goal) {
  const allowed = new Set(map.pedestrianCells.map(pointKey));
  const blocked = new Set(map.hazards.map(pointKey));
  const previous = new Map([[pointKey(start), null]]);
  const queue = [{ ...start }];

  while (queue.length) {
    const current = queue.shift();
    if (samePoint(current, goal)) break;
    for (const offset of Object.values(DIRECTIONS)) {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const key = pointKey(next);
      if (
        allowed.has(key) &&
        !blocked.has(key) &&
        !previous.has(key)
      ) {
        previous.set(key, current);
        queue.push(next);
      }
    }
  }

  if (!previous.has(pointKey(goal))) return [];
  const path = [];
  for (let point = goal; point; point = previous.get(pointKey(point))) {
    path.push({ ...point });
  }
  return path.reverse();
}
```

Update `validateSafetyRouteMap` to reject pedestrian/traffic overlap, duplicate
friends, out-of-bounds points, hazards without an alternate pedestrian path,
and any unreachable ordered target.

- [ ] **Step 4: Verify the layered model is GREEN**

Run:

```bash
node --test tests/safety-route-model.test.mjs tests/game-model.test.mjs
git diff --check
```

Expected: all tests pass; no whitespace errors.

- [ ] **Step 5: Commit the layered map**

```bash
git add src/safety-route-model.mjs tests/safety-route-model.test.mjs
git commit -m "feat: 보행망과 교통망을 분리한 길찾기 지도"
```

---

### Task 2: Realistic Signal Phases, Traffic Stops, and Entrance Checks

**Files:**
- Modify: `src/safety-route-model.mjs`
- Modify: `tests/safety-route-model.test.mjs`
- Modify: `src/safety-route-controller.mjs`
- Modify: `tests/safety-route-controller.test.mjs`

**Interfaces:**
- `RouteState.signal` becomes `{ phase, elapsedMs }`.
- `advanceSafetyWorld(state, elapsedMs): RouteState`
- `attemptSafetyMove` may return blocked reasons `red-light`,
  `green-ending`, or `look-first`.
- `safetyCueForEvent` maps all three reasons to child-friendly copy and voice keys.

- [ ] **Step 1: Add failing signal and entrance behavior tests**

Add:

```js
test("보행 신호와 차량 이동은 반대로 작동한다", () => {
  const start = createSafetyRouteState("challenge");
  assert.equal(start.signal.phase, "vehicle-go");

  const stopped = advanceSafetyWorld(start, 5000);
  assert.equal(stopped.signal.phase, "vehicle-clearance");

  const walking = advanceSafetyWorld(stopped, 1000);
  assert.equal(walking.signal.phase, "pedestrian-go");
  assert.ok(walking.movers.every(mover => mover.stopped));
});

test("초록불 종료 2초 전에는 새 횡단만 막고 횡단 중이면 나갈 수 있다", () => {
  const state = {
    ...createSafetyRouteState("easy"),
    signal: { phase: "pedestrian-go", elapsedMs: 5100 }
  };
  const entering = attemptSafetyMove(
    { ...state, position: { x: 8, y: 3 }, crossingId: null },
    "down"
  );
  assert.equal(entering.event.reason, "green-ending");

  const exiting = attemptSafetyMove(
    { ...state, position: { x: 8, y: 4 }, crossingId: "west-crossing" },
    "down"
  );
  assert.notEqual(exiting.event.type, "blocked");
});

test("출입구는 첫 입력에 좌우 확인하고 다음 입력에 통과한다", () => {
  const state = createSafetyRouteState("steady");
  const first = attemptSafetyMove(
    { ...state, position: { x: 5, y: 2 } },
    "right"
  );
  assert.equal(first.event.reason, "look-first");
  assert.deepEqual(first.state.checkedEntrance, "shops-entrance");

  const second = attemptSafetyMove(first.state, "right");
  assert.equal(second.event.type, "moved");
  assert.equal(second.state.checkedEntrance, null);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/safety-route-model.test.mjs tests/safety-route-controller.test.mjs
```

Expected: FAIL because signal is a string, elapsed time is ignored, and entrance
checks are absent.

- [ ] **Step 3: Implement phase timing and non-blocking traffic**

Use exact phase definitions:

```js
const SIGNAL_PHASES = Object.freeze([
  Object.freeze({ phase: "vehicle-go", durationMs: 5000 }),
  Object.freeze({ phase: "vehicle-clearance", durationMs: 1000 }),
  Object.freeze({ phase: "pedestrian-go", durationMs: 7000 }),
  Object.freeze({ phase: "pedestrian-clearance", durationMs: 1000 })
]);

function advanceSignal(signal, elapsedMs) {
  let index = SIGNAL_PHASES.findIndex(item => item.phase === signal.phase);
  let elapsed = signal.elapsedMs + Math.max(0, elapsedMs);
  while (elapsed >= SIGNAL_PHASES[index].durationMs) {
    elapsed -= SIGNAL_PHASES[index].durationMs;
    index = (index + 1) % SIGNAL_PHASES.length;
  }
  return { phase: SIGNAL_PHASES[index].phase, elapsedMs: elapsed };
}
```

Vehicles advance only in `vehicle-go`; in clearance they move toward
`stopIndex`; in both pedestrian phases they return `{ ...mover, stopped: true }`.
Remove mover occupancy from pedestrian movement checks because traffic paths
cannot overlap pedestrian cells.

For crossing entry:

```js
const phase = state.signal.phase;
const crossing = crossingForPoint(state.map, candidate);
const alreadyCrossing = Boolean(state.crossingId);
if (crossing && !alreadyCrossing) {
  if (phase !== "pedestrian-go") {
    return blocked(state, "red-light");
  }
  if (7000 - state.signal.elapsedMs <= 2000) {
    return blocked(state, "green-ending");
  }
}
```

For an entrance, set `checkedEntrance` on the first attempt and permit the
second attempt only when the player is still adjacent to the same entrance.

- [ ] **Step 4: Add the exact child-friendly controller cues**

Extend `BLOCKED_CUES`:

```js
"green-ending": {
  message: "초록불이 곧 끝나요. 다음 초록불을 기다려요!",
  voiceKey: "safety-red-light"
},
"look-first": {
  message: "차가 나올 수 있어요. 잠깐 멈춰 좌우를 살펴요!",
  voiceKey: "safety-car"
}
```

- [ ] **Step 5: Verify signal and entrance behavior**

Run:

```bash
node --test tests/safety-route-model.test.mjs tests/safety-route-controller.test.mjs
git diff --check
```

Expected: all focused tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/safety-route-model.mjs src/safety-route-controller.mjs \
  tests/safety-route-model.test.mjs tests/safety-route-controller.test.mjs
git commit -m "feat: 보행 신호와 차량 정지 규칙 추가"
```

---

### Task 3: Conditional Three-Cell Guidance

**Files:**
- Create: `src/safety-route-guidance.mjs`
- Create: `tests/safety-route-guidance.test.mjs`

**Interfaces:**
- Consumes: `findSafetyPath(map, start, goal)` from Task 1.
- Produces: `createGuidanceState(nowMs): GuidanceState`
- Produces: `recordGuidanceMove(guidance, { beforeDistance, afterDistance, blocked, nowMs }): GuidanceState`
- Produces: `guidanceCells(guidance, map, position, target, nowMs): Point[]`

- [ ] **Step 1: Write failing guidance state tests**

Create:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  createGuidanceState,
  guidanceCells,
  recordGuidanceMove
} from "../src/safety-route-guidance.mjs";
import {
  SAFETY_ROUTE_MAPS
} from "../src/safety-route-model.mjs";

test("5초 정지 뒤 안전 경로 앞 세 칸만 보여준다", () => {
  const map = SAFETY_ROUTE_MAPS.easy;
  const guidance = createGuidanceState(1000);
  assert.deepEqual(
    guidanceCells(guidance, map, map.start, map.friends[0], 5999),
    []
  );
  const cells = guidanceCells(
    guidance,
    map,
    map.start,
    map.friends[0],
    6000
  );
  assert.equal(cells.length, 3);
  assert.notDeepEqual(cells[0], map.start);
});

test("막힌 입력 또는 거리가 늘어난 이동 두 번이면 유도하고 올바른 이동은 초기화한다", () => {
  let state = createGuidanceState(0);
  state = recordGuidanceMove(state, {
    beforeDistance: 6, afterDistance: 6, blocked: true, nowMs: 100
  });
  state = recordGuidanceMove(state, {
    beforeDistance: 6, afterDistance: 7, blocked: false, nowMs: 200
  });
  assert.equal(state.wrongCount, 2);

  state = recordGuidanceMove(state, {
    beforeDistance: 7, afterDistance: 6, blocked: false, nowMs: 300
  });
  assert.deepEqual(state, {
    lastValidMoveAt: 300,
    wrongCount: 0,
    visible: false
  });
});
```

- [ ] **Step 2: Run the guidance test and verify RED**

Run:

```bash
node --test tests/safety-route-guidance.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement the minimal pure guidance module**

```js
import { findSafetyPath } from "./safety-route-model.mjs";

export function createGuidanceState(nowMs = 0) {
  return { lastValidMoveAt: nowMs, wrongCount: 0, visible: false };
}

export function recordGuidanceMove(
  state,
  { beforeDistance, afterDistance, blocked, nowMs }
) {
  if (!blocked && afterDistance < beforeDistance) {
    return createGuidanceState(nowMs);
  }
  const wrong =
    blocked || afterDistance > beforeDistance
      ? state.wrongCount + 1
      : state.wrongCount;
  return {
    ...state,
    lastValidMoveAt: blocked ? state.lastValidMoveAt : nowMs,
    wrongCount: wrong,
    visible: wrong >= 2
  };
}

export function guidanceCells(state, map, position, target, nowMs) {
  const visible =
    state.visible || nowMs - state.lastValidMoveAt >= 5000;
  if (!visible) return [];
  return findSafetyPath(map, position, target).slice(1, 4);
}
```

- [ ] **Step 4: Verify and commit the guidance module**

Run:

```bash
node --test tests/safety-route-guidance.test.mjs tests/safety-route-model.test.mjs
git diff --check
```

Expected: all pass.

```bash
git add src/safety-route-guidance.mjs tests/safety-route-guidance.test.mjs
git commit -m "feat: 막힐 때 세 칸 길안내 표시"
```

---

### Task 4: Pure Follow-Camera and Target-Arrow Math

**Files:**
- Create: `src/safety-route-camera.mjs`
- Create: `tests/safety-route-camera.test.mjs`

**Interfaces:**
- Produces: `cameraOffset({ world, viewport, player, previous }): Point`
- Produces: `targetArrow({ viewport, camera, target }): { visible, x, y, angle }`
- Coordinates are expressed in world-cell units, not pixels.

- [ ] **Step 1: Write failing camera boundary and lead-room tests**

Create:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraOffset,
  targetArrow
} from "../src/safety-route-camera.mjs";

test("안전 영역 안에서는 카메라가 움직이지 않고 밖에서는 진행 방향을 더 보여준다", () => {
  const world = { width: 18, height: 12 };
  const viewport = { width: 7, height: 5 };
  assert.deepEqual(
    cameraOffset({
      world, viewport, player: { x: 3, y: 2 }, previous: { x: 0, y: 0 }
    }),
    { x: 0, y: 0 }
  );
  assert.deepEqual(
    cameraOffset({
      world, viewport, player: { x: 8, y: 2 }, previous: { x: 0, y: 0 }
    }),
    { x: 3, y: 0 }
  );
});

test("카메라는 지도 경계를 넘지 않고 화면 밖 목표는 가장자리 화살표가 된다", () => {
  const camera = cameraOffset({
    world: { width: 18, height: 12 },
    viewport: { width: 7, height: 5 },
    player: { x: 17, y: 11 },
    previous: { x: 10, y: 7 }
  });
  assert.deepEqual(camera, { x: 11, y: 7 });

  const arrow = targetArrow({
    viewport: { width: 7, height: 5 },
    camera: { x: 0, y: 0 },
    target: { x: 14, y: 6 }
  });
  assert.equal(arrow.visible, true);
  assert.ok(arrow.x <= 6.5);
  assert.ok(arrow.y <= 4.5);
});
```

- [ ] **Step 2: Run the camera test and verify RED**

Run:

```bash
node --test tests/safety-route-camera.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND`.

- [ ] **Step 3: Implement clamped dead-zone camera math**

Use a one-cell inset dead zone:

```js
const clamp = (value, minimum, maximum) =>
  Math.min(maximum, Math.max(minimum, value));

export function cameraOffset({ world, viewport, player, previous }) {
  let x = previous.x;
  let y = previous.y;
  const localX = player.x - x;
  const localY = player.y - y;

  if (localX > viewport.width - 2) x = player.x - (viewport.width - 2);
  if (localX < 1) x = player.x - 1;
  if (localY > viewport.height - 2) y = player.y - (viewport.height - 2);
  if (localY < 1) y = player.y - 1;

  return {
    x: clamp(x, 0, world.width - viewport.width),
    y: clamp(y, 0, world.height - viewport.height)
  };
}
```

Implement `targetArrow` by converting the target to viewport-local coordinates,
returning `visible: false` when inside, otherwise clamping to a 0.5-cell inset
and using `Math.atan2` for `angle`.

- [ ] **Step 4: Verify and commit the camera module**

Run:

```bash
node --test tests/safety-route-camera.test.mjs
git diff --check
```

Expected: all pass.

```bash
git add src/safety-route-camera.mjs tests/safety-route-camera.test.mjs
git commit -m "feat: 플레이어 추적 카메라 계산 추가"
```

---

### Task 5: Layered Scene, Camera Viewport, and Route Guidance Visuals

**Files:**
- Modify: `src/safety-route-scene.mjs`
- Modify: `tests/safety-route-scene.test.mjs`
- Modify: `styles.css`
- Modify: `tests/safety-route-styles.test.mjs`

**Interfaces:**
- `renderSafetyRouteScene(document, state, view)` receives:

```js
{
  camera: { x, y, width, height },
  guidance: Point[],
  targetArrow: { visible, x, y, angle }
}
```

- Produces DOM hooks `.safety-viewport`, `.safety-world`,
  `.route-sidewalk`, `.route-road`, `.route-crosswalk`, `.route-stop-line`,
  `.route-guidance-cell`, and `.route-target-arrow`.

- [ ] **Step 1: Add failing scene-layer contracts**

Extend the fake-DOM tests:

```js
test("장면은 보도와 차도를 별도 레이어로 만들고 카메라 값을 노출한다", () => {
  const state = createSafetyRouteState("challenge");
  const scene = renderSafetyRouteScene(document, state, {
    camera: { x: 3, y: 2, width: 7, height: 5 },
    guidance: [{ x: 4, y: 3 }, { x: 5, y: 3 }, { x: 6, y: 3 }],
    targetArrow: { visible: true, x: 6.5, y: 2, angle: 0 }
  });

  assert.equal(byClass(scene, "safety-viewport").length, 1);
  assert.equal(byClass(scene, "safety-world").length, 1);
  assert.ok(byClass(scene, "route-sidewalk").length > 0);
  assert.ok(byClass(scene, "route-road").length > 0);
  assert.equal(byClass(scene, "route-guidance-cell").length, 3);
  assert.equal(byClass(scene, "route-target-arrow").length, 1);

  const world = byClass(scene, "safety-world")[0];
  assert.equal(world.style.values.get("--camera-x"), "3");
  assert.equal(world.style.values.get("--camera-y"), "2");
});
```

Update signal tests to assert:

```js
assert.equal(
  byClass(scene, "route-signal")[0].dataset.phase,
  "pedestrian-go"
);
```

- [ ] **Step 2: Run scene and style tests and verify RED**

Run:

```bash
node --test tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs
```

Expected: FAIL because the viewport, layer classes, and camera variables are absent.

- [ ] **Step 3: Render a translated world inside a clipped viewport**

Build:

```html
<div class="safety-viewport">
  <div class="safety-world"
       style="--world-cols:18;--world-rows:12;--camera-x:3;--camera-y:2">
    <!-- terrain, places, traffic, friends, player, guidance -->
  </div>
  <div class="route-target-arrow"></div>
</div>
```

Set the variables in `safety-route-scene.mjs`:

```js
world.style.setProperty("--world-cols", state.map.width);
world.style.setProperty("--world-rows", state.map.height);
world.style.setProperty("--camera-x", view.camera.x);
world.style.setProperty("--camera-y", view.camera.y);
viewport.style.setProperty("--viewport-cols", view.camera.width);
viewport.style.setProperty("--viewport-rows", view.camera.height);
```

Create pedestrian cells from `map.pedestrianCells`, traffic cells from
`map.trafficPaths`, crossings from `map.crossings`, and three guidance nodes
from `view.guidance`. Traffic nodes are appended before characters so players
and friends remain visually dominant.

- [ ] **Step 4: Replace the full-grid CSS with layered camera CSS**

Use exact structural rules:

```css
.safety-viewport {
  position: relative;
  min-height: 0;
  overflow: hidden;
  background: #a9df7d;
}

.safety-world {
  position: absolute;
  left: 0;
  top: 0;
  display: grid;
  grid-template-columns: repeat(var(--world-cols), var(--route-cell-size));
  grid-template-rows: repeat(var(--world-rows), var(--route-cell-size));
  transform: translate3d(
    calc(var(--camera-x) * var(--route-cell-size) * -1),
    calc(var(--camera-y) * var(--route-cell-size) * -1),
    0
  );
  transition: transform 180ms ease-out;
}

.route-sidewalk {
  z-index: 2;
  border: 1px solid #bea576;
  background: #ead9b8;
}

.route-road {
  z-index: 1;
  background:
    linear-gradient(90deg, transparent 47%, #ffe06c 47% 53%, transparent 53%),
    #536477;
}

.route-crosswalk {
  z-index: 3;
  background:
    repeating-linear-gradient(90deg, #fff 0 18%, transparent 18% 32%),
    #536477;
}

.route-guidance-cell::after {
  width: 36%;
  aspect-ratio: 1;
  border-radius: 50%;
  background: #ffb000;
  box-shadow: 0 0 0 5px rgba(255, 176, 0, .22);
  content: "";
}
```

Calculate `--route-cell-size` from the viewport with desktop 7×5 and mobile
5×5 media rules. Keep `.route-pad` at a minimum 48×48px per button.

- [ ] **Step 5: Verify scene and responsive CSS**

Run:

```bash
node --test tests/safety-route-scene.test.mjs \
  tests/safety-route-styles.test.mjs \
  tests/responsive-layout.test.mjs
git diff --check
```

Expected: all pass.

- [ ] **Step 6: Commit**

```bash
git add src/safety-route-scene.mjs styles.css \
  tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs
git commit -m "feat: 추적 카메라 길찾기 화면 구현"
```

---

### Task 6: App Integration and Hold-to-Move Input

**Files:**
- Modify: `src/safety-route-controller.mjs`
- Modify: `tests/safety-route-controller.test.mjs`
- Modify: `src/app.mjs`
- Modify: `tests/app-contract.test.mjs`

**Interfaces:**
- Produces: `acceptSafetyRepeat({ repeat, nowMs, previousMs }): boolean`
- `state.safetyView` holds `camera`, `guidance`, `lastMoveAt`, and `heldDirection`.
- App renders state through Task 3 and Task 4 pure functions.

- [ ] **Step 1: Add failing repeat-throttle and integration contracts**

Add controller tests:

```js
test("길게 누르기는 140ms 간격으로만 이동을 허용한다", () => {
  assert.equal(
    acceptSafetyRepeat({ repeat: false, nowMs: 100, previousMs: 95 }),
    true
  );
  assert.equal(
    acceptSafetyRepeat({ repeat: true, nowMs: 220, previousMs: 100 }),
    false
  );
  assert.equal(
    acceptSafetyRepeat({ repeat: true, nowMs: 240, previousMs: 100 }),
    true
  );
});
```

Extend app contracts:

```js
assert.match(app, /acceptSafetyRepeat\(/);
assert.match(app, /pointerdown/);
assert.match(app, /pointerup/);
assert.match(app, /pointercancel/);
assert.match(app, /guidanceCells\(/);
assert.match(app, /cameraOffset\(/);
assert.doesNotMatch(
  app,
  /state\.mode === "safety"\s*&&\s*!event\.repeat/
);
```

- [ ] **Step 2: Run controller and app contracts and verify RED**

Run:

```bash
node --test tests/safety-route-controller.test.mjs tests/app-contract.test.mjs
```

Expected: FAIL because repeat throttling, pointer hold, camera, and guidance are
not integrated.

- [ ] **Step 3: Implement the pure repeat gate**

```js
export function acceptSafetyRepeat({
  repeat,
  nowMs,
  previousMs,
  intervalMs = 140
}) {
  return !repeat || nowMs - previousMs >= intervalMs;
}
```

- [ ] **Step 4: Integrate camera, guidance, and elapsed world ticks**

Add imports from the new modules and initialize:

```js
state.safetyView = {
  camera: { x: 0, y: 0, width: 7, height: 5 },
  guidance: createGuidanceState(performance.now()),
  lastMoveAt: 0,
  heldDirection: null,
  holdTimer: 0
};
```

In `renderSafetyRoute`, derive the target friend or school, call
`cameraOffset`, `targetArrow`, and `guidanceCells`, then pass the view object to
`renderSafetyRouteScene`.

Replace the 900ms discrete world tick with an elapsed-time loop:

```js
function scheduleSafetyWorldTick(previousMs = performance.now()) {
  schedule(() => {
    if (state.phase !== "playing" || state.mode !== "safety" || !state.safety) {
      return;
    }
    const nowMs = performance.now();
    state.safety = advanceSafetyWorld(
      state.safety,
      Math.min(250, nowMs - previousMs)
    );
    renderSafetyRoute();
    scheduleSafetyWorldTick(nowMs);
  }, 100);
}
```

Clamp elapsed time to 250ms so returning from a hidden tab does not skip phases.

- [ ] **Step 5: Update move handling and stop repeated input at safety checks**

Before movement, get the current safe-path distance. After movement, get the new
distance and call `recordGuidanceMove`. When the event is `blocked`,
`friend`, `wrong-friend`, `look-first`, `need-friends`, or `complete`, call
`stopSafetyHold()` so repeated input cannot skip the interaction.

Keyboard handling becomes:

```js
if (state.phase === "playing" && state.mode === "safety") {
  const direction = directionForKey(event.key);
  const nowMs = performance.now();
  if (
    direction &&
    acceptSafetyRepeat({
      repeat: event.repeat,
      nowMs,
      previousMs: state.safetyView.lastMoveAt
    })
  ) {
    event.preventDefault();
    state.safetyView.lastMoveAt = nowMs;
    moveSafetyRoute(direction);
    return;
  }
}
```

- [ ] **Step 6: Add mobile pointer hold with complete cleanup**

Use delegated pointer events on the stage:

```js
function startSafetyHold(direction) {
  stopSafetyHold();
  state.safetyView.heldDirection = direction;
  moveSafetyRoute(direction);
  state.safetyView.holdTimer = window.setInterval(() => {
    if (state.safetyView?.heldDirection === direction) {
      moveSafetyRoute(direction);
    }
  }, 140);
}

function stopSafetyHold() {
  if (state.safetyView?.holdTimer) {
    clearInterval(state.safetyView.holdTimer);
  }
  if (state.safetyView) {
    state.safetyView.holdTimer = 0;
    state.safetyView.heldDirection = null;
  }
}
```

Start on `pointerdown`, stop on `pointerup`, `pointercancel`, `pointerleave`,
`goHome`, `startMode`, and completion.

- [ ] **Step 7: Verify integration and commit**

Run:

```bash
node --test tests/safety-route-controller.test.mjs \
  tests/app-contract.test.mjs \
  tests/safety-route-guidance.test.mjs \
  tests/safety-route-camera.test.mjs
git diff --check
```

Expected: all pass.

```bash
git add src/app.mjs src/safety-route-controller.mjs \
  tests/app-contract.test.mjs tests/safety-route-controller.test.mjs
git commit -m "feat: 길찾기 연속 이동과 조건부 안내 연결"
```

---

### Task 7: Full Regression and Browser Acceptance

**Files:**
- Modify only if a failing acceptance check exposes a defect in files already listed above.

**Interfaces:**
- No new production interface.
- Acceptance targets: 1280×720 desktop, 390×844 mobile portrait, and 640×360 low landscape.

- [ ] **Step 1: Run the complete automated suite**

Run:

```bash
npm test
```

Expected: every test passes with zero failures.

- [ ] **Step 2: Start the local server on a private interface**

Run:

```bash
python3 -m http.server 4174 --bind 127.0.0.1
```

Expected: the game is reachable at `http://127.0.0.1:4174/`.

- [ ] **Step 3: Verify desktop acceptance at 1280×720**

In the browser:

1. Select `도전` and `안전한 길찾기`.
2. Confirm only about 7×5 cells are visible.
3. Hold ArrowRight and confirm repeated one-cell movement.
4. Confirm the camera follows without exposing space outside the map.
5. Confirm the player remains on beige sidewalk and the car remains on grey road.
6. At a crosswalk, confirm red blocks entry and pedestrian green stops the car.
7. Wait five seconds and confirm exactly three yellow guide dots appear.
8. Enter the first guide cell and confirm the dots disappear.
9. Confirm the direction pad and `crafted by bliss © 2026` do not overlap.

Expected: all checks pass and no console errors appear.

- [ ] **Step 4: Verify mobile portrait at 390×844**

Resize the browser and confirm:

1. About 5×5 cells are visible.
2. Press and hold each direction button; release and verify movement stops.
3. HUD, target arrow, route pad, and footer remain readable and non-overlapping.
4. No horizontal page scroll appears.

Expected: all checks pass.

- [ ] **Step 5: Verify low landscape at 640×360**

Resize and confirm the map retains the largest vertical area, every route button
remains at least 48×48px, and the collected-friend row does not cover the
viewport.

Expected: all checks pass.

- [ ] **Step 6: Run final verification and inspect the diff**

Run:

```bash
npm test
git diff --check
git status --short
git log -7 --oneline
```

Expected: all tests pass; no whitespace errors; only intentional changes are
present; the six implementation commits plus any acceptance-fix commit are
visible.

- [ ] **Step 7: Commit any acceptance-only correction**

Only when Steps 3–5 required a correction:

```bash
git add src/app.mjs src/safety-route-model.mjs \
  src/safety-route-scene.mjs styles.css tests
git commit -m "fix: 길찾기 카메라와 교통 화면 마무리"
```

If no correction was needed, do not create an empty commit.
