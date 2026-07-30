// Illustrated destination scenes for the subway arrival screen.
//
// Shared stage: viewBox 0 0 1000 520, preserveAspectRatio="xMidYMax slice".
//   0 .. 330   sky
//   330 .. 400 horizon band (each place paints its own skyline here)
//   400 .. 520 ground (the hero and friends stand around y 470)
//
// House rules (same as subway-station-art.mjs): flat 2D, solid fills, rounded
// shapes, no gradients/filters/SMIL, colours from the constants below plus at
// most a couple of place-specific accents declared next to the scene.
// At most TWO animated groups per scene, class subway-arrived-anim-<name>,
// transform/opacity only; every animation dies under prefers-reduced-motion.

const INK = "#31445b";
const PAPER = "#fff";
const SKY_DAY = "#bfe8ff";
const SKY_GLOW = "#e3f5ff";
const SUN = "#ffd166";
const CLOUD = "#ffffff";
const GRASS = "#a9df7d";
const GRASS_DARK = "#6fae52";
const PATH = "#f1dcb0";
const PATH_DARK = "#dcc28d";
const TREE_LEAF = "#7fd08a";
const TREE_LEAF_DARK = "#55b966";
const TRUNK = "#8a5a3b";
const WATER = "#9fd0f5";
const WATER_DEEP = "#5aa9e6";
const STONE = "#dce6f0";
const STONE_DARK = "#9fb0c2";
const RED = "#e8564a";
const ORANGE = "#ef5a29";
const YELLOW = "#f4c542";
const PINK = "#ef6aa0";
const PURPLE = "#7c5cd6";
const NIGHT_GREEN = "#2fa25c";

const SCENE_W = 1000;
const SCENE_H = 520;

function stage(placeId, body) {
  return `<svg class="subway-arrived-art subway-arrived-${placeId}" ` +
    `viewBox="0 0 ${SCENE_W} ${SCENE_H}" ` +
    `preserveAspectRatio="xMidYMax slice" aria-hidden="true" ` +
    `xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function skyBand(top = SKY_DAY, glow = SKY_GLOW) {
  return `<rect x="0" y="0" width="${SCENE_W}" height="400" fill="${top}"/>` +
    `<rect x="0" y="250" width="${SCENE_W}" height="150" fill="${glow}" ` +
    `opacity=".55"/>`;
}

function sun(cx = 850, cy = 96, r = 46) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${SUN}"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${r - 12}" fill="#ffe29a"/>`;
}

function cloud(cx, cy, scale = 1) {
  const s = value => (value * scale).toFixed(1);
  return `<g opacity=".92">` +
    `<ellipse cx="${cx}" cy="${cy}" rx="${s(56)}" ry="${s(24)}" fill="${CLOUD}"/>` +
    `<ellipse cx="${cx - 34 * scale}" cy="${cy + 8 * scale}" rx="${s(34)}" ` +
    `ry="${s(17)}" fill="${CLOUD}"/>` +
    `<ellipse cx="${cx + 38 * scale}" cy="${cy + 9 * scale}" rx="${s(30)}" ` +
    `ry="${s(15)}" fill="${CLOUD}"/>` +
    `</g>`;
}

function grassGround({ path = true } = {}) {
  const parts = [
    `<rect x="0" y="400" width="${SCENE_W}" height="${SCENE_H - 400}" ` +
    `fill="${GRASS}"/>`,
    `<rect x="0" y="400" width="${SCENE_W}" height="10" ` +
    `fill="${GRASS_DARK}" opacity=".45"/>`
  ];
  if (path) {
    parts.push(
      `<path d="M330 520 Q400 448 500 444 Q600 448 670 520 Z" ` +
      `fill="${PATH}"/>`,
      `<path d="M356 520 Q430 460 500 457 Q570 460 644 520 Z" ` +
      `fill="${PATH_DARK}" opacity=".4"/>`
    );
  }
  return parts.join("");
}

function roundTree(cx, baseY, scale = 1) {
  const s = value => (value * scale).toFixed(1);
  return `<rect x="${(cx - 9 * scale).toFixed(1)}" ` +
    `y="${(baseY - 46 * scale).toFixed(1)}" width="${s(18)}" ` +
    `height="${s(48)}" rx="${s(8)}" fill="${TRUNK}"/>` +
    `<circle cx="${cx}" cy="${(baseY - 74 * scale).toFixed(1)}" ` +
    `r="${s(42)}" fill="${TREE_LEAF}"/>` +
    `<circle cx="${(cx - 26 * scale).toFixed(1)}" ` +
    `cy="${(baseY - 56 * scale).toFixed(1)}" r="${s(28)}" ` +
    `fill="${TREE_LEAF_DARK}"/>` +
    `<circle cx="${(cx + 27 * scale).toFixed(1)}" ` +
    `cy="${(baseY - 58 * scale).toFixed(1)}" r="${s(26)}" ` +
    `fill="${TREE_LEAF}"/>`;
}

function flag(cx, topY, colour = RED) {
  return `<line x1="${cx}" y1="${topY}" x2="${cx}" y2="${topY - 44}" ` +
    `stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<path d="M${cx} ${topY - 44} l34 10 l-34 10 Z" fill="${colour}"/>`;
}

