// 칙칙폭폭 기관사 — 코드 SVG 아트. 평면 2D, 단색 채움, 그라디언트·필터 금지.
//
// 배경은 "하루의 여정" 아크: 하늘 팔레트 5종 × 땅 실루엣 6종을 전부 미리
// 그려 두고, 씬이 data-sky/data-land 속성만 바꾸면 CSS가 1.5초 크로스페이드
// 한다(지하철 창밖 환경 전환과 같은 계보). 움직임은 전부 CSS 애니메이션 —
// 속도는 data-speed-tier(0~5)가 고른다.

export const SKY_PALETTES = Object.freeze({
  morning: Object.freeze({ sky: "#cfe8f7", glow: "#ffd98e", cloud: "#ffffff" }),
  day: Object.freeze({ sky: "#bfe8ff", glow: "#f7d154", cloud: "#ffffff" }),
  sunset: Object.freeze({ sky: "#f7c8a0", glow: "#ef8a5a", cloud: "#f9e0cd" }),
  night: Object.freeze({ sky: "#22304d", glow: "#f4e9c8", cloud: "#33415f" }),
  dawn: Object.freeze({ sky: "#e8c9d8", glow: "#f2a65a", cloud: "#f6e3ec" })
});

export const LAND_PALETTES = Object.freeze({
  city: Object.freeze({ base: "#9fb0c2", accent: "#7d8ea1", pop: "#e8564a" }),
  field: Object.freeze({ base: "#a9df7d", accent: "#6fae52", pop: "#f4c542" }),
  river: Object.freeze({ base: "#9fd0f5", accent: "#5aa9e6", pop: "#f4c542" }),
  mountain: Object.freeze({ base: "#5b6b81", accent: "#44506b", pop: "#8fa4bb" }),
  tunnel: Object.freeze({ base: "#3a4152", accent: "#262c3a", pop: "#f4c542" }),
  sea: Object.freeze({ base: "#7fc4ee", accent: "#4a9ad4", pop: "#ffffff" })
});

const INK = "#31445b";
const PAPER = "#ffffff";
const RAIL = "#8d95a0";
const TIE = "#7a6a55";
const TIE_NIGHT = "#4d4335";

// v2 신규 명명 토큰 (협회 판정 R5 — 신규 회색은 RAIL 파생 2단계 + 등재된 소품색만)
const RAIL_LIGHT = "#c8ccd4";        // 레일 광택면
const WIRE = "#6b7686";              // 전차선
const BALLAST = "#cfc3ad";           // 자갈 (기존 cabTrack 값 승격)
const BALLAST_SHOULDER = "#b9ac93";  // 자갈 어깨
const TUNNEL_HOLE = "#262c3a";       // = LAND_PALETTES.tunnel.accent (R7)
const GLASS = "#dff0fb";             // 기존 창유리 값
const DOOR_GLASS = "#cfe3f5";        // 문짝
const JOINT = "#2a3648";             // 관절 연결부
const JOINT_TOP = "#4a5a72";         // 관절 주름 상단
const SLAB = "#dce6f0";              // 승강장 슬래브
const ROOF = "#a8bed4";              // 승강장 지붕
const PILLAR = "#cfd9e4";            // 승강장 기둥
const HEADLAMP = "#f4e9c8";          // = SKY_PALETTES.night.glow
const POP_YELLOW = "#f4c542";
const POP_RED = "#e8564a";
const POP_GREEN = "#2fa25c";
const POP_BLUE = "#5aa9e6";
const GRAY = "#7d8ea1";              // = LAND_PALETTES.city.accent
const DIAL_LOW = "#bfe8ff";          // = SKY_PALETTES.day.sky

// 계기·지물이 쓰는 색 전체 — 아트 계약 테스트의 허용 집합.
export const KTX_ART_TOKENS = Object.freeze([
  INK, PAPER, RAIL, TIE, TIE_NIGHT, RAIL_LIGHT, WIRE, BALLAST,
  BALLAST_SHOULDER, TUNNEL_HOLE, GLASS, DOOR_GLASS, JOINT, JOINT_TOP,
  SLAB, ROOF, PILLAR, HEADLAMP, POP_YELLOW, POP_RED, POP_GREEN, POP_BLUE,
  GRAY, DIAL_LOW
]);

// 1인칭 지면 평면의 땅 색 — land 밴드 크로스페이드에 편승 (R5: city는 기존 base)
export const GROUND_SKINS = Object.freeze({
  city: LAND_PALETTES.city.base,
  field: LAND_PALETTES.field.base,
  river: "#9ccf7e",
  mountain: "#7b8a74",
  tunnel: TUNNEL_HOLE,
  sea: "#e8d9a8"
});

function svgWrap(className, viewBox, body, preserve = "xMidYMax slice") {
  return `<svg class="${className}" viewBox="${viewBox}" ` +
    `preserveAspectRatio="${preserve}" aria-hidden="true" ` +
    `xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// ── 하늘 (뷰 공용) ─────────────────────────────────────────────────────────

function celestialFor(sky, palette) {
  if (sky === "night") {
    const stars = [[120, 60], [300, 110], [520, 50], [700, 95], [880, 65],
      [420, 140], [820, 150]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${palette.glow}"/>`)
      .join("");
    return `${stars}<circle cx="760" cy="90" r="42" fill="${palette.glow}"/>` +
      `<circle cx="742" cy="80" r="34" fill="${palette.sky}"/>`;
  }
  const sunX = sky === "morning" || sky === "dawn" ? 180 : 780;
  return `<circle cx="${sunX}" cy="96" r="46" fill="${palette.glow}"/>` +
    `<ellipse cx="${sunX + 240}" cy="80" rx="86" ry="26" fill="${palette.cloud}"/>` +
    `<ellipse cx="${sunX - 210}" cy="140" rx="66" ry="20" fill="${palette.cloud}"/>`;
}

