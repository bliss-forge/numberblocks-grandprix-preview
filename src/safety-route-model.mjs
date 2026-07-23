import { normalizeDifficulty } from "./game-model.mjs";

const WIDTH = 12;
const HEIGHT = 8;
const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 })
});

const pointKey = ({ x, y }) => `${x},${y}`;
const samePoint = (left, right) =>
  left.x === right.x && left.y === right.y;

const walkable = Object.freeze(
  Array.from({ length: HEIGHT }, (_, y) =>
    Array.from({ length: WIDTH }, (_, x) => ({ x, y }))
  )
    .flat()
    .filter(({ x, y }) =>
      [2, 6, 9].includes(x) || [1, 4, 6].includes(y)
    )
);

const friends = Object.freeze([
  Object.freeze({ number: 2, x: 2, y: 5, place: "daycare" }),
  Object.freeze({ number: 3, x: 2, y: 1, place: "shops" }),
  Object.freeze({ number: 4, x: 5, y: 1, place: "roadside" }),
  Object.freeze({ number: 5, x: 9, y: 2, place: "park" }),
  Object.freeze({ number: 6, x: 9, y: 4, place: "bus-stop" }),
  Object.freeze({ number: 7, x: 9, y: 6, place: "library" }),
  Object.freeze({ number: 8, x: 6, y: 6, place: "construction" }),
  Object.freeze({ number: 9, x: 6, y: 4, place: "crossing" }),
  Object.freeze({ number: 10, x: 9, y: 1, place: "school" })
]);

const places = Object.freeze([
  Object.freeze({ type: "home", x: 0, y: 7, label: "우리 집" }),
  Object.freeze({ type: "daycare", x: 0, y: 0, label: "어린이집" }),
  Object.freeze({ type: "shops", x: 4, y: 0, label: "상가" }),
  Object.freeze({ type: "park", x: 10, y: 2, label: "공원" }),
  Object.freeze({ type: "bus-stop", x: 10, y: 4, label: "정류장" }),
  Object.freeze({ type: "library", x: 10, y: 7, label: "도서관" }),
  Object.freeze({ type: "school", x: 10, y: 0, label: "학교" })
]);

const steadyHazards = Object.freeze([
  Object.freeze({ type: "manhole", x: 4, y: 4 }),
  Object.freeze({ type: "construction", x: 7, y: 6 }),
  Object.freeze({ type: "scooter", x: 8, y: 1 })
]);

const challengeMovers = Object.freeze([
  Object.freeze({
    type: "bicycle",
    path: Object.freeze([
      Object.freeze({ x: 7, y: 4 }),
      Object.freeze({ x: 8, y: 4 })
    ])
  }),
  Object.freeze({
    type: "car",
    path: Object.freeze([
      Object.freeze({ x: 3, y: 1 }),
      Object.freeze({ x: 4, y: 1 })
    ])
  })
]);

function routeMap(difficulty, { hazards = [], movers = [] } = {}) {
  return Object.freeze({
    difficulty,
    width: WIDTH,
    height: HEIGHT,
    start: Object.freeze({ x: 1, y: 6 }),
    goal: Object.freeze({ x: 10, y: 1 }),
    signalGate: Object.freeze({ x: 2, y: 4 }),
    walkable,
    friends,
    places,
    hazards,
    movers
  });
}

export const SAFETY_ROUTE_MAPS = Object.freeze({
  easy: routeMap("easy"),
  steady: routeMap("steady", { hazards: steadyHazards }),
  challenge: routeMap("challenge", {
    hazards: steadyHazards,
    movers: challengeMovers
  })
});

function cloneMover(mover, pathIndex = 0) {
  return { type: mover.type, pathIndex };
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
    signal: "red",
    tick: 0,
    movers: map.movers.map(mover => cloneMover(mover))
  };
}

function currentMoverPosition(map, mover) {
  const definition = map.movers.find(item => item.type === mover.type);
  return definition?.path[mover.pathIndex] ?? null;
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

  if (
    state.signal === "red" &&
    samePoint(state.map.signalGate, candidate)
  ) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: "red-light" }
    );
  }

  const mover = state.movers.find(item => {
    const position = currentMoverPosition(state.map, item);
    return position && samePoint(position, candidate);
  });
  if (mover) {
    return transition(
      state,
      { ...state.position },
      { type: "blocked", reason: mover.type }
    );
  }

  const friend = state.map.friends.find(item => samePoint(item, candidate));
  if (friend?.number === state.nextFriend) {
    return transition(
      state,
      candidate,
      { type: "friend", number: friend.number },
      {
        nextFriend: state.nextFriend + 1,
        collected: [...state.collected, friend.number]
      }
    );
  }
  if (friend && friend.number > state.nextFriend) {
    return transition(
      state,
      candidate,
      { type: "wrong-friend", number: friend.number }
    );
  }

  if (samePoint(state.map.goal, candidate)) {
    return transition(
      state,
      candidate,
      state.nextFriend > 10
        ? { type: "complete" }
        : { type: "need-friends", nextFriend: state.nextFriend }
    );
  }

  return transition(state, candidate, { type: "moved" });
}

export function advanceSafetyWorld(state) {
  const tick = state.tick + 1;
  const signal =
    tick % 3 === 0
      ? state.signal === "red" ? "green" : "red"
      : state.signal;
  const movers = state.movers.map(mover => {
    const definition = state.map.movers.find(
      item => item.type === mover.type
    );
    if (!definition || definition.path.length === 0) return { ...mover };
    const nextIndex = (mover.pathIndex + 1) % definition.path.length;
    const nextPosition = definition.path[nextIndex];
    return samePoint(nextPosition, state.position)
      ? { ...mover }
      : cloneMover(mover, nextIndex);
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

function reachablePoints(map) {
  const roads = new Set(map.walkable.map(pointKey));
  const blockers = new Set(map.hazards.map(pointKey));
  const visited = new Set();
  const queue = [{ ...map.start }];

  while (queue.length > 0) {
    const current = queue.shift();
    const currentKey = pointKey(current);
    if (visited.has(currentKey)) continue;
    if (!roads.has(currentKey) || blockers.has(currentKey)) continue;
    visited.add(currentKey);
    Object.values(DIRECTIONS).forEach(offset => {
      const next = { x: current.x + offset.x, y: current.y + offset.y };
      if (inBounds(map, next) && !visited.has(pointKey(next))) {
        queue.push(next);
      }
    });
  }
  return visited;
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

  const roadKeys = new Set(map.walkable.map(pointKey));
  const occupied = [
    map.start,
    map.goal,
    map.signalGate,
    ...map.friends,
    ...map.hazards,
    ...map.movers.flatMap(mover => mover.path)
  ];
  occupied.forEach(point => {
    if (!inBounds(map, point)) errors.push(`out of bounds: ${pointKey(point)}`);
    if (!roadKeys.has(pointKey(point))) {
      errors.push(`not walkable: ${pointKey(point)}`);
    }
  });

  const reachable = reachablePoints(map);
  [...map.friends, map.goal].forEach(point => {
    if (!reachable.has(pointKey(point))) {
      errors.push(`unreachable: ${pointKey(point)}`);
    }
  });

  return { valid: errors.length === 0, errors };
}

