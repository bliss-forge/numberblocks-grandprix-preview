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
  navy: Object.freeze({ ko: "남색", hex: "#2d4a8a" }),
  // 발견 색 — 주문 목표로는 안 나오지만 자유 혼합에서 만들어지는 진짜 색.
  // 어떤 조합을 저어도 "새 색의 이름을 배우는" 결과가 되게 한다(벌점 없음 철학).
  lightyellow: Object.freeze({ ko: "연노랑", hex: "#ffe9a8" }),
  olive: Object.freeze({ ko: "올리브", hex: "#8a8f3d" }),
  gray: Object.freeze({ ko: "회색", hex: "#9aa2ad" }),
  // 3색 혼합 주문색 — steady·challenge 스테이지 5에서 출제된다.
  peach: Object.freeze({ ko: "살구색", hex: "#ffc9a3" }),
  yellowgreen: Object.freeze({ ko: "연두", hex: "#a9d94e" }),
  lavender: Object.freeze({ ko: "연보라", hex: "#c9a3e8" }),
  darkbrown: Object.freeze({ ko: "고동색", hex: "#6f4a2f" }),
  darkgreen: Object.freeze({ ko: "진초록", hex: "#2e7d4f" }),
  darkpurple: Object.freeze({ ko: "진보라", hex: "#6b3fa0" }),
  // 3색 발견 색 — 주문에는 안 나오지만 자유 혼합의 모든 3색 조합을 실명으로 받는다.
  brick: Object.freeze({ ko: "벽돌색", hex: "#b4574b" }),
  khaki: Object.freeze({ ko: "카키", hex: "#a89a5b" }),
  bluegray: Object.freeze({ ko: "청회색", hex: "#7288a5" })
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

// ── 레시피 — 결과색 → 재료(1개=원색 그대로, 2개=혼합, 3개=3색 혼합) ──────
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
  navy: Object.freeze(["blue", "black"]),
  peach: Object.freeze(["red", "yellow", "white"]),
  yellowgreen: Object.freeze(["yellow", "blue", "white"]),
  lavender: Object.freeze(["red", "blue", "white"]),
  darkbrown: Object.freeze(["red", "yellow", "blue"]),
  darkgreen: Object.freeze(["yellow", "blue", "black"]),
  darkpurple: Object.freeze(["red", "blue", "black"])
});

export function mixKey(...parts) {
  return [...parts].sort().join("+");
}

// 레시피 밖 발견 조합 — 튜브 5종의 나머지 2색 조합도 전부 정의한다.
// (아이가 아무 조합이나 섞어도 항상 "진짜 색"이 나와야 한다 — null 금지)
const EXTRA_MIXES = Object.freeze({
  [mixKey("yellow", "white")]: "lightyellow",
  [mixKey("yellow", "black")]: "olive",
  [mixKey("black", "white")]: "gray"
});

// 레시피 밖 3색 발견 조합 — 서로 다른 튜브 3개 조합 C(5,3)=10 전부 정의.
// 빨+노+검은 새 색 대신 기존 밤색을 재사용한다(주황+검정=밤색, 실제 물감 직관).
const EXTRA_MIXES_3 = Object.freeze({
  [mixKey("red", "black", "white")]: "brick",
  [mixKey("yellow", "black", "white")]: "khaki",
  [mixKey("blue", "black", "white")]: "bluegray",
  [mixKey("red", "yellow", "black")]: "brown"
});

// 혼합 룩업 — PAINT_RECIPES의 2재료 항목 + 발견 조합(단일 진실 유지).
export const MIX_TABLE = Object.freeze({
  ...Object.fromEntries(
    Object.entries(PAINT_RECIPES)
      .filter(([, parts]) => parts.length === 2)
      .map(([result, parts]) => [mixKey(...parts), result])
  ),
  ...EXTRA_MIXES
});

// 3색 혼합 룩업 — PAINT_RECIPES의 3재료 항목 + 3색 발견 조합.
export const MIX3_TABLE = Object.freeze({
  ...Object.fromEntries(
    Object.entries(PAINT_RECIPES)
      .filter(([, parts]) => parts.length === 3)
      .map(([result, parts]) => [mixKey(...parts), result])
  ),
  ...EXTRA_MIXES_3
});

// 재료를 섞은 결과 색 id — 2재료 또는 3재료. 같은 색끼리는 그 색 그대로.
// 서로 다른 튜브의 어떤 2·3색 조합도 null이 아니다.
export function mixResult(a, b, c = null) {
  if (c !== null) return MIX3_TABLE[mixKey(a, b, c)] ?? null;
  if (a === b) return a;
  return MIX_TABLE[mixKey(a, b)] ?? null;
}

