// Canonical Train Model — 열차 아트의 유일한 원본.
// 디자인 기준본(SRT 운전 미니게임 시안): 흰색 차체 + 짙은 보라 루프 밴드가
// 차체 전장을 덮고, 루프가 노즈 위로 흘러내려 전면 상부를 덮는다(노즈 하부만
// 흰색). 넓고 어두운 전면 유리 밴드, 노즈 하부 LED 헤드라이트 2조, 노즈에서
// 시작해 창 아래를 관통하는 측면 리버리 라인, 정연한 객실 창문, 대차·바퀴·
// 연결부·팬터그래프·루프 장비, 이탤릭 로고, 후면 빨간 후미등 2조.
//
// 렌더 규칙: filter/SMIL/<image>/사진 텍스처 금지 — 금속감은 정적
// linearGradient/radialGradient 2~4스톱으로만 낸다.
//
// 그라데이션 id 네임스페이스: `ktx-tm-{view}[-{variant}]-{name}-{train.id}` —
// 모든 뷰를 한 문서에 동시 인라인해도 id가 완전 유니크하다.
//
// 뷰 간 일관성 계약: 루프색·차체 흰색·라인색·유리색·로고 텍스트는 전 뷰가
// TRAIN_LIVERIES의 같은 토큰을 쓴다. 측면 4량(창 8개) = top 뷰 4량 분절.

// ── 리버리 토큰 — 열차 색의 유일한 원본 ──────────────────────────────────
// srt: 짙은 가지 보라 루프(#4a2b5c 계열 — train.color #5b2d86보다 어둡다).
// ktx: 짙은 남색 루프(train.color #0f4c9a보다 어둡다) — 같은 문법.
export const TRAIN_LIVERIES = Object.freeze({
  srt: Object.freeze({
    body: "#f6f8fc",       // 차체 흰색
    bodyShade: "#dde4ee",  // 차체 하부 음영
    roof: "#4a2b5c",       // 루프 밴드 — 전면부까지 흘러내리는 보라
    roofDeep: "#3a2149",   // 루프 음영
    stripe: "#6a3c8f",     // 측면 리버리 라인
    glass: "#1b2434",      // 창문·전면 유리
    glassHi: "#33415c",    // 유리 상단 반사
    skirt: "#3a4152",      // 하부 금속 스커트·대차
    lamp: "#f7e7b0",       // LED 헤드라이트
    tail: "#e8564a"        // 후미등 빨강
  }),
  ktx: Object.freeze({
    body: "#f6f8fc",
    bodyShade: "#dde4ee",
    roof: "#14395f",
    roofDeep: "#0c2947",
    stripe: "#2a6bbd",
    glass: "#1b2434",
    glassHi: "#33415c",
    skirt: "#3a4152",
    lamp: "#f7e7b0",
    tail: "#e8564a"
  })
});

// 리버리 밖 공용 재질색 (선로·바퀴·장비 — 열차 정체성과 무관한 하드웨어)
const STEEL = "#8d95a0";        // 레일·차축
const STEEL_LIGHT = "#c8ccd4";  // 레일 광택면
const DARK = "#26303f";         // 바퀴·판토 암부
const GEAR = "#98a2b3";         // 지붕 장비(에어컨·판토 베이스)
const BEAM = "#f4e9c8";         // 전조등 빔(밤 씬 CSS가 켠다)
const SHADOW = "#0c1420";       // 접지 그림자

// ── 페인트 유틸 ───────────────────────────────────────────────────────────

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
const darken = (hex, t) => mixColor(hex, "#101d33", t);

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

