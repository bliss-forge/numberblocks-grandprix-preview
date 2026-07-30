import { characterAsset } from "./character-spec.mjs";
import {
  STATION_COORDS,
  SUBWAY_LINES,
  isTransferStation,
  linesAtStation,
  lineByNumber
} from "./subway-map-data.mjs";
import {
  DIRECTION_ARROWS,
  directionTargets,
  dodgeLaneLabel,
  gateLines,
  subwayAnnouncement,
  subwayCompass
} from "./subway-journey.mjs";
import {
  lineBadgeSvg,
  lineTextColor,
  mapTrainSvg,
  subwayTrainSvg
} from "./subway-art.mjs";

const MAP_SCALE = 10;

const RIVER_POINTS = [
  [-4, 53], [6, 55], [13, 57], [20, 57.5], [25, 59], [29, 61.5],
  [33, 61.5], [36, 59.5], [40, 58], [44, 57], [48, 56.5], [52, 55.5],
  [57, 53.5], [61, 51], [65, 48.5], [70, 47.5], [75, 48], [79, 47.5],
  [84, 45.5], [90, 43], [96, 42.5], [104, 44]
];
const STREAMS = [
  [[63, 38], [64, 42], [65, 46], [66, 48.5]],
  [[24, 68], [23, 63], [21, 59], [20, 57.5]]
];
const PARKS = [
  { x: 49, y: 46.5, rx: 3.2, ry: 2.3 },
  { x: 52, y: 33, rx: 2.4, ry: 1.8 },
  { x: 66, y: 43.5, rx: 2.4, ry: 1.7 },
  { x: 23, y: 42, rx: 2.6, ry: 2 },
  { x: 74, y: 39, rx: 2.2, ry: 1.7 },
  { x: 81, y: 51, rx: 2.4, ry: 1.8 },
  { x: 46, y: 89, rx: 4.6, ry: 2.8 },
  { x: 42, y: 12, rx: 7, ry: 3.6 },
  { x: 20, y: 22, rx: 4, ry: 2.6 },
  { x: 38, y: 82, rx: 6, ry: 3.2 },
  { x: 70, y: 74, rx: 5, ry: 3 },
  { x: 88, y: 60, rx: 4.4, ry: 3 },
  { x: 8, y: 36, rx: 4, ry: 2.8 },
  { x: 90, y: 20, rx: 5, ry: 3.4 }
];

const TRANSFER_LABELS = Object.freeze({
  0: "권장: 바로 가요",
  1: "권장: 🚶 1번 환승",
  2: "권장: 🚶🚶 2번 환승"
});

function smoothPath(points) {
  const scaled = points.map(([x, y]) => [x * MAP_SCALE, y * MAP_SCALE]);
  let path = `M ${scaled[0][0]} ${scaled[0][1]}`;
  for (let index = 1; index < scaled.length - 1; index += 1) {
    const midX = (scaled[index][0] + scaled[index + 1][0]) / 2;
    const midY = (scaled[index][1] + scaled[index + 1][1]) / 2;
    path += ` Q ${scaled[index][0]} ${scaled[index][1]} ${midX} ${midY}`;
  }
  const last = scaled[scaled.length - 1];
  path += ` L ${last[0]} ${last[1]}`;
  return path;
}

function playerImage(document) {
  const image = document.createElement("img");
  image.className = "subway-player";
  image.src = `assets/characters/${characterAsset(1)}`;
  image.alt = "숫자 1 블록 친구";
  return image;
}

function passengerImage(document, number) {
  const image = document.createElement("img");
  image.className = "subway-passenger";
  image.src = `assets/characters/${characterAsset(number)}`;
  image.alt = `숫자 ${number} 블록 친구`;
  return image;
}

