import {
  NUMBERBLOCKS,
  applyDigit,
  createProblem,
  deleteLastDigit,
  isModeAvailable,
  problemKey
} from "./game-model.mjs";
import { AudioManager } from "./audio-manager.mjs";
import {
  loadDifficulty,
  saveDifficulty
} from "./difficulty-preference.mjs";
import {
  celebrationPresentation,
  characterSceneScale,
  characterShapeScale,
  characterShapeWidthScale,
  characterSizeBand,
  formatCountHint,
  formatProblemText,
  focusPhase,
  playPromptCue,
  playRetryCue,
  quantityParts,
  retireAnimationClass
} from "./app-behavior.mjs";
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "./character-visual-metrics.mjs";
import {
  characterLayoutScaleCap,
  containedBitmapDimensions
} from "./character-layout.mjs";
import {
  countCharacterValues,
  operandScene,
  operatorFor
} from "./problem-scene.mjs";
import {
  advanceSafetyWorld,
  attemptSafetyMove,
  busStopForNextTarget,
  createSafetyRouteState,
  findSafetyPath
} from "./safety-route-model.mjs";
import {
  acceptSafetyRepeat,
  directionForKey,
  safetyCueForEvent
} from "./safety-route-controller.mjs";
import {
  renderSafetyRouteScene,
  updateSafetyRouteScene
} from "./safety-route-scene.mjs";
import {
  createGuidanceState,
  guidanceCells,
  recordGuidanceMove
} from "./safety-route-guidance.mjs";
import {
  cameraOffset,
  targetArrow,
  tourCameraPath
} from "./safety-route-camera.mjs";
import {
  SPLASH_MESSAGES,
  SRT_STATIONS,
  advanceSrtWorld,
  attemptSrtMove,
  createSrtJourney,
  splashStep,
  targetSeatName
} from "./srt-journey.mjs";
import {
  renderSrtJourney,
  updateSrtJourney
} from "./srt-journey-scene.mjs";
import {
  advanceSubwayWorld,
  attemptSubwayMove,
  chooseSubwayLine,
  createSubwayJourney,
  subwayCompass,
  subwayDestinations
} from "./subway-journey.mjs";
import {
  renderSubwayJourney,
  renderSubwayPicker,
  updateSubwayJourney
} from "./subway-scene.mjs";
import {
  stationSoundSrc,
  subwaySoundSrc
} from "./subway-sound-manifest.mjs";
import { stationLabel } from "./subway-map-data.mjs";

const WALK_REPEAT_MS = 110;
const audio = new AudioManager();
const $ = id => document.getElementById(id);
const modeControls = [...document.querySelectorAll(".mode-card")];
const difficultyControls = [
  ...document.querySelectorAll(".difficulty-button")
];
const countControl = document.querySelector('[data-mode="count"]');
const countUnavailable = $("count-unavailable");
const numberPadDigits = [...document.querySelectorAll("[data-digit]")];

const dom = {
  home: $("home"),
  game: $("game"),
  stage: $("stage"),
  problem: $("problem-text"),
  answer: $("answer-box"),
  stars: $("star-count"),
  mute: $("mute-btn"),
  muteIcon: $("mute-icon"),
  homeButton: $("home-btn"),
  hint: $("hint-msg"),
  cheer: $("big-cheer"),
  numberPadDelete: $("number-pad-delete")
};

const state = {
  phase: "home",
  mode: null,
  difficulty: loadDifficulty(),
  problem: null,
  safety: null,
  safetyView: null,
  buffer: "",
  stars: 0,
  streak: { count: 0, add: 0, sub: 0, mul: 0, safety: 0, subway: 0 },
  subwayWalkMs: 0,
  wrongCount: 0,
  round: 0,
  hintTimer: 0,
  timers: new Map(),
  recentProblemKeys: []
};

function preloadCharacters() {
  Object.values(NUMBERBLOCKS).slice(0, 10).forEach(({ asset }) => {
    const image = new Image();
    image.src = `assets/characters/${asset}`;
  });
}

function character(number, className = "", scene = "neutral") {
  const { asset, rows, cols } = NUMBERBLOCKS[number];
  const metric = CHARACTER_VISUAL_METRICS[number];
  const image = document.createElement("img");
  image.className = `character enter ${className}`.trim();
  image.src = `assets/characters/${asset}`;
  image.alt = `숫자 ${number} 블록 캐릭터`;
  image.dataset.number = String(number);
  image.dataset.sizeBand = characterSizeBand(number);
  image.dataset.scene = scene;
  image.style.setProperty(
    "--shape-scale",
    String(characterShapeScale(number, rows, cols))
  );
  image.style.setProperty(
    "--shape-width-scale",
    String(characterShapeWidthScale(number, rows, cols))
  );
  image.style.setProperty(
    "--scene-scale",
    String(characterSceneScale({
      number,
      scene,
      rows,
      cols,
      metric,
      referenceArea: REFERENCE_VISUAL_AREA
    }))
  );
  image.dataset.shape =
    cols > rows
      ? "wide"
      : rows > cols * 2
        ? "tall"
        : "balanced";
  retireAnimationClass(image, "enter");
  return image;
}

function fitSceneCharacter(image) {
  const zone = image.closest(
    ".operand-slot, .celebration-character-zone"
  );
  const metric = CHARACTER_VISUAL_METRICS[Number(image.dataset.number)];
  if (!zone || !metric) return;

  const bitmap = containedBitmapDimensions({
    naturalWidth: image.naturalWidth,
    naturalHeight: image.naturalHeight,
    boxWidth: image.clientWidth,
    boxHeight: image.clientHeight
  });

  const cap = characterLayoutScaleCap({
    zoneWidth: zone.clientWidth,
    zoneHeight: zone.clientHeight,
    imageWidth: bitmap?.width ?? 0,
    imageHeight: bitmap?.height ?? 0,
    metric,
    widthScale: Number(
      image.style.getPropertyValue("--shape-width-scale")
    )
  });
  image.style.setProperty("--layout-scale-cap", String(cap));
}

