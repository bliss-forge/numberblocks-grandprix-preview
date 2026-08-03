// Canonical Train Model 계약 — 열차 아트의 유일한 원본(src/ktx-train-model.mjs).
// 뷰 5종(측면·전면·후면·3/4·지붕)이 같은 리버리 토큰을 쓰고, 측면 뷰는
// 씬 JS/CSS가 의존하는 클래스·구조 계약을 그대로 만족해야 한다.

import test from "node:test";
import assert from "node:assert/strict";
import {
  TRAIN_LIVERIES,
  trainSideSvg,
  trainFrontSvg,
  trainRearSvg,
  trainQuarterSvg,
  trainTopSvg
} from "../src/ktx-train-model.mjs";
import { KTX_TRAINS } from "../src/ktx-route-data.mjs";
import { sideTrainSvg, trainCardSvg } from "../src/ktx-scene-art.mjs";

const srt = KTX_TRAINS.find(train => train.id === "srt");
const ktx = KTX_TRAINS.find(train => train.id === "ktx");

const VIEWS = [
  ["side", trainSideSvg, "0 0 1200 170"],
  ["front", trainFrontSvg, "0 0 300 340"],
  ["rear", trainRearSvg, "0 0 300 340"],
  ["quarter", trainQuarterSvg, "0 0 900 360"],
  ["top", trainTopSvg, "0 0 240 900"]
];

const allViews = train => VIEWS.map(([, build]) => build(train));

