// 디자인 정본 락 — 트럭 "포장이"의 색과 비례를 기계적으로 지킨다.
// 정본은 목업 v3(mockups/v3/*.html)이다. 이 파일이 깨진다면 코드가 아니라
// 디자인이 왜곡된 것이다. 값을 고치지 말고 그림을 고쳐라.
//
// v1 은 흰 트럭이었다. v3 목업이 노란 포장이를 정본으로 세우면서 팔레트를 옮겼고,
// 정면 치수 비례(§4)는 한 자리도 바꾸지 않아 아래 비율 검사는 그대로 살아 있다.

import test from "node:test";
import assert from "node:assert/strict";
import {
  TRUCK_COLORS,
  TRUCK_FRONT_METRICS,
  TRUCK_VIEWS,
  truckFront34ReverseSvg,
  truckFront34Svg,
  truckFrontSvg,
  truckRearSvg,
  truckSideReverseSvg,
  truckSideSvg,
  truckSvg,
  truckSvgForDirection,
  truckViewForDirection,
} from "../src/delivery-truck-art.mjs";

// 목업 v3 색상표. 한 글자도 바꾸지 않는다.
const LOCKED_COLORS = {
  body: "#FFC531",
  bodyLight: "#FFD766",
  edge: "#E8A61E",
  logo: "#FFF6D9",
  logoInk: "#6B5433",
  glass: "#DDF1FB",
  glassEdge: "#B9DCEC",
  ink: "#39434C",
  smile: "#B3541E",
  cheek: "#FF9E8A",
  chassis: "#5B6472",
  hub: "#C9D2DA",
  name: "#8A5A10",
  tailRed: "#E86A50",
  tailAmber: "#F5A623",
};

// 도면 밖에서 쓰는 것이 허용된 보조 색 — 눈 흰자뿐이다(그림자는 rgba 라 여기 없다).
const NEUTRAL_EXTRAS = new Set(["#fff"]);

test("트럭 색상표가 디자인 정본과 정확히 일치한다", () => {
  assert.deepEqual({ ...TRUCK_COLORS }, LOCKED_COLORS);
});

test("정면 치수 비례가 시트 §4 를 지킨다 (오차 ±2%p)", () => {
  const { totalHeight, windshieldHeight, eyeDiameter, grilleHeight } = TRUCK_FRONT_METRICS;
  const pct = value => (value / totalHeight) * 100;

  assert.ok(Math.abs(pct(windshieldHeight) - 38) <= 2, `창문 높이 ${pct(windshieldHeight).toFixed(1)}%`);
  assert.ok(Math.abs(pct(eyeDiameter) - 16) <= 2, `눈 지름 ${pct(eyeDiameter).toFixed(1)}%`);
  assert.ok(Math.abs(pct(grilleHeight) - 6) <= 2, `그릴 높이 ${pct(grilleHeight).toFixed(1)}%`);
});

test("정면 뷰의 전체 너비와 높이가 100% 기준값과 같다", () => {
  const { left, top, totalWidth, totalHeight, viewBox } = TRUCK_FRONT_METRICS;
  const [, , boxWidth, boxHeight] = viewBox.split(" ").map(Number);

  assert.equal(left + totalWidth, boxWidth - left, "좌우 여백이 대칭이 아니다");
  assert.equal(totalWidth, totalHeight, "정면은 너비 100% = 높이 100%");
  assert.ok(top + totalHeight <= boxHeight, "차량이 viewBox 를 넘는다");
});

test("여섯 방향 뷰가 모두 그려진다", () => {
  assert.deepEqual([...TRUCK_VIEWS], ["front", "front34", "side", "front34-rev", "side-rev", "rear"]);

  for (const view of TRUCK_VIEWS) {
    const markup = truckSvg(view);
    assert.match(markup, /^<svg /, `${view}: svg 로 시작해야 한다`);
    assert.match(markup, /viewBox="0 0 \d+ \d+"/, `${view}: viewBox 가 없다`);
    assert.ok(markup.includes(`dv-truck-${view}`), `${view}: 뷰 클래스가 없다`);
    assert.ok(markup.includes('aria-hidden="true"'), `${view}: 장식 SVG 는 aria-hidden 이다`);
  }
});

