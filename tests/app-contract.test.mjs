import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");

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

test("게임 화면은 화면 전환 뒤 프로그램 방식으로 포커스를 받을 수 있다", () => {
  assert.match(
    html,
    /<section id="game"[^>]*tabindex="-1"[^>]*aria-hidden="true">/
  );
});

test("모드 버튼은 키와 캐릭터 이미지를 제공한다", () => {
  assert.equal((html.match(/class="mode-card"/g) ?? []).length, 3);
  assert.match(html, /assets\/characters\/one\.png/);
  assert.match(html, /assets\/characters\/three\.png/);
  assert.match(html, /assets\/characters\/four\.png/);
});

test("홈에는 세 난이도 버튼과 도전 세기 안내가 있다", () => {
  assert.match(html, /id="difficulty-picker"/);
  assert.equal((html.match(/class="difficulty-button"/g) ?? []).length, 3);
  assert.match(html, /data-difficulty="easy"/);
  assert.match(html, /data-difficulty="steady"/);
  assert.match(html, /data-difficulty="challenge"/);
  assert.match(html, /id="count-unavailable"/);
});

test("곱셈 결과 팻말은 긴 수식도 한 줄로 유지한다", () => {
  assert.match(
    css,
    /\.result-sign\s*\{[^}]*white-space:\s*nowrap;/s
  );
});
