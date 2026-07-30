import { characterAsset } from "./character-spec.mjs";
import {
  STATION_COORDS,
  SUBWAY_LINES,
  linesAtStation,
  lineByNumber,
  stationLabel
} from "./subway-map-data.mjs";
import {
  DIRECTION_ARROWS,
  dodgeLaneLabel,
  gateLines,
  lineNeighbors,
  subwayAnnouncement,
  subwayCompass
} from "./subway-journey.mjs";
import {
  lineBadgeSvg,
  lineTextColor,
  subwayTrainSvg
} from "./subway-art.mjs";
import {
  fareGateSvg,
  passengerSvg,
  stationSceneSvg
} from "./subway-station-art.mjs";

const MAP_SCALE = 10;
const MIN_SPAN_X = 30;
const MIN_SPAN_Y = 30;
const MAP_ASPECT = 8 / 5;

const RIVER_POINTS = [
  [-4, 53], [6, 55], [13, 57], [20, 57.5], [25, 59], [29, 61.5],
  [33, 61.5], [36, 59.5], [40, 58], [44, 57], [48, 56.5], [52, 55.5],
  [57, 53.5], [61, 51], [65, 48.5], [70, 47.5], [75, 48], [79, 47.5],
  [84, 45.5], [90, 43], [96, 42.5], [104, 44]
];
const PARKS = [
  { x: 49, y: 46.5, rx: 3.2, ry: 2.3 },
  { x: 52, y: 33, rx: 2.4, ry: 1.8 },
  { x: 66, y: 43.5, rx: 2.4, ry: 1.7 },
  { x: 23, y: 42, rx: 2.6, ry: 2 },
  { x: 46, y: 89, rx: 4.6, ry: 2.8 },
  { x: 42, y: 12, rx: 7, ry: 3.6 },
  { x: 38, y: 82, rx: 6, ry: 3.2 },
  { x: 70, y: 74, rx: 5, ry: 3 },
  { x: 88, y: 60, rx: 4.4, ry: 3 },
  { x: 90, y: 20, rx: 5, ry: 3.4 }
];

const TRANSFER_LABELS = Object.freeze({
  0: "권장: 바로 가요",
  1: "권장: 🚶 1번 환승",
  2: "권장: 🚶🚶 2번 환승"
});

