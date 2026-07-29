export const SRT_STATIONS = Object.freeze(["수서", "동탄", "대전", "대구", "부산"]);
export const SRT_CARS = 5;
export const SEAT_ROWS = 4;
export const SEAT_LETTERS = Object.freeze(["A", "B", "C", "D"]);
export const TRAIN_WIDTH = SRT_CARS * 5 + 1;
export const TRAIN_HEIGHT = 5;
export const CAR_SHAPES = Object.freeze([
  "sedan", "suv", "van", "truck", "sports"
]);
export const CAR_SHAPE_LABELS = Object.freeze({
  sedan: "세단",
  suv: "SUV",
  van: "미니밴",
  truck: "트럭",
  sports: "스포츠카"
});

const TRAVEL_MS = 4000;
const STOP_MS = 5000;
const LETTER_ROWS = Object.freeze({ A: 0, B: 1, C: 3, D: 4 });
const ROW_LETTERS = Object.freeze({ 0: "A", 1: "B", 3: "C", 4: "D" });
export const RIDE_DOOR = Object.freeze({ x: 2, y: 2 });
export const RIDE_SEAT = Object.freeze({ x: 2, y: 0 });

const DIRECTIONS = Object.freeze({
  up: Object.freeze({ x: 0, y: -1 }),
  down: Object.freeze({ x: 0, y: 1 }),
  left: Object.freeze({ x: -1, y: 0 }),
  right: Object.freeze({ x: 1, y: 0 })
});

function seededRandom(seed) {
  let value = (Number(seed) || 0) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function seatInfo(x, y) {
  if (x % 5 === 0) return null;
  const letter = ROW_LETTERS[y] ?? null;
  if (!letter) return null;
  const car = Math.floor(x / 5) + 1;
  const row = x % 5;
  return { car, row, letter, name: `${car}호차 ${row}${letter}` };
}

export function seatCell(target) {
  return {
    x: 5 * (target.car - 1) + target.row,
    y: LETTER_ROWS[target.letter]
  };
}

export function trainWalkable(x, y) {
  if (x < 0 || x >= TRAIN_WIDTH || y < 0 || y >= TRAIN_HEIGHT) return false;
  if (y === 2) return true;
  return x % 5 !== 0;
}

export function createSrtJourney(seed = 0) {
  const random = seededRandom(seed);
  return {
    phase: "seat",
    seed,
    target: {
      car: 1 + Math.floor(random() * SRT_CARS),
      row: 1 + Math.floor(random() * SEAT_ROWS),
      letter: SEAT_LETTERS[Math.floor(random() * SEAT_LETTERS.length)]
    },
    targetStation: "부산",
    carShapeIndex: Math.floor(random() * CAR_SHAPES.length),
    position: { x: 0, y: 2 },
    ride: { stationIndex: 0, moving: true, doorOpen: false, phaseMs: 0 }
  };
}

export function targetSeatName(state) {
  return `${state.target.car}호차 ${state.target.row}${state.target.letter}`;
}

function move(state, position, event, extra = {}) {
  return { state: { ...state, position, ...extra }, event };
}

export function attemptSrtMove(state, direction) {
  const offset = DIRECTIONS[direction];
  if (!offset || state.phase === "done") {
    return { state, event: { type: "ignored" } };
  }
  const next = {
    x: state.position.x + offset.x,
    y: state.position.y + offset.y
  };

  if (state.phase === "seat") {
    if (!trainWalkable(next.x, next.y)) {
      return move(state, { ...state.position }, { type: "blocked" });
    }
    const seat = seatInfo(next.x, next.y);
    if (seat) {
      const target = state.target;
      if (seat.car === target.car && seat.row === target.row &&
        seat.letter === target.letter) {
        return move(state, next, { type: "seat-found", seat: seat.name }, {
          phase: "ride",
          position: { ...RIDE_SEAT },
          ride: { stationIndex: 0, moving: true, doorOpen: false, phaseMs: 0 }
        });
      }
      return move(
        state,
        { ...state.position },
        { type: "wrong-seat", seat: seat.name }
      );
    }
    return move(state, next, { type: "moved" });
  }

  if (state.phase === "ride") {
    if (next.x < 0 || next.x > 4 || next.y < 0 || next.y > 2) {
      return move(state, { ...state.position }, { type: "blocked" });
    }
    const atDoor = next.x === RIDE_DOOR.x && next.y === RIDE_DOOR.y;
    if (atDoor && state.ride.doorOpen) {
      const station = SRT_STATIONS[state.ride.stationIndex];
      if (station === state.targetStation) {
        return move(state, { x: 2, y: 1 }, { type: "arrived", station }, {
          phase: "parking"
        });
      }
      return move(
        state,
        { ...RIDE_SEAT },
        { type: "wrong-station", station }
      );
    }
    return move(state, next, { type: "moved" });
  }

  if (state.phase === "parking") {
    if (next.x < 0 || next.x > 4 || next.y < 0 || next.y > 1) {
      return move(state, { ...state.position }, { type: "blocked" });
    }
    if (next.y === 0) {
      if (next.x === state.carShapeIndex) {
        return move(state, next, {
          type: "car-found",
          shape: CAR_SHAPES[next.x]
        }, { phase: "done" });
      }
      return move(
        state,
        { ...state.position },
        { type: "wrong-car", shape: CAR_SHAPES[next.x] }
      );
    }
    return move(state, next, { type: "moved" });
  }

  return { state, event: { type: "ignored" } };
}

export function advanceSrtWorld(state, elapsedMs = 100) {
  if (state.phase !== "ride") return state;
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const ride = { ...state.ride, phaseMs: state.ride.phaseMs + elapsed };
  if (ride.moving && ride.phaseMs >= TRAVEL_MS) {
    ride.stationIndex += 1;
    ride.moving = false;
    ride.doorOpen = true;
    ride.phaseMs = 0;
  } else if (!ride.moving && ride.phaseMs >= STOP_MS) {
    if (ride.stationIndex < SRT_STATIONS.length - 1) {
      ride.moving = true;
      ride.doorOpen = false;
      ride.phaseMs = 0;
    } else {
      ride.phaseMs = STOP_MS;
    }
  }
  return { ...state, ride };
}

export function rideAnnouncement(state) {
  const { stationIndex, moving } = state.ride;
  if (moving) {
    const nextStation = SRT_STATIONS[Math.min(
      stationIndex + 1,
      SRT_STATIONS.length - 1
    )];
    return `다음 역은 ${nextStation}역입니다`;
  }
  const station = SRT_STATIONS[stationIndex];
  return `${station}역입니다. 문이 열렸어요`;
}
