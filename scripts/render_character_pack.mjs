import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rmdir,
  unlink,
  writeFile
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import {
  buildCharacterSpec,
  characterAsset
} from "../src/character-spec.mjs";
import { visiblePngBounds } from "./png_alpha_bounds.mjs";

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAFE = Object.freeze({
  left: 120,
  right: 904,
  top: 190,
  bottom: 1240
});
const TARGET_VISIBLE_FILL = .86;

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fitGrid(spec) {
  const [cols, rows] = spec.canvas.grid;
  const safeWidth = SAFE.right - SAFE.left;
  const safeHeight = SAFE.bottom - SAFE.top;
  const cell = Math.floor(
    Math.min(safeWidth / cols, safeHeight / rows) * .86
  );
  const bodyWidth = cols * cell;
  const bodyHeight = rows * cell;
  return {
    cols,
    rows,
    cell,
    step: cell,
    gap: 0,
    bodyWidth,
    bodyHeight,
    left: Math.round((1024 - bodyWidth) / 2),
    top: Math.round(
      SAFE.top + (safeHeight - bodyHeight) / 2
    ),
  };
}

function definitions() {
  return `
    <defs>
      <filter id="bodyShadow" x="-20%" y="-20%" width="140%" height="150%">
        <feDropShadow dx="0" dy="12" stdDeviation="10"
          flood-color="#24335c" flood-opacity=".2"/>
      </filter>
    </defs>`;
}

function cellsInRow(spec, row) {
  return spec.cells.filter(cell => cell.y === row);
}

function rowBounds(spec, row) {
  const cells = cellsInRow(spec, row);
  if (cells.length === 0) return null;
  return {
    left: Math.min(...cells.map(cell => cell.x)),
    right: Math.max(...cells.map(cell => cell.x))
  };
}

function withinRows(cell, region) {
  const from = region.fromRow ?? 0;
  const to = region.toRow ?? Number.POSITIVE_INFINITY;
  return cell.y >= from && cell.y <= to;
}

function sideStripeContains(spec, cell, region) {
  if (!withinRows(cell, region)) return false;
  if (region.side === "bottom") {
    const start = region.fromRow ?? spec.canvas.grid[1] - region.cols;
    const end = region.toRow ?? spec.canvas.grid[1] - 1;
    return cell.y >= start && cell.y <= end;
  }

  const bounds = rowBounds(spec, cell.y);
  if (!bounds) return false;
  if (region.side === "left") {
    return cell.x < bounds.left + region.cols;
  }
  return cell.x > bounds.right - region.cols;
}

function centerStripeContains(spec, cell, region) {
  if (!withinRows(cell, region)) return false;
  const bounds = rowBounds(spec, cell.y);
  if (!bounds) return false;
  const rowCenter = (bounds.left + bounds.right) / 2;
  const start = Math.round(rowCenter - (region.cols - 1) / 2);
  return cell.x >= start && cell.x < start + region.cols;
}

function facePanelContains(cell, region) {
  return cell.y >= region.fromRow &&
    cell.y <= region.toRow &&
    cell.x >= region.fromCol &&
    cell.x <= region.toCol;
}

function rainbowBandContains(spec, cell, region) {
  if (!withinRows(cell, region)) return false;
  if (region.orientation === "cap") return cell.y < region.rows;
  if (region.orientation === "diagonal") return true;
  if (region.orientation !== "vertical") return false;
  if (region.side === "center") return centerStripeContains(spec, cell, region);
  return sideStripeContains(spec, cell, region);
}

function rainbowColor(region, cell) {
  const colors = region.colors;
  if (region.orientation === "vertical") {
    return colors[cell.y % colors.length];
  }
  if (region.orientation === "diagonal") {
    return colors[(cell.x + cell.y) % colors.length];
  }
  return colors[cell.x % colors.length];
}

function regionContains(spec, cell, region) {
  switch (region.id) {
    case "body":
      return true;
    case "cap":
      return cell.y < region.rows;
    case "top-band": {
      const regionIndex = spec.regions.indexOf(region);
      const start = spec.regions
        .slice(0, regionIndex)
        .filter(candidate =>
          candidate.id === "cap" || candidate.id === "top-band"
        )
        .reduce((sum, candidate) => sum + candidate.rows, 0);
      return cell.y >= start && cell.y < start + region.rows;
    }
    case "side-stripe":
      return sideStripeContains(spec, cell, region);
    case "center-stripe":
      return centerStripeContains(spec, cell, region);
    case "rainbow-band":
      return rainbowBandContains(spec, cell, region);
    case "rainbow-columns":
      return true;
    case "step-motif":
      return region.side
        ? sideStripeContains(spec, cell, { ...region, cols: region.cols ?? 1 })
        : withinRows(cell, region);
    case "face-panel":
      return facePanelContains(cell, region);
    default:
      return false;
  }
}

