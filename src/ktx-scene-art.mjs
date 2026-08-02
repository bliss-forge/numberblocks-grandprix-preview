// 칙칙폭폭 기관사 — 코드 SVG 아트. 반실사 페인팅(실사 70/애니 30):
// 정적 linearGradient/radialGradient 허용, filter·feGaussianBlur·SMIL·<image> 금지.
//
// 그라데이션 id 규칙 — 이 SVG들은 한 문서에 여러 장 동시 인라인되므로
// (하늘 5장×2뷰, 땅 6장×2뷰 등) 모든 <defs> id는 "함수 인자별 유니크"다:
//   ktx-g-sky-{sky} · ktx-g-sun-{sky}                (skyLayerSvg)
//   ktx-g-land-{land} · ktx-g-land2/fog/lamp-{land}  (landLayerSvg — defs는 래퍼에 1회)
//   ktx-g-body/nose/waist/blend/skirt/glass/band/shadow/roof-{train.id} (sideTrainSvg)
//   ktx-g-card*-{train.id}                           (trainCardSvg)
//   ktx-g-onc-* / ktx-g-oncab-{part}*                (oncoming 계열)
//   ktx-g-plat-* / ktx-g-portal-*                    (승강장·포털)
// 같은 함수+같은 인자의 중복 인라인(2뷰)은 동일 정의라 렌더가 어긋나지 않는다.
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

// v5 신규 리버리 토큰 — 실차 투톤(은백 차체 + 색 허리 밴드)용 은백/회색 계열
const BODY_SILVER = "#f7f9fc";       // 차체 상부 은백
const BODY_SILVER_DEEP = "#dfe6ee"; // 차체 은백 음영(하단·도어 리프)
const SKIRT_STEEL = "#3a4152";      // 스커트/하부 금속 (= LAND_PALETTES.tunnel.base)
const ROOF_GEAR = "#98a2b3";        // 지붕 장비(에어컨 유닛·판토 베이스) 회색

// 계기·지물이 쓰는 색 전체 — 아트 계약 테스트의 허용 집합.
export const KTX_ART_TOKENS = Object.freeze([
  INK, PAPER, RAIL, TIE, TIE_NIGHT, RAIL_LIGHT, WIRE, BALLAST,
  BALLAST_SHOULDER, TUNNEL_HOLE, GLASS, DOOR_GLASS, JOINT, JOINT_TOP,
  SLAB, ROOF, PILLAR, HEADLAMP, POP_YELLOW, POP_RED, POP_GREEN, POP_BLUE,
  GRAY, DIAL_LOW, BODY_SILVER, BODY_SILVER_DEEP, SKIRT_STEEL, ROOF_GEAR
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

// ── 반실사 페인트 유틸 ─────────────────────────────────────────────────────

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b].map(v =>
    Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")
  ).join("")}`;
}

function mixColor(a, b, t) {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

const lighten = (hex, t) => mixColor(hex, "#ffffff", t);
// 그늘은 검정 대신 남색을 섞는다 — 채도를 죽이지 않는 "맑은 날 그림자".
const darken = (hex, t) => mixColor(hex, "#101d33", t);
// 대기 원근 — 멀수록 이 하늘빛 안개 쪽으로 섞는다.
const HAZE = "#dcecf9";

function linGrad(id, stops, axis = "v") {
  const dir = axis === "h"
    ? 'x1="0" y1="0" x2="1" y2="0"'
    : 'x1="0" y1="0" x2="0" y2="1"';
  const body = stops.map(([off, color, op]) =>
    `<stop offset="${off}" stop-color="${color}"` +
    `${op == null ? "" : ` stop-opacity="${op}"`}/>`).join("");
  return `<linearGradient id="${id}" ${dir}>${body}</linearGradient>`;
}

function radGrad(id, stops) {
  const body = stops.map(([off, color, op]) =>
    `<stop offset="${off}" stop-color="${color}"` +
    `${op == null ? "" : ` stop-opacity="${op}"`}/>`).join("");
  return `<radialGradient id="${id}">${body}</radialGradient>`;
}

function svgWrap(className, viewBox, body, preserve = "xMidYMax slice") {
  return `<svg class="${className}" viewBox="${viewBox}" ` +
    `preserveAspectRatio="${preserve}" aria-hidden="true" ` +
    `xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// ── 하늘 (뷰 공용) ─────────────────────────────────────────────────────────
// 수직 그라데이션 하늘 + radialGradient 태양/달 글로우 + 다겹 반투명 구름.

const SKY_GRAD_STOPS = Object.freeze({
  morning: [["0%", "#a8d8f0"], ["55%", "#d8ecf8"], ["100%", "#ffdcb2"]],
  day: [["0%", "#5fbdf2"], ["60%", "#a5ddfb"], ["100%", "#e2f4ff"]],
  sunset: [["0%", "#ffca96"], ["48%", "#f79fa4"], ["100%", "#c9a8dd"]],
  night: [["0%", "#131c37"], ["55%", "#243458"], ["100%", "#3d5080"]],
  dawn: [["0%", "#f6c4da"], ["55%", "#f8d6c0"], ["100%", "#ffd98e"]]
});

