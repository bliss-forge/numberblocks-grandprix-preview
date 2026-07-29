# 안전한 길찾기 리뉴얼 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 안전한 길찾기 미니게임의 시각 전면 리뉴얼(건물·학교 랜드마크·도로·신호등·차·라이더·공사장·맨홀) + 미니맵·카메라 투어·횡단 자동 안전 연출 추가. 게임 규칙은 유지.

**Architecture:** 접근 A(비주얼 레이어). 32×16 그리드·보행망 좌표·이동 규칙은 그대로 두고, 이동 불가인 잔디 칸에 건물 풋프린트를 데이터로 추가한다. 렌더링은 기존 DOM+CSS 패턴을 따르되 차/라이더/포크레인은 인라인 SVG 문자열(`innerHTML`)로 그린다. 모델에는 횡단 연출 상태(`ceremony`)와 투어 플래그(`tourActive`)만 추가한다.

**Tech Stack:** Vanilla ES modules, DOM+CSS Grid, inline SVG, node:test. 새 의존성 금지.

**Spec:** `docs/superpowers/specs/2026-07-29-safety-route-renewal-design.md`

## Global Constraints

- 32×16 그리드, 구역 `left {x:0,w:14} | road {x:14,w:4} | right {x:18,w:14}` 불변
- 친구 2→10 순서 수집, 2~5 수집 전 횡단 금지, 신호 주기 5000/1000/7000/1000ms, 초록불 종료 2000ms 전 신규 횡단 금지 — 모델 규칙 변경 금지
- 감점·게임오버·충돌 애니메이션 없음. 이동체는 플레이어 칸 진입 금지(기존 로직 유지)
- 홈 화면·다른 모드·캐릭터 PNG(`assets/characters/`) 변경 금지
- 새 npm 의존성 추가 금지. 모든 그림은 CSS 또는 인라인 SVG
- 작업 브랜치: `claude/safety-route-renewal` (이미 체크아웃됨). 태스크마다 커밋
- 매 태스크 종료 시 `npm test` 실패 0개
- 커밋 메시지 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- `prefers-reduced-motion`에서 장식 애니메이션(바퀴 회전·흔들림·깜빡임) 비활성화
- 한국어 문구는 스펙에 적힌 그대로 사용 (임의 변경 금지)

## 파일 구조

| 파일 | 역할 |
| --- | --- |
| `src/safety-route-layout.mjs` | 지도 데이터: 건물 풋프린트·소품·친구/순찰 후보 재정의·골인 칸 이동·검증 확장 |
| `src/safety-route-model.mjs` | `ceremony`/`tourActive` 상태 추가 (이동 규칙 무변경) |
| `src/safety-route-art.mjs` | **신규** — 차/자전거/킥보드/포크레인 SVG 문자열 빌더 |
| `src/safety-route-minimap.mjs` | **신규** — 미니맵 렌더/업데이트 |
| `src/safety-route-camera.mjs` | `tourCameraPath` 추가 |
| `src/safety-route-scene.mjs` | 건물·소품·학교·도착매트·신호등 램프·SVG 오브젝트·미니맵 장착·연출 자세 |
| `src/app.mjs` | 투어 시퀀스, 연출 음성, 틱 게이트 |
| `src/audio-manifest.mjs` | `safety-look-both`, `safety-tour` 키 추가 |
| `scripts/generate_voice_pack.py` | 새 음성 2줄 추가 (실행은 사용자 승인 후) |
| `styles.css` | safety 구간 시각 전면 교체 |
| `tests/safety-route-*.test.mjs` | 계약 갱신 + 신규 테스트 |

---

### Task 1: 레이아웃 — 건물 풋프린트·소품·골인 칸·후보 재정의

**Files:**
- Modify: `src/safety-route-layout.mjs` (FRIEND_CANDIDATES 26-36행, PATROL_CANDIDATES 77-90행, assembleCandidate 253-363행, validateCandidateLayout 427-794행)
- Test: `tests/safety-route-layout.test.mjs`

**Interfaces:**
- Consumes: 기존 `assembleCandidate` 구조
- Produces: `map.places[]` 항목에 `width`, `height`, `door {x,y}` 추가 (기존 `id/type/x/y/label` 유지, x/y는 풋프린트 좌상단). `map.props[]` 신규: `{ id, type: "tree"|"flowers"|"bench", x, y }`. `map.goal`이 `{x:28,y:11}`로 이동. 후속 태스크는 이 필드명을 그대로 사용.

- [ ] **Step 1: 실패하는 테스트 작성** — `tests/safety-route-layout.test.mjs`에 추가:

```js
test("건물은 풋프린트와 문을 가지고 잔디 위에만 있다", () => {
  const map = createSafetyRouteMap("steady", { seed: 7 });
  const walkable = new Set(map.pedestrianCells.map(p => `${p.x},${p.y}`));
  assert.equal(map.places.length, 8);
  map.places.forEach(place => {
    assert.ok(place.width >= 1 && place.height >= 1, place.id);
    assert.ok(place.door, place.id);
    for (let dx = 0; dx < place.width; dx += 1) {
      for (let dy = 0; dy < place.height; dy += 1) {
        assert.ok(!walkable.has(`${place.x + dx},${place.y + dy}`),
          `${place.id} footprint on walkway`);
      }
    }
    assert.ok(walkable.has(`${place.door.x},${place.door.y}`),
      `${place.id} door must face a walkway`);
  });
  const school = map.places.find(place => place.type === "school");
  assert.equal(school.width, 3);
  assert.equal(school.height, 3);
  assert.deepEqual(map.goal, { x: 28, y: 11 });
  assert.ok(map.props.length >= 8);
  map.props.forEach(prop => {
    assert.ok(["tree", "flowers", "bench"].includes(prop.type));
    assert.ok(!walkable.has(`${prop.x},${prop.y}`), `prop on walkway: ${prop.id}`);
  });
});

test("리뉴얼 배치가 모든 난이도·시드에서 검증을 통과한다", () => {
  ["easy", "steady", "challenge"].forEach(difficulty => {
    for (let seed = 0; seed < 30; seed += 1) {
      const map = createSafetyRouteMap(difficulty, { seed });
      const result = validateCandidateLayout(map);
      assert.deepEqual(result.errors, [], `${difficulty}/${seed}`);
    }
  });
});
```