function fillPassengerStrip(document, strip, passengers) {
  strip.dataset.count = String(passengers.length);
  const label = document.createElement("span");
  label.className = "subway-passenger-label";
  label.textContent = passengers.length === 0
    ? "친구들을 태우러 가요!"
    : `함께 가는 친구 ${passengers.length}명`;
  strip.replaceChildren(
    label,
    ...passengers.slice(-8).map(number => passengerImage(document, number))
  );
  return strip;
}

function missionText(state) {
  const base = `${state.place.icon} ${state.place.label}에 가요!`;
  if (state.phase === "gate") return `${base} 호선을 골라요`;
  if (state.phase === "platform") return `${base} ${state.line}호선을 타요`;
  if (state.phase === "ride") return `${base} (${state.place.station}역)`;
  if (state.phase === "transferring") return "🚶 환승 중이에요!";
  if (state.phase === "arriving") return "조심조심 내려요!";
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

const MIN_SPAN_X = 66;
const MIN_SPAN_Y = 40;

function rideBounds(state) {
  const points = [
    STATION_COORDS[state.station],
    STATION_COORDS[state.place.station]
  ];
  let minX = Math.min(...points.map(p => p.x)) - 10;
  let maxX = Math.max(...points.map(p => p.x)) + 10;
  let minY = Math.min(...points.map(p => p.y)) - 10;
  let maxY = Math.max(...points.map(p => p.y)) + 10;
  if (maxX - minX < MIN_SPAN_X) {
    const grow = (MIN_SPAN_X - (maxX - minX)) / 2;
    minX -= grow;
    maxX += grow;
  }
  if (maxY - minY < MIN_SPAN_Y) {
    const grow = (MIN_SPAN_Y - (maxY - minY)) / 2;
    minY -= grow;
    maxY += grow;
  }
  minX = Math.max(-6, minX);
  maxX = Math.min(106, maxX);
  minY = Math.max(-6, minY);
  maxY = Math.min(106, maxY);
  return { minX, minY, width: maxX - minX, height: maxY - minY };
}

function boundsScale(bounds) {
  return Math.max(0.8, Math.min(1.15, bounds.width / 80));
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

function mapSvg(state, bounds, compass) {
  const u = boundsScale(bounds);
  const activeLine = state.line;
  const emphasize = new Set([state.station, state.place.station]);
  const parts = [];
  parts.push(
    `<svg class="subway-map-art" viewBox="${bounds.minX * MAP_SCALE} ` +
    `${bounds.minY * MAP_SCALE} ${bounds.width * MAP_SCALE} ` +
    `${bounds.height * MAP_SCALE}" role="img" aria-hidden="true" ` +
    `preserveAspectRatio="xMidYMid meet" focusable="false">`
  );
  parts.push(`<rect x="-300" y="-300" width="1700" height="1700" fill="#f3f7f0"/>`);
  PARKS.forEach(park => {
    parts.push(
      `<ellipse class="subway-map-park" cx="${park.x * MAP_SCALE}" ` +
      `cy="${park.y * MAP_SCALE}" rx="${park.rx * MAP_SCALE}" ` +
      `ry="${park.ry * MAP_SCALE}" fill="#dcead0"/>`
    );
  });
  STREAMS.forEach(stream => {
    parts.push(
      `<path class="subway-map-stream" d="${smoothPath(stream)}" ` +
      `fill="none" stroke="#cfe3f2" stroke-width="${(7 * u).toFixed(1)}" ` +
      `stroke-linecap="round"/>`
    );
  });
  parts.push(
    `<path class="subway-map-river" d="${smoothPath(RIVER_POINTS)}" ` +
    `fill="none" stroke="#cfe3f2" stroke-width="${(32 * u).toFixed(1)}" ` +
    `stroke-linecap="round" stroke-linejoin="round"/>`
  );
  SUBWAY_LINES.forEach(line => {
    const names = line.loop
      ? [...line.stations, line.stations[0]]
      : line.stations;
    const points = names
      .map(name => STATION_COORDS[name])
      .map(p => `${p.x * MAP_SCALE},${p.y * MAP_SCALE}`)
      .join(" ");
    const active = line.number === activeLine;
    parts.push(
      `<polyline class="subway-line" data-line="${line.number}" ` +
      `data-active="${active}" points="${points}" fill="none" ` +
      `stroke="${line.color}" ` +
      `stroke-width="${((active ? 5.5 : 3) * u).toFixed(1)}" ` +
      `stroke-linecap="round" stroke-linejoin="round" ` +
      `opacity="${active ? 1 : 0.45}"/>`
    );
    for (let index = 0; index < names.length - 1; index += 1) {
      const from = STATION_COORDS[names[index]];
      const to = STATION_COORDS[names[index + 1]];
      const distance = Math.hypot(to.x - from.x, to.y - from.y);
      const stops = Math.min(2, Math.floor(distance / 5));
      for (let stop = 1; stop <= stops; stop += 1) {
        const t = stop / (stops + 1);
        parts.push(
          `<circle class="subway-minor-stop" ` +
          `cx="${((from.x + (to.x - from.x) * t) * MAP_SCALE).toFixed(1)}" ` +
          `cy="${((from.y + (to.y - from.y) * t) * MAP_SCALE).toFixed(1)}" ` +
          `r="${(2.6 * u).toFixed(1)}" fill="#fff" stroke="${line.color}" ` +
          `stroke-width="${(1.6 * u).toFixed(1)}" ` +
          `opacity="${active ? 0.9 : 0.45}"/>`
        );
      }
    }
  });
  if (state.showRecommended && compass?.route) {
    compass.route.legs.forEach(leg => {
      const points = leg.stations
        .map(name => STATION_COORDS[name])
        .map(p => `${p.x * MAP_SCALE},${p.y * MAP_SCALE}`)
        .join(" ");
      parts.push(
        `<polyline class="subway-recommended" points="${points}" ` +
        `fill="none" stroke="#ffd54d" ` +
        `stroke-width="${(10 * u).toFixed(1)}" stroke-linecap="round" ` +
        `stroke-linejoin="round" opacity="0.55"/>`
      );
    });
  }
  const drawn = new Set();
  SUBWAY_LINES.forEach(line => {
    line.stations.forEach(name => {
      if (drawn.has(name)) return;
      drawn.add(name);
      const point = STATION_COORDS[name];
      const stationLines = linesAtStation(name);
      const focus = emphasize.has(name);
      const transfer = stationLines.length >= 2;
      const cx = point.x * MAP_SCALE;
      const cy = point.y * MAP_SCALE;
      if (transfer) {
        parts.push(
          `<circle class="subway-station-dot" data-station="${name}" ` +
          `data-focus="${focus}" cx="${cx}" cy="${cy}" ` +
          `r="${((focus ? 6.5 : 4.5) * u).toFixed(1)}" fill="#fff" ` +
          `opacity="${focus ? 1 : 0.85}"/>`
        );
        parts.push(transferRing(
          point,
          stationLines,
          (focus ? 8.5 : 6) * u,
          (focus ? 3.6 : 2.4) * u,
          focus ? 1 : 0.65
        ));
      } else {
        parts.push(
          `<circle class="subway-station-dot" data-station="${name}" ` +
          `data-focus="${focus}" cx="${cx}" cy="${cy}" ` +
          `r="${((focus ? 5.5 : 3.6) * u).toFixed(1)}" fill="#fff" ` +
          `stroke="${stationLines[0].color}" ` +
          `stroke-width="${((focus ? 3.4 : 2) * u).toFixed(1)}" ` +
          `opacity="${focus ? 1 : 0.7}"/>`
        );
      }
      if (name === state.place.station) {
        parts.push(
          `<text class="subway-dest-star" x="${cx}" ` +
          `y="${(cy - 16 * u).toFixed(1)}" text-anchor="middle" ` +
          `font-size="${(20 * u).toFixed(1)}">⭐</text>`
        );
      }
      if (focus) {
        parts.push(
          `<text class="subway-station-name" x="${cx}" ` +
          `y="${(cy + 26 * u).toFixed(1)}" text-anchor="middle" ` +
          `font-size="${(15 * u).toFixed(1)}" font-weight="900" ` +
          `fill="#2b3a4e" stroke="#fff" stroke-width="${(5 * u).toFixed(1)}" ` +
          `paint-order="stroke">${name}</text>`
        );
      } else {
        parts.push(
          `<text class="subway-station-name subway-station-name-minor" ` +
          `x="${cx}" y="${(cy - 9 * u).toFixed(1)}" text-anchor="middle" ` +
          `font-size="${(10 * u).toFixed(1)}" font-weight="700" ` +
          `fill="#8a95a2" stroke="#fff" stroke-width="${(3.4 * u).toFixed(1)}" ` +
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

function compassText(state, compass) {
  if (!compass) return "";
  if (compass.arrived) return "⭐ 도착역이에요! ↓ 키로 내려요";
  if (compass.transferHere) {
    return `⎵ 여기서 ${compass.line}호선으로 환승해요!`;
  }
  return `추천: ${compass.nextStation} ` +
    `${DIRECTION_ARROWS[compass.direction]} (${compass.hops}정거장 남음)`;
}

function lineChoiceButton(document, lineNumber) {
  const line = lineByNumber(lineNumber);
  const button = document.createElement("button");
  button.type = "button";
  button.className = "subway-gate-line";
  button.dataset.lineNumber = String(lineNumber);
  button.setAttribute("aria-label", `${lineNumber}호선 타기`);
  button.setAttribute("aria-keyshortcuts", String(lineNumber));
  const badge = document.createElement("span");
  badge.className = "subway-line-badge";
  badge.innerHTML = lineBadgeSvg(lineNumber, line.color);
  const label = document.createElement("span");
  label.className = "subway-gate-line-label";
  label.textContent = `${lineNumber}호선`;
  button.append(badge, label);
  return button;
}

function renderGatePhase(document, state, stage) {
  const gate = document.createElement("div");
  gate.className = "subway-gate";

  const sign = document.createElement("div");
  sign.className = "subway-station-sign";
  sign.textContent = `${state.station}역`;
  gate.append(sign);

  const note = document.createElement("p");
  note.className = "subway-gate-note";
  const compass = subwayCompass(state);
  note.textContent = compass && !compass.arrived
    ? `몇 호선을 탈까요? (추천: ${compass.line}호선)`
    : "몇 호선을 탈까요?";
  gate.append(note);

  const choices = document.createElement("div");
  choices.className = "subway-gate-lines";
  gateLines(state).forEach(lineNumber => {
    choices.append(lineChoiceButton(document, lineNumber));
  });
  gate.append(choices);

  const hero = playerImage(document);
  hero.className = "subway-player subway-gate-player";
  gate.append(hero);

  stage.append(gate);
  return gate;
}

function renderPlatformPhase(document, state, stage) {
  const platform = document.createElement("div");
  platform.className = "subway-platform";

  const sign = document.createElement("div");
  sign.className = "subway-station-sign";
  sign.textContent = `${state.station}역`;
  platform.append(sign);

  const goal = document.createElement("div");
  goal.className = "subway-line-goal";
  const badge = document.createElement("span");
  badge.className = "subway-line-badge";
  badge.innerHTML = lineBadgeSvg(state.line, lineByNumber(state.line).color);
  const text = document.createElement("span");
  text.className = "subway-line-goal-text";
  text.textContent = `${state.line}호선이 서면 ↑ 키로 타요!`;
  goal.append(badge, text);
  platform.append(goal);

  const track = document.createElement("div");
  track.className = "subway-track";
  const train = document.createElement("div");
  train.className = "subway-train";
  train.dataset.stage = state.platform.stage;
  train.dataset.line = String(state.line);
  train.setAttribute("role", "img");
  train.setAttribute("aria-label", `${state.line}호선 열차`);
  train.innerHTML = subwayTrainSvg(state.line, lineByNumber(state.line).color);
  track.append(train);
  platform.append(track);

  const edge = document.createElement("div");
  edge.className = "subway-platform-edge";
  platform.append(edge);

  const waiting = playerImage(document);
  waiting.className = "subway-player subway-platform-player";
  platform.append(waiting);

  stage.append(platform);
  return platform;
}

function renderRidePhase(document, state, stage) {
  const ride = document.createElement("div");
  ride.className = "subway-ride";
  const bounds = rideBounds(state);
  const compass = subwayCompass(state);
  const lineColor = lineByNumber(state.line).color;

  const map = document.createElement("div");
  map.className = "subway-map";
  map.dataset.guide = String(Boolean(state.showRecommended));
  const canvas = document.createElement("div");
  canvas.className = "subway-map-canvas";
  canvas.innerHTML = mapSvg(state, bounds, compass);
  map.append(canvas);

  const fit = document.createElement("div");
  fit.className = "subway-map-fit";
  fit.style.setProperty(
    "--map-aspect",
    (bounds.width / bounds.height).toFixed(4)
  );
  const marker = document.createElement("span");
  marker.className = "subway-map-player";
  marker.innerHTML = mapTrainSvg(lineColor);
  placeDot(marker, bounds, state.station);
  fit.append(marker);
  map.append(fit);

  const overlay = document.createElement("div");
  overlay.className = "subway-overlay";

  const strip = fillPassengerStrip(
    document,
    document.createElement("div"),
    state.passengers
  );
  strip.className = "subway-passenger-strip";
  overlay.append(strip);

  const banner = document.createElement("div");
  banner.className = "subway-ride-banner";
  const announcement = document.createElement("span");
  announcement.className = "subway-announcement";
  announcement.setAttribute("role", "status");
  announcement.textContent = subwayAnnouncement(state);
  const guide = document.createElement("span");
  guide.className = "subway-drive-guide";
  guide.dataset.alight = String(Boolean(compass?.arrived));
  guide.textContent = compassText(state, compass);
  banner.append(announcement, guide);
  overlay.append(banner);

  const targets = directionTargets(state);
  const capsule = document.createElement("div");
  capsule.className = "subway-capsule";
  capsule.style.setProperty("--line-color", lineColor);
  capsule.style.setProperty("--line-text", lineTextColor(lineColor));
  const entries = Object.entries(targets);
  const prev = document.createElement("span");
  prev.className = "subway-capsule-side subway-capsule-prev";
  prev.textContent = entries[0]
    ? `${DIRECTION_ARROWS[entries[0][0]]} ${entries[0][1]}`
    : "";
  const now = document.createElement("span");
  now.className = "subway-capsule-now";
  const nowBadge = document.createElement("span");
  nowBadge.className = "subway-line-badge subway-capsule-badge";
  nowBadge.innerHTML = lineBadgeSvg(state.line, lineColor);
  const nowName = document.createElement("strong");
  nowName.className = "subway-capsule-name";
  nowName.textContent = state.station;
  const remaining = document.createElement("span");
  remaining.className = "subway-capsule-remaining";
  remaining.textContent = compass?.arrived
    ? "이번 역에서 내려요!"
    : `목적지까지 ${compass?.hops ?? "?"}정거장`;
  now.append(nowBadge, nowName, remaining);
  const next = document.createElement("span");
  next.className = "subway-capsule-side subway-capsule-next";
  next.textContent = entries[1]
    ? `${entries[1][1]} ${DIRECTION_ARROWS[entries[1][0]]}`
    : "";
  capsule.append(prev, now, next);
  overlay.append(capsule);

  const transferHint = document.createElement("span");
  transferHint.className = "subway-space-hint";
  transferHint.dataset.show = String(
    isTransferStation(state.station) && !compass?.arrived
  );
  transferHint.textContent = "⎵ 스페이스로 환승";
  overlay.append(transferHint);

  map.append(overlay);
  ride.append(map);
  stage.append(ride);
  return ride;
}

function rideKey(state) {
  return [
    state.station,
    state.line,
    state.showRecommended,
    state.passengers.length
  ].join("|");
}

function renderTransferringPhase(document, state, stage) {
  const corridor = document.createElement("div");
  corridor.className = "subway-corridor";
  corridor.dataset.stage = state.transferring?.stage ?? "exit";

  const sign = document.createElement("div");
  sign.className = "subway-corridor-sign";
  sign.textContent = `🚶 ${state.station} 환승 통로`;
  corridor.append(sign);

  const walkway = document.createElement("div");
  walkway.className = "subway-corridor-walkway";
  const gates = document.createElement("div");
  gates.className = "subway-corridor-gate";
  gates.textContent = "환승 게이트";
  const hero = playerImage(document);
  hero.className = "subway-player subway-corridor-player";
  walkway.append(gates, hero);
  corridor.append(walkway);

  stage.append(corridor);
  return corridor;
}

function renderArrivingPhase(document, state, stage) {
  const room = document.createElement("div");
  room.className = "subway-arriving";
  room.dataset.stage = state.arriving?.stage ?? "melody";

  const sign = document.createElement("div");
  sign.className = "subway-station-sign";
  sign.textContent = `${state.station}역`;
  room.append(sign);

  const note = document.createElement("p");
  note.className = "subway-arriving-note";
  note.textContent = state.arriving?.stage === "dodge"
    ? "빈 곳 방향키를 눌러 사람들을 피해서 내려요!"
    : "🎵 도착 멜로디 — 곧 문이 열려요";
  room.append(note);

  const door = document.createElement("div");
  door.className = "subway-arriving-door";
  door.dataset.open = String(state.arriving?.stage === "dodge");
  ["left", "down", "right"].forEach(lane => {
    const slot = document.createElement("div");
    slot.className = "subway-door-lane";
    slot.dataset.lane = lane;
    const blocked = state.arriving?.dodge?.blocked.includes(lane) ?? false;
    slot.dataset.blocked = String(blocked);
    slot.setAttribute(
      "aria-label",
      `${dodgeLaneLabel(lane)} ${blocked ? "사람 있음" : "비어 있음"}`
    );
    if (state.arriving?.stage === "dodge") {
      slot.textContent = blocked ? "🧍🧍" : DIRECTION_ARROWS[lane];
    }
    door.append(slot);
  });
  room.append(door);

  const hero = playerImage(document);
  hero.className = "subway-player subway-arriving-player";
  room.append(hero);

  stage.append(room);
  return room;
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
  const stats = document.createElement("span");
  stats.className = "subway-arrived-stats";
  stats.textContent =
    `환승 ${state.transfersUsed}번 · ${state.moveCount}정거장`;
  const friends = document.createElement("div");
  friends.className = "subway-arrived-friends";
  friends.setAttribute(
    "aria-label",
    `함께 온 친구 ${state.passengers.length}명`
  );
  state.passengers.slice(-8).forEach(number => {
    friends.append(passengerImage(document, number));
  });
  ending.append(hearts, icon, hero, stats, friends);
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

  if (state.phase === "gate") renderGatePhase(document, state, stage);
  else if (state.phase === "platform") renderPlatformPhase(document, state, stage);
  else if (state.phase === "ride") renderRidePhase(document, state, stage);
  else if (state.phase === "transferring") {
    renderTransferringPhase(document, state, stage);
  } else if (state.phase === "arriving") {
    renderArrivingPhase(document, state, stage);
  } else renderArrivedPhase(document, state, stage);

  const pad = document.createElement("div");
  pad.className = "route-pad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "지하철 이동");
  for (const [direction, label, symbol] of [
    ["up", "타요", "↑"],
    ["left", "왼쪽", "←"],
    ["down", "내려요", "↓"],
    ["right", "오른쪽", "→"],
    ["space", "환승", "⎵"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.routeDirection = direction;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    if (direction === "space") button.className = "subway-space-button";
    pad.append(button);
  }
  root.append(pad);

  root._subwayView = {
    document,
    mission,
    stage,
    phase: state.phase,
    rideKey: state.phase === "ride" ? rideKey(state) : null
  };
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
    if (train) train.dataset.stage = state.platform.stage;
  }
  if (state.phase === "ride") {
    const key = rideKey(state);
    if (view.rideKey === key) return root;
    view.rideKey = key;
    const bounds = rideBounds(state);
    const compass = subwayCompass(state);
    const map = root.querySelector?.(".subway-map");
    if (map) map.dataset.guide = String(Boolean(state.showRecommended));
    const fit = root.querySelector?.(".subway-map-fit");
    if (fit) {
      fit.style.setProperty(
        "--map-aspect",
        (bounds.width / bounds.height).toFixed(4)
      );
    }
    const canvas = root.querySelector?.(".subway-map-canvas");
    if (canvas) canvas.innerHTML = mapSvg(state, bounds, compass);
    const marker = root.querySelector?.(".subway-map-player");
    if (marker) placeDot(marker, bounds, state.station);
    const announcement = root.querySelector?.(".subway-announcement");
    if (announcement) announcement.textContent = subwayAnnouncement(state);
    const guide = root.querySelector?.(".subway-drive-guide");
    if (guide) {
      guide.dataset.alight = String(Boolean(compass?.arrived));
      guide.textContent = compassText(state, compass);
    }
    const strip = root.querySelector?.(".subway-passenger-strip");
    if (strip && strip.dataset.count !== String(state.passengers.length)) {
      fillPassengerStrip(view.document, strip, state.passengers);
    }
    const targets = directionTargets(state);
    const entries = Object.entries(targets);
    const prev = root.querySelector?.(".subway-capsule-prev");
    if (prev) {
      prev.textContent = entries[0]
        ? `${DIRECTION_ARROWS[entries[0][0]]} ${entries[0][1]}`
        : "";
    }
    const nowName = root.querySelector?.(".subway-capsule-name");
    if (nowName) nowName.textContent = state.station;
    const remaining = root.querySelector?.(".subway-capsule-remaining");
    if (remaining) {
      remaining.textContent = compass?.arrived
        ? "이번 역에서 내려요!"
        : `목적지까지 ${compass?.hops ?? "?"}정거장`;
    }
    const next = root.querySelector?.(".subway-capsule-next");
    if (next) {
      next.textContent = entries[1]
        ? `${entries[1][1]} ${DIRECTION_ARROWS[entries[1][0]]}`
        : "";
    }
    const spaceHint = root.querySelector?.(".subway-space-hint");
    if (spaceHint) {
      spaceHint.dataset.show = String(
        isTransferStation(state.station) && !compass?.arrived
      );
    }
    return root;
  }
  if (state.phase === "transferring") {
    const corridor = root.querySelector?.(".subway-corridor");
    if (corridor) {
      corridor.dataset.stage = state.transferring?.stage ?? "exit";
    }
  }
  if (state.phase === "arriving") {
    const stageName = state.arriving?.stage ?? "melody";
    if (view.arrivingStage !== stageName) {
      view.arrivingStage = stageName;
      const rebuilt = renderSubwayJourney(view.document, state);
      root.replaceChildren(...rebuilt.children);
      rebuilt._subwayView.arrivingStage = stageName;
      root._subwayView = rebuilt._subwayView;
    }
  }
  return root;
}
