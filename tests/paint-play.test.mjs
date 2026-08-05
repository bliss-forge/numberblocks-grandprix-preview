// 물감 놀이 상태 머신 계약 — 시드 재현성·2색 잠금·젓기 관용·힌트·벌점 없음.

import test from "node:test";
import assert from "node:assert/strict";
import {
  PAINT_FOCUS_COUNT,
  createPaintPlay,
  currentRound,
  currentSubject,
  equationFor,
  jarColor,
  movePaintFocus,
  paintCanvas,
  recipeFor,
  rinseJar,
  squeezeTube,
  stirJar
} from "../src/paint-play.mjs";
import { PAINT_RECIPES, STAGE_PLANS } from "../src/paint-play-data.mjs";

// 현재 라운드를 정답으로 완성한다 — 테스트 헬퍼.
function solveRound(state) {
  const round = currentRound(state);
  for (const part of recipeFor(round.colorId)) squeezeTube(state, part);
  if (!state.stirred) stirJar(state);
  return paintCanvas(state);
}

test("같은 시드는 같은 라운드 목록을 만든다 (재현성)", () => {
  const a = createPaintPlay("challenge", 42);
  const b = createPaintPlay("challenge", 42);
  assert.deepEqual(a.rounds, b.rounds);
  const c = createPaintPlay("challenge", 43);
  assert.notDeepEqual(a.rounds, c.rounds);
});

test("난이도별 라운드 수·스테이지가 계획을 따른다", () => {
  for (const [difficulty, plan] of Object.entries(STAGE_PLANS)) {
    const state = createPaintPlay(difficulty, 7);
    assert.equal(state.rounds.length, plan.length, difficulty);
    state.rounds.forEach((round, index) => {
      assert.equal(round.stage, plan[index], `${difficulty}[${index}]`);
      assert.equal(
        round.hintLevel, plan[index] === 4 ? 0 : 1,
        `${difficulty}[${index}] 힌트 시작값`
      );
    });
  }
});

test("라운드는 목표색과 주제가 정합하고 같은 색이 연속되지 않는다", () => {
  for (const seed of [1, 2, 3, 4, 5]) {
    const state = createPaintPlay("challenge", seed);
    let previous = null;
    for (const round of state.rounds) {
      assert.ok(PAINT_RECIPES[round.colorId], "레시피 있는 색");
      assert.notEqual(round.colorId, previous, "연속 색 금지");
      previous = round.colorId;
    }
  }
});

test("원색 라운드는 한 번 짜면 바로 완성된다 (젓기 생략)", () => {
  const state = createPaintPlay("easy", 1);
  const round = currentRound(state);
  assert.equal(round.stage, 1);
  const events = squeezeTube(state, round.colorId);
  assert.ok(events.some(event => event.type === "mixed"));
  assert.equal(jarColor(state), round.colorId);
});

test("혼합 라운드 — 2색 제한: 가득 찬 병에는 잠금 이벤트만 나온다", () => {
  const state = createPaintPlay("steady", 1);
  const round = currentRound(state);
  const [a, b] = recipeFor(round.colorId);
  squeezeTube(state, a);
  squeezeTube(state, b);
  const locked = squeezeTube(state, "red");
  assert.deepEqual(locked, [{ type: "locked" }]);
  assert.equal(state.jar.length, 2);
});

test("젓기 관용 — 1회만 저어도 완성된다", () => {
  const state = createPaintPlay("steady", 1);
  const round = currentRound(state);
  const [a, b] = recipeFor(round.colorId);
  squeezeTube(state, a);
  assert.equal(stirJar(state).length, 0, "재료 부족이면 무시");
  squeezeTube(state, b);
  const events = stirJar(state);
  assert.ok(events.some(event => event.type === "mixed"));
  assert.equal(jarColor(state), round.colorId);
});

test("수식 칩 — 젓기 전 '빨강+노랑=?', 젓은 후 결과가 채워진다", () => {
  const state = createPaintPlay("steady", 1);
  const round = currentRound(state);
  const [a, b] = recipeFor(round.colorId);
  squeezeTube(state, a);
  squeezeTube(state, b);
  const before = equationFor(state);
  assert.ok(before.a && before.b);
  assert.equal(before.result, null);
  stirJar(state);
  const after = equationFor(state);
  assert.ok(after.result, "젓기 후 결과 이름");
});