- [ ] **Step 2: 실행해 실패 확인** — `npm test -- --test-name-pattern 건물` → FAIL (`place.width` undefined)

- [ ] **Step 3: 구현** — `assembleCandidate`의 `places`를 아래로 교체하고 `props`·새 goal 반영:

```js
const start = { x: 0, y: 3 };
const goal = { x: 28, y: 11 }; // 학교 정문 앞 (기존 {x:31,y:10}에서 이동)
// ...
const places = [
  { id: "left-home", type: "home", x: 0, y: 1, width: 2, height: 2,
    door: { x: 1, y: 3 }, label: "우리 집" },
  { id: "left-daycare", type: "daycare", x: 5, y: 1, width: 2, height: 2,
    door: { x: 5, y: 3 }, label: "어린이집" },
  { id: "left-shops", type: "shops", x: 7, y: 1, width: 3, height: 2,
    door: { x: 8, y: 3 }, label: "상가" },
  { id: "left-park", type: "park", x: 11, y: 12, width: 2, height: 2,
    door: { x: 11, y: 11 }, label: "공원" },
  { id: "right-library", type: "library", x: 19, y: 1, width: 2, height: 2,
    door: { x: 19, y: 3 }, label: "도서관" },
  { id: "right-bus-stop", type: "bus-stop", x: 22, y: 12, width: 2, height: 1,
    door: { x: 22, y: 11 }, label: "버스 정류장" },
  { id: "right-shop", type: "shop", x: 25, y: 1, width: 2, height: 2,
    door: { x: 25, y: 3 }, label: "가게" },
  { id: "right-school", type: "school", x: 27, y: 12, width: 3, height: 3,
    door: { x: 28, y: 12 }, label: "학교" }
];
const props = [
  { id: "prop-1", type: "tree", x: 3, y: 0 },
  { id: "prop-2", type: "flowers", x: 12, y: 1 },
  { id: "prop-3", type: "tree", x: 1, y: 13 },
  { id: "prop-4", type: "bench", x: 5, y: 12 },
  { id: "prop-5", type: "tree", x: 22, y: 0 },
  { id: "prop-6", type: "flowers", x: 30, y: 1 },
  { id: "prop-7", type: "bench", x: 19, y: 13 },
  { id: "prop-8", type: "tree", x: 31, y: 13 }
];
```

건물 문(`door`)은 걷는 칸(보행길 y=3 또는 y=11)이고 풋프린트는 잔디 행(0-2, 12-15)에만 있다. 반환 객체에 `props` 포함. 친구·순찰 후보를 문 앞 칸 중심으로 교체:

```js
const FRIEND_CANDIDATES = Object.freeze({
  2: Object.freeze([{ x: 5, y: 3 }, { x: 6, y: 3 }]),      // 어린이집 앞
  3: Object.freeze([{ x: 7, y: 3 }, { x: 9, y: 3 }]),      // 상가 앞
  4: Object.freeze([{ x: 4, y: 10 }, { x: 9, y: 10 }]),    // 길가 (유지)
  5: Object.freeze([{ x: 11, y: 11 }, { x: 12, y: 11 }]),  // 공원 앞
  6: Object.freeze([{ x: 22, y: 11 }, { x: 23, y: 11 }]),  // 정류장 앞
  7: Object.freeze([{ x: 19, y: 3 }, { x: 20, y: 3 }]),    // 도서관 앞
  8: Object.freeze([{ x: 22, y: 10 }, { x: 27, y: 10 }]),  // (유지)
  9: Object.freeze([{ x: 19, y: 11 }, { x: 26, y: 11 }]),  // 횡단보도 근처
  10: Object.freeze([{ x: 27, y: 11 }, { x: 29, y: 11 }])  // 학교 앞
});

const PATROL_CANDIDATES = Object.freeze({
  scooter: Object.freeze([
    { x: 2, y: 4, points: [{ x: 1, y: 4 }, { x: 2, y: 4 }, { x: 3, y: 4 }] },
    { x: 12, y: 10, points: [{ x: 11, y: 10 }, { x: 12, y: 10 }, { x: 13, y: 10 }] },
    { x: 29, y: 3, points: [{ x: 28, y: 3 }, { x: 29, y: 3 }, { x: 30, y: 3 }] },
    { x: 19, y: 10, points: [{ x: 18, y: 10 }, { x: 19, y: 10 }, { x: 20, y: 10 }] }
  ]),
  bicycle: Object.freeze([
    { x: 5, y: 4, points: [{ x: 4, y: 4 }, { x: 5, y: 4 }, { x: 6, y: 4 }] },
    { x: 10, y: 11, points: [{ x: 9, y: 11 }, { x: 10, y: 11 }, { x: 11, y: 11 }] },
    { x: 24, y: 4, points: [{ x: 23, y: 4 }, { x: 24, y: 4 }, { x: 25, y: 4 }] },
    { x: 19, y: 11, points: [{ x: 18, y: 11 }, { x: 19, y: 11 }, { x: 20, y: 11 }] }
  ])
});
```

`validateCandidateLayout`에 추가 검증(기존 `places` 검사 블록 확장):

```js
// 건물 풋프린트: 잔디 전용 + 문은 보행 칸
places.forEach(place => {
  if (!Number.isInteger(place.width) || !Number.isInteger(place.height) ||
    place.width < 1 || place.height < 1 || !place.door ||
    !walkable.has(pointKey(place.door))) {
    errors.push(`place footprint/door invalid: ${place.id}`);
    return;
  }
  rectangleCells(place.x, place.y, place.width, place.height).forEach(cell => {
    if (!inBounds(cell)) errors.push(`place out of bounds: ${place.id}`);
    if (walkable.has(pointKey(cell))) {
      errors.push(`place overlaps walkway: ${place.id}`);
    }
  });
});
// 소품: 잔디 전용 + 건물과 비겹침
const buildingCells = new Set(places.flatMap(place =>
  rectangleCells(place.x, place.y, place.width ?? 1, place.height ?? 1)
).map(pointKey));
(map.props ?? []).forEach(prop => {
  if (!inBounds(prop) || walkable.has(pointKey(prop)) ||
    buildingCells.has(pointKey(prop))) {
    errors.push(`prop misplaced: ${prop.id ?? pointKey(prop)}`);
  }
});
```

