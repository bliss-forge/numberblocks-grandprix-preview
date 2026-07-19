import test from "node:test";
import assert from "node:assert/strict";
import { NUMBERBLOCKS, createProblem, applyDigit } from "../src/game-model.mjs";

test("1~10 캐릭터 메타데이터가 모두 존재한다", () => {
  assert.deepEqual(Object.keys(NUMBERBLOCKS).map(Number), [1,2,3,4,5,6,7,8,9,10]);
});

test("세기 모드는 연속 정답 수에 따라 3, 5, 10까지 확장된다", () => {
  assert.equal(createProblem("count", { count: 0 }, () => 0.999).answer, 3);
  assert.equal(createProblem("count", { count: 3 }, () => 0.999).answer, 5);
  assert.equal(createProblem("count", { count: 6 }, () => 0.999).answer, 10);
});

test("더하기 문제의 합은 난이도 한도를 넘지 않는다", () => {
  const easy = createProblem("add", { add: 0 }, () => 0.999);
  const hard = createProblem("add", { add: 4 }, () => 0.999);
  assert.ok(easy.answer <= 5);
  assert.ok(hard.answer <= 10);
});

test("10을 입력할 때 첫 번째 1은 접두사로 유지된다", () => {
  assert.deepEqual(applyDigit("", "1", 10), { buffer: "1", status: "prefix" });
  assert.deepEqual(applyDigit("1", "0", 10), { buffer: "10", status: "correct" });
  assert.deepEqual(applyDigit("", "9", 10), { buffer: "", status: "wrong" });
});
