import { referenceDesign } from "./character-designs.mjs";

const DIGIT_PALETTES = Object.freeze([
  ["#f06461", "#b92e31"],
  ["#ef373b", "#a91424"],
  ["#f39a35", "#b7581f"],
  ["#ffd34d", "#d58b16"],
  ["#5acb69", "#238b45"],
  ["#43bcd3", "#167c9e"],
  ["#7351bf", "#422783"],
  ["#8a58cd", "#57329a"],
  ["#e754a3", "#a1286e"],
  ["#818b93", "#4b555e"]
]);

const DECADE_PALETTES = Object.freeze([
  ["#ef373b", "#a91424"],
  ["#fff9ef", "#e6272f"],
  ["#edae4b", "#b86c23"],
  ["#f2da42", "#b89d19"],
  ["#5acb69", "#238b45"],
  ["#57c7dc", "#2388aa"],
  ["#7755c6", "#432989"],
  ["#8158cb", "#513199"],
  ["#e95aa8", "#a62b72"],
  ["#818b93", "#4b555e"],
  ["#f06461", "#b92e31"]
]);

const LEGACY_ASSETS = Object.freeze([
  "",
  "one.png",
  "two.png",
  "three.png",
  "four.png",
  "five.png",
  "six.png",
  "seven.png",
  "eight.png",
  "nine.png",
  "ten.png"
]);

const GRID_PREFERENCES = new Map([
  [1, [1, 1]],
  [2, [1, 2]],
  [3, [1, 3]],
  [4, [2, 2]],
  [5, [1, 5]],
  [6, [2, 3]],
  [7, [1, 7]],
  [8, [2, 4]],
  [9, [3, 3]],
  [10, [2, 5]],
  [11, [1, 11]],
  [12, [3, 4]],
  [16, [4, 4]],
  [20, [4, 5]],
  [25, [5, 5]],
  [36, [6, 6]],
  [48, [6, 8]],
  [50, [5, 10]],
  [64, [8, 8]],
  [72, [8, 9]],
  [81, [9, 9]],
  [90, [9, 10]],
  [100, [10, 10]]
]);

function assertNumber(number) {
  if (!Number.isInteger(number) || number < 1 || number > 100) {
    throw new RangeError("character number must be between 1 and 100");
  }
}

function closestGrid(number) {
  if (GRID_PREFERENCES.has(number)) {
    return GRID_PREFERENCES.get(number);
  }

  for (let divisor = Math.floor(Math.sqrt(number)); divisor >= 2; divisor -= 1) {
    if (number % divisor !== 0) continue;
    const other = number / divisor;
    return number < 20 ? [divisor, other] : [other, divisor];
  }

  const cols = number < 20 ? 2 : Math.ceil(Math.sqrt(number));
  return [cols, Math.ceil(number / cols)];
}

function paletteFor(number) {
  if (number < 10) return DIGIT_PALETTES[number];
  return DECADE_PALETTES[Math.min(10, Math.floor(number / 10))];
}

function accentFor(number) {
  const digit = number % 10;
  return DIGIT_PALETTES[digit === 0 ? 1 : digit][0];
}

function cellsFromRows(rows) {
  return rows.flatMap(({ width, offset }, y) =>
    Array.from({ length: width }, (_, index) => ({
      x: offset + index,
      y
    }))
  );
}

function boundsFor(cells) {
  return {
    cols: Math.max(...cells.map(cell => cell.x)) + 1,
    rows: Math.max(...cells.map(cell => cell.y)) + 1
  };
}

export function characterAsset(number) {
  assertNumber(number);
  if (number <= 10) return LEGACY_ASSETS[number];
  return `number-${String(number).padStart(3, "0")}.png`;
}

export function buildCharacterSpec(number) {
  assertNumber(number);

  if (number <= 10) {
    const [cols, rowCount] = closestGrid(number);
    const cells = Array.from({ length: number }, (_, index) => ({
      x: index % cols,
      y: Math.floor(index / cols)
    }));

    return Object.freeze({
      number,
      source: "legacy",
      cells: Object.freeze(cells),
      regions: Object.freeze([]),
      face: null,
      accessory: null,
      palette: Object.freeze(paletteFor(number)),
      accent: accentFor(number),
      pose: number % 4,
      canvas: Object.freeze({
        grid: Object.freeze([cols, rowCount]),
        width: 1024,
        height: 1536
      })
    });
  }

  const design = referenceDesign(number);
  const cells = cellsFromRows(design.rows);
  const bounds = boundsFor(cells);

  return Object.freeze({
    number,
    source: "reference",
    cells: Object.freeze(cells),
    regions: design.regions,
    face: design.face,
    accessory: design.accessory,
    palette: Object.freeze(paletteFor(number)),
    accent: accentFor(number),
    pose: number % 4,
    canvas: Object.freeze({
      grid: Object.freeze([bounds.cols, bounds.rows]),
      width: 1024,
      height: 1536
    })
  });
}
