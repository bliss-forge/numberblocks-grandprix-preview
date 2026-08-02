// 칙칙폭폭 기관사 — 씬 렌더러. 시뮬 상태의 읽기 전용 프로젝션.
//
// 두 뷰(운전실/바깥)를 동시에 마운트해 두고 data-view로만 바꾼다(파괴·재생성
// 금지). 움직임은 모델이 위치를 주고 CSS transition이 틱 사이를 보간한다:
//   침목  = stroke-dashoffset 누적값 (무한 반복 무이음새)
//   배경  = 2배 폭 스트립 translateX, 한 바퀴 감길 때만 transition을 끊고 점프
// 속도계·게이지·창문 승객은 매 틱 속성 갱신만 한다.

import {
  KTX_SEGMENTS,
  KTX_STATIONS,
  KTX_TRAINS,
  MARKER_FROM_ZONE,
  SPEED_MILESTONES
} from "./ktx-route-data.mjs";
import {
  activeEvent,
  currentBand,
  distanceGauge,
  distanceToMarker
} from "./ktx-journey.mjs";
import {
  ALL_LANDS,
  ALL_SKIES,
  cabDashSvg,
  cabTrackSvg,
  eventSpriteSvg,
  landLayerSvg,
  sideTrainSvg,
  skyLayerSvg,
  trainCardSvg
} from "./ktx-scene-art.mjs";
import { characterAsset } from "./character-spec.mjs";

const WINDOW_SLOTS = 8;
const NEAR_SCALE = 3;          // 1 game m = 3 px (가까운 층)
const FAR_RATIO = 0.18;        // 원경 시차
const LAND_LOOP = 1000;        // 배경 스트립 반복 폭
const TRAIN_NOSE_X = 200;      // 3인칭 열차 코 위치(px)

function el(document, tag, className, text = null) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== null) node.textContent = text;
  return node;
}

function passengerImg(document, number, className) {
  const image = document.createElement("img");
  image.className = className;
  image.src = `assets/characters/${characterAsset(number)}`;
  image.alt = `숫자 ${number} 블록 친구`;
  return image;
}

// ── 시작 화면: 열차 고르기 ────────────────────────────────────────────────

export function renderKtxPicker(document, selectedIndex = 0) {
  const root = el(document, "div", "ktx-picker");
  root.append(el(document, "h2", "ktx-picker-title", "어떤 기차를 몰까요?"));
  root.append(el(document, "p", "ktx-picker-note", "← → 로 고르고 ⎵ 로 출발!"));
  const row = el(document, "div", "ktx-picker-row");
  KTX_TRAINS.forEach((train, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "ktx-train-card";
    card.dataset.trainId = train.id;
    card.dataset.selected = String(index === selectedIndex);
    card.setAttribute("aria-label", `${train.label} 몰기`);
    const face = el(document, "span", "ktx-train-face");
    face.innerHTML = trainCardSvg(train);
    face.setAttribute("aria-hidden", "true");
    card.append(face, el(document, "strong", "ktx-train-name", train.label));
    row.append(card);
  });
  root.append(row);
  return root;
}

export function movePickerSelection(root, selectedIndex) {
  const cards = root.querySelectorAll(".ktx-train-card");
  cards.forEach((card, index) => {
    card.dataset.selected = String(index === selectedIndex);
  });
}

// ── 본 씬 ──────────────────────────────────────────────────────────────────

function buildEnvLayers(document, host, builder, names, kind) {
  for (const name of names) {
    const layer = el(document, "div", `ktx-env ktx-env-${kind}`);
    layer.dataset[kind] = name;
    layer.innerHTML = builder(name);
    host.append(layer);
  }
}

