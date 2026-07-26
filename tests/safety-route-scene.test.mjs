import test from "node:test";
import assert from "node:assert/strict";
import { createSafetyRouteState } from "../src/safety-route-model.mjs";
import {
  renderSafetyRouteScene,
  updateSafetyRouteScene
} from "../src/safety-route-scene.mjs";

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.style = new FakeStyle();
    this.children = [];
    this.attributes = new Map();
    this.textContent = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  addEventListener() {}
}

const document = {
  activeElement: null,
  createElement(tagName) {
    return new FakeElement(tagName);
  }
};

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function byClass(root, className) {
  return descendants(root).filter(node =>
    node.className.split(/\s+/).includes(className)
  );
}

test("길찾기 장면은 목표, 수집 행렬, 지도와 네 방향 버튼을 만든다", () => {
  const scene = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy")
  );

  assert.equal(scene.className, "safety-route");
  assert.equal(byClass(scene, "safety-grid").length, 1);
  assert.equal(byClass(scene, "safety-goal").length, 1);
  assert.match(byClass(scene, "safety-goal")[0].textContent, /2 친구/);
  assert.equal(byClass(scene, "route-player").length, 1);
  assert.equal(byClass(scene, "route-player")[0].dataset.number, "1");
  assert.equal(byClass(scene, "route-friend").length, 9);

  const directions = descendants(scene)
    .filter(node => node.dataset.routeDirection)
    .map(node => node.dataset.routeDirection)
    .sort();
  assert.deepEqual(directions, ["down", "left", "right", "up"]);
});

test("만난 친구는 지도에서 사라지고 상단 행렬에 표시된다", () => {
  const state = {
    ...createSafetyRouteState("easy"),
    collected: [1, 2, 3],
    nextFriend: 4
  };
  const scene = renderSafetyRouteScene(document, state);

  const mapNumbers = byClass(scene, "route-friend")
    .filter(node => !node.hidden)
    .map(node => Number(node.dataset.number))
    .sort((a, b) => a - b);
  const collectedNumbers = byClass(scene, "collected-friend")
    .map(node => Number(node.dataset.number));

  assert.deepEqual(mapNumbers, [4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(collectedNumbers, [1, 2, 3]);
});

test("난이도별 장애물과 두 차선 자동차를 장면에 표시한다", () => {
  const steady = renderSafetyRouteScene(
    document,
    createSafetyRouteState("steady")
  );
  assert.equal(byClass(steady, "route-manhole").length, 1);
  assert.equal(byClass(steady, "route-construction").length, 1);
  assert.equal(byClass(steady, "route-scooter").length, 1);

  const challenge = renderSafetyRouteScene(
    document,
    createSafetyRouteState("challenge")
  );
  assert.equal(byClass(challenge, "route-bicycle").length, 1);
  assert.equal(byClass(challenge, "route-car").length, 2);
});

test("장면은 보도와 차도를 별도 레이어로 만들고 카메라 값을 노출한다", () => {
  const state = createSafetyRouteState("challenge");
  const scene = renderSafetyRouteScene(document, state, {
    camera: { x: 3, y: 2, width: 7, height: 5 },
    guidance: [
      { x: 4, y: 3 },
      { x: 5, y: 3 },
      { x: 6, y: 3 }
    ],
    targetArrow: { visible: true, x: 6.5, y: 2, angle: 0 }
  });

  assert.equal(byClass(scene, "safety-viewport").length, 1);
  assert.equal(byClass(scene, "safety-world").length, 1);
  assert.ok(byClass(scene, "route-sidewalk").length > 0);
  assert.ok(byClass(scene, "route-road").length > 0);
  assert.ok(byClass(scene, "route-crosswalk").length > 0);
  assert.ok(byClass(scene, "route-stop-line").length > 0);
  assert.equal(byClass(scene, "route-guidance-cell").length, 3);
  assert.equal(byClass(scene, "route-target-arrow").length, 1);

  const world = byClass(scene, "safety-world")[0];
  assert.equal(world.style.values.get("--camera-x"), "3");
  assert.equal(world.style.values.get("--camera-y"), "2");
});

test("신호 단계를 색 외의 데이터로도 표시한다", () => {
  const vehicle = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy")
  );
  assert.equal(
    byClass(vehicle, "route-signal")[0].dataset.phase,
    "vehicle-go"
  );

  const pedestrian = renderSafetyRouteScene(
    document,
    {
      ...createSafetyRouteState("easy"),
      signal: { phase: "pedestrian-go", elapsedMs: 0 }
    }
  );
  assert.equal(
    byClass(pedestrian, "route-signal")[0].dataset.phase,
    "pedestrian-go"
  );
});

test("생성 장면은 위아래 횡단보도에 동기화된 보행 신호 표지를 그린다", () => {
  const state = {
    ...createSafetyRouteState("easy", { seed: 4 }),
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  };
  const scene = renderSafetyRouteScene(document, state);
  const markers = byClass(scene, "route-signal-marker");

  assert.equal(markers.length, 2);
  assert.deepEqual(markers.map(marker => marker.dataset.phase), [
    "pedestrian-go",
    "pedestrian-go"
  ]);
  assert.deepEqual(markers.map(marker => [
    marker.style.values.get("--route-x"),
    marker.style.values.get("--route-y")
  ]), [["14", "4"], ["14", "11"]]);
});

test("장면은 좌우 동네와 중앙 2차선 구역을 표시한다", () => {
  const scene = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy", { seed: 1 })
  );

  assert.equal(byClass(scene, "route-zone-left").length, 1);
  assert.equal(byClass(scene, "route-zone-road").length, 1);
  assert.equal(byClass(scene, "route-zone-right").length, 1);
  assert.equal(byClass(scene, "route-crosswalk").length, 16);
});

