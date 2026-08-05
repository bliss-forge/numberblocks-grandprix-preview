// 알록달록 물감 놀이 — 순수 상태 머신(씬·DOM 무관, node 테스트 대상).
// 라운드 흐름: order(그림·목표색 제시) → 튜브 짜기(병에 최대 레시피 길이만큼)
// → 젓기(2색일 때만; 1색 라운드는 짜는 즉시 완성) → 칠하기 → 일치/불일치.
// 벌점 없음: 불일치는 결과 색 실명 호명 + 병 헹굼 + 재도전. 힌트 에스컬레이션:
// 물방울(재료 표시) → 정답 튜브 반짝. 별은 성공마다 +1(시도 횟수 무관).

import {
  PAINT_COLORS,
  PAINT_RECIPES,
  PAINT_SUBJECTS,
  RAINBOW_COUNT,
  STAGE_PLANS,
  mixResult
} from "./paint-play-data.mjs";
import { mulberry } from "./ktx-route-data.mjs";

const VEHICLE_WEIGHT = 0.6; // 같은 색에 탈것·비탈것이 다 있으면 탈것 확률

function subjectsFor(colorId) {
  return PAINT_SUBJECTS.filter(subject => subject.color === colorId);
}

function pickSubject(random, colorId) {
  const pool = subjectsFor(colorId);
  const vehicles = pool.filter(subject => subject.vehicle);
  const others = pool.filter(subject => !subject.vehicle);
  if (vehicles.length && others.length) {
    return random() < VEHICLE_WEIGHT
      ? vehicles[Math.floor(random() * vehicles.length)]
      : others[Math.floor(random() * others.length)];
  }
  return pool[Math.floor(random() * pool.length)];
}

function stageColors(stage) {
  // 역추론(4)은 혼합 스테이지(2·3) 색에서 출제한다.
  const wanted = stage === 4 ? [2, 3] : [stage];
  const ids = new Set(
    PAINT_SUBJECTS.filter(subject => wanted.includes(subject.stage))
      .map(subject => subject.color)
  );
  return [...ids];
}

// 라운드 목록 — 같은 색 연속 출제를 피하며 스테이지 계획대로 뽑는다.
function buildRounds(plan, random) {
  const rounds = [];
  let previous = null;
  for (const stage of plan) {
    const colors = stageColors(stage).filter(id => id !== previous);
    const colorId = colors[Math.floor(random() * colors.length)];
    const subject = pickSubject(random, colorId);
    rounds.push({
      stage,
      colorId,
      subjectId: subject.id,
      // 4스테이지(역추론)만 힌트 없이 시작 — 나머지는 물방울 힌트 기본
      hintLevel: stage === 4 ? 0 : 1
    });
    previous = colorId;
  }
  return rounds;
}

export function createPaintPlay(difficulty = "easy", seed = 0) {
  const plan = STAGE_PLANS[difficulty] ?? STAGE_PLANS.easy;
  const random = mulberry(seed + 11);
  return {
    seed,
    difficulty,
    rounds: buildRounds(plan, random),
    roundIndex: 0,
    jar: [],            // 병에 든 재료 색 id (짠 순서)
    stirred: false,     // 젓기 완료(1색 라운드는 짜는 즉시 true)
    stirCount: 0,       // ⎵ 연타 진행(연출용 — 1회만 눌러도 3틱 뒤 완성 관용)
    tries: 0,           // 현재 라운드 실패 횟수
    stars: 0,
    gallery: [],        // 완성한 색 id 순서대로 (액자)
    finale: false,
    rainbow: false,
    focusIndex: 0       // 0..4 튜브, 5 헹구기, 6 칠하기 (씬·앱 공용 인덱스)
  };
}

export function currentRound(state) {
  return state.rounds[state.roundIndex] ?? null;
}

export function currentSubject(state) {
  const round = currentRound(state);
  return round
    ? PAINT_SUBJECTS.find(subject => subject.id === round.subjectId)
    : null;
}

export function recipeFor(colorId) {
  return PAINT_RECIPES[colorId] ?? [];
}

// 병이 최종적으로 담고 있는 색 — 젓기 전엔 null.
export function jarColor(state) {
  if (!state.stirred) return null;
  if (state.jar.length === 1) return state.jar[0];
  if (state.jar.length === 2) return mixResult(state.jar[0], state.jar[1]);
  return null;
}

