# 숫자블록 시각·음향 개선 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 3~5세 PC 사용자를 위해 1~10 캐릭터를 고품질 2D 스프라이트로 교체하고, 자연스러운 한국어·영국 영어 내장 음성과 정돈된 컬러 블록 UI를 적용한다.

**Architecture:** 920줄 단일 HTML의 순수 게임 규칙, 오디오 큐, DOM 렌더링을 작은 ES 모듈로 분리한다. 캐릭터 PNG와 TTS MP3는 제작 시 생성해 정적 자산으로 배포하며 플레이 중에는 네트워크를 사용하지 않는다. Node 내장 테스트 러너로 규칙, 오디오 큐, 자산 완전성을 검증한다.

**Tech Stack:** HTML5, CSS, ES modules, Web Audio API, Node.js 26 내장 `node:test`, Python 3.7+, `edge-tts==7.2.8`, built-in image generation

## Global Constraints

- 대상은 3~5세이며 주 입력은 PC 숫자키 `0`~`9`, 넘패드, `Escape`다.
- 실제 플레이 중 네트워크 호출을 하지 않는다.
- 세기·더하기·곱하기 모드와 현재 난이도 상승 기준을 유지한다.
- 원본 Numberblocks 이미지, 성우 음성, 사운드보드 클립을 저장소에 포함하지 않는다.
- 원작 성우를 복제하지 않고 독자적인 애니메이션 캐릭터 음성을 사용한다.
- 상시 배경음은 사용하지 않는다.
- 모션 감소 설정과 음소거 상태에서도 문제와 결과를 이해할 수 있어야 한다.
- 신규 설치 전 `edge-tts` 공식 저장소의 1,000 스타 기준은 확인 완료했다. 실행 시점 설치와 외부 TTS 호출은 HOTL 승인을 다시 받는다.

---

## File Map

- `index.html`: 홈, HUD, 게임 무대의 접근 가능한 정적 셸
- `styles.css`: 컬러 블록 스튜디오 테마, 화면 배치, 상태 애니메이션, 모션 감소
- `src/game-model.mjs`: 숫자 메타데이터, 문제 생성, 답 버퍼 판정
- `src/audio-manifest.mjs`: 논리적 음성 키와 MP3 경로 매핑
- `src/audio-manager.mjs`: 음성 큐, 효과음, 음소거, 취소
- `src/app.mjs`: DOM 렌더링, 키보드 이벤트, 게임 상태 전이
- `assets/characters/*.png`: 투명 배경 1~10 캐릭터 스프라이트
- `assets/audio/voice/{ko,en}/*.mp3`: 빌드 시 생성한 음성 팩
- `scripts/generate_voice_pack.py`: Edge Neural TTS 음성 팩 생성기
- `requirements-voice.txt`: 제작 전용 Python 의존성
- `tests/*.test.mjs`: 게임 규칙, 오디오 큐, 자산 완전성 테스트

---

### Task 1: 순수 게임 모델 추출

**Files:**
- Create: `package.json`
- Create: `src/game-model.mjs`
- Create: `tests/game-model.test.mjs`

**Interfaces:**
- Produces: `NUMBERBLOCKS`, `createProblem(mode, streak, rng)`, `applyDigit(buffer, digit, answer)`
- Consumes: 난수 함수 `rng(): number` (`0 <= n < 1`)

- [ ] **Step 1: 테스트 실행 명령을 고정한다**

```json
{
  "name": "numberblocks-minigame",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

- [ ] **Step 2: 문제 생성과 답 버퍼의 실패 테스트를 작성한다**

```js
// tests/game-model.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { NUMBERBLOCKS, createProblem, applyDigit } from "../src/game-model.mjs";

test("1~10 캐릭터 메타데이터가 모두 존재한다", () => {
  assert.deepEqual(Object.keys(NUMBERBLOCKS).map(Number), [1,2,3,4,5,6,7,8,9,10]);
});

test("세기 모드는 연속 정답 수에 따라 3, 5, 10까지 확장된다", () => {
  assert.equal(createProblem("count", { count: 0 }, () => 0.999).answer, 3);
  assert.equal(createProblem("count", { count: 3 }, () => 0.999).answer, 5);
  assert.equal(createProblem("count", { count: 6 }, () => 0.999).answer, 10);
});

test("더하기 문제의 합은 난이도 한도를 넘지 않는다", () => {
  const easy = createProblem("add", { add: 0 }, () => 0.999);
  const hard = createProblem("add", { add: 4 }, () => 0.999);
  assert.ok(easy.answer <= 5);
  assert.ok(hard.answer <= 10);
});

test("10을 입력할 때 첫 번째 1은 접두사로 유지된다", () => {
  assert.deepEqual(applyDigit("", "1", 10), { buffer: "1", status: "prefix" });
  assert.deepEqual(applyDigit("1", "0", 10), { buffer: "10", status: "correct" });
  assert.deepEqual(applyDigit("", "9", 10), { buffer: "", status: "wrong" });
});
```

- [ ] **Step 3: 테스트가 모듈 부재로 실패하는지 확인한다**

Run: `npm test`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/game-model.mjs`.

- [ ] **Step 4: 순수 게임 모델을 구현한다**

