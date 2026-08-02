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
  retireAnimationClass,
  subwayArrivingCue
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
  createFamilyJourney,
  createSubwayJourney,
  isFamilyJourney,
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
import { lineForKey, stationLabel } from "./subway-map-data.mjs";
import {
  createKtxJourney,
  pressKtxSpace,
  selectKtxRoute,
  tickKtx
} from "./ktx-journey.mjs";
import { KTX_TRAINS } from "./ktx-route-data.mjs";
import { recordMetFriends } from "./ktx-passengers.mjs";
import {
  movePickerSelection,
  renderKtxPicker,
  renderKtxScene,
  updateKtxScene
} from "./ktx-scene.mjs";
import {
  addPhoto,
  createPhotoHunt,
  loadAlbum,
  movePhotoFrame,
  shootPhoto
} from "./photo-hunt.mjs";

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
  subwayTickMs: 0,
  subwayHoldBlock: false,
  subwayDoorCue: false,
  ktx: null,
  ktxScene: null,
  ktxView: "cab",
  ktxHeld: { up: false, down: false },
  ktxTickMs: 0,
  ktxPicking: false,
  ktxPickIndex: 0,
  ktxViewMs: 0,
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

// nextKey가 있으면 첫 소리가 끝난 뒤 이어서 튼다 — 도착 멜로디 다음에 오는
// 발빠짐 주의처럼, 두 소리가 겹치지 않고 차례로 나와야 하는 자리에 쓴다.
function playSubwayReal(key, fallback, nextKey = null) {
  const src = subwaySoundSrc(key);
  audio.cancel();
  const chain = status => {
    if (status === "error" && fallback) {
      void audio.playPrompt(fallback);
      return;
    }
    if (status !== "cancelled" && nextKey) {
      const nextSrc = subwaySoundSrc(nextKey);
      if (nextSrc) void audio.playFile(nextSrc);
    }
  };
  if (src) {
    // a missing or broken recording falls back to the TTS voice pack; a
    // cancellation means newer audio took over, so stay quiet
    void audio.playFile(src).then(chain);
  } else if (fallback) {
    void audio.playPrompt(fallback);
  }
}

