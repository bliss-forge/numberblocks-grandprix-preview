// Illustrated badges for the ten destination cards.
//
// Each badge is a 100x100 rounded tile: a soft tinted ground plus the same
// motif that headlines that place's arrival scene, so the card the child picks
// and the world they arrive in are visibly the same place.
// Flat 2D, solid fills, no gradients/filters/SMIL — the picker never animates.

const INK = "#31445b";
const PAPER = "#fff";
const SKY = "#bfe8ff";
const SKY_DEEP = "#9fd0f5";
const WATER = "#9fd0f5";
const WATER_DEEP = "#5aa9e6";
const GRASS = "#a9df7d";
const GRASS_DARK = "#6fae52";
const LEAF = "#7fd08a";
const TRUNK = "#8a5a3b";
const STEEL = "#9fb0c2";
const STEEL_DARK = "#7d8ea1";
const STONE = "#dce6f0";
const RED = "#e8564a";
const ORANGE = "#ef5a29";
const YELLOW = "#f4c542";
const PINK = "#ef6aa0";
const BLOSSOM = "#f7c8da";
const PURPLE = "#7c5cd6";
const GREEN = "#2fa25c";
const TEAL = "#4f9e8f";
const ELEPHANT = "#a5aeb9";
const ELEPHANT_DARK = "#8d95a0";

const TINTS = Object.freeze({
  zoo: "#e6f6e2",
  lunapark: "#fdeaf2",
  baseball: "#e6f0fd",
  palace: "#f6efe2",
  namsan: "#e4f2fb",
  hanriver: "#e2f0fb",
  skypark: "#eef7dd",
  childpark: "#fdf3d9",
  lake: "#fceaf1",
  assembly: "#e4f4ef"
});

function badge(placeId, body) {
  return `<svg class="subway-place-badge-art" viewBox="0 0 100 100" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="0" y="0" width="100" height="100" rx="26" ` +
    `fill="${TINTS[placeId] ?? "#eef3f8"}"/>${body}</svg>`;
}

function hill(fill = GRASS, y = 72) {
  return `<path d="M0 ${y} Q30 ${y - 20} 52 ${y - 4} Q76 ${y - 22} 100 ${y} ` +
    `L100 100 L0 100 Z" fill="${fill}"/>`;
}

// 동물원 — the elephant that greets you at the gate
function zooBadge() {
  return badge("zoo", [
    hill(GRASS, 78),
    `<ellipse cx="58" cy="64" rx="30" ry="24" fill="${ELEPHANT}"/>`,
    `<rect x="40" y="80" width="11" height="16" rx="5" fill="${ELEPHANT_DARK}"/>`,
    `<rect x="66" y="80" width="11" height="16" rx="5" fill="${ELEPHANT_DARK}"/>`,
    `<circle cx="34" cy="50" r="19" fill="${ELEPHANT}"/>`,
    `<ellipse cx="20" cy="43" rx="10" ry="13" fill="${ELEPHANT_DARK}"/>`,
    `<path d="M28 62 q-9 11 -4 22 q3 7 11 5" fill="none" ` +
    `stroke="${ELEPHANT_DARK}" stroke-width="8" stroke-linecap="round"/>`,
    `<circle cx="31" cy="47" r="2.6" fill="${INK}"/>`,
    `<path d="M74 40 q6 -12 17 -9" fill="none" stroke="${ELEPHANT_DARK}" ` +
    `stroke-width="5" stroke-linecap="round"/>`
  ].join(""));
}

// 놀이공원 — the ferris wheel
function lunaparkBadge() {
  const gondolas = [
    [50, 16, RED], [74, 26, YELLOW], [84, 50, GREEN], [74, 74, SKY_DEEP],
    [50, 84, PINK], [26, 74, PURPLE], [16, 50, ORANGE], [26, 26, TEAL]
  ].map(([cx, cy, colour]) =>
    `<circle cx="${cx}" cy="${cy}" r="7.5" fill="${colour}"/>`
  ).join("");
  const spokes = [[50, 16], [84, 50], [50, 84], [16, 50], [26, 26], [74, 26],
    [74, 74], [26, 74]].map(([x, y]) =>
    `<line x1="50" y1="50" x2="${x}" y2="${y}" stroke="${STEEL}" ` +
    `stroke-width="3"/>`
  ).join("");
  return badge("lunapark", [
    `<circle cx="50" cy="50" r="34" fill="none" stroke="${STEEL}" ` +
    `stroke-width="5"/>`,
    spokes,
    gondolas,
    `<circle cx="50" cy="50" r="8" fill="${PAPER}" stroke="${RED}" ` +
    `stroke-width="4"/>`
  ].join(""));
}

