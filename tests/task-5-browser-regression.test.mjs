import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

test("낮은 화면에서도 피연산자 장면과 식을 무대 안에 맞춘다", () => {
  assert.match(
    css,
    /\.operand-scene\s*\{[^}]*height:\s*100%;[^}]*min-height:\s*0;/s
  );
  assert.match(
    css,
    /\.operand-character\s*\{[^}]*max-height:\s*100%;/s
  );
  assert.match(
    css,
    /\.equation-label\s*\{[^}]*white-space:\s*nowrap;/s
  );
});

test("390px 화면에 데스크톱 최소 너비를 강제하지 않는다", () => {
  assert.doesNotMatch(
    css,
    /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?min-width:\s*560px/
  );
});

test("390px 홈 화면의 세 놀이 카드를 화면 너비 안에 맞춘다", () => {
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)\s*\{[\s\S]*?\.mode-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,\s*minmax\(0,\s*1fr\)\)/
  );
});
