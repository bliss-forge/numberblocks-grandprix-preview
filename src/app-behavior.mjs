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

export function formatProblemText(problem) {
  if (problem.mode === "count") return "블록이 몇 개일까요?";
  const [left, right] = problem.operands;
  const operation = problem.mode === "add" ? "더하기" : "곱하기";
  return `${left} ${operation} ${right}의 답은 얼마일까요?`;
}
