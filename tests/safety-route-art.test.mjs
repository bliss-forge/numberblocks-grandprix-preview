import test from "node:test";
import assert from "node:assert/strict";
import {
  busShelterSvg,
  carSvg,
  bicycleSvg,
  goalStarSvg,
  raisedHandSvg,
  schoolMarkSvg,
  scooterSvg
} from "../src/safety-route-art.mjs";

test("모든 아트는 aria-hidden 처리된 svg 문자열이다", () => {
  const builders = [
    ["car", carSvg],
    ["bicycle", bicycleSvg],
    ["scooter", scooterSvg],
    ["school-mark", schoolMarkSvg],
    ["bus-shelter", busShelterSvg],
    ["raised-hand", raisedHandSvg],
    ["goal-star", goalStarSvg]
  ];
  builders.forEach(([name, build]) => {
    const svg = build();
    assert.match(svg, /^<svg /, name);
    assert.match(svg, /aria-hidden="true"/, name);
    assert.match(svg, new RegExp(`route-art-${name}`), name);
  });
});

test("자전거와 킥보드는 스포크 바퀴와 라이더를 가진다", () => {
  [bicycleSvg(), scooterSvg()].forEach(svg => {
    assert.match(svg, /route-wheel/);
    assert.match(svg, /route-rider-helmet/);
  });
});

test("자동차는 지붕·앞유리·헤드라이트가 있다", () => {
  const svg = carSvg();
  ["route-car-roof", "route-car-glass", "route-car-light"].forEach(cls =>
    assert.match(svg, new RegExp(cls))
  );
});

test("이모지를 대신한 아트는 평면 2D 도형만 쓴다", () => {
  [schoolMarkSvg(), busShelterSvg(), raisedHandSvg(), goalStarSvg()]
    .forEach(svg => {
      assert.doesNotMatch(svg, /Gradient|filter=|<filter|<animate|<image|url\(/i);
      assert.match(svg, /<(rect|circle|path|line)/);
    });
});

test("정류장·손·별은 알아볼 수 있는 부품을 갖춘다", () => {
  const shelter = busShelterSvg();
  // roof, glass panel, bench and the sign post are four separate reads
  assert.equal((shelter.match(/<rect/g) ?? []).length >= 8, true);
  assert.match(shelter, /<path d="M6 20 L18 8 L58 8 L70 20 Z"/);

  const hand = raisedHandSvg();
  // four fingers plus palm plus thumb, all in the shared skin tone
  assert.equal((hand.match(/#ffd9b3/g) ?? []).length, 6);
  assert.match(hand, /#4a7ab8/);

  // a ten-point star path starting at its top tip, drawn twice for the highlight
  const star = goalStarSvg();
  assert.equal((star.match(/M20\.0 2\.0 L/g) ?? []).length, 1);
  assert.equal((star.match(/<path/g) ?? []).length, 2);
});
