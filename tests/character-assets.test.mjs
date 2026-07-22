import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { characterShapeScale } from "../src/app-behavior.mjs";
import { characterAsset } from "../src/character-spec.mjs";
import { NUMBERBLOCKS } from "../src/game-model.mjs";
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

test("11~150 연결형 캐릭터 PNG가 고해상도 RGBA로 존재한다", async () => {
  for (let number = 11; number <= 150; number += 1) {
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

test("11~150의 전체 보이는 실루엣이 공통 안전 영역에 정규화된다", async () => {
  const safeWidth = SAFE.right - SAFE.left;
  const safeHeight = SAFE.bottom - SAFE.top;

  for (let number = 11; number <= 150; number += 1) {
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

test("18의 보정된 불투명 몸체 면적은 6보다 크다", async () => {
  const metrics = {};
  for (const number of [6, 18]) {
    const png = await readFile(
      new URL(
        `../assets/characters/${characterAsset(number)}`,
        import.meta.url
      )
    );
    metrics[number] = visiblePngBounds(png);
  }

  const eighteen = NUMBERBLOCKS[18];
  const eighteenScale = Math.min(
    2.2,
    1.2 * characterShapeScale(18, eighteen.rows, eighteen.cols)
  );
  const sixDisplayedArea = metrics[6].opaquePixels;
  const eighteenDisplayedArea =
    metrics[18].opaquePixels * (eighteenScale ** 2);

  assert.ok(
    eighteenDisplayedArea > sixDisplayedArea,
    `18 area ${eighteenDisplayedArea} must exceed 6 area ${sixDisplayedArea}`
  );
});
