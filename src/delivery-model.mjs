// "택배 왔어요!" 상태 머신 — 디자인 정본 락 §1·§5 의 4단계를 그대로 옮긴 순수 모델.
//
// 한 건의 배송은 목표 호수 하나(예: 702)가 네 단계를 관통한다.
//   ① 단지 운전  : 이동 명령 4칸을 쌓아 ▶ 출발 → 702호 집에 도착
//   ② 엘리베이터 : 앞자리 7 을 눌러 7층으로
//   ③ 호수 찾기  : 701·702·703 중 702 문 앞에서 초인종
//   ④ 전달 순간  : 친구가 말한 물건을 골라 전달
// 다섯 건을 마치면 끝난다. 어디서 틀려도 벌점은 없다 — 다시 알려 주고 다시 시킨다.
//
// DOM 을 모른다. 씬은 여기서 나온 이벤트 배열만 보고 그린다.

import { mulberry } from "./ktx-route-data.mjs";

export const DELIVERY_TARGET = 5; // 배송 5건이면 하루 끝
export const COMMAND_SLOTS = 4; // 디자인 락 §5 STEP 1 — 이동 명령 네 칸
export const STREAK_BONUS_SLOTS = 4; // §5 STEP 4 — 연속 성공 보너스 별 네 개

export const PARCELS = Object.freeze([
  Object.freeze({ id: "fruit", label: "과일 상자", emoji: "🍓" }),
  Object.freeze({ id: "cosmetic", label: "화장품 상자", emoji: "🧴" }),
  Object.freeze({ id: "toy", label: "장난감 상자", emoji: "🧸" }),
]);

// 받는 친구 — 디자인 락 §7 은 빨강 1번을 예시로 들고 "다양한 캐릭터가 등장할 수 있다"고 적었다.
export const FRIENDS = Object.freeze([
  Object.freeze({ number: 1, color: "#f4544a", edge: "#cd382f" }),
  Object.freeze({ number: 2, color: "#ff9a3c", edge: "#d97516" }),
  Object.freeze({ number: 4, color: "#5cc45f", edge: "#3d9a41" }),
  Object.freeze({ number: 5, color: "#4a9fe8", edge: "#2f7cc0" }),
]);

// 지도 격자 — 디자인 락 §5 STEP 1 의 집 네 채·연못·나무 배치를 그대로 옮겼다.
export const GRID_COLUMNS = 5;
export const GRID_ROWS = 3;
export const TRUCK_START = Object.freeze({ x: 1, y: 1 });

// 집이 서는 칸. 순서는 지도 좌상 → 우 → 아래(601·503·702·401 자리)와 같다.
export const HOUSE_CELLS = Object.freeze([
  Object.freeze({ x: 0, y: 0 }),
  Object.freeze({ x: 2, y: 0 }),
  Object.freeze({ x: 4, y: 0 }),
  Object.freeze({ x: 2, y: 2 }),
]);

// 트럭이 못 지나가는 칸 — 연못과 나무.
export const BLOCKED_CELLS = Object.freeze([
  Object.freeze({ x: 0, y: 2, kind: "pond" }),
  Object.freeze({ x: 4, y: 2, kind: "tree" }),
]);

// 난이도는 층수 범위만 바꾼다. 명령 칸 수와 지도는 그대로다.
const TOP_FLOOR = Object.freeze({ easy: 4, steady: 6, challenge: 7 });

const STEPS = Object.freeze({
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
});

export const DIRECTIONS = Object.freeze(Object.keys(STEPS));

/* ── 격자 도우미 ──────────────────────────────────────────────────── */

function samePoint(a, b) {
  return Boolean(a) && Boolean(b) && a.x === b.x && a.y === b.y;
}

function insideGrid(point) {
  return point.x >= 0 && point.x < GRID_COLUMNS && point.y >= 0 && point.y < GRID_ROWS;
}

export function blockedAt(point) {
  return BLOCKED_CELLS.find(cell => samePoint(cell, point)) ?? null;
}

export function houseAt(state, point) {
  return state.houses.find(house => samePoint(house.cell, point)) ?? null;
}

/* ── 배송 건 만들기 ───────────────────────────────────────────────── */