// 동물원 (대공원) — the arch gate, an elephant swinging its trunk, a giraffe
// behind the fence, flamingos in a pond and balloon trees.
function zooScene() {
  const elephant = `<g class="subway-arrived-anim-trunk">` +
    // trunk drawn first so the head overlaps its root; it swings as a group
    `<path d="M318 404 q-26 26 -12 56 q8 16 26 12" fill="none" ` +
    `stroke="#8d95a0" stroke-width="20" stroke-linecap="round"/>` +
    `</g>` +
    `<g>` +
    `<ellipse cx="402" cy="416" rx="86" ry="62" fill="#a5aeb9"/>` +
    `<rect x="352" y="446" width="26" height="44" rx="12" fill="#8d95a0"/>` +
    `<rect x="424" y="446" width="26" height="44" rx="12" fill="#8d95a0"/>` +
    `<circle cx="330" cy="386" r="44" fill="#a5aeb9"/>` +
    `<ellipse cx="298" cy="366" rx="24" ry="30" fill="#8d95a0"/>` +
    `<circle cx="322" cy="378" r="5.5" fill="${INK}"/>` +
    `<path d="M334 398 q8 6 16 2" fill="none" stroke="${INK}" ` +
    `stroke-width="3.4" stroke-linecap="round"/>` +
    `<path d="M416 372 q10 -22 30 -18" fill="none" stroke="#8d95a0" ` +
    `stroke-width="9" stroke-linecap="round"/>` +
    `</g>`;
  const giraffe = `<g>` +
    `<rect x="700" y="332" width="18" height="96" rx="9" fill="${YELLOW}"/>` +
    `<ellipse cx="726" cy="428" rx="52" ry="34" fill="${YELLOW}"/>` +
    `<circle cx="702" cy="318" r="20" fill="${YELLOW}"/>` +
    `<rect x="688" y="292" width="7" height="18" rx="3.5" fill="${TRUNK}"/>` +
    `<rect x="704" y="290" width="7" height="18" rx="3.5" fill="${TRUNK}"/>` +
    `<circle cx="695" cy="315" r="4.4" fill="${INK}"/>` +
    `<circle cx="712" cy="344" r="6" fill="#d99b2b"/>` +
    `<circle cx="705" cy="372" r="7" fill="#d99b2b"/>` +
    `<circle cx="738" cy="414" r="8" fill="#d99b2b"/>` +
    `<circle cx="714" cy="436" r="7" fill="#d99b2b"/>` +
    `<rect x="694" y="446" width="14" height="42" rx="7" fill="${YELLOW}"/>` +
    `<rect x="748" y="446" width="14" height="42" rx="7" fill="${YELLOW}"/>` +
    `</g>`;
  const fence = Array.from({ length: 7 }, (unused, index) =>
    `<rect x="${648 + index * 26}" y="404" width="8" height="66" rx="4" ` +
    `fill="${TRUNK}"/>`
  ).join("") +
    `<rect x="640" y="416" width="188" height="9" rx="4.5" fill="#6d452b"/>` +
    `<rect x="640" y="446" width="188" height="9" rx="4.5" fill="#6d452b"/>`;
  const pond = `<ellipse cx="150" cy="486" rx="108" ry="26" fill="${WATER}"/>` +
    `<ellipse cx="150" cy="486" rx="76" ry="16" fill="${WATER_DEEP}" ` +
    `opacity=".4"/>` +
    `<g class="subway-arrived-anim-flamingo">` +
    `<line x1="128" y1="482" x2="128" y2="446" stroke="${PINK}" ` +
    `stroke-width="5"/>` +
    `<ellipse cx="136" cy="438" rx="16" ry="12" fill="${PINK}"/>` +
    `<path d="M124 434 q-12 -12 -2 -22 q10 -8 16 4" fill="${PINK}"/>` +
    `<circle cx="116" cy="416" r="3" fill="${INK}"/>` +
    `<line x1="176" y1="482" x2="176" y2="452" stroke="${PINK}" ` +
    `stroke-width="5"/>` +
    `<ellipse cx="184" cy="444" rx="14" ry="11" fill="${PINK}"/>` +
    `</g>`;
  const gate = `<rect x="452" y="238" width="20" height="132" rx="9" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="560" y="238" width="20" height="132" rx="9" ` +
    `fill="${STONE_DARK}"/>` +
    `<path d="M440 258 Q516 190 592 258 L592 236 Q516 168 440 236 Z" ` +
    `fill="${NIGHT_GREEN}"/>` +
    `<rect x="466" y="230" width="100" height="34" rx="17" fill="${PAPER}"/>` +
    `<text x="516" y="254" text-anchor="middle" font-size="24" ` +
    `font-weight="900" fill="${INK}">동물원</text>`;
  return stage("zoo", [
    skyBand(),
    sun(),
    cloud(180, 96), cloud(620, 66, 0.8),
    `<path d="M0 352 Q160 306 330 348 Q560 300 760 346 Q900 320 1000 348 ` +
    `L1000 400 L0 400 Z" fill="${TREE_LEAF}" opacity=".55"/>`,
    grassGround(),
    roundTree(64, 420, 1.05),
    roundTree(936, 424, 0.9),
    pond,
    fence,
    giraffe,
    gate,
    // shifted left so the hero party on the path never stands on the elephant
    `<g transform="translate(-92 0)">${elephant}</g>`,
    flag(452, 238, RED),
    flag(580, 238, YELLOW)
  ].join(""));
}

// 한강공원 (여의나루) — the wide river with shimmering sun glints, an arched
// bridge in the distance, a duck boat, picnic mat and tent, bikes and kites.
function hanriverScene() {
  const river = `<rect x="0" y="330" width="${SCENE_W}" height="70" ` +
    `fill="${WATER}"/>` +
    `<rect x="0" y="386" width="${SCENE_W}" height="14" fill="${WATER_DEEP}" ` +
    `opacity=".35"/>`;
  const arches = [96, 296, 496, 696].map(x =>
    `<path d="M${x + 14} 376 Q${x + 107} 334 ${x + 200} 376" fill="none" ` +
    `stroke="${STONE_DARK}" stroke-width="7"/>`
  ).join("");
  const bridge = `<rect x="0" y="326" width="${SCENE_W}" height="4" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="0" y="330" width="${SCENE_W}" height="12" fill="${STONE}"/>` +
    [96, 296, 496, 696, 896].map(x =>
      `<rect x="${x}" y="342" width="14" height="36" fill="${STONE_DARK}"/>`
    ).join("") +
    arches;
  const glints = `<g class="subway-arrived-anim-shimmer">` +
    [[60, 354], [190, 366], [320, 352], [430, 378], [560, 356],
      [640, 384], [720, 352], [900, 368]].map(([x, y]) =>
      `<rect x="${x}" y="${y}" width="26" height="6" rx="3" ` +
      `fill="${PAPER}" opacity=".8"/>`
    ).join("") +
    `</g>`;
  const duckBoat = `<ellipse cx="806" cy="392" rx="48" ry="8" ` +
    `fill="${WATER_DEEP}" opacity=".4"/>` +
    `<ellipse cx="800" cy="378" rx="44" ry="20" fill="${YELLOW}"/>` +
    `<ellipse cx="812" cy="374" rx="18" ry="11" fill="${SUN}"/>` +
    `<circle cx="766" cy="352" r="16" fill="${YELLOW}"/>` +
    `<path d="M750 348 l-15 5 l15 6 Z" fill="${ORANGE}"/>` +
    `<circle cx="762" cy="348" r="3.5" fill="${INK}"/>`;
  const kites = `<g class="subway-arrived-anim-float">` +
    `<path d="M240 96 l26 34 l-26 34 l-26 -34 Z" fill="${RED}"/>` +
    `<line x1="240" y1="96" x2="240" y2="164" stroke="${INK}" ` +
    `stroke-width="2.5"/>` +
    `<path d="M240 164 q10 30 -6 52" fill="none" stroke="${RED}" ` +
    `stroke-width="3"/>` +
    `<circle cx="242" cy="192" r="5" fill="${YELLOW}"/>` +
    `<path d="M348 150 l20 26 l-20 26 l-20 -26 Z" fill="${PURPLE}"/>` +
    `<path d="M348 202 q8 22 -6 40" fill="none" stroke="${PURPLE}" ` +
    `stroke-width="3"/>` +
    `<circle cx="345" cy="224" r="4" fill="${PINK}"/>` +
    `</g>`;
  const picnic = `<path d="M52 470 L116 384 L180 470 Z" fill="${ORANGE}"/>` +
    `<path d="M92 470 L116 412 L140 470 Z" fill="${PATH}"/>` +
    `<rect x="196" y="436" width="128" height="50" rx="10" ` +
    `fill="${PAPER}"/>` +
    `<rect x="222" y="436" width="14" height="50" fill="${RED}" ` +
    `opacity=".45"/>` +
    `<rect x="272" y="436" width="14" height="50" fill="${RED}" ` +
    `opacity=".45"/>` +
    `<circle cx="308" cy="430" r="10" fill="${TRUNK}"/>`;
  const bike = x =>
    `<circle cx="${x}" cy="466" r="17" fill="none" stroke="${INK}" ` +
    `stroke-width="5"/>` +
    `<circle cx="${x + 56}" cy="466" r="17" fill="none" stroke="${INK}" ` +
    `stroke-width="5"/>` +
    `<path d="M${x} 466 L${x + 24} 434 L${x + 56} 466 L${x + 28} 466 ` +
    `L${x + 12} 440" fill="none" stroke="${INK}" stroke-width="4"/>` +
    `<line x1="${x + 8}" y1="434" x2="${x + 18}" y2="434" ` +
    `stroke="${INK}" stroke-width="5" stroke-linecap="round"/>` +
    `<line x1="${x + 52}" y1="430" x2="${x + 62}" y2="436" ` +
    `stroke="${INK}" stroke-width="5" stroke-linecap="round"/>`;
  const rack = `<rect x="702" y="430" width="216" height="8" rx="4" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="708" y="430" width="8" height="42" fill="${STONE_DARK}"/>` +
    `<rect x="904" y="430" width="8" height="42" fill="${STONE_DARK}"/>`;
  const sign = `<rect x="436" y="296" width="128" height="34" rx="16" ` +
    `fill="${PAPER}"/>` +
    `<text x="500" y="320" text-anchor="middle" font-size="22" ` +
    `font-weight="900" fill="${INK}">한강공원</text>`;
  return stage("hanriver", [
    skyBand(),
    sun(),
    cloud(120, 70), cloud(560, 90, 0.85),
    river,
    bridge,
    glints,
    duckBoat,
    kites,
    grassGround(),
    picnic,
    rack,
    bike(740), bike(840),
    sign
  ].join(""));
}

