// 칙칙폭폭 기관사 — 노선·구간·환경·이벤트의 순수 데이터.
//
// 역 이름은 기존 SRT 게임(좌석 찾기)과 같은 노선이라 그쪽을 단일 원본으로
// 쓴다. 두 기차 게임이 같은 역을 다르게 부르면 아이가 헷갈린다.
// 거리(m)와 속도(km/h)는 만화적으로 압축된 게임 단위다 — 실거리 재현은
// 영구 비목표. 수치의 근거는 설계 v2 §4(협회 난이도 렌즈 확정값).

import { SRT_STATIONS } from "./srt-journey.mjs";

export { SRT_STATIONS as KTX_STATIONS };

// 시작 화면에서 고르는 열차 두 대. 해금 아님 — 아이는 파란 기차를 안다.
export const KTX_TRAINS = Object.freeze([
  Object.freeze({ id: "srt", label: "SRT", color: "#5b2d86", nose: "#472069" }),
  Object.freeze({ id: "ktx", label: "KTX", color: "#0f4c9a", nose: "#0a3a77" })
]);

export const MAX_SPEED = 300;              // km/h
export const ACCEL_KMH_PER_S = 15;         // ↑ 홀드 가속 — 0→300에 20초
export const BRAKE_KMH_PER_S = 40;         // ↓ 홀드 감속
export const ENVELOPE_FLOOR = 35;          // km/h — 봉투 바닥. 이게 없으면
                                           // ↑만 잡아도 저절로 서서 별 변별이 죽는다
export const ENVELOPE_COEFF = 12;          // vmax(d) = clamp(12·√d, 35, 300)
export const ZONE_LENGTH = 120;            // 승강장(정차 존) 길이
export const MARKER_FROM_ZONE = 90;        // 마커 = 존 시작 + 90m (오버런 룸 30m)
export const ARM_DISTANCE = 40;            // 마커 40m 안에서만 딱 멈추기 무장
export const STOP_DECEL = 4.7;             // m/s² — 35km/h에서 제동거리 ≈ 10m
export const STAR3_WINDOW = 10;            // |정지점-마커| ≤ 10m → ⭐⭐⭐
export const STAR2_WINDOW = 25;            // ≤ 25m → ⭐⭐
export const OVERRUN_ROOM = ZONE_LENGTH - MARKER_FROM_ZONE; // 30m

// 남은 거리 d(m)에서 허용되는 최고 속도(km/h).
export function envelopeSpeed(distance) {
  if (distance <= 0) return ENVELOPE_FLOOR;
  const raw = ENVELOPE_COEFF * Math.sqrt(distance);
  return Math.min(MAX_SPEED, Math.max(ENVELOPE_FLOOR, raw));
}

// v(km/h)에서 딱 멈추기를 누르면 미끄러져 가는 거리(m).
export function stopDistance(speedKmh) {
  const metersPerSecond = speedKmh / 3.6;
  return (metersPerSecond * metersPerSecond) / (2 * STOP_DECEL);
}

// 구간 길이는 전속 주행 기준 60~80초가 나오게 놓았다(설계 §1).
// 환경 밴드: 하루의 여정 아크 — 아침 도심 → 낮 들판·강 → 노을·밤·터널 →
// 새벽 바다 해돋이. sky와 land를 갈라 팔레트 조합으로 표현한다.
// 고정 이벤트는 배치 진행률(at)과 함께 선언한다.
export const KTX_SEGMENTS = Object.freeze([
  Object.freeze({
    from: "수서", to: "동탄", length: 4400,
    bands: Object.freeze([
      Object.freeze({ until: 0.35, sky: "morning", land: "city" }),
      Object.freeze({ until: 1, sky: "day", land: "field" })
    ]),
    events: Object.freeze([
      Object.freeze({ type: "sprint300", at: 0.4, until: 0.75 })
    ])
  }),
  Object.freeze({
    from: "동탄", to: "대전", length: 4200,
    bands: Object.freeze([
      Object.freeze({ until: 0.35, sky: "day", land: "field" }),
      Object.freeze({ until: 0.7, sky: "day", land: "river" }),
      Object.freeze({ until: 1, sky: "day", land: "field" })
    ]),
    events: Object.freeze([
      Object.freeze({ type: "river", at: 0.38, until: 0.68 })
    ])
  }),
  Object.freeze({
    from: "대전", to: "대구", length: 4800,
    bands: Object.freeze([
      Object.freeze({ until: 0.3, sky: "sunset", land: "field" }),
      Object.freeze({ until: 0.55, sky: "night", land: "mountain" }),
      Object.freeze({ until: 0.8, sky: "night", land: "tunnel" }),
      Object.freeze({ until: 1, sky: "night", land: "mountain" })
    ]),
    events: Object.freeze([
      Object.freeze({ type: "tunnel", at: 0.55, until: 0.8 })
    ])
  }),
  Object.freeze({
    from: "대구", to: "부산", length: 4600,
    bands: Object.freeze([
      Object.freeze({ until: 0.35, sky: "dawn", land: "field" }),
      Object.freeze({ until: 0.9, sky: "dawn", land: "sea" }),
      Object.freeze({ until: 1, sky: "day", land: "city" })
    ]),
    events: Object.freeze([
      Object.freeze({ type: "seagull", at: 0.4, until: 0.85 })
    ])
  })
]);

// 랜덤 이벤트 풀 2종 — 매판 시드로 1종을 뽑아 2 또는 3구간의 빈 자리에 놓는다.
// (전량 삭제는 7세 변주 0, 4종 유지는 밀도 초과 — 협회 절충)
export const KTX_RANDOM_EVENTS = Object.freeze([
  Object.freeze({ type: "passing", segments: Object.freeze([1, 2]), at: 0.12, until: 0.3 }),
  Object.freeze({ type: "cows", segments: Object.freeze([1]), at: 0.75, until: 0.95 })
]);

export function segmentBand(segment, progress) {
  for (const band of segment.bands) {
    if (progress <= band.until) return band;
  }
  return segment.bands[segment.bands.length - 1];
}

// 속도 마일스톤 — 도달 순간 숫자가 커지며 음성이 붙는다. 250은 음성이
// 없어(number 음성은 150까지) 시각 확대만 한다(협회 실측).
export const SPEED_MILESTONES = Object.freeze([50, 100, 150, 200, 250, 300]);
export const VOICED_MILESTONES = Object.freeze([50, 100, 150]);

export function mulberry(seed) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
