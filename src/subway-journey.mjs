import {
  SUBWAY_LINES,
  SUBWAY_PLACES,
  isTransferStation,
  lineByNumber,
  linesAtStation,
  stationLabel
} from "./subway-map-data.mjs";

export const PLACE_TRANSFERS = Object.freeze({
  lunapark: 0,
  baseball: 0,
  hanriver: 0,
  namsan: 0,
  zoo: 1,
  palace: 1,
  skypark: 1,
  childpark: 1,
  lake: 2,
  assembly: 2
});

export function subwayDestinations() {
  return SUBWAY_PLACES.map(place => ({
    place,
    transfers: PLACE_TRANSFERS[place.id] ?? 0
  }));
}

export const TRAIN_APPROACH_MS = 1600;
export const TRAIN_STOP_MS = 3200;
export const TRAIN_LEAVE_MS = 900;
export const ARRIVE_MELODY_MS = 2000;
export const ROOM_WIDTH = 7;
export const GATE_ROOM_WIDTH = 9;
export const STRAY_LIMIT = 3;
export const MOVE_GUIDE_LIMIT = 30;
export const DIRECTION_ARROWS = Object.freeze({
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
  back: "←",
  forward: "→"
});

const MAX_LEG_HOPS = 7;
const MAX_TOTAL_HOPS = 14;
const DODGE_LANES = Object.freeze(["left", "down", "right"]);
const DODGE_LANE_LABELS = Object.freeze({
  left: "왼쪽",
  down: "가운데",
  right: "오른쪽"
});

function seededRandom(seed) {
  let value = (Number(seed) || 0) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function hashName(name) {
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  }
  return hash;
}

function neighborsOnLine(line, index) {
  const last = line.stations.length - 1;
  const result = [];
  if (index > 0) result.push(index - 1);
  else if (line.loop) result.push(last);
  if (index < last) result.push(index + 1);
  else if (line.loop) result.push(0);
  return result;
}

export function routeBetween(startStation, endStation, startLine = null) {
  if (startStation === endStation) return null;
  const states = [];
  const stateIndex = new Map();
  SUBWAY_LINES.forEach(line => {
    line.stations.forEach((station, index) => {
      stateIndex.set(`${line.number}:${station}`, states.length);
      states.push({ line, station, index });
    });
  });
  const best = states.map(() => ({
    transfers: Infinity,
    hops: Infinity,
    prev: -1
  }));
  linesAtStation(startStation)
    .filter(line => startLine === null || line.number === startLine)
    .forEach(line => {
      const id = stateIndex.get(`${line.number}:${startStation}`);
      best[id] = { transfers: 0, hops: 0, prev: -1 };
    });
  const better = (a, b) =>
    a.transfers < b.transfers ||
    (a.transfers === b.transfers && a.hops < b.hops);
  const visited = new Set();
  for (;;) {
    let current = -1;
    for (let id = 0; id < states.length; id += 1) {
      if (visited.has(id) || best[id].transfers === Infinity) continue;
      if (current === -1 || better(best[id], best[current])) current = id;
    }
    if (current === -1) break;
    visited.add(current);
    const { line, station, index } = states[current];
    neighborsOnLine(line, index).forEach(nextIndex => {
      const id = stateIndex.get(`${line.number}:${line.stations[nextIndex]}`);
      const candidate = {
        transfers: best[current].transfers,
        hops: best[current].hops + 1,
        prev: current
      };
      if (better(candidate, best[id])) best[id] = candidate;
    });
    linesAtStation(station)
      .filter(other => other.number !== line.number)
      .forEach(other => {
        const id = stateIndex.get(`${other.number}:${station}`);
        const candidate = {
          transfers: best[current].transfers + 1,
          hops: best[current].hops,
          prev: current
        };
        if (better(candidate, best[id])) best[id] = candidate;
      });
  }
  let goal = -1;
  linesAtStation(endStation).forEach(line => {
    const id = stateIndex.get(`${line.number}:${endStation}`);
    if (best[id].transfers === Infinity) return;
    if (goal === -1 || better(best[id], best[goal])) goal = id;
  });
  if (goal === -1) return null;

  const chain = [];
  for (let id = goal; id !== -1; id = best[id].prev) chain.unshift(id);
  const legs = [];
  chain.forEach(id => {
    const { line, station } = states[id];
    const leg = legs[legs.length - 1];
    if (leg && leg.line === line.number) {
      if (leg.stations[leg.stations.length - 1] !== station) {
        leg.stations.push(station);
      }
    } else {
      legs.push({ line: line.number, stations: [station] });
    }
  });
  return {
    transfers: best[goal].transfers,
    hops: best[goal].hops,
    legs: legs
      .filter(leg => leg.stations.length >= 2)
      .map(leg => ({
        line: leg.line,
        color: lineByNumber(leg.line).color,
        stations: [...leg.stations]
      }))
  };
}