// 하늘공원 (월드컵경기장) — the tall grass hill with its winding stair path,
// swaying silver pampas tufts, wind turbines and the stadium bowl far off.
function skyparkScene() {
  // place accent: silver 억새 plume
  const SUSUKI = "#efe6cf";
  const stadium = `<path d="M46 400 L74 344 Q160 316 246 344 L274 400 Z" ` +
    `fill="${STONE}"/>` +
    `<path d="M74 344 Q160 316 246 344 L246 354 Q160 328 74 354 Z" ` +
    `fill="${STONE_DARK}"/>` +
    [104, 140, 180, 216].map(x =>
      `<line x1="${x}" y1="330" x2="${x}" y2="304" ` +
      `stroke="${STONE_DARK}" stroke-width="4" stroke-linecap="round"/>`
    ).join("");
  const hill = `<path d="M672 520 Q700 430 756 352 Q816 272 908 258 ` +
    `Q1000 248 1000 268 L1000 520 Z" fill="${GRASS}"/>` +
    `<path d="M672 520 Q700 430 756 352 Q816 272 908 258 Q940 254 962 258 ` +
    `Q880 276 806 356 Q744 428 722 520 Z" fill="${GRASS_DARK}" ` +
    `opacity=".4"/>`;
  const stairs = `<path d="M714 516 Q770 480 806 444 Q756 420 800 376 ` +
    `Q836 340 876 316" fill="none" stroke="${PATH}" stroke-width="18" ` +
    `stroke-linecap="round"/>` +
    [[758, 480], [798, 448], [778, 412], [816, 376], [852, 344],
      [872, 320]].map(([x, y]) =>
      `<line x1="${x - 8}" y1="${y}" x2="${x + 8}" y2="${y}" ` +
      `stroke="${PATH_DARK}" stroke-width="3.5"/>`
    ).join("") +
    `<ellipse cx="888" cy="310" rx="26" ry="8" fill="${PATH}"/>`;
  const rotor = (cx, cy, r) => [0, 120, 240].map(a =>
    `<ellipse cx="${cx}" cy="${cy - r}" rx="6" ry="${r}" fill="${PAPER}" ` +
    `transform="rotate(${a} ${cx} ${cy})"/>`
  ).join("");
  const turbines = `<rect x="895" y="184" width="10" height="82" rx="5" ` +
    `fill="${PAPER}"/>` +
    `<g class="subway-arrived-anim-wheel">` +
    rotor(900, 180, 30) +
    `<circle cx="900" cy="180" r="8" fill="${STONE_DARK}"/>` +
    `</g>` +
    `<rect x="756" y="268" width="8" height="84" rx="4" fill="${PAPER}"/>` +
    rotor(760, 264, 20) +
    `<circle cx="760" cy="264" r="6" fill="${STONE_DARK}"/>`;
  const tuft = (x, y) =>
    `<path d="M${x} ${y} q-2 -30 4 -46" fill="none" ` +
    `stroke="${PATH_DARK}" stroke-width="4" stroke-linecap="round"/>` +
    `<ellipse cx="${x + 5}" cy="${y - 54}" rx="6" ry="15" ` +
    `fill="${SUSUKI}" transform="rotate(8 ${x + 5} ${y - 54})"/>` +
    `<path d="M${x + 12} ${y} q4 -22 -2 -36" fill="none" ` +
    `stroke="${PATH_DARK}" stroke-width="3.5" stroke-linecap="round"/>` +
    `<ellipse cx="${x + 9}" cy="${y - 43}" rx="5" ry="12" ` +
    `fill="${SUSUKI}" transform="rotate(-10 ${x + 9} ${y - 43})"/>`;
  const tufts = `<g class="subway-arrived-anim-bob">` +
    tuft(118, 486) + tuft(170, 504) + tuft(716, 486) + tuft(768, 508) +
    tuft(884, 396) + tuft(944, 352) +
    `</g>`;
  const sign = `<rect x="234" y="432" width="12" height="58" rx="6" ` +
    `fill="${TRUNK}"/>` +
    `<rect x="167" y="398" width="146" height="40" rx="14" ` +
    `fill="${PAPER}"/>` +
    `<text x="240" y="426" text-anchor="middle" font-size="22" ` +
    `font-weight="900" fill="${INK}">하늘공원</text>`;
  return stage("skypark", [
    skyBand(),
    sun(),
    cloud(360, 84), cloud(600, 130, 0.7),
    stadium,
    grassGround(),
    hill,
    stairs,
    turbines,
    tufts,
    sign
  ].join(""));
}

