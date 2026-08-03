import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {
  REALISTIC_TRAIN_ASSETS,
  realisticCabAsset,
  realisticExteriorAsset
} from "../src/ktx-realistic-assets.mjs";

function realisticAssetPaths() {
  return [
    ...Object.values(REALISTIC_TRAIN_ASSETS.srt.exterior),
    ...Object.values(REALISTIC_TRAIN_ASSETS.srt.cab)
  ];
}

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

test("프로토타입 열차 ID도 안전한 기본 장면을 고른다", () => {
  assert.equal(realisticExteriorAsset("constructor", "city"),
    "assets/train-realistic/srt-exterior-city.webp");
  assert.equal(realisticExteriorAsset("toString", "city"),
    "assets/train-realistic/srt-exterior-city.webp");
});

test("매니페스트의 실사 자산이 모두 존재하고 비어 있지 않다", async () => {
  const paths = realisticAssetPaths();
  assert.equal(paths.length, 9);
  for (const file of paths) {
    const stat = await fs.stat(new URL(`../${file}`, import.meta.url));
    assert.ok(stat.size > 20_000, `${file} is a real image asset`);
  }
});
