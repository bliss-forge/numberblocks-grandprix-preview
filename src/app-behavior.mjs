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

const NUMBER_SCALE_BY_BAND = Object.freeze({
  base: 1,
  "scale-120": 1.2,
  "scale-140": 1.4,
  "scale-160": 1.6,
  "scale-180": 1.8
});

export function characterNumberScale(number) {
  return NUMBER_SCALE_BY_BAND[characterSizeBand(number)] ?? 1;
}

export function characterSceneAreaTarget(number, scene) {
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    number > 150 ||
    !["problem", "celebration"].includes(scene) ||
    number <= 10
  ) {
    return 1;
  }

  const problemTarget =
    number >= 101 ? 2.1 :
      number >= 51 ? 1.9 :
        number >= 21 ? 1.7 :
          1.5;
  return scene === "celebration" ? problemTarget * 1.4 : problemTarget;
}

const SHAPE_REFERENCE_DENSITY = 2 / 3;
const MAX_SHAPE_SCALE = 1.75;

export function characterShapeScale(number, rows, cols) {
  if (
    !Number.isInteger(number) ||
    !Number.isInteger(rows) ||
    !Number.isInteger(cols) ||
    number <= 10 ||
    rows <= 0 ||
    cols <= 0
  ) {
    return 1;
  }

  const longestSide = Math.max(rows, cols);
  const density = number / (longestSide ** 2);
  const scale = Math.sqrt(SHAPE_REFERENCE_DENSITY / density);
  if (!Number.isFinite(scale)) return 1;
  return Math.min(MAX_SHAPE_SCALE, Math.max(1, scale));
}

export function characterShapeWidthScale(number, rows, cols) {
  const shapeScale = characterShapeScale(number, rows, cols);
  return 1 + (shapeScale - 1) * 0.5;
}

export function characterSceneScale({
  number,
  scene,
  rows,
  cols,
  metric,
  referenceArea
}) {
  if (
    !metric ||
    !Number.isFinite(metric.area) ||
    metric.area <= 0 ||
    !Number.isFinite(referenceArea) ||
    referenceArea <= 0 ||
    number <= 10
  ) {
    return 1;
  }

  const baseScale =
    characterNumberScale(number) * characterShapeScale(number, rows, cols);
  const widthScale = characterShapeWidthScale(number, rows, cols);
  const existingArea = metric.area * (baseScale ** 2) * widthScale;
  const targetArea =
    referenceArea * characterSceneAreaTarget(number, scene);
  const scale = Math.sqrt(targetArea / existingArea);
  return Number.isFinite(scale) ? Math.max(1, scale) : 1;
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
