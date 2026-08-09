// 알록달록 물감 놀이 — 순수 상태 머신(씬·DOM 무관, node 테스트 대상).
// 라운드 흐름: order(그림·목표색 제시) → 튜브 고르기(1색 라운드 1개, 혼합
// 라운드 2개) → 마지막 튜브에서 자동 혼합 → 앱이 곧바로 칠하기 → 일치/불일치.
// 젓기·칠하기 버튼은 없다(사용자 결정 2026-08-05: "두 개 고르면 자동으로
// 합쳐지고 완료"). 벌점 없음: 불일치는 결과 색 실명 호명 + 병 헹굼 + 재도전.
// 힌트 에스컬레이션: 물방울(재료 표시) → 정답 튜브 반짝. 별은 성공마다 +1.

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
    jar: [],            // 병에 든 재료 색 id (고른 순서)
    mixed: false,       // 필요한 튜브를 다 골라 색이 섞였다(자동)
    tries: 0,           // 현재 라운드 실패 횟수
    stars: 0,
    gallery: [],        // 완성 순서대로 { colorId, subjectId } (액자·전시회 벽)
    finale: false,
    rainbow: false,
    focusIndex: 0       // 0..4 튜브, 5 헹구기 (씬·앱 공용 인덱스)
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

// 병이 최종적으로 담고 있는 색 — 섞이기 전엔 null.
export function jarColor(state) {
  if (!state.mixed) return null;
  if (state.jar.length === 1) return state.jar[0];
  if (state.jar.length === 2) return mixResult(state.jar[0], state.jar[1]);
  if (state.jar.length === 3) {
    return mixResult(state.jar[0], state.jar[1], state.jar[2]);
  }
  return null;
}

// 수식 칩 문자열 조각 — 씬·자막이 같은 원본을 쓴다. 섞이기 전 result는 null.
// 예: { a: "빨강", b: "노랑", c: null, result: "주황" | null }
export function equationFor(state) {
  const round = currentRound(state);
  if (!round) return null;
  const need = recipeFor(round.colorId).length;
  const name = id => (id ? PAINT_COLORS[id].ko : null);
  return {
    a: name(state.jar[0]),
    b: need >= 2 ? name(state.jar[1]) : null,
    c: need >= 3 ? name(state.jar[2]) : null,
    result: name(jarColor(state))
  };
}

// ── 행동들 — 각 함수는 events 배열을 돌려주고 상태를 제자리 갱신한다 ──────

export function squeezeTube(state, tubeId) {
  const round = currentRound(state);
  if (!round || state.finale) return [];
  const need = recipeFor(round.colorId).length;
  if (state.mixed || state.jar.length >= need) {
    // 레시피 정원 제한(사용자 결정): 가득 찬 병에는 더 담을 수 없다 — 잠금만
    return [{ type: "locked", reason: "full" }];
  }
  if (state.jar.includes(tubeId)) {
    // 더블탭 방어: 같은 색 두 번째는 무른다. 2·3재료 레시피는 모두 서로 다른
    // 색이라 이걸로 잃는 조작이 없다(같은 색 혼합은 학습 내용이 아니다).
    return [{ type: "locked", reason: "same-color", color: tubeId }];
  }
  state.jar.push(tubeId);
  const events = [{ type: "squeeze", color: tubeId }];
  if (state.jar.length >= need) {
    // 필요한 만큼 고르면 그 자리에서 섞인다 — 젓기 단계 없음.
    // jar 스냅샷은 앱이 혼합 낭독(정식 레시피 문장 vs 실명 호명)을 고를 때 쓴다.
    state.mixed = true;
    events.push({ type: "mixed", color: jarColor(state), jar: [...state.jar] });
  }
  return events;
}

export function rinseJar(state) {
  if (state.finale) return [];
  const hadPaint = state.jar.length > 0;
  state.jar = [];
  state.mixed = false;
  return hadPaint ? [{ type: "rinsed" }] : [];
}

// 혼합 직후 앱이 자동으로 부른다(버튼 없음) — 일치면 성공, 아니면 재도전.
export function paintCanvas(state) {
  const round = currentRound(state);
  if (!round || state.finale || !state.mixed) return [];
  const result = jarColor(state);
  if (result === round.colorId) {
    state.stars += 1;
    // 색+그림을 함께 기억한다 — 피날레 전시회 벽이 그림째로 건다.
    state.gallery.push({ colorId: result, subjectId: round.subjectId });
    const events = [{
      type: "success",
      color: result,
      subjectId: round.subjectId,
      equation: equationFor(state)
    }];
    state.roundIndex += 1;
    state.jar = [];
    state.mixed = false;
    state.tries = 0;
    if (state.roundIndex >= state.rounds.length) {
      state.finale = true;
      state.rainbow =
        new Set(state.gallery.map(entry => entry.colorId)).size >= RAINBOW_COUNT;
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
  state.mixed = false;
  return mismatch;
}

// 포커스 이동(←/→) — 0..4 튜브, 5 헹구기.
export const PAINT_FOCUS_COUNT = 6;

export function movePaintFocus(state, delta) {
  state.focusIndex =
    (state.focusIndex + delta + PAINT_FOCUS_COUNT) % PAINT_FOCUS_COUNT;
  return state.focusIndex;
}
