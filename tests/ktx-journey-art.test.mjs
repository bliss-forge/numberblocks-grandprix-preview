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

test("실사 모션 플레이트는 겹친 완성 장면으로만 안전 크롭·교차한다", () => {
  assert.match(css,
    /\.ktx-motion-plate\s*\{[^}]*position:\s*absolute[^}]*object-fit:\s*cover[^}]*transform:\s*translate3d\(var\(--motion-plate-x,\s*var\(--motion-scene-x\)\)/s);
  assert.match(css,
    /\.ktx-motion-plate\s*\{[^}]*width:\s*calc\(100%\s*\+\s*240px\)[^}]*left:\s*-120px/s);
  assert.match(css,
    /\.ktx-motion-plate\[data-active="true"\]\s*\{[^}]*opacity:\s*1/s);
  assert.match(css,
    /\.ktx-motion-plate\[data-active="false"\]\s*\{[^}]*opacity:\s*0/s);
  assert.doesNotMatch(css, /\.ktx-motion-plate\s*\{[^}]*repeat/s);
});

test("실사 근경·선로만 위치 이동과 블러를 받고 열차·조작부는 선명하게 고정된다", () => {
  assert.match(css,
    /\.ktx-motion-near\s*\{[^}]*transform:\s*translate3d\(var\(--motion-near-phase-x\)[^}]*filter:\s*blur\(var\(--motion-blur\)/s);
  assert.match(css,
    /\.ktx-motion-track\s*\{[^}]*transform:\s*translate3d\(var\(--motion-track-phase-x\)[^}]*filter:\s*blur\(var\(--motion-blur\)/s);
  assert.match(css,
    /\.ktx-motion-train\s*\{[^}]*z-index:\s*6[^}]*filter:\s*none/s);
  assert.doesNotMatch(css, /\.ktx-motion-train\s*\{[^}]*animation:[^}]*infinite/s);
  assert.doesNotMatch(css, /\.ktx-motion-cab-frame\s*\{[^}]*filter:\s*blur/s);
});

test("선로·근경·속도선은 서로 다른 CSS 무늬 주기로 독립 위상 이동한다", () => {
  assert.match(css,
    /\.ktx-motion-track\s*\{[^}]*width:\s*calc\(100%\s*\+\s*144px\)[^}]*transform:\s*translate3d\(var\(--motion-track-phase-x\)/s);
  assert.match(css,
    /\.ktx-motion-near\s*\{[^}]*width:\s*calc\(100%\s*\+\s*720px\)[^}]*transform:\s*translate3d\(var\(--motion-near-phase-x\)/s);
  assert.match(css,
    /\.ktx-motion-near::after\s*\{[^}]*width:\s*calc\(100%\s*\+\s*310px\)[^}]*transform:\s*translate3d\(calc\(var\(--motion-streak-phase-x\)\s*-\s*var\(--motion-near-phase-x\)\)/s);
});

