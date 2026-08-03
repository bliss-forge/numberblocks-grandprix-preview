import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("실사 장면은 승인된 구도와 폴백 계약을 가진다", () => {
  assert.match(css, /\.ktx-real-cab-image\s*\{/);
  assert.match(css, /\.ktx-real-exterior-image\s*\{/);
  assert.match(css, /data-realistic="ready"/);
  assert.match(css, /object-fit:\s*cover/);
});

test("실사 바깥 뷰는 65% 월드와 기존 실시간 운전 계기를 함께 보여 준다", () => {
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-real-exterior-image\s*\{[^}]*height:\s*65%/s);
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-view-cab\s*\{[^}]*visibility:\s*visible/s);
  assert.match(css,
    /data-view="side"\][^\{]*\.ktx-speedo[^\{]*\.ktx-lever[^\{]*\.ktx-door-panel[^\{]*\.ktx-next-key\s*\{/s);
});

test("실사 준비 상태에서는 승강장 구조물만 숨기고 정차 단서는 남긴다", () => {
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-platform-roof[^\{]*\.ktx-platform-pillar[^\{]*\.ktx-platform-sign\s*\{[^}]*display:\s*none/s);
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-platform\s*\{[^}]*bottom:\s*35%[^}]*background:\s*none/s);
  assert.match(css,
    /data-realistic="ready"[^\{]*\.ktx-queue\s*\{[^}]*bottom:\s*calc\(35%\s*\+\s*2px\)/s);
});
