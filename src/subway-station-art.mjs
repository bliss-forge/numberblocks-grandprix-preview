// Illustrated station scenery for the subway rooms.
//
// Every scene uses the same 1000x500 viewBox with preserveAspectRatio="none",
// so a y coordinate maps linearly onto a percentage of the room's height no
// matter how the room box is sized. That is what keeps the painted floor line
// under the character, whose CSS puts its feet at 23% from the bottom:
//
//   0 .. 66    ceiling
//   66 .. 370  wall
//   370        floor line   (.subway-room-floor is the bottom 26%)
//   385        walking base (character feet, people, gates)
//   370 .. 500 floor
//
// Cell centres match the room model: cell i of a width-w room sits at
// ((i + 0.5) / w) * 1000, so scenery can be placed clear of the walkable cells.

const INK = "#31445b";
const INK_SOFT = "#5b6b81";
const WALL = "#eef3f8";
const WALL_SEAM = "#dfe7ef";
const WALL_BAND = "#e6ecf2";
const CEILING = "#e2e9f1";
const LAMP = "#fff3ae";
const STEEL = "#9fb0c2";
const STEEL_DARK = "#7d8ea1";
const SKY = "#bfe8ff";
const SKY_DEEP = "#9fd0f5";
const LEAF = "#a9df7d";
const LEAF_DARK = "#6fae52";
const FLOOR_WARM = "#ecd9b8";
const FLOOR_WARM_DARK = "#d9c39c";
const FLOOR_COOL = "#d9e2ec";
const FLOOR_COOL_DARK = "#c3cfdc";
const FLOOR_DEEP = "#c7d3e0";
const TACTILE = "#f4c542";
const BENCH = "#7fb3e0";
const BENCH_DARK = "#4a7ab8";
const GREEN = "#2fa25c";
const ORANGE = "#ef5a29";
const PAPER = "#fff";
const DARK = "#2c3440";
const SKIN = "#ffd9b3";
const COATS = Object.freeze(["#4a7ab8", "#ef6aa0", "#6fae52", "#f4c542", "#7c5cd6"]);

const CEILING_BOTTOM = 66;
const FLOOR_LINE = 370;
const SCENE_HEIGHT = 500;
const SCENE_WIDTH = 1000;

export function cellCentre(index, width) {
  return ((index + 0.5) / width) * SCENE_WIDTH;
}

