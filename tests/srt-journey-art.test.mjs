import test from "node:test";
import assert from "node:assert/strict";
import { ktxTrainSvg, trainDoorSvg } from "../src/srt-journey-art.mjs";

test("SRT 아트는 aria-hidden 처리된 평면 svg 문자열이다", () => {
  const builders = [
    ["door", () => trainDoorSvg(false)],
    ["door", () => trainDoorSvg(true)],
    ["ktx", ktxTrainSvg]
  ];
  builders.forEach(([name, build]) => {
    const svg = build();
    assert.match(svg, /^<svg /, name);
    assert.match(svg, /aria-hidden="true"/, name);
    assert.match(svg, new RegExp(`srt-art-${name}`), name);
    assert.doesNotMatch(svg, /Gradient|filter=|<filter|<animate|<image|url\(/i);
  });
});

test("열차 문은 두 짝·창·손잡이를 그리고 열림 상태를 data-open으로 알린다", () => {
  const closed = trainDoorSvg(false);
  const open = trainDoorSvg(true);

  [closed, open].forEach(svg => {
    // two leaves, each with a window and a handle
    assert.match(svg, /class="srt-art-door-leaves"/);
    assert.equal((svg.match(/#bfe8ff/g) ?? []).length, 2);
    assert.equal((svg.match(/#7d8ea1/g) ?? []).length, 4);
  });

  assert.match(closed, /data-open="false"/);
  assert.match(open, /data-open="true"/);
  // closed leaves meet in the middle, open leaves retract to the sides
  assert.match(closed, /x="41" y="10" width="30"/);
  assert.match(open, /x="56" y="10" width="15"/);
});

test("고속열차 표식은 노즈콘·창 띠·색 띠를 가진다", () => {
  const svg = ktxTrainSvg();
  assert.match(svg, /<path d="M3 38 Q3 23 26 15/);
  assert.match(svg, /<rect x="40" y="17" width="55" height="10" rx="5"/);
  assert.match(svg, /<rect x="10" y="31" width="88" height="7"/);
  // two bogies under the body
  assert.equal((svg.match(/y="41" width="24"/g) ?? []).length, 2);
});
