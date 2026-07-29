import test from "node:test";
import assert from "node:assert/strict";
import {
  createSafetyRouteMap,
  validateCandidateLayout
} from "../src/safety-route-layout.mjs";
import { cameraOffset } from "../src/safety-route-camera.mjs";

const pointKey = ({ x, y }) => `${x},${y}`;

function reachablePedestrianCells(map) {
  const blocked = new Set(map.hazards.flatMap(hazard =>
    (hazard.cells ?? [hazard]).map(pointKey)
  ));
  const pedestrian = new Set(map.pedestrianCells.map(pointKey));
  const queue = [map.start];
  const visited = new Set();

  while (queue.length) {
    const point = queue.shift();
    const key = pointKey(point);
    if (visited.has(key) || blocked.has(key) || !pedestrian.has(key)) continue;
    visited.add(key);
    for (const [x, y] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      queue.push({ x: point.x + x, y: point.y + y });
    }
  }

  return [...visited].map(key => {
    const [x, y] = key.split(",").map(Number);
    return { x, y };
  });
}

test("지도는 14:4:14 구역과 32×16 크기를 사용한다", () => {
  const map = createSafetyRouteMap("easy", { seed: 17 });
  assert.deepEqual({ width: map.width, height: map.height }, { width: 32, height: 16 });
  assert.deepEqual(map.zones, {
    left: { x: 0, width: 14 },
    road: { x: 14, width: 4 },
    right: { x: 18, width: 14 }
  });
});

test("각 동네에 1칸 골목 2개와 2칸 보행길 2개가 있다", () => {
  const map = createSafetyRouteMap("steady", { seed: 9 });
  assert.deepEqual(map.alleys.map(item => item.width), [1, 1, 1, 1]);
  assert.deepEqual(map.sidewalkBands.map(item => item.height), [2, 2, 2, 2]);
});

test("두 횡단보도는 도로 4칸 전체를 가로지르고 높이가 2칸이다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 2 });
  assert.equal(map.crossings.length, 2);
  for (const crossing of map.crossings) {
    assert.equal(new Set(crossing.cells.map(cell => cell.x)).size, 4);
    assert.equal(new Set(crossing.cells.map(cell => cell.y)).size, 2);
  }
});

test("같은 시드는 같은 안전 배치를 만든다", () => {
  assert.deepEqual(
    createSafetyRouteMap("challenge", { seed: 20260726 }),
    createSafetyRouteMap("challenge", { seed: 20260726 })
  );
});

test("생성 지도는 연결성 검증을 통과한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    for (let seed = 0; seed < 30; seed += 1) {
      assert.deepEqual(validateCandidateLayout(
        createSafetyRouteMap(difficulty, { seed })
      ), { valid: true, errors: [] });
    }
  }
});

test("재시도를 사용하지 않으면 검증된 고정 배치를 반환한다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 5, maxAttempts: 0 });
  assert.equal(map.layoutSource, "fallback");
  assert.deepEqual(validateCandidateLayout(map), { valid: true, errors: [] });
});

test("필수 시작점이 없는 후보는 검증 오류로 반환한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 1 }));
  map.start = undefined;

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("start is required"));
});

test("난이도별 생활안전 요소는 정해진 장애물과 이동 수단을 사용한다", () => {
  const easy = createSafetyRouteMap("easy", { seed: 1 });
  const steady = createSafetyRouteMap("steady", { seed: 1 });
  const challenge = createSafetyRouteMap("challenge", { seed: 1 });

  assert.deepEqual(easy.hazards.map(item => item.type), ["manhole"]);
  assert.deepEqual(easy.patrols.map(item => item.type), ["scooter"]);
  assert.deepEqual(steady.hazards.map(item => item.type).sort(), [
    "construction", "manhole", "manhole"
  ]);
  assert.deepEqual(steady.patrols.map(item => item.type).sort(), ["bicycle", "scooter"]);
  assert.deepEqual(challenge.hazards.map(item => item.type).sort(), [
    "construction", "manhole", "manhole"
  ]);
  assert.deepEqual(challenge.patrols.map(item => item.type).sort(), ["bicycle", "scooter"]);
  for (const map of [steady, challenge]) {
    const construction = map.hazards.find(item => item.type === "construction");
    assert.ok(map.alleys.some(alley =>
      construction.x === alley.x &&
      construction.y >= alley.y &&
      construction.y < alley.y + alley.height
    ));
  }
});

