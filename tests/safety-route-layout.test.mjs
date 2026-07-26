import test from "node:test";
import assert from "node:assert/strict";
import {
  createSafetyRouteMap,
  validateCandidateLayout
} from "../src/safety-route-layout.mjs";

test("지도는 14:4:14 구역과 32×16 크기를 사용한다", () => {
  const map = createSafetyRouteMap("easy", { seed: 17 });
  assert.deepEqual({ width: map.width, height: map.height }, { width: 32, height: 16 });
  assert.deepEqual(map.zones, {
    left: { x: 0, width: 14 },
    road: { x: 14, width: 4 },
    right: { x: 18, width: 14 }
  });
});

test("각 동네에 1칸 골목 2개와 2칸 보행길 2개가 있다", () => {
  const map = createSafetyRouteMap("steady", { seed: 9 });
  assert.deepEqual(map.alleys.map(item => item.width), [1, 1, 1, 1]);
  assert.deepEqual(map.sidewalkBands.map(item => item.height), [2, 2, 2, 2]);
});

test("두 횡단보도는 도로 4칸 전체를 가로지르고 높이가 2칸이다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 2 });
  assert.equal(map.crossings.length, 2);
  for (const crossing of map.crossings) {
    assert.equal(new Set(crossing.cells.map(cell => cell.x)).size, 4);
    assert.equal(new Set(crossing.cells.map(cell => cell.y)).size, 2);
  }
});

test("같은 시드는 같은 안전 배치를 만든다", () => {
  assert.deepEqual(
    createSafetyRouteMap("challenge", { seed: 20260726 }),
    createSafetyRouteMap("challenge", { seed: 20260726 })
  );
});

test("생성 지도는 연결성 검증을 통과한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    for (let seed = 0; seed < 30; seed += 1) {
      assert.deepEqual(validateCandidateLayout(
        createSafetyRouteMap(difficulty, { seed })
      ), { valid: true, errors: [] });
    }
  }
});

test("재시도를 사용하지 않으면 검증된 고정 배치를 반환한다", () => {
  const map = createSafetyRouteMap("challenge", { seed: 5, maxAttempts: 0 });
  assert.equal(map.layoutSource, "fallback");
  assert.deepEqual(validateCandidateLayout(map), { valid: true, errors: [] });
});

test("필수 시작점이 없는 후보는 검증 오류로 반환한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 1 }));
  map.start = undefined;

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("start is required"));
});