const ROOM_TITLES = Object.freeze({
  gate: "개찰구 · 계단",
  platform: "승강장",
  train: "열차 안",
  corridor: "환승 통로"
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
  return `${path} L ${last[0]} ${last[1]}`;
}

function playerImage(document, className = "subway-player") {
  const image = document.createElement("img");
  image.className = className;
  image.src = `assets/characters/${characterAsset(1)}`;
  image.alt = "숫자 1 블록 친구";
  return image;
}

function passengerImage(document, number, className = "subway-passenger") {
  const image = document.createElement("img");
  image.className = className;
  image.src = `assets/characters/${characterAsset(number)}`;
  image.alt = `숫자 ${number} 블록 친구`;
  return image;
}

function missionText(state) {
  const base = `${state.place.icon} ${state.place.label} 가는 길`;
  if (state.phase === "arriving") return "조심조심 내려요!";
  if (state.phase === "arrived") {
    return `${state.place.icon} ${state.place.label}에 도착했어요!`;
  }
  return `${base} — ${ROOM_TITLES[state.room?.kind] ?? ""}`;
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

function rideBounds(state) {
  const points = [
    STATION_COORDS[state.station],
    STATION_COORDS[state.place.station]
  ];
  let minX = Math.min(...points.map(p => p.x)) - 9;
  let maxX = Math.max(...points.map(p => p.x)) + 9;
  let minY = Math.min(...points.map(p => p.y)) - 9;
  let maxY = Math.max(...points.map(p => p.y)) + 9;
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
  // Fit the crop to the 8/5 box by growing only the short axis, so `meet`
  // never letterboxes and every map pixel carries map.
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  if (spanX / spanY < MAP_ASPECT) {
    const grow = (spanY * MAP_ASPECT - spanX) / 2;
    minX -= grow;
    maxX += grow;
  } else {
    const grow = (spanX / MAP_ASPECT - spanY) / 2;
    minY -= grow;
    maxY += grow;
  }
  return {
    minX: Math.max(-6, minX),
    minY: Math.max(-6, minY),
    width: Math.min(106, maxX) - Math.max(-6, minX),
    height: Math.min(106, maxY) - Math.max(-6, minY)
  };
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

function minimapSvg(state, bounds, compass) {
  const u = Math.max(1.2, Math.min(1.9, bounds.width / 48));
  const emphasize = new Set([state.station, state.place.station]);
  const parts = [];
  parts.push(
    `<svg class="subway-minimap-art" viewBox="${bounds.minX * MAP_SCALE} ` +
    `${bounds.minY * MAP_SCALE} ${bounds.width * MAP_SCALE} ` +
    `${bounds.height * MAP_SCALE}" role="img" ` +
    `aria-label="${state.station}에서 ${state.place.station} 가는 노선도" ` +
    `preserveAspectRatio="xMidYMid meet" focusable="false">`
  );
  parts.push(`<rect x="-300" y="-300" width="1700" height="1700" fill="#f3f7f0"/>`);
  PARKS.forEach(park => {
    parts.push(
      `<ellipse cx="${park.x * MAP_SCALE}" cy="${park.y * MAP_SCALE}" ` +
      `rx="${park.rx * MAP_SCALE}" ry="${park.ry * MAP_SCALE}" fill="#dcead0"/>`
    );
  });
  parts.push(
    `<path class="subway-map-river" d="${smoothPath(RIVER_POINTS)}" ` +
    `fill="none" stroke="#cfe3f2" stroke-width="${(30 * u).toFixed(1)}" ` +
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
    const active = line.number === state.line;
    parts.push(
      `<polyline class="subway-line" data-line="${line.number}" ` +
      `data-active="${active}" points="${points}" fill="none" ` +
      `stroke="${line.color}" ` +
      `stroke-width="${((active ? 7 : 4) * u).toFixed(1)}" ` +
      `stroke-linecap="round" stroke-linejoin="round" ` +
      `opacity="${active ? 1 : 0.4}"/>`
    );
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
        `stroke-width="${(12 * u).toFixed(1)}" stroke-linecap="round" ` +
        `stroke-linejoin="round" opacity="0.6"/>`
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
      const cx = point.x * MAP_SCALE;
      const cy = point.y * MAP_SCALE;
      if (stationLines.length >= 2) {
        parts.push(
          `<circle class="subway-station-dot" data-station="${name}" ` +
          `data-focus="${focus}" cx="${cx}" cy="${cy}" ` +
          `r="${((focus ? 7 : 5) * u).toFixed(1)}" fill="#fff" ` +
          `opacity="${focus ? 1 : 0.8}"/>`
        );
        parts.push(transferRing(
          point,
          stationLines,
          (focus ? 9 : 6.5) * u,
          (focus ? 4 : 2.6) * u,
          focus ? 1 : 0.6
        ));
      } else {
        parts.push(
          `<circle class="subway-station-dot" data-station="${name}" ` +
          `data-focus="${focus}" cx="${cx}" cy="${cy}" ` +
          `r="${((focus ? 6 : 4) * u).toFixed(1)}" fill="#fff" ` +
          `stroke="${stationLines[0].color}" ` +
          `stroke-width="${((focus ? 4 : 2.4) * u).toFixed(1)}" ` +
          `opacity="${focus ? 1 : 0.7}"/>`
        );
      }
      if (name === state.place.station) {
        parts.push(
          `<text class="subway-dest-star" x="${cx}" ` +
          `y="${(cy - 18 * u).toFixed(1)}" text-anchor="middle" ` +
          `font-size="${(26 * u).toFixed(1)}">⭐</text>`
        );
      }
      if (name === state.station) {
        parts.push(
          `<circle class="subway-minimap-here" cx="${cx}" cy="${cy}" ` +
          `r="${(11 * u).toFixed(1)}" fill="none" stroke="#e8564a" ` +
          `stroke-width="${(4 * u).toFixed(1)}"/>`
        );
      }
      if (focus) {
        parts.push(
          `<text class="subway-station-name" x="${cx}" ` +
          `y="${(cy + 30 * u).toFixed(1)}" text-anchor="middle" ` +
          `font-size="${(22 * u).toFixed(1)}" font-weight="900" ` +
          `fill="#2b3a4e" stroke="#fff" stroke-width="${(7 * u).toFixed(1)}" ` +
          `paint-order="stroke">${name}</text>`
        );
      }
    });
  });
  parts.push("</svg>");
  return parts.join("");
}

