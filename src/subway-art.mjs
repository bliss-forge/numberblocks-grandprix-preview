export function subwayTrainSvg(lineNumber, color) {
  return [
    `<svg class="route-art route-art-subway" viewBox="0 0 340 130" ` +
    `role="img" aria-hidden="true" focusable="false">`,
    `<rect x="6" y="14" width="328" height="92" rx="26" fill="#f4f7fb" ` +
    `stroke="#fff" stroke-width="6"/>`,
    `<rect x="6" y="78" width="328" height="28" rx="14" fill="${color}"/>`,
    `<rect x="30" y="30" width="52" height="34" rx="8" fill="#bfe8ff"/>`,
    `<rect x="258" y="30" width="52" height="34" rx="8" fill="#bfe8ff"/>`,
    `<g class="route-subway-doors">`,
    `<rect x="104" y="26" width="42" height="76" rx="8" fill="#dde5ee" ` +
    `stroke="#aab6c5" stroke-width="3"/>`,
    `<rect x="194" y="26" width="42" height="76" rx="8" fill="#dde5ee" ` +
    `stroke="#aab6c5" stroke-width="3"/>`,
    `</g>`,
    `<circle cx="170" cy="52" r="24" fill="${color}"/>`,
    `<text class="route-subway-number" x="170" y="61" text-anchor="middle" ` +
    `font-size="26" font-weight="900" fill="#fff">${lineNumber}</text>`,
    `<circle cx="60" cy="112" r="11" fill="#2c3440"/>`,
    `<circle cx="280" cy="112" r="11" fill="#2c3440"/>`,
    `</svg>`
  ].join("");
}

export function lineBadgeSvg(lineNumber, color) {
  return [
    `<svg class="route-art route-art-line-badge" viewBox="0 0 48 48" ` +
    `role="img" aria-hidden="true" focusable="false">`,
    `<circle cx="24" cy="24" r="21" fill="${color}" stroke="#fff" ` +
    `stroke-width="4"/>`,
    `<text x="24" y="32" text-anchor="middle" font-size="22" ` +
    `font-weight="900" fill="#fff">${lineNumber}</text>`,
    `</svg>`
  ].join("");
}
