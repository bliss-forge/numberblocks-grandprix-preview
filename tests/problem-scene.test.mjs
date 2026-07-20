import test from "node:test";
import assert from "node:assert/strict";
import { equationText } from "../src/problem-scene.mjs";

test("더하기와 곱셈 식을 화면용 기호로 만든다", () => {
  assert.equal(
    equationText({ mode: "add", operands: [6, 38] }),
    "6 + 38"
  );
  assert.equal(
    equationText({ mode: "mul", operands: [6, 8] }),
    "6 × 8"
  );
});

test("숫자 세기는 피연산자 장면을 만들지 않는다", () => {
  assert.throws(
    () => equationText({ mode: "count", answer: 6 }),
    TypeError
  );
});
