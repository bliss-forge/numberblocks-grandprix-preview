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
  createSafetyRouteState,
  findSafetyPath
} from "./safety-route-model.mjs";
import {
  acceptSafetyRepeat,
  directionForKey,
  safetyCueForEvent
} from "./safety-route-controller.mjs";
import { renderSafetyRouteScene } from "./safety-route-scene.mjs";
import {
  createGuidanceState,
  guidanceCells,
  recordGuidanceMove
} from "./safety-route-guidance.mjs";
import {
  cameraOffset,
  targetArrow
} from "./safety-route-camera.mjs";

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
  streak: { count: 0, add: 0, sub: 0, mul: 0, safety: 0 },
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
  state.safetyView.camera = {
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
  const cameraFrames = [];
  const scene = renderSafetyRouteScene(document, state.safety, {
    camera: state.safetyView.camera,
    cameraStart: animateCamera ? previousCamera : undefined,
    scheduleFrame: callback => cameraFrames.push(callback),
    guidance,
    targetArrow: targetArrow({
      viewport,
      camera: state.safetyView.camera,
      target
    })
  });
  dom.stage.replaceChildren(scene);
  cameraFrames.forEach(callback => requestAnimationFrame(callback));
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
    state.safety = advanceSafetyWorld(
      state.safety,
      Math.min(250, nowMs - previousMs)
    );
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
  state.safety = createSafetyRouteState(state.difficulty, { seed });
  const mobile = window.innerWidth <= 640;
  state.safetyView = {
    camera: {
      x: 0,
      y: Math.max(0, state.safety.map.height - 5),
      width: mobile ? 5 : 7,
      height: 5
    },
    cameraRendered: false,
    guidance: createGuidanceState(performance.now()),
    lastMoveAt: 0,
    heldDirection: null,
    holdTimer: 0
  };
  dom.cheer.classList.remove("show");
  dom.hint.className = "toast";
  dom.hint.textContent = "";
  setPhase("playing");
  renderSafetyRoute();
  void audio.playPrompt("safety-next-2");
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
  return safety?.map.friends.find(
    friend => friend.number === safety.nextFriend
  ) ?? safety?.map.goal ?? null;
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
  if (!state.safetyView) return;
  state.safetyView.heldDirection = direction;
  const event = moveSafetyRoute(direction);
  if (event?.type !== "moved") {
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
    void completeSafetyRoute();
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
  if (mode === "safety") {
    startSafetyRoute();
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
  button.setPointerCapture?.(event.pointerId);
  startSafetyHold(button.dataset.routeDirection);
});
dom.stage.addEventListener("click", event => {
  const button = event.target.closest("[data-route-direction]");
  if (!button || event.detail !== 0) return;
  moveSafetyRoute(button.dataset.routeDirection);
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

  if (
    state.phase === "playing" &&
    state.mode === "safety"
  ) {
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
        moveSafetyRoute(direction);
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
      5: "safety"
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