function pickDistinctFloors(random, topFloor, count) {
  const pool = Array.from({ length: topFloor }, (unused, index) => index + 1);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [pool[index], pool[swap]] = [pool[swap], pool[index]];
  }
  return pool.slice(0, count).sort((a, b) => a - b);
}

function createHouses(random, difficulty) {
  const topFloor = TOP_FLOOR[difficulty] ?? TOP_FLOOR.steady;
  const floors = pickDistinctFloors(random, topFloor, HOUSE_CELLS.length);
  // 층이 겹치지 않게 뽑은 뒤 집마다 다른 자리에 배치한다 — 앞자리 하나로 층이 정해지도록.
  for (let index = floors.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [floors[index], floors[swap]] = [floors[swap], floors[index]];
  }
  return HOUSE_CELLS.map((cell, index) => {
    const floor = floors[index];
    const room = 1 + Math.floor(random() * 3);
    return { cell, floor, room, unit: floor * 100 + room };
  });
}

function createOrder(state) {
  state.houses = createHouses(state.random, state.difficulty);
  const target = state.houses[Math.floor(state.random() * state.houses.length)];
  const parcel = PARCELS[Math.floor(state.random() * PARCELS.length)];
  const friend = FRIENDS[Math.floor(state.random() * FRIENDS.length)];

  state.order = {
    unit: target.unit,
    floor: target.floor,
    room: target.room,
    cell: target.cell,
    parcel: parcel.id,
    friend,
    mistakes: 0,
  };

  state.phase = "drive";
  state.drive = {
    truck: { ...TRUCK_START },
    facing: "idle",
    queue: [],
    path: null,
  };
  state.elevator = { current: 1, target: target.floor, pressed: null };
  // 복도 문패는 목표 층의 1·2·3 호다. 목표만 빛난다.
  state.corridor = {
    units: [target.floor * 100 + 1, target.floor * 100 + 2, target.floor * 100 + 3],
    focus: 0,
  };
  // 트레이 순서는 디자인 락 §5 STEP 4 그대로 과일 → 화장품 → 장난감 고정.
  state.handover = { tray: PARCELS.map(item => item.id), focus: 0 };
}

export function createDelivery(difficulty = "steady", seed = 1) {
  const state = {
    difficulty,
    seed,
    random: mulberry((Number(seed) || 0) + 17),
    delivered: 0,
    stars: 0,
    streak: 0,
    phase: "drive",
    finale: null,
    houses: [],
    order: null,
    drive: null,
    elevator: null,
    corridor: null,
    handover: null,
  };
  createOrder(state);
  return state;
}

export function currentOrder(state) {
  return state.order;
}

export function parcelById(id) {
  return PARCELS.find(item => item.id === id) ?? null;
}

/* ── ① 단지 운전 ─────────────────────────────────────────────────── */

export function pushCommand(state, direction) {
  if (state.phase !== "drive" || !STEPS[direction]) return [];
  if (state.drive.queue.length >= COMMAND_SLOTS) {
    return [{ type: "command-full" }];
  }
  state.drive.queue.push(direction);
  return [{ type: "command-added", direction, slot: state.drive.queue.length }];
}

export function clearCommands(state) {
  if (state.phase !== "drive" || state.drive.queue.length === 0) return [];
  state.drive.queue = [];
  return [{ type: "command-cleared" }];
}

// ▶ 출발 — 쌓아 둔 명령을 한 번에 판정한다. 씬은 path 를 받아 한 칸씩 굴린다.
export function runCommands(state) {
  if (state.phase !== "drive") return [];
  if (state.drive.queue.length === 0) {
    return [{ type: "command-empty" }];
  }

  const path = [];
  let at = { ...state.drive.truck };
  let facing = state.drive.facing;
  let blocked = null;

  for (const direction of state.drive.queue) {
    const step = STEPS[direction];
    const next = { x: at.x + step.x, y: at.y + step.y };
    facing = direction;
    if (!insideGrid(next) || blockedAt(next)) {
      blocked = { direction, at: next };
      break;
    }
    at = next;
    path.push({ ...at, facing });
    // 집 칸에 들어서면 거기서 멈춘다 — 지나쳐 갈 수 없다.
    if (houseAt(state, at)) break;
  }

  state.drive.truck = at;
  state.drive.facing = facing;
  state.drive.path = path;
  state.drive.queue = [];

  const events = [{ type: "drive-path", path, blocked: Boolean(blocked) }];
  if (blocked) events.push({ type: "drive-blocked", direction: blocked.direction });

  const house = houseAt(state, at);
  if (!house) {
    if (!blocked) events.push({ type: "drive-nowhere" });
    return events;
  }
  if (house.unit !== state.order.unit) {
    state.order.mistakes += 1;
    events.push({ type: "drive-miss", unit: house.unit, want: state.order.unit });
    return events;
  }

  state.phase = "elevator";
  events.push({ type: "drive-arrived", unit: house.unit, floor: state.order.floor });
  return events;
}

