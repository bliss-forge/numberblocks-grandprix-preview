import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const shortHeightMarker =
  "@media (max-width: 900px) and (max-height: 500px)";

function mediaBlock(marker) {
  const start = css.indexOf(marker);
  assert.notEqual(start, -1);
  const nextMedia = css.indexOf("@media", start + marker.length);
  return css.slice(start, nextMedia === -1 ? css.length : nextMedia);
}

test("캐릭터 크기 단계는 세로 상한과 좁은 몸체 가로 보정을 함께 사용한다", () => {
  assert.match(
    css,
    /\.character\s*\{[^}]*--number-scale:\s*1;[^}]*--shape-scale:\s*1;[^}]*--shape-width-scale:\s*1;[^}]*--scene-scale:\s*1;[^}]*--screen-scale-cap:\s*2\.2;[^}]*--screen-width-scale-cap:\s*1\.375;[^}]*--layout-scale-cap:\s*999;[^}]*--resolved-character-scale:\s*min\([^}]*var\(--scene-scale\)[^}]*var\(--screen-scale-cap\)[^}]*var\(--layout-scale-cap\)[^}]*\);[^}]*scale:\s*calc\([^}]*var\(--shape-width-scale\)[^}]*var\(--screen-width-scale-cap\)[^}]*\)\s*var\(--resolved-character-scale\);[^}]*transform-origin:\s*50%\s+50%;/s
  );
  for (const [band, scale] of [
    ["scale-120", "1.2"],
    ["scale-140", "1.4"],
    ["scale-160", "1.6"],
    ["scale-180", "1.8"]
  ]) {
    assert.match(
      css,
      new RegExp(
        `\\.character\\[data-size-band="${band}"\\]\\s*\\{[^}]*--number-scale:\\s*${scale.replace(".", "\\.")};`,
        "s"
      )
    );
  }
});

test("여러 캐릭터 장면은 같은 크기 슬롯과 확대 여유를 유지한다", () => {
  assert.match(
    css,
    /\.count-friends\s*\{[^}]*overflow:\s*visible;/s
  );
  assert.match(
    css,
    /\.operand-character\s*\{[^}]*width:\s*min\(90%,\s*330px\);/s
  );
  assert.match(
    css,
    /\.count-friends\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s
  );
});

test("정답 캐릭터와 완성된 식은 무대 안의 반응형 결과 래퍼를 공유한다", () => {
  assert.match(
    css,
    /\.celebration-result\s*\{[^}]*display:\s*grid;[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto;[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*min-height:\s*0;/s
  );
  assert.match(
    css,
    /body\[data-state="celebrating"\]\s+\.celebration-character-zone\s+\.character\s*\{[^}]*max-height:\s*min\(27vh,\s*195px\);/s
  );
  assert.match(
    css,
    /\.completed-equation\s*\{[^}]*white-space:\s*nowrap;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.celebration-result\s*\{[^}]*gap:/s
  );
});

test("문제와 정답 캐릭터 구역은 수식 행 침범을 차단한다", () => {
  assert.match(
    css,
    /\.operand-scene\s*\{[^}]*grid-template-rows:\s*minmax\(0,\s*1fr\)\s+auto;/s
  );
  assert.match(
    css,
    /\.operand-slot\s*\{[^}]*overflow:\s*clip;/s
  );
  assert.match(
    css,
    /\.celebration-character-zone\s*\{[^}]*min-height:\s*0;[^}]*overflow:\s*clip;/s
  );
  assert.match(
    css,
    /\.equation-label,\s*\.completed-equation\s*\{[^}]*position:\s*relative;[^}]*z-index:\s*1;/s
  );
});

test("일반 화면만 C2 상한을 열고 낮은 가로 화면은 기존 상한을 유지한다", () => {
  assert.match(
    css,
    /\.character\[data-scene="problem"\]\s*\{[^}]*--screen-scale-cap:\s*3\.1;/s
  );
  assert.match(
    css,
    /\.character\[data-scene="celebration"\]\s*\{[^}]*--screen-scale-cap:\s*3\.6;/s
  );

  const shortHeightCss = mediaBlock(shortHeightMarker);
  assert.match(
    shortHeightCss,
    /\.character\s*\{[^}]*--screen-scale-cap:\s*1;[^}]*--screen-width-scale-cap:\s*1;/s
  );
});

