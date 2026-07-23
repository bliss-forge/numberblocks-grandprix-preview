# Numberblocks Safe Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a fifth `안전한 길찾기` game in which Numberblock One navigates a neighborhood, meets friends 2–10 in order, and learns forgiving traffic-safety rules.

**Architecture:** Keep route rules in a DOM-free model with three validated static maps. Render the current route state through a focused scene module, while `app.mjs` only coordinates mode switching, input, timers, and the existing audio manager. CSS supplies the current flat pastel picture-book style and responsive map layout without changing the four arithmetic game flows.

**Tech Stack:** Static HTML/CSS, browser-native ES modules, Node.js `node:test`, existing `AudioManager`, Edge TTS voice-pack generator, in-app browser QA.

## Global Constraints

- The new mode is `safety`, displayed as `안전한 길찾기`, and uses home shortcut `5`.
- Every difficulty uses Numberblock One as the player and friends 2–10 in order.
- Movement is one orthogonal grid cell per Arrow/WASD or mobile direction-button action.
- Hazards only block movement and explain the rule; there is no collision, star loss, reset, game over, or negative animation.
- Easy uses crossings and signals; steady adds construction, open manholes, scooters, and a slow bicycle; challenge adds cars and combined detours.
- Every target friend and the school must always remain reachable by a safe route.
- Existing Numberblocks 1–10 assets are reused unchanged.
- Buildings and vehicles use the existing bright flat 2D picture-book style; no realistic or 3D rendering.
- Korean safety audio plays before British English through the existing cancellation and ducking path.
- Existing count, addition, subtraction, multiplication, difficulty, answer, audio, and character-size behavior remains unchanged.
- Every production behavior follows RED → GREEN → relevant regression → commit.

---

### Task 1: Pure Safe-Route Model and Validated Maps

**Files:**
- Create: `src/safety-route-model.mjs`
- Create: `tests/safety-route-model.test.mjs`

**Interfaces:**
- Produces: `SAFETY_ROUTE_MAPS: Readonly<Record<"easy"|"steady"|"challenge", RouteMap>>`
- Produces: `createSafetyRouteState(difficulty): RouteState`
- Produces: `attemptSafetyMove(state, direction): { state: RouteState, event: RouteEvent }`
- Produces: `advanceSafetyWorld(state): RouteState`
- Produces: `validateSafetyRouteMap(map): { valid: boolean, errors: string[] }`
- `RouteState` contains `difficulty`, `map`, `position`, `nextFriend`, `collected`, `signal`, `tick`, and `movers`.

- [ ] **Step 1: Write failing map and movement contracts**

Create `tests/safety-route-model.test.mjs` with contracts covering:

```js
test("세 난이도 지도는 1~10 친구와 도착점을 안전하게 연결한다", () => {
  for (const difficulty of ["easy", "steady", "challenge"]) {
    const map = SAFETY_ROUTE_MAPS[difficulty];
    assert.deepEqual(
      map.friends.map(friend => friend.number).sort((a, b) => a - b),
      [2, 3, 4, 5, 6, 7, 8, 9, 10]
    );
    assert.deepEqual(validateSafetyRouteMap(map), { valid: true, errors: [] });
  }
});

test("친구는 2부터 순서대로만 수집한다", () => {
  const state = createSafetyRouteState("easy");
  const wrong = attemptSafetyMove(
    { ...state, position: { x: 4, y: 1 } },
    "right"
  );
  assert.equal(wrong.event.type, "wrong-friend");
  assert.equal(wrong.state.nextFriend, 2);

  const correct = attemptSafetyMove(
    { ...state, position: { x: 2, y: 6 } },
    "up"
  );
  assert.equal(correct.event.type, "friend");
  assert.equal(correct.event.number, 2);
  assert.equal(correct.state.nextFriend, 3);
});

test("빨간불과 생활안전 장애물은 위치를 유지하고 이유를 반환한다", () => {
  const red = attemptSafetyMove(
    { ...createSafetyRouteState("easy"), position: { x: 2, y: 5 }, signal: "red" },
    "up"
  );
  assert.equal(red.event.type, "blocked");
  assert.equal(red.event.reason, "red-light");
  assert.deepEqual(red.state.position, { x: 2, y: 5 });
});
```

