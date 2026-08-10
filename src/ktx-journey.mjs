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
  GOLD_WINDOW,
  KTX_SEGMENTS,
  KTX_RANDOM_EVENTS,
  KTX_ROUTES,
  KTX_ROUTE_STATIONS,
  KTX_STATIONS,
  KTX_TRAINS,
  MARKER_FROM_ZONE,
  MAX_SPEED,
  SLOW_CALM_RATIO,
  SLOW_WARN_DISTANCE,
  SLOW_WOBBLE_MAX,
  SLOW_WOBBLE_THROTTLE_MS,
  SLOW_ZONE_APPROACH_GUARD,
  SLOW_ZONE_AT_MAX,
  SLOW_ZONE_AT_MIN,
  SLOW_ZONE_LIMITS,
  SLOW_ZONE_PRESETS,
  SLOW_ZONE_SPAN,
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

export const BRANCH_STATION = "동탄";  // 분기역 — 문 닫힘 뒤 하늘 뷰 선택

export const HINT_IDLE_MS = 6000;      // 6초 무진행 → 그림 힌트
export const ASSIST_IDLE_MS = 12000;   // 12초 무진행 → 자동 어시스트
export const BOARD_HINT_MS = 5500;     // 탑승 힌트
export const AUTO_BOARD_MS = 10000;    // 자동 탑승 개시
export const AUTO_BOARD_GAP_MS = 1100; // 자동 탑승 간격 — 수사 음성과 안 겹치게
export const BOARD_LOCK_MS = 1200;     // 마지막 승객 후 합계 연출 잠금
export const DOOR_COUNTDOWN_MS = 6000; // 대기열 0 → 자동 문닫기 카운트다운(앞 3초는 감상 유예)
export const ASSIST_TARGET = 80;       // 자동 크리프 목표 속도
export const CORRECT_SPEED = 22;       // 오버런 복귀 후진 속도
// SRT 부스터 — 즉시 점프가 아니라 가속이다. 발동 시점 속도에 +200을 5초에
// 걸쳐 더하고(40km/h/s), 그동안만 300 제한이 풀린다. 300에서 켜야 500에
// 닿는 구조라 "언제 켤까"가 전략이 된다. 끝나면 초과분은 자연 감쇠로 복귀.
export const BOOST_SPEED = 500;          // 절대 상한
export const BOOST_GAIN = 200;           // 발동 시점 속도에 더해 주는 양
export const BOOST_ACCEL_KMH_PER_S = 40; // +200 ÷ 5초
export const BOOST_DECAY_KMH_PER_S = 45; // 종료 후 300 복귀 감쇠
export const BOOST_DURATION_MS = 5000;
export const BOOST_COOLDOWN_MS = 10000;
export const BASELINE_RESPONSES = Object.freeze(["magpie", "scarecrow", "wave"]);

