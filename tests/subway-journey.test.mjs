import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVE_MELODY_MS,
  MOVE_GUIDE_LIMIT,
  ROOM_WIDTH,
  TRAIN_APPROACH_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
  buildRoom,
  chooseSubwayLine,
  createSubwayJourney,
  gateLines,
  lineNeighbors,
  routeBetween,
  subwayAnnouncement,
  subwayCompass,
  subwayDestinations
} from "../src/subway-journey.mjs";
import { SUBWAY_LINES, linesAtStation } from "../src/subway-map-data.mjs";

function walkTo(state, targetX) {
  let current = state;
  for (let guard = 0; guard < ROOM_WIDTH * 3; guard += 1) {
    if (current.room.walkX === targetX) return current;
    const step = current.room.walkX < targetX ? "right" : "left";
    const result = attemptSubwayMove(current, step);
    current = result.state;
    if (["wall", "departed", "gate-reached", "line-end"].includes(result.event.type)) {
      return current;
    }
  }
  throw new Error(`never reached x=${targetX}`);
}

function passGate(state, lineNumber = null) {
  let current = walkTo(state, state.room.gateX);
  const tapped = attemptSubwayMove(current, "up");
  assert.equal(tapped.event.type, "card-tapped");
  current = tapped.state;
  const line = lineNumber ?? subwayCompass(current)?.line ?? gateLines(current)[0];
  const chosen = chooseSubwayLine(current, line);
  assert.equal(chosen.event.type, "line-chosen");
  return chosen.state;
}

function boardTrain(state) {
  let current = advanceSubwayWorld(state, TRAIN_APPROACH_MS);
  const boarded = attemptSubwayMove(current, "up");
  assert.equal(boarded.event.type, "boarded");
  return boarded.state;
}

function driveOneStop(state, side) {
  let current = state;
  const step = side === "forward" ? "right" : "left";
  for (let guard = 0; guard < ROOM_WIDTH * 3; guard += 1) {
    const result = attemptSubwayMove(current, step);
    current = result.state;
    if (result.event.type === "departed") return { state: current, event: result.event };
    if (result.event.type === "line-end" || result.event.type === "wall") {
      return { state: current, event: result.event };
    }
  }
  throw new Error("never departed");
}

test("경로 탐색은 실제 환승역을 거치는 이어진 구간을 만든다", () => {
  const route = routeBetween("시청", "대공원");
  assert.equal(route.transfers, 1);
  assert.equal(route.legs.length, 2);
  const [first, second] = route.legs;
  assert.equal(first.stations[first.stations.length - 1], second.stations[0]);
  assert.equal(second.stations[second.stations.length - 1], "대공원");
});

test("목적지 10곳은 권장 환승 수에 맞는 출발역과 개찰구 방에서 시작한다", () => {
  const destinations = subwayDestinations();
  assert.equal(destinations.length, 10);
  for (const { place, transfers } of destinations) {
    const journey = createSubwayJourney(place.id, 3);
    const again = createSubwayJourney(place.id, 3);
    assert.equal(journey.start, again.start, place.id);
    assert.equal(journey.recommendedTransfers, transfers);
    assert.equal(journey.phase, "gate");
    assert.equal(journey.room.kind, "gate");
    assert.equal(journey.line, null);
    assert.equal(
      routeBetween(journey.start, place.station).transfers,
      transfers,
      place.id
    );
  }
});