test("도로 배경은 이동체 경로가 없어도 전체 도로 칸을 표시한다", () => {
  const state = structuredClone(
    createSafetyRouteState("easy", { seed: 2 })
  );
  state.map.trafficPaths = [];
  state.movers = [];

  const scene = renderSafetyRouteScene(document, state);

  assert.equal(byClass(scene, "route-road").length, state.map.roadCells.length);
});

test("다칸 공사장은 발자국 전부를 막힘 레이어로 표시하고 그림은 한 번만 만든다", () => {
  const state = createSafetyRouteState("steady", { seed: 8 });
  const construction = state.map.hazards.find(
    item => item.type === "construction"
  );
  const scene = renderSafetyRouteScene(document, state);
  const constructionFootprints = byClass(scene, "route-hazard-footprint")
    .filter(node => node.dataset.hazard === "construction");

  assert.equal(constructionFootprints.length, construction.cells.length);
  assert.equal(byClass(scene, "route-construction").length, 1);
});

test("이동체는 방향과 정지 상태를 색 이외 데이터로 노출한다", () => {
  const state = structuredClone(
    createSafetyRouteState("challenge", { seed: 3 })
  );
  const riderIndex = state.movers.findIndex(
    mover => mover.type === "scooter" || mover.type === "bicycle"
  );
  state.movers[riderIndex] = {
    ...state.movers[riderIndex],
    direction: -1,
    stopped: true
  };

  const mover = byClass(
    renderSafetyRouteScene(document, state),
    "route-moving-rider"
  )[0];

  assert.ok(mover);
  assert.equal(mover.dataset.direction, "-1");
  assert.equal(mover.dataset.stopped, "true");
});

test("자동차 그림은 실제 이동 방향을 heading 속성으로 노출한다", () => {
  const state = createSafetyRouteState("easy", { seed: 3 });
  const cars = byClass(
    renderSafetyRouteScene(document, state),
    "route-car"
  );

  assert.deepEqual(cars.map(car => car.dataset.heading), ["north", "south"]);
});

