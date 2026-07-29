import test from "node:test";
import assert from "node:assert/strict";
import {
  DIRECTION_ARROWS,
  TRAIN_APPROACH_MS,
  TRANSFER_SPLASH_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
  createSubwayJourney,
  currentLeg,
  currentTrain,
  requiredDirection,
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

function driveToEnd(state) {
  let current = state;
  for (let guard = 0; guard < 40; guard += 1) {
    const need = requiredDirection(current);
    if (need === null) return current;
    const result = attemptSubwayMove(current, need);
    if (result.event.type !== "drove") {
      throw new Error(`unexpected ${result.event.type}`);
    }
    current = result.state;
  }
  throw new Error("never reached leg end");
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

test("탑승 후에는 지도 방향키로 운전하고 친구를 태우며 간다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  let state = stopTargetTrain(advanceSubwayWorld(journey, TRAIN_APPROACH_MS));
  state = attemptSubwayMove(state, "up").state;
  const leg = currentLeg(state);

  const need = requiredDirection(state);
  assert.ok(["up", "down", "left", "right"].includes(need));
  const wrongDirection = need === "up" ? "left" : "up";
  const wrong = attemptSubwayMove(state, wrongDirection);
  assert.equal(wrong.event.type, "wrong-way");
  assert.equal(wrong.event.need, need);
  assert.equal(wrong.state.ride.stopIndex, 0, "wrong key does not move");

  const first = attemptSubwayMove(state, need);
  assert.equal(first.event.type, "drove");
  assert.equal(first.state.ride.stopIndex, 1);
  if (leg.stations.length > 2) {
    assert.equal(first.event.passenger, 2, "first pickup is friend 2");
    assert.deepEqual(first.state.passengers, [2]);
    assert.match(
      subwayAnnouncement(first.state),
      new RegExp(DIRECTION_ARROWS[requiredDirection(first.state)] + "$")
    );
  } else {
    assert.equal(first.event.atAlight, true);
  }

  state = driveToEnd(first.state);
  const lastIndex = leg.stations.length - 1;
  assert.equal(rideStation(state), leg.stations[lastIndex]);
  assert.equal(requiredDirection(state), null);
  assert.equal(state.passengers.length, Math.max(0, lastIndex - 1));

  const early = attemptSubwayMove(state, "right");
  assert.equal(early.event.type, "time-to-alight");

  const alight = attemptSubwayMove(state, "down");
  assert.equal(alight.event.type, "arrived");
  assert.equal(alight.state.phase, "arrived");
  assert.equal(alight.event.place.id, journey.place.id);
  assert.deepEqual(alight.state.passengers, state.passengers);
});

test("환승역 하차 후 다음 호선 승강장으로 이어지고 태운 친구는 유지된다", () => {
  const journey = createSubwayJourney("zoo", 5);
  let state = stopTargetTrain(advanceSubwayWorld(journey, TRAIN_APPROACH_MS));
  state = attemptSubwayMove(state, "up").state;
  state = driveToEnd(state);
  const carried = state.passengers.length;

  const alight = attemptSubwayMove(state, "down");
  assert.equal(alight.event.type, "transfer");
  assert.equal(alight.event.nextLine, journey.legs[1].line);
  state = alight.state;
  assert.equal(state.phase, "transfer");
  assert.equal(state.passengers.length, carried, "passengers ride along");
  assert.equal(subwayAnnouncement(state), `${journey.legs[1].line}호선으로 갈아타요!`);

  state = advanceSubwayWorld(state, TRANSFER_SPLASH_MS);
  assert.equal(state.phase, "platform");
  assert.equal(state.platform.station, journey.legs[1].stations[0]);

  state = stopTargetTrain(state);
  const boarded = attemptSubwayMove(state, "up");
  assert.equal(boarded.event.type, "boarded");
  assert.equal(boarded.event.line, journey.legs[1].line);
});