function fillForRegion(region, cell) {
  if (region.id === "rainbow-columns") {
    return region.colors[cell.x % region.colors.length];
  }
  if (region.id === "rainbow-band") {
    return rainbowColor(region, cell);
  }
  return region.color;
}

function blockMarkup(cell, index, layout, fill, dataAttribute) {
  const x = layout.left + cell.x * layout.step;
  const y = layout.top + cell.y * layout.step;
  return `
    <rect ${dataAttribute}="${index + 1}" x="${x}" y="${y}"
      width="${layout.cell}" height="${layout.cell}"
      fill="${fill}" stroke="#7f7832"
      stroke-width="${Math.max(2, Math.round(layout.cell * .025))}"/>`;
}

function beltMarkup(spec, region, layout) {
  const row = Math.min(region.afterRow, layout.rows - 1);
  const bounds = rowBounds(spec, row);
  if (!bounds) return "";
  const height = Math.max(8, Math.min(18, layout.cell * .14));
  const x = layout.left + bounds.left * layout.cell;
  const width = (bounds.right - bounds.left + 1) * layout.cell;
  const y = layout.top + (region.afterRow + 1) * layout.cell - height / 2;
  return `
      <rect x="${x}" y="${y}" width="${width}" height="${height}"
        fill="${region.color}" stroke="#7f7832"
        stroke-width="${Math.max(2, Math.round(layout.cell * .02))}"/>`;
}

function bodyMarkup(spec, layout) {
  const body = spec.regions.find(region => region.id === "body") ?? {
    id: "body",
    color: spec.palette[0]
  };
  const baseLayer = `
      <g id="region-body">
        ${spec.cells.map((cell, index) =>
          blockMarkup(
            cell,
            index,
            layout,
            body.color,
            "data-cell"
          )
        ).join("")}
      </g>`;
  const priority = new Map([
    ["step-motif", 10],
    ["rainbow-columns", 20],
    ["rainbow-band", 20],
    ["cap", 30],
    ["top-band", 30],
    ["center-stripe", 40],
    ["side-stripe", 40],
    ["face-panel", 50]
  ]);
  const regionLayers = spec.regions
    .filter(region => region.id !== "body" && region.id !== "belt")
    .map((region, index) => ({ region, index }))
    .sort((first, second) =>
      (priority.get(first.region.id) ?? 0) -
        (priority.get(second.region.id) ?? 0) ||
      first.index - second.index
    )
    .map(({ region }) => `
      <g id="region-${escapeAttribute(region.id)}">
        ${spec.cells.map((cell, index) =>
          regionContains(spec, cell, region)
            ? blockMarkup(
                cell,
                index,
                layout,
                fillForRegion(region, cell),
                "data-region-cell"
              )
            : ""
        ).join("")}
      </g>`)
    .join("");
  const overlays = spec.regions
    .filter(region => region.id === "belt")
    .map(region => `
      <g id="region-${escapeAttribute(region.id)}">
        ${beltMarkup(spec, region, layout)}
      </g>`)
    .join("");

  return baseLayer + regionLayers + overlays;
}

function bodyColor(spec) {
  return spec.regions.find(region => region.id === "body")?.color ??
    spec.palette[0];
}

function rowSilhouette(spec, layout, row) {
  const bounds = rowBounds(spec, row);
  if (!bounds) return null;
  return Object.freeze({
    row,
    left: layout.left + bounds.left * layout.cell,
    right: layout.left + (bounds.right + 1) * layout.cell,
    top: layout.top + row * layout.cell,
    bottom: layout.top + (row + 1) * layout.cell,
    center: layout.left + (bounds.left + bounds.right + 1) * layout.cell / 2,
    width: (bounds.right - bounds.left + 1) * layout.cell
  });
}

function topSilhouette(spec, layout) {
  const topRow = Math.min(...spec.cells.map(cell => cell.y));
  return rowSilhouette(spec, layout, topRow);
}

