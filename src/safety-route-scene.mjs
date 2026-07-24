import { characterAsset } from "./character-spec.mjs";

const PLACE_LABELS = Object.freeze({
  home: "우리 집",
  daycare: "어린이집",
  shops: "상가",
  roadside: "길가",
  park: "공원",
  "bus-stop": "버스 정류장",
  library: "도서관",
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

function currentMoverPoint(state, moverState) {
  const mover = state.map.trafficPaths.find(
    item => item.id === moverState.id
  );
  return mover?.points[moverState.pathIndex] ?? null;
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
  const view = {
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
  const root = document.createElement("div");
  root.className = "safety-route";
  root.dataset.difficulty = state.difficulty;

  const top = document.createElement("div");
  top.className = "safety-route-top";

  const goal = document.createElement("div");
  goal.className = "safety-goal";
  goal.textContent =
    state.nextFriend <= 10
      ? `다음은 ${state.nextFriend} 친구를 만나러 가요!`
      : "친구들과 학교로 가요!";
  top.append(goal);

  const collected = document.createElement("div");
  collected.className = "safety-collected";
  collected.setAttribute(
    "aria-label",
    `만난 친구 ${state.collected.join(", ")}`
  );
  state.collected.forEach(number => {
    collected.append(
      characterImage(document, number, "collected-friend")
    );
  });
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
  world.style.setProperty("--camera-x", view.camera.x);
  world.style.setProperty("--camera-y", view.camera.y);

  const crossingKeys = new Set(
    state.map.crossings
      .flatMap(crossing => crossing.cells)
      .map(point => `${point.x},${point.y}`)
  );
  const trafficPoints = new Map();
  state.map.trafficPaths.forEach(path => {
    path.points.forEach(point => {
      trafficPoints.set(`${point.x},${point.y}`, point);
    });
  });
  trafficPoints.forEach(point => {
    const className = crossingKeys.has(`${point.x},${point.y}`)
      ? "route-road route-crosswalk"
      : "route-road";
    world.append(routeCell(document, point, className));
  });

  state.map.pedestrianCells.forEach(point => {
    const className = crossingKeys.has(`${point.x},${point.y}`)
      ? "route-sidewalk route-crosswalk"
      : "route-sidewalk";
    world.append(routeCell(document, point, className));
  });

  state.map.trafficPaths.forEach(path => {
    const stopPoint = path.points[path.stopIndex];
    if (stopPoint) {
      world.append(routeCell(document, stopPoint, "route-stop-line"));
    }
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

  const signal = document.createElement("div");
  signal.className = "route-signal";
  signal.dataset.phase = state.signal.phase;
  signal.setAttribute(
    "aria-label",
    state.signal.phase === "pedestrian-go" ? "초록 신호" : "빨간 신호"
  );
  world.append(placeAt(signal, state.map.signalGate));

  state.map.hazards.forEach(hazard => {
    const node = document.createElement("div");
    node.className = `route-hazard route-${hazard.type}`;
    node.dataset.hazard = hazard.type;
    node.setAttribute(
      "aria-label",
      HAZARD_LABELS[hazard.type] ?? hazard.type
    );
    world.append(placeAt(node, hazard));
  });

  state.movers.forEach(mover => {
    const point = currentMoverPoint(state, mover);
    if (!point) return;
    const node = document.createElement("div");
    node.className = `route-hazard route-${mover.type}`;
    node.dataset.hazard = mover.type;
    node.setAttribute(
      "aria-label",
      HAZARD_LABELS[mover.type] ?? mover.type
    );
    world.append(placeAt(node, point));
  });

  state.map.friends
    .filter(friend => !state.collected.includes(friend.number))
    .forEach(friend => {
      const image = characterImage(
        document,
        friend.number,
        "route-character route-friend"
      );
      image.dataset.place = friend.place;
      world.append(placeAt(image, friend));
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

  view.guidance.forEach(point => {
    world.append(routeCell(document, point, "route-guidance-cell"));
  });

  viewport.append(world);
  if (view.targetArrow.visible) {
    const arrow = document.createElement("div");
    arrow.className = "route-target-arrow";
    arrow.setAttribute("aria-label", "다음 친구 방향");
    arrow.style.setProperty("--arrow-x", view.targetArrow.x);
    arrow.style.setProperty("--arrow-y", view.targetArrow.y);
    arrow.style.setProperty("--arrow-angle", `${view.targetArrow.angle}rad`);
    viewport.append(arrow);
  }

  root.append(viewport, routePad(document));
  return root;
}
