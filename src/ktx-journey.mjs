// 칙칙폭폭 기관사 — 순수 주행 시뮬. DOM 0줄.
//
// 상태는 불변 갱신, 시간은 호출자가 실측 elapsed(ms)로 넣는다(150ms 틱이지만
// 판정 정밀도는 키 입력 시점에 호출자가 벽시계로 재동기해 tick을 먼저 돌리는
// 것으로 확보한다 — 지하철 폴짝 판정과 같은 방식).
//
// 난이도의 심장(설계 v2 §4): 어시스트 봉투 clamp(12·√d, 35, 300)의 바닥
// 35km/h 덕분에 ↑만 잡고 있으면 반드시 오버런하고, Space 타이밍만이 별을
// 결정한다. 어떤 입력 시퀀스여도(빈 시퀀스 포함) 유한 시간 안에 부산에
// 닿는다 — 이 불변식은 테스트로 고정한다.

import {
  ACCEL_KMH_PER_S,
  ARM_DISTANCE,
  BRAKE_KMH_PER_S,
  ENVELOPE_FLOOR,
  KTX_SEGMENTS,
  KTX_RANDOM_EVENTS,
  KTX_STATIONS,
  KTX_TRAINS,
  MARKER_FROM_ZONE,
  MAX_SPEED,
  SPEED_MILESTONES,
  STAR2_WINDOW,
  STAR3_WINDOW,
  STOP_DECEL,
  ZONE_LENGTH,
  envelopeSpeed,
  mulberry,
  segmentBand
} from "./ktx-route-data.mjs";
import { buildPassengerManifest } from "./ktx-passengers.mjs";

export const HINT_IDLE_MS = 6000;      // 6초 무진행 → 그림 힌트
export const ASSIST_IDLE_MS = 12000;   // 12초 무진행 → 자동 어시스트
export const BOARD_HINT_MS = 5500;     // 탑승 힌트
export const AUTO_BOARD_MS = 10000;    // 자동 탑승 개시
export const AUTO_BOARD_GAP_MS = 1100; // 자동 탑승 간격 — 수사 음성과 안 겹치게
export const BOARD_LOCK_MS = 1200;     // 마지막 승객 후 합계 연출 잠금
export const ASSIST_TARGET = 80;       // 자동 크리프 목표 속도
export const CORRECT_SPEED = 22;       // 오버런 복귀 후진 속도
export const BASELINE_RESPONSES = Object.freeze(["magpie", "scarecrow", "wave"]);

function segment(state) {
  return KTX_SEGMENTS[state.segIndex];
}

function markerPosition(seg) {
  return seg.length - (ZONE_LENGTH - MARKER_FROM_ZONE);
}

// 시드로 이번 판의 랜덤 이벤트 1종을 뽑아 구간 일정에 끼워 넣는다.
function scheduleEvents(seed) {
  const random = mulberry(seed);
  const pick = KTX_RANDOM_EVENTS[Math.floor(random() * KTX_RANDOM_EVENTS.length)];
  const slot = pick.segments[Math.floor(random() * pick.segments.length)];
  return KTX_SEGMENTS.map((seg, index) => {
    const extra = index === slot
      ? [{ type: pick.type, at: pick.at, until: pick.until }]
      : [];
    return [...seg.events, ...extra];
  });
}

export function createKtxJourney(seed = 0, trainId = "srt") {
  const train = KTX_TRAINS.find(item => item.id === trainId) ?? KTX_TRAINS[0];
  const manifest = buildPassengerManifest(seed);
  return {
    seed,
    train,
    manifest,
    schedule: scheduleEvents(seed),
    segIndex: 0,
    station: KTX_STATIONS[0],
    phase: "boarding",           // 수서에서도 친구들이 탄다 — 첫 30초 안에 세기
    doors: "open",
    x: 0,
    v: 0,
    queue: manifest.stops[KTX_STATIONS[0]] ?? [],
    boarded: [],
    metThisStop: 0,
    stars: [],
    milestones: [],
    firedEvents: [],
    hornCounts: {},
    baselineIndex: 0,
    zoneEntered: false,
    armed: false,
    coached: false,
    stopTarget: null,
    pendingStars: 0,
    idleMs: 0,
    lockMs: 0,
    assist: false,
    autoBoard: false,
    done: false
  };
}

export function distanceToMarker(state) {
  return markerPosition(segment(state)) - state.x;
}

export function segmentProgress(state) {
  return Math.min(1, Math.max(0, state.x / segment(state).length));
}

