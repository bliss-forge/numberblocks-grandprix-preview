import test from "node:test";
import assert from "node:assert/strict";
import {
  REALISTIC_PARALLAX,
  realisticMotionFrame
} from "../src/ktx-realistic-motion.mjs";

test("정차하면 모든 실사 모션 오프셋과 효과가 멈춘다", () => {
  const frame = realisticMotionFrame({
    x: 2500, v: 0, phase: "stopped", markerDistance: 0, land: "city"
  });
  assert.equal(frame.speedRatio, 0);
  assert.equal(frame.moving, false);
  assert.deepEqual(frame.offsets, { sky: 25, far: 150, mid: 550, near: 2125, track: 2500 });
  assert.equal(frame.blurPx, 0);
});

test("속도와 위치는 실사 흐름을 단조롭게 키운다", () => {
  const slow = realisticMotionFrame({ x: 1000, v: 80, phase: "driving", markerDistance: 900, land: "field" });
  const fast = realisticMotionFrame({ x: 2000, v: 240, phase: "driving", markerDistance: 900, land: "field" });
  assert.equal(REALISTIC_PARALLAX.track, 1);
  assert.ok(fast.speedRatio > slow.speedRatio);
  assert.ok(fast.offsets.near > slow.offsets.near);
  assert.ok(fast.blurPx > slow.blurPx);
});

test("역 표시는 600m와 320m, 0m 경계에서 정해진 단계로 바뀐다", () => {
  const input = { x: 0, v: 120, phase: "driving", land: "city" };
  assert.equal(realisticMotionFrame({ ...input, markerDistance: 601 }).stationStage, "hidden");
  assert.equal(realisticMotionFrame({ ...input, markerDistance: 600 }).stationStage, "approach");
  assert.equal(realisticMotionFrame({ ...input, markerDistance: 320 }).stationStage, "detail");
  assert.equal(realisticMotionFrame({ ...input, markerDistance: 0 }).stationStage, "stopped");
});

test("300km/h 이상은 상한으로 고정되고 같은 입력은 같은 프레임을 만든다", () => {
  const input = {
    x: 1800, v: 360, phase: "stopping", markerDistance: 320, land: "field"
  };
  const frame = realisticMotionFrame(input);
  assert.equal(frame.speedRatio, 1);
  assert.equal(frame.speedBand, "very-fast");
  assert.equal(frame.brakePitch, 1.8);
  assert.equal(frame.blurPx, 2.62);
  assert.deepEqual(realisticMotionFrame({ ...input }), frame);
});