function cloudPuff(x, y, scale, tint) {
  return `<g transform="translate(${x} ${y}) scale(${scale})">` +
    `<ellipse cx="0" cy="8" rx="94" ry="20" fill="${tint}" opacity=".35"/>` +
    `<ellipse cx="-32" cy="-6" rx="52" ry="18" fill="${tint}" opacity=".55"/>` +
    `<ellipse cx="34" cy="-2" rx="58" ry="20" fill="${tint}" opacity=".48"/>` +
    `</g>`;
}

function celestialFor(sky, palette) {
  if (sky === "night") {
    const stars = [[120, 60], [300, 110], [520, 50], [700, 95], [880, 65],
      [420, 140], [820, 150]]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4" fill="${palette.glow}"/>`)
      .join("");
    return `${stars}<circle cx="760" cy="90" r="88" fill="url(#ktx-g-sun-night)"/>` +
      `<circle cx="760" cy="90" r="34" fill="${palette.glow}"/>` +
      `<circle cx="750" cy="82" r="7" fill="#ddcfa4" opacity=".8"/>` +
      `<circle cx="770" cy="100" r="5" fill="#ddcfa4" opacity=".7"/>` +
      cloudPuff(280, 210, 0.85, palette.cloud);
  }
  const sunX = sky === "morning" || sky === "dawn" ? 180 : 780;
  return `<circle cx="${sunX}" cy="96" r="120" fill="url(#ktx-g-sun-${sky})"/>` +
    `<circle cx="${sunX}" cy="96" r="46" fill="${palette.glow}"/>` +
    `<circle cx="${sunX - 8}" cy="88" r="30" fill="${lighten(palette.glow, 0.4)}"/>` +
    cloudPuff(sunX + 240, 84, 1, palette.cloud) +
    cloudPuff(sunX - 210, 146, 0.78, palette.cloud);
}

export function skyLayerSvg(sky) {
  const palette = SKY_PALETTES[sky];
  if (!palette) return "";
  const defs = `<defs>` +
    linGrad(`ktx-g-sky-${sky}`, SKY_GRAD_STOPS[sky]) +
    radGrad(`ktx-g-sun-${sky}`, [
      ["0%", palette.glow, 0.85], ["55%", palette.glow, 0.3], ["100%", palette.glow, 0]
    ]) +
    `</defs>`;
  return svgWrap(`ktx-sky ktx-sky-${sky}`, "0 0 1000 300", [
    defs,
    `<rect width="1000" height="300" fill="url(#ktx-g-sky-${sky})"/>`,
    celestialFor(sky, palette)
  ].join(""), "xMidYMin slice");
}

// ── 땅 실루엣 스트립 (수평 루프 — 폭 1000 세 장을 이어 붙여 흐른다) ────────
// 대기 원근 2겹: 뒤(하늘빛 섞인 옅은 톤) + 앞(진한 톤·그라데이션).
// 주의 — defs는 landLayerSvg 래퍼에 1회만: 스트립을 3배 타일링하므로
// 스트립 안에 넣으면 같은 SVG 안에서 id가 3중 복제된다.

function landDefs(land) {
  const palette = LAND_PALETTES[land];
  if (land === "city") {
    return linGrad("ktx-g-land-city",
      [["0%", lighten(palette.base, 0.22)], ["100%", darken(palette.base, 0.16)]]);
  }
  if (land === "field") {
    return linGrad("ktx-g-land-field",
      [["0%", lighten(palette.base, 0.28)], ["100%", darken(palette.base, 0.08)]]);
  }
  if (land === "river") {
    return linGrad("ktx-g-land-river",
      [["0%", lighten(palette.base, 0.3)], ["55%", palette.base], ["100%", palette.accent]]);
  }
  if (land === "mountain") {
    return linGrad("ktx-g-land-mountain",
      [["0%", lighten(palette.base, 0.3)], ["100%", darken(palette.base, 0.12)]]) +
      linGrad("ktx-g-land2-mountain",
        [["0%", lighten(palette.accent, 0.26)], ["100%", darken(palette.accent, 0.12)]]) +
      linGrad("ktx-g-fog-mountain",
        [["0%", "#ffffff", 0], ["45%", "#ffffff", 0.3], ["100%", "#ffffff", 0]]);
  }
  if (land === "tunnel") {
    return linGrad("ktx-g-land-tunnel",
      [["0%", darken(palette.accent, 0.3)], ["60%", palette.accent],
        ["100%", lighten(palette.accent, 0.14)]]) +
      radGrad("ktx-g-lamp-tunnel",
        [["0%", palette.pop, 0.8], ["100%", palette.pop, 0]]);
  }
  if (land === "sea") {
    return linGrad("ktx-g-land-sea",
      [["0%", lighten(palette.base, 0.34)], ["45%", palette.base], ["100%", palette.accent]]);
  }
  return "";
}

