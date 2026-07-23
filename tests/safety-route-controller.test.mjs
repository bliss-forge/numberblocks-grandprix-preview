import test from "node:test";
import assert from "node:assert/strict";

import {
  directionForKey,
  safetyCueForEvent
} from "../src/safety-route-controller.mjs";

test("방향키와 WASD를 네 방향 이동으로 바꾼다", () => {
  assert.equal(directionForKey("ArrowUp"), "up");
  assert.equal(directionForKey("w"), "up");
  assert.equal(directionForKey("A"), "left");
  assert.equal(directionForKey("ArrowDown"), "down");
  assert.equal(directionForKey("d"), "right");
  assert.equal(directionForKey("5"), null);
});

test("친구를 만나면 다음 목적지와 음성 키를 안내한다", () => {
  assert.deepEqual(
    safetyCueForEvent({ type: "friend", number: 2 }, 3),
    {
      message: "2 친구를 만났어요! 이제 3 친구를 만나러 가요.",
      voiceKey: "safety-next-3",
      tone: "success"
    }
  );
});

test("안전 장애물은 실패 대신 이유와 행동을 설명한다", () => {
  assert.deepEqual(
    safetyCueForEvent({ type: "blocked", reason: "red-light" }, 2),
    {
      message: "빨간불이에요. 초록불이 될 때까지 기다려요!",
      voiceKey: "safety-red-light",
      tone: "safety"
    }
  );
  assert.match(
    safetyCueForEvent({ type: "blocked", reason: "manhole" }, 4).message,
    /맨홀/
  );
  assert.match(
    safetyCueForEvent({ type: "blocked", reason: "car" }, 4).message,
    /자동차/
  );
});

test("순서와 완주 안내를 제공한다", () => {
  assert.deepEqual(
    safetyCueForEvent({ type: "wrong-friend", number: 7 }, 4),
    {
      message: "7 친구도 반가워요! 먼저 4 친구를 만나러 가요.",
      voiceKey: "safety-wrong-order",
      tone: "guide"
    }
  );
  assert.equal(
    safetyCueForEvent({ type: "need-friends", nextFriend: 6 }, 6).voiceKey,
    "safety-next-6"
  );
  assert.deepEqual(
    safetyCueForEvent({ type: "complete" }, 11),
    {
      message: "모든 친구를 만났어요! 안전하게 도착했어요!",
      voiceKey: "safety-finish",
      tone: "success"
    }
  );
});
