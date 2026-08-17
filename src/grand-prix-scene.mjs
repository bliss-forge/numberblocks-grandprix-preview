import { GRAND_PRIX_GATE_POSITIONS, GRAND_PRIX_ITEM_BOXES, GRAND_PRIX_TRACK_LENGTH, grandPrixRoadCurve, grandPrixSnapshot } from "./grand-prix-model.mjs";

const KART_COLORS = Object.freeze({ 1: "#f06b80", 2: "#f19a4b", 3: "#67ba75", 4: "#805bd1", 5: "#58aee0" });
const KART_SPRITE_URLS = Object.freeze({
  1: "assets/grand-prix/karts/one.png",
  2: "assets/grand-prix/karts/two.png",
  3: "assets/grand-prix/karts/three.png",
  4: "assets/grand-prix/karts/four.png",
  5: "assets/grand-prix/karts/five.png"
});
const kartSprites = new Map();
const MAX_CANVAS_PIXELS = 1250000;
const projectionCaches = new WeakMap();

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
  const cssPixels = Math.max(1, rect.width * rect.height);
  const requestedRatio = Math.min(2, window.devicePixelRatio || 1);
  const budgetRatio = Math.sqrt(MAX_CANVAS_PIXELS / cssPixels);
  const ratio = Math.max(1, Math.min(requestedRatio, budgetRatio));
  const width = Math.max(1, Math.round(rect.width * ratio));
  const height = Math.max(1, Math.round(rect.height * ratio));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  const context = canvas.getContext("2d", { alpha: false });
  context.setTransform(ratio, 0, 0, ratio, 0, 0);
  return { context, width: rect.width, height: rect.height };
}

function projectionFrame(state, width, height) {
  const cached = projectionCaches.get(state);
  if (cached?.elapsedMs === state.elapsedMs && cached.width === width && cached.height === height) return cached;
  const speedEnergy = Math.min(1, Math.max(0, (state.drive.speed - 62) / 126) + (state.drive.skillMs > 0 ? 0.3 : 0));
  const currentCurve = grandPrixRoadCurve(state.progress);
  const next = {
    elapsedMs: state.elapsedMs,
    width,
    height,
    speedEnergy,
    currentCurve,
    cornerLookAhead: grandPrixRoadCurve(state.progress + 150 + speedEnergy * 260),
    apexCurve: grandPrixRoadCurve(state.progress + 320 + speedEnergy * 160),
    horizon: height * (0.275 - speedEnergy * 0.052),
    view: 790 + speedEnergy * 184
  };
  projectionCaches.set(state, next);
  return next;
}

