import { characterAsset } from "./character-spec.mjs";
import {
  CAR_SHAPES,
  CAR_SHAPE_LABELS,
  RIDE_DOOR,
  SRT_CARS,
  SRT_STATIONS,
  TRAIN_HEIGHT,
  TRAIN_WIDTH,
  rideAnnouncement,
  seatInfo,
  targetSeatName,
  trainWalkable
} from "./srt-journey.mjs";

function playerImage(document) {
  const image = document.createElement("img");
  image.className = "srt-player";
  image.src = `assets/characters/${characterAsset(1)}`;
  image.alt = "숫자 1 블록 친구";
  return image;
}

function missionText(state) {
  if (state.phase === "seat") {
    return `${targetSeatName(state)} 좌석을 찾아요!`;
  }
  if (state.phase === "ride") {
    return `${state.targetStation}역에 내려야 해요!`;
  }
  if (state.phase === "parking") {
    return "할아버지 할머니 차를 찾아보아요!";
  }
  return "할아버지 할머니를 만났어요!";
}

function renderSeatPhase(document, state, stage) {
  const world = document.createElement("div");
  world.className = "srt-train";
  world.style.setProperty("--srt-cols", TRAIN_WIDTH);
  world.style.setProperty("--srt-rows", TRAIN_HEIGHT);

  for (let car = 1; car <= SRT_CARS; car += 1) {
    const banner = document.createElement("div");
    banner.className = "srt-car-banner";
    banner.textContent = `${car}호차`;
    banner.style.setProperty("--srt-x", 5 * (car - 1) + 2);
    world.append(banner);
  }

  for (let y = 0; y < TRAIN_HEIGHT; y += 1) {
    for (let x = 0; x < TRAIN_WIDTH; x += 1) {
      const cell = document.createElement("div");
      const seat = seatInfo(x, y);
      cell.className = seat
        ? "srt-cell srt-seat"
        : y === 2
          ? "srt-cell srt-corridor"
          : trainWalkable(x, y)
            ? "srt-cell"
            : "srt-cell srt-vestibule";
      cell.style.setProperty("--srt-x", x + 1);
      cell.style.setProperty("--srt-y", y + 1);
      if (seat) {
        cell.textContent = `${seat.row}${seat.letter}`;
        cell.dataset.seat = seat.name;
      }
      world.append(cell);
    }
  }
  stage.append(world);
  return world;
}

function renderRidePhase(document, state, stage) {
  const room = document.createElement("div");
  room.className = "srt-ride";

  const windowStrip = document.createElement("div");
  windowStrip.className = "srt-window";
  SRT_STATIONS.forEach((station, index) => {
    const stop = document.createElement("span");
    stop.className = "srt-station";
    stop.dataset.station = station;
    stop.textContent = `${station}`;
    if (index === state.ride.stationIndex) stop.dataset.current = "true";
    if (station === state.targetStation) stop.dataset.target = "true";
    windowStrip.append(stop);
  });
  room.append(windowStrip);

  const announcement = document.createElement("div");
  announcement.className = "srt-announcement";
  announcement.textContent = rideAnnouncement(state);
  room.append(announcement);

  const floor = document.createElement("div");
  floor.className = "srt-ride-floor";
  for (let y = 0; y <= 2; y += 1) {
    for (let x = 0; x <= 4; x += 1) {
      const cell = document.createElement("div");
      const isDoor = x === RIDE_DOOR.x && y === RIDE_DOOR.y;
      cell.className = isDoor ? "srt-cell srt-door" : "srt-cell";
      cell.style.setProperty("--srt-x", x + 1);
      cell.style.setProperty("--srt-y", y + 1);
      if (isDoor) {
        cell.dataset.open = String(Boolean(state.ride.doorOpen));
        cell.textContent = state.ride.doorOpen ? "🚪 열림" : "🚪";
      }
      floor.append(cell);
    }
  }
  room.append(floor);
  stage.append(room);
  return floor;
}

