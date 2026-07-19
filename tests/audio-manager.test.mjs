import test from "node:test";
import assert from "node:assert/strict";
import { AudioManager } from "../src/audio-manager.mjs";

function harness({ autoEnd = true } = {}) {
  const played = [];
  const audios = [];
  const storage = new Map();
  const manager = new AudioManager({
    createAudio(src) {
      const audio = {
        src,
        volume: 1,
        pauseCalled: false,
        onended: null,
        onerror: null,
        play: async () => {
          played.push(src);
          if (autoEnd) queueMicrotask(() => audio.onended?.());
        },
        pause: () => {
          audio.pauseCalled = true;
        }
      };
      audios.push(audio);
      return audio;
    },
    storage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    }
  });
  return { manager, played, audios, storage };
}

test("정답은 한국어 다음 영국 영어 순서로 재생한다", async () => {
  const { manager, played } = harness();

  await manager.playAnswer(4);

  assert.match(played[0], /ko\/number-4\.mp3$/);
  assert.match(played[1], /en\/number-4\.mp3$/);
});

test("파일 재생 Promise는 play 호출이 아니라 onended 뒤에 끝난다", async () => {
  const { manager, audios } = harness({ autoEnd: false });
  let settled = false;
  const pending = manager.playVoice("prompt-count").then(() => {
    settled = true;
  });

  await Promise.resolve();
  assert.equal(settled, false);

  audios[0].onended();
  await pending;
  assert.equal(settled, true);
});

test("cancel은 현재 오디오를 멈추고 대기 중인 Promise를 끝낸다", async () => {
  const { manager, audios } = harness({ autoEnd: false });
  const pending = manager.playVoice("prompt-count");

  manager.cancel();
  await pending;

  assert.equal(audios[0].pauseCalled, true);
});

test("pause가 예외를 내도 cancel은 안전하게 Promise를 끝낸다", async () => {
  const warnings = [];
  const manager = new AudioManager({
    createAudio: src => ({
      src,
      volume: 1,
      onended: null,
      onerror: null,
      play: async () => {},
      pause() {
        throw new Error("pause failed");
      }
    }),
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });
  const pending = manager.playVoice("prompt-count");

  assert.doesNotThrow(() => manager.cancel());
  await pending;

  assert.equal(warnings.length, 1);
});

test("한국어 종료 직후 cancel하면 이전 큐의 영어는 재생하지 않는다", async () => {
  const { manager, played, audios } = harness({ autoEnd: false });
  const pending = manager.playAnswer(3);

  assert.equal(audios.length, 1);
  audios[0].onended();
  manager.cancel();
  await pending;

  assert.deepEqual(played, ["assets/audio/voice/ko/number-3.mp3"]);
  assert.equal(audios.length, 1);
});

test("음소거 상태를 저장하고 재생을 건너뛴다", async () => {
  const { manager, played, storage } = harness();

  assert.equal(manager.toggleMuted(), true);
  await manager.playAnswer(2);

  assert.deepEqual(played, []);
  assert.equal(storage.get("numberblocks-muted"), "true");
});

test("저장된 음소거 상태를 새 인스턴스가 복원한다", async () => {
  const played = [];
  const storage = new Map([["numberblocks-muted", "true"]]);
  const manager = new AudioManager({
    createAudio: src => ({
      play: async () => played.push(src),
      pause() {}
    }),
    storage: {
      getItem: key => storage.get(key) ?? null,
      setItem: (key, value) => storage.set(key, value)
    }
  });

  await manager.playVoice("prompt-count");

  assert.equal(manager.muted, true);
  assert.deepEqual(played, []);
});

test("같은 음성 파일의 재생 오류는 한 번만 경고한다", async () => {
  const warnings = [];
  const manager = new AudioManager({
    createAudio(src) {
      const audio = {
        src,
        volume: 1,
        onended: null,
        onerror: null,
        play: async () =>
          queueMicrotask(() => audio.onerror?.(new Error("missing"))),
        pause() {}
      };
      return audio;
    },
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });

  await manager.playVoice("prompt-count");
  await manager.playVoice("prompt-count");

  assert.equal(warnings.length, 1);
});

test("play가 거절되어도 한 번만 경고하고 재생 Promise를 끝낸다", async () => {
  const warnings = [];
  const manager = new AudioManager({
    createAudio: src => ({
      src,
      volume: 1,
      onended: null,
      onerror: null,
      play: async () => {
        throw new Error("autoplay blocked");
      },
      pause() {}
    }),
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });

  await manager.playVoice("prompt-count");
  await manager.playVoice("prompt-count");

  assert.equal(warnings.length, 1);
});

test("음성 재생 중 효과음 gain을 0.55배로 덕킹한다", async () => {
  const { manager, audios } = harness({ autoEnd: false });
  const ramps = [];
  const context = {
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
  };
  manager.audioContextFactory = () => context;
  const pending = manager.playVoice("prompt-count");

  manager.playSfx("pop");

  assert.equal(ramps[0].value, 0.06 * 0.55);
  assert.equal(ramps[0].at, 2.005);
  assert.equal(ramps[2].value, 0.06 * 0.55);
  assert.equal(ramps[2].at, 2.085);

  audios[0].onended();
  await pending;
});

