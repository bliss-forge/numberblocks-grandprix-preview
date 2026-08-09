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

export function subwayArrivingCue(kind, travelSide) {
  if (kind === "transfer") {
    return {
      realKey: "mind-gap",
      fallback: "subway-mind-gap",
      nextKey: null,
      sfx: "door",
      hint: "환승역이에요! 빨간 표시가 노란 칸에 올 때 ⎵!"
    };
  }
  return {
    realKey: travelSide === "back"
      ? "arrive-melody-up"
      : "arrive-melody-down",
    fallback: null,
    nextKey: "mind-gap",
    sfx: "win",
    hint: "도착 멜로디가 나와요! 곧 문이 열려요"
  };
}

export function ktxBoosterCue(event) {
  if (event?.type === "boost-start") {
    // 목표는 발동 시점 속도 +200 — 300에서 켜야 500에 닿는다.
    const target = Number.isFinite(event.target) ? Math.round(event.target) : null;
    return {
      sfx: "win",
      hint: target
        ? `🚄 부스터! 쭉쭉 밀어서 ${target}까지!`
        : "🚄 부스터! 쭉쭉 밀어요!"
    };
  }
  if (event?.type === "boost-unavailable") {
    const remainingMs = Number.isFinite(event.remainingMs)
      ? Math.max(0, event.remainingMs)
      : 0;
    return {
      sfx: "key",
      hint: `충전 중이에요! ${Math.ceil(remainingMs / 1000)}초`
    };
  }
  if (event?.type === "boost-end") {
    return { sfx: "pop", hint: "부스터 끝! 안전 운전해요" };
  }
  if (event?.type === "boost-ready") {
    return { sfx: "key", hint: "부스터 준비 완료!" };
  }
  return null;
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
    !Number.isInteger(number) ||
    number < 1 ||
    number > 150 ||
    !["problem", "celebration"].includes(scene) ||
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

// 안전 안내 음성 게이트 — 같은 문장을 취소·재생으로 잘라 먹지 않는다.
// 감사(2026-08-06): 방향키를 누르고 있거나 연타하면 막힐 때마다 같은 mp3를
// 새로 틀어서 문장이 0.15초만 반복됐다. 재생 중인 키와 같으면 건너뛰고,
// 안내 없는 이동(cueKey 없음)은 상황이 바뀐 것이므로 잠금을 푼다.
export function nextSafetyVoice(playingKey, cueKey) {
  if (!cueKey) return { play: false, playingKey: null };
  if (playingKey === cueKey) return { play: false, playingKey };
  return { play: true, playingKey: cueKey };
}