Also cover invalid directions, walls, manhole/construction/scooter blockers, moving vehicle occupancy, signal cycling, and completion only after friend 10.

- [ ] **Step 2: Run the model test and verify RED**

Run:

```bash
node --test tests/safety-route-model.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` for `src/safety-route-model.mjs`.

- [ ] **Step 3: Implement immutable static map definitions**

In `src/safety-route-model.mjs`, define a shared 12×8 neighborhood grid:

```js
const WIDTH = 12;
const HEIGHT = 8;
const key = ({ x, y }) => `${x},${y}`;
const road = ({ x, y }) => [2, 6, 9].includes(x) || [1, 4, 6].includes(y);

const FRIENDS = Object.freeze([
  { number: 2, x: 2, y: 5, place: "daycare" },
  { number: 3, x: 2, y: 1, place: "shops" },
  { number: 4, x: 5, y: 1, place: "roadside" },
  { number: 5, x: 9, y: 2, place: "park" },
  { number: 6, x: 9, y: 4, place: "bus-stop" },
  { number: 7, x: 9, y: 6, place: "library" },
  { number: 8, x: 6, y: 6, place: "construction" },
  { number: 9, x: 6, y: 4, place: "crossing" },
  { number: 10, x: 10, y: 1, place: "school" }
]);
```

Build `easy`, `steady`, and `challenge` from this base. Use blockers only on cells with an alternate route. Use a signal gate at `{x:2,y:4}` and mover paths only on horizontal road rows.

- [ ] **Step 4: Implement pure state transitions and BFS validation**

Implement `createSafetyRouteState` by normalizing the difficulty to one of the
three map keys and cloning the initial player, mover, signal, friend, and
collection state. Implement `attemptSafetyMove` with the ordered checks
direction → map bounds → road membership → static blocker → red signal gate →
mover occupancy → friend order → school completion. Implement
`advanceSafetyWorld` by incrementing `tick`, toggling the signal every third
tick, and advancing each mover to the next path index with wraparound. Implement
`validateSafetyRouteMap` with structural validation followed by breadth-first
search from the start, treating timed signals and mover paths as eventually
passable but static hazards as blocked.

Return event types `moved`, `friend`, `wrong-friend`, `blocked`, `need-friends`, and `complete`. Blocked reasons are `wall`, `red-light`, `construction`, `manhole`, `scooter`, `bicycle`, and `car`.

- [ ] **Step 5: Verify model GREEN and regressions**

Run:

```bash
node --test tests/safety-route-model.test.mjs tests/game-model.test.mjs
git diff --check
```

Expected: all pass and no whitespace errors.

- [ ] **Step 6: Commit**

```bash
git add src/safety-route-model.mjs tests/safety-route-model.test.mjs
git commit -m "feat: 안전한 길찾기 순수 게임 모델"
```

---

### Task 2: Route Scene Renderer and Fifth Home Mode

**Files:**
- Create: `src/safety-route-scene.mjs`
- Create: `tests/safety-route-scene.test.mjs`
- Modify: `index.html`
- Modify: `tests/app-contract.test.mjs`

**Interfaces:**
- Consumes: `RouteState` from Task 1 and `characterAsset(number)`.
- Produces: `renderSafetyRouteScene(document, state): HTMLElement`
- Produces DOM contracts: `.safety-route`, `.safety-grid`, `.safety-goal`, `.safety-collected`, `.route-player`, `.route-friend`, `.route-place`, `.route-hazard`, `[data-route-direction]`.

- [ ] **Step 1: Write failing scene and shell contracts**

Create `tests/safety-route-scene.test.mjs` using the project's lightweight fake-document pattern from `tests/problem-scene.test.mjs`. Assert that the renderer:

```js
const scene = renderSafetyRouteScene(document, createSafetyRouteState("easy"));
assert.equal(scene.className, "safety-route");
assert.equal(scene.querySelectorAll(".route-friend").length, 9);
assert.equal(scene.querySelector(".route-player").dataset.number, "1");
assert.equal(scene.querySelectorAll("[data-route-direction]").length, 4);
assert.match(scene.querySelector(".safety-goal").textContent, /2 친구/);
```