export function currentBand(state) {
  if (state.phase === "driving" || state.phase === "stopping" ||
    state.phase === "correcting") {
    return segmentBand(segment(state), segmentProgress(state));
  }
  // 정차 중에는 다음 구간의 첫 밴드(승강장 조명은 씬이 밝게 처리)
  const seg = KTX_SEGMENTS[Math.min(state.segIndex, KTX_SEGMENTS.length - 1)];
  return segmentBand(seg, state.phase === "finale" ? 1 : 0);
}

export function activeEvent(state) {
  if (state.phase !== "driving") return null;
  const progress = segmentProgress(state);
  const events = state.schedule[state.segIndex];
  return events.find(event => progress >= event.at && progress <= event.until) ?? null;
}

// 남은 거리 게이지 5칸 (1인칭 계기판·설계 §6) — 5=멀다, 0=마커.
export function distanceGauge(state) {
  const d = distanceToMarker(state);
  if (!state.zoneEntered) return 5;
  return Math.max(0, Math.min(5, Math.ceil(d / 24)));
}

function starsFor(offset) {
  const away = Math.abs(offset);
  if (away <= STAR3_WINDOW) return 3;
  if (away <= STAR2_WINDOW) return 2;
  return 1;
}

function arriveStopped(state, stars, events, how) {
  const station = segment(state).to;
  const next = {
    ...state,
    phase: "stopped",
    v: 0,
    doors: "closed",
    station,
    // 다음에 몰 구간으로 넘어간다. 종착에서는 제자리(피날레 판정은 별 개수로).
    segIndex: Math.min(state.segIndex + 1, KTX_SEGMENTS.length - 1),
    stars: [...state.stars, stars],
    idleMs: 0,
    assist: false
  };
  events.push({ type: "stopped", station, stars, how });
  return next;
}

function openDoors(state, events) {
  const station = state.station;
  if (state.segIndex >= KTX_SEGMENTS.length - 1 &&
    state.stars.length === KTX_SEGMENTS.length) {
    // 종착 부산 — 전원 하차 피날레
    events.push({
      type: "finale",
      boarded: state.boarded,
      stars: state.stars,
      perfect: state.stars.every(count => count === 3)
    });
    return { ...state, phase: "finale", doors: "open", done: true, idleMs: 0 };
  }
  const queue = state.manifest.stops[station] ?? [];
  events.push({ type: "doors-open", station, waiting: queue.length });
  return {
    ...state,
    phase: "boarding",
    doors: "open",
    queue,
    metThisStop: 0,
    idleMs: 0,
    autoBoard: false,
    lockMs: 0
  };
}

function boardOne(state, events, auto = false) {
  const [number, ...rest] = state.queue;
  if (number === undefined) return state;
  const ordinal = state.metThisStop + 1;
  events.push({
    type: "boarded",
    number,
    ordinal,
    auto,
    guest: number === state.manifest.guest.number,
    remaining: rest.length
  });
  let next = {
    ...state,
    queue: rest,
    boarded: [...state.boarded, number],
    metThisStop: ordinal,
    idleMs: 0
  };
  if (rest.length === 0) {
    next = { ...next, lockMs: BOARD_LOCK_MS, autoBoard: false };
    events.push({ type: "all-aboard", count: ordinal, station: state.station });
  }
  return next;
}

function closeDoors(state, events) {
  events.push({ type: "doors-closed", next: segment(state).to });
  return { ...state, doors: "closed", phase: "ready", idleMs: 0 };
}

function depart(state, events, auto = false) {
  events.push({ type: "depart", to: segment(state).to, auto });
  return {
    ...state,
    phase: "driving",
    idleMs: 0,
    assist: auto,
    zoneEntered: false,
    armed: false,
    coached: false,
    milestones: [],
    firedEvents: [],
    hornCounts: {},
    x: 0,
    v: 0
  };
}