function playStationSound(station, followUpKey = null) {
  const src = stationSoundSrc(station);
  if (!src) {
    if (followUpKey) void audio.playPrompt(followUpKey);
    return;
  }
  const playback = audio.playFile(src);
  if (followUpKey) {
    void playback.then(status => {
      if (status !== "cancelled") void audio.playPrompt(followUpKey);
    });
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
  state.subwayTickMs = performance.now();
  scheduleSubwayTick();
}

function startFamilyLine() {
  if (state.mode !== "subway") return;
  state.subwayChoosing = false;
  const seed = Math.floor(Math.random() * 0x100000000);
  state.subway = createFamilyJourney(seed);
  state.subwayScene = renderSubwayJourney(document, state.subway);
  dom.stage.replaceChildren(state.subwayScene);
  dom.problem.textContent = "10호선 가족 노선";
  audio.playSfx("win");
  showHint("가족이 기다려요! → 걸어가서 들어가는 곳을 지나가요");
  state.subwayTickMs = performance.now();
  scheduleSubwayTick();
}

function movePhoto(input) {
  const journey = state.subway;
  if (!journey?.photo || journey.photo.taken) return;
  if (input === "space") {
    const shot = shootPhoto(journey.photo);
    journey.photo = shot.hunt;
    if (shot.event.type === "taken") {
      audio.playSfx("win");
      journey.album = addPhoto(journey.place.id, globalThis.localStorage);
      showHint(`찰칵! ${shot.event.subject.label} 사진을 찍었어요`);
      updateSubwayJourney(state.subwayScene, journey);
      schedule(() => {
        void completeSubwayJourney();
      }, 2200);
      return;
    }
    audio.playSfx("pop");
    showHint("살짝 빗나갔어요 — 화살표 쪽으로 옮겨요");
  } else {
    const moved = movePhotoFrame(journey.photo, input);
    journey.photo = moved.hunt;
    if (moved.event.type === "framed") audio.playSfx("key");
  }
  updateSubwayJourney(state.subwayScene, journey);
}

const KTX_EVENT_HINTS = Object.freeze({
  sprint300: "쭉 뻗은 길! 300까지 가 볼까?",
  river: "강이에요! 빵빵 하면 오리들이 인사해요",
  tunnel: "터널이에요! 빵빵 해볼까?",
  seagull: "바다다! 빵빵 하면 갈매기가 답해요",
  passing: "반대편 기차예요! 빵빵 인사해요",
  cows: "소 떼예요! 빵빵 하면 음머~"
});

function startKtxPicker() {
  stopSafetyHold();
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.problem = null;
  state.buffer = "";
  setPhase("playing");
  state.ktxPicking = true;
  state.ktxPickIndex = 0;
  state.ktxScene = renderKtxPicker(document, 0);
  dom.stage.replaceChildren(state.ktxScene);
  dom.problem.textContent = "칙칙폭폭 기관사";
  dom.stage.setAttribute("aria-live", "off");
  showHint("← → 로 기차를 고르고 ⎵ 로 출발!");
}

function startKtxJourney(trainId) {
  state.ktxPicking = false;
  const seed = Math.floor(Math.random() * 0x100000000);
  state.ktx = createKtxJourney(seed, trainId);
  // 밖에서 타고, 안에서 몬다 — 탑승은 바깥 뷰에서 시작한다.
  state.ktxView = "side";
  state.ktxHeld = { up: false, down: false };
  state.ktxScene = renderKtxScene(document, state.ktx, "cab");
  dom.stage.replaceChildren(state.ktxScene);
  dom.problem.textContent = "🚄 부산까지 가요!";
  audio.playSfx("win");
  showHint("기관사님, 준비 완료! ⎵ 눌러서 친구들을 태워요");
  state.ktxTickMs = performance.now();
  scheduleKtxTick();
}

function handleKtxEvents(events) {
  const journey = state.ktx;
  for (const event of events) {
    if (event.type === "boarded") {
      audio.playSfx("pop");
      audio.cancel();
      if (event.guest) {
        // 큰 손님은 이름(수)을 불러 준다 — "백!"
        void audio.playAnswer(event.number);
        showHint(`와! ${event.number} 손님이 탔어요!`);
      } else {
        void audio.playAnswer(event.ordinal);
        if (event.remaining === 0) {
          showHint("다 탔어요!");
        }
      }
    } else if (event.type === "all-aboard") {
      audio.playSfx("win");
      showHint(`${event.count}명 탔어요! 문이 곧 닫혀요~`);
    } else if (event.type === "doors-closed") {
      audio.playSfx("door");
      showHint(`문 닫았어요! ↑ 를 꾹 눌러 출발! 다음 역, ${event.next}!`);
    } else if (event.type === "depart") {
      audio.playSfx("jingle");
      // 출발 컷: 문 닫힌 열차가 움직이기 시작하는 걸 900ms 보고 운전석에 앉는다.
      // 그 사이 아이가 1/3로 직접 뷰를 골랐으면 컷을 양보한다(반증 B1 가드).
      const cutMark = state.ktxViewMs;
      schedule(() => {
        if (state.mode === "ktx" && state.ktx && !state.ktxPicking &&
          state.ktxViewMs === cutMark && state.ktxView !== "cab") {
          state.ktxView = "cab";
          updateKtxScene(state.ktxScene, state.ktx, "cab", [], state.ktxHeld);
        }
      }, 900);
      if (!event.auto) {
        audio.cancel();
        void audio.playPrompt("srt-depart");
      }
    } else if (event.type === "branch-open") {
      audio.playSfx("bell");
      showHint("하늘에서 봐요! ← 목포, → 부산 — ⎵ 로 정해요");
    } else if (event.type === "route-chosen") {
      audio.playSfx("jingle");
      const label = event.route === "mokpo" ? "목포" : "부산";
      showHint(`${label} 쪽으로 가요! ↑ 를 꾹 눌러 출발!`);
    } else if (event.type === "door-countdown-start") {
      showHint("다 탔어요! 문이 곧 닫혀요~ (⎵ 로 바로 닫기)");
    } else if (event.type === "door-countdown") {
      audio.playSfx("key");
      showHint(`문 닫혀요! ${event.secondsLeft}!`);
    } else if (event.type === "milestone") {
      audio.playSfx("pop");
      if (event.speed <= 150) {
        audio.cancel();
        void audio.playAnswer(event.speed);
      } else if (event.speed === 300) {
        audio.playSfx("win");
        showHint("삼백!! 최고 속도예요!!");
      }
    } else if (event.type === "event") {
      const hint = KTX_EVENT_HINTS[event.event];
      if (hint) showHint(hint);
    } else if (event.type === "zone-enter") {
      audio.playSfx("bell");
      showHint(`${event.station}역이 보여요! 천천히, 천천히~`);
    } else if (event.type === "armed") {
      audio.playSfx("key");
      showHint("✋ 노란 불이에요! ⎵ 눌러서 딱 멈추기!");
    } else if (event.type === "early-stop") {
      showHint("조금만 더 가서 멈춰요~");
    } else if (event.type === "overrun") {
      audio.playSfx("pop");
      showHint("어이쿠~ 살짝 지나쳤어요! 뒤로 통통~");
    } else if (event.type === "stopped") {
      audio.playSfx("win");
      state.ktxView = "side";      // 도착 컷: 승강장의 친구들이 보인다
      const starText = "⭐".repeat(event.stars);
      showHint(event.stars === 3
        ? `${starText} 딱 멈췄어요! 최고, 기관사님!`
        : `${starText} ${event.station}역이에요! ⎵ 눌러서 문 열기`);
      const voiceKey = SRT_STATION_VOICES[event.station];
      if (voiceKey) {
        audio.cancel();
        void audio.playPrompt(voiceKey);
      }
    } else if (event.type === "doors-open") {
      audio.playSfx("door");
      showHint("친구들이 기다려요! ⎵ 한 명씩 태워요");
    } else if (event.type === "horn") {
      audio.playSfx("horn");
    } else if (event.type === "hint") {
      const words = {
        board: "⎵ 눌러서 태워 볼까?",
        "close-doors": "⎵ 눌러서 문을 닫아요",
        "open-doors": "⎵ 눌러서 문을 열어요",
        branch: "← → 로 길을 골라 볼까요?",
        depart: "↑ 를 꾹 눌러 볼까요?",
        go: "↑ 를 눌러 다시 출발해요"
      };
      if (words[event.what]) showHint(words[event.what]);
    } else if (event.type === "auto") {
      if (event.what === "creep") showHint("같이 가 볼까요? 칙칙폭폭~");
      if (event.what === "doors-open") showHint("문이 열려요! 친구들을 태워요");
    } else if (event.type === "auto-board-start") {
      showHint("같이 태워 볼게요! 하나, 둘~");
    } else if (event.type === "finale") {
      void completeKtxJourney(event);
    }
  }
  void journey;
}

function completeKtxJourney(event) {
  const totalStars = event.stars.reduce((sum, count) => sum + count, 0);
  state.stars += totalStars;
  dom.stars.textContent = String(state.stars);
  const fresh = recordMetFriends(event.boarded);
  const finalStation = state.ktx?.station ?? "부산";
  audio.playSfx("win");
  if (finalStation === "부산") {
    audio.cancel();
    void audio.playPrompt("srt-station-busan");
  }
  showHint(event.perfect
    ? "⭐ 퍼펙트 기관사! 별을 다 모았어요!"
    : fresh.length > 0
      ? `처음 만난 친구가 ${fresh.length}명 있어요!`
      : "고마워요, 기관사님!");
  schedule(() => {
    dom.cheer.textContent = event.perfect
      ? "⭐ 퍼펙트 기관사! ⭐"
      : `🚄 ${finalStation} 도착! 별 ${totalStars}개`;
    dom.cheer.classList.add("show");
    schedule(() => {
      dom.cheer.classList.remove("show");
      goHome();
    }, 2400);
  }, 2600);
}

function scheduleKtxTick() {
  schedule(() => {
    if (state.phase !== "playing" || state.mode !== "ktx" || !state.ktx) {
      return;
    }
    const nowMs = performance.now();
    const elapsed = Math.min(400, nowMs - (state.ktxTickMs || nowMs));
    state.ktxTickMs = nowMs;
    const result = tickKtx(state.ktx, state.ktxHeld, elapsed);
    state.ktx = result.state;
    handleKtxEvents(result.events);
    if (state.ktx) {
      updateKtxScene(state.ktxScene, state.ktx, state.ktxView, result.events,
        state.ktxHeld);
    }
    scheduleKtxTick();
  }, 150);
}

function moveKtxSpace() {
  if (state.phase !== "playing" || !state.ktx) return;
  // 판정 공정성: 누른 순간까지의 실측 경과를 먼저 시뮬에 반영한다
  const nowMs = performance.now();
  const elapsed = Math.min(400, nowMs - (state.ktxTickMs || nowMs));
  state.ktxTickMs = nowMs;
  const ticked = tickKtx(state.ktx, state.ktxHeld, elapsed);
  state.ktx = ticked.state;
  handleKtxEvents(ticked.events);
  const pressed = pressKtxSpace(state.ktx);
  state.ktx = pressed.state;
  handleKtxEvents(pressed.events);
  if (state.ktx) {
    updateKtxScene(state.ktxScene, state.ktx, state.ktxView,
      [...ticked.events, ...pressed.events], state.ktxHeld);
  }
}

function switchKtxView(view) {
  if (!state.ktx || state.ktxView === view) {
    audio.playSfx("key");
    return;
  }
  const nowMs = performance.now();
  if (nowMs - state.ktxViewMs < 400) return;  // 쿨다운 — 플리커 방지
  state.ktxViewMs = nowMs;
  state.ktxView = view;
  audio.playSfx("key");
  updateKtxScene(state.ktxScene, state.ktx, view, [], state.ktxHeld);
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

function scheduleSubwayTick() {
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
    // state.subwayTickMs is the single clock shared with moveSubway, so a
    // keypress between ticks is never counted twice. The 400ms cap guards
    // backgrounded tabs, except during the hop, whose phase is periodic and
    // must track the CSS-animated marker.
    const elapsed = nowMs - (state.subwayTickMs || nowMs);
    state.subway = advanceSubwayWorld(
      state.subway,
      state.subway.phase === "arriving" ? elapsed : Math.min(400, elapsed)
    );
    if (previous.phase === "platform" && state.subway.phase === "platform" &&
      previous.platform.stage !== "stopped" &&
      state.subway.platform.stage === "stopped") {
      audio.playSfx("door");
      showHint(`${state.subway.line}호선 열차예요! ⎵ 키로 타요`);
    }
    maybeSubwayDoorCue();
    state.subwayTickMs = nowMs;
    updateSubwayJourney(state.subwayScene, state.subway);
    scheduleSubwayTick();
  }, 150);
}

