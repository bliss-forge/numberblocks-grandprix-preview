// STEP 1 단지 지도 — 디자인 정본 락 §5 STEP 1 · §8 아이콘 목록의 구현.
//
// 모델의 5×3 격자가 그림의 도로망과 같은 것을 가리킨다:
//   · 가로 도로 한 줄(row 1)이 단지를 가로지르고
//   · 세로 도로 두 줄이 열 1·3 에서 그 도로와 만난다
//   · 집 네 채는 열 0·2·4 의 위 블록과 열 2 의 아래 블록에 선다
//   · 연못(열 0 아래)과 나무(열 4 아래)는 트럭이 못 지나가는 칸이다
// 좌표는 CELL_ANCHORS 하나만 고치면 그림과 판정이 함께 움직인다.

import { truckSprite, truckSpriteHeight } from "./delivery-truck-art.mjs";

export const MAP_VIEW_BOX = "0 0 1140 560";

const COLUMN_X = [110, 340, 570, 800, 1030];
const ROAD_Y = 276;
const HOUSE_WIDTH = 152;
const TRUCK_WIDTH = 106;

// 트럭이 칸마다 서는 자리(바닥 중심). 집 칸에서는 문패를 가리지 않게 집 옆에 댄다.
export const CELL_ANCHORS = [
  // row 0 — 위 블록
  [
    { x: COLUMN_X[0] + 108, y: 204 },
    { x: COLUMN_X[1], y: 120 },
    { x: COLUMN_X[2] + 108, y: 204 },
    { x: COLUMN_X[3], y: 120 },
    { x: COLUMN_X[4] - 108, y: 204 },
  ],
  // row 1 — 가로 도로
  COLUMN_X.map(x => ({ x, y: ROAD_Y })),
  // row 2 — 아래 블록
  [
    { x: COLUMN_X[0], y: 440 },
    { x: COLUMN_X[1], y: 440 },
    { x: COLUMN_X[2] + 108, y: 426 },
    { x: COLUMN_X[3], y: 440 },
    { x: COLUMN_X[4], y: 440 },
  ],
];

export function anchorFor(cell) {
  return CELL_ANCHORS[cell.y]?.[cell.x] ?? CELL_ANCHORS[1][0];
}

// 집이 그려지는 자리(좌상단). 위 블록은 도로 위, 아래 블록은 도로 아래.
const HOUSE_BOXES = {
  "0,0": { x: COLUMN_X[0] - HOUSE_WIDTH / 2, y: 58 },
  "2,0": { x: COLUMN_X[2] - HOUSE_WIDTH / 2, y: 58 },
  "4,0": { x: COLUMN_X[4] - HOUSE_WIDTH / 2, y: 58 },
  "2,2": { x: COLUMN_X[2] - HOUSE_WIDTH / 2, y: 388 },
};

const ROOF_TONES = [
  { top: "#2fb3a6", side: "#26978d", eave: "#1f8378" },
  { top: "#e4744b", side: "#c85f3b", eave: "#ac5130" },
  { top: "#4d95e8", side: "#3a7cc9", eave: "#2f69ad" },
  { top: "#8f6cd0", side: "#7757b4", eave: "#634699" },
];

const GOAL_ROOF = { top: "#f0a63c", side: "#d78a26", eave: "#bd761d" };

function tree(x, y, scale) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">` +
    `<ellipse cx="0" cy="48" rx="28" ry="9" fill="rgba(0,0,0,.16)"/>` +
    `<rect x="-6" y="16" width="12" height="32" rx="6" fill="#8a5a33"/>` +
    `<circle cx="0" cy="2" r="27" fill="#4fae4a"/><circle cx="-14" cy="16" r="18" fill="#5cbc52"/>` +
    `<circle cx="15" cy="15" r="17" fill="#43a044"/><circle cx="-6" cy="-10" r="17" fill="#74d162"/></g>`;
}

function flowers(x, y, color) {
  return `<g fill="${color}"><circle cx="${x}" cy="${y}" r="5"/>` +
    `<circle cx="${x + 14}" cy="${y + 8}" r="5"/><circle cx="${x + 7}" cy="${y - 10}" r="5"/></g>`;
}