test("지도가 입구 신호 표시를 제공하면 하나의 신호 상태를 두 곳에 그린다", () => {
  const state = structuredClone(
    createSafetyRouteState("easy", { seed: 4 })
  );
  state.map.signalMarkers = [
    { x: 13, y: 3 },
    { x: 18, y: 3 }
  ];

  const scene = renderSafetyRouteScene(document, state);

  assert.equal(byClass(scene, "route-signal").length, 1);
  assert.equal(byClass(scene, "route-signal-marker").length, 2);
  assert.deepEqual(
    byClass(scene, "route-signal-marker").map(node => node.dataset.phase),
    ["vehicle-go", "vehicle-go"]
  );
});

test("새로 삽입한 월드는 이전 카메라에서 시작해 다음 프레임에 같은 노드를 목표로 옮긴다", () => {
  const frames = [];
  const scene = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy", { seed: 5 }),
    {
      camera: { x: 8, y: 6, width: 7, height: 5 },
      cameraStart: { x: 5, y: 6 },
      scheduleFrame: callback => frames.push(callback)
    }
  );
  const stage = document.createElement("div");
  stage.append(scene);
  const world = byClass(stage, "safety-world")[0];

  assert.equal(world.style.values.get("--camera-x"), "5");
  assert.equal(world.style.values.get("--camera-y"), "6");
  assert.equal(frames.length, 1);

  frames[0]();

  assert.equal(byClass(stage, "safety-world")[0], world);
  assert.equal(world.style.values.get("--camera-x"), "8");
  assert.equal(world.style.values.get("--camera-y"), "6");
});

test("장애물과 신호와 이동체 그림은 레이블이 있는 이미지로 노출한다", () => {
  const state = structuredClone(
    createSafetyRouteState("challenge", { seed: 6 })
  );
  state.map.signalMarkers = [{ x: 13, y: 3 }, { x: 18, y: 3 }];
  const scene = renderSafetyRouteScene(document, state);

  for (const illustration of [
    ...byClass(scene, "route-hazard"),
    ...byClass(scene, "route-signal")
  ]) {
    assert.equal(illustration.attributes.get("role"), "img");
    assert.ok(illustration.attributes.get("aria-label"));
  }
  for (const decoration of [
    ...byClass(scene, "route-hazard-footprint"),
    ...byClass(scene, "route-signal-marker")
  ]) {
    assert.equal(decoration.attributes.get("aria-hidden"), "true");
    assert.equal(decoration.attributes.has("role"), false);
  }
});

test("월드 틱 갱신 뒤에도 같은 장면과 방향 버튼이 유지되어 포커스를 잃지 않는다", () => {
  const state = createSafetyRouteState("easy", { seed: 9 });
  const scene = renderSafetyRouteScene(document, state, {
    camera: { x: 0, y: 1, width: 7, height: 5 }
  });
  const world = byClass(scene, "safety-world")[0];
  const button = descendants(scene).find(node => node.dataset.routeDirection === "right");
  document.activeElement = button;

  const updated = updateSafetyRouteScene(scene, {
    ...state,
    tick: 100,
    signal: { phase: "pedestrian-go", elapsedMs: 0 },
    movers: state.movers.map(mover => ({
      ...mover,
      pathIndex: mover.type === "car" ? 1 : mover.pathIndex
    }))
  }, {
    camera: { x: 1, y: 1, width: 7, height: 5 }
  });

  assert.strictEqual(updated, scene);
  assert.strictEqual(byClass(scene, "safety-world")[0], world);
  assert.strictEqual(
    descendants(scene).find(node => node.dataset.routeDirection === "right"),
    button
  );
  assert.strictEqual(document.activeElement, button);
  assert.equal(world.style.values.get("--camera-x"), "1");
  assert.ok(byClass(scene, "route-signal-marker").every(
    marker => marker.dataset.phase === "pedestrian-go"
  ));
});