function journeyCandidates(place, targetTransfers) {
  const names = new Set();
  SUBWAY_LINES.forEach(line => line.stations.forEach(name => names.add(name)));
  const results = [];
  names.forEach(start => {
    if (start === place.station) return;
    const route = routeBetween(start, place.station);
    if (!route || route.transfers !== targetTransfers) return;
    if (route.legs.length !== targetTransfers + 1) return;
    if (route.hops > MAX_TOTAL_HOPS) return;
    if (route.legs.some(leg => leg.stations.length - 1 > MAX_LEG_HOPS)) return;
    results.push(start);
  });
  return results.sort((left, right) => left.localeCompare(right, "ko"));
}

export function buildRoom(kind, {
  seed = 0,
  station = "",
  entrySide = "middle",
  friendNumber = null,
  salt = 0
} = {}) {
  const random = seededRandom(seed + hashName(station) + hashName(kind) + salt);
  const isGate = kind === "gate";
  const width = isGate ? GATE_ROOM_WIDTH : ROOM_WIDTH;
  const outGateX = isGate ? 1 : null;
  const inGateX = isGate ? width - 5 : null;
  const stairsFrom = isGate ? width - 4 : null;
  const walkX = isGate
    ? 3
    : entrySide === "right"
      ? width - 3
      : entrySide === "left" ? 2 : Math.floor(width / 2);
  const free = [];
  for (let x = 1; x < width - 1; x += 1) {
    if (x === walkX) continue;
    if (isGate && (x === outGateX || x >= inGateX)) continue;
    free.push(x);
  }
  const take = () => free.splice(Math.floor(random() * free.length), 1)[0];

  const people = [];
  const peopleCount = kind === "train"
    ? 1 + Math.floor(random() * 2)
    : kind === "corridor" ? 1 : 0;
  for (let index = 0; index < peopleCount && free.length > 0; index += 1) {
    people.push({ x: take(), stepped: false });
  }

  const friend = friendNumber !== null && free.length > 0
    ? { x: take(), number: friendNumber }
    : null;

  return {
    kind,
    width,
    walkX,
    facing: entrySide === "right" ? "left" : "right",
    entering: entrySide !== "middle",
    people,
    friend,
    tapped: false,
    chosen: null,
    outGateX,
    inGateX,
    stairsFrom
  };
}

function nextFriendNumber(passengers) {
  return 2 + (passengers.length % 9);
}

export function createSubwayJourney(placeId, seed = 0) {
  const place = SUBWAY_PLACES.find(item => item.id === placeId);
  if (!place) throw new Error(`unknown subway place: ${placeId}`);
  const targetTransfers = PLACE_TRANSFERS[place.id] ?? 0;
  const random = seededRandom(seed);
  const candidates = journeyCandidates(place, targetTransfers);
  if (candidates.length === 0) {
    throw new Error(`no subway journey for ${placeId}`);
  }
  const start = candidates[Math.floor(random() * candidates.length)];
  return {
    seed,
    place,
    recommendedTransfers: targetTransfers,
    start,
    station: start,
    lastStation: null,
    line: null,
    ridden: null,
    phase: "gate",
    room: buildRoom("gate", { seed, station: start }),
    platform: null,
    arriving: null,
    transfersUsed: 0,
    moveCount: 0,
    strayStreak: 0,
    showRecommended: false,
    visited: [start],
    passengers: [],
    pendingFriend: null,
    travelSide: "forward"
  };
}

export function gateLines(state) {
  return linesAtStation(state.station).map(line => line.number);
}

export function lineNeighbors(state) {
  const line = lineByNumber(state.line);
  if (!line) return { back: null, forward: null };
  const index = line.stations.indexOf(state.station);
  if (index === -1) return { back: null, forward: null };
  const last = line.stations.length - 1;
  return {
    back: index > 0
      ? line.stations[index - 1]
      : line.loop ? line.stations[last] : null,
    forward: index < last
      ? line.stations[index + 1]
      : line.loop ? line.stations[0] : null
  };
}

