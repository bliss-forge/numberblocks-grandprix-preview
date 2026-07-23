import test from "node:test";
import assert from "node:assert/strict";
import {
  characterNumberScale,
  characterSceneAreaTarget,
  characterSceneScale,
  characterShapeScale,
  characterShapeWidthScale
} from "../src/app-behavior.mjs";
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "../src/character-visual-metrics.mjs";
import { NUMBERBLOCKS } from "../src/game-model.mjs";

test("11~150 전체가 문제와 정답 장면의 최소 몸체 면적에 도달한다", () => {
  for (let number = 11; number <= 150; number += 1) {
    const { rows, cols } = NUMBERBLOCKS[number];
    const metric = CHARACTER_VISUAL_METRICS[number];

    for (const scene of ["problem", "celebration"]) {
      const sceneScale = characterSceneScale({
        number,
        scene,
        rows,
        cols,
        metric,
        referenceArea: REFERENCE_VISUAL_AREA
      });
      const baseScale =
        characterNumberScale(number) * characterShapeScale(number, rows, cols);
      const displayedArea =
        metric.area *
        (baseScale ** 2) *
        characterShapeWidthScale(number, rows, cols) *
        (sceneScale ** 2);
      const minimum =
        REFERENCE_VISUAL_AREA * characterSceneAreaTarget(number, scene);

      assert.ok(
        displayedArea >= minimum - 1e-12,
        `${number} ${scene}: ${displayedArea} < ${minimum}`
      );
    }
  }
});