function svgWrap(className, viewBox, body) {
  return `<svg class="${className}" viewBox="${viewBox}" ` +
    `preserveAspectRatio="xMidYMid meet" aria-hidden="true" ` +
    `xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function liveryFor(train) {
  return TRAIN_LIVERIES[train.id] ?? TRAIN_LIVERIES.srt;
}

// 뷰 공용 그라데이션 6종 — 스톱에 리버리 원색 토큰이 그대로 들어가
// "각 뷰 문자열에 같은 토큰이 등장" 계약을 이 한 곳이 보장한다.
function liveryDefs(view, train, variant = "") {
  const L = liveryFor(train);
  const gid = name => `ktx-tm-${view}${variant}-${name}-${train.id}`;
  const defs = `<defs>` +
    linGrad(gid("body"), [
      ["0%", lighten(L.body, 0.4)], ["45%", L.body], ["100%", L.bodyShade]
    ]) +
    linGrad(gid("roof"), [
      ["0%", lighten(L.roof, 0.2)], ["55%", L.roof], ["100%", L.roofDeep]
    ]) +
    linGrad(gid("stripe"), [
      ["0%", lighten(L.stripe, 0.16)], ["60%", L.stripe],
      ["100%", darken(L.stripe, 0.24)]
    ]) +
    linGrad(gid("skirt"), [
      ["0%", lighten(L.skirt, 0.3)], ["55%", L.skirt],
      ["100%", darken(L.skirt, 0.32)]
    ]) +
    linGrad(gid("glass"), [
      ["0%", L.glassHi], ["45%", L.glass], ["100%", darken(L.glass, 0.3)]
    ]) +
    radGrad(gid("shadow"), [
      ["0%", SHADOW, 0.3], ["70%", SHADOW, 0.14], ["100%", SHADOW, 0]
    ]) +
    `</defs>`;
  return { L, gid, defs };
}

function logoText(train, x, y, size, fill, anchor = "middle") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" ` +
    `font-size="${size}" font-weight="900" font-style="italic" ` +
    `fill="${fill}">${train.label}</text>`;
}

// ── 측면 뷰 (씬 3인칭 무대의 원본 — 계약 클래스·좌표는 씬 JS/CSS 의존) ───
// .ktx-window-slot×8(62×52 rx8 유리 + .ktx-window-glow) · .ktx-door×4
// (.ktx-door-leaf-l/-r 폭16 + .ktx-door-warnlamp) · .ktx-wheel×7 ·
// .ktx-panto×1 · .ktx-beam×1 · viewBox 1200×170.
// 실루엣 분기: srt = 둥근 원호 노즈 / ktx = 쐐기 노즈 + 지붕 뒤 핀.

