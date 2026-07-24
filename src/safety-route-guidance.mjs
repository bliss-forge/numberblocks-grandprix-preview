import { findSafetyPath } from "./safety-route-model.mjs";

export function createGuidanceState(nowMs = 0) {
  return {
    lastValidMoveAt: nowMs,
    wrongCount: 0,
    visible: false
  };
}

export function recordGuidanceMove(
  state,
  { beforeDistance, afterDistance, blocked, nowMs }
) {
  if (!blocked && afterDistance < beforeDistance) {
    return createGuidanceState(nowMs);
  }

  const wrongCount =
    blocked || afterDistance > beforeDistance
      ? state.wrongCount + 1
      : state.wrongCount;
  return {
    ...state,
    lastValidMoveAt: blocked ? state.lastValidMoveAt : nowMs,
    wrongCount,
    visible: wrongCount >= 2
  };
}

export function guidanceCells(state, map, position, target, nowMs) {
  const visible =
    state.visible || nowMs - state.lastValidMoveAt >= 5000;
  if (!visible) return [];
  return findSafetyPath(map, position, target).slice(1, 4);
}
