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
  PAINT_TUBES,
  RAINBOW_COUNT,
  STAGE_PLANS,
  UNLOCKABLE,
  keyDigitSlot,
  mixJar,
  slotKeyDigit
} from "./paint-play-data.mjs";
import { mulberry } from "./ktx-route-data.mjs";

const VEHICLE_WEIGHT = 0.6; // 같은 색에 탈것·비탈것이 다 있으면 탈것 확률

function subjectsFor(colorId) {
  return PAINT_SUBJECTS.filter(subject => subject.color === colorId);
}

function pickSubject(random, colorId, used = new Set()) {
  const all = subjectsFor(colorId);
  const fresh = all.filter(subject => !used.has(subject.id));
  const pool = fresh.length ? fresh : all;
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

// 라운드 목록 — 한 판에 같은 색·같은 그림을 두 번 내지 않는다.
// 예전엔 직전 라운드만 걸러서, 같은 스테이지가 떨어져 배치되면 같은 그림이
// 다시 나오고 전시회 벽에 같은 그림 두 장이 걸렸다(2026-08-11 리뷰).
// 스테이지별 색 풀(3·3·4·7·6·4)이 계획의 반복 횟수보다 넉넉해 전량 배제가 되고,
// 그래도 후보가 마르면 직전 색만 피하는 쪽으로 물러선다.
function buildRounds(plan, random, unlocked = []) {
  const rounds = [];
  const usedColors = new Set();
  const usedSubjects = new Set();
  let previous = null;
  for (const stage of plan) {
    const pool = stageColors(stage);
    let colors = pool.filter(id => !usedColors.has(id));
    if (stage === 4) {
      // 역추론은 "무엇과 무엇을 섞을까"를 묻는 라운드다. 이미 튜브로 가진
      // 색을 내면 그 튜브 한 번으로 정원이 차서 물음 자체가 사라진다.
      const notOwned = colors.filter(id => !unlocked.includes(id));
      if (notOwned.length) colors = notOwned;
    }
    if (!colors.length) colors = pool.filter(id => id !== previous);
    if (!colors.length) colors = pool;
    const colorId = colors[Math.floor(random() * colors.length)];
    const subject = pickSubject(random, colorId, usedSubjects);
    usedColors.add(colorId);
    usedSubjects.add(subject.id);
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

export function createPaintPlay(difficulty = "easy", seed = 0, unlocked = []) {
  const plan = STAGE_PLANS[difficulty] ?? STAGE_PLANS.easy;
  const random = mulberry(seed + 11);
  // 얻은 순서를 그대로 지킨다 — 이 순서가 곧 선반 위치이자 숫자키다.
  const myTubes = [...new Set(unlocked)].filter(id => UNLOCKABLE.includes(id));
  return {
    seed,
    difficulty,
    rounds: buildRounds(plan, random, myTubes),
    roundIndex: 0,
    jar: [],            // 병에 든 재료 색 id (고른 순서)
    mixed: false,       // 필요한 튜브를 다 골라 색이 섞였다(자동)
    tries: 0,           // 현재 라운드 실패 횟수
    stars: 0,
    gallery: [],        // 완성 순서대로 { colorId, subjectId } (액자·전시회 벽)
    finale: false,
    rainbow: false,
    // 해금한 "내 물감" — 완성해 본 혼합색이 튜브가 된다(앱이 localStorage 유지)
    myTubes,
    focusIndex: 0       // 0..선반끝 튜브, 마지막 칸 헹구기 (씬·앱 공용 인덱스)
  };
}

// 선반의 튜브 목록 — 기본 5 + 해금한 내 물감. 씬·앱이 같은 순서를 쓴다.
// 해금 튜브는 얻은 순서 그대로 뒤에 붙는다(append-only). 숫자키가 위치에서
// 나오므로 이 순서가 곧 키다 — 한 번 6번이 된 색은 영원히 6번이어야 한다.
// 팔레트 선언 순서로 정렬하면 앞선 색을 나중에 해금할 때 뒤 튜브가 통째로
// 밀려 아이가 외운 키가 판 중간에 바뀐다(2026-08-11 리뷰에서 잡힌 회귀).
// localStorage 가 얻은 순서를 그대로 보존하므로 세션 간에도 안정적이다.
export function shelfTubes(state) {
  return [...PAINT_TUBES, ...state.myTubes.map(id => ({ id, unlocked: true }))];
}

// 숫자키 하나가 가리키는 선반 칸 — 앱·테스트가 같은 함수를 본다.
// 앱단에만 있던 계산이라 회귀해도 아무 테스트가 울지 않던 자리다.
export function tubeForDigit(state, digit) {
  const index = keyDigitSlot(digit);
  if (index < 0) return null;
  const tubes = shelfTubes(state);
  return index < tubes.length ? { index, tube: tubes[index] } : null;
}

// 병에 든 "재료 유닛" 수 — 해금 튜브는 재료 수만큼 차지한다(주황=2유닛).
// 정원(need)은 기본 레시피 기준이라, 지름길을 쓰면 더 적은 손짓으로 찬다.
function jarUnits(state) {
  return state.jar.reduce(
    (total, id) => total + (PAINT_RECIPES[id]?.length ?? 1), 0
  );
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
// 해금 튜브가 섞여 있어도 mixJar가 재료 전개로 판정한다.
export function jarColor(state) {
  if (!state.mixed) return null;
  return mixJar(state.jar);
}

export { slotKeyDigit, keyDigitSlot };

// 수식 칩 조각 — 씬·자막이 같은 원본을 쓴다. parts는 부은 튜브 이름 +
// 남은 유닛만큼의 빈 칸(null). 상한은 레시피 최대 재료 수(4)다 —
// 3으로 잘려 있던 동안 4색 라운드는 "빨강+노랑+파랑 = 모래색"이라는
// 틀린 식을 자막·음성으로 가르쳤다(2026-08-11 감사에서 발견).
const EQUATION_SLOTS = 4;

export function equationFor(state) {
  const round = currentRound(state);
  if (!round) return null;
  const need = recipeFor(round.colorId).length;
  const names = state.jar.map(id => PAINT_COLORS[id].ko);
  const remaining = state.mixed ? 0 : Math.max(0, need - jarUnits(state));
  const parts = [...names, ...Array(remaining).fill(null)]
    .slice(0, EQUATION_SLOTS);
  if (parts.length === 0) parts.push(null);
  const result = jarColor(state);
  return { parts, result: result ? PAINT_COLORS[result].ko : null };
}

// ── 행동들 — 각 함수는 events 배열을 돌려주고 상태를 제자리 갱신한다 ──────

export function squeezeTube(state, tubeId) {
  const round = currentRound(state);
  if (!round || state.finale) return [];
  const need = recipeFor(round.colorId).length;
  if (state.mixed || jarUnits(state) >= need) {
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
  if (jarUnits(state) >= need) {
    // 유닛이 차면 그 자리에서 섞인다 — 젓기 단계 없음. 해금 튜브 지름길은
    // 더 적은 손짓으로 여기 도달한다(주황+하양 = 2번 = 살구색).
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
    // 처음 완성한 혼합색은 "내 물감"으로 해금 — 즉시 선반에 추가된다.
    if (UNLOCKABLE.includes(result) && !state.myTubes.includes(result)) {
      state.myTubes.push(result);
      events.push({ type: "unlocked", color: result });
    }
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

// 포커스 이동(←/→) — 선반 튜브 전체 + 마지막 칸 헹구기. 해금 수에 따라 는다.
export function paintFocusCount(state) {
  return shelfTubes(state).length + 1;
}

export function movePaintFocus(state, delta) {
  const count = paintFocusCount(state);
  state.focusIndex = (state.focusIndex + delta + count) % count;
  return state.focusIndex;
}