// 어린이대공원 — a playground: rainbow gate, swings, slide, seesaw, a small
// fountain, spinning pinwheels and drifting balloons.
function childparkScene() {
  const gate = `<path d="M420 268 Q500 190 580 268" fill="none" ` +
    `stroke="${RED}" stroke-width="12"/>` +
    `<path d="M436 272 Q500 208 564 272" fill="none" ` +
    `stroke="${YELLOW}" stroke-width="12"/>` +
    `<path d="M452 276 Q500 226 548 276" fill="none" ` +
    `stroke="${NIGHT_GREEN}" stroke-width="12"/>` +
    `<rect x="436" y="268" width="16" height="106" rx="8" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="548" y="268" width="16" height="106" rx="8" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="414" y="228" width="172" height="36" rx="18" ` +
    `fill="${PAPER}"/>` +
    `<text x="500" y="254" text-anchor="middle" font-size="21" ` +
    `font-weight="900" fill="${INK}">어린이대공원</text>`;
  const swings = `<path d="M96 470 L128 386 L160 470" fill="none" ` +
    `stroke="${TRUNK}" stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M208 470 L240 386 L272 470" fill="none" ` +
    `stroke="${TRUNK}" stroke-width="8" stroke-linecap="round"/>` +
    `<rect x="120" y="382" width="128" height="9" rx="4.5" ` +
    `fill="${TRUNK}"/>` +
    `<line x1="150" y1="391" x2="150" y2="446" stroke="${INK}" ` +
    `stroke-width="3"/>` +
    `<line x1="172" y1="391" x2="172" y2="446" stroke="${INK}" ` +
    `stroke-width="3"/>` +
    `<rect x="142" y="446" width="38" height="9" rx="4.5" fill="${RED}"/>` +
    `<line x1="200" y1="391" x2="200" y2="438" stroke="${INK}" ` +
    `stroke-width="3"/>` +
    `<line x1="222" y1="391" x2="222" y2="438" stroke="${INK}" ` +
    `stroke-width="3"/>` +
    `<rect x="192" y="438" width="38" height="9" rx="4.5" ` +
    `fill="${YELLOW}"/>`;
  const slide = `<rect x="716" y="392" width="7" height="84" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="742" y="392" width="7" height="84" fill="${STONE_DARK}"/>` +
    [412, 434, 456].map(y =>
      `<line x1="716" y1="${y}" x2="749" y2="${y}" ` +
      `stroke="${STONE_DARK}" stroke-width="4"/>`
    ).join("") +
    `<rect x="710" y="382" width="66" height="12" rx="6" ` +
    `fill="${PURPLE}"/>` +
    `<path d="M770 392 Q824 428 850 472" fill="none" stroke="${RED}" ` +
    `stroke-width="22" stroke-linecap="round"/>` +
    `<path d="M770 392 Q824 428 850 472" fill="none" stroke="${YELLOW}" ` +
    `stroke-width="7" stroke-linecap="round"/>` +
    `<rect x="806" y="432" width="7" height="44" fill="${STONE_DARK}"/>`;
  const seesaw = `<path d="M906 470 l16 -28 l16 28 Z" fill="${ORANGE}"/>` +
    `<rect x="856" y="432" width="132" height="10" rx="5" ` +
    `fill="${PURPLE}" transform="rotate(-8 922 442)"/>` +
    `<circle cx="864" cy="446" r="5" fill="${INK}"/>` +
    `<circle cx="980" cy="430" r="5" fill="${INK}"/>`;
  const fountain = `<ellipse cx="500" cy="388" rx="58" ry="11" ` +
    `fill="${STONE}"/>` +
    `<ellipse cx="500" cy="384" rx="48" ry="8" fill="${WATER}"/>` +
    `<rect x="492" y="352" width="16" height="32" fill="${STONE_DARK}"/>` +
    `<ellipse cx="500" cy="350" rx="22" ry="6" fill="${STONE}"/>` +
    `<rect x="496" y="326" width="8" height="24" rx="4" ` +
    `fill="${WATER_DEEP}"/>` +
    [[480, 336], [520, 336], [470, 352], [530, 352]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="3.5" fill="${WATER_DEEP}"/>`
    ).join("");
  const petal = (cx, cy, r, colour, a) =>
    `<path d="M${cx} ${cy} l${-r} ${-r * 0.55} l${r * 0.1} ${-r * 0.55} Z" ` +
    `fill="${colour}" transform="rotate(${a} ${cx} ${cy})"/>`;
  const pinwheelHead = (cx, cy, r, c1, c2) =>
    petal(cx, cy, r, c1, 0) + petal(cx, cy, r, c2, 90) +
    petal(cx, cy, r, c1, 180) + petal(cx, cy, r, c2, 270) +
    `<circle cx="${cx}" cy="${cy}" r="${(r * 0.28).toFixed(1)}" ` +
    `fill="${INK}"/>`;
  const pinwheels = `<rect x="259" y="428" width="6" height="60" rx="3" ` +
    `fill="${TRUNK}"/>` +
    `<rect x="290" y="418" width="6" height="72" rx="3" ` +
    `fill="${TRUNK}"/>` +
    `<rect x="315" y="434" width="6" height="56" rx="3" ` +
    `fill="${TRUNK}"/>` +
    pinwheelHead(262, 422, 15, RED, YELLOW) +
    pinwheelHead(318, 428, 13, PINK, PURPLE) +
    `<g class="subway-arrived-anim-wheel">` +
    pinwheelHead(293, 406, 20, ORANGE, NIGHT_GREEN) +
    `</g>`;
  const balloons = `<g class="subway-arrived-anim-float">` +
    `<ellipse cx="700" cy="190" rx="15" ry="18" fill="${RED}"/>` +
    `<path d="M700 208 q-5 24 4 42" fill="none" stroke="${INK}" ` +
    `stroke-width="2"/>` +
    `<ellipse cx="736" cy="148" rx="14" ry="17" fill="${YELLOW}"/>` +
    `<path d="M736 165 q-5 24 4 42" fill="none" stroke="${INK}" ` +
    `stroke-width="2"/>` +
    `<ellipse cx="768" cy="206" rx="13" ry="16" fill="${NIGHT_GREEN}"/>` +
    `<path d="M768 222 q-5 22 4 40" fill="none" stroke="${INK}" ` +
    `stroke-width="2"/>` +
    `</g>`;
  return stage("childpark", [
    skyBand(),
    sun(),
    cloud(160, 90), cloud(620, 70, 0.8),
    `<path d="M0 356 Q140 316 300 352 Q560 306 780 350 Q910 326 1000 352 ` +
    `L1000 400 L0 400 Z" fill="${TREE_LEAF}" opacity=".5"/>`,
    grassGround(),
    fountain,
    gate,
    swings,
    slide,
    seesaw,
    pinwheels,
    balloons
  ].join(""));
}