function guideText(state, compass) {
  if (state.phase === "gate") {
    if (!state.room.tapped) {
      return "→ 걸어가서 🎫 들어가는 곳으로 지나가요";
    }
    if (state.room.chosen === null) {
      return compass?.line
        ? `⭐ ${compass.line}호선 계단으로 가요! ${compass.line} 키를 눌러요`
        : "몇 호선 계단으로 갈까요? 숫자키로 골라요";
    }
    return `→ ${state.room.chosen}호선 계단으로 내려가요`;
  }
  if (state.phase === "platform") {
    return `${state.line}호선 열차가 서면 ↑ 키로 타요`;
  }
  if (state.phase === "corridor") {
    return "→ 걸어서 환승 게이트를 통과해요";
  }
  if (state.phase === "ride") {
    if (compass?.arrived) return "⭐ 도착역이에요! ↓ 눌러서 내려요";
    if (compass?.hopsToAlight === 0) {
      return `🔔 여기서 내려요! ↓ 눌러서 ${compass.line}호선으로 갈아타요`;
    }
    if (compass?.hopsToAlight === 1 && compass.side) {
      return `🔔 다음 역 ${compass.alightAt}에서 내려요! ` +
        `${DIRECTION_ARROWS[compass.side]} 문으로 걸어가요`;
    }
    if (compass?.side) {
      return `${DIRECTION_ARROWS[compass.side]} 문으로 걸어가요 ` +
        `(다음 역 ${compass.nextStation} · ` +
        `${compass.alightAt}까지 ${compass.hopsToAlight}정거장)`;
    }
  }
  return "";
}

function planSteps(compass) {
  if (!compass?.route) return [];
  return compass.route.legs.map((leg, index, all) => ({
    line: leg.line,
    at: leg.stations[leg.stations.length - 1],
    last: index === all.length - 1
  }));
}

function renderPlan(document, state, compass) {
  const plan = document.createElement("div");
  plan.className = "subway-plan";
  const steps = planSteps(compass);
  plan.dataset.steps = String(steps.length);
  if (steps.length === 0) {
    plan.setAttribute("aria-label", "도착했어요");
    return plan;
  }
  plan.setAttribute(
    "aria-label",
    `가는 방법: ${steps.map((step, index) =>
      `${index + 1}번 ${step.line}호선 타고 ${step.at}에서 ` +
      `${step.last ? "내려요" : "갈아타요"}`).join(", ")}`
  );
  steps.forEach((step, index) => {
    const chip = document.createElement("span");
    chip.className = "subway-plan-step";
    chip.dataset.current = String(index === 0);
    chip.dataset.last = String(step.last);
    const line = lineByNumber(step.line);
    const badge = document.createElement("span");
    badge.className = "subway-line-badge subway-plan-badge";
    badge.innerHTML = lineBadgeSvg(step.line, line.color);
    const text = document.createElement("span");
    text.className = "subway-plan-text";
    text.textContent = `${step.at}에서 ${step.last ? "내려요" : "갈아타요"}`;
    chip.append(badge, text);
    plan.append(chip);
  });
  return plan;
}

function roomTargetX(state, compass) {
  const room = state.room;
  if (!room) return null;
  if (room.kind === "gate") {
    if (!room.tapped) return room.inGateX;
    return room.chosen === null ? null : room.width - 1;
  }
  if (room.kind === "corridor") return room.width - 1;
  if (room.kind === "train") {
    if (!compass || compass.hopsToAlight === 0 || !compass.side) return null;
    return compass.side === "forward" ? room.width - 1 : 0;
  }
  return null;
}

function progressTrail(document, state, compass) {
  const trail = document.createElement("div");
  trail.className = "subway-progress";
  const remaining = compass?.arrived ? 0 : compass?.hops ?? 0;
  trail.setAttribute(
    "aria-label",
    remaining === 0
      ? "도착역이에요"
      : `목적지까지 ${remaining}정거장 남았어요`
  );
  const here = document.createElement("span");
  here.className = "subway-progress-dot";
  here.dataset.state = "here";
  here.textContent = "●";
  trail.append(here);
  for (let index = 0; index < Math.min(remaining, 8); index += 1) {
    const dot = document.createElement("span");
    dot.className = "subway-progress-dot";
    dot.dataset.state = "todo";
    dot.textContent = "○";
    trail.append(dot);
  }
  const goal = document.createElement("span");
  goal.className = "subway-progress-goal";
  goal.textContent = "⭐";
  trail.append(goal);
  return trail;
}