function scene(kind, body) {
  return `<svg class="subway-scene-art subway-scene-${kind}" ` +
    `viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}" preserveAspectRatio="none" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function ceilingLights(count, colour = LAMP) {
  const parts = [
    `<rect x="0" y="0" width="${SCENE_WIDTH}" height="${CEILING_BOTTOM}" ` +
    `fill="${CEILING}"/>`,
    `<rect x="0" y="${CEILING_BOTTOM - 6}" width="${SCENE_WIDTH}" height="6" ` +
    `fill="${STEEL}" opacity=".5"/>`
  ];
  const step = SCENE_WIDTH / count;
  for (let index = 0; index < count; index += 1) {
    const cx = step * (index + 0.5);
    parts.push(
      `<rect x="${(cx - step * 0.3).toFixed(1)}" y="18" ` +
      `width="${(step * 0.6).toFixed(1)}" height="20" rx="10" ` +
      `fill="${colour}"/>`,
      `<rect x="${(cx - step * 0.3).toFixed(1)}" y="38" ` +
      `width="${(step * 0.6).toFixed(1)}" height="7" rx="3.5" ` +
      `fill="${PAPER}" opacity=".75"/>`
    );
  }
  return parts.join("");
}

function tiledWall(seamCount = 10, fill = WALL) {
  const parts = [
    `<rect x="0" y="${CEILING_BOTTOM}" width="${SCENE_WIDTH}" ` +
    `height="${FLOOR_LINE - CEILING_BOTTOM}" fill="${fill}"/>`,
    `<rect x="0" y="292" width="${SCENE_WIDTH}" height="26" ` +
    `fill="${WALL_BAND}"/>`
  ];
  const step = SCENE_WIDTH / seamCount;
  for (let index = 1; index < seamCount; index += 1) {
    const x = (step * index).toFixed(1);
    parts.push(
      `<line x1="${x}" y1="${CEILING_BOTTOM}" x2="${x}" y2="${FLOOR_LINE}" ` +
      `stroke="${WALL_SEAM}" stroke-width="3"/>`
    );
  }
  return parts.join("");
}

function floorBand(fill, shade, { tactile = true } = {}) {
  const parts = [
    `<rect x="0" y="${FLOOR_LINE}" width="${SCENE_WIDTH}" ` +
    `height="${SCENE_HEIGHT - FLOOR_LINE}" fill="${fill}"/>`,
    `<rect x="0" y="${FLOOR_LINE}" width="${SCENE_WIDTH}" height="7" ` +
    `fill="${shade}"/>`
  ];
  if (tactile) {
    parts.push(
      `<rect x="0" y="398" width="${SCENE_WIDTH}" height="16" rx="8" ` +
      `fill="${TACTILE}" opacity=".85"/>`
    );
    for (let x = 12; x < SCENE_WIDTH; x += 40) {
      parts.push(
        `<rect x="${x}" y="401" width="18" height="10" rx="5" ` +
        `fill="${PAPER}" opacity=".45"/>`
      );
    }
  }
  return parts.join("");
}

function hangingSign(cx, text, colour = GREEN) {
  const half = Math.max(58, text.length * 15);
  return `<g class="subway-scene-hangsign">` +
    `<line x1="${cx - half + 14}" y1="${CEILING_BOTTOM}" ` +
    `x2="${cx - half + 14}" y2="86" stroke="${STEEL_DARK}" stroke-width="4"/>` +
    `<line x1="${cx + half - 14}" y1="${CEILING_BOTTOM}" ` +
    `x2="${cx + half - 14}" y2="86" stroke="${STEEL_DARK}" stroke-width="4"/>` +
    `<rect x="${cx - half}" y="84" width="${half * 2}" height="46" rx="10" ` +
    `fill="${colour}"/>` +
    `<text x="${cx}" y="115" text-anchor="middle" font-size="30" ` +
    `font-weight="900" fill="${PAPER}">${text}</text>` +
    `</g>`;
}

function posterFrame(x, y, width, height, colour) {
  const cx = x + width / 2;
  const baseY = y + height - 24;
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" ` +
    `fill="${PAPER}" stroke="${STEEL}" stroke-width="4"/>` +
    `<rect x="${x + 9}" y="${y + 9}" width="${width - 18}" ` +
    `height="${height - 18}" rx="5" fill="${colour}" opacity=".45"/>` +
    // a little train poster so the frame does not read as a blank box
    `<rect x="${cx - 30}" y="${baseY - 34}" width="60" height="34" rx="11" ` +
    `fill="${PAPER}"/>` +
    `<rect x="${cx - 22}" y="${baseY - 27}" width="16" height="13" rx="4" ` +
    `fill="${SKY}"/>` +
    `<rect x="${cx + 6}" y="${baseY - 27}" width="16" height="13" rx="4" ` +
    `fill="${SKY}"/>` +
    `<rect x="${cx - 30}" y="${baseY - 12}" width="60" height="12" rx="6" ` +
    `fill="${GREEN}"/>` +
    `<circle cx="${cx - 16}" cy="${baseY + 5}" r="6" fill="${DARK}"/>` +
    `<circle cx="${cx + 16}" cy="${baseY + 5}" r="6" fill="${DARK}"/>`;
}

// A flat commuter to stand in the rooms instead of an emoji glyph. `seed` only
// picks a coat colour, so the same person keeps the same look across rerenders.
export function passengerSvg(seed = 0, stepped = false) {
  const coat = COATS[Math.abs(Math.trunc(seed)) % COATS.length];
  return `<svg class="subway-person-art" viewBox="0 0 60 120" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">` +
    `<g class="subway-person-body" data-stepped="${stepped}">` +
    `<rect x="18" y="84" width="10" height="32" rx="5" fill="${DARK}"/>` +
    `<rect x="32" y="84" width="10" height="32" rx="5" fill="${DARK}"/>` +
    `<rect x="11" y="38" width="38" height="54" rx="16" fill="${coat}"/>` +
    `<rect x="11" y="38" width="38" height="15" rx="7.5" fill="${PAPER}" ` +
    `opacity=".22"/>` +
    `<circle cx="30" cy="23" r="17" fill="${SKIN}"/>` +
    `<path d="M13 21 A17 17 0 0 1 47 21 L47 13 L13 13 Z" fill="${DARK}"/>` +
    `<circle cx="24" cy="25" r="2.6" fill="${DARK}"/>` +
    `<circle cx="36" cy="25" r="2.6" fill="${DARK}"/>` +
    `<path d="M25 33 Q30 37 35 33" fill="none" stroke="${DARK}" ` +
    `stroke-width="2.4" stroke-linecap="round"/>` +
    `</g></svg>`;
}

function wallClock(cx, cy) {
  return `<circle cx="${cx}" cy="${cy}" r="26" fill="${PAPER}" ` +
    `stroke="${INK}" stroke-width="5"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - 15}" stroke="${INK}" ` +
    `stroke-width="4" stroke-linecap="round"/>` +
    `<line x1="${cx}" y1="${cy}" x2="${cx + 11}" y2="${cy + 4}" ` +
    `stroke="${ORANGE}" stroke-width="4" stroke-linecap="round"/>`;
}

