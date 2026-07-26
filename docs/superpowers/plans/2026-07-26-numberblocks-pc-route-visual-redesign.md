# Numberblocks PC Safety Route Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the 1280×720 PC safety-route scene with a larger map, compact controls, realistic two-way road geometry, correctly placed signals, recognizable alleys, occupied rider vehicles, a closed manhole, and a flat construction barrier before any mobile-specific redesign begins.

**Architecture:** Preserve the existing 32×16 generated map, movement model, stable mounted scene, and 7×5 PC camera. Add semantic surface metadata in the layout/scene layer, then style those stable nodes with PC-first CSS. Keep gameplay logic unchanged; visual changes consume existing state and only add accessible labels or decorative child nodes.

**Tech Stack:** Vanilla ES modules, DOM/CSS Grid, CSS pseudo-elements and gradients, Node.js `node:test`, local browser QA.

## Global Constraints

- PC phase target viewport is exactly 1280×720 with a 7×5 camera.
- Do not implement the 390×844 or 640×360 mobile redesign until the PC result is approved by the user.
- Keep the map at 32×16 and the horizontal zones at 14:4:14.
- Preserve player-centered camera behavior, ordered friend collection, crossing rules, mover avoidance, scoring, sound, and difficulty behavior.
- Use the existing flat child-animation style; do not add 3D rendering or photographic compositing.
- Do not request or embed the supplied construction-barrier image. Recreate only its safety-equipment structure and colors with original CSS artwork.
- Do not add runtime dependencies or external image/network requests.
- Keep the route scene mounted across 100ms world ticks and retain keyboard focus.
- Maintain 44×44px minimum direction-button hit targets.
- Use TDD for every behavior or markup contract and commit each task separately.

---

## File Structure

- `src/safety-route-layout.mjs` — owns generated geometry and synchronized signal-marker coordinates.
- `src/safety-route-scene.mjs` — maps geometry/state to stable semantic DOM nodes and accessible labels.
- `styles.css` — owns PC viewport sizing, road/alley/signal artwork, rider artwork, obstacle artwork, and compact control presentation.
- `index.html` — owns the CSS cache version only.
- `tests/safety-route-layout.test.mjs` — verifies signal-marker geometry and zone placement.
- `tests/safety-route-scene.test.mjs` — verifies semantic surface classes/data, stable rider children, and labels.
- `tests/safety-route-styles.test.mjs` — verifies PC sizing and the required visual contracts without screenshot fragility.
- `tests/app-contract.test.mjs` — verifies the final cache key.

---

### Task 1: Give Roads, Alleys, and Both Crossings Stable Semantic Geometry

**Files:**
- Modify: `src/safety-route-layout.mjs:260-360`
- Modify: `src/safety-route-scene.mjs:45-190`
- Test: `tests/safety-route-layout.test.mjs`
- Test: `tests/safety-route-scene.test.mjs`

**Interfaces:**
- Consumes: `state.map.lanes`, `state.map.alleys`, `state.map.sidewalkBands`, `state.map.crossings`, and `{ x, y }` cells from the existing generated-map contract.
- Produces: four `map.signalMarkers` records shaped as `{ id, crossingId, side: "left" | "right", x, y }`; `.route-road[data-lane][data-road-position]`; `.route-alley`; `.route-walkway`; `.route-crosswalk[data-crossing-id]`. The existing `signalGate` remains a logical crossing rule only and is not rendered in addition to the four markers.

- [ ] **Step 1: Write failing layout tests for two visible signal posts at each crossing**

```js
test("각 횡단보도는 양쪽 보도 모서리에 동기 신호 위치를 만든다", () => {
  const map = generateSafetyRouteMap("easy", { seed: 14 });
  assert.equal(map.signalMarkers.length, 4);
  for (const crossing of map.crossings) {
    const markers = map.signalMarkers.filter(
      marker => marker.crossingId === crossing.id
    );
    assert.deepEqual(markers.map(marker => marker.side).sort(), ["left", "right"]);
    assert.ok(markers.every(marker => !map.roadCells.some(
      cell => cell.x === marker.x && cell.y === marker.y
    )));
  }
});
```

- [ ] **Step 2: Write failing scene tests for lane, crossing, alley, and walkway metadata**

