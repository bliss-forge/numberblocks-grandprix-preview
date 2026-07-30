import {
  STATION_COORDS,
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
export const TRANSFER_EXIT_MS = 1300;
export const TRANSFER_CORRIDOR_MS = 2200;
export const ARRIVE_MELODY_MS = 2000;
export const STRAY_LIMIT = 3;
export const MOVE_GUIDE_LIMIT = 30;
export const DIRECTION_ARROWS = Object.freeze({
  up: "↑",
  down: "↓",
  left: "←",
  right: "→"
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

function neighborsOnLine(line, index) {
  const last = line.stations.length - 1;
  const result = [];
  if (index > 0) result.push(index - 1);
  else if (line.loop) result.push(last);
  if (index < last) result.push(index + 1);
  else if (line.loop) result.push(0);
  return result;
}

export function routeBetween(startStation, endStation) {
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
  const startIds = linesAtStation(startStation).map(line =>
    stateIndex.get(`${line.number}:${startStation}`)
  );
  startIds.forEach(id => {
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
      const nextStation = line.stations[nextIndex];
      const id = stateIndex.get(`${line.number}:${nextStation}`);
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
  const rideLegs = legs.filter(leg => leg.stations.length >= 2);
  return {
    transfers: best[goal].transfers,
    hops: best[goal].hops,
    legs: rideLegs.map(leg => ({
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

function makePlatform(lineNumber) {
  return { line: lineNumber, stage: "approaching", phaseMs: 0 };
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
  const lines = linesAtStation(start);
  const singleLine = lines.length === 1 ? lines[0].number : null;
  return {
    seed,
    place,
    recommendedTransfers: targetTransfers,
    start,
    station: start,
    line: singleLine,
    phase: singleLine === null ? "gate" : "platform",
    platform: singleLine === null ? null : makePlatform(singleLine),
    transferring: null,
    arriving: null,
    transfersUsed: 0,
    moveCount: 0,
    strayStreak: 0,
    showRecommended: false,
    visited: [start],
    passengers: []
  };
}

export function gateLines(state) {
  return linesAtStation(state.station).map(line => line.number);
}

export function directionTargets(state) {
  const line = lineByNumber(state.line);
  if (!line) return {};
  const index = line.stations.indexOf(state.station);
  if (index === -1) return {};
  const here = STATION_COORDS[state.station];
  const targets = {};
  neighborsOnLine(line, index).forEach(neighborIndex => {
    const station = line.stations[neighborIndex];
    const point = STATION_COORDS[station];
    const dx = point.x - here.x;
    const dy = point.y - here.y;
    const primary = Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? "right" : "left")
      : (dy >= 0 ? "down" : "up");
    const secondary = Math.abs(dx) >= Math.abs(dy)
      ? (dy >= 0 ? "down" : "up")
      : (dx >= 0 ? "right" : "left");
    const slot = targets[primary] ? secondary : primary;
    if (!targets[slot]) targets[slot] = station;
  });
  return targets;
}

export function subwayCompass(state) {
  const destination = state.place.station;
  if (state.station === destination) {
    return { arrived: true, hops: 0 };
  }
  const route = routeBetween(state.station, destination);
  if (!route) return null;
  const leg = route.legs[0];
  const transferHere = state.line !== null && leg.line !== state.line;
  const nextStation = leg.stations[1];
  const here = STATION_COORDS[state.station];
  const there = STATION_COORDS[nextStation];
  const dx = there.x - here.x;
  const dy = there.y - here.y;
  const direction = Math.abs(dx) >= Math.abs(dy)
    ? (dx >= 0 ? "right" : "left")
    : (dy >= 0 ? "down" : "up");
  return {
    arrived: false,
    line: leg.line,
    nextStation,
    direction,
    hops: route.hops,
    transfers: route.transfers,
    transferHere,
    route
  };
}

export function chooseSubwayLine(state, lineNumber) {
  if (state.phase !== "gate") {
    return { state, event: { type: "ignored" } };
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
      platform: makePlatform(lineNumber),
      transfersUsed: state.transfersUsed + (changed ? 1 : 0)
    },
    event: { type: "line-chosen", line: lineNumber }
  };
}

function makeDodge(state) {
  const random = seededRandom(state.seed + state.moveCount * 131);
  const blockedCount = 1 + Math.floor(random() * 2);
  const blocked = [];
  while (blocked.length < blockedCount) {
    const lane = DODGE_LANES[Math.floor(random() * DODGE_LANES.length)];
    if (!blocked.includes(lane)) blocked.push(lane);
  }
  const open = DODGE_LANES.filter(lane => !blocked.includes(lane));
  return { blocked, open };
}

export function dodgeLaneLabel(lane) {
  return DODGE_LANE_LABELS[lane] ?? lane;
}

export function attemptSubwayMove(state, input) {
  const ignored = { state, event: { type: "ignored" } };

  if (state.phase === "platform" && input === "up") {
    if (state.platform.stage !== "stopped") {
      return { state, event: { type: "no-train" } };
    }
    return {
      state: { ...state, phase: "ride", platform: null },
      event: { type: "boarded", line: state.line }
    };
  }

  if (state.phase === "ride") {
    if (input === "space") {
      if (isTransferStation(state.station) && gateLines(state).length > 1) {
        return {
          state: {
            ...state,
            phase: "transferring",
            transferring: { stage: "exit", phaseMs: 0 }
          },
          event: { type: "transfer-start", station: state.station }
        };
      }
      return { state, event: { type: "no-transfer", station: state.station } };
    }

    if (input === "down" && state.station === state.place.station) {
      return {
        state: {
          ...state,
          phase: "arriving",
          arriving: { stage: "melody", phaseMs: 0, dodge: null }
        },
        event: { type: "arriving", station: state.station }
      };
    }

    const targets = directionTargets(state);
    const target = targets[input];
    if (!target) {
      return { state, event: { type: "no-track", direction: input } };
    }
    const before = routeBetween(state.station, state.place.station)?.hops ?? 0;
    const after = target === state.place.station
      ? 0
      : routeBetween(target, state.place.station)?.hops ?? 0;
    const closer = after < before;
    const isNew = !state.visited.includes(target);
    let passengers = state.passengers;
    let passenger = null;
    if (isNew && target !== state.place.station) {
      passenger = 2 + (passengers.length % 9);
      passengers = [...passengers, passenger];
    }
    const moveCount = state.moveCount + 1;
    const strayStreak = closer ? 0 : state.strayStreak + 1;
    return {
      state: {
        ...state,
        station: target,
        moveCount,
        strayStreak,
        showRecommended: state.showRecommended ||
          strayStreak >= STRAY_LIMIT || moveCount >= MOVE_GUIDE_LIMIT,
        visited: isNew ? [...state.visited, target] : state.visited,
        passengers
      },
      event: {
        type: "drove",
        station: target,
        passenger,
        closer,
        atDest: target === state.place.station,
        transferHere: isTransferStation(target)
      }
    };
  }

  if (state.phase === "arriving" && state.arriving?.stage === "dodge") {
    if (!DODGE_LANES.includes(input)) return ignored;
    if (state.arriving.dodge.open.includes(input)) {
      return {
        state: { ...state, phase: "arrived", arriving: null },
        event: { type: "alighted", place: state.place }
      };
    }
    return {
      state,
      event: { type: "blocked-person", lane: input }
    };
  }

  return ignored;
}

export function advanceSubwayWorld(state, elapsedMs = 100) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;

  if (state.phase === "platform" && state.platform) {
    const platform = { ...state.platform, phaseMs: state.platform.phaseMs + elapsed };
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

  if (state.phase === "transferring" && state.transferring) {
    const transferring = {
      ...state.transferring,
      phaseMs: state.transferring.phaseMs + elapsed
    };
    if (transferring.stage === "exit" &&
      transferring.phaseMs >= TRANSFER_EXIT_MS) {
      transferring.stage = "corridor";
      transferring.phaseMs = 0;
    } else if (transferring.stage === "corridor" &&
      transferring.phaseMs >= TRANSFER_CORRIDOR_MS) {
      return {
        ...state,
        phase: "gate",
        transferring: null,
        platform: null
      };
    }
    return { ...state, transferring };
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
    return `${state.station}역 — 몇 호선을 탈까요?`;
  }
  if (state.phase === "platform") {
    return `${state.line}호선을 기다려요`;
  }
  if (state.phase === "ride") {
    if (state.station === state.place.station) {
      return `${state.station}역입니다. ↓ 키로 내려요!`;
    }
    return `${state.station}역입니다`;
  }
  if (state.phase === "transferring") {
    return state.transferring?.stage === "exit"
      ? "열차에서 내려요"
      : "환승 통로를 지나 게이트로 가요";
  }
  if (state.phase === "arriving") {
    return state.arriving?.stage === "melody"
      ? "도착 멜로디가 나와요"
      : "사람들을 피해서 내려요!";
  }
  return `${state.place.label}에 도착했어요!`;
}
