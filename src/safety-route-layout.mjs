const WIDTH = 32;
const HEIGHT = 16;
const ROAD = Object.freeze({ x: 14, width: 4 });
const ZONES = Object.freeze({
  left: Object.freeze({ x: 0, width: 14 }),
  road: Object.freeze({ ...ROAD }),
  right: Object.freeze({ x: 18, width: 14 })
});
const CROSSING_ROWS = Object.freeze([3, 10]);
const SHARED_SIGNAL_ID = "neighborhood-pedestrian-signal";
const DIFFICULTY_CONTENT = Object.freeze({
  easy: Object.freeze({
    hazards: Object.freeze(["manhole"]),
    patrols: Object.freeze(["scooter"])
  }),
  steady: Object.freeze({
    hazards: Object.freeze(["manhole", "construction"]),
    patrols: Object.freeze(["scooter"])
  }),
  challenge: Object.freeze({
    hazards: Object.freeze(["manhole", "manhole", "construction"]),
    patrols: Object.freeze(["scooter", "bicycle"])
  })
});

const FRIEND_CANDIDATES = Object.freeze({
  2: Object.freeze([{ x: 3, y: 5 }, { x: 10, y: 5 }]),
  3: Object.freeze([{ x: 3, y: 6 }, { x: 10, y: 6 }]),
  4: Object.freeze([{ x: 3, y: 7 }, { x: 10, y: 7 }]),
  5: Object.freeze([{ x: 3, y: 8 }, { x: 10, y: 8 }]),
  6: Object.freeze([{ x: 21, y: 5 }, { x: 28, y: 5 }]),
  7: Object.freeze([{ x: 21, y: 6 }, { x: 28, y: 6 }]),
  8: Object.freeze([{ x: 21, y: 7 }, { x: 28, y: 7 }]),
  9: Object.freeze([{ x: 21, y: 8 }, { x: 28, y: 8 }]),
  10: Object.freeze([{ x: 21, y: 9 }, { x: 28, y: 9 }])
});

const HAZARD_CANDIDATES = Object.freeze({
  manhole: Object.freeze([
    { x: 5, y: 3 }, { x: 7, y: 4 }, { x: 23, y: 3 }, { x: 25, y: 4 }
  ]),
  construction: Object.freeze([
    { x: 3, y: 9 }, { x: 10, y: 9 }, { x: 21, y: 9 }, { x: 28, y: 9 }
  ])
});

const PATROL_CANDIDATES = Object.freeze({
  scooter: Object.freeze([
    { x: 12, y: 3 }, { x: 12, y: 10 }, { x: 19, y: 4 }, { x: 19, y: 11 }
  ]),
  bicycle: Object.freeze([
    { x: 11, y: 4 }, { x: 20, y: 3 }, { x: 20, y: 10 }, { x: 27, y: 11 }
  ])
});

const DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 })
]);

const pointKey = ({ x, y }) => `${x},${y}`;
const inBounds = point =>
  Boolean(point) && Number.isInteger(point.x) && Number.isInteger(point.y) &&
  point.x >= 0 && point.x < WIDTH && point.y >= 0 && point.y < HEIGHT;
const rectangleCells = (x, y, width, height) =>
  Array.from({ length: height }, (_, row) =>
    Array.from({ length: width }, (_, column) => ({
      x: x + column,
      y: y + row
    }))
  ).flat();
const uniquePoints = points => {
  const result = new Map();
  points.forEach(point => result.set(pointKey(point), { x: point.x, y: point.y }));
  return [...result.values()];
};

function normalizeDifficulty(difficulty) {
  return Object.hasOwn(DIFFICULTY_CONTENT, difficulty) ? difficulty : "steady";
}

function normalizeSeed(seed) {
  return (Number(seed) || 0) >>> 0;
}