// Space — 문맥이 전부다. 주행 밖 경적, 존 안 딱 멈추기, 정차 중 문·탑승.
export function pressKtxSpace(state) {
  const events = [];
  if (state.done) return { state, events };

  if (state.phase === "boarding") {
    if (state.lockMs > 0) return { state, events }; // 합계 연출 중 잠금
    if (state.queue.length > 0) {
      return { state: boardOne(state, events), events };
    }
    return { state: closeDoors(state, events), events };
  }

  if (state.phase === "stopped") {
    return { state: openDoors(state, events), events };
  }

  if (state.phase !== "driving") return { state, events };

  if (!state.zoneEntered) {
    // 경적 — 눌러서 재미없는 순간 0 (베이스라인 보장 + 이벤트 3단 에스컬레이션)
    const event = activeEvent(state);
    if (event) {
      const count = (state.hornCounts[event.type] ?? 0) + 1;
      const level = ((count - 1) % 3) + 1;
      events.push({ type: "horn", response: event.type, level });
      return {
        state: { ...state, hornCounts: { ...state.hornCounts, [event.type]: count }, idleMs: 0 },
        events
      };
    }
    const response = BASELINE_RESPONSES[state.baselineIndex % BASELINE_RESPONSES.length];
    events.push({ type: "horn", response, level: 1 });
    return {
      state: { ...state, baselineIndex: state.baselineIndex + 1, idleMs: 0 },
      events
    };
  }

  const d = distanceToMarker(state);
  if (d > ARM_DISTANCE) {
    // 존 진입 후·무장 전의 성급한 입력 — 벌 대신 크리프 + 코칭(정차당 1회)
    events.push({ type: "early-stop", coached: state.coached });
    return {
      state: {
        ...state,
        v: Math.min(state.v, ENVELOPE_FLOOR),
        coached: true,
        idleMs: 0
      },
      events
    };
  }

  // 딱 멈추기 — keydown 시점의 (x, v)로 예측 정지점을 판정한다.
  // 무장 구간의 속도는 판정 속도 35로 수렴하지만 경계 틱에는 한 틱 지연이
  // 있다 — 판정은 항상 수렴 후 속도로 해서 press 창 2.0초를 경계에서도 보장.
  const effectiveV = Math.min(state.v, ENVELOPE_FLOOR);
  const metersPerSecond = effectiveV / 3.6;
  const slide = (metersPerSecond * metersPerSecond) / (2 * STOP_DECEL);
  const stopAt = state.x + slide;
  const offset = stopAt - markerPosition(segment(state));
  const stars = starsFor(offset);
  events.push({ type: "stopping", stars, offset });
  return {
    state: {
      ...state,
      v: effectiveV,
      phase: "stopping",
      stopTarget: stopAt,
      pendingStars: stars,
      idleMs: 0
    },
    events
  };
}