function maybeSubwayDoorCue() {
  if (
    state.subway?.phase === "arriving" &&
    state.subway.arriving?.stage === "hop" &&
    !state.subwayDoorCue
  ) {
    state.subwayDoorCue = true;
    audio.playSfx("door");
    showHint("문이 열렸어요! 빨간 불이 노란 칸에 올 때 ⎵로 폴짝!");
  }
}

function prefersReducedMotion() {
  return typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function moveSubway(direction) {
  if (
    state.phase !== "playing" ||
    state.mode !== "subway" ||
    !state.subway
  ) {
    return;
  }
  if (state.subway.phase === "arriving" && state.subwayTickMs) {
    // Sync the marker to the wall clock before judging the jump, so the
    // judgement matches what the CSS-animated marker is showing.
    const nowMs = performance.now();
    state.subway = advanceSubwayWorld(state.subway, nowMs - state.subwayTickMs);
    state.subwayTickMs = nowMs;
    maybeSubwayDoorCue();
  }
  const result = attemptSubwayMove(state.subway, direction, {
    assist: prefersReducedMotion()
  });
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
  } else if (event.type === "departed") {
    // A held arrow must not ride straight through stations: the hold is
    // absorbed at each arrival and a fresh press is needed to continue.
    state.subwayHoldBlock = true;
    const compass = subwayCompass(state.subway);
    // 역 이름 안내는 그 역에 실제로 섰을 때만 튼다. 전에는 목적지 한 정거장
    // 앞에서 내릴 역 이름을 미리 틀어서, 아이가 엉뚱한 역에서 그 이름을 들었다.
    audio.cancel();
    if (event.atDest) {
      audio.playSfx("door");
      showHint(`⭐ ${stationLabel(event.station)}이에요! ⎵ 눌러서 내려요`);
      playStationSound(event.station, "subway-stop-check");
    } else if (compass?.hopsToAlight === 0) {
      audio.playSfx("door");
      showHint(`🔔 ${stationLabel(event.station)}이에요! ⎵ 눌러서 갈아타요`);
      playStationSound(event.station, "subway-transfer");
    } else if (compass?.hopsToAlight === 1) {
      showHint(
        `${stationLabel(event.station)} — 다음 ${compass.alightAt}에서 내려요!`
      );
      playStationSound(event.station);
    } else {
      showHint(
        `${stationLabel(event.station)} — ${compass?.alightAt ?? "목적지"}까지 ` +
        `${compass?.hopsToAlight ?? "?"}정거장`
      );
      playStationSound(event.station);
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
    const cue = subwayArrivingCue(event.kind, state.subway.travelSide);
    state.subwayDoorCue = event.kind === "transfer";
    // 목적지는 멜로디 뒤 발빠짐 안내, 환승은 음악 없이 안내부터 튼다.
    playSubwayReal(cue.realKey, cue.fallback, cue.nextKey);
    audio.playSfx(cue.sfx);
    showHint(cue.hint);
  } else if (event.type === "hop-miss") {
    audio.playSfx("pop");
    showHint("아직! 표시가 가운데 노란 칸에 올 때 ⎵");
  } else if (event.type === "hop-wait") {
    showHint("⎵ 스페이스로 폴짝 뛰어 내려요!");
  } else if (event.type === "blocked-person") {
    audio.playSfx("pop");
    showHint("\"실례합니다!\" 한 번 더 누르면 비켜줘요");
  } else if (event.type === "alighted") {
    audio.playSfx("win");
    const hunt = createPhotoHunt(state.subway.place.id);
    if (hunt) {
      // 도착지에서 바로 끝내지 않는다 — 사진 한 장 찍고 간다.
      state.subway.photo = hunt;
      state.subway.album = loadAlbum();
      updateSubwayJourney(state.subwayScene, state.subway);
      showHint(`${state.subway.place.label}이에요! 방향키로 찾아 ⎵ 찰칵`);
    } else if (isFamilyJourney(state.subway)) {
      showHint("가족이 모두 마중 나왔어요!");
      schedule(completeFamilyJourney, 2600);
    } else {
      showHint(`${state.subway.place.label}에 도착했어요!`);
      schedule(() => {
        void completeSubwayJourney();
      }, 2600);
    }
  }
}

function completeFamilyJourney() {
  setPhase("celebrating");
  clearTimers();
  audio.cancel();
  state.streak.subway += 1;
  state.stars += 1;
  dom.stars.textContent = String(state.stars);
  dom.cheer.textContent =
    `⭐ 도하네 집 도착! 환승 ${state.subway.transfersUsed}번 · 가족 모두 만났어요`;
  dom.cheer.classList.add("show");
  audio.playSfx("win");
  // schedule은 타이머 id를 돌려준다. await 하면 그 자리에서 지나가 버려서
  // 축하 화면이 한 순간도 보이지 않는다.
  schedule(() => {
    dom.cheer.classList.remove("show");
    state.subway = null;
    state.subwayScene = null;
    goHome();
  }, 2600);
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
  state.ktx = null;
  state.ktxScene = null;
  state.ktxPicking = false;
  if (mode === "safety") {
    startSafetyRoute();
  } else if (mode === "subway") {
    state.safety = null;
    state.safetyView = null;
    startSubwayJourney();
  } else if (mode === "ktx") {
    state.safety = null;
    state.safetyView = null;
    startKtxPicker();
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
  state.ktx = null;
  state.ktxScene = null;
  state.ktxPicking = false;
  state.ktxHeld = { up: false, down: false };
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
document.addEventListener("keyup", event => {
  if (state.mode !== "ktx" || !state.ktx) return;
  if (event.key === "ArrowUp") {
    state.ktxHeld = { ...state.ktxHeld, up: false };
  } else if (event.key === "ArrowDown") {
    state.ktxHeld = { ...state.ktxHeld, down: false };
  } else {
    return;
  }
  // 레버 0-지연 반응 — 다음 틱을 기다리지 않는다
  if (state.ktxScene) {
    updateKtxScene(state.ktxScene, state.ktx, state.ktxView, [], state.ktxHeld);
  }
});

dom.stage.addEventListener("click", event => {
  const branchChoice = event.target.closest(".ktx-branch-choice");
  if (branchChoice && state.mode === "ktx" && state.ktx?.phase === "branch") {
    const picked = selectKtxRoute(state.ktx, branchChoice.dataset.route);
    state.ktx = picked.state;
    audio.playSfx("key");
    updateKtxScene(state.ktxScene, state.ktx, state.ktxView, picked.events,
      state.ktxHeld);
    return;
  }
  const trainCard = event.target.closest("[data-train-id]");
  if (trainCard && state.mode === "ktx" && state.ktxPicking) {
    audio.playSfx("key");
    startKtxJourney(trainCard.dataset.trainId);
    return;
  }
  const bonusCard = event.target.closest('[data-bonus="family"]');
  if (bonusCard && state.mode === "subway" && state.subwayChoosing) {
    audio.playSfx("key");
    startFamilyLine();
    return;
  }
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

  // 목적지 열 곳이 숫자키를 다 써서 보너스는 스페이스바로 들어간다.
  if (
    state.phase === "playing" && state.mode === "subway" &&
    state.subwayChoosing && (event.key === " " || event.key === "Spacebar")
  ) {
    event.preventDefault();
    if (!event.repeat) {
      audio.playSfx("key");
      startFamilyLine();
    }
    return;
  }

  // 기관사 게임 — 열차 고르기와 운전이 키를 먼저 가져간다.
  if (state.phase === "playing" && state.mode === "ktx") {
    if (state.ktxPicking) {
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (!event.repeat) {
          const delta = event.key === "ArrowRight" ? 1 : -1;
          state.ktxPickIndex =
            (state.ktxPickIndex + delta + KTX_TRAINS.length) % KTX_TRAINS.length;
          movePickerSelection(state.ktxScene, state.ktxPickIndex);
          audio.playSfx("key");
        }
        return;
      }
      if (event.key === " " || event.key === "Spacebar" || event.key === "Enter") {
        event.preventDefault();
        if (!event.repeat) {
          startKtxJourney(KTX_TRAINS[state.ktxPickIndex].id);
        }
        return;
      }
      return;
    }
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (!event.repeat) moveKtxSpace();
      return;
    }
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault();
      if (!event.repeat) {
        state.ktxHeld = {
          ...state.ktxHeld,
          [event.key === "ArrowUp" ? "up" : "down"]: true
        };
        if (state.ktx && state.ktxScene) {
          updateKtxScene(state.ktxScene, state.ktx, state.ktxView, [],
            state.ktxHeld);
        }
      }
      return;
    }
    if (event.key === "1" || event.key === "3") {
      event.preventDefault();
      if (!event.repeat) switchKtxView(event.key === "1" ? "cab" : "side");
      return;
    }
    if (/^[0-9]$/.test(event.key)) {
      event.preventDefault();
      if (!event.repeat) audio.playSfx("pop");
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (event.repeat) return;
      if (state.ktx?.phase === "branch") {
        const routeId = event.key === "ArrowLeft" ? "mokpo" : "busan";
        const picked = selectKtxRoute(state.ktx, routeId);
        state.ktx = picked.state;
        if (picked.events.length > 0) audio.playSfx("key");
        updateKtxScene(state.ktxScene, state.ktx, state.ktxView, picked.events,
          state.ktxHeld);
        return;
      }
      audio.playSfx("pop");
      return;
    }
  }

  // 사진 찍는 동안에는 사진 쪽이 방향키와 스페이스바를 먼저 가져간다.
  if (
    state.phase === "playing" && state.mode === "subway" &&
    state.subway?.photo && !state.subway.photo.taken
  ) {
    if (event.key === " " || event.key === "Spacebar") {
      event.preventDefault();
      if (!event.repeat) movePhoto("space");
      return;
    }
    const photoDirection = directionForKey(event.key);
    if (photoDirection) {
      event.preventDefault();
      if (!event.repeat) movePhoto(photoDirection);
      return;
    }
  }

  if (state.phase === "playing" && state.mode === "subway" && state.subway) {
    if (event.key === " " || event.key === "Spacebar") {
      // every subway phase owns the spacebar — it must never scroll the page
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
        if (state.subwayHoldBlock) return;
        const now = performance.now();
        if (now - state.subwayWalkMs < WALK_REPEAT_MS) return;
        state.subwayWalkMs = now;
      } else {
        state.subwayHoldBlock = false;
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

  // 홈에서 ←/→ 는 카드 사이를 오간다 — 숫자키 없는 7번 카드의 1차 진입로.
  if (
    state.phase === "home" &&
    ["ArrowLeft", "ArrowRight"].includes(event.key) &&
    !difficultyControls.includes(document.activeElement)
  ) {
    event.preventDefault();
    const cards = modeControls.filter(card => !card.disabled);
    const current = cards.indexOf(document.activeElement);
    const offset = event.key === "ArrowRight" ? 1 : -1;
    const next = current === -1
      ? (offset === 1 ? 0 : cards.length - 1)
      : (current + offset + cards.length) % cards.length;
    cards[next]?.focus();
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
      chooseSubwayLineInput(lineForKey(digit));
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
