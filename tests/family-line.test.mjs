import test from "node:test";
import assert from "node:assert/strict";
import {
  DOOR_OPEN_MS,
  FAMILY_COUNT,
  TRAVEL_MS,
  advanceFamilyRide,
  attemptFamilyMove,
  createFamilyRide,
  familyBoard,
  familyHint,
  familyStation,
  hasMet,
  metCount
} from "../src/family-line.mjs";
import { FAMILY_STATIONS } from "../src/subway-map-data.mjs";

function ride(state, ...inputs) {
  let current = state;
  const events = [];
  for (const input of inputs) {
    const result = attemptFamilyMove(current, input);
    current = result.ride;
    events.push(result.event.type);
  }
  return { current, events };
}

function arrive(state) {
  return advanceFamilyRide(state, TRAVEL_MS).ride;
}

test("가족 노선은 엄마역에서 문을 연 채로 시작한다", () => {
  const start = createFamilyRide();
  assert.equal(start.index, 0);
  assert.equal(familyStation(start).label, "엄마");
  assert.equal(start.phase, "stopped", "바로 인사할 수 있다");
  assert.equal(metCount(start), 0);
  assert.equal(start.done, false);
  assert.match(familyHint(start), /엄마가 기다려요/);
});

test("스페이스바로 인사하면 도장이 하나 찍힌다", () => {
  const start = createFamilyRide();
  const { ride: after, event } = attemptFamilyMove(start, "space");
  assert.equal(event.type, "met");
  assert.equal(event.member.label, "엄마");
  assert.equal(event.count, 1);
  assert.equal(hasMet(after, "mom"), true);
  assert.equal(start.met.length, 0, "원래 상태는 그대로 둔다");
});

test("같은 사람에게 두 번 인사해도 도장은 하나고 혼내지 않는다", () => {
  const once = attemptFamilyMove(createFamilyRide(), "space").ride;
  const { ride: twice, event } = attemptFamilyMove(once, "space");
  assert.equal(event.type, "already-met");
  assert.equal(metCount(twice), 1);
});

test("달리는 중에는 인사할 수 없지만 벌점도 없다", () => {
  const moving = attemptFamilyMove(createFamilyRide(), "right").ride;
  assert.equal(moving.phase, "travel");
  const { ride: same, event } = attemptFamilyMove(moving, "space");
  assert.equal(event.type, "doors-closed");
  assert.equal(metCount(same), 0);
  assert.equal(same.index, moving.index, "제자리에 그대로 있다");
});

test("좌우로 옆 역에 가고, 끝에서는 더 못 간다", () => {
  const start = createFamilyRide();
  assert.equal(attemptFamilyMove(start, "left").event.type, "line-end");

  let current = start;
  for (let step = 0; step < FAMILY_COUNT - 1; step += 1) {
    const result = attemptFamilyMove(current, "right");
    assert.equal(result.event.type, "departed", `${step}번째`);
    current = arrive(result.ride);
  }
  assert.equal(familyStation(current).label, "김해 할머니");
  assert.equal(attemptFamilyMove(current, "right").event.type, "line-end");
});

test("달리다가 시간이 차면 다음 역에 서고 문이 열린다", () => {
  const moving = attemptFamilyMove(createFamilyRide(), "right").ride;
  const half = advanceFamilyRide(moving, TRAVEL_MS - 100);
  assert.equal(half.event, null);
  assert.equal(half.ride.phase, "travel");

  const stopped = advanceFamilyRide(half.ride, 100);
  assert.equal(stopped.event.type, "arrived");
  assert.equal(stopped.event.member.label, "아빠");
  assert.equal(stopped.ride.phase, "stopped");
  assert.equal(attemptFamilyMove(stopped.ride, "space").event.type, "met");
});

test("문은 닫혀도 다시 열릴 뿐 놓쳤다고 벌하지 않는다", () => {
  const start = createFamilyRide();
  const cycled = advanceFamilyRide(start, DOOR_OPEN_MS);
  assert.equal(cycled.event.type, "doors-cycled");
  assert.equal(cycled.ride.phase, "stopped");
  assert.equal(attemptFamilyMove(cycled.ride, "space").event.type, "met");
});

test("일곱 명을 다 만나면 끝난다", () => {
  let current = attemptFamilyMove(createFamilyRide(), "space").ride;
  let last = null;
  for (let step = 0; step < FAMILY_COUNT - 1; step += 1) {
    current = arrive(attemptFamilyMove(current, "right").ride);
    const result = attemptFamilyMove(current, "space");
    current = result.ride;
    last = result.event;
  }
  assert.equal(last.type, "all-met");
  assert.equal(metCount(current), FAMILY_COUNT);
  assert.equal(current.done, true);
  assert.match(familyHint(current), /다 만났어요/);
  assert.equal(attemptFamilyMove(current, "right").event.type, "already-done");
});

test("도장판은 일곱 칸이고 지금 있는 역을 짚어 준다", () => {
  const start = createFamilyRide();
  const board = familyBoard(start);
  assert.equal(board.length, FAMILY_COUNT);
  assert.deepEqual(
    board.map(entry => entry.label),
    FAMILY_STATIONS.map(member => member.label)
  );
  assert.equal(board.filter(entry => entry.here).length, 1);
  assert.equal(board[0].here, true);
  assert.equal(board.every(entry => entry.met === false), true);

  const after = arrive(attemptFamilyMove(
    attemptFamilyMove(start, "space").ride, "right"
  ).ride);
  const next = familyBoard(after);
  assert.equal(next[0].met, true, "엄마 도장이 남는다");
  assert.equal(next[1].here, true, "이제 아빠역");
});