```js
test("장면은 차선과 보행 공간의 역할을 DOM에 표시한다", () => {
  const scene = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy", { seed: 14 })
  );
  assert.ok(byClass(scene, "route-road").every(node => node.dataset.lane));
  assert.ok(byClass(scene, "route-road").every(node => node.dataset.roadPosition));
  assert.equal(byClass(scene, "route-crosswalk").length, 16);
  assert.ok(byClass(scene, "route-crosswalk").every(
    node => node.dataset.crossingId
  ));
  assert.ok(byClass(scene, "route-alley").length > 0);
  assert.ok(byClass(scene, "route-walkway").length > 0);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test tests/safety-route-layout.test.mjs tests/safety-route-scene.test.mjs
```

Expected: FAIL because only two signal markers exist and rendered surface nodes do not expose the new semantic classes/data.

- [ ] **Step 4: Generate four sidewalk-corner signal markers**

Implement the marker construction beside each two-row crossing, outside the road zone:

```js
const signalMarkers = crossings.flatMap(crossing => {
  const markerY = Math.min(...crossing.cells.map(point => point.y));
  return [
    {
      id: `${crossing.id}-left-signal`,
      crossingId: crossing.id,
      side: "left",
      x: ROAD_X - 1,
      y: markerY
    },
    {
      id: `${crossing.id}-right-signal`,
      crossingId: crossing.id,
      side: "right",
      x: ROAD_X + ROAD_WIDTH,
      y: markerY + 1
    }
  ];
});
```

Return `signalMarkers` through the candidate map and validate exactly two distinct sides for every crossing.

- [ ] **Step 5: Annotate rendered road and pedestrian cells**

Add small internal helpers in `src/safety-route-scene.mjs`:

```js
function pointKey(point) {
  return `${point.x},${point.y}`;
}

function cellsIn(rectangles) {
  return new Set(rectangles.flatMap(rectangle =>
    Array.from({ length: rectangle.width * rectangle.height }, (_, index) => {
      const x = rectangle.x + (index % rectangle.width);
      const y = rectangle.y + Math.floor(index / rectangle.width);
      return `${x},${y}`;
    })
  ));
}
```

For each road cell, set `data-lane` from the lane containing its `x`. Set `data-road-position` to `outer-left`, `center-left`, `center-right`, or `outer-right` for road columns 14, 15, 16, and 17 respectively. Set `data-crossing-id` for crossing cells. For pedestrian cells, add `route-alley` when the point belongs to an alley rectangle, otherwise add `route-walkway`.

When `signalMarkers` exist, render those four nodes instead of the standalone `signalGate` node. Give every marker `role="img"` and the current Korean phase label; keep `signalGate` in the model for crossing decisions. Update every marker's `data-phase` and label in `updateSafetyRouteScene()`.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/safety-route-layout.test.mjs tests/safety-route-scene.test.mjs
```

Expected: PASS with four signal markers and semantic surfaces.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/safety-route-layout.mjs src/safety-route-scene.mjs tests/safety-route-layout.test.mjs tests/safety-route-scene.test.mjs
git commit -m "feat: expose safety route street geometry"
```

---

### Task 2: Enlarge the 1280×720 Map and De-emphasize Direction Controls

**Files:**
- Modify: `styles.css:650-710`
- Modify: `styles.css:1810-1875`
- Modify: `styles.css:2500-2580`
- Test: `tests/safety-route-styles.test.mjs`

**Interfaces:**
- Consumes: existing `--viewport-cols`, `--viewport-rows`, and `--route-cell-size` CSS custom properties.
- Produces: a PC-only map viewport that uses at least 92vw when height permits, a 7×5 camera, and a compact `.route-pad` with 44×44px buttons and focus/hover emphasis.

- [ ] **Step 1: Write a failing PC scale and control contract test**

```js
test("PC 안전길은 7×5 지도를 크게 쓰고 방향키는 기본 상태에서 절제한다", () => {
  assert.match(css, /body\[data-mode="safety"\]\s+#game\s*\{[^}]*padding:\s*58px\s+1\.5vw\s+8px;/s);
  assert.match(css, /body\[data-mode="safety"\]\s+\.stage-frame\s*\{[^}]*width:\s*min\(96vw,\s*1600px\);/s);
  assert.match(css, /\.safety-viewport\s*\{[^}]*calc\(94vw\s*\/\s*var\(--viewport-cols,\s*7\)\)/s);
  assert.match(css, /\.route-pad\s*\{[^}]*opacity:\s*\.58;/s);
  assert.match(css, /\.route-pad:focus-within,[\s\S]*?\.route-pad:hover\s*\{[^}]*opacity:\s*1;/s);
  assert.match(css, /\.route-pad button\s*\{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/s);
});
```

