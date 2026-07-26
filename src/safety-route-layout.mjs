const WIDTH = 32;
const HEIGHT = 16;
const ROAD = Object.freeze({ x: 14, width: 4 });
const ZONES = Object.freeze({
  left: Object.freeze({ x: 0, width: 14 }),
  road: Object.freeze({ ...ROAD }),
  right: Object.freeze({ x: 18, width: 14 })
});
const CROSSING_ROWS = Object.freeze([3, 10]);
const DIFFICULTY_COUNTS = Object.freeze({
  easy: Object.freeze({ hazards: 0, patrols: 0 }),
  steady: Object.freeze({ hazards: 2, patrols: 1 }),
  challenge: Object.freeze({ hazards: 4, patrols: 2 })
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

const HAZARD_CANDIDATES = Object.freeze([
  { type: "scooter", x: 5, y: 3 },
  { type: "construction", x: 7, y: 4 },
  { type: "puddle", x: 9, y: 10 },
  { type: "uneven-paving", x: 5, y: 11 },
  { type: "scooter", x: 23, y: 3 },
  { type: "construction", x: 25, y: 4 },
  { type: "puddle", x: 27, y: 10 },
  { type: "uneven-paving", x: 23, y: 11 }
]);

const PATROL_CANDIDATES = Object.freeze([
  { id: "patrol-left-north", type: "patrol", x: 12, y: 3 },
  { id: "patrol-left-south", type: "patrol", x: 12, y: 10 },
  { id: "patrol-right-north", type: "patrol", x: 19, y: 4 },
  { id: "patrol-right-south", type: "patrol", x: 19, y: 11 }
]);

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
  return Object.hasOwn(DIFFICULTY_COUNTS, difficulty) ? difficulty : "steady";
}

function seededRandom(seed) {
  let value = (Number(seed) || 0) >>> 0;
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

function assembleCandidate(difficulty, random, layoutSource = "generated") {
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
  const counts = DIFFICULTY_COUNTS[normalized];
  const hazards = selectCandidates(HAZARD_CANDIDATES, counts.hazards, random, forbidden)
    .map((hazard, index) => ({ ...hazard, id: `hazard-${index + 1}` }));
  hazards.forEach(hazard => forbidden.add(pointKey(hazard)));
  const patrols = selectCandidates(PATROL_CANDIDATES, counts.patrols, random, forbidden)
    .map(patrol => ({ ...patrol }));

  return {
    difficulty: normalized,
    layoutSource,
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
  Object.keys(DIFFICULTY_COUNTS).map((difficulty, index) => [
    difficulty,
    freezeMap(assembleCandidate(difficulty, seededRandom(index + 1), "fallback"))
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

  const roadCells = new Set((map.roadCells ?? []).map(pointKey));
  if (roadCells.size !== ROAD.width * HEIGHT ||
    [...roadCells].some(key => {
      const [x] = key.split(",").map(Number);
      return x < ROAD.x || x >= ROAD.x + ROAD.width;
    })) {
    errors.push("road must cover all four center columns");
  }
  const lanes = map.lanes ?? [];
  if (lanes.length !== 2 || lanes.some(lane =>
    lane.width !== 2 || !["north", "south"].includes(lane.direction)
  )) {
    errors.push("two directional road lanes are required");
  }

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
  checkPointCollection(errors, map, "entrance", map.entrances, walkable);
  checkPointCollection(errors, map, "friend", map.friends, walkable);
  checkPointCollection(errors, map, "hazard", map.hazards, walkable);
  checkPointCollection(errors, map, "patrol", map.patrols, walkable);

  const expectedCounts = DIFFICULTY_COUNTS[map.difficulty];
  if (!expectedCounts) errors.push("invalid difficulty");
  else if ((map.hazards ?? []).length !== expectedCounts.hazards ||
    (map.patrols ?? []).length !== expectedCounts.patrols) {
    errors.push("difficulty hazard and patrol counts are invalid");
  }

  const protectedCells = new Set([
    ...crossingCells,
    ...(map.entrances ?? []),
    ...(map.friends ?? []),
    map.start,
    map.goal
  ].filter(Boolean).map(pointKey));
  const occupiedSafetyCells = new Set();
  [...(map.hazards ?? []), ...(map.patrols ?? [])].forEach(item => {
    const key = pointKey(item);
    if (protectedCells.has(key) || occupiedSafetyCells.has(key)) {
      errors.push(`hazard or patrol overlaps protected cell: ${key}`);
    }
    occupiedSafetyCells.add(key);
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
  const random = seededRandom(seed);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = assembleCandidate(normalized, random);
    if (validateCandidateLayout(candidate).valid) return freezeMap(candidate);
  }
  return SAFE_LAYOUT_FALLBACKS[normalized];
}
