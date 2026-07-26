import { characterAsset } from "./character-spec.mjs";
import { moverPoint } from "./safety-route-movers.mjs";

const PLACE_LABELS = Object.freeze({
  home: "우리 집",
  daycare: "어린이집",
  shops: "상가",
  roadside: "길가",
  park: "공원",
  "bus-stop": "버스 정류장",
  library: "도서관",
  shop: "가게",
  construction: "공사 구간",
  crossing: "횡단보도",
  school: "학교"
});

const HAZARD_LABELS = Object.freeze({
  manhole: "열린 맨홀",
  construction: "공사 중",
  scooter: "놓인 킥보드",
  bicycle: "지나가는 자전거",
  car: "골목 자동차"
});

function placeAt(node, point) {
  node.style.setProperty("--route-x", point.x + 1);
  node.style.setProperty("--route-y", point.y + 1);
  return node;
}

function pointKey(point) {
  return `${point.x},${point.y}`;
}

function cellsIn(rectangles) {
  return new Set(rectangles.flatMap(rectangle =>
    Array.from({ length: rectangle.width * rectangle.height }, (_, index) => {
      const x = rectangle.x + (index % rectangle.width);
      const y = rectangle.y + Math.floor(index / rectangle.width);
      return `${x},${y}`;
    })
  ));
}

function setWorldCamera(world, camera) {
  world.style.setProperty("--camera-x", camera.x);
  world.style.setProperty("--camera-y", camera.y);
}

function resolvedView(state, requestedView = {}) {
  return {
    camera: {
      x: 0,
      y: Math.max(0, state.map.height - 5),
      width: 7,
      height: 5,
      ...requestedView.camera
    },
    guidance: requestedView.guidance ?? [],
    targetArrow: requestedView.targetArrow ?? { visible: false }
  };
}

function characterImage(document, number, className) {
  const image = document.createElement("img");
  image.className = className;
  image.src = `assets/characters/${characterAsset(number)}`;
  image.alt = `숫자 ${number} 블록 친구`;
  image.dataset.number = String(number);
  image.addEventListener("error", () => {
    const fallback = document.createElement("strong");
    fallback.className = `${className} route-character-fallback`;
    fallback.textContent = String(number);
    fallback.dataset.number = String(number);
    image.replaceWith(fallback);
  }, { once: true });
  return image;
}

function routeCell(document, point, className = "") {
  const cell = document.createElement("div");
  cell.className = `route-cell ${className}`.trim();
  cell.setAttribute("aria-hidden", "true");
  return placeAt(cell, point);
}

function routeZone(document, name, zone, height) {
  const node = document.createElement("div");
  node.className = `route-zone route-zone-${name}`;
  node.setAttribute("aria-hidden", "true");
  node.style.setProperty("--route-x", zone.x + 1);
  node.style.setProperty("--route-y", (zone.y ?? 0) + 1);
  node.style.setProperty("--route-width", zone.width);
  node.style.setProperty("--route-height", zone.height ?? height);
  return node;
}

function signalNode(document, phase, className, point, accessible = false) {
  const signal = document.createElement("div");
  signal.className = className;
  signal.dataset.phase = phase;
  if (accessible) {
    signal.setAttribute("role", "img");
    signal.setAttribute(
      "aria-label",
      phase === "pedestrian-go" ? "초록 신호" : "빨간 신호"
    );
  } else {
    signal.setAttribute("aria-hidden", "true");
  }
  return placeAt(signal, point);
}

