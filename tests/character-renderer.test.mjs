import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterSpec } from "../src/character-spec.mjs";
import { renderCharacterSvg } from "../scripts/render_character_pack.mjs";

test("연결형 렌더러는 11~100의 모든 셀을 빈틈없이 출력한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(38));
  assert.match(svg, /viewBox="0 0 1024 1536"/);
  assert.equal((svg.match(/data-cell=/g) ?? []).length, 38);
  assert.match(svg, /data-cell-gap="0"/);
  assert.doesNotMatch(svg, /id="blockFill"/);
  assert.match(svg, /aria-label="숫자 38 블록 캐릭터"/);
});

test("38의 분홍 머리와 허리띠가 별도 레이어로 존재한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(38));
  assert.match(svg, /id="region-cap"/);
  assert.match(svg, /id="region-belt"/);
  assert.match(svg, /id="face"/);
  assert.match(svg, /id="limbs"/);
});

test("서로 다른 비율도 같은 안전 영역에 맞춘다", () => {
  for (const number of [11, 38, 50, 72, 99, 100]) {
    const svg = renderCharacterSvg(buildCharacterSpec(number));
    assert.match(svg, /data-safe-fill="0\.(82|83|84|85|86|87|88)"/);
  }
});