// 석촌호수 — the lake with the supertall tower rising behind it, cherry
// blossom trees dropping petals, swan boats and a row of little ducks.
function lakeScene() {
  // place accents: cherry blossom pinks
  const BLOSSOM = "#f7c8da";
  const BLOSSOM_DEEP = "#f09ec0";
  const tower = `<path d="M760 400 Q772 250 790 120 L796 58 L800 72 ` +
    `L804 58 L810 120 Q828 250 840 400 Z" fill="${STONE}"/>` +
    `<path d="M797 120 Q800 250 800 400" fill="none" ` +
    `stroke="${STONE_DARK}" stroke-width="3" opacity=".6"/>` +
    `<line x1="784" y1="180" x2="816" y2="180" stroke="${STONE_DARK}" ` +
    `stroke-width="2.5" opacity=".5"/>` +
    `<line x1="778" y1="250" x2="822" y2="250" stroke="${STONE_DARK}" ` +
    `stroke-width="2.5" opacity=".5"/>` +
    `<line x1="772" y1="320" x2="828" y2="320" stroke="${STONE_DARK}" ` +
    `stroke-width="2.5" opacity=".5"/>` +
    `<rect x="744" y="388" width="112" height="12" rx="4" ` +
    `fill="${STONE_DARK}"/>`;
  const lake = `<ellipse cx="500" cy="386" rx="470" ry="46" ` +
    `fill="${WATER}"/>` +
    `<ellipse cx="500" cy="390" rx="360" ry="30" fill="${WATER_DEEP}" ` +
    `opacity=".3"/>`;
  const swans = `<g class="subway-arrived-anim-drift">` +
    `<rect x="386" y="376" width="54" height="10" rx="5" fill="${RED}"/>` +
    `<ellipse cx="412" cy="368" rx="30" ry="16" fill="${PAPER}"/>` +
    `<path d="M390 364 q-14 -18 0 -30" fill="none" stroke="${PAPER}" ` +
    `stroke-width="9" stroke-linecap="round"/>` +
    `<path d="M384 330 l-13 4 l13 5 Z" fill="${ORANGE}"/>` +
    `<circle cx="391" cy="332" r="2.6" fill="${INK}"/>` +
    `<rect x="572" y="366" width="48" height="9" rx="4.5" ` +
    `fill="${YELLOW}"/>` +
    `<ellipse cx="596" cy="358" rx="26" ry="14" fill="${PAPER}"/>` +
    `<path d="M576 354 q-12 -16 0 -26" fill="none" stroke="${PAPER}" ` +
    `stroke-width="8" stroke-linecap="round"/>` +
    `<path d="M571 324 l-12 4 l12 4 Z" fill="${ORANGE}"/>` +
    `<circle cx="578" cy="326" r="2.4" fill="${INK}"/>` +
    `</g>`;
  const duckRow = [[676, 388, 1], [706, 392, 0.85], [734, 388, 0.75]]
    .map(([x, y, s]) =>
      `<ellipse cx="${x}" cy="${y}" rx="${(11 * s).toFixed(1)}" ` +
      `ry="${(7 * s).toFixed(1)}" fill="${YELLOW}"/>` +
      `<circle cx="${(x - 9 * s).toFixed(1)}" cy="${(y - 8 * s).toFixed(1)}" ` +
      `r="${(5.5 * s).toFixed(1)}" fill="${YELLOW}"/>` +
      `<path d="M${(x - 14 * s).toFixed(1)} ${(y - 9 * s).toFixed(1)} ` +
      `l-6 2 l6 3 Z" fill="${ORANGE}"/>`
    ).join("");
  const cherry = (cx, baseY, s) =>
    `<rect x="${(cx - 8 * s).toFixed(1)}" ` +
    `y="${(baseY - 44 * s).toFixed(1)}" width="${(16 * s).toFixed(1)}" ` +
    `height="${(46 * s).toFixed(1)}" rx="${(7 * s).toFixed(1)}" ` +
    `fill="${TRUNK}"/>` +
    `<circle cx="${cx}" cy="${(baseY - 72 * s).toFixed(1)}" ` +
    `r="${(40 * s).toFixed(1)}" fill="${BLOSSOM}"/>` +
    `<circle cx="${(cx - 26 * s).toFixed(1)}" ` +
    `cy="${(baseY - 54 * s).toFixed(1)}" r="${(26 * s).toFixed(1)}" ` +
    `fill="${BLOSSOM_DEEP}"/>` +
    `<circle cx="${(cx + 26 * s).toFixed(1)}" ` +
    `cy="${(baseY - 56 * s).toFixed(1)}" r="${(24 * s).toFixed(1)}" ` +
    `fill="${BLOSSOM}"/>`;
  const petals = `<g class="subway-arrived-anim-float">` +
    [[70, 330], [150, 300], [250, 362], [120, 420], [210, 452],
      [878, 340], [938, 300], [968, 402], [906, 452]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="3.5" fill="${BLOSSOM_DEEP}"/>`
    ).join("") +
    `</g>`;
  const sign = `<rect x="262" y="436" width="12" height="56" rx="6" ` +
    `fill="${TRUNK}"/>` +
    `<rect x="208" y="402" width="120" height="40" rx="14" ` +
    `fill="${PAPER}"/>` +
    `<text x="268" y="430" text-anchor="middle" font-size="22" ` +
    `font-weight="900" fill="${INK}">석촌호수</text>`;
  return stage("lake", [
    skyBand(),
    sun(150, 90),
    cloud(320, 70), cloud(600, 120, 0.75),
    tower,
    lake,
    swans,
    duckRow,
    grassGround(),
    cherry(96, 428, 1.1),
    cherry(190, 412, 0.75),
    cherry(906, 430, 1),
    cherry(962, 448, 0.65),
    petals,
    sign
  ].join(""));
}

// 국회의사당 — the wide white colonnade with its teal dome, broad steps,
// stone haetae guardians and a shimmering sliver of the 한강 behind.
function assemblyScene() {
  // place accent: the assembly dome teal
  const DOME_TEAL = "#4f9e8f";
  const riverSliver = `<rect x="0" y="330" width="${SCENE_W}" height="8" ` +
    `fill="${GRASS_DARK}" opacity=".5"/>` +
    `<rect x="0" y="338" width="${SCENE_W}" height="30" fill="${WATER}"/>` +
    `<rect x="0" y="360" width="${SCENE_W}" height="8" ` +
    `fill="${WATER_DEEP}" opacity=".35"/>` +
    `<rect x="0" y="368" width="${SCENE_W}" height="32" fill="${GRASS}"/>`;
  const glints = `<g class="subway-arrived-anim-shimmer">` +
    [[80, 344], [220, 354], [420, 344], [600, 352], [780, 344],
      [920, 354]].map(([x, y]) =>
      `<rect x="${x}" y="${y}" width="22" height="5" rx="2.5" ` +
      `fill="${PAPER}" opacity=".8"/>`
    ).join("") +
    `</g>`;
  const building = `<path d="M404 302 Q404 216 500 216 Q596 216 596 302 Z" ` +
    `fill="${DOME_TEAL}"/>` +
    `<circle cx="500" cy="212" r="6" fill="${DOME_TEAL}"/>` +
    `<rect x="392" y="296" width="216" height="12" rx="6" ` +
    `fill="${PAPER}"/>` +
    `<rect x="258" y="340" width="72" height="38" fill="${PAPER}"/>` +
    `<rect x="670" y="340" width="72" height="38" fill="${PAPER}"/>` +
    `<rect x="322" y="306" width="356" height="12" fill="${STONE}"/>` +
    `<rect x="330" y="318" width="340" height="60" fill="${PAPER}"/>` +
    `<text x="500" y="340" text-anchor="middle" font-size="21" ` +
    `font-weight="900" fill="${INK}">국회의사당</text>` +
    Array.from({ length: 9 }, (unused, index) =>
      `<rect x="${348 + index * 36}" y="346" width="14" height="32" ` +
      `fill="${STONE}"/>`
    ).join("") +
    `<rect x="322" y="376" width="356" height="8" fill="${STONE_DARK}"/>` +
    `<rect x="346" y="384" width="308" height="6" fill="${STONE}"/>` +
    `<rect x="332" y="390" width="336" height="5" ` +
    `fill="${STONE_DARK}" opacity=".6"/>` +
    `<rect x="318" y="395" width="364" height="5" fill="${STONE}"/>`;
  const haetae = (cx, dir) =>
    `<rect x="${cx - 34}" y="452" width="68" height="26" rx="8" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="${cx - 22}" y="442" width="12" height="14" rx="5" ` +
    `fill="${STONE}"/>` +
    `<rect x="${cx + 10}" y="442" width="12" height="14" rx="5" ` +
    `fill="${STONE}"/>` +
    `<ellipse cx="${cx}" cy="${430}" rx="28" ry="19" fill="${STONE}"/>` +
    `<path d="M${cx - dir * 26} 424 q${-dir * 14} -10 ${-dir * 6} -26" ` +
    `fill="none" stroke="${STONE_DARK}" stroke-width="7" ` +
    `stroke-linecap="round"/>` +
    `<circle cx="${cx + dir * 20}" cy="410" r="15" fill="${STONE}"/>` +
    `<circle cx="${cx + dir * 12}" cy="396" r="5" fill="${STONE_DARK}"/>` +
    `<circle cx="${cx + dir * 26}" cy="407" r="3" fill="${INK}"/>` +
    `<path d="M${cx + dir * 24} 417 q${dir * 6} 4 ${dir * 10} 0" ` +
    `fill="none" stroke="${INK}" stroke-width="2.5" ` +
    `stroke-linecap="round"/>`;
  return stage("assembly", [
    skyBand(),
    sun(),
    cloud(150, 80), cloud(660, 62, 0.75),
    riverSliver,
    glints,
    building,
    flag(338, 306, RED),
    flag(662, 306, YELLOW),
    grassGround(),
    haetae(268, 1),
    haetae(732, -1),
    roundTree(84, 432, 1),
    roundTree(930, 436, 0.9)
  ].join(""));
}

// 놀이공원 (잠실) — a big ferris wheel with coloured gondolas, a toy castle
// with pennant flags, bunting strung across the sky and drifting balloons.
function lunaparkScene() {
  const hubX = 185;
  const hubY = 205;
  const radius = 104;
  const cabinColours =
    [RED, YELLOW, NIGHT_GREEN, PINK, PURPLE, ORANGE, WATER_DEEP, SUN];
  const seats = cabinColours.map((colour, index) => {
    const angle = (Math.PI / 4) * index;
    return {
      x: (hubX + radius * Math.cos(angle)).toFixed(1),
      y: (hubY + radius * Math.sin(angle)).toFixed(1),
      colour
    };
  });
  // Integrator note: .subway-arrived-anim-wheel needs
  //   transform-box: fill-box; transform-origin: center;
  // plus a slow rotate keyframe so the wheel spins around its own hub
  // (the group's bounding box is symmetric, so "center" lands on the hub).
  const wheel = `<g class="subway-arrived-anim-wheel">` +
    `<circle cx="${hubX}" cy="${hubY}" r="${radius}" fill="none" ` +
    `stroke="${STONE_DARK}" stroke-width="9"/>` +
    seats.map(seat =>
      `<line x1="${hubX}" y1="${hubY}" x2="${seat.x}" y2="${seat.y}" ` +
      `stroke="${STONE_DARK}" stroke-width="5"/>`
    ).join("") +
    seats.map(seat =>
      `<circle cx="${seat.x}" cy="${seat.y}" r="15" fill="${seat.colour}"/>`
    ).join("") +
    `<circle cx="${hubX}" cy="${hubY}" r="16" fill="${RED}"/>` +
    `<circle cx="${hubX}" cy="${hubY}" r="7" fill="${PAPER}"/>` +
    `</g>`;
  const legs =
    `<path d="M185 208 L134 428" stroke="${STONE_DARK}" stroke-width="13" ` +
    `stroke-linecap="round" fill="none"/>` +
    `<path d="M185 208 L236 428" stroke="${STONE_DARK}" stroke-width="13" ` +
    `stroke-linecap="round" fill="none"/>` +
    `<line x1="156" y1="350" x2="214" y2="350" stroke="${STONE_DARK}" ` +
    `stroke-width="8"/>` +
    `<rect x="116" y="424" width="48" height="14" rx="7" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="222" y="424" width="48" height="14" rx="7" ` +
    `fill="${STONE_DARK}"/>`;
  const castle = `<g>` +
    `<rect x="742" y="302" width="116" height="98" fill="${STONE}"/>` +
    `<rect x="752" y="286" width="20" height="18" fill="${STONE}"/>` +
    `<rect x="790" y="286" width="20" height="18" fill="${STONE}"/>` +
    `<rect x="828" y="286" width="20" height="18" fill="${STONE}"/>` +
    `<rect x="714" y="256" width="36" height="144" fill="${STONE}"/>` +
    `<rect x="850" y="256" width="36" height="144" fill="${STONE}"/>` +
    `<rect x="710" y="250" width="44" height="10" rx="5" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="846" y="250" width="44" height="10" rx="5" ` +
    `fill="${STONE_DARK}"/>` +
    `<path d="M704 252 L732 204 L760 252 Z" fill="${RED}"/>` +
    `<path d="M840 252 L868 204 L896 252 Z" fill="${PINK}"/>` +
    `<line x1="732" y1="204" x2="732" y2="186" stroke="${INK}" ` +
    `stroke-width="3.5"/>` +
    `<path d="M732 186 l22 6 l-22 6 Z" fill="${YELLOW}"/>` +
    `<line x1="868" y1="204" x2="868" y2="186" stroke="${INK}" ` +
    `stroke-width="3.5"/>` +
    `<path d="M868 186 l22 6 l-22 6 Z" fill="${PURPLE}"/>` +
    `<path d="M778 400 v-32 a22 22 0 0 1 44 0 v32 Z" fill="${PURPLE}"/>` +
    `<rect x="760" y="316" width="15" height="24" rx="7.5" ` +
    `fill="${WATER_DEEP}"/>` +
    `<rect x="825" y="316" width="15" height="24" rx="7.5" ` +
    `fill="${WATER_DEEP}"/>` +
    `<circle cx="732" cy="296" r="6.5" fill="${WATER_DEEP}"/>` +
    `<circle cx="868" cy="296" r="6.5" fill="${WATER_DEEP}"/>` +
    `</g>`;
  const pennants = [
    [333, 167, RED], [403, 184, YELLOW], [472, 199, NIGHT_GREEN],
    [540, 213, PINK], [607, 225, PURPLE], [673, 237, ORANGE]
  ].map(([x, y, colour]) =>
    `<path d="M${x - 9} ${y} h18 l-9 18 Z" fill="${colour}"/>`
  ).join("");
  const bunting =
    `<path d="M262 150 Q500 210 716 244" fill="none" stroke="${INK}" ` +
    `stroke-width="3.5" opacity=".65"/>` + pennants;
  const balloon = (cx, cy, colour) =>
    `<ellipse cx="${cx}" cy="${cy}" rx="17" ry="21" fill="${colour}"/>` +
    `<path d="M${cx - 5} ${cy + 20} l5 7 l5 -7 Z" fill="${colour}"/>` +
    `<path d="M${cx} ${cy + 27} q6 20 -3 38" fill="none" stroke="${INK}" ` +
    `stroke-width="2.5" opacity=".6"/>`;
  const balloons = `<g class="subway-arrived-anim-float">` +
    balloon(575, 120, RED) +
    balloon(622, 160, YELLOW) +
    balloon(533, 168, PURPLE) +
    `</g>`;
  const sign =
    `<rect x="432" y="252" width="136" height="42" rx="21" ` +
    `fill="${PAPER}"/>` +
    `<text x="500" y="281" text-anchor="middle" font-size="25" ` +
    `font-weight="900" fill="${INK}">놀이공원</text>`;
  return stage("lunapark", [
    skyBand(),
    sun(),
    cloud(430, 70, 0.85), cloud(720, 130, 0.7),
    `<path d="M0 350 Q180 308 360 346 Q560 302 780 344 Q900 316 1000 346 ` +
    `L1000 400 L0 400 Z" fill="${TREE_LEAF}" opacity=".5"/>`,
    grassGround(),
    `<circle cx="72" cy="486" r="26" fill="${TREE_LEAF}"/>`,
    `<circle cx="100" cy="492" r="18" fill="${TREE_LEAF_DARK}"/>`,
    `<circle cx="912" cy="488" r="24" fill="${TREE_LEAF}"/>`,
    roundTree(950, 430, 0.75),
    legs,
    wheel,
    castle,
    bunting,
    balloons,
    sign
  ].join(""));
}

