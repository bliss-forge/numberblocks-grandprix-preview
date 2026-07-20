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

function escapeAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fitGrid(spec) {
  const [cols, rows] = spec.canvas.grid;
  const maxBodyWidth = cols > rows * 1.35 ? 790 : 690;
  const maxBodyHeight = rows > cols * 1.8 ? 980 : 820;
  const cell = Math.floor(Math.min(
    maxBodyWidth / cols,
    maxBodyHeight / rows,
    270
  ));
  const gap = Math.max(3, Math.min(9, Math.round(cell * 0.035)));
  const step = cell;
  const bodyWidth = cols * step;
  const bodyHeight = rows * step;
  return {
    cols,
    rows,
    cell,
    gap,
    step,
    bodyWidth,
    bodyHeight,
    left: Math.round((1024 - bodyWidth) / 2),
    top: Math.round(720 - bodyHeight / 2)
  };
}

function definitions(spec) {
  const [base, deep] = spec.palette;
  const isWhiteBody = base === "#fff9ef";
  const bodyEnd = isWhiteBody ? "#e8edf2" : deep;
  return `
    <defs>
      <linearGradient id="blockFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".72"/>
        <stop offset=".18" stop-color="${base}"/>
        <stop offset="1" stop-color="${bodyEnd}"/>
      </linearGradient>
      <linearGradient id="accentFill" x1="0" y1="0" x2=".8" y2="1">
        <stop offset="0" stop-color="#ffffff" stop-opacity=".38"/>
        <stop offset=".25" stop-color="${spec.accent}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
      <linearGradient id="limbFill" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${base}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
      <radialGradient id="eyeShine" cx=".35" cy=".24" r=".8">
        <stop offset="0" stop-color="#666"/>
        <stop offset=".28" stop-color="#141414"/>
        <stop offset="1" stop-color="#000"/>
      </radialGradient>
      <linearGradient id="mouthFill" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#38232d"/>
        <stop offset="1" stop-color="#08070a"/>
      </linearGradient>
      <filter id="bodyShadow" x="-25%" y="-25%" width="150%" height="160%">
        <feDropShadow dx="0" dy="14" stdDeviation="12"
          flood-color="#24335c" flood-opacity=".24"/>
      </filter>
      <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="7"
          flood-color="#1c2440" flood-opacity=".28"/>
      </filter>
    </defs>`;
}

function rowCellCount(spec, row) {
  return spec.cells.filter(cell => cell.y === row).length;
}

function blockMarkup(spec, cell, index, layout) {
  const count = rowCellCount(spec, cell.y);
  const rowOffset = Math.round((layout.cols - count) * layout.step / 2);
  const x = layout.left + cell.x * layout.step + rowOffset;
  const y = layout.top + cell.y * layout.step;
  const inset = layout.gap / 2;
  const digit = spec.number % 10;
  const accentStart = digit === 0 ? Number.POSITIVE_INFINITY : spec.number - digit;
  const rainbow = ["#ef3d42", "#f3a33e", "#f2d84b", "#57c968", "#44bdd2", "#7854c5", "#e754a3"];
  const isAccent = spec.number > 10 && index >= accentStart;
  const rainbowIndex = isAccent && digit === 7 ? index - accentStart : -1;
  const fill = rainbowIndex >= 0
    ? rainbow[rainbowIndex]
    : isAccent ? "url(#accentFill)" : "url(#blockFill)";
  const radius = Math.max(13, Math.round(layout.cell * .1));
  const highlight = Math.max(4, Math.round(layout.cell * .035));

  return `
    <g data-cell="${index + 1}">
      <rect x="${x + inset}" y="${y + inset}"
        width="${layout.cell - layout.gap}" height="${layout.cell - layout.gap}"
        rx="${radius}" fill="${fill}" stroke="${spec.palette[1]}"
        stroke-width="${Math.max(4, Math.round(layout.cell * .028))}"/>
      <path d="M ${x + radius} ${y + highlight}
        H ${x + layout.cell - radius}"
        fill="none" stroke="#fff" stroke-opacity=".42"
        stroke-width="${highlight}" stroke-linecap="round"/>
    </g>`;
}

