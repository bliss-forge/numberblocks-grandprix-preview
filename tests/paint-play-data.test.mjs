// 물감 놀이 데이터 계약 — 혼합 테이블·레시피·주제·튜브의 정합성.

import test from "node:test";
import assert from "node:assert/strict";
import {
  CANONICAL_MIX,
  MIX3_TABLE,
  MIX_TABLE,
  PAINT_COLORS,
  PAINT_RECIPES,
  PAINT_SUBJECTS,
  PAINT_TUBES,
  STAGE_PLANS,
  mixKey,
  mixResult
} from "../src/paint-play-data.mjs";

test("혼합은 순서 무관이다 (a+b = b+a)", () => {
  assert.equal(mixResult("red", "yellow"), "orange");
  assert.equal(mixResult("yellow", "red"), "orange");
  assert.equal(mixResult("white", "blue"), mixResult("blue", "white"));
});

test("모든 레시피 재료는 실제 튜브고, 결과는 팔레트에 있다", () => {
  const tubeIds = new Set(PAINT_TUBES.map(tube => tube.id));
  for (const [result, parts] of Object.entries(PAINT_RECIPES)) {
    assert.ok(PAINT_COLORS[result], `${result} 팔레트 등재`);
    assert.ok([1, 2, 3].includes(parts.length), `${result} 재료 수`);
    for (const part of parts) {
      assert.ok(tubeIds.has(part), `${result}의 재료 ${part}는 튜브여야 한다`);
    }
  }
});

test("2재료 레시피는 전부 MIX_TABLE에 존재한다 (미정의 조합 없음)", () => {
  for (const [result, parts] of Object.entries(PAINT_RECIPES)) {
    if (parts.length !== 2) continue;
    assert.equal(MIX_TABLE[mixKey(parts[0], parts[1])], result);
  }
});

test("튜브 5종의 모든 2색 조합(중복 포함)이 진짜 색을 낸다 — null 금지", () => {
  for (const a of PAINT_TUBES) {
    for (const b of PAINT_TUBES) {
      const result = mixResult(a.id, b.id);
      assert.ok(result, `${a.id}+${b.id}`);
      assert.ok(PAINT_COLORS[result], `${a.id}+${b.id} → ${result} 팔레트 등재`);
    }
  }
  assert.equal(mixResult("red", "red"), "red", "같은 색은 그대로");
  assert.equal(mixResult("black", "white"), "gray");
  assert.equal(mixResult("yellow", "white"), "lightyellow");
});

test("서로 다른 튜브 3색 조합 10가지가 전부 진짜 색을 낸다 — null 금지", () => {
  const tubes = PAINT_TUBES.map(tube => tube.id);
  for (let i = 0; i < tubes.length; i += 1) {
    for (let j = i + 1; j < tubes.length; j += 1) {
      for (let k = j + 1; k < tubes.length; k += 1) {
        const result = mixResult(tubes[i], tubes[j], tubes[k]);
        assert.ok(result, `${tubes[i]}+${tubes[j]}+${tubes[k]}`);
        assert.ok(PAINT_COLORS[result],
          `${tubes[i]}+${tubes[j]}+${tubes[k]} → ${result} 팔레트 등재`);
      }
    }
  }
  // 대표 조합 — 순서 무관, 빨+노+검은 기존 밤색을 재사용한다(주황+검정 직관)
  assert.equal(mixResult("red", "yellow", "white"), "peach");
  assert.equal(mixResult("white", "yellow", "red"), "peach");
  assert.equal(mixResult("red", "yellow", "black"), "brown");
});

