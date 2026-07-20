import test from "node:test";
import assert from "node:assert/strict";
import { buildCharacterSpec } from "../src/character-spec.mjs";
import { renderCharacterSvg } from "../scripts/render_character_pack.mjs";

function regionMarkup(svg, id) {
  return svg.match(
    new RegExp(`<g id="region-${id}">([\\s\\S]*?)</g>`)
  )?.[1] ?? "";
}

function paintedRegionCellCount(svg, id) {
  return (
    regionMarkup(svg, id).match(/data-(?:region-)?cell=/g) ?? []
  ).length;
}

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

test("모든 비오버레이 카탈로그 영역은 실제 셀을 칠한다", () => {
  for (let number = 11; number <= 100; number += 1) {
    const spec = buildCharacterSpec(number);
    const svg = renderCharacterSvg(spec);
    for (const region of spec.regions.filter(item => item.id !== "belt")) {
      assert.ok(
        paintedRegionCellCount(svg, region.id) > 0,
        `${number}의 ${region.id} 영역이 셀을 칠해야 한다`
      );
    }
  }
});

test("겹치는 영역은 24의 중앙선, 26의 윗띠, 75의 얼굴 패널을 보존한다", () => {
  assert.equal(
    paintedRegionCellCount(renderCharacterSvg(buildCharacterSpec(24)), "center-stripe"),
    4
  );
  assert.equal(
    paintedRegionCellCount(renderCharacterSvg(buildCharacterSpec(26)), "top-band"),
    4
  );
  assert.equal(
    paintedRegionCellCount(renderCharacterSvg(buildCharacterSpec(75)), "face-panel"),
    12
  );
});

test("복합 액세서리는 각 구성 요소를 모두 렌더링한다", () => {
  const topHatGlasses = renderCharacterSvg(buildCharacterSpec(21));
  assert.match(topHatGlasses, /data-accessory-part="hat"/);
  assert.match(topHatGlasses, /data-accessory-part="glasses"/);

  const crownAndWings = renderCharacterSvg(buildCharacterSpec(91));
  assert.match(crownAndWings, /data-accessory-part="crown"/);
  assert.match(crownAndWings, /data-accessory-part="wings"/);
});

test("꽃, 꽃띠, 폼폼, 보석, 메달은 고유 액세서리로 렌더링한다", () => {
  for (const [number, part] of [
    [13, "flower"],
    [35, "flower-band"],
    [68, "pom-poms"],
    [71, "gem"],
    [80, "medallion"]
  ]) {
    const svg = renderCharacterSvg(buildCharacterSpec(number));
    assert.match(svg, new RegExp(`data-accessory-part="${part}"`));
  }
});
