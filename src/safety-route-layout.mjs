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
  2: Object.freeze([{ x: 1, y: 4 }, { x: 12, y: 4 }]),
  3: Object.freeze([{ x: 2, y: 3 }, { x: 11, y: 3 }]),
  4: Object.freeze([{ x: 4, y: 10 }, { x: 9, y: 10 }]),
  5: Object.freeze([{ x: 5, y: 11 }, { x: 8, y: 11 }]),
  6: Object.freeze([{ x: 19, y: 4 }, { x: 30, y: 4 }]),
  7: Object.freeze([{ x: 20, y: 3 }, { x: 29, y: 3 }]),
  8: Object.freeze([{ x: 22, y: 10 }, { x: 27, y: 10 }]),
  9: Object.freeze([{ x: 23, y: 11 }, { x: 26, y: 11 }]),
  10: Object.freeze([{ x: 24, y: 10 }, { x: 25, y: 10 }])
});

const HAZARD_CANDIDATES = Object.freeze({
  manhole: Object.freeze([
    { x: 5, y: 3, cells: [{ x: 5, y: 3 }], pairedBypassCell: { x: 5, y: 4 } },
    { x: 7, y: 4, cells: [{ x: 7, y: 4 }], pairedBypassCell: { x: 7, y: 3 } },
    { x: 23, y: 3, cells: [{ x: 23, y: 3 }], pairedBypassCell: { x: 23, y: 4 } },
    { x: 25, y: 4, cells: [{ x: 25, y: 4 }], pairedBypassCell: { x: 25, y: 3 } }
  ]),
  construction: Object.freeze([
    {
      x: 3,
      y: 5,
      cells: [{ x: 3, y: 5 }, { x: 3, y: 6 }, { x: 3, y: 7 }, { x: 3, y: 8 }, { x: 3, y: 9 }],
      approachAnchor: { x: 3, y: 5 },
      bypassAlleyId: "left-east-alley"
    },
    {
      x: 10,
      y: 5,
      cells: [{ x: 10, y: 5 }, { x: 10, y: 6 }, { x: 10, y: 7 }, { x: 10, y: 8 }, { x: 10, y: 9 }],
      approachAnchor: { x: 10, y: 5 },
      bypassAlleyId: "left-west-alley"
    },
    {
      x: 21,
      y: 5,
      cells: [{ x: 21, y: 5 }, { x: 21, y: 6 }, { x: 21, y: 7 }, { x: 21, y: 8 }, { x: 21, y: 9 }],
      approachAnchor: { x: 21, y: 5 },
      bypassAlleyId: "right-east-alley"
    },
    {
      x: 28,
      y: 5,
      cells: [{ x: 28, y: 5 }, { x: 28, y: 6 }, { x: 28, y: 7 }, { x: 28, y: 8 }, { x: 28, y: 9 }],
      approachAnchor: { x: 28, y: 5 },
      bypassAlleyId: "right-west-alley"
    }
  ])
});

const PATROL_CANDIDATES = Object.freeze({
  scooter: Object.freeze([
    { x: 9, y: 3, points: [{ x: 8, y: 3 }, { x: 9, y: 3 }, { x: 10, y: 3 }] },
    { x: 12, y: 11, points: [{ x: 11, y: 11 }, { x: 12, y: 11 }, { x: 13, y: 11 }] },
    { x: 27, y: 3, points: [{ x: 26, y: 3 }, { x: 27, y: 3 }, { x: 28, y: 3 }] },
    { x: 19, y: 10, points: [{ x: 18, y: 10 }, { x: 19, y: 10 }, { x: 20, y: 10 }] }
  ]),
  bicycle: Object.freeze([
    { x: 5, y: 4, points: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }] },
    { x: 10, y: 11, points: [{ x: 9, y: 11 }, { x: 10, y: 11 }, { x: 11, y: 11 }] },
    { x: 27, y: 4, points: [{ x: 26, y: 4 }, { x: 27, y: 4 }, { x: 28, y: 4 }] },
    { x: 19, y: 11, points: [{ x: 18, y: 11 }, { x: 19, y: 11 }, { x: 20, y: 11 }] }
  ])
});

const DIRECTIONS = Object.freeze([
  Object.freeze({ x: 1, y: 0 }),
  Object.freeze({ x: -1, y: 0 }),
  Object.freeze({ x: 0, y: 1 }),
  Object.freeze({ x: 0, y: -1 })
]);

const pointKey = ({ x, y }) => `${x},${y}`;
const manhattanDistance = (left, right) =>
  Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
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
const hazardCells = hazard => hazard.cells?.length ? hazard.cells : [hazard];

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

function headingBetween(point, next) {
  if (next.y < point.y) return "north";
  if (next.y > point.y) return "south";
  if (next.x < point.x) return "west";
  return "east";
}

