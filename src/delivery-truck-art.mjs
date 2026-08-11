// 포장이 6뷰 도면 — 목업 v3 의 노란 트럭(mockups/v3/mockup-v3-2-rhythm.html 측면,
// mockup-v3-6-finale.html 통과 컷, mockup-v3-1-map.html 탑다운)을 정본으로 삼는다.
//
// 시트 주석은 그대로 유효하다: "모든 방향은 동일 차량. 비율과 얼굴 형태를 변경하지 마세요."
// 그래서 부품(얼굴·바퀴·적재함·범퍼)을 한 벌만 정의해 뷰마다 재사용하고,
// 반대 방향 뷰는 새로 그리지 않고 같은 그림을 좌우 반전한다.
//
// v1 대비 바뀐 것은 팔레트와 디테일뿐이다 — 정면 치수 비례(§4)는 한 자리도 건드리지 않았다.
// 색과 비례는 아래 상수가 유일한 원본이며 tests/delivery-design-lock.test.mjs 가 지킨다.

export const TRUCK_COLORS = Object.freeze({
  body: "#FFC531",
  bodyLight: "#FFD766",
  edge: "#E8A61E",
  logo: "#FFF6D9",
  logoInk: "#6B5433",
  glass: "#DDF1FB",
  glassEdge: "#B9DCEC",
  ink: "#39434C",
  smile: "#B3541E",
  cheek: "#FF9E8A",
  chassis: "#5B6472",
  hub: "#C9D2DA",
  name: "#8A5A10",
  tailRed: "#E86A50",
  tailAmber: "#F5A623",
});

// 정면 기준 치수 비례(디자인 락 §4). 퍼센트는 전체 높이 대비. v1 에서 그대로 옮겼다.
export const TRUCK_FRONT_METRICS = Object.freeze({
  viewBox: "0 0 200 200",
  left: 10,
  top: 12,
  totalWidth: 180, // 100%
  totalHeight: 180, // 100%
  windshieldHeight: 68, // 37.8% ≈ 38%
  eyeDiameter: 29, // 16.1% ≈ 16%
  grilleHeight: 11, // 6.1% ≈ 6%
});

export const TRUCK_VIEWS = Object.freeze([
  "front",
  "front34",
  "side",
  "front34-rev",
  "side-rev",
  "rear",
]);

const C = TRUCK_COLORS;
const M = TRUCK_FRONT_METRICS;

// 도면 전체가 쓰는 외곽선 굵기. 장난감 같은 두께감이 이 차의 인상이다.
const EDGE = 5;

function wrap(view, viewBox, body) {
  return `<svg class="dv-truck dv-truck-${view}" viewBox="${viewBox}" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// 좌우 반전 — 반대 방향 뷰를 새로 그리지 않기 위한 유일한 수단.
function mirror(width, body) {
  return `<g transform="translate(${width} 0) scale(-1 1)">${body}</g>`;
}

function shadow(cx, cy, rx) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${rx * 0.09}" fill="rgba(20,30,45,.18)"/>`;
}

function wheel(cx, cy, radius) {
  const hub = radius * 0.42;
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${C.ink}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${hub}" fill="${C.hub}"/>`;
}

// 눈 한 쌍 — 지름은 정면 기준 16%. 다른 뷰는 같은 눈을 비율만 줄여 쓴다.
// 얼굴이 있는 뷰만 dv-face 를 단다: 그림만 보고도 앞을 보는 뷰인지 알 수 있다.
function eyes(leftX, rightX, cy, diameter) {
  const r = diameter / 2;
  const pair = [leftX, rightX].map(cx =>
    `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#fff"/>` +
    `<circle cx="${cx + r * 0.15}" cy="${cy + r * 0.13}" r="${r * 0.5}" fill="${C.ink}"/>` +
    `<circle cx="${cx + r * 0.34}" cy="${cy - r * 0.24}" r="${r * 0.19}" fill="#fff"/>`
  ).join("");
  return `<g class="dv-face">${pair}</g>`;
}