export function trainSideSvg(train, { windows = 8 } = {}) {
  const isSrt = train.id === "srt";
  const { L, gid, defs } = liveryDefs("side", train);
  const carAt = index => 330 + index * 200; // 차체 330~1130, 량 피치 200
  const frame = darken(L.bodyShade, 0.22);  // 창틀·패널 라인 색

  const slots = Array.from({ length: windows }, (unused, index) => {
    const car = Math.floor(index / 2);
    const x = carAt(car) + 7 + (index % 2) * 75;
    return `<g class="ktx-window-slot" data-slot="${index}" transform="translate(${x} 60)">` +
      `<rect width="62" height="52" rx="8" fill="url(#${gid("glass")})" ` +
      `stroke="${frame}" stroke-width="3"/>` +
      `<polygon points="6,52 26,0 40,0 14,52" fill="#ffffff" opacity=".16"/>` +
      `<polygon points="34,52 50,6 56,6 42,52" fill="#ffffff" opacity=".08"/>` +
      `<rect class="ktx-window-glow" width="62" height="52" rx="8" ` +
      `fill="${BEAM}" opacity="0"/>` +
      `</g>`;
  }).join("");

  // 승객문 — 흰 차체의 흰 문짝 + 어두운 컷 라인(열림은 CSS translateX ±14px)
  const doors = Array.from({ length: 4 }, (unused, index) => {
    const x = carAt(index) + 157;
    return `<g class="ktx-door" transform="translate(${x} 58)">` +
      `<rect width="36" height="54" rx="4" fill="${frame}"/>` +
      `<rect x="2" y="4" width="32" height="46" rx="3" fill="${darken(L.skirt, 0.1)}"/>` +
      `<g class="ktx-door-leaf ktx-door-leaf-l">` +
      `<rect x="2" y="4" width="16" height="46" rx="3" fill="${L.bodyShade}"/>` +
      `<rect x="6" y="10" width="8" height="20" rx="2" fill="url(#${gid("glass")})"/>` +
      `<rect x="16.6" y="5" width="1.4" height="44" fill="${DARK}" opacity=".35"/>` +
      `</g>` +
      `<g class="ktx-door-leaf ktx-door-leaf-r">` +
      `<rect x="18" y="4" width="16" height="46" rx="3" fill="${L.bodyShade}"/>` +
      `<rect x="22" y="10" width="8" height="20" rx="2" fill="url(#${gid("glass")})"/>` +
      `<rect x="18" y="5" width="1.4" height="44" fill="${DARK}" opacity=".35"/>` +
      `</g>` +
      `<rect x="0" y="2" width="1.4" height="50" fill="${DARK}" opacity=".4"/>` +
      `<rect x="34.6" y="2" width="1.4" height="50" fill="${DARK}" opacity=".4"/>` +
      `<circle class="ktx-door-warnlamp" cx="18" cy="-5" r="5" fill="${L.tail}" opacity="0"/>` +
      `</g>`;
  }).join("");

  // 차량 연결부 — 주름 관절(자코브스 대차 문법 유지)
  const joints = [530, 730, 930].map(x =>
    `<rect x="${x - 4}" y="62" width="8" height="50" rx="3" fill="${darken(L.skirt, 0.12)}"/>` +
    `<rect x="${x - 6}" y="62" width="12" height="6" rx="3" fill="${lighten(L.skirt, 0.18)}"/>`
  ).join("");

  // 대차 프레임 — 바퀴가 어두운 프레임에 물린다
  const bogieFrames = [[86, 96], [506, 48], [706, 48], [906, 48], [1064, 112]]
    .map(([x, w]) =>
      `<rect x="${x}" y="124" width="${w}" height="15" rx="4" ` +
      `fill="${darken(L.skirt, 0.22)}"/>`
    ).join("");
  const wheels = [110, 158, 530, 730, 930, 1090, 1152].map(cx =>
    `<g transform="translate(${cx} 136)"><g class="ktx-wheel">` +
    `<circle r="14" fill="${DARK}"/><circle r="5" fill="${STEEL}"/>` +
    `<rect x="-12" y="-2" width="24" height="4" rx="2" fill="${STEEL}"/>` +
    `</g></g>`
  ).join("");

  // 루프 장비 — 보라 루프 위 낮은 에어컨 유닛 (판토 386~450 회피)
  const roofGear = [[512, 62], [788, 62], [986, 40]].map(([x, w]) =>
    `<rect x="${x}" y="51" width="${w}" height="7" rx="2.5" fill="${GEAR}"/>` +
    `<rect x="${x + 3}" y="51" width="${w - 6}" height="2" rx="1" ` +
    `fill="${lighten(GEAR, 0.4)}"/>`
  ).join("");

  // ── 노즈 아트 (선두·후미 공용 — 후미는 미러 + 후미등) ──
  const noseHull = isSrt
    ? "M8 128 C8 114 10 102 26 96 C110 74 220 62 332 58 L332 128z"
    : "M4 128 L14 100 C90 78 210 63 332 58 L332 128z";
  // 노즈 하부 흰색 — 루프 보라가 전면 상부를 덮고 이 아래만 흰색으로 남는다
  const noseWhite = isSrt
    ? "M8 128 C8 118 9 108 20 104 C120 106 224 107 332 107 L332 128z"
    : "M4 128 L8 112 C120 109 224 108 332 107 L332 128z";
  const noseSkirt = isSrt
    ? "M8 128 C8 123 9 120 14 118 L332 120 L332 128z"
    : "M4 128 L6 119 L332 120 L332 128z";
  // 전면 유리 — 노즈를 감싸는 어두운 밴드의 측면 단면
  const cabGlass = isSrt
    ? "M190 90 L210 70 L272 66 L272 90z"
    : "M182 92 L212 72 L276 66 L276 92z";
  const cabStreak = isSrt
    ? "M216 90 L234 69 L248 68 L230 90z"
    : "M212 92 L236 70 L250 69 L226 92z";
  // 측면 라인 — 노즈에서 시작해 창 아래를 관통하는 얇은 스트라이프의 노즈 구간
  const noseStripe = isSrt
    ? "M20 104 C120 106 224 107 332 107 L332 113 C224 113 120 111 24 109 C21 108 20 106 20 104z"
    : "M8 112 C120 109 224 108 332 107 L332 113 C224 113 120 113 10 117z";
  const lampX = isSrt ? 22 : 16;
  const noseArt = lampFill =>
    `<path d="${noseHull}" fill="url(#${gid("roof")})"/>` +
    `<path d="${noseWhite}" fill="url(#${gid("body")})"/>` +
    `<path d="${noseSkirt}" fill="url(#${gid("skirt")})"/>` +
    `<path d="${noseStripe}" fill="url(#${gid("stripe")})"/>` +
    `<path d="${cabGlass}" fill="url(#${gid("glass")})"/>` +
    `<path d="${cabStreak}" fill="#ffffff" opacity=".3"/>` +
    // LED 헤드라이트 — 노즈 하부 렌즈 2조(어두운 베젤 안)
    `<rect x="${lampX}" y="106" width="30" height="11" rx="5.5" ` +
    `fill="${darken(L.skirt, 0.2)}"/>` +
    `<circle cx="${lampX + 8}" cy="111.5" r="3.2" fill="${lampFill}"/>` +
    `<circle cx="${lampX + 21}" cy="111.5" r="3.2" fill="${lampFill}"/>`;

  return svgWrap("ktx-side-train-art", "0 0 1200 170", [
    defs,
    // 전조등 빔 — CSS가 밤에 켠다(viewBox 왼쪽 밖 -80까지, overflow visible 전제)
    `<polygon class="ktx-beam" points="12,98 -80,80 -80,146 12,128" fill="${BEAM}" opacity="0"/>`,
    `<ellipse cx="600" cy="152" rx="560" ry="9" fill="url(#${gid("shadow")})"/>`,
    bogieFrames,
    wheels,
    // 선두 노즈 — 보라 전면부 + 흰 하부 + LED
    noseArt(L.lamp),
    // 후미 노즈 — 같은 리버리 미러 + 빨간 후미등
    `<g transform="translate(1200 0) scale(-1 1)">${noseArt(L.tail)}</g>`,
    // 연속 차체 — 흰색 + 금속 스커트
    `<rect x="330" y="58" width="800" height="54" fill="url(#${gid("body")})"/>`,
    `<rect x="330" y="112" width="800" height="16" fill="url(#${gid("skirt")})"/>`,
    // 루프 밴드 — 짙은 보라가 차체 전장을 덮는다 + 패널 분할선
    `<rect x="330" y="58" width="800" height="8" fill="url(#${gid("roof")})"/>`,
    `<rect x="330" y="66" width="800" height="1.2" fill="${darken(L.roofDeep, 0.2)}"/>`,
    `<rect x="330" y="111" width="800" height="1" fill="${frame}" opacity=".7"/>`,
    roofGear,
    joints,
    slots,
    doors,
    // 측면 라인 — 창 아래를 관통해 노즈 스트라이프와 이어진다
    `<rect x="330" y="107" width="800" height="6" fill="url(#${gid("stripe")})"/>`,
    // 로고 — 노즈 보라면(흰 이탤릭) + 차체 중앙 루프 밴드
    logoText(train, isSrt ? 128 : 132, 92, 22, L.body),
    logoText(train, 730, 65.5, 11, L.body),
    isSrt
      ? ""
      : `<path d="M1044 58 L1058 46 L1072 58z" fill="${L.roofDeep}"/>`,
    // 팬터그래프
    `<g class="ktx-panto">` +
    `<rect x="386" y="52" width="64" height="6" rx="3" fill="${GEAR}"/>` +
    `<path d="M398 52 L418 32 L438 52" fill="none" stroke="${DARK}" stroke-width="4"/>` +
    `<rect x="406" y="28" width="44" height="4" rx="2" fill="${DARK}"/></g>`,
    `<rect x="0" y="156" width="1200" height="6" rx="3" fill="${STEEL}"/>`,
    `<rect x="0" y="156" width="1200" height="2" rx="1" fill="${STEEL_LIGHT}"/>`
  ].join(""));
}

