import test from "node:test";
import assert from "node:assert/strict";
import {
  carSvg,
  bicycleSvg,
  scooterSvg,
  excavatorSvg
} from "../src/safety-route-art.mjs";

test("모든 아트는 aria-hidden 처리된 svg 문자열이다", () => {
  const builders = [
    ["car", carSvg],
    ["bicycle", bicycleSvg],
    ["scooter", scooterSvg],
    ["excavator", excavatorSvg]
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
