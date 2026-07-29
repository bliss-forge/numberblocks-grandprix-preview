import test from "node:test";
import assert from "node:assert/strict";
import {
  cameraOffset,
  targetArrow,
  tourCameraPath
} from "../src/safety-route-camera.mjs";
import { createSafetyRouteState } from "../src/safety-route-model.mjs";

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

test("어느 횡단보도를 이용해도 같은 보행 신호 표지가 카메라 안에 남는다", () => {
  const map = createSafetyRouteState("easy", { seed: 4 }).map;
  const viewport = { width: 5, height: 5 };

  for (const crossing of map.crossings) {
    const player = {
      x: Math.min(...crossing.cells.map(cell => cell.x)) - 1,
      y: Math.min(...crossing.cells.map(cell => cell.y))
    };
    const camera = cameraOffset({ world: map, viewport, player });
    const marker = map.signalMarkers.find(item => item.crossingId === crossing.id);
    assert.ok(marker);
    assert.ok(marker.x >= camera.x && marker.x < camera.x + viewport.width);
    assert.ok(marker.y >= camera.y && marker.y < camera.y + viewport.height);
  }
});

test("여덟 랜드마크는 모바일 카메라로 접근 가능한 보행길에서 볼 수 있다", () => {
  const map = createSafetyRouteState("steady", { seed: 12 }).map;
  const viewport = { width: 5, height: 5 };

  for (const place of map.places) {
    const nearest = map.pedestrianCells.reduce((best, point) => {
      const distance = Math.abs(place.x - point.x) + Math.abs(place.y - point.y);
      return !best || distance < best.distance ? { point, distance } : best;
    }, null).point;
    const camera = cameraOffset({ world: map, viewport, player: nearest });
    assert.ok(
      place.x >= camera.x && place.x < camera.x + viewport.width &&
      place.y >= camera.y && place.y < camera.y + viewport.height,
      `${place.id} is outside the nearest mobile camera`
    );
  }
});

test("투어 경로는 시작과 학교를 잇고 경계를 벗어나지 않는다", () => {
  const world = { width: 32, height: 16 };
  const viewport = { width: 7, height: 5 };
  const path = tourCameraPath({
    world,
    viewport,
    start: { x: 0, y: 3 },
    goal: { x: 28, y: 11 },
    steps: 6
  });
  assert.equal(path.length, 6);
  assert.deepEqual(
    path[0],
    cameraOffset({ world, viewport, player: { x: 0, y: 3 } })
  );
  assert.deepEqual(
    path[path.length - 1],
    cameraOffset({ world, viewport, player: { x: 28, y: 11 } })
  );
  path.forEach(offset => {
    assert.ok(offset.x >= 0 && offset.x <= world.width - viewport.width);
    assert.ok(offset.y >= 0 && offset.y <= world.height - viewport.height);
    assert.ok(Number.isInteger(offset.x) && Number.isInteger(offset.y));
  });
});