function routePad(document) {
  const pad = document.createElement("div");
  pad.className = "route-pad";
  pad.setAttribute("aria-label", "길찾기 이동");

  for (const [direction, label, symbol] of [
    ["up", "위로 이동", "↑"],
    ["left", "왼쪽으로 이동", "←"],
    ["down", "아래로 이동", "↓"],
    ["right", "오른쪽으로 이동", "→"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.routeDirection = direction;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    pad.append(button);
  }
  return pad;
}

export function renderSafetyRouteScene(document, state, requestedView = {}) {
  const view = resolvedView(state, requestedView);
  const root = document.createElement("div");
  root.className = "safety-route";

  const top = document.createElement("div");
  top.className = "safety-route-top";

  const goal = document.createElement("div");
  goal.className = "safety-goal";
  top.append(goal);

  const collected = document.createElement("div");
  collected.className = "safety-collected";
  top.append(collected);
  root.append(top);

  const viewport = document.createElement("div");
  viewport.className = "safety-grid safety-viewport";
  viewport.style.setProperty("--viewport-cols", view.camera.width);
  viewport.style.setProperty("--viewport-rows", view.camera.height);

  const world = document.createElement("div");
  world.className = "safety-world";
  world.style.setProperty("--world-cols", state.map.width);
  world.style.setProperty("--world-rows", state.map.height);
  const cameraStart = requestedView.cameraStart ?? view.camera;
  setWorldCamera(world, cameraStart);

  for (const name of ["left", "road", "right"]) {
    const zone = state.map.zones?.[name];
    if (zone) world.append(routeZone(document, name, zone, state.map.height));
  }

  const crossingIds = new Map(
    state.map.crossings.flatMap(crossing =>
      crossing.cells.map(point => [pointKey(point), crossing.id])
    )
  );
  const alleyKeys = cellsIn(state.map.alleys);
  state.map.roadCells.forEach(point => {
    const crossingId = crossingIds.get(pointKey(point));
    const className = crossingId
      ? "route-road route-crosswalk"
      : "route-road";
    const node = routeCell(document, point, className);
    const lane = state.map.lanes.find(item =>
      point.x >= item.x && point.x < item.x + item.width
    );
    node.dataset.lane = lane?.id ?? "";
    node.dataset.roadPosition = [
      "outer-left", "center-left", "center-right", "outer-right"
    ][point.x - state.map.zones.road.x] ?? "";
    if (crossingId) node.dataset.crossingId = crossingId;
    world.append(node);
  });

  state.map.pedestrianCells.forEach(point => {
    if (!crossingIds.has(pointKey(point))) {
      const className = alleyKeys.has(pointKey(point))
        ? "route-sidewalk route-alley"
        : "route-sidewalk route-walkway";
      world.append(routeCell(document, point, className));
    }
  });

  const stopLines = new Set();
  state.map.trafficPaths
    .filter(path => path.type === "car")
    .forEach(path => {
      (path.stopIndices ?? [path.stopIndex]).forEach(index => {
        const stopPoint = path.points[index];
        const key = stopPoint && `${stopPoint.x},${stopPoint.y}`;
        if (stopPoint && !stopLines.has(key)) {
          stopLines.add(key);
          world.append(routeCell(document, stopPoint, "route-stop-line"));
        }
      });
    });

  state.map.entrances.forEach(entrance => {
    world.append(routeCell(document, entrance, "route-entrance"));
  });

  state.map.places.forEach(place => {
    const node = document.createElement("div");
    node.className = `route-place route-place-${place.type}`;
    node.textContent = place.label ?? PLACE_LABELS[place.type] ?? place.type;
    node.setAttribute("aria-label", node.textContent);
    world.append(placeAt(node, place));
  });

  const signalMarkers = state.map.signalMarkers?.length
    ? state.map.signalMarkers.map(marker => {
    const node = signalNode(
      document,
      state.signal.phase,
      "route-signal-marker",
      marker,
      true
    );
    node.dataset.crossingId = marker.crossingId;
    node.dataset.side = marker.side;
    world.append(node);
    return node;
    })
    : [signalNode(
      document,
      state.signal.phase,
      "route-signal",
      state.map.signalGate,
      true
    )];
  if (!state.map.signalMarkers?.length) world.append(signalMarkers[0]);

  state.map.hazards.forEach(hazard => {
    const cells = hazard.cells?.length ? hazard.cells : [hazard];
    cells.forEach(point => {
      const footprint = routeCell(
        document,
        point,
        `route-hazard-footprint route-hazard-footprint-${hazard.type}`
      );
      footprint.dataset.hazard = hazard.type;
      world.append(footprint);
    });

    const node = document.createElement("div");
    node.className = `route-hazard route-${hazard.type}`;
    node.dataset.hazard = hazard.type;
    node.style.setProperty(
      "--hazard-span",
      Math.max(...cells.map(point => point.y)) -
        Math.min(...cells.map(point => point.y)) + 1
    );
    node.setAttribute(
      "aria-label",
      HAZARD_LABELS[hazard.type] ?? hazard.type
    );
    node.setAttribute("role", "img");
    world.append(placeAt(node, hazard));
  });

  const moverNodes = new Map();
  state.movers.forEach(mover => {
    const point = moverPoint(state.map, mover);
    if (!point) return;
    const node = document.createElement("div");
    const riderClass = mover.type === "scooter" || mover.type === "bicycle"
      ? " route-moving-rider"
      : "";
    node.className = `route-hazard route-${mover.type}${riderClass}`;
    node.dataset.hazard = mover.type;
    node.setAttribute(
      "aria-label",
      HAZARD_LABELS[mover.type] ?? mover.type
    );
    node.setAttribute("role", "img");
    world.append(placeAt(node, point));
    moverNodes.set(mover.id, node);
  });

  const friendNodes = new Map();
  state.map.friends.forEach(friend => {
    const image = characterImage(
      document,
      friend.number,
      "route-character route-friend"
    );
    image.dataset.place = friend.place;
    world.append(placeAt(image, friend));
    friendNodes.set(friend.number, image);
  });

  const player = characterImage(
    document,
    1,
    "route-character route-player"
  );
  world.append(placeAt(player, state.position));

  const school = document.createElement("div");
  school.className = "route-school-goal";
  school.textContent = "도착";
  school.setAttribute("aria-label", "학교 도착점");
  world.append(placeAt(school, state.map.goal));

  const guidanceNodes = Array.from({ length: 3 }, () => {
    const node = routeCell(document, { x: 0, y: 0 }, "route-guidance-cell");
    node.hidden = true;
    world.append(node);
    return node;
  });

  viewport.append(world);
  const arrow = document.createElement("div");
  arrow.className = "route-target-arrow";
  arrow.setAttribute("aria-label", "다음 친구 방향");
  arrow.hidden = true;
  viewport.append(arrow);

  const pad = routePad(document);
  root.append(viewport, pad);
  root._safetyRouteView = {
    document,
    goal,
    collected,
    viewport,
    world,
    signalNodes: signalMarkers,
    moverNodes,
    friendNodes,
    player,
    guidanceNodes,
    arrow,
    pad
  };
  updateSafetyRouteScene(root, state, {
    ...requestedView,
    camera: cameraStart
  });

  if (
    requestedView.cameraStart &&
    typeof requestedView.scheduleFrame === "function" &&
    (cameraStart.x !== view.camera.x || cameraStart.y !== view.camera.y)
  ) {
    requestedView.scheduleFrame(() => {
      setWorldCamera(world, view.camera);
    });
  }
  return root;
}

export function updateSafetyRouteScene(root, state, requestedView = {}) {
  const nodes = root?._safetyRouteView;
  if (!nodes) throw new TypeError("A mounted safety route scene is required");
  const view = resolvedView(state, requestedView);
  root.dataset.difficulty = state.difficulty;
  nodes.goal.textContent =
    state.nextFriend <= 10
      ? `다음은 ${state.nextFriend} 친구를 만나러 가요!`
      : "친구들과 학교로 가요!";

  const collectedKey = state.collected.join(",");
  if (nodes.collected.dataset.numbers !== collectedKey) {
    nodes.collected.dataset.numbers = collectedKey;
    nodes.collected.setAttribute("aria-label", `만난 친구 ${collectedKey}`);
    nodes.collected.replaceChildren(...state.collected.map(number =>
      characterImage(nodes.document, number, "collected-friend")
    ));
  }

  nodes.viewport.style.setProperty("--viewport-cols", view.camera.width);
  nodes.viewport.style.setProperty("--viewport-rows", view.camera.height);
  setWorldCamera(nodes.world, view.camera);

  nodes.signalNodes.forEach(node => {
    node.dataset.phase = state.signal.phase;
    node.setAttribute(
      "aria-label",
      state.signal.phase === "pedestrian-go" ? "초록 신호" : "빨간 신호"
    );
  });

  state.movers.forEach(mover => {
    const node = nodes.moverNodes.get(mover.id);
    const point = moverPoint(state.map, mover);
    if (!node || !point) return;
    const definition = state.map.trafficPaths.find(path => path.id === mover.id);
    placeAt(node, point);
    node.dataset.direction = String(mover.direction);
    node.dataset.stopped = String(Boolean(mover.stopped));
    node.dataset.heading =
      mover.heading ?? definition?.headings?.[mover.pathIndex] ?? "";
  });

  nodes.friendNodes.forEach((node, number) => {
    node.hidden = state.collected.includes(number);
  });
  placeAt(nodes.player, state.position);

  nodes.guidanceNodes.forEach((node, index) => {
    const point = view.guidance[index];
    node.hidden = !point;
    if (point) placeAt(node, point);
  });

  nodes.arrow.hidden = !view.targetArrow.visible;
  if (view.targetArrow.visible) {
    nodes.arrow.style.setProperty("--arrow-x", view.targetArrow.x);
    nodes.arrow.style.setProperty("--arrow-y", view.targetArrow.y);
    nodes.arrow.style.setProperty("--arrow-angle", `${view.targetArrow.angle}rad`);
  }
  return root;
}
