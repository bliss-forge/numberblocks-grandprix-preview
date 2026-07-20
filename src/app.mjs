import {
  NUMBERBLOCKS,
  applyDigit,
  createProblem,
  isModeAvailable,
  problemKey
} from "./game-model.mjs";
import { AudioManager } from "./audio-manager.mjs";
import {
  loadDifficulty,
  saveDifficulty
} from "./difficulty-preference.mjs";
import {
  formatProblemText,
  focusPhase,
  playPromptCue,
  playRetryCue,
  retireAnimationClass
} from "./app-behavior.mjs";

const audio = new AudioManager();
const $ = id => document.getElementById(id);
const modeControls = [...document.querySelectorAll(".mode-card")];
const difficultyControls = [
  ...document.querySelectorAll(".difficulty-button")
];
const countControl = document.querySelector('[data-mode="count"]');
const countUnavailable = $("count-unavailable");

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
  cheer: $("big-cheer")
};

const state = {
  phase: "home",
  mode: null,
  difficulty: loadDifficulty(),
  problem: null,
  buffer: "",
  stars: 0,
  streak: { count: 0, add: 0, mul: 0 },
  wrongCount: 0,
  round: 0,
  hintTimer: 0,
  timers: new Map(),
  recentProblemKeys: []
};

function preloadCharacters() {
  Object.values(NUMBERBLOCKS).forEach(({ asset }) => {
    const image = new Image();
    image.src = `assets/characters/${asset}`;
  });
}

function character(number, className = "") {
  const image = document.createElement("img");
  image.className = `character enter ${className}`.trim();
  image.src = `assets/characters/${NUMBERBLOCKS[number].asset}`;
  image.alt = `숫자 ${number} 블록 캐릭터`;
  image.dataset.number = String(number);
  retireAnimationClass(image, "enter");
  return image;
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
    dom.stage.append(character(problem.answer));
    return;
  }

  if (problem.mode === "add") {
    dom.problem.textContent = formatProblemText(problem);
    const plus = document.createElement("span");
    plus.className = "operator";
    plus.textContent = "+";
    plus.setAttribute("aria-hidden", "true");
    dom.stage.append(
      character(problem.operands[0]),
      plus,
      character(problem.operands[1])
    );
    return;
  }

  dom.problem.textContent = formatProblemText(problem);
  const scene = document.createElement("div");
  scene.className = "multiplication-scene";

  const grid = document.createElement("div");
  grid.className = "multiplication-grid";
  grid.style.setProperty("--rows", problem.operands[0]);
  grid.style.setProperty("--cols", problem.operands[1]);
  grid.setAttribute(
    "aria-label",
    `${problem.operands[0]}줄에 ${problem.operands[1]}개씩 놓인 블록`
  );
  for (let index = 0; index < problem.answer; index += 1) {
    const block = document.createElement("i");
    block.setAttribute("aria-hidden", "true");
    grid.append(block);
  }

  const caption = document.createElement("div");
  caption.className = "multiplication-caption";
  caption.innerHTML = `<span>${problem.operands[0]} × ${problem.operands[1]}</span><small>모두 몇 개일까요?</small>`;
  scene.append(grid, caption);
  dom.stage.append(scene);
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

  if (state.mode === "add") {
    dom.stage.replaceChildren(character(state.problem.answer, "correct"));
  }

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
  showHint("괜찮아요! 천천히 다시 눌러 봐요.");
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

function startMode(mode) {
  if (!isModeAvailable(mode, state.difficulty)) {
    showHint("도전에서는 더하기와 곱하기를 해요.");
    return;
  }
  setMode(mode);
  newProblem();
  focusPhase(state.phase, {
    game: dom.game,
    homeControl: availableHomeControl()
  });
}

function goHome() {
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.problem = null;
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
    const difficulties = { 4: "easy", 5: "steady", 6: "challenge" };
    if (difficulties[digit]) {
      event.preventDefault();
      audio.playSfx("key");
      setDifficulty(difficulties[digit]);
      return;
    }

    const modes = { 1: "count", 2: "add", 3: "mul" };
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

syncMuteButton();
syncDifficulty();
preloadCharacters();
