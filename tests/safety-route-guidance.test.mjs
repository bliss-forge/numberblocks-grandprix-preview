import test from "node:test";
import assert from "node:assert/strict";
import {
  createGuidanceState,
  guidanceCells,
  recordGuidanceMove
} from "../src/safety-route-guidance.mjs";
import {
  createSafetyRouteState
} from "../src/safety-route-model.mjs";

test("5초 정지 뒤 안전 경로 앞 세 칸만 보여준다", () => {
  const map = createSafetyRouteState("easy", { seed: 0 }).map;
  const guidance = createGuidanceState(1000);
  assert.deepEqual(
    guidanceCells(guidance, map, map.start, map.friends[0], 5999),
    []
  );
  const cells = guidanceCells(
    guidance,
    map,
    map.start,
    map.friends[0],
    6000
  );
  assert.equal(cells.length, 3);
  assert.notDeepEqual(cells[0], map.start);
});

test("막힌 입력 또는 거리가 늘어난 이동 두 번이면 유도한다", () => {
  let state = createGuidanceState(0);
  state = recordGuidanceMove(state, {
    beforeDistance: 6,
    afterDistance: 6,
    blocked: true,
    nowMs: 100
  });
  state = recordGuidanceMove(state, {
    beforeDistance: 6,
    afterDistance: 7,
    blocked: false,
    nowMs: 200
  });
  assert.equal(state.wrongCount, 2);
  assert.equal(state.visible, true);
});

test("올바른 이동은 유도 상태를 즉시 초기화한다", () => {
  const state = recordGuidanceMove(
    { lastValidMoveAt: 0, wrongCount: 2, visible: true },
    {
      beforeDistance: 7,
      afterDistance: 6,
      blocked: false,
      nowMs: 300
    }
  );
  assert.deepEqual(state, {
    lastValidMoveAt: 300,
    wrongCount: 0,
    visible: false
  });
});

test("같은 거리의 안전한 우회는 오방향으로 세지 않는다", () => {
  const state = recordGuidanceMove(createGuidanceState(50), {
    beforeDistance: 6,
    afterDistance: 6,
    blocked: false,
    nowMs: 100
  });
  assert.deepEqual(state, {
    lastValidMoveAt: 100,
    wrongCount: 0,
    visible: false
  });
});