Extend `tests/app-contract.test.mjs` to require five mode cards, `data-mode="safety"`, shortcut `5`, and updated home copy `1` through `5`.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/safety-route-scene.test.mjs tests/app-contract.test.mjs
```

Expected: missing renderer and only four cards.

- [ ] **Step 3: Implement the focused DOM renderer**

`renderSafetyRouteScene` creates:

```html
<div class="safety-route">
  <div class="safety-route-top">
    <div class="safety-goal">다음은 2 친구</div>
    <div class="safety-collected">
      <img src="assets/characters/one.png" alt="만난 1 친구">
    </div>
  </div>
  <div class="safety-grid" style="--route-cols:12;--route-rows:8"></div>
  <div class="route-pad" aria-label="길찾기 이동">
    <button data-route-direction="up" aria-label="위로 이동">↑</button>
    <button data-route-direction="left" aria-label="왼쪽으로 이동">←</button>
    <button data-route-direction="down" aria-label="아래로 이동">↓</button>
    <button data-route-direction="right" aria-label="오른쪽으로 이동">→</button>
  </div>
</div>
```

Use flat semantic elements for places and hazards. Character image errors replace the image with a `.route-character-fallback` number badge.

- [ ] **Step 4: Add the fifth home card**

Add:

```html
<button class="mode-card safety-mode-card" type="button"
        data-mode="safety" aria-keyshortcuts="5">
  <span class="card-number">5</span>
  <img src="assets/characters/one.png" alt="">
  <span class="card-copy">
    <strong>안전한 길찾기</strong>
    <small>친구들을 만나러 가요</small>
  </span>
</button>
```

Change the lead text to show keys 1–5 and bump the stylesheet cache token to `20260724-safe-route`.

- [ ] **Step 5: Verify renderer and shell GREEN**

Run:

```bash
node --test tests/safety-route-scene.test.mjs tests/app-contract.test.mjs
git diff --check
```

- [ ] **Step 6: Commit**

```bash
git add index.html src/safety-route-scene.mjs \
  tests/safety-route-scene.test.mjs tests/app-contract.test.mjs
git commit -m "feat: 안전한 길찾기 화면 구조 추가"
```

---

### Task 3: App Controller, Keyboard, Touch, and Forgiving Safety Flow

**Files:**
- Modify: `src/app.mjs`
- Modify: `tests/app-contract.test.mjs`
- Create: `tests/safety-route-controller.test.mjs`

**Interfaces:**
- Consumes: Task 1 state transitions and Task 2 renderer.
- Produces: `directionForKey(key): "up"|"down"|"left"|"right"|null`
- Produces: `safetyCueForEvent(event, nextFriend): string|null`
- App state gains `safety: RouteState|null`.

- [ ] **Step 1: Write failing controller-helper tests**

In `tests/safety-route-controller.test.mjs`:

```js
assert.equal(directionForKey("ArrowUp"), "up");
assert.equal(directionForKey("w"), "up");
assert.equal(directionForKey("D"), "right");
assert.equal(directionForKey("5"), null);

assert.equal(safetyCueForEvent({ type: "blocked", reason: "red-light" }), "safety-red-light");
assert.equal(safetyCueForEvent({ type: "friend", number: 4 }, 5), "safety-next-5");
assert.equal(safetyCueForEvent({ type: "complete" }), "safety-finish");
```

App contracts require home key `5`, stage click delegation through `[data-route-direction]`, safety timer cleanup, and numeric answer input remaining disabled in safety mode.

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
node --test tests/safety-route-controller.test.mjs tests/app-contract.test.mjs
```

- [ ] **Step 3: Implement pure controller helpers**

Create exports in `src/app.mjs` only if browser bootstrap remains safe; otherwise put them in `src/safety-route-controller.mjs` and import them. Prefer the separate module if direct `app.mjs` import would require a DOM.

Map Arrow keys and case-insensitive WASD. Map every route event to text and a voice key.

- [ ] **Step 4: Connect safety start, movement, ticks, and completion**

Add:

```js
function startSafetyRoute() {
  clearTimers();
  audio.cancel();
  state.round += 1;
  state.safety = createSafetyRouteState(state.difficulty);
  setPhase("playing");
  renderSafety();
  void audio.playPrompt("safety-next-2");
  scheduleSafetyTick(state.round);
}
```

