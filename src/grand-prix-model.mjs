export const GRAND_PRIX_COURSE = "counting-canyon";
const STEPS = [{ id: "plus-2", value: 2, target: 6 }, { id: "plus-1", value: 1, target: 7 }, { id: "plus-3", value: 3, target: 10 }];
const BASE_SPEED = 34;
const BOOST_MS = 1200;

export function createGrandPrix(difficulty = "easy", seed = 1) {
  const racers = [1, 2, 3, 5].map((number, index) => ({
    number, lane: [-1, 0, 1, -1][index], progress: index * 4, pace: 0.94 + index * 0.02
  }));
  return {
    difficulty, seed, course: GRAND_PRIX_COURSE, phase: "grid", number: 4,
    target: 10, fuel: 0, checkpoint: 0, correction: 0, zone: "start",
    distance: 0, elapsedMs: 0, countdownMs: 0, racers,
    drive: { lane: 0, heading: 0, speed: BASE_SPEED, boostMs: 0, penaltyMs: 0, airborneMs: 0 }
  };
}

export function startGrandPrix(state) {
  if (state.phase !== "grid") return [];
  state.phase = "racing";
  state.countdownMs = 1800;
  return [{ type: "race-start" }];
}

export function steerGrandPrix(state, direction) {
  if (state.phase !== "racing") return [];
  const delta = direction === "left" ? -1 : direction === "right" ? 1 : 0;
  if (!delta) return [];
  state.drive.lane = Math.max(-1, Math.min(1, state.drive.lane + delta));
  state.drive.heading = delta;
  return [{ type: "steer", lane: state.drive.lane }];
}

export function tickGrandPrix(state, elapsedMs) {
  if (state.phase !== "racing") return [];
  const delta = Math.max(0, Number(elapsedMs) || 0);
  state.elapsedMs += delta;
  state.countdownMs = Math.max(0, state.countdownMs - delta);
  state.drive.boostMs = Math.max(0, state.drive.boostMs - delta);
  state.drive.penaltyMs = Math.max(0, state.drive.penaltyMs - delta);
  state.drive.airborneMs = Math.max(0, state.drive.airborneMs - delta);
  const boost = state.drive.boostMs ? 1.42 : 1;
  const penalty = state.drive.penaltyMs ? 0.58 : 1;
  state.drive.speed = BASE_SPEED * boost * penalty;
  state.distance += state.drive.speed * delta / 1000;
  state.racers.forEach(racer => { racer.progress += BASE_SPEED * racer.pace * delta / 1000; });
  if (state.checkpoint === 0 && state.distance > 72) state.zone = "windmill";
  if (state.checkpoint === 1 && state.distance > 150) state.zone = "jump";
  if (state.checkpoint === 2 && state.distance > 230) state.zone = "forest";
  return [];
}

export function chooseGrandPrixGate(state, gateId) {
  if (state.phase !== "racing") return [];
  const step = STEPS[state.checkpoint];
  if (!step) return [];
  if (step.id !== gateId) {
    state.drive.penaltyMs = 1500;
    state.correction = step.target - state.number;
    return [{ type: "detour", needed: state.correction }];
  }
  state.number += step.value;
  state.fuel += 1;
  state.checkpoint += 1;
  state.distance = Math.min(180, state.distance + 46);
  state.drive.boostMs = Math.max(state.drive.boostMs, 700);
  if (state.checkpoint === 1) state.zone = "windmill";
  else if (state.checkpoint === 2) state.zone = "jump";
  else state.zone = "castle";
  return [{ type: "number-boost", value: step.value }, { type: "checkpoint", checkpoint: state.checkpoint }];
}

export function takeGrandPrixCorrection(state) {
  if (state.phase !== "racing" || state.correction <= 0) return [];
  state.number += state.correction;
  state.correction = 0;
  state.fuel += 1;
  state.checkpoint += 1;
  state.distance = Math.min(180, state.distance + 46);
  state.drive.boostMs = Math.max(state.drive.boostMs, 550);
  state.zone = state.checkpoint === 1 ? "windmill" : state.checkpoint === 2 ? "jump" : "castle";
  return [{ type: "correction" }];
}

export function useGrandPrixJump(state) {
  if (state.phase !== "racing") return [];
  if (state.zone !== "jump") {
    state.drive.airborneMs = 250;
    return [{ type: "hop" }];
  }
  state.drive.airborneMs = 600;
  state.drive.boostMs = Math.max(state.drive.boostMs, BOOST_MS);
  return [{ type: "jump-boost" }];
}

export function collideGrandPrixObstacle(state) {
  if (state.phase !== "racing") return [];
  state.drive.penaltyMs = Math.max(state.drive.penaltyMs, 800);
  return [{ type: "obstacle" }];
}

export function grandPrixSnapshot(state) {
  return {
    number: state.number, target: state.target, fuel: state.fuel,
    checkpoint: state.checkpoint, correction: state.correction, zone: state.zone,
    finishOpen: state.number === state.target && state.fuel === STEPS.length,
    speed: Math.round(state.drive.speed),
    rank: 1 + state.racers.filter(racer => racer.progress > state.distance).length
  };
}

export function finishGrandPrix(state) {
  if (state.phase !== "racing" || !grandPrixSnapshot(state).finishOpen) return [];
  state.phase = "finale";
  return [{ type: "finish", rank: grandPrixSnapshot(state).rank }];
}
