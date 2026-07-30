import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVE_MELODY_MS,
  MOVE_GUIDE_LIMIT,
  TRAIN_APPROACH_MS,
  TRANSFER_CORRIDOR_MS,
  TRANSFER_EXIT_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
  chooseSubwayLine,
  createSubwayJourney,
  directionTargets,
  gateLines,
  routeBetween,
  subwayCompass,
  subwayDestinations
} from "../src/subway-journey.mjs";
import { SUBWAY_LINES, linesAtStation } from "../src/subway-map-data.mjs";

function boardedState(placeId, seed) {
  let state = createSubwayJourney(placeId, seed);
  if (state.phase === "gate") {
    const recommended = subwayCompass(state)?.line ?? gateLines(state)[0];
    state = chooseSubwayLine(state, recommended).state;
  }
  state = advanceSubwayWorld(state, TRAIN_APPROACH_MS);
  const boarded = attemptSubwayMove(state, "up");
  assert.equal(boarded.event.type, "boarded");
  return boarded.state;
}

function moveToward(state, station) {
  const targets = directionTargets(state);
  const entry = Object.entries(targets).find(([, name]) => name === station);
  assert.ok(entry, `direction toward ${station} from ${state.station}`);
  const result = attemptSubwayMove(state, entry[0]);
  assert.equal(result.event.type, "drove");
  return result;
}

function followCompass(state, maxSteps = 40) {
  let current = state;
  for (let step = 0; step < maxSteps; step += 1) {
    const compass = subwayCompass(current);
    if (compass.arrived) return { state: current, at: "dest" };
    if (compass.transferHere) return { state: current, at: "transfer" };
    current = moveToward(current, compass.nextStation).state;
  }
  throw new Error("compass never converged");
}

test("경로 탐색은 실제 환승역을 거치는 이어진 구간을 만든다", () => {
  const route = routeBetween("시청", "대공원");
  assert.equal(route.transfers, 1);
  assert.equal(route.legs.length, 2);
  const [first, second] = route.legs;
  assert.equal(
    first.stations[first.stations.length - 1],
    second.stations[0]
  );
  assert.equal(second.stations[second.stations.length - 1], "대공원");
});

test("목적지 10곳은 권장 환승 수에 맞는 출발역과 재현 가능한 여정을 가진다", () => {
  const destinations = subwayDestinations();
  assert.equal(destinations.length, 10);
  assert.deepEqual(
    destinations.map(({ transfers }) => transfers).sort(),
    [0, 0, 0, 0, 1, 1, 1, 1, 2, 2].sort()
  );
  for (const { place, transfers } of destinations) {
    const journey = createSubwayJourney(place.id, 3);
    const again = createSubwayJourney(place.id, 3);
    assert.equal(journey.start, again.start, place.id);
    assert.equal(journey.recommendedTransfers, transfers);
    assert.equal(
      routeBetween(journey.start, place.station).transfers,
      transfers,
      place.id
    );
    assert.ok(["gate", "platform"].includes(journey.phase));
    if (journey.phase === "platform") {
      assert.equal(linesAtStation(journey.start).length, 1);
      assert.equal(journey.line, linesAtStation(journey.start)[0].number);
    } else {
      assert.ok(gateLines(journey).length >= 2);
    }
  }
});

test("게이트에서 없는 호선은 거부하고 고른 호선 승강장에서 탄다", () => {
  let found = null;
  for (let seed = 0; seed < 30 && !found; seed += 1) {
    const journey = createSubwayJourney("lake", seed);
    if (journey.phase === "gate") found = journey;
  }
  assert.ok(found, "gate-start journey exists");
  const bad = chooseSubwayLine(found, 99);
  assert.equal(bad.event.type, "no-line");
  const line = gateLines(found)[0];
  const chosen = chooseSubwayLine(found, line);
  assert.equal(chosen.event.type, "line-chosen");
  assert.equal(chosen.state.phase, "platform");
  assert.equal(chosen.state.line, line);

  let state = chosen.state;
  assert.equal(attemptSubwayMove(state, "up").event.type, "no-train");
  state = advanceSubwayWorld(state, TRAIN_APPROACH_MS);
  const boarded = attemptSubwayMove(state, "up");
  assert.equal(boarded.event.type, "boarded");
  assert.equal(boarded.state.phase, "ride");
});

test("자유 운전: 어느 이웃 역으로든 이동하고 새 역마다 친구를 태운다", () => {
  const state = boardedState("hanriver", 3);
  const targets = directionTargets(state);
  const entries = Object.entries(targets);
  assert.ok(entries.length >= 1);

  const first = attemptSubwayMove(state, entries[0][0]);
  assert.equal(first.event.type, "drove");
  assert.equal(first.state.station, entries[0][1]);
  if (entries[0][1] !== state.place.station) {
    assert.equal(first.event.passenger, 2);
  }

  const backEntry = Object.entries(directionTargets(first.state))
    .find(([, name]) => name === state.station);
  assert.ok(backEntry, "can drive back the other way");
  const back = attemptSubwayMove(first.state, backEntry[0]);
  assert.equal(back.event.type, "drove");
  assert.equal(back.state.station, state.station);
  assert.equal(back.event.passenger, null, "visited station has no new friend");

  assert.equal(
    attemptSubwayMove(state, "space").event.type,
    linesAtStation(state.station).length > 1 ? "transfer-start" : "no-transfer"
  );
});