test("음소거 중에는 AudioContext를 만들지 않는다", () => {
  const { manager } = harness();
  let contextsCreated = 0;
  manager.audioContextFactory = () => {
    contextsCreated += 1;
    return {};
  };
  manager.toggleMuted();

  manager.playSfx("win");

  assert.equal(contextsCreated, 0);
});

test("AudioContext 생성 실패는 호출자에게 전파하지 않고 한 번만 경고한다", () => {
  const warnings = [];
  const manager = new AudioManager({
    audioContextFactory() {
      throw new Error("context unavailable");
    },
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.doesNotThrow(() => manager.playSfx("key"));
  assert.doesNotThrow(() => manager.playSfx("key"));

  assert.equal(warnings.length, 1);
});

test("SFX 노드 생성 실패는 호출자에게 전파하지 않고 소스별 한 번만 경고한다", () => {
  const warnings = [];
  const manager = new AudioManager({
    audioContextFactory: () => ({
      currentTime: 0,
      destination: {},
      createOscillator() {
        throw new Error("oscillator unavailable");
      },
      createGain() {
        throw new Error("gain unavailable");
      }
    }),
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.doesNotThrow(() => manager.playSfx("pop"));
  assert.doesNotThrow(() => manager.playSfx("pop"));

  assert.equal(warnings.length, 1);
});

test("SFX 예약 실패는 호출자에게 전파하지 않고 소스별 한 번만 경고한다", () => {
  const warnings = [];
  const manager = new AudioManager({
    audioContextFactory: () => ({
      currentTime: 0,
      destination: {},
      createOscillator: () => ({
        type: "",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {
          throw new Error("schedule failed");
        },
        stop() {}
      }),
      createGain: () => ({
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        },
        connect() {}
      })
    }),
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.doesNotThrow(() => manager.playSfx("win"));
  assert.doesNotThrow(() => manager.playSfx("win"));

  assert.equal(warnings.length, 1);
});

test("저장소 읽기 실패는 생성을 막지 않고 기본 음소거 해제를 유지한다", () => {
  const warnings = [];
  let manager;

  assert.doesNotThrow(() => {
    manager = new AudioManager({
      storage: {
        getItem() {
          throw new Error("storage blocked");
        },
        setItem() {}
      },
      logger: { warn: (...args) => warnings.push(args) }
    });
  });

  assert.equal(manager.muted, false);
  assert.equal(warnings.length, 1);
});

test("저장소 쓰기 실패에도 인메모리 음소거 상태는 정상 전환된다", () => {
  const warnings = [];
  const manager = new AudioManager({
    storage: {
      getItem: () => null,
      setItem() {
        throw new Error("storage blocked");
      }
    },
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.doesNotThrow(() => assert.equal(manager.toggleMuted(), true));
  assert.equal(manager.muted, true);
  assert.doesNotThrow(() => assert.equal(manager.toggleMuted(), false));
  assert.equal(manager.muted, false);
  assert.equal(warnings.length, 1);
});

test("중단된 AudioContext는 재개 결과를 기다리지 않고 SFX를 예약한다", () => {
  let resumeCalls = 0;
  let startCalls = 0;
  const manager = new AudioManager({
    audioContextFactory: () => ({
      state: "suspended",
      currentTime: 0,
      destination: {},
      resume() {
        resumeCalls += 1;
        return new Promise(() => {});
      },
      createOscillator: () => ({
        type: "",
        frequency: { setValueAtTime() {} },
        connect() {},
        start() {
          startCalls += 1;
        },
        stop() {}
      }),
      createGain: () => ({
        gain: {
          setValueAtTime() {},
          exponentialRampToValueAtTime() {}
        },
        connect() {}
      })
    }),
    storage: { getItem: () => null, setItem() {} }
  });

  manager.playSfx("key");

  assert.equal(resumeCalls, 1);
  assert.equal(startCalls, 1);
});

test("AudioContext 재개 거절은 처리되어 SFX와 후속 호출을 막지 않는다", async () => {
  const warnings = [];
  let startCalls = 0;
  const context = {
    state: "suspended",
    currentTime: 0,
    destination: {},
    resume: async () => {
      throw new Error("resume blocked");
    },
    createOscillator: () => ({
      type: "",
      frequency: { setValueAtTime() {} },
      connect() {},
      start() {
        startCalls += 1;
      },
      stop() {}
    }),
    createGain: () => ({
      gain: {
        setValueAtTime() {},
        exponentialRampToValueAtTime() {}
      },
      connect() {}
    })
  };
  const manager = new AudioManager({
    audioContextFactory: () => context,
    storage: { getItem: () => null, setItem() {} },
    logger: { warn: (...args) => warnings.push(args) }
  });

  assert.doesNotThrow(() => manager.playSfx("key"));
  assert.doesNotThrow(() => manager.playSfx("key"));
  await new Promise(resolve => setImmediate(resolve));

  assert.equal(startCalls, 2);
  assert.equal(warnings.length, 1);
});