function landStrip(land) {
  const palette = LAND_PALETTES[land];
  const haze = base => mixColor(base, HAZE, 0.6);
  if (land === "city") {
    const back = [[36, 96, 70], [150, 72, 56], [296, 104, 88], [430, 66, 60],
      [560, 92, 52], [640, 78, 74], [760, 100, 60], [860, 70, 64]]
      .map(([x, y, w]) =>
        `<rect x="${x}" y="${y}" width="${w}" height="${200 - y}" rx="4" fill="${haze(palette.base)}"/>`)
      .join("");
    const blocks = [[0, 76, 90], [110, 40, 120], [250, 92, 80], [360, 24, 130],
      [470, 66, 95], [580, 14, 140], [700, 84, 85], [800, 44, 115], [910, 70, 90]]
      .map(([x, y, w]) => {
        const windows = [0, 1].map(col => [0, 1].map(row =>
          `<rect x="${x + 12 + col * (w - 38)}" y="${y + 12 + row * 26}" ` +
          `width="14" height="16" rx="2" fill="#ffe6ad" opacity=".8"/>`
        ).join("")).join("");
        return `<rect x="${x}" y="${y}" width="${w}" height="${200 - y}" rx="6" ` +
          `fill="url(#ktx-g-land-city)"/>${windows}`;
      })
      .join("");
    return `${back}${blocks}<rect x="330" y="16" width="18" height="60" fill="${palette.pop}"/>`;
  }
  if (land === "field") {
    const back =
      `<path d="M0 116 Q250 74 520 106 Q780 134 1000 98 L1000 200 L0 200z" fill="${haze(palette.base)}"/>`;
    return back +
      `<path d="M0 130 Q160 60 330 120 Q500 175 670 110 Q840 55 1000 125 L1000 200 L0 200z" fill="url(#ktx-g-land-field)"/>` +
      [[140, 120], [430, 140], [760, 118]].map(([x, y]) =>
        `<circle cx="${x}" cy="${y}" r="26" fill="${palette.accent}"/>` +
        `<circle cx="${x - 9}" cy="${y - 9}" r="13" fill="${lighten(palette.accent, 0.3)}"/>` +
        `<rect x="${x - 4}" y="${y + 16}" width="8" height="26" fill="${TIE}"/>`).join("") +
      `<rect x="580" y="96" width="34" height="44" rx="6" fill="${palette.pop}"/>` +
      `<path d="M570 100 L597 76 L624 100z" fill="${palette.accent}"/>`;
  }
  if (land === "river") {
    const back = `<rect x="0" y="94" width="1000" height="20" fill="${haze(palette.base)}"/>`;
    const glints = [[90, 128, 34], [210, 150, 26], [330, 136, 40], [470, 162, 28],
      [610, 130, 36], [760, 152, 26], [900, 140, 32]]
      .map(([x, y, w], index) =>
        `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${PAPER}" ` +
        `opacity="${index % 2 === 0 ? ".5" : ".32"}"/>`)
      .join("");
    return back +
      `<rect x="0" y="110" width="1000" height="90" fill="url(#ktx-g-land-river)"/>` +
      `<path d="M0 110 Q250 96 500 110 Q750 124 1000 110" fill="none" stroke="${palette.accent}" stroke-width="8"/>` +
      glints +
      `<path d="M840 132 q14 -26 28 0z" fill="${palette.pop}"/>`;
  }
  if (land === "mountain") {
    const back =
      `<path d="M0 200 L110 104 L250 200z" fill="${haze(palette.base)}"/>` +
      `<path d="M170 200 L400 78 L640 200z" fill="${haze(palette.base)}"/>` +
      `<path d="M600 200 L820 92 L1000 190 L1000 200z" fill="${haze(palette.base)}"/>`;
    return back +
      `<path d="M0 200 L140 70 L280 200z" fill="url(#ktx-g-land-mountain)"/>` +
      `<path d="M180 200 L360 40 L560 200z" fill="url(#ktx-g-land2-mountain)"/>` +
      `<path d="M470 200 L640 84 L820 200z" fill="url(#ktx-g-land-mountain)"/>` +
      `<path d="M700 200 L880 56 L1000 168 L1000 200z" fill="url(#ktx-g-land2-mountain)"/>` +
      `<path d="M330 68 L360 40 L392 68 L376 76 L344 76z" fill="${PAPER}" opacity=".8"/>` +
      `<rect x="0" y="112" width="1000" height="36" fill="url(#ktx-g-fog-mountain)"/>`;
  }
  if (land === "tunnel") {
    const lamps = [[80, 60], [320, 60], [560, 60], [800, 60]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="32" fill="url(#ktx-g-lamp-tunnel)"/>` +
      `<circle cx="${x}" cy="${y}" r="13" fill="${palette.pop}"/>` +
      `<circle cx="${x}" cy="${y}" r="6" fill="${HEADLAMP}"/>`).join("");
    return `<rect x="0" y="0" width="1000" height="200" fill="url(#ktx-g-land-tunnel)"/>` +
      [[190, 30], [440, 30], [690, 30], [930, 30]].map(([x, y]) =>
        `<rect x="${x}" y="${y}" width="6" height="140" rx="3" fill="${darken(palette.accent, 0.24)}"/>`).join("") +
      lamps +
      `<path d="M0 150 Q125 172 250 150 Q375 128 500 150 Q625 172 750 150 Q875 128 1000 150" fill="none" stroke="${palette.base}" stroke-width="7"/>`;
  }
  if (land === "sea") {
    const glints = [[120, 120, 26], [260, 138, 20], [420, 116, 30], [560, 150, 22],
      [700, 124, 28], [840, 144, 20], [940, 118, 24]]
      .map(([x, y, w], index) =>
        `<rect x="${x}" y="${y}" width="${w}" height="4" rx="2" fill="${PAPER}" ` +
        `opacity="${index % 2 === 0 ? ".55" : ".35"}"/>`)
      .join("");
    return `<rect x="0" y="96" width="1000" height="104" fill="url(#ktx-g-land-sea)"/>` +
      `<path d="M0 96 Q250 84 500 96 Q750 108 1000 96" fill="none" stroke="${lighten(palette.base, 0.4)}" stroke-width="8"/>` +
      glints +
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
    `<defs>${landDefs(land)}</defs>`,
    `<g>${strip}</g>`,
    `<g transform="translate(1000 0)">${strip}</g>`,
    `<g transform="translate(2000 0)">${strip}</g>`
  ].join(""), "xMinYMax slice");
}

export const ALL_SKIES = Object.freeze(Object.keys(SKY_PALETTES));
export const ALL_LANDS = Object.freeze(Object.keys(LAND_PALETTES));

// ── 3인칭 열차 (색은 고른 열차가 정한다) ──────────────────────────────────

// v5 — 실차 리버리 렌더: 투톤(은백 상부 그라데이션 + train.color 허리 밴드 +
// 짙은 회색 금속 스커트). 노즈만 train.color 그라데이션이고 은백 상부와의
// 경계는 곡선 블렌드 패스 1장이 잇는다. 지붕 에어컨 유닛·지붕 라인, 대차
// 프레임, 도어 세로 라인으로 디테일 밀도 보강. 검정 창띠·유리 반사·지면
// 그림자(radialGradient 타원)는 v4 유지.
// 계약 유지: .ktx-window-slot[data-slot=0..7] g 안에 62×52 rect + .ktx-window-glow,
// .ktx-door×4(leaf ±14px), .ktx-wheel g들, .ktx-panto, .ktx-beam, viewBox 1200×170.
// 실루엣 분기: srt = 원호 노즈 + 원형 헤드라이트 / ktx = 쐐기 노즈 + 지붕 뒤 핀.
export function sideTrainSvg(train, windows = 8) {
  const isSrt = train.id === "srt";
  const gid = suffix => `ktx-g-${suffix}-${train.id}`;
  const defs = `<defs>` +
    linGrad(gid("body"), [
      ["0%", lighten(BODY_SILVER, 0.5)], ["45%", BODY_SILVER],
      ["100%", BODY_SILVER_DEEP]
    ]) +
    linGrad(gid("nose"), [
      ["0%", lighten(train.color, 0.34)], ["30%", lighten(train.color, 0.12)],
      ["62%", train.color], ["100%", darken(train.color, 0.24)]
    ]) +
    linGrad(gid("waist"), [
      ["0%", lighten(train.color, 0.16)], ["60%", train.color],
      ["100%", darken(train.color, 0.28)]
    ]) +
    linGrad(gid("blend"), [
      ["0%", train.color, 0.9], ["55%", train.color, 0.35],
      ["100%", train.color, 0]
    ], "h") +
    linGrad(gid("skirt"), [
      ["0%", lighten(SKIRT_STEEL, 0.3)], ["55%", SKIRT_STEEL],
      ["100%", darken(SKIRT_STEEL, 0.32)]
    ]) +
    linGrad(gid("band"), [
      ["0%", "#2c3950"], ["60%", "#1d2634"], ["100%", "#161e2b"]
    ]) +
    linGrad(gid("glass"), [
      ["0%", "#3c4a63"], ["45%", "#1d2634"], ["100%", "#141b27"]
    ]) +
    linGrad(gid("roof"), [
      ["0%", "#ffffff", 0.55], ["100%", "#ffffff", 0]
    ]) +
    radGrad(gid("shadow"), [
      ["0%", "#0c1420", 0.3], ["70%", "#0c1420", 0.14], ["100%", "#0c1420", 0]
    ]) +
    `</defs>`;
  const carAt = index => 330 + index * 200; // 차체 330~1130, 량 피치 200
  const slots = Array.from({ length: windows }, (unused, index) => {
    const car = Math.floor(index / 2);
    const x = carAt(car) + 7 + (index % 2) * 75;
    return `<g class="ktx-window-slot" data-slot="${index}" transform="translate(${x} 60)">` +
      `<rect width="62" height="52" rx="8" fill="url(#${gid("glass")})"/>` +
      `<polygon points="6,52 26,0 40,0 14,52" fill="${PAPER}" opacity=".2"/>` +
      `<polygon points="34,52 50,6 56,6 42,52" fill="${PAPER}" opacity=".1"/>` +
      `<rect class="ktx-window-glow" width="62" height="52" rx="8" fill="${HEADLAMP}" opacity="0"/>` +
      `</g>`;
  }).join("");
  const doors = Array.from({ length: 4 }, (unused, index) => {
    const x = carAt(index) + 157;
    return `<g class="ktx-door" transform="translate(${x} 58)">` +
      `<rect width="36" height="54" rx="4" fill="url(#${gid("skirt")})"/>` +
      `<rect x="2" y="4" width="32" height="46" rx="3" fill="${JOINT}"/>` +
      `<g class="ktx-door-leaf ktx-door-leaf-l">` +
      `<rect x="2" y="4" width="16" height="46" rx="3" fill="${BODY_SILVER_DEEP}"/>` +
      `<rect x="6" y="10" width="8" height="20" rx="2" fill="url(#${gid("glass")})"/>` +
      `<rect x="16.6" y="5" width="1.4" height="44" fill="${INK}" opacity=".3"/>` +
      `</g>` +
      `<g class="ktx-door-leaf ktx-door-leaf-r">` +
      `<rect x="18" y="4" width="16" height="46" rx="3" fill="${BODY_SILVER_DEEP}"/>` +
      `<rect x="22" y="10" width="8" height="20" rx="2" fill="url(#${gid("glass")})"/>` +
      `<rect x="18" y="5" width="1.4" height="44" fill="${INK}" opacity=".3"/>` +
      `</g>` +
      // 도어 라인 — 문 테두리 세로 라인(실차의 도어 컷 라인)
      `<rect x="0" y="2" width="1.4" height="50" fill="${INK}" opacity=".38"/>` +
      `<rect x="34.6" y="2" width="1.4" height="50" fill="${INK}" opacity=".38"/>` +
      `<circle class="ktx-door-warnlamp" cx="18" cy="-5" r="5" fill="${POP_RED}" opacity="0"/>` +
      `</g>`;
  }).join("");
  const joints = [530, 730, 930].map(x =>
    `<rect x="${x - 4}" y="62" width="8" height="50" rx="3" fill="${JOINT}"/>` +
    `<rect x="${x - 6}" y="62" width="12" height="6" rx="3" fill="${JOINT_TOP}"/>`
  ).join("");
  // 자코브스 대차 문법 유지 — 량 경계 공유 + 선두·후미 동력차 대차.
  // 스커트(y112~128)가 위를 가려 노출은 하부 원호만(먼저 그리고 차체가 덮는다).
  const wheels = [110, 158, 530, 730, 930, 1090, 1152].map(cx =>
    `<g transform="translate(${cx} 136)"><g class="ktx-wheel">` +
    `<circle r="14" fill="${INK}"/><circle r="5" fill="${RAIL}"/>` +
    `<rect x="-12" y="-2" width="24" height="4" rx="2" fill="${RAIL}"/>` +
    `</g></g>`
  ).join("");
  const noseHull = isSrt
    ? "M8 128 C8 114 10 102 26 96 C110 74 220 62 332 58 L332 128z"
    : "M4 128 L14 100 C90 78 210 63 332 58 L332 128z";
  const noseBand = isSrt
    ? "M8 128 C8 116 14 110 36 107 L332 112 L332 128z"
    : "M4 128 L10 106 L332 112 L332 128z";
  const noseSheen = isSrt
    ? "M28 95 C110 74 220 63 332 58 L332 64 C224 68 118 80 38 99z"
    : "M15 99 C90 78 210 64 332 58 L332 64 C216 69 98 83 21 102z";
  const tailHull = isSrt
    ? "M1192 128 C1192 114 1190 102 1174 96 C1156 88 1144 70 1130 58 L1130 128z"
    : "M1196 128 L1186 100 C1170 84 1150 68 1130 58 L1130 128z";
  const tailBand = isSrt
    ? "M1192 128 C1192 116 1186 110 1164 107 L1130 112 L1130 128z"
    : "M1196 128 L1190 106 L1130 112 L1130 128z";
  const cabGlass = isSrt
    ? "M190 90 L210 70 L272 66 L272 90z"
    : "M182 92 L212 72 L276 66 L276 92z";
  const cabStreak = isSrt
    ? "M216 90 L234 69 L248 68 L230 90z"
    : "M212 92 L236 70 L250 69 L226 92z";
  const idMark = isSrt
    ? `<circle cx="28" cy="106" r="6" fill="${HEADLAMP}"/>`
    : `<path d="M1044 58 L1058 46 L1072 58z" fill="${train.nose}"/>`;
  return svgWrap("ktx-side-train-art", "0 0 1200 170", [
    defs,
    // 전조등 빔 — CSS가 밤에 켠다(viewBox 왼쪽 밖 -80까지, overflow visible 전제)
    `<polygon class="ktx-beam" points="12,98 -80,80 -80,146 12,128" fill="${HEADLAMP}" opacity="0"/>`,
    // 지면 그림자 — 차체 아래 부드러운 접지감
    `<ellipse cx="600" cy="152" rx="560" ry="9" fill="url(#${gid("shadow")})"/>`,
    wheels,
    // 선두 장노즈 — id별 실루엣
    `<path d="${noseHull}" fill="url(#${gid("body")})"/>`,
    `<path d="${noseBand}" fill="url(#${gid("skirt")})"/>`,
    `<path d="${noseSheen}" fill="${PAPER}" opacity=".28"/>`,
    // 연속 차체 + 스커트
    `<rect x="330" y="58" width="800" height="54" fill="url(#${gid("body")})"/>`,
    `<rect x="330" y="112" width="800" height="16" fill="url(#${gid("skirt")})"/>`,
    // 후미 미러 노즈
    `<path d="${tailHull}" fill="url(#${gid("body")})"/>`,
    `<path d="${tailBand}" fill="url(#${gid("skirt")})"/>`,
    // 연속 창띠(거의 검정) + 지붕 하이라이트 립 + 하부 음영 라인
    `<rect x="334" y="66" width="792" height="40" rx="12" fill="url(#${gid("band")})"/>`,
    `<rect x="340" y="59" width="780" height="6" rx="3" fill="url(#${gid("roof")})"/>`,
    `<rect x="334" y="107" width="792" height="3" rx="1.5" fill="${INK}" opacity=".2"/>`,
    joints,
    slots,
    doors,
    `<path d="${cabGlass}" fill="url(#${gid("glass")})"/>`,
    `<path d="${cabStreak}" fill="${PAPER}" opacity=".3"/>`,
    idMark,
    // 팬터그래프 — 낮아진 지붕(y58)에 맞춤
    `<g class="ktx-panto">` +
    `<rect x="386" y="52" width="64" height="6" rx="3" fill="${train.nose}"/>` +
    `<path d="M398 52 L418 32 L438 52" fill="none" stroke="${INK}" stroke-width="4"/>` +
    `<rect x="406" y="28" width="44" height="4" rx="2" fill="${INK}"/></g>`,
    `<rect x="0" y="156" width="1200" height="6" rx="3" fill="${RAIL}"/>`,
    `<rect x="0" y="156" width="1200" height="2" rx="1" fill="${RAIL_LIGHT}"/>`
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
// TUNNEL_HOLE 계열, 최종 scale 12 — 삼킴 공포 제거. 석재는 미세 그라데이션.
export function portalSvg() {
  const defs = `<defs>` +
    linGrad("ktx-g-portal-stone", [["0%", "#4c576c"], ["100%", "#333a4b"]]) +
    linGrad("ktx-g-portal-hole", [["0%", "#1c2231"], ["100%", "#2d3446"]]) +
    `</defs>`;
  return svgWrap("ktx-portal-art", "0 0 200 200", [
    defs,
    `<path d="M14 200 L14 96 Q100 -4 186 96 L186 200 L150 200 L150 108 ` +
    `Q100 52 50 108 L50 200z" fill="url(#ktx-g-portal-stone)"/>`,
    `<path d="M50 200 L50 108 Q100 52 150 108 L150 200z" fill="url(#ktx-g-portal-hole)"/>`,
    `<rect x="14" y="182" width="36" height="8" fill="${PAPER}"/>`,
    `<rect x="150" y="182" width="36" height="8" fill="${PAPER}"/>`
  ].join(""), "xMidYMax meet");
}