```js
// src/game-model.mjs
export const NUMBERBLOCKS = Object.freeze({
  1: { rows: 1, cols: 1, asset: "one.png" },
  2: { rows: 2, cols: 1, asset: "two.png" },
  3: { rows: 3, cols: 1, asset: "three.png" },
  4: { rows: 2, cols: 2, asset: "four.png" },
  5: { rows: 5, cols: 1, asset: "five.png" },
  6: { rows: 3, cols: 2, asset: "six.png" },
  7: { rows: 7, cols: 1, asset: "seven.png" },
  8: { rows: 4, cols: 2, asset: "eight.png" },
  9: { rows: 3, cols: 3, asset: "nine.png" },
  10: { rows: 5, cols: 2, asset: "ten.png" }
});

const MUL_EASY = [[2,2],[2,3],[3,2],[2,4]];
const MUL_ALL = [...MUL_EASY,[4,2],[2,5],[5,2],[3,3],[1,6],[1,8]];
const pick = (items, rng) => items[Math.min(items.length - 1, Math.floor(rng() * items.length))];
const int = (min, max, rng) => min + Math.min(max - min, Math.floor(rng() * (max - min + 1)));

export function createProblem(mode, streak, rng = Math.random) {
  if (mode === "count") {
    const max = streak.count >= 6 ? 10 : streak.count >= 3 ? 5 : 3;
    const answer = int(1, max, rng);
    return { mode, answer, characters: [answer], promptKey: "prompt-count" };
  }
  if (mode === "add") {
    const max = streak.add >= 4 ? 10 : 5;
    const a = int(1, max - 1, rng);
    const b = int(1, max - a, rng);
    return { mode, answer: a + b, characters: [a, b], operands: [a, b], promptKey: "prompt-add" };
  }
  if (mode === "mul") {
    const [a, b] = pick(streak.mul >= 4 ? MUL_ALL : MUL_EASY, rng);
    return { mode, answer: a * b, characters: [], operands: [a, b], promptKey: "prompt-mul" };
  }
  throw new TypeError(`Unknown mode: ${mode}`);
}

export function applyDigit(buffer, digit, answer) {
  const next = `${buffer}${digit}`;
  const target = String(answer);
  if (next === target) return { buffer: next, status: "correct" };
  if (target.startsWith(next)) return { buffer: next, status: "prefix" };
  return { buffer: "", status: "wrong" };
}
```

- [ ] **Step 5: 모델 테스트를 통과시킨다**

Run: `npm test`  
Expected: 4 tests PASS, 0 failures.

- [ ] **Step 6: 기존 인라인 메타데이터와 문제 생성 코드 제거를 준비한다**

`index.html:393-428`과 `index.html:725-765`의 로직은 Task 5에서 `src/game-model.mjs` 소비 코드로 교체한다. 이 단계에서는 중복 구현을 추가하지 않는다.

- [ ] **Step 7: 커밋한다**

```bash
git add package.json src/game-model.mjs tests/game-model.test.mjs
git commit -m "refactor: 숫자블록 게임 규칙 모듈화"
```

---

### Task 2: 1~10 캐릭터 스프라이트 제작과 자산 계약

**Files:**
- Create: `assets/characters/one.png`
- Create: `assets/characters/two.png`
- Create: `assets/characters/three.png`
- Create: `assets/characters/four.png`
- Create: `assets/characters/five.png`
- Create: `assets/characters/six.png`
- Create: `assets/characters/seven.png`
- Create: `assets/characters/eight.png`
- Create: `assets/characters/nine.png`
- Create: `assets/characters/ten.png`
- Create: `tests/character-assets.test.mjs`

**Interfaces:**
- Consumes: `NUMBERBLOCKS[n].asset`
- Produces: `assets/characters/one.png`부터 `assets/characters/ten.png`까지의 투명 RGBA PNG, 각 512×512 이상

- [ ] **Step 1: 캐릭터 자산 완전성의 실패 테스트를 작성한다**

```js
// tests/character-assets.test.mjs
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
```

- [ ] **Step 2: 자산 테스트가 첫 누락 파일에서 실패하는지 확인한다**

Run: `node --test tests/character-assets.test.mjs`  
Expected: FAIL with `ENOENT` for `assets/characters/one.png`.

- [ ] **Step 3: 공통 생성 프롬프트와 숫자별 불변 조건을 사용해 한 장씩 생성한다**

Built-in image generation을 캐릭터마다 별도 호출한다. 공통 프롬프트:

```text
Use case: stylized-concept
Asset type: transparent sprite for a preschool number-learning web game
Create one full-body original number-block character on a perfectly flat chroma-key background.
Polished 2D preschool television animation, clean vector-like shapes, subtle soft 2D shading.
Recognizable as the supplied number reference but do not copy source pixels or logos.
Keep the full character visible with generous padding.
No text, number label, watermark, scenery, cast shadow, floor, or extra objects.
Avoid glossy 3D plastic, thick outlines, stiff disconnected blocks, and generic emoji faces.
```

숫자별 불변 조건:

| 파일 | 몸체와 소품 | 키 배경 |
|---|---|---|
| `one.png` | 붉은 블록 1개, 큰 눈 1개, 짧은 팔다리 | `#ff00ff` |
| `two.png` | 주황 블록 2개 세로, 둥근 안경 | `#ff00ff` |
| `three.png` | 노란 블록 3개 세로, 붉은 3점 왕관과 버튼 2개 | `#ff00ff` |
| `four.png` | 초록 블록 2×2, 단단한 정사각 실루엣 | `#ff00ff` |
| `five.png` | 청록 블록 5개 세로, 별 모양 손 | `#ff00ff` |
| `six.png` | 보라 블록 3×2, 주사위 점과 속눈썹 | `#ff00ff` |
| `seven.png` | 무지개색 블록 7개 세로, 무지개 장식 | `#ff00ff` |
| `eight.png` | 자홍 블록 4×2, 안경과 문어 다리 8개 | `#00ff00` |
| `nine.png` | 회색 블록 3×3, 정사각 실루엣과 안경 | `#ff00ff` |
| `ten.png` | 흰 블록 5×2, 붉은 격자 테두리와 별 모양 손 | `#ff00ff` |

- [ ] **Step 4: 선택한 생성본을 프로젝트로 복사하고 키 배경을 제거한다**

각 image generation 호출이 반환한 경로의 선택본을 즉시 `tmp/imagegen/one-keyed.png`부터 `tmp/imagegen/ten-keyed.png`까지의 고정된 이름으로 복사한다. 그 다음 아래 명령을 실행한다.

