// 물감 놀이 씬 계약 — 튜브 5·병·수식 칩·갤러리·힌트 표기가 상태를 투영한다.

import test from "node:test";
import assert from "node:assert/strict";
import {
  createPaintPlay,
  currentRound,
  paintCanvas,
  recipeFor,
  squeezeTube
} from "../src/paint-play.mjs";
import {
  paintSubjectSvg,
  renderPaintPlay,
  updatePaintPlay
} from "../src/paint-play-scene.mjs";
import { PAINT_COLORS, PAINT_SUBJECTS } from "../src/paint-play-data.mjs";

class FakeStyle {
  constructor() { this.values = new Map(); }
  setProperty(name, value) { this.values.set(name, String(value)); }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.style = new FakeStyle();
    this.children = [];
    this.attributes = new Map();
    this.textContent = "";
    this.innerHTML = "";
  }
  append(...children) { this.children.push(...children); }
  replaceChildren(...children) { this.children = [...children]; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  addEventListener() {}
}

const document = {
  createElement(tagName) { return new FakeElement(tagName); }
};

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function byClass(root, className) {
  return descendants(root).filter(node =>
    typeof node.className === "string" &&
    node.className.split(" ").includes(className)
  );
}

test("모든 그림 주제는 칠해질 면(pp-fillable)이 있는 SVG를 만든다", () => {
  for (const subject of PAINT_SUBJECTS) {
    const svg = paintSubjectSvg(subject.id);
    assert.match(svg, /^<svg /, subject.id);
    assert.ok(svg.includes("pp-fillable"), `${subject.id} fillable`);
    assert.ok(svg.includes("var(--pp-fill"), `${subject.id} fill 변수`);
    assert.doesNotMatch(svg, /<image|<filter|<animate/i, subject.id);
  }
});

test("기본 렌더 — 튜브 5개·번호 배지·마스코트·병·수식·갤러리 액자", () => {
  const state = createPaintPlay("steady", 2);
  const root = renderPaintPlay(document, state);
  assert.equal(byClass(root, "pp-tube").length, 5);
  assert.deepEqual(
    byClass(root, "pp-tube-num").map(node => node.textContent),
    ["1", "3", "5", "9", "10"]
  );
  assert.equal(byClass(root, "pp-tube-mascot").length, 5);
  assert.equal(byClass(root, "pp-jar").length, 1);
  assert.equal(byClass(root, "pp-equation").length, 1);
  assert.equal(byClass(root, "pp-frame").length, state.rounds.length);
  assert.equal(byClass(root, "pp-canvas")[0].dataset.subject,
    currentRound(state).subjectId);
});

test("물방울 힌트 — 레시피 재료 튜브에만 data-hint=drop", () => {
  const state = createPaintPlay("steady", 2);
  const round = currentRound(state);
  const recipe = recipeFor(round.colorId);
  const root = renderPaintPlay(document, state);
  for (const tube of byClass(root, "pp-tube")) {
    const expected = recipe.includes(tube.dataset.tube) ? "drop" : "";
    assert.equal(tube.dataset.hint, expected, tube.dataset.tube);
  }
});

test("고르기가 병 레이어와 수식 칩에 반영되고 두 개째에 섞인다", () => {
  const state = createPaintPlay("steady", 2);
  const round = currentRound(state);
  const [a, b] = recipeFor(round.colorId);
  squeezeTube(state, a);
  let root = renderPaintPlay(document, state);
  assert.equal(byClass(root, "pp-jar-layer").length, 1);
  assert.equal(byClass(root, "pp-jar-mixed").length, 0, "한 개면 혼합 없음");
  assert.equal(byClass(root, "pp-eq-result")[0].textContent, "?");
  squeezeTube(state, b);
  root = updatePaintPlay(root, state, document);
  assert.equal(byClass(root, "pp-jar-layer").length, 2);
  assert.equal(byClass(root, "pp-jar-mixed").length, 1, "두 개째에 자동 혼합");
  assert.notEqual(byClass(root, "pp-eq-result")[0].textContent, "?");
});

// 사용자 결정(2026-08-05): 확인 버튼 없이 자동 완료 — 선반에는 헹구기만.
test("선반에 젓기·칠하기 버튼이 없다(헹구기 하나만)", () => {
  const state = createPaintPlay("steady", 2);
  const root = renderPaintPlay(document, state);
  const actions = byClass(root, "pp-action");
  assert.equal(actions.length, 1);
  assert.ok(actions[0].className.includes("pp-rinse"));
  assert.equal(byClass(root, "pp-paint").length, 0);
});

test("성공 라운드 뒤 갤러리 액자가 채워진다", () => {
  const state = createPaintPlay("easy", 3);
  const round = currentRound(state);
  for (const part of recipeFor(round.colorId)) squeezeTube(state, part);
  paintCanvas(state);
  const root = renderPaintPlay(document, state);
  const frames = byClass(root, "pp-frame");
  assert.equal(frames[0].dataset.filled, round.colorId);
  assert.equal(frames[1].dataset.filled, "");
});

test("피날레 — 전시회 벽에 칠한 그림 도화지가 걸리고 화가님 멘트가 나온다", () => {
  const state = createPaintPlay("easy", 5);
  while (!state.finale) {
    const round = currentRound(state);
    for (const part of recipeFor(round.colorId)) squeezeTube(state, part);
    paintCanvas(state);
  }
  const root = renderPaintPlay(document, state);
  assert.equal(root.dataset.finale, "true");
  const papers = byClass(root, "pp-paper");
  assert.equal(papers.length, state.rounds.length, "완주한 그림 수만큼 도화지");
  papers.forEach((paper, index) => {
    const art = byClass(paper, "pp-paper-art")[0];
    assert.ok(art, `도화지 ${index} 그림`);
    assert.ok(art.innerHTML.includes("pp-fillable"), `도화지 ${index} SVG`);
    assert.equal(
      art.style.values.get("--pp-fill"),
      // 완성색으로 칠해진 채 전시된다
      PAINT_COLORS[state.gallery[index].colorId].hex,
      `도화지 ${index} 채색`
    );
    const name = byClass(paper, "pp-paper-name")[0];
    assert.ok(name.textContent.length > 0, `도화지 ${index} 이름표`);
  });
  const note = byClass(root, "pp-finale-note")[0];
  assert.ok(note.textContent.includes(`별 ${state.stars}개`));
  assert.ok(note.textContent.includes("멋진 화가님"), "화가님 멘트");
});

test("3색 혼합 라운드 — 수식 칩이 세 재료로 늘어난다", () => {
  const state = createPaintPlay("challenge", 1);
  const index = state.rounds.findIndex(round => round.stage === 5);
  assert.ok(index >= 0);
  state.roundIndex = index;
  const round = currentRound(state);
  const [a, b, c] = recipeFor(round.colorId);
  let root = renderPaintPlay(document, state);
  assert.equal(byClass(root, "pp-eq-c").length, 1, "세 번째 칩 자리");
  squeezeTube(state, a);
  squeezeTube(state, b);
  squeezeTube(state, c);
  root = updatePaintPlay(root, state, document);
  assert.equal(byClass(root, "pp-jar-layer").length, 3, "병에 세 층");
  assert.notEqual(byClass(root, "pp-eq-result")[0].textContent, "?");
});