const count = (svg, needle) =>
  (svg.match(new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length;

test("전 뷰가 srt/ktx 모두 올바른 viewBox의 svg 문자열을 만든다", () => {
  [srt, ktx].forEach(train => {
    VIEWS.forEach(([name, build, viewBox]) => {
      const svg = build(train);
      assert.match(svg, /^<svg /, `${train.id} ${name}`);
      assert.ok(svg.includes(`viewBox="${viewBox}"`), `${train.id} ${name} viewBox`);
      assert.ok(svg.includes('aria-hidden="true"'), `${train.id} ${name} aria`);
    });
  });
});

test("측면 뷰는 씬 계약(슬롯8·문4·바퀴7·판토1·빔1)을 만족한다", () => {
  [srt, ktx].forEach(train => {
    const svg = trainSideSvg(train);
    assert.equal(count(svg, 'class="ktx-window-slot"'), 8, `${train.id} slots`);
    for (let slot = 0; slot < 8; slot += 1) {
      assert.ok(svg.includes(`data-slot="${slot}"`), `${train.id} data-slot ${slot}`);
    }
    // 창 유리는 62×40 — 차체(58~128) 안에서 루프밴드·벨트라인·스커트가
    // 모두 보이는 실차 비율. 유리 + 글로우 2장이 같은 치수를 쓴다.
    assert.equal(count(svg, 'width="62" height="34" rx="8"'), 16, `${train.id} 유리+글로우`);
    assert.equal(count(svg, 'class="ktx-window-glow"'), 8, `${train.id} glow`);
    assert.equal(count(svg, 'class="ktx-door"'), 4, `${train.id} doors`);
    assert.equal(count(svg, 'class="ktx-door-leaf ktx-door-leaf-l"'), 4, `${train.id} leaf-l`);
    assert.equal(count(svg, 'class="ktx-door-leaf ktx-door-leaf-r"'), 4, `${train.id} leaf-r`);
    assert.equal(count(svg, 'width="16" height="46"'), 8, `${train.id} 문짝 폭 16`);
    assert.equal(count(svg, 'class="ktx-door-warnlamp"'), 4, `${train.id} warnlamp`);
    assert.equal(count(svg, 'class="ktx-wheel"'), 7, `${train.id} wheels`);
    assert.equal(count(svg, 'class="ktx-panto"'), 1, `${train.id} panto`);
    assert.equal(count(svg, 'class="ktx-beam"'), 1, `${train.id} beam`);
    assert.ok(svg.includes('preserveAspectRatio="xMidYMid meet"'), `${train.id} preserve`);
  });
});

test("후면 뷰는 빨간 후미등 .ktx-taillamp 2조(4렌즈, 기본 opacity .5)를 켠다", () => {
  [srt, ktx].forEach(train => {
    const svg = trainRearSvg(train);
    const lamps = svg.match(/<circle class="ktx-taillamp"[^/]*\/>/g) ?? [];
    assert.equal(lamps.length, 4, `${train.id} 렌즈 2조 = 4개`);
    lamps.forEach(lamp => {
      assert.ok(lamp.includes(`fill="${TRAIN_LIVERIES[train.id].tail}"`), `${train.id} 빨강`);
      assert.ok(lamp.includes('opacity=".5"'), `${train.id} 기본 opacity .5`);
    });
    assert.equal(count(trainFrontSvg(train), "ktx-taillamp"), 0, `${train.id} 전면엔 없음`);
  });
});

test("루프색 토큰은 전 뷰에서 같은 원색으로 등장한다 (뷰 간 일관성 계약)", () => {
  [srt, ktx].forEach(train => {
    const livery = TRAIN_LIVERIES[train.id];
    allViews(train).forEach((svg, index) => {
      assert.ok(svg.includes(livery.roof), `${train.id} ${VIEWS[index][0]} roof`);
      assert.ok(svg.includes(livery.body), `${train.id} ${VIEWS[index][0]} body`);
      assert.ok(svg.includes(livery.stripe), `${train.id} ${VIEWS[index][0]} stripe`);
      assert.ok(svg.includes(livery.glass), `${train.id} ${VIEWS[index][0]} glass`);
      assert.ok(svg.includes(`>${train.label}</text>`) || VIEWS[index][0] === "top",
        `${train.id} ${VIEWS[index][0]} 로고 텍스트`);
    });
  });
});

test("그라데이션 id는 전 뷰·전 변형을 이어붙여도 문서 내 중복이 없다", () => {
  const doc = [srt, ktx].flatMap(train => [
    ...allViews(train),
    trainQuarterSvg(train, { facing: "front", side: "right" }),
    trainQuarterSvg(train, { facing: "rear", side: "left" }),
    trainQuarterSvg(train, { facing: "rear", side: "right" })
  ]).join("");
  const ids = [...doc.matchAll(/ id="([^"]+)"/g)].map(match => match[1]);
  assert.ok(ids.length > 0, "id가 하나도 없다");
  assert.equal(new Set(ids).size, ids.length, "그라데이션 id 중복");
  ids.forEach(id => assert.match(id, /^ktx-tm-/, `접두 규칙 위반: ${id}`));
});

test("filter·SMIL·image·사진 텍스처를 쓰지 않는다", () => {
  [srt, ktx].forEach(train => {
    allViews(train).forEach((svg, index) => {
      assert.doesNotMatch(svg, /<filter|filter=|<animate|<image|<feGaussian/i,
        `${train.id} ${VIEWS[index][0]}`);
    });
  });
});

test("srt와 ktx는 실루엣·리버리가 갈린다 (srt 원호 / ktx 쐐기+핀)", () => {
  VIEWS.forEach(([name, build]) => {
    assert.notEqual(build(srt), build(ktx), name);
  });
  assert.ok(trainSideSvg(srt).includes(">SRT</text>"));
  assert.ok(trainSideSvg(ktx).includes(">KTX</text>"));
  assert.ok(TRAIN_LIVERIES.srt.roof !== TRAIN_LIVERIES.ktx.roof);
  // ktx 지붕 뒤 핀은 ktx에만 있다
  assert.ok(trainSideSvg(ktx).includes("M1044 58 L1058 46 L1072 58z"));
  assert.ok(!trainSideSvg(srt).includes("M1044 58 L1058 46 L1072 58z"));
});

test("씬 아트는 캐노니컬 모델에 위임한다 (sideTrainSvg·trainCardSvg)", () => {
  [srt, ktx].forEach(train => {
    assert.equal(sideTrainSvg(train, 8), trainSideSvg(train, { windows: 8 }),
      `${train.id} side 위임`);
    assert.equal(trainCardSvg(train),
      trainQuarterSvg(train, { facing: "front", side: "left" }),
      `${train.id} card 위임`);
  });
});
