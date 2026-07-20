import test from "node:test";
import assert from "node:assert/strict";
import {
  DIFFICULTY_STORAGE_KEY,
  loadDifficulty,
  saveDifficulty
} from "../src/difficulty-preference.mjs";

test("저장값이 없거나 잘못되면 차근차근을 사용한다", () => {
  assert.equal(loadDifficulty({ getItem: () => null }), "steady");
  assert.equal(loadDifficulty({ getItem: () => "broken" }), "steady");
});

test("저장소 오류가 나도 인메모리 난이도로 계속한다", () => {
  assert.equal(
    loadDifficulty({
      getItem() {
        throw new Error("blocked");
      }
    }),
    "steady"
  );
  assert.equal(
    saveDifficulty(
      {
        setItem() {
          throw new Error("blocked");
        }
      },
      "challenge"
    ),
    "challenge"
  );
});

test("정규화한 난이도를 저장한다", () => {
  const writes = [];
  const storage = { setItem: (...args) => writes.push(args) };

  assert.equal(saveDifficulty(storage, "easy"), "easy");
  assert.deepEqual(writes, [[DIFFICULTY_STORAGE_KEY, "easy"]]);
});