// 야구장 — ball and bat
function baseballBadge() {
  return badge("baseball", [
    hill(GRASS_DARK, 80),
    `<rect x="18" y="66" width="64" height="10" rx="5" fill="${STEEL}" ` +
    `transform="rotate(-38 50 71)"/>`,
    `<rect x="70" y="62" width="18" height="18" rx="6" fill="${TRUNK}" ` +
    `transform="rotate(-38 79 71)"/>`,
    `<circle cx="40" cy="36" r="20" fill="${PAPER}" stroke="${INK}" ` +
    `stroke-width="3"/>`,
    `<path d="M27 26 q9 10 0 20" fill="none" stroke="${RED}" ` +
    `stroke-width="3" stroke-linecap="round"/>`,
    `<path d="M53 26 q-9 10 0 20" fill="none" stroke="${RED}" ` +
    `stroke-width="3" stroke-linecap="round"/>`
  ].join(""));
}

// 경복궁 — the tiled gate roof
function palaceBadge() {
  return badge("palace", [
    `<rect x="26" y="62" width="48" height="30" rx="4" fill="${STONE}"/>`,
    `<path d="M42 92 L42 74 q8 -10 16 0 L58 92 Z" fill="#7b3f38"/>`,
    `<rect x="24" y="52" width="52" height="12" rx="4" fill="${GREEN}"/>`,
    `<rect x="30" y="52" width="6" height="12" fill="#b0473c"/>`,
    `<rect x="64" y="52" width="6" height="12" fill="#b0473c"/>`,
    `<path d="M14 52 Q50 30 86 52 L80 44 Q50 24 20 44 Z" fill="#5a6a85"/>`,
    `<path d="M22 34 Q50 18 78 34 L74 28 Q50 14 26 28 Z" fill="#42506b"/>`,
    `<circle cx="50" cy="13" r="4" fill="#42506b"/>`
  ].join(""));
}

// 남산 — the tower on the mountain
function namsanBadge() {
  return badge("namsan", [
    `<path d="M0 96 Q26 52 50 44 Q76 52 100 96 Z" fill="${GRASS_DARK}"/>`,
    `<path d="M18 96 Q40 62 50 58 Q62 64 82 96 Z" fill="${GRASS}"/>`,
    `<rect x="47" y="20" width="6" height="26" fill="${STEEL}"/>`,
    `<path d="M42 46 L58 46 L54 24 L46 24 Z" fill="${STEEL}"/>`,
    `<ellipse cx="50" cy="22" rx="16" ry="7" fill="${PAPER}" ` +
    `stroke="${STEEL_DARK}" stroke-width="2.5"/>`,
    `<rect x="34" y="22" width="32" height="4" rx="2" fill="${RED}"/>`,
    `<rect x="48.5" y="4" width="3" height="12" fill="${STEEL_DARK}"/>`,
    `<circle cx="50" cy="4" r="3.4" fill="${RED}"/>`
  ].join(""));
}

// 한강공원 — the bridge over the river
function hanriverBadge() {
  return badge("hanriver", [
    `<rect x="0" y="58" width="100" height="42" fill="${WATER}"/>`,
    `<rect x="0" y="58" width="100" height="5" fill="${PAPER}" ` +
    `opacity=".6"/>`,
    `<rect x="12" y="74" width="22" height="4" rx="2" fill="${PAPER}" ` +
    `opacity=".65"/>`,
    `<rect x="60" y="84" width="26" height="4" rx="2" fill="${PAPER}" ` +
    `opacity=".65"/>`,
    `<path d="M0 58 Q26 22 52 58" fill="none" stroke="${STEEL_DARK}" ` +
    `stroke-width="6"/>`,
    `<path d="M52 58 Q78 22 104 58" fill="none" stroke="${STEEL_DARK}" ` +
    `stroke-width="6"/>`,
    `<rect x="0" y="54" width="100" height="7" rx="3" fill="${STEEL}"/>`,
    `<path d="M26 66 q7 -9 15 0 q8 5 17 2 l-3 6 q-10 3 -19 -1 ` +
    `q-7 -3 -10 -7 Z" fill="${YELLOW}"/>`,
    `<circle cx="37" cy="61" r="4.6" fill="${YELLOW}"/>`,
    `<circle cx="36" cy="60" r="1.4" fill="${INK}"/>`
  ].join(""));
}

