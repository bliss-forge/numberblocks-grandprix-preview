import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");

test("실사 장면은 승인된 구도와 폴백 계약을 가진다", () => {
  assert.match(css, /\.ktx-real-cab-image\s*\{/);
  assert.match(css, /\.ktx-real-exterior-image\s*\{/);
  assert.match(css, /data-realistic="ready"/);
  assert.match(css, /object-fit:\s*cover/);
});