test("맨홀은 한 보행 칸만 막고 짝을 이룬 우회 칸을 비워 둔다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 8 });
  const walkable = new Set(map.pedestrianCells.map(({ x, y }) => `${x},${y}`));
  const occupied = new Set([
    ...map.hazards.flatMap(hazard => hazard.cells ?? [hazard]),
    ...map.friends,
    ...map.entrances,

    map.start,
    map.goal
  ].map(({ x, y }) => `${x},${y}`));

  for (const manhole of map.hazards.filter(hazard => hazard.type === "manhole")) {
    assert.equal(manhole.cells?.length, 1);
    assert.ok(manhole.pairedBypassCell);
    assert.equal(walkable.has(`${manhole.pairedBypassCell.x},${manhole.pairedBypassCell.y}`), true);
    assert.equal(
      occupied.has(`${manhole.pairedBypassCell.x},${manhole.pairedBypassCell.y}`),
      false
    );
  }
});

test("맨홀 발자국이 짝 우회 칸까지 덮으면 후보 검증이 거부한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 8 }));
  const manhole = map.hazards.find(hazard => hazard.type === "manhole");
  manhole.cells.push({ ...manhole.pairedBypassCell });

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes(`manhole bypass must remain open: ${manhole.x},${manhole.y}`));
});

test("공사 발자국은 한 골목의 두 보행길 사이 연결부만 막는다", () => {
  const map = createSafetyRouteMap("steady", { seed: 8 });
  const construction = map.hazards.find(hazard => hazard.type === "construction");
  const alley = map.alleys.find(item => item.x === construction.x);
  const otherAlley = map.alleys.find(item => item.zone === alley.zone && item.id !== alley.id);
  const connector = Array.from({ length: alley.height - 4 }, (_, index) => ({
    x: alley.x,
    y: alley.y + 2 + index
  }));

  assert.deepEqual(construction.cells, connector);
  assert.equal(
    construction.cells.some(cell => cell.x === otherAlley.x),
    false
  );
});

test("공사 그림은 접근 쪽 앵커에 고정되어 도달 가능한 PC 카메라에 전부 보인다", () => {
  for (const difficulty of ["steady", "challenge"]) {
    for (let seed = 0; seed < 30; seed += 1) {
      const map = createSafetyRouteMap(difficulty, { seed });
      const construction = map.hazards.find(hazard => hazard.type === "construction");
      const approachAnchor = construction.approachAnchor;
      const topFootprintY = Math.min(...construction.cells.map(cell => cell.y));

      assert.deepEqual(
        approachAnchor,
        { x: construction.x, y: topFootprintY },
        `${difficulty} seed ${seed} must anchor the artwork at the upper approach`
      );

      const artworkBounds = {
        left: approachAnchor.x - .1,
        right: approachAnchor.x + 1.1,
        top: approachAnchor.y - .1,
        bottom: approachAnchor.y + 1.1
      };
      const cameras = reachablePedestrianCells(map).map(player =>
        cameraOffset({ world: map, viewport: { width: 7, height: 5 }, player })
      );
      const visibleCamera = cameras.find(camera =>
        artworkBounds.left >= camera.x && artworkBounds.right <= camera.x + 7 &&
        artworkBounds.top >= camera.y && artworkBounds.bottom <= camera.y + 5
      );

      assert.ok(visibleCamera, `${difficulty} seed ${seed} has no full-art PC camera`);
    }
  }
});

test("두 횡단보도는 하나의 보행 신호와 signalGate를 공유한다", () => {
  const map = createSafetyRouteMap("steady", { seed: 4 });

  assert.equal(map.signals.length, 1);
  assert.equal(map.signals[0].id, map.signalGate.signalId);
  assert.deepEqual(map.signals[0].crossingIds, map.crossings.map(item => item.id));
  assert.ok(map.crossings.every(item => item.signalId === map.signalGate.signalId));
});

test("각 횡단보도는 양쪽 보도 모서리에 동기 신호 위치를 만든다", () => {
  const map = createSafetyRouteMap("easy", { seed: 14 });

  assert.equal(map.signalMarkers.length, 4);
  for (const crossing of map.crossings) {
    const markers = map.signalMarkers.filter(
      marker => marker.crossingId === crossing.id
    );
    assert.deepEqual(markers.map(marker => marker.side).sort(), ["left", "right"]);
    assert.ok(markers.every(marker => !map.roadCells.some(
      cell => cell.x === marker.x && cell.y === marker.y
    )));
  }
});

test("생성 및 대체 지도는 정규화한 입력 시드를 보존한다", () => {
  assert.equal(createSafetyRouteMap("easy", { seed: -1 }).seed, 4294967295);
  assert.equal(
    createSafetyRouteMap("easy", { seed: -1, maxAttempts: 0 }).seed,
    4294967295
  );
});

test("도로 셀은 중앙 네 열의 모든 행을 정확히 덮어야 한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 3 }));
  map.roadCells[0] = { x: 14, y: 16 };

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("road cells must exactly cover all center road cells"));
});

