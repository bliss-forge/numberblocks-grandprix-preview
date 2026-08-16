export const GRAND_PRIX_COURSE = "star-canyon-loop";
export const GRAND_PRIX_TRACK_LENGTH = 1800;
export const GRAND_PRIX_TOTAL_LAPS = 3;
export const GRAND_PRIX_GATE_POSITIONS = Object.freeze([390, 770, 1150]);
export const GRAND_PRIX_CHECKPOINTS = Object.freeze([280, 690, 1080, 1450]);
export const GRAND_PRIX_ITEM_BOXES = Object.freeze([
  { id: "starbox-1", position: 535, lane: -0.08 },
  { id: "starbox-2", position: 865, lane: 0.48 },
  { id: "starbox-3", position: 1240, lane: -0.46 },
  { id: "starbox-4", position: 1535, lane: 0.24 }
]);

const RACER_NUMBERS = Object.freeze([1, 2, 3, 5]);
const GATES = Object.freeze([
  { id: "plus-2", value: 2, target: 6, lane: -0.52, decoy: "plus-4", decoyLane: 0.48 },
  { id: "plus-1", value: 1, target: 7, lane: 0.42, decoy: "plus-3", decoyLane: -0.44 },
  { id: "plus-3", value: 3, target: 10, lane: 0, decoy: "plus-2", decoyLane: -0.56 }
]);
const MAX_SPEED = 148;
const BOOST_SPEED = 182;
const STAR_DASH_SPEED = 205;
const DRAFT_SPEED = 172;
const START_SPARK_WINDOW_MS = 540;
const SKILL_MAX = 100;
const ACCEL = 76;
const COAST = 22;
const BRAKE = 132;
const OFFROAD_DRAG = 88;
const ROAD_EDGE = 1.02;
const WORLD_EDGE = 1.62;
const ITEM_BOX_CAPTURE_WIDTH = 0.4;
const STARBURST_ITEM = "starburst";
const STARBURST_MIN_RANGE = 5;
const STARBURST_MAX_RANGE = 165;
const STARBURST_TRAVEL_MS = 560;
const DRAFT_MIN_RANGE = 9;
const DRAFT_MAX_RANGE = 52;
const DRAFT_LANE_WIDTH = 0.3;

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
  const drive = state.drive;
  const cap = drive.skillMs > 0 ? STAR_DASH_SPEED : drive.slingshotMs > 0 ? DRAFT_SPEED : drive.boostMs > 0 ? BOOST_SPEED : MAX_SPEED;
  drive.speed = clamp(drive.speed + delta, 0, cap);
}

function driftTier(charge) {
  if (charge >= 1050) return "ultra";
  if (charge >= 620) return "super";
  if (charge >= 240) return "mini";
  return "none";
}

function cornerProfile(state, distanceAhead = 0) {
  const current = grandPrixRoadCurve(state.progress + distanceAhead);
  const future = grandPrixRoadCurve(state.progress + distanceAhead + 135);
  const delta = future - current;
  return { direction: Math.sign(delta) || 1, demand: clamp(Math.abs(delta) * 1.35, 0, 1) };
}

