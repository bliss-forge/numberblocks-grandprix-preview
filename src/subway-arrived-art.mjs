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

const SCENES = { zoo: zooScene };

export function arrivedSceneSvg(placeId) {
  const scene = SCENES[placeId];
  return scene ? scene() : "";
}