// 1인칭 역 접근 — 소실점에서 자라는 승강장(모델 구동, 씬이 scale 변수 세팅).
// 로컬 x=23의 노란 타일이 정차 마커(★) — 스트립·✋과 자동 정합.
export function cabPlatformSvg() {
  const defs = `<defs>` +
    linGrad("ktx-g-plat-slab", [
      ["0%", lighten(SLAB, 0.18)], ["100%", darken(SLAB, 0.14)]
    ]) +
    linGrad("ktx-g-plat-roof", [
      ["0%", lighten(ROOF, 0.25)], ["100%", darken(ROOF, 0.12)]
    ]) +
    `</defs>`;
  return svgWrap("ktx-cabplat-art", "0 0 560 150", [
    defs,
    `<path d="M0 150 L28 96 L560 96 L560 150z" fill="url(#ktx-g-plat-slab)"/>`,
    `<rect x="28" y="96" width="532" height="10" fill="${PAPER}"/>`,
    `<rect x="28" y="106" width="532" height="8" fill="${POP_YELLOW}"/>`,
    `<rect x="23" y="112" width="46" height="34" rx="6" fill="${POP_YELLOW}"/>`,
    `<text x="46" y="138" text-anchor="middle" font-size="24" font-weight="900" ` +
    `fill="${INK}">★</text>`,
    `<rect x="150" y="16" width="12" height="80" fill="${PILLAR}"/>`,
    `<rect x="400" y="16" width="12" height="80" fill="${PILLAR}"/>`,
    `<rect x="120" y="4" width="330" height="14" rx="7" fill="url(#ktx-g-plat-roof)"/>`,
    `<rect x="230" y="30" width="120" height="40" rx="8" fill="${INK}"/>`
  ].join(""), "xMinYMax meet");
}