// 개찰구 · 계단 — ticket hall: kiosk, route board, and a real staircase body
// under the walkable stair cells (cells 5..7 of a 9-cell room).
export function gateSceneSvg({ width = 9, stairsFrom = 5 } = {}) {
  const stairLeft = cellCentre(stairsFrom, width) - SCENE_WIDTH / width / 2;
  const steps = width - 1 - stairsFrom;
  const body = [
    ceilingLights(6),
    tiledWall(10),
    // route board on the left wall
    `<rect x="252" y="112" width="268" height="120" rx="12" fill="${PAPER}" ` +
    `stroke="${INK}" stroke-width="6"/>`,
    `<text x="386" y="146" text-anchor="middle" font-size="26" ` +
    `font-weight="900" fill="${INK}">노선도</text>`,
    `<polyline points="278,186 320,168 372,186 424,168 490,182" fill="none" ` +
    `stroke="${ORANGE}" stroke-width="8" stroke-linecap="round" ` +
    `stroke-linejoin="round"/>`,
    `<polyline points="278,212 336,204 400,214 462,200 494,210" fill="none" ` +
    `stroke="${GREEN}" stroke-width="8" stroke-linecap="round" ` +
    `stroke-linejoin="round"/>`,
    `<circle cx="320" cy="168" r="8" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`,
    `<circle cx="424" cy="168" r="8" fill="${PAPER}" stroke="${INK}" stroke-width="4"/>`,
    wallClock(586, 156),
    // ticket kiosk standing against the left wall, clear of cell 1
    `<rect x="6" y="214" width="86" height="156" rx="14" fill="${STEEL}"/>`,
    `<rect x="6" y="214" width="86" height="26" rx="13" fill="${STEEL_DARK}"/>`,
    `<rect x="20" y="250" width="58" height="52" rx="8" fill="${SKY}" ` +
    `stroke="${PAPER}" stroke-width="4"/>`,
    `<rect x="24" y="316" width="52" height="12" rx="6" fill="${DARK}"/>`,
    `<circle cx="34" cy="346" r="8" fill="${TACTILE}"/>`,
    `<circle cx="68" cy="346" r="8" fill="${ORANGE}"/>`,
    posterFrame(650, 188, 104, 128, SKY_DEEP),
    floorBand(FLOOR_WARM, FLOOR_WARM_DARK),
    // Staircase mass: a descending wedge under the walkable stair cells. The
    // treads themselves stay CSS-positioned (.subway-room-stair) so there is a
    // single source of truth for where each step sits.
    `<path d="M${stairLeft} 388 L${SCENE_WIDTH} 463 L${SCENE_WIDTH} ` +
    `${SCENE_HEIGHT} L${stairLeft} ${SCENE_HEIGHT} Z" ` +
    `fill="${FLOOR_WARM_DARK}"/>`,
    `<path d="M${stairLeft} 388 L${SCENE_WIDTH} 463 L${SCENE_WIDTH} 477 ` +
    `L${stairLeft} 402 Z" fill="${STEEL}" opacity=".4"/>`,
    // handrail running down the flight
    `<line x1="${stairLeft + 6}" y1="304" x2="${SCENE_WIDTH - 8}" y2="379" ` +
    `stroke="${STEEL_DARK}" stroke-width="9" stroke-linecap="round"/>`,
    ...[0, 1, 2, 3].map(index => {
      const x = stairLeft + 18 + index * (SCENE_WIDTH - stairLeft - 30) / 3;
      const y = 306 + ((x - stairLeft) / (SCENE_WIDTH - stairLeft)) * 75;
      return `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" ` +
        `x2="${x.toFixed(1)}" y2="${(y + 86).toFixed(1)}" ` +
        `stroke="${STEEL}" stroke-width="7" stroke-linecap="round"/>`;
    }),
    `<g class="subway-scene-chevrons">` +
    Array.from({ length: Math.max(2, steps - 1) }, (unused, index) => {
      const x = stairLeft + 96 + index * 132;
      const y = 424 + ((x - stairLeft) / (SCENE_WIDTH - stairLeft)) * 62;
      return `<path d="M${x.toFixed(1)} ${y.toFixed(1)} l22 18 l22 -18" ` +
        `fill="none" stroke="${PAPER}" stroke-width="9" stroke-linecap="round" ` +
        `stroke-linejoin="round" opacity="${(0.9 - index * 0.16).toFixed(2)}"/>`;
    }).join("") + `</g>`
  ].join("");
  return scene("gate", body);
}