// ── 전면/후면 뷰 공용 골격 ────────────────────────────────────────────────
// 루프 보라가 전면 상부를 덮고(윈드실드 밴드 포함), 하부는 흰색 —
// 흰 하부에 로고, 그 아래 LED(전면) 또는 빨간 후미등(후면), 최하단 금속 스커트.

function endFaceSvg(train, view) {
  const isSrt = train.id === "srt";
  const isRear = view === "rear";
  const { L, gid, defs } = liveryDefs(view, train);
  // 실루엣 분기: srt 원호 에그 / ktx 쐐기(어깨가 각지고 지붕 핀)
  const hull = isSrt
    ? "M46 300 L46 150 C46 92 88 44 150 44 C212 44 254 92 254 150 L254 300z"
    : "M42 300 L42 150 C42 100 74 54 150 48 C226 54 258 100 258 150 L258 300z";
  const lower = isSrt
    ? "M46 300 L46 192 C88 180 212 180 254 192 L254 300z"
    : "M42 300 L42 194 C88 182 212 182 258 194 L258 300z";
  const windshield = isSrt
    ? "M78 148 C78 108 108 84 150 84 C192 84 222 108 222 148 C222 162 206 170 150 170 C94 170 78 162 78 148z"
    : "M74 150 C74 108 106 88 150 88 C194 88 226 108 226 150 C226 164 208 172 150 172 C92 172 74 164 74 150z";
  const skirtPath = isSrt
    ? "M46 300 L46 268 C90 258 210 258 254 268 L254 300z"
    : "M42 300 L42 268 C90 258 210 258 258 268 L258 300z";
  const finOrPanto = isSrt
    ? `<path d="M118 44 L150 18 L182 44" fill="none" stroke="${DARK}" stroke-width="5"/>` +
      `<rect x="108" y="14" width="84" height="5" rx="2.5" fill="${DARK}"/>`
    : `<path d="M136 48 L150 22 L164 48z" fill="${L.roofDeep}"/>` +
      `<rect x="112" y="16" width="76" height="5" rx="2.5" fill="${DARK}"/>`;
  // 하부 램프 — 전면은 LED 렌즈 2조, 후면은 빨간 후미등 2조
  const lampCluster = [86, 214].map(cx => {
    const bezel = `<rect x="${cx - 26}" y="228" width="52" height="20" rx="10" ` +
      `fill="${darken(L.skirt, 0.2)}"/>`;
    if (isRear) {
      return bezel +
        `<circle class="ktx-taillamp" cx="${cx - 10}" cy="238" r="7" ` +
        `fill="${L.tail}" opacity=".5"/>` +
        `<circle class="ktx-taillamp" cx="${cx + 10}" cy="238" r="7" ` +
        `fill="${L.tail}" opacity=".5"/>`;
    }
    return bezel +
      `<circle cx="${cx - 10}" cy="238" r="6" fill="${L.lamp}"/>` +
      `<circle cx="${cx + 10}" cy="238" r="6" fill="${L.lamp}"/>` +
      `<circle cx="${cx - 12}" cy="236" r="2" fill="#ffffff" opacity=".8"/>` +
      `<circle cx="${cx + 8}" cy="236" r="2" fill="#ffffff" opacity=".8"/>`;
  }).join("");
  return svgWrap(`ktx-${view}-train-art`, "0 0 300 340", [
    defs,
    `<ellipse cx="150" cy="316" rx="130" ry="10" fill="url(#${gid("shadow")})"/>`,
    `<rect x="24" y="308" width="252" height="6" rx="3" fill="${STEEL}"/>`,
    finOrPanto,
    // 전면부 전체 — 루프 보라가 노즈 위로 흘러내려 덮는다
    `<path d="${hull}" fill="url(#${gid("roof")})"/>`,
    // 노즈 하부 흰색
    `<path d="${lower}" fill="url(#${gid("body")})"/>`,
    // 측면 라인이 노즈를 감아 도는 흔적 — 좌우 가장자리 스트라이프
    `<path d="M${isSrt ? 46 : 42} 206 C70 200 88 197 108 196 L108 203 C88 204 70 208 ${isSrt ? 46 : 42} 214z" fill="url(#${gid("stripe")})"/>`,
    `<path d="M${isSrt ? 254 : 258} 206 C230 200 212 197 192 196 L192 203 C212 204 230 208 ${isSrt ? 254 : 258} 214z" fill="url(#${gid("stripe")})"/>`,
    // 넓고 어두운 전면 유리 밴드 + 사선 반사
    `<path d="${windshield}" fill="url(#${gid("glass")})"/>`,
    `<path d="M108 160 L138 92 L156 92 L126 162z" fill="#ffffff" opacity=".2"/>`,
    // 로고 — 흰 하부 중앙
    logoText(train, 150, 222, 26, L.roof),
    lampCluster,
    // 금속 스커트 + 연결기 커버
    `<path d="${skirtPath}" fill="url(#${gid("skirt")})"/>`,
    `<path d="M128 300 L128 278 Q150 270 172 278 L172 300z" fill="${darken(L.skirt, 0.3)}"/>`
  ].join(""));
}