// 하늘공원 — the grass hill with a turbine
function skyparkBadge() {
  const tufts = [22, 36, 64, 78].map((x, index) =>
    `<ellipse cx="${x}" cy="${74 - (index % 2) * 8}" rx="4" ry="11" ` +
    `fill="#efe6cf"/>` +
    `<line x1="${x}" y1="${80 - (index % 2) * 8}" x2="${x}" y2="94" ` +
    `stroke="${GRASS_DARK}" stroke-width="2.4"/>`
  ).join("");
  return badge("skypark", [
    hill(GRASS, 66),
    `<path d="M0 82 Q28 70 50 76 Q74 68 100 80 L100 100 L0 100 Z" ` +
    `fill="${GRASS_DARK}"/>`,
    tufts,
    `<rect x="68" y="24" width="4" height="44" fill="${PAPER}"/>`,
    `<circle cx="70" cy="24" r="4" fill="${STEEL}"/>`,
    `<path d="M70 24 L70 6" stroke="${PAPER}" stroke-width="5" ` +
    `stroke-linecap="round"/>`,
    `<path d="M70 24 L86 34" stroke="${PAPER}" stroke-width="5" ` +
    `stroke-linecap="round"/>`,
    `<path d="M70 24 L54 34" stroke="${PAPER}" stroke-width="5" ` +
    `stroke-linecap="round"/>`
  ].join(""));
}

// 어린이대공원 — a pinwheel over the swing frame
function childparkBadge() {
  const blades = [[RED, 0], [YELLOW, 90], [LEAF, 180], [SKY_DEEP, 270]]
    .map(([colour, angle]) =>
      `<path d="M34 34 q14 -12 18 4 q-14 8 -18 -4 Z" fill="${colour}" ` +
      `transform="rotate(${angle} 34 34)"/>`
    ).join("");
  return badge("childpark", [
    hill(GRASS, 80),
    `<line x1="54" y1="94" x2="70" y2="58" stroke="${TRUNK}" ` +
    `stroke-width="5" stroke-linecap="round"/>`,
    `<line x1="92" y1="94" x2="76" y2="58" stroke="${TRUNK}" ` +
    `stroke-width="5" stroke-linecap="round"/>`,
    `<line x1="60" y1="58" x2="92" y2="58" stroke="${TRUNK}" ` +
    `stroke-width="5" stroke-linecap="round"/>`,
    `<line x1="78" y1="60" x2="78" y2="80" stroke="${STEEL_DARK}" ` +
    `stroke-width="2.4"/>`,
    `<rect x="70" y="80" width="17" height="5" rx="2.5" fill="${RED}"/>`,
    `<line x1="34" y1="34" x2="34" y2="94" stroke="${TRUNK}" ` +
    `stroke-width="5" stroke-linecap="round"/>`,
    blades,
    `<circle cx="34" cy="34" r="4" fill="${PAPER}" stroke="${INK}" ` +
    `stroke-width="2"/>`
  ].join(""));
}

// 석촌호수 — blossom over the lake with a swan boat
function lakeBadge() {
  return badge("lake", [
    `<ellipse cx="50" cy="84" rx="52" ry="20" fill="${WATER}"/>`,
    `<ellipse cx="50" cy="84" rx="34" ry="11" fill="${WATER_DEEP}" ` +
    `opacity=".35"/>`,
    `<rect x="74" y="30" width="7" height="30" rx="3" fill="${STEEL}"/>`,
    `<path d="M77.5 8 L86 60 L69 60 Z" fill="${STONE}"/>`,
    `<rect x="20" y="52" width="7" height="34" rx="3" fill="${TRUNK}"/>`,
    `<circle cx="23" cy="44" r="18" fill="${BLOSSOM}"/>`,
    `<circle cx="9" cy="54" r="11" fill="#f09ec0"/>`,
    `<circle cx="38" cy="54" r="10" fill="${BLOSSOM}"/>`,
    `<path d="M40 84 q10 -8 24 0 q-4 8 -12 8 q-9 0 -12 -8 Z" fill="${PAPER}"/>`,
    `<path d="M50 76 q-3 -12 7 -13 q7 0 6 8" fill="none" stroke="${PAPER}" ` +
    `stroke-width="6" stroke-linecap="round"/>`,
    `<circle cx="62" cy="68" r="2.2" fill="${INK}"/>`,
    `<path d="M65 69 l6 2 l-6 2 Z" fill="${ORANGE}"/>`
  ].join(""));
}

// 국회의사당 — the teal dome and colonnade
function assemblyBadge() {
  const columns = Array.from({ length: 5 }, (unused, index) =>
    `<rect x="${28 + index * 11}" y="62" width="6" height="24" ` +
    `fill="${STONE}"/>`
  ).join("");
  return badge("assembly", [
    hill(GRASS, 88),
    `<rect x="18" y="86" width="64" height="6" rx="3" fill="${STONE}"/>`,
    `<rect x="22" y="56" width="56" height="8" rx="3" fill="${PAPER}"/>`,
    `<rect x="22" y="62" width="56" height="24" fill="${PAPER}"/>`,
    columns,
    `<path d="M28 40 Q50 16 72 40 Z" fill="${TEAL}"/>`,
    `<rect x="26" y="40" width="48" height="7" rx="3" fill="${PAPER}"/>`,
    `<circle cx="50" cy="14" r="4" fill="${TEAL}"/>`
  ].join(""));
}