function collectStrip(document, state) {
  const strip = document.createElement("div");
  strip.className = "subway-collect";
  strip.dataset.friends = String(state.passengers.length);

  const friendsBox = document.createElement("span");
  friendsBox.className = "subway-collect-friends";
  friendsBox.setAttribute(
    "aria-label",
    `함께 가는 친구 ${state.passengers.length}명`
  );
  friendsBox.append(...state.passengers.slice(-6).map(number =>
    passengerImage(document, number)
  ));

  strip.append(friendsBox);
  return strip;
}

function fareGate(document, room, direction, label) {
  const x = direction === "in" ? room.inGateX : room.outGateX;
  const node = roomCell(document, "subway-room-gate", x, room.width);
  node.dataset.gate = direction;
  node.setAttribute("role", "img");
  const art = document.createElement("span");
  art.className = "subway-gate-art-box";
  art.innerHTML = fareGateSvg(direction, direction === "in" && room.tapped);
  const caption = document.createElement("span");
  caption.className = "subway-gate-caption";
  caption.textContent = label;
  node.append(art, caption);
  return node;
}

function roomCell(document, className, x, width, text) {
  const node = document.createElement("span");
  node.className = className;
  node.style.setProperty("--room-x", `${((x + 0.5) / width) * 100}%`);
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderRoom(document, state, stage, compass) {
  const room = state.room;
  const wrap = document.createElement("div");
  wrap.className = "subway-room";
  wrap.dataset.kind = room.kind;
  wrap.dataset.entering = String(Boolean(room.entering));
  wrap.style.setProperty("--room-cells", String(room.width));

  const title = document.createElement("div");
  title.className = "subway-room-title";
  title.textContent =
    `${stationLabel(state.station)} · ${ROOM_TITLES[room.kind] ?? ""}`;
  wrap.append(title);

  const painted = stationSceneSvg(room.kind, {
    width: room.width,
    stairsFrom: room.stairsFrom ?? undefined,
    lineColor: state.line ? lineByNumber(state.line).color : undefined
  });
  wrap.dataset.painted = String(Boolean(painted));
  if (painted) {
    const art = document.createElement("div");
    art.className = "subway-room-scene";
    art.setAttribute("aria-hidden", "true");
    art.innerHTML = painted;
    wrap.append(art);
  }

  const backdrop = document.createElement("div");
  backdrop.className = "subway-room-backdrop";
  backdrop.dataset.painted = String(Boolean(painted));
  backdrop.setAttribute("aria-hidden", "true");
  if (room.kind === "train") {
    for (let index = 0; index < 4; index += 1) {
      const window = document.createElement("span");
      window.className = "subway-room-window";
      backdrop.append(window);
    }
  } else if (room.kind === "gate") {
    for (const label of ["🎟️ 표 사는 곳", "🗺️ 노선 안내"]) {
      const booth = document.createElement("span");
      booth.className = "subway-room-booth";
      booth.textContent = label;
      backdrop.append(booth);
    }
  } else if (room.kind === "corridor") {
    for (const label of ["↑ 환승", "🚶 이동", "↑ 환승"]) {
      const sign = document.createElement("span");
      sign.className = "subway-room-wallsign";
      sign.textContent = label;
      backdrop.append(sign);
    }
  } else if (room.kind === "platform") {
    const train = document.createElement("div");
    train.className = "subway-train";
    train.dataset.stage = state.platform?.stage ?? "approaching";
    train.dataset.line = String(state.line);
    train.setAttribute("role", "img");
    train.setAttribute("aria-label", `${state.line}호선 열차`);
    train.innerHTML = subwayTrainSvg(
      state.line,
      lineByNumber(state.line).color
    );
    backdrop.append(train);
  }
  wrap.append(backdrop);

  const floor = document.createElement("div");
  floor.className = "subway-room-floor";
  wrap.append(floor);

  const lane = document.createElement("div");
  lane.className = "subway-room-lane";
  wrap.append(lane);

  if (room.kind === "train" || room.kind === "corridor") {
    const leftDoor = roomCell(
      document,
      "subway-room-door",
      0,
      room.width,
      room.kind === "train" ? "←" : "↩"
    );
    leftDoor.dataset.side = "left";
    const rightDoor = roomCell(
      document,
      "subway-room-door",
      room.width - 1,
      room.width,
      room.kind === "train" ? "→" : "🚪"
    );
    rightDoor.dataset.side = "right";
    lane.append(leftDoor, rightDoor);
  }

  if (room.kind === "gate") {
    const exit = fareGate(document, room, "out", "나가는 곳");
    exit.setAttribute("aria-label", "나가는 곳 개찰구 — 들어갈 수 없어요");
    lane.append(exit);

    const entry = fareGate(
      document,
      room,
      "in",
      room.tapped ? "삑! 통과" : "들어가는 곳"
    );
    entry.dataset.tapped = String(Boolean(room.tapped));
    entry.setAttribute(
      "aria-label",
      room.tapped ? "카드를 찍고 지나온 개찰구" : "들어가는 곳 개찰구"
    );
    lane.append(entry);

    for (let x = room.stairsFrom; x < room.width; x += 1) {
      const stair = roomCell(document, "subway-room-stair", x, room.width);
      stair.dataset.step = String(x - room.stairsFrom);
      stair.style.setProperty("--stair-step", String(x - room.stairsFrom));
      stair.setAttribute("aria-hidden", "true");
      lane.append(stair);
    }

    const sign = roomCell(
      document,
      "subway-room-sign",
      room.width - 2,
      room.width,
      room.chosen === null ? "⬇ 승강장" : `⬇ ${room.chosen}호선`
    );
    lane.append(sign);
  }

  if (room.kind === "corridor") {
    const sign = roomCell(
      document,
      "subway-room-sign",
      room.width - 2,
      room.width,
      "환승 게이트"
    );
    lane.append(sign);
  }

  const targetX = roomTargetX(state, compass);
  if (targetX !== null) {
    const target = roomCell(
      document,
      "subway-room-target",
      targetX,
      room.width,
      "👣"
    );
    target.setAttribute("aria-hidden", "true");
    lane.append(target);
  }

  room.people.forEach(person => {
    const node = roomCell(
      document,
      "subway-room-person",
      person.x,
      room.width
    );
    node.innerHTML = passengerSvg(person.x + room.width, person.stepped);
    node.dataset.stepped = String(Boolean(person.stepped));
    node.setAttribute("role", "img");
    node.setAttribute(
      "aria-label",
      person.stepped ? "비켜준 사람" : "서 있는 사람"
    );
    lane.append(node);
  });

  if (room.friend) {
    const friend = passengerImage(
      document,
      room.friend.number,
      "subway-room-friend"
    );
    friend.style.setProperty(
      "--room-x",
      `${((room.friend.x + 0.5) / room.width) * 100}%`
    );
    lane.append(friend);
  }

  const player = playerImage(document, "subway-room-player");
  player.style.setProperty(
    "--room-x",
    `${((room.walkX + 0.5) / room.width) * 100}%`
  );
  const onStairs = room.kind === "gate" && room.walkX >= room.stairsFrom;
  player.style.setProperty(
    "--room-drop",
    String(onStairs ? room.walkX - room.stairsFrom + 1 : 0)
  );
  player.dataset.facing = room.facing;
  lane.append(player);

  stage.append(wrap);
  return wrap;
}

function renderGateChoices(document, state, host, compass) {
  const choices = document.createElement("div");
  choices.className = "subway-gate-lines";
  choices.dataset.open = String(Boolean(state.room.tapped));
  host.append(choices);
  if (!state.room.tapped) return choices;
  const recommended = compass?.line ?? null;
  gateLines(state).forEach(lineNumber => {
    const line = lineByNumber(lineNumber);
    const best = lineNumber === recommended;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "subway-gate-line";
    button.dataset.lineNumber = String(lineNumber);
    button.dataset.recommended = String(best);
    button.setAttribute(
      "aria-label",
      best ? `${lineNumber}호선 타기 — 추천` : `${lineNumber}호선 타기`
    );
    button.setAttribute("aria-keyshortcuts", String(lineNumber));
    const badge = document.createElement("span");
    badge.className = "subway-line-badge";
    badge.innerHTML = lineBadgeSvg(lineNumber, line.color);
    const label = document.createElement("span");
    label.className = "subway-gate-line-label";
    label.textContent = best ? `⭐ ${lineNumber}호선` : `${lineNumber}호선`;
    button.append(badge, label);
    choices.append(button);
  });
  return choices;
}

function renderStationCapsule(document, state, compass) {
  const capsule = document.createElement("div");
  capsule.className = "subway-capsule";
  const color = state.line ? lineByNumber(state.line).color : "#5b6b81";
  capsule.style.setProperty("--line-color", color);
  capsule.style.setProperty("--line-text", lineTextColor(color));

  const neighbors = state.line ? lineNeighbors(state) : { back: null, forward: null };
  const prev = document.createElement("span");
  prev.className = "subway-capsule-side subway-capsule-prev";
  prev.textContent = neighbors.back ? `← ${neighbors.back}` : "";
  const now = document.createElement("span");
  now.className = "subway-capsule-now";
  if (state.line) {
    const badge = document.createElement("span");
    badge.className = "subway-line-badge subway-capsule-badge";
    badge.innerHTML = lineBadgeSvg(state.line, color);
    now.append(badge);
  }
  const name = document.createElement("strong");
  name.className = "subway-capsule-name";
  name.textContent = state.station;
  const remaining = document.createElement("span");
  remaining.className = "subway-capsule-remaining";
  remaining.dataset.alight = String(compass?.hopsToAlight === 0);
  remaining.textContent = compass?.hopsToAlight === 0
    ? "이번 역에서 내려요!"
    : `${compass?.alightAt ?? "?"}에서 내려요 · ` +
      `${compass?.hopsToAlight ?? "?"}정거장`;
  now.append(name, remaining);
  const next = document.createElement("span");
  next.className = "subway-capsule-side subway-capsule-next";
  next.textContent = neighbors.forward ? `${neighbors.forward} →` : "";
  capsule.append(prev, now, next);
  return capsule;
}

function renderArrivingPhase(document, state, stage) {
  const room = document.createElement("div");
  room.className = "subway-arriving";
  room.dataset.stage = state.arriving?.stage ?? "melody";

  // The doors open while still inside the carriage, so reuse the train scenery
  // instead of leaving this step on an empty pale field.
  const art = document.createElement("div");
  art.className = "subway-room-scene";
  art.setAttribute("aria-hidden", "true");
  art.innerHTML = stationSceneSvg("train", {
    lineColor: state.line ? lineByNumber(state.line).color : undefined
  });
  room.append(art);

  const sign = document.createElement("div");
  sign.className = "subway-station-sign";
  sign.textContent = stationLabel(state.station);
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
      if (blocked) {
        slot.innerHTML = passengerSvg(lane.length + 2, false) +
          passengerSvg(lane.length + 5, false);
      } else {
        slot.textContent = DIRECTION_ARROWS[lane];
      }
    }
    door.append(slot);
  });
  room.append(door);
  room.append(playerImage(document, "subway-player subway-arriving-player"));
  stage.append(room);
  return room;
}