function updateDraft(state, delta) {
  const drive = state.drive;
  if (drive.spinMs > 0 || drive.skillMs > 0) {
    drive.draftActive = false;
    drive.draftMs = 0;
    drive.draftTargetNumber = null;
    return [];
  }
  const player = totalDistance(state);
  const target = state.racers
    .filter(racer => racer.distance - player >= DRAFT_MIN_RANGE && racer.distance - player <= DRAFT_MAX_RANGE && Math.abs(racer.lane - drive.lateral) <= DRAFT_LANE_WIDTH)
    .sort((left, right) => left.distance - right.distance)[0] ?? null;
  const wasDrafting = drive.draftActive;
  const storedMs = drive.draftMs;
  if (target && drive.speed >= 64) {
    drive.draftActive = true;
    drive.draftTargetNumber = target.number;
    drive.draftLastTargetNumber = target.number;
    drive.draftMs = clamp(drive.draftMs + delta, 0, 1000);
    return [];
  }
  drive.draftActive = false;
  drive.draftTargetNumber = null;
  if (wasDrafting && storedMs >= 280 && drive.speed > 70) {
    drive.slingshotMs = Math.max(drive.slingshotMs, 360 + Math.round(storedMs * 0.48));
    drive.slingshotNumber = drive.draftLastTargetNumber;
    drive.speed = Math.max(drive.speed, Math.min(163, 132 + storedMs * 0.032));
    drive.draftMs = 0;
    return [{ type: "slingshot", racer: drive.slingshotNumber }];
  }
  drive.draftMs = Math.max(0, drive.draftMs - delta * 2);
  return [];
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
    const profile = cornerProfile(state, racer.progress - state.progress);
    const chase = gap > 24 ? 1.08 : gap < -48 ? 0.95 : 1;
    racer.hitMs = Math.max(0, (racer.hitMs || 0) - seconds * 1000);
    const hitSlow = racer.hitMs > 0 ? 0.46 : 1;
    const packSide = racer.number % 2 ? -1 : 1;
    const racerAhead = state.racers
      .filter(other => other !== racer && other.distance > racer.distance && other.distance - racer.distance < 22)
      .sort((left, right) => left.distance - right.distance)[0];
    const playerApproaching = racer.distance > playerDistance && racer.distance - playerDistance < 48;
    const playerAhead = gap > 0 && gap < 32;
    const rivalInside = clamp(racer.raceLine - profile.direction * (0.18 + (index % 2) * 0.1), -0.76, 0.76);
    const defensiveLine = clamp(state.drive.lateral + packSide * 0.34, -0.78, 0.78);
    const passingLine = racerAhead && Math.abs(racerAhead.lane - racer.lane) < 0.34 ? packSide * 0.32 : 0;
    racer.packOffset = passingLine + ((playerApproaching || playerAhead) ? (defensiveLine - rivalInside) * 0.72 : 0);
    racer.laneTarget = clamp(rivalInside + racer.packOffset + Math.sin(state.elapsedMs / 620 + index * 1.8) * 0.035, -0.84, 0.84);
    const targetSpeed = clamp((racer.baseSpeed ?? racer.targetSpeed) + profile.demand * 6 + (playerApproaching ? 5 : 0), 88, 132);
    racer.targetSpeed = targetSpeed;
    racer.speed = clamp(racer.speed + (targetSpeed - racer.speed) * Math.min(1, seconds * 2.25), 64, 134);
    racer.distance += racer.speed * chase * hitSlow * seconds;
    racer.progress = racer.distance % GRAND_PRIX_TRACK_LENGTH;
    racer.lap = Math.floor(racer.distance / GRAND_PRIX_TRACK_LENGTH) + 1;
    racer.lane += (racer.laneTarget - racer.lane) * Math.min(1, seconds * 4.3);
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

function updateItemBoxes(state, previousProgress) {
  const drive = state.drive;
  if (drive.heldItem || state.lap > state.totalLaps) return [];
  for (const box of GRAND_PRIX_ITEM_BOXES) {
    if (state.itemBoxes[box.id] === state.lap) continue;
    if (!crossing(previousProgress, state.progress, box.position)) continue;
    if (Math.abs(drive.lateral - box.lane) > ITEM_BOX_CAPTURE_WIDTH) continue;
    state.itemBoxes[box.id] = state.lap;
    drive.heldItem = STARBURST_ITEM;
    drive.itemPulseMs = 780;
    return [{ type: "item-box", item: drive.heldItem, boxId: box.id }];
  }
  return [];
}

function starburstTarget(state) {
  const player = totalDistance(state);
  return state.racers
    .filter(racer => racer.distance - player >= STARBURST_MIN_RANGE && racer.distance - player <= STARBURST_MAX_RANGE)
    .sort((left, right) => left.distance - right.distance)[0] ?? null;
}

function updateStarburst(state, delta) {
  const burst = state.starburst;
  if (!burst) return [];
  burst.elapsedMs += delta;
  if (burst.elapsedMs < burst.durationMs) return [];
  const target = state.racers.find(racer => racer.number === burst.targetNumber);
  state.starburst = null;
  if (!target) return [];
  target.hitMs = 720;
  target.speed *= 0.48;
  target.distance = Math.max(0, target.distance - 11);
  target.progress = target.distance % GRAND_PRIX_TRACK_LENGTH;
  target.lap = Math.floor(target.distance / GRAND_PRIX_TRACK_LENGTH) + 1;
  return [{ type: "starburst-hit", racer: target.number }];
}

function updateStarDashPass(state) {
  const drive = state.drive;
  if (drive.skillMs <= 0) return [];
  const player = totalDistance(state);
  const target = state.racers
    .filter(racer => racer.distance >= player - 9 && racer.distance <= player + 34)
    .sort((left, right) => left.distance - right.distance)[0];
  if (!target) return [];
  target.distance = Math.max(0, player - 12);
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
    const distance = 32 + index * 18 + Math.floor(random() * 4);
    return {
      number,
      lane: [-0.42, -0.1, 0.24, 0.54][index],
      laneTarget: [-0.42, -0.1, 0.24, 0.54][index],
      raceLine: [-0.42, -0.1, 0.24, 0.54][index],
      packOffset: 0,
      hitMs: 0,
      baseSpeed: 98 + random() * 12,
      targetSpeed: 98 + random() * 12,
      speed: 86 + random() * 8,
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
    itemBoxes: Object.fromEntries(GRAND_PRIX_ITEM_BOXES.map(box => [box.id, 0])),
    starburst: null,
    racers,
    drive: {
      speed: 0,
      lateral: 0,
      lateralVelocity: 0,
      heading: 0,
      steer: 0,
      yaw: 0,
      cornerLoad: 0,
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
      itemPulseMs: 0,
      heldItem: null,
      draftMs: 0,
      draftActive: false,
      draftTargetNumber: null,
      draftLastTargetNumber: null,
      slingshotMs: 0,
      slingshotNumber: null,
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

export function useGrandPrixItem(state) {
  if (state.phase !== "racing" || state.countdownMs > 0 || state.drive.spinMs > 0) return [];
  if (state.drive.heldItem !== STARBURST_ITEM) return [{ type: "item-empty" }];
  const target = starburstTarget(state);
  if (!target) return [{ type: "item-no-target" }];
  state.drive.heldItem = null;
  state.starburst = {
    targetNumber: target.number,
    elapsedMs: 0,
    durationMs: STARBURST_TRAVEL_MS,
    startLane: state.drive.lateral
  };
  return [{ type: "starburst-launch", racer: target.number }];
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
  ["boostMs", "startSparkMs", "skillMs", "overtakeMs", "rankChangeMs", "pressureMs", "spinMs", "contactMs", "missedCheckpointMs", "airborneMs", "itemPulseMs", "slingshotMs"].forEach(key => { drive[key] = Math.max(0, drive[key] - delta); });
  if (drive.slingshotMs === 0) drive.slingshotNumber = null;
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
    const speedRatio = clamp(drive.speed / MAX_SPEED, 0, 1);
    const profile = cornerProfile(state);
    const steerResponse = drive.drifting ? 7.8 : 15.5;
    drive.steer += (drive.heading - drive.steer) * Math.min(1, seconds * steerResponse);
    drive.yaw += (drive.steer - drive.yaw) * Math.min(1, seconds * (drive.drifting ? 6.2 : 10.5));
    const turning = Math.abs(drive.steer);
    const drifting = drive.drifting && turning > 0.16 && drive.speed > 42;
    drive.cornerLoad += (turning * speedRatio * (0.35 + profile.demand * 0.9) - drive.cornerLoad) * Math.min(1, seconds * 7.5);
    if (drifting) {
      const driftGain = delta * (0.36 + speedRatio * 0.78 + turning * 0.72 + profile.demand * 0.68);
      drive.driftCharge = clamp(drive.driftCharge + driftGain, 0, 1500);
      drive.driftMs += delta;
    } else {
      drive.driftCharge = Math.max(0, drive.driftCharge - delta * (drive.drifting ? 0.85 : 1.9));
      drive.driftMs = 0;
    }
    const grip = 1 - speedRatio * (drifting ? 0.46 : 0.18);
    const steerStrength = (drifting ? 7.35 : 4.65) * (0.28 + speedRatio) * grip;
    drive.lateralVelocity += drive.yaw * steerStrength * seconds;
    drive.lateralVelocity *= drifting ? 0.978 : 0.8;
    if (!drifting && drive.speed > 64 && turning > 0.1) {
      changeSpeed(state, -(7 + profile.demand * 26) * turning * speedRatio * seconds);
    }
  }
  drive.lateral += drive.lateralVelocity * seconds;
  drive.lateral = clamp(drive.lateral, -WORLD_EDGE, WORLD_EDGE);
  drive.offroad = Math.abs(drive.lateral) > ROAD_EDGE;
  if (drive.offroad) changeSpeed(state, -OFFROAD_DRAG * seconds);
  const previous = state.progress;
  state.progress += drive.speed * seconds;
  updateCheckpoints(state, previous);
  events.push(...updateGate(state, previous));
  events.push(...updateItemBoxes(state, previous));
  while (state.progress >= GRAND_PRIX_TRACK_LENGTH) {
    state.progress -= GRAND_PRIX_TRACK_LENGTH;
    events.push(...advanceLap(state));
  }
  events.push(...updateStarDashPass(state));
  updateAi(state, seconds);
  events.push(...updateDraft(state, delta));
  events.push(...updateStarburst(state, delta));
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
    yaw: state.drive.yaw,
    cornerLoad: state.drive.cornerLoad,
    draftActive: state.drive.draftActive,
    draftCharge: Math.round(state.drive.draftMs / 10),
    draftTargetNumber: state.drive.draftTargetNumber,
    slingshotActive: state.drive.slingshotMs > 0,
    slingshotNumber: state.drive.slingshotNumber,
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
    heldItem: state.drive.heldItem,
    itemPulseActive: state.drive.itemPulseMs > 0,
    starburstActive: Boolean(state.starburst),
    starburstTarget: state.starburst?.targetNumber ?? null,
    finishResult: state.finishResult,
    finishOpen: state.lap > state.totalLaps && state.gateIndex === GATES.length && state.number === state.target
  };
}
