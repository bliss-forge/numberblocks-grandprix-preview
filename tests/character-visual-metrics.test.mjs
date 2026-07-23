import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { characterAsset } from "../src/character-spec.mjs";
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "../src/character-visual-metrics.mjs";
import { visiblePngBounds } from "../scripts/png_alpha_bounds.mjs";

test("1~150 몸체 메타데이터는 실제 PNG 알파 영역과 일치한다", async () => {
  assert.equal(Object.keys(CHARACTER_VISUAL_METRICS).length, 150);

  for (let number = 1; number <= 150; number += 1) {
    const png = await readFile(
      new URL(
        `../assets/characters/${characterAsset(number)}`,
        import.meta.url
      )
    );
    const pngWidth = png.readUInt32BE(16);
    const pngHeight = png.readUInt32BE(20);
    const bounds = visiblePngBounds(png);
    const actual = {
      area: bounds.opaquePixels / (pngWidth * pngHeight),
      width: bounds.width / pngWidth,
      height: bounds.height / pngHeight
    };

    for (const key of ["area", "width", "height"]) {
      assert.ok(
        Math.abs(CHARACTER_VISUAL_METRICS[number][key] - actual[key]) < 1e-12,
        `${number} ${key}`
      );
    }
  }
});

test("1~10 중 가장 큰 몸체 면적을 기준값으로 내보낸다", () => {
  const expected = Math.max(
    ...Array.from(
      { length: 10 },
      (_, index) => CHARACTER_VISUAL_METRICS[index + 1].area
    )
  );
  assert.equal(REFERENCE_VISUAL_AREA, expected);
});
