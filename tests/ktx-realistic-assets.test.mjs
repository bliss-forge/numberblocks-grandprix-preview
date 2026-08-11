import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs/promises";
import zlib from "node:zlib";
import {
  REALISTIC_MOTION_ASSETS,
  REALISTIC_TRAIN_ASSETS,
  realisticCabAsset,
  realisticExteriorAsset,
  realisticMotionAssets
} from "../src/ktx-realistic-assets.mjs";

const QUALITY_METRICS_URL = new URL(
  "../assets/train-realistic/motion/quality-metrics.json",
  import.meta.url
);

function realisticAssetPaths() {
  return [
    ...Object.values(REALISTIC_TRAIN_ASSETS.srt.exterior),
    ...Object.values(REALISTIC_TRAIN_ASSETS.srt.cab)
  ];
}

function realisticMotionAssetPaths() {
  const stations = Array.isArray(REALISTIC_MOTION_ASSETS.station)
    ? REALISTIC_MOTION_ASSETS.station
    : [REALISTIC_MOTION_ASSETS.station];
  const sceneGroups = REALISTIC_MOTION_ASSETS.scenes
    ? Object.values(REALISTIC_MOTION_ASSETS.scenes)
    : Object.values(REALISTIC_MOTION_ASSETS.landscapes ?? {})
      .map(layers => Object.values(layers));
  return [
    REALISTIC_MOTION_ASSETS.train,
    REALISTIC_MOTION_ASSETS.cabMask,
    ...stations,
    ...sceneGroups.flat()
  ];
}

