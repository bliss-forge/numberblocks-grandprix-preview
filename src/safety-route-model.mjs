import { normalizeDifficulty } from "./game-model.mjs";
import { createSafetyRouteMap } from "./safety-route-layout.mjs";
import {
  advancePatrolMover,
  createPatrolMover,
  moverPoint
} from "./safety-route-movers.mjs";

const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 })
});
const SIGNAL_PHASES = Object.freeze([
  Object.freeze({ phase: "vehicle-go", durationMs: 5000 }),
  Object.freeze({ phase: "vehicle-clearance", durationMs: 1000 }),
  Object.freeze({ phase: "pedestrian-go", durationMs: 7000 }),
  Object.freeze({ phase: "pedestrian-clearance", durationMs: 1000 })
]);

const pointKey = ({ x, y }) => `${x},${y}`;
const samePoint = (left, right) => left.x === right.x && left.y === right.y;

function hazardCells(hazard) {
  return hazard.cells?.length ? hazard.cells : [hazard];
}

export const SAFETY_ROUTE_MAPS = Object.freeze({
  easy: createSafetyRouteMap("easy", { seed: 0 }),
  steady: createSafetyRouteMap("steady", { seed: 0 }),
  challenge: createSafetyRouteMap("challenge", { seed: 0 })
});

function cloneMover(definition, mover = {}) {
  return {
    id: definition.id,
    type: definition.type,
    pathIndex: mover.pathIndex ?? 0,
    direction: mover.direction ?? 1,
    elapsedMs: mover.elapsedMs ?? 0,
    pauseMs: mover.pauseMs ?? 0,
    stopped: mover.stopped ?? false
  };
}

export function createSafetyRouteState(difficulty, { seed = 0 } = {}) {
  const normalized = normalizeDifficulty(difficulty);
  const map = createSafetyRouteMap(normalized, { seed });
  return {
    difficulty: normalized,
    seed,
    map,
    position: { ...map.start },
    nextFriend: 2,
    collected: [1],
    signal: { phase: "vehicle-go", elapsedMs: 0 },
    crossingId: null,
    checkedEntrance: null,
    tick: 0,
    movers: map.trafficPaths.map(createPatrolMover)
  };
}

function crossingForPoint(map, point) {
  return map.crossings.find(crossing =>
    crossing.cells.some(cell => samePoint(cell, point))
  ) ?? null;
}

function transition(state, position, event, extra = {}) {
  return { state: { ...state, position, ...extra }, event };
}

export function attemptSafetyMove(state, direction) {
  const offset = DIRECTIONS[direction];
  if (!offset) return { state, event: { type: "ignored" } };

  const candidate = {
    x: state.position.x + offset.x,
    y: state.position.y + offset.y
  };
  const walkable = new Set(state.map.walkable.map(pointKey));
  if (!walkable.has(pointKey(candidate))) {
    return transition(state, { ...state.position }, { type: "blocked", reason: "wall" });
  }

  const hazard = state.map.hazards.find(item =>
    hazardCells(item).some(cell => samePoint(cell, candidate))
  );
  if (hazard) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: hazard.type }
    );
  }

  const rider = state.movers.find(mover =>
    (mover.type === "scooter" || mover.type === "bicycle") &&
    samePoint(moverPoint(state.map, mover), candidate)
  );
  if (rider) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: "moving-rider", moverType: rider.type }
    );
  }

  const entrance = state.map.entrances.find(item => samePoint(item, candidate));
  if (entrance && state.checkedEntrance !== entrance.id) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: "look-first" },
      { checkedEntrance: entrance.id }
    );
  }

  const crossing = crossingForPoint(state.map, candidate);
  if (crossing) {
    const firstRoadColumn = Math.min(...crossing.cells.map(cell => cell.x));
    if (state.position.x < firstRoadColumn && state.nextFriend <= 5) {
      return transition(
        state,
        { ...state.position },
        { type: "blocked", reason: "left-friends-first" }
      );
    }
    if (!state.crossingId) {
      if (state.signal.phase !== "pedestrian-go") {
        return transition(
          state,
          { ...state.position },
          { type: "blocked", reason: "red-light" }
        );
      }
      if (7000 - state.signal.elapsedMs <= 2000) {
        return transition(
          state,
          { ...state.position },
          { type: "blocked", reason: "green-ending" }
        );
      }
    }
  }

  const moveExtra = {
    checkedEntrance: null,
    crossingId: crossing?.id ?? null
  };
  const friend = state.map.friends.find(item => samePoint(item, candidate));
  if (friend?.number === state.nextFriend) {
    return transition(state, candidate, { type: "friend", number: friend.number }, {
      ...moveExtra,
      nextFriend: state.nextFriend + 1,
      collected: [...state.collected, friend.number]
    });
  }
  if (friend && friend.number > state.nextFriend) {
    return transition(state, candidate, { type: "wrong-friend", number: friend.number }, moveExtra);
  }

  if (samePoint(state.map.goal, candidate)) {
    return transition(
      state,
      candidate,
      state.nextFriend > 10
        ? { type: "complete" }
        : { type: "need-friends", nextFriend: state.nextFriend },
      moveExtra
    );
  }

  return transition(state, candidate, { type: "moved" }, moveExtra);
}

