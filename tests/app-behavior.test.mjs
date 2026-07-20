import test from "node:test";
import assert from "node:assert/strict";
import { AudioManager } from "../src/audio-manager.mjs";
import {
  formatProblemText,
  playPromptCue,
  playRetryCue,
  retireAnimationClass
} from "../src/app-behavior.mjs";

function audioHarness() {
  const audios = [];
  const ramps = [];
  const manager = new AudioManager({
    createAudio(src) {
      const audio = {
        src,
        volume: 1,
        onended: null,
        onerror: null,
        play: async () => {},
        pause() {}
      };
      audios.push(audio);
      return audio;
    },
    storage: { getItem: () => null, setItem() {} },
    audioContextFactory: () => ({
      currentTime: 2,
      destination: {},
      createOscillator: () => ({
        type: "",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {},
        stop() {}
      }),
      createGain: () => ({
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime(value, at) {
            ramps.push({ value, at });
          }
        },
        connect() {}
      })
    })
  });
  return { manager, audios, ramps };
}

test("문제 음성을 시작한 뒤 pop 효과음을 예약해 실제 덕킹을 적용한다", async () => {
  const { manager, audios, ramps } = audioHarness();

  playPromptCue(manager, "prompt-count");

  assert.equal(manager.voicePlaying, true);
  assert.equal(ramps[0].value, 0.06 * 0.55);
  audios[0].onended();
  await Promise.resolve();
});

test("재시도 음성을 시작한 뒤 wrong 효과음을 예약해 실제 덕킹을 적용한다", async () => {
  const { manager, audios, ramps } = audioHarness();

  playRetryCue(manager, "retry-1");

  assert.equal(manager.voicePlaying, true);
  assert.equal(ramps[0].value, 0.04 * 0.55);
  audios[0].onended();
  await Promise.resolve();
});

test("입장 애니메이션 클래스는 첫 animationend 뒤 제거되어 다시 재생되지 않는다", () => {
  const node = new EventTarget();
  const removed = [];
  node.classList = { remove: className => removed.push(className) };

  retireAnimationClass(node, "enter");
  node.dispatchEvent(new Event("animationend"));
  node.dispatchEvent(new Event("animationend"));

  assert.deepEqual(removed, ["enter"]);
});

test("더하기와 곱하기 문제 문구는 자연스러운 한국어 조사를 사용한다", () => {
  assert.equal(
    formatProblemText({ mode: "add", operands: [1, 2] }),
    "1 더하기 2의 답은 얼마일까요?"
  );
  assert.equal(
    formatProblemText({ mode: "mul", operands: [3, 4] }),
    "3 곱하기 4의 답은 얼마일까요?"
  );
});
