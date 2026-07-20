import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { characterAsset } from "../src/character-spec.mjs";

test("1~100 새 캐릭터 PNG가 고해상도 RGBA로 존재한다", async () => {
  for (let number = 1; number <= 100; number += 1) {
    const asset = characterAsset(number);
    const png = await readFile(
      new URL(`../assets/characters/${asset}`, import.meta.url)
    );
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
    assert.equal(png[25], 6, `${asset} must be RGBA`);
    assert.equal(png.readUInt32BE(16), 1024, `${asset} width`);
    assert.equal(png.readUInt32BE(20), 1536, `${asset} height`);
  }
});