test("차선 셀은 지도 안의 중앙 도로 열에만 있어야 한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 3 }));
  map.lanes[0].cells[0] = { x: 13, y: 0 };

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("lane cell outside road: 13,0"));
});

test("차선에는 지정된 두 도로 열을 모두 덮는 셀 배열이 필요하다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 3 }));
  delete map.lanes[0].cells;

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("lane cells must exactly cover its two road columns"));
});

test("보호 위치끼리도 겹치면 후보 검증이 실패한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 8 }));
  map.friends[0] = { ...map.start, id: "friend-2", number: 2 };

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("protected locations overlap: 0,3"));
});

test("생성 지도는 런타임 공용 필드와 보행 별칭 및 두 동네 장소를 제공한다", () => {
  const map = createSafetyRouteMap("steady", { seed: 12 });

  for (const field of [
    "zones", "pedestrianCells", "roadCells", "crossings", "friends", "places",
    "entrances", "hazards", "trafficPaths", "start", "goal", "signalGate"
  ]) {
    assert.ok(Object.hasOwn(map, field), `${field} missing`);
  }
  assert.strictEqual(map.walkable, map.pedestrianCells);
  assert.ok(Object.isFrozen(map.walkable));
  assert.deepEqual(map.places.map(place => place.type).sort(), [
    "bus-stop", "daycare", "home", "library", "park", "school", "shop", "shops"
  ]);
  assert.ok(map.places.every(place =>
    Number.isInteger(place.x) && Number.isInteger(place.y) &&
    place.x >= 0 && place.x < map.width && place.y >= 0 && place.y < map.height
  ));
  assert.ok(map.places.some(place => place.type === "home" && place.x < 14));
  assert.ok(map.places.some(place => place.type === "school" && place.x >= 18));
});

test("건물은 풋프린트와 문을 가지고 잔디 위에만 있다", () => {
  const map = createSafetyRouteMap("steady", { seed: 7 });
  const walkable = new Set(map.pedestrianCells.map(pointKey));
  assert.equal(map.places.length, 8);
  map.places.forEach(place => {
    assert.ok(place.width >= 1 && place.height >= 1, place.id);
    assert.ok(place.door, place.id);
    for (let dx = 0; dx < place.width; dx += 1) {
      for (let dy = 0; dy < place.height; dy += 1) {
        assert.ok(
          !walkable.has(`${place.x + dx},${place.y + dy}`),
          `${place.id} footprint on walkway`
        );
      }
    }
    assert.ok(
      walkable.has(pointKey(place.door)),
      `${place.id} door must face a walkway`
    );
  });
  const school = map.places.find(place => place.type === "school");
  assert.equal(school.width, 3);
  assert.equal(school.height, 3);
  assert.deepEqual(map.goal, { x: 28, y: 11 });
  assert.deepEqual(school.door, map.goal);
  assert.ok(map.props.length >= 8);
  map.props.forEach(prop => {
    assert.ok(["tree", "flowers", "bench"].includes(prop.type));
    assert.ok(!walkable.has(pointKey(prop)), `prop on walkway: ${prop.id}`);
  });
});

test("승인된 여덟 랜드마크는 올바른 동네와 접근 가능한 이름을 가진다", () => {
  const map = createSafetyRouteMap("steady", { seed: 12 });

  assert.deepEqual(
    map.places.map(place => [place.id, place.type, place.label]),
    [
      ["left-home", "home", "우리 집"],
      ["left-daycare", "daycare", "어린이집"],
      ["left-shops", "shops", "상가"],
      ["left-park", "park", "공원"],
      ["right-library", "library", "도서관"],
      ["right-bus-stop", "bus-stop", "버스 정류장"],
      ["right-shop", "shop", "가게"],
      ["right-school", "school", "학교"]
    ]
  );
  assert.ok(map.places.slice(0, 4).every(place => place.x < map.zones.road.x));
  assert.ok(map.places.slice(4).every(place =>
    place.x >= map.zones.right.x &&
    place.x < map.zones.right.x + map.zones.right.width
  ));
});

