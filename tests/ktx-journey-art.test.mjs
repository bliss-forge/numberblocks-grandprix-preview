import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("실사 장면은 승인된 구도와 폴백 계약을 가진다", () => {
  assert.match(css, /\.ktx-real-cab-image\s*\{/);
  assert.match(css, /\.ktx-real-cab-image\s*\{[^}]*object-position:\s*center top/s);
  assert.match(css, /\.ktx-real-exterior-image\s*\{/);
  assert.match(css, /data-realistic="ready"/);
  assert.match(css, /object-fit:\s*cover/);
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-view-side \.ktx-side-near\s*\{[^}]*display:\s*none/s);
});

test("실사 바깥 뷰는 71% 월드와 기존 실시간 운전 계기를 함께 보여 준다", () => {
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-real-exterior-image\s*\{[^}]*height:\s*71%/s);
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-view-cab\s*\{[^}]*visibility:\s*visible/s);
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-speedo[^\{]*\.ktx-lever[^\{]*\.ktx-door-panel[^\{]*\.ktx-next-key\s*\{/s);
  assert.match(css,
    /data-realistic="ready"\]\[data-view="cab"\][^\{]*\.ktx-lever\s*\{[^}]*right:\s*auto[^}]*left:\s*34px[^}]*transform-origin:\s*left bottom/s);
  assert.match(css,
    /data-realistic="ready"\]\[data-view="cab"\][^\{]*\.ktx-next-key\s*\{[^}]*left:\s*190px/s);
});

test("실사 준비 상태에서는 승강장 구조물만 숨기고 정차 단서는 남긴다", () => {
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-platform-roof[^\{]*\.ktx-platform-pillar[^\{]*\.ktx-platform-sign\s*\{[^}]*display:\s*none/s);
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-platform\s*\{[^}]*bottom:\s*29%[^}]*background:\s*none/s);
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-queue\s*\{[^}]*bottom:\s*calc\(29%\s*\+\s*2px\)/s);
});

test("실사 외부 콘솔은 모든 모션 레이어 위에서 하단 29%를 차단한다", () => {
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-view-cab::before\s*\{[^}]*height:\s*29%[^}]*z-index:\s*10/s);
});
