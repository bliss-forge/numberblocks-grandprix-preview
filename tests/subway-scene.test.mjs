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

function ridingState(placeId = "hanriver", seed = 3) {
  const journey = createSubwayJourney(placeId, seed);
  const atGate = walkTo(journey, journey.room.gateX);
  const tapped = attemptSubwayMove(atGate, "up").state;
  const platform = chooseSubwayLine(tapped, gateLines(tapped)[0]).state;
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
    assert.match(chip.textContent, /^권장: /);
  }
});

test("개찰구 방은 카드 단말기와 캐릭터를 그리고 찍기 전에는 호선 카드를 숨긴다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  const scene = renderSubwayJourney(document, journey);
  assert.equal(scene.dataset.phase, "gate");
  const room = byClass(scene, "subway-room")[0];
  assert.equal(room.dataset.kind, "gate");
  const gate = byClass(scene, "subway-room-gate")[0];
  assert.equal(gate.dataset.tapped, "false");
  assert.match(gate.style.values.get("--room-x"), /%$/);
  assert.equal(byClass(scene, "subway-room-player").length, 1);
  assert.equal(byClass(scene, "subway-gate-lines")[0].dataset.open, "false");
  assert.equal(byClass(scene, "subway-gate-line").length, 0);
  assert.match(byClass(scene, "subway-drive-guide")[0].textContent, /카드/);
});

test("카드를 찍으면 호선 선택 버튼이 열린다", () => {
  const journey = createSubwayJourney("hanriver", 3);
  const scene = renderSubwayJourney(document, journey);
  const atGate = walkTo(journey, journey.room.gateX);
  const tapped = attemptSubwayMove(atGate, "up").state;
  updateSubwayJourney(scene, tapped);
  assert.equal(byClass(scene, "subway-gate-lines")[0].dataset.open, "true");
  const buttons = byClass(scene, "subway-gate-line");
  assert.equal(buttons.length, gateLines(tapped).length);
  for (const button of buttons) {
    assert.ok(button.dataset.lineNumber);
  }
  assert.equal(byClass(scene, "subway-room-gate")[0].dataset.tapped, "true");
});

test("개찰구는 목적지 방향 호선을 별로 추천해 같은 실수를 반복하지 않게 한다", () => {
  let gateWithChoices = null;
  for (let seed = 0; seed < 40 && !gateWithChoices; seed += 1) {
    const journey = createSubwayJourney("lake", seed);
    if (gateLines(journey).length >= 2) gateWithChoices = journey;
  }
  assert.ok(gateWithChoices, "a multi-line gate start exists");
  const atGate = walkTo(gateWithChoices, gateWithChoices.room.gateX);
  const tapped = attemptSubwayMove(atGate, "up").state;
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
    new RegExp(`${recommended}호선`)
  );
});

test("열차 안 방은 창문·문·사람·카드와 진행도·미니맵을 함께 그린다", () => {
  const state = ridingState();
  const scene = renderSubwayJourney(document, state);
  assert.equal(scene.dataset.phase, "ride");
  const room = byClass(scene, "subway-room")[0];
  assert.equal(room.dataset.kind, "train");
  assert.equal(byClass(scene, "subway-room-window").length, 4);
  assert.equal(byClass(scene, "subway-room-door").length, 2);
  assert.equal(
    byClass(scene, "subway-room-person").length,
    state.room.people.length
  );
  assert.equal(
    byClass(scene, "subway-room-item").length,
    state.room.items.length
  );
  const minimap = byClass(scene, "subway-minimap-box")[0];
  assert.match(minimap.innerHTML, /subway-line/);
  assert.match(minimap.innerHTML, /subway-minimap-here/);
  assert.match(minimap.innerHTML, /subway-dest-star/);
  assert.ok(byClass(scene, "subway-progress-dot").length >= 1);
  assert.equal(byClass(scene, "subway-capsule").length, 1);
  assert.equal(byClass(scene, "subway-collect").length, 1);
  assert.equal(byClass(scene, "subway-space-button").length, 1);
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

test("도착 단계는 멜로디 후 문이 열리고 빈 칸·사람 칸을 구분해 그린다", () => {
  const base = ridingState();
  const arriving = {
    ...base,
    station: base.place.station,
    phase: "arriving",
    arriving: { stage: "melody", phaseMs: 0, dodge: null }
  };
  const scene = renderSubwayJourney(document, arriving);
  assert.equal(byClass(scene, "subway-arriving-door")[0].dataset.open, "false");

  const opened = advanceSubwayWorld(arriving, ARRIVE_MELODY_MS);
  updateSubwayJourney(scene, opened);
  const lanes = byClass(scene, "subway-door-lane");
  assert.equal(lanes.length, 3);
  assert.ok(lanes.some(lane => lane.dataset.blocked === "true"));
  assert.ok(lanes.some(lane => lane.dataset.blocked === "false"));
});

test("도착 화면은 환승·정거장·카드 통계와 친구들을 보여준다", () => {
  const base = ridingState();
  const arrived = {
    ...base,
    phase: "arrived",
    transfersUsed: 2,
    moveCount: 9,
    cards: [3, 5],
    passengers: [2, 3, 4]
  };
  const scene = renderSubwayJourney(document, base);
  updateSubwayJourney(scene, arrived);
  assert.equal(scene.dataset.phase, "arrived");
  assert.match(
    byClass(scene, "subway-arrived-stats")[0].textContent,
    /환승 2번 · 9정거장 · 🎫 2장/
  );
  assert.equal(byClass(scene, "subway-arrived-friends")[0].children.length, 3);
});