function posePoints(spec, layout) {
  const midY = layout.top + Math.min(
    layout.bodyHeight * .58,
    Math.max(layout.cell * 1.4, layout.bodyHeight * .42)
  );
  const raised = spec.pose === 1 || spec.pose === 3;
  const leftEndY = raised ? midY - 150 : midY + 95;
  const rightEndY = spec.pose >= 2 ? midY - 155 : midY + 80;
  return { midY, leftEndY, rightEndY };
}

function limbMarkup(spec, layout) {
  const { midY, leftEndY, rightEndY } = posePoints(spec, layout);
  const leftX = layout.left;
  const rightX = layout.left + layout.bodyWidth;
  const stroke = Math.max(28, Math.min(48, layout.cell * .28));
  const handRadius = stroke * .62;
  const availableReach = Math.max(
    42,
    layout.left - handRadius - 20
  );
  const armReach = Math.min(225, availableReach);
  const legTop = layout.top + layout.bodyHeight - 8;
  const legLength = Math.max(115, Math.min(220, 1390 - legTop));
  const legSpread = Math.min(layout.bodyWidth * .22, 105);
  return `
    <path d="M ${leftX + 8} ${midY}
      C ${leftX - 55} ${midY + 10},
        ${leftX - armReach + 55} ${leftEndY},
        ${leftX - armReach} ${leftEndY}"
      fill="none" stroke="url(#limbFill)" stroke-width="${stroke}"
      stroke-linecap="round"/>
    <path d="M ${rightX - 8} ${midY}
      C ${rightX + 55} ${midY + 10},
        ${rightX + armReach - 55} ${rightEndY},
        ${rightX + armReach} ${rightEndY}"
      fill="none" stroke="url(#limbFill)" stroke-width="${stroke}"
      stroke-linecap="round"/>
    <circle cx="${leftX - armReach}" cy="${leftEndY}" r="${handRadius}"
      fill="#fffaf5" stroke="${spec.palette[1]}" stroke-width="8"/>
    <circle cx="${rightX + armReach}" cy="${rightEndY}" r="${handRadius}"
      fill="#fffaf5" stroke="${spec.palette[1]}" stroke-width="8"/>
    <path d="M ${512 - legSpread} ${legTop}
      Q ${512 - legSpread - 12} ${legTop + legLength * .55}
        ${512 - legSpread - 25} ${legTop + legLength}"
      fill="none" stroke="url(#limbFill)" stroke-width="${stroke + 6}"
      stroke-linecap="round"/>
    <path d="M ${512 + legSpread} ${legTop}
      Q ${512 + legSpread + 12} ${legTop + legLength * .55}
        ${512 + legSpread + 25} ${legTop + legLength}"
      fill="none" stroke="url(#limbFill)" stroke-width="${stroke + 6}"
      stroke-linecap="round"/>`;
}

function facePlacement(spec, layout) {
  const faceY = layout.top + Math.min(
    layout.bodyHeight * .52,
    Math.max(layout.cell * .78, layout.bodyHeight * .34)
  );
  const eyeRadius = Math.max(28, Math.min(76, layout.cell * .35));
  const eyeSpacing = Math.max(45, Math.min(115, layout.bodyWidth * .18));
  return {
    centerX: 512,
    faceY,
    eyeRadius,
    eyeSpacing,
    mouthY: faceY + eyeRadius * 1.25
  };
}

function eyeMarkup(cx, cy, radius, outline) {
  return `
    <g filter="url(#softShadow)">
      <ellipse cx="${cx}" cy="${cy}" rx="${radius * .9}" ry="${radius}"
        fill="#fffdf8" stroke="${outline}" stroke-width="6"/>
      <ellipse cx="${cx}" cy="${cy + radius * .05}"
        rx="${radius * .45}" ry="${radius * .58}" fill="url(#eyeShine)"/>
      <circle cx="${cx - radius * .16}" cy="${cy - radius * .22}"
        r="${radius * .12}" fill="#fff"/>
    </g>`;
}