function posePoints(spec, layout) {
  const targetY = layout.top + Math.min(
    layout.bodyHeight * .62,
    Math.max(layout.cell * 1.4, layout.bodyHeight * .42)
  );
  const row = Math.max(
    0,
    Math.min(layout.rows - 1, Math.floor((targetY - layout.top) / layout.cell))
  );
  const silhouette = rowSilhouette(spec, layout, row);
  const midY = (silhouette.top + silhouette.bottom) / 2;
  const raised = spec.pose === 1 || spec.pose === 3;
  const lift = Math.max(75, Math.min(145, layout.cell * 1.2));
  return {
    silhouette,
    midY,
    leftEndY: raised ? midY - lift : midY + lift * .55,
    rightEndY: spec.pose >= 2 ? midY - lift : midY + lift * .5
  };
}

function limbMarkup(spec, layout) {
  const { silhouette, midY, leftEndY, rightEndY } = posePoints(spec, layout);
  const leftX = silhouette.left;
  const rightX = silhouette.right;
  const outline = spec.palette[1];
  const body = bodyColor(spec);
  const color = body.startsWith("#fff") ? outline : body;
  const stroke = Math.max(20, Math.min(42, layout.cell * .24));
  const handRadius = Math.max(15, stroke * .62);
  const leftArmReach = Math.min(
    150,
    Math.max(68, leftX - handRadius - 24)
  );
  const rightArmReach = Math.min(
    150,
    Math.max(68, 1024 - rightX - handRadius - 24)
  );
  const legTop = layout.top + layout.bodyHeight - 4;
  const legLength = Math.max(95, Math.min(190, 1400 - legTop));
  const legSpread = Math.min(layout.bodyWidth * .22, 92);
  return `
    <path d="M ${leftX + 5} ${midY}
      C ${leftX - 45} ${midY},
        ${leftX - leftArmReach + 38} ${leftEndY},
        ${leftX - leftArmReach} ${leftEndY}"
      fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round"/>
    <path d="M ${rightX - 5} ${midY}
      C ${rightX + 45} ${midY},
        ${rightX + rightArmReach - 38} ${rightEndY},
        ${rightX + rightArmReach} ${rightEndY}"
      fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round"/>
    <circle cx="${leftX - leftArmReach}" cy="${leftEndY}" r="${handRadius}"
      fill="#fffaf5" stroke="${outline}" stroke-width="5"/>
    <circle cx="${rightX + rightArmReach}" cy="${rightEndY}" r="${handRadius}"
      fill="#fffaf5" stroke="${outline}" stroke-width="5"/>
    <path d="M ${512 - legSpread} ${legTop}
      Q ${512 - legSpread - 8} ${legTop + legLength * .55}
        ${512 - legSpread - 20} ${legTop + legLength}"
      fill="none" stroke="${color}" stroke-width="${stroke + 5}"
      stroke-linecap="round"/>
    <path d="M ${512 + legSpread} ${legTop}
      Q ${512 + legSpread + 8} ${legTop + legLength * .55}
        ${512 + legSpread + 20} ${legTop + legLength}"
      fill="none" stroke="${color}" stroke-width="${stroke + 5}"
      stroke-linecap="round"/>`;
}

function facePlacement(spec, layout) {
  const scale = spec.face.scale ?? 1;
  const centerX = layout.left + (spec.face.x + .5) * layout.cell;
  const centerY = layout.top + (spec.face.y + .5) * layout.cell;
  const eyeRadius = Math.max(
    24,
    Math.min(58, layout.cell * .28 * scale)
  );
  const eyeSpacing = Math.max(
    30,
    Math.min(92, eyeRadius * 1.3, layout.bodyWidth * .18)
  );
  const mouthWidth = Math.max(
    58,
    Math.min(132, layout.cell * .9 * scale)
  );
  return {
    centerX,
    centerY,
    eyeRadius,
    eyeSpacing,
    mouthWidth,
    mouthY: centerY + eyeRadius * 1.2
  };
}

function eyeMarkup(cx, cy, radius, outline) {
  return `
      <ellipse cx="${cx}" cy="${cy}" rx="${radius * .86}" ry="${radius}"
        fill="#fffdf8" stroke="${outline}" stroke-width="5"/>
      <ellipse cx="${cx}" cy="${cy + radius * .08}"
        rx="${radius * .4}" ry="${radius * .53}" fill="#171717"/>
      <circle cx="${cx - radius * .14}" cy="${cy - radius * .17}"
        r="${radius * .11}" fill="#fff"/>`;
}

