import test from "node:test";
import assert from "node:assert/strict";
import {
  ARRIVE_MELODY_MS,
  TRAIN_APPROACH_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
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

  classList = { add: () => {}, remove: () => {} };

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

function boardedState(placeId = "hanriver", seed = 3) {
  let state = createSubwayJourney(placeId, seed);
  if (state.phase === "gate") {
    state = chooseSubwayLine(state, gateLines(state)[0]).state;
  }
  state = advanceSubwayWorld(state, TRAIN_APPROACH_MS);
  return attemptSubwayMove(state, "up").state;
}

test("목적지 선택 화면은 숫자키 카드 10장과 권장 환승 칩을 그린다", () => {
  const picker = renderSubwayPicker(document, subwayDestinations());
  const cards = byClass(picker, "subway-place-card");
  assert.equal(cards.length, 10);
  assert.deepEqual(
    byClass(picker, "subway-place-key").map(node => node.textContent),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
  );
  for (const chip of byClass(picker, "subway-transfer-chip")) {
    assert.match(chip.textContent, /^권장: /);
  }
});

test("게이트 화면은 역명판과 호선 선택 버튼을 그린다", () => {
  let gate = null;
  for (let seed = 0; seed < 30 && !gate; seed += 1) {
    const journey = createSubwayJourney("lake", seed);
    if (journey.phase === "gate") gate = journey;
  }
  assert.ok(gate);
  const scene = renderSubwayJourney(document, gate);
  assert.equal(scene.dataset.phase, "gate");
  const buttons = byClass(scene, "subway-gate-line");
  assert.equal(buttons.length, gateLines(gate).length);
  for (const button of buttons) {
    assert.ok(button.dataset.lineNumber);
  }
});

test("탑승 장면은 전체 노선도, 나침반, 양방향 캡슐, 환승 힌트를 그린다", () => {
  const state = boardedState();
  const scene = renderSubwayJourney(document, state);
  assert.equal(scene.dataset.phase, "ride");
  const canvas = byClass(scene, "subway-map-canvas")[0];
  assert.match(canvas.innerHTML, /subway-line/);
  assert.match(canvas.innerHTML, /subway-map-river/);
  assert.match(canvas.innerHTML, /subway-dest-star/);
  const marker = byClass(scene, "subway-map-player")[0];
  assert.match(marker.style.values.get("--map-x"), /%$/);
  const guide = byClass(scene, "subway-drive-guide")[0];
  assert.match(guide.textContent, /(추천|환승|내려요)/);
  assert.equal(byClass(scene, "subway-capsule").length, 1);
  assert.equal(byClass(scene, "subway-space-hint").length, 1);
  assert.equal(byClass(scene, "subway-passenger-strip")[0].dataset.count, "0");
  assert.equal(byClass(scene, "subway-space-button").length, 1);
});

test("운전으로 역이 바뀌면 지도와 캡슐이 갱신된다", () => {
  const state = boardedState();
  const scene = renderSubwayJourney(document, state);
  const compass = subwayCompass(state);
  if (compass.arrived || compass.transferHere) return;
  const targets = byClass(scene, "subway-capsule-name")[0].textContent;
  assert.equal(targets, state.station);
  const moved = attemptSubwayMove(state, compass.direction);
  if (moved.event.type !== "drove") return;
  updateSubwayJourney(scene, moved.state);
  assert.equal(
    byClass(scene, "subway-capsule-name")[0].textContent,
    moved.state.station
  );
});

test("도착 단계는 멜로디 후 문이 열리고 빈 칸·사람 칸을 구분해 그린다", () => {
  const base = boardedState();
  const arriving = {
    ...base,
    station: base.place.station,
    phase: "arriving",
    arriving: { stage: "melody", phaseMs: 0, dodge: null }
  };
  const scene = renderSubwayJourney(document, arriving);
  assert.equal(scene.dataset.phase, "arriving");
  assert.equal(
    byClass(scene, "subway-arriving-door")[0].dataset.open,
    "false"
  );

  const opened = advanceSubwayWorld(arriving, ARRIVE_MELODY_MS);
  updateSubwayJourney(scene, opened);
  const door = byClass(scene, "subway-arriving-door")[0];
  assert.equal(door.dataset.open, "true");
  const lanes = byClass(scene, "subway-door-lane");
  assert.equal(lanes.length, 3);
  assert.ok(lanes.some(lane => lane.dataset.blocked === "true"));
  assert.ok(lanes.some(lane => lane.dataset.blocked === "false"));
});

test("환승·도착 화면 전환과 도착 통계를 그린다", () => {
  const base = boardedState();
  const scene = renderSubwayJourney(document, base);
  const transferring = {
    ...base,
    phase: "transferring",
    transferring: { stage: "exit", phaseMs: 0 }
  };
  updateSubwayJourney(scene, transferring);
  assert.equal(scene.dataset.phase, "transferring");
  assert.equal(byClass(scene, "subway-corridor").length, 1);

  const arrived = {
    ...base,
    phase: "arrived",
    transfersUsed: 2,
    moveCount: 9,
    passengers: [2, 3, 4]
  };
  updateSubwayJourney(scene, arrived);
  assert.equal(scene.dataset.phase, "arrived");
  assert.match(
    byClass(scene, "subway-arrived-stats")[0].textContent,
    /환승 2번 · 9정거장/
  );
  assert.equal(byClass(scene, "subway-arrived-friends")[0].children.length, 3);
});
