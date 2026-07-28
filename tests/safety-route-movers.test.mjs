import test from "node:test";
import assert from "node:assert/strict";
import {
  advancePatrolMover,
  createPatrolMover
} from "../src/safety-route-movers.mjs";

const definition = {
  id: "test-scooter",
  type: "scooter",
  intervalMs: 1000,
  points: [{ x: 2, y: 4 }, { x: 3, y: 4 }, { x: 4, y: 4 }]
};

test("이동체는 0.9~1.2초 간격으로 최대 한 칸만 움직인다", () => {
  const start = createPatrolMover(definition);
  assert.equal(advancePatrolMover(definition, start, { elapsedMs: 999, player: { x: 9, y: 9 } }).pathIndex, 0);
  assert.equal(advancePatrolMover(definition, start, { elapsedMs: 5000, player: { x: 9, y: 9 } }).pathIndex, 1);
});

test("순찰 끝에서는 방향을 바꿔 왕복한다", () => {
  const end = { ...createPatrolMover(definition), pathIndex: 2, direction: 1 };
  const next = advancePatrolMover(definition, end, { elapsedMs: 1000, player: { x: 9, y: 9 } });
  assert.deepEqual({ pathIndex: next.pathIndex, direction: next.direction }, { pathIndex: 1, direction: -1 });
});

test("다음 칸에 아이가 있으면 0.6초 멈춘 뒤 반전한다", () => {
  const start = createPatrolMover(definition);
  const paused = advancePatrolMover(definition, start, { elapsedMs: 1000, player: { x: 3, y: 4 } });
  assert.deepEqual({ pathIndex: paused.pathIndex, stopped: paused.stopped }, { pathIndex: 0, stopped: true });
  const reversed = advancePatrolMover(definition, paused, { elapsedMs: 600, player: { x: 3, y: 4 } });
  assert.equal(reversed.direction, -1);
  assert.equal(reversed.pathIndex, 0);
});
