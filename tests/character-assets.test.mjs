import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { NUMBERBLOCKS } from "../src/game-model.mjs";
import { characterAsset } from "../src/character-spec.mjs";

test("1~10 캐릭터 PNG가 존재하고 투명 채널을 가진다", async () => {
  for (const { asset } of Object.values(NUMBERBLOCKS)) {
    const png = await readFile(new URL(`../assets/characters/${asset}`, import.meta.url));
    assert.equal(png.toString("ascii", 1, 4), "PNG", asset);
    assert.ok([4, 6].includes(png[25]), `${asset} must use grayscale+alpha or RGBA`);
    assert.ok(png.readUInt32BE(16) >= 512, `${asset} width`);
    assert.ok(png.readUInt32BE(20) >= 512, `${asset} height`);
  }
});

test("곱셈 도우미 PNG가 충분한 크기와 투명 채널을 가진다", async () => {
  const png = await readFile(
    new URL("../assets/characters/multiply-helper.png", import.meta.url)
  );

  assert.equal(png.toString("ascii", 1, 4), "PNG");
  assert.ok([4, 6].includes(png[25]), "multiply helper must include alpha");
  assert.ok(png.readUInt32BE(16) >= 512, "multiply helper width");
  assert.ok(png.readUInt32BE(20) >= 512, "multiply helper height");
});

test("1~20 새 캐릭터 PNG가 고해상도 RGBA로 존재한다", async () => {
  for (let number = 1; number <= 20; number += 1) {
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