export function tickKtx(state, held = {}, elapsedMs = 150) {
  const events = [];
  if (state.done) return { state, events };
  let next = { ...state };
  const dt = elapsedMs / 1000;
  const anyInput = Boolean(held.up || held.down);
  next.idleMs = anyInput ? 0 : next.idleMs + elapsedMs;
  if (anyInput) next.assist = false;

  if (next.phase === "boarding") {
    if (next.lockMs > 0) {
      next.lockMs = Math.max(0, next.lockMs - elapsedMs);
      return { state: next, events };
    }
    if (next.queue.length > 0) {
      if (next.autoBoard) {
        next.autoTimer = (next.autoTimer ?? 0) + elapsedMs;
        if (next.autoTimer >= AUTO_BOARD_GAP_MS) {
          next.autoTimer = 0;
          next = boardOne(next, events, true);
        }
      } else if (next.idleMs >= AUTO_BOARD_MS) {
        next.autoBoard = true;
        next.autoTimer = 0;
        events.push({ type: "auto-board-start" });
      } else if (next.idleMs >= BOARD_HINT_MS && !next.boardHinted) {
        next.boardHinted = true;
        events.push({ type: "hint", what: "board" });
      }
    } else if (next.idleMs >= ASSIST_IDLE_MS) {
      next = closeDoors(next, events);
      events.push({ type: "auto", what: "doors-closed" });
    } else if (next.idleMs >= HINT_IDLE_MS && !next.closeHinted) {
      next.closeHinted = true;
      events.push({ type: "hint", what: "close-doors" });
    }
    return { state: next, events };
  }

  if (next.phase === "stopped") {
    if (next.idleMs >= ASSIST_IDLE_MS) {
      next = openDoors(next, events);
      events.push({ type: "auto", what: "doors-open" });
    } else if (next.idleMs >= HINT_IDLE_MS && !next.openHinted) {
      next.openHinted = true;
      events.push({ type: "hint", what: "open-doors" });
    }
    return { state: next, events };
  }

  if (next.phase === "ready") {
    if (held.up) {
      next = depart(next, events);
      next.boardHinted = false;
      next.closeHinted = false;
      next.openHinted = false;
    } else if (next.idleMs >= ASSIST_IDLE_MS) {
      next = depart(next, events, true);
    } else if (next.idleMs >= HINT_IDLE_MS && !next.departHinted) {
      next.departHinted = true;
      events.push({ type: "hint", what: "depart" });
    }
    return { state: next, events };
  }

  if (next.phase === "stopping") {
    // 스크립트된 정지 — 예측 지점에 정확히 선다
    next.v = Math.max(0, next.v - (STOP_DECEL * 3.6) * dt);
    next.x = Math.min(next.stopTarget, next.x + (next.v / 3.6) * dt);
    if (next.v <= 1 || next.x >= next.stopTarget) {
      next.x = next.stopTarget;
      return { state: arriveStopped(next, next.pendingStars, events, "press"), events };
    }
    return { state: next, events };
  }

  if (next.phase === "correcting") {
    // 오버런 복귀 — 통통 뒤로 물러나 마커에 선다. 별 1개 항상.
    const marker = markerPosition(segment(next));
    next.x = Math.max(marker, next.x - (CORRECT_SPEED / 3.6) * dt);
    if (next.x <= marker + 0.5) {
      next.x = marker;
      return { state: arriveStopped(next, 1, events, "corrected"), events };
    }
    return { state: next, events };
  }

  // phase === "driving"
  const vStart = state.v;
  if (held.up) next.v += ACCEL_KMH_PER_S * dt;
  else if (held.down) next.v -= BRAKE_KMH_PER_S * dt;
  else if (next.assist && next.v < ASSIST_TARGET) next.v += ACCEL_KMH_PER_S * dt;
  // 코스트 순항: 놓아도 감속하지 않는다(감쇠 0)

  next.v = Math.max(0, Math.min(MAX_SPEED, next.v));

  const marker = markerPosition(segment(next));
  const remaining = Math.max(0, marker - next.x);
  // 무장 구간(마커 40m 안)에서는 접근 속도를 판정 속도 35로 먼저 수렴시킨다 —
  // 그래야 ⭐⭐⭐ 실효 창이 press 기준 2.0초로 보장된다(협회 확정).
  const cap = remaining <= ARM_DISTANCE
    ? ENVELOPE_FLOOR
    : envelopeSpeed(remaining);
  if (next.v > cap) next.v = cap;
  // 봉투 바닥: 존에 들어온 열차는 35 밑으로 못 내려가 반드시 앞으로 간다 —
  // 어떤 입력이든 유한 시간 안에 정지 또는 오버런에 닿는 무스톨 보장.
  if (next.zoneEntered && next.v < ENVELOPE_FLOOR) next.v = ENVELOPE_FLOOR;

  const prevX = next.x;
  next.x += (next.v / 3.6) * dt;

  // 속도 마일스톤 — 구간당 각 1회
  for (const milestone of SPEED_MILESTONES) {
    if (vStart < milestone && next.v >= milestone &&
      !next.milestones.includes(milestone)) {
      next.milestones = [...next.milestones, milestone];
      events.push({ type: "milestone", speed: milestone });
    }
  }

  // 구간 이벤트 개시 알림
  const progress = next.x / segment(next).length;
  for (const scheduled of next.schedule[next.segIndex]) {
    if (progress >= scheduled.at && !next.firedEvents.includes(scheduled.type)) {
      next.firedEvents = [...next.firedEvents, scheduled.type];
      events.push({ type: "event", event: scheduled.type });
    }
  }

  // 밴드 경계 통과 → 배경 크로스페이드는 씬 몫, 여기서는 알림만
  const bandBefore = segmentBand(segment(next), Math.min(1, prevX / segment(next).length));
  const bandAfter = segmentBand(segment(next), Math.min(1, progress));
  if (bandBefore !== bandAfter) {
    events.push({ type: "band", sky: bandAfter.sky, land: bandAfter.land });
  }

  const zoneStart = segment(next).length - ZONE_LENGTH;
  if (!next.zoneEntered && next.x >= zoneStart) {
    next.zoneEntered = true;
    events.push({ type: "zone-enter", station: segment(next).to });
  }
  if (next.zoneEntered && !next.armed && marker - next.x <= ARM_DISTANCE) {
    next.armed = true;
    events.push({ type: "armed" });
  }

  if (next.x >= segment(next).length) {
    // 오버런 — 어이쿠~ 하고 물러난다. 벌은 없다.
    next.x = segment(next).length;
    next.phase = "correcting";
    events.push({ type: "overrun" });
    return { state: next, events };
  }

  // 구간 중간 정지 스톨 감시(v=0, 존 밖)
  if (next.v === 0 && !next.zoneEntered) {
    if (next.idleMs >= ASSIST_IDLE_MS && !next.assist) {
      next.assist = true;
      events.push({ type: "auto", what: "creep" });
    } else if (next.idleMs >= HINT_IDLE_MS && !next.stallHinted) {
      next.stallHinted = true;
      events.push({ type: "hint", what: "go" });
    }
  } else {
    next.stallHinted = false;
  }

  return { state: next, events };
}

// 다음 정차까지 남은 구간을 앱이 안내문에 쓰기 좋게.
export function ktxSummary(state) {
  return {
    station: state.station,
    nextStation: state.phase === "driving" || state.phase === "ready"
      ? segment(state).to
      : null,
    speed: Math.round(state.v),
    boardedCount: state.boarded.length,
    stars: state.stars.reduce((sum, count) => sum + count, 0),
    perfect: state.stars.length === KTX_SEGMENTS.length &&
      state.stars.every(count => count === 3)
  };
}