`startMode("safety")` calls this path instead of `newProblem()`. Movement stores
`const transition = attemptSafetyMove(state.safety, direction)`, replaces
`state.safety` with `transition.state`, rerenders, plays one cue, and never
changes stars for blocked events. Completion sets phase `celebrating`, shows
the 1–10 lineup, plays `safety-finish`, then schedules a fresh route.

Add click delegation:

```js
dom.stage.addEventListener("click", event => {
  const control = event.target.closest("[data-route-direction]");
  if (control) moveSafetyRoute(control.dataset.routeDirection);
});
```

Add keyboard movement before digit handling. Update the home mode map to include `5: "safety"`. `goHome()` clears `state.safety` and existing timers.

- [ ] **Step 5: Verify app flow GREEN**

Run:

```bash
node --test tests/safety-route-controller.test.mjs tests/app-contract.test.mjs \
  tests/app-behavior.test.mjs tests/audio-manager.test.mjs
git diff --check
```

- [ ] **Step 6: Commit**

```bash
git add src/app.mjs src/safety-route-controller.mjs \
  tests/safety-route-controller.test.mjs tests/app-contract.test.mjs
git commit -m "feat: 길찾기 입력과 안전 진행 흐름 연결"
```

---

### Task 4: Flat Neighborhood Visuals and Responsive Layout

**Files:**
- Modify: `styles.css`
- Modify: `tests/responsive-layout.test.mjs`

**Interfaces:**
- Consumes Task 2 DOM classes and body `data-mode="safety"`.
- Produces one-screen layouts for 1280×720, 390×844, and 640×360.

- [ ] **Step 1: Write failing CSS contracts**

Extend `tests/responsive-layout.test.mjs` to require:

- safety mode hides `.answer-dock`, `.number-pad`, and numeric keyboard note;
- `.safety-grid` uses `repeat(var(--route-cols), minmax(0, 1fr))`;
- `.route-place`, `.route-car`, `.route-bicycle`, `.route-scooter`, `.route-manhole`, `.route-construction`, `.route-signal` have flat styled selectors;
- mobile route pad is visible and at least 48px per button;
- 640×360 prioritizes map height and compresses the collected row;
- no desktop fixed minimum width is added.

- [ ] **Step 2: Run responsive tests and verify RED**

Run:

```bash
node --test tests/responsive-layout.test.mjs
```

- [ ] **Step 3: Implement the current-game visual language**

Add safety-specific CSS after existing game scene rules:

```css
body[data-mode="safety"] .answer-dock,
body[data-mode="safety"] .number-pad,
body[data-mode="safety"] .game-keyboard-note { display: none; }

.safety-grid {
  display: grid;
  grid-template-columns: repeat(var(--route-cols), minmax(0, 1fr));
  grid-template-rows: repeat(var(--route-rows), minmax(0, 1fr));
  aspect-ratio: 12 / 8;
  overflow: hidden;
  border: 6px solid #fff;
  border-radius: 26px;
}
```

Draw buildings, roads, crossings, signals, cars, bicycles, scooters, manholes, and construction barriers with simple CSS shapes and emoji-free accessible labels. Keep character images above scenery with clear size contrast.

- [ ] **Step 4: Add portrait and short-landscape rules**

At `max-width: 640px`, display the route pad as a three-column cross and reserve at least 48px per button. At `max-height: 500px` and landscape, compress the top row and route pad while keeping the entire map and home control visible.

- [ ] **Step 5: Verify responsive GREEN**

Run:

```bash
node --test tests/responsive-layout.test.mjs tests/app-contract.test.mjs
git diff --check
```

- [ ] **Step 6: Commit**

```bash
git add styles.css tests/responsive-layout.test.mjs
git commit -m "feat: 동네 길찾기 평면 디자인과 반응형 배치"
```

---

### Task 5: Natural Bilingual Safety Voice Pack

**Files:**
- Modify: `src/audio-manifest.mjs`
- Modify: `scripts/generate_voice_pack.py`
- Modify: `tests/voice-assets.test.mjs`
- Create: `assets/audio/voice/ko/safety-*.mp3`
- Create: `assets/audio/voice/en/safety-*.mp3`

