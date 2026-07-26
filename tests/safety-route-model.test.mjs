import test from "node:test";
import assert from "node:assert/strict";
import {
  SAFETY_ROUTE_MAPS,
  advanceSafetyWorld,
  attemptSafetyMove,
  createSafetyRouteState,
  findSafetyPath,
  validateSafetyRouteMap
} from "../src/safety-route-model.mjs";

const pointKey = ({ x, y }) => `${x},${y}`;
const directions = Object.freeze([
  Object.freeze({ name: "up", x: 0, y: -1 }),
  Object.freeze({ name: "down", x: 0, y: 1 }),
  Object.freeze({ name: "left", x: -1, y: 0 }),
  Object.freeze({ name: "right", x: 1, y: 0 })
]);

function crossingEntry(map, crossing) {
  const row = Math.min(...crossing.cells.map(cell => cell.y));
  const firstRoadColumn = Math.min(...crossing.cells.map(cell => cell.x));
  return { x: firstRoadColumn - 1, y: row };
}

function stateAtLeftCrossing({ collected, nextFriend, signal } = {}) {
  const state = createSafetyRouteState("easy", { seed: 42 });
  return {
    ...state,
    position: crossingEntry(state.map, state.map.crossings[0]),
    nextFriend: nextFriend ?? state.nextFriend,
    collected: collected ?? state.collected,
    signal: signal ?? state.signal
  };
}

function statesAtBothCrossings({ collected, nextFriend, signal }) {
  const state = createSafetyRouteState("easy", { seed: 42 });
  return state.map.crossings.map(crossing => ({
    ...state,
    position: crossingEntry(state.map, crossing),
    collected,
    nextFriend,
    signal
  }));
}

function moveInto(map, target) {
  const pedestrian = new Set(map.pedestrianCells.map(pointKey));
  const step = directions.find(direction => pedestrian.has(pointKey({
    x: target.x - direction.x,
    y: target.y - direction.y
  })));
  assert.ok(step, `no pedestrian entry for ${pointKey(target)}`);
  return {
    position: { x: target.x - step.x, y: target.y - step.y },
    direction: step.name
  };
}