```bash
mkdir -p assets/characters
for name in one two three four five six seven eight nine ten; do
  python "${CODEX_HOME:-$HOME/.codex}/skills/.system/imagegen/scripts/remove_chroma_key.py" \
    --input "tmp/imagegen/${name}-keyed.png" \
    --out "assets/characters/${name}.png" \
    --auto-key border \
    --soft-matte \
    --transparent-threshold 12 \
    --opaque-threshold 220 \
    --despill
done
```

가장자리 키 색이 남은 자산만 같은 명령에 `--edge-contract 1`을 추가해 한 번 재처리한다.

- [ ] **Step 5: 자산 테스트를 통과시킨다**

Run: `node --test tests/character-assets.test.mjs`  
Expected: 1 test PASS, 0 failures.

- [ ] **Step 6: 시각 검토 시트를 만든다**

브라우저에서 흰색·하늘색·짙은 남색 배경 위에 10개 PNG를 각각 표시한다. 다음 조건을 육안 확인한다.

- 블록 수와 배열이 숫자와 일치한다.
- 얼굴, 팔다리, 소품이 잘리지 않는다.
- 키 색 테두리가 보이지 않는다.
- 승인된 `three.png`와 같은 평면 2D 질감이다.

- [ ] **Step 7: 커밋한다**

```bash
git add assets/characters tests/character-assets.test.mjs
git commit -m "feat: 1부터 10까지 캐릭터 스프라이트 추가"
```

---

### Task 3: 한국어·영국 영어 음성 팩 생성

**Files:**
- Create: `requirements-voice.txt`
- Create: `scripts/generate_voice_pack.py`
- Create: `tests/voice-assets.test.mjs`
- Create: `assets/audio/voice/ko/*.mp3`
- Create: `assets/audio/voice/en/*.mp3`

**Interfaces:**
- Produces: 논리적 파일명 `prompt-*`, `number-*`, `cheer-*`, `retry-*`
- Uses: `edge_tts.Communicate(text, voice, rate, pitch)`

- [ ] **Step 1: 제작 도구 버전을 고정한다**

```text
edge-tts==7.2.8
```

- [ ] **Step 2: 음성 자산 완전성의 실패 테스트를 작성한다**

```js
// tests/voice-assets.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";

const ko = [
  "prompt-count","prompt-add","prompt-mul",
  ...Array.from({ length: 10 }, (_, i) => `number-${i + 1}`),
  "cheer-1","cheer-2","cheer-3","cheer-4",
  "retry-1","retry-2","retry-3"
];
const en = Array.from({ length: 10 }, (_, i) => `number-${i + 1}`);

test("필수 한국어·영어 MP3가 모두 비어 있지 않다", async () => {
  for (const [lang, names] of [["ko", ko], ["en", en]]) {
    for (const name of names) {
      const file = await stat(new URL(`../assets/audio/voice/${lang}/${name}.mp3`, import.meta.url));
      assert.ok(file.size > 1024, `${lang}/${name}.mp3`);
    }
  }
});
```

- [ ] **Step 3: 음성 테스트가 첫 누락 파일에서 실패하는지 확인한다**

Run: `node --test tests/voice-assets.test.mjs`  
Expected: FAIL with `ENOENT` for `prompt-count.mp3`.

- [ ] **Step 4: 설치와 외부 생성에 대한 HOTL 승인을 요청한다**

사용자에게 다음 한 줄을 제시한다.

```text
edge-tts 7.2.8을 격리된 가상환경에 설치하고 Microsoft 음성 서비스로 30개 MP3를 생성합니다. 저장소에는 결과 MP3와 생성 스크립트만 남고, 플레이 중 외부 통신은 없습니다. 진행할까요?
```

승인 후에만 다음 단계로 간다.

- [ ] **Step 5: 음성 팩 생성기를 구현한다**

```python
# scripts/generate_voice_pack.py
import asyncio
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1] / "assets" / "audio" / "voice"
KO_VOICE = "ko-KR-SunHiNeural"
EN_VOICE = "en-GB-SoniaNeural"

KO = {
    "prompt-count": "블록이 몇 개일까요?",
    "prompt-add": "두 친구가 합치면 몇이 될까요?",
    "prompt-mul": "블록판에는 모두 몇 개가 있을까요?",
    "number-1": "하나!", "number-2": "둘!", "number-3": "셋!",
    "number-4": "넷!", "number-5": "다섯!", "number-6": "여섯!",
    "number-7": "일곱!", "number-8": "여덟!", "number-9": "아홉!",
    "number-10": "열!",
    "cheer-1": "참 잘했어요!", "cheer-2": "대단해요!",
    "cheer-3": "정답이에요!", "cheer-4": "멋지게 해냈어요!",
    "retry-1": "괜찮아, 다시 해 봐요.",
    "retry-2": "천천히 생각해 볼까요?",
    "retry-3": "블록을 같이 세어 봐요."
}
EN = {
    "number-1": "One!", "number-2": "Two!", "number-3": "Three!",
    "number-4": "Four!", "number-5": "Five!", "number-6": "Six!",
    "number-7": "Seven!", "number-8": "Eight!", "number-9": "Nine!",
    "number-10": "Ten!"
}

async def render_pack(lang, lines, voice, rate, pitch):
    output = ROOT / lang
    output.mkdir(parents=True, exist_ok=True)
    for name, text in lines.items():
        target = output / f"{name}.mp3"
        communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
        await communicate.save(str(target))
        print(target.relative_to(ROOT.parent))

async def main():
    await render_pack("ko", KO, KO_VOICE, "+2%", "+8Hz")
    await render_pack("en", EN, EN_VOICE, "+4%", "+10Hz")

if __name__ == "__main__":
    asyncio.run(main())
```

