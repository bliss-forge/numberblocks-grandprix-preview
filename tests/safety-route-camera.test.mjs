import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraOffset,
  targetArrow
} from "../src/safety-route-camera.mjs";

test("지도 중앙에서는 플레이어가 뷰포트 정중앙에 온다", () => {
  assert.deepEqual(
    cameraOffset({
      world: { width: 32, height: 16 },
      viewport: { width: 7, height: 5 },
      player: { x: 15, y: 8 },
      previous: { x: 0, y: 0 }
    }),
    { x: 12, y: 6 }
  );
});

test("모바일 5×5에서도 플레이어를 중앙에 둔다", () => {
  assert.deepEqual(
    cameraOffset({
      world: { width: 32, height: 16 },
      viewport: { width: 5, height: 5 },
      player: { x: 20, y: 9 },
      previous: { x: 0, y: 0 }
    }),
    { x: 18, y: 7 }
  );
});

test("지도 가장자리에서는 카메라만 경계에 고정한다", () => {
  const camera = cameraOffset({
    world: { width: 32, height: 16 },
    viewport: { width: 7, height: 5 },
    player: { x: 31, y: 15 },
    previous: { x: 0, y: 0 }
  });
  assert.deepEqual(camera, { x: 25, y: 11 });
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