function buildCabView(document, state) {
  const view = el(document, "div", "ktx-view ktx-view-cab");

  const backdrop = el(document, "div", "ktx-cab-backdrop");
  buildEnvLayers(document, backdrop, skyLayerSvg, ALL_SKIES, "sky");
  const horizon = el(document, "div", "ktx-cab-horizon");
  buildEnvLayers(document, horizon, landLayerSvg, ALL_LANDS, "land");
  backdrop.append(horizon);
  view.append(backdrop);

  const track = el(document, "div", "ktx-cab-track");
  track.innerHTML = cabTrackSvg();
  view.append(track);

  // 터널 실내등 — 1인칭 전용 재미
  const tunnel = el(document, "div", "ktx-cab-tunnel");
  tunnel.append(el(document, "span", "ktx-cab-lamp"));
  view.append(tunnel);

  // 속도 풍선 — 다음 마일스톤이 가까우면 떠오른다
  const balloon = el(document, "div", "ktx-speed-balloon");
  balloon.append(el(document, "strong", "ktx-balloon-number", ""));
  view.append(balloon);

  const dash = el(document, "div", "ktx-cab-dash");
  dash.innerHTML = cabDashSvg(state.train);
  const speed = el(document, "div", "ktx-speedo");
  speed.append(el(document, "strong", "ktx-speed-number", "0"));
  speed.append(el(document, "span", "ktx-speed-unit", "km/h"));
  dash.append(speed);
  const gauge = el(document, "div", "ktx-stop-gauge");
  for (let cell = 0; cell < 5; cell += 1) {
    gauge.append(el(document, "span", "ktx-gauge-cell"));
  }
  const palm = el(document, "span", "ktx-palm", "✋");
  gauge.append(palm);
  dash.append(gauge);
  const lamp = el(document, "span", "ktx-door-lamp");
  dash.append(lamp);
  view.append(dash);
  return view;
}

function buildSideView(document, state) {
  const view = el(document, "div", "ktx-view ktx-view-side");

  const backdrop = el(document, "div", "ktx-side-backdrop");
  buildEnvLayers(document, backdrop, skyLayerSvg, ALL_SKIES, "sky");
  view.append(backdrop);

  const far = el(document, "div", "ktx-side-far");
  buildEnvLayers(document, far, landLayerSvg, ALL_LANDS, "land");
  view.append(far);

  const ground = el(document, "div", "ktx-side-ground");
  view.append(ground);

  // 승강장 — 존과 함께 오른쪽에서 미끄러져 들어온다
  const platform = el(document, "div", "ktx-platform");
  const sign = el(document, "div", "ktx-platform-sign");
  sign.append(el(document, "strong", "ktx-platform-name", ""));
  platform.append(sign);
  const marker = el(document, "div", "ktx-stop-marker");
  marker.append(el(document, "span", "ktx-marker-star", "★"));
  platform.append(marker);
  view.append(platform);

  // 이벤트 무대
  const events = el(document, "div", "ktx-event-stage");
  view.append(events);

  const train = el(document, "div", "ktx-side-train");
  train.innerHTML = sideTrainSvg(state.train, WINDOW_SLOTS);
  view.append(train);

  // 대기줄은 열차 앞(이쪽)에 선다 — 타는 것이 보여야 세기 놀이다
  const queue = el(document, "div", "ktx-queue");
  view.append(queue);
  return view;
}

export function renderKtxScene(document, state, view = "cab") {
  const root = el(document, "div", "ktx-game");
  root.dataset.view = view;
  root.dataset.train = state.train.id;

  const stage = el(document, "div", "ktx-stage");
  stage.append(buildCabView(document, state), buildSideView(document, state));
  root.append(stage);

  const hud = el(document, "div", "ktx-hud");
  const plan = el(document, "div", "ktx-plan");
  KTX_STATIONS.forEach(station => {
    const chip = el(document, "span", "ktx-plan-stop");
    chip.dataset.station = station;
    chip.append(el(document, "i", "ktx-plan-dot"));
    chip.append(el(document, "span", "ktx-plan-name", station));
    plan.append(chip);
  });
  hud.append(plan);
  const score = el(document, "div", "ktx-score");
  score.append(el(document, "span", "ktx-star-total", "⭐ 0"));
  score.append(el(document, "span", "ktx-boarded-total", "친구 0"));
  hud.append(score);
  const viewKeys = el(document, "div", "ktx-view-keys");
  const cabKey = el(document, "span", "ktx-view-key", "1 운전실");
  cabKey.dataset.viewKey = "cab";
  const sideKey = el(document, "span", "ktx-view-key", "3 바깥");
  sideKey.dataset.viewKey = "side";
  viewKeys.append(cabKey, sideKey);
  hud.append(viewKeys);
  root.append(hud);

  // 탑승 세기 팝 — 방금 탄 친구가 크게 뜬다
  const pop = el(document, "div", "ktx-board-pop");
  pop.append(el(document, "span", "ktx-board-face"));
  pop.append(el(document, "strong", "ktx-board-count", ""));
  root.append(pop);

  // 종착 피날레
  const finale = el(document, "div", "ktx-finale");
  finale.append(el(document, "h2", "ktx-finale-title", ""));
  finale.append(el(document, "div", "ktx-finale-friends"));
  finale.append(el(document, "p", "ktx-finale-words", ""));
  root.append(finale);

  updateKtxScene(root, state, view, []);
  return root;
}