- [ ] **Step 6: 격리 환경에서 음성 파일을 생성한다**

```bash
python3 -m venv .venv-voice
.venv-voice/bin/python -m pip install -r requirements-voice.txt
.venv-voice/bin/python scripts/generate_voice_pack.py
```

Expected: 30 relative MP3 paths printed, exit code 0.

- [ ] **Step 7: 음성 자산 테스트와 청음 검토를 수행한다**

Run: `node --test tests/voice-assets.test.mjs`  
Expected: 1 test PASS, 0 failures.

청음 기준:

- 한국어가 끊기거나 외국어 억양처럼 들리지 않는다.
- 영어는 영국식 발음이다.
- 문제 안내는 차분하고 숫자 답은 더 밝다.
- 오답 음성은 야단치는 느낌이 없다.

- [ ] **Step 8: 가상환경 제외 규칙과 음성 팩을 커밋한다**

`.gitignore`에 다음 줄을 추가한다.

```text
.venv-voice/
```

```bash
git add .gitignore requirements-voice.txt scripts/generate_voice_pack.py tests/voice-assets.test.mjs assets/audio/voice
git commit -m "feat: 한국어와 영국 영어 음성 팩 추가"
```

---

### Task 4: 오디오 큐와 새 효과음

**Files:**
- Create: `src/audio-manifest.mjs`
- Create: `src/audio-manager.mjs`
- Create: `tests/audio-manager.test.mjs`
- Modify: `index.html:430-557`

**Interfaces:**
- Produces: `AudioManager.playVoice(key)`, `playAnswer(number)`, `playSfx(name)`, `cancel()`, `toggleMuted()`
- Consumes: `VOICE`, injected `createAudio(src)`, injected `storage`

- [ ] **Step 1: 음성 매니페스트를 작성한다**

```js
// src/audio-manifest.mjs
const numbers = Object.fromEntries(
  Array.from({ length: 10 }, (_, index) => {
    const n = index + 1;
    return [`number-${n}`, {
      ko: `assets/audio/voice/ko/number-${n}.mp3`,
      en: `assets/audio/voice/en/number-${n}.mp3`
    }];
  })
);

export const VOICE = Object.freeze({
  "prompt-count": { ko: "assets/audio/voice/ko/prompt-count.mp3" },
  "prompt-add": { ko: "assets/audio/voice/ko/prompt-add.mp3" },
  "prompt-mul": { ko: "assets/audio/voice/ko/prompt-mul.mp3" },
  ...numbers,
  ...Object.fromEntries(Array.from({ length: 4 }, (_, i) => [
    `cheer-${i + 1}`, { ko: `assets/audio/voice/ko/cheer-${i + 1}.mp3` }
  ])),
  ...Object.fromEntries(Array.from({ length: 3 }, (_, i) => [
    `retry-${i + 1}`, { ko: `assets/audio/voice/ko/retry-${i + 1}.mp3` }
  ]))
});
```

- [ ] **Step 2: 취소·순서·음소거의 실패 테스트를 작성한다**

```js
// tests/audio-manager.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { AudioManager } from "../src/audio-manager.mjs";

function harness() {
  const played = [];
  const audios = [];
  const storage = new Map();
  const manager = new AudioManager({
    createAudio(src) {
      const audio = {
        src, volume: 1, pauseCalled: false, onended: null, onerror: null,
        play: async () => {
          played.push(src);
          queueMicrotask(() => audio.onended?.());
        },
        pause: () => { audio.pauseCalled = true; }
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

test("cancel은 현재 오디오를 멈추고 이전 큐를 무효화한다", async () => {
  const { manager, audios } = harness();
  const pending = manager.playVoice("prompt-count");
  manager.cancel();
  await pending;
  assert.equal(audios[0].pauseCalled, true);
});

test("음소거 상태를 저장하고 재생을 건너뛴다", async () => {
  const { manager, played, storage } = harness();
  assert.equal(manager.toggleMuted(), true);
  await manager.playAnswer(2);
  assert.deepEqual(played, []);
  assert.equal(storage.get("numberblocks-muted"), "true");
});

test("같은 음성 파일의 재생 오류는 한 번만 경고한다", async () => {
  const warnings = [];
  const manager = new AudioManager({
    createAudio(src) {
      const audio = {
        src, volume: 1, onended: null, onerror: null,
        play: async () => queueMicrotask(() => audio.onerror?.(new Error("missing"))),
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
```

- [ ] **Step 3: 테스트가 모듈 부재로 실패하는지 확인한다**

Run: `node --test tests/audio-manager.test.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/audio-manager.mjs`.

- [ ] **Step 4: 음성 큐를 구현한다**