export function subwayCompass(state) {
  const destination = state.place.station;
  if (state.station === destination) {
    return {
      arrived: true,
      line: state.line,
      hops: 0,
      hopsToAlight: 0,
      alightAt: state.station,
      side: null,
      transferHere: false,
      route: null
    };
  }
  const startLine = state.phase === "gate"
    ? state.room?.chosen ?? null
    : state.line;
  const route = routeBetween(state.station, destination, startLine);
  if (!route) return null;
  const leg = route.legs[0];
  const nextStation = leg.stations[1];
  const transferHere = startLine !== null && leg.line !== startLine;
  const neighbors = lineNeighbors(state);
  const side = transferHere
    ? null
    : neighbors.forward === nextStation
      ? "forward"
      : neighbors.back === nextStation ? "back" : null;
  return {
    arrived: false,
    line: leg.line,
    nextStation,
    side,
    transferHere,
    alightAt: transferHere
      ? state.station
      : leg.stations[leg.stations.length - 1],
    hopsToAlight: transferHere ? 0 : leg.stations.length - 1,
    hops: route.hops,
    transfers: route.transfers,
    route
  };
}

export function chooseSubwayLine(state, lineNumber) {
  if (state.phase !== "gate") {
    return { state, event: { type: "ignored" } };
  }
  if (!state.room?.tapped) {
    return { state, event: { type: "tap-first", inGateX: state.room?.inGateX } };
  }
  if (!gateLines(state).includes(lineNumber)) {
    return { state, event: { type: "no-line", line: lineNumber } };
  }
  return {
    state: {
      ...state,
      line: lineNumber,
      room: { ...state.room, chosen: lineNumber }
    },
    event: { type: "line-chosen", line: lineNumber }
  };
}

function makeDodge(state) {
  const random = seededRandom(state.seed + state.moveCount * 131);
  const blocked = [];
  const blockedCount = 1 + Math.floor(random() * 2);
  while (blocked.length < blockedCount) {
    const lane = DODGE_LANES[Math.floor(random() * DODGE_LANES.length)];
    if (!blocked.includes(lane)) blocked.push(lane);
  }
  return { blocked, open: DODGE_LANES.filter(lane => !blocked.includes(lane)) };
}

export function dodgeLaneLabel(lane) {
  return DODGE_LANE_LABELS[lane] ?? lane;
}

function walkResult(state, step) {
  const room = state.room;
  const target = room.walkX + step;
  const facing = step > 0 ? "right" : "left";

  if (target <= 0 || target >= room.width - 1) {
    return { edge: step > 0 ? "right" : "left", facing };
  }

  if (room.kind === "gate" && target === room.outGateX) {
    return {
      wrongGate: true,
      facing,
      room: { ...room, facing, entering: false }
    };
  }

  if (room.kind === "gate" && target >= room.stairsFrom &&
    room.chosen === null) {
    return {
      needLine: true,
      facing,
      room: { ...room, facing, entering: false }
    };
  }

  const person = room.people.find(item => item.x === target);
  if (person && !person.stepped) {
    return {
      blockedBy: person,
      facing,
      room: {
        ...room,
        facing,
        entering: false,
        bump: true,
        people: room.people.map(item =>
          item === person ? { ...item, stepped: true } : item
        )
      }
    };
  }

  const friend = room.friend && room.friend.x === target ? room.friend : null;
  return {
    facing,
    friend,
    room: {
      ...room,
      walkX: target,
      facing,
      entering: false,
      bump: false,
      friend: friend ? null : room.friend
    }
  };
}

function departTo(state, station, side) {
  const isNew = !state.visited.includes(station);
  const friendNumber = state.pendingFriend ??
    (isNew && station !== state.place.station
      ? nextFriendNumber(state.passengers)
      : null);
  const before = routeBetween(state.station, state.place.station, state.line) ??
    { transfers: 0, hops: 0 };
  const after = station === state.place.station
    ? { transfers: 0, hops: 0 }
    : routeBetween(station, state.place.station, state.line) ??
      { transfers: 0, hops: 0 };
  const closer = after.transfers < before.transfers ||
    (after.transfers === before.transfers && after.hops < before.hops);
  const backtrack = station === state.lastStation;
  const moveCount = state.moveCount + 1;
  const strayStreak = closer && !backtrack ? 0 : state.strayStreak + 1;
  return {
    state: {
      ...state,
      station,
      travelSide: side,
      lastStation: state.station,
      moveCount,
      strayStreak,
      pendingFriend: friendNumber,
      showRecommended: state.showRecommended ||
        strayStreak >= STRAY_LIMIT || moveCount >= MOVE_GUIDE_LIMIT,
      visited: isNew ? [...state.visited, station] : state.visited,
      room: buildRoom("train", {
        seed: state.seed,
        station,
        entrySide: side === "forward" ? "left" : "right",
        friendNumber,
        salt: moveCount
      })
    },
    event: {
      type: "departed",
      station,
      side,
      closer,
      atDest: station === state.place.station,
      transferHere: isTransferStation(station) &&
        station !== state.place.station,
      friendWaiting: friendNumber
    }
  };
}