function faceMarkup(spec, layout) {
  const face = facePlacement(spec, layout);
  const singleEye = spec.accessory?.type === "single-eye";
  const eyes = singleEye
    ? eyeMarkup(
        face.centerX,
        face.centerY,
        face.eyeRadius * 1.18,
        spec.palette[1]
      )
    : [
        eyeMarkup(
          face.centerX - face.eyeSpacing,
          face.centerY,
          face.eyeRadius,
          spec.palette[1]
        ),
        eyeMarkup(
          face.centerX + face.eyeSpacing,
          face.centerY,
          face.eyeRadius,
          spec.palette[1]
        )
      ].join("");
  const mouthHeight = Math.max(34, Math.min(72, layout.cell * .42));
  const left = face.centerX - face.mouthWidth / 2;
  const right = face.centerX + face.mouthWidth / 2;

  return `
    ${eyes}
    <path d="M ${left} ${face.mouthY}
      Q ${face.centerX} ${face.mouthY + mouthHeight * 1.16}
        ${right} ${face.mouthY}
      Q ${face.centerX} ${face.mouthY + mouthHeight * .22}
        ${left} ${face.mouthY} Z"
      fill="#29202a" stroke="${spec.palette[1]}"
      stroke-width="6" stroke-linejoin="round"/>
    <path d="M ${face.centerX - face.mouthWidth * .22}
        ${face.mouthY + mouthHeight * .7}
      Q ${face.centerX} ${face.mouthY + mouthHeight * .94}
        ${face.centerX + face.mouthWidth * .22}
        ${face.mouthY + mouthHeight * .7}
      Q ${face.centerX} ${face.mouthY + mouthHeight * .55}
        ${face.centerX - face.mouthWidth * .22}
        ${face.mouthY + mouthHeight * .7} Z"
      fill="#f36b8c"/>`;
}

function crownMarkup(accessory, layout, topSilhouette) {
  const colors = accessory.colors ?? [accessory.color ?? "#f2d84b"];
  const width = Math.min(260, Math.max(110, layout.bodyWidth * .55));
  const left = topSilhouette.center - width / 2;
  const top = topSilhouette.top - Math.min(82, Math.max(48, layout.cell * .7));
  const count = Math.min(7, accessory.count ?? colors.length ?? 3);
  return Array.from({ length: count }, (_, index) => {
    const segment = width / count;
    return `
      <path d="M ${left + index * segment} ${topSilhouette.top + 3}
        L ${left + (index + .5) * segment} ${top - index % 2 * 10}
        L ${left + (index + 1) * segment} ${topSilhouette.top + 3} Z"
        fill="${colors[index % colors.length]}" stroke="#51465f"
        stroke-width="5" stroke-linejoin="round"/>`;
  }).join("");
}

function glassesMarkup(accessory, spec, layout) {
  const face = facePlacement(spec, layout);
  const color = accessory.color ?? "#31546f";
  const round = accessory.type.includes("round");
  const oversized = accessory.type.includes("oversized");
  const radius = face.eyeRadius * (oversized ? 1.32 : 1.05);
  const shape = (cx) => round
    ? `<circle cx="${cx}" cy="${face.centerY}" r="${radius}"
        fill="none" stroke="${color}" stroke-width="9"/>`
    : `<rect x="${cx - radius}" y="${face.centerY - radius * .82}"
        width="${radius * 2}" height="${radius * 1.64}" rx="${radius * .25}"
        fill="none" stroke="${color}" stroke-width="9"/>`;
  return `
      ${shape(face.centerX - face.eyeSpacing)}
      ${shape(face.centerX + face.eyeSpacing)}
      <path d="M ${face.centerX - face.eyeSpacing + radius}
        ${face.centerY}
        H ${face.centerX + face.eyeSpacing - radius}"
        stroke="${color}" stroke-width="8"/>`;
}

function maskMarkup(accessory, spec, layout) {
  const face = facePlacement(spec, layout);
  const color = accessory.color ?? "#453b76";
  const width = Math.max(120, face.eyeSpacing * 2 + face.eyeRadius * 2.1);
  return `
      <path d="M ${face.centerX - width / 2} ${face.centerY - face.eyeRadius}
        Q ${face.centerX} ${face.centerY - face.eyeRadius * 1.5}
          ${face.centerX + width / 2} ${face.centerY - face.eyeRadius}
        L ${face.centerX + width * .42} ${face.centerY + face.eyeRadius}
        Q ${face.centerX} ${face.centerY + face.eyeRadius * .35}
          ${face.centerX - width * .42} ${face.centerY + face.eyeRadius} Z"
        fill="${color}" fill-opacity=".88" stroke="#43364f" stroke-width="5"/>`;
}

