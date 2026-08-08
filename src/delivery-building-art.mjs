// STEP 2·3·4 건물 안 그림 — 디자인 정본 락 §5 의 구현.
//   · 샤프트 단면 + 승강기 안  (§5 STEP 2)
//   · 복도와 문 세 짝           (§5 STEP 3)
//   · 열린 문과 컨베이어        (§5 STEP 4)
// 승강기에 타는 것은 시트 §5 레이아웃대로 택배 트럭이다(디자인 락 §10 참고).
// 그 판단만 ELEVATOR_RIDER 한 줄에 모아 두어 뒤집기 쉽게 했다.

import { truckSprite } from "./delivery-truck-art.mjs";

export const ELEVATOR_RIDER = "truck"; // "truck" | "courier"

export const COURIER_IMAGE = "assets/characters/nine.png";

const SHAFT_VIEW_BOX = "0 0 200 520";
const CABIN_VIEW_BOX = "0 0 1040 510";
const HALL_VIEW_BOX = "0 0 1100 460";

/* ── 공통 조각 ────────────────────────────────────────────────────── */

function parcelBox(x, y, width, height) {
  const seam = height * 0.17;
  return `<g transform="translate(${x} ${y})">` +
    `<rect x="0" y="0" width="${width}" height="${height}" rx="9" fill="url(#dv-carton)" ` +
    `stroke="#a56f3c" stroke-width="4"/>` +
    `<rect x="0" y="${height / 2 - seam / 2}" width="${width}" height="${seam}" fill="#dba76a" opacity=".85"/>` +
    `<rect x="${width / 2 - width * 0.07}" y="0" width="${width * 0.14}" height="${height}" ` +
    `fill="#dba76a" opacity=".85"/></g>`;
}

const CARTON_DEF =
  `<linearGradient id="dv-carton" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#e6b57e"/><stop offset="1" stop-color="#c68b4f"/></linearGradient>`;

function star(cx, cy, scale = 1.15) {
  return `<path transform="translate(${cx} ${cy}) scale(${scale})" ` +
    `d="M0 -19 L5.6 -6.2 L19.5 -4.6 L9.2 4.6 L12 18.4 L0 11.5 L-12 18.4 L-9.2 4.6 ` +
    `L-19.5 -4.6 L-5.6 -6.2 Z" fill="#ffd23f" stroke="#e0a80f" stroke-width="3" stroke-linejoin="round"/>`;
}

/* ── STEP 2 · 샤프트 단면 ─────────────────────────────────────────── */

const SHAFT_TOP = 44;
const SHAFT_STEP = 68;

function floorY(floor, topFloor) {
  return SHAFT_TOP + (topFloor - floor) * SHAFT_STEP;
}

