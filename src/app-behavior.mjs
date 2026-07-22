import { operatorFor } from "./problem-scene.mjs";

export function playPromptCue(audio, promptKey) {
  const playback = audio.playPrompt(promptKey);
  audio.playSfx("pop");
  return playback;
}

export function playRetryCue(audio, retryKey) {
  void audio.playVoice(retryKey);
  audio.playSfx("wrong");
}

export function retireAnimationClass(node, className) {
  node.addEventListener(
    "animationend",
    () => node.classList.remove(className),
    { once: true }
  );
}

export function focusPhase(phase, { game, homeControl }) {
  const target = phase === "home" ? homeControl : game;
  target?.focus({ preventScroll: true });
}

export function characterSizeBand(number) {
  if (number >= 101) return "scale-180";
  if (number >= 51) return "scale-160";
  if (number >= 21) return "scale-140";
  if (number >= 11) return "scale-120";
  return "base";
}

export function formatProblemText(problem) {
  if (problem.mode === "count") return "블록이 몇 개일까요?";
  const [left, right] = problem.operands;
  const operation = { add: "더하기", sub: "빼기", mul: "곱하기" }[problem.mode];
  return `${left} ${operation} ${right}의 답은 얼마일까요?`;
}

export function quantityParts(number) {
  return {
    tens: Math.floor(number / 10),
    ones: number % 10
  };
}

export function formatCountHint(number) {
  const { tens, ones } = quantityParts(number);
  if (tens === 0) return "블록을 하나씩 짚어 보세요.";
  if (ones === 0) return `10개 묶음이 ${tens}개예요.`;
  return `10개 묶음 ${tens}개와 낱개 ${ones}개예요.`;
}

export function celebrationView(_mode, answer) {
  return Number.isInteger(answer) && answer >= 1 && answer <= 150
    ? "number"
    : "result-board";
}

export function celebrationPresentation(problem) {
  const view = celebrationView(problem.mode, problem.answer);
  return {
    view,
    characterNumber: view === "number" ? problem.answer : null,
    equation: problem.mode === "count"
      ? null
      : `${problem.operands[0]} ${operatorFor(problem.mode)} ${problem.operands[1]} = ${problem.answer}`
  };
}