// 열차 안 — carriage shell: ceiling light strip, hanging straps, a long bench
// and the scrolling landscape that shows through the window frames.
export function trainSceneSvg({ lineColor = GREEN, width = 7 } = {}) {
  const straps = Array.from({ length: 7 }, (unused, index) => {
    const cx = 90 + index * 136;
    return `<g class="subway-scene-strap" style="--strap: ${index}">` +
      `<line x1="${cx}" y1="${CEILING_BOTTOM}" x2="${cx}" y2="124" ` +
      `stroke="${STEEL_DARK}" stroke-width="5"/>` +
      `<rect x="${cx - 15}" y="120" width="30" height="34" rx="15" ` +
      `fill="none" stroke="${STEEL_DARK}" stroke-width="7"/>` +
      `</g>`;
  }).join("");
  const hills = `<path d="M0 300 Q120 246 240 296 Q360 250 480 300 ` +
    `Q600 252 720 298 Q840 250 1000 300 L1000 372 L0 372 Z" fill="${LEAF}"/>` +
    `<path d="M0 336 Q160 300 320 340 Q480 302 640 340 Q800 304 1000 342 ` +
    `L1000 372 L0 372 Z" fill="${LEAF_DARK}" opacity=".55"/>`;
  const body = [
    // scrolling scenery sits behind everything; the window frames reveal it
    `<rect x="0" y="${CEILING_BOTTOM}" width="${SCENE_WIDTH}" ` +
    `height="${FLOOR_LINE - CEILING_BOTTOM}" fill="${SKY}"/>`,
    `<g class="subway-scene-scroll">${hills}` +
    Array.from({ length: 6 }, (unused, index) => {
      const x = 70 + index * 170;
      const h = 60 + (index % 3) * 34;
      return `<rect x="${x}" y="${296 - h}" width="76" height="${h}" rx="8" ` +
        `fill="${PAPER}" opacity=".8"/>` +
        `<rect x="${x + 14}" y="${306 - h}" width="18" height="18" rx="4" ` +
        `fill="${SKY_DEEP}"/>`;
    }).join("") + `</g>`,
    // carriage interior painted over the scenery, leaving the window band open
    `<rect x="0" y="${CEILING_BOTTOM}" width="${SCENE_WIDTH}" height="60" ` +
    `fill="${FLOOR_COOL}"/>`,
    `<rect x="0" y="0" width="${SCENE_WIDTH}" height="${CEILING_BOTTOM}" ` +
    `fill="${CEILING}"/>`,
    `<rect x="60" y="20" width="880" height="18" rx="9" fill="${LAMP}"/>`,
    `<rect x="330" y="72" width="340" height="40" rx="10" fill="${DARK}"/>`,
    `<rect x="344" y="84" width="${312}" height="16" rx="8" ` +
    `fill="${lineColor}"/>`,
    straps,
    `<rect x="0" y="284" width="${SCENE_WIDTH}" height="86" fill="${FLOOR_COOL}"/>`,
    `<rect x="24" y="292" width="952" height="40" rx="12" fill="${BENCH}"/>`,
    `<rect x="24" y="292" width="952" height="11" rx="5.5" fill="${BENCH_DARK}"/>`,
    ...Array.from({ length: 7 }, (unused, index) =>
      `<line x1="${152 + index * 116}" y1="296" x2="${152 + index * 116}" ` +
      `y2="328" stroke="${BENCH_DARK}" stroke-width="4" opacity=".7"/>`
    ),
    ...Array.from({ length: 4 }, (unused, index) =>
      `<rect x="${80 + index * 280}" y="330" width="16" height="40" rx="6" ` +
      `fill="${STEEL_DARK}"/>`
    ),
    // Floor reads darker than the wall below the bench, otherwise the lower
    // half of the carriage merges into one flat grey field.
    `<rect x="0" y="${FLOOR_LINE}" width="${SCENE_WIDTH}" ` +
    `height="${SCENE_HEIGHT - FLOOR_LINE}" fill="${FLOOR_DEEP}"/>`,
    `<rect x="0" y="${FLOOR_LINE}" width="${SCENE_WIDTH}" height="9" ` +
    `fill="${FLOOR_COOL_DARK}"/>`,
    // door thresholds under the two end doors
    ...[0, width - 1].map(cell => {
      const cx = cellCentre(cell, width);
      const half = SCENE_WIDTH / width / 2;
      return `<rect x="${(cx - half).toFixed(1)}" y="${FLOOR_LINE + 12}" ` +
        `width="${(half * 2).toFixed(1)}" height="14" rx="7" ` +
        `fill="${TACTILE}" opacity=".8"/>`;
    }),
    `<line x1="0" y1="446" x2="${SCENE_WIDTH}" y2="446" ` +
    `stroke="${FLOOR_COOL_DARK}" stroke-width="4" opacity=".6"/>`
  ].join("");
  return scene("train", body);
}

export function stationSceneSvg(kind, options = {}) {
  if (kind === "gate") return gateSceneSvg(options);
  if (kind === "train") return trainSceneSvg(options);
  return "";
}
