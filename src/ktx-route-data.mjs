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
      // 0.85는 정차 접근 구간(마지막 25%)을 침범해 딱 멈추기와 주의가
      // 겹쳤다 — 갈매기는 바다 밴드 안에서 일찍 끝낸다.
      Object.freeze({ type: "seagull", at: 0.4, until: 0.75 })
    ])
  })
]);

// ── 호남선(목포 방면) — 동탄에서 갈라진다 ─────────────────────────────────
// 분기 선택은 동탄 문 닫힘 뒤 하늘(탑다운) 뷰에서 ←목포/→부산.
// 신규 역 음성은 아직 없어 자막 안내로 폴백(SILENT 관례).
export const KTX_SEGMENTS_MOKPO = Object.freeze([
  KTX_SEGMENTS[0], // 수서→동탄은 공유
  Object.freeze({
    from: "동탄", to: "익산", length: 4200,
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
    from: "익산", to: "광주송정", length: 4600,
    bands: Object.freeze([
      Object.freeze({ until: 0.3, sky: "sunset", land: "field" }),
      Object.freeze({ until: 0.55, sky: "night", land: "field" }),
      Object.freeze({ until: 0.8, sky: "night", land: "tunnel" }),
      Object.freeze({ until: 1, sky: "night", land: "city" })
    ]),
    events: Object.freeze([
      Object.freeze({ type: "tunnel", at: 0.55, until: 0.8 })
    ])
  }),
  Object.freeze({
    from: "광주송정", to: "목포", length: 4400,
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

export const KTX_ROUTES = Object.freeze({
  busan: KTX_SEGMENTS,
  mokpo: KTX_SEGMENTS_MOKPO
});

export const KTX_ROUTE_STATIONS = Object.freeze({
  busan: SRT_STATIONS,
  mokpo: Object.freeze(["수서", "동탄", "익산", "광주송정", "목포"])
});

export const KTX_ROUTE_LABELS = Object.freeze({
  busan: "부산", mokpo: "목포"
});

// 랜덤 이벤트 풀 2종 — 매판 시드로 1종을 뽑아 2 또는 3구간의 빈 자리에 놓는다.
// (전량 삭제는 7세 변주 0, 4종 유지는 밀도 초과 — 협회 절충)
// 지형이 이벤트를 정한다 — 들판엔 소 농장, 바다엔 갈매기, 도시엔 교행 열차.
// 아이가 "저기 뭐야?" 하고 창밖을 보게 만드는 게 목적이라 그 땅에서 실제로
// 볼 법한 것만 넣는다. 터널·산은 자체 연출이 있어 비워 둔다.
export const KTX_LAND_EVENTS = Object.freeze({
  field: Object.freeze(["cows"]),
  river: Object.freeze(["river"]),
  sea: Object.freeze(["seagull"]),
  city: Object.freeze(["passing"]),
  mountain: Object.freeze([]),
  tunnel: Object.freeze([])
});

export const LAND_EVENT_SPAN = 0.1;        // 이벤트 창 길이(구간 진행률)
export const LAND_EVENT_MARGIN = 0.03;     // 밴드 경계에서 띄우는 여유
export const LAND_EVENTS_PER_SEGMENT = 2;  // 구간당 상한 — 남발하면 특별함이 죽는다
export const LAND_EVENT_TYPE_BUDGET = 2;   // 한 판에 같은 종류는 두 번까지

// (구) 판당 랜덤 1종 — 지형 기반 배치로 대체됐다. 상수는 호환용으로 남긴다.
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

// ── 게임성 시스템(협회 게임 디자인 보고) — 서행·부드러운 도착·골드 프리셋 ──
// grace: 서행 제한 초과 허용 여유(km/h). smoothEntry: 정차 존 진입 속도가 이
// 값 이하면 "부드러운 도착". 강제 감속·벌점은 어느 난이도에도 없다.
export const SLOW_ZONE_PRESETS = Object.freeze({
  easy: Object.freeze({ zones: 1, grace: 30, smoothEntry: 170 }),
  steady: Object.freeze({ zones: 1, grace: 15, smoothEntry: 140 }),
  challenge: Object.freeze({ zones: 2, grace: 10, smoothEntry: 120 })
});

// 제한 속도는 이 둘뿐 — number-100/number-150 음성 자산을 그대로 재사용한다.
export const SLOW_ZONE_LIMITS = Object.freeze([150, 100]);
export const SLOW_ZONE_SPAN = 0.15;           // 존 길이(구간 진행률)
export const SLOW_ZONE_AT_MIN = 0.2;          // 존 시작 진행률 창 — 0구간은
export const SLOW_ZONE_AT_MAX = 0.6;          // sprint300 몫이라 배치 제외
export const SLOW_ZONE_APPROACH_GUARD = 0.25; // 구간 마지막 25%는 정차 접근 몫
export const SLOW_WARN_DISTANCE = 500;        // m — 존 시작 500m 전 예고 1회
export const SLOW_CALM_RATIO = 0.75;          // calm/total ≥ 0.75 → 성공(회복 가능)
export const SLOW_WOBBLE_THROTTLE_MS = 2000;  // 초과 알림 쓰로틀(모델 시간)
export const SLOW_WOBBLE_MAX = 3;             // 존당 알림 상한 — 잔소리 방지
export const GOLD_WINDOW = 4;                 // |정지점-마커| ≤ 4m → 골드(challenge 전용)

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