export function elevatorShaftSvg({ topFloor = 7, current = 1, target = 7 }) {
  const numbers = [];
  for (let floor = topFloor; floor >= 1; floor -= 1) {
    const y = floorY(floor, topFloor);
    numbers.push(`<text x="30" y="${y + 9}" text-anchor="middle" font-size="25" ` +
      `font-weight="800" fill="#5a6878">${floor}</text>`);
  }

  const targetY = floorY(target, topFloor);
  const carY = floorY(current, topFloor);

  const dots = [];
  for (let y = SHAFT_TOP + 24; y <= floorY(1, topFloor) + 24; y += 26) {
    dots.push(`<circle cx="173" cy="${y}" r="5"/>`);
  }

  const rider = ELEVATOR_RIDER === "truck"
    ? truckSprite("down", { x: 78, y: carY - 26, width: 48 })
    : `<image href="${COURIER_IMAGE}" x="80" y="${carY - 28}" width="44" height="56" ` +
      `preserveAspectRatio="xMidYMid meet"/>`;

  return `<svg class="dv-shaft" viewBox="${SHAFT_VIEW_BOX}" preserveAspectRatio="xMidYMid meet" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="엘리베이터 통로. 지금 ${current}층, 목표는 ${target}층이에요.">` +
    `<defs>` +
    `<linearGradient id="dv-shaftwall" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#4a545e"/><stop offset=".45" stop-color="#6d7a86"/>` +
    `<stop offset="1" stop-color="#414b55"/></linearGradient>` +
    `<linearGradient id="dv-car" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#e6edf3"/><stop offset="1" stop-color="#b8c5d0"/></linearGradient>` +
    `</defs>` +
    `<rect width="200" height="520" fill="#ccd5dd"/>` +
    `<rect x="6" y="8" width="48" height="504" rx="14" fill="#eef3f7" stroke="#c3ced8" stroke-width="3"/>` +
    numbers.join("") +
    `<rect x="9" y="${targetY - 22}" width="42" height="44" rx="11" fill="none" stroke="#f0b323" stroke-width="4"/>` +
    `<rect x="62" y="8" width="80" height="504" rx="10" fill="url(#dv-shaftwall)"/>` +
    `<g stroke="#8c98a4" stroke-width="3" opacity=".55">` +
    `<line x1="76" y1="14" x2="76" y2="506"/><line x1="128" y1="14" x2="128" y2="506"/></g>` +
    `<circle cx="102" cy="24" r="9" fill="#aab6c1" stroke="#79848f" stroke-width="3"/>` +
    `<line x1="102" y1="33" x2="102" y2="${carY - 36}" stroke="#8f9aa5" stroke-width="3"/>` +
    `<rect x="66" y="${carY - 36}" width="72" height="72" rx="9" fill="url(#dv-car)" ` +
    `stroke="#7d8b98" stroke-width="3"/>` +
    rider +
    `<rect x="62" y="${carY - 40}" width="80" height="80" rx="13" fill="none" stroke="#f0b323" stroke-width="5"/>` +
    `<rect x="152" y="8" width="42" height="504" rx="14" fill="#eef3f7" stroke="#c3ced8" stroke-width="3"/>` +
    `<g fill="#c3ced8">${dots.join("")}</g>` +
    `<circle cx="173" cy="${targetY}" r="9" fill="#4fc45a" stroke="#2f9c3d" stroke-width="3"/>` +
    `<circle cx="173" cy="${carY}" r="9" fill="#ff9130" stroke="#dd7212" stroke-width="3"/>` +
    `</svg>`;
}

/* ── STEP 2 · 승강기 안 ───────────────────────────────────────────── */

export function elevatorCabinSvg({ current = 1, doorsOpen = false } = {}) {
  const rider = ELEVATOR_RIDER === "truck"
    ? truckSprite("down", { x: 355, y: 100, width: 330 })
    : `<image href="${COURIER_IMAGE}" x="426" y="98" width="188" height="302" ` +
      `preserveAspectRatio="xMidYMax meet"/>` +
      parcelBox(440, 330, 160, 92);

  const doorGap = doorsOpen ? 120 : 0;

  return `<svg class="dv-cabin" viewBox="${CABIN_VIEW_BOX}" preserveAspectRatio="xMidYMid slice" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" aria-label="엘리베이터 안.">` +
    `<defs>${CARTON_DEF}` +
    `<linearGradient id="dv-cabwall" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#dde5ec"/><stop offset=".5" stop-color="#c2ccd6"/>` +
    `<stop offset="1" stop-color="#a7b3bf"/></linearGradient>` +
    `<linearGradient id="dv-cabL" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#8b97a4"/><stop offset="1" stop-color="#c6d0d9"/></linearGradient>` +
    `<linearGradient id="dv-cabR" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#c6d0d9"/><stop offset="1" stop-color="#8b97a4"/></linearGradient>` +
    `<linearGradient id="dv-mirror" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#d3e8f4"/><stop offset=".5" stop-color="#a6cde3"/>` +
    `<stop offset="1" stop-color="#dcedf7"/></linearGradient>` +
    `<linearGradient id="dv-cabfloor" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#9ba7b3"/><stop offset="1" stop-color="#74808c"/></linearGradient>` +
    `<radialGradient id="dv-lamp" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0" stop-color="#fffdf0"/><stop offset="1" stop-color="#ffeeb8"/></radialGradient>` +
    `</defs>` +
    `<rect width="1040" height="510" fill="#8f9ba7"/>` +
    `<polygon points="0,0 1040,0 880,84 160,84" fill="#ccd6df" stroke="#aeb9c4" stroke-width="3"/>` +
    `<rect x="300" y="26" width="150" height="28" rx="10" fill="url(#dv-lamp)" stroke="#e6d9a8" stroke-width="3"/>` +
    `<rect x="590" y="26" width="150" height="28" rx="10" fill="url(#dv-lamp)" stroke="#e6d9a8" stroke-width="3"/>` +
    `<polygon points="300,54 450,54 484,124 266,124" fill="#fff6d8" opacity=".42"/>` +
    `<polygon points="590,54 740,54 774,124 556,124" fill="#fff6d8" opacity=".42"/>` +
    `<polygon points="0,0 160,84 160,400 0,510" fill="url(#dv-cabL)"/>` +
    `<polygon points="1040,0 880,84 880,400 1040,510" fill="url(#dv-cabR)"/>` +
    `<rect x="160" y="84" width="720" height="316" fill="url(#dv-cabwall)" stroke="#9dabb8" stroke-width="3"/>` +
    `<rect x="${215 - doorGap}" y="120" width="240" height="132" rx="8" fill="url(#dv-mirror)" ` +
    `stroke="#8fa8b8" stroke-width="4"/>` +
    `<rect x="${585 + doorGap}" y="120" width="240" height="132" rx="8" fill="url(#dv-mirror)" ` +
    `stroke="#8fa8b8" stroke-width="4"/>` +
    `<rect x="185" y="276" width="670" height="13" rx="6.5" fill="#ccd6df" stroke="#8b98a5" stroke-width="3"/>` +
    `<path d="M34 300 L158 280" stroke="#ccd6df" stroke-width="12" stroke-linecap="round"/>` +
    `<path d="M1006 300 L882 280" stroke="#ccd6df" stroke-width="12" stroke-linecap="round"/>` +
    `<rect x="898" y="148" width="76" height="188" rx="13" fill="#e8eef4" stroke="#98a5b2" stroke-width="3"/>` +
    `<rect x="910" y="160" width="52" height="30" rx="7" fill="#2b3540"/>` +
    `<text x="936" y="182" text-anchor="middle" font-size="18" font-weight="800" fill="#ffcf4a">▲${current}</text>` +
    `<g fill="#8e9aa6"><circle cx="922" cy="214" r="9"/><circle cx="950" cy="214" r="9"/>` +
    `<circle cx="922" cy="242" r="9"/><circle cx="950" cy="242" r="9"/>` +
    `<circle cx="922" cy="270" r="9"/><circle cx="950" cy="270" r="9"/>` +
    `<circle cx="922" cy="298" r="9"/><circle cx="950" cy="298" r="9"/></g>` +
    `<circle cx="922" cy="214" r="9" fill="#4fc45a"/>` +
    `<polygon points="0,510 160,400 880,400 1040,510" fill="url(#dv-cabfloor)"/>` +
    `<ellipse cx="520" cy="436" rx="150" ry="26" fill="#5f6b77" opacity=".35"/>` +
    rider +
    `</svg>`;
}

