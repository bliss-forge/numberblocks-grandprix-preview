import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCharacterSpec,
  characterAsset
} from "../src/character-spec.mjs";

function connectedCellCount(cells) {
  const keys = new Set(cells.map(({ x, y }) => `${x}:${y}`));
  const first = cells[0];
  const queue = [first];
  const seen = new Set([`${first.x}:${first.y}`]);

  while (queue.length > 0) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const key = `${x + dx}:${y + dy}`;
      if (keys.has(key) && !seen.has(key)) {
        seen.add(key);
        queue.push({ x: x + dx, y: y + dy });
      }
    }
  }

  return seen.size;
}

test("1~150은 정확한 수의 연결되고 겹치지 않는 블록 좌표를 가진다", () => {
  for (let number = 1; number <= 150; number += 1) {
    const { cells } = buildCharacterSpec(number);
    assert.equal(cells.length, number);
    assert.equal(
      new Set(cells.map(({ x, y }) => `${x}:${y}`)).size,
      number
    );
    assert.equal(connectedCellCount(cells), number);
  }
});

test("1~10은 기존 자산 레이아웃 메타데이터를 유지한다", () => {
  assert.deepEqual(buildCharacterSpec(1).canvas.grid, [1, 1]);
  assert.deepEqual(buildCharacterSpec(4).canvas.grid, [2, 2]);
  assert.deepEqual(buildCharacterSpec(10).canvas.grid, [2, 5]);
});

test("11~100은 완전한 참고 디자인과 연결된 몸체를 가진다", () => {
  for (let number = 11; number <= 100; number += 1) {
    const spec = buildCharacterSpec(number);
    assert.equal(spec.source, "reference");
    assert.equal(spec.cells.length, number);
    assert.equal(connectedCellCount(spec.cells), number);
    assert.ok(spec.regions.length > 0, `${number} regions`);
    assert.ok(Number.isFinite(spec.face.x), `${number} face.x`);
    assert.ok(Number.isFinite(spec.face.y), `${number} face.y`);
  }
});

test("101~150은 완전한 확장 디자인과 연결된 몸체를 가진다", () => {
  for (let number = 101; number <= 150; number += 1) {
    const spec = buildCharacterSpec(number);
    assert.equal(spec.source, "extension");
    assert.equal(spec.cells.length, number);
    assert.equal(connectedCellCount(spec.cells), number);
    assert.ok(spec.regions.length > 0, `${number} regions`);
    assert.ok(Number.isFinite(spec.face.x), `${number} face.x`);
    assert.ok(Number.isFinite(spec.face.y), `${number} face.y`);
    assert.ok(
      spec.cells.some(({ x, y }) => x === spec.face.x && y === spec.face.y),
      `${number} face is placed on an occupied cell`
    );
    assert.deepEqual(
      spec.palette,
      [
        spec.regions.find(region => region.id === "body").color,
        spec.regions.find(region => region.id === "cap").color
      ],
      `${number} palette covers its extension region colors`
    );
  }
});

test("101~150 확장은 한 줄 캡, 정확한 색 띠, 낮은 중앙 얼굴, 매 5번째 외눈을 지킨다", () => {
  const paletteBands = [
    { from: 101, to: 119, colors: ["#6fd4e8", "#286da8"] },
    { from: 120, to: 139, colors: ["#9a75d7", "#5a318f"] },
    { from: 140, to: 150, colors: ["#f084b8", "#a63572"] }
  ];

  for (let number = 101; number <= 150; number += 1) {
    const spec = buildCharacterSpec(number);
    const cap = spec.regions.find(region => region.id === "cap");
    const band = paletteBands.find(({ from, to }) => number >= from && number <= to);
    const expectedFaceRow = Math.floor(spec.canvas.grid[1] * .6);
    const faceRowCells = spec.cells
      .filter(cell => cell.y === expectedFaceRow)
      .sort((a, b) => a.x - b.x);
    const expectedFaceX = faceRowCells[Math.floor((faceRowCells.length - 1) / 2)].x;

    assert.equal(cap.rows, 1, `${number} cap is exactly one row`);
    assert.deepEqual(spec.palette, band.colors, `${number} palette band`);
    assert.equal(spec.face.y, expectedFaceRow, `${number} lower-middle face row`);
    assert.equal(spec.face.x, expectedFaceX, `${number} centered face column`);
    assert.equal(
      spec.accessory?.type === "single-eye",
      number % 5 === 0,
      `${number} every-fifth single-eye rule`
    );
  }
});

test("38은 승인된 연결 구조와 색 영역을 사용한다", () => {
  const spec = buildCharacterSpec(38);
  const widths = Array.from(
    { length: spec.canvas.grid[1] },
    (_, y) => spec.cells.filter(cell => cell.y === y).length
  );
  assert.deepEqual(widths, [3, 5, 5, 5, 5, 5, 5, 5]);
  assert.equal(spec.canvas.grid[0], 5);
  assert.equal(spec.regions.find(region => region.id === "cap").rows, 2);
  assert.equal(spec.regions.find(region => region.id === "belt").afterRow, 4);
  assert.ok(spec.face.y >= 5);
});

test("1~10은 기존 자산, 11~150은 숫자 자산을 사용한다", () => {
  assert.equal(characterAsset(1), "one.png");
  assert.equal(characterAsset(6), "six.png");
  assert.equal(characterAsset(10), "ten.png");
  assert.equal(characterAsset(11), "number-011.png");
  assert.equal(characterAsset(38), "number-038.png");
  assert.equal(characterAsset(100), "number-100.png");
  assert.equal(characterAsset(101), "number-101.png");
  assert.equal(characterAsset(150), "number-150.png");
  assert.equal(buildCharacterSpec(150).source, "extension");
  assert.ok(buildCharacterSpec(150).regions.length > 0);
  assert.throws(() => characterAsset(0), RangeError);
});
