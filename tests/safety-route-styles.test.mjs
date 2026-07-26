import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

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
  assert.match(css, /\.route-road\s*\{[^}]*#536477;/s);
  assert.match(css, /\.route-zone-road\s*\{[^}]*#536477/s);
  assert.match(css, /\.route-crosswalk\s*\{[^}]*repeating-linear-gradient/s);
  assert.match(css, /\.route-guidance-cell::after\s*\{[^}]*border-radius:\s*50%;/s);
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
    /\.route-pad button\s*\{[^}]*min-width:\s*48px;[^}]*min-height:\s*48px;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)\s*\{\s*body\[data-mode="safety"\]\s+#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\);[^}]*padding:/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*900px\)\s+and\s+\(max-height:\s*500px\)[\s\S]*?body\[data-mode="safety"\]\s+#game\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\);[^}]*\}[\s\S]*?body\[data-mode="safety"\]\s+\.stage-frame\s*\{[^}]*grid-row:\s*1;[^}]*\}[\s\S]*?\.route-pad\s*\{[^}]*position:\s*absolute;/s
  );
  assert.doesNotMatch(
    css,
    /@media\s*\(max-width:\s*900px\)\s+and\s+\(max-height:\s*500px\)[\s\S]*?\.route-pad button\s*\{[^}]*min-(?:width|height):\s*(?:4[0-7]|[0-3][0-9])px;/s
  );
});
