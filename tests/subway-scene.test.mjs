import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVE_MELODY_MS,
  TRAIN_APPROACH_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
  buildRoom,
  chooseSubwayLine,
  createSubwayJourney,
  gateLines,
  subwayCompass,
  subwayDestinations
} from "../src/subway-journey.mjs";
import {
  renderSubwayJourney,
  renderSubwayPicker,
  updateSubwayJourney
} from "../src/subway-scene.mjs";

class FakeStyle {
  constructor() {
    this.values = new Map();
  }

  setProperty(name, value) {
    this.values.set(name, String(value));
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.style = new FakeStyle();
    this.children = [];
    this.attributes = new Map();
    this.textContent = "";
    this.innerHTML = "";
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }

  addEventListener() {}
}

const document = {
  createElement(tagName) {
    return new FakeElement(tagName);
  }
};

function descendants(root) {
  return [root, ...root.children.flatMap(descendants)];
}

function byClass(root, className) {
  return descendants(root).filter(node =>
    typeof node.className === "string" &&
    node.className.split(" ").includes(className)
  );
}

function walkTo(state, targetX) {
  let current = state;
  for (let guard = 0; guard < 30; guard += 1) {
    if (current.room.walkX === targetX) return current;
    const result = attemptSubwayMove(
      current,
      current.room.walkX < targetX ? "right" : "left"
    );
    current = result.state;
    if (result.event.type !== "walked" &&
      !["card-picked", "friend-joined", "blocked-person"].includes(result.event.type)) {
      return current;
    }
  }
  return current;
}

function multiLineStart(placeId = "lake") {
  for (let seed = 0; seed < 60; seed += 1) {
    const journey = createSubwayJourney(placeId, seed);
    if (gateLines(journey).length >= 2) return journey;
  }
  throw new Error("no multi-line start");
}

function reachPlatform(state, lineNumber = null) {
  const through = walkTo(state, state.room.inGateX);
  const line = lineNumber ?? gateLines(through)[0];
  let current = chooseSubwayLine(through, line).state;
  for (let guard = 0; guard < 12; guard += 1) {
    const result = attemptSubwayMove(current, "right");
    current = result.state;
    if (result.event.type === "stairs-down") return current;
  }
  throw new Error("never walked down the stairs");
}

function ridingState(placeId = "hanriver", seed = 3) {
  const platform = reachPlatform(createSubwayJourney(placeId, seed));
  const stopped = advanceSubwayWorld(platform, TRAIN_APPROACH_MS);
  return attemptSubwayMove(stopped, "up").state;
}

test("목적지 선택 화면은 숫자키 카드 10장과 권장 환승 칩을 그린다", () => {
  const picker = renderSubwayPicker(document, subwayDestinations());
  assert.equal(byClass(picker, "subway-place-card").length, 10);
  assert.deepEqual(
    byClass(picker, "subway-place-key").map(node => node.textContent),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
  );
  for (const chip of byClass(picker, "subway-transfer-chip")) {
    const text = descendants(chip)
      .map(node => node.textContent)
      .find(value => value.startsWith("권장: "));
    assert.ok(text, "each chip states the recommended transfer count");
    const walkers = byClass(chip, "subway-transfer-walkers")[0];
    const drawn = (walkers.innerHTML.match(/subway-walker-art/g) ?? []).length;
    assert.equal(drawn, Number(chip.dataset.transfers), "one walker per transfer");
  }
  const icons = byClass(picker, "subway-place-icon");
  assert.equal(icons.length, 10);
  for (const icon of icons) {
    assert.equal(icon.dataset.painted, "true", "every place has drawn art");
    assert.match(icon.innerHTML, /subway-place-badge-art/);
  }
});

