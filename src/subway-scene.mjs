import { characterAsset } from "./character-spec.mjs";
import {
  STATION_COORDS,
  SUBWAY_LINES,
  linesAtStation,
  lineByNumber
} from "./subway-map-data.mjs";
import {
  currentLeg,
  currentTrain,
  rideStation,
  subwayAnnouncement
} from "./subway-journey.mjs";
import {
  lineBadgeSvg,
  lineTextColor,
  mapTrainSvg,
  subwayTrainSvg
} from "./subway-art.mjs";

const MAP_SCALE = 10;
const MAP_PAD = 7;

const RIVER_POINTS = [
  [0, 55], [10, 56], [20, 57], [28, 60], [33, 61], [38, 59], [44, 57],
  [50, 56], [56, 54], [62, 50], [68, 48], [74, 48], [80, 47], [88, 44],
  [100, 42]
];
const PARKS = [
  { x: 49, y: 46.5, rx: 2.8, ry: 2.1 },
  { x: 52, y: 33, rx: 2.1, ry: 1.7 },
  { x: 66, y: 43.5, rx: 2.1, ry: 1.6 },
  { x: 23, y: 42, rx: 2.3, ry: 1.8 },
  { x: 74, y: 39, rx: 2, ry: 1.6 },
  { x: 81, y: 51, rx: 2.2, ry: 1.7 },
  { x: 46, y: 89, rx: 4.2, ry: 2.6 }
];

const TRANSFER_LABELS = Object.freeze({
  0: "바로 가요",
  1: "🚶 1번 갈아타요",
  2: "🚶🚶 2번 갈아타요"
});

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

