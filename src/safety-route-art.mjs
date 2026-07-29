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

const PARKING_BODIES = Object.freeze({
  sedan: {
    color: "#5aa9e6",
    body: "M8 66 L14 46 Q18 40 26 40 L44 40 Q50 26 62 26 L96 26 Q108 26 114 40 L134 40 Q142 40 146 46 L152 66 Q152 74 144 74 L16 74 Q8 74 8 66 Z",
    glass: `<path d="M52 40 Q56 30 64 30 L94 30 Q102 30 106 40 Z" fill="#bfe8ff"/>`
  },
  suv: {
    color: "#7fd08a",
    body: "M8 66 L12 36 Q14 24 26 24 L120 24 Q132 24 138 36 L152 48 L152 66 Q152 74 144 74 L16 74 Q8 74 8 66 Z",
    glass: `<rect x="34" y="30" width="34" height="16" rx="4" fill="#bfe8ff"/><rect x="76" y="30" width="34" height="16" rx="4" fill="#bfe8ff"/>`
  },
  van: {
    color: "#ffd166",
    body: "M8 66 L8 30 Q8 20 18 20 L124 20 Q138 20 146 36 L152 52 L152 66 Q152 74 144 74 L16 74 Q8 74 8 66 Z",
    glass: `<rect x="20" y="28" width="30" height="18" rx="4" fill="#bfe8ff"/><rect x="58" y="28" width="30" height="18" rx="4" fill="#bfe8ff"/><path d="M96 28 L122 28 Q132 30 138 44 L96 44 Z" fill="#bfe8ff"/>`
  },
  truck: {
    color: "#b07a4d",
    body: "M8 66 L8 34 Q8 28 14 28 L60 28 L60 20 Q60 14 66 14 L146 14 L146 66 Q146 74 138 74 L16 74 Q8 74 8 66 Z",
    glass: `<rect x="16" y="34" width="26" height="16" rx="4" fill="#bfe8ff"/>`
  },
  sports: {
    color: "#ef6aa0",
    body: "M6 64 L18 50 Q30 40 48 38 L64 28 Q70 24 80 24 L100 24 Q118 26 134 40 L150 52 L154 64 Q154 72 146 72 L14 72 Q6 72 6 64 Z",
    glass: `<path d="M66 30 Q72 26 80 26 L98 26 Q108 28 116 36 L70 36 Z" fill="#bfe8ff"/>`
  },
  hatchback: {
    color: "#7c5cd6",
    body: "M8 66 L12 40 Q14 30 26 30 L84 30 Q100 30 112 38 L146 48 L152 66 Q152 74 144 74 L16 74 Q8 74 8 66 Z",
    glass: `<rect x="30" y="36" width="26" height="14" rx="4" fill="#bfe8ff"/><path d="M64 36 L86 36 Q98 38 104 44 L64 48 Z" fill="#bfe8ff"/>`
  }
});

export function parkingCarSvg(shape, plate) {
  const spec = PARKING_BODIES[shape] ?? PARKING_BODIES.sedan;
  return wrap(`parked-${shape}`, "0 0 160 96", [
    `<path d="${spec.body}" fill="${spec.color}" stroke="#fff" stroke-width="5"/>`,
    spec.glass,
    `<circle cx="42" cy="76" r="14" fill="${TIRE}"/>`,
    `<circle cx="42" cy="76" r="6" fill="${SPOKE}"/>`,
    `<circle cx="120" cy="76" r="14" fill="${TIRE}"/>`,
    `<circle cx="120" cy="76" r="6" fill="${SPOKE}"/>`,
    `<rect class="route-plate" x="58" y="58" width="46" height="16" rx="4" ` +
    `fill="#fff" stroke="#31445b" stroke-width="2.5"/>`,
    `<text x="81" y="71" text-anchor="middle" font-size="13" ` +
    `font-weight="900" fill="#31445b">${plate ?? ""}</text>`
  ].join(""));
}

