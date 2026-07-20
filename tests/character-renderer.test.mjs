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

function groupMarkup(svg, id) {
  return svg.match(new RegExp(`<g id="${id}"[^>]*>([\\s\\S]*?)</g>`))?.[1] ?? "";
}

function bodyRects(svg) {
  return [...svg.matchAll(
    /<rect data-cell="\d+" x="([\d.-]+)" y="([\d.-]+)"\s+width="([\d.-]+)" height="([\d.-]+)"/g
  )].map(match => ({
    x: Number(match[1]),
    y: Number(match[2]),
    width: Number(match[3]),
    height: Number(match[4])
  }));
}

function pathStarts(markup) {
  return [...markup.matchAll(
    /<path d="M\s+([\d.-]+)\s+([\d.-]+)/g
  )].map(match => ({ x: Number(match[1]), y: Number(match[2]) }));
}

function containsPoint(rect, point) {
  return point.x >= rect.x && point.x <= rect.x + rect.width &&
    point.y >= rect.y && point.y <= rect.y + rect.height;
}

function triangleBaseIntervals(markup) {
  return [...markup.matchAll(
    /<path d="M\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)\s+L\s+([\d.-]+)\s+([\d.-]+)\s+Z"/g
  )].map(match => ({
    left: Math.min(Number(match[1]), Number(match[5])),
    right: Math.max(Number(match[1]), Number(match[5])),
    y: Number(match[2])
  }));
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

test("전체 캐릭터 정규화는 한 개의 균일 배율을 사용한다", () => {
  const svg = renderCharacterSvg(buildCharacterSpec(38), {
    normalization: { scale: .75, translateX: 12, translateY: 34 }
  });
  assert.match(
    svg,
    /<g id="character" transform="matrix\(0?\.75 0 0 0?\.75 12 34\)">/
  );
  assert.match(
    svg,
    /<g id="character"[^>]*>[\s\S]*id="limbs"[\s\S]*id="body"[\s\S]*id="face"/
  );
});

test("계단 캐릭터의 양팔은 선택한 행의 실제 점유 셀에 이어진다", () => {
  for (const number of [15, 45, 55, 66, 78]) {
    const svg = renderCharacterSvg(buildCharacterSpec(number));
    const starts = pathStarts(groupMarkup(svg, "limbs")).slice(0, 2);
    const rects = bodyRects(svg);
    assert.equal(starts.length, 2, `${number} arm paths`);
    for (const [index, start] of starts.entries()) {
      assert.ok(
        rects.some(rect => containsPoint(rect, start)),
        `${number} ${index === 0 ? "left" : "right"} arm starts at occupied cell`
      );
    }
  }
});

test("계단 캐릭터의 고양이 귀 밑변은 실제 맨위 실루엣에 닿는다", () => {
  for (const number of [15, 55, 66, 78]) {
    const svg = renderCharacterSvg(buildCharacterSpec(number));
    const rects = bodyRects(svg);
    const topY = Math.min(...rects.map(rect => rect.y));
    const topRects = rects.filter(rect => rect.y === topY);
    const topLeft = Math.min(...topRects.map(rect => rect.x));
    const topRight = Math.max(...topRects.map(rect => rect.x + rect.width));
    const ears = triangleBaseIntervals(groupMarkup(svg, "accessory"));
    assert.equal(ears.length, 2, `${number} ears`);
    for (const [index, ear] of ears.entries()) {
      const overlap = Math.min(ear.right, topRight) - Math.max(ear.left, topLeft);
      assert.ok(overlap > 0, `${number} ${index === 0 ? "left" : "right"} ear overlap`);
      assert.ok(ear.y >= topY && ear.y <= topY + topRects[0].height, `${number} ear y`);
    }
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

test("대표 확장 캐릭터는 모든 영역, 몸체, 얼굴, 팔다리를 렌더링한다", () => {
  for (const number of [101, 111, 125, 140, 150]) {
    const spec = buildCharacterSpec(number);
    const svg = renderCharacterSvg(spec);
    for (const region of spec.regions.filter(item => item.id !== "belt")) {
      assert.ok(
        paintedRegionCellCount(svg, region.id) > 0,
        `${number}의 ${region.id} 영역이 셀을 칠해야 한다`
      );
    }
    assert.match(svg, /id="body"/, `${number} body`);
    assert.match(svg, /id="face"/, `${number} face`);
    assert.match(svg, /id="limbs"/, `${number} limbs`);
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