주의: 기존 테스트 중 goal `{x:31,y:10}`·구 friend 좌표를 고정하는 단언이 있으면 새 값으로 갱신한다(계약 변경이 이 태스크의 목적). `validateSafetyRouteMap`(model 쪽)은 좌표 무관이라 수정 불필요.

- [ ] **Step 4: 전체 테스트 통과 확인** — `npm test` → 실패 0. 실패하는 기존 단언은 새 데이터 기준으로 수정
- [ ] **Step 5: 커밋** — `git add -A && git commit -m "feat: add building footprints and new goal to safety layout"`

---

### Task 2: 모델 — 횡단 연출 상태와 투어 플래그

**Files:**
- Modify: `src/safety-route-model.mjs` (createSafetyRouteState 54-70행, attemptSafetyMove 82-184행, advanceSafetyWorld 250-267행)
- Test: `tests/safety-route-model.test.mjs`

**Interfaces:**
- Produces: `state.ceremony` = `null | { stage: "stopping"|"looking"|"crossing", elapsedMs: number }`, `state.tourActive: boolean`. `createSafetyRouteState(difficulty, { seed, tourActive })`. 이벤트 `{ type: "crossing-started" }` (횡단보도 첫 진입 이동 성공 시 `moved` 대신 발생). 연출 단계 시간: stopping 0~600ms → looking 600~1400ms → crossing (횡단보도 위에 있는 동안).

- [ ] **Step 1: 실패 테스트 작성** — `tests/safety-route-model.test.mjs`에 추가:

```js
test("초록불 횡단 진입은 crossing-started 이벤트와 연출 상태를 만든다", () => {
  const base = createSafetyRouteState("easy", { seed: 1 });
  const crossingCell = base.map.crossings[0].cells
    .find(cell => cell.x === base.map.zones.road.x);
  const state = {
    ...base,
    nextFriend: 6,
    position: { x: crossingCell.x - 1, y: crossingCell.y },
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  };
  const result = attemptSafetyMove(state, "right");
  assert.equal(result.event.type, "crossing-started");
  assert.deepEqual(result.state.ceremony, { stage: "stopping", elapsedMs: 0 });
});

test("연출 stopping/looking 동안 이동 입력은 무시된다", () => {
  const base = createSafetyRouteState("easy", { seed: 1 });
  const state = { ...base, ceremony: { stage: "stopping", elapsedMs: 100 } };
  const result = attemptSafetyMove(state, "right");
  assert.equal(result.event.type, "ignored");
  assert.deepEqual(result.state.position, state.position);
});

test("연출은 시간에 따라 stopping→looking→crossing으로 진행된다", () => {
  const base = createSafetyRouteState("easy", { seed: 1 });
  let state = { ...base, ceremony: { stage: "stopping", elapsedMs: 0 } };
  state = advanceSafetyWorld(state, 600);
  assert.equal(state.ceremony.stage, "looking");
  state = advanceSafetyWorld(state, 800);
  assert.equal(state.ceremony.stage, "crossing");
});

test("횡단보도를 벗어나면 연출이 해제된다", () => {
  const base = createSafetyRouteState("easy", { seed: 1 });
  const crossing = base.map.crossings[0];
  const lastCell = crossing.cells.reduce((a, b) => (b.x > a.x ? b : a));
  const state = {
    ...base,
    nextFriend: 6,
    position: { x: lastCell.x, y: lastCell.y },
    crossingId: crossing.id,
    ceremony: { stage: "crossing", elapsedMs: 0 },
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  };
  const result = attemptSafetyMove(state, "right");
  assert.equal(result.state.ceremony, null);
});

test("tourActive 동안 이동은 무시된다", () => {
  const state = { ...createSafetyRouteState("easy", { seed: 1 }), tourActive: true };
  const result = attemptSafetyMove(state, "right");
  assert.equal(result.event.type, "ignored");
});
```

- [ ] **Step 2: 실행해 실패 확인** — `npm test -- --test-name-pattern 연출` → FAIL
- [ ] **Step 3: 구현**

`createSafetyRouteState` 반환에 `ceremony: null, tourActive: Boolean(options.tourActive)` 추가. `attemptSafetyMove` 최상단에:

```js
if (state.tourActive) return { state, event: { type: "ignored" } };
if (state.ceremony && state.ceremony.stage !== "crossing") {
  return { state, event: { type: "ignored" } };
}
```

횡단 첫 진입(기존 `crossing && !state.crossingId` 통과 후 이동 성립 지점)에서 `moveExtra`에 `ceremony: { stage: "stopping", elapsedMs: 0 }`를 넣고 이벤트를 `{ type: "crossing-started" }`로 반환. 횡단보도가 아닌 칸으로 이동하면 `moveExtra.ceremony = null`. `advanceSafetyWorld` 마지막에:

```js
let ceremony = state.ceremony;
if (ceremony && ceremony.stage !== "crossing") {
  const elapsedTotal = ceremony.elapsedMs + elapsed;
  ceremony = elapsedTotal >= 1400
    ? { stage: "crossing", elapsedMs: elapsedTotal }
    : elapsedTotal >= 600
      ? { stage: "looking", elapsedMs: elapsedTotal }
      : { stage: ceremony.stage, elapsedMs: elapsedTotal };
}
return { ...state, tick, signal, movers, ceremony };
```

- [ ] **Step 4: 전체 테스트 통과 확인** — `npm test` → 0 실패 (컨트롤러 큐 테스트가 `crossing-started`를 몰라 실패하면 Task 7에서 다루므로 여기서는 `safetyCueForEvent`가 null 반환하는지만 확인)
- [ ] **Step 5: 커밋** — `git commit -am "feat: add crossing ceremony and tour state to safety model"`

---

### Task 3: SVG 아트 모듈

**Files:**
- Create: `src/safety-route-art.mjs`
- Test: `tests/safety-route-art.test.mjs`

**Interfaces:**
- Produces: `carSvg()`, `bicycleSvg()`, `scooterSvg()`, `excavatorSvg()` — 각각 `<svg …>…</svg>` 문자열 반환. 바퀴 그룹에 `class="route-wheel"`, 전체 루트에 `class="route-art route-art-<type>"`, `aria-hidden="true"`. 후속 태스크는 이 함수명·클래스명을 그대로 사용.

