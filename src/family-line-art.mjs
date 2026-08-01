// 가족 노선에서 승강장에 나와 기다리는 일곱 사람.
//
// 사진을 보고 그린 것이 아니라 사진에서 알아볼 만한 특징만 옮긴 그림이다 —
// 도하는 앞머리 일자인 단발과 웃을 때 반달로 접히는 눈. 나머지 가족은 서로
// 헷갈리지 않을 만큼만 다르게(안경·모자·머리 모양·옷 색) 그렸다.
// 다른 그림들과 같은 규칙: 평면 2D, 단색 채움, 그라디언트·필터·SMIL 없음.

const INK = "#31445b";
const PAPER = "#fff";
const HAIR = "#3b2b25";
const HAIR_GREY = "#c8ccd3";
const HAIR_SALT = "#9aa3ae";
const SKIN = "#f7d9c0";
const SKIN_SHADE = "#e9c2a4";
const NAVY = "#3a4f7a";
const CORAL = "#ef7b6a";
const MINT = "#7cc9b5";
const LILAC = "#a893d4";
const SUNNY = "#f4c542";
const LEAF = "#7fbf6a";
const BLUSH = "#f2a9a0";
const GLASS = "#8fa4bb";

// 승강장에 선 사람 하나. 얼굴 가운데는 (50, 40), 발끝은 y=150.
function person(id, body) {
  return [
    `<svg class="family-art family-art-${id}" viewBox="0 0 100 155" `,
    `role="img" aria-hidden="true" focusable="false" `,
    `preserveAspectRatio="xMidYMax meet" `,
    `xmlns="http://www.w3.org/2000/svg">${body}</svg>`
  ].join("");
}

// 몸통·팔·다리는 다 같은 모양이고 옷 색만 다르다.
function body(colour, shoe = INK) {
  return [
    `<rect x="27" y="150" width="18" height="5" rx="2.5" fill="${shoe}"/>`,
    `<rect x="55" y="150" width="18" height="5" rx="2.5" fill="${shoe}"/>`,
    `<rect x="34" y="112" width="12" height="40" rx="5" fill="${INK}" opacity=".82"/>`,
    `<rect x="54" y="112" width="12" height="40" rx="5" fill="${INK}" opacity=".82"/>`,
    `<rect x="28" y="66" width="44" height="52" rx="16" fill="${colour}"/>`,
    `<rect x="18" y="72" width="13" height="34" rx="6.5" fill="${colour}"/>`,
    `<rect x="69" y="72" width="13" height="34" rx="6.5" fill="${colour}"/>`,
    `<circle cx="24.5" cy="108" r="6" fill="${SKIN}"/>`,
    `<circle cx="75.5" cy="108" r="6" fill="${SKIN}"/>`,
    `<rect x="40" y="60" width="20" height="12" rx="5" fill="${SKIN_SHADE}"/>`
  ].join("");
}

const face = `<circle cx="50" cy="40" r="26" fill="${SKIN}"/>`;

// 웃어서 반달로 접힌 눈 — 도하 사진에서 제일 먼저 눈에 띄는 것.
function happyEyes(y = 40) {
  return [
    `<path d="M33 ${y} q6 -7 12 0" fill="none" stroke="${INK}" `,
    `stroke-width="3.4" stroke-linecap="round"/>`,
    `<path d="M55 ${y} q6 -7 12 0" fill="none" stroke="${INK}" `,
    `stroke-width="3.4" stroke-linecap="round"/>`
  ].join("");
}

function roundEyes(y = 40) {
  return `<circle cx="39" cy="${y}" r="3.6" fill="${INK}"/>` +
    `<circle cx="61" cy="${y}" r="3.6" fill="${INK}"/>`;
}

function smile(y = 52, wide = false) {
  return wide
    ? `<path d="M40 ${y} q10 11 20 0 q-10 5 -20 0z" fill="${INK}"/>`
    : `<path d="M42 ${y} q8 7 16 0" fill="none" stroke="${INK}" ` +
      `stroke-width="3" stroke-linecap="round"/>`;
}

