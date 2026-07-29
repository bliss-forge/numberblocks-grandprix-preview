import { characterAsset } from "./character-spec.mjs";
import {
  STATION_COORDS,
  SUBWAY_LINES,
  isTransferStation,
  lineByNumber
} from "./subway-map-data.mjs";
import {
  currentLeg,
  currentTrain,
  rideStation,
  subwayAnnouncement
} from "./subway-journey.mjs";
import { lineBadgeSvg, subwayTrainSvg } from "./subway-art.mjs";

const MAP_SCALE = 10;
const MAP_PAD = 7;

function playerImage(document) {
  const image = document.createElement("img");
  image.className = "subway-player";
  image.src = `assets/characters/${characterAsset(1)}`;
  image.alt = "숫자 1 블록 친구";
  return image;
}

function missionText(state) {
  const leg = currentLeg(state);
  if (state.phase === "platform") {
    return `${state.place.icon} ${state.place.label}에 가요! ${leg.line}호선을 타요`;
  }
  if (state.phase === "ride") {
    return `${leg.stations[leg.stations.length - 1]}역에서 내려요!`;
  }
  if (state.phase === "transfer") {
    return `${leg.line}호선으로 갈아타요!`;
  }
  return `${state.place.icon} ${state.place.label}에 도착했어요!`;
}