- [ ] **Step 1: 실패 테스트 작성** — `tests/safety-route-art.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import {
  carSvg, bicycleSvg, scooterSvg, excavatorSvg
} from "../src/safety-route-art.mjs";

test("모든 아트는 aria-hidden 처리된 svg 문자열이다", () => {
  [["car", carSvg], ["bicycle", bicycleSvg],
   ["scooter", scooterSvg], ["excavator", excavatorSvg]]
    .forEach(([name, build]) => {
      const svg = build();
      assert.match(svg, /^<svg /, name);
      assert.match(svg, /aria-hidden="true"/, name);
      assert.match(svg, new RegExp(`route-art-${name}`), name);
    });
});

test("자전거와 킥보드는 스포크 바퀴와 라이더를 가진다", () => {
  [bicycleSvg(), scooterSvg()].forEach(svg => {
    assert.match(svg, /route-wheel/);
    assert.match(svg, /route-rider-helmet/);
  });
});

test("자동차는 지붕·앞유리·헤드라이트가 있다", () => {
  const svg = carSvg();
  ["route-car-roof", "route-car-glass", "route-car-light"].forEach(cls =>
    assert.match(svg, new RegExp(cls)));
});
```

- [ ] **Step 2: 실행해 실패 확인** — FAIL (module not found)
- [ ] **Step 3: 구현** — 브레인스토밍 목업(`.superpowers/brainstorm/94604-1785296672/content/riders-v2.html`, `road-vehicles-v2.html`)의 SVG 지오메트리를 이식한다. 형태:

```js
const wrap = (type, viewBox, body) =>
  `<svg class="route-art route-art-${type}" viewBox="${viewBox}" ` +
  `aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;

export function bicycleSvg() {
  return wrap("bicycle", "0 0 260 195", [
    wheel(55, 148, 38), wheel(205, 148, 38),
    `<g stroke="#e8564a" stroke-width="10" stroke-linecap="round" fill="none">`,
    `<line x1="196" y1="92" x2="122" y2="148"/>`,
    `<line x1="122" y1="148" x2="97" y2="88"/>`,
    `<line x1="100" y1="92" x2="193" y2="92"/>`,
    `<line x1="122" y1="148" x2="55" y2="148"/>`,
    `<line x1="55" y1="148" x2="97" y2="88"/>`,
    `<line x1="196" y1="88" x2="205" y2="148"/></g>`,
    `<circle cx="122" cy="148" r="15" fill="#d7dde3"/>`,
    `<rect x="124" y="164" width="24" height="8" rx="4" fill="#3d4f63"/>`,
    `<rect x="66" y="58" width="50" height="16" rx="8" fill="#8a5a3b"/>`,
    `<rect x="176" y="42" width="42" height="15" rx="7" fill="#8a5a3b" transform="rotate(-12 197 49)"/>`,
    rider({ torso: "M95 62 Q118 26 148 30", torsoColor: "#7fd08a",
      arm: [146, 34, 192, 52], thigh: [95, 64, 116, 112],
      shin: [116, 112, 132, 164], head: [158, 18], helmet: "#ef6aa0" })
  ].join(""));
}
```

`wheel(cx, cy, r)`는 타이어(`stroke #3d4f63`)+스포크 4선(`route-wheel` 그룹)+허브, `rider(...)`는 몸통 path·팔·다리 line·머리 circle·헬멧 path(`route-rider-helmet`)를 만드는 내부 헬퍼. `scooterSvg`는 목업의 데크/스템/핸들바/서서 타는 아이, `carSvg`는 3/4 뷰(차체 rounded rect + `route-car-glass` + `route-car-roof` + `route-car-light` 2개 + 바퀴 4개), `excavatorSvg`는 트랙/캡/창/암/버킷. 정확한 좌표는 목업 HTML에서 복사한다.

- [ ] **Step 4: 통과 확인** — `npm test -- --test-name-pattern 아트`
- [ ] **Step 5: 커밋** — `git add -A && git commit -m "feat: add flat vector svg art module"`

---

### Task 4: 씬 — 건물·소품·학교·도착 매트 렌더링

**Files:**
- Modify: `src/safety-route-scene.mjs` (places 렌더 220-226행, school-goal 326-330행)
- Modify: `styles.css` (safety 구간)
- Test: `tests/safety-route-scene.test.mjs`

**Interfaces:**
- Consumes: Task 1의 `place.width/height/door`, `map.props`
- Produces: DOM 계약 — `.route-building.route-building-<type>` (내부 `.route-building-roof`, `.route-building-sign`(간판 텍스트), `.route-building-door`, 창문 `.route-building-window`×2), `.route-prop.route-prop-<type>`, `.route-goal-mat`(텍스트 `⭐ 도착`), 학교 전용 `.route-building-school-clock`·`.route-building-school-flag`. 기존 `.route-place`·`.route-school-goal` DOM은 제거.

- [ ] **Step 1: 실패 테스트 작성** — `tests/safety-route-scene.test.mjs`의 기존 `route-place` 단언을 교체:

```js
test("건물은 풋프린트 블록으로 그려지고 학교는 랜드마크다", () => {
  const state = createSafetyRouteState("easy", { seed: 3 });
  const scene = renderSafetyRouteScene(document, state);
  const buildings = byClass(scene, "route-building");
  assert.equal(buildings.length, state.map.places.length);
  buildings.forEach(node => {
    assert.ok(byClass(node, "route-building-roof").length === 1);
    assert.ok(byClass(node, "route-building-door").length === 1);
    assert.ok(byClass(node, "route-building-sign")[0].textContent.length > 0);
  });
  const school = byClass(scene, "route-building-school")[0];
  assert.equal(school.style.values.get("--route-width"), "3");
  assert.equal(school.style.values.get("--route-height"), "3");
  assert.equal(byClass(school, "route-building-school-clock").length, 1);
  const mat = byClass(scene, "route-goal-mat")[0];
  assert.equal(mat.textContent, "⭐ 도착");
  assert.equal(mat.style.values.get("--route-x"), String(state.map.goal.x + 1));
  assert.equal(byClass(scene, "route-place").length, 0);
  assert.equal(byClass(scene, "route-school-goal").length, 0);
  assert.equal(
    byClass(scene, "route-prop").length,
    state.map.props.length
  );
});
```

