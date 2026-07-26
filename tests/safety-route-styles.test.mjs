import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

function selectorBody(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`, "s").exec(css);
  assert.ok(match, `missing CSS selector: ${selector}`);
  return match[1];
}

test("길찾기에서는 답안 UI를 숨기고 지도를 무대 전체에 펼친다", () => {
  assert.match(
    css,
    /body\[data-mode="safety"\]\s+\.answer-dock,[\s\S]*?body\[data-mode="safety"\]\s+\.number-pad,[\s\S]*?body\[data-mode="safety"\]\s+\.game-keyboard-note\s*\{[^}]*display:\s*none;/s
  );
  assert.match(
    css,
    /\.safety-viewport\s*\{[^}]*overflow:\s*hidden;/s
  );
  assert.match(
    css,
    /\.safety-viewport\s*\{[^}]*width:\s*min\(\s*100%,\s*calc\(var\(--viewport-cols,\s*7\)\s*\*\s*var\(--route-cell-size\)\)\s*\);[^}]*height:\s*min\(\s*100%,\s*calc\(var\(--viewport-rows,\s*5\)\s*\*\s*var\(--route-cell-size\)\)\s*\);/s
  );
  assert.match(
    css,
    /\.safety-world\s*\{[^}]*grid-template-columns:\s*repeat\(var\(--world-cols\),\s*var\(--route-cell-size\)\);[^}]*grid-template-rows:\s*repeat\(var\(--world-rows\),\s*var\(--route-cell-size\)\);[^}]*transform:\s*translate3d/s
  );
});

test("보도, 차도, 횡단보도와 유도선을 색 외의 형태로 구분한다", () => {
  assert.match(css, /\.route-sidewalk\s*\{[^}]*background:\s*#ead9b8;/s);
  assert.match(css, /\.route-road\s*\{[^}]*#4d5965;/s);
  assert.match(css, /\.route-zone-road\s*\{[^}]*#4d5965/s);
  assert.match(css, /\.route-crosswalk\s*\{[^}]*repeating-linear-gradient/s);
  assert.match(css, /\.route-guidance-cell::after\s*\{[^}]*border-radius:\s*50%;/s);
});

test("PC 도로와 골목은 실제 역할에 맞는 평면 패턴을 사용한다", () => {
  assert.match(css, /\.route-zone-road\s*\{[^}]*--road-asphalt:\s*#4d5965;/s);
  assert.match(
    css,
    /\.route-road\[data-road-position="center-left"\]\s*\{[^}]*border-inline-end:\s*3px\s+dashed\s+#f4c542;/s
  );
  assert.match(
    css,
    /\.route-crosswalk\s*\{[^}]*repeating-linear-gradient\(\s*180deg,/s
  );
  assert.match(css, /\.route-alley\s*\{[^}]*#e7d2aa;[^}]*border-inline:/s);
  assert.match(css, /\.route-walkway\s*\{[^}]*#efdcb8;/s);
  assert.match(css, /\.route-signal-marker\s*\{[^}]*translate:/s);
});

test("PC 도로의 가장자리·횡단보도·신호 가구는 selector별 위치와 층서를 유지한다", () => {
  assert.match(css, /\.route-road\s*\{[^}]*z-index:\s*1;/s);
  assert.match(
    css,
    /\.route-road\[data-road-position="outer-left"\]\s*\{[^}]*box-shadow:\s*inset\s+4px\s+0\s+#f7f2df;/s
  );
  assert.match(
    css,
    /\.route-road\[data-road-position="outer-right"\]\s*\{[^}]*box-shadow:\s*inset\s+-4px\s+0\s+#f7f2df;/s
  );
  assert.match(css, /\.route-crosswalk\s*\{[^}]*z-index:\s*3;/s);
  assert.match(
    css,
    /\.route-crosswalk\[data-road-position="center-left"\]\s*\{[^}]*border-inline-end:\s*0;/s
  );
  assert.match(css, /\.route-signal-marker\s*\{[^}]*z-index:\s*10;/s);
  assert.match(
    css,
    /\.route-signal-marker\[data-side="left"\]\s*\{[^}]*--signal-shift-x:\s*-8px;[^}]*justify-self:\s*end;/s
  );
  assert.match(
    css,
    /\.route-signal-marker\[data-side="right"\]\s*\{[^}]*--signal-shift-x:\s*8px;/s
  );
  assert.match(
    css,
    /\.route-signal-marker::before\s*\{[^}]*top:\s*100%;[^}]*width:\s*5px;[^}]*height:\s*22px;[^}]*background:\s*#f7f2df;/s
  );
  assert.match(
    css,
    /\.route-signal-marker::after\s*\{[^}]*top:\s*calc\(100%\s*\+\s*18px\);[^}]*width:\s*20px;[^}]*height:\s*6px;[^}]*background:\s*#c4aa78;/s
  );
  assert.match(
    css,
    /\.route-signal-marker\[data-phase="vehicle-go"\],\s*\.route-signal-marker\[data-phase="vehicle-clearance"\],\s*\.route-signal-marker\[data-phase="pedestrian-clearance"\]\s*\{[^}]*--signal-top:\s*#ff4d54;/s
  );
  assert.match(
    css,
    /\.route-signal-marker\[data-phase="pedestrian-go"\]\s*\{[^}]*--signal-bottom:\s*#48cf62;/s
  );
});

test("건물과 생활안전 요소를 입체 이미지 없이 평면 CSS 그림으로 표현한다", () => {
  for (const selector of [
    ".route-place-home",
    ".route-place-daycare",
    ".route-place-shops",
    ".route-place-park",
    ".route-place-library",
    ".route-place-bus-stop",
    ".route-place-shop",
    ".route-place-school",
    ".route-manhole",
    ".route-construction",
    ".route-scooter",
    ".route-bicycle",
    ".route-car"
  ]) {
    assert.match(css, new RegExp(`\\${selector}\\s*\\{`), selector);
  }
  assert.match(css, /\.route-place::before/);
  assert.match(css, /\.route-car::before/);
  assert.match(css, /\.route-bicycle::before/);
  assert.match(css, /\.route-scooter::before/);
  assert.match(css, /\.route-manhole::after/);
  assert.match(css, /\.route-construction::after/);
  assert.doesNotMatch(css, /\.safety-route[\s\S]*?perspective\s*:/);
});

test("탑승자와 닫힌 맨홀과 공사 차단봉은 원본 CSS 그림을 사용한다", () => {
  const riderHead = selectorBody(".route-rider-person::before");
  const riderLimbs = selectorBody(".route-rider-person::after");
  const manholeFootprint = selectorBody(".route-hazard-footprint-manhole");
  const manhole = selectorBody(".route-manhole");
  const construction = selectorBody(".route-construction");
  const barrierBoard = selectorBody(".route-construction::before");
  const barrierPosts = selectorBody(".route-construction::after");
  const reversedMover = selectorBody('.route-moving-rider[data-direction="-1"]');

  assert.match(riderHead, /border-radius:\s*50%;/);
  assert.equal((riderLimbs.match(/#ffcf9f/g) ?? []).length, 2);
  assert.match(riderLimbs, /left:\s*-9px;[^}]*width:\s*36px;[^}]*height:\s*31px;/s);
  assert.match(manholeFootprint, /border:\s*0;[^}]*background:\s*transparent;/s);
  assert.match(manhole, /repeating-(?:linear|conic)-gradient/);
  assert.match(construction, /height:\s*calc\(var\(--route-cell-size\)\s*\*\s*1\.2\);/);
  assert.match(barrierBoard, /z-index:\s*2;[^}]*repeating-linear-gradient\([^}]*#f5c400[^}]*#171717/s);
  assert.match(barrierPosts, /z-index:\s*1;/);
  assert.match(barrierPosts, /10%\s+0\s*\/\s*16px\s+84%\s+no-repeat/);
  assert.match(barrierPosts, /90%\s+0\s*\/\s*16px\s+84%\s+no-repeat/);
  assert.match(barrierPosts, /0\s+100%\s*\/\s*42px\s+12px\s+no-repeat/);
  assert.match(barrierPosts, /100%\s+100%\s*\/\s*42px\s+12px\s+no-repeat/);
  assert.match(reversedMover, /transform:\s*scaleX\(-1\);/);

  for (const selector of [
    ".route-rider-person",
    ".route-rider-person::before",
    ".route-rider-person::after",
    ".route-hazard-footprint-manhole",
    ".route-manhole",
    ".route-manhole::before",
    ".route-manhole::after",
    ".route-construction",
    ".route-construction::before",
    ".route-construction::after"
  ]) {
    assert.doesNotMatch(selectorBody(selector), /url\s*\(/i, selector);
  }
});

test("자동차 CSS는 북쪽과 남쪽 heading을 서로 반대로 그린다", () => {
  assert.match(css, /\.route-car\[data-heading="north"\]\s*\{/);
  assert.match(css, /\.route-car\[data-heading="south"\]\s*\{[^}]*rotate\(180deg\)/s);
});

test("줄인 동작은 장식 애니메이션과 카메라 이동만 끈다", () => {
  assert.match(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*\{\s*\.safety-world\s*\{[^}]*transition:\s*none;[^}]*\}\s*\.route-player,\s*\.route-moving-rider,\s*\.route-moving-rider::before,\s*\.route-moving-rider::after\s*\{[^}]*animation:\s*none;[^}]*\}\s*\}/s
  );
  assert.doesNotMatch(
    css,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.route-moving-rider\s*\{[^}]*(?:display:\s*none|visibility:\s*hidden)/s
  );
});

test("방향 버튼은 터치하기 충분하고 모바일·낮은 가로 화면에서도 유지된다", () => {
  assert.match(
    css,
    /body\[data-mode="safety"\]\s+#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\);/s
  );
  assert.match(
    css,
    /\.route-pad button\s*\{[^}]*min-width:\s*48px;[^}]*min-height:\s*48px;[^}]*font-size:\s*28px;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)\s*\{\s*body\[data-mode="safety"\]\s+#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\);[^}]*padding:/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*900px\)\s+and\s+\(max-height:\s*500px\)[\s\S]*?body\[data-mode="safety"\]\s+#game\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);[^}]*\}[\s\S]*?body\[data-mode="safety"\]\s+\.stage-frame\s*\{[^}]*grid-row:\s*1;[^}]*\}[\s\S]*?\.route-pad\s*\{[^}]*position:\s*absolute;/s
  );
  const shortLandscape = css.slice(
    css.lastIndexOf("@media (max-width: 900px) and (max-height: 500px)")
  );
  assert.match(
    shortLandscape,
    /\.route-pad button\s*\{[^}]*min-width:\s*48px;[^}]*min-height:\s*48px;/s
  );
});

test("PC 안전길은 7×5 지도를 크게 쓰고 방향키는 기본 상태에서 절제한다", () => {
  const desktop = /@media\s*\(min-width:\s*901px\)\s+and\s+\(min-height:\s*501px\)\s*\{([\s\S]*)/s.exec(css)?.[1] ?? "";

  assert.match(desktop, /body\[data-mode="safety"\]\s+#game\s*\{[^}]*padding:\s*48px\s+1\.5vw\s+6px;/s);
  assert.match(desktop, /body\[data-mode="safety"\]\s+\.stage-frame\s*\{[^}]*width:\s*min\(96vw,\s*1600px\);/s);
  assert.match(desktop, /\.safety-route\s*\{[^}]*grid-template-rows:\s*var\(--safety-route-top-height\)\s+minmax\(0,\s*1fr\);/s);
  assert.match(desktop, /\.safety-route\s*\{[^}]*container-type:\s*size;/s);
  assert.match(desktop, /\.safety-viewport\s*\{[^}]*calc\(\s*\(100cqh\s*-\s*var\(--safety-route-top-height\)\)\s*\/\s*var\(--viewport-rows,\s*5\)\s*\)/s);
  assert.match(desktop, /\.safety-viewport\s*\{[^}]*border-inline:\s*0;/s);
  assert.match(desktop, /body\[data-mode="safety"\]\s+\.route-pad\s*\{[^}]*opacity:\s*\.58;/s);
  assert.match(desktop, /body\[data-mode="safety"\]\s+\.route-pad:focus-within,[\s\S]*?body\[data-mode="safety"\]\s+\.route-pad:hover\s*\{[^}]*opacity:\s*1;/s);
  assert.match(desktop, /body\[data-mode="safety"\]\s+\.route-pad button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;[^}]*font-size:\s*23px;/s);
});