function hatMarkup(accessory, layout, topSilhouette) {
  const color = accessory.color ?? "#6b5b87";
  const width = Math.min(190, Math.max(90, layout.bodyWidth * .42));
  const center = topSilhouette.center;
  const base = topSilhouette.top;
  const top = base - Math.min(88, Math.max(50, layout.cell * .8));
  if (accessory.type.includes("cap")) {
    return `
      <path d="M ${center - width / 2} ${base + 3}
        Q ${center} ${top - 18} ${center + width / 2} ${base + 3} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>
      <path d="M ${center} ${base}
        Q ${center + width * .6} ${base - 12}
          ${center + width * .72} ${base + 18}"
        fill="none" stroke="${color}" stroke-width="16"
        stroke-linecap="round"/>`;
  }
  return `
      <rect x="${center - width * .28}" y="${top}" width="${width * .56}"
        height="${base - top + 4}" rx="10"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>
      <rect x="${center - width / 2}" y="${base - 14}" width="${width}"
        height="22" rx="10" fill="${color}" stroke="#4b405a"
      stroke-width="6"/>`;
}

function accessoryPart(name, markup) {
  return `
      <g data-accessory-part="${escapeAttribute(name)}">
        ${markup}
      </g>`;
}

function flowerShape(cx, cy, radius, color) {
  const petals = Array.from({ length: 5 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / 5;
    return `
        <circle cx="${cx + Math.cos(angle) * radius}"
          cy="${cy + Math.sin(angle) * radius}" r="${radius * .68}"
          fill="${color}" stroke="#4b405a" stroke-width="3"/>`;
  }).join("");
  return `
        ${petals}
        <circle cx="${cx}" cy="${cy}" r="${radius * .55}"
          fill="#f4d84f" stroke="#4b405a" stroke-width="3"/>`;
}

function flowerMarkup(accessory, layout, topSilhouette) {
  const radius = Math.max(18, Math.min(34, layout.cell * .24));
  const cx = topSilhouette.left + topSilhouette.width * .72;
  const cy = topSilhouette.top + Math.max(radius + 8, layout.cell * .55);
  return flowerShape(cx, cy, radius, accessory.color);
}

function flowerBandMarkup(accessory, layout, topSilhouette) {
  const colors = accessory.colors;
  const count = colors.length;
  const radius = Math.max(15, Math.min(26, layout.cell * .19));
  const width = Math.min(topSilhouette.width * .72, 260);
  const left = topSilhouette.center - width / 2;
  const cy = topSilhouette.top + radius + 9;
  return colors.map((color, index) => flowerShape(
    count === 1 ? topSilhouette.center : left + index * width / (count - 1),
    cy,
    radius,
    color
  )).join("");
}

function pomPomMarkup(accessory, layout, topSilhouette) {
  const colors = accessory.colors;
  const radius = Math.max(25, Math.min(42, layout.cell * .34));
  const y = topSilhouette.top + Math.max(radius, layout.cell * .85);
  const pom = (cx, color) => `
        <circle cx="${cx}" cy="${y}" r="${radius}"
          fill="${color}" stroke="#4b405a" stroke-width="5"/>
        <circle cx="${cx - radius * .48}" cy="${y - radius * .3}"
          r="${radius * .42}" fill="${color}"/>
        <circle cx="${cx + radius * .48}" cy="${y - radius * .3}"
          r="${radius * .42}" fill="${color}"/>`;
  return pom(
    Math.max(radius + 18, topSilhouette.left - radius * .85),
    colors[0]
  ) + pom(
    Math.min(1024 - radius - 18, topSilhouette.right + radius * .85),
    colors[1] ?? colors[0]
  );
}

function gemMarkup(accessory, layout, topSilhouette) {
  const radius = Math.max(28, Math.min(52, layout.cell * .42));
  const center = topSilhouette.center;
  const cy = topSilhouette.top + radius * .55;
  return `
        <path d="M ${center} ${cy - radius}
          L ${center + radius * .78} ${cy}
          L ${center} ${cy + radius}
          L ${center - radius * .78} ${cy} Z"
          fill="${accessory.color}" stroke="#31536a" stroke-width="6"
          stroke-linejoin="round"/>
        <path d="M ${center} ${cy - radius}
          L ${center} ${cy + radius}
          M ${center - radius * .78} ${cy}
          H ${center + radius * .78}"
          fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="4"/>`;
}