export function trainFrontSvg(train) {
  return endFaceSvg(train, "front");
}

// 후면 — 같은 리버리 + .ktx-taillamp 빨간 후미등 2조(기본 opacity .5)
export function trainRearSvg(train) {
  return endFaceSvg(train, "rear");
}

// ── 3/4 뷰 — 노즈 정면 3/4 + 오른쪽으로 원근 축소되는 차체 ────────────────

export function trainQuarterSvg(train, { facing = "front", side = "left" } = {}) {
  const isSrt = train.id === "srt";
  const { L, gid, defs } = liveryDefs("quarter", train, `-${facing}-${side}`);
  const frame = darken(L.bodyShade, 0.22);
  const lampFill = facing === "front" ? L.lamp : L.tail;
  const topY = x => 70 + (x - 250) * 0.082;   // 지붕 모서리(원근 수렴)
  const botY = x => 300 - (x - 250) * 0.0984; // 하단 모서리

  // 원근 축소 창문 8개 — 측면 4량 문법과 같은 량당 2창
  const wins = [];
  let wx = 302;
  let ww = 50;
  for (let index = 0; index < 8; index += 1) {
    const t = (wx - 250) / 610;
    const y = topY(wx) + 32 - 4 * t;
    const h = 42 - 14 * t;
    wins.push(
      `<rect x="${wx.toFixed(0)}" y="${y.toFixed(1)}" width="${ww.toFixed(1)}" ` +
      `height="${h.toFixed(1)}" rx="7" fill="url(#${gid("glass")})" ` +
      `stroke="${frame}" stroke-width="2"/>`
    );
    wx += ww + 22 - 14 * t;
    ww *= 0.92;
  }

  // 차량 연결부 3곳 — 원근 간격
  const joints = [480, 642, 776].map(x =>
    `<rect x="${x}" y="${topY(x).toFixed(1)}" width="5" ` +
    `height="${(botY(x) - topY(x)).toFixed(1)}" fill="${darken(L.skirt, 0.12)}" opacity=".6"/>`
  ).join("");

  // 대차·바퀴 — 하단 모서리를 따라 줄어든다
  const wheels = [318, 372, 560, 700, 820].map(x => {
    const t = (x - 250) / 610;
    const r = 13 - 6 * t;
    return `<circle cx="${x}" cy="${(botY(x) + 2).toFixed(1)}" r="${r.toFixed(1)}" ` +
      `fill="${DARK}"/>` +
      `<circle cx="${x}" cy="${(botY(x) + 2).toFixed(1)}" r="${(r * 0.35).toFixed(1)}" ` +
      `fill="${STEEL}"/>`;
  }).join("");

  // 노즈 3/4 — 실루엣 분기(srt 원호 / ktx 쐐기)
  const noseHull = isSrt
    ? "M70 292 C64 236 74 176 118 138 C160 106 210 82 250 70 L250 300z"
    : "M64 292 L76 200 C98 150 160 100 250 70 L250 300z";
  const noseWhite = isSrt
    ? "M70 292 C66 250 70 216 86 192 C130 208 190 218 250 220 L250 300z"
    : "M64 292 L74 210 C130 222 190 226 250 226 L250 300z";
  const windshield = isSrt
    ? "M126 118 C168 92 210 80 246 76 L246 128 C210 130 172 140 144 158 C132 146 126 132 126 118z"
    : "M128 122 C170 96 212 84 246 80 L246 130 C212 132 176 142 148 160 C136 148 130 134 128 122z";
  const noseStripe = isSrt
    ? "M250 228 C190 228 140 222 100 210 L97 218 C140 230 190 236 250 236z"
    : "M250 232 C190 232 140 228 96 218 L94 226 C140 236 190 240 250 240z";
  const noseSkirt = isSrt
    ? "M70 292 C70 276 72 262 78 252 C140 264 196 269 250 270 L250 300z"
    : "M64 292 L68 254 C140 266 196 270 250 271 L250 300z";
  const lampArt =
    `<rect x="96" y="236" width="40" height="15" rx="7.5" fill="${darken(L.skirt, 0.2)}"/>` +
    `<circle cx="108" cy="243.5" r="4.4" fill="${lampFill}"/>` +
    `<circle cx="124" cy="243.5" r="4.4" fill="${lampFill}"/>`;

  const art = [
    `<ellipse cx="430" cy="330" rx="400" ry="12" fill="url(#${gid("shadow")})"/>`,
    wheels,
    // 원근 차체 — 흰 몸통 + 루프 밴드 + 스커트 + 스트라이프
    `<path d="M250 70 L860 120 L860 240 L250 300z" fill="url(#${gid("body")})"/>`,
    `<path d="M250 70 L860 120 L860 138 L250 96z" fill="url(#${gid("roof")})"/>`,
    `<path d="M250 276 L860 228 L860 240 L250 300z" fill="url(#${gid("skirt")})"/>`,
    `<path d="M250 228 L860 208 L860 214 L250 236z" fill="url(#${gid("stripe")})"/>`,
    joints,
    wins.join(""),
    // 노즈 — 루프 보라 전면부 + 흰 하부 + 유리 밴드 + LED/후미등
    `<path d="${noseHull}" fill="url(#${gid("roof")})"/>`,
    `<path d="${noseWhite}" fill="url(#${gid("body")})"/>`,
    `<path d="${noseSkirt}" fill="url(#${gid("skirt")})"/>`,
    `<path d="${noseStripe}" fill="url(#${gid("stripe")})"/>`,
    `<path d="${windshield}" fill="url(#${gid("glass")})"/>`,
    `<path d="M146 140 L190 96 L204 94 L160 142z" fill="#ffffff" opacity=".2"/>`,
    lampArt
  ].join("");

  const body = side === "left"
    ? art
    : `<g transform="translate(900 0) scale(-1 1)">${art}</g>`;
  // 로고는 미러 그룹 밖 — 글자가 뒤집히지 않는다. 노즈 흰 하부 위 리버리색.
  const logoX = side === "left" ? 178 : 722;
  return svgWrap("ktx-quarter-train-art", "0 0 900 360",
    defs + body + logoText(train, logoX, 262, 20, L.roof));
}

