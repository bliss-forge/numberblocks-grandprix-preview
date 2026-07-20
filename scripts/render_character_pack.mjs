import { execFile } from "node:child_process";
import {
  mkdir,
  mkdtemp,
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

const execFileAsync = promisify(execFile);
const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SAFE = Object.freeze({
  left: 120,
  right: 904,
  top: 190,
  bottom: 1240
});

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
    safeFill: Math.max(bodyWidth / safeWidth, bodyHeight / safeHeight)
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
  return Math.abs(cell.x - rowCenter) < region.cols / 2;
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
    case "top-band":
      return cell.y < region.rows;
    case "side-stripe":
      return sideStripeContains(spec, cell, region);
    case "center-stripe":
      return centerStripeContains(spec, cell, region);
    case "rainbow-band":
      return rainbowBandContains(spec, cell, region);
    case "rainbow-columns":
      return true;
    case "step-motif":
      return withinRows(cell, region);
    case "face-panel":
      return facePanelContains(cell, region);
    default:
      return false;
  }
}

function regionForCell(spec, cell) {
  const region = spec.regions.find(candidate =>
    candidate.id !== "belt" && regionContains(spec, cell, candidate)
  );
  return region ?? { id: "body", color: spec.palette[0] };
}

function fillForCell(spec, cell) {
  const region = regionForCell(spec, cell);
  if (region.id === "rainbow-columns") {
    return region.colors[cell.x % region.colors.length];
  }
  if (region.id === "rainbow-band") {
    return rainbowColor(region, cell);
  }
  return region.color;
}

