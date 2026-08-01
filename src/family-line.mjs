// 10호선 가족 노선 — 목적지를 고르는 화면에서 스페이스바로 들어가는 보너스.
//
// 진짜 지하철 여정은 "어디로 갈까"를 풀지만 여기는 그냥 한 줄짜리 노선을
// 왔다 갔다 하며 일곱 명을 다 만나는 것이 전부다. 갈아탈 일도, 길을 잃을
// 일도, 틀릴 일도 없어서 여정 엔진의 경로 탐색과 개찰구를 끌어오지 않고
// 이 파일 안에서 끝낸다.

import { FAMILY_STATIONS, lineByNumber } from "./subway-map-data.mjs";

export const FAMILY_LINE = 10;
export const FAMILY_COUNT = FAMILY_STATIONS.length;
// 문이 열려 있는 동안만 인사할 수 있다. 네다섯 살 손이 닿을 만큼 넉넉하게.
export const DOOR_OPEN_MS = 4200;
export const TRAVEL_MS = 1500;

export function familyAt(index) {
  return FAMILY_STATIONS[index] ?? null;
}

export function createFamilyRide() {
  return {
    line: FAMILY_LINE,
    color: lineByNumber(FAMILY_LINE).color,
    index: 0,
    met: [],
    phase: "stopped",
    doorMs: 0,
    travelMs: 0,
    lastMet: null,
    done: false
  };
}

export function familyStation(ride) {
  return familyAt(ride.index);
}

export function hasMet(ride, id) {
  return ride.met.includes(id);
}

export function metCount(ride) {
  return ride.met.length;
}

export function familyBoard(ride) {
  return FAMILY_STATIONS.map(member => ({
    ...member,
    met: hasMet(ride, member.id),
    here: familyStation(ride)?.id === member.id
  }));
}

// 문이 열려 있으면 인사, 아니면 옆 역으로. 어느 쪽도 벌점은 없다.
export function attemptFamilyMove(ride, input) {
  if (ride.done) return { ride, event: { type: "already-done" } };

  if (input === "space") {
    if (ride.phase !== "stopped") {
      return { ride, event: { type: "doors-closed" } };
    }
    const member = familyStation(ride);
    if (hasMet(ride, member.id)) {
      return { ride, event: { type: "already-met", member } };
    }
    const met = [...ride.met, member.id];
    const done = met.length === FAMILY_COUNT;
    return {
      ride: { ...ride, met, lastMet: member.id, done, doorMs: 0 },
      event: { type: done ? "all-met" : "met", member, count: met.length }
    };
  }

  if (input !== "left" && input !== "right") {
    return { ride, event: { type: "ignored" } };
  }
  const step = input === "right" ? 1 : -1;
  const next = ride.index + step;
  if (next < 0 || next >= FAMILY_COUNT) {
    return { ride, event: { type: "line-end" } };
  }
  return {
    ride: {
      ...ride,
      index: next,
      phase: "travel",
      travelMs: 0,
      doorMs: 0,
      lastMet: null
    },
    event: { type: "departed", member: familyAt(next) }
  };
}

// 달리는 중이면 다음 역까지 세고, 서 있으면 문 열린 시간을 센다. 문이 닫혀도
// 다시 열리기만 할 뿐 놓쳤다고 벌하지 않는다.
export function advanceFamilyRide(ride, elapsedMs = 100) {
  if (ride.done) return { ride, event: null };

  if (ride.phase === "travel") {
    const travelMs = ride.travelMs + elapsedMs;
    if (travelMs < TRAVEL_MS) return { ride: { ...ride, travelMs }, event: null };
    return {
      ride: { ...ride, phase: "stopped", travelMs: 0, doorMs: 0 },
      event: { type: "arrived", member: familyStation(ride) }
    };
  }

  const doorMs = ride.doorMs + elapsedMs;
  if (doorMs < DOOR_OPEN_MS) return { ride: { ...ride, doorMs }, event: null };
  return { ride: { ...ride, doorMs: 0 }, event: { type: "doors-cycled" } };
}

export function familyHint(ride) {
  if (ride.done) return "가족을 다 만났어요! 🎉";
  const member = familyStation(ride);
  if (ride.phase === "travel") return `${member.label}역으로 가는 중이에요`;
  if (hasMet(ride, member.id)) {
    const left = FAMILY_COUNT - metCount(ride);
    return `${member.label}는 만났어요. ${left}명 더 남았어요 — ← → 로 가요`;
  }
  return `${member.label}가 기다려요! ⎵ 눌러서 인사해요`;
}
