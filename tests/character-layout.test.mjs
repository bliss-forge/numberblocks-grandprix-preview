import test from "node:test";
import assert from "node:assert/strict";
import { characterLayoutScaleCap } from "../src/character-layout.mjs";

test("보이는 실루엣을 캐릭터 구역 88% × 82% 안에 맞춘다", () => {
  const cap = characterLayoutScaleCap({
    zoneWidth: 500,
    zoneHeight: 300,
    imageWidth: 200,
    imageHeight: 240,
    metric: { width: 0.8, height: 0.75 },
    widthScale: 1.25
  });
  assert.equal(cap, Math.min(
    (500 * 0.88) / (200 * 0.8 * 1.25),
    (300 * 0.82) / (240 * 0.75)
  ));
});

test("잘못된 측정값은 확대 없는 안전 상한 1을 사용한다", () => {
  for (const input of [
    {},
    { zoneWidth: 0, zoneHeight: 100, imageWidth: 20, imageHeight: 20,
      metric: { width: 1, height: 1 }, widthScale: 1 },
    { zoneWidth: 100, zoneHeight: 100, imageWidth: 20, imageHeight: 20,
      metric: null, widthScale: 1 }
  ]) {
    assert.equal(characterLayoutScaleCap(input), 1);
  }
});
