import assert from "node:assert/strict";
import test from "node:test";
import {
  GRAND_PRIX_COURSE,
  GRAND_PRIX_TOTAL_LAPS,
  GRAND_PRIX_TRACK_LENGTH,
  createGrandPrix,
  finishGrandPrix,
  grandPrixSnapshot,
  setGrandPrixThrottle,
  startGrandPrix,
  steerGrandPrix,
  tickGrandPrix,
  useGrandPrixJump
} from "../src/grand-prix-model.mjs";

function finishCountdown(state) {
  state.countdownMs = 0;
}

function tick(state, frames = 1) {
  for (let index = 0; index < frames; index += 1) tickGrandPrix(state, 50);
}

test("arcade circuit is seeded, has four rivals, and runs three laps", () => {
  const first = createGrandPrix("easy", 99);
  const second = createGrandPrix("easy", 99);
  assert.equal(first.course, GRAND_PRIX_COURSE);
  assert.equal(first.totalLaps, GRAND_PRIX_TOTAL_LAPS);
  assert.equal(first.racers.length, 4);
  assert.deepEqual(first.racers, second.racers);
});

test("countdown holds the grid before throttle can move the player", () => {
  const state = createGrandPrix("easy", 1);
  startGrandPrix(state);
  setGrandPrixThrottle(state, true);
  tick(state, 20);
  assert.equal(state.countdownMs, 1400);
  assert.equal(state.progress, 0);
  tick(state, 28);
  assert.equal(state.countdownMs, 0);
  tick(state, 20);
  assert.ok(state.drive.speed > 0);
  assert.ok(state.progress > 0);
});

test("continuous steering changes lateral position and grass slows the kart", () => {
  const state = createGrandPrix("easy", 2);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  steerGrandPrix(state, "right", true);
  tick(state, 80);
  assert.ok(state.drive.lateral > 0.2);
  state.drive.lateral = 1.25;
  const before = state.drive.speed;
  tick(state, 25);
  assert.equal(state.drive.offroad, true);
  assert.ok(state.drive.speed < before);
});

test("drifting charges and releases a visible speed boost", () => {
  const state = createGrandPrix("easy", 3);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  state.drive.speed = 78;
  steerGrandPrix(state, "left", true);
  useGrandPrixJump(state);
  tick(state, 16);
  assert.equal(state.drive.drifting, true);
  assert.ok(state.drive.driftCharge >= 700);
  useGrandPrixJump(state);
  assert.equal(state.drive.drifting, false);
  assert.ok(state.drive.boostMs > 0);
});

test("correct lane crossings collect the three physical number gates", () => {
  const state = createGrandPrix("easy", 4);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  state.progress = 389.99;
  state.drive.lateral = -0.52;
  tick(state);
  assert.equal(state.number, 6);
  assert.equal(state.gateIndex, 1);
  state.progress = 769.99;
  state.drive.lateral = 0.42;
  tick(state);
  assert.equal(state.number, 7);
  assert.equal(state.gateIndex, 2);
  state.progress = 1149.99;
  state.drive.lateral = 0;
  tick(state);
  assert.equal(state.number, 10);
  assert.equal(state.gateIndex, 3);
  assert.equal(state.fuel, 3);
});

test("wrong gate spins the kart and leaves the learning total unchanged", () => {
  const state = createGrandPrix("easy", 5);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  state.progress = 389.99;
  state.drive.lateral = 0.48;
  tick(state);
  assert.equal(state.number, 4);
  assert.equal(state.gateIndex, 0);
  assert.equal(state.wrongGate, "plus-2");
  assert.ok(state.drive.spinMs > 0);
});

test("laps require checkpoints and final lap opens a ranked finish", () => {
  const state = createGrandPrix("easy", 6);
  startGrandPrix(state);
  finishCountdown(state);
  state.checkpointIndex = 4;
  state.progress = GRAND_PRIX_TRACK_LENGTH - 0.1;
  state.drive.speed = 30;
  tick(state);
  assert.equal(state.lap, 2);
  assert.equal(state.checkpointIndex, 0);
  state.lap = GRAND_PRIX_TOTAL_LAPS + 1;
  state.gateIndex = 3;
  state.number = 10;
  const snapshot = grandPrixSnapshot(state);
  assert.equal(snapshot.finishOpen, true);
  assert.deepEqual(finishGrandPrix(state).map(event => event.type), ["finish"]);
  assert.equal(state.phase, "finale");
});
