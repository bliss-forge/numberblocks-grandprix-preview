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

test("역은 600m에서 나타나 0m에서 정위치에 단조롭게 도착한다", () => {
  const input = { x: 0, v: 120, phase: "driving", land: "city" };
  const progresses = [600, 320, 100, 0].map(markerDistance =>
    realisticMotionFrame({ ...input, markerDistance }).stationProgress);

  assert.deepEqual(progresses, [0, 0.47, 0.83, 1]);
  progresses.slice(1).forEach((progress, index) => {
    assert.ok(progress >= progresses[index]);
  });
  assert.equal(realisticMotionFrame({
    ...input, x: 600, v: 0, phase: "stopped", markerDistance: 0
  }).stationProgress, 1);
});

test("출발하면 직전 역이 600m 동안 뒤로 물러난 뒤 제거된다", () => {
  const input = { v: 80, phase: "driving", markerDistance: 5000, land: "field" };
  const start = realisticMotionFrame({ ...input, x: 0 });
  const middle = realisticMotionFrame({ ...input, x: 300 });
  const exited = realisticMotionFrame({ ...input, x: 600 });

  assert.equal(start.departing, true);
  assert.equal(start.stationProgress, 1);
  assert.equal(middle.departing, true);
  assert.equal(middle.stationProgress, 0.5);
  assert.equal(exited.departing, false);
  assert.equal(exited.stationProgress, 0);
  assert.equal(exited.stationStage, "hidden");
});
