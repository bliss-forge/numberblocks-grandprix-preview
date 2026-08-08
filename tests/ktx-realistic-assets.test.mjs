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

function webpDimensions(buffer) {
  assert.equal(buffer.toString("ascii", 0, 4), "RIFF");
  assert.equal(buffer.toString("ascii", 8, 12), "WEBP");
  const chunk = buffer.toString("ascii", 12, 16);
  if (chunk === "VP8 ") {
    return {
      width: buffer.readUInt16LE(26) & 0x3fff,
      height: buffer.readUInt16LE(28) & 0x3fff
    };
  }
  if (chunk === "VP8L") {
    const bits = buffer.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >>> 14) & 0x3fff) + 1
    };
  }
  assert.equal(chunk, "VP8X");
  return {
    width: buffer.readUIntLE(24, 3) + 1,
    height: buffer.readUIntLE(27, 3) + 1
  };
}

test("실사 SRT는 여섯 환경과 세 운전실 상태를 제공한다", () => {
  assert.deepEqual(Object.keys(REALISTIC_TRAIN_ASSETS.srt.exterior).sort(),
    ["city", "field", "mountain", "river", "sea", "tunnel"]);
  assert.equal(realisticCabAsset("night", "mountain"),
    "assets/train-realistic/cab-night.webp");
  assert.equal(realisticCabAsset("day", "tunnel"),
    "assets/train-realistic/cab-tunnel.webp");
});

test("SRT의 알 수 없는 환경은 기본 장면을 고르고 다른 열차는 실사를 쓰지 않는다", () => {
  assert.equal(realisticExteriorAsset("srt", "unknown"),
    "assets/train-realistic/srt-exterior-city.webp");
  assert.equal(realisticExteriorAsset("ktx", "city"), null);
  assert.equal(realisticExteriorAsset("unknown", "unknown"), null);
});

test("프로토타입 열차 ID도 실사 장면을 고르지 않는다", () => {
  assert.equal(realisticExteriorAsset("constructor", "city"), null);
  assert.equal(realisticExteriorAsset("toString", "city"), null);
});

test("매니페스트의 실사 자산이 모두 존재하고 비어 있지 않다", async () => {
  const paths = realisticAssetPaths();
  assert.equal(paths.length, 9);
  for (const file of paths) {
    const stat = await fs.stat(new URL(`../${file}`, import.meta.url));
    assert.ok(stat.size > 20_000, `${file} is a real image asset`);
  }
});

test("실사 장면은 1280px 화면에서 2배 밀도를 제공한다", async () => {
  for (const file of realisticAssetPaths()) {
    const image = await fs.readFile(new URL(`../${file}`, import.meta.url));
    const { width, height } = webpDimensions(image);
    assert.ok(width >= 2560, `${file} width ${width} is below 2x desktop density`);
    assert.ok(height >= 1440, `${file} height ${height} is below 2x desktop density`);
  }
});