function medallionMarkup(accessory, layout) {
  const radius = Math.max(30, Math.min(54, layout.cell * .42));
  const cy = layout.top + layout.bodyHeight * .66;
  return `
        <circle cx="512" cy="${cy}" r="${radius}"
          fill="${accessory.color}" stroke="#74305e" stroke-width="7"/>
        <circle cx="512" cy="${cy}" r="${radius * .58}"
          fill="none" stroke="#f8b8dc" stroke-width="6"/>
        <path d="M 512 ${cy - radius * .42}
          L ${512 + radius * .13} ${cy - radius * .12}
          L ${512 + radius * .45} ${cy - radius * .08}
          L ${512 + radius * .2} ${cy + radius * .12}
          L ${512 + radius * .28} ${cy + radius * .43}
          L 512 ${cy + radius * .25}
          L ${512 - radius * .28} ${cy + radius * .43}
          L ${512 - radius * .2} ${cy + radius * .12}
          L ${512 - radius * .45} ${cy - radius * .08}
          L ${512 - radius * .13} ${cy - radius * .12} Z"
          fill="#f8d64d"/>`;
}

function wingsMarkup(accessory, layout) {
  const colors = accessory.colors ?? ["#fffaf2"];
  const midY = layout.top + layout.bodyHeight * .58;
  const reach = Math.min(110, Math.max(65, layout.left - 35));
  return `
        <path d="M ${layout.left + 5} ${midY}
          Q ${layout.left - reach * .55} ${midY - 95}
            ${layout.left - reach} ${midY - 25}
          Q ${layout.left - reach * .55} ${midY + 70}
            ${layout.left + 5} ${midY + 20} Z"
          fill="${colors[1] ?? colors[0]}" stroke="#635a78" stroke-width="5"/>
        <path d="M ${layout.left + layout.bodyWidth - 5} ${midY}
          Q ${layout.left + layout.bodyWidth + reach * .55} ${midY - 95}
            ${layout.left + layout.bodyWidth + reach} ${midY - 25}
          Q ${layout.left + layout.bodyWidth + reach * .55} ${midY + 70}
            ${layout.left + layout.bodyWidth - 5} ${midY + 20} Z"
          fill="${colors[1] ?? colors[0]}" stroke="#635a78" stroke-width="5"/>`;
}