// 배경 스트립 루프 — 감길 때만 transition을 끊고 점프시킨다.
function setLoop(node, px, period) {
  const wrapped = ((px % period) + period) % period;
  const previous = Number(node.dataset.loopPx ?? 0);
  if (wrapped < previous) {
    node.dataset.noTransition = "true";
  } else {
    delete node.dataset.noTransition;
  }
  node.dataset.loopPx = String(wrapped);
  node.style.setProperty("--loop-px", `${-wrapped}px`);
}

function updateWindows(root, state) {
  const shown = state.boarded.slice(-WINDOW_SLOTS);
  const slots = root.querySelectorAll(".ktx-window-slot");
  slots.forEach((slot, index) => {
    const number = shown[index];
    const key = number === undefined ? "" : String(number);
    if (slot.dataset.filled === key) return;
    slot.dataset.filled = key;
    const previous = slot.querySelector("image");
    if (previous) previous.remove();
    if (number !== undefined) {
      const image = slot.ownerDocument.createElementNS
        ? slot.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "image")
        : null;
      if (image) {
        image.setAttribute("href", `assets/characters/${characterAsset(number)}`);
        image.setAttribute("width", "62");
        image.setAttribute("height", "52");
        image.classList.add("ktx-window-face");
        slot.append(image);
      }
    }
  });
}

function updateQueue(document, root, state) {
  const queueHost = root.querySelector(".ktx-queue");
  const key = state.queue.join(",");
  if (queueHost.dataset.queueKey === key) return;
  queueHost.dataset.queueKey = key;
  queueHost.replaceChildren();
  state.queue.forEach((number, index) => {
    const person = passengerImg(document, number, "ktx-queue-person");
    person.style.setProperty("--queue-index", String(index));
    queueHost.append(person);
  });
}