/* ── STEP 3 · 복도 ────────────────────────────────────────────────── */

const DOOR_SLOTS = [
  { frame: 222, slab: 232, plate: 272, handle: 374, center: 310 },
  { frame: 462, slab: 472, plate: 512, handle: 614, center: 550 },
  { frame: 702, slab: 712, plate: 752, handle: 854, center: 790 },
];

function corridorDoor(slot, unit, goal) {
  const fill = goal ? "url(#dv-doorgold)" : "url(#dv-door)";
  const plateFill = goal ? "#fffaea" : "#fdf6e6";
  const plateEdge = goal ? "#e0b45c" : "#c3ab84";
  const ink = goal ? "#c8791b" : "#4a4034";
  const handle = goal ? "#ffd45c" : "#e8bb4f";

  return (goal
    ? `<rect x="${slot.frame - 10}" y="94" width="196" height="248" rx="15" fill="none" ` +
      `stroke="#ffc93d" stroke-width="7" filter="url(#dv-goldglow)"/>`
    : "") +
    `<rect x="${slot.frame}" y="104" width="176" height="228" rx="8" fill="#68401f"/>` +
    `<rect x="${slot.slab}" y="112" width="156" height="220" rx="5" fill="${fill}"/>` +
    `<rect x="${slot.slab + 16}" y="180" width="124" height="60" rx="5" fill="none" stroke="#63401e" stroke-width="4"/>` +
    `<rect x="${slot.slab + 16}" y="254" width="124" height="60" rx="5" fill="none" stroke="#63401e" stroke-width="4"/>` +
    `<rect x="${slot.slab + 4}" y="116" width="9" height="212" fill="#fff" opacity=".1"/>` +
    `<rect x="${slot.plate}" y="126" width="76" height="36" rx="8" fill="${plateFill}" ` +
    `stroke="${plateEdge}" stroke-width="3.5"/>` +
    `<text x="${slot.plate + 38}" y="153" text-anchor="middle" font-size="24" font-weight="800" ` +
    `fill="${ink}">${unit}</text>` +
    `<circle cx="${slot.handle}" cy="228" r="9" fill="${handle}" stroke="#b8892a" stroke-width="3"/>` +
    (goal ? star(slot.center, 66) : "");
}

