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

test("캐릭터 크기 단계는 애니메이션 transform과 독립된 scale을 사용한다", () => {
  assert.match(
    css,
    /\.character\s*\{[^}]*--number-scale:\s*1;[^}]*scale:\s*var\(--number-scale\);/s
  );
  assert.match(
    css,
    /\.character\[data-size-band="medium"\]\s*\{[^}]*--number-scale:\s*1\.1;/s
  );
  assert.match(
    css,
    /\.character\[data-size-band="large"\]\s*\{[^}]*--number-scale:\s*1\.2;/s
  );
});

test("여러 캐릭터 장면은 같은 크기 슬롯과 확대 여유를 유지한다", () => {
  assert.match(
    css,
    /\.operand-slot,\s*\.count-friends\s*\{[^}]*overflow:\s*visible;/s
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

test("모바일은 크기 확대를 낮추고 숫자판과 무대 공간을 따로 확보한다", () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.character\[data-size-band="medium"\]\s*\{[^}]*--number-scale:\s*1\.05;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.character\[data-size-band="large"\]\s*\{[^}]*--number-scale:\s*1\.1;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?#game\s*\{[^}]*grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+auto\s+auto\s+auto;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.stage\s*\{[^}]*padding:\s*4px\s+clamp\(8px,\s*3vw,\s*16px\)\s+8px;/s
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.count-friends\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s
  );
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
  assert.doesNotMatch(
    shortHeightCss,
    /(?:^|\s)\.creator-credit\s*\{[^}]*display:\s*none;/s
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