test("많이 헤매면 지도에 추천 경로 안내가 켜진다", () => {
  let state = boardedState("hanriver", 3);
  const targets = Object.entries(directionTargets(state));
  assert.ok(targets.length >= 1);
  let flip = 0;
  while (state.moveCount < MOVE_GUIDE_LIMIT) {
    const options = Object.entries(directionTargets(state));
    const pick = options[flip % options.length];
    const result = attemptSubwayMove(state, pick[0]);
    assert.equal(result.event.type, "drove");
    state = result.state;
    flip += 1;
    if (state.station === state.place.station) {
      state = { ...state, station: state.visited[0] };
    }
  }
  assert.equal(state.showRecommended, true);
});

test("환승역에서 스페이스로 내려 통로·게이트를 지나 호선을 다시 고른다", () => {
  const journey = boardedState("lake", 5);
  const reached = followCompass(journey);
  assert.equal(reached.at, "transfer", "recommended path reaches a transfer");
  const startStation = reached.state.station;

  const started = attemptSubwayMove(reached.state, "space");
  assert.equal(started.event.type, "transfer-start");
  let state = started.state;
  assert.equal(state.phase, "transferring");

  state = advanceSubwayWorld(state, TRANSFER_EXIT_MS);
  assert.equal(state.transferring.stage, "corridor");
  state = advanceSubwayWorld(state, TRANSFER_CORRIDOR_MS);
  assert.equal(state.phase, "gate");
  assert.equal(state.station, startStation);

  const nextLine = subwayCompass(state).line;
  const chosen = chooseSubwayLine(state, nextLine);
  assert.equal(chosen.event.type, "line-chosen");
  assert.equal(chosen.state.transfersUsed, 1, "changing lines counts a transfer");
});

test("나침반이 가리키는 방향키는 전 구간에서 실제 이동 키와 일치한다", () => {
  const base = createSubwayJourney("lake", 5);
  const destinations = subwayDestinations();
  for (const line of SUBWAY_LINES) {
    for (const station of line.stations) {
      for (const { place } of destinations) {
        if (station === place.station) continue;
        const state = {
          ...base,
          place,
          station,
          line: line.number,
          phase: "ride"
        };
        const compass = subwayCompass(state);
        if (!compass || compass.arrived || compass.transferHere) continue;
        const targets = directionTargets(state);
        assert.equal(
          targets[compass.direction],
          compass.nextStation,
          `${station} ${line.number}호선 → ${place.station}`
        );
      }
    }
  }
});

test("환승은 줄지만 정거장이 늘어나는 추천 이동도 '가까워짐'으로 판정한다", () => {
  const base = createSubwayJourney("lake", 5);
  const state = {
    ...base,
    station: "국회의사당",
    line: 9,
    phase: "ride",
    visited: ["국회의사당"],
    passengers: [],
    moveCount: 0,
    strayStreak: 0
  };
  const compass = subwayCompass(state);
  assert.equal(compass.transferHere, false);
  const result = moveToward(state, compass.nextStation);
  assert.equal(result.event.closer, true);
});

test("나침반은 지금 탄 호선을 기준으로 환승 여부를 판단한다", () => {
  const base = createSubwayJourney("assembly", 5);
  const state = {
    ...base,
    station: "김포공항",
    line: 5,
    phase: "ride"
  };
  const compass = subwayCompass(state);
  assert.equal(
    compass.transferHere,
    false,
    "staying on line 5 is not worse — no transfer scold at 김포공항"
  );
});

test("목적지 역에서는 스페이스가 환승 대신 내리기 안내를 낸다", () => {
  const base = createSubwayJourney("lunapark", 5);
  const state = {
    ...base,
    station: base.place.station,
    line: 2,
    phase: "ride"
  };
  const result = attemptSubwayMove(state, "space");
  assert.equal(result.event.type, "time-to-alight");
  assert.equal(result.state.phase, "ride");
});

test("목적지에서 ↓ → 멜로디 → 문 열림 → 빈 곳으로 내려야 도착한다", () => {
  let { state, at } = followCompass(boardedState("hanriver", 3));
  while (at === "transfer") {
    let transferred = attemptSubwayMove(state, "space").state;
    transferred = advanceSubwayWorld(transferred, TRANSFER_EXIT_MS);
    transferred = advanceSubwayWorld(transferred, TRANSFER_CORRIDOR_MS);
    const line = subwayCompass(transferred).line;
    let chosen = chooseSubwayLine(transferred, line).state;
    chosen = advanceSubwayWorld(chosen, TRAIN_APPROACH_MS);
    state = attemptSubwayMove(chosen, "up").state;
    ({ state, at } = followCompass(state));
  }
  assert.equal(state.station, state.place.station);

  const arriving = attemptSubwayMove(state, "down");
  assert.equal(arriving.event.type, "arriving");
  let current = arriving.state;
  assert.equal(current.arriving.stage, "melody");

  current = advanceSubwayWorld(current, ARRIVE_MELODY_MS);
  assert.equal(current.arriving.stage, "dodge");
  const dodge = current.arriving.dodge;
  assert.ok(dodge.open.length >= 1);
  assert.ok(dodge.blocked.length >= 1);

  const blockedTry = attemptSubwayMove(current, dodge.blocked[0]);
  assert.equal(blockedTry.event.type, "blocked-person");
  assert.equal(blockedTry.state.phase, "arriving", "no penalty, retry");

  const alighted = attemptSubwayMove(current, dodge.open[0]);
  assert.equal(alighted.event.type, "alighted");
  assert.equal(alighted.state.phase, "arrived");
});