function seededRandom(seed) {
  let value = normalizeSeed(seed);
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function selectCandidates(candidates, count, random, forbidden) {
  const available = candidates.filter(item => !forbidden.has(pointKey(item)));
  for (let index = available.length - 1; index > 0; index -= 1) {
    const choice = Math.floor(random() * (index + 1));
    [available[index], available[choice]] = [available[choice], available[index]];
  }
  return available.slice(0, count);
}

function fixedGeometry() {
  const sidewalkBands = [
    { id: "left-north-sidewalk", zone: "left", x: 0, y: CROSSING_ROWS[0], width: 14, height: 2 },
    { id: "left-south-sidewalk", zone: "left", x: 0, y: CROSSING_ROWS[1], width: 14, height: 2 },
    { id: "right-north-sidewalk", zone: "right", x: 18, y: CROSSING_ROWS[0], width: 14, height: 2 },
    { id: "right-south-sidewalk", zone: "right", x: 18, y: CROSSING_ROWS[1], width: 14, height: 2 }
  ];
  const alleys = [
    { id: "left-west-alley", zone: "left", x: 3, y: 3, width: 1, height: 9 },
    { id: "left-east-alley", zone: "left", x: 10, y: 3, width: 1, height: 9 },
    { id: "right-west-alley", zone: "right", x: 21, y: 3, width: 1, height: 9 },
    { id: "right-east-alley", zone: "right", x: 28, y: 3, width: 1, height: 9 }
  ];
  const crossings = CROSSING_ROWS.map((y, index) => ({
    id: `crossing-${index + 1}`,
    signalId: SHARED_SIGNAL_ID,
    cells: rectangleCells(ROAD.x, y, ROAD.width, 2)
  }));
  const roadCells = rectangleCells(ROAD.x, 0, ROAD.width, HEIGHT);
  const lanes = [
    {
      id: "northbound-lane",
      direction: "north",
      x: 14,
      y: 0,
      width: 2,
      height: HEIGHT,
      cells: rectangleCells(14, 0, 2, HEIGHT)
    },
    {
      id: "southbound-lane",
      direction: "south",
      x: 16,
      y: 0,
      width: 2,
      height: HEIGHT,
      cells: rectangleCells(16, 0, 2, HEIGHT)
    }
  ];
  const pedestrianCells = uniquePoints([
    ...sidewalkBands.flatMap(band => rectangleCells(
      band.x, band.y, band.width, band.height
    )),
    ...alleys.flatMap(alley => rectangleCells(
      alley.x, alley.y, alley.width, alley.height
    )),
    ...crossings.flatMap(crossing => crossing.cells)
  ]);
  return { sidewalkBands, alleys, crossings, roadCells, lanes, pedestrianCells };
}

function assembleCandidate(difficulty, random, layoutSource = "generated", seed = 0) {
  const normalized = normalizeDifficulty(difficulty);
  const geometry = fixedGeometry();
  const start = { x: 0, y: 3 };
  const goal = { x: 31, y: 10 };
  const entrances = [
    { id: "left-home-entrance", x: 0, y: 10 },
    { id: "right-school-entrance", x: 31, y: 3 }
  ];
  const forbidden = new Set([
    pointKey(start),
    pointKey(goal),
    ...entrances.map(pointKey),
    ...geometry.crossings.flatMap(crossing => crossing.cells).map(pointKey)
  ]);
  const friends = Object.entries(FRIEND_CANDIDATES).map(([number, slots]) => {
    const friend = selectCandidates(slots, 1, random, forbidden)[0];
    forbidden.add(pointKey(friend));
    return {
      id: `friend-${number}`,
      number: Number(number),
      x: friend.x,
      y: friend.y
    };
  });
  const content = DIFFICULTY_CONTENT[normalized];
  const hazards = content.hazards.map((type, index) => {
    const hazard = selectCandidates(HAZARD_CANDIDATES[type], 1, random, forbidden)[0];
    forbidden.add(pointKey(hazard));
    return { ...hazard, id: `hazard-${index + 1}`, type };
  });
  const patrols = content.patrols.map((type, index) => {
    const patrol = selectCandidates(PATROL_CANDIDATES[type], 1, random, forbidden)[0];
    forbidden.add(pointKey(patrol));
    return { ...patrol, id: `patrol-${index + 1}`, type, moving: true };
  });

  return {
    difficulty: normalized,
    layoutSource,
    seed,
    width: WIDTH,
    height: HEIGHT,
    zones: {
      left: { ...ZONES.left },
      road: { ...ZONES.road },
      right: { ...ZONES.right }
    },
    ...geometry,
    start,
    goal,
    signalGate: { x: ROAD.x, y: CROSSING_ROWS[0], signalId: SHARED_SIGNAL_ID },
    signals: [{
      id: SHARED_SIGNAL_ID,
      type: "pedestrian",
      crossingIds: geometry.crossings.map(crossing => crossing.id)
    }],
    entrances,
    friends,
    hazards,
    patrols
  };
}

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}

