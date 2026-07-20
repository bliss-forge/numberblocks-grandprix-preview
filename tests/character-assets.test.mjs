import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { characterAsset } from "../src/character-spec.mjs";
import { visiblePngBounds } from "../scripts/png_alpha_bounds.mjs";

const SAFE = Object.freeze({ left: 120, right: 904, top: 190, bottom: 1240 });

test("1~10 기존 캐릭터 PNG가 존재한다", async () => {
  for (let number = 1; number <= 10; number += 1) {
    const asset = characterAsset(number);
    const png = await readFile(
      new URL(`../assets/characters/${asset}`, import.meta.url)
    );
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
  }
});

test("11~100 연결형 캐릭터 PNG가 고해상도 RGBA로 존재한다", async () => {
  for (let number = 11; number <= 100; number += 1) {
    const asset = characterAsset(number);
    const png = await readFile(
      new URL(`../assets/characters/${asset}`, import.meta.url)
    );
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
    assert.equal(png[25], 6, `${asset} must be RGBA`);
    assert.equal(png.readUInt32BE(16), 1024, `${asset} width`);
    assert.equal(png.readUInt32BE(20), 1536, `${asset} height`);
  }
});

test("11~100의 전체 보이는 실루엣이 공통 안전 영역에 정규화된다", async () => {
  const safeWidth = SAFE.right - SAFE.left;
  const safeHeight = SAFE.bottom - SAFE.top;

  for (let number = 11; number <= 100; number += 1) {
    const asset = characterAsset(number);
    const png = await readFile(
      new URL(`../assets/characters/${asset}`, import.meta.url)
    );
    const bounds = visiblePngBounds(png);
    const fill = Math.max(
      bounds.width / safeWidth,
      bounds.height / safeHeight
    );

    assert.ok(bounds.left >= SAFE.left, `${asset} visible left ${bounds.left}`);
    assert.ok(bounds.right < SAFE.right, `${asset} visible right ${bounds.right}`);
    assert.ok(bounds.top >= SAFE.top, `${asset} visible top ${bounds.top}`);
    assert.ok(bounds.bottom < SAFE.bottom, `${asset} visible bottom ${bounds.bottom}`);
    assert.ok(fill >= .82 && fill <= .88, `${asset} visible fill ${fill}`);
  }
});