test("게임 상태는 한 시드로 생성한 32×16 지도를 유지한다", () => {
  const first = createSafetyRouteState("easy", { seed: 42 });
  const second = createSafetyRouteState("easy", { seed: 42 });
  assert.equal(first.seed, 42);
  assert.deepEqual(first.map, second.map);
  assert.deepEqual(
    { width: first.map.width, height: first.map.height },
    { width: 32, height: 16 }
  );
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

test("32×16 지도는 자동차 차도와 보행 순찰 경로를 구분한다", () => {
  for (const map of Object.values(SAFETY_ROUTE_MAPS)) {
    const pedestrian = new Set(map.pedestrianCells.map(pointKey));
    const crossings = new Set(map.crossings.flatMap(item => item.cells).map(pointKey));
    for (const path of map.trafficPaths) {
      for (const point of path.points) {
        if (path.type === "car") {
          assert.equal(
            pedestrian.has(pointKey(point)) && !crossings.has(pointKey(point)),
            false,
            `car ${pointKey(point)} overlaps a sidewalk`
          );
        } else {
          assert.ok(pedestrian.has(pointKey(point)), `${path.type} leaves the sidewalk`);
          assert.equal(crossings.has(pointKey(point)), false, `${path.type} enters a crossing`);
        }
      }
    }
    assert.deepEqual(validateSafetyRouteMap(map), { valid: true, errors: [] });
  }
});

test("모든 친구와 학교는 안전한 보행 경로로 연결된다", () => {
  for (const map of Object.values(SAFETY_ROUTE_MAPS)) {
    let position = map.start;
    for (const target of [...map.friends, map.goal]) {
      const path = findSafetyPath(map, position, target);
      assert.ok(path.length > 0, `${target.number ?? "school"} unreachable`);
      position = target;
    }
  }
});

test("난이도별 생활안전 요소가 생성 지도에 반영된다", () => {
  assert.deepEqual(SAFETY_ROUTE_MAPS.easy.hazards.map(item => item.type), ["manhole"]);
  assert.deepEqual(SAFETY_ROUTE_MAPS.steady.hazards.map(item => item.type).sort(), [
    "construction", "manhole"
  ]);
  assert.deepEqual(SAFETY_ROUTE_MAPS.challenge.hazards.map(item => item.type).sort(), [
    "construction", "manhole", "manhole"
  ]);
  assert.deepEqual(SAFETY_ROUTE_MAPS.challenge.trafficPaths.map(item => item.type).sort(), [
    "bicycle", "car", "car", "scooter"
  ]);
});

test("친구는 2부터 순서대로만 수집한다", () => {
  const state = createSafetyRouteState("easy", { seed: 4 });
  const wrongFriend = state.map.friends.find(friend => friend.number === 4);
  const wrongMove = moveInto(state.map, wrongFriend);
  const wrong = attemptSafetyMove({ ...state, ...wrongMove }, wrongMove.direction);
  assert.deepEqual(wrong.event, { type: "wrong-friend", number: 4 });
  assert.equal(wrong.state.nextFriend, 2);
  assert.deepEqual(wrong.state.position, { x: wrongFriend.x, y: wrongFriend.y });

  const correctFriend = state.map.friends.find(friend => friend.number === 2);
  const correctMove = moveInto(state.map, correctFriend);
  const correct = attemptSafetyMove({ ...state, ...correctMove }, correctMove.direction);
  assert.deepEqual(correct.event, { type: "friend", number: 2 });
  assert.equal(correct.state.nextFriend, 3);
  assert.deepEqual(correct.state.collected, [1, 2]);
});

test("횡단보도는 빨간불과 초록불 종료 직전에 새 진입을 막는다", () => {
  const entry = stateAtLeftCrossing({ nextFriend: 6, collected: [1, 2, 3, 4, 5] });
  const red = attemptSafetyMove({
    ...entry,
    signal: { phase: "vehicle-go", elapsedMs: 0 }
  }, "right");
  assert.deepEqual(red.event, { type: "blocked", reason: "red-light" });

  const ending = attemptSafetyMove({
    ...entry,
    signal: { phase: "pedestrian-go", elapsedMs: 5100 }
  }, "right");
  assert.deepEqual(ending.event, { type: "blocked", reason: "green-ending" });

  const green = attemptSafetyMove({
    ...entry,
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  }, "right");
  assert.equal(green.event.type, "moved");
});

test("고정 장애물은 위치를 유지하고 정확한 안전 이유를 반환한다", () => {
  const state = createSafetyRouteState("steady", { seed: 9 });
  for (const hazard of state.map.hazards) {
    const move = moveInto(state.map, hazard);
    const result = attemptSafetyMove({ ...state, ...move }, move.direction);
    assert.deepEqual(result.event, { type: "blocked", reason: hazard.type });
    assert.deepEqual(result.state.position, move.position);
  }
});

test("맨홀 앞에서는 멈추고 비어 있는 짝 행으로 돌아갈 수 있다", () => {
  const state = createSafetyRouteState("easy", { seed: 8 });
  const manhole = state.map.hazards.find(hazard => hazard.type === "manhole");
  const before = { x: manhole.x - 1, y: manhole.y };
  const after = { x: manhole.x + 1, y: manhole.y };
  const blocked = attemptSafetyMove({ ...state, position: before }, "right");

  assert.deepEqual(blocked.event, { type: "blocked", reason: "manhole" });
  assert.ok(manhole.pairedBypassCell);
  const detour = findSafetyPath(state.map, before, after);
  assert.ok(detour.some(point => pointKey(point) === pointKey(manhole.pairedBypassCell)));
});

test("공사 골목을 만나면 다른 같은 동네 골목으로 우회할 수 있다", () => {
  const state = createSafetyRouteState("steady", { seed: 8 });
  const construction = state.map.hazards.find(hazard => hazard.type === "construction");
  const blockedAlley = state.map.alleys.find(alley => alley.x === construction.x);
  const openAlley = state.map.alleys.find(alley =>
    alley.zone === blockedAlley.zone && alley.id !== blockedAlley.id
  );

  assert.ok(construction.cells?.length > 1);
  const beforeConstruction = { x: construction.x, y: construction.cells[0].y - 1 };
  assert.deepEqual(
    attemptSafetyMove({ ...state, position: beforeConstruction }, "down").event,
    { type: "blocked", reason: "construction" }
  );
  const detour = findSafetyPath(
    state.map,
    { x: openAlley.x, y: openAlley.y + 1 },
    { x: openAlley.x, y: openAlley.y + openAlley.height - 2 }
  );
  assert.ok(detour.length > 0);
  assert.ok(detour.every(point => point.x === openAlley.x));
});

test("다중 셀 장애물은 이동과 길찾기 및 지도 검증에 모두 반영된다", () => {
  const state = createSafetyRouteState("easy", { seed: 3 });
  const map = structuredClone(state.map);
  const blocked = { x: map.start.x + 1, y: map.start.y };
  map.hazards = [{
    id: "wide-construction",
    type: "construction",
    x: map.start.x,
    y: map.start.y,
    cells: [{ ...map.start }, blocked]
  }];
  const result = attemptSafetyMove({ ...state, map }, "right");
  assert.deepEqual(result.event, { type: "blocked", reason: "construction" });
  assert.deepEqual(findSafetyPath(map, map.start, blocked), []);

  map.hazards[0].cells.push({ x: -1, y: map.start.y });
  const validation = validateSafetyRouteMap(map);
  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes(`out of bounds: -1,${map.start.y}`));
});

test("장애물 발자국이 시작점을 덮으면 지도 검증이 거부한다", () => {
  const map = structuredClone(createSafetyRouteState("easy", { seed: 3 }).map);
  const hazard = map.hazards[0];
  map.hazards[0] = {
    ...hazard,
    cells: [{ ...hazard }, { ...map.start }]
  };

  const validation = validateSafetyRouteMap(map);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes(`blocked route endpoint: ${pointKey(map.start)}`));
});