function fitSceneCharacters(root = dom.stage) {
  root
    .querySelectorAll('.character[data-scene="problem"], .character[data-scene="celebration"]')
    .forEach(fitSceneCharacter);
}

function scheduleCharacterFit(root = dom.stage) {
  requestAnimationFrame(() => {
    fitSceneCharacters(root);
    root.querySelectorAll(".character").forEach(image => {
      if (!image.complete) {
        image.addEventListener(
          "load",
          () => fitSceneCharacter(image),
          { once: true }
        );
      }
    });
  });
}

function quantityVisual(number, { countable = false } = {}) {
  const visual = document.createElement("div");
  visual.className = `quantity-visual${countable ? " countable" : ""}`;
  visual.dataset.value = String(number);
  visual.setAttribute("aria-label", `${number}개`);

  const { tens, ones } = quantityParts(number);
  for (let groupIndex = 0; groupIndex < tens; groupIndex += 1) {
    const group = document.createElement("span");
    group.className = "ten-group";
    for (let index = 0; index < 10; index += 1) {
      const block = document.createElement("i");
      block.setAttribute("aria-hidden", "true");
      group.append(block);
    }
    visual.append(group);
  }

  if (ones > 0) {
    const group = document.createElement("span");
    group.className = "ones-group";
    for (let index = 0; index < ones; index += 1) {
      const block = document.createElement("i");
      block.setAttribute("aria-hidden", "true");
      group.append(block);
    }
    visual.append(group);
  }

  return visual;
}

function countFriends(answer) {
  const friends = document.createElement("div");
  friends.className = "count-friends";
  friends.setAttribute("aria-label", `${answer}개`);
  countCharacterValues(answer).forEach(value => {
    friends.append(character(value, "count-character"));
  });
  return friends;
}

function resultBoard(problem) {
  const board = document.createElement("div");
  board.className = "result-board";
  const formula = document.createElement("strong");

  if (problem.mode === "count") {
    formula.textContent = `${problem.answer}개!`;
  } else {
    const operator = operatorFor(problem.mode);
    formula.textContent =
      `${problem.operands[0]} ${operator} ${problem.operands[1]} = ${problem.answer}`;
  }

  board.append(formula, quantityVisual(problem.answer));
  return board;
}

function renderCelebration(problem) {
  const presentation = celebrationPresentation(problem);
  if (presentation.view === "number") {
    const wrapper = document.createElement("div");
    wrapper.className = "celebration-result";
    const characterZone = document.createElement("div");
    characterZone.className = "celebration-character-zone";
    const image = character(
      presentation.characterNumber,
      "correct",
      "celebration"
    );
    image.addEventListener("error", () => {
      if (state.problem === problem) {
        dom.stage.replaceChildren(resultBoard(problem));
      }
    }, { once: true });
    characterZone.append(image);
    wrapper.append(characterZone);
    if (presentation.equation !== null) {
      const equation = document.createElement("strong");
      equation.className = "completed-equation";
      equation.textContent = presentation.equation;
      wrapper.append(equation);
    }
    dom.stage.replaceChildren(wrapper);
    scheduleCharacterFit(wrapper);
  } else {
    dom.stage.replaceChildren(resultBoard(problem));
  }
}

function clearTimers() {
  state.timers.forEach((resolve, timer) => {
    clearTimeout(timer);
    resolve(false);
  });
  state.timers.clear();
  state.hintTimer = 0;
}

function wait(delay) {
  return new Promise(resolve => {
    const timer = setTimeout(() => {
      state.timers.delete(timer);
      resolve(true);
    }, delay);
    state.timers.set(timer, resolve);
  });
}

function schedule(callback, delay) {
  const timer = setTimeout(() => {
    state.timers.delete(timer);
    callback();
  }, delay);
  state.timers.set(timer, () => {});
  return timer;
}

function setPhase(phase) {
  state.phase = phase;
  document.body.dataset.state = phase;
  dom.home.classList.toggle("active", phase === "home");
  dom.game.classList.toggle("active", phase !== "home");
  dom.home.setAttribute("aria-hidden", String(phase !== "home"));
  dom.game.setAttribute("aria-hidden", String(phase === "home"));
}

function setMode(mode) {
  state.mode = mode;
  document.body.dataset.mode = mode ?? "";
}