test("실사 속도선은 고속 밴드에만 보이고 정차하면 모든 이동 보간이 사라진다", () => {
  assert.match(css,
    /data-speed-band="fast"[^\{]*\.ktx-motion-near::after[^\{]*data-speed-band="very-fast"[^\{]*\.ktx-motion-near::after\s*\{[^}]*opacity:/s);
  assert.match(css,
    /data-motion-moving="false"[^\{]*\.ktx-motion-plate[\s\S]*?data-motion-moving="false"[^\{]*\.ktx-motion-track[\s\S]*?\{[^}]*transition:\s*none/s);
  assert.match(css,
    /data-motion-moving="true"[^\{]*\.ktx-motion-near[^\{]*data-motion-moving="true"[^\{]*\.ktx-motion-track\s*\{[^}]*transition:\s*transform\s+120ms\s+linear/s);
  assert.match(css,
    /data-track-loop-reset="true"[^\{]*\.ktx-motion-track\s*\{[^}]*transition:\s*none/s);
});

test("완성 장면 교차는 유한 애니메이션이며 정차 시 현재 불투명도에서 일시정지한다", () => {
  assert.match(css,
    /@keyframes\s+ktx-motion-plate-in\s*\{[^}]*opacity:\s*0[^}]*\}[^}]*opacity:\s*1/s);
  assert.match(css,
    /@keyframes\s+ktx-motion-plate-out\s*\{[^}]*opacity:\s*1[^}]*\}[^}]*opacity:\s*0/s);
  assert.match(css,
    /\.ktx-motion-plate\[data-crossfade="in"\][^\{]*\.ktx-motion-plate\[data-crossfade="out"\]\s*\{[^}]*animation-duration:\s*var\(--motion-crossfade-ms[^}]*animation-play-state:\s*var\(--motion-crossfade-play-state/s);
  assert.doesNotMatch(css,
    /\.ktx-motion-plate\s*\{[^}]*transition:[^;]*opacity/s);
  assert.doesNotMatch(css,
    /\.ktx-motion-plate\s*\{[^}]*animation[^}]*infinite/s);
});

test("동작 줄이기에서는 실사 블러·진동·속도선과 장면 교차를 제거한다", () => {
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-plate\[data-crossfade\]\s*\{[^}]*animation:\s*none\s*!important/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-near[^\{]*\.ktx-motion-track[^\{]*\.ktx-motion-tunnel-lights\s*\{[^}]*filter:\s*none/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-near::after\s*\{[^}]*display:\s*none/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-train\s*\{[^}]*transform:[^}]*--motion-brake-pitch/s);
});

test("동작 줄이기는 위치 상태를 남기고 모든 실사 효과와 보간을 즉시 끈다", () => {
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-plate\[data-crossfade\]\s*\{[^}]*animation:\s*none\s*!important[^}]*transition:\s*none\s*!important/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-plate,[^\{]*\.ktx-motion-near,[^\{]*\.ktx-motion-track,[^\{]*\.ktx-motion-station-viewport,[^\{]*\.ktx-motion-station,[^\{]*\.ktx-motion-cab-sleepers,[^\{]*\.ktx-motion-cab-catenary,[^\{]*\.ktx-motion-tunnel,[^\{]*\.ktx-motion-tunnel-portal,[^\{]*\.ktx-motion-tunnel-lights,[^\{]*\.ktx-motion-train\s*\{[^}]*transition:\s*none\s*!important/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-scene\s*\{[^}]*--motion-vibration-y:\s*0px/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-near[^\{]*\.ktx-motion-track[^\{]*\.ktx-motion-tunnel-lights\s*\{[^}]*filter:\s*none\s*!important/s);
  assert.match(css,
    /prefers-reduced-motion:\s*reduce[\s\S]*\.ktx-motion-near::after\s*\{[^}]*display:\s*none/s);
  assert.match(css,
    /\.ktx-motion-plate\s*\{[^}]*transform:\s*translate3d\(var\(--motion-plate-x/s,
    "줄임 동작에서도 결정적 위치 변수는 계속 렌더링한다");
});

test("운전실 모션은 고정 프레임의 투명 전면창 안에서만 소실점 투영된다", () => {
  assert.match(css,
    /data-view="cab"\][^\{]*\.ktx-motion-scene\s*\{[^}]*inset:\s*0[^}]*opacity:\s*1/s);
  assert.match(css,
    /\.ktx-motion-cab-window\s*\{[^}]*position:\s*absolute[^}]*overflow:\s*hidden[^}]*clip-path:\s*polygon\([^)]*\)/s);
  assert.match(css,
    /\.ktx-motion-cab-rail\s*\{[^}]*top:\s*40%[^}]*transform-origin:\s*50%\s+0/s);
  assert.match(css,
    /\.ktx-motion-cab-sleepers\s*\{[^}]*--cab-sleeper-gap[^}]*background-position:[^}]*--cab-track-phase/s);
  assert.match(css,
    /\.ktx-motion-cab-catenary\s*\{[^}]*top:\s*40%[^}]*--cab-catenary-gap[^}]*--cab-catenary-phase[^}]*transform-origin:\s*50%\s+0/s);
  assert.match(css,
    /data-cab-track-loop-reset="true"[^\{]*\.ktx-motion-cab-sleepers[\s\S]*data-cab-catenary-loop-reset="true"[^\{]*\.ktx-motion-cab-catenary[\s\S]*transition:\s*none/s);
  assert.match(css,
    /data-view="cab"\][^\{]*\.ktx-motion-cab-frame\s*\{[^}]*display:\s*block/s);
  assert.match(css,
    /\.ktx-motion-cab-frame\s*\{[^}]*position:\s*absolute[^}]*pointer-events:\s*none/s);
});

test("역 플레이트는 반복 없이 안전 크롭되고 상세 단계에서 읽을 수 있는 표지를 보인다", () => {
  assert.match(css,
    /\.ktx-motion-station-viewport\s*\{[^}]*position:\s*absolute[^}]*inset:\s*0[^}]*z-index:\s*5[^}]*overflow:\s*hidden[^}]*opacity:\s*0/s);
  assert.doesNotMatch(css,
    /\.ktx-motion-station-viewport\s*\{[^}]*clip-path:/s,
    "역 사진의 사각 경계를 드러내는 부분 클립 금지");
  assert.match(css,
    /\.ktx-motion-station\s*\{[^}]*width:\s*calc\(100%\s*\+\s*240px\)[^}]*height:\s*100%[^}]*object-fit:\s*cover[^}]*--station-cover-scale/s);
  assert.match(css,
    /data-station-visible="true"[^\{]*\.ktx-motion-station-viewport\s*\{[^}]*opacity:[^}]*--station-opacity/s);
  assert.doesNotMatch(css, /\.ktx-motion-station\s*\{[^}]*repeat/s);
  assert.match(css,
    /data-station-stage="detail"[^\{]*\.ktx-motion-station-sign[\s\S]*data-station-stage="stopped"[^\{]*\.ktx-motion-station-sign\s*\{[^}]*opacity:\s*1/s);
  assert.match(css,
    /data-near-suppressed="true"[^\{]*\.ktx-motion-near\s*\{[^}]*opacity:\s*0/s);
});

test("터널 벽과 조명은 터널에서만 보이고 속도 기반 위상·밀도를 사용한다", () => {
  assert.match(css,
    /\.ktx-motion-tunnel\s*\{[^}]*--tunnel-wall-phase[^}]*--tunnel-wall-gap[^}]*opacity:\s*0/s);
  assert.match(css,
    /data-tunnel="true"[^\{]*\.ktx-motion-tunnel\s*\{[^}]*opacity:\s*1/s);
  assert.match(css,
    /\.ktx-motion-tunnel-lights\s*\{[^}]*--tunnel-light-gap[^}]*--tunnel-light-phase/s);
  assert.match(css,
    /data-tunnel-wall-loop-reset="true"[^\{]*\.ktx-motion-tunnel[\s\S]*data-tunnel-light-loop-reset="true"[^\{]*\.ktx-motion-tunnel-lights[\s\S]*transition:\s*none/s);
  assert.match(css,
    /data-motion-moving="false"[^\{]*\.ktx-motion-cab-sleepers[\s\S]*data-motion-moving="false"[^\{]*\.ktx-motion-cab-catenary[\s\S]*\.ktx-motion-tunnel-lights\s*\{[^}]*transition:\s*none/s);
});

test("모션 운전실 준비 상태는 정적 폴백과 무관하게 기존 배경만 숨기고 계기는 유지한다", () => {
  assert.match(css,
    /data-motion-realistic="ready"[^\{]*\.ktx-view-cab \.ktx-cab-backdrop[\s\S]*?\.ktx-view-cab \.ktx-cab-dash\s*\{[^}]*opacity:\s*0/s);
  assert.doesNotMatch(css,
    /data-motion-realistic="ready"[^\{]*\.ktx-speedo[^\{]*\{[^}]*display:\s*none/s);
});