// 그릴 = 미소. 띠의 두께가 곧 "그릴 높이"라 상수를 그대로 쓴다.
function grilleSmile(centerX, topY, halfWidth, thickness, dip) {
  const left = centerX - halfWidth;
  const right = centerX + halfWidth;
  return `<path d="M${left} ${topY} Q${centerX} ${topY + dip} ${right} ${topY} ` +
    `L${right} ${topY + thickness} Q${centerX} ${topY + dip + thickness} ` +
    `${left} ${topY + thickness} Z" fill="${C.logo}" stroke="${C.smile}" ` +
    `stroke-width="2.5" stroke-linejoin="round"/>`;
}

function cheeks(leftX, rightX, cy, radius) {
  return [leftX, rightX]
    .map(cx => `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${C.cheek}" opacity=".72"/>`)
    .join("");
}

function panel(x, y, width, height, radius) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" ` +
    `fill="${C.body}" stroke="${C.edge}" stroke-width="${EDGE}"/>`;
}

// 지붕 하이라이트 — 모든 뷰에 들어가는 "같은 차" 표식(v1 의 블루 포인트 자리).
function roofBand(x, y, width, height) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" ` +
    `rx="${height / 2}" fill="${C.bodyLight}"/>`;
}

// 짐칸 옆에 붙는 로고 상자 — 목업 v3 의 "웃는 택배상자" 마크.
function logoBox(x, y, size) {
  const half = size / 2;
  return `<g transform="translate(${x} ${y})">` +
    `<rect x="0" y="0" width="${size}" height="${size}" rx="${size * 0.15}" ` +
      `fill="${C.logo}" stroke="${C.edge}" stroke-width="3"/>` +
    `<path d="M0 ${half} h${size} M${half} 0 v${half}" stroke="${C.edge}" stroke-width="2.5"/>` +
    `<circle cx="${half * 0.7}" cy="${size * 0.72}" r="${size * 0.065}" fill="${C.logoInk}"/>` +
    `<circle cx="${size - half * 0.7}" cy="${size * 0.72}" r="${size * 0.065}" fill="${C.logoInk}"/>` +
    `<path d="M${half * 0.78} ${size * 0.84} q${half * 0.22} ${size * 0.1} ${half * 0.44} 0" ` +
      `stroke="${C.logoInk}" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>`;
}

/* ── FRONT (정면) — 치수 비례의 기준이 되는 뷰 ─────────────────────── */

export function truckFrontSvg() {
  const bodyTop = M.top; // 12
  const bodyBottom = 164;
  const windshieldTop = 44;
  const eyeCy = windshieldTop + M.windshieldHeight / 2; // 78

  return wrap("front", M.viewBox, [
    shadow(100, 191, 84),
    // 사이드 미러가 전체 너비(10~190)의 양 끝을 만든다.
    `<rect x="10" y="66" width="16" height="26" rx="7" fill="${C.chassis}"/>`,
    `<rect x="174" y="66" width="16" height="26" rx="7" fill="${C.chassis}"/>`,
    // 캡오버 차체 — 정면은 운전실 한 덩어리로 보인다.
    panel(20, bodyTop, 160, bodyBottom - bodyTop, 21),
    roofBand(30, 18, 140, 18),
    // 앞유리
    `<rect x="40" y="${windshieldTop}" width="120" height="${M.windshieldHeight}" rx="16" ` +
      `fill="${C.glass}" stroke="${C.glassEdge}" stroke-width="${EDGE}"/>`,
    eyes(76, 124, eyeCy, M.eyeDiameter),
    cheeks(56, 144, 122, 9),
    grilleSmile(100, 124, 44, M.grilleHeight, 15),
    // 범퍼 · 하부
    `<rect x="20" y="162" width="160" height="20" rx="9" fill="${C.chassis}"/>`,
    wheel(42, 175, 17),
    wheel(158, 175, 17),
  ].join(""));
}

