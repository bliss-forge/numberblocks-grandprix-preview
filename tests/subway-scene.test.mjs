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
  requiredDirection,
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

function boardedState(seed = 3) {
  let state = advanceSubwayWorld(
    createSubwayJourney("hanriver", seed),
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

test("목적지 선택 화면은 숫자키 카드 10장과 환승 난이도 칩을 그린다", () => {
  const picker = renderSubwayPicker(document, subwayDestinations());
  const cards = byClass(picker, "subway-place-card");
  assert.equal(cards.length, 10);
  assert.deepEqual(
    byClass(picker, "subway-place-key").map(node => node.textContent),
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"]
  );
  const chips = byClass(picker, "subway-transfer-chip");
  assert.equal(chips.length, 10);
  for (const chip of chips) {
    assert.match(chip.textContent, /^(바로 가요|🚶 1번 갈아타요|🚶🚶 2번 갈아타요)$/);
  }
  for (const card of cards) {
    assert.ok(card.dataset.placeId, "card carries place id");
  }
});

test("탑승 장면은 하단 역 캡슐에 이전·현재·다음 역을 보여준다", () => {
  const state = boardedState(3);
  const scene = renderSubwayJourney(document, state);
  assert.equal(byClass(scene, "subway-capsule").length, 1);
  assert.equal(byClass(scene, "subway-capsule-prev")[0].textContent, "출발");
  assert.ok(byClass(scene, "subway-capsule-name")[0].textContent.length > 0);
  assert.match(
    byClass(scene, "subway-capsule-remaining")[0].textContent,
    /정거장|내려요/
  );
  assert.match(byClass(scene, "subway-map")[0].innerHTML, /subway-map-river/);
});

test("승강장 장면은 역명판, 목표 호선 뱃지, 열차와 이동 패드를 그린다", () => {
  const state = createSubwayJourney("hanriver", 3);
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

test("탑승 장면은 노선도, 운전 안내와 친구 스트립을 그리고 갱신한다", () => {
  const state = boardedState(3);
  const scene = renderSubwayJourney(document, state);
  assert.equal(scene.dataset.phase, "ride");
  const map = byClass(scene, "subway-map")[0];
  assert.match(map.innerHTML, /subway-line/);
  assert.match(map.innerHTML, /subway-station-dot/);
  const marker = byClass(scene, "subway-map-player")[0];
  assert.match(marker.style.values.get("--map-x"), /%$/);
  const guide = byClass(scene, "subway-drive-guide")[0];
  assert.match(guide.textContent, /(쪽으로 운전해요|↓ 키로 내려요)/);
  const strip = byClass(scene, "subway-passenger-strip")[0];
  assert.equal(strip.dataset.count, "0");

  const driven = attemptSubwayMove(state, requiredDirection(state));
  updateSubwayJourney(scene, driven.state);
  assert.equal(scene.dataset.phase, "ride");
});

test("단계가 바뀌면 장면을 다시 세워 환승·도착을 표현한다", () => {
  const steady = createSubwayJourney("zoo", 5);
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