test("헹구기 — 병이 비고 판정·별 변화가 없다", () => {
  const state = createPaintPlay("steady", 1);
  const round = currentRound(state);
  squeezeTube(state, recipeFor(round.colorId)[0]);
  const events = rinseJar(state);
  assert.deepEqual(events, [{ type: "rinsed" }]);
  assert.equal(state.jar.length, 0);
  assert.equal(state.stars, 0);
  assert.equal(state.tries, 0, "헹구기는 실패가 아니다");
});

test("불일치 — 벌점 없이(별 불변) 결과 색을 호명하고 병을 비운다", () => {
  const state = createPaintPlay("steady", 1);
  const round = state.rounds[0];
  round.colorId = "orange";
  round.subjectId = "carrot";
  squeezeTube(state, "red");
  squeezeTube(state, "blue"); // 보라 — 주문(주황)과 다르다
  stirJar(state);
  const events = paintCanvas(state);
  const mismatch = events.find(event => event.type === "mismatch");
  assert.ok(mismatch);
  assert.equal(mismatch.color, "purple");
  assert.equal(mismatch.wantedColor, "orange");
  assert.equal(state.stars, 0);
  assert.equal(state.roundIndex, 0, "같은 라운드 재도전");
  assert.equal(state.jar.length, 0, "병 자동 헹굼");
});

test("힌트 에스컬레이션 — 물방울 라운드는 2회 실패에 반짝(2)으로", () => {
  const state = createPaintPlay("steady", 1);
  const round = state.rounds[0];
  round.colorId = "orange";
  assert.equal(round.hintLevel, 1);
  for (const _ of [1, 2]) {
    squeezeTube(state, "red");
    squeezeTube(state, "blue");
    stirJar(state);
    paintCanvas(state);
  }
  assert.equal(round.hintLevel, 2);
});

test("역추론 라운드(스테이지 4) — 힌트 0에서 2회 실패 시 물방울(1) 복귀", () => {
  const state = createPaintPlay("challenge", 1);
  const index = state.rounds.findIndex(round => round.stage === 4);
  assert.ok(index >= 0);
  state.roundIndex = index;
  const round = state.rounds[index];
  round.colorId = "orange";
  assert.equal(round.hintLevel, 0);
  for (const _ of [1, 2]) {
    squeezeTube(state, "red");
    squeezeTube(state, "blue");
    stirJar(state);
    paintCanvas(state);
  }
  assert.equal(round.hintLevel, 1);
});

test("성공 — 별+1·갤러리 적재·수식 포함·다음 라운드로", () => {
  const state = createPaintPlay("easy", 3);
  const round = currentRound(state);
  const events = solveRound(state);
  const success = events.find(event => event.type === "success");
  assert.ok(success);
  assert.equal(success.color, round.colorId);
  assert.ok(success.equation.a, "성공 이벤트에 수식");
  assert.equal(state.stars, 1);
  assert.deepEqual(state.gallery, [round.colorId]);
  assert.equal(state.roundIndex, 1);
});

test("전 라운드 완주 — finale 이벤트와 상태", () => {
  const state = createPaintPlay("easy", 5);
  let finale = null;
  while (!state.finale) {
    const events = solveRound(state);
    finale = events.find(event => event.type === "finale") ?? finale;
  }
  assert.ok(finale);
  assert.equal(state.stars, state.rounds.length);
  assert.equal(state.gallery.length, state.rounds.length);
  assert.equal(finale.rainbow, new Set(state.gallery).size >= 7);
});

test("도전 완주 시 서로 다른 색 7개면 무지개가 뜰 수 있다", () => {
  // 시드를 훑어 7색 완주가 실제로 가능함을 보인다(가능성 계약)
  let found = false;
  for (let seed = 0; seed < 60 && !found; seed += 1) {
    const state = createPaintPlay("challenge", seed);
    const distinct = new Set(state.rounds.map(round => round.colorId));
    if (distinct.size >= 7) found = true;
  }
  assert.ok(found, "7색 라운드 구성이 존재");
});

test("포커스 순환 — 7칸을 양방향으로 감싼다", () => {
  const state = createPaintPlay("easy", 1);
  assert.equal(movePaintFocus(state, -1), PAINT_FOCUS_COUNT - 1);
  assert.equal(movePaintFocus(state, 1), 0);
  assert.equal(currentSubject(state).color, currentRound(state).colorId);
});