**Interfaces:**
- Produces bilingual manifest keys `safety-next-2` through `safety-next-10`, `safety-red-light`, `safety-manhole`, `safety-construction`, `safety-scooter`, `safety-bicycle`, `safety-car`, `safety-wrong-order`, and `safety-finish`.

- [ ] **Step 1: Write failing voice contracts**

Extend `tests/voice-assets.test.mjs` so every safety key exists in both languages, exceeds 1024 bytes, and the generator contains the approved child-friendly Korean/English lines.

- [ ] **Step 2: Run voice tests and verify RED**

Run:

```bash
node --test tests/voice-assets.test.mjs
```

Expected: missing manifest entries and MP3 files.

- [ ] **Step 3: Add generator copy and manifest entries**

Generate next-friend copy such as:

```python
KO_SAFETY = {
    **{f"safety-next-{n}": f"다음은 {korean_number(n)[:-1]} 친구를 만나러 가요!" for n in range(2, 11)},
    "safety-red-light": "빨간불에는 멈춰서 기다려요. 초록불에 건너요.",
    "safety-manhole": "열린 맨홀 가까이 가지 말고 안전한 길로 돌아가요.",
    "safety-construction": "공사장 울타리 안에는 들어가지 않아요.",
    "safety-scooter": "길에 놓인 킥보드와 부딪히지 않게 돌아가요.",
    "safety-bicycle": "자전거가 지나가는지 좌우를 살펴요.",
    "safety-car": "골목에서 자동차가 나올 수 있어요. 멈추고 살펴요.",
    "safety-wrong-order": "친구들을 숫자 순서대로 만나러 가요.",
    "safety-finish": "친구들을 모두 만나 안전하게 학교에 도착했어요!"
}
```

Add concise British English equivalents. Use the existing natural neural voices with calm prompt rates.

- [ ] **Step 4: Generate only missing safety files**

Run:

```bash
uv run --offline --with edge-tts==7.2.8 python scripts/generate_voice_pack.py
```

If offline cache is unavailable, rerun without `--offline`. Do not replace existing number or game audio.

- [ ] **Step 5: Verify audio GREEN**

Run:

```bash
node --test tests/voice-assets.test.mjs tests/audio-manager.test.mjs
git diff --check
```

- [ ] **Step 6: Commit**

```bash
git add src/audio-manifest.mjs scripts/generate_voice_pack.py \
  tests/voice-assets.test.mjs assets/audio/voice/ko/safety-*.mp3 \
  assets/audio/voice/en/safety-*.mp3
git commit -m "feat: 길찾기 한국어 영어 안전 음성 추가"
```

---

### Task 6: Full Regression and Browser QA

**Files:**
- Verify all changed files.
- Add regression tests only if browser QA finds a reproducible defect.

- [ ] **Step 1: Run the full automated suite**

Run:

```bash
npm test
git diff --check
git status --short
```

Expected: all tests pass, no whitespace errors, clean worktree.

- [ ] **Step 2: Verify desktop 1280×720**

For each difficulty:

- start with key `5`;
- move with Arrow and WASD;
- meet 2 then attempt a wrong-order friend;
- test red-light blocking;
- test one difficulty-specific obstacle;
- verify 1–10 collected and school completion;
- verify existing arithmetic modes still start with keys 1–4;
- check no application console errors.

- [ ] **Step 3: Verify mobile portrait 390×844**

- all four direction buttons are visible and usable;
- map, goal, collected row, and home control fit without horizontal scrolling;
- friends and hazards remain visually distinguishable;
- completion fits without covering controls.

- [ ] **Step 4: Verify short landscape 640×360**

- map retains priority;
- collected row compresses;
- direction pad and home button remain visible;
- no overlap or horizontal scroll.

- [ ] **Step 5: Fix verified defects through TDD**

For each defect, first add one focused failing regression, implement the smallest fix, rerun the focused test, then rerun `npm test`.

- [ ] **Step 6: Final verification**

Run:

```bash
npm test
git diff --check
git status -sb
git log -8 --oneline
```

Expected: all tests pass and the feature commits are present on `main`.
