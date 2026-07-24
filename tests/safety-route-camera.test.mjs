import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraOffset,
  targetArrow
} from "../src/safety-route-camera.mjs";

test("안전 영역 안에서는 카메라가 움직이지 않는다", () => {
  assert.deepEqual(
    cameraOffset({
      world: { width: 18, height: 12 },
      viewport: { width: 7, height: 5 },
      player: { x: 3, y: 2 },
      previous: { x: 0, y: 0 }
    }),
    { x: 0, y: 0 }
  );
});

test("안전 영역 밖에서는 진행 방향을 더 보여준다", () => {
  assert.deepEqual(
    cameraOffset({
      world: { width: 18, height: 12 },
      viewport: { width: 7, height: 5 },
      player: { x: 8, y: 2 },
      previous: { x: 0, y: 0 }
    }),
    { x: 3, y: 0 }
  );
});

test("카메라는 지도 경계를 넘지 않는다", () => {
  const camera = cameraOffset({
    world: { width: 18, height: 12 },
    viewport: { width: 7, height: 5 },
    player: { x: 17, y: 11 },
    previous: { x: 10, y: 7 }
  });
  assert.deepEqual(camera, { x: 11, y: 7 });
});

test("화면 밖 목표는 가장자리 화살표가 된다", () => {
  const arrow = targetArrow({
    viewport: { width: 7, height: 5 },
    camera: { x: 0, y: 0 },
    target: { x: 14, y: 6 }
  });
  assert.equal(arrow.visible, true);
  assert.ok(arrow.x <= 6.5);
  assert.ok(arrow.y <= 4.5);
  assert.ok(Number.isFinite(arrow.angle));
});

test("화면 안 목표에는 화살표를 숨긴다", () => {
  assert.deepEqual(
    targetArrow({
      viewport: { width: 7, height: 5 },
      camera: { x: 3, y: 2 },
      target: { x: 5, y: 4 }
    }),
    { visible: false, x: 2, y: 2, angle: 0 }
  );
});