test("방에는 카드·사람이 놓이고 걸어가며 줍고 부딪히면 한 번 더 눌러 지나간다", () => {
  const room = buildRoom("train", { seed: 7, station: "시청", entrySide: "left" });
  assert.equal(room.width, ROOM_WIDTH);
  assert.equal(room.walkX, 1);
  assert.ok(room.items.length >= 1);
  assert.ok(room.people.length >= 1);
  const occupied = [
    ...room.items.map(item => item.x),
    ...room.people.map(person => person.x)
  ];
  assert.equal(new Set(occupied).size, occupied.length, "no overlap");

  const journey = createSubwayJourney("hanriver", 3);
  const state = {
    ...journey,
    phase: "ride",
    line: 5,
    room: buildRoom("train", { seed: 1, station: "광화문", entrySide: "left" })
  };
  const personX = state.room.people[0].x;
  const before = walkTo(state, personX - 1);
  const bump = attemptSubwayMove(before, "right");
  assert.equal(bump.event.type, "blocked-person");
  assert.equal(bump.state.room.walkX, personX - 1, "no penalty, stays put");
  const through = attemptSubwayMove(bump.state, "right");
  assert.ok(["walked", "card-picked", "friend-joined"].includes(through.event.type));
  assert.equal(through.state.room.walkX, personX);
});

test("개찰구: 카드를 찍기 전에는 호선을 고를 수 없고 찍으면 승강장으로 간다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  const early = chooseSubwayLine(journey, gateLines(journey)[0]);
  assert.equal(early.event.type, "tap-first");

  const away = attemptSubwayMove(journey, "up");
  assert.equal(away.event.type, "walk-to-gate");

  const atGate = walkTo(journey, journey.room.gateX);
  const tapped = attemptSubwayMove(atGate, "up");
  assert.equal(tapped.event.type, "card-tapped");
  assert.deepEqual(tapped.event.lines, gateLines(journey));
  assert.equal(tapped.state.room.tapped, true);
  assert.match(subwayAnnouncement(tapped.state), /몇 호선/);

  const line = gateLines(journey)[0];
  const chosen = chooseSubwayLine(tapped.state, line);
  assert.equal(chosen.state.phase, "platform");
  assert.equal(chosen.state.line, line);
  assert.equal(chosen.state.room.kind, "platform");
  assert.equal(chosen.state.transfersUsed, 0, "first boarding is not a transfer");
});

test("승강장: 열차가 서기 전에는 못 타고, 타면 열차 안 방이 된다", () => {
  const platform = passGate(createSubwayJourney("hanriver", 3));
  assert.equal(attemptSubwayMove(platform, "up").event.type, "no-train");
  const riding = boardTrain(platform);
  assert.equal(riding.phase, "ride");
  assert.equal(riding.room.kind, "train");
});

test("열차 안에서 끝 문까지 걸어가면 그 방향 다음 역으로 이동한다", () => {
  const riding = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  const neighbors = lineNeighbors(riding);
  assert.ok(neighbors.forward || neighbors.back);

  const forward = driveOneStop(riding, "forward");
  if (neighbors.forward) {
    assert.equal(forward.event.type, "departed");
    assert.equal(forward.state.station, neighbors.forward);
    assert.equal(forward.state.room.kind, "train");
    assert.equal(forward.state.room.walkX, 1, "enters from the back door");
    assert.equal(forward.state.moveCount, 1);
  } else {
    assert.equal(forward.event.type, "line-end");
  }

  const back = driveOneStop(forward.state, "back");
  assert.equal(back.event.type, "departed");
  assert.equal(back.state.station, riding.station, "can drive back");
});

test("나침반이 가리키는 문 방향은 실제 이웃 역과 일치한다", () => {
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
        assert.ok(compass.side, `${station} L${line.number} → ${place.station}`);
        assert.equal(
          lineNeighbors(state)[compass.side],
          compass.nextStation,
          `${station} L${line.number} → ${place.station}`
        );
      }
    }
  }
});

test("나침반을 따라가면 모든 조합에서 목적지에 도착한다", () => {
  const base = createSubwayJourney("lake", 5);
  let checked = 0;
  for (const line of SUBWAY_LINES) {
    for (const station of line.stations) {
      for (const { place } of subwayDestinations()) {
        if (station === place.station) continue;
        let state = { ...base, place, station, line: line.number, phase: "ride" };
        let arrived = false;
        for (let step = 0; step < 60; step += 1) {
          const compass = subwayCompass(state);
          if (!compass) break;
          if (compass.arrived) { arrived = true; break; }
          if (compass.transferHere) {
            state = { ...state, line: compass.line };
            continue;
          }
          state = { ...state, station: lineNeighbors(state)[compass.side] };
        }
        assert.ok(arrived, `${station} L${line.number} → ${place.station}`);
        checked += 1;
      }
    }
  }
  assert.ok(checked > 900, `checked ${checked} combinations`);
});

