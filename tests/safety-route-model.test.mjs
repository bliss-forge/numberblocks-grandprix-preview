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

test("세 난이도 지도는 2~10 친구와 학교를 안전하게 연결한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    const map = SAFETY_ROUTE_MAPS[difficulty];
    assert.deepEqual(
      map.friends.map(friend => friend.number).sort((a, b) => a - b),
      [2, 3, 4, 5, 6, 7, 8, 9, 10]
    );
    assert.deepEqual(validateSafetyRouteMap(map), {
      valid: true,
      errors: []
    });
  }
});

test("난이도별로 생활안전 요소가 단계적으로 추가된다", () => {
  assert.deepEqual(
    SAFETY_ROUTE_MAPS.easy.hazards.map(hazard => hazard.type),
    []
  );
  assert.deepEqual(
    SAFETY_ROUTE_MAPS.steady.hazards.map(hazard => hazard.type).sort(),
    ["construction", "manhole", "scooter"]
  );
  assert.deepEqual(
    SAFETY_ROUTE_MAPS.challenge.hazards.map(hazard => hazard.type).sort(),
    ["construction", "manhole", "scooter"]
  );
  assert.deepEqual(
    SAFETY_ROUTE_MAPS.challenge.movers.map(mover => mover.type).sort(),
    ["bicycle", "car"]
  );
});

test("친구는 2부터 순서대로만 수집한다", () => {
  const state = createSafetyRouteState("easy");
  const wrong = attemptSafetyMove(
    { ...state, position: { x: 7, y: 8 } },
    "right"
  );
  assert.equal(wrong.event.type, "wrong-friend");
  assert.equal(wrong.event.number, 4);
  assert.equal(wrong.state.nextFriend, 2);
  assert.deepEqual(wrong.state.position, { x: 8, y: 8 });

  const correct = attemptSafetyMove(
    { ...state, position: { x: 2, y: 9 } },
    "up"
  );
  assert.equal(correct.event.type, "friend");
  assert.equal(correct.event.number, 2);
  assert.equal(correct.state.nextFriend, 3);
  assert.deepEqual(correct.state.collected, [1, 2]);
});

test("빨간불은 횡단보도 진입만 막고 초록불에는 통과시킨다", () => {
  const base = {
    ...createSafetyRouteState("easy"),
    position: { x: 8, y: 5 },
    nextFriend: 10,
    collected: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  };
  const red = attemptSafetyMove({
    ...base,
    signal: { phase: "vehicle-go", elapsedMs: 0 }
  }, "up");
  assert.equal(red.event.type, "blocked");
  assert.equal(red.event.reason, "red-light");
  assert.deepEqual(red.state.position, { x: 8, y: 5 });

  const green = attemptSafetyMove({
    ...base,
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  }, "up");
  assert.equal(green.event.type, "moved");
  assert.deepEqual(green.state.position, { x: 8, y: 4 });
});

test("고정 장애물은 위치를 유지하고 정확한 안전 이유를 반환한다", () => {
  const state = createSafetyRouteState("steady");
  for (const [position, direction, reason] of [
    [{ x: 4, y: 6 }, "right", "manhole"],
    [{ x: 9, y: 10 }, "right", "construction"],
    [{ x: 8, y: 8 }, "up", "scooter"]
  ]) {
    const result = attemptSafetyMove({ ...state, position }, direction);
    assert.equal(result.event.type, "blocked");
    assert.equal(result.event.reason, reason);
    assert.deepEqual(result.state.position, position);
  }
});

test("차량과 자전거는 차도에 머물러 보행 통로를 막지 않는다", () => {
  const state = createSafetyRouteState("challenge");
  const car = attemptSafetyMove(
    {
      ...state,
      position: { x: 8, y: 5 },
      signal: { phase: "pedestrian-go", elapsedMs: 0 },
      nextFriend: 10,
      collected: [1, 2, 3, 4, 5, 6, 7, 8, 9],
      movers: [
        { type: "car", pathIndex: 5 },
        { type: "bicycle", pathIndex: 0 }
      ]
    },
    "up"
  );
  assert.equal(car.event.type, "moved");
  assert.deepEqual(car.state.position, { x: 8, y: 4 });
});

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
    { ...state, position: { x: 5, y: 10 } },
    "right"
  );
  assert.equal(first.event.reason, "look-first");
  assert.equal(first.state.checkedEntrance, "shops-entrance");

  const second = attemptSafetyMove(first.state, "right");
  assert.equal(second.event.type, "moved");
  assert.equal(second.state.checkedEntrance, null);
});

test("신호와 움직이는 장애물은 틱마다 안전하게 갱신된다", () => {
  const start = createSafetyRouteState("challenge");
  const one = advanceSafetyWorld(start, 100);
  assert.equal(one.tick, 100);
  assert.equal(one.signal.phase, "vehicle-go");
  assert.deepEqual(
    one.movers.map(mover => mover.pathIndex),
    [1, 1]
  );

  const green = advanceSafetyWorld(one, 5900);
  assert.equal(green.tick, 6000);
  assert.equal(green.signal.phase, "pedestrian-go");
});

test("10 친구를 만나기 전에는 학교에 도착할 수 없다", () => {
  const state = createSafetyRouteState("easy");
  const early = attemptSafetyMove(
    { ...state, position: { x: 14, y: 2 } },
    "right"
  );
  assert.equal(early.event.type, "need-friends");

  const ready = attemptSafetyMove(
    {
      ...state,
      position: { x: 14, y: 2 },
      nextFriend: 11,
      collected: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    },
    "right"
  );
  assert.equal(ready.event.type, "complete");
});

test("벽과 잘못된 방향 입력은 상태를 바꾸지 않는다", () => {
  const state = createSafetyRouteState("easy");
  const wall = attemptSafetyMove(state, "down");
  assert.equal(wall.event.type, "blocked");
  assert.equal(wall.event.reason, "wall");
  assert.deepEqual(wall.state.position, state.position);

  const ignored = attemptSafetyMove(state, "diagonal");
  assert.equal(ignored.event.type, "ignored");
  assert.deepEqual(ignored.state, state);
});

test("잘못된 난이도는 차근차근 지도로 안전하게 정규화한다", () => {
  assert.equal(createSafetyRouteState("unknown").difficulty, "steady");
});