function advanceSignal(signal, elapsedMs) {
  let index = SIGNAL_PHASES.findIndex(item => item.phase === signal.phase);
  if (index < 0) index = 0;
  let elapsed = signal.elapsedMs + Math.max(0, elapsedMs);
  while (elapsed >= SIGNAL_PHASES[index].durationMs) {
    elapsed -= SIGNAL_PHASES[index].durationMs;
    index = (index + 1) % SIGNAL_PHASES.length;
  }
  return { phase: SIGNAL_PHASES[index].phase, elapsedMs: elapsed };
}

export function advanceSafetyWorld(state, elapsedMs = 100) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const tick = state.tick + elapsed;
  const signal = advanceSignal(state.signal, elapsed);
  const movers = state.movers.map(mover => {
    const definition = state.map.trafficPaths.find(item => item.id === mover.id);
    if (!definition || definition.points.length === 0) return { ...mover };
    if (definition.type === "scooter" || definition.type === "bicycle") {
      return advancePatrolMover(definition, mover, {
        elapsedMs: elapsed,
        player: state.position
      });
    }
    if (signal.phase !== "vehicle-go") {
      return cloneMover(definition, { ...mover, pathIndex: definition.stopIndex, stopped: true });
    }
    const direction = mover.direction === -1 ? -1 : 1;
    const pathIndex = (mover.pathIndex + direction + definition.points.length) % definition.points.length;
    return cloneMover(definition, { ...mover, pathIndex, direction, stopped: false });
  });
  return { ...state, tick, signal, movers };
}

function inBounds(map, point) {
  return point.x >= 0 && point.y >= 0 && point.x < map.width && point.y < map.height;
}

export function findSafetyPath(map, start, goal) {
  const walkable = new Set(map.pedestrianCells.map(pointKey));
  const blockers = new Set(map.hazards.flatMap(hazardCells).map(pointKey));
  const startKey = pointKey(start);
  const goalKey = pointKey(goal);
  if (
    !walkable.has(startKey) ||
    !walkable.has(goalKey) ||
    blockers.has(startKey) ||
    blockers.has(goalKey)
  ) {
    return [];
  }
  const previous = new Map([[startKey, null]]);
  const queue = [{ ...start }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (samePoint(current, goal)) break;
    Object.values(DIRECTIONS).forEach(offset => {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const nextKey = pointKey(next);
      if (
        inBounds(map, next) &&
        walkable.has(nextKey) &&
        !blockers.has(nextKey) &&
        !previous.has(nextKey)
      ) {
        previous.set(nextKey, current);
        queue.push(next);
      }
    });
  }

  if (!previous.has(goalKey)) return [];
  const path = [];
  for (let point = goal; point; point = previous.get(pointKey(point))) {
    path.push({ x: point.x, y: point.y });
  }
  return path.reverse();
}

export function validateSafetyRouteMap(map) {
  const errors = [];
  if (!map || !Number.isInteger(map.width) || !Number.isInteger(map.height)) {
    return { valid: false, errors: ["invalid dimensions"] };
  }

  const friends = map.friends ?? [];
  const hazards = map.hazards ?? [];
  const pedestrianCells = map.pedestrianCells ?? [];
  const crossings = map.crossings ?? [];
  const trafficPaths = map.trafficPaths ?? [];
  const numbers = friends.map(friend => friend.number).sort((left, right) => left - right);
  if (JSON.stringify(numbers) !== JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10])) {
    errors.push("friends must contain 2 through 10 exactly once");
  }

  const pedestrianKeys = new Set(pedestrianCells.map(pointKey));
  const crossingKeys = new Set(crossings.flatMap(crossing => crossing.cells).map(pointKey));
  const roadKeys = new Set((map.roadCells ?? []).map(pointKey));
  const hazardKeys = new Set(hazards.flatMap(hazardCells).map(pointKey));
  [map.start, ...friends, map.goal].filter(Boolean).forEach(point => {
    if (hazardKeys.has(pointKey(point))) {
      errors.push(`blocked route endpoint: ${pointKey(point)}`);
    }
  });
  const pedestrianOccupied = [
    map.start,
    map.goal,
    map.signalGate,
    ...friends,
    ...hazards.flatMap(hazardCells),
    ...(map.entrances ?? [])
  ].filter(Boolean);
  pedestrianOccupied.forEach(point => {
    if (!inBounds(map, point)) errors.push(`out of bounds: ${pointKey(point)}`);
    if (!pedestrianKeys.has(pointKey(point))) errors.push(`not pedestrian: ${pointKey(point)}`);
  });

  trafficPaths.forEach(path => {
    path.points.forEach(point => {
      if (!inBounds(map, point)) errors.push(`traffic out of bounds: ${pointKey(point)}`);
      const key = pointKey(point);
      if (path.type === "car") {
        if (!roadKeys.has(key)) errors.push(`car outside road: ${key}`);
        if (pedestrianKeys.has(key) && !crossingKeys.has(key)) {
          errors.push(`traffic overlaps sidewalk: ${key}`);
        }
      } else if (path.type === "scooter" || path.type === "bicycle") {
        if (!pedestrianKeys.has(key) || crossingKeys.has(key)) {
          errors.push(`patrol leaves safe sidewalk: ${key}`);
        }
      } else {
        errors.push(`unknown traffic type: ${path.type}`);
      }
    });
  });

  let previousTarget = map.start;
  [...friends, map.goal].filter(Boolean).forEach(point => {
    if (findSafetyPath(map, previousTarget, point).length === 0) {
      errors.push(`unreachable: ${pointKey(point)}`);
    }
    previousTarget = point;
  });

  return { valid: errors.length === 0, errors };
}