test("환승역에서 ⎵ → 통로 방 → 게이트 → 다른 호선을 고르면 환승 1회로 센다", () => {
  const journey = createSubwayJourney("lake", 5);
  let state = boardTrain(passGate(journey));
  let guard = 0;
  while (guard++ < 30) {
    const compass = subwayCompass(state);
    if (compass.transferHere || compass.arrived) break;
    state = driveOneStop(state, compass.side).state;
  }
  const compass = subwayCompass(state);
  assert.equal(compass.transferHere, true, "reached a transfer point");

  const started = attemptSubwayMove(state, "space");
  assert.equal(started.event.type, "transfer-start");
  assert.equal(started.state.phase, "corridor");
  assert.equal(started.state.room.kind, "corridor");

  const reached = walkTo(started.state, started.state.room.width - 1);
  assert.equal(reached.phase, "gate");
  assert.equal(reached.station, state.station);

  const nextLine = subwayCompass(reached).line;
  const boarded = passGate(reached, nextLine);
  assert.equal(boarded.transfersUsed, 1);
  assert.equal(boarded.line, nextLine);
});

test("목적지 역에서 ↓ → 멜로디 → 문 열림 → 빈 곳으로 내려야 도착한다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  let state = boardTrain(passGate(journey));
  let guard = 0;
  while (guard++ < 40) {
    const compass = subwayCompass(state);
    if (compass.arrived) break;
    if (compass.transferHere) {
      const corridor = attemptSubwayMove(state, "space").state;
      const gate = walkTo(corridor, corridor.room.width - 1);
      state = boardTrain(passGate(gate, subwayCompass(gate).line));
      continue;
    }
    state = driveOneStop(state, compass.side).state;
  }
  assert.equal(state.station, state.place.station);
  assert.equal(attemptSubwayMove(state, "space").event.type, "time-to-alight");

  const arriving = attemptSubwayMove(state, "down");
  assert.equal(arriving.event.type, "arriving");
  let current = advanceSubwayWorld(arriving.state, ARRIVE_MELODY_MS);
  assert.equal(current.arriving.stage, "dodge");
  const dodge = current.arriving.dodge;
  assert.ok(dodge.open.length >= 1);
  const blockedTry = attemptSubwayMove(current, dodge.blocked[0]);
  assert.equal(blockedTry.event.type, "blocked-person");
  assert.equal(blockedTry.state.phase, "arriving");
  const alighted = attemptSubwayMove(current, dodge.open[0]);
  assert.equal(alighted.event.type, "alighted");
  assert.equal(alighted.state.phase, "arrived");
});

test("목적지가 아닌 역에서 ↓를 누르면 안내만 하고 계속 탄다", () => {
  const riding = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  const result = attemptSubwayMove(riding, "down");
  assert.equal(result.event.type, "not-your-stop");
  assert.equal(result.state.phase, "ride");
});

test("많이 헤매면 지도에 추천 경로 안내가 켜진다", () => {
  let state = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  let flip = 0;
  let guard = 0;
  while (state.moveCount < MOVE_GUIDE_LIMIT && guard++ < 80) {
    const side = flip % 2 === 0 ? "forward" : "back";
    const outcome = driveOneStop(state, side);
    if (outcome.event.type !== "departed") {
      flip += 1;
      continue;
    }
    state = outcome.state;
    if (state.station === state.place.station) flip += 1;
    flip += 1;
  }
  assert.equal(state.showRecommended, true);
});

test("환승역이 아닌 곳에서 ⎵는 안내만 한다", () => {
  const riding = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  const single = linesAtStation(riding.station).length === 1;
  const result = attemptSubwayMove(riding, "space");
  assert.equal(
    result.event.type,
    single ? "no-transfer" : "transfer-start"
  );
});
