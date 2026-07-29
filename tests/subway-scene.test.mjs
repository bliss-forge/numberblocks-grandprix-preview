import test from "node:test";
import assert from "node:assert/strict";
import {
  TRAIN_APPROACH_MS,
  advanceSubwayWorld,
  attemptSubwayMove,
  createSubwayJourney,
  currentLeg,
  currentTrain
} from "../src/subway-journey.mjs";
import {
  renderSubwayJourney,
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

function boardedState(seed = 3) {
  let state = advanceSubwayWorld(
    createSubwayJourney("easy", seed),
    TRAIN_APPROACH_MS
  );
  for (let guard = 0; guard < 40; guard += 1) {
    if (state.platform.stage === "stopped" &&
      currentTrain(state).line === currentLeg(state).line) {
      return attemptSubwayMove(state, "up").state;
    }
    state = advanceSubwayWorld(state, 200);
  }
  throw new Error("boarding failed");
}

test("승강장 장면은 역명판, 목표 호선 뱃지, 열차와 이동 패드를 그린다", () => {
  const state = createSubwayJourney("easy", 3);
  const scene = renderSubwayJourney(document, state);
  assert.equal(scene.dataset.phase, "platform");
  assert.match(
    byClass(scene, "subway-station-sign")[0].textContent,
    /역$/
  );
  assert.equal(byClass(scene, "subway-line-badge").length, 1);
  const train = byClass(scene, "subway-train")[0];
  assert.match(train.innerHTML, /route-art-subway/);
  assert.equal(train.dataset.stage, "approaching");
  assert.equal(byClass(scene, "route-pad").length, 1);
  const mission = byClass(scene, "subway-mission")[0];
  assert.match(mission.textContent, /에 가요!/);
});

test("탑승 장면은 노선도와 플레이어 점, 문 상태를 그리고 갱신한다", () => {
  const state = boardedState(3);
  const scene = renderSubwayJourney(document, state);
  assert.equal(scene.dataset.phase, "ride");
  const map = byClass(scene, "subway-map")[0];
  assert.match(map.innerHTML, /subway-line/);
  assert.match(map.innerHTML, /subway-station-dot/);
  const marker = byClass(scene, "subway-map-player")[0];
  assert.match(marker.style.values.get("--map-x"), /%$/);
  const door = byClass(scene, "subway-door-state")[0];
  assert.equal(door.dataset.open, "false");

  const arrivedAtStop = advanceSubwayWorld(state, 2200);
  updateSubwayJourney(scene, arrivedAtStop);
  assert.equal(scene.dataset.phase, "ride");
});

test("단계가 바뀌면 장면을 다시 세워 환승·도착을 표현한다", () => {
  const steady = createSubwayJourney("steady", 5);
  const scene = renderSubwayJourney(document, steady);
  const transferState = { ...steady, phase: "transfer", legIndex: 1, ride: null };
  updateSubwayJourney(scene, transferState);
  assert.equal(scene.dataset.phase, "transfer");
  assert.match(
    byClass(scene, "subway-transfer-text")[0].textContent,
    /호선으로 갈아타요/
  );

  const arrivedState = { ...steady, phase: "arrived", ride: null };
  updateSubwayJourney(scene, arrivedState);
  assert.equal(scene.dataset.phase, "arrived");
  assert.equal(
    byClass(scene, "subway-place-icon")[0].textContent,
    steady.place.icon
  );
  assert.equal(byClass(scene, "subway-arrived-player").length, 1);
});