export function skyLayerSvg(sky) {
  const palette = SKY_PALETTES[sky];
  if (!palette) return "";
  return svgWrap(`ktx-sky ktx-sky-${sky}`, "0 0 1000 300", [
    `<rect width="1000" height="300" fill="${palette.sky}"/>`,
    celestialFor(sky, palette)
  ].join(""), "xMidYMin slice");
}

// ── 땅 실루엣 스트립 (수평 루프 — 폭 1000 두 장을 이어 붙여 흐른다) ────────

function landStrip(land) {
  const palette = LAND_PALETTES[land];
  if (land === "city") {
    const blocks = [[0, 70, 90], [110, 40, 120], [250, 90, 80], [360, 30, 130],
      [470, 70, 95], [580, 20, 140], [700, 80, 85], [800, 45, 115], [910, 75, 90]]
      .map(([x, y, w]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${200 - y}" rx="6" fill="${palette.base}"/>` +
        `<rect x="${x + 12}" y="${y + 14}" width="16" height="16" fill="${PAPER}" opacity=".7"/>`)
      .join("");
    return `${blocks}<rect x="330" y="16" width="18" height="60" fill="${palette.pop}"/>`;
  }
  if (land === "field") {
    return `<path d="M0 130 Q160 60 330 120 Q500 175 670 110 Q840 55 1000 125 L1000 200 L0 200z" fill="${palette.base}"/>` +
      [[140, 120], [430, 140], [760, 118]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="26" fill="${palette.accent}"/>` +
        `<rect x="${x - 4}" y="${y + 16}" width="8" height="26" fill="${TIE}"/>`).join("") +
      `<rect x="580" y="96" width="34" height="44" rx="6" fill="${palette.pop}"/>` +
      `<path d="M570 100 L597 76 L624 100z" fill="${palette.accent}"/>`;
  }
  if (land === "river") {
    return `<rect x="0" y="110" width="1000" height="90" fill="${palette.base}"/>` +
      `<path d="M0 110 Q250 96 500 110 Q750 124 1000 110" fill="none" stroke="${palette.accent}" stroke-width="8"/>` +
      [[120, 150], [420, 165], [720, 148]].map(([x, y]) =>
        `<ellipse cx="${x}" cy="${y}" rx="34" ry="9" fill="${PAPER}" opacity=".5"/>`).join("") +
      `<path d="M840 132 q14 -26 28 0z" fill="${palette.pop}"/>`;
  }
  if (land === "mountain") {
    return `<path d="M0 200 L140 70 L280 200z" fill="${palette.base}"/>` +
      `<path d="M180 200 L360 40 L560 200z" fill="${palette.accent}"/>` +
      `<path d="M470 200 L640 84 L820 200z" fill="${palette.base}"/>` +
      `<path d="M700 200 L880 56 L1000 168 L1000 200z" fill="${palette.accent}"/>` +
      `<path d="M330 68 L360 40 L392 68 L376 76 L344 76z" fill="${PAPER}" opacity=".8"/>`;
  }
  if (land === "tunnel") {
    return `<rect x="0" y="0" width="1000" height="200" fill="${palette.accent}"/>` +
      [[80, 60], [320, 60], [560, 60], [800, 60]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="17" fill="${palette.pop}" opacity=".85"/>`).join("") +
      `<path d="M0 150 Q125 172 250 150 Q375 128 500 150 Q625 172 750 150 Q875 128 1000 150" fill="none" stroke="${palette.base}" stroke-width="7"/>`;
  }
  if (land === "sea") {
    return `<rect x="0" y="96" width="1000" height="104" fill="${palette.base}"/>` +
      `<path d="M0 96 Q250 84 500 96 Q750 108 1000 96" fill="none" stroke="${palette.accent}" stroke-width="8"/>` +
      [[150, 140], [400, 160], [660, 136], [880, 158]].map(([x, y]) =>
        `<path d="M${x} ${y} q16 -10 32 0" fill="none" stroke="${PAPER}" stroke-width="5" stroke-linecap="round"/>`).join("") +
      `<path d="M300 92 L300 52 L336 84 L306 92z" fill="${palette.pop}"/>` +
      `<path d="M282 92 L354 92 L340 108 L296 108z" fill="${palette.accent}"/>`;
  }
  return "";
}

// 세 장을 이어 붙여 CSS translateX 무한 루프가 이음새 없이 돌게 한다.
// (스테이지 폭 1217px + 루프 주기 1000px를 항상 덮으려면 3000px 필요)
export function landLayerSvg(land) {
  const strip = landStrip(land);
  if (!strip) return "";
  return svgWrap(`ktx-land ktx-land-${land}`, "0 0 3000 200", [
    `<g>${strip}</g>`,
    `<g transform="translate(1000 0)">${strip}</g>`,
    `<g transform="translate(2000 0)">${strip}</g>`
  ].join(""), "xMinYMax slice");
}

export const ALL_SKIES = Object.freeze(Object.keys(SKY_PALETTES));
export const ALL_LANDS = Object.freeze(Object.keys(LAND_PALETTES));

// ── 3인칭 열차 (색은 고른 열차가 정한다) ──────────────────────────────────

// v2 — KTX 실루엣: 긴 유선형 노즈 + 연속 차체 + 관절 대차 + 문/글로우.
// 계약 유지: .ktx-window-slot[data-slot=0..7] g 안에 62×52 rect, 씬이 image를 얹는다.
export function sideTrainSvg(train, windows = 8) {
  const carW = 200;
  const carAt = index => 300 + index * 208;
  const slots = Array.from({ length: windows }, (unused, index) => {
    const car = Math.floor(index / 2);
    const x = carAt(car) + 20 + (index % 2) * 72;
    return `<g class="ktx-window-slot" data-slot="${index}" transform="translate(${x} 54)">` +
      `<rect width="62" height="52" rx="8" fill="${GLASS}"/>` +
      `<rect class="ktx-window-glow" width="62" height="52" rx="8" fill="${HEADLAMP}" opacity="0"/>` +
      `</g>`;
  }).join("");
  const cars = Array.from({ length: 4 }, (unused, index) => {
    const x = carAt(index);
    return `<rect x="${x}" y="44" width="${carW}" height="74" rx="4" fill="${train.color}"/>` +
      `<rect x="${x}" y="52" width="${carW}" height="56" fill="${train.nose}" opacity=".18"/>` +
      `<rect x="${x}" y="108" width="${carW}" height="26" fill="${train.nose}"/>`;
  }).join("");
  const doors = Array.from({ length: 4 }, (unused, index) => {
    const x = carAt(index) + 156;
    return `<g class="ktx-door" transform="translate(${x} 52)">` +
      `<rect width="36" height="76" rx="6" fill="${train.nose}"/>` +
      `<rect x="2" y="3" width="32" height="70" rx="4" fill="${JOINT}"/>` +
      `<g class="ktx-door-leaf ktx-door-leaf-l"><rect x="1" y="3" width="17" height="70" rx="4" fill="${DOOR_GLASS}"/></g>` +
      `<g class="ktx-door-leaf ktx-door-leaf-r"><rect x="18" y="3" width="17" height="70" rx="4" fill="${DOOR_GLASS}"/></g>` +
      `<circle class="ktx-door-warnlamp" cx="18" cy="-8" r="5" fill="${POP_RED}" opacity="0"/>` +
      `</g>`;
  }).join("");
  const joints = [500, 708, 916].map(x =>
    `<rect x="${x}" y="56" width="8" height="62" rx="3" fill="${JOINT}"/>` +
    `<rect x="${x - 2}" y="56" width="12" height="6" rx="3" fill="${JOINT_TOP}"/>`
  ).join("");
  // 자코브스 대차 — 량 경계 공유가 KTX 특징. 스포크가 있어 회전이 보인다.
  const wheels = [70, 130, 504, 712, 920, 1100, 1160].map(cx =>
    `<g transform="translate(${cx} 140)"><g class="ktx-wheel">` +
    `<circle r="14" fill="${INK}"/><circle r="5" fill="${RAIL}"/>` +
    `<rect x="-12" y="-2" width="24" height="4" rx="2" fill="${RAIL}"/>` +
    `</g></g>`
  ).join("");
  return svgWrap("ktx-side-train-art", "0 0 1200 170", [
    // 전두부 — 긴 유선형 노즈
    `<path d="M8 132 C10 92 28 66 96 52 L300 44 L300 132z" fill="${train.color}"/>`,
    `<path d="M8 132 C9 110 20 96 52 90 L300 90 L300 132z" fill="${train.nose}"/>`,
    `<path d="M150 88 L166 56 L238 52 L238 88z" fill="${GLASS}"/>`,
    `<circle cx="26" cy="104" r="7" fill="${HEADLAMP}"/>`,
    // 팬터그래프
    `<g class="ktx-panto">` +
    `<rect x="196" y="40" width="70" height="6" rx="3" fill="${train.nose}"/>` +
    `<path d="M208 40 L228 22 L248 40" fill="none" stroke="${INK}" stroke-width="4"/>` +
    `<rect x="216" y="18" width="44" height="4" rx="2" fill="${INK}"/></g>`,
    cars,
    joints,
    slots,
    doors,
    // 후미 — 양쪽 노즈(산천 실루엣 완성)
    `<path d="M1192 132 C1190 92 1172 66 1104 52 L1124 44 L1124 132z" fill="${train.color}"/>`,
    `<path d="M1192 132 C1191 110 1180 96 1148 90 L1124 90 L1124 132z" fill="${train.nose}"/>`,
    wheels,
    `<rect x="0" y="156" width="1200" height="6" rx="3" fill="${RAIL}"/>`
  ].join(""), "xMidYMid meet");
}

// ── 1인칭 운전실 v2 ────────────────────────────────────────────────────────
// 세계는 CSS perspective 평면(씬·CSS 몫)이고, 여기는 계기·프레임 아트만.

// 운전대 배경판 — 계기 도형은 전부 별도 노드(찌그러지면 안 되므로).
export function cabDashSvg(train) {
  return svgWrap("ktx-cab-dash-art", "0 0 1000 220", [
    `<path d="M0 22 Q500 -14 1000 22 L1000 220 L0 220z" fill="${train.nose}"/>`,
    `<path d="M0 44 Q500 8 1000 44 L1000 220 L0 220z" fill="${train.color}"/>`,
    // 계기 웰 3개
    `<rect x="40" y="70" width="250" height="140" rx="24" fill="${PAPER}" opacity=".16"/>`,
    `<circle cx="500" cy="170" r="130" fill="${PAPER}" opacity=".16"/>`,
    `<rect x="690" y="70" width="270" height="140" rx="24" fill="${PAPER}" opacity=".16"/>`,
    // 장난감 디테일 — 나사·통풍구
    ...[[26, 60], [974, 60], [26, 204], [974, 204]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="5" fill="${train.nose}"/>`),
    ...[0, 1, 2].map(step =>
      `<rect x="${318 + step * 56}" y="52" width="40" height="6" rx="3" fill="${train.nose}"/>`)
  ].join(""), "none");
}

// 캡 프레임 — 천장 립 + A필러 + 와이퍼. "운전석에 앉아 있음" 프레이밍.
export function cabFrameSvg(train) {
  return svgWrap("ktx-cab-frame-art", "0 0 1000 720", [
    `<path d="M0 0 H1000 V34 Q500 58 0 34z" fill="${train.nose}"/>`,
    `<path d="M0 0 H62 L20 520 H0z" fill="${train.nose}"/>`,
    `<path d="M62 0 H70 L28 520 H20z" fill="${PAPER}" opacity=".18"/>`,
    `<path d="M1000 0 H938 L980 520 H1000z" fill="${train.nose}"/>`,
    `<path d="M938 0 H930 L972 520 H980z" fill="${PAPER}" opacity=".18"/>`,
    `<g transform="translate(250 520)"><g class="ktx-wiper-arm">` +
    `<rect x="-3" y="-170" width="6" height="170" rx="3" fill="${INK}"/>` +
    `<rect x="-26" y="-176" width="52" height="8" rx="4" fill="${INK}"/>` +
    `</g></g>`
  ].join(""), "none");
}

function polar(cx, cy, r, deg) {
  const rad = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(rad), cy - r * Math.cos(rad)];
}

function arcPath(cx, cy, r, fromDeg, toDeg) {
  const [x1, y1] = polar(cx, cy, r, fromDeg);
  const [x2, y2] = polar(cx, cy, r, toDeg);
  const large = toDeg - fromDeg > 180 ? 1 : 0;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 ${large} 1 ` +
    `${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

// 원형 아날로그 속도계 — 바늘 각도 = v×0.8 − 120 (0~300 → ±120°).
// .ktx-speed-number 셀렉터는 기존 계약 그대로(씬이 textContent 갱신).
export function speedoDialSvg() {
  const majors = Array.from({ length: 7 }, (unused, index) => {
    const deg = -120 + index * 40;
    const [x1, y1] = polar(110, 110, 94, deg);
    const [x2, y2] = polar(110, 110, 78, deg);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
      `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${INK}" ` +
      `stroke-width="5" stroke-linecap="round"/>`;
  }).join("");
  const minors = Array.from({ length: 12 }, (unused, index) => {
    const deg = -120 + 20 + index * 20;
    if ((deg + 120) % 40 === 0) return "";
    const [x1, y1] = polar(110, 110, 94, deg);
    const [x2, y2] = polar(110, 110, 86, deg);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" ` +
      `x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${GRAY}" stroke-width="3"/>`;
  }).join("");
  const numbers = [0, 100, 200, 300].map(value => {
    const [x, y] = polar(110, 110, 60, value * 0.8 - 120);
    return `<text x="${x.toFixed(1)}" y="${(y + 6).toFixed(1)}" text-anchor="middle" ` +
      `font-size="17" font-weight="900" fill="${INK}">${value}</text>`;
  }).join("");
  return svgWrap("ktx-dial-art", "0 0 220 220", [
    `<circle cx="110" cy="110" r="106" fill="${INK}" class="ktx-dial-bezel"/>`,
    `<circle cx="110" cy="110" r="94" fill="${PAPER}"/>`,
    // 빠름 단계 존 아크 (경고 아님 — 벌점 없음 톤)
    `<path d="${arcPath(110, 110, 84, -120, 0)}" fill="none" stroke="${DIAL_LOW}" stroke-width="12"/>`,
    `<path d="${arcPath(110, 110, 84, 0, 80)}" fill="none" stroke="${LAND_PALETTES.field.base}" stroke-width="12"/>`,
    `<path d="${arcPath(110, 110, 84, 80, 120)}" fill="none" stroke="${POP_YELLOW}" stroke-width="12"/>`,
    majors, minors, numbers,
    `<g class="ktx-needle"><path d="M103 120 L110 30 L117 120 L110 132z" fill="${POP_RED}"/></g>`,
    `<circle cx="110" cy="110" r="11" fill="${INK}"/>`,
    `<circle cx="110" cy="110" r="4.5" fill="${PAPER}"/>`,
    // 디지털 창 — 바늘 궤적(±120°) 비간섭 하부
    `<rect x="58" y="134" width="104" height="44" rx="10" fill="${GLASS}" ` +
    `stroke="${INK}" stroke-width="3"/>`,
    `<text class="ktx-speed-number" x="110" y="166" text-anchor="middle" ` +
    `font-size="34" font-weight="900" fill="${INK}">0</text>`,
    `<text x="110" y="189" text-anchor="middle" font-size="12" fill="${GRAY}">km/h</text>`
  ].join(""), "xMidYMid meet");
}

// 노치 레버 — 표시 전용. 손잡이는 CSS translateY(var(--lever-y))로 움직인다.
// 노치(위→아래): P(가속)·D(달림=고정속도)·N(중립)·B(브레이크), y=30/74/112/148.
export function leverSvg() {
  const marks = [30, 74, 112, 148].map(y =>
    `<rect x="20" y="${y - 2.5}" width="14" height="5" rx="2.5" fill="${GRAY}"/>`
  ).join("");
  return svgWrap("ktx-lever-art", "0 0 84 190", [
    `<rect x="36" y="14" width="12" height="150" rx="6" fill="${INK}"/>`,
    marks,
    `<circle class="ktx-halo ktx-halo-power" cx="62" cy="30" r="11" fill="${PAPER}" opacity="0"/>`,
    `<path d="M56 36 L62 24 L68 36z" fill="${POP_GREEN}"/>`,
    `<circle class="ktx-halo ktx-halo-cruise" cx="62" cy="74" r="11" fill="${PAPER}" opacity="0"/>`,
    `<path d="M56 68 L68 74 L56 80z" fill="${POP_BLUE}"/>`,
    `<circle class="ktx-halo ktx-halo-neutral" cx="62" cy="112" r="11" fill="${PAPER}" opacity="0"/>`,
    `<circle cx="62" cy="112" r="5" fill="${GRAY}"/>`,
    `<circle class="ktx-halo ktx-halo-brake" cx="62" cy="148" r="11" fill="${PAPER}" opacity="0"/>`,
    `<path d="M56 142 L68 142 L62 154z" fill="${POP_RED}"/>`,
    `<g class="ktx-lever-knob">` +
    `<circle cx="42" cy="0" r="19" fill="${POP_YELLOW}" stroke="${PAPER}" stroke-width="4"/>` +
    `<rect x="34" y="-4" width="16" height="3" fill="${INK}" opacity=".4"/>` +
    `<rect x="34" y="2" width="16" height="3" fill="${INK}" opacity=".4"/>` +
    `</g>`
  ].join(""), "xMidYMid meet");
}

// 접근 스트립 — 정차 단서의 단일 원본(협회 R2). 1.3833px/m, d 120m→0 = 166px.
// 미니 열차 코(로컬 x=56)가 초록 밴드(⭐⭐⭐ press 창)에 닿으면 ⎵.
export function approachStripSvg(trainColor) {
  return svgWrap("ktx-approach-art", "0 0 260 64", [
    `<rect y="46" width="260" height="6" rx="3" fill="${RAIL}"/>`,
    `<line x1="0" y1="55" x2="260" y2="55" stroke="${BALLAST}" ` +
    `stroke-width="4" stroke-dasharray="4 10"/>`,
    `<rect x="162" y="54" width="48" height="8" rx="4" fill="${LAND_PALETTES.field.base}"/>`,
    `<rect class="ktx-band3" x="182" y="54" width="28" height="8" rx="4" fill="${POP_GREEN}"/>`,
    `<rect x="196" y="18" width="58" height="28" rx="6" fill="${POP_YELLOW}"/>`,
    `<rect x="196" y="18" width="58" height="6" rx="3" fill="${PAPER}"/>`,
    `<g class="ktx-mini"><g transform="translate(0 26)">` +
    `<rect width="44" height="20" rx="9" fill="${trainColor}"/>` +
    `<path d="M44 20 Q56 18 56 10 Q56 2 44 2z" fill="${trainColor}"/>` +
    `<circle cx="12" cy="20" r="4" fill="${INK}"/>` +
    `<circle cx="34" cy="20" r="4" fill="${INK}"/>` +
    `</g></g>`
  ].join(""), "xMidYMid meet");
}

// 문 패널 — 미니 문짝이 실제 문과 동조해 열리고 닫힌다.
export function doorPanelSvg() {
  return svgWrap("ktx-doorpanel-art", "0 0 120 84", [
    `<circle class="ktx-door-lamp-ring" cx="60" cy="12" r="13" fill="${POP_GREEN}" opacity="0"/>`,
    `<circle class="ktx-door-lamp-dot" cx="60" cy="12" r="8" fill="${GRAY}"/>`,
    `<rect x="34" y="26" width="52" height="50" rx="6" fill="${INK}"/>`,
    `<rect x="37" y="29" width="46" height="44" fill="${POP_GREEN}"/>`,
    `<g class="ktx-door-leaf ktx-door-leaf-l"><rect x="37" y="29" width="23" height="44" fill="${SLAB}"/></g>`,
    `<g class="ktx-door-leaf ktx-door-leaf-r"><rect x="60" y="29" width="23" height="44" fill="${SLAB}"/></g>`
  ].join(""), "xMidYMid meet");
}

// 전차선 가선 — 정적 V자 수렴(운전석에서 보는 접촉선은 준정지, 협회 §4.4).
export function cabWiresSvg() {
  const droppers = [0.25, 0.45, 0.65, 0.85].flatMap(t => {
    const y = 400 - 400 * t;
    return [
      `<line x1="${(500 - 67 * t).toFixed(0)}" y1="${y.toFixed(0)}" ` +
      `x2="${(500 - 67 * t).toFixed(0)}" y2="${(y - 18).toFixed(0)}" stroke="${WIRE}" stroke-width="2"/>`,
      `<line x1="${(500 + 67 * t).toFixed(0)}" y1="${y.toFixed(0)}" ` +
      `x2="${(500 + 67 * t).toFixed(0)}" y2="${(y - 18).toFixed(0)}" stroke="${WIRE}" stroke-width="2"/>`
    ];
  }).join("");
  return svgWrap("ktx-wires-art", "0 0 1000 400", [
    `<path d="M500 400 L433 0" stroke="${WIRE}" stroke-width="3" fill="none"/>`,
    `<path d="M500 400 L567 0" stroke="${WIRE}" stroke-width="3" fill="none"/>`,
    droppers
  ].join(""), "none");
}

// 스쳐 지나가는 지물 — .ktx-obj 풀 노드의 innerHTML. 밑변 앵커는 CSS 몫.
export function linesideArt(kind, value = "") {
  if (kind === "pole") {
    return svgWrap("ktx-obj-art", "0 0 90 130", [
      `<rect x="8" y="6" width="10" height="124" rx="3" fill="${RAIL}"/>`,
      `<rect x="8" y="18" width="70" height="8" rx="4" fill="${RAIL}"/>`,
      `<circle cx="48" cy="22" r="5" fill="${WIRE}"/>`,
      `<circle cx="68" cy="22" r="5" fill="${WIRE}"/>`
    ].join(""), "xMidYMax meet");
  }
  if (kind === "signal") {
    // 벌점 없음 = 항상 초록(협회 거부권 10 — 빨간 신호 금지)
    return svgWrap("ktx-obj-art", "0 0 44 110", [
      `<rect x="18" y="14" width="8" height="96" rx="3" fill="${RAIL}"/>`,
      `<rect x="6" y="0" width="32" height="42" rx="10" fill="${INK}"/>`,
      `<circle class="ktx-lamp" cx="22" cy="21" r="12" fill="${POP_GREEN}"/>`
    ].join(""), "xMidYMax meet");
  }
  if (kind === "kilopost") {
    return svgWrap("ktx-obj-art", "0 0 48 76", [
      `<rect x="20" y="40" width="8" height="36" fill="${RAIL}"/>`,
      `<rect x="2" y="0" width="44" height="44" rx="8" fill="${PAPER}" ` +
      `stroke="${INK}" stroke-width="4"/>`,
      `<text x="24" y="32" text-anchor="middle" font-size="26" font-weight="900" ` +
      `fill="${INK}">${value}</text>`
    ].join(""), "xMidYMax meet");
  }
  if (kind === "speed35") {
    return svgWrap("ktx-obj-art", "0 0 64 96", [
      `<rect x="28" y="56" width="8" height="40" fill="${RAIL}"/>`,
      `<circle cx="32" cy="32" r="30" fill="${POP_YELLOW}"/>`,
      `<circle cx="32" cy="32" r="24" fill="${PAPER}"/>`,
      `<text x="32" y="42" text-anchor="middle" font-size="26" font-weight="900" ` +
      `fill="${INK}">35</text>`
    ].join(""), "xMidYMax meet");
  }
  if (kind === "sign300") {
    return svgWrap("ktx-obj-art", "0 0 64 96", [
      `<rect x="28" y="56" width="8" height="40" fill="${RAIL}"/>`,
      `<circle cx="32" cy="32" r="30" fill="${POP_RED}"/>`,
      `<circle cx="32" cy="32" r="24" fill="${PAPER}"/>`,
      `<text x="32" y="40" text-anchor="middle" font-size="20" font-weight="900" ` +
      `fill="${POP_RED}">300</text>`
    ].join(""), "xMidYMax meet");
  }
  if (kind === "tunnellamp") {
    return svgWrap("ktx-obj-art", "0 0 30 30", [
      `<circle cx="15" cy="15" r="10" fill="${POP_YELLOW}"/>`,
      `<circle cx="15" cy="15" r="5" fill="${HEADLAMP}"/>`
    ].join(""), "xMidYMid meet");
  }
  return "";
}

// 터널 포털 — 홀 중심이 소실점에 정렬돼 "구멍 속으로" 들어간다. R7: 홀은
// TUNNEL_HOLE(#262c3a), 최종 scale 12 — 삼킴 공포 제거.
export function portalSvg() {
  return svgWrap("ktx-portal-art", "0 0 200 200", [
    `<path d="M14 200 L14 96 Q100 -4 186 96 L186 200 L150 200 L150 108 ` +
    `Q100 52 50 108 L50 200z" fill="#3a4152"/>`,
    `<path d="M50 200 L50 108 Q100 52 150 108 L150 200z" fill="${TUNNEL_HOLE}"/>`,
    `<rect x="14" y="182" width="36" height="8" fill="${PAPER}"/>`,
    `<rect x="150" y="182" width="36" height="8" fill="${PAPER}"/>`
  ].join(""), "xMidYMax meet");
}

// 1인칭 역 접근 — 소실점에서 자라는 승강장(모델 구동, 씬이 scale 변수 세팅).
// 로컬 x=23의 노란 타일이 정차 마커(★) — 스트립·✋과 자동 정합.
export function cabPlatformSvg() {
  return svgWrap("ktx-cabplat-art", "0 0 560 150", [
    `<path d="M0 150 L28 96 L560 96 L560 150z" fill="${SLAB}"/>`,
    `<rect x="28" y="96" width="532" height="10" fill="${PAPER}"/>`,
    `<rect x="28" y="106" width="532" height="8" fill="${POP_YELLOW}"/>`,
    `<rect x="23" y="112" width="46" height="34" rx="6" fill="${POP_YELLOW}"/>`,
    `<text x="46" y="138" text-anchor="middle" font-size="24" font-weight="900" ` +
    `fill="${INK}">★</text>`,
    `<rect x="150" y="16" width="12" height="80" fill="${PILLAR}"/>`,
    `<rect x="400" y="16" width="12" height="80" fill="${PILLAR}"/>`,
    `<rect x="120" y="4" width="330" height="14" rx="7" fill="${ROOF}"/>`,
    `<rect x="230" y="30" width="120" height="40" rx="8" fill="${INK}"/>`
  ].join(""), "xMinYMax meet");
}

// 교행 열차(1인칭) — 맞은편 선로 위를 훑는 3량 스프라이트.
export function cabOncomingSvg(part) {
  if (part === "lead") {
    return svgWrap("ktx-oncome-art", "0 0 200 90", [
      `<path d="M196 82 C194 52 180 34 130 26 L8 20 L8 82z" fill="${POP_GREEN}"/>`,
      `<path d="M196 82 C195 66 188 56 164 52 L8 52 L8 82z" fill="#1d7a42"/>`,
      `<rect x="20" y="28" width="90" height="18" rx="6" fill="${GLASS}"/>`
    ].join(""), "xMidYMax meet");
  }
  return svgWrap("ktx-oncome-art", "0 0 200 90", [
    `<rect x="0" y="20" width="200" height="62" rx="6" fill="${POP_GREEN}"/>`,
    `<rect x="0" y="52" width="200" height="30" fill="#1d7a42"/>`,
    ...Array.from({ length: 3 }, (unused, index) =>
      `<rect x="${18 + index * 62}" y="30" width="44" height="16" rx="5" fill="${GLASS}"/>`)
  ].join(""), "xMidYMax meet");
}

// 교행 열차(3인칭) — 화면을 가로지르는 미러 스트립.
export function oncomingTrainSvg() {
  return svgWrap("ktx-oncoming-art", "0 0 760 100", [
    `<path d="M6 92 C8 62 20 44 62 36 L200 30 L200 92z" fill="${POP_GREEN}"/>`,
    `<rect x="200" y="30" width="264" height="62" rx="4" fill="${POP_GREEN}"/>`,
    `<rect x="470" y="30" width="264" height="62" rx="4" fill="${POP_GREEN}"/>`,
    `<rect x="6" y="64" width="728" height="28" fill="#1d7a42"/>`,
    ...Array.from({ length: 7 }, (unused, index) =>
      `<rect x="${90 + index * 90}" y="40" width="52" height="18" rx="5" fill="${GLASS}"/>`),
    `<path d="M754 92 C752 62 740 44 698 36 L560 30 L560 92z" fill="${POP_GREEN}"/>`
  ].join(""), "xMidYMax meet");
}

// 중경 스트립(3인칭) — 언덕·집·간이역 실루엣. 색은 currentColor(CSS가 밤낮 지정).
export function midStripSvg() {
  const strip = [
    `<path d="M0 140 Q170 84 340 128 Q510 168 680 116 Q850 70 1000 132 L1000 200 L0 200z" fill="currentColor"/>`,
    `<rect x="120" y="112" width="40" height="34" rx="4" fill="currentColor"/>`,
    `<path d="M112 116 L140 96 L168 116z" fill="currentColor"/>`,
    `<rect x="520" y="120" width="36" height="28" rx="4" fill="currentColor"/>`,
    `<path d="M512 124 L538 106 L564 124z" fill="currentColor"/>`,
    // 간이역 — 역 통과 풍경(모델 변경 0)
    `<rect x="780" y="128" width="120" height="10" rx="4" fill="currentColor"/>`,
    `<rect x="796" y="96" width="8" height="34" fill="currentColor"/>`,
    `<rect x="876" y="96" width="8" height="34" fill="currentColor"/>`,
    `<rect x="772" y="86" width="136" height="12" rx="6" fill="currentColor"/>`
  ].join("");
  return svgWrap("ktx-mid-art", "0 0 3000 200", [
    `<g>${strip}</g>`,
    `<g transform="translate(1000 0)">${strip}</g>`,
    `<g transform="translate(2000 0)">${strip}</g>`
  ].join(""), "xMinYMax slice");
}

// 전경 스트립(3인칭) — 열차 앞을 스치는 전신주·가로수(최고 속도 큐).
export function nearStripSvg() {
  const strip = [
    `<line x1="0" y1="16" x2="480" y2="16" stroke="currentColor" stroke-width="3"/>`,
    `<rect x="24" y="4" width="11" height="256" rx="4" fill="currentColor"/>`,
    `<rect x="24" y="26" width="56" height="6" rx="3" fill="currentColor"/>`,
    `<circle cx="46" cy="22" r="4" fill="currentColor"/>`,
    `<circle cx="72" cy="22" r="4" fill="currentColor"/>`
  ].join("");
  return svgWrap("ktx-near-art", "0 0 2400 260", [
    `<g>${strip}</g>`,
    `<g transform="translate(480 0)">${strip}</g>`,
    `<g transform="translate(960 0)">${strip}</g>`,
    `<g transform="translate(1440 0)">${strip}</g>`,
    `<g transform="translate(1920 0)">${strip}</g>`
  ].join(""), "xMinYMax slice");
}

export const TIE_COLORS = Object.freeze({ day: TIE, night: TIE_NIGHT });

// ── 이벤트 스프라이트 (3인칭 무대 위에 뜬다) ──────────────────────────────

function duck(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">` +
    `<ellipse cx="0" cy="0" rx="20" ry="13" fill="#f4c542"/>` +
    `<circle cx="16" cy="-10" r="9" fill="#f4c542"/>` +
    `<path d="M24 -10 l10 3 l-10 4z" fill="#ef5a29"/>` +
    `<circle cx="18" cy="-12" r="2" fill="${INK}"/></g>`;
}

function cow(x, y) {
  return `<g transform="translate(${x} ${y})">` +
    `<rect x="-26" y="-18" width="52" height="30" rx="12" fill="${PAPER}"/>` +
    `<circle cx="-18" cy="-6" r="7" fill="${INK}"/>` +
    `<circle cx="12" cy="2" r="6" fill="${INK}"/>` +
    `<rect x="20" y="-26" width="20" height="17" rx="7" fill="${PAPER}"/>` +
    `<circle cx="27" cy="-20" r="2" fill="${INK}"/>` +
    `<rect x="-20" y="10" width="7" height="12" fill="${PAPER}"/>` +
    `<rect x="10" y="10" width="7" height="12" fill="${PAPER}"/></g>`;
}

function gull(x, y, scale = 1) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">` +
    `<path d="M-18 0 Q-8 -12 0 0 Q8 -12 18 0" fill="none" stroke="${PAPER}" ` +
    `stroke-width="5" stroke-linecap="round"/>` +
    `<circle cx="0" cy="-2" r="3" fill="#f4c542"/></g>`;
}

export function eventSpriteSvg(type) {
  if (type === "river") {
    return svgWrap("ktx-event-art ktx-event-river", "0 0 300 120",
      duck(60, 80) + duck(140, 92, 0.85) + duck(215, 78, 0.7), "xMidYMax meet");
  }
  if (type === "cows") {
    return svgWrap("ktx-event-art ktx-event-cows", "0 0 300 120",
      cow(70, 80) + cow(200, 88), "xMidYMax meet");
  }
  if (type === "seagull") {
    return svgWrap("ktx-event-art ktx-event-seagull", "0 0 300 120",
      gull(60, 40) + gull(150, 66, 1.2) + gull(240, 36, 0.9), "xMidYMax meet");
  }
  if (type === "passing") {
    return svgWrap("ktx-event-art ktx-event-passing", "0 0 460 90", [
      `<rect x="6" y="18" width="440" height="48" rx="14" fill="#2fa25c"/>`,
      `<path d="M446 66 Q452 38 420 24 L400 18 L400 66z" fill="#1d7a42"/>`,
      ...Array.from({ length: 5 }, (unused, index) =>
        `<rect x="${34 + index * 76}" y="30" width="42" height="22" rx="6" fill="#dff0fb"/>`)
    ].join(""), "xMidYMid meet");
  }
  if (type === "sprint300") {
    return svgWrap("ktx-event-art ktx-event-sprint", "0 0 140 140", [
      `<circle cx="70" cy="66" r="52" fill="#e8564a"/>`,
      `<circle cx="70" cy="66" r="44" fill="${PAPER}"/>`,
      `<text x="70" y="82" text-anchor="middle" font-size="40" font-weight="900" ` +
      `fill="#e8564a">300</text>`,
      `<path d="M66 118 l-8 16 h16z" fill="#e8564a"/>`
    ].join(""), "xMidYMid meet");
  }
  if (type === "tunnel") {
    return svgWrap("ktx-event-art ktx-event-tunnel", "0 0 140 140", [
      `<path d="M10 130 L10 70 Q70 6 130 70 L130 130 L96 130 L96 84 ` +
      `Q70 52 44 84 L44 130z" fill="#3a4152"/>`
    ].join(""), "xMidYMid meet");
  }
  return "";
}

// 시작 화면 열차 고르기 카드 얼굴.
export function trainCardSvg(train) {
  return svgWrap("ktx-train-card-art", "0 0 300 120", [
    `<path d="M12 96 Q14 52 72 38 L288 30 L288 96z" fill="${train.color}"/>`,
    `<path d="M12 96 Q13 76 30 68 L288 68 L288 96z" fill="${train.nose}"/>`,
    `<rect x="96" y="42" width="52" height="24" rx="7" fill="#dff0fb"/>`,
    `<rect x="170" y="42" width="52" height="24" rx="7" fill="#dff0fb"/>`,
    `<circle cx="70" cy="102" r="11" fill="${INK}"/>`,
    `<circle cx="150" cy="102" r="11" fill="${INK}"/>`,
    `<circle cx="230" cy="102" r="11" fill="${INK}"/>`,
    `<rect x="0" y="112" width="300" height="5" rx="2.5" fill="${RAIL}"/>`
  ].join(""), "xMidYMid meet");
}