```js
// src/audio-manager.mjs
import { VOICE } from "./audio-manifest.mjs";

const SFX = Object.freeze({
  key:   { notes: [659.25], duration: 0.07, gain: 0.035, wave: "sine" },
  pop:   { notes: [392.00, 523.25], duration: 0.12, gain: 0.06, wave: "triangle" },
  win:   { notes: [523.25, 659.25, 783.99, 1046.50], duration: 0.22, gain: 0.08, wave: "sine" },
  wrong: { notes: [440.00, 392.00], duration: 0.16, gain: 0.04, wave: "sine" }
});

export class AudioManager {
  constructor({
    createAudio = src => new Audio(src),
    storage = globalThis.localStorage,
    audioContextFactory = () => new (window.AudioContext || window.webkitAudioContext)(),
    logger = console
  } = {}) {
    this.createAudio = createAudio;
    this.storage = storage;
    this.audioContextFactory = audioContextFactory;
    this.logger = logger;
    this.context = null;
    this.muted = storage?.getItem("numberblocks-muted") === "true";
    this.epoch = 0;
    this.current = null;
    this.voicePlaying = false;
    this.warned = new Set();
  }

  warnOnce(src, error) {
    if (this.warned.has(src)) return;
    this.warned.add(src);
    this.logger.warn(`Audio skipped: ${src}`, error);
  }

  playFile(src, epoch = this.epoch) {
    if (this.muted || !src || epoch !== this.epoch) return Promise.resolve();
    return new Promise(resolve => {
      const audio = this.createAudio(src);
      let finished = false;
      const finish = () => {
        if (finished) return;
        finished = true;
        if (this.current?.audio === audio) this.current = null;
        this.voicePlaying = false;
        resolve();
      };
      this.current = { audio, finish };
      this.voicePlaying = true;
      audio.volume = 0.88;
      audio.onended = finish;
      audio.onerror = error => {
        this.warnOnce(src, error);
        finish();
      };
      Promise.resolve(audio.play()).catch(error => {
        this.warnOnce(src, error);
        finish();
      });
    });
  }

  async playVoice(key, language = "ko") {
    const epoch = this.epoch;
    await this.playFile(VOICE[key]?.[language], epoch);
  }

  async playAnswer(number) {
    const epoch = this.epoch;
    const entry = VOICE[`number-${number}`];
    await this.playFile(entry?.ko, epoch);
    await this.playFile(entry?.en, epoch);
  }

  cancel() {
    this.epoch += 1;
    this.current?.audio.pause();
    this.current?.finish();
    this.current = null;
  }

  playSfx(name) {
    const preset = SFX[name];
    if (this.muted || !preset) return;
    this.context ??= this.audioContextFactory();
    const now = this.context.currentTime;
    preset.notes.forEach((frequency, index) => {
      const start = now + index * 0.08;
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = preset.wave;
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(
        preset.gain * (this.voicePlaying ? 0.55 : 1),
        start + 0.005
      );
      gain.gain.exponentialRampToValueAtTime(0.0001, start + preset.duration);
      oscillator.connect(gain);
      gain.connect(this.context.destination);
      oscillator.start(start);
      oscillator.stop(start + preset.duration + 0.02);
    });
  }

  toggleMuted() {
    this.muted = !this.muted;
    if (this.muted) this.cancel();
    this.storage?.setItem("numberblocks-muted", String(this.muted));
    return this.muted;
  }
}
```

- [ ] **Step 5: 오디오 테스트를 통과시킨다**

Run: `node --test tests/audio-manager.test.mjs`  
Expected: 4 tests PASS, 0 failures.

- [ ] **Step 6: Web Audio 효과음을 오디오 관리자에 추가한다**

Step 4의 `AudioManager` 생성자에 주입된 `audioContextFactory`와 다음 효과음 계약을 사용한다.

```js
const SFX = Object.freeze({
  key:    { notes: [659.25], duration: 0.07, gain: 0.035, wave: "sine" },
  pop:    { notes: [392.00, 523.25], duration: 0.12, gain: 0.06, wave: "triangle" },
  win:    { notes: [523.25, 659.25, 783.99, 1046.50], duration: 0.22, gain: 0.08, wave: "sine" },
  wrong:  { notes: [440.00, 392.00], duration: 0.16, gain: 0.04, wave: "sine" }
});
```

Step 4의 `playSfx(name)` 구현은 `this.muted`면 즉시 반환하고, 각 음을 80ms 간격으로 예약하며 5ms attack과 짧은 exponential release를 사용한다. 음성 재생 중에는 gain을 0.55배로 낮춘다.

- [ ] **Step 7: 기존 `speechSynthesis`, `marimba`, `glide`, `sfx` 인라인 구현을 제거한다**

`index.html:430-557`을 삭제한다. 브라우저 기본 음성은 기본 경로와 오류 폴백 양쪽에서 사용하지 않는다. 파일 누락 시 자막과 효과음만 유지한다.

- [ ] **Step 8: 전체 테스트를 실행하고 커밋한다**

Run: `npm test`  
Expected: all current tests PASS, 0 failures.

```bash
git add src/audio-manifest.mjs src/audio-manager.mjs tests/audio-manager.test.mjs index.html
git commit -m "feat: 내장 음성 큐와 부드러운 효과음 추가"
```

---

### Task 5: 컬러 블록 스튜디오 UI와 앱 통합

**Files:**
- Modify: `index.html:1-920`
- Create: `styles.css`
- Create: `src/app.mjs`
- Create: `tests/app-contract.test.mjs`

**Interfaces:**
- Consumes: `createProblem`, `applyDigit`, `NUMBERBLOCKS`, `AudioManager`
- Produces: 홈·게임 화면, `data-state`, `data-mode`, 접근 가능한 음소거 버튼

- [ ] **Step 1: HTML 계약의 실패 테스트를 작성한다**

```js
// tests/app-contract.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

test("정적 셸이 스타일과 앱 모듈을 로드한다", () => {
  assert.match(html, /<link rel="stylesheet" href="styles\.css">/);
  assert.match(html, /<script type="module" src="src\/app\.mjs"><\/script>/);
});

test("홈, 게임, HUD, 음소거 컨트롤이 존재한다", () => {
  for (const id of ["home", "game", "stage", "answer-box", "mute-btn", "home-btn"]) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
});

test("모드 버튼은 키와 캐릭터 이미지를 제공한다", () => {
  assert.equal((html.match(/class="mode-card"/g) ?? []).length, 3);
  assert.match(html, /assets\/characters\/one\.png/);
  assert.match(html, /assets\/characters\/three\.png/);
  assert.match(html, /assets\/characters\/four\.png/);
});
```

- [ ] **Step 2: 기존 HTML이 계약을 만족하지 않아 실패하는지 확인한다**

Run: `node --test tests/app-contract.test.mjs`  
Expected: FAIL because `styles.css` and `src/app.mjs` are not linked.

