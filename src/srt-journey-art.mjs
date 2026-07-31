// Illustrated set pieces for the SRT journey screens.
//
// Same house rules as safety-route-art.mjs and subway-station-art.mjs: flat 2D
// only — solid fills, rounded rects, circles, straight lines and simple
// quadratic paths. No gradients, filters, SMIL or external references. Every
// drawing is decorative, so the svg carries aria-hidden and the Korean labels
// stay as real text in the DOM next to it.
//
// The palette below is not a new one: every value is already in use in
// subway-station-art.mjs or styles.css, so the SRT screens stay in the same
// pastel family as the rest of the game.

const INK = "#31445b";
const PAPER = "#fff";
const STEEL = "#9fb0c2";
const STEEL_DARK = "#7d8ea1";
const PANEL = "#e6ecf2";
const GLASS = "#bfe8ff";
const GLASS_DEEP = "#5aa9e6";
const TACTILE = "#f4c542";
const PLATFORM = "#ecd9b8";

function wrap(type, viewBox, body) {
  return `<svg class="srt-art srt-art-${type}" viewBox="${viewBox}" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

// One sliding leaf: panel, window, warning stripe and the handle on its inner
// edge. `handleX` is passed in because the two leaves face each other.
function doorLeaf(x, width, handleX) {
  return [
    `<rect x="${x}" y="10" width="${width}" height="76" rx="4" ` +
    `fill="${PANEL}" stroke="${STEEL_DARK}" stroke-width="2"/>`,
    `<rect x="${x + 4}" y="20" width="${width - 8}" height="30" rx="4" ` +
    `fill="${GLASS}"/>`,
    `<rect x="${x + 4}" y="70" width="${width - 8}" height="7" rx="3.5" ` +
    `fill="${TACTILE}"/>`,
    `<rect x="${handleX}" y="52" width="4" height="14" rx="2" ` +
    `fill="${STEEL_DARK}"/>`
  ].join("");
}

// 열차 문 — two leaves in a steel frame over the tactile threshold. When the
// door is open the leaves retract to the sides and the platform shows through;
// the leaf group also carries data-open so CSS can hook the state.
export function trainDoorSvg(open = false) {
  const width = open ? 15 : 30;
  const rightX = open ? 56 : 41;
  return wrap("door", "0 0 80 104", [
    `<rect x="2" y="2" width="76" height="92" rx="8" fill="${STEEL}"/>`,
    `<rect x="8" y="8" width="64" height="80" rx="5" fill="${PLATFORM}"/>`,
    `<g class="srt-art-door-leaves" data-open="${open}">`,
    doorLeaf(9, width, 9 + width - 7),
    doorLeaf(rightX, width, rightX + 3),
    `</g>`,
    `<rect x="4" y="94" width="72" height="8" rx="4" fill="${TACTILE}"/>`
  ].join(""));
}

// 고속열차 표식 — the splash banner mark: nose cone with its cab window, the
// window strip along the body, a gold stripe and two bogies on the rail. The
// glass is the deeper blue here because the mark is only ~46px wide on the
// banner and the pale tint disappears against the white body at that size.
export function ktxTrainSvg() {
  return wrap("ktx", "0 0 104 54", [
    `<path d="M3 38 Q3 23 26 15 Q38 11 50 11 L94 11 Q101 11 101 18 L101 38 ` +
    `Q101 42 97 42 L7 42 Q3 42 3 38 Z" fill="${PAPER}"/>`,
    `<path d="M10 32 Q12 22 28 16 L34 16 L34 32 Z" fill="${GLASS_DEEP}"/>`,
    `<rect x="40" y="17" width="55" height="10" rx="5" fill="${GLASS_DEEP}"/>`,
    `<rect x="10" y="31" width="88" height="7" rx="3.5" fill="${TACTILE}"/>`,
    `<rect x="20" y="41" width="24" height="7" rx="3.5" fill="${INK}"/>`,
    `<rect x="60" y="41" width="24" height="7" rx="3.5" fill="${INK}"/>`,
    `<circle cx="27" cy="46" r="4" fill="${STEEL_DARK}"/>`,
    `<circle cx="37" cy="46" r="4" fill="${STEEL_DARK}"/>`,
    `<circle cx="67" cy="46" r="4" fill="${STEEL_DARK}"/>`,
    `<circle cx="77" cy="46" r="4" fill="${STEEL_DARK}"/>`,
    `<rect x="0" y="50" width="104" height="4" rx="2" fill="${PAPER}" ` +
    `opacity=".55"/>`
  ].join(""));
}