export function corridorSvg({ units, focus = 0, targetUnit }) {
  const doors = units
    .map((unit, index) => corridorDoor(DOOR_SLOTS[index] ?? DOOR_SLOTS[0], unit, unit === targetUnit))
    .join("");

  const stand = DOOR_SLOTS[Math.min(focus, DOOR_SLOTS.length - 1)].center;

  return `<svg class="dv-corridor" viewBox="${HALL_VIEW_BOX}" preserveAspectRatio="xMidYMid slice" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="아파트 복도. ${units.join("호, ")}호 문이 있고 ${targetUnit}호 문이 빛나요.">` +
    `<defs>${CARTON_DEF}` +
    `<linearGradient id="dv-hallwall" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#f0dcb6"/><stop offset="1" stop-color="#e0c99e"/></linearGradient>` +
    `<linearGradient id="dv-hallceil" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#fbf1dc"/><stop offset="1" stop-color="#ecdcba"/></linearGradient>` +
    `<linearGradient id="dv-hallfloor" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#dcc6a0"/><stop offset="1" stop-color="#c0a67c"/></linearGradient>` +
    `<linearGradient id="dv-door" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#9c6634"/><stop offset=".42" stop-color="#8a5628"/>` +
    `<stop offset="1" stop-color="#71441f"/></linearGradient>` +
    `<linearGradient id="dv-doorgold" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#ad7439"/><stop offset=".42" stop-color="#99632d"/>` +
    `<stop offset="1" stop-color="#7e4e22"/></linearGradient>` +
    `<radialGradient id="dv-halllamp" cx="50%" cy="50%" r="50%">` +
    `<stop offset="0" stop-color="#fffdf2"/><stop offset="1" stop-color="#ffedbe"/></radialGradient>` +
    `<filter id="dv-goldglow" x="-45%" y="-45%" width="190%" height="190%">` +
    `<feDropShadow dx="0" dy="0" stdDeviation="11" flood-color="#ffcc3d" flood-opacity="1"/></filter>` +
    `</defs>` +
    `<rect width="1100" height="460" fill="#d8c096"/>` +
    `<polygon points="0,0 1100,0 960,62 140,62" fill="url(#dv-hallceil)"/>` +
    `<rect x="470" y="12" width="160" height="22" rx="9" fill="url(#dv-halllamp)" stroke="#e8d5a4" stroke-width="3"/>` +
    `<polygon points="470,34 630,34 720,150 380,150" fill="#fff6da" opacity=".42"/>` +
    `<polygon points="0,0 140,62 140,332 0,460" fill="#c9ad81"/>` +
    `<polygon points="1100,0 960,62 960,332 1100,460" fill="#c9ad81"/>` +
    `<rect x="140" y="62" width="820" height="270" fill="url(#dv-hallwall)"/>` +
    `<rect x="140" y="276" width="820" height="56" fill="#b98a56"/>` +
    `<rect x="140" y="272" width="820" height="9" rx="4" fill="#d0a574"/>` +
    `<polygon points="0,460 140,332 960,332 1100,460" fill="url(#dv-hallfloor)"/>` +
    `<g stroke="#b09668" stroke-width="2.5" opacity=".7">` +
    `<line x1="140" y1="332" x2="0" y2="460"/><line x1="304" y1="332" x2="230" y2="460"/>` +
    `<line x1="468" y1="332" x2="460" y2="460"/><line x1="632" y1="332" x2="690" y2="460"/>` +
    `<line x1="796" y1="332" x2="920" y2="460"/><line x1="960" y1="332" x2="1100" y2="460"/>` +
    `<line x1="112" y1="372" x2="988" y2="372"/><line x1="66" y1="418" x2="1034" y2="418"/></g>` +
    doors +
    // 택배 기사는 고른 문 앞에 선다.
    `<ellipse cx="${stand}" cy="424" rx="86" ry="17" fill="#8a7047" opacity=".35"/>` +
    `<image href="${COURIER_IMAGE}" x="${stand - 78}" y="230" width="156" height="194" ` +
    `preserveAspectRatio="xMidYMax meet"/>` +
    parcelBox(stand + 62, 344, 108, 72) +
    `</svg>`;
}