function accessoryMarkup(spec, layout) {
  const accessory = spec.accessory;
  if (!accessory) return "";
  const type = accessory.type;
  const color = accessory.color ?? accessory.colors?.[0] ?? spec.accent;
  const top = topSilhouette(spec, layout);
  const face = facePlacement(spec, layout);
  let markup;

  if (type === "top-hat-glasses") {
    markup = accessoryPart(
      "hat",
      hatMarkup({ ...accessory, type: "top-hat" }, layout, top)
    ) + accessoryPart(
      "glasses",
      glassesMarkup({ ...accessory, type: "square-glasses" }, spec, layout)
    );
  } else if (type === "crown-and-wings") {
    markup = accessoryPart("wings", wingsMarkup(accessory, layout)) +
      accessoryPart("crown", crownMarkup(accessory, layout, top));
  } else if (type === "flower") {
    markup = accessoryPart("flower", flowerMarkup(accessory, layout, top));
  } else if (type === "flower-band") {
    markup = accessoryPart(
      "flower-band",
      flowerBandMarkup(accessory, layout, top)
    );
  } else if (type === "pom-poms") {
    markup = accessoryPart("pom-poms", pomPomMarkup(accessory, layout, top));
  } else if (type === "gem") {
    markup = accessoryPart("gem", gemMarkup(accessory, layout, top));
  } else if (type === "medallion") {
    markup = accessoryPart(
      "medallion",
      medallionMarkup(accessory, layout)
    );
  } else if (type.includes("crown")) {
    markup = crownMarkup(accessory, layout, top);
  } else if (type.includes("glasses") || type === "oversized-eyes") {
    markup = glassesMarkup(accessory, spec, layout);
  } else if (type.includes("mask")) {
    markup = maskMarkup(accessory, spec, layout);
  } else if (type.includes("hat") || type.includes("cap")) {
    markup = hatMarkup(accessory, layout, top);
  } else if (type === "eyepatch") {
    markup = `
      <path d="M ${face.centerX - face.eyeSpacing - face.eyeRadius}
        ${face.centerY - face.eyeRadius}
        Q ${face.centerX - face.eyeSpacing} ${face.centerY + face.eyeRadius}
          ${face.centerX - face.eyeSpacing + face.eyeRadius}
          ${face.centerY - face.eyeRadius} Z"
        fill="${color}" stroke="#29384a" stroke-width="6"/>
      <path d="M ${face.centerX - face.eyeSpacing - face.eyeRadius * 1.2}
        ${face.centerY - face.eyeRadius * .8}
        L ${face.centerX + face.eyeSpacing + face.eyeRadius}
        ${face.centerY - face.eyeRadius * 1.3}"
        stroke="#29384a" stroke-width="7"/>`;
  } else if (type === "cat-ears" || type === "horns") {
    const halfBase = Math.min(48, Math.max(18, top.width * .28));
    const leftCenter = top.left + top.width * .28;
    const rightCenter = top.left + top.width * .72;
    markup = `
      <path d="M ${leftCenter - halfBase} ${top.top + 5}
        L ${leftCenter} ${top.top - 78}
        L ${leftCenter + halfBase} ${top.top + 5} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>
      <path d="M ${rightCenter - halfBase} ${top.top + 5}
        L ${rightCenter} ${top.top - 78}
        L ${rightCenter + halfBase} ${top.top + 5} Z"
        fill="${accessory.colors?.[1] ?? color}"
        stroke="#4b405a" stroke-width="6"/>`;
  } else if (type === "antennae") {
    const leftStem = top.left + top.width * .32;
    const rightStem = top.left + top.width * .68;
    markup = `
      <path d="M ${leftStem} ${top.top + 5} Q ${leftStem - 35} ${top.top - 80}
        ${leftStem - 65} ${top.top - 95}
        M ${rightStem} ${top.top + 5} Q ${rightStem + 35} ${top.top - 80}
        ${rightStem + 65} ${top.top - 95}"
        fill="none" stroke="${color}" stroke-width="10"
        stroke-linecap="round"/>
      <circle cx="${leftStem - 65}" cy="${top.top - 95}" r="16" fill="${color}"/>
      <circle cx="${rightStem + 65}" cy="${top.top - 95}" r="16" fill="${color}"/>`;
  } else if (type === "plume") {
    markup = `
      <path d="M ${top.center} ${top.top + 2}
        Q ${top.center + 105} ${top.top - 85} ${top.center + 35} ${top.top - 145}
        Q ${top.center - 45} ${top.top - 75} ${top.center} ${top.top + 2} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>`;
  } else if (type === "rainbow-boots") {
    const colors = accessory.colors;
    markup = colors.slice(0, 6).map((item, index) => `
      <rect x="${430 + index * 28}" y="${layout.top + layout.bodyHeight + 115}"
        width="30" height="34" rx="10" fill="${item}"/>`).join("");
  } else if (type === "side-curls") {
    markup = `
      <path d="M ${layout.left} ${face.centerY - 70}
        Q ${layout.left - 95} ${face.centerY - 35}
          ${layout.left - 30} ${face.centerY + 15}
        Q ${layout.left + 10} ${face.centerY + 45}
          ${layout.left - 45} ${face.centerY + 80}
        M ${layout.left + layout.bodyWidth} ${face.centerY - 70}
        Q ${layout.left + layout.bodyWidth + 95} ${face.centerY - 35}
          ${layout.left + layout.bodyWidth + 30} ${face.centerY + 15}
        Q ${layout.left + layout.bodyWidth - 10} ${face.centerY + 45}
          ${layout.left + layout.bodyWidth + 45} ${face.centerY + 80}"
        fill="none" stroke="${color}" stroke-width="20"
        stroke-linecap="round"/>`;
  } else if (type === "single-eye") {
    markup = `
      <circle cx="${face.centerX}" cy="${face.centerY}"
        r="${face.eyeRadius * 1.28}" fill="none"
        stroke="${color}" stroke-width="7"/>`;
  } else {
    const center = top.center;
    markup = `
      <path d="M ${center} ${top.top - 72}
        L ${center + 14} ${top.top - 28} L ${center + 60} ${top.top - 28}
        L ${center + 23} ${top.top - 2} L ${center + 36} ${top.top + 42}
        L ${center} ${top.top + 16} L ${center - 36} ${top.top + 42}
        L ${center - 23} ${top.top - 2} L ${center - 60} ${top.top - 28}
        L ${center - 14} ${top.top - 28} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"
        stroke-linejoin="round"/>`;
  }

  return `
    <g id="accessory" data-accessory="${escapeAttribute(type)}">
      ${markup}
    </g>`;
}

