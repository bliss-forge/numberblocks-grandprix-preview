import { normalizeDifficulty } from "./game-model.mjs";

const WIDTH = 18;
const HEIGHT = 12;
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
const samePoint = (left, right) =>
  left.x === right.x && left.y === right.y;

function line(from, to) {
  const points = [];
  const dx = Math.sign(to.x - from.x);
  const dy = Math.sign(to.y - from.y);
  let point = { ...from };
  while (point.x !== to.x || point.y !== to.y) {
    points.push(point);
    point = { x: point.x + dx, y: point.y + dy };
  }
  return [...points, point];
}

function uniquePoints(points) {
  const unique = new Map();
  points.forEach(point => unique.set(pointKey(point), Object.freeze({ ...point })));
  return Object.freeze([...unique.values()]);
}

const pedestrianCells = uniquePoints([
  ...line({ x: 1, y: 10 }, { x: 16, y: 10 }),
  ...line({ x: 2, y: 2 }, { x: 2, y: 10 }),
  ...line({ x: 2, y: 2 }, { x: 15, y: 2 }),
  ...line({ x: 8, y: 2 }, { x: 8, y: 10 }),
  ...line({ x: 14, y: 2 }, { x: 14, y: 10 }),
  ...line({ x: 2, y: 6 }, { x: 14, y: 6 })
]);

const friends = Object.freeze([
  Object.freeze({ number: 2, x: 2, y: 8, place: "daycare" }),
  Object.freeze({ number: 3, x: 5, y: 10, place: "shops" }),
  Object.freeze({ number: 4, x: 8, y: 8, place: "roadside" }),
  Object.freeze({ number: 5, x: 12, y: 10, place: "park" }),
  Object.freeze({ number: 6, x: 14, y: 9, place: "bus-stop" }),
  Object.freeze({ number: 7, x: 14, y: 6, place: "library" }),
  Object.freeze({ number: 8, x: 11, y: 6, place: "construction" }),
  Object.freeze({ number: 9, x: 8, y: 4, place: "crossing" }),
  Object.freeze({ number: 10, x: 14, y: 2, place: "school" })
]);

const places = Object.freeze([
  Object.freeze({ type: "home", x: 0, y: 11, label: "우리 집" }),
  Object.freeze({ type: "daycare", x: 0, y: 8, label: "어린이집" }),
  Object.freeze({ type: "shops", x: 5, y: 11, label: "상가" }),
  Object.freeze({ type: "park", x: 12, y: 11, label: "공원" }),
  Object.freeze({ type: "bus-stop", x: 16, y: 9, label: "정류장" }),
  Object.freeze({ type: "library", x: 16, y: 6, label: "도서관" }),
  Object.freeze({ type: "school", x: 16, y: 1, label: "학교" })
]);

const steadyHazards = Object.freeze([
  Object.freeze({ type: "manhole", x: 5, y: 6 }),
  Object.freeze({ type: "construction", x: 10, y: 10 }),
  Object.freeze({ type: "scooter", x: 8, y: 7 })
]);

const crossings = Object.freeze([
  Object.freeze({
    id: "west-crossing",
    cells: Object.freeze([
      Object.freeze({ x: 8, y: 4 })
    ])
  }),
  Object.freeze({
    id: "east-crossing",
    cells: Object.freeze([
      Object.freeze({ x: 14, y: 8 })
    ])
  })
]);

const entrances = Object.freeze([
  Object.freeze({ id: "shops-entrance", x: 6, y: 10 })
]);

const carPath = Object.freeze({
  id: "main-car-lane",
  type: "car",
  stopIndex: 4,
  points: Object.freeze(line({ x: 3, y: 4 }, { x: 13, y: 4 }))
});

const bicyclePath = Object.freeze({
  id: "cycle-lane",
  type: "bicycle",
  stopIndex: 4,
  points: Object.freeze(line({ x: 9, y: 8 }, { x: 16, y: 8 }))
});

const easyTraffic = Object.freeze([carPath]);
const fullTraffic = Object.freeze([carPath, bicyclePath]);

function legacyMovers(trafficPaths) {
  return Object.freeze(trafficPaths.map(path => Object.freeze({
    id: path.id,
    type: "car",
    path: path.points
  })).map((mover, index) =>
    Object.freeze({ ...mover, type: trafficPaths[index].type })
  ));
}

function routeMap(
  difficulty,
  { hazards = [], trafficPaths = easyTraffic } = {}
) {
  return Object.freeze({
    difficulty,
    width: WIDTH,
    height: HEIGHT,
    start: Object.freeze({ x: 1, y: 10 }),
    goal: Object.freeze({ x: 15, y: 2 }),
    signalGate: Object.freeze({ x: 8, y: 4 }),
    pedestrianCells,
    walkable: pedestrianCells,
    crossings,
    entrances,
    trafficPaths,
    friends,
    places,
    hazards,
    movers: legacyMovers(trafficPaths)
  });
}

export const SAFETY_ROUTE_MAPS = Object.freeze({
  easy: routeMap("easy"),
  steady: routeMap("steady", {
    hazards: steadyHazards,
    trafficPaths: fullTraffic
  }),
  challenge: routeMap("challenge", {
    hazards: steadyHazards,
    trafficPaths: fullTraffic
  })
});