test("자동차 경로가 중앙 도로 밖으로 나가면 지도 검증이 거부한다", () => {
  const map = structuredClone(createSafetyRouteState("challenge", { seed: 3 }).map);
  const car = map.trafficPaths.find(path => path.type === "car");
  car.points[0] = { x: 0, y: 0 };

  const validation = validateSafetyRouteMap(map);

  assert.equal(validation.valid, false);
  assert.ok(validation.errors.includes("car outside road: 0,0"));
});

test("출입구는 첫 입력에 좌우 확인하고 다음 입력에 통과한다", () => {
  const state = createSafetyRouteState("steady", { seed: 9 });
  const entrance = state.map.entrances[0];
  const move = moveInto(state.map, entrance);
  const first = attemptSafetyMove({ ...state, ...move }, move.direction);
  assert.deepEqual(first.event, { type: "blocked", reason: "look-first" });
  assert.equal(first.state.checkedEntrance, entrance.id);

  const second = attemptSafetyMove(first.state, move.direction);
  assert.equal(second.event.type, "moved");
  assert.equal(second.state.checkedEntrance, null);
});

test("자동차는 신호에 멈추고 보행 순찰자는 느리게 한 칸씩 움직인다", () => {
  const start = createSafetyRouteState("challenge", { seed: 7 });
  assert.equal(start.signal.phase, "vehicle-go");
  assert.deepEqual(start.movers.map(mover => mover.pathIndex), [0, 0, 0, 0]);

  const one = advanceSafetyWorld(start, 100);
  assert.equal(one.tick, 100);
  assert.equal(one.signal.phase, "vehicle-go");
  assert.deepEqual(one.movers.map(mover => mover.pathIndex), [1, 1, 0, 0]);

  const walking = advanceSafetyWorld(one, 5900);
  assert.equal(walking.tick, 6000);
  assert.equal(walking.signal.phase, "pedestrian-go");
  assert.ok(walking.movers.filter(mover => mover.type === "car").every(mover => mover.stopped));
  assert.deepEqual(
    walking.movers.filter(mover => mover.type !== "car").map(mover => mover.pathIndex),
    [1, 1]
  );
});

test("보행 순찰자가 점유한 칸은 아이의 위치와 수집 상태를 바꾸지 않고 막는다", () => {
  const state = createSafetyRouteState("challenge", { seed: 7 });
  const rider = state.movers.find(mover => mover.type === "scooter");
  const path = state.map.trafficPaths.find(item => item.id === rider.id);
  const target = path.points[rider.pathIndex];
  const move = moveInto(state.map, target);

  const result = attemptSafetyMove({ ...state, ...move }, move.direction);

  assert.deepEqual(result.event, {
    type: "blocked",
    reason: "moving-rider",
    moverType: "scooter"
  });
  assert.deepEqual(result.state.position, move.position);
  assert.deepEqual(result.state.movers, state.movers);
  assert.deepEqual(result.state.collected, state.collected);
});

test("10 친구를 만나기 전에는 학교에 도착할 수 없다", () => {
  const state = createSafetyRouteState("easy", { seed: 5 });
  const move = moveInto(state.map, state.map.goal);
  const early = attemptSafetyMove({ ...state, ...move }, move.direction);
  assert.equal(early.event.type, "need-friends");

  const ready = attemptSafetyMove({
    ...state,
    ...move,
    nextFriend: 11,
    collected: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }, move.direction);
  assert.equal(ready.event.type, "complete");
});

test("벽과 잘못된 방향 입력은 상태를 바꾸지 않는다", () => {
  const state = createSafetyRouteState("easy", { seed: 2 });
  const wall = attemptSafetyMove(state, "left");
  assert.deepEqual(wall.event, { type: "blocked", reason: "wall" });
  assert.deepEqual(wall.state.position, state.position);

  const ignored = attemptSafetyMove(state, "diagonal");
  assert.equal(ignored.event.type, "ignored");
  assert.deepEqual(ignored.state, state);
});

test("잘못된 난이도는 차근차근 지도로 안전하게 정규화한다", () => {
  assert.equal(createSafetyRouteState("unknown").difficulty, "steady");
});
