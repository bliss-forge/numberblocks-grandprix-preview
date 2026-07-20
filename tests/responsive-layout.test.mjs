import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

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
  const marker = "@media (max-width: 900px) and (max-height: 500px)";
  const start = css.indexOf(marker);
  assert.notEqual(start, -1);
  const nextMedia = css.indexOf("@media", start + marker.length);
  const shortHeightCss = css.slice(
    start,
    nextMedia === -1 ? css.length : nextMedia
  );

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