/* ── ② 엘리베이터 ────────────────────────────────────────────────── */

export function pressFloor(state, digit) {
  if (state.phase !== "elevator") return [];
  const floor = Number(digit);
  if (!Number.isInteger(floor) || floor < 1 || floor > 9) return [];

  if (floor !== state.elevator.target) {
    state.order.mistakes += 1;
    state.elevator.pressed = floor;
    return [{ type: "floor-wrong", digit: floor, target: state.elevator.target }];
  }

  const from = state.elevator.current;
  state.elevator.pressed = floor;
  state.elevator.current = floor;
  state.phase = "corridor";
  return [
    { type: "floor-correct", floor },
    { type: "elevator-arrived", from, to: floor },
  ];
}

/* ── ③ 호수 찾기 ─────────────────────────────────────────────────── */

export function moveCorridorFocus(state, delta) {
  if (state.phase !== "corridor") return [];
  const last = state.corridor.units.length - 1;
  const next = Math.min(last, Math.max(0, state.corridor.focus + Math.sign(delta)));
  if (next === state.corridor.focus) {
    return [{ type: "corridor-edge", index: next }];
  }
  state.corridor.focus = next;
  return [{ type: "corridor-focus", index: next, unit: state.corridor.units[next] }];
}

export function ringBell(state) {
  if (state.phase !== "corridor") return [];
  const unit = state.corridor.units[state.corridor.focus];
  if (unit !== state.order.unit) {
    state.order.mistakes += 1;
    return [{ type: "corridor-wrong", unit, want: state.order.unit }];
  }
  state.phase = "handover";
  return [{ type: "corridor-correct", unit }];
}

/* ── ④ 전달 순간 ─────────────────────────────────────────────────── */

export function moveTrayFocus(state, delta) {
  if (state.phase !== "handover") return [];
  const last = state.handover.tray.length - 1;
  const next = Math.min(last, Math.max(0, state.handover.focus + Math.sign(delta)));
  if (next === state.handover.focus) {
    return [{ type: "tray-edge", index: next }];
  }
  state.handover.focus = next;
  return [{ type: "tray-focus", index: next, parcel: state.handover.tray[next] }];
}

export function deliverParcel(state) {
  if (state.phase !== "handover") return [];
  const picked = state.handover.tray[state.handover.focus];
  if (picked !== state.order.parcel) {
    state.order.mistakes += 1;
    return [{ type: "parcel-wrong", picked, want: state.order.parcel }];
  }

  const perfect = state.order.mistakes === 0;
  state.delivered += 1;
  state.stars += 1;
  state.streak = perfect ? Math.min(STREAK_BONUS_SLOTS, state.streak + 1) : 0;

  const events = [
    { type: "parcel-correct", parcel: picked },
    {
      type: "delivered",
      delivered: state.delivered,
      stars: state.stars,
      streak: state.streak,
      perfect,
    },
  ];

  if (state.delivered >= DELIVERY_TARGET) {
    state.phase = "finale";
    state.finale = { delivered: state.delivered, stars: state.stars, streak: state.streak };
    events.push({ type: "finale", ...state.finale });
    return events;
  }

  createOrder(state);
  events.push({ type: "next-order", unit: state.order.unit, index: state.delivered + 1 });
  return events;
}

/* ── 씬이 쓰는 읽기 전용 조회 ─────────────────────────────────────── */

export function deliveryProgress(state) {
  return { delivered: state.delivered, target: DELIVERY_TARGET };
}

export function focusedUnit(state) {
  return state.phase === "corridor" ? state.corridor.units[state.corridor.focus] : null;
}

export function focusedParcel(state) {
  return state.phase === "handover" ? state.handover.tray[state.handover.focus] : null;
}
