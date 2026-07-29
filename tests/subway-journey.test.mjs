import test from "node:test";
import assert from "node:assert/strict";
import {
  RIDE_STOP_MS,
  RIDE_TRAVEL_MS,
  TRAIN_APPROACH_MS,
  TRAIN_STOP_MS,
  TRANSFER_SPLASH_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
  createSubwayJourney,
  currentLeg,
  currentTrain,
  rideStation,
  routeBetween,
  subwayAnnouncement,
  subwayDestinations
} from "../src/subway-journey.mjs";
import { linesAtStation } from "../src/subway-map-data.mjs";

function stopTargetTrain(state) {
  let current = state;
  for (let guard = 0; guard < 40; guard += 1) {
    const train = currentTrain(current);
    if (current.platform.stage === "stopped" &&
      train.line === currentLeg(current).line) {
      return current;
    }
    current = advanceSubwayWorld(current, 200);
  }
  throw new Error("target train never stopped");
}

function rideToStop(state, stopIndex) {
  let current = state;
  for (let guard = 0; guard < 400; guard += 1) {
    if (!current.ride.moving && current.ride.stopIndex === stopIndex) {
      return current;
    }
    current = advanceSubwayWorld(current, 200);
  }
  throw new Error(`never reached stop ${stopIndex}`);
}

test("경로 탐색은 실제 환승역을 거치는 이어진 구간을 만든다", () => {
  const route = routeBetween("시청", "대공원");
  assert.equal(route.transfers, 1);
  assert.equal(route.legs.length, 2);
  const [first, second] = route.legs;
  assert.equal(
    first.stations[first.stations.length - 1],
    second.stations[0],
    "legs connect at the transfer station"
  );
  const transferLines = linesAtStation(second.stations[0]).map(l => l.number);
  assert.ok(transferLines.includes(first.line));
  assert.ok(transferLines.includes(second.line));
  assert.equal(second.stations[second.stations.length - 1], "대공원");
});

test("목적지 선택이 난이도를 정하고 모든 목적지는 유효한 여정을 가진다", () => {
  const destinations = subwayDestinations();
  assert.equal(destinations.length, 10);
  assert.deepEqual(
    destinations.map(({ transfers }) => transfers).sort(),
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2].sort()
  );
  for (const { place, transfers } of destinations) {
    for (let seed = 0; seed < 4; seed += 1) {
      const journey = createSubwayJourney(place.id, seed);
      const again = createSubwayJourney(place.id, seed);
      assert.deepEqual(journey.legs, again.legs, `${place.id} seed ${seed}`);
      assert.equal(journey.transfers, transfers);
      assert.equal(journey.legs.length, transfers + 1, `${place.id} seed ${seed}`);
      const lastLeg = journey.legs[journey.legs.length - 1];
      assert.equal(
        lastLeg.stations[lastLeg.stations.length - 1],
        place.station
      );
      journey.legs.forEach(leg => assert.ok(leg.stations.length >= 2));
      for (let index = 1; index < journey.legs.length; index += 1) {
        const prev = journey.legs[index - 1];
        assert.equal(
          prev.stations[prev.stations.length - 1],
          journey.legs[index].stations[0]
        );
      }
    }
  }
});

test("승강장에서는 목표 호선 열차가 섰을 때만 위 방향키로 탈 수 있다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  assert.equal(journey.phase, "platform");
  assert.equal(
    attemptSubwayMove(journey, "up").event.type,
    "no-train",
    "approaching train cannot be boarded"
  );

  let state = advanceSubwayWorld(journey, TRAIN_APPROACH_MS);
  assert.equal(state.platform.stage, "stopped");
  const firstTrain = currentTrain(state);
  assert.notEqual(firstTrain.line, currentLeg(state).line, "first train is a decoy");
  const wrong = attemptSubwayMove(state, "up");
  assert.equal(wrong.event.type, "wrong-line");
  assert.equal(wrong.event.target, currentLeg(state).line);

  state = stopTargetTrain(state);
  const boarded = attemptSubwayMove(state, "up");
  assert.equal(boarded.event.type, "boarded");
  assert.equal(boarded.state.phase, "ride");
  assert.equal(boarded.state.ride.stopIndex, 0);
});

test("타는 동안 역마다 정차하고, 아직인 역에서 내리면 계속 탄다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  let state = stopTargetTrain(advanceSubwayWorld(journey, TRAIN_APPROACH_MS));
  state = attemptSubwayMove(state, "up").state;
  const leg = currentLeg(state);

  state = advanceSubwayWorld(state, RIDE_TRAVEL_MS);
  assert.equal(state.ride.stopIndex, 1);
  assert.equal(state.ride.doorOpen, true);
  assert.equal(subwayAnnouncement(state), `${leg.stations[1]}역입니다. 문이 열렸어요`);

  if (leg.stations.length > 2) {
    const early = attemptSubwayMove(state, "down");
    assert.equal(early.event.type, "not-yet");
    assert.equal(early.state.phase, "ride");
  }

  const lastIndex = leg.stations.length - 1;
  state = rideToStop(state, lastIndex);
  assert.equal(rideStation(state), leg.stations[lastIndex]);
  const terminalWait = advanceSubwayWorld(state, RIDE_STOP_MS * 3);
  assert.equal(terminalWait.ride.doorOpen, true, "terminal door stays open");

  const alight = attemptSubwayMove(terminalWait, "down");
  assert.equal(alight.event.type, "arrived");
  assert.equal(alight.state.phase, "arrived");
  assert.equal(alight.event.place.id, journey.place.id);
});

test("차근차근은 환승역 하차 후 다음 호선 승강장으로 이어진다", () => {
  const journey = createSubwayJourney("zoo", 5);
  let state = stopTargetTrain(advanceSubwayWorld(journey, TRAIN_APPROACH_MS));
  state = attemptSubwayMove(state, "up").state;
  const firstLeg = currentLeg(state);
  state = rideToStop(state, firstLeg.stations.length - 1);

  const alight = attemptSubwayMove(state, "down");
  assert.equal(alight.event.type, "transfer");
  assert.equal(alight.event.nextLine, journey.legs[1].line);
  state = alight.state;
  assert.equal(state.phase, "transfer");
  assert.equal(subwayAnnouncement(state), `${journey.legs[1].line}호선으로 갈아타요!`);

  state = advanceSubwayWorld(state, TRANSFER_SPLASH_MS);
  assert.equal(state.phase, "platform");
  assert.equal(state.platform.station, journey.legs[1].stations[0]);

  state = stopTargetTrain(state);
  const boarded = attemptSubwayMove(state, "up");
  assert.equal(boarded.event.type, "boarded");
  assert.equal(boarded.event.line, journey.legs[1].line);
});

test("문이 닫혀 있으면 내릴 수 없다", () => {
  const journey = createSubwayJourney("namsan", 7);
  let state = stopTargetTrain(advanceSubwayWorld(journey, TRAIN_APPROACH_MS));
  state = attemptSubwayMove(state, "up").state;
  assert.equal(state.ride.moving, true);
  assert.equal(attemptSubwayMove(state, "down").event.type, "door-closed");
});