// 수식 칩 문자열 조각 — 씬·자막이 같은 원본을 쓴다.
// 예: { a: "빨강", b: "노랑", result: "주황" | null }
export function equationFor(state) {
  const round = currentRound(state);
  if (!round) return null;
  const need = recipeFor(round.colorId).length;
  const name = id => (id ? PAINT_COLORS[id].ko : null);
  if (need === 1) {
    return { a: name(state.jar[0]), b: null, result: name(jarColor(state)) };
  }
  return {
    a: name(state.jar[0]),
    b: name(state.jar[1]),
    result: name(jarColor(state))
  };
}

// ── 행동들 — 각 함수는 events 배열을 돌려주고 상태를 제자리 갱신한다 ──────

export function squeezeTube(state, tubeId) {
  const round = currentRound(state);
  if (!round || state.finale) return [];
  const need = recipeFor(round.colorId).length;
  if (state.stirred || state.jar.length >= Math.max(need, 2) ||
      (need === 1 && state.jar.length >= 1)) {
    // 2색 제한(사용자 결정): 가득 찬 병에는 더 짤 수 없다 — 잠금 이벤트만
    return [{ type: "locked" }];
  }
  state.jar.push(tubeId);
  const events = [{ type: "squeeze", color: tubeId }];
  if (need === 1 && state.jar.length === 1) {
    // 원색 라운드 — 젓기 없이 바로 완성
    state.stirred = true;
    events.push({ type: "mixed", color: jarColor(state) });
  }
  return events;
}

export function stirJar(state) {
  const round = currentRound(state);
  if (!round || state.finale || state.stirred) return [];
  const need = recipeFor(round.colorId).length;
  if (state.jar.length < need) return [];
  state.stirCount += 1;
  if (state.stirCount >= 1) {
    // 소근육 관용: 1회 젓기로도 완성(연타는 연출만 빨라진다)
    state.stirred = true;
    return [{ type: "mixed", color: jarColor(state) }];
  }
  return [{ type: "stirring", count: state.stirCount }];
}

export function rinseJar(state) {
  if (state.finale) return [];
  const hadPaint = state.jar.length > 0;
  state.jar = [];
  state.stirred = false;
  state.stirCount = 0;
  return hadPaint ? [{ type: "rinsed" }] : [];
}

export function paintCanvas(state) {
  const round = currentRound(state);
  if (!round || state.finale || !state.stirred) return [];
  const result = jarColor(state);
  if (result === round.colorId) {
    state.stars += 1;
    state.gallery.push(result);
    const events = [{
      type: "success",
      color: result,
      subjectId: round.subjectId,
      equation: equationFor(state)
    }];
    state.roundIndex += 1;
    state.jar = [];
    state.stirred = false;
    state.stirCount = 0;
    state.tries = 0;
    if (state.roundIndex >= state.rounds.length) {
      state.finale = true;
      state.rainbow = new Set(state.gallery).size >= RAINBOW_COUNT;
      events.push({ type: "finale", rainbow: state.rainbow, stars: state.stars });
    } else {
      events.push({ type: "next-round" });
    }
    return events;
  }
  // 불일치 — 결과 색을 실명으로 인정하고(벌점 없음) 병을 헹군 뒤 재도전
  state.tries += 1;
  if (round.hintLevel === 0 && state.tries >= 2) round.hintLevel = 1;
  else if (round.hintLevel === 1 && state.tries >= 2) round.hintLevel = 2;
  const mismatch = [{
    type: "mismatch",
    color: result,
    wantedColor: round.colorId,
    hintLevel: round.hintLevel
  }];
  state.jar = [];
  state.stirred = false;
  state.stirCount = 0;
  return mismatch;
}

// 포커스 이동(←/→) — 0..4 튜브, 5 헹구기, 6 칠하기.
export const PAINT_FOCUS_COUNT = 7;

export function movePaintFocus(state, delta) {
  state.focusIndex =
    (state.focusIndex + delta + PAINT_FOCUS_COUNT) % PAINT_FOCUS_COUNT;
  return state.focusIndex;
}
