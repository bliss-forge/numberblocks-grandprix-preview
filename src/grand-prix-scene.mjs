const KART_COLORS = { 1: "#ef7684", 2: "#f29a4d", 3: "#65b86f", 4: "#8156cf", 5: "#56accd" };
const GATES_BY_CHECKPOINT = [["plus-2", "plus-4"], ["plus-1"], ["plus-3"]];

function ordinal(value) {
  const mod = value % 100;
  if (mod >= 11 && mod <= 13) return `${value}th`;
  return `${value}${({ 1: "st", 2: "nd", 3: "rd" })[value % 10] || "th"}`;
}

function node(document, tag, className, text = "") {
  const element = document.createElement(tag);
  element.className = className;
  if (text) element.textContent = text;
  return element;
}

function kart(document, racer, player = false) {
  const item = node(document, "div", `gp-kart${player ? " gp-player" : " gp-rival"}`);
  item.dataset.number = String(racer.number);
  item.style.setProperty("--kart", KART_COLORS[racer.number] || "#8156cf");
  const body = node(document, "span", "gp-kart-body");
  const image = document.createElement("img");
  image.src = `assets/characters/${racer.number}.png`;
  image.alt = `${racer.number}`;
  body.append(image, node(document, "b", "gp-kart-number", String(racer.number)));
  item.append(body, node(document, "i", "gp-wheel gp-wheel-left"), node(document, "i", "gp-wheel gp-wheel-right"));
  return item;
}

function gate(document, id, text, lane) {
  const button = node(document, "button", "gp-gate", text);
  button.type = "button";
  button.dataset.gpGate = id;
  button.dataset.lane = String(lane);
  button.setAttribute("aria-label", `Number boost ${text}`);
  return button;
}

function fuel(document) {
  const host = node(document, "div", "gp-fuel");
  host.append(node(document, "span", "gp-fuel-label", "STAR FUEL"));
  for (let index = 0; index < 3; index += 1) host.append(node(document, "i", "gp-fuel-cell"));
  return host;
}

function routeMap(document) {
  const route = node(document, "div", "gp-route-map");
  route.append(node(document, "span", "gp-route-label", "STAR RUN"));
  const line = node(document, "div", "gp-route-line");
  line.append(node(document, "i", "gp-route-fill"));
  route.append(line);
  ["4", "6", "7", "10"].forEach((value, index) => {
    const marker = node(document, "b", "gp-route-marker", value);
    marker.dataset.step = String(index);
    route.append(marker);
  });
  return route;
}

function starCastle(document) {
  const castle = node(document, "div", "gp-star-castle");
  castle.append(node(document, "i", "gp-castle-star", "*"), node(document, "b", "gp-castle-number", "10"));
  return castle;
}

function raceHud(document) {
  const hud = node(document, "header", "gp-race-hud");
  const brand = node(document, "div", "gp-brand");
  brand.append(node(document, "span", "gp-brand-kicker", "NUMBERBLOCKS"), node(document, "strong", "gp-brand-title", "GRAND PRIX"));
  const status = node(document, "div", "gp-race-status");
  status.append(node(document, "div", "gp-lap", "LAP 1 / 1"), node(document, "div", "gp-speed", "SPEED 0"), node(document, "div", "gp-rank", "1st / 5"));
  hud.append(fuel(document), brand, status, routeMap(document));
  return hud;
}

function road(document) {
  const host = node(document, "div", "gp-road");
  const marks = node(document, "div", "gp-road-marks");
  for (let index = 0; index < 8; index += 1) marks.append(node(document, "i", "gp-road-mark"));
  host.append(node(document, "i", "gp-road-edge gp-edge-left"), node(document, "i", "gp-road-edge gp-edge-right"), marks);
  return host;
}