const cheeks = `<circle cx="31" cy="48" r="4.5" fill="${BLUSH}" opacity=".62"/>` +
  `<circle cx="69" cy="48" r="4.5" fill="${BLUSH}" opacity=".62"/>`;

// 앞머리가 눈썹 바로 위에서 일자로 뚝 떨어지는 단발. 도하 머리 모양이라
// 이마가 보이면 안 된다 — 덮개의 아래 끝(y=33)이 곧 앞머리 선이다.
function bowlCut(colour = HAIR) {
  return [
    `<path d="M23.5 33 a26.5 26.5 0 0 1 53 0 z" fill="${colour}"/>`,
    `<rect x="21.5" y="28" width="8" height="26" rx="4" fill="${colour}"/>`,
    `<rect x="70.5" y="28" width="8" height="26" rx="4" fill="${colour}"/>`
  ].join("");
}

function shortHair(colour = HAIR) {
  return `<path d="M25 38 a25 25 0 0 1 50 0 q-25 -14 -50 0z" fill="${colour}"/>`;
}

function bunHair(colour = HAIR) {
  return [
    `<circle cx="50" cy="14" r="9" fill="${colour}"/>`,
    `<path d="M24 42 a26 26 0 0 1 52 0 q-26 -18 -52 0z" fill="${colour}"/>`,
    `<path d="M24 42 q-4 14 2 20 q4 -12 2 -20z" fill="${colour}"/>`,
    `<path d="M76 42 q4 14 -2 20 q-4 -12 -2 -20z" fill="${colour}"/>`
  ].join("");
}

function glasses() {
  return [
    `<circle cx="39" cy="40" r="9.5" fill="none" stroke="${GLASS}" stroke-width="2.6"/>`,
    `<circle cx="61" cy="40" r="9.5" fill="none" stroke="${GLASS}" stroke-width="2.6"/>`,
    `<path d="M48.5 40 h3" stroke="${GLASS}" stroke-width="2.6" stroke-linecap="round"/>`
  ].join("");
}

function cap(colour) {
  return [
    `<path d="M26 30 a24 22 0 0 1 48 0z" fill="${colour}"/>`,
    `<rect x="24" y="28" width="52" height="6" rx="3" fill="${colour}"/>`,
    `<path d="M74 31 q14 1 15 7 q-15 2 -15 -7z" fill="${colour}"/>`
  ].join("");
}

// 도하 — 앞머리 일자 단발, 웃으면 반달이 되는 눈, 활짝 웃는 입.
// 풍선은 소품이라 따로 묶어 둔다. 도장판은 얼굴만 쓰려고 이 묶음을 떼어낸다.
function dohaArt() {
  return person("doha", [
    body(NAVY),
    face,
    bowlCut(),
    happyEyes(41),
    cheeks,
    smile(52, true),
    `<g class="family-art-prop">`,
    `<path d="M76 106 q9 -14 10 -26" fill="none" stroke="${INK}" `,
    `stroke-width="1.8" opacity=".55"/>`,
    `<path d="M86 82 l-3 5 h6z" fill="${CORAL}"/>`,
    `<ellipse cx="86" cy="71" rx="9" ry="11" fill="${CORAL}"/>`,
    `</g>`
  ].join(""));
}

function momArt() {
  return person("mom", [
    body(CORAL),
    face,
    bunHair(),
    happyEyes(),
    cheeks,
    smile()
  ].join(""));
}

function dadArt() {
  return person("dad", [
    body(MINT),
    face,
    shortHair(),
    roundEyes(),
    glasses(),
    smile()
  ].join(""));
}

