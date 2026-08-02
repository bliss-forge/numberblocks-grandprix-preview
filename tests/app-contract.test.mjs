import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
const app = await readFile(new URL("../src/app.mjs", import.meta.url), "utf8");

test("정적 셸이 스타일과 앱 모듈을 로드한다", () => {
  assert.match(html, /<link rel="stylesheet" href="styles\.css(?:\?[^"]+)?">/);
  assert.match(html, /<script type="module" src="src\/app\.mjs"><\/script>/);
});

test("1~5 모바일 보정 스타일은 기본 스타일 뒤에 로드된다", () => {
  const baseIndex = html.indexOf(
    'href="styles.css?v=20260726-pc-route-visual"'
  );
  const mobileIndex = html.indexOf(
    'href="mobile-games.css?v=20260802-games-1-5"'
  );

  assert.ok(baseIndex >= 0);
  assert.ok(mobileIndex > baseIndex);
});

test("PC 안전길 시각 개선은 새 CSS 캐시 주소를 사용한다", () => {
  assert.match(
    html,
    /<link rel="stylesheet" href="styles\.css\?v=20260726-pc-route-visual">/
  );
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

test("홈은 번호 배지가 있는 일곱 가지 놀이를 제공한다", () => {
  assert.equal((html.match(/class="mode-card(?: [^"]*)?"/g) ?? []).length, 7);
  assert.match(html, /안전한 길찾기/);
  assert.match(html, /지하철 여행/);
  assert.match(html, /칙칙폭폭 기관사/);
});

test("홈 카드 번호는 같은 번호의 블럭 친구를 사용한다", () => {
  for (const [mode, key, asset] of [
    ["count", "1", "one"],
    ["add", "2", "two"],
    ["sub", "3", "three"],
    ["mul", "4", "four"],
    ["safety", "5", "five"],
    ["subway", "6", "six"],
    ["ktx", "7", "seven"]
  ]) {
    const card = html.match(
      new RegExp(
        `<button class="[^"]*mode-card[^"]*"[^>]*data-mode="${mode}"[\\s\\S]*?<\\/button>`
      )
    )?.[0];

    assert.ok(card, `${mode} card`);
    assert.match(
      card,
      new RegExp(`<span class="card-number">${key}<\\/span>`)
    );
    assert.match(
      card,
      new RegExp(`<img src="assets/characters/${asset}\\.png" alt="">`)
    );
  }
});

test("길찾기는 모델, 장면, 키보드와 모바일 방향 버튼을 앱에 연결한다", () => {
  for (const name of [
    "attemptSafetyMove",
    "createSafetyRouteState",
    "advanceSafetyWorld"
  ]) {
    assert.match(
      app,
      new RegExp(
        `import\\s*\\{[^}]*${name}[^}]*\\}\\s*from "\\.\\/safety-route-model\\.mjs";`,
        "s"
      )
    );
  }
  assert.match(
    app,
    /import\s*\{[^}]*directionForKey[^}]*safetyCueForEvent[^}]*\}\s*from "\.\/safety-route-controller\.mjs";/s
  );
  assert.match(
    app,
    /import\s*\{[^}]*renderSafetyRouteScene[^}]*\}\s*from "\.\/safety-route-scene\.mjs";/s
  );
  assert.match(app, /directionForKey\(event\.key\)/);
  assert.match(app, /closest\("\[data-route-direction\]"\)/);
  assert.match(app, /attemptSafetyMove\(state\.safety,\s*direction\)/);
  assert.match(app, /advanceSafetyWorld\(\s*state\.safety,\s*/);
  assert.match(app, /acceptSafetyRepeat\(/);
  assert.match(app, /pointerdown/);
  assert.match(app, /pointerup/);
  assert.match(app, /pointercancel/);
  assert.match(app, /guidanceCells\(/);
  assert.match(app, /cameraOffset\(/);
  assert.doesNotMatch(
    app,
    /state\.mode === "safety"\s*&&\s*!event\.repeat/
  );
});

test("길찾기 라운드는 난수 시드를 만들고 월드 시간을 제한한다", () => {
  assert.match(app, /const seed = Math\.floor\(Math\.random\(\) \* 0x100000000\);/);
  assert.match(
    app,
    /createSafetyRouteState\(state\.difficulty,\s*\{\s*seed,\s*tourActive:\s*true\s*\}\)/
  );
  assert.match(app, /Math\.min\(250,\s*nowMs - previousMs\)/);
});

test("길찾기는 숫자 답안 UI를 사용하지 않고 별을 잃지 않는다", () => {
  assert.match(app, /state\.mode === "safety"/);
  assert.match(app, /state\.safety = null;/);
  assert.doesNotMatch(app, /blocked[\s\S]{0,200}state\.stars\s*-=/);
});

test("길찾기 카메라는 첫 장면만 마운트하고 이후 월드 틱은 같은 장면을 갱신한다", () => {
  assert.match(app, /cameraRendered:\s*false/);
  assert.match(app, /const previousCamera = state\.safetyView\.camera;/);
  assert.match(app, /const animateCamera = state\.safetyView\.cameraRendered;/);
  assert.match(
    app,
    /if\s*\(!state\.safetyView\.scene\)\s*\{[\s\S]*?state\.safetyView\.scene = renderSafetyRouteScene\([\s\S]*?dom\.stage\.replaceChildren\(state\.safetyView\.scene\);[\s\S]*?\}\s*else\s*\{[\s\S]*?updateSafetyRouteScene\(\s*state\.safetyView\.scene/
  );
  assert.match(
    app,
    /scene:\s*null/
  );
  assert.match(app, /state\.safetyView\.cameraRendered = true;/);
  assert.match(app, /scheduleSafetyWorldTick\(nowMs\);[\s\S]*?},\s*100\);/);
});

test("홈에는 세 난이도 버튼과 도전 세기 안내가 있다", () => {
  assert.match(html, /id="difficulty-picker"/);
  assert.equal((html.match(/class="difficulty-button"/g) ?? []).length, 3);
  assert.match(html, /id="count-unavailable"/);
  assert.match(app, /도전에서는 더하기, 빼기와 곱하기를 해요\./);
});

test("모바일 숫자 패드는 숫자 입력과 마지막 숫자 지우기를 제공한다", () => {
  assert.match(html, /id="number-pad"/);
  assert.equal((html.match(/data-digit="[0-9]"/g) ?? []).length, 10);
  assert.match(
    html,
    /id="number-pad-delete"[^>]*aria-label="마지막 숫자 지우기"/
  );
  assert.match(css, /\.number-pad\s*\{[^}]*display:\s*none;/s);
  assert.match(
    css,
    /@media\s*\(max-width:\s*640px\)[\s\S]*?\.number-pad\s*\{[^}]*display:\s*grid;/s
  );
});

test("모바일 숫자 패드는 기존 숫자 입력 경로와 삭제 모델을 사용한다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*deleteLastDigit[^}]*\}\s*from "\.\/game-model\.mjs";/s
  );
  assert.match(app, /numberPadDigits\.forEach\([\s\S]*?onDigit\(button\.dataset\.digit\)/);
  assert.match(app, /state\.buffer = deleteLastDigit\(state\.buffer\);/);
});

test("곱셈 결과 팻말은 긴 수식도 한 줄로 유지한다", () => {
  assert.match(
    css,
    /\.result-sign\s*\{[^}]*white-space:\s*nowrap;/s
  );
});

test("피연산자 장면은 두 개의 같은 크기 슬롯과 식을 사용한다", () => {
  assert.match(css, /\.operand-scene\s*\{/);
  assert.match(css, /\.operand-slot\s*\{/);
  assert.match(css, /\.equation-label\s*\{/);
  assert.match(
    css,
    /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s+minmax\(0,\s*1fr\)/
  );
  assert.match(
    css,
    /@media\s*\(max-width:\s*900px\)\s*\{[\s\S]*?\.operand-character\s*\{[^}]*height:/
  );
});

test("세기 친구 장면은 같은 크기의 두 칸과 보이는 힌트 상태를 제공한다", () => {
  assert.match(
    css,
    /\.count-friends\s*\{[^}]*display:\s*grid;[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/s
  );
  assert.match(
    css,
    /\.count-friends\s+\.count-character\s*\{[^}]*max-width:\s*100%;[^}]*max-height:\s*100%;/s
  );
  assert.match(
    css,
    /\.count-friends\.hint-groups\s*\{[^}]*border-color:/s
  );
});

test("모든 캐릭터 이미지에 숫자 단계와 두 축 형태 보정을 표시한다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*characterShapeScale[^}]*\}\s*from "\.\/app-behavior\.mjs";/s
  );
  assert.match(
    app,
    /image\.dataset\.sizeBand\s*=\s*characterSizeBand\(number\);/
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--shape-scale",\s*String\(characterShapeScale\(number,\s*rows,\s*cols\)\)\s*\);/s
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--shape-width-scale",\s*String\(characterShapeWidthScale\(number,\s*rows,\s*cols\)\)\s*\);/s
  );
});

test("결과 팻말은 공유 연산자로 뺄셈 기호를 고른다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*operatorFor[^}]*\}\s*from "\.\/problem-scene\.mjs";/s
  );
  assert.match(
    app,
    /function resultBoard\(problem\)\s*\{[\s\S]*?const operator = operatorFor\(problem\.mode\);/s
  );
});

test("정답 캐릭터 결과는 순수 표현값을 사용하고 이미지 오류 팻말을 유지한다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*celebrationPresentation[^}]*\}\s*from "\.\/app-behavior\.mjs";/s
  );
  assert.match(
    app,
    /function renderCelebration\(problem\)\s*\{[\s\S]*?const presentation = celebrationPresentation\(problem\);/s
  );
  assert.match(app, /wrapper\.className = "celebration-result";/);
  assert.match(app, /equation\.className = "completed-equation";/);
  assert.match(
    app,
    /image\.addEventListener\("error",[\s\S]*?dom\.stage\.replaceChildren\(resultBoard\(problem\)\)/s
  );
});

test("문제와 정답 캐릭터는 장면 확대와 실측 상한을 공유한다", () => {
  assert.match(
    app,
    /import\s*\{[^}]*CHARACTER_VISUAL_METRICS[^}]*REFERENCE_VISUAL_AREA[^}]*\}\s*from "\.\/character-visual-metrics\.mjs";/s
  );
  assert.match(
    app,
    /image\.dataset\.scene\s*=\s*scene;/
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--scene-scale",[\s\S]*?characterSceneScale\(/s
  );
  assert.match(
    app,
    /image\.style\.setProperty\(\s*"--layout-scale-cap",\s*String\(cap\)\s*\);/s
  );
  assert.match(
    app,
    /containedBitmapDimensions\(\{[\s\S]*?naturalWidth:\s*image\.naturalWidth,[\s\S]*?naturalHeight:\s*image\.naturalHeight,[\s\S]*?boxWidth:\s*image\.clientWidth,[\s\S]*?boxHeight:\s*image\.clientHeight/s
  );
  assert.match(
    app,
    /className\s*=\s*"celebration-character-zone"/
  );
});

test("오른쪽 아래에 bliss 제작자 서명을 표시한다", () => {
  assert.match(
    html,
    /<footer class="creator-credit">crafted by <strong>bliss<\/strong> © 2026<\/footer>/
  );
  assert.match(
    css,
    /\.creator-credit\s*\{[^}]*position:\s*fixed;[^}]*right:/s
  );
});