function boostCounter(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function advanceBoostClock(state, elapsedMs, events) {
  let boostRemainingMs = boostCounter(state.boostRemainingMs);
  let boostCooldownMs = boostCounter(state.boostCooldownMs);
  let elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? elapsedMs : 0;
  const boostElapsedMs = Math.min(boostRemainingMs, elapsed);

  if (boostElapsedMs > 0) {
    boostRemainingMs -= boostElapsedMs;
    elapsed -= boostElapsedMs;
    if (boostRemainingMs === 0) {
      boostCooldownMs = BOOST_COOLDOWN_MS;
      events.push({ type: "boost-end", reason: "expired" });
    }
  }

  if (boostRemainingMs === 0 && boostCooldownMs > 0 && elapsed > 0) {
    const before = boostCooldownMs;
    boostCooldownMs = Math.max(0, boostCooldownMs - elapsed);
    if (before > 0 && boostCooldownMs === 0) {
      events.push({ type: "boost-ready" });
    }
  }

  return {
    state: { ...state, boostRemainingMs, boostCooldownMs },
    boostElapsedMs
  };
}

function segment(state) {
  return KTX_ROUTES[state.route ?? "busan"][state.segIndex];
}

export function routeSegments(state) {
  return KTX_ROUTES[state.route ?? "busan"];
}

export function routeStations(state) {
  return KTX_ROUTE_STATIONS[state.route ?? "busan"];
}

function markerPosition(seg) {
  return seg.length - (ZONE_LENGTH - MARKER_FROM_ZONE);
}

// 시드로 이번 판의 랜덤 이벤트 1종을 뽑아 구간 일정에 끼워 넣는다.
function scheduleEvents(seed, route = "busan") {
  const random = mulberry(seed);
  const pick = KTX_RANDOM_EVENTS[Math.floor(random() * KTX_RANDOM_EVENTS.length)];
  const slot = pick.segments[Math.floor(random() * pick.segments.length)];
  return KTX_ROUTES[route].map((seg, index) => {
    const extra = index === slot
      ? [{ type: pick.type, at: pick.at, until: pick.until }]
      : [];
    return [...seg.events, ...extra];
  });
}

// 서행 존 배치 — 주행 중반에 "↓로 속도를 맞추는" 두 번째 스킬 축(협회 게임
// 디자인). 0구간(sprint300 몫)과 접근 존을 피하고, 그 구간의 이벤트 창과
// 겹치면 안내 문구가 충돌하므로 비겹침 시작점만 고른다. 실패하면 그 구간은
// 존 없이 간다 — 배치가 안 되는 판이 있어도 게임은 그대로 성립한다.
function scheduleSlowZones(seed, route = "busan", difficulty = "steady") {
  const preset = SLOW_ZONE_PRESETS[difficulty] ?? SLOW_ZONE_PRESETS.steady;
  const random = mulberry(seed ^ 0x5157);   // 이벤트 뽑기와 시드 분리
  const segs = KTX_ROUTES[route];
  const schedule = scheduleEvents(seed, route);
  const zones = segs.map(() => null);
  const candidates = segs.map((_, index) => index).slice(1);

  for (let placed = 0; placed < preset.zones && candidates.length > 0;) {
    const segIndex = candidates.splice(
      Math.floor(random() * candidates.length), 1)[0];
    const atMax = Math.min(SLOW_ZONE_AT_MAX,
      1 - SLOW_ZONE_APPROACH_GUARD - SLOW_ZONE_SPAN);
    const grid = [];
    for (let at = SLOW_ZONE_AT_MIN; at <= atMax + 1e-9; at += 0.05) {
      grid.push(Number(at.toFixed(2)));
    }
    // 시드 셔플 후 첫 비겹침 시작점
    for (let i = grid.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [grid[i], grid[j]] = [grid[j], grid[i]];
    }
    const events = schedule[segIndex];
    const start = grid.find(at => events.every(event =>
      at + SLOW_ZONE_SPAN <= event.at || at >= event.until));
    if (start === undefined) continue;
    zones[segIndex] = {
      limit: SLOW_ZONE_LIMITS[Math.floor(random() * SLOW_ZONE_LIMITS.length)],
      grace: preset.grace,
      at: start,
      until: Number((start + SLOW_ZONE_SPAN).toFixed(2))
    };
    placed += 1;
  }
  return zones;
}

export function createKtxJourney(seed = 0, trainId = "srt", difficulty = "steady") {
  const train = KTX_TRAINS.find(item => item.id === trainId) ?? KTX_TRAINS[0];
  const manifest = buildPassengerManifest(seed);
  return {
    seed,
    train,
    difficulty: SLOW_ZONE_PRESETS[difficulty] ? difficulty : "steady",
    manifest,
    route: "busan",
    selectedRoute: "busan",
    routeChosen: false,
    schedule: scheduleEvents(seed),
    slowZones: scheduleSlowZones(seed, "busan", difficulty),
    slow: null,
    slowWarned: false,
    vAtZone: null,
    pendingGold: false,
    bonuses: [],
    segIndex: 0,
    station: KTX_STATIONS[0],
    phase: "boarding",           // 수서에서도 친구들이 탄다 — 첫 30초 안에 세기
    doors: "open",
    x: 0,
    v: 0,
    boostRemainingMs: 0,
    boostCooldownMs: 0,
    boostTarget: 0,
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
    doorCountdownMs: null,
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
  const segsAll = routeSegments(state);
  const seg = segsAll[Math.min(state.segIndex, segsAll.length - 1)];
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
  const preset = SLOW_ZONE_PRESETS[state.difficulty] ?? SLOW_ZONE_PRESETS.steady;
  // 부드러운 도착 — 존 진입 속도가 임계 이하면 봉투가 깎을 게 없었다는 뜻.
  // 스스로 미리 감속하는 "예측 제동"이 이 게임의 두 번째 정차 기술이다.
  const smooth = how === "press" && Number.isFinite(state.vAtZone) &&
    state.vAtZone <= preset.smoothEntry;
  const gold = how === "press" && state.pendingGold === true;
  let bonuses = state.bonuses;
  if (smooth) bonuses = [...bonuses, { type: "smooth", station }];
  if (gold) bonuses = [...bonuses, { type: "gold", station }];
  const next = {
    ...state,
    phase: "stopped",
    v: 0,
    doors: "closed",
    station,
    // 다음에 몰 구간으로 넘어간다. 종착에서는 제자리(피날레 판정은 별 개수로).
    segIndex: Math.min(state.segIndex + 1, routeSegments(state).length - 1),
    stars: [...state.stars, stars],
    bonuses,
    vAtZone: null,
    pendingGold: false,
    idleMs: 0,
    assist: false
  };
  events.push({ type: "stopped", station, stars, how, smooth, gold });
  return next;
}

function openDoors(state, events) {
  const station = state.station;
  const segs = routeSegments(state);
  if (state.segIndex >= segs.length - 1 &&
    state.stars.length === segs.length) {
    // 종착 부산 — 전원 하차 피날레
    events.push({
      type: "finale",
      boarded: state.boarded,
      stars: state.stars,
      bonuses: state.bonuses,
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
    lockMs: 0,
    doorCountdownMs: null
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
  // 동탄에서 아직 노선을 안 골랐으면 하늘(탑다운) 분기 선택으로 — 부산/목포.
  if (state.station === BRANCH_STATION && !state.routeChosen) {
    events.push({ type: "doors-closed", next: null });
    events.push({ type: "branch-open", selected: state.selectedRoute });
    return {
      ...state,
      doors: "closed",
      phase: "branch",
      idleMs: 0,
      doorCountdownMs: null
    };
  }
  events.push({ type: "doors-closed", next: segment(state).to });
  // doorCountdownMs 리셋을 여기서 — 안 하면 문 경고 램프가 주행 내내 점멸(반증 B4)
  return {
    ...state,
    doors: "closed",
    phase: "ready",
    idleMs: 0,
    doorCountdownMs: null
  };
}

// 분기 미리 선택(←/→) — branch 화면에서만.
export function selectKtxRoute(state, routeId) {
  if (state.phase !== "branch" || !KTX_ROUTES[routeId]) {
    return { state, events: [] };
  }
  if (state.selectedRoute === routeId) return { state, events: [] };
  return {
    state: { ...state, selectedRoute: routeId, idleMs: 0 },
    events: [{ type: "route-select", route: routeId }]
  };
}

// 분기 확정 — 노선·일정·승객 배정을 그 노선의 역 이름으로 다시 짠다.
// 같은 시드라 수서·동탄 몫(이미 태운 친구들)은 번호가 그대로다.
function confirmRoute(state, events) {
  const route = state.selectedRoute;
  const next = {
    ...state,
    route,
    routeChosen: true,
    phase: "ready",
    idleMs: 0,
    schedule: scheduleEvents(state.seed, route),
    slowZones: scheduleSlowZones(state.seed, route, state.difficulty),
    manifest: buildPassengerManifest(state.seed, KTX_ROUTE_STATIONS[route])
  };
  events.push({
    type: "route-chosen",
    route,
    next: KTX_ROUTES[route][next.segIndex].to
  });
  return next;
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
    slow: null,
    slowWarned: false,
    vAtZone: null,
    pendingGold: false,
    x: 0,
    v: 0
  };
}

// Space — SRT 일반 주행은 부스터, KTX는 경적. 존 안은 딱 멈추기,
// 정차 중에는 문·탑승으로 기존 문맥을 보존한다.
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

  if (state.phase === "branch") {
    return { state: confirmRoute(state, events), events };
  }

  if (state.phase !== "driving") return { state, events };

  if (!state.zoneEntered) {
    if (state.train.id === "srt") {
      const boostRemainingMs = boostCounter(state.boostRemainingMs);
      const boostCooldownMs = boostCounter(state.boostCooldownMs);
      const remainingMs = boostRemainingMs || boostCooldownMs;
      if (remainingMs > 0) {
        return {
          state: { ...state, boostRemainingMs, boostCooldownMs },
          events: [{ type: "boost-unavailable", remainingMs }]
        };
      }
      // 서행 예고~존 종료 사이에는 부스터를 재우지 않는다 — 벌이 아니라
      // 어포던스 게이팅. 500km/h 관성으로 서행을 스스로 망치는 함정 차단.
      const zone = state.slowZones?.[state.segIndex];
      if (zone) {
        const segLength = segment(state).length;
        const progress = state.x / segLength;
        // 램프 5초 + 감쇠 4초의 관성 거리(~1.1km)만큼 먼저 잠근다 — 예고선
        // 직전 발동이 452km/h로 존을 덮치는 우회가 실측됐다(협회 D).
        const guardAt = Math.max(0,
          zone.at - (SLOW_WARN_DISTANCE + 1100) / segLength);
        if (progress >= guardAt && progress < zone.until) {
          return {
            state,
            events: [{ type: "boost-unavailable", reason: "slow", remainingMs: 0 }]
          };
        }
      }
      const boostTarget = Math.min(state.v + BOOST_GAIN, BOOST_SPEED);
      return {
        state: {
          ...state,
          boostRemainingMs: BOOST_DURATION_MS,
          boostCooldownMs: 0,
          boostTarget,
          idleMs: 0
        },
        events: [{ type: "boost-start", target: boostTarget }]
      };
    }
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
  // 골드(±4m) — 도전 난이도 전용 연출 등급. 별 계약(±10/±25)은 불변이다.
  const gold = state.difficulty === "challenge" &&
    Math.abs(offset) <= GOLD_WINDOW;
  events.push({ type: "stopping", stars, offset, gold });
  return {
    state: {
      ...state,
      v: effectiveV,
      phase: "stopping",
      stopTarget: stopAt,
      pendingStars: stars,
      pendingGold: gold,
      idleMs: 0
    },
    events
  };
}

export function tickKtx(state, held = {}, elapsedMs = 150) {
  const events = [];
  if (state.done) return { state, events };
  const boostClock = advanceBoostClock(state, elapsedMs, events);
  let next = boostClock.state;
  const boostElapsedMs = state.phase === "driving" && state.train.id === "srt"
    ? boostClock.boostElapsedMs
    : 0;
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
    } else if (held.up) {
      // ↑ 지름길 — "타자마자 출발" 멘탈 모델. 다음 틱 ready에서 기존 로직이 출발.
      next = closeDoors(next, events);
    } else if (next.doorCountdownMs === null) {
      // 대기열 0 → 자동 카운트다운 시작. Space 함정(문 닫기용 추가 입력) 해소.
      next.doorCountdownMs = DOOR_COUNTDOWN_MS;
      events.push({ type: "door-countdown-start", ms: DOOR_COUNTDOWN_MS });
    } else {
      const before = Math.ceil(next.doorCountdownMs / 1000);
      next.doorCountdownMs = Math.max(0, next.doorCountdownMs - elapsedMs);
      const after = Math.ceil(next.doorCountdownMs / 1000);
      if (after < before && after >= 1 && after <= 3) {
        events.push({ type: "door-countdown", secondsLeft: after });
      }
      if (next.doorCountdownMs === 0) {
        next = closeDoors(next, events);
        events.push({ type: "auto", what: "doors-closed" });
      }
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

  if (next.phase === "branch") {
    if (held.up) {
      // ↑ = "가자!" — 골라 둔 쪽으로 확정, 다음 틱 ready에서 출발
      next = confirmRoute(next, events);
    } else if (next.idleMs >= ASSIST_IDLE_MS) {
      next = confirmRoute(next, events);
      events.push({ type: "auto", what: "route" });
    } else if (next.idleMs >= HINT_IDLE_MS && !next.branchHinted) {
      next.branchHinted = true;
      events.push({ type: "hint", what: "branch" });
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
    next.v = CORRECT_SPEED;   // 계기가 직전 판정 속도(35)에 얼어 있던 결함
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
  const boostDt = boostElapsedMs / 1000;
  const normalDt = Math.max(0, elapsedMs - boostElapsedMs) / 1000;
  next.v = Math.max(0, next.v);

  // 부스터 램프 — 목표(발동 시점 +200, 절대 500)까지 40km/h/s. 즉시 점프 금지.
  if (boostDt > 0) {
    const target = Number.isFinite(next.boostTarget) && next.boostTarget > 0
      ? Math.min(next.boostTarget, BOOST_SPEED)
      : BOOST_SPEED;
    next.v = Math.min(target, next.v + BOOST_ACCEL_KMH_PER_S * boostDt);
  }
  if (held.up) next.v += ACCEL_KMH_PER_S * normalDt;
  else if (held.down) next.v -= BRAKE_KMH_PER_S * normalDt;
  else if (next.assist && next.v < ASSIST_TARGET) {
    next.v += ACCEL_KMH_PER_S * normalDt;
  }
  // 코스트 순항: 놓아도 감속하지 않는다(감쇠 0)

  next.v = Math.max(0, next.v);

  const marker = markerPosition(segment(next));
  const remaining = Math.max(0, marker - next.x);
  // 무장 구간(마커 40m 안)에서는 접근 속도를 판정 속도 35로 먼저 수렴시킨다 —
  // 그래야 ⭐⭐⭐ 실효 창이 press 기준 2.0초로 보장된다(협회 확정).
  const cap = remaining <= ARM_DISTANCE
    ? ENVELOPE_FLOOR
    : envelopeSpeed(remaining);
  if (next.boostRemainingMs === 0 && next.v > cap) {
    // 부드러운 도착 판정의 원본 — 접근 봉투가 "처음 잡은 순간"의 속도.
    // 봉투는 존 밖 수백 m부터 깎기 시작하므로 존 경계 속도는 항상 낮다.
    // 스스로 미리 감속한 기관사는 여기 걸리지 않거나 낮은 값으로 걸린다.
    if (cap < MAX_SPEED && !next.zoneEntered && next.vAtZone === null) {
      next.vAtZone = vStart;
    }
    // 접근 봉투(<300)는 안전이라 즉시 준수. 300 상한 초과분(부스터 잔량)은
    // 급정거처럼 뚝 떨어뜨리지 않고 감쇠로 되돌린다.
    next.v = cap < MAX_SPEED
      ? cap
      : Math.max(MAX_SPEED, next.v - BOOST_DECAY_KMH_PER_S * normalDt);
  }
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

  // 서행 존 — 예고 → 진입 → 준수 집계 → 종료 판정. 강제 감속은 없다:
  // 초과는 덜컹 안내(쓰로틀)뿐이고, 존 안에서 회복하면 성공(비율제)이라
  // 한 번의 실수가 존 전체를 잠그지 않는다.
  const slowZone = next.slowZones?.[next.segIndex];
  if (slowZone && !next.zoneEntered) {
    const segLength = segment(next).length;
    const warnAt = Math.max(0, slowZone.at - SLOW_WARN_DISTANCE / segLength);
    if (!next.slowWarned && progress >= warnAt) {
      next.slowWarned = true;
      events.push({ type: "slow-warn", limit: slowZone.limit });
    }
    const inside = progress >= slowZone.at && progress < slowZone.until;
    if (inside && !next.slow) {
      next.slow = {
        limit: slowZone.limit, grace: slowZone.grace,
        calm: 0, total: 0, wobbles: 0, wobbleCooldownMs: 0
      };
      events.push({ type: "slow-enter", limit: slowZone.limit });
    }
    if (next.slow && inside) {
      const calmTick = next.v <= slowZone.limit + slowZone.grace;
      const cooled = Math.max(0, next.slow.wobbleCooldownMs - elapsedMs);
      let wobbles = next.slow.wobbles;
      let wobbleCooldownMs = cooled;
      if (!calmTick && cooled === 0 && wobbles < SLOW_WOBBLE_MAX) {
        wobbles += 1;
        wobbleCooldownMs = SLOW_WOBBLE_THROTTLE_MS;
        events.push({ type: "slow-wobble", limit: slowZone.limit });
      }
      next.slow = {
        ...next.slow,
        total: next.slow.total + 1,
        calm: next.slow.calm + (calmTick ? 1 : 0),
        wobbles,
        wobbleCooldownMs
      };
    }
    if (next.slow && progress >= slowZone.until) {
      const success =
        next.slow.calm / Math.max(1, next.slow.total) >= SLOW_CALM_RATIO;
      if (success) {
        next.bonuses = [...next.bonuses,
          { type: "slow", segIndex: next.segIndex }];
      }
      events.push({ type: "slow-clear", success, limit: slowZone.limit });
      next.slow = null;
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
    // 봉투가 한 번도 안 잡았으면(스스로 충분히 감속) 존 경계 속도가 원본.
    if (next.vAtZone === null) next.vAtZone = vStart;
    events.push({ type: "zone-enter", station: segment(next).to });
    if (next.boostRemainingMs > 0) {
      next.boostRemainingMs = 0;
      next.boostCooldownMs = BOOST_COOLDOWN_MS;
      next.v = Math.min(MAX_SPEED,
        envelopeSpeed(Math.max(0, marker - next.x)));
      events.push({ type: "boost-end", reason: "station-approach" });
    }
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
    bonuses: state.bonuses?.length ?? 0,
    perfect: state.stars.length === routeSegments(state).length &&
      state.stars.every(count => count === 3)
  };
}