test("교통 경로는 두 차선 자동차와 안전한 다점 순찰 경로를 함께 제공한다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 12 });
  const crossings = new Set(map.crossings.flatMap(item => item.cells).map(({ x, y }) => `${x},${y}`));
  const forbidden = new Set([
    ...map.friends,
    ...map.entrances,
    ...map.hazards,
    map.start,
    map.goal
  ].map(({ x, y }) => `${x},${y}`));
  const cars = map.trafficPaths.filter(path => path.type === "car");

  for (const path of map.trafficPaths) {
    assert.equal(typeof path.id, "string");
    assert.equal(typeof path.type, "string");
    assert.ok(path.points.length >= 2);
    assert.ok(Number.isInteger(path.stopIndex));
    assert.ok(path.stopIndex >= 0 && path.stopIndex < path.points.length);
  }
  assert.equal(cars.length, 2);
  for (const car of cars) {
    const lane = map.lanes.find(item => item.id === car.laneId);
    assert.ok(lane);
    const laneCells = new Set(lane.cells.map(({ x, y }) => `${x},${y}`));
    assert.ok(car.points.every(({ x, y }) => laneCells.has(`${x},${y}`)));
    assert.equal(car.stopIndices?.length, 4);
    assert.ok(car.stopIndices.every(index =>
      [2, 5, 9, 12].includes(car.points[index].y)
    ));
  }
  for (const patrol of map.patrols) {
    const path = map.trafficPaths.find(item => item.id === patrol.id);
    assert.ok(path);
    assert.equal(path.type, patrol.type);
    assert.ok(path.points.length >= 2);
    assert.ok(Number.isInteger(path.stopIndex));
    assert.ok(path.stopIndex >= 0 && path.stopIndex < path.points.length);
    assert.ok(path.points.every(({ x, y }) =>
      !crossings.has(`${x},${y}`) && !forbidden.has(`${x},${y}`)
    ));
  }
});

test("두 자동차 경로는 인접한 칸으로 순환하며 실제 진행 방향이 서로 반대다", () => {
  const map = createSafetyRouteMap("easy", { seed: 12 });
  const cars = map.trafficPaths.filter(path => path.type === "car");
  const opposite = { north: "south", south: "north", east: "west", west: "east" };

  assert.deepEqual(cars.map(path => path.headings[0]), ["north", "south"]);
  assert.ok(cars[0].headings.every((heading, index) =>
    cars[1].headings[index] === opposite[heading]
  ));
  for (const path of cars) {
    for (let index = 0; index < path.points.length; index += 1) {
      const point = path.points[index];
      const next = path.points[(index + 1) % path.points.length];
      assert.equal(
        Math.abs(point.x - next.x) + Math.abs(point.y - next.y),
        1,
        `${path.id} jumps from ${point.x},${point.y} to ${next.x},${next.y}`
      );
    }
  }
});

test("자동차 정지선은 각 횡단보도의 실제 접근 방향 앞에 놓인다", () => {
  const map = createSafetyRouteMap("easy", { seed: 12 });
  const cars = map.trafficPaths.filter(path => path.type === "car");

  assert.deepEqual(
    cars.map(path => path.stopIndices.map(index => ({
      y: path.points[index].y,
      heading: path.headings[index]
    }))),
    [
      [
        { y: 12, heading: "north" },
        { y: 5, heading: "north" },
        { y: 2, heading: "south" },
        { y: 9, heading: "south" }
      ],
      [
        { y: 2, heading: "south" },
        { y: 9, heading: "south" },
        { y: 12, heading: "north" },
        { y: 5, heading: "north" }
      ]
    ]
  );
});

test("킥보드·자전거는 한 줄의 빈 구간 전체를 왕복한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    for (let seed = 0; seed < 20; seed += 1) {
      const map = createSafetyRouteMap(difficulty, { seed });
      for (const patrol of map.patrols) {
        const path = map.trafficPaths.find(item => item.id === patrol.id);
        const rows = new Set(path.points.map(point => point.y));
        assert.equal(rows.size, 1, `${difficulty}/${seed} patrol spans one row`);
        assert.ok(
          path.points.length >= 12,
          `${difficulty}/${seed} patrol length ${path.points.length}`
        );
        const xs = path.points.map(point => point.x);
        for (let index = 1; index < xs.length; index += 1) {
          assert.equal(xs[index], xs[index - 1] + 1, "contiguous run");
        }
      }
    }
  }
});

test("난이도 3단계는 요소 수와 신호 유무로 차이가 난다", () => {
  const easy = createSafetyRouteMap("easy", { seed: 2 });
  const steady = createSafetyRouteMap("steady", { seed: 2 });
  const challenge = createSafetyRouteMap("challenge", { seed: 2 });

  assert.deepEqual(easy.hazards.map(item => item.type), ["manhole"]);
  assert.deepEqual(easy.patrols.map(item => item.type), ["scooter"]);
  assert.equal(easy.signalless, false);

  assert.deepEqual(
    steady.hazards.map(item => item.type).sort(),
    ["construction", "manhole", "manhole"]
  );
  assert.deepEqual(
    steady.patrols.map(item => item.type).sort(),
    ["bicycle", "scooter"]
  );
  assert.equal(steady.signalless, false);

  assert.deepEqual(
    challenge.hazards.map(item => item.type).sort(),
    ["construction", "manhole", "manhole"]
  );
  assert.deepEqual(
    challenge.patrols.map(item => item.type).sort(),
    ["bicycle", "scooter"]
  );
  assert.equal(challenge.signalless, true);
});