function horizonPoint(state, width, height, depth) {
  const frame = projectionFrame(state, width, height);
  const { speedEnergy, currentCurve, cornerLookAhead, apexCurve, horizon, view } = frame;
  const clamped = Math.max(0, Math.min(view, depth));
  const proximity = 1 - clamped / view;
  const perspective = Math.pow(proximity, 1.52);
  const upcomingCurve = grandPrixRoadCurve(state.progress + clamped);
  const curveShift = (upcomingCurve - currentCurve) * width * (0.075 + perspective * 0.265)
    + (cornerLookAhead - currentCurve) * width * (0.03 + speedEnergy * 0.055) * (1 - perspective * 0.42)
    + (apexCurve - cornerLookAhead) * width * 0.012 * (1 - perspective);
  return {
    x: width * 0.5 + curveShift,
    y: horizon + perspective * (height - horizon),
    roadWidth: 28 + perspective * width * (0.455 + speedEnergy * 0.05),
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
  const depthStep = state.drive.speed > 96 ? 14 : 12;
  for (let depth = 850; depth >= 0; depth -= depthStep) slices.push(horizonPoint(state, width, height, depth));
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
  const laneFlow = 2.1 + state.drive.speed / 94 + (state.drive.skillMs > 0 ? 0.8 : 0);
  for (let marker = 0; marker < 850; marker += 60) {
    const shifted = (marker + state.progress * laneFlow) % 850;
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

function drawApexChevrons(context, state, width, height) {
  const currentCurve = grandPrixRoadCurve(state.progress);
  const futureCurve = grandPrixRoadCurve(state.progress + 205);
  const direction = Math.sign(futureCurve - currentCurve);
  if (!direction) return;
  for (let depth = 145; depth < 420; depth += 76) {
    const point = horizonPoint(state, width, height, depth);
    const size = Math.max(4, point.perspective * 16);
    const x = point.x + direction * point.roadWidth * 0.78;
    context.save();
    context.translate(x, point.y - size * 0.44);
    context.globalAlpha = 0.3 + Math.min(0.42, point.perspective * 0.5);
    context.fillStyle = "#ffd55f";
    context.beginPath();
    context.moveTo(direction * size, 0);
    context.lineTo(-direction * size * 0.5, -size * 0.72);
    context.lineTo(-direction * size * 0.5, size * 0.72);
    context.closePath();
    context.fill();
    context.restore();
  }
}

function drawRoadsideDepth(context, state, width, height) {
  const speedEnergy = Math.min(1, state.drive.speed / 150);
  for (let depth = 132; depth < 900; depth += 118) {
    const point = horizonPoint(state, width, height, depth);
    const size = Math.max(2, point.perspective * (7 + speedEnergy * 3));
    const blink = Math.sin(state.elapsedMs / 180 + depth) * 0.16;
    [-1, 1].forEach(side => {
      const x = point.x + side * point.roadWidth * 1.19;
      context.save();
      context.translate(x, point.y - size * 0.8);
      context.globalAlpha = 0.72 + blink;
      context.fillStyle = side < 0 ? "#fff1a3" : "#a7eff3";
      context.beginPath();
      context.moveTo(0, -size * 1.8);
      context.lineTo(size * 0.72, -size * 0.34);
      context.lineTo(size * 0.28, size * 1.06);
      context.lineTo(-size * 0.28, size * 1.06);
      context.lineTo(-size * 0.72, -size * 0.34);
      context.closePath();
      context.fill();
      context.fillStyle = "#f0ba56";
      context.fillRect(-size * 0.17, size * 0.76, size * 0.34, size * 1.35);
      context.restore();
    });
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
  const size = 66 * position.scale;
  const color = correct ? "#48c790" : "#ef715f";
  context.save();
  context.translate(position.x, position.y - size * 1.38);
  context.shadowColor = color;
  context.shadowBlur = size * 0.46;
  context.globalAlpha = 0.36;
  context.fillStyle = color;
  context.beginPath();
  context.roundRect(-size * 0.94, -size * 1.08, size * 1.88, size * 1.82, size * 0.28);
  context.fill();
  context.globalAlpha = 1;
  context.shadowBlur = 0;
  context.fillStyle = correct ? "#248d66" : "#c45045";
  context.strokeStyle = "#fffbe0";
  context.lineWidth = Math.max(2, size * 0.095);
  context.beginPath();
  context.roundRect(-size * 0.78, -size, size * 1.56, size * 1.55, size * 0.22);
  context.fill();
  context.stroke();
  context.fillStyle = "rgba(255,255,255,.24)";
  context.fillRect(-size * 0.59, -size * 0.78, size * 1.18, size * 0.16);
  context.fillStyle = "#fff";
  context.font = `900 ${Math.max(12, size * 0.62)}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label, 0, -size * 0.23);
  context.font = `900 ${Math.max(7, size * 0.2)}px Arial`;
  context.fillText(correct ? "STAR LINE" : "NOT THIS", 0, size * 0.26);
  if (correct) {
    context.fillStyle = "#fff6a8";
    context.font = `900 ${Math.max(9, size * 0.28)}px Arial`;
    context.fillText("★", 0, -size * 1.22);
  }
  context.restore();
}

function drawStarbox(context, state, width, height, box) {
  const position = project(state, width, height, box.position, box.lane);
  if (!position || position.scale < 0.26) return;
  const size = Math.max(7, 36 * position.scale);
  const spin = state.elapsedMs / 430 + box.position * 0.01;
  context.save();
  context.translate(position.x, position.y - size * 0.82);
  context.globalAlpha = 0.24;
  context.fillStyle = "#3c5678";
  context.beginPath();
  context.ellipse(0, size * 0.96, size * 0.88, size * 0.22, 0, 0, Math.PI * 2);
  context.fill();
  context.globalAlpha = 1;
  context.rotate(Math.sin(spin) * 0.08);
  const face = size > 15 ? context.createLinearGradient(-size, -size, size, size) : null;
  if (face) {
    face.addColorStop(0, "#85e5df");
    face.addColorStop(0.48, "#5f8ddb");
    face.addColorStop(1, "#8a59c6");
  }
  context.shadowColor = "rgba(255,240,138,.72)";
  context.shadowBlur = size > 15 ? size * 0.5 : 0;
  context.fillStyle = face ?? "#5f8ddb";
  context.strokeStyle = "#fff8bc";
  context.lineWidth = Math.max(1.4, size * 0.09);
  context.beginPath();
  context.roundRect(-size, -size, size * 2, size * 1.9, size * 0.34);
  context.fill();
  context.stroke();
  context.shadowBlur = 0;
  context.fillStyle = "rgba(255,255,255,.25)";
  context.beginPath();
  context.moveTo(-size * 0.65, -size * 0.66);
  context.lineTo(size * 0.58, -size * 0.66);
  context.lineTo(size * 0.16, -size * 0.2);
  context.lineTo(-size * 0.88, -size * 0.2);
  context.closePath();
  context.fill();
  context.fillStyle = "#fff7bd";
  context.font = `900 ${Math.max(8, size * 0.94)}px Arial`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("★", 0, size * 0.12);
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
  GRAND_PRIX_ITEM_BOXES.forEach(box => {
    if (state.itemBoxes?.[box.id] !== state.lap) drawStarbox(context, state, width, height, box);
  });
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

function drawStarburst(context, state, width, height, kartX, playerY) {
  if (!state.starburst) return;
  const target = state.racers.find(racer => racer.number === state.starburst.targetNumber);
  const playerDistance = (state.lap - 1) * GRAND_PRIX_TRACK_LENGTH + state.progress;
  const targetPosition = target ? project(state, width, height, state.progress + (target.distance - playerDistance), target.lane) : null;
  if (!targetPosition) return;
  const progress = Math.min(1, state.starburst.elapsedMs / state.starburst.durationMs);
  const startX = kartX;
  const startY = playerY - 30;
  const endX = targetPosition.x;
  const endY = targetPosition.y - 16 * targetPosition.scale;
  const arcX = startX + (endX - startX) * progress;
  const arcY = startY + (endY - startY) * progress - Math.sin(progress * Math.PI) * height * 0.13;
  context.save();
  context.strokeStyle = "rgba(255,246,172,.7)";
  context.lineWidth = 2.5;
  context.beginPath();
  context.moveTo(startX, startY);
  context.quadraticCurveTo((startX + endX) * 0.5, Math.min(startY, endY) - height * 0.16, arcX, arcY);
  context.stroke();
  const angle = Math.atan2(endY - startY, endX - startX);
  context.shadowColor = "#ffe77f";
  context.shadowBlur = 18;
  context.fillStyle = "rgba(255,231,118,.78)";
  context.beginPath();
  context.moveTo(arcX - Math.cos(angle) * 23, arcY - Math.sin(angle) * 23);
  context.lineTo(arcX + Math.sin(angle) * 8, arcY - Math.cos(angle) * 8);
  context.lineTo(arcX - Math.sin(angle) * 8, arcY + Math.cos(angle) * 8);
  context.closePath();
  context.fill();
  context.fillStyle = "#fff8bf";
  context.beginPath();
  context.arc(arcX, arcY, 13, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#7b5ac6";
  context.font = "900 19px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText("★", arcX, arcY + 1);
  context.restore();
}

function drawDriveEffects(context, state, width, height, kartX, playerY) {
  const speedRatio = Math.min(1, state.drive.speed / 148);
  if (speedRatio > 0.47) {
    context.save();
    const rush = Math.round(4 + speedRatio * 10 + (state.drive.slingshotMs > 0 ? 4 : 0));
    context.globalAlpha = 0.1 + speedRatio * 0.14;
    context.strokeStyle = state.drive.slingshotMs > 0 ? "#bdefff" : "#fff7cb";
    context.lineWidth = 1 + speedRatio * 1.3;
    for (let index = 0; index < rush; index += 1) {
      const x = (index * 137 + state.elapsedMs * (0.24 + speedRatio * 0.5)) % (width + 120) - 60;
      const startY = height * (0.33 + (index % 7) * 0.07);
      context.beginPath();
      context.moveTo(x, startY);
      context.lineTo(x - 10 - speedRatio * 44, startY + 13 + (index % 4) * 8);
      context.stroke();
    }
    context.restore();
  }
  const baseY = playerY;
  if (state.drive.boostMs > 0 || state.drive.skillMs > 0 || state.drive.startSparkMs > 0) {
    const launchSpark = state.drive.startSparkMs > 0 && state.drive.skillMs === 0;
    const streakCount = state.drive.skillMs > 0 ? 15 : launchSpark ? 7 : 11;
    context.save();
    context.globalAlpha = launchSpark ? 0.44 : 0.7;
    context.strokeStyle = launchSpark ? "#ffe48d" : "#fff3a5";
    context.lineWidth = (launchSpark ? 1.5 : 2) + speedRatio * 2;
    for (let index = 0; index < streakCount; index += 1) {
      const offset = ((index * 73 + state.elapsedMs * 0.68) % (width + 120)) - 60;
      const length = (launchSpark ? 18 : 28) + ((index * 17) % (launchSpark ? 24 : 38));
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
    for (let index = 0; index < 10; index += 1) {
      const side = index % 2 ? -1 : 1;
      const trail = 17 + (index * 11 % 78);
      const wobble = Math.sin(state.elapsedMs / 60 + index) * 7;
      context.beginPath();
        context.arc(kartX + side * (28 + index % 3 * 7) - state.drive.yaw * trail * 0.38, baseY + 27 + trail * 0.28 + wobble, 2 + (index % 3), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }
  if (state.drive.offroad) {
    context.save();
    context.fillStyle = "rgba(126,87,43,.6)";
    for (let index = 0; index < 10; index += 1) {
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

function drawFinishCelebration(context, state, width, height) {
  if (state.phase !== "finale") return;
  const palette = ["#ffe16d", "#ff8f7a", "#7cdbcf", "#a990f0", "#ffffff"];
  context.save();
  for (let index = 0; index < 54; index += 1) {
    const x = (index * 137 + state.elapsedMs * (0.08 + index % 4 * 0.015)) % (width + 46) - 23;
    const y = (index * 71 + state.elapsedMs * (0.042 + index % 3 * 0.01)) % (height * 0.74);
    const size = 3 + index % 5;
    context.save();
    context.translate(x, y + height * 0.08);
    context.rotate((index + state.elapsedMs / 230) * 0.8);
    context.fillStyle = palette[index % palette.length];
    context.fillRect(-size * 0.5, -size * 1.2, size, size * 2.4);
    context.restore();
  }
  const glow = context.createRadialGradient(width * 0.5, height * 0.76, 8, width * 0.5, height * 0.76, Math.min(width, height) * 0.24);
  glow.addColorStop(0, "rgba(255,248,170,.46)");
  glow.addColorStop(0.45, "rgba(255,231,110,.18)");
  glow.addColorStop(1, "rgba(255,231,110,0)");
  context.fillStyle = glow;
  context.fillRect(0, height * 0.48, width, height * 0.52);
  context.restore();
}

function drawWorld(canvas, state) {
  const { context, width, height } = resizeCanvas(canvas);
  const impact = Math.max(state.drive.contactMs, state.drive.spinMs);
  context.save();
  if ((state.drive.drifting || state.drive.cornerLoad > 0.12) && state.drive.speed > 42) {
    const currentCurve = grandPrixRoadCurve(state.progress);
    const cornerCurve = grandPrixRoadCurve(state.progress + 245);
    const curveLean = Math.sign(cornerCurve - currentCurve) * Math.min(0.016, Math.abs(cornerCurve - currentCurve) * 0.019);
    const driftLean = state.drive.yaw * Math.min(0.03, state.drive.driftCharge / 35500 + state.drive.cornerLoad * 0.012);
    const roll = -(driftLean + curveLean);
    context.translate(width * 0.5 - state.drive.yaw * width * 0.014, height * 0.75);
    context.rotate(roll);
    context.translate(-width * 0.5, -height * 0.75);
  }
  if (impact > 0) {
    const shake = Math.sin(state.elapsedMs / 24) * Math.min(7, impact / 65);
    context.translate(shake, -Math.abs(shake) * 0.28);
  }
  drawBackground(context, state, width, height);
  drawRoad(context, state, width, height);
  drawApexChevrons(context, state, width, height);
  drawRoadsideDepth(context, state, width, height);
  drawFinishRibbon(context, state, width, height);
  drawTrackObjects(context, state, width, height);
  drawFinishCelebration(context, state, width, height);
  const playerDistance = (state.lap - 1) * GRAND_PRIX_TRACK_LENGTH + state.progress;
  state.racers.forEach(racer => {
    let gap = racer.distance - playerDistance;
    if (gap < -15) gap += GRAND_PRIX_TRACK_LENGTH;
    const position = project(state, width, height, state.progress + gap, racer.lane);
    if (!position) return;
    const packLift = height * 0.13 * Math.pow(Math.max(0, 1 - gap / 190), 1.25);
    position.y -= packLift;
    position.scale *= 1.05 + Math.max(0, 1 - gap / 170) * 0.28;
    if (racer.distance > playerDistance && racer.distance - playerDistance < 58) {
      context.save();
      context.globalAlpha = 0.12;
      context.fillStyle = "#1d2c41";
      context.beginPath();
      context.ellipse(position.x, position.y + position.scale * 19, position.scale * 31, position.scale * 7, 0, 0, Math.PI * 2);
      context.fill();
      context.restore();
    }
    drawKart(context, position.x, position.y, position.scale * 1.18, racer.number, racer.hitMs > 0 ? Math.sin(state.elapsedMs / 44) * 1.7 : 0, { hit: racer.hitMs > 0 });
  });
  const playerPoint = horizonPoint(state, width, height, 10);
  const visualLateral = Math.max(-1.04, Math.min(1.04, state.drive.lateral));
  const kartX = playerPoint.x + visualLateral * playerPoint.roadWidth * 0.4;
  const portrait = height > width * 1.1;
  const playerY = height * (portrait ? 0.74 : 0.835);
  const playerScale = portrait ? 1.42 : 1.68;
  if (state.drive.boostMs > 0 || state.drive.skillMs > 0 || state.drive.startSparkMs > 0) {
    const launchSpark = state.drive.startSparkMs > 0 && state.drive.skillMs === 0;
    const rushCount = state.drive.skillMs > 0 ? 17 : launchSpark ? 6 : 11;
    context.strokeStyle = launchSpark ? "rgba(255,234,132,.38)" : "rgba(255,244,166,.54)";
    context.lineWidth = launchSpark ? 1.4 : 2;
    for (let index = 0; index < rushCount; index += 1) {
      const x = (index * 89 + state.elapsedMs * 0.38) % width;
      context.beginPath();
      context.moveTo(x, height * 0.4);
      context.lineTo(x - 22, height * 0.72);
      context.stroke();
    }
  }
  if (state.drive.skillMs > 0) {
    context.save();
    context.globalAlpha = 0.2 + 0.12 * Math.sin(state.elapsedMs / 36);
    context.fillStyle = "#fff4a4";
    context.fillRect(0, 0, width, height);
    context.restore();
  }
  if (state.drive.draftActive) {
    context.save();
    context.strokeStyle = "rgba(160,232,255,.56)";
    context.lineWidth = 2.4;
    context.setLineDash([7, 9]);
    context.lineDashOffset = -state.elapsedMs / 30;
    context.beginPath();
    context.moveTo(kartX - 21, playerY + 22);
    context.quadraticCurveTo(kartX, playerY - 60, kartX + state.drive.yaw * 22, playerY - 138);
    context.stroke();
    context.restore();
    context.fillStyle = "#d7f8ff";
    context.font = "900 13px Arial";
    context.textAlign = "center";
    context.fillText(`DRAFT #${state.drive.draftTargetNumber}`, kartX, playerY - 72);
  }
  if (state.drive.slingshotMs > 0) {
    context.save();
    context.fillStyle = "rgba(133,229,244,.2)";
    context.beginPath();
    context.ellipse(kartX, playerY + 12, 92, 44, 0, 0, Math.PI * 2);
    context.fill();
    context.restore();
  }
  drawDriveEffects(context, state, width, height, kartX, playerY);
  drawStarburst(context, state, width, height, kartX, playerY);
  drawKart(context, kartX, playerY, playerScale * (state.phase === "finale" ? 1.12 : 1), 4, state.drive.yaw * 1.34 + (state.drive.spinMs ? Math.sin(state.elapsedMs / 50) * 2.2 : 0), { boost: state.drive.boostMs > 0 || state.drive.skillMs > 0 || state.drive.slingshotMs > 0 || state.phase === "finale", drift: state.drive.drifting ? state.drive.driftCharge : 0 });
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
  brand.append(element(document, "small", "gp-arcade-kicker", "NO.4 DRIVER"), element(document, "strong", "gp-arcade-title", "STAR CANYON"));
  const chips = element(document, "div", "gp-arcade-chips");
  const race = element(document, "div", "gp-race-chip");
  race.append(element(document, "span", "gp-rank", "5th"), element(document, "span", "gp-lap", "LAP 1/3"));
  const speed = element(document, "span", "gp-speed", "0 km/h");
  const sum = element(document, "span", "gp-sum", "4 → 10");
  const drift = element(document, "div", "gp-drift-meter");
  const driftFill = element(document, "i", "gp-drift-fill");
  const driftLabel = element(document, "span", "gp-drift-label", "DRIFT");
  drift.append(driftFill, driftLabel);
  const item = element(document, "button", "gp-item-button");
  item.type = "button";
  item.dataset.gpItem = "true";
  item.disabled = true;
  const itemCore = element(document, "i", "gp-item-core", "✦");
  const itemText = element(document, "span", "gp-item-text", "ITEM");
  item.append(itemCore, itemText);
  const skill = element(document, "button", "gp-skill-button");
  skill.type = "button";
  skill.dataset.gpSkill = "true";
  skill.disabled = true;
  const skillCore = element(document, "i", "gp-skill-core", "★");
  const skillText = element(document, "span", "gp-skill-text", "DASH 0%");
  skill.append(skillCore, skillText);
  const route = element(document, "div", "gp-route-mini");
  const routeProgress = element(document, "i", "gp-route-progress");
  const routeLabel = element(document, "span", "gp-route-label", "STAR ROUTE");
  route.append(routeProgress, routeLabel);
  chips.append(race, speed, sum, drift, item, skill, route);
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
  drift.dataset.gpHold = "drift";
  const skill = element(document, "button", "gp-arcade-key gp-arcade-skill", "★ DASH");
  skill.type = "button";
  skill.dataset.gpSkill = "true";
  controls.append(left, go, right, brake, drift, skill);
  const guide = element(document, "div", "gp-desktop-guide", "W DRIVE  ·  SHIFT DRIFT  ·  E STARBURST  ·  SPACE DASH");
  const startSpark = element(document, "div", "gp-start-spark", "START SPARK!");
  startSpark.hidden = true;
  const overtake = element(document, "div", "gp-overtake-callout");
  overtake.hidden = true;
  const rankCallout = element(document, "div", "gp-rank-callout");
  rankCallout.hidden = true;
  const pressure = element(document, "div", "gp-pressure-alert");
  pressure.hidden = true;
  const finish = element(document, "div", "gp-arcade-finish");
  const finishPlace = element(document, "strong", "gp-finish-place");
  const finishRoute = element(document, "span", "gp-finish-route");
  const finishCopy = element(document, "small", "gp-finish-copy");
  finish.append(finishPlace, finishRoute, finishCopy);
  finish.hidden = true;
  root.append(canvas, buildHud(document), countdown, prompt, controls, guide, startSpark, overtake, rankCallout, pressure, finish);
  return root;
}

export function updateGrandPrixScene(root, state) {
  const snapshot = grandPrixSnapshot(state);
  root.dataset.phase = state.phase;
  root.dataset.offroad = String(snapshot.offroad);
  root.dataset.drifting = String(snapshot.drifting);
  root.dataset.boost = String(state.drive.boostMs > 0);
  root.dataset.skill = String(snapshot.skillActive);
  root.dataset.startSpark = String(snapshot.startSparkActive);
  root.dataset.overtake = String(snapshot.overtakeActive);
  root.dataset.rankChange = String(snapshot.rankChangeActive);
  root.dataset.pressure = String(snapshot.pressureActive);
  root.dataset.driftTier = snapshot.driftTier;
  root.dataset.impact = String(state.drive.contactMs > 0 || state.drive.spinMs > 0);
  root.dataset.item = String(Boolean(snapshot.heldItem));
  root.dataset.starburst = String(snapshot.starburstActive);
  root.querySelector(".gp-lap").textContent = `LAP ${Math.min(state.lap, state.totalLaps)}/${state.totalLaps}`;
  root.querySelector(".gp-speed").textContent = `${snapshot.speed} km/h`;
  root.querySelector(".gp-rank").textContent = `${snapshot.rank}${rankSuffix(snapshot.rank)}`;
  root.querySelector(".gp-sum").textContent = `${snapshot.number} → ${snapshot.target}`;
  root.querySelector(".gp-drift-fill").style.width = `${Math.min(100, Math.round(snapshot.driftCharge / 10.5))}%`;
  root.querySelector(".gp-drift-label").textContent = snapshot.drifting ? snapshot.driftTier === "none" ? "DRIFT" : snapshot.driftTier.toUpperCase() : "DRIFT";
  const item = root.querySelector(".gp-item-button");
  item.disabled = !snapshot.heldItem;
  item.dataset.loaded = String(Boolean(snapshot.heldItem));
  item.dataset.pulse = String(snapshot.itemPulseActive);
  item.dataset.active = String(snapshot.starburstActive);
  item.querySelector(".gp-item-text").textContent = snapshot.starburstActive ? `LOCK #${snapshot.starburstTarget}` : snapshot.heldItem ? "STARBURST" : "ITEM";
  const skill = root.querySelector(".gp-skill-button");
  skill.disabled = !snapshot.skillReady;
  skill.dataset.ready = String(snapshot.skillReady);
  skill.dataset.active = String(snapshot.skillActive);
  skill.style.setProperty("--gp-charge", `${snapshot.skillCharge}%`);
  root.querySelector(".gp-skill-core").dataset.ready = String(snapshot.skillReady);
  root.querySelector(".gp-skill-core").dataset.active = String(snapshot.skillActive);
  root.querySelector(".gp-skill-text").textContent = snapshot.skillActive ? "DASHING" : snapshot.skillReady ? "SPACE" : `DASH ${snapshot.skillCharge}%`;
  const routeProgress = ((state.lap - 1) * GRAND_PRIX_TRACK_LENGTH + state.progress) / (GRAND_PRIX_TRACK_LENGTH * state.totalLaps);
  root.querySelector(".gp-route-progress").style.width = `${Math.min(100, Math.round(routeProgress * 100))}%`;
  const countdown = root.querySelector(".gp-arcade-countdown");
  const count = Math.ceil(state.countdownMs / 800);
  countdown.hidden = count <= 0 || state.phase !== "racing";
  countdown.textContent = count > 0 ? (state.countdownMs <= 540 ? "★" : String(count)) : "";
  const prompt = root.querySelector(".gp-arcade-prompt");
  prompt.textContent = state.countdownMs > 0 ? "PRESS GO ON ★" : "HOLD GO TO DRIVE";
  prompt.hidden = state.phase !== "racing" || (state.countdownMs <= 0 && state.drive.throttle);
  const startSpark = root.querySelector(".gp-start-spark");
  startSpark.hidden = !snapshot.startSparkActive;
  const overtake = root.querySelector(".gp-overtake-callout");
  overtake.hidden = !snapshot.overtakeActive;
  overtake.textContent = snapshot.overtakeActive ? `PASS! #${snapshot.overtakeNumber}` : "";
  const rankCallout = root.querySelector(".gp-rank-callout");
  rankCallout.hidden = !snapshot.rankChangeActive || snapshot.overtakeActive;
  rankCallout.textContent = snapshot.rankChangeActive ? `${snapshot.rankChange > 0 ? "UP!" : "CHASE!"} ${snapshot.rank}${rankSuffix(snapshot.rank)}` : "";
  const pressure = root.querySelector(".gp-pressure-alert");
  pressure.hidden = !snapshot.pressureActive || state.phase !== "racing";
  pressure.textContent = snapshot.pressureActive ? `#${snapshot.pressureNumber} CLOSE BEHIND` : "";
  const go = root.querySelector(".gp-arcade-go");
  go.dataset.active = String(state.drive.throttle);
  const finish = root.querySelector(".gp-arcade-finish");
  finish.hidden = state.phase !== "finale";
  if (state.phase === "finale") {
    const result = snapshot.finishResult ?? { rank: snapshot.rank, number: snapshot.number, target: snapshot.target, laps: snapshot.totalLaps };
    root.querySelector(".gp-finish-place").textContent = `${result.rank}${rankSuffix(result.rank)} PLACE!`;
    root.querySelector(".gp-finish-route").textContent = `STAR ROUTE ${result.number} → ${result.target}`;
    root.querySelector(".gp-finish-copy").textContent = `${result.laps} LAPS COMPLETE · STAR CASTLE REACHED`;
  }
  root.querySelector(".gp-arcade-controls").hidden = state.phase === "finale";
  drawWorld(root.querySelector(".gp-arcade-canvas"), state);
}
