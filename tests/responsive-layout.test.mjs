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