- [ ] **Step 2: 실행해 실패 확인** — FAIL
- [ ] **Step 3: 구현** — scene의 places 블록 교체:

```js
state.map.places.forEach(place => {
  const node = document.createElement("div");
  node.className = `route-building route-building-${place.type}`;
  node.style.setProperty("--route-x", place.x + 1);
  node.style.setProperty("--route-y", place.y + 1);
  node.style.setProperty("--route-width", place.width);
  node.style.setProperty("--route-height", place.height);
  node.setAttribute("role", "img");
  node.setAttribute("aria-label", place.label);

  const roof = document.createElement("div");
  roof.className = "route-building-roof";
  roof.setAttribute("aria-hidden", "true");
  const sign = document.createElement("div");
  sign.className = "route-building-sign";
  sign.textContent = place.label;
  const door = document.createElement("div");
  door.className = "route-building-door";
  door.setAttribute("aria-hidden", "true");
  node.append(roof, sign, door);
  for (let index = 0; index < 2; index += 1) {
    const win = document.createElement("div");
    win.className = "route-building-window";
    win.setAttribute("aria-hidden", "true");
    node.append(win);
  }
  if (place.type === "school") {
    const clock = document.createElement("div");
    clock.className = "route-building-school-clock";
    clock.setAttribute("aria-hidden", "true");
    const flag = document.createElement("div");
    flag.className = "route-building-school-flag";
    flag.setAttribute("aria-hidden", "true");
    node.append(clock, flag);
  }
  world.append(node);
});
(state.map.props ?? []).forEach(prop => {
  const node = routeCell(document, prop, `route-prop route-prop-${prop.type}`);
  world.append(node);
});
```

`route-school-goal` 블록을 도착 매트로 교체:

```js
const goalMat = document.createElement("div");
goalMat.className = "route-goal-mat";
goalMat.textContent = "⭐ 도착";
goalMat.setAttribute("aria-label", "학교 도착점");
world.append(placeAt(goalMat, state.map.goal));
```

`styles.css`: `.route-place*` 규칙 삭제, 신규 추가(핵심 골격 — 파스텔 + 흰 외곽선, 그리드 스팬은 `.route-zone`과 같은 방식):

```css
.route-building {
  grid-column: var(--route-x) / span var(--route-width);
  grid-row: var(--route-y) / span var(--route-height);
  position: relative; z-index: 3;
  display: flex; flex-direction: column;
  filter: drop-shadow(0 3px 0 rgba(60, 90, 40, .25));
}
.route-building-roof {
  height: 32%; border-radius: 12px 12px 0 0; background: var(--roof, #f26d6d);
  border: 3px solid #fff; border-bottom: none;
}
.route-building > .route-building-door {
  position: absolute; bottom: 0; left: 50%; transform: translateX(-50%);
  width: 26%; height: 34%; background: #7b4f2c; border-radius: 8px 8px 0 0;
}
.route-building-home { --roof: #f26d6d; --wall: #ffb26b; }
.route-building-daycare { --roof: #ffd166; --wall: #ffe9a8; }
.route-building-shops { --roof: #5aa9e6; --wall: #fde28a; }
.route-building-park { --roof: transparent; --wall: transparent; }
.route-building-library { --roof: #7c5cd6; --wall: #e8ddff; }
.route-building-bus-stop { --roof: #5aa9e6; --wall: #dff1ff; }
.route-building-shop { --roof: #7fd08a; --wall: #eaf7dc; }
.route-building-school { --roof: #e8564a; --wall: #fdf0d5; z-index: 4; }
```

(벽·창문·간판·시계·깃발·소품·도착 매트 규칙 포함. 공원은 지붕 없는 울타리+나무 스타일로 별도 규칙. 세부 수치는 브레인스토밍 `building-style.html`·`final-package.html` 목업 참조.)

- [ ] **Step 4: 전체 테스트 통과 + 육안 확인** — `npm test`; `python3 -m http.server 8931` 후 브라우저에서 건물 확인
- [ ] **Step 5: 커밋** — `git commit -am "feat: render footprint buildings, props and goal mat"`

---

### Task 5: 씬 — 도로·신호등·오브젝트 재작화

**Files:**
- Modify: `src/safety-route-scene.mjs` (signalNode 99-113행, hazards 251-280행, movers 282-305행)
- Modify: `styles.css`
- Test: `tests/safety-route-scene.test.mjs`

**Interfaces:**
- Consumes: Task 3 `carSvg/bicycleSvg/scooterSvg/excavatorSvg`
- Produces: 신호등 DOM — `.route-signal-marker` 내부에 `.route-signal-lamp.route-signal-lamp-stop`·`.route-signal-lamp-go` 두 램프. 이동체/공사장 노드 `innerHTML`에 SVG 포함. 맨홀은 CSS 전용(`.route-manhole` 내부 `.route-manhole-lid`·`.route-manhole-cone` span 2개).

- [ ] **Step 1: 실패 테스트 작성**:

```js
test("신호등은 두 램프를 가진 보행자 신호등이다", () => {
  const state = createSafetyRouteState("easy", { seed: 3 });
  const scene = renderSafetyRouteScene(document, state);
  const markers = byClass(scene, "route-signal-marker");
  assert.equal(markers.length, 4); // 횡단보도 2곳 × 좌우 한 쌍
  markers.forEach(marker => {
    assert.equal(byClass(marker, "route-signal-lamp").length, 2);
    assert.equal(marker.dataset.phase, state.signal.phase);
  });
});

test("이동체와 공사장은 svg 아트로 그려진다", () => {
  const state = createSafetyRouteState("challenge", { seed: 5 });
  const scene = renderSafetyRouteScene(document, state);
  byClass(scene, "route-moving-rider").forEach(node => {
    assert.match(node.innerHTML ?? "", /route-art-(bicycle|scooter)/);
  });
  byClass(scene, "route-car").forEach(node => {
    assert.match(node.innerHTML ?? "", /route-art-car/);
  });
  const construction = byClass(scene, "route-construction")[0];
  assert.match(construction.innerHTML ?? "", /route-art-excavator/);
  const manhole = byClass(scene, "route-manhole")[0];
  assert.equal(byClass(manhole, "route-manhole-lid").length, 1);
});
```

(FakeElement에 `innerHTML` 필드는 일반 속성 대입으로 동작 — 테스트 헬퍼 수정 불필요.)

