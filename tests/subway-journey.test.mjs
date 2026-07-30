import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVE_MELODY_MS,
  GATE_ROOM_WIDTH,
  HOP_PERIOD_MS,
  hopInWindow,
  hopMarker,
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

const STOP_EVENTS = [
  "wall", "departed", "gate-reached", "line-end", "stairs-down",
  "pick-line-first"
];

function walkTo(state, targetX) {
  let current = state;
  for (let guard = 0; guard < GATE_ROOM_WIDTH * 3; guard += 1) {
    if (current.room.walkX === targetX) return current;
    const step = current.room.walkX < targetX ? "right" : "left";
    const result = attemptSubwayMove(current, step);
    current = result.state;
    if (STOP_EVENTS.includes(result.event.type)) return current;
  }
  throw new Error(`never reached x=${targetX}`);
}

function multiLineStart(placeId = "lake") {
  for (let seed = 0; seed < 60; seed += 1) {
    const journey = createSubwayJourney(placeId, seed);
    if (gateLines(journey).length >= 2) return journey;
  }
  throw new Error("no multi-line start");
}

function passGate(state, lineNumber = null) {
  const through = walkTo(state, state.room.inGateX);
  assert.equal(through.room.tapped, true, "walking through taps the card");
  const line = lineNumber ?? subwayCompass(through)?.line ??
    gateLines(through)[0];
  const chosen = chooseSubwayLine(through, line);
  assert.equal(chosen.event.type, "line-chosen");
  let current = chosen.state;
  for (let guard = 0; guard < GATE_ROOM_WIDTH; guard += 1) {
    const result = attemptSubwayMove(current, "right");
    current = result.state;
    if (result.event.type === "stairs-down") return current;
  }
  throw new Error("never walked down the stairs");
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

test("열차 방에는 사람이 놓이고 부딪히면 한 번 더 눌러 지나간다", () => {
  const room = buildRoom("train", { seed: 7, station: "시청", entrySide: "left" });
  assert.equal(room.width, ROOM_WIDTH);
  assert.equal(room.walkX, 2, "entry is one step inside the door");
  assert.ok(room.people.length >= 1);
  const occupied = room.people.map(person => person.x);
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
  assert.ok(["walked", "friend-joined"].includes(through.event.type));
  assert.equal(through.state.room.walkX, personX);
});

test("개찰구: 나가는 곳은 안내만 하고 들어가는 곳을 지나야 카드가 찍힌다", () => {
  const journey = multiLineStart();
  assert.equal(journey.room.width, GATE_ROOM_WIDTH);
  const early = chooseSubwayLine(journey, gateLines(journey)[0]);
  assert.equal(early.event.type, "tap-first");

  const up = attemptSubwayMove(journey, "up");
  assert.equal(up.event.type, "walk-through-gate", "no card-tap key any more");

  const besideExit = walkTo(journey, journey.room.outGateX + 1);
  const wrong = attemptSubwayMove(besideExit, "left");
  assert.equal(wrong.event.type, "wrong-gate");
  assert.equal(wrong.state.room.tapped, false, "the exit gate never lets you in");
  assert.equal(
    wrong.state.room.walkX,
    besideExit.room.walkX,
    "and it cannot be walked through"
  );

  const through = walkTo(journey, journey.room.inGateX);
  assert.equal(through.room.tapped, true);
  assert.equal(through.room.chosen, null, "a multi-line gate waits for a choice");
  assert.match(subwayAnnouncement(through), /몇 호선 계단/);

  const closed = attemptSubwayMove(through, "right");
  assert.equal(closed.event.type, "pick-line-first");
  assert.equal(closed.state.room.walkX, through.room.walkX, "stairs stay shut");

  const line = subwayCompass(through).line;
  const chosen = chooseSubwayLine(through, line);
  assert.equal(chosen.state.room.chosen, line);
  assert.equal(chosen.state.phase, "gate", "still has to walk down the stairs");
  assert.equal(chosen.state.transfersUsed, 0);

  const platform = passGate(journey, line);
  assert.equal(platform.phase, "platform");
  assert.equal(platform.room.kind, "platform");
  assert.equal(platform.line, line);
  assert.equal(platform.transfersUsed, 0, "first boarding is not a transfer");
});

test("호선이 하나인 역은 카드를 찍으면 그 호선 계단이 바로 열린다", () => {
  let single = null;
  for (let seed = 0; seed < 80 && !single; seed += 1) {
    const journey = createSubwayJourney("hanriver", seed);
    if (gateLines(journey).length === 1) single = journey;
  }
  assert.ok(single, "a single-line start exists");
  const through = walkTo(single, single.room.inGateX);
  assert.equal(through.room.chosen, gateLines(single)[0], "auto-picked");
  assert.equal(attemptSubwayMove(through, "right").event.type, "walked");
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
    assert.equal(forward.state.room.walkX, 2, "enters just inside the back door");
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
  const platform = passGate(reached, nextLine);
  assert.equal(platform.transfersUsed, 0, "counted on boarding, not on choosing");
  const boarded = boardTrain(platform);
  assert.equal(boarded.transfersUsed, 1);
  assert.equal(boarded.line, nextLine);
});

test("목적지 역에서 ⎵ → 멜로디 → 문 열림 → 노란 창에 맞춰 폴짝 내린다", () => {
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
  assert.equal(
    attemptSubwayMove(state, "space").event.type,
    "arriving",
    "space is just an alias for getting off"
  );

  const arriving = attemptSubwayMove(state, "down");
  assert.equal(arriving.event.type, "arriving");
  let current = advanceSubwayWorld(arriving.state, ARRIVE_MELODY_MS);
  assert.equal(current.arriving.stage, "hop");

  // a press racing the doors opening is not judged at all (grace window)
  const raced = attemptSubwayMove(current, "space");
  assert.equal(raced.event.type, "hop-wait");
  assert.equal(raced.state.arriving.misses ?? 0, 0, "grace costs nothing");

  // once the marker is visibly moving, an off-window press is a gentle miss
  current = advanceSubwayWorld(current, 300);
  const early = attemptSubwayMove(current, "space");
  assert.equal(early.event.type, "hop-miss");
  assert.equal(early.state.phase, "arriving");
  current = early.state;

  // arrows do not jump — the hop is a spacebar moment
  assert.equal(attemptSubwayMove(current, "left").event.type, "hop-wait");

  // advance to dead centre from the miss position: the jump lands
  current = advanceSubwayWorld(current, HOP_PERIOD_MS / 4 - 300);
  assert.equal(hopInWindow(current.arriving.phaseMs), true);
  const alighted = attemptSubwayMove(current, "space");
  assert.equal(alighted.event.type, "alighted");
  assert.equal(alighted.state.phase, "arrived");
});

test("네 번째 시도는 항상 성공하고, 보조 모드는 언제나 내려준다", () => {
  const base = createSubwayJourney("hanriver", 3);
  let state = {
    ...base,
    station: base.place.station,
    phase: "arriving",
    // past the grace window, marker at the far right: every press misses
    arriving: { stage: "hop", phaseMs: HOP_PERIOD_MS / 2 }
  };
  assert.equal(
    attemptSubwayMove(state, "space", { assist: true }).event.type,
    "alighted",
    "reduced-motion assist always lands"
  );
  for (let miss = 0; miss < 3; miss += 1) {
    const result = attemptSubwayMove(state, "space");
    assert.equal(result.event.type, "hop-miss", `miss ${miss + 1}`);
    state = result.state;
  }
  assert.equal(
    attemptSubwayMove(state, "space").event.type,
    "alighted",
    "pity rule: the fourth jump lands"
  );
});

test("발빠짐 마커는 삼각파로 왕복하고 창 안일 때만 참이다", () => {
  assert.equal(hopMarker(0), 0);
  assert.equal(hopMarker(HOP_PERIOD_MS / 4), 0.5);
  assert.equal(hopMarker(HOP_PERIOD_MS / 2), 1);
  assert.equal(hopMarker((HOP_PERIOD_MS * 3) / 4), 0.5);
  assert.equal(hopInWindow(0), false);
  assert.equal(hopInWindow(HOP_PERIOD_MS / 4), true);
  assert.equal(hopInWindow(HOP_PERIOD_MS / 2), false);
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

test("승강장에서 ⎵는 ↑와 똑같이 열차를 탄다", () => {
  const platform = passGate(createSubwayJourney("hanriver", 3));
  assert.equal(attemptSubwayMove(platform, "space").event.type, "no-train");
  const stopped = advanceSubwayWorld(platform, TRAIN_APPROACH_MS);
  const boarded = attemptSubwayMove(stopped, "space");
  assert.equal(boarded.event.type, "boarded");
  assert.equal(boarded.state.phase, "ride");
});

test("이동 방향을 기억해 상행·하행 도착 멜로디를 고를 수 있다", () => {
  const riding = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  const forward = driveOneStop(riding, "forward");
  if (forward.event.type === "departed") {
    assert.equal(forward.state.travelSide, "forward");
    const back = driveOneStop(forward.state, "back");
    assert.equal(back.state.travelSide, "back");
  }
});

test("내릴 역이 아니면 ↓와 ⎵가 똑같이 동작한다", () => {
  const riding = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  const single = linesAtStation(riding.station).length === 1;
  const expected = single ? "not-your-stop" : "transfer-start";
  for (const key of ["down", "space"]) {
    assert.equal(attemptSubwayMove(riding, key).event.type, expected, key);
  }
});

test("만나지 못한 친구는 사라지지 않고 다음 방까지 따라온다", () => {
  let state = boardTrain(passGate(createSubwayJourney("lake", 5)));
  let guard = 0;
  while (!state.room.friend && guard++ < 12) {
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
  assert.ok(state.room.friend, "a friend is waiting in some room");
  const waiting = state.room.friend.number;
  assert.equal(state.pendingFriend, waiting);

  const compass = subwayCompass(state);
  const left = compass.transferHere
    ? attemptSubwayMove(state, "space").state
    : driveOneStop(state, compass.side).state;
  assert.equal(left.pendingFriend, waiting, "friend carries over");
  assert.equal(left.room.friend?.number, waiting, "and appears in the new room");
  assert.equal(left.passengers.includes(waiting), false);

  const met = walkTo(left, left.room.friend.x);
  assert.ok(met.passengers.includes(waiting), "can still be collected later");
  assert.equal(met.pendingFriend, null);
});

test("환승 통로를 돌기만 해도 정거장 수가 올라가 안내가 켜진다", () => {
  const journey = createSubwayJourney("lake", 5);
  let state = boardTrain(passGate(journey));
  let guard = 0;
  while (guard++ < 30) {
    const compass = subwayCompass(state);
    if (compass.transferHere) break;
    if (compass.arrived) throw new Error("no transfer point on this route");
    state = driveOneStop(state, compass.side).state;
  }
  const before = state.moveCount;
  const transferring = attemptSubwayMove(state, "space").state;
  assert.equal(
    transferring.moveCount,
    before + 1,
    "a transfer counts toward the guide escalation"
  );
});

test("직전 역으로 되돌아가면 헤맴 횟수가 초기화되지 않는다", () => {
  const first = boardTrain(passGate(createSubwayJourney("hanriver", 3)));
  const compass = subwayCompass(first);
  const away = driveOneStop(first, compass.side === "forward" ? "back" : "forward");
  if (away.event.type !== "departed") return;
  assert.equal(away.state.strayStreak, 1);
  const back = driveOneStop(away.state, compass.side);
  assert.equal(back.event.type, "departed");
  assert.equal(back.state.station, first.station);
  assert.equal(
    back.state.strayStreak,
    2,
    "ping-pong keeps raising the stray counter"
  );
});

test("개찰구 방은 개찰구·계단 칸을 사람이나 친구로 막지 않는다", () => {
  for (let seed = 0; seed < 60; seed += 1) {
    const room = buildRoom("gate", { seed, station: "시청", friendNumber: 4 });
    const blocked = [room.outGateX];
    for (let x = room.inGateX; x < room.width; x += 1) blocked.push(x);
    for (const person of room.people) {
      assert.equal(blocked.includes(person.x), false, `person seed ${seed}`);
    }
    if (room.friend) {
      assert.equal(blocked.includes(room.friend.x), false, `friend seed ${seed}`);
    }
  }
});

test("나침반은 어느 역에서 내려야 하는지와 남은 정거장을 알려준다", () => {
  let state = boardTrain(passGate(multiLineStart()));
  const first = subwayCompass(state);
  assert.ok(first.hopsToAlight >= 1, "starts before the alight point");
  assert.ok(first.alightAt, "names the station to get off at");

  let warned = null;
  for (let guard = 0; guard < 20; guard += 1) {
    const compass = subwayCompass(state);
    if (compass.hopsToAlight === 0) break;
    if (compass.hopsToAlight === 1) warned = state;
    state = driveOneStop(state, compass.side).state;
  }
  assert.ok(warned, "there is a one-stop-left warning window");
  assert.match(subwayAnnouncement(warned), /내릴 준비/);

  const there = subwayCompass(state);
  assert.equal(there.hopsToAlight, 0);
  assert.equal(there.alightAt, state.station);
  assert.equal(state.station, first.alightAt, "the plan held");
  assert.match(subwayAnnouncement(state), /내려요/);
});