- [ ] **Step 3: `index.html`을 접근 가능한 정적 셸로 교체한다**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#87dcff">
  <title>숫자블록 놀이터</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body data-state="home">
  <div class="world" aria-hidden="true">
    <div class="sun"></div><div class="cloud cloud-a"></div><div class="cloud cloud-b"></div>
    <div class="hill hill-back"></div><div class="hill hill-front"></div>
  </div>

  <header class="hud">
    <button id="home-btn" class="round-control" aria-label="처음으로">⌂</button>
    <div class="star-pill" aria-live="polite">★ <span id="star-count">0</span></div>
    <button id="mute-btn" class="round-control" aria-label="소리 끄기" aria-pressed="false">♪</button>
  </header>

  <main>
    <section id="home" class="screen active" aria-labelledby="home-title">
      <h1 id="home-title" class="logo">숫자<span>블록</span> <em>놀이터</em></h1>
      <p class="lead">숫자키 1, 2, 3 중 하나를 눌러요</p>
      <div class="mode-grid">
        <button class="mode-card" data-mode="count">
          <img src="assets/characters/one.png" alt="">
          <strong><kbd>1</kbd> 몇 개일까?</strong>
        </button>
        <button class="mode-card" data-mode="add">
          <img src="assets/characters/three.png" alt="">
          <strong><kbd>2</kbd> 더하기 합체</strong>
        </button>
        <button class="mode-card" data-mode="mul">
          <img src="assets/characters/four.png" alt="">
          <strong><kbd>3</kbd> 곱하기 블록</strong>
        </button>
      </div>
    </section>

    <section id="game" class="screen" aria-labelledby="problem-text">
      <p id="problem-text" class="problem-pill"></p>
      <div id="stage" class="stage" aria-live="polite"></div>
      <div class="answer-dock"><span>=</span><div id="answer-box" class="answer-box">?</div></div>
    </section>
  </main>

  <div id="hint-msg" class="toast" role="status"></div>
  <div id="big-cheer" class="cheer" aria-hidden="true"></div>
  <script type="module" src="src/app.mjs"></script>
