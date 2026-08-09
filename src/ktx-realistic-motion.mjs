export const REALISTIC_PARALLAX = Object.freeze({
  sky: 0.01, far: 0.06, mid: 0.22, near: 0.85, track: 1
});

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const round = value => Number(value.toFixed(2));
const CAB_PERIOD = Object.freeze({ sleeper: 120, pole: 480 });
const STATION_PHASES = new Set(["stopped", "boarding", "ready", "branch", "finale"]);

export function realisticMotionFrame({ x, v, phase, markerDistance, land }) {
  const speedRatio = clamp(v / 300, 0, 1);
  const offsets = Object.fromEntries(Object.entries(REALISTIC_PARALLAX)
    .map(([name, ratio]) => [name, x * ratio]));
  const cab = Object.freeze({
    sleeperPhase: round(-(offsets.track % CAB_PERIOD.sleeper)),
    polePhase: round(-(offsets.near % CAB_PERIOD.pole)),
    groundRatio: round(speedRatio)
  });
  const atStation = STATION_PHASES.has(phase);
  const departing = phase === "driving" && markerDistance > 1200 && x >= 0 && x < 600;
  const approachProgress = clamp((600 - markerDistance) / 600, 0, 1);
  const stationProgress = atStation ? 1
    : departing ? clamp(1 - x / 600, 0, 1)
      : approachProgress;
  const stationStage = atStation ? "stopped"
    : departing ? "departure"
      : markerDistance <= 0 ? "stopped"
        : markerDistance <= 320 ? "detail"
          : markerDistance <= 600 ? "approach" : "hidden";
  return {
    speedRatio,
    moving: speedRatio > 0 && ["driving", "stopping", "correcting"].includes(phase),
    speedBand: speedRatio >= .8 ? "very-fast" : speedRatio >= .533 ? "fast"
      : speedRatio >= .267 ? "cruise" : speedRatio > 0 ? "slow" : "stopped",
    offsets,
    cab,
    stationStage,
    stationProgress: Number(stationProgress.toFixed(2)),
    departing,
    brakePitch: phase === "stopping" ? clamp(speedRatio * 1.8, 0, 1.8) : 0,
    blurPx: speedRatio < .533 ? 0 : Number(((speedRatio - .533) * 5.6).toFixed(2)),
    land
  };
}
