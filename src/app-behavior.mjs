export function playPromptCue(audio, promptKey) {
  void audio.playVoice(promptKey);
  audio.playSfx("pop");
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

export function formatProblemText(problem) {
  if (problem.mode === "count") return "블록이 몇 개일까요?";
  const [left, right] = problem.operands;
  const operation = problem.mode === "add" ? "더하기" : "곱하기";
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

export function celebrationView(mode, answer) {
  if (mode === "mul") return answer <= 9 ? "number" : "multiply-helper";
  if (mode === "add") return answer <= 10 ? "number" : "result-board";
  return "number";
}