function goyangGrandpaArt() {
  return person("goyang-grandpa", [
    body(SUNNY),
    face,
    shortHair(HAIR_SALT),
    cap(LEAF),
    happyEyes(42),
    smile(53),
    // 콧수염은 입 아래 두면 웃는 입에 묻힌다. 눈과 입 사이가 제자리.
    `<path d="M39 47 q11 7 22 0 q-11 -4 -22 0z" fill="${HAIR_SALT}"/>`
  ].join(""));
}

function goyangGrandmaArt() {
  return person("goyang-grandma", [
    body(LILAC),
    face,
    bunHair(HAIR_GREY),
    happyEyes(),
    cheeks,
    smile(),
    `<circle cx="50" cy="72" r="4" fill="${PAPER}" opacity=".85"/>`
  ].join(""));
}

function gimhaeGrandpaArt() {
  return person("gimhae-grandpa", [
    body(GLASS),
    face,
    shortHair(HAIR_GREY),
    roundEyes(),
    glasses(),
    smile(53),
    `<path d="M40 58 q10 8 20 0" fill="none" stroke="${HAIR_GREY}" `,
    `stroke-width="4" stroke-linecap="round"/>`
  ].join(""));
}

function gimhaeGrandmaArt() {
  return person("gimhae-grandma", [
    body(LEAF),
    face,
    bunHair(HAIR_SALT),
    happyEyes(),
    cheeks,
    smile(),
    `<circle cx="50" cy="72" r="4" fill="${SUNNY}"/>`
  ].join(""));
}

const DRAWINGS = Object.freeze({
  mom: momArt,
  dad: dadArt,
  "goyang-grandpa": goyangGrandpaArt,
  "goyang-grandma": goyangGrandmaArt,
  doha: dohaArt,
  "gimhae-grandpa": gimhaeGrandpaArt,
  "gimhae-grandma": gimhaeGrandmaArt
});

export function familyPersonSvg(id) {
  const draw = DRAWINGS[id];
  return draw ? draw() : "";
}

// 사람 그림에서 머리만 잘라 낸다. 손에 든 소품은 얼굴 칸에 들어오면
// 얼룩처럼 보여서 같이 떼어 낸다.
function head(id) {
  const draw = DRAWINGS[id];
  if (!draw) return null;
  return draw()
    .replace(/^<svg[^>]*>/, "")
    .replace(/<\/svg>$/, "")
    .replace(/<g class="family-art-prop">[\s\S]*?<\/g>/g, "");
}

function faceTile(className, body) {
  return [
    `<svg class="${className}" viewBox="14 4 72 72" role="img" `,
    `aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">`,
    body,
    `</svg>`
  ].join("");
}

// 아직 놀기 전에 보여 주는 얼굴 — 흐리지도 않고 도장도 안 찍혀 있다.
export function familyFaceSvg(id) {
  const body = head(id);
  return body === null ? "" : faceTile("family-face-art", body);
}

// 도장판 한 칸. 만나기 전에는 흐리고, 만나면 또렷해지며 체크가 붙는다.
export function familyStampSvg(id, met) {
  const body = head(id);
  if (body === null) return "";
  return faceTile("family-stamp-art", [
    `<g opacity="${met ? 1 : 0.28}">${body}</g>`,
    met
      ? `<path d="M64 60 l6 7 l12 -15" fill="none" stroke="#2fa25c" ` +
        `stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`
      : ""
  ].join(""));
}

// 열차 문 너머로 보이는 승강장. 지하철 승강장 그림은 한가운데가 열차 들어오는
// 터널이라 사람이 시커먼 데 서 있는 꼴이 되어 그대로 못 쓰고, 그 안쪽 조각들은
// 내보내지 않아서 이 노선 몫으로 따로 그린다.
const WALL = "#e8eef5";
const WALL_LINE = "#d3dde8";
const FLOOR = "#e2d9c8";
const FLOOR_DARK = "#cfc3ad";
const TACTILE = "#f2c14e";
const STEEL = "#9fb0c2";
const BENCH = "#c89a63";
const BENCH_DARK = "#a97f4d";
const LAMP = "#fdf3d0";

