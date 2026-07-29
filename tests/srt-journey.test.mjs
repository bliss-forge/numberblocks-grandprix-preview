import test from "node:test";
import assert from "node:assert/strict";
import {
  SRT_STATIONS,
  CAR_SHAPES,
  RIDE_DOOR,
  RIDE_SEAT,
  advanceSrtWorld,
  attemptSrtMove,
  createSrtJourney,
  seatCell,
  seatInfo,
  targetSeatName,
  trainWalkable
} from "../src/srt-journey.mjs";

test("역 순서는 수서-동탄-대전-대구-부산이다", () => {
  assert.deepEqual([...SRT_STATIONS], ["수서", "동탄", "대전", "대구", "부산"]);
});

test("같은 시드는 같은 좌석·차량 목표를 만든다", () => {
  const first = createSrtJourney(77);
  const second = createSrtJourney(77);
  assert.deepEqual(first.target, second.target);
  assert.equal(first.carShapeIndex, second.carShapeIndex);
  assert.ok(first.target.car >= 1 && first.target.car <= 5);
  assert.ok(first.target.row >= 1 && first.target.row <= 4);
  assert.ok(["A", "B", "C", "D"].includes(first.target.letter));
  assert.equal(first.targetStation, "부산");
});

test("좌석 좌표와 이름이 서로 일치한다", () => {
  const target = { car: 5, row: 3, letter: "A" };
  const cell = seatCell(target);
  const info = seatInfo(cell.x, cell.y);
  assert.deepEqual(
    { car: info.car, row: info.row, letter: info.letter },
    target
  );
  assert.equal(info.name, "5호차 3A");
  assert.equal(seatInfo(0, 0), null);
  assert.equal(seatInfo(5, 1), null);
  assert.equal(trainWalkable(5, 2), true);
  assert.equal(trainWalkable(5, 1), false);
});

test("목표 좌석에 앉으면 탑승 단계로, 다른 좌석은 안내만 한다", () => {
  const journey = createSrtJourney(3);
  const cell = seatCell(journey.target);
  const beside = { x: cell.x, y: 2 };
  const direction = cell.y < 2 ? "up" : "down";
  const wrongCell = seatCell({
    car: journey.target.car === 1 ? 2 : 1,
    row: journey.target.row,
    letter: journey.target.letter
  });

  const wrong = attemptSrtMove(
    { ...journey, position: { x: wrongCell.x, y: 2 } },
    wrongCell.y < 2 ? "up" : "down"
  );
  assert.equal(wrong.event.type, "wrong-seat");
  assert.equal(wrong.state.phase, "seat");

  const found = attemptSrtMove({ ...journey, position: beside }, direction);
  assert.equal(found.event.type, "seat-found");
  assert.equal(found.event.seat, targetSeatName(journey));
  assert.equal(found.state.phase, "ride");
  assert.deepEqual(found.state.position, RIDE_SEAT);
});

test("기차는 4초 이동 후 정차하고 부산이 아니면 다시 태운다", () => {
  const base = { ...createSrtJourney(3), phase: "ride" };
  let state = base;
  state = advanceSrtWorld(state, 4000);
  assert.equal(state.ride.stationIndex, 1);
  assert.equal(state.ride.doorOpen, true);

  const wrong = attemptSrtMove(
    { ...state, position: { x: RIDE_DOOR.x, y: RIDE_DOOR.y - 1 } },
    "down"
  );
  assert.equal(wrong.event.type, "wrong-station");
  assert.equal(wrong.event.station, "동탄");
  assert.equal(wrong.state.phase, "ride");
  assert.deepEqual(wrong.state.position, RIDE_SEAT);

  state = advanceSrtWorld(state, 5000);
  assert.equal(state.ride.moving, true);
  for (const expected of [2, 3, 4]) {
    state = advanceSrtWorld(state, 4000);
    assert.equal(state.ride.stationIndex, expected);
    if (expected < 4) state = advanceSrtWorld(state, 5000);
  }
  assert.equal(SRT_STATIONS[state.ride.stationIndex], "부산");

  state = advanceSrtWorld(state, 9000);
  assert.equal(state.ride.doorOpen, true, "종점에서는 문이 계속 열려 있다");

  const arrived = attemptSrtMove(
    { ...state, position: { x: RIDE_DOOR.x, y: RIDE_DOOR.y - 1 } },
    "down"
  );
  assert.equal(arrived.event.type, "arrived");
  assert.equal(arrived.state.phase, "parking");
});

test("그림자와 같은 모양 차를 고르면 성공한다", () => {
  const journey = { ...createSrtJourney(11), phase: "parking" };
  const wrongIndex = (journey.carShapeIndex + 1) % CAR_SHAPES.length;

  const wrong = attemptSrtMove(
    { ...journey, position: { x: wrongIndex, y: 1 } },
    "up"
  );
  assert.equal(wrong.event.type, "wrong-car");
  assert.equal(wrong.state.phase, "parking");

  const found = attemptSrtMove(
    { ...journey, position: { x: journey.carShapeIndex, y: 1 } },
    "up"
  );
  assert.equal(found.event.type, "car-found");
  assert.equal(found.event.shape, CAR_SHAPES[journey.carShapeIndex]);
  assert.equal(found.state.phase, "done");
});