// 교행 열차(1인칭) — 맞은편 선로 위를 훑는 3량 스프라이트.
// part별 defs id — "mid"는 씬이 2번 인라인하지만 동일 정의라 안전.
export function cabOncomingSvg(part) {
  const bodyId = `ktx-g-oncab-${part}`;
  const glassId = `ktx-g-oncabglass-${part}`;
  const defs = `<defs>` +
    linGrad(bodyId, [
      ["0%", lighten(POP_GREEN, 0.3)], ["55%", POP_GREEN], ["100%", darken(POP_GREEN, 0.22)]
    ]) +
    linGrad(glassId, [["0%", "#3c4a63"], ["100%", "#1d2634"]]) +
    `</defs>`;
  if (part === "lead") {
    return svgWrap("ktx-oncome-art", "0 0 200 90", [
      defs,
      `<path d="M196 82 C194 52 180 34 130 26 L8 20 L8 82z" fill="url(#${bodyId})"/>`,
      `<path d="M196 82 C195 66 188 56 164 52 L8 52 L8 82z" fill="#1d7a42"/>`,
      `<rect x="20" y="28" width="90" height="18" rx="6" fill="url(#${glassId})"/>`,
      `<polygon points="34,46 48,28 58,28 44,46" fill="${PAPER}" opacity=".25"/>`
    ].join(""), "xMidYMax meet");
  }
  return svgWrap("ktx-oncome-art", "0 0 200 90", [
    defs,
    `<rect x="0" y="20" width="200" height="62" rx="6" fill="url(#${bodyId})"/>`,
    `<rect x="0" y="52" width="200" height="30" fill="#1d7a42"/>`,
    ...Array.from({ length: 3 }, (unused, index) =>
      `<rect x="${18 + index * 62}" y="30" width="44" height="16" rx="5" fill="url(#${glassId})"/>` +
      `<polygon points="${26 + index * 62},46 ${36 + index * 62},30 ${42 + index * 62},30 ${32 + index * 62},46" ` +
      `fill="${PAPER}" opacity=".22"/>`)
  ].join(""), "xMidYMax meet");
}

