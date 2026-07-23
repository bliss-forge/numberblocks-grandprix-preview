import test from "node:test";
import assert from "node:assert/strict";
import {
  SAFETY_ROUTE_MAPS,
  advanceSafetyWorld,
  attemptSafetyMove,
  createSafetyRouteState,
  validateSafetyRouteMap
} from "../src/safety-route-model.mjs";

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
    { ...state, position: { x: 4, y: 1 } },
    "right"
  );
  assert.equal(wrong.event.type, "wrong-friend");
  assert.equal(wrong.event.number, 4);
  assert.equal(wrong.state.nextFriend, 2);
  assert.deepEqual(wrong.state.position, { x: 5, y: 1 });

  const correct = attemptSafetyMove(
    { ...state, position: { x: 2, y: 6 } },
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
    position: { x: 2, y: 5 }
  };
  const red = attemptSafetyMove({ ...base, signal: "red" }, "up");
  assert.equal(red.event.type, "blocked");
  assert.equal(red.event.reason, "red-light");
  assert.deepEqual(red.state.position, { x: 2, y: 5 });

  const green = attemptSafetyMove({ ...base, signal: "green" }, "up");
  assert.equal(green.event.type, "moved");
  assert.deepEqual(green.state.position, { x: 2, y: 4 });
});

test("고정 장애물은 위치를 유지하고 정확한 안전 이유를 반환한다", () => {
  const state = createSafetyRouteState("steady");
  for (const [position, direction, reason] of [
    [{ x: 3, y: 4 }, "right", "manhole"],
    [{ x: 8, y: 6 }, "left", "construction"],
    [{ x: 7, y: 1 }, "right", "scooter"]
  ]) {
    const result = attemptSafetyMove({ ...state, position }, direction);
    assert.equal(result.event.type, "blocked");
    assert.equal(result.event.reason, reason);
    assert.deepEqual(result.state.position, position);
  }
});

test("차량과 자전거는 충돌시키지 않고 이동만 잠시 막는다", () => {
  const state = createSafetyRouteState("challenge");
  const car = attemptSafetyMove(
    {
      ...state,
      position: { x: 2, y: 1 },
      movers: [
        { type: "bicycle", pathIndex: 0 },
        { type: "car", pathIndex: 0 }
      ]
    },
    "right"
  );
  assert.equal(car.event.type, "blocked");
  assert.equal(car.event.reason, "car");
  assert.deepEqual(car.state.position, { x: 2, y: 1 });
});

test("신호와 움직이는 장애물은 틱마다 안전하게 갱신된다", () => {
  const start = createSafetyRouteState("challenge");
  const one = advanceSafetyWorld(start);
  assert.equal(one.tick, 1);
  assert.equal(one.signal, "red");
  assert.deepEqual(
    one.movers.map(mover => mover.pathIndex),
    [1, 1]
  );

  const three = advanceSafetyWorld(advanceSafetyWorld(one));
  assert.equal(three.tick, 3);
  assert.equal(three.signal, "green");
});

test("10 친구를 만나기 전에는 학교에 도착할 수 없다", () => {
  const state = createSafetyRouteState("easy");
  const early = attemptSafetyMove(
    { ...state, position: { x: 9, y: 1 } },
    "right"
  );
  assert.equal(early.event.type, "need-friends");

  const ready = attemptSafetyMove(
    {
      ...state,
      position: { x: 9, y: 1 },
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
