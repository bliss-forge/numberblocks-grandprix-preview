// 알록달록 물감 놀이 — 데이터 단일 원본.
// 색·튜브·혼합 테이블·그림 주제는 전부 여기 frozen 데이터로만 존재한다.
// 혼합은 런타임 색 보간이 아니라 수작업 튜닝 룩업(MIX_TABLE)이다 —
// RGB 보간은 노랑+파랑이 회색이 되는 함정이 있고, 교육적으로 보여주고 싶은
// 대표색을 직접 지정하는 쪽이 옳다(설계 스펙 2026-08-05).

// ── 팔레트 ────────────────────────────────────────────────────────────────
export const PAINT_COLORS = Object.freeze({
  red: Object.freeze({ ko: "빨강", hex: "#ef4147" }),
  yellow: Object.freeze({ ko: "노랑", hex: "#ffd23f" }),
  blue: Object.freeze({ ko: "파랑", hex: "#4a9df8" }),
  black: Object.freeze({ ko: "검정", hex: "#3a4152" }),
  white: Object.freeze({ ko: "하양", hex: "#f6f8fc" }),
  orange: Object.freeze({ ko: "주황", hex: "#ff8a3d" }),
  green: Object.freeze({ ko: "초록", hex: "#58c96b" }),
  purple: Object.freeze({ ko: "보라", hex: "#a55bd6" }),
  pink: Object.freeze({ ko: "분홍", hex: "#ff9ec4" }),
  sky: Object.freeze({ ko: "하늘색", hex: "#8fd0f8" }),
  brown: Object.freeze({ ko: "밤색", hex: "#9a6a3f" }),
  navy: Object.freeze({ ko: "남색", hex: "#2d4a8a" })
});

// ── 물감 튜브 선반 — 마스코트 몸색 = 물감색 (숫자키 ↔ 색 자연 학습) ──────
// keyDigit: 키보드 숫자키(10번 열이는 0키).
export const PAINT_TUBES = Object.freeze([
  Object.freeze({ id: "red", number: 1, keyDigit: "1", char: "one" }),
  Object.freeze({ id: "yellow", number: 3, keyDigit: "3", char: "three" }),
  Object.freeze({ id: "blue", number: 5, keyDigit: "5", char: "five" }),
  Object.freeze({ id: "black", number: 9, keyDigit: "9", char: "nine" }),
  Object.freeze({ id: "white", number: 10, keyDigit: "0", char: "ten" })
]);

// ── 레시피 — 결과색 → 재료(1개=원색 그대로, 2개=혼합) ────────────────────
export const PAINT_RECIPES = Object.freeze({
  red: Object.freeze(["red"]),
  yellow: Object.freeze(["yellow"]),
  blue: Object.freeze(["blue"]),
  orange: Object.freeze(["red", "yellow"]),
  green: Object.freeze(["yellow", "blue"]),
  purple: Object.freeze(["red", "blue"]),
  pink: Object.freeze(["red", "white"]),
  sky: Object.freeze(["blue", "white"]),
  brown: Object.freeze(["red", "black"]),
  navy: Object.freeze(["blue", "black"])
});

export function mixKey(a, b) {
  return [a, b].sort().join("+");
}

// 혼합 룩업 — PAINT_RECIPES의 2재료 항목에서 유도(단일 진실 유지).
export const MIX_TABLE = Object.freeze(
  Object.fromEntries(
    Object.entries(PAINT_RECIPES)
      .filter(([, parts]) => parts.length === 2)
      .map(([result, parts]) => [mixKey(parts[0], parts[1]), result])
  )
);

// 두 재료를 섞은 결과 색 id — 테이블 밖 조합은 null(튜브 잠금이 원천 차단).
export function mixResult(a, b) {
  return MIX_TABLE[mixKey(a, b)] ?? null;
}

// ── 그림 주제 — 회색 윤곽으로 제시되고 목표색으로 칠해진다 ────────────────
// stage: 1 원색 그대로 · 2 두 색 섞기 · 3 연하게/진하게.
// vehicle: 탈것 가중 출제 대상(사용자 결정 — 자동차 색 입히기 욕구 반영).
export const PAINT_SUBJECTS = Object.freeze([
  Object.freeze({ id: "firetruck", ko: "소방차", color: "red", vehicle: true, stage: 1 }),
  Object.freeze({ id: "chick", ko: "병아리", color: "yellow", vehicle: false, stage: 1 }),
  Object.freeze({ id: "bus", ko: "버스", color: "blue", vehicle: true, stage: 1 }),
  Object.freeze({ id: "carrot", ko: "당근", color: "orange", vehicle: false, stage: 2 }),
  Object.freeze({ id: "car", ko: "자동차", color: "orange", vehicle: true, stage: 2 }),
  Object.freeze({ id: "frog", ko: "개구리", color: "green", vehicle: false, stage: 2 }),
  Object.freeze({ id: "tractor", ko: "트랙터", color: "green", vehicle: true, stage: 2 }),
  Object.freeze({ id: "grape", ko: "포도", color: "purple", vehicle: false, stage: 2 }),
  Object.freeze({ id: "heli", ko: "헬리콥터", color: "purple", vehicle: true, stage: 2 }),
  Object.freeze({ id: "blossom", ko: "벚꽃", color: "pink", vehicle: false, stage: 3 }),
  Object.freeze({ id: "boat", ko: "돛단배", color: "sky", vehicle: true, stage: 3 }),
  Object.freeze({ id: "bear", ko: "곰돌이", color: "brown", vehicle: false, stage: 3 }),
  Object.freeze({ id: "rocket", ko: "로켓", color: "navy", vehicle: true, stage: 3 })
]);

// 난이도별 라운드 스테이지 계획.
// 4 = 역추론(힌트 없이 시작 — 2·3스테이지 색에서 출제, 2회 실패 시 힌트 복귀).
export const STAGE_PLANS = Object.freeze({
  easy: Object.freeze([1, 1, 2, 2, 2]),
  steady: Object.freeze([2, 2, 2, 3, 3, 3]),
  challenge: Object.freeze([2, 2, 3, 3, 4, 4, 4])
});

// 무지개 피날레 조건 — 갤러리에 서로 다른 색이 이만큼 모이면 일곱이의 대단원.
export const RAINBOW_COUNT = 7;

// 받침 유무에 따른 조사 — pair: [받침 있을 때, 없을 때].
// 예: josa("당근", "을", "를") → "을" · josa("보라", "을", "를") → "를"
// (으)로는 ㄹ 받침이 예외로 "로"를 쓴다: josa("하늘색", "으로", "로").
export function josa(word, withFinal, withoutFinal) {
  const last = word.charCodeAt(word.length - 1);
  if (last < 0xac00 || last > 0xd7a3) return withoutFinal;
  const final = (last - 0xac00) % 28;
  if (final === 0) return withoutFinal;
  if (final === 8 && withFinal === "으로") return withoutFinal; // ㄹ + (으)로
  return withFinal;
}