export function renderGrandPrixScene(document, state) {
  const root = node(document, "section", "gp-game gp-camera-race");
  root.tabIndex = -1;
  root.append(raceHud(document));
  const world = node(document, "div", "gp-world");
  world.append(node(document, "div", "gp-sky"), node(document, "div", "gp-clouds"), node(document, "div", "gp-mountains"), node(document, "div", "gp-meadow"));
  const roadLayer = node(document, "div", "gp-road-layer");
  roadLayer.append(road(document));
  const gateDeck = node(document, "div", "gp-gate-deck");
  gateDeck.append(gate(document, "plus-2", "+2", -1), gate(document, "plus-4", "+4", 1), gate(document, "plus-1", "+1", 0), gate(document, "plus-3", "+3", 0));
  const correction = node(document, "button", "gp-correction", "TAKE +");
  correction.type = "button";
  correction.dataset.gpCorrection = "true";
  gateDeck.append(correction);
  const jump = node(document, "button", "gp-jump", "JUMP");
  jump.type = "button";
  jump.dataset.gpJump = "true";
  roadLayer.append(gateDeck, jump);
  world.append(roadLayer, starCastle(document));
  const racers = node(document, "div", "gp-racers");
  racers.append(kart(document, { number: 4 }, true));
  state.racers.forEach(racer => racers.append(kart(document, racer)));
  world.append(racers, node(document, "div", "gp-boost-trail"));
  const countdown = node(document, "div", "gp-countdown");
  countdown.hidden = true;
  world.append(countdown);
  root.append(world);
  const controls = node(document, "footer", "gp-controls");
  const left = node(document, "button", "gp-key", "<");
  left.type = "button";
  left.dataset.gpDir = "left";
  const jumpKey = node(document, "button", "gp-key gp-jump-key", "SPACE");
  jumpKey.type = "button";
  jumpKey.dataset.gpJump = "true";
  const right = node(document, "button", "gp-key", ">");
  right.type = "button";
  right.dataset.gpDir = "right";
  controls.append(left, jumpKey, right, node(document, "span", "gp-tip", "STEER / BOOST"));
  const finish = node(document, "div", "gp-finish", "STAR CASTLE REACHED!");
  finish.hidden = true;
  root.append(controls, finish);
  updateGrandPrixScene(root, state);
  return root;
}

export function updateGrandPrixScene(root, state) {
  const progress = Math.min(1, state.distance / 180);
  const rank = 1 + state.racers.filter(racer => racer.progress > state.distance).length;
  root.style.setProperty("--progress", String(progress));
  root.dataset.phase = state.phase;
  root.dataset.zone = state.zone;
  root.dataset.boost = String(state.drive.boostMs > 0);
  root.querySelector(".gp-rank").textContent = `${ordinal(rank)} / 5`;
  root.querySelector(".gp-speed").textContent = `SPEED ${Math.round(state.drive.speed)}`;
  root.querySelector(".gp-route-fill").style.width = `${Math.max(3, progress * 100)}%`;
  root.querySelectorAll(".gp-route-marker").forEach((marker, index) => { marker.dataset.active = String(index <= state.checkpoint); });
  root.querySelectorAll(".gp-fuel-cell").forEach((cell, index) => { cell.dataset.on = String(index < state.fuel); });
  root.querySelector(".gp-road-marks").style.backgroundPosition = `0 ${Math.round(state.distance * 3)}px`;
  const player = root.querySelector(".gp-player");
  player.style.transform = `translateX(calc(-50% + ${state.drive.lane * 112}px)) translateY(${state.drive.airborneMs > 0 ? "-38px" : "0"}) rotate(${state.drive.heading * 5}deg)`;
  const rivals = [...root.querySelectorAll(".gp-rival")];
  rivals.forEach((kartNode, index) => {
    const racer = state.racers[index];
    const delta = Math.max(-40, Math.min(46, racer.progress - state.distance));
    const scale = 0.48 + (delta + 40) / 145;
    kartNode.style.transform = `translate(calc(-50% + ${racer.lane * 96}px), ${-delta * 4.6}px) scale(${scale})`;
  });
  const visibleGates = GATES_BY_CHECKPOINT[state.checkpoint] || [];
  root.querySelectorAll(".gp-gate").forEach(gateNode => { gateNode.hidden = state.correction > 0 || !visibleGates.includes(gateNode.dataset.gpGate); });
  const correction = root.querySelector(".gp-correction");
  correction.hidden = state.correction <= 0;
  correction.textContent = `TAKE +${state.correction}`;
  const countdown = root.querySelector(".gp-countdown");
  const count = Math.ceil((state.countdownMs || 0) / 600);
  countdown.hidden = count <= 0 || state.phase === "finale";
  countdown.textContent = count > 0 ? String(count) : "";
  root.querySelector(".gp-finish").hidden = state.phase !== "finale";
  root.querySelector(".gp-controls").hidden = state.phase === "finale";
}
