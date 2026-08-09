import test from "node:test";
import assert from "node:assert/strict";
import { AudioManager } from "../src/audio-manager.mjs";
import { createProblem, NUMBERBLOCKS } from "../src/game-model.mjs";
import {
  CHARACTER_VISUAL_METRICS,
  REFERENCE_VISUAL_AREA
} from "../src/character-visual-metrics.mjs";
import * as appBehavior from "../src/app-behavior.mjs";
import {
  celebrationView,
  characterNumberScale,
  characterSceneAreaTarget,
  characterSceneScale,
  characterShapeScale,
  characterShapeWidthScale,
  characterSizeBand,
  formatCountHint,
  formatProblemText,
  focusPhase,
  playPromptCue,
  playRetryCue,
  quantityParts,
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

test("SRT 부스터 이벤트를 짧은 효과음과 자연스러운 안내로 바꾼다", () => {
  assert.equal(typeof appBehavior.ktxBoosterCue, "function");
  assert.deepEqual(appBehavior.ktxBoosterCue({ type: "boost-start" }), {
    sfx: "win",
    hint: "🚄 부스터 출발! 5초 동안 500!"
  });
  assert.deepEqual(appBehavior.ktxBoosterCue({
    type: "boost-unavailable",
    remainingMs: 5200
  }), {
    sfx: "key",
    hint: "충전 중이에요! 6초"
  });
  assert.deepEqual(appBehavior.ktxBoosterCue({ type: "boost-end" }), {
    sfx: "pop",
    hint: "부스터 끝! 안전 운전해요"
  });
  assert.deepEqual(appBehavior.ktxBoosterCue({ type: "boost-ready" }), {
    sfx: "key",
    hint: "부스터 준비 완료!"
  });
  assert.equal(appBehavior.ktxBoosterCue({ type: "horn" }), null);
});

test("게임으로 전환하면 숨김이 해제된 게임 화면으로 포커스를 옮긴다", () => {
  const calls = [];
  const game = { focus: options => calls.push({ target: "game", options }) };
  const homeControl = {
    focus: options => calls.push({ target: "home", options })
  };

  focusPhase("playing", { game, homeControl });

  assert.deepEqual(calls, [
    { target: "game", options: { preventScroll: true } }
  ]);
});

test("홈으로 돌아오면 모드 선택 컨트롤로 포커스를 복원한다", () => {
  const calls = [];
  const game = { focus: options => calls.push({ target: "game", options }) };
  const homeControl = {
    focus: options => calls.push({ target: "home", options })
  };

  focusPhase("home", { game, homeControl });

  assert.deepEqual(calls, [
    { target: "home", options: { preventScroll: true } }
  ]);
});

test("문제 음성을 시작한 뒤 pop 효과음을 예약해 실제 덕킹을 적용한다", async () => {
  const { manager, audios, ramps } = audioHarness();

  playPromptCue(manager, "prompt-count");

  assert.equal(manager.voicePlaying, true);
  assert.equal(ramps[0].value, 0.06 * 0.55);
  audios[0].onended();
  await Promise.resolve();
});

test("뺄셈 문제 음성은 한국어 다음 영국 영어로 이어지고 pop 효과음을 덕킹한다", async () => {
  const { manager, audios, ramps } = audioHarness();

  const pending = playPromptCue(manager, "prompt-sub");

  assert.equal(manager.voicePlaying, true);
  assert.equal(ramps[0].value, 0.06 * 0.55);
  assert.match(audios[0].src, /ko\/prompt-sub\.mp3$/);

  audios[0].onended();
  await Promise.resolve();
  await Promise.resolve();

  assert.equal(audios.length, 2);
  assert.match(audios[1].src, /en\/prompt-sub\.mp3$/);
  audios[1].onended();
  await pending;
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
  assert.equal(
    formatProblemText({ mode: "sub", operands: [38, 6] }),
    "38 빼기 6의 답은 얼마일까요?"
  );
});

test("큰 수를 십 묶음과 낱개로 나눈다", () => {
  assert.deepEqual(quantityParts(7), { tens: 0, ones: 7 });
  assert.deepEqual(quantityParts(17), { tens: 1, ones: 7 });
  assert.deepEqual(quantityParts(50), { tens: 5, ones: 0 });
  assert.deepEqual(quantityParts(100), { tens: 10, ones: 0 });
});

test("세기 힌트는 정답 대신 묶음 구조를 말한다", () => {
  assert.equal(formatCountHint(7), "블록을 하나씩 짚어 보세요.");
  assert.equal(formatCountHint(17), "10개 묶음 1개와 낱개 7개예요.");
  assert.equal(formatCountHint(20), "10개 묶음이 2개예요.");
});

test("모든 게임은 1~150 정답 캐릭터를 선택한다", () => {
  for (const mode of ["count", "add", "sub", "mul"]) {
    for (const answer of [1, 10, 11, 20, 50, 100, 101, 150]) {
      assert.equal(celebrationView(mode, answer), "number");
    }
  }
  assert.equal(celebrationView("add", 151), "result-board");
});

test("실제로 출제되는 뺄셈 정답은 결과 캐릭터와 완성된 식을 함께 보여 준다", () => {
  const problem = createProblem("sub", "challenge", () => 671.5 / 1225);

  assert.deepEqual(problem.operands, [38, 6]);
  assert.equal(typeof appBehavior.celebrationPresentation, "function");
  assert.deepEqual(appBehavior.celebrationPresentation(problem), {
    view: "number",
    characterNumber: 32,
    equation: "38 − 6 = 32"
  });
});

test("세기 결과 표현에는 식을 추가하지 않는다", () => {
  assert.equal(typeof appBehavior.celebrationPresentation, "function");
  assert.deepEqual(
    appBehavior.celebrationPresentation({ mode: "count", answer: 13 }),
    { view: "number", characterNumber: 13, equation: null }
  );
});

test("환승 하차는 멜로디 없이 발빠짐 안내만 고른다", () => {
  assert.equal(typeof appBehavior.subwayArrivingCue, "function");
  assert.deepEqual(appBehavior.subwayArrivingCue("transfer", "forward"), {
    realKey: "mind-gap",
    fallback: "subway-mind-gap",
    nextKey: null,
    sfx: "door",
    hint: "환승역이에요! 빨간 표시가 노란 칸에 올 때 ⎵!"
  });
});

test("최종 목적지는 이동 방향에 맞는 도착 멜로디 뒤 발빠짐 안내를 고른다", () => {
  assert.equal(typeof appBehavior.subwayArrivingCue, "function");
  assert.deepEqual(appBehavior.subwayArrivingCue("destination", "back"), {
    realKey: "arrive-melody-up",
    fallback: null,
    nextKey: "mind-gap",
    sfx: "win",
    hint: "도착 멜로디가 나와요! 곧 문이 열려요"
  });
  assert.equal(
    appBehavior.subwayArrivingCue("destination", "forward").realKey,
    "arrive-melody-down"
  );
});

test("캐릭터 숫자를 지정된 다섯 배율 단계로 나눈다", () => {
  const boundaries = [
    [1, "base"],
    [10, "base"],
    [11, "scale-120"],
    [20, "scale-120"],
    [21, "scale-140"],
    [50, "scale-140"],
    [51, "scale-160"],
    [100, "scale-160"],
    [101, "scale-180"],
    [150, "scale-180"]
  ];

  for (const [number, band] of boundaries) {
    assert.equal(characterSizeBand(number), band, `number ${number}`);
  }
});

test("1~10은 형태 보정 없이 기존 크기를 유지한다", () => {
  assert.equal(characterShapeScale(1, 1, 1), 1);
  assert.equal(characterShapeScale(6, 3, 2), 1);
  assert.equal(characterShapeScale(10, 5, 2), 1);
});

test("11 이상 세로형은 블록 배치 밀도로 자동 확대한다", () => {
  assert.ok(Math.abs(characterShapeScale(18, 9, 2) - Math.sqrt(3)) < 1e-12);
  assert.equal(characterShapeScale(20, 4, 5), 1);
  assert.equal(characterShapeScale(19, 10, 2), 1.75);
  assert.ok(
    Math.abs(
      1.2 * characterShapeScale(18, 9, 2) - 2.0784609690826525
    ) < 1e-12
  );
});

test("잘못된 캐릭터 치수는 안전하게 보정 1을 사용한다", () => {
  for (const args of [
    [18, 0, 2],
    [18, 9, -1],
    [18, Number.NaN, 2],
    [18.5, 9, 2],
    [18, 9.5, 2]
  ]) {
    assert.equal(characterShapeScale(...args), 1);
  }
});

test("좁은 큰 수는 형태 보정의 절반만큼 가로축을 추가 보정한다", () => {
  assert.equal(characterShapeWidthScale(6, 3, 2), 1);
  assert.ok(
    Math.abs(
      characterShapeWidthScale(18, 9, 2) -
      (1 + (Math.sqrt(3) - 1) * 0.5)
    ) < 1e-12
  );
  assert.equal(characterShapeWidthScale(19, 10, 2), 1.375);
  assert.equal(characterShapeWidthScale(18, 0, 2), 1);
});

test("장면별 큰 수 몸체 면적 목표를 정확히 고른다", () => {
  for (const [number, target] of [
    [10, 1],
    [11, 1.5],
    [20, 1.5],
    [21, 1.7],
    [50, 1.7],
    [51, 1.9],
    [100, 1.9],
    [101, 2.1],
    [150, 2.1]
  ]) {
    assert.equal(characterSceneAreaTarget(number, "problem"), target);
    assert.equal(
      characterSceneAreaTarget(number, "celebration"),
      number <= 10 ? 1 : target * 1.4
    );
  }
});

test("1~10과 잘못된 장면은 추가 확대를 사용하지 않는다", () => {
  assert.equal(characterSceneAreaTarget(1, "problem"), 1);
  assert.equal(characterSceneAreaTarget(10, "celebration"), 1);
  assert.equal(characterSceneAreaTarget(19, "other"), 1);
  assert.equal(characterSceneAreaTarget(0, "problem"), 1);
  assert.equal(characterSceneAreaTarget(151, "problem"), 1);
});

test("1~10 장면 배율은 항상 1이고 이미 목표 이상인 몸체는 줄이지 않는다", () => {
  for (let number = 1; number <= 10; number += 1) {
    const { rows, cols } = NUMBERBLOCKS[number];
    for (const scene of ["problem", "celebration"]) {
      assert.equal(characterSceneScale({
        number,
        scene,
        rows,
        cols,
        metric: CHARACTER_VISUAL_METRICS[number],
        referenceArea: REFERENCE_VISUAL_AREA
      }), 1, `${number} ${scene}`);
    }
  }

  for (const number of [39, 52, 75, 76]) {
    const { rows, cols } = NUMBERBLOCKS[number];
    assert.equal(characterSceneScale({
      number,
      scene: "problem",
      rows,
      cols,
      metric: CHARACTER_VISUAL_METRICS[number],
      referenceArea: REFERENCE_VISUAL_AREA
    }), 1, `${number} problem`);
  }
});

test("잘못된 숫자나 장면의 장면 배율은 추가 확대를 사용하지 않는다", () => {
  const { rows, cols } = NUMBERBLOCKS[12];
  const metric = CHARACTER_VISUAL_METRICS[12];

  for (const [number, scene] of [
    [12, "other"],
    [0, "problem"],
    [12.5, "problem"],
    [151, "problem"]
  ]) {
    assert.equal(
      characterSceneScale({
        number,
        scene,
        rows,
        cols,
        metric,
        referenceArea: REFERENCE_VISUAL_AREA
      }),
      1,
      `${number} ${scene}`
    );
  }
});

test("19의 문제와 정답 몸체 면적이 각 목표에 도달한다", () => {
  const number = 19;
  const { rows, cols } = NUMBERBLOCKS[number];
  const metric = CHARACTER_VISUAL_METRICS[number];

  for (const scene of ["problem", "celebration"]) {
    const sceneScale = characterSceneScale({
      number,
      scene,
      rows,
      cols,
      metric,
      referenceArea: REFERENCE_VISUAL_AREA
    });
    const baseScale =
      characterNumberScale(number) * characterShapeScale(number, rows, cols);
    const displayedArea =
      metric.area *
      (baseScale ** 2) *
      characterShapeWidthScale(number, rows, cols) *
      (sceneScale ** 2);
    const targetArea =
      REFERENCE_VISUAL_AREA * characterSceneAreaTarget(number, scene);

    assert.ok(displayedArea >= targetArea - 1e-12, scene);
  }
});
