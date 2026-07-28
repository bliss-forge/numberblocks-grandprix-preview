const PAUSE_DURATION_MS = 600;
const DEFAULT_INTERVAL_MS = 1000;

const samePoint = (left, right) => left && right && left.x === right.x && left.y === right.y;

function patrolInterval(definition) {
  return Number.isFinite(definition.intervalMs) && definition.intervalMs > 0
    ? definition.intervalMs
    : DEFAULT_INTERVAL_MS;
}

export function createPatrolMover(definition) {
  return {
    id: definition.id,
    type: definition.type,
    pathIndex: 0,
    direction: 1,
    elapsedMs: 0,
    pauseMs: 0,
    stopped: false,
    heading: definition.headings?.[0] ?? null
  };
}

export function moverPoint(map, mover) {
  return map.trafficPaths.find(item => item.id === mover.id)
    ?.points[mover.pathIndex] ?? null;
}

export function advancePatrolMover(definition, mover, { elapsedMs = 0, player } = {}) {
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const direction = mover.direction === -1 ? -1 : 1;
  const points = definition.points ?? [];
  if (points.length < 2) return { ...mover };

  if (mover.stopped) {
    const pauseMs = (mover.pauseMs ?? 0) + elapsed;
    if (pauseMs < PAUSE_DURATION_MS) {
      return { ...mover, elapsedMs: 0, pauseMs, stopped: true };
    }
    return {
      ...mover,
      direction: -direction,
      elapsedMs: 0,
      pauseMs: 0,
      stopped: false
    };
  }

  const accumulated = (mover.elapsedMs ?? 0) + elapsed;
  if (accumulated < patrolInterval(definition)) {
    return { ...mover, direction, elapsedMs: accumulated, pauseMs: 0, stopped: false };
  }

  let nextDirection = direction;
  let pathIndex = mover.pathIndex + nextDirection;
  if (pathIndex < 0 || pathIndex >= points.length) {
    nextDirection = -nextDirection;
    pathIndex = mover.pathIndex + nextDirection;
  }

  if (samePoint(points[pathIndex], player)) {
    return {
      ...mover,
      direction: nextDirection,
      elapsedMs: 0,
      pauseMs: 0,
      stopped: true
    };
  }

  return {
    ...mover,
    pathIndex,
    direction: nextDirection,
    elapsedMs: 0,
    pauseMs: 0,
    stopped: false
  };
}
