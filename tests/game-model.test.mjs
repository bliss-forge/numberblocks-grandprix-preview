import test from "node:test";
import assert from "node:assert/strict";
import {
  NUMBERBLOCKS,
  applyDigit,
  createProblem,
  deleteLastDigit,
  isModeAvailable,
  normalizeDifficulty,
  problemKey
} from "../src/game-model.mjs";
import { characterAsset } from "../src/character-spec.mjs";

test("1~150 캐릭터 메타데이터가 모두 존재한다", () => {
  assert.deepEqual(
    Object.keys(NUMBERBLOCKS).map(Number),
    Array.from({ length: 150 }, (_, index) => index + 1)
  );
  for (let number = 1; number <= 150; number += 1) {
    assert.equal(NUMBERBLOCKS[number].asset, characterAsset(number));
  }
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
  assert.ok(createProblem("add", "challenge", () => 0.999).answer <= 150);
  assert.equal(
    createProblem("add", "challenge", () => 0.9999999).answer,
    150
  );
});

test("뺄셈은 난이도별 피감수와 정답 범위를 지킨다", () => {
  for (const [difficulty, max] of [
    ["easy", 10],
    ["steady", 20],
    ["challenge", 50]
  ]) {
    for (const rng of [() => 0, () => 0.41, () => 0.999999]) {
      const problem = createProblem("sub", difficulty, rng);
      assert.equal(problem.mode, "sub");
      assert.ok(problem.operands[0] > problem.operands[1]);
      assert.equal(problem.answer, problem.operands[0] - problem.operands[1]);
      assert.ok(problem.operands[0] <= max);
      assert.ok(problem.answer >= 1 && problem.answer <= max);
      assert.equal(problem.promptKey, "prompt-sub");
    }
  }
});

test("곱셈은 난이도별 인수와 결과 상한을 지킨다", () => {
  for (const [difficulty, max] of [
    ["easy", 10],
    ["steady", 50],
    ["challenge", 150]
  ]) {
    for (const rng of [() => 0, () => 0.37, () => 0.999]) {
      const problem = createProblem("mul", difficulty, rng);
      assert.ok(problem.operands[0] >= 1 && problem.operands[0] <= 10);
      assert.ok(problem.operands[1] >= 1 && problem.operands[1] <= (
        difficulty === "challenge" ? 15 : 10
      ));
      assert.ok(problem.answer <= max);
    }
  }

  assert.deepEqual(
    createProblem("mul", "challenge", () => 0.9999999).operands,
    [10, 15]
  );
  assert.equal(createProblem("mul", "challenge", () => 0.9999999).answer, 150);
});

test("최근에 나온 교환식은 다음 후보에서 피한다", () => {
  const first = createProblem("mul", "easy", () => 0);
  const second = createProblem("mul", "easy", () => 0, [problemKey(first)]);

  assert.notEqual(problemKey(second), problemKey(first));
});

test("뺄셈 문제 키는 피감수와 감수의 순서를 보존한다", () => {
  assert.equal(problemKey({ mode: "sub", operands: [8, 3] }), "sub:8:3");
  assert.notEqual(
    problemKey({ mode: "sub", operands: [8, 3] }),
    problemKey({ mode: "sub", operands: [3, 8] })
  );
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

test("입력 버퍼에서 마지막 숫자를 지운다", () => {
  assert.equal(deleteLastDigit("150"), "15");
  assert.equal(deleteLastDigit("1"), "");
  assert.equal(deleteLastDigit(""), "");
});