function motionPhotoPaths() {
  return [
    ...REALISTIC_MOTION_ASSETS.station,
    ...Object.values(REALISTIC_MOTION_ASSETS.scenes).flat()
  ];
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function pngDetails(buffer) {
  assert.deepEqual([...buffer.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const chunks = new Map();
  let offset = 8;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    chunks.set(type, [...(chunks.get(type) ?? []), data]);
    offset += 12 + length;
  }
  const ihdr = chunks.get("IHDR")[0];
  const width = ihdr.readUInt32BE(0);
  const height = ihdr.readUInt32BE(4);
  const bitDepth = ihdr[8];
  const colorType = ihdr[9];
  assert.equal(bitDepth, 8, "motion PNG validation expects 8-bit channels");
  assert.ok([2, 3, 4, 6].includes(colorType), "PNG must carry RGB, palette, or channel data");

  const bytesPerPixel = colorType === 6 ? 4 : colorType === 4 ? 2 : colorType === 2 ? 3 : 1;
  const stride = width * bytesPerPixel;
  const inflated = zlib.inflateSync(Buffer.concat(chunks.get("IDAT")));
  const pixels = Buffer.alloc(stride * height);
  const paeth = (a, b, c) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    return pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
  };
  for (let y = 0; y < height; y += 1) {
    const inputRow = y * (stride + 1);
    const outputRow = y * stride;
    const filter = inflated[inputRow];
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[inputRow + 1 + x];
      const left = x >= bytesPerPixel ? pixels[outputRow + x - bytesPerPixel] : 0;
      const up = y > 0 ? pixels[outputRow - stride + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? pixels[outputRow - stride + x - bytesPerPixel]
        : 0;
      const value = filter === 0 ? raw
        : filter === 1 ? raw + left
        : filter === 2 ? raw + up
        : filter === 3 ? raw + Math.floor((left + up) / 2)
        : filter === 4 ? raw + paeth(left, up, upperLeft)
        : NaN;
      assert.ok(Number.isFinite(value), `unsupported PNG filter ${filter}`);
      pixels[outputRow + x] = value & 0xff;
    }
  }
  const transparency = chunks.get("tRNS")?.[0] ?? Buffer.alloc(0);
  const alphaAt = (x, y) => {
    const pixel = y * stride + x * bytesPerPixel;
    if (colorType === 6) return pixels[pixel + 3];
    if (colorType === 4) return pixels[pixel + 1];
    if (colorType === 2) return 255;
    return transparency[pixels[pixel]] ?? 255;
  };
  return { width, height, alphaAt };
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

test("SRT 모션 팩은 선택 환경의 완성 장면 3개와 공용 열차·운전실·역을 제공한다", () => {
  const pack = realisticMotionAssets("srt", "river", "day");
  assert.deepEqual(pack, {
    train: "assets/train-realistic/motion/srt-side-transparent.png",
    trainNight: "assets/train-realistic/motion/srt-side-transparent-night.png",
    cabMask: "assets/train-realistic/motion/cab-window-mask.png",
    station: ["assets/train-realistic/motion/station-platform-a.webp"],
    stationBySky: {
      sunset: "assets/train-realistic/motion/station-platform-sunset.webp",
      night: "assets/train-realistic/motion/station-platform-night.webp",
      dawn: "assets/train-realistic/motion/station-platform-dawn.webp"
    },
    scenes: [
      "assets/train-realistic/motion/river-a.webp",
      "assets/train-realistic/motion/river-b.webp",
      "assets/train-realistic/motion/river-c.webp"
    ]
  });
});

test("KTX는 SRT 모션 자산을 선택하지 않는다", () => {
  assert.equal(realisticMotionAssets("ktx", "city", "day"), null);
});

test("SRT 모션 원본 매니페스트와 선택 결과의 모든 배열은 변경할 수 없다", () => {
  assert.ok(Object.isFrozen(REALISTIC_MOTION_ASSETS));
  assert.ok(Object.isFrozen(REALISTIC_MOTION_ASSETS.station));
  assert.ok(Object.isFrozen(REALISTIC_MOTION_ASSETS.scenes));
  for (const scenes of Object.values(REALISTIC_MOTION_ASSETS.scenes)) {
    assert.ok(Object.isFrozen(scenes));
  }
  const pack = realisticMotionAssets("srt", "city");
  assert.ok(Object.isFrozen(pack));
  assert.ok(Object.isFrozen(pack.station));
  assert.ok(Object.isFrozen(pack.scenes));
  assert.match(realisticMotionAssets("srt", "unknown").scenes[0], /city-a\.webp$/);
});

test("SRT 모션 팩은 서로 다른 21개 래스터를 예산 안에서 제공한다", async () => {
  const paths = realisticMotionAssetPaths();
  assert.equal(paths.length, 21);
  assert.equal(new Set(paths).size, 21);
  let total = 0;
  for (const file of paths) {
    const stat = await fs.stat(new URL(`../${file}`, import.meta.url));
    assert.ok(stat.size > 20_000, `${file} is a real image asset`);
    assert.ok(stat.size <= 1.2 * 1024 * 1024, `${file} exceeds the 1.2MB raster budget`);
    total += stat.size;
  }
  assert.ok(total <= 28 * 1024 * 1024, `motion pack ${total} exceeds 28MB`);
});

test("SRT 장면·역 플레이트는 원본 크기와 정확한 품질 메타데이터를 유지한다", async () => {
  const metrics = JSON.parse(await fs.readFile(QUALITY_METRICS_URL, "utf8"));
  const paths = motionPhotoPaths();
  assert.equal(metrics.schemaVersion, 3);
  assert.equal(paths.length, 19);
  assert.deepEqual(Object.keys(metrics.assets).sort(),
    paths.map(file => file.split("/").at(-1)).sort());

  for (const file of paths) {
    const name = file.split("/").at(-1);
    const metadata = metrics.assets[name];
    const image = await fs.readFile(new URL(`../${file}`, import.meta.url));
    const dimensions = webpDimensions(image);
    assert.ok(dimensions.width >= 1600, `${file} width ${dimensions.width} is below 1600`);
    assert.ok(dimensions.height >= 850, `${file} height ${dimensions.height} is below 850`);
    assert.notDeepEqual(dimensions, { width: 3840, height: 720 }, `${file} is a legacy strip`);
    assert.deepEqual(dimensions, { width: metadata.width, height: metadata.height }, `${file} dimensions`);
    assert.deepEqual(dimensions,
      { width: metadata.sourceWidth, height: metadata.sourceHeight }, `${file} must not be upscaled`);
    assert.equal(metadata.transform, "encode-only", `${file} transform`);
    assert.equal(metadata.seamFree, true, `${file} seam declaration`);
    assert.equal(metadata.bytes, image.length, `${file} byte count`);
    assert.equal(metadata.sha256, sha256(image), `${file} sha256`);
  }
});

test("SRT 환경별 세 장면은 동일하거나 좌우 반전한 복제가 아니다", async () => {
  const metrics = JSON.parse(await fs.readFile(QUALITY_METRICS_URL, "utf8"));
  for (const [land, scenes] of Object.entries(REALISTIC_MOTION_ASSETS.scenes)) {
    const hashes = [];
    for (const file of scenes) {
      const image = await fs.readFile(new URL(`../${file}`, import.meta.url));
      hashes.push(sha256(image));
    }
    assert.equal(new Set(hashes).size, 3, `${land} variants must have unique hashes`);
    assert.deepEqual(metrics.comparisons[land].map(({ variants }) => variants),
      [["a", "b"], ["a", "c"], ["b", "c"]]);
    for (const comparison of metrics.comparisons[land]) {
      assert.ok(comparison.meanDelta > 5,
        `${land}-${comparison.variants.join("/")} duplicates a variant`);
      assert.ok(comparison.mirroredMeanDelta > 5,
        `${land}-${comparison.variants.join("/")} mirrors a variant`);
    }
  }
});

test("SRT 자산 회귀 검증은 플랫폼 외부 실행 파일에 의존하지 않는다", async () => {
  const source = await fs.readFile(new URL(import.meta.url), "utf8");
  const forbidden = [
    ["node:child", "_process"].join(""),
    ["exec", "FileSync"].join(""),
    ["si", "ps"].join("")
  ];
  for (const token of forbidden) {
    assert.ok(!source.includes(token), `test must not depend on ${token}`);
  }
});

test("SRT 측면 열차는 투명 배경과 충분한 피사체 면적을 유지한다", async () => {
  const file = REALISTIC_MOTION_ASSETS.train;
  const image = await fs.readFile(new URL(`../${file}`, import.meta.url));
  const { width, height, alphaAt } = pngDetails(image);
  assert.deepEqual({ width, height }, { width: 2400, height: 640 });
  const corners = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1]];
  for (const [x, y] of corners) assert.equal(alphaAt(x, y), 0, `${file} corner alpha`);
  let transparent = 0;
  let subject = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = alphaAt(x, y);
      if (alpha <= 12) transparent += 1;
      if (alpha >= 220) subject += 1;
    }
  }
  const pixels = width * height;
  assert.ok(transparent / pixels >= 0.1, `${file} needs meaningful transparency`);
  assert.ok(subject / pixels >= 0.03, `${file} subject coverage is too small`);
  assert.ok(subject / pixels <= 0.8, `${file} subject coverage leaves too little transparency`);
});

test("SRT 운전실은 화면을 채우고 전면창 안쪽만 투명하다", async () => {
  const file = REALISTIC_MOTION_ASSETS.cabMask;
  const image = await fs.readFile(new URL(`../${file}`, import.meta.url));
  const { width, height, alphaAt } = pngDetails(image);
  assert.deepEqual({ width, height }, { width: 2560, height: 1440 });
  const opaquePoints = [[0, 0], [width - 1, 0], [0, height - 1], [width - 1, height - 1], [1280, 1100]];
  for (const [x, y] of opaquePoints) assert.ok(alphaAt(x, y) >= 220, `${file} must be opaque at ${x},${y}`);
  const windshieldPoints = [[1280, 220], [700, 260], [1860, 260]];
  for (const [x, y] of windshieldPoints) assert.ok(alphaAt(x, y) <= 12, `${file} windshield must be transparent at ${x},${y}`);
});

test("매니페스트의 실사 자산이 모두 존재하고 비어 있지 않다", async () => {
  const paths = realisticAssetPaths();
  assert.equal(paths.length, 15);   // 시간대 2 + 지형 4 운전실 추가(PR #8)
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