function house({ x, y }, unit, tone, goal) {
  const plateFill = goal ? "#fffdf4" : "#fffdf4";
  const plateEdge = goal ? "#e0a94f" : "#c9b18d";
  const numberInk = goal ? "#e07a12" : "#3b4c63";
  const wall = goal ? "#fff5e0" : "#f7ecd6";
  const windowFill = goal ? "#ffe3a8" : "#a8d8f0";
  const windowEdge = goal ? "#dfb46a" : "#7fb6d8";

  return `<g transform="translate(${x} ${y})">` +
    `<ellipse cx="76" cy="130" rx="74" ry="12" fill="rgba(0,0,0,.17)"/>` +
    `<path d="M4 56 L76 4 L148 56 Z" fill="${tone.top}"/>` +
    `<path d="M76 4 L148 56 L76 56 Z" fill="${tone.side}"/>` +
    `<rect x="0" y="50" width="152" height="12" rx="6" fill="${tone.eave}"/>` +
    `<rect x="12" y="60" width="128" height="68" rx="9" fill="${wall}" stroke="#d9c39f" stroke-width="3"/>` +
    `<rect x="24" y="70" width="104" height="34" rx="10" fill="${plateFill}" stroke="${plateEdge}" stroke-width="3.5"/>` +
    `<text x="76" y="96" text-anchor="middle" font-size="27" font-weight="800" fill="${numberInk}">${unit}</text>` +
    `<rect x="22" y="108" width="24" height="16" rx="4" fill="${windowFill}" stroke="${windowEdge}" stroke-width="2"/>` +
    `<rect x="106" y="108" width="24" height="16" rx="4" fill="${windowFill}" stroke="${windowEdge}" stroke-width="2"/>` +
    `<rect x="64" y="106" width="26" height="22" rx="4" fill="#a9743f" stroke="#8a5f33" stroke-width="2"/></g>`;
}

function goalRing(box) {
  return `<rect x="${box.x - 22}" y="${box.y - 18}" width="196" height="152" rx="24" ` +
    `fill="#c9f5c0" opacity=".45"/>` +
    `<rect x="${box.x - 22}" y="${box.y - 18}" width="196" height="152" rx="24" fill="none" ` +
    `stroke="#4cc45c" stroke-width="7" filter="url(#dv-goal-glow)"/>`;
}

function star(cx, cy, scale = 1.2) {
  return `<path transform="translate(${cx} ${cy}) scale(${scale})" ` +
    `d="M0 -19 L5.6 -6.2 L19.5 -4.6 L9.2 4.6 L12 18.4 L0 11.5 L-12 18.4 L-9.2 4.6 ` +
    `L-19.5 -4.6 L-5.6 -6.2 Z" fill="#ffd23f" stroke="#e0a80f" stroke-width="3" stroke-linejoin="round"/>`;
}

function callout(cx, y, unit) {
  const width = 200;
  const left = Math.min(Math.max(cx - width / 2, 8), 1140 - width - 8);
  return `<g><rect x="${left}" y="${y}" width="${width}" height="46" rx="16" fill="#fffdf4" ` +
    `stroke="#4cc45c" stroke-width="4"/>` +
    `<path d="M${cx - 10} ${y + 44} L${cx + 10} ${y + 44} L${cx} ${y + 64} Z" fill="#fffdf4" ` +
    `stroke="#4cc45c" stroke-width="4" stroke-linejoin="round"/>` +
    `<rect x="${cx - 14}" y="${y + 39}" width="28" height="8" fill="#fffdf4"/>` +
    `<text x="${left + width / 2}" y="${y + 32}" text-anchor="middle" font-size="22" ` +
    `font-weight="800" fill="#2f8a3c">여기가 ${unit}호!</text></g>`;
}

// 위치 마커 — 지금 트럭이 선 칸을 가리킨다(디자인 락 §8 아이콘).
function locationPin(cx, cy) {
  return `<g transform="translate(${cx} ${cy})">` +
    `<ellipse cx="0" cy="8" rx="13" ry="4.5" fill="rgba(0,0,0,.25)"/>` +
    `<path d="M0 6 C-15 -14 -20 -25 -20 -34 A20 20 0 1 1 20 -34 C20 -25 15 -14 0 6 Z" ` +
    `fill="#fff" stroke="#3f9a45" stroke-width="5" stroke-linejoin="round"/>` +
    `<circle cx="0" cy="-34" r="9" fill="#4aa843"/></g>`;
}

