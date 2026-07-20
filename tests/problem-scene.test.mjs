import test from "node:test";
import assert from "node:assert/strict";
import {
  countCharacterValues,
  equationText
} from "../src/problem-scene.mjs";

test("더하기와 곱셈 식을 화면용 기호로 만든다", () => {
  assert.equal(
    equationText({ mode: "add", operands: [6, 38] }),
    "6 + 38"
  );
  assert.equal(
    equationText({ mode: "mul", operands: [6, 8] }),
    "6 × 8"
  );
  assert.equal(
    equationText({ mode: "sub", operands: [38, 6] }),
    "38 − 6"
  );
});

test("세기 캐릭터는 1부터 20까지 십 블록으로 분해한다", () => {
  assert.deepEqual(countCharacterValues(1), [1]);
  assert.deepEqual(countCharacterValues(10), [10]);
  assert.deepEqual(countCharacterValues(13), [10, 3]);
  assert.deepEqual(countCharacterValues(20), [10, 10]);
  assert.throws(() => countCharacterValues(21), RangeError);
});

test("숫자 세기는 피연산자 장면을 만들지 않는다", () => {
  assert.throws(
    () => equationText({ mode: "count", answer: 6 }),
    TypeError
  );
});
