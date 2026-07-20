import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";

const ko = [
  "prompt-count", "prompt-add", "prompt-mul",
  ...Array.from({ length: 100 }, (_, i) => `number-${i + 1}`),
  "cheer-1", "cheer-2", "cheer-3", "cheer-4",
  "retry-1", "retry-2", "retry-3"
];
const en = Array.from({ length: 100 }, (_, i) => `number-${i + 1}`);

test("필수 한국어·영어 MP3가 모두 비어 있지 않다", async () => {
  for (const [lang, names] of [["ko", ko], ["en", en]]) {
    for (const name of names) {
      const file = await stat(new URL(`../assets/audio/voice/${lang}/${name}.mp3`, import.meta.url));
      assert.ok(file.size > 1024, `${lang}/${name}.mp3`);
    }
  }
});