function trafficLight(x, y) {
  return `<g transform="translate(${x} ${y})">` +
    `<ellipse cx="0" cy="34" rx="14" ry="5" fill="rgba(0,0,0,.2)"/>` +
    `<rect x="-5" y="-6" width="10" height="40" rx="5" fill="#7c8892"/>` +
    `<rect x="-14" y="-52" width="28" height="52" rx="10" fill="#3d4652"/>` +
    `<circle cx="0" cy="-40" r="7" fill="#ff5b52"/>` +
    `<circle cx="0" cy="-26" r="7" fill="#ffc61e"/>` +
    `<circle cx="0" cy="-12" r="7" fill="#4cc45c"/></g>`;
}

function bench(x, y) {
  return `<g transform="translate(${x} ${y})">` +
    `<ellipse cx="26" cy="20" rx="34" ry="7" fill="rgba(0,0,0,.16)"/>` +
    `<rect x="-2" y="-14" width="56" height="9" rx="4.5" fill="#c08a4e"/>` +
    `<rect x="-2" y="0" width="56" height="9" rx="4.5" fill="#ab7740"/>` +
    `<rect x="2" y="9" width="7" height="12" rx="3" fill="#8a5f33"/>` +
    `<rect x="45" y="9" width="7" height="12" rx="3" fill="#8a5f33"/></g>`;
}

function cone(x, y) {
  return `<g transform="translate(${x} ${y})">` +
    `<ellipse cx="0" cy="22" rx="17" ry="6" fill="rgba(0,0,0,.18)"/>` +
    `<rect x="-16" y="14" width="32" height="9" rx="4" fill="#e8722a"/>` +
    `<path d="M-11 14 L-2 -20 h4 L11 14 Z" fill="#ff8a3d"/>` +
    `<rect x="-8" y="-4" width="16" height="7" rx="2" fill="#fff"/></g>`;
}

function pond(cx, cy) {
  return `<g><ellipse cx="${cx}" cy="${cy}" rx="96" ry="54" fill="#63b85a"/>` +
    `<ellipse cx="${cx}" cy="${cy - 2}" rx="86" ry="46" fill="url(#dv-pond)" ` +
    `stroke="#2f97cf" stroke-width="4"/>` +
    `<ellipse cx="${cx - 26}" cy="${cy - 16}" rx="30" ry="12" fill="#a9e8fb" opacity=".8"/>` +
    `<ellipse cx="${cx + 26}" cy="${cy + 12}" rx="18" ry="7" fill="#a9e8fb" opacity=".55"/></g>`;
}

const ROADS = [
  // 가로 도로 — 보도 · 아스팔트
  `<rect x="0" y="226" width="1140" height="100" fill="#e9ddc6"/>`,
  `<rect x="0" y="236" width="1140" height="80" fill="url(#dv-road)"/>`,
  // 세로 도로 두 줄
  `<rect x="294" y="0" width="92" height="560" fill="#e9ddc6"/>`,
  `<rect x="754" y="0" width="92" height="560" fill="#e9ddc6"/>`,
  `<rect x="304" y="0" width="72" height="560" fill="url(#dv-road)"/>`,
  `<rect x="764" y="0" width="72" height="560" fill="url(#dv-road)"/>`,
];

function laneMarks() {
  const marks = [];
  for (let x = 20; x < 1140; x += 60) {
    if ((x > 292 && x < 388) || (x > 752 && x < 848)) continue;
    marks.push(`<rect x="${x}" y="272" width="34" height="8" rx="4"/>`);
  }
  for (let y = 16; y < 560; y += 58) {
    if (y > 224 && y < 328) continue;
    marks.push(`<rect x="336" y="${y}" width="8" height="32" rx="4"/>`);
    marks.push(`<rect x="796" y="${y}" width="8" height="32" rx="4"/>`);
  }
  return `<g fill="#fff" opacity=".92">${marks.join("")}</g>`;
}