export function renderSubwayPicker(document, destinations) {
  const root = document.createElement("div");
  root.className = "subway-picker";

  const title = document.createElement("h2");
  title.className = "subway-picker-title";
  title.textContent = "🚇 어디로 갈까요?";
  root.append(title);

  const note = document.createElement("p");
  note.className = "subway-picker-note";
  note.textContent = "숫자키를 누르거나 카드를 골라요";
  root.append(note);

  const grid = document.createElement("div");
  grid.className = "subway-picker-grid";
  destinations.forEach(({ place, transfers }, index) => {
    const digit = (index + 1) % 10;
    const card = document.createElement("button");
    card.type = "button";
    card.className = "subway-place-card";
    card.dataset.placeId = place.id;
    card.dataset.transfers = String(transfers);
    card.setAttribute(
      "aria-label",
      `${place.label} — ${TRANSFER_LABELS[transfers]}`
    );
    card.setAttribute("aria-keyshortcuts", String(digit));

    const key = document.createElement("span");
    key.className = "subway-place-key";
    key.textContent = String(digit);
    const icon = document.createElement("span");
    icon.className = "subway-place-icon";
    icon.textContent = place.icon;
    icon.setAttribute("aria-hidden", "true");
    const label = document.createElement("strong");
    label.className = "subway-place-label";
    label.textContent = place.label;
    const chip = document.createElement("span");
    chip.className = "subway-transfer-chip";
    chip.dataset.transfers = String(transfers);
    chip.textContent = TRANSFER_LABELS[transfers];

    card.append(key, icon, label, chip);
    grid.append(card);
  });
  root.append(grid);
  return root;
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

function arcPath(cx, cy, radius, startAngle, endAngle) {
  const toPoint = angle => {
    const rad = ((angle - 90) * Math.PI) / 180;
    return [
      (cx + radius * Math.cos(rad)).toFixed(1),
      (cy + radius * Math.sin(rad)).toFixed(1)
    ];
  };
  const [sx, sy] = toPoint(startAngle);
  const [ex, ey] = toPoint(endAngle);
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${sx} ${sy} A ${radius} ${radius} 0 ${large} 1 ${ex} ${ey}`;
}

function transferRing(point, lines, radius, width, opacity) {
  const cx = point.x * MAP_SCALE;
  const cy = point.y * MAP_SCALE;
  const slice = 360 / lines.length;
  const gap = lines.length > 1 ? 8 : 0;
  return lines.map((line, index) =>
    `<path d="${arcPath(cx, cy, radius, index * slice + gap / 2,
      (index + 1) * slice - gap / 2)}" fill="none" stroke="${line.color}" ` +
    `stroke-width="${width}" stroke-linecap="round" opacity="${opacity}"/>`
  ).join("");
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
  parts.push(`<rect x="-200" y="-200" width="1400" height="1400" fill="#f2f7ef"/>`);
  parts.push(
    `<polyline class="subway-map-river" points="${RIVER_POINTS
      .map(([x, y]) => `${x * MAP_SCALE},${y * MAP_SCALE}`).join(" ")}" ` +
    `fill="none" stroke="#cfe4f4" stroke-width="30" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>`
  );
  PARKS.forEach(park => {
    parts.push(
      `<ellipse class="subway-map-park" cx="${park.x * MAP_SCALE}" ` +
      `cy="${park.y * MAP_SCALE}" rx="${park.rx * MAP_SCALE}" ` +
      `ry="${park.ry * MAP_SCALE}" fill="#ddeecb"/>`
    );
  });
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
      `stroke="${line.color}" stroke-width="${active ? 12 : 5}" ` +
      `stroke-linecap="round" stroke-linejoin="round" ` +
      `opacity="${active ? 1 : 0.3}"/>`
    );
  });
  const drawn = new Set();
  SUBWAY_LINES.forEach(line => {
    line.stations.forEach(name => {
      if (drawn.has(name)) return;
      drawn.add(name);
      const point = STATION_COORDS[name];
      const stationLines = linesAtStation(name);
      const onRoute = routeStations.has(name);
      const transfer = stationLines.length >= 2;
      const cx = point.x * MAP_SCALE;
      const cy = point.y * MAP_SCALE;
      if (transfer) {
        parts.push(
          `<circle class="subway-station-dot" data-station="${name}" ` +
          `data-on-route="${onRoute}" cx="${cx}" cy="${cy}" ` +
          `r="${onRoute ? 12 : 7}" fill="#fff" opacity="${onRoute ? 1 : 0.75}"/>`
        );
        parts.push(transferRing(
          point,
          stationLines,
          onRoute ? 14 : 8,
          onRoute ? 6 : 3.5,
          onRoute ? 1 : 0.5
        ));
      } else {
        parts.push(
          `<circle class="subway-station-dot" data-station="${name}" ` +
          `data-on-route="${onRoute}" cx="${cx}" cy="${cy}" ` +
          `r="${onRoute ? 10 : 5}" fill="#fff" ` +
          `stroke="${stationLines[0].color}" ` +
          `stroke-width="${onRoute ? 5 : 2.6}" opacity="${onRoute ? 1 : 0.55}"/>`
        );
      }
      if (onRoute) {
        const dy = (routeOrder.get(name) ?? 0) % 2 === 0 ? -24 : 42;
        parts.push(
          `<text class="subway-station-name" x="${cx}" y="${cy + dy}" ` +
          `text-anchor="middle" font-size="18" font-weight="900" ` +
          `fill="#31445b" stroke="#fff" stroke-width="6" ` +
          `paint-order="stroke">${name}</text>`
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

function capsuleTexts(state) {
  const leg = currentLeg(state);
  const stopIndex = state.ride.stopIndex;
  const lastIndex = leg.stations.length - 1;
  const remaining = lastIndex - stopIndex;
  return {
    prev: stopIndex > 0 ? `← ${leg.stations[stopIndex - 1]}` : "출발",
    now: leg.stations[stopIndex],
    next: stopIndex < lastIndex ? `${leg.stations[stopIndex + 1]} →` : "종점",
    remaining: remaining === 0
      ? "이번 역에서 내려요!"
      : `내릴 역까지 ${remaining}정거장`
  };
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
  const leg = currentLeg(state);
  const lineColor = lineByNumber(leg.line).color;

  const map = document.createElement("div");
  map.className = "subway-map";
  map.innerHTML = mapSvg(state, bounds);

  const fit = document.createElement("div");
  fit.className = "subway-map-fit";
  fit.style.setProperty(
    "--map-aspect",
    (bounds.width / bounds.height).toFixed(4)
  );
  const marker = document.createElement("span");
  marker.className = "subway-map-player";
  marker.innerHTML = mapTrainSvg(lineColor);
  placeDot(marker, bounds, rideStation(state));
  fit.append(marker);
  map.append(fit);

  const overlay = document.createElement("div");
  overlay.className = "subway-overlay";

  const banner = document.createElement("div");
  banner.className = "subway-ride-banner";
  const announcement = document.createElement("span");
  announcement.className = "subway-announcement";
  announcement.setAttribute("role", "status");
  announcement.textContent = subwayAnnouncement(state);
  const door = document.createElement("span");
  door.className = "subway-door-state";
  door.dataset.open = String(Boolean(state.ride.doorOpen));
  door.textContent = state.ride.doorOpen ? "🚪 열림 — ↓ 키로 내려요" : "🚪 닫힘";
  banner.append(announcement, door);
  overlay.append(banner);

  const texts = capsuleTexts(state);
  const capsule = document.createElement("div");
  capsule.className = "subway-capsule";
  capsule.style.setProperty("--line-color", lineColor);
  capsule.style.setProperty("--line-text", lineTextColor(lineColor));
  const prev = document.createElement("span");
  prev.className = "subway-capsule-side subway-capsule-prev";
  prev.textContent = texts.prev;
  const now = document.createElement("span");
  now.className = "subway-capsule-now";
  const nowBadge = document.createElement("span");
  nowBadge.className = "subway-line-badge subway-capsule-badge";
  nowBadge.innerHTML = lineBadgeSvg(leg.line, lineColor);
  const nowName = document.createElement("strong");
  nowName.className = "subway-capsule-name";
  nowName.textContent = texts.now;
  const remaining = document.createElement("span");
  remaining.className = "subway-capsule-remaining";
  remaining.textContent = texts.remaining;
  now.append(nowBadge, nowName, remaining);
  const next = document.createElement("span");
  next.className = "subway-capsule-side subway-capsule-next";
  next.textContent = texts.next;
  capsule.append(prev, now, next);
  overlay.append(capsule);

  map.append(overlay);
  ride.append(map);
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
  pad.setAttribute("role", "group");
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
    const texts = capsuleTexts(state);
    const prev = root.querySelector?.(".subway-capsule-prev");
    if (prev) prev.textContent = texts.prev;
    const nowName = root.querySelector?.(".subway-capsule-name");
    if (nowName) nowName.textContent = texts.now;
    const next = root.querySelector?.(".subway-capsule-next");
    if (next) next.textContent = texts.next;
    const remaining = root.querySelector?.(".subway-capsule-remaining");
    if (remaining) remaining.textContent = texts.remaining;
  }
  return root;
}
