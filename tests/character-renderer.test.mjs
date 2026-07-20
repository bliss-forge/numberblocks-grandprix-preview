import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterSpec } from "../src/character-spec.mjs";
import { renderCharacterSvg } from "../scripts/render_character_pack.mjs";

test("렌더러는 투명 캔버스와 모든 블록을 출력한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(17));
  assert.match(svg, /viewBox="0 0 1024 1536"/);
  assert.equal((svg.match(/data-cell=/g) ?? []).length, 17);
  assert.match(svg, /radialGradient/);
  assert.match(svg, /aria-label="숫자 17 블록 캐릭터"/);
});

test("얼굴과 팔다리가 몸체와 별도 레이어로 존재한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(100));
  assert.match(svg, /id="face"/);
  assert.match(svg, /id="limbs"/);
  assert.match(svg, /id="body"/);
});
