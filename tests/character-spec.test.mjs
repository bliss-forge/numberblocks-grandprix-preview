import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCharacterSpec,
  characterAsset
} from "../src/character-spec.mjs";

test("1~100은 정확한 수의 겹치지 않는 블록 좌표를 가진다", () => {
  for (let number = 1; number <= 100; number += 1) {
    const { cells } = buildCharacterSpec(number);
    assert.equal(cells.length, number);
    assert.equal(
      new Set(cells.map(({ x, y }) => `${x}:${y}`)).size,
      number
    );
  }
});

test("대표 합성수는 읽기 쉬운 직사각형 몸체를 사용한다", () => {
  assert.deepEqual(buildCharacterSpec(12).canvas.grid, [3, 4]);
  assert.deepEqual(buildCharacterSpec(25).canvas.grid, [5, 5]);
  assert.deepEqual(buildCharacterSpec(36).canvas.grid, [6, 6]);
  assert.deepEqual(buildCharacterSpec(100).canvas.grid, [10, 10]);
});

test("캐릭터 파일 이름은 숫자 기반으로 안정적이다", () => {
  assert.equal(characterAsset(1), "number-001.png");
  assert.equal(characterAsset(100), "number-100.png");
  assert.throws(() => characterAsset(0), RangeError);
});