function blockElder({ type, body, cheek, accessories }) {
  return wrap(`elder-${type}`, "0 0 120 150", [
    `<rect x="18" y="18" width="84" height="84" rx="16" fill="${body}" ` +
    `stroke="#fff" stroke-width="6"/>`,
    `<circle cx="45" cy="52" r="7" fill="#fff"/>`,
    `<circle cx="45" cy="53" r="3.4" fill="#222"/>`,
    `<circle cx="75" cy="52" r="7" fill="#fff"/>`,
    `<circle cx="75" cy="53" r="3.4" fill="#222"/>`,
    `<circle cx="45" cy="52" r="11" fill="none" stroke="#31445b" stroke-width="3"/>`,
    `<circle cx="75" cy="52" r="11" fill="none" stroke="#31445b" stroke-width="3"/>`,
    `<line x1="56" y1="52" x2="64" y2="52" stroke="#31445b" stroke-width="3"/>`,
    `<circle cx="33" cy="68" r="5" fill="${cheek}" opacity=".8"/>`,
    `<circle cx="87" cy="68" r="5" fill="${cheek}" opacity=".8"/>`,
    accessories,
    `<line x1="34" y1="102" x2="26" y2="130" stroke="${body}" stroke-width="9" stroke-linecap="round"/>`,
    `<line x1="86" y1="102" x2="94" y2="130" stroke="${body}" stroke-width="9" stroke-linecap="round"/>`,
    `<line x1="18" y1="62" x2="4" y2="84" stroke="${body}" stroke-width="9" stroke-linecap="round"/>`,
    `<line x1="102" y1="62" x2="116" y2="84" stroke="${body}" stroke-width="9" stroke-linecap="round"/>`
  ].join(""));
}

export function grandpaSvg() {
  return blockElder({
    type: "grandpa",
    body: "#8fa3b8",
    cheek: "#e8a0b4",
    accessories: [
      `<path d="M42 76 Q60 88 78 76 Q60 84 42 76 Z" fill="#fff"/>`,
      `<path d="M38 72 Q48 66 58 71 L58 76 Q47 72 38 76 Z" fill="#fff"/>`,
      `<path d="M62 71 Q72 66 82 72 L82 76 Q73 72 62 76 Z" fill="#fff"/>`,
      `<path d="M30 30 Q40 22 52 26 L50 32 Q40 28 32 34 Z" fill="#e6ecf2"/>`,
      `<path d="M68 26 Q80 22 90 30 L88 34 Q80 28 70 32 Z" fill="#e6ecf2"/>`
    ].join("")
  });
}

export function grandmaSvg() {
  return blockElder({
    type: "grandma",
    body: "#e8a0b4",
    cheek: "#f4c1cf",
    accessories: [
      `<path d="M44 80 Q60 92 76 80" fill="none" stroke="#31445b" stroke-width="4" stroke-linecap="round"/>`,
      `<circle cx="60" cy="12" r="11" fill="#e6ecf2"/>`,
      `<path d="M26 26 Q60 4 94 26 L94 32 Q60 14 26 32 Z" fill="#e6ecf2"/>`
    ].join("")
  });
}

export function busSvg(number) {
  return wrap("bus", "0 0 104 200", [
    `<rect x="4" y="4" width="96" height="192" rx="18" fill="#5aa9e6" ` +
    `stroke="#fff" stroke-width="6"/>`,
    `<rect class="route-car-light" x="16" y="6" width="18" height="9" rx="4" fill="#fff3ae"/>`,
    `<rect class="route-car-light" x="70" y="6" width="18" height="9" rx="4" fill="#fff3ae"/>`,
    `<rect class="route-car-glass" x="16" y="22" width="72" height="24" rx="9" fill="#bfe8ff"/>`,
    `<rect class="route-car-roof" x="16" y="54" width="72" height="112" rx="12" fill="#8cc4ef"/>`,
    `<circle cx="52" cy="110" r="30" fill="#fff"/>`,
    `<text class="route-bus-number" x="52" y="123" text-anchor="middle" ` +
    `font-family="inherit" font-size="36" font-weight="900" fill="#31445b">${number}</text>`,
    `<rect x="16" y="174" width="72" height="14" rx="6" fill="#3f7fb8"/>`,
    `<rect x="-3" y="34" width="10" height="30" rx="5" fill="#2c3440"/>`,
    `<rect x="97" y="34" width="10" height="30" rx="5" fill="#2c3440"/>`,
    `<rect x="-3" y="136" width="10" height="30" rx="5" fill="#2c3440"/>`,
    `<rect x="97" y="136" width="10" height="30" rx="5" fill="#2c3440"/>`
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