function renderParkingPhase(document, state, stage) {
  const lot = document.createElement("div");
  lot.className = "srt-parking";

  const silhouette = document.createElement("div");
  silhouette.className = "srt-silhouette";
  const shadow = document.createElement("span");
  shadow.className =
    `srt-car-shape srt-car-shadow srt-shape-${CAR_SHAPES[state.carShapeIndex]}`;
  shadow.setAttribute("role", "img");
  shadow.setAttribute("aria-label", "찾아야 하는 차 그림자");
  const hint = document.createElement("span");
  hint.className = "srt-silhouette-hint";
  hint.textContent = "이 그림자와 같은 차를 찾아요";
  silhouette.append(shadow, hint);
  lot.append(silhouette);

  const row = document.createElement("div");
  row.className = "srt-parking-row";
  CAR_SHAPES.forEach((shape, index) => {
    const slot = document.createElement("div");
    slot.className = "srt-parking-slot";
    slot.style.setProperty("--srt-x", index + 1);
    const art = document.createElement("span");
    art.className = `srt-car-shape srt-shape-${shape}`;
    art.setAttribute("role", "img");
    art.setAttribute("aria-label", CAR_SHAPE_LABELS[shape]);
    slot.append(art);
    row.append(slot);
  });
  lot.append(row);

  const walk = document.createElement("div");
  walk.className = "srt-parking-walk";
  lot.append(walk);
  stage.append(lot);
  return walk;
}

export function renderSrtJourney(document, state) {
  const root = document.createElement("div");
  root.className = "srt-journey";
  root.dataset.phase = state.phase;

  const mission = document.createElement("div");
  mission.className = "srt-mission";
  mission.textContent = missionText(state);
  root.append(mission);

  const stage = document.createElement("div");
  stage.className = "srt-stage";
  root.append(stage);

  let playerLayer = null;
  if (state.phase === "seat") playerLayer = renderSeatPhase(document, state, stage);
  else if (state.phase === "ride") playerLayer = renderRidePhase(document, state, stage);
  else if (state.phase === "parking") playerLayer = renderParkingPhase(document, state, stage);

  const pad = document.createElement("div");
  pad.className = "route-pad";
  pad.setAttribute("aria-label", "기차 여행 이동");
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
  root.append(pad);

  const player = playerImage(document);
  player.style.setProperty("--srt-x", state.position.x + 1);
  player.style.setProperty("--srt-y", state.position.y + 1);
  if (playerLayer) playerLayer.append(player);
  else stage.append(player);

  root._srtView = { document, mission, stage, player, phase: state.phase };
  updateSrtJourney(root, state);
  return root;
}

export function updateSrtJourney(root, state) {
  const view = root?._srtView;
  if (!view) throw new TypeError("A rendered SRT journey is required");
  if (view.phase !== state.phase) {
    const rebuilt = renderSrtJourney(view.document, state);
    root.replaceChildren(...rebuilt.children);
    root.dataset.phase = state.phase;
    root._srtView = rebuilt._srtView;
    return root;
  }
  view.mission.textContent = missionText(state);
  view.player.style.setProperty("--srt-x", state.position.x + 1);
  view.player.style.setProperty("--srt-y", state.position.y + 1);
  if (state.phase === "seat") {
    root.style.setProperty(
      "--srt-camera-x",
      Math.max(0, Math.min(state.position.x - 4, TRAIN_WIDTH - 9))
    );
  }
  if (state.phase === "ride") {
    const announcement = root.querySelector?.(".srt-announcement");
    if (announcement) announcement.textContent = rideAnnouncement(state);
    const door = root.querySelector?.(".srt-door");
    if (door) {
      door.dataset.open = String(Boolean(state.ride.doorOpen));
      door.textContent = state.ride.doorOpen ? "🚪 열림" : "🚪";
    }
    const stations = root.querySelectorAll?.(".srt-station") ?? [];
    stations.forEach((stop, index) => {
      if (index === state.ride.stationIndex) stop.dataset.current = "true";
      else delete stop.dataset.current;
    });
  }
  return root;
}