test("개찰구 방은 나가는 곳·들어가는 곳·계단을 그리고 호선 카드를 숨긴다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  const scene = renderSubwayJourney(document, journey);
  assert.equal(scene.dataset.phase, "gate");
  const room = byClass(scene, "subway-room")[0];
  assert.equal(room.dataset.kind, "gate");
  const gates = byClass(scene, "subway-room-gate");
  assert.deepEqual(gates.map(gate => gate.dataset.gate), ["out", "in"]);
  const entry = gates[1];
  assert.equal(entry.dataset.tapped, "false");
  assert.match(entry.style.values.get("--room-x"), /%$/);
  assert.ok(byClass(scene, "subway-room-stair").length >= 3, "stairs are drawn");
  assert.equal(byClass(scene, "subway-room-player").length, 1);
  assert.equal(byClass(scene, "subway-gate-lines")[0].dataset.open, "false");
  assert.equal(byClass(scene, "subway-gate-line").length, 0);
  assert.match(
    byClass(scene, "subway-drive-guide")[0].textContent,
    /들어가는 곳/
  );
  const target = byClass(scene, "subway-room-target")[0];
  assert.equal(
    target.style.values.get("--room-x"),
    entry.style.values.get("--room-x"),
    "the footprint points at the entry gate"
  );
});

test("들어가는 곳을 지나가면 카드가 찍히고 호선 선택이 열린다", () => {
  const journey = multiLineStart();
  const scene = renderSubwayJourney(document, journey);
  const through = walkTo(journey, journey.room.inGateX);
  updateSubwayJourney(scene, through);
  assert.equal(byClass(scene, "subway-gate-lines")[0].dataset.open, "true");
  const buttons = byClass(scene, "subway-gate-line");
  assert.equal(buttons.length, gateLines(through).length);
  for (const button of buttons) {
    assert.ok(button.dataset.lineNumber);
  }
  assert.equal(byClass(scene, "subway-room-gate")[1].dataset.tapped, "true");
});

test("개찰구는 목적지 방향 호선을 별로 추천해 같은 실수를 반복하지 않게 한다", () => {
  const gateWithChoices = multiLineStart();
  const tapped = walkTo(gateWithChoices, gateWithChoices.room.inGateX);
  const scene = renderSubwayJourney(document, tapped);

  const recommended = subwayCompass(tapped).line;
  const buttons = byClass(scene, "subway-gate-line");
  const marked = buttons.filter(
    button => button.dataset.recommended === "true"
  );
  assert.equal(marked.length, 1, "exactly one recommended line");
  assert.equal(Number(marked[0].dataset.lineNumber), recommended);
  assert.match(marked[0].children[1].textContent, /^⭐/);
  assert.match(
    byClass(scene, "subway-drive-guide")[0].textContent,
    new RegExp(`${recommended}호선 계단`)
  );
});

test("열차 안 방은 창문·문·사람과 단계 안내·진행도·미니맵을 함께 그린다", () => {
  const state = ridingState();
  const scene = renderSubwayJourney(document, state);
  assert.equal(scene.dataset.phase, "ride");
  const room = byClass(scene, "subway-room")[0];
  assert.equal(room.dataset.kind, "train");
  assert.equal(byClass(scene, "subway-room-window").length, 4);
  assert.equal(byClass(scene, "subway-room-door").length, 2);
  assert.equal(byClass(scene, "subway-room-item").length, 0, "no pickup cards");
  assert.equal(
    byClass(scene, "subway-room-person").length,
    state.room.people.length
  );
  const steps = byClass(scene, "subway-plan-step");
  assert.ok(steps.length >= 1, "the plan lists what to do next");
  assert.equal(steps[0].dataset.current, "true");
  const lastStep = byClass(steps[steps.length - 1], "subway-plan-text")[0];
  assert.match(lastStep.textContent, /내려요$/);
  const minimap = byClass(scene, "subway-minimap-box")[0];
  assert.match(minimap.innerHTML, /subway-line/);
  assert.match(minimap.innerHTML, /subway-minimap-here/);
  assert.match(minimap.innerHTML, /subway-dest-star/);
  assert.ok(byClass(scene, "subway-progress-dot").length >= 1);
  assert.equal(byClass(scene, "subway-capsule").length, 1);
  assert.equal(byClass(scene, "subway-collect").length, 1);
  assert.equal(byClass(scene, "subway-space-button").length, 1);
});