function syncDifficulty() {
  difficultyControls.forEach(button => {
    const selected = button.dataset.difficulty === state.difficulty;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  const countAvailable = isModeAvailable("count", state.difficulty);
  countControl.disabled = !countAvailable;
  countControl.setAttribute("aria-disabled", String(!countAvailable));
  countUnavailable.hidden = countAvailable;
}

function setDifficulty(value) {
  state.difficulty = saveDifficulty(globalThis.localStorage, value);
  state.recentProblemKeys = [];
  syncDifficulty();
}

function availableHomeControl() {
  return modeControls.find(control => !control.disabled) ?? difficultyControls[0];
}

function renderProblem(problem) {
  dom.stage.replaceChildren();
  dom.answer.className = "answer-box";
  dom.answer.textContent = "?";

  if (problem.mode === "count") {
    dom.problem.textContent = formatProblemText(problem);
    dom.stage.append(countFriends(problem.answer));
    if (problem.answer > 10) scheduleCountHint(problem.answer);
    return;
  }

  dom.problem.textContent = formatProblemText(problem);
  const scene = operandScene(
    document,
    problem,
    (number, className) => character(number, className, "problem")
  );
  scene.querySelectorAll(".operand-character").forEach(image => {
    image.addEventListener("error", () => {
      const fallback = document.createElement("strong");
      fallback.className = "operand-fallback";
      fallback.textContent = image.dataset.number;
      image.replaceWith(fallback);
    }, { once: true });
  });
  dom.stage.append(scene);
  scheduleCharacterFit(scene);
}

function newProblem() {
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.buffer = "";
  state.wrongCount = 0;
  state.problem = createProblem(
    state.mode,
    state.difficulty,
    Math.random,
    state.recentProblemKeys
  );
  state.recentProblemKeys = [
    ...state.recentProblemKeys,
    problemKey(state.problem)
  ].slice(-4);
  dom.cheer.classList.remove("show");
  dom.hint.className = "toast";
  dom.hint.textContent = "";
  setPhase("playing");
  renderProblem(state.problem);
  playPromptCue(audio, state.problem.promptKey);
}

function renderSafetyRoute() {
  if (!state.safety || !state.safetyView) return;
  dom.problem.textContent =
    state.safety.nextFriend <= 10
      ? `${state.safety.nextFriend} 친구를 만나러 가요`
      : "학교까지 안전하게 가요";

  const mobile = window.innerWidth <= 640;
  const viewport = mobile
    ? { width: 5, height: 5 }
    : { width: 7, height: 5 };
  const target =
    state.safety.map.friends.find(
      friend => friend.number === state.safety.nextFriend
    ) ?? state.safety.map.goal;
  const previousCamera = state.safetyView.camera;
  const animateCamera = state.safetyView.cameraRendered;
  state.safetyView.camera = state.safety.tourActive
    ? { ...state.safetyView.camera, ...viewport }
    : {
      ...cameraOffset({
        world: state.safety.map,
        viewport,
        player: state.safety.position,
        previous: state.safetyView.camera
      }),
      ...viewport
    };
  const nowMs = performance.now();
  const guidance = guidanceCells(
    state.safetyView.guidance,
    state.safety.map,
    state.safety.position,
    target,
    nowMs
  );
  const sceneView = {
    camera: state.safetyView.camera,
    cameraStart: animateCamera ? previousCamera : undefined,
    guidance,
    targetArrow: targetArrow({
      viewport,
      camera: state.safetyView.camera,
      target
    })
  };
  if (!state.safetyView.scene) {
    state.safetyView.scene = renderSafetyRouteScene(
      document,
      state.safety,
      sceneView
    );
    dom.stage.replaceChildren(state.safetyView.scene);
  } else {
    updateSafetyRouteScene(
      state.safetyView.scene,
      state.safety,
      sceneView
    );
  }
  state.safetyView.cameraRendered = true;
}

function scheduleSafetyWorldTick(previousMs = performance.now()) {
  schedule(() => {
    if (
      state.phase !== "playing" ||
      state.mode !== "safety" ||
      !state.safety
    ) {
      return;
    }
    const nowMs = performance.now();
    const wasRiding = state.safety.riding;
    state.safety = advanceSafetyWorld(
      state.safety,
      Math.min(250, nowMs - previousMs)
    );
    if (wasRiding && !state.safety.riding) {
      showHint("정류장에 도착했어요! 이제 친구들을 만나러 가요");
    }
    renderSafetyRoute();
    scheduleSafetyWorldTick(nowMs);
  }, 100);
}

function startSafetyRoute() {
  stopSafetyHold();
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.problem = null;
  state.buffer = "";
  const seed = Math.floor(Math.random() * 0x100000000);
  state.safety = createSafetyRouteState(state.difficulty, {
    seed,
    tourActive: true
  });
  const mobile = window.innerWidth <= 640;
  state.safetyView = {
    camera: {
      x: 0,
      y: Math.max(0, state.safety.map.height - 5),
      width: mobile ? 5 : 7,
      height: 5
    },
    cameraRendered: false,
    scene: null,
    guidance: createGuidanceState(performance.now()),
    lastMoveAt: 0,
    heldDirection: null,
    holdTimer: 0,
    tourTimer: 0
  };
  dom.cheer.classList.remove("show");
  dom.hint.className = "toast";
  dom.hint.textContent = "";
  setPhase("playing");
  renderSafetyRoute();
  void audio.playPrompt("safety-tour");
  runSafetyTour();
}

function runSafetyTour() {
  if (!state.safety || !state.safetyView) return;
  const viewport = {
    width: state.safetyView.camera.width,
    height: state.safetyView.camera.height
  };
  const waypoints = tourCameraPath({
    world: state.safety.map,
    viewport,
    start: state.safety.map.start,
    goal: state.safety.map.goal
  });
  let index = 0;
  const advance = () => {
    if (
      state.phase !== "playing" ||
      state.mode !== "safety" ||
      !state.safety?.tourActive
    ) {
      return;
    }
    if (index >= waypoints.length) {
      endSafetyTour();
      return;
    }
    state.safetyView.camera = { ...waypoints[index], ...viewport };
    index += 1;
    renderSafetyRoute();
    state.safetyView.tourTimer = schedule(
      advance,
      index >= waypoints.length ? 800 : 500
    );
  };
  advance();
}

function endSafetyTour() {
  if (!state.safety) return;
  if (state.safetyView?.tourTimer) {
    clearTimeout(state.safetyView.tourTimer);
    state.timers.delete(state.safetyView.tourTimer);
    state.safetyView.tourTimer = 0;
  }
  state.safety = { ...state.safety, tourActive: false };
  audio.cancel();
  void audio.playPrompt("safety-next-2");
  renderSafetyRoute();
  scheduleSafetyWorldTick(performance.now());
}

function showHint(message) {
  if (state.hintTimer) {
    clearTimeout(state.hintTimer);
    state.timers.delete(state.hintTimer);
  }
  dom.hint.textContent = message;
  dom.hint.className = "toast retry";
  void dom.hint.offsetWidth;
  dom.hint.classList.add("show");
  state.hintTimer = schedule(() => {
    state.hintTimer = 0;
    dom.hint.classList.remove("show");
  }, 1300);
}

async function completeSafetyRoute() {
  const round = state.round;
  stopSafetyHold();
  setPhase("celebrating");
  clearTimers();
  audio.cancel();
  state.stars += 1;
  state.streak.safety += 1;
  dom.stars.textContent = String(state.stars);
  dom.cheer.textContent = "안전하게 도착했어요!";
  dom.cheer.classList.add("show");
  renderSafetyRoute();
  audio.playSfx("win");
  await audio.playPrompt("safety-finish");
  if (state.phase !== "celebrating" || state.round !== round) return;
  schedule(() => {
    dom.cheer.classList.remove("show");
    startSafetyRoute();
  }, 1550);
}

function safetyTarget(safety = state.safety) {
  if (!safety) return null;
  return busStopForNextTarget(safety) ?? safety.map.friends.find(
    friend => friend.number === safety.nextFriend
  ) ?? safety.map.goal ?? null;
}

function safetyDistance(safety = state.safety) {
  const target = safetyTarget(safety);
  if (!safety || !target) return Number.POSITIVE_INFINITY;
  const path = findSafetyPath(
    safety.map,
    safety.position,
    target
  );
  return path.length > 0 ? path.length - 1 : Number.POSITIVE_INFINITY;
}

function stopSafetyHold() {
  if (state.safetyView?.holdTimer) {
    clearInterval(state.safetyView.holdTimer);
  }
  if (state.safetyView) {
    state.safetyView.holdTimer = 0;
    state.safetyView.heldDirection = null;
  }
}

function startSafetyHold(direction) {
  stopSafetyHold();
  if (state.subway) {
    moveSubway(direction);
    return;
  }
  if (state.srt) {
    moveSrt(direction);
    return;
  }
  if (!state.safetyView) return;
  state.safetyView.heldDirection = direction;
  const event = moveSafetyRoute(direction);
  if (event?.type !== "moved" && event?.type !== "crossing-started") {
    stopSafetyHold();
    return;
  }
  state.safetyView.holdTimer = window.setInterval(() => {
    if (state.safetyView?.heldDirection !== direction) return;
    const repeatedEvent = moveSafetyRoute(direction);
    if (repeatedEvent?.type !== "moved") stopSafetyHold();
  }, 140);
}

function moveSafetyRoute(direction) {
  if (
    state.phase !== "playing" ||
    state.mode !== "safety" ||
    !state.safety
  ) {
    return null;
  }

  const beforeDistance = safetyDistance();
  audio.playSfx("key");
  const result = attemptSafetyMove(state.safety, direction);
  state.safety = result.state;
  const nowMs = performance.now();
  if (result.event.type === "friend") {
    state.safetyView.guidance = createGuidanceState(nowMs);
  } else {
    state.safetyView.guidance = recordGuidanceMove(
      state.safetyView.guidance,
      {
        beforeDistance,
        afterDistance: safetyDistance(),
        blocked: result.event.type === "blocked",
        nowMs
      }
    );
  }
  renderSafetyRoute();

  if (result.event.type === "complete") {
    if (state.safety.map.srtMode) {
      startSrtJourney();
    } else {
      void completeSafetyRoute();
    }
    return result.event;
  }

  const cue = safetyCueForEvent(result.event, state.safety.nextFriend);
  if (!cue) return result.event;
  showHint(cue.message);
  if (cue.voiceKey) {
    audio.cancel();
    void audio.playPrompt(cue.voiceKey);
  }
  return result.event;
}

const SRT_SPLASH_VOICES = ["srt-arrive", "srt-board", "srt-seat"];
const SRT_STATION_VOICES = {
  동탄: "srt-station-dongtan",
  대전: "srt-station-daejeon",
  대구: "srt-station-daegu",
  부산: "srt-station-busan"
};

function playSrtVoice(key) {
  audio.cancel();
  void audio.playPrompt(key);
}

function startSrtJourney() {
  stopSafetyHold();
  clearTimers();
  audio.cancel();
  state.srt = createSrtJourney(state.safety?.seed ?? 0);
  state.srtScene = renderSrtJourney(document, state.srt);
  dom.stage.replaceChildren(state.srtScene);
  dom.problem.textContent = "SRT를 타고 할아버지 할머니댁에 가요!";
  audio.playSfx("win");
  showHint(SPLASH_MESSAGES[0]);
  playSrtVoice(SRT_SPLASH_VOICES[0]);
  scheduleSrtTick(performance.now());
}

function scheduleSrtTick(previousMs = performance.now()) {
  schedule(() => {
    if (
      state.phase !== "playing" ||
      state.mode !== "safety" ||
      !state.srt
    ) {
      return;
    }
    const nowMs = performance.now();
    if (state.srt.phase === "station" || state.srt.phase === "ride") {
      const wasPhase = state.srt.phase;
      const wasStep = wasPhase === "station" ? splashStep(state.srt) : -1;
      const wasOpen = state.srt.ride.doorOpen;
      state.srt = advanceSrtWorld(
        state.srt,
        Math.min(400, nowMs - previousMs)
      );
      if (wasPhase === "station" && state.srt.phase === "station") {
        const step = splashStep(state.srt);
        if (step !== wasStep) {
          showHint(SPLASH_MESSAGES[step]);
          playSrtVoice(SRT_SPLASH_VOICES[step]);
        }
      }
      if (wasPhase === "station" && state.srt.phase === "seat") {
        showHint(`${targetSeatName(state.srt)} 좌석을 찾아요!`);
      }
      if (!wasOpen && state.srt.ride.doorOpen) {
        audio.playSfx("key");
        const station = SRT_STATIONS[state.srt.ride.stationIndex];
        showHint(`${station}역이에요! 문이 열렸어요`);
        const voiceKey = SRT_STATION_VOICES[station];
        if (voiceKey) playSrtVoice(voiceKey);
      }
      updateSrtJourney(state.srtScene, state.srt);
    }
    scheduleSrtTick(nowMs);
  }, 200);
}

function moveSrt(direction) {
  if (
    state.phase !== "playing" ||
    state.mode !== "safety" ||
    !state.srt
  ) {
    return;
  }
  audio.playSfx("key");
  const result = attemptSrtMove(state.srt, direction);
  state.srt = result.state;
  updateSrtJourney(state.srtScene, state.srt);
  const event = result.event;
  if (event.type === "seat-found") {
    audio.playSfx("win");
    showHint(`${event.seat} 좌석을 찾았어요! 출발합니다!`);
    playSrtVoice("srt-depart");
  } else if (event.type === "wrong-seat") {
    showHint(`여기는 ${event.seat} 좌석이에요. ${targetSeatName(state.srt)}를 찾아요!`);
    playSrtVoice("srt-wrong-seat");
  } else if (event.type === "wrong-station") {
    showHint(`${event.station}역은 해당 역이 아니에요. 다시 기차에 올라타요!`);
    playSrtVoice("srt-wrong-station");
  } else if (event.type === "arrived") {
    audio.playSfx("win");
    showHint(`${event.station}역에 내렸어요! 할아버지 할머니 차를 찾아요!`);
    playSrtVoice("srt-parking");
  } else if (event.type === "wrong-car") {
    showHint(event.shapeMatches
      ? `모양은 맞아요! 번호판 ${state.srt.parking.targetPlate}를 찾아요!`
      : "이 모양이 아니에요. 그림자를 잘 봐요!");
    playSrtVoice("srt-wrong-car");
  } else if (event.type === "car-found") {
    audio.playSfx("win");
    showHint("차를 찾았어요! 할아버지 할머니예요!");
    schedule(() => {
      void completeSrtJourney();
    }, 2400);
  }
}

async function completeSrtJourney() {
  const round = state.round;
  setPhase("celebrating");
  clearTimers();
  audio.cancel();
  state.stars += 1;
  state.streak.safety += 1;
  dom.stars.textContent = String(state.stars);
  dom.cheer.textContent = "할아버지 할머니를 만났어요!";
  dom.cheer.classList.add("show");
  audio.playSfx("win");
  await audio.playPrompt("srt-grandparents");
  if (state.phase !== "celebrating" || state.round !== round) return;
  schedule(() => {
    dom.cheer.classList.remove("show");
    state.srt = null;
    state.srtScene = null;
    goHome();
  }, 1800);
}

function startSubwayJourney() {
  stopSafetyHold();
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.problem = null;
  state.buffer = "";
  state.subway = null;
  state.subwayChoosing = true;
  dom.stage.setAttribute("aria-live", "off");
  state.subwayScene = renderSubwayPicker(document, subwayDestinations());
  dom.stage.replaceChildren(state.subwayScene);
  dom.problem.textContent = "🚇 어디로 갈까요?";
  dom.cheer.classList.remove("show");
  dom.hint.className = "toast";
  dom.hint.textContent = "";
  setPhase("playing");
  audio.playSfx("win");
  showHint("가고 싶은 곳을 숫자키로 골라요!");
}

function playSubwayReal(key, fallback) {
  const src = subwaySoundSrc(key);
  audio.cancel();
  if (src) {
    void audio.playFile(src);
  } else if (fallback) {
    void audio.playPrompt(fallback);
  }
}

function playStationSound(station, followUpKey = null) {
  const playback = audio.playFile(stationSoundSrc(station));
  if (followUpKey) {
    void playback.then(() => audio.playPrompt(followUpKey));
  } else {
    void playback;
  }
}

function startSubwayRide(placeId) {
  if (state.mode !== "subway") return;
  state.subwayChoosing = false;
  const seed = Math.floor(Math.random() * 0x100000000);
  state.subway = createSubwayJourney(placeId, seed);
  state.subwayScene = renderSubwayJourney(document, state.subway);
  dom.stage.replaceChildren(state.subwayScene);
  dom.problem.textContent =
    `${state.subway.place.icon} ${state.subway.place.label}에 가요!`;
  audio.playSfx("win");
  showHint("→ 걸어가서 🎫 들어가는 곳을 지나가요!");
  audio.cancel();
  void audio.playPrompt(state.subway.place.voiceKey);
  scheduleSubwayTick(performance.now());
}

function chooseSubwayLineInput(lineNumber) {
  if (state.phase !== "playing" || !state.subway) return;
  const result = chooseSubwayLine(state.subway, lineNumber);
  state.subway = result.state;
  updateSubwayJourney(state.subwayScene, state.subway);
  if (result.event.type === "line-chosen") {
    audio.playSfx("key");
    showHint(`${result.event.line}호선 계단이에요! → 걸어서 내려가요`);
  } else if (result.event.type === "no-line") {
    showHint(`이 역에는 ${lineNumber}호선이 없어요`);
    audio.cancel();
    void audio.playPrompt("subway-wrong-line");
  } else if (result.event.type === "tap-first") {
    showHint("먼저 → 걸어서 들어가는 곳을 지나가요!");
  }
}

function scheduleSubwayTick(previousMs = performance.now()) {
  schedule(() => {
    if (
      state.phase !== "playing" ||
      state.mode !== "subway" ||
      !state.subway
    ) {
      return;
    }
    const nowMs = performance.now();
    const previous = state.subway;
    state.subway = advanceSubwayWorld(
      state.subway,
      Math.min(400, nowMs - previousMs)
    );
    if (previous.phase === "platform" && state.subway.phase === "platform" &&
      previous.platform.stage !== "stopped" &&
      state.subway.platform.stage === "stopped") {
      audio.playSfx("door");
      showHint(`${state.subway.line}호선 열차예요! ⎵ 키로 타요`);
    }
    if (previous.phase === "arriving" && state.subway.phase === "arriving" &&
      previous.arriving?.stage === "melody" &&
      state.subway.arriving?.stage === "dodge") {
      audio.playSfx("door");
      playSubwayReal("mind-gap", "subway-mind-gap");
      showHint("문이 열렸어요! 빈 곳 방향키로 내려요");
    }
    updateSubwayJourney(state.subwayScene, state.subway);
    scheduleSubwayTick(nowMs);
  }, 150);
}

function moveSubway(direction) {
  if (
    state.phase !== "playing" ||
    state.mode !== "subway" ||
    !state.subway
  ) {
    return;
  }
  const result = attemptSubwayMove(state.subway, direction);
  state.subway = result.state;
  updateSubwayJourney(state.subwayScene, state.subway);
  const event = result.event;
  if (!["ignored", "walked"].includes(event.type)) audio.playSfx("key");
  if (event.type === "boarded") {
    audio.playSfx("bell");
    playSubwayReal("door-close", "subway-board");
    const compass = subwayCompass(state.subway);
    showHint(
      compass?.alightAt && compass.hopsToAlight > 0
        ? `${event.line}호선을 탔어요! ${compass.alightAt}에서 내려요 ` +
          `(${compass.hopsToAlight}정거장)`
        : `${event.line}호선을 탔어요! ←→ 문으로 걸어가요`
    );
  } else if (event.type === "no-train") {
    showHint("열차가 완전히 설 때까지 기다려요");
  } else if (event.type === "card-tapped") {
    audio.playSfx("bell");
    showHint(
      event.autoLine
        ? `삑! 통과했어요. → ${event.autoLine}호선 계단으로 내려가요`
        : `삑! 통과했어요. ${event.lines.join("·")}호선 중에 골라요`
    );
  } else if (event.type === "wrong-gate") {
    showHint("여기는 나가는 곳이에요! → 들어가는 곳으로 가요");
  } else if (event.type === "walk-through-gate") {
    showHint("→ 걸어서 들어가는 곳을 지나가요");
  } else if (event.type === "pick-line-first") {
    showHint(`몇 호선 계단으로 갈까요? ${event.lines.join("·")} 중에 골라요`);
  } else if (event.type === "stairs-down") {
    audio.playSfx("jingle");
    showHint(`${event.line}호선 승강장이에요! 열차가 서면 ↑ 키로 타요`);
  } else if (event.type === "gate-reached") {
    audio.playSfx("jingle");
    showHint("개찰구예요! → 들어가는 곳으로 지나가요");
  } else if (event.type === "friend-joined") {
    audio.playSfx("win");
    showHint(`${event.number} 친구가 함께 가요!`);
    audio.cancel();
    void audio.playPrompt(`number-${event.number}`);
  } else if (event.type === "departed") {
    const compass = subwayCompass(state.subway);
    if (event.atDest) {
      audio.playSfx("door");
      showHint(`⭐ ${stationLabel(event.station)}이에요! ⎵ 눌러서 내려요`);
      playSubwayReal("mind-gap", "subway-stop-check");
    } else if (compass?.hopsToAlight === 0) {
      audio.playSfx("door");
      showHint(`🔔 ${stationLabel(event.station)}이에요! ⎵ 눌러서 갈아타요`);
      playSubwayReal("mind-gap", "subway-transfer");
    } else if (compass?.hopsToAlight === 1) {
      showHint(
        `${stationLabel(event.station)} — 다음 ${compass.alightAt}에서 내려요!`
      );
      audio.cancel();
      playStationSound(compass.alightAt, "subway-stop-check");
    } else {
      showHint(
        `${stationLabel(event.station)} — ${compass?.alightAt ?? "목적지"}까지 ` +
        `${compass?.hopsToAlight ?? "?"}정거장`
      );
      if (!event.closer && state.subway.strayStreak >= 2) {
        showHint("목적지에서 멀어지고 있어요. 지도를 봐요!");
      }
    }
  } else if (event.type === "line-end") {
    showHint("이 방향은 종점이에요. 반대쪽 문으로 가요");
  } else if (event.type === "wall") {
    showHint("벽이에요! 다른 쪽으로 가요");
  } else if (event.type === "not-your-stop") {
    showHint(`${stationLabel(event.station)}은 내릴 역이 아니에요. 계속 타요`);
    audio.cancel();
    void audio.playPrompt("subway-wrong-stop");
  } else if (event.type === "transfer-start") {
    audio.playSfx("jingle");
    showHint(
      event.offPlan
        ? "여기서 내렸어요! 계획에 없던 역이지만 다시 탈 수 있어요"
        : "내렸어요! → 환승 통로로 걸어가요. 발빠짐 주의!"
    );
    audio.cancel();
    playStationSound(event.station, "subway-transfer");
  } else if (event.type === "arriving") {
    playSubwayReal(
      state.subway.travelSide === "back"
        ? "arrive-melody-up"
        : "arrive-melody-down",
      null
    );
    audio.playSfx("win");
    showHint("도착 멜로디가 나와요! 곧 문이 열려요");
  } else if (event.type === "blocked-person") {
    audio.playSfx("pop");
    showHint("\"실례합니다!\" 한 번 더 누르면 비켜줘요");
  } else if (event.type === "alighted") {
    audio.playSfx("win");
    showHint(`${state.subway.place.label}에 도착했어요!`);
    schedule(() => {
      void completeSubwayJourney();
    }, 1600);
  }
}

async function completeSubwayJourney() {
  const round = state.round;
  setPhase("celebrating");
  clearTimers();
  audio.cancel();
  state.stars += 1;
  state.streak.subway += 1;
  dom.stars.textContent = String(state.stars);
  dom.cheer.textContent =
    `${state.subway.place.icon} ${state.subway.place.label} 도착! ` +
    `환승 ${state.subway.transfersUsed}번`;
  dom.cheer.classList.add("show");
  audio.playSfx("win");
  await audio.playPrompt("subway-arrive");
  if (state.phase !== "celebrating" || state.round !== round) return;
  schedule(() => {
    dom.cheer.classList.remove("show");
    state.subway = null;
    state.subwayScene = null;
    goHome();
  }, 1800);
}

function scheduleCountHint(answer) {
  schedule(() => {
    if (state.phase !== "playing" || state.problem?.answer !== answer) return;
    dom.stage.querySelector(".count-friends")?.classList.add("hint-groups");
    showHint(formatCountHint(answer));
  }, 4500);
}

function replayClass(node, className) {
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
  node.addEventListener(
    "animationend",
    () => node.classList.remove(className),
    { once: true }
  );
}

async function celebrate() {
  const round = state.round;
  setPhase("celebrating");
  clearTimers();
  audio.cancel();
  state.stars += 1;
  state.streak[state.mode] += 1;
  dom.stars.textContent = String(state.stars);
  dom.answer.textContent = String(state.problem.answer);

  const cheers = [
    "참 잘했어요!",
    "대단해요!",
    "정답이에요!",
    "멋지게 해냈어요!"
  ];
  dom.cheer.textContent = cheers[(state.stars - 1) % cheers.length];
  dom.cheer.classList.add("show");
  dom.stage
    .querySelectorAll(".character")
    .forEach(node => node.classList.add("correct"));

  audio.playSfx("win");
  if (!(await wait(480))) return;
  if (state.phase !== "celebrating" || state.round !== round) return;

  renderCelebration(state.problem);

  await audio.playAnswer(state.problem.answer);
  if (state.phase !== "celebrating" || state.round !== round) return;

  schedule(() => {
    dom.cheer.classList.remove("show");
    newProblem();
  }, 1550);
}

function wrongAnswer() {
  audio.cancel();
  state.wrongCount += 1;
  dom.answer.textContent = "?";
  dom.stage
    .querySelectorAll(".character")
    .forEach(node => replayClass(node, "wrong"));
  replayClass(dom.answer, "wrong");
  const retryMessage =
    state.mode === "count" && state.wrongCount >= 2
      ? formatCountHint(state.problem.answer)
      : "괜찮아요! 천천히 다시 눌러 봐요.";
  if (state.mode === "count" && state.wrongCount >= 2) {
    dom.stage.querySelector(".count-friends")?.classList.add("hint-groups");
  }
  showHint(retryMessage);
  playRetryCue(audio, `retry-${Math.min(state.wrongCount, 3)}`);
}

function onDigit(digit) {
  if (state.phase !== "playing") return;
  audio.playSfx("key");
  const result = applyDigit(state.buffer, digit, state.problem.answer);
  state.buffer = result.buffer;
  dom.answer.textContent = result.buffer || "?";
  replayClass(dom.answer, "typing");

  if (result.status === "correct") {
    void celebrate();
  } else if (result.status === "wrong") {
    wrongAnswer();
  }
}

function deleteDigit() {
  if (state.phase !== "playing") return;
  state.buffer = deleteLastDigit(state.buffer);
  dom.answer.textContent = state.buffer || "?";
}

function startMode(mode) {
  if (!isModeAvailable(mode, state.difficulty)) {
    showHint("도전에서는 더하기, 빼기와 곱하기를 해요.");
    return;
  }
  stopSafetyHold();
  setMode(mode);
  state.srt = null;
  state.srtScene = null;
  state.subway = null;
  state.subwayScene = null;
  state.subwayChoosing = false;
  if (mode === "safety") {
    startSafetyRoute();
  } else if (mode === "subway") {
    state.safety = null;
    state.safetyView = null;
    startSubwayJourney();
  } else {
    state.safety = null;
    state.safetyView = null;
    newProblem();
  }
  focusPhase(state.phase, {
    game: dom.game,
    homeControl: availableHomeControl()
  });
}

function goHome() {
  stopSafetyHold();
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.problem = null;
  state.safety = null;
  state.safetyView = null;
  state.srt = null;
  state.srtScene = null;
  state.subway = null;
  state.subwayScene = null;
  state.subwayChoosing = false;
  dom.stage.setAttribute("aria-live", "polite");
  state.buffer = "";
  setMode(null);
  dom.cheer.classList.remove("show");
  dom.hint.className = "toast";
  dom.hint.textContent = "";
  dom.cheer.textContent = "";
  setPhase("home");
  focusPhase(state.phase, {
    game: dom.game,
    homeControl: availableHomeControl()
  });
}

function syncMuteButton() {
  dom.mute.setAttribute("aria-pressed", String(audio.muted));
  dom.mute.setAttribute("aria-label", audio.muted ? "소리 켜기" : "소리 끄기");
  dom.muteIcon.textContent = audio.muted ? "×" : "♪";
}

modeControls.forEach(button => {
  button.addEventListener("click", () => startMode(button.dataset.mode));
});

difficultyControls.forEach(button => {
  button.addEventListener("click", () => {
    audio.playSfx("key");
    setDifficulty(button.dataset.difficulty);
  });
});

numberPadDigits.forEach(button => {
  button.addEventListener("click", () => onDigit(button.dataset.digit));
});

dom.numberPadDelete.addEventListener("click", deleteDigit);
dom.stage.addEventListener("pointerdown", event => {
  const button = event.target.closest("[data-route-direction]");
  if (!button) return;
  event.preventDefault();
  if (state.mode === "safety" && state.safety?.tourActive) {
    endSafetyTour();
    return;
  }
  button.blur?.();
  button.setPointerCapture?.(event.pointerId);
  startSafetyHold(button.dataset.routeDirection);
});
dom.stage.addEventListener("click", event => {
  const card = event.target.closest("[data-place-id]");
  if (card && state.mode === "subway" && state.subwayChoosing) {
    audio.playSfx("key");
    startSubwayRide(card.dataset.placeId);
    return;
  }
  const lineButton = event.target.closest("[data-line-number]");
  if (lineButton && state.subway?.phase === "gate") {
    chooseSubwayLineInput(Number(lineButton.dataset.lineNumber));
    lineButton.blur?.();
    return;
  }
  const button = event.target.closest("[data-route-direction]");
  if (!button || event.detail !== 0) return;
  if (state.subway) moveSubway(button.dataset.routeDirection);
  else if (state.srt) moveSrt(button.dataset.routeDirection);
  else moveSafetyRoute(button.dataset.routeDirection);
});
document.addEventListener("pointerup", stopSafetyHold);
document.addEventListener("pointercancel", stopSafetyHold);
dom.stage.addEventListener("pointerleave", stopSafetyHold);

dom.homeButton.addEventListener("click", goHome);
dom.mute.addEventListener("click", () => {
  audio.toggleMuted();
  syncMuteButton();
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    event.preventDefault();
    goHome();
    return;
  }

  if (state.phase === "playing" && state.mode === "subway" && state.subway) {
    if ((event.key === " " || event.key === "Spacebar") &&
      ["gate", "platform", "ride", "arriving"].includes(state.subway.phase)) {
      event.preventDefault();
      if (!event.repeat) moveSubway("space");
      return;
    }
    const direction = directionForKey(event.key);
    if (direction) {
      event.preventDefault();
      // Walking a whole car one press at a time is too much for small hands,
      // so holding left/right keeps stepping — but only walking repeats.
      if (event.repeat) {
        if (direction !== "left" && direction !== "right") return;
        const now = performance.now();
        if (now - state.subwayWalkMs < WALK_REPEAT_MS) return;
        state.subwayWalkMs = now;
      } else {
        state.subwayWalkMs = performance.now();
      }
      moveSubway(direction);
      return;
    }
  }

  if (
    state.phase === "playing" &&
    state.mode === "safety"
  ) {
    if (state.safety?.tourActive) {
      event.preventDefault();
      endSafetyTour();
      return;
    }
    const direction = directionForKey(event.key);
    const nowMs = performance.now();
    if (direction) {
      event.preventDefault();
      if (acceptSafetyRepeat({
        repeat: event.repeat,
        nowMs,
        previousMs: state.safetyView?.lastMoveAt ?? 0
      })) {
        state.safetyView.lastMoveAt = nowMs;
        if (state.srt) moveSrt(direction);
        else moveSafetyRoute(direction);
      }
      return;
    }
  }

  if (event.key === "Backspace" && state.phase === "playing") {
    event.preventDefault();
    deleteDigit();
    return;
  }

  if (
    state.phase === "home" &&
    ["ArrowLeft", "ArrowRight"].includes(event.key) &&
    difficultyControls.includes(document.activeElement)
  ) {
    event.preventDefault();
    const current = difficultyControls.indexOf(document.activeElement);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next =
      (current + offset + difficultyControls.length) %
      difficultyControls.length;
    difficultyControls[next].focus();
    return;
  }

  const digit = /^[0-9]$/.test(event.key) ? event.key : null;
  if (digit === null || event.repeat) return;

  if (state.phase === "playing" && state.mode === "subway") {
    if (state.subwayChoosing) {
      event.preventDefault();
      const destinations = subwayDestinations();
      const index = digit === "0" ? 9 : Number(digit) - 1;
      const choice = destinations[index];
      if (choice) {
        audio.playSfx("key");
        startSubwayRide(choice.place.id);
      }
    } else if (state.subway?.phase === "gate") {
      event.preventDefault();
      chooseSubwayLineInput(Number(digit));
    }
    return;
  }

  if (state.phase === "home") {
    const difficulties = { 7: "easy", 8: "steady", 9: "challenge" };
    if (difficulties[digit]) {
      event.preventDefault();
      audio.playSfx("key");
      setDifficulty(difficulties[digit]);
      return;
    }

    const modes = {
      1: "count",
      2: "add",
      3: "sub",
      4: "mul",
      5: "safety",
      6: "subway"
    };
    if (modes[digit]) {
      event.preventDefault();
      startMode(modes[digit]);
    }
    return;
  }

  if (state.phase === "playing") {
    event.preventDefault();
    onDigit(digit);
  }
});

window.addEventListener("resize", () => scheduleCharacterFit());

syncMuteButton();
syncDifficulty();
preloadCharacters();
