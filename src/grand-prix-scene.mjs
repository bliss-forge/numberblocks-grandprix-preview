import { GRAND_PRIX_GATE_POSITIONS, GRAND_PRIX_TRACK_LENGTH, grandPrixRoadCurve, grandPrixSnapshot } from "./grand-prix-model.mjs";

const KART_COLORS = Object.freeze({ 1: "#f06b80", 2: "#f19a4b", 3: "#67ba75", 4: "#805bd1", 5: "#58aee0" });
const KART_SPRITE_URLS = Object.freeze({
  1: "../assets/grand-prix/karts/one.png",
  2: "../assets/grand-prix/karts/two.png",
  3: "../assets/grand-prix/karts/three.png",
  4: "../assets/grand-prix/karts/four.png",
  5: "../assets/grand-prix/karts/five.png"
});
const kartSprites = new Map();

function spriteForKart(number) {
  if (kartSprites.has(number)) return kartSprites.get(number);
  const sprite = new Image();
  sprite.decoding = "async";
  sprite.src = KART_SPRITE_URLS[number] ?? KART_SPRITE_URLS[4];
  kartSprites.set(number, sprite);
  return sprite;
}
const GATE_LABELS = Object.freeze({ "plus-1": "+1", "plus-2": "+2", "plus-3": "+3", "plus-4": "+4" });

function element(document, tag, className, text = "") {
  const value = document.createElement(tag);
  value.className = className;
  value.textContent = text;
  return value;
}

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const ratio = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d");
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function horizonPoint(state, width, height, depth) {
  const horizon = height * 0.25;
  const view = 850;
  const clamped = Math.max(0, Math.min(view, depth));
  const proximity = 1 - clamped / view;
  const perspective = Math.pow(proximity, 1.52);
  const currentCurve = grandPrixRoadCurve(state.progress);
  const upcomingCurve = grandPrixRoadCurve(state.progress + clamped);
  const curveShift = (upcomingCurve - currentCurve) * width * (0.06 + perspective * 0.19);
  return {
    x: width * 0.5 + curveShift,
    y: horizon + perspective * (height - horizon),
    roadWidth: 28 + perspective * width * 0.54,
    perspective,
    depth: clamped
  };
}

function drawBackground(context, state, width, height) {
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#7ed4f2");
  sky.addColorStop(0.52, "#c7eff3");
  sky.addColorStop(1, "#9fd673");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);
  context.globalAlpha = 0.8;
  context.fillStyle = "#ffffff";
  [[0.13, 0.16, 0.12], [0.74, 0.19, 0.16], [0.47, 0.11, 0.08]].forEach(([x, y, size]) => {
    context.beginPath();
    context.arc(width * x, height * y, width * size * 0.32, Math.PI * 0.8, Math.PI * 2.2);
    context.arc(width * (x + 0.045), height * y, width * size * 0.38, Math.PI, Math.PI * 2);
    context.arc(width * (x + 0.09), height * (y + 0.01), width * size * 0.25, Math.PI, Math.PI * 2);
    context.fill();
  });
  context.globalAlpha = 1;
  const scroll = (state.progress * 0.11) % width;
  context.fillStyle = "#8fc979";
  context.beginPath();
  context.moveTo(0, height * 0.47);
  for (let x = -width; x <= width * 2; x += width * 0.18) {
    const peak = height * (0.3 + 0.06 * Math.sin((x + scroll) / 100));
    context.lineTo(x, peak);
  }
  context.lineTo(width, height * 0.65);
  context.lineTo(0, height * 0.65);
  context.closePath();
  context.fill();
  context.fillStyle = "#65aa68";
  context.beginPath();
  context.moveTo(0, height * 0.56);
  for (let x = -width; x <= width * 2; x += width * 0.13) {
    const peak = height * (0.43 + 0.045 * Math.cos((x + scroll * 1.6) / 75));
    context.lineTo(x, peak);
  }
  context.lineTo(width, height);
  context.lineTo(0, height);
  context.closePath();
  context.fill();
  const castleX = width * 0.79 - (grandPrixRoadCurve(state.progress + 750) - grandPrixRoadCurve(state.progress)) * width * 0.04;
  const castleY = height * 0.24;
  context.save();
  context.translate(castleX, castleY);
  context.fillStyle = "#f8df8d";
  context.fillRect(-12, -12, 24, 28);
  context.fillRect(-25, -2, 12, 18);
  context.fillRect(13, -2, 12, 18);
  context.fillStyle = "#e7b956";
  [-19, 0, 19].forEach(x => { context.beginPath(); context.moveTo(x - 8, -2); context.lineTo(x, -20); context.lineTo(x + 8, -2); context.fill(); });
  context.fillStyle = "#fff7b5";
  context.font = "900 18px Arial";
  context.textAlign = "center";
  context.fillText("★", 0, -25);
  context.restore();
}