function routeBounds(state) {
  const points = state.legs.flatMap(leg =>
    leg.stations.map(name => STATION_COORDS[name])
  );
  const minX = Math.max(0, Math.min(...points.map(p => p.x)) - MAP_PAD);
  const maxX = Math.min(100, Math.max(...points.map(p => p.x)) + MAP_PAD);
  const minY = Math.max(0, Math.min(...points.map(p => p.y)) - MAP_PAD);
  const maxY = Math.min(100, Math.max(...points.map(p => p.y)) + MAP_PAD);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function mapSvg(state, bounds) {
  const routeOrder = new Map();
  state.legs.flatMap(leg => leg.stations).forEach(name => {
    if (!routeOrder.has(name)) routeOrder.set(name, routeOrder.size);
  });
  const routeStations = new Set(routeOrder.keys());
  const activeLines = new Set(state.legs.map(leg => leg.line));
  const parts = [];
  parts.push(
    `<svg class="subway-map-art" viewBox="${bounds.minX * MAP_SCALE} ` +
    `${bounds.minY * MAP_SCALE} ${bounds.width * MAP_SCALE} ` +
    `${bounds.height * MAP_SCALE}" role="img" aria-hidden="true" ` +
    `preserveAspectRatio="xMidYMid meet" focusable="false">`
  );
  SUBWAY_LINES.forEach(line => {
    const names = line.loop
      ? [...line.stations, line.stations[0]]
      : line.stations;
    const points = names
      .map(name => STATION_COORDS[name])
      .map(p => `${p.x * MAP_SCALE},${p.y * MAP_SCALE}`)
      .join(" ");
    const active = activeLines.has(line.number);
    parts.push(
      `<polyline class="subway-line" data-line="${line.number}" ` +
      `data-active="${active}" points="${points}" fill="none" ` +
      `stroke="${line.color}" stroke-width="${active ? 11 : 6}" ` +
      `stroke-linecap="round" stroke-linejoin="round" ` +
      `opacity="${active ? 1 : 0.22}"/>`
    );
  });
  const drawn = new Set();
  SUBWAY_LINES.forEach(line => {
    line.stations.forEach(name => {
      if (drawn.has(name)) return;
      drawn.add(name);
      const point = STATION_COORDS[name];
      const onRoute = routeStations.has(name);
      const transfer = isTransferStation(name);
      const radius = onRoute ? (transfer ? 13 : 10) : transfer ? 8 : 5;
      parts.push(
        `<circle class="subway-station-dot" data-station="${name}" ` +
        `data-on-route="${onRoute}" cx="${point.x * MAP_SCALE}" ` +
        `cy="${point.y * MAP_SCALE}" r="${radius}" fill="#fff" ` +
        `stroke="#31445b" stroke-width="${onRoute ? 5 : 2.5}" ` +
        `opacity="${onRoute ? 1 : 0.45}"/>`
      );
      if (onRoute) {
        const dy = (routeOrder.get(name) ?? 0) % 2 === 0 ? -20 : 36;
        parts.push(
          `<text class="subway-station-name" x="${point.x * MAP_SCALE}" ` +
          `y="${point.y * MAP_SCALE + dy}" text-anchor="middle" ` +
          `font-size="17" font-weight="900" fill="#31445b" ` +
          `stroke="#fff" stroke-width="5" paint-order="stroke">${name}</text>`
        );
      }
    });
  });
  parts.push("</svg>");
  return parts.join("");
}

function placeDot(node, bounds, station) {
  const point = STATION_COORDS[station];
  node.style.setProperty(
    "--map-x",
    `${((point.x - bounds.minX) / bounds.width) * 100}%`
  );
  node.style.setProperty(
    "--map-y",
    `${((point.y - bounds.minY) / bounds.height) * 100}%`
  );
  return node;
}

function renderPlatformPhase(document, state, stage) {
  const platform = document.createElement("div");
  platform.className = "subway-platform";

  const sign = document.createElement("div");
  sign.className = "subway-station-sign";
  sign.textContent = `${state.platform.station}역`;
  platform.append(sign);

  const goal = document.createElement("div");
  goal.className = "subway-line-goal";
  const badge = document.createElement("span");
  badge.className = "subway-line-badge";
  badge.innerHTML = lineBadgeSvg(
    currentLeg(state).line,
    lineByNumber(currentLeg(state).line).color
  );
  const text = document.createElement("span");
  text.className = "subway-line-goal-text";
  text.textContent = `${currentLeg(state).line}호선이 서면 ↑ 키로 타요!`;
  goal.append(badge, text);
  platform.append(goal);

  const track = document.createElement("div");
  track.className = "subway-track";
  const train = document.createElement("div");
  train.className = "subway-train";
  const arriving = currentTrain(state);
  train.dataset.stage = state.platform.stage;
  train.dataset.line = String(arriving.line);
  train.setAttribute("role", "img");
  train.setAttribute("aria-label", `${arriving.line}호선 열차`);
  train.innerHTML = subwayTrainSvg(arriving.line, arriving.color);
  track.append(train);
  platform.append(track);

  const edge = document.createElement("div");
  edge.className = "subway-platform-edge";
  platform.append(edge);

  stage.append(platform);
  return platform;
}

function renderRidePhase(document, state, stage) {
  const ride = document.createElement("div");
  ride.className = "subway-ride";
  const bounds = routeBounds(state);

  const map = document.createElement("div");
  map.className = "subway-map";
  map.innerHTML = mapSvg(state, bounds);

  const marker = document.createElement("span");
  marker.className = "subway-map-player";
  const hero = playerImage(document);
  marker.append(hero);
  placeDot(marker, bounds, rideStation(state));
  map.append(marker);
  ride.append(map);

  const banner = document.createElement("div");
  banner.className = "subway-ride-banner";
  const announcement = document.createElement("span");
  announcement.className = "subway-announcement";
  announcement.textContent = subwayAnnouncement(state);
  const door = document.createElement("span");
  door.className = "subway-door-state";
  door.dataset.open = String(Boolean(state.ride.doorOpen));
  door.textContent = state.ride.doorOpen ? "🚪 열림 — ↓ 키로 내려요" : "🚪 닫힘";
  banner.append(announcement, door);
  ride.append(banner);

  stage.append(ride);
  return ride;
}

function renderTransferPhase(document, state, stage) {
  const leg = currentLeg(state);
  const splash = document.createElement("div");
  splash.className = "subway-transfer";
  const badge = document.createElement("span");
  badge.className = "subway-line-badge subway-transfer-badge";
  badge.innerHTML = lineBadgeSvg(leg.line, lineByNumber(leg.line).color);
  const text = document.createElement("span");
  text.className = "subway-transfer-text";
  text.textContent = `🚶 ${leg.stations[0]}역에서 ${leg.line}호선으로 갈아타요!`;
  splash.append(badge, text);
  stage.append(splash);
  return splash;
}

function renderArrivedPhase(document, state, stage) {
  const ending = document.createElement("div");
  ending.className = "subway-arrived";
  const icon = document.createElement("span");
  icon.className = "subway-place-icon";
  icon.textContent = state.place.icon;
  icon.setAttribute("role", "img");
  icon.setAttribute("aria-label", state.place.label);
  const hero = playerImage(document);
  hero.className = "subway-player subway-arrived-player";
  const hearts = document.createElement("span");
  hearts.className = "subway-arrived-hearts";
  hearts.textContent = "💛 💚 💙";
  hearts.setAttribute("aria-hidden", "true");
  ending.append(hearts, icon, hero);
  stage.append(ending);
  return ending;
}

export function renderSubwayJourney(document, state) {
  const root = document.createElement("div");
  root.className = "subway-journey";
  root.dataset.phase = state.phase;

  const mission = document.createElement("div");
  mission.className = "subway-mission";
  mission.textContent = missionText(state);
  root.append(mission);

  const stage = document.createElement("div");
  stage.className = "subway-stage";
  root.append(stage);

  if (state.phase === "platform") renderPlatformPhase(document, state, stage);
  else if (state.phase === "ride") renderRidePhase(document, state, stage);
  else if (state.phase === "transfer") renderTransferPhase(document, state, stage);
  else renderArrivedPhase(document, state, stage);

  const pad = document.createElement("div");
  pad.className = "route-pad";
  pad.setAttribute("aria-label", "지하철 이동");
  for (const [direction, label, symbol] of [
    ["up", "타요", "↑"],
    ["left", "왼쪽", "←"],
    ["down", "내려요", "↓"],
    ["right", "오른쪽", "→"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.routeDirection = direction;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    pad.append(button);
  }
  root.append(pad);

  root._subwayView = { document, mission, stage, phase: state.phase };
  return root;
}

export function updateSubwayJourney(root, state) {
  const view = root?._subwayView;
  if (!view) throw new TypeError("A rendered subway journey is required");
  if (view.phase !== state.phase) {
    const rebuilt = renderSubwayJourney(view.document, state);
    root.replaceChildren(...rebuilt.children);
    root.dataset.phase = state.phase;
    root._subwayView = rebuilt._subwayView;
    return root;
  }
  view.mission.textContent = missionText(state);
  if (state.phase === "platform") {
    const train = root.querySelector?.(".subway-train");
    if (train) {
      const arriving = currentTrain(state);
      if (train.dataset.line !== String(arriving.line)) {
        train.dataset.line = String(arriving.line);
        train.setAttribute("aria-label", `${arriving.line}호선 열차`);
        train.innerHTML = subwayTrainSvg(arriving.line, arriving.color);
      }
      train.dataset.stage = state.platform.stage;
    }
  }
  if (state.phase === "ride") {
    const bounds = routeBounds(state);
    const marker = root.querySelector?.(".subway-map-player");
    if (marker) placeDot(marker, bounds, rideStation(state));
    const announcement = root.querySelector?.(".subway-announcement");
    if (announcement) announcement.textContent = subwayAnnouncement(state);
    const door = root.querySelector?.(".subway-door-state");
    if (door) {
      door.dataset.open = String(Boolean(state.ride.doorOpen));
      door.textContent = state.ride.doorOpen
        ? "🚪 열림 — ↓ 키로 내려요"
        : "🚪 닫힘";
    }
  }
  return root;
}