// 교행 열차(3인칭) — 화면을 가로지르는 미러 스트립.
export function oncomingTrainSvg() {
  const defs = `<defs>` +
    linGrad("ktx-g-onc-body", [
      ["0%", lighten(POP_GREEN, 0.3)], ["55%", POP_GREEN], ["100%", darken(POP_GREEN, 0.22)]
    ]) +
    linGrad("ktx-g-onc-glass", [["0%", "#3c4a63"], ["100%", "#1d2634"]]) +
    `</defs>`;
  return svgWrap("ktx-oncoming-art", "0 0 760 100", [
    defs,
    `<path d="M6 92 C8 62 20 44 62 36 L200 30 L200 92z" fill="url(#ktx-g-onc-body)"/>`,
    `<rect x="200" y="30" width="264" height="62" rx="4" fill="url(#ktx-g-onc-body)"/>`,
    `<rect x="470" y="30" width="264" height="62" rx="4" fill="url(#ktx-g-onc-body)"/>`,
    `<rect x="6" y="64" width="728" height="28" fill="#1d7a42"/>`,
    ...Array.from({ length: 7 }, (unused, index) =>
      `<rect x="${90 + index * 90}" y="40" width="52" height="18" rx="5" fill="url(#ktx-g-onc-glass)"/>` +
      `<polygon points="${100 + index * 90},58 ${112 + index * 90},40 ${120 + index * 90},40 ${108 + index * 90},58" ` +
      `fill="${PAPER}" opacity=".22"/>`),
    `<path d="M754 92 C752 62 740 44 698 36 L560 30 L560 92z" fill="url(#ktx-g-onc-body)"/>`
  ].join(""), "xMidYMax meet");
}

