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

// 두 장을 이어 붙여 CSS translateX 무한 루프가 이음새 없이 돌게 한다.
export function landLayerSvg(land) {
  const strip = landStrip(land);
  if (!strip) return "";
  return svgWrap(`ktx-land ktx-land-${land}`, "0 0 2000 200", [
    `<g>${strip}</g>`,
    `<g transform="translate(1000 0)">${strip}</g>`
  ].join(""), "xMinYMax slice");
}

export const ALL_SKIES = Object.freeze(Object.keys(SKY_PALETTES));
export const ALL_LANDS = Object.freeze(Object.keys(LAND_PALETTES));

// ── 3인칭 열차 (색은 고른 열차가 정한다) ──────────────────────────────────

export function sideTrainSvg(train, windows = 8) {
  const slots = Array.from({ length: windows }, (unused, index) => {
    const car = Math.floor(index / 2);
    const x = 236 + car * 172 + (index % 2) * 78;
    return `<g class="ktx-window-slot" data-slot="${index}" transform="translate(${x} 40)">` +
      `<rect width="62" height="52" rx="10" fill="#dff0fb"/></g>`;
  }).join("");
  const cars = Array.from({ length: 4 }, (unused, index) =>
    `<rect x="${226 + index * 172}" y="22" width="160" height="86" rx="16" fill="${train.color}"/>` +
    `<rect x="${226 + index * 172}" y="94" width="160" height="14" fill="${train.nose}"/>`
  ).join("");
  return svgWrap("ktx-side-train-art", "0 0 950 132", [
    // 유선형 선두차
    `<path d="M8 108 Q10 54 84 34 L216 26 L216 108z" fill="${train.color}"/>`,
    `<path d="M8 108 Q9 84 30 72 L216 72 L216 108z" fill="${train.nose}"/>`,
    `<rect x="118" y="40" width="72" height="34" rx="9" fill="#dff0fb"/>`,
    cars,
    slots,
    // 바퀴
    ...Array.from({ length: 9 }, (unused, index) =>
      `<circle cx="${80 + index * 100}" cy="116" r="13" fill="${INK}"/>` +
      `<circle cx="${80 + index * 100}" cy="116" r="5" fill="${RAIL}"/>`),
    `<rect x="0" y="126" width="950" height="6" rx="3" fill="${RAIL}"/>`
  ].join(""), "xMidYMid meet");
}

// ── 1인칭 운전실 ───────────────────────────────────────────────────────────
// 침목은 세로로 흐르는 dasharray 줄무늬 — 사다리꼴 클립 안에서 "다가오는"
// 움직임으로 읽힌다(협회 공학 렌즈 E3). 야간이면 침목 색이 어두워진다.

export function cabTrackSvg() {
  return svgWrap("ktx-cab-track-art", "0 0 1000 420", [
    `<defs><clipPath id="ktx-track-clip">`,
    `<path d="M438 0 L562 0 L830 420 L170 420z"/>`,
    `</clipPath></defs>`,
    // 자갈 바닥
    `<path d="M420 0 L580 0 L880 420 L120 420z" class="ktx-ballast" fill="#cfc3ad"/>`,
    // 침목: 굵은 세로선의 가로 줄무늬(dasharray)가 아래로 흐른다
    `<g clip-path="url(#ktx-track-clip)">`,
    `<line class="ktx-sleepers" x1="500" y1="-60" x2="500" y2="480" ` +
    `stroke="${TIE}" stroke-width="620" stroke-dasharray="16 44"/>`,
    `</g>`,
    // 레일 두 줄 — 소실점으로 모인다
    `<path d="M468 0 L318 420 L358 420 L482 0z" fill="${RAIL}"/>`,
    `<path d="M532 0 L682 420 L642 420 L518 0z" fill="${RAIL}"/>`
  ].join(""), "xMidYMax slice");
}

// 운전대(계기판) — 속도 숫자·게이지·문 램프는 DOM이 얹는다.
export function cabDashSvg(train) {
  return svgWrap("ktx-cab-dash-art", "0 0 1000 240", [
    `<path d="M0 34 Q500 -30 1000 34 L1000 240 L0 240z" fill="${train.nose}"/>`,
    `<path d="M0 60 Q500 0 1000 60 L1000 240 L0 240z" fill="${train.color}"/>`,
    // 속도계 자리
    `<circle cx="500" cy="150" r="92" fill="${INK}"/>`,
    `<circle cx="500" cy="150" r="82" fill="${PAPER}"/>`,
    // 노치 레버
    `<rect x="778" y="96" width="26" height="104" rx="13" fill="${INK}"/>`,
    `<circle class="ktx-notch-knob" cx="791" cy="180" r="22" fill="#f4c542"/>`,
    // 문 램프 자리
    `<circle class="ktx-door-lamp-shape" cx="212" cy="140" r="20" fill="#7d8ea1"/>`,
    `<rect x="180" y="176" width="64" height="12" rx="6" fill="${train.nose}"/>`
  ].join(""), "xMidYMax slice");
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