- [ ] **Step 2: 실행해 실패 확인** — FAIL
- [ ] **Step 3: 구현**
  - `signalNode`: `role="img"`/`aria-label` 유지 + 램프 2개 자식 생성(`route-signal-lamp-stop`, `route-signal-lamp-go`).
  - mover 생성부: `route-rider-person` span 제거하고 `node.innerHTML = mover.type === "car" ? carSvg() : mover.type === "bicycle" ? bicycleSvg() : scooterSvg();`
  - construction 노드: `node.innerHTML = excavatorSvg();` + CSS 펜스(`::before`/`::after` 주황/흰 사선) + `route-construction-sign` span(`🚧 공사중`).
  - manhole 노드: 자식 span `route-manhole-lid`, `route-manhole-cone` 추가.
  - `styles.css`: 아스팔트(`.route-road` 어두운 회색+노이즈 `radial-gradient`), 중앙선(`.route-road[data-road-position="center-left"]` 오른 경계 노란 점선), 차선 화살표, `.route-crosswalk` 흰 줄무늬(`repeating-linear-gradient(0deg,…)`), `.route-stop-line` 흰 정지선, 신호등 램프 색(`[data-phase="pedestrian-go"] .route-signal-lamp-go { background:#55d97a }` / stop 램프 빨강), 차·라이더 방향 반전(`[data-heading="south"] .route-art-car { transform: rotate(180deg) }`, `[data-direction="-1"] .route-art-bicycle { transform: scaleX(-1) }`), 바퀴 회전(`.route-wheel { animation: route-wheel-spin 1.6s linear infinite; transform-box: fill-box; transform-origin: center }`, `[data-stopped="true"] .route-wheel { animation-play-state: paused }`), reduced-motion 비활성화.
  - 구 `.route-rider-person` CSS 삭제.

- [ ] **Step 4: 전체 테스트 + 육안 확인** — `npm test`; 브라우저에서 신호등·차·공사장 확인
- [ ] **Step 5: 커밋** — `git commit -am "feat: redraw road, signals and objects with svg art"`

---

### Task 6: 미니맵

**Files:**
- Create: `src/safety-route-minimap.mjs`
- Modify: `src/safety-route-scene.mjs` (top 영역 141-151행에 장착, update에서 갱신)
- Modify: `styles.css`
- Test: `tests/safety-route-minimap.test.mjs`

**Interfaces:**
- Produces: `renderMinimap(document, state)` → `.route-minimap` 노드(내부: `.route-minimap-zone`×3, `.route-minimap-band`×4, `.route-minimap-player`, `.route-minimap-target`, `.route-minimap-school`, `.route-minimap-signal`), `updateMinimap(node, state)` → 위치·신호 갱신. 좌표는 CSS 변수 `--mini-x`(= x/width*100), `--mini-y`(= y/height*100)로 퍼센트 배치.

- [ ] **Step 1: 실패 테스트 작성** — `tests/safety-route-minimap.test.mjs`:

```js
import test from "node:test";
import assert from "node:assert/strict";
import { createSafetyRouteState } from "../src/safety-route-model.mjs";
import { renderMinimap, updateMinimap } from "../src/safety-route-minimap.mjs";
// FakeElement 헬퍼는 scene 테스트에서 복사

test("미니맵은 위치·다음 친구·학교·신호를 표시한다", () => {
  const state = createSafetyRouteState("easy", { seed: 2 });
  const node = renderMinimap(document, state);
  const player = byClass(node, "route-minimap-player")[0];
  assert.equal(
    player.style.values.get("--mini-x"),
    String((state.position.x / state.map.width) * 100)
  );
  assert.equal(byClass(node, "route-minimap-target").length, 1);
  assert.equal(byClass(node, "route-minimap-school").length, 1);
  assert.equal(
    byClass(node, "route-minimap-signal")[0].dataset.phase,
    state.signal.phase
  );
});

test("updateMinimap은 다음 친구와 신호를 갱신한다", () => {
  const state = createSafetyRouteState("easy", { seed: 2 });
  const node = renderMinimap(document, state);
  const moved = {
    ...state,
    nextFriend: 4,
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  };
  updateMinimap(node, moved);
  const target = byClass(node, "route-minimap-target")[0];
  const friend4 = moved.map.friends.find(friend => friend.number === 4);
  assert.equal(
    target.style.values.get("--mini-x"),
    String((friend4.x / moved.map.width) * 100)
  );
  assert.equal(
    byClass(node, "route-minimap-signal")[0].dataset.phase,
    "pedestrian-go"
  );
});
```

- [ ] **Step 2: 실행해 실패 확인** — FAIL
- [ ] **Step 3: 구현** — 모듈 작성(대상은 `nextFriend<=10`이면 해당 친구, 아니면 goal). scene의 `top`에 `renderMinimap` 결과를 append하고 `_safetyRouteView.minimap`에 저장, `updateSafetyRouteScene`에서 `updateMinimap(nodes.minimap, state)` 호출. CSS: 우상단 고정(`.safety-route-top` 안 absolute), 데스크톱 240px/모바일 150px(`@media (max-width: 640px)`), 14:4:14 구역 실루엣은 `grid-template-columns: 14fr 4fr 14fr`, 타깃 점 깜빡임 `@keyframes` + reduced-motion 제외.
- [ ] **Step 4: 전체 테스트 통과** — `npm test`
- [ ] **Step 5: 커밋** — `git add -A && git commit -m "feat: add safety route minimap"`

---

### Task 7: 횡단 연출 씬 표현 + 컨트롤러 안내

**Files:**
- Modify: `src/safety-route-scene.mjs` (player 렌더 319-324행, update 425행 부근)
- Modify: `src/safety-route-controller.mjs` (safetyCueForEvent)
- Modify: `styles.css`
- Test: `tests/safety-route-scene.test.mjs`, `tests/safety-route-controller.test.mjs`

**Interfaces:**
- Consumes: Task 2 `state.ceremony`, 이벤트 `crossing-started`
- Produces: 플레이어 래퍼 `.route-player-wrap`(자식: 기존 `img.route-player` + `span.route-player-hand`), 루트 `dataset.ceremony` = `""|"stopping"|"looking"|"crossing"`. `safetyCueForEvent`가 `crossing-started`에 `{ message: "멈춰요, 왼쪽 오른쪽을 봐요!", voiceKey: "safety-look-both", tone: "safety" }` 반환.