</body>
</html>
```

- [ ] **Step 4: 컬러 블록 스튜디오 스타일을 구현한다**

`styles.css`에 다음 토큰과 필수 레이아웃을 포함한다.

```css
:root {
  --sky: #87dcff; --sky-soft: #dff6ff;
  --grass: #70ce62; --grass-deep: #4eaf4b;
  --ink: #25345d; --red: #ff4f59; --blue: #2675e6; --gold: #f5ac00;
  --paper: #fff; --shadow: rgba(37, 52, 93, .16);
  --radius-card: 28px; --radius-small: 16px;
}
* { box-sizing: border-box; }
html, body { width: 100%; height: 100%; margin: 0; overflow: hidden; }
body {
  color: var(--ink);
  font-family: "Arial Rounded MT Bold", "Apple SD Gothic Neo", sans-serif;
  background: linear-gradient(var(--sky), var(--sky-soft) 70%);
}
button { font: inherit; color: inherit; }
.world, .screen { position: fixed; inset: 0; }
.world { pointer-events: none; overflow: hidden; }
.sun { position:absolute; right:7vw; top:6vh; width:11vmin; aspect-ratio:1; border-radius:50%; background:#ffdd41; box-shadow:0 0 0 14px #ffec8b55,0 0 45px #fff0a8; }
.cloud { position:absolute; width:18vmin; height:6vmin; border-radius:999px; background:#ffffffd9; }
.cloud-a { left:8vw; top:16vh; } .cloud-b { right:18vw; top:29vh; transform:scale(.75); }
.hill { position:absolute; left:-8%; right:-8%; bottom:-20%; height:43%; border-radius:50% 50% 0 0/28% 28% 0 0; }
.hill-back { background:#82dc70; bottom:-12%; } .hill-front { background:var(--grass-deep); }
.screen { z-index:2; display:none; place-items:center; align-content:center; gap:3vmin; padding:8vmin 4vmin 5vmin; }
.screen.active { display:grid; }
.logo { margin:0; color:var(--red); font-size:clamp(48px,8vmin,92px); text-shadow:0 4px #fff,0 10px 22px #25345d22; }
.logo span { color:var(--blue); } .logo em { color:var(--gold); font-style:normal; }
.lead { margin:0; font-size:clamp(18px,2.6vmin,30px); font-weight:800; }
.mode-grid { display:grid; grid-template-columns:repeat(3,minmax(180px,260px)); gap:clamp(16px,3vmin,32px); }
.mode-card { min-height:250px; border:0; border-radius:var(--radius-card); background:var(--paper); box-shadow:0 10px 0 var(--shadow),0 20px 35px #25345d18; cursor:pointer; transition:transform .16s ease,box-shadow .16s ease; }
.mode-card:hover,.mode-card:focus-visible { transform:translateY(-7px); outline:5px solid #ffffff99; }
.mode-card:active { transform:translateY(3px); }
.mode-card img { width:110px; height:150px; object-fit:contain; display:block; margin:0 auto 8px; }
.mode-card strong { display:block; font-size:clamp(18px,2.1vmin,25px); }
kbd { display:inline-grid; place-items:center; width:34px; height:34px; border-radius:9px; color:#fff; background:var(--ink); box-shadow:inset 0 -4px #0003; }
.hud { position:fixed; z-index:9; top:18px; left:20px; right:20px; display:none; align-items:center; justify-content:space-between; pointer-events:none; }
body[data-state="playing"] .hud,body[data-state="celebrating"] .hud { display:flex; }
.round-control,.star-pill { min-width:48px; min-height:48px; border:0; border-radius:999px; background:#ffffffeb; box-shadow:0 5px 15px #25345d20; pointer-events:auto; }
.star-pill { display:grid; place-items:center; padding:0 18px; font-size:22px; font-weight:900; }
.problem-pill { align-self:start; margin:0; padding:12px 24px; border-radius:999px; background:#ffffffeb; font-size:clamp(20px,3vmin,34px); font-weight:900; box-shadow:0 5px 15px #25345d18; }
.stage { width:100%; min-height:52vh; display:flex; align-items:center; justify-content:center; gap:4vmin; }
.character { max-width:min(34vw,360px); max-height:50vh; object-fit:contain; filter:drop-shadow(0 12px 10px #25345d2b); }
.character.enter { animation:character-in .55s cubic-bezier(.2,.9,.2,1.25); }
.character.correct { animation:character-cheer .58s ease-in-out infinite alternate; }
.character.wrong { animation:character-no .18s ease-in-out 3; }
.operator { font-size:clamp(54px,8vmin,92px); font-weight:1000; }
.answer-dock { align-self:end; display:flex; align-items:center; gap:14px; padding:10px 12px 14px 20px; border-radius:22px; background:#ffffffeb; box-shadow:0 9px 0 var(--shadow); font-size:44px; font-weight:1000; }
.answer-box { display:grid; place-items:center; min-width:92px; height:76px; padding:0 20px; border:4px solid #ffb431; border-radius:16px; background:#fff; color:#ff762c; }
@keyframes character-in { from { opacity:0; transform:translateY(-8vh) scale(.72); } }
@keyframes character-cheer { to { transform:translateY(-2.5vmin) rotate(3deg); } }
@keyframes character-no { 50% { transform:translateX(1.2vmin); } }
@media (max-width:800px) {
  .mode-grid { grid-template-columns:repeat(3,minmax(140px,1fr)); }
  .mode-card { min-height:210px; }
  .stage { min-height:48vh; }
}
@media (prefers-reduced-motion:reduce) {
  *,*::before,*::after { animation-duration:.001ms !important; animation-iteration-count:1 !important; transition-duration:.001ms !important; }
}
```

- [ ] **Step 5: 앱 통합 모듈을 구현한다**

`src/app.mjs`는 다음 상태와 렌더링 계약을 사용한다.

```js
import { NUMBERBLOCKS, createProblem, applyDigit } from "./game-model.mjs";
import { AudioManager } from "./audio-manager.mjs";

const audio = new AudioManager();
const $ = id => document.getElementById(id);
const dom = {
  home: $("home"), game: $("game"), stage: $("stage"),
  problem: $("problem-text"), answer: $("answer-box"),
  stars: $("star-count"), mute: $("mute-btn"),
  homeButton: $("home-btn"), hint: $("hint-msg"), cheer: $("big-cheer")
};
const state = {
  phase: "home", mode: null, problem: null, buffer: "", stars: 0,
  streak: { count: 0, add: 0, mul: 0 }, wrongCount: 0, nextTimer: 0
};

function preloadCharacters() {
  Object.values(NUMBERBLOCKS).forEach(({ asset }) => {
    const image = new Image();
    image.src = `assets/characters/${asset}`;
  });
}

function character(number, className = "") {
  const image = document.createElement("img");
  image.className = `character enter ${className}`.trim();
  image.src = `assets/characters/${NUMBERBLOCKS[number].asset}`;
  image.alt = `숫자 ${number} 블록 캐릭터`;
  image.dataset.number = String(number);
  return image;
}

function setPhase(phase) {
  state.phase = phase;
  document.body.dataset.state = phase;
  dom.home.classList.toggle("active", phase === "home");
  dom.game.classList.toggle("active", phase !== "home");
}

function renderProblem(problem) {
  dom.stage.replaceChildren();
  dom.answer.textContent = "?";
  if (problem.mode === "count") {
    dom.problem.textContent = "블록이 몇 개일까요?";
    dom.stage.append(character(problem.answer));
  } else if (problem.mode === "add") {
    dom.problem.textContent = `${problem.operands[0]} 더하기 ${problem.operands[1]}는?`;
    dom.stage.append(character(problem.operands[0]));
    const plus = document.createElement("span");
    plus.className = "operator"; plus.textContent = "+";
    dom.stage.append(plus, character(problem.operands[1]));
  } else {
    dom.problem.textContent = `${problem.operands[0]} 곱하기 ${problem.operands[1]}는?`;
    const grid = document.createElement("div");
    grid.className = "multiplication-grid";
    grid.style.setProperty("--rows", problem.operands[0]);
    grid.style.setProperty("--cols", problem.operands[1]);
    for (let i = 0; i < problem.answer; i += 1) grid.append(document.createElement("i"));
    dom.stage.append(grid);
  }
}

function newProblem() {
  clearTimeout(state.nextTimer);
  audio.cancel();
  state.buffer = ""; state.wrongCount = 0;
  state.problem = createProblem(state.mode, state.streak);
  setPhase("playing");
  renderProblem(state.problem);
  audio.playVoice(state.problem.promptKey);
}

async function celebrate() {
  setPhase("celebrating");
  audio.cancel();
  state.stars += 1; state.streak[state.mode] += 1;
  dom.stars.textContent = String(state.stars);
  const cheers = ["참 잘했어요!", "대단해요!", "정답이에요!", "멋지게 해냈어요!"];
  dom.cheer.textContent = cheers[(state.stars - 1) % cheers.length];
  dom.cheer.classList.add("show");
  dom.stage.querySelectorAll(".character").forEach(node => node.classList.add("correct"));
  audio.playSfx("win");
  if (state.mode === "add") {
    await new Promise(resolve => setTimeout(resolve, 480));
    dom.stage.replaceChildren(character(state.problem.answer, "correct"));
  }
  await audio.playAnswer(state.problem.answer);
  if (state.phase === "celebrating") {
    state.nextTimer = setTimeout(() => {
      dom.cheer.classList.remove("show");
      newProblem();
    }, 1800);
  }
}

function wrongAnswer() {
  audio.cancel();
  state.wrongCount += 1;
  dom.answer.textContent = "?";
  dom.stage.querySelectorAll(".character").forEach(node => node.classList.add("wrong"));
  audio.playSfx("wrong");
  audio.playVoice(`retry-${Math.min(state.wrongCount, 3)}`);
}

function onDigit(digit) {
  if (state.phase !== "playing") return;
  audio.playSfx("key");
  const result = applyDigit(state.buffer, digit, state.problem.answer);
  state.buffer = result.buffer;
  dom.answer.textContent = result.buffer || "?";
  if (result.status === "correct") celebrate();
  if (result.status === "wrong") wrongAnswer();
}

function startMode(mode) {
  state.mode = mode;
  newProblem();
}

function goHome() {
  clearTimeout(state.nextTimer);
  audio.cancel();
  state.mode = null; state.problem = null; state.buffer = "";
  setPhase("home");
}

document.querySelectorAll(".mode-card").forEach(button => {
  button.addEventListener("click", () => startMode(button.dataset.mode));
});
dom.homeButton.addEventListener("click", goHome);
function syncMuteButton() {
  dom.mute.setAttribute("aria-pressed", String(audio.muted));
  dom.mute.setAttribute("aria-label", audio.muted ? "소리 켜기" : "소리 끄기");
  dom.mute.textContent = audio.muted ? "×" : "♪";
}
dom.mute.addEventListener("click", () => {
  audio.toggleMuted();
  syncMuteButton();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") return goHome();
  const digit = /^[0-9]$/.test(event.key) ? event.key : null;
  if (state.phase === "home") {
    if (digit === "1") startMode("count");
    if (digit === "2") startMode("add");
    if (digit === "3") startMode("mul");
  } else if (digit !== null) {
    onDigit(digit);
  }
});
syncMuteButton();
preloadCharacters();
```

- [ ] **Step 6: 곱셈 격자와 피드백 스타일을 완성한다**

`styles.css`에 다음을 추가한다.

```css
.multiplication-grid { display:grid; grid-template-columns:repeat(var(--cols),clamp(42px,6vmin,72px)); gap:6px; }
.multiplication-grid i { aspect-ratio:1; border-radius:13px; background:#6a72df; box-shadow:inset 0 -8px #0002,0 5px 10px #25345d24; }
.toast { position:fixed; z-index:10; left:50%; bottom:3vh; transform:translateX(-50%); padding:10px 22px; border-radius:999px; color:#fff; background:#25345ddd; opacity:0; }
.toast.show { opacity:1; }
.cheer { position:fixed; z-index:10; left:50%; top:17vh; transform:translateX(-50%) scale(.7); font-size:clamp(42px,8vmin,92px); color:var(--red); text-shadow:0 4px #fff; opacity:0; pointer-events:none; }
.cheer.show { opacity:1; transform:translateX(-50%) scale(1); transition:opacity .18s ease,transform .3s cubic-bezier(.2,.9,.2,1.3); }
```

- [ ] **Step 7: 계약 테스트와 전체 테스트를 통과시킨다**

Run: `npm test`  
Expected: all tests PASS, 0 failures.

- [ ] **Step 8: 1280×720과 1440×900에서 브라우저 검증한다**

각 뷰포트에서 다음 흐름을 실행한다.

1. 홈 모드 카드 3개 확인
2. 숫자키 `1`로 세기 시작
3. 정답 입력과 한국어 → 영어 음성 확인
4. 오답 입력과 재시도 확인
5. `Escape`로 홈 복귀
6. 숫자키 `2`, `3` 모드 각각 한 문제 확인
7. 음소거 후 화면 이동해 상태 유지 확인
8. 콘솔 오류 0건 확인

- [ ] **Step 9: 커밋한다**

```bash
git add index.html styles.css src/app.mjs tests/app-contract.test.mjs
git commit -m "feat: 컬러 블록 스튜디오 화면 적용"
```

---

### Task 6: 최종 회귀 검증과 문서 정리

**Files:**
- Modify: `docs/superpowers/specs/2026-07-20-numberblocks-audio-visual-redesign-design.md`

**Interfaces:**
- Consumes: Tasks 1~5의 완성 상태
- Produces: 검증 기록과 실제 구현 파일 구조가 일치하는 현재 상태 문서

- [ ] **Step 1: 전체 자동 테스트를 새로 실행한다**

Run: `npm test`  
Expected: 10개 이상의 테스트 PASS, 0 failures, warnings 0.

- [ ] **Step 2: 정적 파일 참조와 문법을 검증한다**

```bash
node --check src/game-model.mjs
node --check src/audio-manager.mjs
node --check src/audio-manifest.mjs
node --check src/app.mjs
git diff --check
```

Expected: 모든 명령 exit code 0, 출력 오류 없음.

- [ ] **Step 3: 브라우저 최종 회귀 검증을 실행한다**

다음 결과를 캡처한다.

- 홈 화면 데스크톱 스크린샷
- 세기 모드 캐릭터 1개 스크린샷
- 더하기 합체 전 화면
- 곱셈 격자 화면
- 콘솔 오류 목록 0건

- [ ] **Step 4: 설계 문서의 파일 구조를 실제 구현과 맞춘다**

설계 문서 `## 5. 구성 요소`의 파일 트리에 `styles.css`, `src/` 모듈, 실제 생성된 테스트 파일을 반영한다. 결정과 목표 문장은 변경하지 않는다.

- [ ] **Step 5: 최종 변경 범위를 확인한다**

Run: `git status --short`  
Expected: Task 6 문서 변경만 표시된다.

- [ ] **Step 6: 최종 문서 커밋을 만든다**

```bash
git add docs/superpowers/specs/2026-07-20-numberblocks-audio-visual-redesign-design.md
git commit -m "docs: 숫자블록 개선 구현 상태 반영"
```

- [ ] **Step 7: 작업 완료 검증을 다시 실행한다**

Run: `npm test && git status --short`  
Expected: tests all PASS, worktree clean.