function crosswalk(x) {
  const stripes = [0, 26, 52, 78, 104]
    .map(offset => `<rect x="${x + offset}" y="242" width="15" height="68" rx="5"/>`)
    .join("");
  return `<g fill="#fff" opacity=".95">${stripes}</g>`;
}

const DEFS =
  `<defs>` +
  `<linearGradient id="dv-grass" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#8ede6f"/><stop offset="1" stop-color="#63c055"/></linearGradient>` +
  `<linearGradient id="dv-road" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#a3aeb7"/><stop offset="1" stop-color="#8d99a3"/></linearGradient>` +
  `<linearGradient id="dv-pond" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#79d6f5"/><stop offset="1" stop-color="#3aa9e0"/></linearGradient>` +
  `<filter id="dv-goal-glow" x="-40%" y="-40%" width="180%" height="180%">` +
  `<feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#5cd06a" flood-opacity=".95"/>` +
  `</filter></defs>`;

const SCENERY =
  `<rect width="1140" height="560" fill="url(#dv-grass)"/>` +
  `<g fill="#7ed267" opacity=".5">` +
  `<ellipse cx="120" cy="30" rx="70" ry="24"/><ellipse cx="660" cy="24" rx="80" ry="24"/>` +
  `<ellipse cx="1040" cy="512" rx="70" ry="24"/><ellipse cx="450" cy="524" rx="80" ry="22"/></g>` +
  ROADS.join("") +
  laneMarks() +
  crosswalk(108) +
  `<circle cx="800" cy="276" r="14" fill="#7c8892" stroke="#69747d" stroke-width="3"/>` +
  `<circle cx="800" cy="276" r="7" fill="#6d7982"/>` +
  trafficLight(404, 216) +
  pond(110, 466) +
  bench(214, 384) +
  tree(238, 96, 0.9) +
  tree(452, 92, 0.78) +
  tree(690, 96, 0.78) +
  tree(902, 92, 0.8) +
  tree(1010, 428, 1.02) +
  tree(1094, 470, 0.8) +
  tree(930, 476, 0.76) +
  cone(700, 400) +
  flowers(226, 176, "#fff") +
  flowers(690, 172, "#ff9ec4") +
  flowers(920, 176, "#ffd84d") +
  flowers(392, 470, "#fff") +
  flowers(716, 486, "#ffd84d");

/**
 * @param {{houses: Array, targetUnit: number, truck: {x:number,y:number}, facing: string}} view
 */
export function estateMapSvg(view) {
  const { houses, targetUnit, truck, facing } = view;
  const anchor = anchorFor(truck);

  const buildings = houses
    .map((item, index) => {
      const box = HOUSE_BOXES[`${item.cell.x},${item.cell.y}`];
      if (!box) return "";
      const goal = item.unit === targetUnit;
      const tone = goal ? GOAL_ROOF : ROOF_TONES[index % ROOF_TONES.length];
      return (goal ? goalRing(box) : "") + house(box, item.unit, tone, goal);
    })
    .join("");

  const goalHouse = houses.find(item => item.unit === targetUnit);
  const goalBox = goalHouse ? HOUSE_BOXES[`${goalHouse.cell.x},${goalHouse.cell.y}`] : null;
  const marker = goalBox
    ? callout(goalBox.x + HOUSE_WIDTH / 2, goalBox.y - 58, targetUnit) +
      star(goalBox.x + HOUSE_WIDTH / 2, goalBox.y + 26)
    : "";

  // 뷰마다 높이가 달라 바닥(바퀴)을 앵커에 맞춘다 — 같은 차가 같은 자리에 선다.
  const height = truckSpriteHeight(facing, TRUCK_WIDTH);
  const sprite = truckSprite(facing, {
    x: anchor.x - TRUCK_WIDTH / 2,
    y: anchor.y + 14 - height,
    width: TRUCK_WIDTH,
  });

  return `<svg class="dv-map" viewBox="${MAP_VIEW_BOX}" preserveAspectRatio="xMidYMid slice" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="아파트 단지 지도. 목표는 ${targetUnit}호예요.">` +
    DEFS + SCENERY + buildings + marker +
    locationPin(anchor.x, anchor.y - 24 - height) + sprite +
    `</svg>`;
}