function renderArrivedPhase(document, state, stage) {
  const ending = document.createElement("div");
  ending.className = "subway-arrived";
  const hearts = document.createElement("span");
  hearts.className = "subway-arrived-hearts";
  hearts.textContent = "💛 💚 💙";
  hearts.setAttribute("aria-hidden", "true");
  const icon = document.createElement("span");
  icon.className = "subway-place-icon";
  icon.textContent = state.place.icon;
  icon.setAttribute("role", "img");
  icon.setAttribute("aria-label", state.place.label);
  const hero = playerImage(document, "subway-player subway-arrived-player");
  const stats = document.createElement("span");
  stats.className = "subway-arrived-stats";
  stats.textContent = `환승 ${state.transfersUsed}번 · ` +
    `${state.moveCount}정거장 · 친구 ${state.passengers.length}명`;
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

function renderRoomPhase(document, state, stage) {
  const compass = subwayCompass(state);
  const layout = document.createElement("div");
  layout.className = "subway-layout";

  // Left pane: the illustrated room, with the guide and station capsule
  // overlaid along its foot like a subtitle bar. Right rail: the big map, the
  // plan and the control pad. Nothing overlaps the walking area any more.
  const pane = document.createElement("div");
  pane.className = "subway-pane";
  renderRoom(document, state, pane, compass);
  layout.append(pane);

  const rail = document.createElement("div");
  rail.className = "subway-rail";

  const minimap = document.createElement("div");
  minimap.className = "subway-minimap-box";
  minimap.dataset.guide = String(Boolean(state.showRecommended));
  minimap.innerHTML = minimapSvg(state, rideBounds(state), compass);
  rail.append(minimap);

  const hud = document.createElement("div");
  hud.className = "subway-hud";
  const hudMain = document.createElement("div");
  hudMain.className = "subway-hud-main";
  hudMain.append(
    renderPlan(document, state, compass),
    progressTrail(document, state, compass)
  );
  hud.append(hudMain);
  rail.append(hud);

  const footer = document.createElement("div");
  footer.className = "subway-footer";

  const topRow = document.createElement("div");
  topRow.className = "subway-footer-row";
  const guide = document.createElement("div");
  guide.className = "subway-drive-guide";
  guide.dataset.alight = String(
    state.phase === "ride" && compass?.hopsToAlight === 0
  );
  guide.dataset.soon = String(
    state.phase === "ride" && compass?.hopsToAlight === 1
  );
  guide.textContent = guideText(state, compass);
  topRow.append(guide);
  if (state.phase === "gate") {
    renderGateChoices(document, state, topRow, compass);
  }
  footer.append(topRow);

  const bottomRow = document.createElement("div");
  bottomRow.className = "subway-footer-row";
  bottomRow.append(renderStationCapsule(document, state, compass));
  bottomRow.append(collectStrip(document, state));
  footer.append(bottomRow);

  const announcement = document.createElement("span");
  announcement.className = "subway-announcement";
  announcement.setAttribute("role", "status");
  announcement.textContent = subwayAnnouncement(state);
  footer.append(announcement);
  pane.append(footer);

  layout.append(rail);
  stage.append(layout);
  layout.railSlot = rail;
  return layout;
}

function roomKey(state) {
  const room = state.room;
  return [
    state.phase,
    state.station,
    state.line,
    room?.kind,
    room?.walkX,
    room?.facing,
    room?.tapped,
    room?.chosen,
    room?.friend ? room.friend.number : "-",
    room?.people.map(person => `${person.x}${person.stepped ? "s" : ""}`).join(","),
    state.passengers.length,
    state.showRecommended,
    state.platform?.stage ?? "-"
  ].join("|");
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

  let rail = null;
  if (state.phase === "arriving") renderArrivingPhase(document, state, stage);
  else if (state.phase === "arrived") renderArrivedPhase(document, state, stage);
  else rail = renderRoomPhase(document, state, stage).railSlot;

  const pad = document.createElement("div");
  pad.className = "route-pad";
  pad.setAttribute("role", "group");
  pad.setAttribute("aria-label", "지하철 조작");
  for (const [direction, label, symbol] of [
    ["up", "열차 타기", "↑"],
    ["left", "왼쪽으로 걷기", "←"],
    ["down", "내리기", "↓"],
    ["right", "오른쪽으로 걷기", "→"],
    ["space", "내리기 (환승)", "⎵"]
  ]) {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.routeDirection = direction;
    button.setAttribute("aria-label", label);
    button.textContent = symbol;
    if (direction === "space") button.className = "subway-space-button";
    pad.append(button);
  }
  (rail ?? root).append(pad);

  root._subwayView = {
    document,
    mission,
    stage,
    phase: state.phase,
    roomKey: roomKey(state),
    arrivingStage: state.arriving?.stage ?? null
  };
  return root;
}

export function updateSubwayJourney(root, state) {
  const view = root?._subwayView;
  if (!view) throw new TypeError("A rendered subway journey is required");
  const key = roomKey(state);
  const arrivingStage = state.arriving?.stage ?? null;
  if (view.phase === state.phase && view.roomKey === key &&
    view.arrivingStage === arrivingStage) {
    return root;
  }
  const rebuilt = renderSubwayJourney(view.document, state);
  root.replaceChildren(...rebuilt.children);
  root.dataset.phase = state.phase;
  root._subwayView = rebuilt._subwayView;
  return root;
}