/* ── STEP 4 · 전달 순간 ───────────────────────────────────────────── */

const CRATE_SLOTS = [304, 466, 628];
const CRATE_WIDTH = 146;

function crate(centerX, base, item, picked) {
  const half = CRATE_WIDTH / 2;
  const lift = picked ? 8 : 0;
  const y = base - lift;
  return (picked
    ? `<rect x="${centerX - half - 9}" y="${y - 150}" width="${CRATE_WIDTH + 18}" height="148" rx="17" ` +
      `fill="none" stroke="#ffc93d" stroke-width="7" filter="url(#dv-pickglow)"/>`
    : "") +
    `<g transform="translate(${centerX} ${y})">` +
    `<rect x="${-half}" y="-142" width="${CRATE_WIDTH}" height="134" rx="12" fill="url(#dv-crate)" ` +
    `stroke="#c49b62" stroke-width="4"/>` +
    `<rect x="-61" y="-132" width="122" height="76" rx="10" fill="#fffaee" stroke="#dcbd8c" stroke-width="3"/>` +
    `<text x="0" y="-74" text-anchor="middle" font-size="46">${item.emoji}</text>` +
    `<rect x="-63" y="-48" width="126" height="32" rx="10" fill="#fff6e2" stroke="#dcbd8c" stroke-width="3"/>` +
    `<text x="0" y="-24" text-anchor="middle" font-size="19" font-weight="800" fill="#7a5f34">${item.label}</text>` +
    `</g>`;
}

function receivingFriend(cx, baseY, friend) {
  return `<g transform="translate(${cx} ${baseY})">` +
    `<ellipse cx="0" cy="6" rx="62" ry="13" fill="#8a7047" opacity=".4"/>` +
    `<rect x="-24" y="-30" width="14" height="34" rx="7" fill="#3f4a5a"/>` +
    `<rect x="10" y="-30" width="14" height="34" rx="7" fill="#3f4a5a"/>` +
    `<rect x="-46" y="-112" width="92" height="86" rx="11" fill="${friend.color}" stroke="${friend.edge}" stroke-width="4"/>` +
    `<rect x="-46" y="-198" width="92" height="90" rx="11" fill="${friend.color}" stroke="${friend.edge}" stroke-width="4"/>` +
    `<path d="M46 -172 q38 -8 48 -46" stroke="#3f4a5a" stroke-width="13" fill="none" stroke-linecap="round"/>` +
    `<path d="M-46 -160 q-30 10 -32 38" stroke="#3f4a5a" stroke-width="13" fill="none" stroke-linecap="round"/>` +
    `<ellipse cx="-17" cy="-162" rx="15" ry="17" fill="#fff" stroke="#3f4a5a" stroke-width="4"/>` +
    `<ellipse cx="17" cy="-162" rx="15" ry="17" fill="#fff" stroke="#3f4a5a" stroke-width="4"/>` +
    `<circle cx="-14" cy="-160" r="6.5" fill="#1f2733"/><circle cx="20" cy="-160" r="6.5" fill="#1f2733"/>` +
    `<circle cx="-11.8" cy="-163" r="2.2" fill="#fff"/><circle cx="22.2" cy="-163" r="2.2" fill="#fff"/>` +
    `<path d="M-16 -132 q16 19 32 0 z" fill="#2b1416" stroke="#3f4a5a" stroke-width="4" stroke-linejoin="round"/>` +
    `</g>`;
}

function speechBubble(text) {
  const [first, second] = text;
  return `<g>` +
    `<rect x="576" y="14" width="440" height="112" rx="26" fill="#fffdf4" stroke="#e2d4b4" stroke-width="5"/>` +
    `<path d="M812 122 L858 122 L830 164 Z" fill="#fffdf4" stroke="#e2d4b4" stroke-width="5" stroke-linejoin="round"/>` +
    `<rect x="808" y="114" width="56" height="14" fill="#fffdf4"/>` +
    `<text x="796" y="60" text-anchor="middle" font-size="27" font-weight="800" fill="#4a4034">${first}</text>` +
    `<text x="796" y="99" text-anchor="middle" font-size="27" font-weight="800" fill="#4a4034">${second}</text>` +
    `</g>`;
}