export function familyPlatformSvg(lineColour, name) {
  const lights = Array.from({ length: 5 }, (unused, index) =>
    `<rect x="${90 + index * 200}" y="26" width="120" height="16" rx="8" ` +
    `fill="${LAMP}"/>`
  ).join("");
  const tiles = Array.from({ length: 9 }, (unused, index) =>
    `<line x1="0" y1="${70 + index * 30}" x2="1000" y2="${70 + index * 30}" ` +
    `stroke="${WALL_LINE}" stroke-width="3"/>`
  ).join("");
  const dots = Array.from({ length: 12 }, (unused, index) =>
    `<rect x="${index * 84 + 20}" y="386" width="46" height="8" rx="4" ` +
    `fill="#fff" opacity=".45"/>`
  ).join("");
  return [
    `<svg class="family-platform-art" viewBox="0 0 1000 500" `,
    `preserveAspectRatio="xMidYMax slice" aria-hidden="true" `,
    `xmlns="http://www.w3.org/2000/svg">`,
    `<rect width="1000" height="500" fill="${WALL}"/>`,
    lights,
    tiles,
    // 역 이름판 — 이 노선 색으로 밑줄을 긋는다
    `<rect x="330" y="96" width="340" height="104" rx="16" fill="#fff" `,
    `stroke="#31445b" stroke-width="6"/>`,
    `<text x="500" y="156" text-anchor="middle" font-size="46" `,
    `font-weight="900" fill="#31445b">${name}</text>`,
    `<rect x="392" y="168" width="216" height="14" rx="7" fill="${lineColour}"/>`,
    // 기다리는 의자
    `<rect x="52" y="286" width="176" height="18" rx="9" fill="${BENCH}"/>`,
    `<rect x="62" y="294" width="14" height="58" fill="${BENCH_DARK}"/>`,
    `<rect x="204" y="294" width="14" height="58" fill="${BENCH_DARK}"/>`,
    `<rect x="828" y="286" width="120" height="18" rx="9" fill="${BENCH}"/>`,
    `<rect x="836" y="294" width="14" height="58" fill="${BENCH_DARK}"/>`,
    `<rect x="926" y="294" width="14" height="58" fill="${BENCH_DARK}"/>`,
    // 바닥과 노란 안전선
    `<rect x="0" y="352" width="1000" height="18" fill="${STEEL}"/>`,
    `<rect x="0" y="370" width="1000" height="130" fill="${FLOOR}"/>`,
    `<rect x="0" y="418" width="1000" height="6" fill="${FLOOR_DARK}" `,
    `opacity=".5"/>`,
    `<rect x="0" y="382" width="1000" height="16" rx="8" fill="${TACTILE}"/>`,
    dots,
    `</svg>`
  ].join("");
}

// 다 만나면 일곱이 한 줄로 서서 손을 흔든다.
export function familyReunionSvg() {
  const order = ["mom", "dad", "goyang-grandpa", "doha", "goyang-grandma",
    "gimhae-grandpa", "gimhae-grandma"];
  const people = order.map((id, index) => {
    const draw = DRAWINGS[id];
    const inner = draw()
      .replace(/^<svg[^>]*>/, "")
      .replace(/<\/svg>$/, "");
    const scale = id === "doha" ? 1.16 : 1;
    const lift = id === "doha" ? -14 : 0;
    return `<g transform="translate(${index * 132} ${lift}) scale(${scale})">` +
      `${inner}</g>`;
  }).join("");
  return [
    `<svg class="family-reunion-art" viewBox="0 0 950 200" role="img" `,
    `aria-label="가족이 다 모였어요" focusable="false" `,
    `preserveAspectRatio="xMidYMax meet" xmlns="http://www.w3.org/2000/svg">`,
    `<g transform="translate(6 34)">${people}</g>`,
    `</svg>`
  ].join("");
}
