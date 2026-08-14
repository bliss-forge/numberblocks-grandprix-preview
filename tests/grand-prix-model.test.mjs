import assert from "node:assert/strict";
import test from "node:test";
import {
  GRAND_PRIX_COURSE,
  GRAND_PRIX_ITEM_BOXES,
  GRAND_PRIX_TOTAL_LAPS,
  GRAND_PRIX_TRACK_LENGTH,
  createGrandPrix,
  finishGrandPrix,
  grandPrixSnapshot,
  setGrandPrixThrottle,
  startGrandPrix,
  steerGrandPrix,
  tickGrandPrix,
  useGrandPrixItem,
  useGrandPrixJump,
  useGrandPrixSkill
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

test("timed throttle in the final countdown creates a Start Spark launch", () => {
  const state = createGrandPrix("easy", 72);
  startGrandPrix(state);
  state.countdownMs = 50;
  assert.deepEqual(setGrandPrixThrottle(state, true).map(event => event.type), ["start-spark-armed"]);
  const events = tickGrandPrix(state, 50);
  assert.ok(events.some(event => event.type === "start-spark"));
  assert.ok(state.drive.startSparkMs > 0);
  assert.ok(state.drive.boostMs > 0);
  assert.ok(state.drive.speed >= 104);
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

test("smoothed steering eases into a turn and counter-recovers after release", () => {
  const state = createGrandPrix("easy", 21);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  state.drive.speed = 116;
  steerGrandPrix(state, "right", true);
  tickGrandPrix(state, 50);
  assert.ok(state.drive.steer > 0 && state.drive.steer < 1);
  const initialLateral = state.drive.lateral;
  tick(state, 10);
  assert.ok(state.drive.lateral > initialLateral);
  steerGrandPrix(state, "right", false);
  tick(state, 6);
  assert.ok(state.drive.steer < 0.2);
  assert.ok(Math.abs(state.drive.lateralVelocity) < 1.5);
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

test("Starbox grants one Starburst and does not overwrite a held tactical item", () => {
  const state = createGrandPrix("easy", 73);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  const box = GRAND_PRIX_ITEM_BOXES[0];
  state.progress = box.position - 1;
  state.drive.lateral = box.lane;
  state.drive.speed = 40;
  const events = tickGrandPrix(state, 50);
  assert.ok(events.some(event => event.type === "item-box"));
  assert.equal(state.drive.heldItem, "starburst");
  const snapshot = grandPrixSnapshot(state);
  assert.equal(snapshot.heldItem, "starburst");
  assert.equal(snapshot.itemPulseActive, true);
  state.progress = GRAND_PRIX_ITEM_BOXES[1].position - 1;
  state.drive.lateral = GRAND_PRIX_ITEM_BOXES[1].lane;
  tickGrandPrix(state, 50);
  assert.equal(state.drive.heldItem, "starburst");
});

test("Starburst only launches forward and briefly spins the locked rival", () => {
  const state = createGrandPrix("easy", 74);
  startGrandPrix(state);
  finishCountdown(state);
  state.racers.forEach(racer => { racer.distance = -14; racer.progress = 0; racer.lap = 1; });
  state.drive.heldItem = "starburst";
  assert.deepEqual(useGrandPrixItem(state).map(event => event.type), ["item-no-target"]);
  assert.equal(state.drive.heldItem, "starburst");
  const target = state.racers[0];
  target.distance = state.progress + 46;
  target.lane = 0.26;
  const launch = useGrandPrixItem(state);
  assert.deepEqual(launch.map(event => event.type), ["starburst-launch"]);
  assert.equal(state.drive.heldItem, null);
  assert.equal(state.starburst.targetNumber, target.number);
  const events = [];
  for (let index = 0; index < 12; index += 1) events.push(...tickGrandPrix(state, 50));
  assert.ok(events.some(event => event.type === "starburst-hit"));
  assert.equal(state.starburst, null);
  assert.ok(target.hitMs > 0);
  assert.ok(target.speed < target.targetSpeed);
});

test("Star Dash requires a full meter and protects a tactical overtake", () => {
  const state = createGrandPrix("easy", 33);
  startGrandPrix(state);
  finishCountdown(state);
  setGrandPrixThrottle(state, true);
  assert.deepEqual(useGrandPrixSkill(state).map(event => event.type), ["skill-empty"]);
  state.drive.skillCharge = 100;
  state.drive.speed = 120;
  assert.deepEqual(useGrandPrixSkill(state).map(event => event.type), ["star-dash"]);
  assert.ok(state.drive.skillMs > 0);
  assert.ok(state.drive.boostMs > 0);
  state.racers[0].distance = state.progress + 1;
  state.racers[0].lane = state.drive.lateral;
  const passEvents = tickGrandPrix(state, 50);
  assert.ok(passEvents.some(event => event.type === "star-dash-pass"));
  assert.equal(state.drive.contactMs, 0);
  assert.equal(grandPrixSnapshot(state).skillActive, true);
  assert.equal(grandPrixSnapshot(state).overtakeActive, true);
  const passedRacer = state.racers.find(racer => racer.number === state.drive.overtakeNumber);
  assert.ok(passedRacer);
  assert.ok(passedRacer.distance < state.progress);
});

test("nearby rivals create pressure and rank transitions announce a pass", () => {
  const state = createGrandPrix("easy", 44);
  startGrandPrix(state);
  finishCountdown(state);
  state.racers.forEach(racer => { racer.distance = -12; racer.progress = 0; racer.lap = 1; });
  state.racers[0].distance = -10;
  const events = tickGrandPrix(state, 50);
  assert.ok(events.some(event => event.type === "rank-up"));
  const snapshot = grandPrixSnapshot(state);
  assert.equal(snapshot.rank, 1);
  assert.equal(snapshot.pressureActive, true);
  assert.equal(snapshot.pressureNumber, state.racers[0].number);
});

test("rival pack chooses bounded passing lanes and shows rear pressure", () => {
  const state = createGrandPrix("easy", 47);
  startGrandPrix(state);
  finishCountdown(state);
  state.racers[0].distance = 24;
  state.racers[1].distance = 31;
  state.racers[0].lane = 0;
  state.racers[1].lane = 0.04;
  state.racers[0].raceLine = 0;
  state.racers[1].raceLine = 0.04;
  tickGrandPrix(state, 50);
  assert.ok(Math.abs(state.racers[0].packOffset) > 0);
  assert.ok(Math.abs(state.racers[0].laneTarget) <= 0.82);
  state.progress = 72;
  state.racers[2].distance = 60;
  tickGrandPrix(state, 50);
  assert.ok(Math.abs(state.racers[2].packOffset) > 0);
  assert.ok(Math.abs(state.racers[2].laneTarget) <= 0.82);
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
  assert.equal(state.finishResult.number, 10);
  assert.equal(state.finishResult.target, 10);
  assert.equal(state.finishResult.laps, GRAND_PRIX_TOTAL_LAPS);
});