- [ ] **Step 1: 실패 테스트 작성**:

```js
// scene 테스트
test("연출 상태가 플레이어 자세와 루트 데이터로 노출된다", () => {
  const state = createSafetyRouteState("easy", { seed: 3 });
  const scene = renderSafetyRouteScene(document, state);
  assert.equal(byClass(scene, "route-player-wrap").length, 1);
  assert.equal(byClass(scene, "route-player-hand").length, 1);
  updateSafetyRouteScene(scene, {
    ...state,
    ceremony: { stage: "looking", elapsedMs: 700 }
  });
  assert.equal(scene.dataset.ceremony, "looking");
  updateSafetyRouteScene(scene, { ...state, ceremony: null });
  assert.equal(scene.dataset.ceremony, "");
});

// controller 테스트
test("crossing-started 이벤트는 좌우 살피기 안내를 만든다", () => {
  const cue = safetyCueForEvent({ type: "crossing-started" }, 6);
  assert.equal(cue.voiceKey, "safety-look-both");
  assert.equal(cue.message, "멈춰요, 왼쪽 오른쪽을 봐요!");
});
```

- [ ] **Step 2: 실행해 실패 확인** — FAIL
- [ ] **Step 3: 구현**
  - scene: player를 `div.route-player-wrap`으로 감싸고(`placeAt`은 래퍼에 적용) `span.route-player-hand`(aria-hidden) 추가. `_safetyRouteView.player`는 래퍼를 가리키도록 변경(placeAt 대상). update에서 `root.dataset.ceremony = state.ceremony?.stage ?? ""`.
  - CSS: `[data-ceremony="stopping"] .route-player-wrap` 정지 강조(테두리 펄스), `[data-ceremony="looking"] .route-player-wrap img` 좌우 살피기(`route-look` keyframes: translateX -8%→8%), `[data-ceremony="crossing"] .route-player-hand` 표시(손 모양 ✋, 평소 `display:none`), reduced-motion 제외.
  - controller: `safetyCueForEvent`에 `crossing-started` 분기 추가.
  - app.mjs `moveSafetyRoute`: `crossing-started`도 `moved`처럼 hold 유지 대상( `startSafetyHold`의 `event?.type !== "moved"` 조건을 `!["moved","crossing-started"].includes(event?.type)`로 변경).
- [ ] **Step 4: 전체 테스트 통과** — `npm test`
- [ ] **Step 5: 커밋** — `git commit -am "feat: show crossing ceremony pose and cue"`

---

### Task 8: 카메라 투어

**Files:**
- Modify: `src/safety-route-camera.mjs`
- Modify: `src/app.mjs` (startSafetyRoute 492-523행, scheduleSafetyWorldTick 473-490행, 키 입력 핸들러)
- Test: `tests/safety-route-camera.test.mjs`

**Interfaces:**
- Produces: `tourCameraPath({ world, viewport, start, goal, steps = 6 })` → 카메라 오프셋 배열(start를 비추는 오프셋에서 goal을 비추는 오프셋까지 선형 보간, 각 항목 `{x,y}` 정수·경계 클램프). app은 이 배열을 500ms 간격으로 순회한 뒤 `tourActive`를 해제하고 `scheduleSafetyWorldTick` 시작.

- [ ] **Step 1: 실패 테스트 작성** — `tests/safety-route-camera.test.mjs`:

```js
test("투어 경로는 시작과 학교를 잇고 경계를 벗어나지 않는다", () => {
  const world = { width: 32, height: 16 };
  const viewport = { width: 7, height: 5 };
  const path = tourCameraPath({
    world, viewport,
    start: { x: 0, y: 3 }, goal: { x: 28, y: 11 }, steps: 6
  });
  assert.equal(path.length, 6);
  assert.deepEqual(path[0], cameraOffset({ world, viewport, player: { x: 0, y: 3 } }));
  assert.deepEqual(
    path[path.length - 1],
    cameraOffset({ world, viewport, player: { x: 28, y: 11 } })
  );
  path.forEach(offset => {
    assert.ok(offset.x >= 0 && offset.x <= world.width - viewport.width);
    assert.ok(offset.y >= 0 && offset.y <= world.height - viewport.height);
  });
});
```

- [ ] **Step 2: 실행해 실패 확인** — FAIL
- [ ] **Step 3: 구현**

```js
export function tourCameraPath({ world, viewport, start, goal, steps = 6 }) {
  const from = cameraOffset({ world, viewport, player: start });
  const to = cameraOffset({ world, viewport, player: goal });
  return Array.from({ length: steps }, (_, index) => {
    const ratio = steps === 1 ? 1 : index / (steps - 1);
    return {
      x: Math.round(from.x + (to.x - from.x) * ratio),
      y: Math.round(from.y + (to.y - from.y) * ratio)
    };
  });
}
```

app.mjs `startSafetyRoute`: `createSafetyRouteState(..., { seed, tourActive: true })`로 생성, `renderSafetyRoute()` 후 투어 실행:

```js
function runSafetyTour() {
  const viewport = state.safetyView.camera;
  const waypoints = tourCameraPath({
    world: state.safety.map, viewport,
    start: state.safety.map.start, goal: state.safety.map.goal
  });
  let index = 0;
  const advance = () => {
    if (!state.safety?.tourActive) return;
    if (index >= waypoints.length) return endSafetyTour();
    state.safetyView.camera = { ...waypoints[index], ...viewport };
    index += 1;
    renderSafetyRoute();
    state.safetyView.tourTimer = schedule(advance, 500);
  };
  advance();
}

function endSafetyTour() {
  if (!state.safety) return;
  if (state.safetyView.tourTimer) clearTimeout(state.safetyView.tourTimer);
  state.safety = { ...state.safety, tourActive: false };
  renderSafetyRoute();
  scheduleSafetyWorldTick(performance.now());
}
```

투어 중 렌더는 `renderSafetyRoute`가 tourActive일 때 카메라를 플레이어 추적으로 덮어쓰지 않도록 분기(`if (!state.safety.tourActive) { …기존 cameraOffset… }`). `startSafetyRoute`에서 기존 `scheduleSafetyWorldTick` 직접 호출을 `runSafetyTour()`로 교체하고, 음성은 `void audio.playPrompt("safety-tour")` 후 완료 시 `safety-next-2`. 키다운·패드 입력 핸들러 초입에 `if (state.mode === "safety" && state.safety?.tourActive) { endSafetyTour(); return; }`.

