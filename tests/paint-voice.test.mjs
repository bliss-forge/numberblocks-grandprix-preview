// 물감 음성 계약 — 매니페스트·생성 스크립트·데이터가 같은 키를 본다.
//
// 문구가 두 곳(매니페스트와 파이썬 생성기)에 손으로 나뉘어 적혀 있어서
// 한쪽만 고치면 조용히 무음이 된다. 택배(tests/delivery-voice.test.mjs)에는
// 이 대조가 있었는데 물감에는 없어서, 4색 혼합을 넣을 때 키를 빠뜨려도
// 아무 테스트도 울지 않았다(2026-08-11 리뷰). mp3 존재 여부는
// tests/voice-assets.test.mjs 가 따로 본다.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { VOICE } from "../src/audio-manifest.mjs";
import {
  CANONICAL_MIX,
  PAINT_COLORS,
  PAINT_SUBJECTS,
  PAINT_RECIPES,
  UNLOCKABLE
} from "../src/paint-play-data.mjs";

const generatorSource = await readFile(
  new URL("../scripts/generate_voice_pack.py", import.meta.url), "utf8"
);

const manifestKeys = Object.keys(VOICE)
  .filter(key => key.startsWith("paint-")).sort();

function pythonKeys(name) {
  const block = generatorSource.match(new RegExp(`${name} = \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(block, `${name} 딕셔너리가 없다`);
  return [...block[1].matchAll(/"(paint-[\w-]+)":/g)].map(match => match[1]).sort();
}

test("모든 물감 음성은 한국어와 영어를 함께 갖는다", () => {
  assert.ok(manifestKeys.length >= 60, `키 ${manifestKeys.length}개`);
  for (const key of manifestKeys) {
    assert.equal(VOICE[key].ko, `assets/audio/voice/ko/${key}.mp3`, key);
    assert.equal(VOICE[key].en, `assets/audio/voice/en/${key}.mp3`, key);
  }
});

test("생성 스크립트의 한국어·영어 문구가 매니페스트와 같은 키를 덮는다", () => {
  assert.deepEqual(pythonKeys("KO_PAINT"), manifestKeys, "한국어 문구 목록이 어긋난다");
  assert.deepEqual(pythonKeys("EN_PAINT"), manifestKeys, "영어 문구 목록이 어긋난다");
});

test("생성 스크립트가 두 묶음을 실제로 렌더한다", () => {
  assert.match(generatorSource, /render_pack\("ko", KO_PAINT,/);
  assert.match(generatorSource, /render_pack\("en", EN_PAINT,/);
});

// 데이터가 늘면 음성도 따라 늘어야 한다 — 색·그림을 추가하고 키를 빼먹는
// 것이 이 게임에서 가장 자주 나온 실수다.
test("모든 그림 주제에 주문 음성이 있다", () => {
  for (const subject of PAINT_SUBJECTS) {
    assert.ok(VOICE[`paint-order-${subject.id}`], `${subject.id} 주문 음성`);
  }
});

test("모든 혼합색에 혼합 문장과 실명 호명 음성이 다 있다", () => {
  for (const colorId of Object.keys(CANONICAL_MIX)) {
    assert.ok(VOICE[`paint-mix-${colorId}`], `${colorId} 혼합 문장`);
    assert.ok(VOICE[`paint-made-${colorId}`], `${colorId} 실명 호명`);
  }
  // 원색 다섯은 혼합 문장이 없고 실명 호명만 쓴다
  for (const [colorId, parts] of Object.entries(PAINT_RECIPES)) {
    if (parts.length === 1) assert.ok(VOICE[`paint-made-${colorId}`], colorId);
  }
});

// paint-made-* 중 일부는 지금 재생 경로가 없다. app.mjs 의 paintMixVoiceKey 는
// 병 내용이 CANONICAL_MIX 와 일치하면 paint-mix-* 를 고르는데, 이 색들은
// 도달 경로가 정식 재료 조합 하나뿐이라 항상 mix 쪽으로 빠진다.
// 지우지 않고 남기는 이유: 해당 색이 UNLOCKABLE 로 승격되는 순간
// (예: 회색 튜브) 지름길 조합이 생겨 곧바로 made 쪽이 필요해진다.
// 이 테스트는 "죽은 키"가 늘어나는 것만 막는다.
test("재생 경로 없는 실명 호명 키는 알려진 폴백 넷뿐이다", () => {
  const tubes = ["red", "yellow", "blue", "black", "white"];
  const pool = [...tubes, ...UNLOCKABLE];
  const reachable = new Set();
  // 서로 다른 튜브 1~4개를 붓는 모든 조합에서 어떤 음성 키가 나오는지 센다
  const walk = (start, jar) => {
    if (jar.length) {
      const base = [...new Set(jar.flatMap(id => PAINT_RECIPES[id] ?? [id]))];
      const canonical = CANONICAL_MIX[colorOf(base)];
      const matches = canonical && canonical.length === jar.length &&
        canonical.every(part => jar.includes(part));
      const colorId = colorOf(base);
      if (colorId) reachable.add(matches ? `mix:${colorId}` : `made:${colorId}`);
    }
    if (jar.length >= 4) return;
    for (let index = start; index < pool.length; index += 1) {
      walk(index + 1, [...jar, pool[index]]);
    }
  };
  walk(0, []);

  const dead = Object.keys(PAINT_COLORS)
    .filter(id => VOICE[`paint-made-${id}`])
    .filter(id => !reachable.has(`made:${id}`));
  assert.deepEqual(
    dead.sort(),
    ["gray", "khaki", "lightyellow", "olive"],
    "재생되지 않는 실명 호명 키가 늘었다 — 새 색을 넣었다면 도달 경로를 확인하라"
  );

  // 반대 방향 — 앱이 실제로 요청할 수 있는 키가 매니페스트에 다 있는가.
  // 없으면 조용히 404 무음이 된다(KTX 쪽에서 같은 모양의 결함을 겪었다).
  for (const entry of reachable) {
    const [kind, colorId] = entry.split(":");
    assert.ok(
      VOICE[`paint-${kind}-${colorId}`],
      `paint-${kind}-${colorId} 가 매니페스트에 없다 — 도달 가능한데 무음이 된다`
    );
  }
});

// 물감은 음성 호출이 speakPaint 한 곳으로 모인다. 다른 게임처럼 키 룩업
// 테이블이나 두 번째 래퍼가 생기면 위 도달성 계산의 스캔 범위가 조용히
// 좁아진다 — KTX 세션이 정확히 그걸로 살아 있는 키를 사문화로 오판했다.
//
// 찾을 문자열은 매니페스트에서 끌어온다. 정규식으로 "paint-" 를 훑으면
// CSS 클래스 "paint-play" 나 SVG 속성 paint-order= 까지 걸려 오탐이 난다.
const VOICE_TEMPLATES = Object.freeze([
  "paint-order-${subject.id}",
  "paint-mix-${event.color}",
  "paint-made-${event.color}"
]);

// 스캔 대상은 "오디오를 실제로 만지는 파일"로 그때그때 고른다. 파일 목록을
// 손으로 적으면 새 모듈이 음성을 부르기 시작할 때 스캔이 조용히 좁아진다 —
// 이 테스트가 막으려는 바로 그 실패 모드다(KTX 세션 제안, 2026-08-11).
const AUDIO_TOUCH = /playPrompt\(|playVoice\(|speakPaint\(|audio\./;

async function readSources() {
  const dir = new URL("../src/", import.meta.url);
  const names = (await readdir(dir)).filter(name => name.endsWith(".mjs"));
  const loud = [];
  const quiet = [];
  for (const name of names) {
    // 등록부 자체는 호출자가 아니다
    if (name === "audio-manifest.mjs") continue;
    const source = await readFile(new URL(name, dir), "utf8");
    (AUDIO_TOUCH.test(source) ? loud : quiet).push({ name, source });
  }
  return { loud, quiet };
}

// 토큰 경계까지 맞는 위치만 돌려준다 — localStorage 키
// "numberblocks-paint-unlocked" 가 "paint-unlock" 을 품는 식의 오탐을 뺀다.
function tokenPositions(source, needle) {
  const out = [];
  for (let at = source.indexOf(needle); at >= 0; at = source.indexOf(needle, at + 1)) {
    const before = source[at - 1] ?? " ";
    const after = source[at + needle.length] ?? " ";
    if (!/[\w-]/.test(before) && !/[\w-]/.test(after)) out.push(at);
  }
  return out;
}

test("물감 음성 호출 경로는 speakPaint 하나뿐이다", async () => {
  const needles = [...manifestKeys, ...VOICE_TEMPLATES];
  const { loud } = await readSources();
  assert.ok(loud.some(file => file.name === "app.mjs"), "app.mjs 가 스캔에 없다");
  let found = 0;

  for (const { name: file, source } of loud) {
    for (const needle of needles) {
      // 같은 리터럴이 두 번 나와도 각 위치를 따로 본다(indexOf 한 번은 첫 것만 본다)
      for (const at of tokenPositions(source, needle)) {
        const start = source.lastIndexOf("\n", at) + 1;
        const end = source.indexOf("\n", at);
        const line = source.slice(start, end < 0 ? source.length : end);
        found += 1;
        assert.match(
          line,
          /speakPaint\(|return matches \?/,
          `${file} 에서 물감 키가 speakPaint 밖에서 쓰인다 — 새 호출 경로가 ` +
          `생겼다면 위 도달성 계산의 스캔 범위를 함께 넓혀라: ${line.trim()}`
        );
      }
    }
  }
  assert.ok(found >= 5, `물감 키 사용처를 ${found}곳만 찾았다 — 스캔이 헛돌았다`);
});

// 반대 방향의 마지막 갈래 — 매니페스트에만 있고 아무 호출도 만들 수 없는 키.
// 그림 주제를 지우면 paint-order-<그것> 이 매니페스트·생성기·mp3 로 영영 남는다.
// 앞선 두 검사는 "데이터 → 매니페스트"와 "도달 가능 → 매니페스트"만 봐서
// 이 방향이 비어 있었다. 부정 결과("고아 0건")를 한 번 손으로 확인하고
// 끝내지 않고 가드로 고정한다.
test("매니페스트의 모든 물감 키는 어떤 호출이든 만들 수 있어야 한다", () => {
  const callable = new Set([
    "paint-intro", "paint-unlock", "paint-rainbow", "paint-finale",
    ...PAINT_SUBJECTS.map(subject => `paint-order-${subject.id}`),
    // paintMixVoiceKey 가 낼 수 있는 두 계열
    ...Object.keys(CANONICAL_MIX).map(id => `paint-mix-${id}`),
    ...Object.keys(PAINT_COLORS).map(id => `paint-made-${id}`)
  ]);
  const orphan = manifestKeys.filter(key => !callable.has(key));
  assert.deepEqual(
    orphan, [],
    "아무 호출 지점도 만들 수 없는 키가 있다 — 그림·색을 지웠다면 " +
    "매니페스트·생성기·mp3 에서도 함께 지워라"
  );
});

// 음성 키와 똑같은 이름의 CSS 클래스·데이터 속성이 생기면, 그 파일이 나중에
// 오디오를 만지기 시작하는 순간 위 스캔이 그 이름을 "호출"로 오탐한다.
// 그러면 정작 그 키가 사문화돼도 못 잡는다 — KTX 쪽에서 실제로 발견된 지뢰
// (srt-journey-scene 의 CSS 클래스 "srt-parking" 이 음성 키와 동명)라,
// 물감에서는 충돌이 생기는 시점에 미리 걸리게 한다.
test("음성 키와 같은 이름의 비오디오 토큰이 없다", async () => {
  const { quiet } = await readSources();
  const css = await readFile(new URL("../styles.css", import.meta.url), "utf8");
  const collisions = [];
  for (const key of manifestKeys) {
    for (const { name, source } of quiet) {
      if (tokenPositions(source, key).length) collisions.push(`src/${name}: ${key}`);
    }
    if (tokenPositions(css, key).length) collisions.push(`styles.css: ${key}`);
  }
  assert.deepEqual(
    collisions, [],
    "음성 키와 이름이 겹치는 클래스·속성이 있다 — 그 파일이 오디오를 " +
    "만지기 시작하면 호출 스캔이 오탐하므로 이름부터 바꿔라"
  );
});

// 위 탐색이 쓰는 결과색 판정 — mixJar 와 같은 규칙을 테스트 안에서 재현한다.
function colorOf(base) {
  if (base.length === 1) return base[0];
  const key = [...base].sort().join("+");
  for (const [colorId, parts] of Object.entries(CANONICAL_MIX)) {
    if ([...parts].sort().join("+") === key) return colorId;
  }
  return base.length >= 4 ? "mud" : null;
}
