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
  const bogieDeep = darken(L.skirt, 0.28);  // 대차 프레임 암부

  // 측면 전용 defs — 렌즈·휠 디스크·하부기기 금속
  const extraDefs = `<defs>` +
    radGrad(gid("lens"), [
      ["0%", "#ffffff"], ["35%", L.lamp], ["100%", darken(L.lamp, 0.45)]
    ]) +
    radGrad(gid("wheeldisc"), [
      ["0%", lighten(STEEL, 0.35)], ["60%", STEEL], ["100%", darken(STEEL, 0.4)]
    ]) +
    linGrad(gid("underbox"), [
      ["0%", lighten(L.skirt, 0.12)], ["50%", darken(L.skirt, 0.1)],
      ["100%", darken(L.skirt, 0.34)]
    ]) +
    linGrad(gid("acunit"), [
      ["0%", lighten(GEAR, 0.35)], ["55%", GEAR], ["100%", darken(GEAR, 0.28)]
    ]) +
    `</defs>`;

  const slots = Array.from({ length: windows }, (unused, index) => {
    const car = Math.floor(index / 2);
    const x = carAt(car) + 7 + (index % 2) * 75;
    // 알루미늄 프레임(외곽) + 고무 실(내곽) 안에 62×52 유리 — 계약 치수 유지
    return `<g class="ktx-window-slot" data-slot="${index}" transform="translate(${x} 60)">` +
      `<rect x="-3" y="-3" width="68" height="58" rx="10" fill="${frame}"/>` +
      `<rect x="-1" y="-1" width="64" height="54" rx="9" fill="${darken(L.glass, 0.35)}"/>` +
      `<rect width="62" height="52" rx="8" fill="url(#${gid("glass")})"/>` +
      `<rect x="2" y="2" width="58" height="14" rx="6" fill="${L.glassHi}" opacity=".5"/>` +
      `<polygon points="6,52 26,0 40,0 14,52" fill="#ffffff" opacity=".16"/>` +
      `<polygon points="34,52 50,6 56,6 42,52" fill="#ffffff" opacity=".08"/>` +
      `<rect class="ktx-window-glow" width="62" height="52" rx="8" ` +
      `fill="${BEAM}" opacity="0"/>` +
      `</g>`;
  }).join("");

  // 승객문 — 포켓 리세스 + 문짝 패널 + 상부 가이드 레일 + 하부 스텝
  // (열림은 CSS translateX ±14px — 계약: 문짝 16×46, warnlamp)
  const doors = Array.from({ length: 4 }, (unused, index) => {
    const x = carAt(index) + 157;
    return `<g class="ktx-door" transform="translate(${x} 58)">` +
      `<rect x="-2" y="-1" width="40" height="56" rx="5" fill="${frame}"/>` +
      `<rect width="36" height="54" rx="4" fill="${darken(L.skirt, 0.24)}"/>` +
      `<rect x="2" y="4" width="32" height="46" rx="3" fill="${darken(L.skirt, 0.1)}"/>` +
      `<g class="ktx-door-leaf ktx-door-leaf-l">` +
      `<rect x="2" y="4" width="16" height="46" rx="3" fill="${L.bodyShade}"/>` +
      `<rect x="3" y="5" width="14" height="3" rx="1.5" fill="#ffffff" opacity=".4"/>` +
      `<rect x="5.5" y="10" width="9" height="24" rx="3" fill="url(#${gid("glass")})"/>` +
      `<rect x="6.5" y="11" width="3" height="22" fill="#ffffff" opacity=".18"/>` +
      `<rect x="4" y="40" width="12" height="6" rx="1.5" fill="${darken(L.bodyShade, 0.12)}"/>` +
      `<rect x="16.6" y="5" width="1.4" height="44" fill="${DARK}" opacity=".35"/>` +
      `</g>` +
      `<g class="ktx-door-leaf ktx-door-leaf-r">` +
      `<rect x="18" y="4" width="16" height="46" rx="3" fill="${L.bodyShade}"/>` +
      `<rect x="19" y="5" width="14" height="3" rx="1.5" fill="#ffffff" opacity=".4"/>` +
      `<rect x="21.5" y="10" width="9" height="24" rx="3" fill="url(#${gid("glass")})"/>` +
      `<rect x="22.5" y="11" width="3" height="22" fill="#ffffff" opacity=".18"/>` +
      `<rect x="20" y="40" width="12" height="6" rx="1.5" fill="${darken(L.bodyShade, 0.12)}"/>` +
      `<rect x="18" y="5" width="1.4" height="44" fill="${DARK}" opacity=".35"/>` +
      `</g>` +
      `<rect x="0" y="2" width="1.4" height="50" fill="${DARK}" opacity=".4"/>` +
      `<rect x="34.6" y="2" width="1.4" height="50" fill="${DARK}" opacity=".4"/>` +
      `<rect x="2" y="0" width="32" height="2" rx="1" fill="${frame}"/>` +
      `<circle cx="33" cy="27" r="1.6" fill="${lighten(L.stripe, 0.2)}"/>` +
      `<circle class="ktx-door-warnlamp" cx="18" cy="-5" r="5" fill="${L.tail}" opacity="0"/>` +
      `</g>`;
  }).join("");

  // 차량 연결부 — 다중 주름 자바라 + 상부 커버(움직임은 CSS .ktx-gangway)
  const joints = [530, 730, 930].map(x =>
    `<g class="ktx-gangway">` +
    `<rect x="${x - 7}" y="60" width="14" height="52" rx="2" fill="${darken(L.skirt, 0.3)}"/>` +
    [-5, -1.5, 2, 5.5].map(dx =>
      `<rect x="${x + dx - 0.7}" y="61" width="1.4" height="50" fill="${lighten(L.skirt, 0.16)}" opacity=".55"/>`
    ).join("") +
    `<rect x="${x - 8}" y="59" width="16" height="5" rx="2.5" fill="${lighten(L.skirt, 0.2)}"/>` +
    `<rect x="${x - 8}" y="108" width="16" height="4" rx="2" fill="${bogieDeep}"/>` +
    `</g>`
  ).join("");

  // 하부 기기함 — 대차 사이 변압기·제동장치 박스(통풍 슬릿 포함)
  const underboxes = [[214, 100], [396, 92], [598, 84], [788, 92], [978, 66]]
    .map(([x, w]) =>
      `<rect x="${x}" y="127" width="${w}" height="17" rx="3" fill="url(#${gid("underbox")})"/>` +
      `<rect x="${x + 5}" y="131" width="${w - 10}" height="1.6" fill="${DARK}" opacity=".5"/>` +
      `<rect x="${x + 5}" y="136" width="${w - 10}" height="1.6" fill="${DARK}" opacity=".5"/>` +
      `<rect x="${x}" y="127" width="${w}" height="2" rx="1" fill="${lighten(L.skirt, 0.24)}" opacity=".7"/>`
    ).join("");

  // 대차 어셈블리 — 프레임 + 액슬박스 + 코일스프링 + 브레이크 실린더
  const bogieAt = (x, w, axles) => {
    const springs = axles.map(cx =>
      `<rect x="${cx - 10}" y="120" width="8" height="9" rx="1.5" fill="${STEEL}"/>` +
      `<rect x="${cx + 2}" y="120" width="8" height="9" rx="1.5" fill="${STEEL}"/>` +
      [122, 124.5, 127].map(y =>
        `<rect x="${cx - 10}" y="${y}" width="8" height="1" fill="${DARK}" opacity=".6"/>` +
        `<rect x="${cx + 2}" y="${y}" width="8" height="1" fill="${DARK}" opacity=".6"/>`
      ).join("") +
      `<rect x="${cx - 7}" y="128" width="14" height="11" rx="3" fill="${bogieDeep}"/>` +
      `<rect x="${cx - 4}" y="131" width="8" height="5" rx="2" fill="${STEEL}"/>`
    ).join("");
    return `<rect x="${x}" y="118" width="${w}" height="12" rx="5" fill="${darken(L.skirt, 0.2)}"/>` +
      `<rect x="${x}" y="118" width="${w}" height="3" rx="1.5" fill="${lighten(L.skirt, 0.14)}" opacity=".6"/>` +
      `<rect x="${x + 6}" y="126" width="${w - 12}" height="8" rx="3" fill="${bogieDeep}"/>` +
      springs;
  };
  const bogies =
    bogieAt(84, 100, [110, 158]) +
    bogieAt(504, 52, [530]) +
    bogieAt(704, 52, [730]) +
    bogieAt(904, 52, [930]) +
    bogieAt(1062, 116, [1090, 1152]);

  // 바퀴 — 타이어 + 디스크 + 볼트 3점(회전 단서) + 허브
  const wheels = [110, 158, 530, 730, 930, 1090, 1152].map(cx =>
    `<g transform="translate(${cx} 136)"><g class="ktx-wheel">` +
    `<circle r="14" fill="${DARK}"/>` +
    `<circle r="10.5" fill="url(#${gid("wheeldisc")})"/>` +
    `<circle r="14" fill="none" stroke="${lighten(STEEL, 0.2)}" stroke-width="1" opacity=".45"/>` +
    [0, 120, 240].map(deg => {
      const rad = (deg * Math.PI) / 180;
      return `<circle cx="${(6.4 * Math.sin(rad)).toFixed(1)}" ` +
        `cy="${(-6.4 * Math.cos(rad)).toFixed(1)}" r="1.5" fill="${DARK}"/>`;
    }).join("") +
    `<circle r="3.4" fill="${STEEL}"/>` +
    `<circle r="1.4" fill="${DARK}"/>` +
    `</g></g>`
  ).join("");

  // 루프 장비 — 에어컨 유닛(그릴 슬릿) + 배관 라인 (판토 380~460 회피)
  const roofGear = [[500, 70], [788, 70], [986, 46]].map(([x, w]) =>
    `<rect x="${x}" y="50" width="${w}" height="8" rx="3" fill="url(#${gid("acunit")})"/>` +
    [0.22, 0.42, 0.62, 0.82].map(t =>
      `<rect x="${(x + w * t).toFixed(0)}" y="51.5" width="2" height="5" rx="1" ` +
      `fill="${darken(GEAR, 0.4)}" opacity=".8"/>`
    ).join("") +
    `<rect x="${x}" y="50" width="${w}" height="2" rx="1" fill="${lighten(GEAR, 0.45)}"/>`
  ).join("");

  // ── 노즈 아트 v2 — 낮고 뾰족한 유선형 + 루프 캡 테이퍼 + LED 클러스터 ──
  // 흰 차체 위로 보라 루프 캡이 노즈 상면을 따라 흘러내려 팁에서 수렴한다.
  const noseHull = isSrt
    ? "M7 128 C6 120 8 113 17 109 C46 94 106 78 186 68 C238 62 286 59 332 58 L332 128z"
    : "M5 128 L7 116 C10 110 18 105 30 101 C90 84 190 66 332 58 L332 128z";
  // 루프 캡 — x=44/50에서 끝나고, 팁까지는 핀스트라이프(capTip)로만 이어진다
  const roofCap = isSrt
    ? "M44 94 C82 85 140 76 200 69 C246 64 290 60 332 58 L332 70 C290 71 246 74 202 79 C146 85 98 93 60 101 C54 99 48 96.5 44 94z"
    : "M50 92 C100 80 180 68 260 62 C286 60 310 59 332 58 L332 70 C240 74 150 84 66 100 C60 97 54 94.5 50 92z";
  const capTip = isSrt
    ? "M45 95 C33 100 21 106 13 112"
    : "M51 93 C37 99 23 106 13 113";
  // 전면 유리 — 상단 모서리가 루프 캡 안쪽 라인에 밀착(유리와 루프가 한 밴드)
  const windshield = isSrt
    ? "M198 80 C232 74 262 71.5 290 70.5 L290 85 C262 86 234 88 208 91 C203 87 199 84 198 80z"
    : "M192 82 C228 74 262 70.5 290 69.5 L290 84 C262 85 232 88 202 92 C197 88 193 85 192 82z";
  const windStreak = isSrt
    ? "M226 88 L240 73 L252 72 L236 87z"
    : "M222 89 L238 72 L250 71 L232 88z";
  // 스트라이프 — 팁 하부에서 시작해 벨트라인(y111.5)으로 스윕
  const noseStripe = isSrt
    ? "M26 113 C76 108 170 106.5 332 106.5 L332 112 C172 112 96 113 36 117.5 C31 116 28 114.5 26 113z"
    : "M18 116 C78 107.5 174 105.5 332 106.5 L332 112 C174 111 98 113.5 24 119.5z"
  ;
  const noseSkirt = isSrt
    ? "M7 128 C7 124 8.5 119 14 116 L22 114 C16.5 119 14 123 13.5 128z"
    : "M5 128 L6.5 118 L20 114 C14.5 119 12 123 11 128z";
  const lampX = isSrt ? 26 : 20;
  const noseArt = (lampFill, isLampLens) =>
    `<path d="${noseHull}" fill="url(#${gid("body")})"/>` +
    `<path d="${roofCap}" fill="url(#${gid("roof")})"/>` +
    `<path d="${capTip}" fill="none" stroke="${L.roofDeep}" stroke-width="2.6" ` +
    `stroke-linecap="round"/>` +
    // 루프 캡 하단 하이라이트 — 곡면 경계의 빛
    `<path d="M60 101 C98 93 146 85 202 79 C246 74 290 71 332 70" ` +
    `fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".35"/>` +
    `<path d="${noseStripe}" fill="url(#${gid("stripe")})"/>` +
    `<path d="${noseSkirt}" fill="url(#${gid("skirt")})"/>` +
    // 배장기 슬랫
    `<path d="M10 120 L22 116 M9.5 124 L17 121" stroke="${darken(L.skirt, 0.3)}" ` +
    `stroke-width="1.4" fill="none" opacity=".7"/>` +
    // 전면 유리 밴드 + 사선 반사 (루프 캡과 한 몸처럼 이어진다)
    `<path d="${windshield}" fill="url(#${gid("glass")})"/>` +
    `<path d="${windshield}" fill="none" stroke="${darken(L.glass, 0.4)}" stroke-width="1.4"/>` +
    `<path d="${windStreak}" fill="#ffffff" opacity=".28"/>` +
    // 운전실 옆문 — 세로 컷 라인 + 손잡이 + 소창
    `<rect x="296" y="74" width="13" height="22" rx="4" fill="url(#${gid("glass")})" ` +
    `stroke="${frame}" stroke-width="1.4"/>` +
    `<path d="M290 64 L290 104 M314 63 L314 104" stroke="${frame}" ` +
    `stroke-width="1.1" fill="none" opacity=".55"/>` +
    `<rect x="299" y="100" width="7" height="2" rx="1" fill="${frame}"/>` +
    // 사이드 루버 그릴
    [86, 90.5, 95].map(y =>
      `<rect x="252" y="${y}" width="22" height="2" rx="1" fill="${frame}" opacity=".5"/>`
    ).join("") +
    // 커플러 해치 심 — 팁 주변 원호
    `<path d="M13 114 C21 110.5 31 108.5 42 107.5" fill="none" ` +
    `stroke="${frame}" stroke-width="1" opacity=".55"/>` +
    // LED 헤드라이트 클러스터 — 베젤 + 렌즈 2조 + 스페큘러
    `<rect x="${lampX}" y="99" width="34" height="13" rx="6.5" ` +
    `fill="${darken(L.skirt, 0.24)}"/>` +
    `<rect x="${lampX + 1.5}" y="100.5" width="31" height="10" rx="5" ` +
    `fill="${darken(L.skirt, 0.05)}"/>` +
    `<circle cx="${lampX + 9}" cy="105.5" r="4" fill="${isLampLens ? `url(#${gid("lens")})` : lampFill}"/>` +
    `<circle cx="${lampX + 24}" cy="105.5" r="4" fill="${isLampLens ? `url(#${gid("lens")})` : lampFill}"/>` +
    `<circle cx="${lampX + 7.6}" cy="104" r="1.1" fill="#ffffff" opacity=".85"/>` +
    `<circle cx="${lampX + 22.6}" cy="104" r="1.1" fill="#ffffff" opacity=".85"/>`;

  // 차체 패널 심 — 량 중앙 세로 라인
  const panelSeams = [430, 630, 830, 1030].map(x =>
    `<rect x="${x}" y="72" width="1" height="38" fill="${frame}" opacity=".3"/>`
  ).join("");

  return svgWrap("ktx-side-train-art", "0 0 1200 170", [
    defs,
    extraDefs,
    // 전조등 빔 — CSS가 밤에 켠다(viewBox 왼쪽 밖 -80까지, overflow visible 전제)
    `<polygon class="ktx-beam" points="12,100 -80,82 -80,148 12,130" fill="${BEAM}" opacity="0"/>`,
    // 접지 그림자 — 전체 확산 + 대차 아래 진한 코어
    `<ellipse cx="600" cy="152" rx="560" ry="9" fill="url(#${gid("shadow")})"/>`,
    [134, 530, 730, 930, 1121].map(cx =>
      `<ellipse cx="${cx}" cy="151" rx="72" ry="5.5" fill="${SHADOW}" opacity=".22"/>`
    ).join(""),
    underboxes,
    bogies,
    wheels,
    // 선두 노즈 — 흰 유선형 + 보라 루프 캡 + LED 렌즈
    noseArt(L.lamp, true),
    // 후미 노즈 — 같은 리버리 미러 + 빨간 후미등
    `<g transform="translate(1200 0) scale(-1 1)">${noseArt(L.tail, false)}</g>`,
    // 연속 차체 — 흰색 + 금속 스커트
    `<rect x="330" y="58" width="800" height="54" fill="url(#${gid("body")})"/>`,
    `<rect x="330" y="112" width="800" height="16" fill="url(#${gid("skirt")})"/>`,
    `<rect x="330" y="112" width="800" height="2" fill="${lighten(L.skirt, 0.28)}" opacity=".7"/>`,
    // 루프 밴드 — 짙은 보라 + 상단 광, 하단 분리선
    `<rect x="330" y="58" width="800" height="12" fill="url(#${gid("roof")})"/>`,
    `<rect x="330" y="58" width="800" height="1.6" fill="${lighten(L.roof, 0.4)}" opacity=".8"/>`,
    `<rect x="330" y="70" width="800" height="1.2" fill="${darken(L.roofDeep, 0.2)}"/>`,
    // 차체 상부 사광 — 금속 반사
    `<rect x="330" y="71" width="800" height="3" fill="#ffffff" opacity=".4"/>`,
    `<rect x="330" y="74" width="800" height="14" fill="#ffffff" opacity=".08"/>`,
    panelSeams,
    roofGear,
    joints,
    slots,
    doors,
    // 벨트라인 스트라이프 — 창 아래 스커트 경계를 관통해 노즈 스윕과 이어진다
    `<rect x="330" y="106.5" width="800" height="5.5" fill="url(#${gid("stripe")})"/>`,
    // 로고 — 노즈 흰 측면(리버리색 이탤릭) + 차체 중앙 루프 밴드
    logoText(train, 150, 100, 21, L.roof),
    logoText(train, 730, 67.5, 11, L.body),
    isSrt
      ? ""
      : `<path d="M1044 58 L1058 46 L1072 58z" fill="${L.roofDeep}"/>`,
    // 팬터그래프 v2 — 싱글암: 베이스 절연애자 + 하부암 + 상부암 + 팬헤드(혼)
    `<g class="ktx-panto">` +
    `<rect x="384" y="53" width="68" height="5" rx="2.5" fill="${GEAR}"/>` +
    [392, 416, 440].map(x =>
      `<rect x="${x}" y="49" width="6" height="5" rx="2" fill="${darken(GEAR, 0.3)}"/>`
    ).join("") +
    `<path d="M400 50 L424 34" stroke="${DARK}" stroke-width="3.6" fill="none" stroke-linecap="round"/>` +
    `<path d="M424 34 L446 29" stroke="${DARK}" stroke-width="3" fill="none" stroke-linecap="round"/>` +
    `<path d="M404 50 L428 38" stroke="${STEEL}" stroke-width="1.6" fill="none" opacity=".8"/>` +
    `<circle cx="424" cy="34" r="2.4" fill="${STEEL}"/>` +
    `<rect x="428" y="26.5" width="36" height="3.6" rx="1.8" fill="${DARK}"/>` +
    `<path d="M428 28 Q424 30 423 33 M464 28 Q468 30 469 33" stroke="${DARK}" ` +
    `stroke-width="2" fill="none"/>` +
    `</g>`,
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
  const extraDefs = `<defs>` +
    radGrad(gid("lens"), [
      ["0%", "#ffffff"], ["35%", L.lamp], ["100%", darken(L.lamp, 0.45)]
    ]) +
    `</defs>`;
  // 실루엣 — 어깨가 있는 와이드 트라페조이드(시안 FRONT), ktx는 살짝 쐐기
  const hull = isSrt
    ? "M40 300 L40 168 C40 114 62 74 98 56 C120 45 180 45 202 56 C238 74 260 114 260 168 L260 300z"
    : "M36 300 L36 170 C36 116 64 74 100 55 C124 43 176 43 200 55 C240 76 264 118 264 170 L264 300z";
  // 루프 캡 — 상부 전체를 덮고 윈드실드 둘레로 흘러내린다
  const roofCapFace = isSrt
    ? "M40 168 C40 114 62 74 98 56 C120 45 180 45 202 56 C238 74 260 114 260 168 L260 184 C208 174 92 174 40 184z"
    : "M36 170 C36 116 64 74 100 55 C124 43 176 43 200 55 C240 76 264 118 264 170 L264 186 C206 176 94 176 36 186z";
  // 대형 윈드실드 — 라운드 트라페조이드, 루프 캡 안에 안긴다
  const windshield = isSrt
    ? "M72 92 C88 66 212 66 228 92 C236 106 238 134 234 152 C230 166 198 172 150 172 C102 172 70 166 66 152 C62 134 64 106 72 92z"
    : "M70 94 C88 64 212 64 230 94 C238 108 240 136 236 154 C232 168 200 174 150 174 C100 174 68 168 64 154 C60 136 62 108 70 94z";
  const skirtPath = isSrt
    ? "M40 300 L40 272 C92 262 208 262 260 272 L260 300z"
    : "M36 300 L36 272 C90 262 210 262 264 272 L264 300z";
  const finOrPanto = isSrt
    ? `<rect x="126" y="38" width="10" height="8" rx="2" fill="${darken(GEAR, 0.25)}"/>` +
      `<rect x="164" y="38" width="10" height="8" rx="2" fill="${darken(GEAR, 0.25)}"/>` +
      `<path d="M118 42 L150 16 L182 42" fill="none" stroke="${DARK}" stroke-width="5"/>` +
      `<rect x="106" y="12" width="88" height="5" rx="2.5" fill="${DARK}"/>`
    : `<path d="M136 46 L150 20 L164 46z" fill="${L.roofDeep}"/>` +
      `<rect x="112" y="14" width="76" height="5" rx="2.5" fill="${DARK}"/>`;
  // LED 클러스터 — 다크 베젤 + 렌즈 2조(+LED 스트립) / 후면은 빨간 후미등
  const lampCluster = [90, 210].map(cx => {
    const bezel =
      `<rect x="${cx - 34}" y="234" width="68" height="26" rx="13" ` +
      `fill="${darken(L.skirt, 0.26)}"/>` +
      `<rect x="${cx - 31.5}" y="236.5" width="63" height="21" rx="10.5" ` +
      `fill="${darken(L.skirt, 0.08)}"/>`;
    if (isRear) {
      return bezel +
        `<circle class="ktx-taillamp" cx="${cx - 13}" cy="247" r="7" ` +
        `fill="${L.tail}" opacity=".5"/>` +
        `<circle class="ktx-taillamp" cx="${cx + 13}" cy="247" r="7" ` +
        `fill="${L.tail}" opacity=".5"/>`;
    }
    return bezel +
      `<circle cx="${cx - 14}" cy="245" r="7" fill="url(#${gid("lens")})"/>` +
      `<circle cx="${cx + 14}" cy="245" r="7" fill="url(#${gid("lens")})"/>` +
      `<circle cx="${cx - 16.5}" cy="242.5" r="2" fill="#ffffff" opacity=".85"/>` +
      `<circle cx="${cx + 11.5}" cy="242.5" r="2" fill="#ffffff" opacity=".85"/>` +
      `<rect x="${cx - 22}" y="254" width="44" height="2.6" rx="1.3" ` +
      `fill="${L.lamp}" opacity=".9"/>`;
  }).join("");
  // 와이퍼 — 전면 유리 하단에서 사선 파킹(전면 전용)
  const wipers = isRear ? "" : `<g>` +
    `<path d="M112 170 L86 134" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M80 140 L96 122" stroke="${DARK}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M178 172 L152 136" stroke="${DARK}" stroke-width="4" stroke-linecap="round"/>` +
    `<path d="M146 142 L162 124" stroke="${DARK}" stroke-width="5" stroke-linecap="round"/>` +
    `</g>`;
  const edgeL = isSrt ? 40 : 36;
  const edgeR = isSrt ? 260 : 264;
  return svgWrap(`ktx-${view}-train-art`, "0 0 300 340", [
    defs,
    extraDefs,
    `<ellipse cx="150" cy="316" rx="130" ry="10" fill="url(#${gid("shadow")})"/>`,
    `<rect x="24" y="308" width="252" height="6" rx="3" fill="${STEEL}"/>`,
    finOrPanto,
    // 차체 — 흰 하부 + 루프 캡
    `<path d="${hull}" fill="url(#${gid("body")})"/>`,
    `<path d="${roofCapFace}" fill="url(#${gid("roof")})"/>`,
    // 캡 하단 경계광 + 차체 좌우 곡면 음영
    `<path d="M${edgeL} 184 C92 174 208 174 ${edgeR} 184" fill="none" ` +
    `stroke="#ffffff" stroke-width="1.4" opacity=".4"/>`,
    `<path d="M${edgeL} 186 L${edgeL} 300 L${edgeL + 14} 300 L${edgeL + 14} 190z" ` +
    `fill="${L.bodyShade}" opacity=".55"/>`,
    `<path d="M${edgeR} 186 L${edgeR} 300 L${edgeR - 14} 300 L${edgeR - 14} 190z" ` +
    `fill="${L.bodyShade}" opacity=".55"/>`,
    // 측면 스트라이프가 노즈를 감아 도는 랩 어라운드
    `<path d="M${edgeL} 204 C64 198 82 195 102 194 L102 202 C82 203 64 207 ${edgeL} 213z" fill="url(#${gid("stripe")})"/>`,
    `<path d="M${edgeR} 204 C236 198 218 195 198 194 L198 202 C218 203 236 207 ${edgeR} 213z" fill="url(#${gid("stripe")})"/>`,
    // 윈드실드 — 어두운 서라운드 + 유리 + 상단 틴트 + 사선 반사
    `<path d="${windshield}" fill="none" stroke="${darken(L.glass, 0.45)}" stroke-width="9"/>`,
    `<path d="${windshield}" fill="url(#${gid("glass")})"/>`,
    `<path d="M84 92 C102 74 198 74 216 92 C220 98 222 106 222 112 C176 102 124 102 78 112 C78 106 80 98 84 92z" fill="${L.glassHi}" opacity=".45"/>`,
    `<path d="M104 164 L142 84 L160 84 L122 166z" fill="#ffffff" opacity=".18"/>`,
    `<path d="M170 162 L198 92 L206 94 L180 160z" fill="#ffffff" opacity=".1"/>`,
    wipers,
    // 로고 — 흰 하부 중앙
    logoText(train, 150, 226, 26, L.roof),
    lampCluster,
    // 금속 스커트 + 배장기 슬랫 + 연결기 커버
    `<path d="${skirtPath}" fill="url(#${gid("skirt")})"/>`,
    `<path d="M${edgeL + 14} 278 L${edgeR - 14} 278" stroke="${darken(L.skirt, 0.28)}" ` +
    `stroke-width="2" opacity=".8"/>`,
    `<path d="M${edgeL + 22} 288 L${edgeR - 22} 288" stroke="${darken(L.skirt, 0.28)}" ` +
    `stroke-width="2" opacity=".6"/>`,
    `<path d="M128 300 L128 280 Q150 272 172 280 L172 300z" fill="${darken(L.skirt, 0.3)}"/>`,
    `<rect x="146" y="282" width="8" height="10" rx="2" fill="${darken(L.skirt, 0.45)}"/>`
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
  const extraDefs = `<defs>` +
    radGrad(gid("lens"), [
      ["0%", "#ffffff"], ["35%", lampFill],
      ["100%", darken(lampFill, 0.45)]
    ]) +
    `</defs>`;
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

  // 노즈 3/4 v2 — 흰 헐 + 상면을 따라 흐르는 루프 캡 + 팁 핀스트라이프
  const noseHull = isSrt
    ? "M70 292 C64 236 74 176 118 138 C160 106 210 82 250 70 L250 300z"
    : "M64 292 L76 200 C98 150 160 100 250 70 L250 300z";
  const roofCap = isSrt
    ? "M118 138 C160 106 210 82 250 70 L250 94 C216 104 176 124 146 150 C136 147 126 143 118 138z"
    : "M120 136 C166 102 214 80 250 70 L250 94 C218 104 180 124 150 150 C138 146 128 141 120 136z";
  const capTip = isSrt
    ? "M119 139 C104 154 90 176 82 200"
    : "M121 137 C106 152 92 176 84 202";
  const windshield = isSrt
    ? "M146 149 C176 124 216 104 248 94 L248 134 C216 142 186 156 162 174 C154 166 149 158 146 149z"
    : "M150 149 C180 124 218 104 248 94 L248 134 C218 142 188 158 166 176 C158 168 153 159 150 149z";
  const noseStripe = isSrt
    ? "M250 226 C192 226 138 216 94 200 L90 210 C136 226 190 234 250 234z"
    : "M250 230 C192 230 140 224 92 208 L88 218 C138 234 190 238 250 238z";
  const noseSkirt = isSrt
    ? "M70 292 C70 276 72 262 78 252 C140 264 196 269 250 270 L250 300z"
    : "M64 292 L68 254 C140 266 196 270 250 271 L250 300z";
  const lampArt =
    `<rect x="88" y="228" width="48" height="18" rx="9" fill="${darken(L.skirt, 0.26)}"/>` +
    `<rect x="90" y="230" width="44" height="14" rx="7" fill="${darken(L.skirt, 0.06)}"/>` +
    `<circle cx="102" cy="237" r="5" fill="url(#${gid("lens")})"/>` +
    `<circle cx="122" cy="237" r="5" fill="url(#${gid("lens")})"/>` +
    `<circle cx="100" cy="235" r="1.4" fill="#ffffff" opacity=".85"/>` +
    `<circle cx="120" cy="235" r="1.4" fill="#ffffff" opacity=".85"/>`;

  const art = [
    `<ellipse cx="430" cy="330" rx="400" ry="12" fill="url(#${gid("shadow")})"/>`,
    wheels,
    // 원근 차체 — 흰 몸통 + 루프 밴드 + 스커트 + 스트라이프 + 상부 반사광
    `<path d="M250 70 L860 120 L860 240 L250 300z" fill="url(#${gid("body")})"/>`,
    `<path d="M250 70 L860 120 L860 138 L250 96z" fill="url(#${gid("roof")})"/>`,
    `<path d="M250 96 L860 138 L860 141 L250 100z" fill="#ffffff" opacity=".4"/>`,
    `<path d="M250 276 L860 228 L860 240 L250 300z" fill="url(#${gid("skirt")})"/>`,
    `<path d="M250 226 L860 206 L860 213 L250 235z" fill="url(#${gid("stripe")})"/>`,
    joints,
    wins.join(""),
    // 노즈 — 흰 헐 + 루프 캡 + 핀스트라이프 + 유리 밴드 + LED/후미등
    `<path d="${noseHull}" fill="url(#${gid("body")})"/>`,
    `<path d="${roofCap}" fill="url(#${gid("roof")})"/>`,
    `<path d="${capTip}" fill="none" stroke="${L.roofDeep}" stroke-width="3" ` +
    `stroke-linecap="round"/>`,
    `<path d="${noseSkirt}" fill="url(#${gid("skirt")})"/>`,
    `<path d="${noseStripe}" fill="url(#${gid("stripe")})"/>`,
    `<path d="${windshield}" fill="none" stroke="${darken(L.glass, 0.45)}" stroke-width="6"/>`,
    `<path d="${windshield}" fill="url(#${gid("glass")})"/>`,
    `<path d="M158 158 L200 112 L214 108 L170 158z" fill="#ffffff" opacity=".22"/>`,
    `<path d="M80 254 L96 250 M78 264 L90 261" stroke="${darken(L.skirt, 0.3)}" ` +
    `stroke-width="2" fill="none" opacity=".7"/>`,
    lampArt
  ].join("");

  const body = side === "left"
    ? art
    : `<g transform="translate(900 0) scale(-1 1)">${art}</g>`;
  // 로고는 미러 그룹 밖 — 글자가 뒤집히지 않는다. 노즈 흰 하부 위 리버리색.
  const logoX = side === "left" ? 178 : 722;
  return svgWrap("ktx-quarter-train-art", "0 0 900 360",
    defs + extraDefs + body + logoText(train, logoX, 262, 20, L.roof));
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
      [0, 1, 2].map(k =>
        `<circle cx="${94 + k * 26}" cy="${mid - 20}" r="5" fill="${darken(GEAR, 0.3)}"/>` +
        `<circle cx="${94 + k * 26}" cy="${mid - 20}" r="2" fill="${lighten(GEAR, 0.3)}"/>`
      ).join("") +
      `<rect x="88" y="${mid + 22}" width="64" height="16" rx="6" fill="${GEAR}"/>` +
      `<rect x="92" y="${mid + 26}" width="56" height="3" rx="1.5" fill="${darken(GEAR, 0.3)}"/>` +
      // 지붕 배관·워크라인 + 점검 해치
      `<rect x="58" y="${y1 + 10}" width="3" height="${y2 - y1 - 20}" rx="1.5" ` +
      `fill="${lighten(L.roofDeep, 0.18)}" opacity=".8"/>` +
      `<rect x="179" y="${y1 + 10}" width="3" height="${y2 - y1 - 20}" rx="1.5" ` +
      `fill="${lighten(L.roofDeep, 0.18)}" opacity=".8"/>` +
      `<rect x="112" y="${y1 + 14}" width="16" height="10" rx="2" ` +
      `fill="${darken(L.roof, 0.18)}" stroke="${lighten(L.roof, 0.2)}" stroke-width="1"/>`;
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