function drawRoad(context, state, width, height) {
  const slices = [];
  for (let depth = 850; depth >= 0; depth -= 9) slices.push(horizonPoint(state, width, height, depth));
  context.fillStyle = "#86bf68";
  context.fillRect(0, height * 0.47, width, height * 0.53);
  context.beginPath();
  slices.forEach((point, index) => {
    const left = point.x - point.roadWidth;
    if (index === 0) context.moveTo(left, point.y);
    else context.lineTo(left, point.y);
  });
  for (let index = slices.length - 1; index >= 0; index -= 1) context.lineTo(slices[index].x + slices[index].roadWidth, slices[index].y);
  context.closePath();
  context.fillStyle = "#34445a";
  context.fill();
  for (let index = 0; index < slices.length - 1; index += 1) {
    const far = slices[index];
    const near = slices[index + 1];
    if (index % 2 === 0) {
      context.fillStyle = "#f6d968";
      context.beginPath();
      context.moveTo(far.x - far.roadWidth * 1.09, far.y);
      context.lineTo(far.x - far.roadWidth, far.y);
      context.lineTo(near.x - near.roadWidth, near.y);
      context.lineTo(near.x - near.roadWidth * 1.09, near.y);
      context.closePath();
      context.fill();
      context.beginPath();
      context.moveTo(far.x + far.roadWidth, far.y);
      context.lineTo(far.x + far.roadWidth * 1.09, far.y);
      context.lineTo(near.x + near.roadWidth * 1.09, near.y);
      context.lineTo(near.x + near.roadWidth, near.y);
      context.closePath();
      context.fill();
    }
  }
  for (let marker = 0; marker < 850; marker += 45) {
    const shifted = (marker + state.progress * 2.4) % 850;
    const from = horizonPoint(state, width, height, shifted);
    const to = horizonPoint(state, width, height, Math.min(850, shifted + 15));
    context.fillStyle = "#fff7cd";
    context.beginPath();
    context.moveTo(from.x - from.roadWidth * 0.035, from.y);
    context.lineTo(from.x + from.roadWidth * 0.035, from.y);
    context.lineTo(to.x + to.roadWidth * 0.018, to.y);
    context.lineTo(to.x - to.roadWidth * 0.018, to.y);
    context.closePath();
    context.fill();
  }
}

function project(state, width, height, distance, lane) {
  const relative = distance - state.progress;
  if (relative < -8 || relative > 850) return null;
  const point = horizonPoint(state, width, height, relative);
  return { x: point.x + lane * point.roadWidth * 0.67, y: point.y, scale: 0.18 + point.perspective * 1.05, point };
}