test("혼합 낭독 원본(CANONICAL_MIX) — 모든 혼합색의 재료가 정의된다", () => {
  for (const [colorId, parts] of Object.entries(CANONICAL_MIX)) {
    assert.ok(PAINT_COLORS[colorId], `${colorId} 팔레트 등재`);
    assert.ok(parts.length === 2 || parts.length === 3, `${colorId} 재료 수`);
    const sorted = [...parts].sort().join("+");
    const table = parts.length === 2 ? MIX_TABLE : MIX3_TABLE;
    assert.equal(table[sorted], colorId, `${colorId} 재료가 혼합 테이블과 일치`);
  }
  // 레시피 있는 혼합색·발견색 모두 낭독 원본이 있다
  for (const [result, parts] of Object.entries(PAINT_RECIPES)) {
    if (parts.length >= 2) assert.ok(CANONICAL_MIX[result], `${result} 낭독 원본`);
  }
  for (const id of ["lightyellow", "olive", "gray", "brick", "khaki", "bluegray"]) {
    assert.ok(CANONICAL_MIX[id], `${id} 발견색 낭독 원본`);
  }
});

test("그림 주제는 목표색·스테이지가 팔레트·레시피와 정합한다", () => {
  for (const subject of PAINT_SUBJECTS) {
    assert.ok(PAINT_COLORS[subject.color], `${subject.id} 색`);
    const parts = PAINT_RECIPES[subject.color];
    assert.ok(parts, `${subject.id} 레시피`);
    if (subject.stage === 1) assert.equal(parts.length, 1, subject.id);
    else if (subject.stage === 5) assert.equal(parts.length, 3, subject.id);
    else assert.equal(parts.length, 2, subject.id);
    if (subject.stage === 3) {
      assert.ok(parts.includes("white") || parts.includes("black"),
        `${subject.id}는 연하게/진하게 스테이지`);
    }
  }
});

test("3색 혼합 스테이지(5) — 주문 가능한 색과 그림이 충분히 있다", () => {
  const stage5 = PAINT_SUBJECTS.filter(subject => subject.stage === 5);
  assert.ok(stage5.length >= 6, "3색 혼합 그림 6종 이상");
  const colors = new Set(stage5.map(subject => subject.color));
  assert.ok(colors.size >= 6, "3색 혼합 주문색 6종 이상");
  // steady·challenge 난이도에만 등장하고 easy에는 없다
  assert.ok(!STAGE_PLANS.easy.includes(5), "easy에는 3색 혼합 없음");
  assert.ok(STAGE_PLANS.steady.includes(5), "steady에 3색 혼합");
  assert.ok(STAGE_PLANS.challenge.includes(5), "challenge에 3색 혼합");
});

test("모든 스테이지 계획의 스테이지에 출제 가능한 주제가 있다", () => {
  const stages = new Set(PAINT_SUBJECTS.map(subject => subject.stage));
  for (const plan of Object.values(STAGE_PLANS)) {
    for (const stage of plan) {
      if (stage === 4) {
        assert.ok(stages.has(2) || stages.has(3));
      } else {
        assert.ok(stages.has(stage), `스테이지 ${stage}`);
      }
    }
  }
});

test("탈것 주제가 색마다 고르게 있다 (자동차 색 입히기 요구)", () => {
  const vehicles = PAINT_SUBJECTS.filter(subject => subject.vehicle);
  assert.ok(vehicles.length >= 6, "탈것 6종 이상");
  // 2스테이지 혼합색(주황·초록·보라)에는 탈것과 비탈것이 모두 있다
  for (const color of ["orange", "green", "purple"]) {
    const pool = PAINT_SUBJECTS.filter(subject => subject.color === color);
    assert.ok(pool.some(subject => subject.vehicle), `${color} 탈것`);
    assert.ok(pool.some(subject => !subject.vehicle), `${color} 비탈것`);
  }
});

test("튜브 숫자키 매핑 — 캐릭터 번호와 일치하고 10은 0키", () => {
  const byId = Object.fromEntries(PAINT_TUBES.map(tube => [tube.id, tube]));
  assert.equal(byId.red.keyDigit, "1");
  assert.equal(byId.yellow.keyDigit, "3");
  assert.equal(byId.blue.keyDigit, "5");
  assert.equal(byId.black.keyDigit, "9");
  assert.equal(byId.white.keyDigit, "0");
  assert.equal(byId.white.number, 10);
});
