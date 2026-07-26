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

test("난이도별 생활안전 요소는 정해진 장애물과 이동 수단을 사용한다", () => {
  const easy = createSafetyRouteMap("easy", { seed: 1 });
  const steady = createSafetyRouteMap("steady", { seed: 1 });
  const challenge = createSafetyRouteMap("challenge", { seed: 1 });

  assert.deepEqual(easy.hazards.map(item => item.type), ["manhole"]);
  assert.deepEqual(easy.patrols.map(item => item.type), ["scooter"]);
  assert.deepEqual(steady.hazards.map(item => item.type).sort(), ["construction", "manhole"]);
  assert.deepEqual(steady.patrols.map(item => item.type), ["scooter"]);
  assert.deepEqual(challenge.hazards.map(item => item.type).sort(), [
    "construction", "manhole", "manhole"
  ]);
  assert.deepEqual(challenge.patrols.map(item => item.type).sort(), ["bicycle", "scooter"]);
  for (const map of [steady, challenge]) {
    const construction = map.hazards.find(item => item.type === "construction");
    assert.ok(map.alleys.some(alley =>
      construction.x === alley.x &&
      construction.y >= alley.y &&
      construction.y < alley.y + alley.height
    ));
  }
});

test("두 횡단보도는 하나의 보행 신호와 signalGate를 공유한다", () => {
  const map = createSafetyRouteMap("steady", { seed: 4 });

  assert.equal(map.signals.length, 1);
  assert.equal(map.signals[0].id, map.signalGate.signalId);
  assert.deepEqual(map.signals[0].crossingIds, map.crossings.map(item => item.id));
  assert.ok(map.crossings.every(item => item.signalId === map.signalGate.signalId));
});

test("생성 및 대체 지도는 정규화한 입력 시드를 보존한다", () => {
  assert.equal(createSafetyRouteMap("easy", { seed: -1 }).seed, 4294967295);
  assert.equal(
    createSafetyRouteMap("easy", { seed: -1, maxAttempts: 0 }).seed,
    4294967295
  );
});

test("도로 셀은 중앙 네 열의 모든 행을 정확히 덮어야 한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 3 }));
  map.roadCells[0] = { x: 14, y: 16 };

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("road cells must exactly cover all center road cells"));
});

test("차선 셀은 지도 안의 중앙 도로 열에만 있어야 한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 3 }));
  map.lanes[0].cells[0] = { x: 13, y: 0 };

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("lane cell outside road: 13,0"));
});

test("차선에는 지정된 두 도로 열을 모두 덮는 셀 배열이 필요하다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 3 }));
  delete map.lanes[0].cells;

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("lane cells must exactly cover its two road columns"));
});

test("보호 위치끼리도 겹치면 후보 검증이 실패한다", () => {
  const map = structuredClone(createSafetyRouteMap("easy", { seed: 8 }));
  map.friends[0] = { ...map.start, id: "friend-2", number: 2 };

  const result = validateCandidateLayout(map);

  assert.equal(result.valid, false);
  assert.ok(result.errors.includes("protected locations overlap: 0,3"));
});