// ── 위에서 본 지붕 뷰 — 보라 루프·팬터그래프·에어컨, 측면과 같은 4량 분절 ──

export function trainTopSvg(train) {
  const isSrt = train.id === "srt";
  const { L, gid, defs } = liveryDefs("top", train);
  // 노즈 테이퍼 — 위에서도 루프 보라가 노즈를 덮는다
  const nose = isSrt
    ? "M120 12 C168 12 196 46 204 98 L204 150 L36 150 L36 98 C44 46 72 12 120 12z"
    : "M120 10 L186 66 L204 118 L204 150 L36 150 L36 118 L54 66z";
  const cars = [[150, 330], [338, 518], [526, 706], [714, 888]];
  const carArt = cars.map(([y1, y2], index) => {
    const mid = (y1 + y2) / 2;
    const ac =
      `<rect x="70" y="${mid - 36}" width="100" height="24" rx="8" fill="${GEAR}"/>` +
      `<rect x="76" y="${mid - 32}" width="88" height="5" rx="2.5" fill="${lighten(GEAR, 0.4)}"/>` +
      `<rect x="88" y="${mid + 22}" width="64" height="16" rx="6" fill="${GEAR}"/>`;
    // 팬터그래프는 1호차 지붕 — 베이스 레일 + X 암 + 접촉봉
    const panto = index === 0
      ? `<g>` +
        `<rect x="62" y="${mid + 44}" width="10" height="52" rx="4" fill="${GEAR}"/>` +
        `<rect x="168" y="${mid + 44}" width="10" height="52" rx="4" fill="${GEAR}"/>` +
        `<path d="M66 ${mid + 48} L174 ${mid + 92} M174 ${mid + 48} L66 ${mid + 92}" ` +
        `stroke="${DARK}" stroke-width="5" fill="none"/>` +
        `<rect x="46" y="${mid + 66}" width="148" height="7" rx="3.5" fill="${DARK}"/>` +
        `</g>`
      : "";
    return `<rect x="26" y="${y1}" width="188" height="${y2 - y1}" rx="16" ` +
      `fill="url(#${gid("body")})"/>` +
      `<rect x="48" y="${y1 + 6}" width="144" height="${y2 - y1 - 12}" rx="12" ` +
      `fill="url(#${gid("roof")})"/>` +
      ac + panto;
  }).join("");
  // 량 사이 연결부 주름
  const bellows = cars.slice(0, -1).map(([, y2]) =>
    `<rect x="44" y="${y2 + 1}" width="152" height="6" rx="3" fill="${darken(L.skirt, 0.12)}"/>`
  ).join("");
  return svgWrap("ktx-top-train-art", "0 0 240 900", [
    defs,
    `<ellipse cx="120" cy="450" rx="104" ry="436" fill="url(#${gid("shadow")})"/>`,
    // 노즈 — 보라 테이퍼 + 위에서 보이는 전면 유리 밴드 + 흰 팁 하이라이트
    `<path d="${nose}" fill="url(#${gid("roof")})"/>`,
    `<rect x="62" y="58" width="116" height="30" rx="14" fill="url(#${gid("glass")})"/>`,
    `<path d="M120 ${isSrt ? 12 : 10} ${isSrt ? "C150 12 168 24 180 40" : "L160 44"}" ` +
    `fill="none" stroke="${L.body}" stroke-width="4" opacity=".7"/>`,
    carArt,
    bellows
  ].join(""));
}