// 야구장 (종합운동장) — the stadium bowl with tiered stands, floodlight
// towers, a green diamond with white bases and a ball flying out.
function baseballScene() {
  // 야구장 accents: seat blue for the stands, deep green scoreboard screen.
  const SEAT = "#8fb4e4";
  const SCREEN = "#1d4d3b";
  const floodlight = poleX => {
    const headX = poleX - 28;
    return `<rect x="${poleX}" y="196" width="12" height="140" ` +
      `fill="${STONE_DARK}"/>` +
      `<line x1="${poleX - 12}" y1="268" x2="${poleX + 24}" y2="300" ` +
      `stroke="${STONE_DARK}" stroke-width="4"/>` +
      `<line x1="${poleX + 24}" y1="268" x2="${poleX - 12}" y2="300" ` +
      `stroke="${STONE_DARK}" stroke-width="4"/>` +
      `<rect x="${headX}" y="166" width="68" height="32" rx="8" ` +
      `fill="${INK}"/>`;
  };
  const bulbs = [134, 152, 170, 830, 848, 866].map(cx =>
    `<circle cx="${cx}" cy="182" r="6" fill="${SUN}"/>`
  ).join("");
  const scoreboard =
    `<rect x="438" y="268" width="12" height="50" fill="${INK}"/>` +
    `<rect x="550" y="268" width="12" height="50" fill="${INK}"/>` +
    `<rect x="408" y="200" width="184" height="74" rx="12" ` +
    `fill="${INK}"/>` +
    `<rect x="420" y="212" width="160" height="50" rx="8" ` +
    `fill="${SCREEN}"/>` +
    `<text x="500" y="249" text-anchor="middle" font-size="30" ` +
    `font-weight="900" fill="${SUN}">야구장</text>`;
  const crowd = [
    [300, 310, PAPER], [380, 306, SUN], [460, 303, PINK],
    [540, 303, PAPER], [620, 306, SUN], [700, 310, PINK]
  ].map(([cx, cy, colour]) =>
    `<circle cx="${cx}" cy="${cy}" r="4.5" fill="${colour}" opacity=".9"/>`
  ).join("");
  const base = (cx, cy, size) =>
    `<rect x="${-size / 2}" y="${-size / 2}" width="${size}" ` +
    `height="${size}" transform="translate(${cx} ${cy}) rotate(45)" ` +
    `fill="${PAPER}"/>`;
  const diamond =
    `<path d="M500 342 L564 372 L500 398 L436 372 Z" fill="${PATH}"/>` +
    `<path d="M500 352 L550 372 L500 390 L450 372 Z" fill="${GRASS}"/>` +
    `<circle cx="500" cy="372" r="6.5" fill="${PATH_DARK}"/>` +
    base(500, 346, 11) + base(560, 372, 11) + base(440, 372, 11) +
    base(500, 394, 12);
  const ball =
    `<path d="M560 336 Q700 100 868 144" fill="none" stroke="${PAPER}" ` +
    `stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" ` +
    `opacity=".9"/>` +
    `<circle cx="868" cy="144" r="13" fill="${PAPER}" ` +
    `stroke="${STONE_DARK}" stroke-width="2.5"/>` +
    `<path d="M862 136 q6 8 0 16" fill="none" stroke="${RED}" ` +
    `stroke-width="2.5" stroke-linecap="round"/>` +
    `<path d="M874 136 q-6 8 0 16" fill="none" stroke="${RED}" ` +
    `stroke-width="2.5" stroke-linecap="round"/>`;
  return stage("baseball", [
    skyBand(),
    sun(96, 84, 40),
    cloud(300, 80, 0.85), cloud(640, 62, 0.75),
    floodlight(146),
    floodlight(842),
    `<g class="subway-arrived-anim-shimmer">${bulbs}</g>`,
    scoreboard,
    `<path d="M96 400 L120 310 Q500 272 880 310 L904 400 Z" ` +
    `fill="${STONE}"/>`,
    `<path d="M120 312 Q500 274 880 312 L872 336 Q500 300 128 336 Z" ` +
    `fill="${SEAT}"/>`,
    `<path d="M136 356 Q500 322 864 356 L856 380 Q500 346 144 380 Z" ` +
    `fill="${SEAT}" opacity=".75"/>`,
    crowd,
    `<ellipse cx="500" cy="398" rx="330" ry="48" fill="${NIGHT_GREEN}"/>`,
    diamond,
    `<rect x="96" y="390" width="808" height="10" fill="${STONE_DARK}"/>`,
    grassGround(),
    roundTree(56, 424, 0.9),
    roundTree(944, 428, 0.85),
    ball
  ].join(""));
}