function blockMarkup(spec, cell, index, layout) {
  const x = layout.left + cell.x * layout.step;
  const y = layout.top + cell.y * layout.step;
  const fill = fillForCell(spec, cell);
  return `
    <rect data-cell="${index + 1}" x="${x}" y="${y}"
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
  const cellsByRegion = new Map(
    spec.regions
      .filter(region => region.id !== "belt")
      .map(region => [region.id, []])
  );

  spec.cells.forEach((cell, index) => {
    const region = regionForCell(spec, cell);
    if (!cellsByRegion.has(region.id)) cellsByRegion.set(region.id, []);
    cellsByRegion.get(region.id).push(blockMarkup(spec, cell, index, layout));
  });

  const cellLayers = spec.regions
    .filter(region => region.id !== "belt")
    .map(region => `
      <g id="region-${escapeAttribute(region.id)}">
        ${(cellsByRegion.get(region.id) ?? []).join("")}
      </g>`)
    .join("");
  const overlays = spec.regions
    .filter(region => region.id === "belt")
    .map(region => `
      <g id="region-${escapeAttribute(region.id)}">
        ${beltMarkup(spec, region, layout)}
      </g>`)
    .join("");

  return cellLayers + overlays;
}

function bodyColor(spec) {
  return spec.regions.find(region => region.id === "body")?.color ??
    spec.palette[0];
}

function posePoints(spec, layout) {
  const midY = layout.top + Math.min(
    layout.bodyHeight * .62,
    Math.max(layout.cell * 1.4, layout.bodyHeight * .42)
  );
  const raised = spec.pose === 1 || spec.pose === 3;
  const lift = Math.max(75, Math.min(145, layout.cell * 1.2));
  return {
    midY,
    leftEndY: raised ? midY - lift : midY + lift * .55,
    rightEndY: spec.pose >= 2 ? midY - lift : midY + lift * .5
  };
}

function limbMarkup(spec, layout) {
  const { midY, leftEndY, rightEndY } = posePoints(spec, layout);
  const leftX = layout.left;
  const rightX = layout.left + layout.bodyWidth;
  const outline = spec.palette[1];
  const body = bodyColor(spec);
  const color = body.startsWith("#fff") ? outline : body;
  const stroke = Math.max(20, Math.min(42, layout.cell * .24));
  const handRadius = Math.max(15, stroke * .62);
  const armReach = Math.min(
    150,
    Math.max(68, layout.left - handRadius - 24)
  );
  const legTop = layout.top + layout.bodyHeight - 4;
  const legLength = Math.max(95, Math.min(190, 1400 - legTop));
  const legSpread = Math.min(layout.bodyWidth * .22, 92);
  return `
    <path d="M ${leftX + 5} ${midY}
      C ${leftX - 45} ${midY},
        ${leftX - armReach + 38} ${leftEndY},
        ${leftX - armReach} ${leftEndY}"
      fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round"/>
    <path d="M ${rightX - 5} ${midY}
      C ${rightX + 45} ${midY},
        ${rightX + armReach - 38} ${rightEndY},
        ${rightX + armReach} ${rightEndY}"
      fill="none" stroke="${color}" stroke-width="${stroke}"
      stroke-linecap="round"/>
    <circle cx="${leftX - armReach}" cy="${leftEndY}" r="${handRadius}"
      fill="#fffaf5" stroke="${outline}" stroke-width="5"/>
    <circle cx="${rightX + armReach}" cy="${rightEndY}" r="${handRadius}"
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

function crownMarkup(accessory, layout) {
  const colors = accessory.colors ?? [accessory.color ?? "#f2d84b"];
  const width = Math.min(260, Math.max(110, layout.bodyWidth * .55));
  const left = 512 - width / 2;
  const top = layout.top - Math.min(82, Math.max(48, layout.cell * .7));
  const count = Math.min(7, accessory.count ?? colors.length ?? 3);
  return Array.from({ length: count }, (_, index) => {
    const segment = width / count;
    return `
      <path d="M ${left + index * segment} ${layout.top + 3}
        L ${left + (index + .5) * segment} ${top - index % 2 * 10}
        L ${left + (index + 1) * segment} ${layout.top + 3} Z"
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

function hatMarkup(accessory, layout) {
  const color = accessory.color ?? "#6b5b87";
  const width = Math.min(190, Math.max(90, layout.bodyWidth * .42));
  const top = layout.top - Math.min(88, Math.max(50, layout.cell * .8));
  if (accessory.type.includes("cap")) {
    return `
      <path d="M ${512 - width / 2} ${layout.top + 3}
        Q 512 ${top - 18} ${512 + width / 2} ${layout.top + 3} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>
      <path d="M 512 ${layout.top}
        Q ${512 + width * .6} ${layout.top - 12}
          ${512 + width * .72} ${layout.top + 18}"
        fill="none" stroke="${color}" stroke-width="16"
        stroke-linecap="round"/>`;
  }
  return `
      <rect x="${512 - width * .28}" y="${top}" width="${width * .56}"
        height="${layout.top - top + 4}" rx="10"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>
      <rect x="${512 - width / 2}" y="${layout.top - 14}" width="${width}"
        height="22" rx="10" fill="${color}" stroke="#4b405a"
        stroke-width="6"/>`;
}

function accessoryMarkup(spec, layout) {
  const accessory = spec.accessory;
  if (!accessory) return "";
  const type = accessory.type;
  const color = accessory.color ?? accessory.colors?.[0] ?? spec.accent;
  const top = layout.top;
  const face = facePlacement(spec, layout);
  let markup;

  if (type.includes("crown")) {
    markup = crownMarkup(accessory, layout);
  } else if (type.includes("glasses") || type === "oversized-eyes") {
    markup = glassesMarkup(accessory, spec, layout);
  } else if (type.includes("mask")) {
    markup = maskMarkup(accessory, spec, layout);
  } else if (type.includes("hat") || type.includes("cap")) {
    markup = hatMarkup(accessory, layout);
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
    const spread = Math.min(150, Math.max(60, layout.bodyWidth * .25));
    markup = `
      <path d="M ${512 - spread - 48} ${top + 5}
        L ${512 - spread} ${top - 78}
        L ${512 - spread + 48} ${top + 5} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"/>
      <path d="M ${512 + spread - 48} ${top + 5}
        L ${512 + spread} ${top - 78}
        L ${512 + spread + 48} ${top + 5} Z"
        fill="${accessory.colors?.[1] ?? color}"
        stroke="#4b405a" stroke-width="6"/>`;
  } else if (type === "antennae") {
    markup = `
      <path d="M ${512 - 55} ${top + 5} Q ${512 - 90} ${top - 80}
        ${512 - 120} ${top - 95}
        M ${512 + 55} ${top + 5} Q ${512 + 90} ${top - 80}
        ${512 + 120} ${top - 95}"
        fill="none" stroke="${color}" stroke-width="10"
        stroke-linecap="round"/>
      <circle cx="${512 - 120}" cy="${top - 95}" r="16" fill="${color}"/>
      <circle cx="${512 + 120}" cy="${top - 95}" r="16" fill="${color}"/>`;
  } else if (type === "plume") {
    markup = `
      <path d="M 512 ${top + 2}
        Q ${512 + 105} ${top - 85} ${512 + 35} ${top - 145}
        Q ${512 - 45} ${top - 75} 512 ${top + 2} Z"
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
    markup = `
      <path d="M 512 ${top - 72}
        L ${526} ${top - 28} L ${572} ${top - 28}
        L ${535} ${top - 2} L ${548} ${top + 42}
        L 512 ${top + 16} L ${476} ${top + 42}
        L ${489} ${top - 2} L ${452} ${top - 28}
        L ${498} ${top - 28} Z"
        fill="${color}" stroke="#4b405a" stroke-width="6"
        stroke-linejoin="round"/>`;
  }

  return `
    <g id="accessory" data-accessory="${escapeAttribute(type)}">
      ${markup}
    </g>`;
}

export function renderCharacterSvg(spec) {
  if (spec.number < 11 || spec.source !== "reference") {
    throw new RangeError("connected renderer only supports reference assets 11–100");
  }
  const layout = fitGrid(spec);
  return `<svg xmlns="http://www.w3.org/2000/svg"
    width="1024" height="1536" viewBox="0 0 1024 1536"
    role="img" aria-label="숫자 ${escapeAttribute(spec.number)} 블록 캐릭터">
    ${definitions()}
    <g id="limbs">${limbMarkup(spec, layout)}</g>
    <g id="body" data-cell-gap="0"
      data-safe-fill="${layout.safeFill.toFixed(2)}"
      filter="url(#bodyShadow)">${bodyMarkup(spec, layout)}</g>
    <g id="face">${faceMarkup(spec, layout)}</g>
    ${accessoryMarkup(spec, layout)}
  </svg>`;
}

function parseRange(argv) {
  const fromIndex = argv.indexOf("--from");
  const toIndex = argv.indexOf("--to");
  const from = Number(fromIndex >= 0 ? argv[fromIndex + 1] : 11);
  const to = Number(toIndex >= 0 ? argv[toIndex + 1] : 100);
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 11 ||
    to > 100 ||
    from > to
  ) {
    throw new RangeError("render range must satisfy 11 <= from <= to <= 100");
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
      const outputPath = join(outputDirectory, characterAsset(number));
      await writeFile(svgPath, renderCharacterSvg(buildCharacterSpec(number)), "utf8");
      await rasterize(svgPath, outputPath);
      await unlink(svgPath);
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
