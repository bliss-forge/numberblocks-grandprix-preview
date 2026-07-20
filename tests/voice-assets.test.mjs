import test from "node:test";
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";

const ko = [
  "prompt-count", "prompt-add", "prompt-sub", "prompt-mul",
  ...Array.from({ length: 150 }, (_, i) => `number-${i + 1}`),
  "cheer-1", "cheer-2", "cheer-3", "cheer-4",
  "retry-1", "retry-2", "retry-3"
];
const en = [
  "prompt-sub",
  ...Array.from({ length: 150 }, (_, i) => `number-${i + 1}`)
];

test("필수 한국어·영어 MP3가 모두 비어 있지 않다", async () => {
  for (const [lang, names] of [["ko", ko], ["en", en]]) {
    for (const name of names) {
      const file = await stat(new URL(`../assets/audio/voice/${lang}/${name}.mp3`, import.meta.url));
      assert.ok(file.size > 1024, `${lang}/${name}.mp3`);
    }
  }
});

test("영국 영어 뺄셈 안내 문구는 아이에게 자연스러운 표현을 사용한다", async () => {
  const generator = await readFile(
    new URL("../scripts/generate_voice_pack.py", import.meta.url),
    "utf8"
  );

  assert.match(
    generator,
    /"prompt-sub": "What do you get when you take the smaller number away from the larger number\?"/
  );
});