function freezeMap(map) {
  return deepFreeze(map);
}

const SAFE_LAYOUT_FALLBACKS = Object.freeze(Object.fromEntries(
  Object.keys(DIFFICULTY_CONTENT).map((difficulty, index) => [
    difficulty,
    freezeMap(assembleCandidate(
      difficulty,
      seededRandom(index + 1),
      "fallback",
      index + 1
    ))
  ])
));

function hasPath(map, from, to) {
  if (!from || !to) return false;
  const walkable = new Set((map.pedestrianCells ?? []).map(pointKey));
  const blocked = new Set([
    ...(map.hazards ?? []),
    ...(map.patrols ?? [])
  ].map(pointKey));
  const origin = pointKey(from);
  const destination = pointKey(to);
  if (!walkable.has(origin) || !walkable.has(destination) || blocked.has(origin)) {
    return false;
  }
  const queue = [{ x: from.x, y: from.y }];
  const visited = new Set([origin]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (pointKey(current) === destination) return true;
    DIRECTIONS.forEach(direction => {
      const next = { x: current.x + direction.x, y: current.y + direction.y };
      const key = pointKey(next);
      if (walkable.has(key) && !blocked.has(key) && !visited.has(key)) {
        visited.add(key);
        queue.push(next);
      }
    });
  }
  return false;
}

function checkPointCollection(errors, map, label, points, walkable) {
  if (!Array.isArray(points)) {
    errors.push(`${label} must be an array`);
    return;
  }
  points.forEach(point => {
    if (!point) errors.push(`${label} is required`);
    else if (!inBounds(point)) errors.push(`${label} out of bounds: ${pointKey(point)}`);
    else if (!walkable.has(pointKey(point))) {
      errors.push(`${label} not pedestrian: ${pointKey(point)}`);
    }
  });
}