// 경복궁 — a two-tier 기와지붕 palace gate on a stone base with an arched
// door, 단청 bands, side walls, a stone path and a 소나무 pine.
function palaceScene() {
  // 경복궁 accents: 기와 slate, its shadowed ridge, 석간주 red woodwork.
  const GIWA = "#5a6a85";
  const GIWA_DARK = "#42506b";
  const WOOD_RED = "#b0473c";
  const sideWall = x =>
    `<rect x="${x}" y="354" width="384" height="46" fill="${STONE}"/>` +
    `<rect x="${x}" y="374" width="384" height="4" fill="${STONE_DARK}" ` +
    `opacity=".4"/>` +
    `<rect x="${x}" y="342" width="384" height="14" rx="7" ` +
    `fill="${GIWA}"/>`;
  const gateBase =
    `<rect x="380" y="300" width="240" height="100" fill="${STONE}"/>` +
    [328, 356, 382].map(y =>
      `<rect x="388" y="${y}" width="224" height="3" rx="1.5" ` +
      `fill="${STONE_DARK}" opacity=".45"/>`
    ).join("") +
    `<path d="M462 400 v-48 a38 38 0 0 1 76 0 v48 Z" fill="${INK}"/>` +
    `<rect x="468" y="358" width="31" height="42" rx="3" ` +
    `fill="${WOOD_RED}"/>` +
    `<rect x="501" y="358" width="31" height="42" rx="3" ` +
    `fill="${WOOD_RED}"/>` +
    `<circle cx="493" cy="380" r="2.5" fill="${SUN}"/>` +
    `<circle cx="507" cy="380" r="2.5" fill="${SUN}"/>` +
    `<rect x="372" y="290" width="256" height="12" rx="6" ` +
    `fill="${STONE_DARK}"/>`;
  const storeyOne =
    `<rect x="398" y="246" width="204" height="44" fill="${NIGHT_GREEN}"/>` +
    [406, 462, 525, 581].map(x =>
      `<rect x="${x}" y="248" width="13" height="42" fill="${WOOD_RED}"/>`
    ).join("") +
    [440, 500, 559].map(cx =>
      `<circle cx="${cx}" cy="268" r="4" fill="${SUN}"/>`
    ).join("");
  const lowerRoof =
    `<path d="M352 250 Q500 266 648 250 L616 224 Q500 212 386 224 Z" ` +
    `fill="${GIWA}"/>` +
    `<rect x="386" y="210" width="228" height="9" rx="4.5" ` +
    `fill="${GIWA_DARK}"/>`;
  const storeyTwo =
    `<rect x="428" y="172" width="144" height="42" fill="${NIGHT_GREEN}"/>` +
    `<rect x="434" y="174" width="10" height="40" fill="${WOOD_RED}"/>` +
    `<rect x="556" y="174" width="10" height="40" fill="${WOOD_RED}"/>`;
  const upperRoof =
    `<path d="M404 178 Q500 188 596 178 L568 152 Q500 142 432 152 Z" ` +
    `fill="${GIWA}"/>` +
    `<rect x="432" y="143" width="136" height="9" rx="4.5" ` +
    `fill="${GIWA_DARK}"/>` +
    `<circle cx="500" cy="138" r="7" fill="${GIWA_DARK}"/>`;
  const nameBoard =
    `<rect x="459" y="186" width="82" height="28" rx="4" fill="${INK}" ` +
    `stroke="${SUN}" stroke-width="2.5"/>` +
    `<text x="500" y="207" text-anchor="middle" font-size="20" ` +
    `font-weight="900" fill="${PAPER}">경복궁</text>`;
  const pine =
    `<path d="M150 474 q-8 -46 14 -80 q10 -16 2 -26" fill="none" ` +
    `stroke="${TRUNK}" stroke-width="13" stroke-linecap="round"/>` +
    `<path d="M160 420 q26 -4 40 -20" fill="none" stroke="${TRUNK}" ` +
    `stroke-width="8" stroke-linecap="round"/>` +
    `<ellipse cx="162" cy="344" rx="48" ry="20" fill="${NIGHT_GREEN}"/>` +
    `<ellipse cx="116" cy="378" rx="30" ry="13" ` +
    `fill="${TREE_LEAF_DARK}"/>` +
    `<ellipse cx="208" cy="392" rx="30" ry="13" fill="${NIGHT_GREEN}"/>` +
    `<ellipse cx="184" cy="352" rx="26" ry="12" ` +
    `fill="${TREE_LEAF_DARK}"/>`;
  const lantern =
    `<rect x="828" y="464" width="48" height="14" rx="5" ` +
    `fill="${STONE_DARK}"/>` +
    `<rect x="844" y="430" width="16" height="36" fill="${STONE}"/>` +
    `<rect x="832" y="402" width="40" height="30" rx="6" ` +
    `fill="${STONE}"/>` +
    `<circle cx="852" cy="417" r="7.5" fill="${SUN}"/>` +
    `<path d="M824 404 L852 384 L880 404 Z" fill="${STONE_DARK}"/>` +
    `<circle cx="852" cy="382" r="4.5" fill="${STONE_DARK}"/>`;
  return stage("palace", [
    skyBand(),
    sun(870, 90, 42),
    cloud(200, 88),
    `<g class="subway-arrived-anim-float">${cloud(660, 132, 0.8)}</g>`,
    `<path d="M0 356 Q180 296 340 344 Q500 306 660 344 Q830 298 1000 356 ` +
    `L1000 400 L0 400 Z" fill="${STONE_DARK}" opacity=".3"/>`,
    grassGround({ path: false }),
    `<path d="M336 520 Q420 450 500 446 Q580 450 664 520 Z" ` +
    `fill="${STONE}"/>`,
    `<path d="M362 520 Q440 462 500 459 Q560 462 638 520 Z" ` +
    `fill="${STONE_DARK}" opacity=".3"/>`,
    sideWall(0),
    sideWall(616),
    gateBase,
    storeyOne,
    lowerRoof,
    storeyTwo,
    upperRoof,
    nameBoard,
    pine,
    lantern
  ].join(""));
}