function carLoopForLane(lane) {
  const outboundRows = lane.direction === "north"
    ? Array.from({ length: HEIGHT }, (_, index) => HEIGHT - 1 - index)
    : Array.from({ length: HEIGHT }, (_, index) => index);
  const returnRows = [...outboundRows].reverse();
  const outboundX = lane.direction === "north" ? lane.x : lane.x + 1;
  const returnX = lane.direction === "north" ? lane.x + 1 : lane.x;
  const points = [
    ...outboundRows.map(y => ({ x: outboundX, y })),
    ...returnRows.map(y => ({ x: returnX, y }))
  ];
  const headings = points.map((point, index) =>
    headingBetween(point, points[(index + 1) % points.length])
  );
  const stopIndices = points.flatMap((point, index) => {
    const heading = headings[index];
    const approachesCrossing = CROSSING_ROWS.some(row =>
      (heading === "north" && point.y === row + 2) ||
      (heading === "south" && point.y === row - 1)
    );
    return approachesCrossing ? [index] : [];
  });
  return { points, headings, stopIndices };
}

function trafficPathsFor(lanes, patrols) {
  return [
    ...lanes.map(lane => {
      const { points, headings, stopIndices } = carLoopForLane(lane);
      return {
        id: `${lane.id}-car`,
        type: "car",
        laneId: lane.id,
        points,
        headings,
        stopIndex: stopIndices[0],
        stopIndices
      };
    }),
    ...patrols.map(patrol => ({
      id: patrol.id,
      type: patrol.type,
      patrolId: patrol.id,
      points: patrol.points.map(point => ({ ...point })),
      stopIndex: 0
    }))
  ];
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
    const candidates = HAZARD_CANDIDATES[type].filter(candidate =>
      [...hazardCells(candidate), candidate.pairedBypassCell].filter(Boolean)
        .every(point => !forbidden.has(pointKey(point)))
    );
    const hazard = selectCandidates(candidates, 1, random, forbidden)[0];
    hazardCells(hazard).forEach(point => forbidden.add(pointKey(point)));
    if (hazard.pairedBypassCell) forbidden.add(pointKey(hazard.pairedBypassCell));
    return {
      ...hazard,
      cells: hazardCells(hazard).map(point => ({ ...point })),
      pairedBypassCell: hazard.pairedBypassCell && { ...hazard.pairedBypassCell },
      id: `hazard-${index + 1}`,
      type
    };
  });
  const patrols = content.patrols.map((type, index) => {
    const candidates = PATROL_CANDIDATES[type].filter(candidate =>
      candidate.points.every(point => !forbidden.has(pointKey(point)))
    );
    const patrol = selectCandidates(candidates, 1, random, forbidden)[0];
    patrol.points.forEach(point => forbidden.add(pointKey(point)));
    return { ...patrol, id: `patrol-${index + 1}`, type, moving: true };
  });
  const places = [
    { id: "left-home", type: "home", x: 1, y: 1, label: "우리 집" },
    { id: "left-daycare", type: "daycare", x: 5, y: 1, label: "어린이집" },
    { id: "left-shops", type: "shops", x: 9, y: 1, label: "상가" },
    { id: "left-park", type: "park", x: 12, y: 12, label: "공원" },
    { id: "right-library", type: "library", x: 19, y: 1, label: "도서관" },
    { id: "right-bus-stop", type: "bus-stop", x: 22, y: 12, label: "버스 정류장" },
    { id: "right-shop", type: "shop", x: 26, y: 1, label: "가게" },
    { id: "right-school", type: "school", x: 30, y: 12, label: "학교" }
  ];
  const signalMarkers = geometry.crossings.flatMap(crossing => {
    const markerY = Math.min(...crossing.cells.map(point => point.y));
    return [
      {
        id: `${crossing.id}-left-signal`,
        crossingId: crossing.id,
        side: "left",
        x: ROAD.x - 1,
        y: markerY
      },
      {
        id: `${crossing.id}-right-signal`,
        crossingId: crossing.id,
        side: "right",
        x: ROAD.x + ROAD.width,
        y: markerY + 1
      }
    ];
  });
  const trafficPaths = trafficPathsFor(geometry.lanes, patrols);

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
    walkable: geometry.pedestrianCells,
    start,
    goal,
    signalGate: { x: ROAD.x, y: CROSSING_ROWS[0], signalId: SHARED_SIGNAL_ID },
    signals: [{
      id: SHARED_SIGNAL_ID,
      type: "pedestrian",
      crossingIds: geometry.crossings.map(crossing => crossing.id)
    }],
    signalMarkers,
    entrances,
    friends,
    places,
    hazards,
    patrols,
    trafficPaths
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
  const blocked = new Set((map.hazards ?? []).flatMap(hazardCells).map(pointKey));
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
  if (map.walkable !== map.pedestrianCells) {
    errors.push("walkable must alias pedestrian cells");
  }

  const places = Array.isArray(map.places) ? map.places : [];
  const expectedPlaceTypes = [
    "home", "daycare", "shops", "park",
    "library", "bus-stop", "shop", "school"
  ];
  if (places.length !== expectedPlaceTypes.length ||
    JSON.stringify(places.map(place => place.type)) !==
      JSON.stringify(expectedPlaceTypes) ||
    places.some(place => typeof place.label !== "string" || place.label.length === 0)) {
    errors.push("approved labeled landmarks are required");
  }
  places.forEach(place => {
    if (!inBounds(place)) errors.push(`place out of bounds: ${place?.id ?? "unknown"}`);
    const leftPlace = place.id?.startsWith("left-");
    const rightPlace = place.id?.startsWith("right-");
    if ((leftPlace && place.x >= ROAD.x) ||
      (rightPlace && place.x < ZONES.right.x) ||
      (!leftPlace && !rightPlace)) {
      errors.push(`place in wrong neighborhood: ${place.id ?? place.type}`);
    }
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
  const signalMarkers = map.signalMarkers ?? [];
  if (signalMarkers.length !== crossings.length * 2 || crossings.some(crossing => {
    const markerY = Math.min(...crossing.cells.map(cell => cell.y));
    const markers = signalMarkers.filter(marker => marker.crossingId === crossing.id);
    return markers.length !== 2 ||
      JSON.stringify(markers.map(marker => marker.side).sort()) !==
        JSON.stringify(["left", "right"]) ||
      markers.some(marker =>
        (marker.side === "left" &&
          (marker.x !== ROAD.x - 1 || marker.y !== markerY)) ||
        (marker.side === "right" &&
          (marker.x !== ROAD.x + ROAD.width || marker.y !== markerY + 1))
      );
  })) {
    errors.push("each crossing must have two synchronized signal markers");
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
    const alley = alleys.find(candidate => candidate.x === item.x &&
      item.y >= candidate.y && item.y < candidate.y + candidate.height);
    const expectedCells = alley && rectangleCells(alley.x, alley.y + 2, 1, alley.height - 4);
    const bypassAlley = alleys.find(candidate => candidate.id === item.bypassAlleyId);
    const approachAnchor = item.approachAnchor;
    const expectedApproachAnchor = expectedCells?.[0];
    if (!alley || !expectedCells ||
      JSON.stringify(hazardCells(item)) !== JSON.stringify(expectedCells) ||
      !approachAnchor || !expectedApproachAnchor ||
      pointKey(approachAnchor) !== pointKey(expectedApproachAnchor) ||
      !bypassAlley || bypassAlley.zone !== alley.zone || bypassAlley.id === alley.id) {
      errors.push(`construction must block one alley connector: ${pointKey(item)}`);
    }
  });

  const trafficPaths = Array.isArray(map.trafficPaths) ? map.trafficPaths : [];
  const pathIds = new Set();
  trafficPaths.forEach(path => {
    if (!path || typeof path.id !== "string" || typeof path.type !== "string" ||
      !Array.isArray(path.points) || path.points.length < 2 ||
      !Number.isInteger(path.stopIndex) || path.stopIndex < 0 ||
      path.stopIndex >= path.points.length) {
      errors.push(`invalid traffic path: ${path?.id ?? "unknown"}`);
      return;
    }
    if (pathIds.has(path.id)) errors.push(`duplicate traffic path: ${path.id}`);
    pathIds.add(path.id);
    path.points.forEach(point => {
      if (!inBounds(point)) errors.push(`traffic path out of bounds: ${path.id}`);
    });
  });
  if (trafficPaths.length !== lanes.length + (map.patrols ?? []).length) {
    errors.push("traffic paths must include cars and patrols");
  }
  const manholeBypassProtected = new Set([
    ...crossingCells,
    map.start,
    map.goal,
    map.signalGate,
    ...(map.entrances ?? []),
    ...(map.friends ?? [])
  ].filter(Boolean).map(pointKey));
  const occupiedBypassCells = new Set([
    ...(map.hazards ?? []).flatMap(hazardCells),
    ...(map.patrols ?? []),
    ...trafficPaths.flatMap(path => path.points ?? [])
  ].filter(Boolean).map(pointKey));
  (map.hazards ?? []).filter(item => item.type === "manhole").forEach(item => {
    const cells = hazardCells(item);
    const bypass = item.pairedBypassCell;
    const hasAnchorFootprint = cells.length === 1 && pointKey(cells[0]) === pointKey(item);
    const sharesSidewalkBand = bypass && sidewalkBands.some(band => [item, bypass].every(point =>
      point.x >= band.x && point.x < band.x + band.width &&
      point.y >= band.y && point.y < band.y + band.height
    ));
    if (!hasAnchorFootprint) {
      errors.push(`manhole must block exactly its anchor: ${pointKey(item)}`);
    }
    if (!bypass || !inBounds(bypass) || !walkable.has(pointKey(bypass)) ||
      Math.abs(item.x - bypass.x) + Math.abs(item.y - bypass.y) !== 1 ||
      !sharesSidewalkBand) {
      errors.push(`manhole bypass must share a sidewalk band: ${pointKey(item)}`);
    } else if (manholeBypassProtected.has(pointKey(bypass)) || occupiedBypassCells.has(pointKey(bypass))) {
      errors.push(`manhole bypass must remain open: ${pointKey(item)}`);
    }
  });
  lanes.forEach(lane => {
    const lanePoints = Array.isArray(lane?.cells) ? lane.cells : [];
    const expectedPoints = new Set(lanePoints.map(pointKey));
    const cars = trafficPaths.filter(path => path.type === "car" && path.laneId === lane.id);
    if (cars.length !== 1) {
      errors.push(`missing car path for lane: ${lane.id}`);
      return;
    }
    const points = cars[0].points ?? [];
    const headings = cars[0].headings ?? [];
    const actualPoints = new Set(points.filter(inBounds).map(pointKey));
    if (points.length !== expectedPoints.size || actualPoints.size !== expectedPoints.size ||
      [...expectedPoints].some(key => !actualPoints.has(key))) {
      errors.push(`car path must cover assigned lane: ${lane.id}`);
    }
    points.forEach((point, pointIndex) => {
      const next = points[(pointIndex + 1) % points.length];
      const expectedHeading = headingBetween(point, next);
      if (manhattanDistance(point, next) !== 1) {
        errors.push(`car path must be Manhattan-adjacent: ${lane.id}`);
      }
      if (headings[pointIndex] !== expectedHeading) {
        errors.push(`car heading must match movement: ${lane.id}`);
      }
    });
    const expectedStops = points.flatMap((point, pointIndex) => {
      const heading = headings[pointIndex];
      return CROSSING_ROWS.some(row =>
        (heading === "north" && point.y === row + 2) ||
        (heading === "south" && point.y === row - 1)
      ) ? [pointIndex] : [];
    });
    if (!Array.isArray(cars[0].stopIndices) ||
      JSON.stringify(cars[0].stopIndices) !== JSON.stringify(expectedStops) ||
      cars[0].stopIndex !== expectedStops[0]) {
      errors.push(`car stops must precede both crossings: ${lane.id}`);
    }
  });
  const patrolPathForbidden = new Set([
    ...crossingCells,
    ...(map.friends ?? []),
    ...(map.entrances ?? []),
    ...(map.hazards ?? []).flatMap(hazardCells),
    map.start,
    map.goal
  ].filter(Boolean).map(pointKey));
  (map.patrols ?? []).forEach(patrol => {
    const paths = trafficPaths.filter(path =>
      path.id === patrol.id && path.type === patrol.type && path.patrolId === patrol.id
    );
    if (paths.length !== 1) {
      errors.push(`missing patrol path: ${patrol.id}`);
      return;
    }
    const points = paths[0].points ?? [];
    const sharesBand = sidewalkBands.some(band => points.every(point =>
      point.x >= band.x && point.x < band.x + band.width &&
      point.y >= band.y && point.y < band.y + band.height
    ));
    if (!sharesBand || points.some(point =>
      !walkable.has(pointKey(point)) || patrolPathForbidden.has(pointKey(point))
    )) {
      errors.push(`unsafe patrol path: ${patrol.id}`);
    }
  });

  const protectedCells = new Set(crossingCells);
  [map.start, map.goal, ...(map.entrances ?? []), ...(map.friends ?? [])]
    .filter(Boolean)
    .forEach(item => {
      const key = pointKey(item);
      if (protectedCells.has(key)) errors.push(`protected locations overlap: ${key}`);
      protectedCells.add(key);
    });
  [...(map.hazards ?? []).flatMap(hazardCells), ...(map.patrols ?? [])].forEach(item => {
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

  const riderCells = trafficPaths
    .filter(path => path.type === "scooter" || path.type === "bicycle")
    .flatMap(path => path.points ?? []);
  riderCells.forEach(riderCell => {
    const mapWithRider = { ...map, hazards: [
      ...(map.hazards ?? []),
      { type: "rider", x: riderCell.x, y: riderCell.y, cells: [riderCell] }
    ] };
    let previous = map.start;
    [...(map.friends ?? []), map.goal].filter(Boolean).forEach(target => {
      if (!hasPath(mapWithRider, previous, target)) {
        errors.push(`unreachable with rider: ${pointKey(riderCell)}`);
      }
      previous = target;
    });
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