test("모르는 뷰 이름은 조용히 넘어가지 않는다", () => {
  assert.throws(() => truckSvg("top"), /알 수 없는 트럭 뷰/);
});

test("반대 방향 뷰는 같은 차를 좌우 반전한 것이다", () => {
  // 새로 그린 게 아니라 뒤집은 것임을 증명한다 — 시트: "모든 방향은 동일 차량".
  const viewBoxWidth = markup => Number(markup.match(/viewBox="0 0 (\d+) \d+"/)[1]);
  const inner = markup => markup.replace(/^<svg [^>]*>/, "").replace(/<\/svg>$/, "");

  const pairs = [
    [truckSideSvg(), truckSideReverseSvg()],
    [truckFront34Svg(), truckFront34ReverseSvg()],
  ];

  for (const [base, reversed] of pairs) {
    const width = viewBoxWidth(base);
    assert.equal(width, viewBoxWidth(reversed), "반전 뷰의 viewBox 가 원본과 다르다");
    const expected = `<g transform="translate(${width} 0) scale(-1 1)">${inner(base)}</g>`;
    assert.equal(inner(reversed), expected, "반대 뷰가 원본의 반전이 아니다");
  }
});

test("도면에 정본 밖 색이 섞이지 않는다", () => {
  const allowed = new Set([...Object.values(LOCKED_COLORS).map(c => c.toLowerCase()), ...NEUTRAL_EXTRAS]);

  for (const view of TRUCK_VIEWS) {
    const used = truckSvg(view).match(/#[0-9a-fA-F]{3,6}/g) ?? [];
    for (const color of used) {
      assert.ok(allowed.has(color.toLowerCase()), `${view}: 정본에 없는 색 ${color}`);
    }
  }
});

test("얼굴은 정면 계열에만 있고 측면·후면에는 없다", () => {
  const hasFace = markup => markup.includes('class="dv-face"');

  assert.ok(hasFace(truckFrontSvg()), "정면에 얼굴이 없다");
  assert.ok(hasFace(truckFront34Svg()), "정면 3/4 에 얼굴이 없다");
  assert.ok(hasFace(truckFront34ReverseSvg()), "정면 3/4 반대에 얼굴이 없다");
  assert.equal(hasFace(truckSideSvg()), false, "측면에서는 얼굴이 보이지 않는다");
  assert.equal(hasFace(truckRearSvg()), false, "후면에서는 얼굴이 보이지 않는다");
});

test("후면에만 후미등이 있다", () => {
  assert.ok(truckRearSvg().includes(TRUCK_COLORS.tailRed));
  assert.ok(truckRearSvg().includes(TRUCK_COLORS.tailAmber));
  assert.equal(truckFrontSvg().includes(TRUCK_COLORS.tailRed), false);
  assert.equal(truckSideSvg().includes(TRUCK_COLORS.tailRed), false);
});

test("주행 방향이 뷰로 옮겨진다", () => {
  assert.equal(truckViewForDirection("up"), "rear");
  assert.equal(truckViewForDirection("down"), "front");
  assert.equal(truckViewForDirection("right"), "side");
  assert.equal(truckViewForDirection("left"), "side-rev");
  assert.equal(truckViewForDirection("idle"), "front34");
  assert.equal(truckViewForDirection(undefined), "front34", "모르는 방향은 대기 자세");

  assert.equal(truckSvgForDirection("left"), truckSideReverseSvg());
});

test("모든 뷰가 지붕 하이라이트를 지닌다 — 같은 차라는 표식", () => {
  for (const view of TRUCK_VIEWS) {
    assert.ok(truckSvg(view).includes(TRUCK_COLORS.bodyLight), `${view}: 지붕 하이라이트가 빠졌다`);
  }
});