- [ ] **Step 4: 전체 테스트 + 수동 확인** — `npm test`; 브라우저에서 시작 투어·키 생략 확인
- [ ] **Step 5: 커밋** — `git commit -am "feat: add start camera tour to safety route"`

---

### Task 9: 음성 매니페스트·생성 스크립트

**Files:**
- Modify: `src/audio-manifest.mjs` (safety 배열 14-32행)
- Modify: `scripts/generate_voice_pack.py` (safety 문구 사전)
- Test: `tests/voice-assets.test.mjs`

**Interfaces:**
- Produces: VOICE 키 `safety-look-both`, `safety-tour` (ko/en 경로). 실제 mp3 생성은 네트워크 TTS가 필요하므로 **코드만 준비하고 실행은 사용자 승인 후** 진행. 파일이 없어도 `audio.playPrompt`는 기존 에러 처리로 조용히 넘어간다(회귀 확인 필수).

- [ ] **Step 1: 실패 테스트 작성** — `tests/voice-assets.test.mjs`의 키 목록 단언에 두 키 추가 (기존 테스트가 파일 존재까지 검사하면 매니페스트 키 검사와 파일 검사를 분리하고, 새 키는 "파일이 아직 없으면 스킵" 목록에 넣는다):

```js
test("안전 연출 음성 키가 매니페스트에 있다", () => {
  assert.ok(VOICE["safety-look-both"].ko.endsWith("safety-look-both.mp3"));
  assert.ok(VOICE["safety-tour"].ko.endsWith("safety-tour.mp3"));
});
```

- [ ] **Step 2: 실행해 실패 확인** — FAIL
- [ ] **Step 3: 구현** — 매니페스트 safety 배열에 `"safety-look-both", "safety-tour"` 추가. `generate_voice_pack.py`의 한국어 사전에:

```python
"safety-look-both": "멈춰요, 왼쪽 오른쪽을 봐요!",
"safety-tour": "학교까지 안전하게 가 보자!",
```

(영어 사전이 있으면 대응 문구 `"Stop! Look left and right!"`, `"Let's walk safely to school!"` 추가.) mp3 생성 실행은 하지 않는다 — 계획 완료 보고에 "사용자 승인 후 `python3 scripts/generate_voice_pack.py` 실행 필요(네트워크 TTS)"를 명시.

- [ ] **Step 4: 전체 테스트 통과 + 무음 회귀 확인** — `npm test`; 브라우저에서 mp3 없는 상태로 횡단 연출이 음성 없이도 정상 진행되는지 확인
- [ ] **Step 5: 커밋** — `git commit -am "feat: add ceremony and tour voice keys"`

---

### Task 10: 통합 회귀 — 브라우저 계약·스크린샷·QA

**Files:**
- Modify: `tests/safety-route-browser-layout.test.mjs`, `tests/safety-route-styles.test.mjs` (새 클래스 계약 반영)
- Test: 전체 스위트

- [ ] **Step 1: 스타일 계약 테스트 갱신** — `safety-route-styles.test.mjs`에 새 CSS 계약 추가(존재 검사):

```js
["route-building", "route-goal-mat", "route-minimap",
 "route-signal-lamp", "route-player-hand", "route-prop"].forEach(cls => {
  test(`styles.css에 .${cls} 규칙이 있다`, () => {
    assert.match(css, new RegExp(`\\.${cls}`));
  });
});
test("reduced-motion에서 바퀴·살피기·깜빡임이 꺼진다", () => {
  const reduced = css.slice(css.indexOf("prefers-reduced-motion"));
  ["route-wheel", "route-look"].forEach(name =>
    assert.match(reduced, new RegExp(name)));
});
```

- [ ] **Step 2: 전체 테스트 실행** — `npm test` → 실패 0. 실패 시 해당 태스크로 돌아가 수정
- [ ] **Step 3: 스크린샷 캡처** — `python3 -m http.server 8931` + playwright 스크립트(브레인스토밍 때 쓴 `scratchpad/shot-safety.mjs` 재사용)로 1280×720 / 390×844 / 640×360에서: 시작 투어, 왼동네(건물·라이더), 횡단보도(신호등·차·연출), 학교 도착 화면 캡처
- [ ] **Step 4: 육안 QA 체크리스트** — 건물이 보행길을 가리지 않는가 / 미니맵 점이 실제 위치와 일치하는가 / 신호등 색과 차 정지가 동기화되는가 / 라이더 반전·바퀴 회전 / 공사장 펜스+포크레인 / 맨홀 뚜껑 / 도착 매트 가시성 / 모바일 가로 스크롤 없음
- [ ] **Step 5: 커밋 + 사용자 보고** — `git commit -am "test: pin renewed safety route visual contracts"`. 변경 파일·테스트 수·스크린샷을 사용자에게 보여주고 병합·배포 승인은 별도로 받는다 (CLAUDE.md 절차 7-8)

---

## Self-Review 결과

- **스펙 커버리지**: 건물/소품(T1·T4), 학교 랜드마크+도착 연출(T1·T4), 도로·신호등·차(T5), 라이더(T3·T5), 공사장·맨홀(T5), 미니맵(T6), 횡단 연출(T2·T7), 카메라 투어(T8), 음성(T9), 테스트 전략(각 태스크+T10) — 스펙의 "도착 시 폭죽" 연출은 T4의 도착 매트 + 기존 `completeSafetyRoute` 축하(cheer) 재사용으로 최소 구현하고, 별도 폭죽 애니메이션은 T10 QA에서 여유가 있으면 CSS로 추가(미구현이어도 스펙의 완료 기준을 깨지 않음 — 축하 연출 자체는 기존 존재)
- **플레이스홀더**: 좌표·문구·클래스명 모두 실값. SVG 세부 좌표만 목업 파일 참조로 위임(목업이 리포 안에 존재)
- **타입 일관성**: `place.door {x,y}`(T1→T4), `ceremony.stage` 문자열(T2→T7), art 함수 4종(T3→T5), `--mini-x` 퍼센트(T6), `tourCameraPath` 시그니처(T8) 교차 확인 완료