function drawKart(context, x, y, scale, number, tilt = 0, effects = {}) {
  const size = Math.max(8, 28 * scale);
  const color = KART_COLORS[number] ?? KART_COLORS[4];
  context.save();
  context.translate(x, y - size * 0.35);
  context.rotate(tilt * 0.14);
  const sprite = spriteForKart(number);
  if (sprite.complete && sprite.naturalWidth > 0) {
    if (effects.boost) {
      context.fillStyle = "rgba(255,226,87,.82)";
      context.beginPath();
      context.moveTo(-size * 0.34, size * 0.7);
      context.lineTo(0, size * 1.72);
      context.lineTo(size * 0.34, size * 0.7);
      context.fill();
    }
    context.imageSmoothingEnabled = true;
    context.drawImage(sprite, -size * 1.58, -size * 1.68, size * 3.16, size * 3.16);
    if (effects.drift) {
      context.fillStyle = effects.drift > 850 ? "#f5b545" : "#dbefff";
      [-1, 1].forEach(side => {
        context.beginPath();
        context.arc(side * size * 0.86, size * 0.74, size * 0.2, 0, Math.PI * 2);
        context.fill();
      });
    }
    context.restore();
    return;
  }
  if (effects.boost) {
    context.fillStyle = "rgba(255,226,87,.8)";
    context.beginPath();
    context.moveTo(-size * 0.33, size * 0.55);
    context.lineTo(0, size * 1.55);
    context.lineTo(size * 0.33, size * 0.55);
    context.fill();
  }
  context.fillStyle = "rgba(20,40,60,.24)";
  context.beginPath();
  context.ellipse(0, size * 0.78, size * 1.08, size * 0.26, 0, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#23384f";
  [-0.78, 0.78].forEach(side => {
    context.beginPath();
    context.roundRect(side * size * 0.73 - size * 0.27, size * 0.04, size * 0.54, size * 0.78, size * 0.18);
    context.fill();
  });
  context.fillStyle = color;
  context.strokeStyle = "#263a52";
  context.lineWidth = Math.max(1.5, size * 0.1);
  context.beginPath();
  context.roundRect(-size, -size * 0.53, size * 2, size * 1.45, size * 0.37);
  context.fill();
  context.stroke();
  context.fillStyle = "#fff8d6";
  context.beginPath();
  context.roundRect(-size * 0.56, -size * 0.62, size * 1.12, size * 0.63, size * 0.26);
  context.fill();
  context.fillStyle = "#2f4161";
  context.beginPath();
  context.arc(-size * 0.22, -size * 0.32, size * 0.09, 0, Math.PI * 2);
  context.arc(size * 0.22, -size * 0.32, size * 0.09, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#fff";
  context.font = `900 ${Math.max(9, size * 0.72)}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(String(number), 0, size * 0.34);
  if (effects.drift) {
    context.fillStyle = effects.drift > 850 ? "#f5b545" : "#dbefff";
    [-1, 1].forEach(side => {
      context.beginPath();
      context.arc(side * size * 0.82, size * 0.58, size * 0.19, 0, Math.PI * 2);
      context.fill();
    });
  }
  context.restore();
}

function drawGate(context, state, width, height, distance, lane, label, correct) {
  const position = project(state, width, height, distance, lane);
  if (!position) return;
  const size = 28 * position.scale;
  context.save();
  context.translate(position.x, position.y - size * 1.92);
  context.fillStyle = correct ? "#42ae7d" : "#e06d5c";
  context.strokeStyle = "#fffef0";
  context.lineWidth = Math.max(1.5, size * 0.11);
  context.beginPath();
  context.roundRect(-size, -size, size * 2, size * 1.5, size * 0.25);
  context.fill();
  context.stroke();
  context.fillStyle = "#fff";
  context.font = `900 ${Math.max(9, size * 0.73)}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 0, -size * 0.28);
  context.restore();
}

function drawTrackObjects(context, state, width, height) {
  if (state.lap === 1 && state.gateIndex < 3) {
    const gate = [
      { id: "plus-2", lane: -0.52, decoy: "plus-4", decoyLane: 0.48 },
      { id: "plus-1", lane: 0.42, decoy: "plus-3", decoyLane: -0.44 },
      { id: "plus-3", lane: 0, decoy: "plus-2", decoyLane: -0.56 }
    ][state.gateIndex];
    const marker = GRAND_PRIX_GATE_POSITIONS[state.gateIndex];
    drawGate(context, state, width, height, marker, gate.lane, GATE_LABELS[gate.id], true);
    drawGate(context, state, width, height, marker, gate.decoyLane, GATE_LABELS[gate.decoy], false);
  }
  const jumpDistance = 930;
  const jump = project(state, width, height, jumpDistance, 0);
  if (jump) {
    const size = 24 * jump.scale;
    context.save();
    context.translate(jump.x, jump.y - size * 0.3);
    context.fillStyle = "#f2cd5b";
    context.strokeStyle = "#fff6b7";
    context.lineWidth = Math.max(1.5, size * 0.12);
    context.beginPath();
    context.moveTo(-size, size * 0.45);
    context.lineTo(size, size * 0.45);
    context.lineTo(size * 0.65, -size * 0.55);
    context.lineTo(-size * 0.65, -size * 0.55);
    context.closePath();
    context.fill();
    context.stroke();
    context.restore();
  }
}

function drawDriveEffects(context, state, width, height, kartX) {
  const speedRatio = Math.min(1, state.drive.speed / 132);
  const baseY = height * 0.82;
  if (state.drive.boostMs > 0) {
    context.save();
    context.globalAlpha = 0.72;
    context.strokeStyle = "#fff3a5";
    context.lineWidth = 2 + speedRatio * 2;
    for (let index = 0; index < 22; index += 1) {
      const offset = ((index * 73 + state.elapsedMs * 0.68) % (width + 120)) - 60;
      const length = 28 + ((index * 17) % 38);
      context.beginPath();
      context.moveTo(offset, height * (0.36 + (index % 5) * 0.1));
      context.lineTo(offset - length, height * (0.52 + (index % 5) * 0.075));
      context.stroke();
    }
    context.restore();
  }
  if (state.drive.drifting && state.drive.speed > 30) {
    const hot = state.drive.driftCharge > 850;
    context.save();
    context.fillStyle = hot ? "#ffc84d" : "#8ed9ff";
    context.shadowColor = hot ? "#ff9d2e" : "#d8f5ff";
    context.shadowBlur = 12;
    for (let index = 0; index < 14; index += 1) {
      const side = index % 2 ? -1 : 1;
      const trail = 17 + (index * 11 % 78);
      const wobble = Math.sin(state.elapsedMs / 60 + index) * 7;
      context.beginPath();
      context.arc(kartX + side * (28 + index % 3 * 7) - state.drive.heading * trail * 0.25, baseY + 27 + trail * 0.28 + wobble, 2 + (index % 3), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  if (state.drive.offroad) {
    context.save();
    context.fillStyle = "rgba(126,87,43,.6)";
    for (let index = 0; index < 16; index += 1) {
      const side = index % 2 ? -1 : 1;
      const trail = 18 + (index * 13 % 94);
      context.beginPath();
      context.arc(kartX + side * (26 + index % 4 * 5), baseY + 25 + trail * 0.33, 3 + index % 4, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
}

function drawFinishRibbon(context, state, width, height) {
  const distance = GRAND_PRIX_TRACK_LENGTH;
  const position = project(state, width, height, distance, 0);
  if (!position) return;
  const bandHeight = Math.max(4, position.point.roadWidth * 0.16);
  const block = Math.max(3, position.point.roadWidth * 0.13);
  for (let index = -5; index <= 5; index += 1) {
    context.fillStyle = (index + Math.floor(state.elapsedMs / 120)) % 2 ? "#f8f3cd" : "#304054";
    context.fillRect(position.x + index * block, position.y - bandHeight, block, bandHeight);
  }
}

function drawWorld(canvas, state) {
  const { context, width, height } = resizeCanvas(canvas);
  const impact = Math.max(state.drive.contactMs, state.drive.spinMs);
  context.save();
  if (impact > 0) {
    const shake = Math.sin(state.elapsedMs / 24) * Math.min(7, impact / 65);
    context.translate(shake, -Math.abs(shake) * 0.28);
  }
  drawBackground(context, state, width, height);
  drawRoad(context, state, width, height);
  drawFinishRibbon(context, state, width, height);
  drawTrackObjects(context, state, width, height);
  const playerDistance = (state.lap - 1) * GRAND_PRIX_TRACK_LENGTH + state.progress;
  state.racers.forEach(racer => {
    let gap = racer.distance - playerDistance;
    if (gap < -15) gap += GRAND_PRIX_TRACK_LENGTH;
    const position = project(state, width, height, state.progress + gap, racer.lane);
    if (position) drawKart(context, position.x, position.y, position.scale, racer.number, 0);
  });
  const playerPoint = horizonPoint(state, width, height, 10);
  const kartX = playerPoint.x + state.drive.lateral * playerPoint.roadWidth * 0.67;
  if (state.drive.boostMs > 0) {
    context.strokeStyle = "rgba(255,244,166,.54)";
    context.lineWidth = 2;
    for (let index = 0; index < 13; index += 1) {
      const x = (index * 89 + state.elapsedMs * 0.38) % width;
      context.beginPath();
      context.moveTo(x, height * 0.4);
      context.lineTo(x - 22, height * 0.72);
      context.stroke();
    }
  }
  drawDriveEffects(context, state, width, height, kartX);
  drawKart(context, kartX, height * 0.83, 1.26, 4, state.drive.heading + (state.drive.spinMs ? Math.sin(state.elapsedMs / 50) * 2.2 : 0), { boost: state.drive.boostMs > 0, drift: state.drive.drifting ? state.drive.driftCharge : 0 });
  if (impact > 0) {
    context.fillStyle = "rgba(234,89,72,.15)";
    context.fillRect(0, 0, width, height);
  }
  context.restore();
}

function rankSuffix(rank) {
  return rank === 1 ? "st" : rank === 2 ? "nd" : rank === 3 ? "rd" : "th";
}

function buildHud(document) {
  const hud = element(document, "header", "gp-arcade-hud");
  const brand = element(document, "div", "gp-arcade-brand");
  brand.append(element(document, "small", "gp-arcade-kicker", "NUMBERBLOCKS"), element(document, "strong", "gp-arcade-title", "GRAND PRIX"));
  const chips = element(document, "div", "gp-arcade-chips");
  chips.append(element(document, "span", "gp-lap", "LAP 1/3"), element(document, "span", "gp-speed", "0"), element(document, "span", "gp-rank", "5th"), element(document, "span", "gp-sum", "4 → 10"));
  hud.append(brand, chips);
  return hud;
}

export function renderGrandPrixScene(document, state) {
  const root = element(document, "section", "gp-game gp-arcade-race");
  root.tabIndex = -1;
  const canvas = element(document, "canvas", "gp-arcade-canvas");
  canvas.setAttribute("aria-label", "Playable Numberblocks kart circuit");
  const countdown = element(document, "div", "gp-arcade-countdown");
  countdown.hidden = true;
  const prompt = element(document, "div", "gp-arcade-prompt", "HOLD GO TO DRIVE");
  const controls = element(document, "footer", "gp-arcade-controls");
  const left = element(document, "button", "gp-arcade-key", "◀");
  left.type = "button";
  left.dataset.gpHold = "left";
  const brake = element(document, "button", "gp-arcade-key gp-arcade-brake", "BRAKE");
  brake.type = "button";
  brake.dataset.gpHold = "brake";
  const go = element(document, "button", "gp-arcade-key gp-arcade-go", "GO");
  go.type = "button";
  go.dataset.gpToggle = "throttle";
  const right = element(document, "button", "gp-arcade-key", "▶");
  right.type = "button";
  right.dataset.gpHold = "right";
  const drift = element(document, "button", "gp-arcade-key gp-arcade-drift", "DRIFT");
  drift.type = "button";
  drift.dataset.gpJump = "true";
  controls.append(left, brake, go, right, drift);
  const finish = element(document, "div", "gp-arcade-finish");
  finish.hidden = true;
  root.append(canvas, buildHud(document), countdown, prompt, controls, finish);
  return root;
}

export function updateGrandPrixScene(root, state) {
  const snapshot = grandPrixSnapshot(state);
  root.dataset.phase = state.phase;
  root.dataset.offroad = String(snapshot.offroad);
  root.dataset.drifting = String(snapshot.drifting);
  root.dataset.boost = String(state.drive.boostMs > 0);
  root.dataset.impact = String(state.drive.contactMs > 0 || state.drive.spinMs > 0);
  root.querySelector(".gp-lap").textContent = `LAP ${Math.min(state.lap, state.totalLaps)}/${state.totalLaps}`;
  root.querySelector(".gp-speed").textContent = `${snapshot.speed} km/h`;
  root.querySelector(".gp-rank").textContent = `${snapshot.rank}${rankSuffix(snapshot.rank)}`;
  root.querySelector(".gp-sum").textContent = `${snapshot.number} → ${snapshot.target}`;
  const countdown = root.querySelector(".gp-arcade-countdown");
  const count = Math.ceil(state.countdownMs / 800);
  countdown.hidden = count <= 0 || state.phase !== "racing";
  countdown.textContent = count > 0 ? String(count) : "";
  const prompt = root.querySelector(".gp-arcade-prompt");
  prompt.hidden = state.countdownMs > 0 || state.phase !== "racing" || state.drive.throttle;
  const go = root.querySelector(".gp-arcade-go");
  go.dataset.active = String(state.drive.throttle);
  const finish = root.querySelector(".gp-arcade-finish");
  finish.hidden = state.phase !== "finale";
  finish.textContent = state.phase === "finale" ? `${snapshot.rank}${rankSuffix(snapshot.rank)} PLACE! STAR CASTLE` : "";
  root.querySelector(".gp-arcade-controls").hidden = state.phase === "finale";
  drawWorld(root.querySelector(".gp-arcade-canvas"), state);
}