export function updateKtxScene(root, state, view, events = []) {
  const document = root.ownerDocument ?? globalThis.document;
  const band = currentBand(state);
  root.dataset.view = view;
  root.dataset.phase = state.phase;
  root.dataset.sky = band.sky;
  root.dataset.land = band.land;
  root.dataset.doors = state.doors;
  root.dataset.tunnel = String(band.land === "tunnel");
  root.dataset.armed = String(state.armed && state.phase === "driving");
  root.dataset.moving = String(state.phase === "driving" || state.phase === "stopping");

  // 속도계·게이지
  const speedNode = root.querySelector(".ktx-speed-number");
  const speed = Math.round(state.v);
  if (speedNode.textContent !== String(speed)) {
    speedNode.textContent = String(speed);
  }
  const gaugeLevel = state.phase === "driving" && state.zoneEntered
    ? distanceGauge(state)
    : 5;
  root.querySelectorAll(".ktx-gauge-cell").forEach((cell, index) => {
    cell.dataset.on = String(index >= gaugeLevel);
  });

  // 움직임 — 모델 주도 위치, CSS transition이 보간
  const worldPx = (state.segIndex * 100000 + state.x) * NEAR_SCALE;
  const sleepers = root.querySelector(".ktx-sleepers");
  if (sleepers) {
    sleepers.style.setProperty("stroke-dashoffset", String(-worldPx));
  }
  root.querySelectorAll(".ktx-env-land").forEach(layer => {
    setLoop(layer, worldPx * FAR_RATIO, LAND_LOOP);
  });
  const ground = root.querySelector(".ktx-side-ground");
  if (ground) setLoop(ground, worldPx, 240);

  // 승강장 — 존에 들어오면 화면 안으로
  const platform = root.querySelector(".ktx-platform");
  const driving = state.phase === "driving" || state.phase === "stopping" ||
    state.phase === "correcting";
  // 마커가 다가오는 것이 보여야 조준이 된다 — 320m 앞부터 미끄러져 들어온다.
  const distance = driving ? distanceToMarker(state) : 0;
  const nearStop = !driving || distance < 320;
  platform.dataset.visible = String(nearStop);
  const sideView = root.querySelector(".ktx-view-side");
  sideView.dataset.nearStop = String(nearStop);
  if (nearStop) {
    // 열차 코(200px)에 마커가 오면 정지 지점. 승강장 왼끝은 마커 -90m.
    const markerX = TRAIN_NOSE_X + distance * NEAR_SCALE;
    const shift = markerX - MARKER_FROM_ZONE * NEAR_SCALE;
    sideView.style.setProperty("--platform-x", `${shift}px`);
    const name = root.querySelector(".ktx-platform-name");
    const stationName = driving ? KTX_SEGMENTS[state.segIndex].to : state.station;
    if (name.textContent !== stationName) name.textContent = stationName;
  }
  updateQueue(document, root, state);
  updateWindows(root, state);

  // 계획 스트립 — 지나온 역·현재 역
  const arrivedCount = state.stars.length;
  root.querySelectorAll(".ktx-plan-stop").forEach((chip, index) => {
    chip.dataset.done = String(index <= arrivedCount &&
      !(index === arrivedCount && state.phase === "driving"));
    chip.dataset.here = String(
      (state.phase === "driving" || state.phase === "stopping")
        ? index === arrivedCount + 1
        : index === arrivedCount
    );
  });

  // 점수
  const starTotal = state.stars.reduce((sum, count) => sum + count, 0);
  const starNode = root.querySelector(".ktx-star-total");
  if (starNode.textContent !== `⭐ ${starTotal}`) {
    starNode.textContent = `⭐ ${starTotal}`;
  }
  const boardedNode = root.querySelector(".ktx-boarded-total");
  const boardedText = `친구 ${state.boarded.length}`;
  if (boardedNode.textContent !== boardedText) {
    boardedNode.textContent = boardedText;
  }

  // 속도 풍선 — 다음 마일스톤이 20 안이면 떠서 기다린다
  const nextMilestone = SPEED_MILESTONES.find(milestone =>
    !state.milestones.includes(milestone) && milestone > state.v - 1);
  const balloon = root.querySelector(".ktx-speed-balloon");
  const balloonOn = state.phase === "driving" && nextMilestone !== undefined &&
    nextMilestone - state.v <= 20;
  balloon.dataset.on = String(balloonOn);
  if (balloonOn) {
    const numberNode = root.querySelector(".ktx-balloon-number");
    if (numberNode.textContent !== String(nextMilestone)) {
      numberNode.textContent = String(nextMilestone);
    }
  }

  // 이벤트 무대 — 활성 이벤트 스프라이트
  const stageHost = root.querySelector(".ktx-event-stage");
  const active = activeEvent(state);
  const eventKey = active?.type ?? "";
  if (stageHost.dataset.event !== eventKey) {
    stageHost.dataset.event = eventKey;
    stageHost.innerHTML = eventKey ? eventSpriteSvg(eventKey) : "";
  }

  // 순간 연출 — 틱 이벤트를 data 속성 펄스로 넘긴다(CSS 애니메이션 재생)
  for (const event of events) {
    if (event.type === "horn") {
      stageHost.dataset.hornLevel = String(event.level);
      pulse(stageHost, "ktx-horn-pulse");
      pulse(root.querySelector(".ktx-side-train"), "ktx-train-toot");
    }
    if (event.type === "boarded") {
      const pop = root.querySelector(".ktx-board-pop");
      const face = root.querySelector(".ktx-board-face");
      face.replaceChildren(passengerImg(document, event.number, "ktx-board-img"));
      root.querySelector(".ktx-board-count").textContent = String(event.ordinal);
      pop.dataset.guest = String(Boolean(event.guest));
      pulse(pop, "ktx-board-show");
    }
    if (event.type === "stopped") {
      root.dataset.lastStars = String(event.stars);
      pulse(root.querySelector(".ktx-hud"), "ktx-stars-pop");
    }
    if (event.type === "milestone") {
      pulse(root.querySelector(".ktx-speedo"), "ktx-speed-pop");
      pulse(balloon, "ktx-balloon-pop");
    }
    if (event.type === "finale") {
      showFinale(document, root, event);
    }
  }
  return root;
}

function pulse(node, className) {
  if (!node) return;
  node.classList.remove(className);
  // 강제 리플로우로 애니메이션 재시작 — FakeElement에는 offsetWidth가 없어도 무해
  void node.offsetWidth;
  node.classList.add(className);
}

function showFinale(document, root, event) {
  const finale = root.querySelector(".ktx-finale");
  finale.dataset.on = "true";
  const title = root.querySelector(".ktx-finale-title");
  title.textContent = event.perfect
    ? "⭐ 퍼펙트 기관사! ⭐"
    : "부산에 도착했어요!";
  const friends = root.querySelector(".ktx-finale-friends");
  friends.replaceChildren();
  for (const number of event.boarded) {
    friends.append(passengerImg(document, number, "ktx-finale-friend"));
  }
  const total = event.stars.reduce((sum, count) => sum + count, 0);
  root.querySelector(".ktx-finale-words").textContent =
    `별 ${total}개 · 친구 ${event.boarded.length}명 — 고마워요, 기관사님!`;
}