// 중경 스트립(3인칭) — 언덕·집·간이역 실루엣. 색은 currentColor(CSS가 밤낮 지정).
// 형태 디테일만 소폭: 집 창문·역 시계는 반투명 흰색(어느 틴트에서도 창으로 읽힘).
export function midStripSvg() {
  const strip = [
    `<path d="M0 140 Q170 84 340 128 Q510 168 680 116 Q850 70 1000 132 L1000 200 L0 200z" fill="currentColor"/>`,
    `<rect x="120" y="112" width="40" height="34" rx="4" fill="currentColor"/>`,
    `<path d="M112 116 L140 96 L168 116z" fill="currentColor"/>`,
    `<rect x="130" y="122" width="9" height="10" rx="2" fill="${PAPER}" opacity=".4"/>`,
    `<rect x="145" y="122" width="9" height="10" rx="2" fill="${PAPER}" opacity=".4"/>`,
    `<rect x="520" y="120" width="36" height="28" rx="4" fill="currentColor"/>`,
    `<path d="M512 124 L538 106 L564 124z" fill="currentColor"/>`,
    `<rect x="531" y="128" width="10" height="11" rx="2" fill="${PAPER}" opacity=".4"/>`,
    // 간이역 — 역 통과 풍경(모델 변경 0)
    `<rect x="780" y="128" width="120" height="10" rx="4" fill="currentColor"/>`,
    `<rect x="796" y="96" width="8" height="34" fill="currentColor"/>`,
    `<rect x="876" y="96" width="8" height="34" fill="currentColor"/>`,
    `<rect x="772" y="86" width="136" height="12" rx="6" fill="currentColor"/>`,
    `<circle cx="840" cy="92" r="5" fill="${PAPER}" opacity=".4"/>`
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
    `<circle cx="72" cy="22" r="4" fill="currentColor"/>`,
    // 애자 하이라이트 + 보조 완철
    `<circle cx="46" cy="21" r="1.6" fill="${PAPER}" opacity=".45"/>`,
    `<circle cx="72" cy="21" r="1.6" fill="${PAPER}" opacity=".45"/>`,
    `<rect x="24" y="44" width="40" height="5" rx="2.5" fill="currentColor"/>`,
    `<circle cx="42" cy="41" r="3" fill="currentColor"/>`
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
    `<ellipse cx="-1" cy="5" rx="17" ry="7" fill="${INK}" opacity=".12"/>` +
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
// 실차 비율 실루엣 미니어처 — 본편 sideTrainSvg v4와 같은 음영 문법
// (SRT 원호 / KTX 쐐기+핀 + 차체 그라데이션·검정 창띠·유리 반사·지면 그림자).
export function trainCardSvg(train) {
  const isSrt = train.id === "srt";
  const gid = suffix => `ktx-g-card${suffix}-${train.id}`;
  const defs = `<defs>` +
    linGrad(gid(""), [
      ["0%", lighten(train.color, 0.34)], ["30%", lighten(train.color, 0.12)],
      ["62%", train.color], ["100%", darken(train.color, 0.24)]
    ]) +
    linGrad(gid("skirt"), [
      ["0%", lighten(train.nose, 0.24)], ["55%", train.nose],
      ["100%", darken(train.nose, 0.3)]
    ]) +
    linGrad(gid("glass"), [["0%", "#3c4a63"], ["100%", "#1d2634"]]) +
    radGrad(gid("shadow"), [
      ["0%", "#0c1420", 0.28], ["70%", "#0c1420", 0.12], ["100%", "#0c1420", 0]
    ]) +
    `</defs>`;
  const hull = isSrt
    ? `<path d="M10 96 C10 84 12 74 26 69 C58 61 108 55 150 54 L288 54 L288 96z" fill="url(#${gid("")})"/>`
    : `<path d="M6 96 L16 72 C56 62 106 56 150 54 L288 54 L288 96z" fill="url(#${gid("")})"/>`;
  const band = isSrt
    ? `<path d="M10 96 C10 88 14 84 30 82 L288 84 L288 96z" fill="url(#${gid("skirt")})"/>`
    : `<path d="M6 96 L12 84 L288 84 L288 96z" fill="url(#${gid("skirt")})"/>`;
  const fin = isSrt
    ? `<circle cx="20" cy="82" r="4" fill="${HEADLAMP}"/>`
    : `<path d="M236 54 L248 45 L260 54z" fill="${train.color}"/>`;
  return svgWrap("ktx-train-card-art", "0 0 300 120", [
    defs,
    `<ellipse cx="150" cy="111" rx="142" ry="6" fill="url(#${gid("shadow")})"/>`,
    hull,
    band,
    // 연속 창띠(거의 검정) + 창 2개 + 유리 대각 반사
    `<rect x="130" y="60" width="158" height="20" rx="7" fill="#1d2634"/>`,
    `<rect x="142" y="62" width="42" height="16" rx="5" fill="url(#${gid("glass")})"/>`,
    `<polygon points="150,78 158,62 164,62 156,78" fill="${PAPER}" opacity=".25"/>`,
    `<rect x="200" y="62" width="42" height="16" rx="5" fill="url(#${gid("glass")})"/>`,
    `<polygon points="208,78 216,62 222,62 214,78" fill="${PAPER}" opacity=".25"/>`,
    // 지붕 하이라이트 — 본편과 같은 최소 질감
    `<rect x="60" y="56" width="200" height="4" rx="2" fill="${PAPER}" opacity=".35"/>`,
    fin,
    // 스커트에 반쯤 가린 바퀴
    `<rect x="10" y="96" width="278" height="8" fill="url(#${gid("skirt")})"/>`,
    `<circle cx="70" cy="102" r="8" fill="${INK}"/>`,
    `<circle cx="150" cy="102" r="8" fill="${INK}"/>`,
    `<circle cx="230" cy="102" r="8" fill="${INK}"/>`,
    `<rect x="0" y="110" width="300" height="5" rx="2.5" fill="${RAIL}"/>`
  ].join(""), "xMidYMid meet");
}
