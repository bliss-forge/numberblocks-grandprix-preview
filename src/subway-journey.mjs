import {
  STATION_COORDS,
  SUBWAY_LINES,
  SUBWAY_PLACES,
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
export const TRANSFER_SPLASH_MS = 2400;
export const DIRECTION_ARROWS = Object.freeze({
  up: "↑",
  down: "↓",
  left: "←",
  right: "→"
});

const MAX_LEG_HOPS = 7;
const MAX_TOTAL_HOPS = 14;

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
    results.push({ start, route });
  });
  return results.sort((left, right) => left.start.localeCompare(right.start, "ko"));
}

function makePlatform(leg, boardStation, random) {
  const targetLine = leg.line;
  const local = linesAtStation(boardStation).map(line => line.number);
  const decoys = local.filter(number => number !== targetLine);
  while (decoys.length < 2) {
    const extra = SUBWAY_LINES[Math.floor(random() * SUBWAY_LINES.length)].number;
    if (extra !== targetLine && !decoys.includes(extra)) decoys.push(extra);
  }
  const queue = [decoys[0], targetLine, decoys[1], targetLine];
  return {
    station: boardStation,
    queue,
    index: 0,
    stage: "approaching",
    phaseMs: 0
  };
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
  const picked = candidates[Math.floor(random() * candidates.length)];
  return {
    seed,
    place,
    transfers: targetTransfers,
    start: picked.start,
    legs: picked.route.legs,
    legIndex: 0,
    phase: "platform",
    platform: makePlatform(picked.route.legs[0], picked.start, random),
    ride: null,
    passengers: [],
    transferMs: 0
  };
}

export function currentLeg(state) {
  return state.legs[state.legIndex] ?? null;
}

export function currentTrain(state) {
  if (state.phase !== "platform" || !state.platform) return null;
  const number = state.platform.queue[
    state.platform.index % state.platform.queue.length
  ];
  return { line: number, color: lineByNumber(number).color };
}

export function rideStation(state) {
  const leg = currentLeg(state);
  if (!leg || !state.ride) return null;
  return leg.stations[state.ride.stopIndex];
}

export function requiredDirection(state) {
  const leg = currentLeg(state);
  if (!leg || !state.ride) return null;
  if (state.ride.stopIndex >= leg.stations.length - 1) return null;
  const from = STATION_COORDS[leg.stations[state.ride.stopIndex]];
  const to = STATION_COORDS[leg.stations[state.ride.stopIndex + 1]];
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "down" : "up";
}

export function attemptSubwayMove(state, direction) {
  const ignored = { state, event: { type: "ignored" } };
  if (!["up", "down", "left", "right"].includes(direction)) return ignored;
  const leg = currentLeg(state);

  if (state.phase === "platform" && direction === "up") {
    if (state.platform.stage !== "stopped") {
      return { state, event: { type: "no-train" } };
    }
    const train = currentTrain(state);
    if (train.line === leg.line) {
      return {
        state: {
          ...state,
          phase: "ride",
          platform: null,
          ride: { stopIndex: 0 }
        },
        event: { type: "boarded", line: leg.line }
      };
    }
    return {
      state,
      event: { type: "wrong-line", line: train.line, target: leg.line }
    };
  }

  if (state.phase === "ride") {
    const station = rideStation(state);
    const lastIndex = leg.stations.length - 1;
    const need = requiredDirection(state);

    if (need === null) {
      if (direction !== "down") {
        return { state, event: { type: "time-to-alight", station } };
      }
      const nextIndex = state.legIndex + 1;
      if (nextIndex >= state.legs.length) {
        return {
          state: { ...state, phase: "arrived", ride: null },
          event: { type: "arrived", station, place: state.place }
        };
      }
      return {
        state: {
          ...state,
          phase: "transfer",
          ride: null,
          legIndex: nextIndex,
          transferMs: 0
        },
        event: {
          type: "transfer",
          station,
          nextLine: state.legs[nextIndex].line
        }
      };
    }

    if (direction === need) {
      const nextIndex = state.ride.stopIndex + 1;
      const nextStation = leg.stations[nextIndex];
      const atAlight = nextIndex === lastIndex;
      let passengers = state.passengers;
      let passenger = null;
      if (!atAlight) {
        passenger = 2 + (passengers.length % 9);
        passengers = [...passengers, passenger];
      }
      return {
        state: {
          ...state,
          passengers,
          ride: { ...state.ride, stopIndex: nextIndex }
        },
        event: { type: "drove", station: nextStation, passenger, atAlight }
      };
    }

    return { state, event: { type: "wrong-way", need, station } };
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
      if (platform.stage === "approaching") platform.stage = "stopped";
      else if (platform.stage === "stopped") platform.stage = "leaving";
      else {
        platform.stage = "approaching";
        platform.index += 1;
      }
    }
    return { ...state, platform };
  }

  if (state.phase === "transfer") {
    const transferMs = state.transferMs + elapsed;
    if (transferMs >= TRANSFER_SPLASH_MS) {
      const leg = currentLeg(state);
      const random = seededRandom(state.seed + state.legIndex * 977);
      return {
        ...state,
        phase: "platform",
        transferMs,
        platform: makePlatform(leg, leg.stations[0], random)
      };
    }
    return { ...state, transferMs };
  }

  return state;
}

export function subwayAnnouncement(state) {
  if (state.phase === "platform") {
    const leg = currentLeg(state);
    return `${leg.line}호선을 타요!`;
  }
  if (state.phase === "ride") {
    const leg = currentLeg(state);
    const station = rideStation(state);
    const need = requiredDirection(state);
    if (need === null) {
      return `${station}역입니다. 여기서 내려요!`;
    }
    const next = leg.stations[state.ride.stopIndex + 1];
    return `${station}역 — 다음은 ${next} ${DIRECTION_ARROWS[need]}`;
  }
  if (state.phase === "transfer") {
    const leg = currentLeg(state);
    return `${leg.line}호선으로 갈아타요!`;
  }
  return `${state.place.label}에 도착했어요!`;
}