test("가야 할 문 쪽으로 깜박이는 화살표가 놓이고 그 문이 강조된다", () => {
  const state = ridingState();
  const scene = renderSubwayJourney(document, state);
  const arrows = byClass(scene, "subway-room-arrow");
  assert.ok(arrows.length >= 1, "a trail of chevrons is drawn");
  const trail = byClass(scene, "subway-room-trail")[0];
  assert.ok(["left", "right"].includes(trail.dataset.direction));
  const glyph = trail.dataset.direction === "right" ? "❯" : "❮";
  for (const arrow of arrows) {
    assert.equal(arrow.textContent, glyph, "chevrons face the target door");
    assert.match(arrow.style.values.get("--room-x"), /%$/);
  }
  const doors = byClass(scene, "subway-room-door");
  const lit = doors.filter(door => door.dataset.go === "true");
  assert.equal(lit.length, 1, "exactly one door is highlighted");
  assert.equal(lit[0].dataset.side, trail.dataset.direction);
});

test("걸어가면 캐릭터 위치와 방향이 갱신된다", () => {
  const state = ridingState();
  const scene = renderSubwayJourney(document, state);
  const startX = byClass(scene, "subway-room-player")[0]
    .style.values.get("--room-x");
  let moved = attemptSubwayMove(state, "left");
  if (moved.event.type === "blocked-person") {
    moved = attemptSubwayMove(moved.state, "left");
  }
  if (moved.event.type === "departed") return;
  updateSubwayJourney(scene, moved.state);
  const player = byClass(scene, "subway-room-player")[0];
  assert.equal(player.dataset.facing, "left");
  assert.notEqual(player.style.values.get("--room-x"), startX);
});

test("환승 통로 방은 게이트 표지와 사람을 그린다", () => {
  const base = ridingState("lake", 5);
  const corridor = {
    ...base,
    phase: "corridor",
    room: buildRoom("corridor", {
      seed: 1,
      station: base.station,
      entrySide: "left"
    })
  };
  const scene = renderSubwayJourney(document, corridor);
  assert.equal(scene.dataset.phase, "corridor");
  assert.equal(byClass(scene, "subway-room")[0].dataset.kind, "corridor");
  assert.equal(byClass(scene, "subway-room-sign")[0].textContent, "환승 게이트");
  assert.match(byClass(scene, "subway-drive-guide")[0].textContent, /게이트/);
});

test("도착 단계는 멜로디 후 문이 열리고 발빠짐 틈과 타이밍 미터를 그린다", () => {
  const base = ridingState();
  const arriving = {
    ...base,
    station: base.place.station,
    phase: "arriving",
    arriving: { stage: "melody", phaseMs: 0 }
  };
  const scene = renderSubwayJourney(document, arriving);
  assert.equal(byClass(scene, "subway-arriving-door")[0].dataset.open, "false");
  assert.equal(byClass(scene, "subway-hop-meter")[0].dataset.active, "false");

  const opened = advanceSubwayWorld(arriving, ARRIVE_MELODY_MS);
  updateSubwayJourney(scene, opened);
  assert.equal(byClass(scene, "subway-arriving-door")[0].dataset.open, "true");
  assert.equal(byClass(scene, "subway-hop-leaf").length, 2);
  const gap = byClass(scene, "subway-hop-gap")[0];
  assert.match(byClass(gap, "subway-hop-gap-label")[0].textContent, /발빠짐/);
  const meter = byClass(scene, "subway-hop-meter")[0];
  assert.equal(meter.dataset.active, "true");
  assert.equal(byClass(meter, "subway-hop-safe").length, 1);
  assert.equal(byClass(meter, "subway-hop-marker").length, 1);
  assert.equal(
    byClass(scene, "subway-arriving-player")[0].dataset.hopping,
    "true"
  );
});

test("도착 화면은 환승·정거장·카드 통계와 친구들을 보여준다", () => {
  const base = ridingState();
  const arrived = {
    ...base,
    phase: "arrived",
    transfersUsed: 2,
    moveCount: 9,
    passengers: [2, 3, 4]
  };
  const scene = renderSubwayJourney(document, base);
  updateSubwayJourney(scene, arrived);
  assert.equal(scene.dataset.phase, "arrived");
  assert.match(
    byClass(scene, "subway-arrived-stats")[0].textContent,
    /환승 2번 · 9정거장 · 친구 3명/
  );
  assert.equal(byClass(scene, "subway-arrived-friends")[0].children.length, 3);
});
