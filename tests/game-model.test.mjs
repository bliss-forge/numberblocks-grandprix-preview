import test from "node:test";
import assert from "node:assert/strict";
import {
  NUMBERBLOCKS,
  applyDigit,
  createProblem,
  isModeAvailable,
  normalizeDifficulty,
  problemKey
} from "../src/game-model.mjs";

test("1~10 캐릭터 메타데이터가 모두 존재한다", () => {
  assert.deepEqual(
    Object.keys(NUMBERBLOCKS).map(Number),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
});

test("잘못된 난이도는 차근차근으로 정규화한다", () => {
  assert.equal(normalizeDifficulty("easy"), "easy");
  assert.equal(normalizeDifficulty("steady"), "steady");
  assert.equal(normalizeDifficulty("challenge"), "challenge");
  assert.equal(normalizeDifficulty("unknown"), "steady");
});

test("숫자 세기는 쉬움 10, 차근차근 20까지만 만든다", () => {
  assert.equal(createProblem("count", "easy", () => 0.999).answer, 10);
  assert.equal(createProblem("count", "steady", () => 0.999).answer, 20);
  assert.equal(isModeAvailable("count", "challenge"), false);
  assert.throws(
    () => createProblem("count", "challenge", () => 0.5),
    /unavailable/
  );
});

test("더하기 정답은 난이도 한도에 맞는다", () => {
  assert.ok(createProblem("add", "easy", () => 0.999).answer <= 10);
  assert.ok(createProblem("add", "steady", () => 0.999).answer <= 50);
  assert.ok(createProblem("add", "challenge", () => 0.999).answer <= 100);
  assert.equal(
    createProblem("add", "challenge", () => 0.9999999).answer,
    100
  );
});

test("곱셈은 1~10단 안에서 난이도별 결과 상한을 지킨다", () => {
  for (const [difficulty, max] of [
    ["easy", 10],
    ["steady", 50],
    ["challenge", 100]
  ]) {
    for (const rng of [() => 0, () => 0.37, () => 0.999]) {
      const problem = createProblem("mul", difficulty, rng);
      assert.ok(problem.operands.every(value => value >= 1 && value <= 10));
      assert.ok(problem.answer <= max);
    }
  }

  assert.deepEqual(
    createProblem("mul", "challenge", () => 0.999).operands,
    [10, 10]
  );
});

test("최근에 나온 교환식은 다음 후보에서 피한다", () => {
  const first = createProblem("mul", "easy", () => 0);
  const second = createProblem("mul", "easy", () => 0, [problemKey(first)]);

  assert.notEqual(problemKey(second), problemKey(first));
});

test("100 입력은 1과 10을 접두사로 유지한다", () => {
  assert.deepEqual(
    applyDigit("", "1", 100),
    { buffer: "1", status: "prefix" }
  );
  assert.deepEqual(
    applyDigit("1", "0", 100),
    { buffer: "10", status: "prefix" }
  );
  assert.deepEqual(
    applyDigit("10", "0", 100),
    { buffer: "100", status: "correct" }
  );
});