function alightHere(state) {
  if (state.station === state.place.station) {
    return {
      state: {
        ...state,
        phase: "arriving",
        arriving: { stage: "melody", phaseMs: 0, dodge: null }
      },
      event: { type: "arriving", station: state.station }
    };
  }
  if (isTransferStation(state.station) && gateLines(state).length > 1) {
    const moveCount = state.moveCount + 1;
    const offPlan = subwayCompass(state)?.hopsToAlight !== 0;
    return {
      state: {
        ...state,
        phase: "corridor",
        moveCount,
        showRecommended: state.showRecommended ||
          moveCount >= MOVE_GUIDE_LIMIT,
        room: buildRoom("corridor", {
          seed: state.seed,
          station: state.station,
          entrySide: "left",
          friendNumber: state.pendingFriend,
          salt: state.transfersUsed
        })
      },
      event: { type: "transfer-start", station: state.station, offPlan }
    };
  }
  return { state, event: { type: "not-your-stop", station: state.station } };
}

export function attemptSubwayMove(state, input) {
  const ignored = { state, event: { type: "ignored" } };
  const room = state.room;

  if (["gate", "platform", "ride", "corridor"].includes(state.phase) && room) {
    if (input === "left" || input === "right") {
      const outcome = walkResult(state, input === "right" ? 1 : -1);

      if (outcome.edge) {
        if (state.phase === "ride") {
          const neighbors = lineNeighbors(state);
          const side = outcome.edge === "right" ? "forward" : "back";
          const station = neighbors[side];
          if (!station) {
            return {
              state: { ...state, room: { ...room, facing: outcome.facing } },
              event: { type: "line-end", side }
            };
          }
          return departTo(state, station, side);
        }
        if (state.phase === "corridor" && outcome.edge === "right") {
          return {
            state: {
              ...state,
              phase: "gate",
              room: buildRoom("gate", {
                seed: state.seed,
                station: state.station,
                friendNumber: state.pendingFriend,
                salt: state.transfersUsed + 1
              })
            },
            event: { type: "gate-reached", station: state.station }
          };
        }
        if (state.phase === "gate" && outcome.edge === "right") {
          if (room.chosen === null) {
            return {
              state,
              event: { type: "pick-line-first", lines: gateLines(state) }
            };
          }
          return {
            state: {
              ...state,
              phase: "platform",
              platform: {
                line: room.chosen,
                stage: "approaching",
                phaseMs: 0
              },
              room: buildRoom("platform", {
                seed: state.seed,
                station: state.station,
                friendNumber: state.pendingFriend,
                salt: room.chosen
              })
            },
            event: { type: "stairs-down", line: room.chosen }
          };
        }
        return {
          state: { ...state, room: { ...room, facing: outcome.facing } },
          event: { type: "wall", side: outcome.edge }
        };
      }

      if (outcome.wrongGate) {
        return {
          state: { ...state, room: outcome.room },
          event: { type: "wrong-gate", inGateX: room.inGateX }
        };
      }

      if (outcome.needLine) {
        return {
          state: { ...state, room: outcome.room },
          event: { type: "pick-line-first", lines: gateLines(state) }
        };
      }

      if (outcome.blockedBy) {
        return {
          state: { ...state, room: outcome.room },
          event: { type: "blocked-person" }
        };
      }

      const moved = { ...state, room: outcome.room };
      if (outcome.friend) {
        return {
          state: {
            ...moved,
            passengers: [...state.passengers, outcome.friend.number],
            pendingFriend: null
          },
          event: { type: "friend-joined", number: outcome.friend.number }
        };
      }
      if (room.kind === "gate") {
        const landed = outcome.room.walkX;
        if (landed === room.inGateX && !room.tapped) {
          const lines = gateLines(state);
          const tapped = {
            ...moved,
            room: { ...outcome.room, tapped: true }
          };
          if (lines.length === 1) {
            return {
              state: chooseSubwayLine(tapped, lines[0]).state,
              event: { type: "card-tapped", lines, autoLine: lines[0] }
            };
          }
          return {
            state: tapped,
            event: { type: "card-tapped", lines, autoLine: null }
          };
        }
      }
      return { state: moved, event: { type: "walked", x: outcome.room.walkX } };
    }

    if (input === "up" || (input === "space" && state.phase !== "ride")) {
      if (state.phase === "gate") {
        return {
          state,
          event: { type: "walk-through-gate", inGateX: room.inGateX }
        };
      }
      if (state.phase === "platform") {
        if (state.platform.stage !== "stopped") {
          return { state, event: { type: "no-train" } };
        }
        const transferred = state.ridden !== null &&
          state.ridden !== state.line;
        return {
          state: {
            ...state,
            phase: "ride",
            platform: null,
            ridden: state.line,
            transfersUsed: state.transfersUsed + (transferred ? 1 : 0),
            room: buildRoom("train", {
              seed: state.seed,
              station: state.station,
              friendNumber: state.pendingFriend,
              salt: state.moveCount
            })
          },
          event: { type: "boarded", line: state.line }
        };
      }
      return ignored;
    }

    if ((input === "down" || input === "space") && state.phase === "ride") {
      return alightHere(state);
    }
  }

  if (state.phase === "arriving" && state.arriving?.stage === "dodge") {
    if (!DODGE_LANES.includes(input)) return ignored;
    if (state.arriving.dodge.open.includes(input)) {
      return {
        state: { ...state, phase: "arrived", arriving: null },
        event: { type: "alighted", place: state.place }
      };
    }
    return { state, event: { type: "blocked-person", lane: input } };
  }

  return ignored;
}

