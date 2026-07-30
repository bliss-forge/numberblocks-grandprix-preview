import {
  SUBWAY_LINES,
  SUBWAY_PLACES,
  isTransferStation,
  lineByNumber,
  linesAtStation
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
export const ROOM_WIDTH = 9;
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
  const width = ROOM_WIDTH;
  const walkX = entrySide === "right"
    ? width - 2
    : entrySide === "left" ? 1 : Math.floor(width / 2);
  const free = [];
  for (let x = 1; x < width - 1; x += 1) {
    if (x !== walkX) free.push(x);
  }
  const take = () => free.splice(Math.floor(random() * free.length), 1)[0];

  const items = [];
  const itemCount = Math.min(free.length, 1 + Math.floor(random() * 2));
  for (let index = 0; index < itemCount; index += 1) {
    items.push({ x: take(), number: 1 + Math.floor(random() * 9) });
  }

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
    items,
    people,
    friend,
    tapped: false,
    gateX: width - 2
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
    line: null,
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
    cards: []
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
    return { arrived: true, hops: 0, side: null, transferHere: false };
  }
  const route = routeBetween(state.station, destination, state.line);
  if (!route) return null;
  const leg = route.legs[0];
  const nextStation = leg.stations[1];
  const transferHere = state.line !== null && leg.line !== state.line;
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
    return { state, event: { type: "tap-first", gateX: state.room?.gateX } };
  }
  if (!gateLines(state).includes(lineNumber)) {
    return { state, event: { type: "no-line", line: lineNumber } };
  }
  const changed = state.line !== null && state.line !== lineNumber;
  return {
    state: {
      ...state,
      line: lineNumber,
      phase: "platform",
      platform: { line: lineNumber, stage: "approaching", phaseMs: 0 },
      room: buildRoom("platform", {
        seed: state.seed,
        station: state.station,
        salt: lineNumber
      }),
      transfersUsed: state.transfersUsed + (changed ? 1 : 0)
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

  const person = room.people.find(item => item.x === target);
  if (person && !person.stepped) {
    return {
      blockedBy: person,
      facing,
      room: {
        ...room,
        facing,
        entering: false,
        people: room.people.map(item =>
          item === person ? { ...item, stepped: true } : item
        )
      }
    };
  }

  const item = room.items.find(entry => entry.x === target);
  const friend = room.friend && room.friend.x === target ? room.friend : null;
  return {
    facing,
    item,
    friend,
    room: {
      ...room,
      walkX: target,
      facing,
      entering: false,
      items: item ? room.items.filter(entry => entry !== item) : room.items,
      friend: friend ? null : room.friend
    }
  };
}

function departTo(state, station, side) {
  const isNew = !state.visited.includes(station);
  const friendNumber = isNew && station !== state.place.station
    ? nextFriendNumber(state.passengers)
    : null;
  const before = routeBetween(state.station, state.place.station, state.line) ??
    { transfers: 0, hops: 0 };
  const after = station === state.place.station
    ? { transfers: 0, hops: 0 }
    : routeBetween(station, state.place.station, state.line) ??
      { transfers: 0, hops: 0 };
  const closer = after.transfers < before.transfers ||
    (after.transfers === before.transfers && after.hops < before.hops);
  const moveCount = state.moveCount + 1;
  const strayStreak = closer ? 0 : state.strayStreak + 1;
  return {
    state: {
      ...state,
      station,
      moveCount,
      strayStreak,
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
                salt: state.transfersUsed + 1
              })
            },
            event: { type: "gate-reached", station: state.station }
          };
        }
        return {
          state: { ...state, room: { ...room, facing: outcome.facing } },
          event: { type: "wall", side: outcome.edge }
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
            passengers: [...state.passengers, outcome.friend.number]
          },
          event: { type: "friend-joined", number: outcome.friend.number }
        };
      }
      if (outcome.item) {
        return {
          state: { ...moved, cards: [...state.cards, outcome.item.number] },
          event: { type: "card-picked", number: outcome.item.number }
        };
      }
      return { state: moved, event: { type: "walked", x: outcome.room.walkX } };
    }

    if (input === "up") {
      if (state.phase === "gate") {
        if (room.tapped) {
          return { state, event: { type: "already-tapped" } };
        }
        if (room.walkX !== room.gateX) {
          return { state, event: { type: "walk-to-gate", gateX: room.gateX } };
        }
        return {
          state: { ...state, room: { ...room, tapped: true } },
          event: { type: "card-tapped", lines: gateLines(state) }
        };
      }
      if (state.phase === "platform") {
        if (state.platform.stage !== "stopped") {
          return { state, event: { type: "no-train" } };
        }
        return {
          state: {
            ...state,
            phase: "ride",
            platform: null,
            room: buildRoom("train", {
              seed: state.seed,
              station: state.station,
              salt: state.moveCount
            })
          },
          event: { type: "boarded", line: state.line }
        };
      }
      return ignored;
    }

    if (input === "space" && state.phase === "ride") {
      if (state.station === state.place.station) {
        return {
          state,
          event: { type: "time-to-alight", station: state.station }
        };
      }
      if (isTransferStation(state.station) && gateLines(state).length > 1) {
        return {
          state: {
            ...state,
            phase: "corridor",
            room: buildRoom("corridor", {
              seed: state.seed,
              station: state.station,
              entrySide: "left",
              salt: state.transfersUsed
            })
          },
          event: { type: "transfer-start", station: state.station }
        };
      }
      return { state, event: { type: "no-transfer", station: state.station } };
    }

    if (input === "down" && state.phase === "ride") {
      if (state.station !== state.place.station) {
        return {
          state,
          event: { type: "not-your-stop", station: state.station }
        };
      }
      return {
        state: {
          ...state,
          phase: "arriving",
          arriving: { stage: "melody", phaseMs: 0, dodge: null }
        },
        event: { type: "arriving", station: state.station }
      };
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
    return state.room?.tapped
      ? `${state.station}역 — 몇 호선을 탈까요?`
      : `${state.station}역 개찰구 — 카드를 찍어요!`;
  }
  if (state.phase === "platform") {
    return `${state.line}호선 승강장 — 열차를 기다려요`;
  }
  if (state.phase === "corridor") {
    return `${state.station}역 환승 통로 — 게이트로 가요`;
  }
  if (state.phase === "ride") {
    if (state.station === state.place.station) {
      return `${state.station}역입니다. ↓ 키로 내려요!`;
    }
    return `${state.station}역 정차 중`;
  }
  if (state.phase === "arriving") {
    return state.arriving?.stage === "melody"
      ? "도착 멜로디가 나와요"
      : "사람들을 피해서 내려요!";
  }
  return `${state.place.label}에 도착했어요!`;
}
