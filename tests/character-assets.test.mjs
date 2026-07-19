import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NUMBERBLOCKS } from "../src/game-model.mjs";

test("1~10 캐릭터 PNG가 존재하고 투명 채널을 가진다", async () => {
  for (const { asset } of Object.values(NUMBERBLOCKS)) {
    const png = await readFile(new URL(`../assets/characters/${asset}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
    assert.ok([4, 6].includes(png[25]), `${asset} must use grayscale+alpha or RGBA`);
    assert.ok(png.readUInt32BE(16) >= 512, `${asset} width`);
    assert.ok(png.readUInt32BE(20) >= 512, `${asset} height`);
  }
});