const BADGES = {
  zoo: zooBadge,
  lunapark: lunaparkBadge,
  baseball: baseballBadge,
  palace: palaceBadge,
  namsan: namsanBadge,
  hanriver: hanriverBadge,
  skypark: skyparkBadge,
  childpark: childparkBadge,
  lake: lakeBadge,
  assembly: assemblyBadge
};

export function placeBadgeSvg(placeId) {
  const draw = BADGES[placeId];
  return draw ? draw() : "";
}

// The metro mark that heads the picker, drawn instead of a 🚇 glyph.
export function metroMarkSvg() {
  return `<svg class="subway-metro-mark" viewBox="0 0 44 34" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<rect x="2" y="2" width="40" height="25" rx="9" fill="${PAPER}" ` +
    `stroke="${INK}" stroke-width="3"/>` +
    `<rect x="7" y="7" width="12" height="9" rx="3" fill="${SKY}"/>` +
    `<rect x="25" y="7" width="12" height="9" rx="3" fill="${SKY}"/>` +
    `<rect x="2" y="19" width="40" height="7" fill="${GREEN}"/>` +
    `<circle cx="12" cy="30" r="3.4" fill="${INK}"/>` +
    `<circle cx="32" cy="30" r="3.4" fill="${INK}"/>` +
    `</svg>`;
}

// A drawn pair of footprints marking the cell to walk to.
export function footprintSvg() {
  return `<svg class="subway-footprint-art" viewBox="0 0 30 34" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<g fill="${INK}" opacity=".7">` +
    `<ellipse cx="9" cy="12" rx="5" ry="8"/>` +
    `<circle cx="6" cy="3.5" r="2"/><circle cx="10.5" cy="2.6" r="2"/>` +
    `<ellipse cx="21" cy="24" rx="5" ry="8"/>` +
    `<circle cx="18" cy="15.5" r="2"/><circle cx="22.5" cy="14.6" r="2"/>` +
    `</g></svg>`;
}

// The transfer gate at the end of the corridor, drawn as a real door.
// 환승 통로 끝에 있는 것은 문이 아니라 다른 호선으로 올라가는 에스컬레이터다.
// 계단 발판이 비스듬히 올라가고 손잡이 띠가 그 위를 따라간다.
export function corridorDoorSvg() {
  const treads = Array.from({ length: 6 }, (unused, index) => {
    const x = 3 + index * 5;
    const y = 52 - index * 5.6;
    return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="10" ` +
      `height="5.6" fill="${STEEL}"/>` +
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="10" ` +
      `height="1.9" fill="${STEEL_DARK}"/>`;
  }).join("");
  return `<svg class="subway-door-art" viewBox="0 0 40 60" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    // 올라가는 방향 화살표는 손잡이보다 위, 아무것도 안 걸리는 꼭대기에
    `<path d="M14 12 L20 5 L26 12" fill="none" stroke="${GREEN}" ` +
    `stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="M2 58 L2 53 L31 21 L35 21 L35 26 L7 58z" fill="${STEEL_DARK}" ` +
    `opacity=".26"/>` +
    treads +
    // 손잡이 띠 — 발판 위를 나란히 따라 올라간다
    `<path d="M4 46 L33 18" stroke="${INK}" stroke-width="3.6" ` +
    `stroke-linecap="round" fill="none"/>` +
    `<path d="M4 52 L33 24" stroke="${STEEL_DARK}" stroke-width="2" ` +
    `stroke-linecap="round" fill="none"/>` +
    `</svg>`;
}

// A small walking figure for the "권장: 1번 환승" chips, so the transfer count
// is shown with a drawn walker instead of an emoji glyph.
export function walkerSvg() {
  return `<svg class="subway-walker-art" viewBox="0 0 20 30" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<circle cx="10" cy="5" r="4" fill="${INK}"/>` +
    `<path d="M10 9 L10 18" stroke="${INK}" stroke-width="3.4" ` +
    `stroke-linecap="round"/>` +
    `<path d="M10 18 L5 27" stroke="${INK}" stroke-width="3.4" ` +
    `stroke-linecap="round"/>` +
    `<path d="M10 18 L16 26" stroke="${INK}" stroke-width="3.4" ` +
    `stroke-linecap="round"/>` +
    `<path d="M10 12 L3 15" stroke="${INK}" stroke-width="3" ` +
    `stroke-linecap="round"/>` +
    `<path d="M10 12 L17 10" stroke="${INK}" stroke-width="3" ` +
    `stroke-linecap="round"/>` +
    `</svg>`;
}
