import assert from "node:assert/strict";
import test from "node:test";
import {
  GRAND_PRIX_COURSE,
  createGrandPrix,
  chooseGrandPrixGate,
  grandPrixSnapshot,
  startGrandPrix,
  steerGrandPrix,
  takeGrandPrixCorrection,
  tickGrandPrix,
  useGrandPrixJump
} from "../src/grand-prix-model.mjs";

test("seeded grand prix has stable racers and a course", () => {
  const first = createGrandPrix("steady", 42);
  const second = createGrandPrix("steady", 42);
  assert.deepEqual(first.racers, second.racers);
  assert.equal(first.course, GRAND_PRIX_COURSE);
  assert.equal(first.number, 4);
  assert.equal(first.target, 10);
});

test("starting the race enables steering and forward progress", () => {
  const state = createGrandPrix("easy", 4);
  assert.deepEqual(startGrandPrix(state).map(event => event.type), ["race-start"]);
  assert.equal(state.phase, "racing");
  assert.equal(state.countdownMs, 1800);
  assert.deepEqual(steerGrandPrix(state, "left").map(event => event.type), ["steer"]);
  assert.equal(state.drive.lane, -1);
  tickGrandPrix(state, 1000);
  assert.equal(state.countdownMs, 800);
  assert.ok(state.distance > 0);
});

test("the first plus two gate updates number and fuel together", () => {
  const state = createGrandPrix("easy", 7);
  startGrandPrix(state);
  const events = chooseGrandPrixGate(state, "plus-2");
  assert.deepEqual(events.map(event => event.type), ["number-boost", "checkpoint"]);
  assert.equal(state.number, 6);
  assert.equal(state.fuel, 1);
  assert.equal(state.checkpoint, 1);
  assert.equal(state.distance, 46);
});

test("a wrong number gate keeps the race active and provides a correction", () => {
  const state = createGrandPrix("easy", 7);
  startGrandPrix(state);
  const events = chooseGrandPrixGate(state, "plus-4");
  assert.deepEqual(events.map(event => event.type), ["detour"]);
  assert.equal(state.phase, "racing");
  assert.equal(state.number, 4);
  assert.equal(state.correction, 2);
  assert.equal(state.drive.penaltyMs, 1500);
  assert.deepEqual(takeGrandPrixCorrection(state).map(event => event.type), ["correction"]);
  assert.equal(state.number, 6);
  assert.equal(state.fuel, 1);
});

test("jump pads provide a boost while normal roads provide a hop", () => {
  const state = createGrandPrix("easy", 11);
  startGrandPrix(state);
  assert.deepEqual(useGrandPrixJump(state).map(event => event.type), ["hop"]);
  state.zone = "jump";
  assert.deepEqual(useGrandPrixJump(state).map(event => event.type), ["jump-boost"]);
  assert.ok(state.drive.boostMs >= 1200);
});

test("three correct gates open the number ten finish", () => {
  const state = createGrandPrix("easy", 16);
  startGrandPrix(state);
  chooseGrandPrixGate(state, "plus-2");
  chooseGrandPrixGate(state, "plus-1");
  chooseGrandPrixGate(state, "plus-3");
  const snapshot = grandPrixSnapshot(state);
  assert.equal(snapshot.number, 10);
  assert.equal(snapshot.fuel, 3);
  assert.equal(snapshot.finishOpen, true);
});