function cloneMover(mover, pathIndex = 0, stopped = false) {
  return { id: mover.id, type: mover.type, pathIndex, stopped };
}

export function createSafetyRouteState(difficulty) {
  const normalized = normalizeDifficulty(difficulty);
  const map = SAFETY_ROUTE_MAPS[normalized];
  return {
    difficulty: normalized,
    map,
    position: { ...map.start },
    nextFriend: 2,
    collected: [1],
    signal: { phase: "vehicle-go", elapsedMs: 0 },
    crossingId: null,
    checkedEntrance: null,
    tick: 0,
    movers: map.trafficPaths.map(mover => cloneMover(mover))
  };
}

function crossingForPoint(map, point) {
  return map.crossings.find(crossing =>
    crossing.cells.some(cell => samePoint(cell, point))
  ) ?? null;
}

function transition(state, position, event, extra = {}) {
  return {
    state: { ...state, position, ...extra },
    event
  };
}

export function attemptSafetyMove(state, direction) {
  const offset = DIRECTIONS[direction];
  if (!offset) return { state, event: { type: "ignored" } };

  const candidate = {
    x: state.position.x + offset.x,
    y: state.position.y + offset.y
  };
  const road = new Set(state.map.walkable.map(pointKey));
  if (!road.has(pointKey(candidate))) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: "wall" }
    );
  }

  const hazard = state.map.hazards.find(item => samePoint(item, candidate));
  if (hazard) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: hazard.type }
    );
  }

  const entrance = state.map.entrances.find(item =>
    samePoint(item, candidate)
  );
  if (entrance && state.checkedEntrance !== entrance.id) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: "look-first" },
      { checkedEntrance: entrance.id }
    );
  }

  const crossing = crossingForPoint(state.map, candidate);
  if (crossing && !state.crossingId) {
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

  const moveExtra = {
    checkedEntrance: null,
    crossingId: crossing?.id ?? null
  };
  const friend = state.map.friends.find(item => samePoint(item, candidate));
  if (friend?.number === state.nextFriend) {
    return transition(
      state,
      candidate,
      { type: "friend", number: friend.number },
      {
        ...moveExtra,
        nextFriend: state.nextFriend + 1,
        collected: [...state.collected, friend.number]
      }
    );
  }
  if (friend && friend.number > state.nextFriend) {
    return transition(
      state,
      candidate,
      { type: "wrong-friend", number: friend.number },
      moveExtra
    );
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
    const definition = state.map.trafficPaths.find(
      item => item.id === mover.id
    );
    if (!definition || definition.points.length === 0) return { ...mover };
    if (signal.phase !== "vehicle-go") {
      return cloneMover(definition, definition.stopIndex, true);
    }
    const nextIndex = (mover.pathIndex + 1) % definition.points.length;
    return cloneMover(definition, nextIndex, false);
  });
  return { ...state, tick, signal, movers };
}

function inBounds(map, point) {
  return (
    point.x >= 0 &&
    point.y >= 0 &&
    point.x < map.width &&
    point.y < map.height
  );
}

export function findSafetyPath(map, start, goal) {
  const roads = new Set(map.pedestrianCells.map(pointKey));
  const blockers = new Set(map.hazards.map(pointKey));
  const previous = new Map([[pointKey(start), null]]);
  const queue = [{ ...start }];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = pointKey(current);
    if (samePoint(current, goal)) break;
    Object.values(DIRECTIONS).forEach(offset => {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      const nextKey = pointKey(next);
      if (
        inBounds(map, next) &&
        roads.has(nextKey) &&
        !blockers.has(nextKey) &&
        !previous.has(nextKey)
      ) {
        previous.set(nextKey, current);
        queue.push(next);
      }
    });
  }

  if (!previous.has(pointKey(goal))) return [];
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

  const numbers = map.friends
    .map(friend => friend.number)
    .sort((left, right) => left - right);
  if (JSON.stringify(numbers) !== JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10])) {
    errors.push("friends must contain 2 through 10 exactly once");
  }

  const pedestrianKeys = new Set(map.pedestrianCells.map(pointKey));
  const crossingKeys = new Set(
    map.crossings.flatMap(crossing => crossing.cells).map(pointKey)
  );
  const pedestrianOccupied = [
    map.start,
    map.goal,
    map.signalGate,
    ...map.friends,
    ...map.hazards,
    ...map.entrances
  ];
  pedestrianOccupied.forEach(point => {
    if (!inBounds(map, point)) errors.push(`out of bounds: ${pointKey(point)}`);
    if (!pedestrianKeys.has(pointKey(point))) {
      errors.push(`not pedestrian: ${pointKey(point)}`);
    }
  });

  map.trafficPaths.forEach(path => {
    path.points.forEach(point => {
      if (!inBounds(map, point)) {
        errors.push(`traffic out of bounds: ${pointKey(point)}`);
      }
      if (
        pedestrianKeys.has(pointKey(point)) &&
        !crossingKeys.has(pointKey(point))
      ) {
        errors.push(`traffic overlaps sidewalk: ${pointKey(point)}`);
      }
    });
  });

  let previousTarget = map.start;
  [...map.friends, map.goal].forEach(point => {
    if (findSafetyPath(map, previousTarget, point).length === 0) {
      errors.push(`unreachable: ${pointKey(point)}`);
    }
    previousTarget = point;
  });

  return { valid: errors.length === 0, errors };
}