// 혼합 낭독 원본 — "A와 B를 섞으면 C!" 문장이 말하는 재료.
// 낭독은 결과색으로만 키가 잡히므로, 병 내용이 이 재료와 일치할 때만
// 혼합 문장을 틀고 아니면 "우와, C가 됐네!"로 말한다(빨+노+검→밤색 케이스).
export const CANONICAL_MIX = Object.freeze({
  ...Object.fromEntries(
    Object.entries(PAINT_RECIPES).filter(([, parts]) => parts.length >= 2)
  ),
  lightyellow: Object.freeze(["yellow", "white"]),
  olive: Object.freeze(["yellow", "black"]),
  gray: Object.freeze(["black", "white"]),
  brick: Object.freeze(["red", "black", "white"]),
  khaki: Object.freeze(["yellow", "black", "white"]),
  bluegray: Object.freeze(["blue", "black", "white"])
});

// ── 그림 주제 — 회색 윤곽으로 제시되고 목표색으로 칠해진다 ────────────────
// stage: 1 원색 그대로 · 2 두 색 섞기 · 3 연하게/진하게 · 5 세 색 섞기.
// vehicle: 탈것 가중 출제 대상(사용자 결정 — 자동차 색 입히기 욕구 반영).
export const PAINT_SUBJECTS = Object.freeze([
  Object.freeze({ id: "firetruck", ko: "소방차", color: "red", vehicle: true, stage: 1 }),
  Object.freeze({ id: "strawberry", ko: "딸기", color: "red", vehicle: false, stage: 1 }),
  Object.freeze({ id: "chick", ko: "병아리", color: "yellow", vehicle: false, stage: 1 }),
  Object.freeze({ id: "banana", ko: "바나나", color: "yellow", vehicle: false, stage: 1 }),
  Object.freeze({ id: "bus", ko: "버스", color: "blue", vehicle: true, stage: 1 }),
  Object.freeze({ id: "whale", ko: "고래", color: "blue", vehicle: false, stage: 1 }),
  Object.freeze({ id: "carrot", ko: "당근", color: "orange", vehicle: false, stage: 2 }),
  Object.freeze({ id: "car", ko: "자동차", color: "orange", vehicle: true, stage: 2 }),
  Object.freeze({ id: "tangerine", ko: "귤", color: "orange", vehicle: false, stage: 2 }),
  Object.freeze({ id: "frog", ko: "개구리", color: "green", vehicle: false, stage: 2 }),
  Object.freeze({ id: "tractor", ko: "트랙터", color: "green", vehicle: true, stage: 2 }),
  Object.freeze({ id: "grape", ko: "포도", color: "purple", vehicle: false, stage: 2 }),
  Object.freeze({ id: "heli", ko: "헬리콥터", color: "purple", vehicle: true, stage: 2 }),
  Object.freeze({ id: "blossom", ko: "벚꽃", color: "pink", vehicle: false, stage: 3 }),
  Object.freeze({ id: "pig", ko: "돼지", color: "pink", vehicle: false, stage: 3 }),
  Object.freeze({ id: "boat", ko: "돛단배", color: "sky", vehicle: true, stage: 3 }),
  Object.freeze({ id: "plane", ko: "비행기", color: "sky", vehicle: true, stage: 3 }),
  Object.freeze({ id: "bear", ko: "곰돌이", color: "brown", vehicle: false, stage: 3 }),
  Object.freeze({ id: "rocket", ko: "로켓", color: "navy", vehicle: true, stage: 3 }),
  Object.freeze({ id: "submarine", ko: "잠수함", color: "navy", vehicle: true, stage: 3 }),
  // 3색 혼합(스테이지 5) — 한 색에 그림 하나씩, 여섯 색 전부 주문 가능.
  Object.freeze({ id: "peach", ko: "복숭아", color: "peach", vehicle: false, stage: 5 }),
  Object.freeze({ id: "caterpillar", ko: "애벌레", color: "yellowgreen", vehicle: false, stage: 5 }),
  Object.freeze({ id: "butterfly", ko: "나비", color: "lavender", vehicle: false, stage: 5 }),
  Object.freeze({ id: "acorn", ko: "도토리", color: "darkbrown", vehicle: false, stage: 5 }),
  Object.freeze({ id: "pine", ko: "소나무", color: "darkgreen", vehicle: false, stage: 5 }),
  Object.freeze({ id: "eggplant", ko: "가지", color: "darkpurple", vehicle: false, stage: 5 })
]);

// 난이도별 라운드 스테이지 계획.
// 4 = 역추론(힌트 없이 시작 — 2·3스테이지 색에서 출제, 2회 실패 시 힌트 복귀).
// 5 = 세 색 섞기 — easy에는 내지 않는다(4~6세 기본 난이도 보호).
export const STAGE_PLANS = Object.freeze({
  easy: Object.freeze([1, 1, 2, 2, 2]),
  steady: Object.freeze([2, 2, 2, 3, 3, 5]),
  challenge: Object.freeze([2, 3, 3, 5, 5, 4, 4])
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
