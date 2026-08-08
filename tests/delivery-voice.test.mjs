// 택배 음성 계약 — 매니페스트·생성 스크립트·앱이 같은 키를 본다.
//
// 이 저장소는 문구를 두 곳(매니페스트와 파이썬 생성기)에 나눠 적는다. 자동 동기화
// 장치가 없어 한쪽만 고치면 조용히 무음이 된다. 여기서 그 어긋남을 잡는다.
// mp3 파일 존재 여부는 tests/voice-assets.test.mjs 가 따로 본다.

import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { VOICE } from "../src/audio-manifest.mjs";
import { PARCELS } from "../src/delivery-model.mjs";

const generatorSource = await readFile(new URL("../scripts/generate_voice_pack.py", import.meta.url), "utf8");
const appSource = await readFile(new URL("../src/app.mjs", import.meta.url), "utf8");

const manifestKeys = Object.keys(VOICE).filter(key => key.startsWith("delivery-")).sort();

function pythonKeys(name) {
  const block = generatorSource.match(new RegExp(`${name} = \\{([\\s\\S]*?)\\n\\}`));
  assert.ok(block, `${name} 딕셔너리가 없다`);
  return [...block[1].matchAll(/"(delivery-[\w-]+)":/g)].map(m => m[1]).sort();
}

test("음성 키가 하나 이상 등재돼 있다", () => {
  assert.ok(manifestKeys.length >= 12, `키 ${manifestKeys.length}개`);
});

test("모든 택배 음성은 한국어와 영어를 함께 갖는다", () => {
  for (const key of manifestKeys) {
    const entry = VOICE[key];
    assert.equal(entry.ko, `assets/audio/voice/ko/${key}.mp3`, key);
    assert.equal(entry.en, `assets/audio/voice/en/${key}.mp3`, key);
  }
});

test("생성 스크립트의 한국어·영어 문구가 매니페스트와 정확히 같은 키를 덮는다", () => {
  assert.deepEqual(pythonKeys("KO_DELIVERY"), manifestKeys, "한국어 문구 목록이 어긋난다");
  assert.deepEqual(pythonKeys("EN_DELIVERY"), manifestKeys, "영어 문구 목록이 어긋난다");
});

test("생성 스크립트가 두 묶음을 실제로 렌더한다", () => {
  assert.match(generatorSource, /render_pack\("ko", KO_DELIVERY,/);
  assert.match(generatorSource, /render_pack\("en", EN_DELIVERY,/);
});

test("상자 세 종류의 이름 음성이 모두 있다", () => {
  for (const parcel of PARCELS) {
    assert.ok(
      manifestKeys.includes(`delivery-parcel-${parcel.id}`),
      `${parcel.label} 음성 키가 없다`
    );
  }
});

test("등재한 음성은 앱이 실제로 부른다 — 쓰이지 않는 키가 없다", () => {
  const spoken = new Set([...appSource.matchAll(/playPrompt\("(delivery-[\w-]+)"\)/g)].map(m => m[1]));
  const templated = /playPrompt\(`delivery-parcel-\$\{[^}]+\}`\)/.test(appSource);

  for (const key of manifestKeys) {
    if (key.startsWith("delivery-parcel-") && PARCELS.some(p => `delivery-parcel-${p.id}` === key)) {
      assert.ok(templated, `${key} 는 상자 이름 낭독으로 불려야 한다`);
      continue;
    }
    assert.ok(spoken.has(key), `${key} 를 앱이 부르지 않는다`);
  }
});

test("앱이 부르는 음성은 모두 등재돼 있다 — 무음이 되는 키가 없다", () => {
  const spoken = [...appSource.matchAll(/playPrompt\("(delivery-[\w-]+)"\)/g)].map(m => m[1]);
  for (const key of spoken) {
    assert.ok(manifestKeys.includes(key), `${key} 가 매니페스트에 없다(조용히 무음이 된다)`);
  }
});
