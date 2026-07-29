const TIRE = "#3d4f63";
const SPOKE = "#b9c2cc";
const HUB = "#8d95a0";
const SKIN = "#ffd9b3";

function wrap(type, viewBox, body) {
  return `<svg class="route-art route-art-${type}" viewBox="${viewBox}" ` +
    `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
}

function spokeWheel(cx, cy, radius, strokeWidth) {
  const spoke = radius - strokeWidth / 2;
  const diagonal = spoke * Math.SQRT1_2;
  return `<g class="route-wheel">` +
    `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" ` +
    `stroke="${TIRE}" stroke-width="${strokeWidth}"/>` +
    `<g stroke="${SPOKE}" stroke-width="3">` +
    `<line x1="${cx}" y1="${cy - spoke}" x2="${cx}" y2="${cy + spoke}"/>` +
    `<line x1="${cx - spoke}" y1="${cy}" x2="${cx + spoke}" y2="${cy}"/>` +
    `<line x1="${cx - diagonal}" y1="${cy - diagonal}" x2="${cx + diagonal}" y2="${cy + diagonal}"/>` +
    `<line x1="${cx - diagonal}" y1="${cy + diagonal}" x2="${cx + diagonal}" y2="${cy - diagonal}"/>` +
    `</g></g>` +
    `<circle cx="${cx}" cy="${cy}" r="7" fill="${HUB}"/>`;
}

function helmetHead(cx, cy, radius, color) {
  return `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="${SKIN}"/>` +
    `<path class="route-rider-helmet" d="M${cx - radius - 2} ${cy - 2} ` +
    `A${radius + 2} ${radius + 2} 0 0 1 ${cx + radius + 2} ${cy - 2} ` +
    `L${cx + radius + 2} ${cy + 2} L${cx - radius - 2} ${cy + 2} Z" ` +
    `fill="${color}"/>` +
    `<circle cx="${cx + radius * 0.36}" cy="${cy + 1}" r="2.4" fill="#333"/>`;
}

export function bicycleSvg() {
  return wrap("bicycle", "0 0 260 195", [
    spokeWheel(55, 148, 38, 13),
    spokeWheel(205, 148, 38, 13),
    `<g stroke="#e8564a" stroke-width="10" stroke-linecap="round" fill="none">`,
    `<line x1="196" y1="92" x2="122" y2="148"/>`,
    `<line x1="122" y1="148" x2="97" y2="88"/>`,
    `<line x1="100" y1="92" x2="193" y2="92"/>`,
    `<line x1="122" y1="148" x2="55" y2="148"/>`,
    `<line x1="55" y1="148" x2="97" y2="88"/>`,
    `<line x1="196" y1="88" x2="205" y2="148"/>`,
    `</g>`,
    `<circle cx="122" cy="148" r="15" fill="#d7dde3"/>`,
    `<line x1="122" y1="148" x2="134" y2="168" stroke="${HUB}" stroke-width="6" stroke-linecap="round"/>`,
    `<rect x="124" y="164" width="24" height="8" rx="4" fill="${TIRE}"/>`,
    `<line x1="97" y1="88" x2="92" y2="72" stroke="${HUB}" stroke-width="7"/>`,
    `<rect x="66" y="58" width="50" height="16" rx="8" fill="#8a5a3b"/>`,
    `<line x1="196" y1="88" x2="198" y2="56" stroke="${HUB}" stroke-width="8"/>`,
    `<rect x="176" y="42" width="42" height="15" rx="7" fill="#8a5a3b" transform="rotate(-12 197 49)"/>`,
    `<path d="M95 62 Q118 26 148 30" stroke="#7fd08a" stroke-width="16" fill="none" stroke-linecap="round"/>`,
    `<line x1="146" y1="34" x2="192" y2="52" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`,
    `<line x1="95" y1="64" x2="116" y2="112" stroke="#4a7ab8" stroke-width="11" stroke-linecap="round"/>`,
    `<line x1="116" y1="112" x2="132" y2="164" stroke="#4a7ab8" stroke-width="9" stroke-linecap="round"/>`,
    helmetHead(158, 18, 14, "#ef6aa0")
  ].join(""));
}

export function scooterSvg() {
  return wrap("scooter", "0 0 220 195", [
    spokeWheel(60, 172, 16, 9),
    spokeWheel(170, 172, 16, 9),
    `<rect x="52" y="152" width="106" height="12" rx="6" fill="#7c5cd6"/>`,
    `<path d="M158 158 L178 60" stroke="#7c5cd6" stroke-width="10" stroke-linecap="round" fill="none"/>`,
    `<path d="M170 172 L162 156" stroke="#7c5cd6" stroke-width="8" stroke-linecap="round" fill="none"/>`,
    `<line x1="164" y1="58" x2="196" y2="62" stroke="${HUB}" stroke-width="8" stroke-linecap="round"/>`,
    `<rect x="152" y="48" width="24" height="13" rx="6.5" fill="#8a5a3b"/>`,
    `<line x1="96" y1="150" x2="98" y2="106" stroke="#4a7ab8" stroke-width="11" stroke-linecap="round"/>`,
    `<line x1="118" y1="150" x2="104" y2="108" stroke="#3d669e" stroke-width="10" stroke-linecap="round"/>`,
    `<path d="M100 108 Q104 66 122 58" stroke="#ffd166" stroke-width="17" fill="none" stroke-linecap="round"/>`,
    `<line x1="122" y1="60" x2="162" y2="56" stroke="${SKIN}" stroke-width="9" stroke-linecap="round"/>`,
    helmetHead(130, 40, 14, "#5aa9e6")
  ].join(""));
}

export function carSvg() {
  return wrap("car", "0 0 104 156", [
    `<rect x="6" y="6" width="92" height="144" rx="26" fill="#ff8f6b" ` +
    `stroke="#fff" stroke-width="6"/>`,
    `<rect class="route-car-light" x="18" y="8" width="18" height="10" rx="5" fill="#fff3ae"/>`,
    `<rect class="route-car-light" x="68" y="8" width="18" height="10" rx="5" fill="#fff3ae"/>`,
    `<rect class="route-car-glass" x="18" y="26" width="68" height="26" rx="10" fill="#bfe8ff"/>`,
    `<rect class="route-car-roof" x="20" y="58" width="64" height="56" rx="14" fill="#ffad91"/>`,
    `<rect x="20" y="122" width="64" height="16" rx="7" fill="#d9755a"/>`,
    `<rect x="-2" y="34" width="10" height="30" rx="5" fill="#2c3440"/>`,
    `<rect x="96" y="34" width="10" height="30" rx="5" fill="#2c3440"/>`,
    `<rect x="-2" y="98" width="10" height="30" rx="5" fill="#2c3440"/>`,
    `<rect x="96" y="98" width="10" height="30" rx="5" fill="#2c3440"/>`
  ].join(""));
}