/* ── SIDE (측면) — 오른쪽을 향한다. 옆에서는 얼굴이 보이지 않는다. ─── */

const SIDE_VIEW_BOX = "0 0 320 190";

function sideBody() {
  return [
    shadow(160, 180, 140),
    // 적재함
    panel(12, 24, 168, 112, 11),
    roofBand(20, 30, 152, 18),
    logoBox(30, 62, 46),
    `<text x="128" y="112" text-anchor="middle" font-size="24" font-weight="800" ` +
      `fill="${C.name}">포장이</text>`,
    // 운전실 — 캡오버라 앞면이 거의 수직으로 서고 코끝만 둥글다.
    `<path d="M180 22 H256 Q274 22 281 39 L295 80 Q299 90 295 98 V136 H180 Z" ` +
      `fill="${C.body}" stroke="${C.edge}" stroke-width="${EDGE}" stroke-linejoin="round"/>`,
    // 문 · 옆 창
    `<rect x="190" y="32" width="92" height="104" rx="11" fill="none" stroke="${C.edge}" stroke-width="3"/>`,
    `<rect x="198" y="42" width="74" height="50" rx="13" fill="${C.glass}" ` +
      `stroke="${C.glassEdge}" stroke-width="${EDGE}"/>`,
    // 범퍼 · 하부
    `<rect x="12" y="136" width="290" height="18" rx="7" fill="${C.chassis}"/>`,
    wheel(72, 154, 24),
    wheel(240, 154, 24),
  ].join("");
}

export function truckSideSvg() {
  return wrap("side", SIDE_VIEW_BOX, sideBody());
}

export function truckSideReverseSvg() {
  return wrap("side-rev", SIDE_VIEW_BOX, mirror(320, sideBody()));
}

/* ── FRONT 3/4 (정면 3/4) ─────────────────────────────────────────── */

const F34_VIEW_BOX = "0 0 300 200";

function front34Body() {
  return [
    shadow(152, 188, 132),
    // 적재함이 왼쪽으로 물러난다 — 먼 쪽(왼쪽)이 더 작다.
    `<path d="M26 52 L150 36 L150 158 L26 150 Z" fill="${C.body}" stroke="${C.edge}" ` +
      `stroke-width="${EDGE}" stroke-linejoin="round"/>`,
    `<path d="M34 62 L146 48 L146 70 L34 82 Z" fill="${C.bodyLight}"/>`,
    logoBox(52, 96, 40),
    `<path d="M26 140 L148 132 L148 150 L26 156 Z" fill="${C.chassis}"/>`,
    // 운전실 정면
    panel(150, 30, 120, 128, 19),
    roofBand(158, 36, 104, 14),
    `<rect x="164" y="48" width="90" height="56" rx="14" fill="${C.glass}" ` +
      `stroke="${C.glassEdge}" stroke-width="${EDGE}"/>`,
    eyes(188, 230, 76, 24),
    cheeks(172, 246, 114, 7),
    grilleSmile(209, 116, 36, 9, 12),
    `<rect x="268" y="56" width="15" height="24" rx="6" fill="${C.chassis}"/>`,
    `<rect x="148" y="144" width="124" height="20" rx="8" fill="${C.chassis}"/>`,
    wheel(74, 156, 20),
    wheel(232, 166, 20),
  ].join("");
}

export function truckFront34Svg() {
  return wrap("front34", F34_VIEW_BOX, front34Body());
}

export function truckFront34ReverseSvg() {
  return wrap("front34-rev", F34_VIEW_BOX, mirror(300, front34Body()));
}

/* ── REAR (후면) ──────────────────────────────────────────────────── */

