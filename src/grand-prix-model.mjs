export const GRAND_PRIX_COURSE = "star-canyon-loop";
export const GRAND_PRIX_TRACK_LENGTH = 1800;
export const GRAND_PRIX_TOTAL_LAPS = 3;
export const GRAND_PRIX_GATE_POSITIONS = Object.freeze([390, 770, 1150]);
export const GRAND_PRIX_CHECKPOINTS = Object.freeze([280, 690, 1080, 1450]);

const RACER_NUMBERS = Object.freeze([1, 2, 3, 5]);
const GATES = Object.freeze([
  { id: "plus-2", value: 2, target: 6, lane: -0.52, decoy: "plus-4", decoyLane: 0.48 },
  { id: "plus-1", value: 1, target: 7, lane: 0.42, decoy: "plus-3", decoyLane: -0.44 },
  { id: "plus-3", value: 3, target: 10, lane: 0, decoy: "plus-2", decoyLane: -0.56 }
]);
const MAX_SPEED = 132;
const BOOST_SPEED = 167;
const STAR_DASH_SPEED = 188;
const START_SPARK_WINDOW_MS = 540;
const SKILL_MAX = 100;
const ACCEL = 62;
const COAST = 16;
const BRAKE = 112;
const OFFROAD_DRAG = 76;
const ROAD_EDGE = 1.02;
const WORLD_EDGE = 1.62;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function seeded(seed) {
  let value = (Number(seed) || 1) >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function totalDistance(state) {
  return (state.lap - 1) * GRAND_PRIX_TRACK_LENGTH + state.progress;
}

function currentGate(state) {
  return GATES[state.gateIndex] ?? null;
}

function crossing(previous, current, marker) {
  return previous < marker && current >= marker;
}

function changeSpeed(state, delta) {
  const cap = state.drive.skillMs > 0 ? STAR_DASH_SPEED : state.drive.boostMs > 0 ? BOOST_SPEED : MAX_SPEED;
  state.drive.speed = clamp(state.drive.speed + delta, 0, cap);
}

function driftTier(charge) {
  if (charge >= 1050) return "ultra";
  if (charge >= 620) return "super";
  if (charge >= 240) return "mini";
  return "none";
}

function rankFor(state) {
  const player = totalDistance(state);
  return 1 + state.racers.filter(racer => racer.distance > player).length;
}

function startSpin(state, duration, reason) {
  state.drive.spinMs = Math.max(state.drive.spinMs, duration);
  state.drive.speed *= 0.42;
  state.drive.driftCharge = 0;
  state.drive.drifting = false;
  return [{ type: "spin", reason }];
}

function updateAi(state, seconds) {
  const playerDistance = totalDistance(state);
  state.racers.forEach((racer, index) => {
    const gap = playerDistance - racer.distance;
    const chase = gap > 18 ? 1.065 : gap < -35 ? 0.965 : 1;
    racer.speed = clamp(racer.speed + (racer.targetSpeed - racer.speed) * Math.min(1, seconds * 1.3), 58, 122);
    racer.distance += racer.speed * chase * seconds;
    racer.progress = racer.distance % GRAND_PRIX_TRACK_LENGTH;
    racer.lap = Math.floor(racer.distance / GRAND_PRIX_TRACK_LENGTH) + 1;
    const weave = Math.sin(state.elapsedMs / 850 + index * 2.1) * 0.16;
    const racerAhead = state.racers
      .filter(other => other !== racer && other.distance > racer.distance && other.distance - racer.distance < 19)
      .sort((left, right) => left.distance - right.distance)[0];
    const packSide = racer.number % 2 ? -1 : 1;
    const passingOffset = racerAhead && Math.abs(racerAhead.lane - racer.lane) < 0.38 ? packSide * 0.3 : 0;
    const closeBehindPlayer = gap > 0 && gap < 30;
    const playerLine = closeBehindPlayer
      ? clamp(state.drive.lateral + packSide * 0.38, -0.82, 0.82)
      : racer.raceLine;
    const playerOffset = closeBehindPlayer ? (playerLine - racer.raceLine) * 0.55 : 0;
    racer.packOffset = passingOffset + playerOffset;
    racer.laneTarget = clamp(racer.raceLine + weave + racer.packOffset, -0.82, 0.82);
    racer.lane += (racer.laneTarget - racer.lane) * Math.min(1, seconds * 2.8);
  });
}

function updateCheckpoints(state, previousProgress) {
  GRAND_PRIX_CHECKPOINTS.forEach((marker, index) => {
    if (crossing(previousProgress, state.progress, marker) && state.checkpointIndex === index) {
      state.checkpointIndex += 1;
    }
  });
}

function advanceLap(state) {
  if (state.checkpointIndex < GRAND_PRIX_CHECKPOINTS.length) {
    state.progress = GRAND_PRIX_TRACK_LENGTH - 4;
    state.drive.speed *= 0.7;
    state.drive.missedCheckpointMs = 900;
    return [{ type: "missed-checkpoint" }];
  }
  state.lap += 1;
  state.checkpointIndex = 0;
  return [{ type: "lap", lap: state.lap }];
}

function updateGate(state, previousProgress) {
  const gate = currentGate(state);
  if (!gate || state.lap !== 1) return [];
  const marker = GRAND_PRIX_GATE_POSITIONS[state.gateIndex];
  if (!crossing(previousProgress, state.progress, marker)) return [];
  if (Math.abs(state.drive.lateral - gate.lane) <= 0.34) {
    state.number += gate.value;
    state.fuel += 1;
    state.gateIndex += 1;
    state.checkpoint = state.gateIndex;
    state.drive.boostMs = Math.max(state.drive.boostMs, 1050);
    state.drive.speed = Math.max(state.drive.speed, 108);
    state.drive.skillCharge = clamp(state.drive.skillCharge + 36, 0, SKILL_MAX);
    return [{ type: "number-boost", value: gate.value, number: state.number, fuel: state.fuel, skillCharge: state.drive.skillCharge }];
  }
  state.wrongGate = gate.id;
  state.drive.spinMs = Math.max(state.drive.spinMs, 430);
  state.drive.speed *= 0.5;
  return [{ type: "wrong-gate", needed: gate.target - state.number, gateId: gate.id }];
}

function updateStarDashPass(state) {
  const drive = state.drive;
  if (drive.skillMs <= 0) return [];
  const player = totalDistance(state);
  const target = state.racers
    .filter(racer => racer.distance >= player - 1 && racer.distance <= player + 34)
    .sort((left, right) => left.distance - right.distance)[0];
  if (!target) return [];
  target.distance = Math.max(0, player - 2.4);
  target.progress = target.distance % GRAND_PRIX_TRACK_LENGTH;
  target.lap = Math.floor(target.distance / GRAND_PRIX_TRACK_LENGTH) + 1;
  drive.overtakeMs = 760;
  drive.overtakeNumber = target.number;
  return [{ type: "star-dash-pass", racer: target.number }];
}

function updateRaceSignals(state) {
  const drive = state.drive;
  const events = [];
  const rank = rankFor(state);
  if (state.lastRank !== rank) {
    const change = state.lastRank - rank;
    state.lastRank = rank;
    drive.rankChange = change;
    drive.rankChangeMs = 900;
    events.push({ type: change > 0 ? "rank-up" : "rank-down", rank, change });
  }
  const player = totalDistance(state);
  const chaser = state.racers
    .filter(racer => racer.distance <= player && player - racer.distance < 26)
    .sort((left, right) => right.distance - left.distance)[0];
  if (chaser) {
    drive.pressureMs = 460;
    drive.pressureNumber = chaser.number;
  }
  return events;
}

function updateKartContacts(state) {
  if (state.drive.contactMs > 0 || state.drive.spinMs > 0 || state.drive.skillMs > 0) return [];
  const player = totalDistance(state);
  const opponent = state.racers.find(racer => Math.abs(racer.distance - player) < 7 && Math.abs(racer.lane - state.drive.lateral) < 0.25);
  if (!opponent) return [];
  state.drive.contactMs = 420;
  state.drive.speed *= 0.66;
  state.drive.lateralVelocity += opponent.lane > state.drive.lateral ? -1.1 : 1.1;
  return [{ type: "kart-contact", racer: opponent.number }];
}

export function grandPrixRoadCurve(distance) {
  const loop = ((distance % GRAND_PRIX_TRACK_LENGTH) + GRAND_PRIX_TRACK_LENGTH) % GRAND_PRIX_TRACK_LENGTH;
  if (loop < 210) return 0;
  if (loop < 470) return -0.95 * Math.sin(((loop - 210) / 260) * Math.PI);
  if (loop < 760) return 0.82 * Math.sin(((loop - 470) / 290) * Math.PI);
  if (loop < 1060) return -0.68 * Math.sin(((loop - 760) / 300) * Math.PI);
  if (loop < 1420) return 1.12 * Math.sin(((loop - 1060) / 360) * Math.PI);
  return -0.42 * Math.sin(((loop - 1420) / 380) * Math.PI);
}

export function createGrandPrix(difficulty = "easy", seed = Date.now()) {
  const random = seeded(seed);
  const racers = RACER_NUMBERS.map((number, index) => {
    const distance = 7 + index * 5 + Math.floor(random() * 3);
    return {
      number,
      lane: [-0.62, -0.2, 0.25, 0.67][index],
      laneTarget: [-0.62, -0.2, 0.25, 0.67][index],
      raceLine: [-0.54, -0.17, 0.22, 0.57][index],
      packOffset: 0,
      targetSpeed: 95 + random() * 12,
      speed: 78 + random() * 8,
      distance,
      progress: distance,
      lap: 1
    };
  });
  return {
    difficulty,
    seed,
    course: GRAND_PRIX_COURSE,
    phase: "grid",
    elapsedMs: 0,
    countdownMs: 2400,
    lap: 1,
    totalLaps: GRAND_PRIX_TOTAL_LAPS,
    progress: 0,
    checkpointIndex: 0,
    checkpoint: 0,
    gateIndex: 0,
    number: 4,
    target: 10,
    fuel: 0,
    wrongGate: null,
    lastRank: racers.length + 1,
    finishResult: null,
    racers,
    drive: {
      speed: 0,
      lateral: 0,
      lateralVelocity: 0,
      heading: 0,
      throttle: false,
      brake: false,
      drifting: false,
      driftCharge: 0,
      driftMs: 0,
      boostMs: 0,
      startSparkArmed: false,
      startSparkMs: 0,
      skillCharge: 0,
      skillMs: 0,
      overtakeMs: 0,
      overtakeNumber: null,
      rankChangeMs: 0,
      rankChange: 0,
      pressureMs: 0,
      pressureNumber: null,
      spinMs: 0,
      contactMs: 0,
      missedCheckpointMs: 0,
      airborneMs: 0,
      offroad: false
    }
  };
}

export function startGrandPrix(state) {
  if (state.phase !== "grid") return [];
  state.phase = "racing";
  state.countdownMs = 2400;
  return [{ type: "race-start" }];
}

export function setGrandPrixThrottle(state, active) {
  if (state.phase !== "racing") return [];
  const drive = state.drive;
  drive.throttle = Boolean(active);
  if (drive.throttle && state.countdownMs > 0 && state.countdownMs <= START_SPARK_WINDOW_MS && !drive.startSparkArmed) {
    drive.startSparkArmed = true;
    return [{ type: "start-spark-armed" }];
  }
  return [{ type: drive.throttle ? "throttle-on" : "throttle-off" }];
}

export function setGrandPrixBrake(state, active) {
  if (state.phase !== "racing") return [];
  state.drive.brake = Boolean(active);
  return [{ type: state.drive.brake ? "brake-on" : "brake-off" }];
}

export function steerGrandPrix(state, direction, active = true) {
  if (state.phase !== "racing") return [];
  const value = direction === "left" ? -1 : direction === "right" ? 1 : 0;
  if (!value) return [];
  if (active) state.drive.heading = value;
  else if (state.drive.heading === value) state.drive.heading = 0;
  return [{ type: "steer", heading: state.drive.heading }];
}

export function setGrandPrixDrift(state, active) {
  if (state.phase !== "racing" || state.countdownMs > 0 || state.drive.spinMs > 0) return [];
  const drive = state.drive;
  const next = Boolean(active);
  if (next === drive.drifting) return [];
  drive.drifting = next;
  if (next) {
    drive.driftMs = 1;
    return [{ type: "drift-start" }];
  }
  const tier = driftTier(drive.driftCharge);
  const charge = drive.driftCharge;
  drive.driftCharge = 0;
  drive.driftMs = 0;
  if (tier === "none") return [{ type: "drift-release", tier }];
  const boostMs = tier === "ultra" ? 1520 : tier === "super" ? 1120 : 720;
  const launchSpeed = tier === "ultra" ? 147 : tier === "super" ? 132 : 116;
  const skillGain = tier === "ultra" ? 30 : tier === "super" ? 20 : 12;
  drive.boostMs = Math.max(drive.boostMs, boostMs);
  drive.speed = Math.max(drive.speed, launchSpeed);
  drive.skillCharge = clamp(drive.skillCharge + skillGain, 0, SKILL_MAX);
  return [{ type: "drift-boost", tier, charge, skillCharge: drive.skillCharge }];
}

export function useGrandPrixJump(state) {
  return setGrandPrixDrift(state, !state.drive.drifting);
}

export function useGrandPrixSkill(state) {
  if (state.phase !== "racing" || state.countdownMs > 0 || state.drive.spinMs > 0) return [];
  const drive = state.drive;
  if (drive.skillCharge < SKILL_MAX) return [{ type: "skill-empty", skillCharge: drive.skillCharge }];
  drive.skillCharge = 0;
  drive.skillMs = 1320;
  drive.overtakeNumber = null;
  drive.boostMs = Math.max(drive.boostMs, 1320);
  drive.speed = Math.max(drive.speed, 154);
  drive.lateralVelocity *= 0.38;
  return [{ type: "star-dash" }];
}

export function chooseGrandPrixGate(state, gateId) {
  const gate = currentGate(state);
  if (!gate || state.phase !== "racing") return [];
  state.drive.lateral = gateId === gate.id ? gate.lane : gate.decoyLane;
  state.progress = Math.max(state.progress, GRAND_PRIX_GATE_POSITIONS[state.gateIndex] + 1);
  return updateGate(state, GRAND_PRIX_GATE_POSITIONS[state.gateIndex] - 1);
}

export function takeGrandPrixCorrection(state) {
  if (state.phase !== "racing" || !state.wrongGate) return [];
  const gate = currentGate(state);
  if (!gate) return [];
  state.wrongGate = null;
  state.drive.lateral = gate.lane;
  state.progress = Math.max(state.progress, GRAND_PRIX_GATE_POSITIONS[state.gateIndex] + 1);
  return updateGate(state, GRAND_PRIX_GATE_POSITIONS[state.gateIndex] - 1);
}

export function tickGrandPrix(state, elapsedMs) {
  if (state.phase !== "racing") return [];
  const delta = clamp(Number(elapsedMs) || 0, 0, 50);
  const seconds = delta / 1000;
  const drive = state.drive;
  const events = [];
  state.elapsedMs += delta;
  const wasCountingDown = state.countdownMs > 0;
  state.countdownMs = Math.max(0, state.countdownMs - delta);
  ["boostMs", "startSparkMs", "skillMs", "overtakeMs", "rankChangeMs", "pressureMs", "spinMs", "contactMs", "missedCheckpointMs", "airborneMs"].forEach(key => { drive[key] = Math.max(0, drive[key] - delta); });
  if (wasCountingDown && state.countdownMs === 0 && drive.startSparkArmed) {
    drive.startSparkArmed = false;
    drive.startSparkMs = 820;
    drive.boostMs = Math.max(drive.boostMs, 820);
    drive.speed = Math.max(drive.speed, 104);
    events.push({ type: "start-spark" });
  }
  if (state.countdownMs > 0) {
    updateAi(state, seconds * 0.18);
    return events;
  }
  if (drive.spinMs > 0) {
    drive.lateralVelocity += Math.sin(state.elapsedMs / 45) * 0.2;
    changeSpeed(state, -82 * seconds);
  } else {
    if (drive.throttle) changeSpeed(state, ACCEL * seconds);
    else changeSpeed(state, -COAST * seconds);
    if (drive.brake) changeSpeed(state, -BRAKE * seconds);
    const drifting = drive.drifting && drive.heading !== 0 && drive.speed > 42;
    if (drifting) {
      drive.driftCharge = clamp(drive.driftCharge + delta, 0, 1500);
      drive.driftMs += delta;
    } else if (!drive.drifting) {
      drive.driftCharge = Math.max(0, drive.driftCharge - delta * 1.8);
      drive.driftMs = 0;
    }
    const steerStrength = (drifting ? 4.8 : 2.6) * (0.25 + drive.speed / MAX_SPEED);
    drive.lateralVelocity += drive.heading * steerStrength * seconds;
    drive.lateralVelocity *= drifting ? 0.965 : 0.86;
  }
  drive.lateral += drive.lateralVelocity * seconds;
  drive.lateral = clamp(drive.lateral, -WORLD_EDGE, WORLD_EDGE);
  drive.offroad = Math.abs(drive.lateral) > ROAD_EDGE;
  if (drive.offroad) changeSpeed(state, -OFFROAD_DRAG * seconds);
  const previous = state.progress;
  state.progress += drive.speed * seconds;
  updateCheckpoints(state, previous);
  events.push(...updateGate(state, previous));
  while (state.progress >= GRAND_PRIX_TRACK_LENGTH) {
    state.progress -= GRAND_PRIX_TRACK_LENGTH;
    events.push(...advanceLap(state));
  }
  updateAi(state, seconds);
  events.push(...updateStarDashPass(state));
  events.push(...updateRaceSignals(state));
  events.push(...updateKartContacts(state));
  return events;
}

export function finishGrandPrix(state) {
  if (state.phase !== "racing" || !grandPrixSnapshot(state).finishOpen) return [];
  state.phase = "finale";
  state.finishResult = {
    rank: rankFor(state),
    elapsedMs: state.elapsedMs,
    laps: state.totalLaps,
    number: state.number,
    target: state.target
  };
  return [{ type: "finish", rank: state.finishResult.rank }];
}

export function grandPrixSnapshot(state) {
  return {
    number: state.number,
    target: state.target,
    fuel: state.fuel,
    gateIndex: state.gateIndex,
    checkpoint: state.checkpointIndex,
    lap: state.lap,
    totalLaps: state.totalLaps,
    progress: state.progress,
    speed: Math.round(state.drive.speed),
    rank: rankFor(state),
    offroad: state.drive.offroad,
    drifting: state.drive.drifting,
    driftCharge: state.drive.driftCharge,
    driftTier: driftTier(state.drive.driftCharge),
    skillCharge: state.drive.skillCharge,
    skillReady: state.drive.skillCharge >= SKILL_MAX,
    skillActive: state.drive.skillMs > 0,
    startSparkActive: state.drive.startSparkMs > 0,
    overtakeActive: state.drive.overtakeMs > 0,
    overtakeNumber: state.drive.overtakeNumber,
    rankChangeActive: state.drive.rankChangeMs > 0,
    rankChange: state.drive.rankChange,
    pressureActive: state.drive.pressureMs > 0,
    pressureNumber: state.drive.pressureNumber,
    finishResult: state.finishResult,
    finishOpen: state.lap > state.totalLaps && state.gateIndex === GATES.length && state.number === state.target
  };
}