// 남산 (명동) — the green mountain with N서울타워 on top, a cable car on
// its line and city rooftops along the horizon.
function namsanScene() {
  const cityBack = [
    [0, 340, 58, 60], [66, 352, 52, 48], [126, 330, 50, 70],
    [872, 342, 54, 58], [934, 330, 60, 70]
  ].map(([x, y, w, h]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
    `fill="${STONE_DARK}" opacity=".38"/>`
  ).join("");
  const cityFront = [
    [24, 362, 58, 38], [94, 370, 58, 30], [846, 372, 50, 28],
    [902, 364, 58, 36]
  ].map(([x, y, w, h]) =>
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" ` +
    `fill="${STONE}" opacity=".85"/>`
  ).join("");
  const mountain =
    `<path d="M110 400 Q300 310 425 256 Q510 218 585 224 Q680 236 770 296 ` +
    `Q870 348 930 400 Z" fill="${NIGHT_GREEN}"/>` +
    `<path d="M585 224 Q680 236 770 296 Q870 348 930 400 L710 400 ` +
    `Q690 300 585 224 Z" fill="${TREE_LEAF_DARK}" opacity=".45"/>` +
    [[370, 318, 16], [470, 268, 13], [660, 296, 15], [760, 336, 13]]
      .map(([cx, cy, r]) =>
        `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${TREE_LEAF}" ` +
        `opacity=".85"/>`
      ).join("");
  const tower =
    `<line x1="538" y1="224" x2="556" y2="120" stroke="${STONE_DARK}" ` +
    `stroke-width="9" stroke-linecap="round"/>` +
    `<line x1="592" y1="224" x2="574" y2="120" stroke="${STONE_DARK}" ` +
    `stroke-width="9" stroke-linecap="round"/>` +
    `<line x1="543" y1="196" x2="587" y2="168" stroke="${STONE_DARK}" ` +
    `stroke-width="3.5"/>` +
    `<line x1="587" y1="196" x2="543" y2="168" stroke="${STONE_DARK}" ` +
    `stroke-width="3.5"/>` +
    `<line x1="539" y1="222" x2="591" y2="192" stroke="${STONE_DARK}" ` +
    `stroke-width="3.5"/>` +
    `<line x1="591" y1="222" x2="539" y2="192" stroke="${STONE_DARK}" ` +
    `stroke-width="3.5"/>` +
    `<rect x="546" y="112" width="38" height="12" rx="5" ` +
    `fill="${STONE}"/>` +
    `<rect x="526" y="94" width="78" height="18" rx="9" ` +
    `fill="${PAPER}"/>` +
    `<rect x="526" y="105" width="78" height="7" rx="3.5" ` +
    `fill="${RED}"/>` +
    `<circle cx="548" cy="101" r="2.6" fill="${INK}"/>` +
    `<circle cx="565" cy="101" r="2.6" fill="${INK}"/>` +
    `<circle cx="582" cy="101" r="2.6" fill="${INK}"/>` +
    `<rect x="541" y="86" width="48" height="9" rx="4.5" ` +
    `fill="${STONE}"/>` +
    `<rect x="562" y="34" width="7" height="52" rx="3.5" ` +
    `fill="${STONE_DARK}"/>` +
    `<g class="subway-arrived-anim-shimmer">` +
    `<circle cx="565" cy="30" r="6" fill="${RED}"/>` +
    `</g>`;
  const cableLine =
    `<rect x="132" y="364" width="12" height="38" fill="${STONE_DARK}"/>` +
    `<circle cx="138" cy="364" r="5" fill="${INK}"/>` +
    `<line x1="138" y1="366" x2="480" y2="242" stroke="${INK}" ` +
    `stroke-width="4" opacity=".55"/>`;
  const cableCar = `<g class="subway-arrived-anim-drift">` +
    `<rect x="290" y="303" width="20" height="7" rx="3.5" ` +
    `fill="${INK}"/>` +
    `<line x1="300" y1="308" x2="300" y2="322" stroke="${INK}" ` +
    `stroke-width="4"/>` +
    `<rect x="276" y="322" width="48" height="36" rx="10" ` +
    `fill="${ORANGE}"/>` +
    `<rect x="284" y="330" width="32" height="15" rx="6" ` +
    `fill="${SKY_GLOW}"/>` +
    `</g>`;
  const sign =
    `<rect x="188" y="444" width="12" height="38" rx="5" ` +
    `fill="${TRUNK}"/>` +
    `<rect x="276" y="444" width="12" height="38" rx="5" ` +
    `fill="${TRUNK}"/>` +
    `<rect x="168" y="404" width="140" height="42" rx="14" ` +
    `fill="${PAPER}" stroke="${STONE_DARK}" stroke-width="3"/>` +
    `<text x="238" y="433" text-anchor="middle" font-size="25" ` +
    `font-weight="900" fill="${INK}">남산타워</text>`;
  return stage("namsan", [
    skyBand(),
    sun(120, 88, 40),
    cloud(300, 70, 0.8), cloud(820, 120, 0.9),
    cityBack,
    cityFront,
    mountain,
    tower,
    cableLine,
    cableCar,
    grassGround(),
    roundTree(60, 426, 0.95),
    roundTree(940, 430, 0.8),
    sign
  ].join(""));
}

const SCENES = { zoo: zooScene,
  lunapark: lunaparkScene,
  baseball: baseballScene,
  palace: palaceScene,
  namsan: namsanScene,
  hanriver: hanriverScene,
  skypark: skyparkScene,
  childpark: childparkScene,
  lake: lakeScene,
  assembly: assemblyScene };

export function arrivedSceneSvg(placeId) {
  const scene = SCENES[placeId];
  return scene ? scene() : "";
}