export function truckRearSvg() {
  const grooves = [40, 55, 70, 85, 100]
    .map(y => `<line x1="48" y1="${y}" x2="152" y2="${y}" stroke="${C.bodyLight}" stroke-width="4"/>`)
    .join("");

  return wrap("rear", "0 0 200 200", [
    shadow(100, 191, 84),
    panel(16, M.top, 168, 140, 11),
    // 셔터형 적재함 문 — 홈이 보이도록 문판을 깔고 밝은 줄을 낸다.
    `<rect x="42" y="26" width="116" height="104" rx="8" fill="${C.body}" ` +
      `stroke="${C.edge}" stroke-width="3"/>`,
    grooves,
    roofBand(26, 18, 148, 14),
    `<rect x="86" y="112" width="28" height="10" rx="5" fill="${C.chassis}"/>`,
    // 후미등 — 주황 마커가 위, 빨강이 아래
    `<rect x="20" y="102" width="18" height="12" rx="4" fill="${C.tailAmber}"/>`,
    `<rect x="162" y="102" width="18" height="12" rx="4" fill="${C.tailAmber}"/>`,
    `<rect x="20" y="118" width="18" height="22" rx="5" fill="${C.tailRed}"/>`,
    `<rect x="162" y="118" width="18" height="22" rx="5" fill="${C.tailRed}"/>`,
    `<rect x="14" y="157" width="172" height="20" rx="8" fill="${C.chassis}"/>`,
    wheel(44, 177, 15),
    wheel(156, 177, 15),
  ].join(""));
}

/* ── 조회 ─────────────────────────────────────────────────────────── */

const BY_VIEW = Object.freeze({
  front: truckFrontSvg,
  front34: truckFront34Svg,
  side: truckSideSvg,
  "front34-rev": truckFront34ReverseSvg,
  "side-rev": truckSideReverseSvg,
  rear: truckRearSvg,
});

export function truckSvg(view) {
  const draw = BY_VIEW[view];
  if (!draw) throw new Error(`알 수 없는 트럭 뷰: ${view}`);
  return draw();
}

// 격자 주행 방향 → 뷰. 위로 가면 뒷모습, 아래로 오면 정면을 본다.
const VIEW_BY_DIRECTION = Object.freeze({
  up: "rear",
  down: "front",
  right: "side",
  left: "side-rev",
  idle: "front34",
});

export function truckViewForDirection(direction) {
  return VIEW_BY_DIRECTION[direction] ?? "front34";
}

export function truckSvgForDirection(direction) {
  return truckSvg(truckViewForDirection(direction));
}

// 다른 SVG 안에 트럭을 얹는다. 중첩 <svg> 라 viewBox 가 알아서 비율을 지킨다 —
// 뷰마다 폭이 달라도 같은 차로 보이도록 높이는 계산해 넣는다.
export function truckSprite(direction, { x, y, width }) {
  const view = truckViewForDirection(direction);
  const markup = truckSvg(view);
  const viewBox = markup.match(/viewBox="([^"]+)"/)[1];
  const [, , boxWidth, boxHeight] = viewBox.split(" ").map(Number);
  const height = (width * boxHeight) / boxWidth;
  const inner = markup.replace(/^<svg [^>]*>/, "").replace(/<\/svg>$/, "");
  // 뷰 이름을 클래스로 남긴다 — 그림만 봐도 어느 방향인지 알 수 있다.
  return `<svg class="dv-truck-sprite dv-truck-${view}" x="${x}" y="${y}" width="${width}" ` +
    `height="${height.toFixed(1)}" viewBox="${viewBox}">${inner}</svg>`;
}

// 스프라이트가 차지할 높이 — 씬이 배치를 계산할 때 쓴다.
export function truckSpriteHeight(direction, width) {
  const viewBox = truckSvgForDirection(direction).match(/viewBox="([^"]+)"/)[1];
  const [, , boxWidth, boxHeight] = viewBox.split(" ").map(Number);
  return (width * boxHeight) / boxWidth;
}