function finiteNumber(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
  return Object.is(value, -0) ? 0 : value;
}

function compactNumber(value) {
  return String(Number(value.toFixed(8)));
}

export function normalizationForVisibleBounds(bounds) {
  if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
    throw new RangeError("visible bounds must be non-empty");
  }
  const safeWidth = SAFE.right - SAFE.left;
  const safeHeight = SAFE.bottom - SAFE.top;
  const scale = TARGET_VISIBLE_FILL / Math.max(
    bounds.width / safeWidth,
    bounds.height / safeHeight
  );
  const scaledWidth = bounds.width * scale;
  const scaledHeight = bounds.height * scale;
  const targetLeft = SAFE.left + (safeWidth - scaledWidth) / 2;
  const targetTop = SAFE.top + (safeHeight - scaledHeight) / 2;
  return Object.freeze({
    scale,
    translateX: targetLeft - bounds.left * scale,
    translateY: targetTop - bounds.top * scale
  });
}

export function renderCharacterSvg(spec, options = {}) {
  if (
    spec.number < 11 ||
    spec.number > 150 ||
    !["reference", "extension"].includes(spec.source)
  ) {
    throw new RangeError("connected renderer only supports catalog assets 11–150");
  }
  const layout = fitGrid(spec);
  const normalization = options.normalization ?? {
    scale: 1,
    translateX: 0,
    translateY: 0
  };
  const scale = finiteNumber(normalization.scale, "normalization.scale");
  const translateX = finiteNumber(
    normalization.translateX,
    "normalization.translateX"
  );
  const translateY = finiteNumber(
    normalization.translateY,
    "normalization.translateY"
  );
  if (scale <= 0) throw new RangeError("normalization.scale must be positive");
  const transform = [scale, 0, 0, scale, translateX, translateY]
    .map(compactNumber)
    .join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg"
    width="1024" height="1536" viewBox="0 0 1024 1536"
    role="img" aria-label="숫자 ${escapeAttribute(spec.number)} 블록 캐릭터">
    ${definitions()}
    <g id="character" transform="matrix(${transform})">
      <g id="limbs">${limbMarkup(spec, layout)}</g>
      <g id="body" data-cell-gap="0"
        filter="url(#bodyShadow)">${bodyMarkup(spec, layout)}</g>
      <g id="face">${faceMarkup(spec, layout)}</g>
      ${accessoryMarkup(spec, layout)}
    </g>
  </svg>`;
}

function parseRange(argv) {
  const fromIndex = argv.indexOf("--from");
  const toIndex = argv.indexOf("--to");
  const from = Number(fromIndex >= 0 ? argv[fromIndex + 1] : 11);
  const to = Number(toIndex >= 0 ? argv[toIndex + 1] : 150);
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 11 ||
    to > 150 ||
    from > to
  ) {
    throw new RangeError("render range must satisfy 11 <= from <= to <= 150");
  }
  return { from, to };
}

async function rasterize(svgPath, outputPath) {
  await execFileAsync("sips", [
    "-s", "format", "png",
    svgPath,
    "--out", outputPath
  ]);
}

async function runCli() {
  const { from, to } = parseRange(process.argv.slice(2));
  const outputDirectory = join(projectRoot, "assets", "characters");
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "numberblocks-"));
  await mkdir(outputDirectory, { recursive: true });

  try {
    for (let number = from; number <= to; number += 1) {
      const svgPath = join(temporaryDirectory, `${number}.svg`);
      const previewPath = join(temporaryDirectory, `${number}-raw.png`);
      const outputPath = join(outputDirectory, characterAsset(number));
      await writeFile(svgPath, renderCharacterSvg(buildCharacterSpec(number)), "utf8");
      await rasterize(svgPath, previewPath);
      const visibleBounds = visiblePngBounds(await readFile(previewPath));
      const normalization = normalizationForVisibleBounds(visibleBounds);
      await writeFile(
        svgPath,
        renderCharacterSvg(buildCharacterSpec(number), { normalization }),
        "utf8"
      );
      await rasterize(svgPath, outputPath);
      await unlink(svgPath);
      await unlink(previewPath);
      process.stdout.write(`rendered ${characterAsset(number)}\n`);
    }
  } finally {
    await rmdir(temporaryDirectory).catch(() => {});
  }
}

const isCli = process.argv[1] &&
  pathToFileURL(resolve(process.argv[1])).href === import.meta.url;

if (isCli) {
  await runCli();
}
