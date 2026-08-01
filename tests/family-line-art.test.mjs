import test from "node:test";
import assert from "node:assert/strict";
import {
  familyFaceSvg,
  familyPersonSvg,
  familyReunionSvg,
  familyStampSvg
} from "../src/family-line-art.mjs";
import { FAMILY_STATIONS } from "../src/subway-map-data.mjs";

const IDS = FAMILY_STATIONS.map(member => member.id);

test("가족 일곱 명이 다 그려져 있다", () => {
  for (const id of IDS) {
    const svg = familyPersonSvg(id);
    assert.match(svg, /^<svg /, id);
    assert.match(svg, /viewBox="0 0 100 155"/, id);
    assert.match(svg, new RegExp(`family-art-${id}`), id);
    assert.ok(svg.length > 400, `${id}는 대충 그리지 않았다`);
  }
  assert.equal(familyPersonSvg("nobody"), "", "모르는 사람은 안 그린다");
});

test("그림은 평면 2D 규칙을 지킨다", () => {
  const banned = /<(linearGradient|radialGradient|filter|animate|image|use)\b|url\(/;
  for (const id of IDS) {
    assert.doesNotMatch(familyPersonSvg(id), banned, id);
  }
  assert.doesNotMatch(familyReunionSvg(), banned);
});

test("일곱 명이 서로 다르게 생겼다", () => {
  const drawn = IDS.map(id => familyPersonSvg(id).replace(/family-art-[\w-]+/, ""));
  assert.equal(new Set(drawn).size, IDS.length, "같은 그림을 돌려쓰지 않는다");
});

test("도하는 사진처럼 앞머리 단발에 웃는 눈이다", () => {
  const doha = familyPersonSvg("doha");
  // 반달 눈은 곡선 두 개, 동그란 눈은 원 — 도하는 웃는 쪽이다.
  assert.match(doha, /M33 41 q6 -7 12 0/, "왼쪽 반달 눈");
  assert.match(doha, /M55 41 q6 -7 12 0/, "오른쪽 반달 눈");
  assert.doesNotMatch(doha, /<circle cx="39" cy="41"/, "동그란 눈이 아니다");
  // 덮개의 아래 끝이 앞머리 선이고, 눈(y=41)보다 위여서 이마가 안 보인다.
  const bangs = doha.match(/M23\.5 (\d+(?:\.\d+)?) a26\.5 26\.5/);
  assert.ok(bangs, "일자 앞머리 덮개");
  assert.ok(Number(bangs[1]) < 41, "앞머리가 눈 위에서 끝난다");
  assert.match(doha, /<rect x="21\.5" y="28"[^/]*height="26"/, "왼쪽 옆머리");
  assert.match(doha, /<rect x="70\.5" y="28"[^/]*height="26"/, "오른쪽 옆머리");
});

test("도하가 든 풍선은 소품이라 얼굴 도장에는 끼어들지 않는다", () => {
  assert.match(familyPersonSvg("doha"), /family-art-prop/, "사람 그림에는 있다");
  assert.doesNotMatch(familyStampSvg("doha", true), /family-art-prop/);
  assert.doesNotMatch(familyStampSvg("doha", true), /ellipse/, "풍선이 없다");
});

test("도장은 만나기 전에는 흐리고 만나면 체크가 붙는다", () => {
  const before = familyStampSvg("mom", false);
  const after = familyStampSvg("mom", true);
  assert.match(before, /opacity="0.28"/);
  assert.doesNotMatch(before, /stroke="#2fa25c"/, "아직 체크 없음");
  assert.match(after, /opacity="1"/);
  assert.match(after, /stroke="#2fa25c"/, "만나면 체크");
  assert.doesNotMatch(after, /<svg[\s\S]*<svg/, "svg를 겹치지 않는다");
  assert.equal(familyStampSvg("nobody", true), "");
});

test("다 만나면 일곱이 한 줄로 서고 도하가 가운데서 크다", () => {
  const reunion = familyReunionSvg();
  assert.match(reunion, /aria-label="가족이 다 모였어요"/);
  assert.doesNotMatch(reunion, /<svg[\s\S]*<svg/, "svg를 겹치지 않는다");
  const groups = reunion.match(/<g transform="translate\(\d+ -?\d+\) scale/g) ?? [];
  assert.equal(groups.length, 7, "일곱 명");
  assert.match(reunion, /scale\(1\.16\)/, "도하만 조금 크게");
});

test("놀기 전에 보여 주는 얼굴에는 도장이 찍혀 있지 않다", () => {
  for (const id of IDS) {
    const face = familyFaceSvg(id);
    assert.match(face, /family-face-art/, id);
    assert.doesNotMatch(face, /stroke="#2fa25c"/, `${id}에 체크가 없다`);
    assert.doesNotMatch(face, /opacity="0.28"/, `${id}는 흐리지 않다`);
    assert.doesNotMatch(face, /family-art-prop/, `${id} 소품 없음`);
  }
  assert.equal(familyFaceSvg("nobody"), "");
});