- [ ] **Step 2: Run the style test and verify RED**

Run:

```bash
node --test tests/safety-route-styles.test.mjs
```

Expected: FAIL because the stage is capped at 1050px, safety mode keeps large outer padding, and the pad is fully opaque with 48px buttons.

- [ ] **Step 3: Add PC-only sizing overrides and compact controls**

Implement outside mobile media queries:

```css
body[data-mode="safety"] #game {
  gap: 6px;
  padding: 58px 1.5vw 8px;
}

body[data-mode="safety"] .stage-frame {
  width: min(96vw, 1600px);
  border-radius: 26px;
}

.safety-viewport {
  --route-cell-size: min(
    calc(94vw / var(--viewport-cols, 7)),
    calc((100vh - 150px) / var(--viewport-rows, 5))
  );
}

.route-pad {
  grid-template-columns: repeat(3, 44px);
  grid-template-rows: repeat(2, 44px);
  gap: 3px;
  padding: 4px;
  opacity: .58;
  transition: opacity 120ms ease-out;
}

.route-pad:focus-within,
.route-pad:hover {
  opacity: 1;
}

.route-pad button {
  min-width: 44px;
  min-height: 44px;
  font-size: 23px;
}
```

Do not edit the `max-width: 640px` or short-landscape media blocks in the PC phase.

- [ ] **Step 4: Run the style test and verify GREEN**

Run:

```bash
node --test tests/safety-route-styles.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Run the camera tests to guard the 7×5 contract**

Run:

```bash
node --test tests/safety-route-camera.test.mjs tests/app-contract.test.mjs
```

Expected: PASS with the existing PC viewport `{ width: 7, height: 5 }` unchanged.

- [ ] **Step 6: Commit Task 2**

```bash
git add styles.css tests/safety-route-styles.test.mjs
git commit -m "feat: enlarge desktop safety route viewport"
```

---

### Task 3: Redraw the Road, Crosswalks, Signals, and Alleys

**Files:**
- Modify: `styles.css:1875-2260`
- Test: `tests/safety-route-styles.test.mjs`
- Test: `tests/safety-route-scene.test.mjs`

**Interfaces:**
- Consumes: Task 1 classes/data attributes `.route-road[data-lane]`, `[data-road-position]`, `.route-crosswalk[data-crossing-id]`, `.route-alley`, `.route-walkway`, and four `.route-signal-marker` nodes.
- Produces: a two-way asphalt road with center/edge lines, perpendicular zebra crossings, pedestrian-corner signal posts, beige one-cell alleys, and visually distinct two-cell walkways.

- [ ] **Step 1: Write failing visual-contract tests**

```js
test("PC 도로와 골목은 실제 역할에 맞는 평면 패턴을 사용한다", () => {
  assert.match(css, /\.route-zone-road\s*\{[^}]*--road-asphalt:\s*#4d5965;/s);
  assert.match(css, /\.route-road\[data-road-position="center-left"\][\s\S]*?border-inline-end:\s*3px\s+(?:dashed|solid)\s+#f4c542;/s);
  assert.match(css, /\.route-crosswalk\s*\{[^}]*repeating-linear-gradient\(\s*180deg,/s);
  assert.match(css, /\.route-alley\s*\{[^}]*#e7d2aa;[^}]*border-inline:/s);
  assert.match(css, /\.route-walkway\s*\{[^}]*#efdcb8;/s);
  assert.match(css, /\.route-signal-marker\s*\{[^}]*translate:/s);
});
```

Extend the scene test to assert four signal markers, two crossing IDs, and two side values per crossing.

- [ ] **Step 2: Run focused tests and verify RED**

Run:

```bash
node --test tests/safety-route-styles.test.mjs tests/safety-route-scene.test.mjs
```

Expected: FAIL because the current road uses a single center decoration, sidewalks and alleys share one class, and signal posts are not positioned as corner furniture.

- [ ] **Step 3: Implement the flat PC street system**

Use CSS variables and semantic selectors rather than adding duplicate DOM nodes:

```css
.route-zone-road {
  --road-asphalt: #4d5965;
  border-inline: 5px solid #f7f2df;
  background: var(--road-asphalt);
}

.route-road[data-road-position="center-left"] {
  border-inline-end: 3px dashed #f4c542;
}

.route-road[data-road-position="outer-left"] {
  box-shadow: inset 4px 0 #f7f2df;
}

.route-road[data-road-position="outer-right"] {
  box-shadow: inset -4px 0 #f7f2df;
}

.route-crosswalk {
  background: repeating-linear-gradient(
    180deg,
    #fff 0 22%,
    var(--road-asphalt) 22% 38%
  );
}

.route-alley {
  border-inline: 3px solid #c4aa78;
  background: #e7d2aa;
}

.route-walkway {
  background: #efdcb8;
}
```

Redraw signals as a dark flat housing on a pale pole with a small base. Position left/right markers toward their adjacent curb using `data-side`, keep them inside their grid cell, and preserve `data-phase` red/green indicators.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/safety-route-styles.test.mjs tests/safety-route-scene.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Commit Task 3**

```bash
git add styles.css tests/safety-route-styles.test.mjs tests/safety-route-scene.test.mjs
git commit -m "feat: redraw desktop streets and signals"
```

---

### Task 4: Add Riders and Replace the Manhole and Construction Artwork

**Files:**
- Modify: `src/safety-route-scene.mjs:1-35`
- Modify: `src/safety-route-scene.mjs:245-285`
- Modify: `styles.css:2260-2510`
- Test: `tests/safety-route-scene.test.mjs`
- Test: `tests/safety-route-styles.test.mjs`

**Interfaces:**
- Consumes: existing mover types `scooter` and `bicycle`, mover `data-direction`, and hazard types `manhole` and `construction`.
- Produces: one `.route-rider-person` child for every scooter/bicycle node; Korean labels for occupied vehicles and a closed manhole; original CSS artwork for helmeted riders, a flush manhole cover, and a yellow/black construction barrier.

- [ ] **Step 1: Write failing scene tests for occupied riders and corrected labels**

```js
test("킥보드와 자전거에는 헬멧을 쓴 탑승자가 함께 표시된다", () => {
  const scene = renderSafetyRouteScene(
    document,
    createSafetyRouteState("challenge", { seed: 3 })
  );
  for (const vehicleClass of ["route-scooter", "route-bicycle"]) {
    const vehicle = byClass(scene, vehicleClass)[0];
    assert.equal(byClass(vehicle, "route-rider-person").length, 1);
    assert.match(vehicle.attributes.get("aria-label"), /헬멧을 쓴 어린이/);
  }
  assert.equal(
    byClass(scene, "route-manhole")[0].attributes.get("aria-label"),
    "닫힌 맨홀 덮개"
  );
});
```

- [ ] **Step 2: Write failing CSS tests for the new obstacle artwork**

```js
test("탑승자와 닫힌 맨홀과 공사 차단봉은 원본 CSS 그림을 사용한다", () => {
  assert.match(css, /\.route-rider-person::before\s*\{[^}]*border-radius:\s*50%;/s);
  assert.match(css, /\.route-rider-person::after\s*\{[^}]*#ffcf9f/s);
  assert.match(css, /\.route-hazard-footprint-manhole\s*\{[^}]*border:\s*0;[^}]*background:\s*transparent;/s);
  assert.match(css, /\.route-manhole\s*\{[^}]*repeating-(?:linear|conic)-gradient/s);
  assert.match(css, /\.route-construction::before\s*\{[^}]*repeating-linear-gradient\([^}]*#f5c400[^}]*#171717/s);
  assert.match(css, /\.route-construction::after\s*\{[^}]*#ef5a29[^}]*#fff/s);
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```bash
node --test tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs
```

Expected: FAIL because riders have no person child, labels describe empty/open hazards, and the old obstacle artwork is still present.

- [ ] **Step 4: Add rider markup and accessible labels**

Update `HAZARD_LABELS`:

```js
const HAZARD_LABELS = Object.freeze({
  manhole: "닫힌 맨홀 덮개",
  construction: "공사 차단봉",
  scooter: "헬멧을 쓴 어린이의 킥보드",
  bicycle: "헬멧을 쓴 어린이의 자전거",
  car: "도로 자동차"
});
```

When rendering a scooter or bicycle, append one decorative child:

```js
if (mover.type === "scooter" || mover.type === "bicycle") {
  const rider = document.createElement("span");
  rider.className = "route-rider-person";
  rider.setAttribute("aria-hidden", "true");
  node.append(rider);
}
```

- [ ] **Step 5: Redraw the rider and hazard artwork**

Use `.route-rider-person` for a torso, head, and high-contrast helmet that flips with the vehicle. Remove the manhole footprint border/background and draw a flush gray circular cover with a simple clipped grid. Draw the construction barrier with a yellow/black diagonal board in `::before` and two orange/white posts with broad feet in `::after`. Do not use `url(...)` in these selectors.

- [ ] **Step 6: Run focused tests and verify GREEN**

Run:

```bash
node --test tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs
```

Expected: PASS.

- [ ] **Step 7: Run mover regressions**

Run:

```bash
node --test tests/safety-route-movers.test.mjs tests/safety-route-model.test.mjs
```

Expected: PASS; the decorative child and labels do not change movement, stopping, reversal, or collision behavior.

- [ ] **Step 8: Commit Task 4**

```bash
git add src/safety-route-scene.mjs styles.css tests/safety-route-scene.test.mjs tests/safety-route-styles.test.mjs
git commit -m "feat: add riders and clear safety obstacles"
```

---

### Task 5: Verify and Present the PC Version

**Files:**
- Modify: `index.html:10`
- Modify: `tests/app-contract.test.mjs:10-20`
- Create (ignored evidence): `.gstack/qa-reports/pc-route-visual-redesign.md`

**Interfaces:**
- Consumes: completed Tasks 1–4.
- Produces: cache key `styles.css?v=20260726-pc-route-visual`, a clean full test run, and 1280×720 PC evidence ready for user approval.

- [ ] **Step 1: Write a failing cache-contract test**

```js
test("PC 안전길 시각 개선은 새 CSS 캐시 주소를 사용한다", () => {
  assert.match(
    html,
    /<link rel="stylesheet" href="styles\.css\?v=20260726-pc-route-visual">/
  );
});
```

- [ ] **Step 2: Run the cache test and verify RED**

Run:

```bash
node --test tests/app-contract.test.mjs
```

Expected: FAIL because `index.html` still uses the previous route cache key.

- [ ] **Step 3: Update the cache key**

Change the stylesheet link to:

```html
<link rel="stylesheet" href="styles.css?v=20260726-pc-route-visual">
```

- [ ] **Step 4: Run the full automated suite**

Run:

```bash
npm test
```

Expected: all tests pass with zero failures.

- [ ] **Step 5: Check the patch for whitespace errors**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [ ] **Step 6: Perform 1280×720 browser QA**

Start the local static server and inspect only the PC phase at 1280×720. Record exact observations in `.gstack/qa-reports/pc-route-visual-redesign.md`:

1. The 7×5 map fills most of the stage with no page scroll.
2. The direction pad is visually subdued, every button remains at least 44×44px, keyboard focus survives five world ticks, and keyboard movement works.
3. The two-way road has opposite vehicle flow, correct center/edge lines, and perpendicular zebra crossings.
4. A signal is visible before entering either the upper or lower crossing; all visible signals share the same phase.
5. One-cell alleys read as beige narrow passages and remain distinct from the two-cell pedestrian paths.
6. Scooter and bicycle each have a helmeted child and preserve slow patrol, stop, reverse, resume, and no-overlap behavior.
7. The manhole is closed and flush with no warning halo; the construction barrier is yellow/black with orange/white posts and no external image.
8. Application-owned console errors and warnings are zero.

Capture at least these screenshots:

- `pc-1280x720-map-scale.png`
- `pc-1280x720-road-crossing.png`
- `pc-1280x720-riders-obstacles.png`

- [ ] **Step 7: Commit Task 5**

```bash
git add index.html tests/app-contract.test.mjs
git commit -m "test: finish desktop safety route visual QA"
```

- [ ] **Step 8: Stop at the PC approval gate**

Present the 1280×720 result and QA summary to the user. Do not edit mobile media queries or start the mobile implementation plan until the user explicitly approves the PC version.