export function validateCandidateLayout(map) {
  const errors = [];
  if (!map || map.width !== WIDTH || map.height !== HEIGHT) {
    return { valid: false, errors: ["map must be 32×16"] };
  }

  const expectedZones = {
    left: { x: 0, width: 14 },
    road: { x: 14, width: 4 },
    right: { x: 18, width: 14 }
  };
  if (JSON.stringify(map.zones) !== JSON.stringify(expectedZones)) {
    errors.push("zones must be 14:4:14");
  }

  const walkable = new Set((map.pedestrianCells ?? []).map(pointKey));
  if (walkable.size === 0) errors.push("pedestrian cells are required");
  (map.pedestrianCells ?? []).forEach(point => {
    if (!inBounds(point)) errors.push(`pedestrian out of bounds: ${pointKey(point)}`);
  });

  const alleys = map.alleys ?? [];
  if (alleys.length !== 4 || alleys.some(alley => alley.width !== 1)) {
    errors.push("four one-cell alleys are required");
  }
  alleys.forEach(alley => {
    if (!inBounds(alley) || !inBounds({ x: alley.x, y: alley.y + alley.height - 1 })) {
      errors.push(`alley out of bounds: ${alley.id ?? pointKey(alley)}`);
    }
    if (!((alley.zone === "left" && alley.x < ROAD.x) ||
      (alley.zone === "right" && alley.x >= 18))) {
      errors.push(`alley outside neighborhood: ${alley.id ?? pointKey(alley)}`);
    }
  });

  const sidewalkBands = map.sidewalkBands ?? [];
  if (sidewalkBands.length !== 4 || sidewalkBands.some(band => band.height !== 2)) {
    errors.push("four two-cell sidewalk bands are required");
  }
  sidewalkBands.forEach(band => {
    if (!inBounds(band) || !inBounds({ x: band.x + band.width - 1, y: band.y + 1 })) {
      errors.push(`sidewalk out of bounds: ${band.id ?? pointKey(band)}`);
    }
  });

  const crossingCells = new Set();
  const crossings = map.crossings ?? [];
  if (crossings.length !== 2) errors.push("two crossings are required");
  crossings.forEach(crossing => {
    const cells = crossing.cells ?? [];
    const columns = new Set(cells.map(cell => cell.x));
    const rows = new Set(cells.map(cell => cell.y));
    if (columns.size !== 4 || rows.size !== 2 || cells.length !== 8) {
      errors.push(`crossing geometry invalid: ${crossing.id ?? "unknown"}`);
    }
    cells.forEach(cell => {
      if (!inBounds(cell) || cell.x < ROAD.x || cell.x >= ROAD.x + ROAD.width) {
        errors.push(`crossing out of road: ${pointKey(cell)}`);
      }
      crossingCells.add(pointKey(cell));
    });
  });

  const signals = map.signals ?? [];
  const sharedSignal = signals.length === 1 ? signals[0] : null;
  if (!sharedSignal || sharedSignal.type !== "pedestrian" ||
    !Array.isArray(sharedSignal.crossingIds) ||
    JSON.stringify(sharedSignal.crossingIds) !== JSON.stringify(crossings.map(item => item.id)) ||
    crossings.some(crossing => crossing.signalId !== sharedSignal.id) ||
    !map.signalGate || map.signalGate.signalId !== sharedSignal.id ||
    !crossingCells.has(pointKey(map.signalGate))) {
    errors.push("crossings must share one pedestrian signal and signalGate");
  }

  const suppliedRoadCells = Array.isArray(map.roadCells) ? map.roadCells : [];
  const expectedRoadCells = new Set(rectangleCells(ROAD.x, 0, ROAD.width, HEIGHT).map(pointKey));
  const roadCells = new Set(suppliedRoadCells.filter(inBounds).map(pointKey));
  if (suppliedRoadCells.length !== ROAD.width * HEIGHT ||
    suppliedRoadCells.some(point => !inBounds(point) ||
      point.x < ROAD.x || point.x >= ROAD.x + ROAD.width) ||
    roadCells.size !== expectedRoadCells.size ||
    [...expectedRoadCells].some(key => !roadCells.has(key))) {
    errors.push("road cells must exactly cover all center road cells");
  }
  const lanes = map.lanes ?? [];
  const expectedLanes = [
    { id: "northbound-lane", direction: "north", x: 14 },
    { id: "southbound-lane", direction: "south", x: 16 }
  ];
  if (lanes.length !== 2 || lanes.some((lane, index) => !lane ||
    lane.id !== expectedLanes[index]?.id ||
    lane.direction !== expectedLanes[index]?.direction ||
    lane.x !== expectedLanes[index]?.x || lane.y !== 0 ||
    lane.width !== 2 || lane.height !== HEIGHT
  )) {
    errors.push("two directional road lanes are required");
  }
  lanes.forEach((lane, index) => {
    const expectedCells = new Set(rectangleCells(
      expectedLanes[index]?.x ?? ROAD.x,
      0,
      2,
      HEIGHT
    ).map(pointKey));
    if (!Array.isArray(lane?.cells)) {
      errors.push("lane cells must exactly cover its two road columns");
      return;
    }
    lane.cells.forEach(cell => {
      if (!inBounds(cell) || cell.x < ROAD.x || cell.x >= ROAD.x + ROAD.width) {
        errors.push(`lane cell outside road: ${cell ? pointKey(cell) : "unknown"}`);
      }
    });
    const laneCells = new Set(lane.cells.filter(inBounds).map(pointKey));
    if (lane.cells.length !== expectedCells.size ||
      laneCells.size !== expectedCells.size ||
      [...expectedCells].some(key => !laneCells.has(key))) {
      errors.push("lane cells must exactly cover its two road columns");
    }
  });

  const friendNumbers = (map.friends ?? []).map(friend => friend.number);
  if (JSON.stringify(friendNumbers) !== JSON.stringify([2, 3, 4, 5, 6, 7, 8, 9, 10])) {
    errors.push("friends must be ordered 2 through 10");
  }
  (map.friends ?? []).forEach(friend => {
    const isLeftFriend = friend.number >= 2 && friend.number <= 5 && friend.x < ROAD.x;
    const isRightFriend = friend.number >= 6 && friend.number <= 10 && friend.x >= 18;
    if (!isLeftFriend && !isRightFriend) errors.push(`friend in wrong neighborhood: ${friend.number}`);
  });

  checkPointCollection(errors, map, "start", [map.start], walkable);
  checkPointCollection(errors, map, "goal", [map.goal], walkable);
  checkPointCollection(errors, map, "signalGate", [map.signalGate], walkable);
  checkPointCollection(errors, map, "entrance", map.entrances, walkable);
  checkPointCollection(errors, map, "friend", map.friends, walkable);
  checkPointCollection(errors, map, "hazard", map.hazards, walkable);
  checkPointCollection(errors, map, "patrol", map.patrols, walkable);

  const expectedContent = DIFFICULTY_CONTENT[map.difficulty];
  if (!expectedContent) errors.push("invalid difficulty");
  else if (
    JSON.stringify((map.hazards ?? []).map(item => item.type).sort()) !==
      JSON.stringify([...expectedContent.hazards].sort()) ||
    JSON.stringify((map.patrols ?? []).map(item => item.type).sort()) !==
      JSON.stringify([...expectedContent.patrols].sort()) ||
    (map.patrols ?? []).some(item => item.moving !== true)
  ) {
    errors.push("difficulty safety content is invalid");
  }

  (map.hazards ?? []).filter(item => item.type === "construction").forEach(item => {
    const onAlley = alleys.some(alley => item.x === alley.x &&
      item.y >= alley.y && item.y < alley.y + alley.height);
    if (!onAlley) errors.push(`construction must be on an alley: ${pointKey(item)}`);
  });

  const protectedCells = new Set(crossingCells);
  [map.start, map.goal, ...(map.entrances ?? []), ...(map.friends ?? [])]
    .filter(Boolean)
    .forEach(item => {
      const key = pointKey(item);
      if (protectedCells.has(key)) errors.push(`protected locations overlap: ${key}`);
      protectedCells.add(key);
    });
  [...(map.hazards ?? []), ...(map.patrols ?? [])].forEach(item => {
    const key = pointKey(item);
    if (protectedCells.has(key)) {
      errors.push(`hazard or patrol overlaps protected cell: ${key}`);
    }
    protectedCells.add(key);
  });

  let previous = map.start;
  [...(map.friends ?? []), map.goal].filter(Boolean).forEach(target => {
    if (!hasPath(map, previous, target)) {
      errors.push(`unreachable: ${pointKey(target)}`);
    }
    previous = target;
  });

  return { valid: errors.length === 0, errors };
}

export function createSafetyRouteMap(
  difficulty,
  { seed = 0, maxAttempts = 20 } = {}
) {
  const normalized = normalizeDifficulty(difficulty);
  const normalizedSeed = normalizeSeed(seed);
  const random = seededRandom(normalizedSeed);
  const attemptLimit = Math.min(20, Math.max(0, Math.floor(Number(maxAttempts) || 0)));
  for (let attempt = 0; attempt < attemptLimit; attempt += 1) {
    const candidate = assembleCandidate(normalized, random, "generated", normalizedSeed);
    if (validateCandidateLayout(candidate).valid) return freezeMap(candidate);
  }
  return freezeMap({ ...SAFE_LAYOUT_FALLBACKS[normalized], seed: normalizedSeed });
}
