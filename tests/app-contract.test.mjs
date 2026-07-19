import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("정적 셸이 스타일과 앱 모듈을 로드한다", () => {
  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script type="module" src="src\/app\.mjs"><\/script>/);
});

test("홈, 게임, HUD, 음소거 컨트롤이 존재한다", () => {
  for (const id of [
    "home",
    "game",
    "stage",
    "answer-box",
    "mute-btn",
    "home-btn"
  ]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});

test("모드 버튼은 키와 캐릭터 이미지를 제공한다", () => {
  assert.equal((html.match(/class="mode-card"/g) ?? []).length, 3);
  assert.match(html, /assets\/characters\/one\.png/);
  assert.match(html, /assets\/characters\/three\.png/);
  assert.match(html, /assets\/characters\/four\.png/);
});
