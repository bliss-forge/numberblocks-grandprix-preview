// 물감 놀이 데이터 계약 — 혼합 테이블·레시피·주제·튜브의 정합성.

import test from "node:test";
import assert from "node:assert/strict";
import {
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
    assert.ok(parts.length === 1 || parts.length === 2, `${result} 재료 수`);
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

test("그림 주제는 목표색·스테이지가 팔레트·레시피와 정합한다", () => {
  for (const subject of PAINT_SUBJECTS) {
    assert.ok(PAINT_COLORS[subject.color], `${subject.id} 색`);
    const parts = PAINT_RECIPES[subject.color];
    assert.ok(parts, `${subject.id} 레시피`);
    if (subject.stage === 1) assert.equal(parts.length, 1, subject.id);
    else assert.equal(parts.length, 2, subject.id);
    if (subject.stage === 3) {
      assert.ok(parts.includes("white") || parts.includes("black"),
        `${subject.id}는 연하게/진하게 스테이지`);
    }
  }
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
