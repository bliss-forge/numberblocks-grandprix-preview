import test from "node:test";
import assert from "node:assert/strict";
import {
  REALISTIC_TRAIN_ASSETS,
  realisticCabAsset,
  realisticExteriorAsset
} from "../src/ktx-realistic-assets.mjs";

test("실사 SRT는 여섯 환경과 세 운전실 상태를 제공한다", () => {
  assert.deepEqual(Object.keys(REALISTIC_TRAIN_ASSETS.srt.exterior).sort(),
    ["city", "field", "mountain", "river", "sea", "tunnel"]);
  assert.equal(realisticCabAsset("night", "mountain"),
    "assets/train-realistic/cab-night.webp");
  assert.equal(realisticCabAsset("day", "tunnel"),
    "assets/train-realistic/cab-tunnel.webp");
});

test("알 수 없는 열차와 환경은 안전한 기본 장면을 고른다", () => {
  assert.equal(realisticExteriorAsset("unknown", "unknown"),
    "assets/train-realistic/srt-exterior-city.webp");
});