export function advanceSubwayWorld(state, elapsedMs = 100) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  if (state.phase === "platform" && state.platform) {
    const platform = {
      ...state.platform,
      phaseMs: state.platform.phaseMs + elapsed
    };
    const limits = {
      approaching: TRAIN_APPROACH_MS,
      stopped: TRAIN_STOP_MS,
      leaving: TRAIN_LEAVE_MS
    };
    while (platform.phaseMs >= limits[platform.stage]) {
      platform.phaseMs -= limits[platform.stage];
      platform.stage = platform.stage === "approaching"
        ? "stopped"
        : platform.stage === "stopped" ? "leaving" : "approaching";
    }
    return { ...state, platform };
  }

  if (state.phase === "arriving" && state.arriving) {
    const arriving = {
      ...state.arriving,
      phaseMs: state.arriving.phaseMs + elapsed
    };
    if (arriving.stage === "melody" && arriving.phaseMs >= ARRIVE_MELODY_MS) {
      arriving.stage = "dodge";
      arriving.phaseMs = 0;
      arriving.dodge = makeDodge(state);
    }
    return { ...state, arriving };
  }

  return state;
}

export function subwayAnnouncement(state) {
  if (state.phase === "gate") {
    if (!state.room?.tapped) {
      return `${stationLabel(state.station)} — 들어가는 곳으로 지나가요`;
    }
    return state.room.chosen === null
      ? `${stationLabel(state.station)} — 몇 호선 계단으로 갈까요?`
      : `${state.room.chosen}호선 계단으로 내려가요`;
  }
  if (state.phase === "platform") {
    return `${state.line}호선 승강장 — 열차를 기다려요`;
  }
  if (state.phase === "corridor") {
    return `${stationLabel(state.station)} 환승 통로 — 게이트로 가요`;
  }
  if (state.phase === "ride") {
    const compass = subwayCompass(state);
    if (compass?.hopsToAlight === 0) {
      return `${stationLabel(state.station)}입니다. ⎵ 키로 내려요!`;
    }
    if (compass?.hopsToAlight === 1) {
      return `다음 역은 ${stationLabel(compass.alightAt)}입니다. 내릴 준비를 해요`;
    }
    return `${stationLabel(state.station)} 정차 중`;
  }
  if (state.phase === "arriving") {
    return state.arriving?.stage === "melody"
      ? "도착 멜로디가 나와요"
      : "사람들을 피해서 내려요!";
  }
  return `${state.place.label}에 도착했어요!`;
}
