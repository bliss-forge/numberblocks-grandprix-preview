// 칙칙폭폭 기관사 — 승객 추첨과 "만난 친구" 기록. 순수 모듈.
//
// 기본 1~12번이 네 정차역(수서·동탄·대전·대구)에 3명씩 나뉘고, 게스트
// 2명(13~99)과 특별 큰 손님 1명(30/50/70/100)이 시드로 섞인다. 세기는
// 항상 "그 역에서 탄 인원"이라 역당 3~6명 = 4~7세 발달 범위 안이다.

import { KTX_STATIONS, mulberry } from "./ktx-route-data.mjs";

export const BIG_GUESTS = Object.freeze([30, 50, 70, 100]);
export const GUEST_MIN = 13;
export const GUEST_MAX = 99;
export const GUEST_COUNT = 2;

const MET_KEY = "numberblocks:ktx-friends";

// 정차역 = 종착(부산)을 뺀 앞 네 역.
export function boardingStations() {
  return KTX_STATIONS.slice(0, -1);
}

export function buildPassengerManifest(seed = 0) {
  const random = mulberry(seed + 7);
  const stations = boardingStations();

  const base = Array.from({ length: 12 }, (unused, index) => index + 1);
  for (let index = base.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [base[index], base[swap]] = [base[swap], base[index]];
  }

  const stops = {};
  stations.forEach((station, index) => {
    stops[station] = base.slice(index * 3, index * 3 + 3);
  });

  // 게스트 — 13~99에서 겹치지 않게 두 명, 아무 역에나 끼어든다.
  const guests = [];
  while (guests.length < GUEST_COUNT) {
    const number = GUEST_MIN + Math.floor(random() * (GUEST_MAX - GUEST_MIN + 1));
    if (!guests.includes(number) && !BIG_GUESTS.includes(number)) guests.push(number);
  }
  for (const number of guests) {
    const station = stations[Math.floor(random() * stations.length)];
    const line = stops[station];
    line.splice(Math.floor(random() * (line.length + 1)), 0, number);
  }

  // 특별 큰 손님 — 수서를 뺀 역 중 하나에서 맨 마지막에 탄다(예고의 드라마).
  const guest = {
    number: BIG_GUESTS[Math.floor(random() * BIG_GUESTS.length)],
    station: stations[1 + Math.floor(random() * (stations.length - 1))]
  };
  stops[guest.station] = [...stops[guest.station], guest.number];

  return { stops, guest, guests };
}

// ── 만난 친구 기록 (사진첩과 같은 storage 주입 패턴) ─────────────────────

export function loadMetFriends(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(MET_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(number =>
      Number.isInteger(number) && number >= 1 && number <= 150);
  } catch {
    return [];
  }
}

// 이번 여정에서 만난 번호들을 합치고, 처음 만난 번호만 돌려준다.
export function recordMetFriends(numbers, storage = globalThis.localStorage) {
  const known = loadMetFriends(storage);
  const fresh = [...new Set(numbers)].filter(number => !known.includes(number));
  if (fresh.length > 0) {
    try {
      storage?.setItem(MET_KEY, JSON.stringify([...known, ...fresh]));
    } catch {
      // 기록을 못 남겨도 놀이는 계속된다.
    }
  }
  return fresh;
}