function faceMarkup(spec, layout) {
  const {
    centerX,
    faceY,
    eyeRadius,
    eyeSpacing,
    mouthY
  } = facePlacement(spec, layout);
  const eyes = spec.number === 1
    ? eyeMarkup(centerX, faceY, eyeRadius * 1.15, spec.palette[1])
    : [
        eyeMarkup(centerX - eyeSpacing, faceY, eyeRadius, spec.palette[1]),
        eyeMarkup(centerX + eyeSpacing, faceY, eyeRadius, spec.palette[1])
      ].join("");
  const mouthWidth = Math.max(80, Math.min(190, layout.bodyWidth * .34));
  const mouthHeight = Math.max(52, Math.min(112, layout.cell * .5));
  const left = centerX - mouthWidth / 2;
  const right = centerX + mouthWidth / 2;

  return `
    ${eyes}
    <g filter="url(#softShadow)">
      <path d="M ${left} ${mouthY}
        Q ${centerX} ${mouthY + mouthHeight * 1.22} ${right} ${mouthY}
        Q ${centerX} ${mouthY + mouthHeight * .28} ${left} ${mouthY} Z"
        fill="url(#mouthFill)" stroke="${spec.palette[1]}"
        stroke-width="8" stroke-linejoin="round"/>
      <path d="M ${left + 14} ${mouthY + 8}
        Q ${centerX} ${mouthY + mouthHeight * .38} ${right - 14} ${mouthY + 8}
        Q ${centerX} ${mouthY + mouthHeight * .08} ${left + 14} ${mouthY + 8} Z"
        fill="#fff"/>
      <path d="M ${centerX - mouthWidth * .22} ${mouthY + mouthHeight * .72}
        Q ${centerX} ${mouthY + mouthHeight * .98}
          ${centerX + mouthWidth * .22} ${mouthY + mouthHeight * .72}
        Q ${centerX} ${mouthY + mouthHeight * .57}
          ${centerX - mouthWidth * .22} ${mouthY + mouthHeight * .72} Z"
        fill="#f36b8c"/>
    </g>`;
}

function accessoryMarkup(spec, layout) {
  const top = layout.top - 22;
  if (spec.number === 3 || spec.number % 10 === 3) {
    return `
      <g id="accessory" filter="url(#softShadow)">
        <path d="M 430 ${top} L 462 ${top - 64} L 512 ${top - 10}
          L 562 ${top - 64} L 594 ${top} Z"
          fill="${spec.accent}" stroke="${spec.palette[1]}" stroke-width="8"
          stroke-linejoin="round"/>
      </g>`;
  }

  if (spec.number % 10 === 7) {
    const colors = ["#ef3d42", "#f3a33e", "#f2d84b", "#57c968", "#44bdd2", "#7854c5"];
    return `
      <g id="accessory">
        ${colors.map((color, index) => `
          <rect x="${452 + index * 20}" y="${top - 44 - index % 2 * 13}"
            width="22" height="48" rx="9" fill="${color}"/>`).join("")}
      </g>`;
  }

  if (spec.number % 10 === 0) {
    return `
      <g id="accessory" filter="url(#softShadow)">
        <rect x="478" y="${top - 50}" width="68" height="55" rx="17"
          fill="${spec.accent}" stroke="${spec.palette[1]}" stroke-width="8"/>
      </g>`;
  }

  return "";
}

export function renderCharacterSvg(spec) {
  const layout = fitGrid(spec);
  const blocks = spec.cells
    .map((cell, index) => blockMarkup(spec, cell, index, layout))
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 1024 1536"
    role="img" aria-label="숫자 ${escapeAttribute(spec.number)} 블록 캐릭터">
    ${definitions(spec)}
    <g id="limbs">${limbMarkup(spec, layout)}</g>
    <g id="body" filter="url(#bodyShadow)">${blocks}</g>
    <g id="face">${faceMarkup(spec, layout)}</g>
    ${accessoryMarkup(spec, layout)}
  </svg>`;
}

function parseRange(argv) {
  const fromIndex = argv.indexOf("--from");
  const toIndex = argv.indexOf("--to");
  const from = Number(fromIndex >= 0 ? argv[fromIndex + 1] : 1);
  const to = Number(toIndex >= 0 ? argv[toIndex + 1] : 100);
  if (
    !Number.isInteger(from) ||
    !Number.isInteger(to) ||
    from < 1 ||
    to > 100 ||
    from > to
  ) {
    throw new RangeError("render range must satisfy 1 <= from <= to <= 100");
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