export function handoverSvg({ tray, focus = 0, wanted, unit, friend }) {
  const crates = tray
    .map((item, index) => crate(CRATE_SLOTS[index] ?? CRATE_SLOTS[0], 374, item, index === focus))
    .join("");

  const rollers = [];
  for (let x = 186; x <= 748; x += 52) rollers.push(`<circle cx="${x}" cy="398" r="11"/>`);

  return `<svg class="dv-handover" viewBox="${HALL_VIEW_BOX}" preserveAspectRatio="xMidYMid slice" ` +
    `xmlns="http://www.w3.org/2000/svg" role="img" ` +
    `aria-label="${unit}호 친구가 ${wanted.label}를 기다려요. 과일, 화장품, 장난감 상자가 놓여 있어요.">` +
    `<defs>` +
    `<linearGradient id="dv-hwall" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#f0dcb6"/><stop offset="1" stop-color="#ddc59a"/></linearGradient>` +
    `<linearGradient id="dv-hfloor" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#d7c098"/><stop offset="1" stop-color="#bda379"/></linearGradient>` +
    `<linearGradient id="dv-room" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#f8e2b2"/><stop offset="1" stop-color="#c99a63"/></linearGradient>` +
    `<linearGradient id="dv-opendoor" x1="0" y1="0" x2="1" y2="0">` +
    `<stop offset="0" stop-color="#a06a34"/><stop offset="1" stop-color="#78471f"/></linearGradient>` +
    `<linearGradient id="dv-crate" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#f2dfb8"/><stop offset="1" stop-color="#d8ba86"/></linearGradient>` +
    `<linearGradient id="dv-belt" x1="0" y1="0" x2="0" y2="1">` +
    `<stop offset="0" stop-color="#8d98a4"/><stop offset="1" stop-color="#5b6672"/></linearGradient>` +
    `<filter id="dv-pickglow" x="-45%" y="-45%" width="190%" height="190%">` +
    `<feDropShadow dx="0" dy="0" stdDeviation="12" flood-color="#ffcc3d" flood-opacity="1"/></filter>` +
    `</defs>` +
    `<rect width="1100" height="460" fill="url(#dv-hwall)"/>` +
    `<rect x="0" y="0" width="1100" height="14" fill="#e2cba2"/>` +
    `<line x1="0" y1="104" x2="1100" y2="104" stroke="#dcc59c" stroke-width="3" opacity=".8"/>` +
    `<rect x="0" y="338" width="1100" height="122" fill="url(#dv-hfloor)"/>` +
    `<g stroke="#ab9268" stroke-width="2.5" opacity=".55">` +
    `<line x1="0" y1="386" x2="1100" y2="386"/><line x1="0" y1="428" x2="1100" y2="428"/></g>` +
    `<rect x="100" y="52" width="252" height="286" rx="8" fill="#68401f"/>` +
    `<rect x="112" y="62" width="228" height="276" fill="url(#dv-room)"/>` +
    `<polygon points="112,62 340,62 296,128 158,128" fill="#fff2cf" opacity=".55"/>` +
    `<polygon points="112,338 340,338 402,460 50,460" fill="#ffeec4" opacity=".36"/>` +
    `<polygon points="100,52 12,84 12,372 100,338" fill="url(#dv-opendoor)" stroke="#5f3d1c" ` +
    `stroke-width="4" stroke-linejoin="round"/>` +
    `<polygon points="28,118 86,98 86,200 28,214" fill="none" stroke="#5f3d1c" stroke-width="4"/>` +
    `<polygon points="28,240 86,228 86,322 28,332" fill="none" stroke="#5f3d1c" stroke-width="4"/>` +
    `<circle cx="92" cy="226" r="8" fill="#e8bb4f" stroke="#b8892a" stroke-width="3"/>` +
    `<rect x="248" y="12" width="106" height="34" rx="9" fill="#fffaea" stroke="#e0b45c" stroke-width="3.5"/>` +
    `<text x="301" y="38" text-anchor="middle" font-size="23" font-weight="800" fill="#c8791b">${unit}</text>` +
    receivingFriend(890, 338, friend) +
    speechBubble([`나는 ${wanted.label}를`, "기다리고 있었어!"]) +
    `<rect x="158" y="374" width="616" height="48" rx="17" fill="url(#dv-belt)" stroke="#4c5661" stroke-width="4"/>` +
    `<g fill="#aeb8c3">${rollers.join("")}</g>` +
    `<rect x="186" y="422" width="17" height="28" rx="7" fill="#4c5661"/>` +
    `<rect x="728" y="422" width="17" height="28" rx="7" fill="#4c5661"/>` +
    crates +
    `</svg>`;
}