test("일반 모바일은 데스크톱과 같은 숫자 배율을 사용한다", () => {
  const mobileCss = mediaBlock("@media (max-width: 640px)");
  assert.doesNotMatch(mobileCss, /data-size-band=[^}]+--number-scale:/s);
  assert.match(
    mobileCss,
    /#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto\s+auto\s+auto;/s
  );
  assert.match(
    mobileCss,
    /\.stage\s*\{[^}]*padding:\s*4px\s+clamp\(8px,\s*3vw,\s*16px\)\s+8px;/s
  );
  assert.match(
    mobileCss,
    /\.count-friends\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s
  );
});

test("높이 500px 이하 가로 화면은 확대 배율에 안전 상한을 둔다", () => {
  const shortHeightCss = mediaBlock(shortHeightMarker);
  assert.match(
    shortHeightCss,
    /\.character\s*\{[^}]*--screen-scale-cap:\s*1;[^}]*--screen-width-scale-cap:\s*1;/s
  );
  for (const [band, cap] of [
    ["base", "1"],
    ["scale-120", "1.1"],
    ["scale-140", "1.15"],
    ["scale-160", "1.2"],
    ["scale-180", "1.25"]
  ]) {
    const selector = band === "base"
      ? "\\.character"
      : `\\.character\\[data-size-band="${band}"\\]`;
    assert.match(
      shortHeightCss,
      new RegExp(
        `${selector}\\s*\\{[^}]*--screen-scale-cap:\\s*${cap.replace(".", "\\.")};`,
        "s"
      )
    );
  }
});

test("낮은 모바일 화면은 두 줄 숫자판과 최소 무대 높이를 보장한다", () => {
  const shortHeightCss = mediaBlock(shortHeightMarker);

  assert.match(
    shortHeightCss,
    /#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(72px,\s*1fr\)\s+auto\s+auto;[^}]*padding:\s*54px\s+6px\s+3px;/s
  );
  assert.match(
    shortHeightCss,
    /\.number-pad\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(6,\s*minmax\(44px,\s*1fr\)\);[^}]*gap:\s*4px;/s
  );
  assert.match(
    shortHeightCss,
    /\.number-pad button\s*\{[^}]*min-height:\s*44px;/s
  );
  assert.match(
    shortHeightCss,
    /\.answer-box\s*\{[^}]*height:\s*44px;/s
  );
  assert.match(
    shortHeightCss,
    /\.game-keyboard-note\s*\{[^}]*display:\s*none;/s
  );
});

test("좁은 게임 화면에서만 제작자 서명을 숨기고 홈에서는 유지한다", () => {
  const mobileCss = mediaBlock("@media (max-width: 640px)");
  const shortHeightCss = mediaBlock(shortHeightMarker);

  assert.match(
    mobileCss,
    /body:not\(\[data-state="home"\]\)\s+\.creator-credit\s*\{[^}]*display:\s*none;/s
  );
  assert.match(
    shortHeightCss,
    /body:not\(\[data-state="home"\]\)\s+\.creator-credit\s*\{[^}]*display:\s*none;/s
  );
  assert.doesNotMatch(
    shortHeightCss,
    /^\s*\.creator-credit\s*\{[^}]*display:\s*none;/m
  );
  assert.match(
    shortHeightCss,
    /body\[data-state="home"\]\s+\.creator-credit\s*\{[^}]*left:\s*8px;[^}]*right:\s*auto;[^}]*top:\s*6px;[^}]*bottom:\s*auto;/s
  );
});

test("낮은 홈 화면은 네 모드 카드를 한 줄에 모두 표시한다", () => {
  const shortHeightCss = mediaBlock(shortHeightMarker);

  assert.match(
    shortHeightCss,
    /\.mode-grid\s*\{[^}]*grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\);/s
  );
  assert.match(
    shortHeightCss,
    /\.mode-card\s*\{[^}]*min-height:\s*0;/s
  );
  assert.match(
    shortHeightCss,
    /\.mode-card:nth-child\(4\)\s*\{[^}]*grid-column:\s*auto;/s
  );
});

test("낮은 세기 무대는 친구 캐릭터 전체 높이를 슬롯 안에 맞춘다", () => {
  const shortHeightCss = mediaBlock(shortHeightMarker);

  assert.match(
    shortHeightCss,
    /\.count-friends\s+\.count-character\s*\{[^}]*height:\s*min\(18vh,\s*64px\);[^}]*max-height:\s*min\(18vh,\s*64px\);[^}]*object-fit:\s*contain;/s
  );
  assert.doesNotMatch(
    shortHeightCss,
    /\.count-friends\s+\.count-character\s*\{[^}]*calc\(100%/s
  );
});
