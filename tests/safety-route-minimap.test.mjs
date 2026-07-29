import test from "node:test";
import assert from "node:assert/strict";
import { createSafetyRouteState } from "../src/safety-route-model.mjs";
import { renderMinimap, updateMinimap } from "../src/safety-route-minimap.mjs";

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
  }

  append(...children) {
    this.children.push(...children);
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
  }
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
    node.className.split(/\s+/).includes(className)
  );
}

test("미니맵은 위치·다음 친구·학교·신호를 표시한다", () => {
  const state = createSafetyRouteState("easy", { seed: 2 });
  const node = renderMinimap(document, state);
  assert.equal(byClass(node, "route-minimap-zone").length, 3);
  assert.equal(byClass(node, "route-minimap-band").length, 4);
  const player = byClass(node, "route-minimap-player")[0];
  assert.equal(
    player.style.values.get("--mini-x"),
    String((state.position.x / state.map.width) * 100)
  );
  assert.equal(
    player.style.values.get("--mini-y"),
    String((state.position.y / state.map.height) * 100)
  );
  const target = byClass(node, "route-minimap-target")[0];
  const friend2 = state.map.friends.find(friend => friend.number === 2);
  assert.equal(
    target.style.values.get("--mini-x"),
    String((friend2.x / state.map.width) * 100)
  );
  assert.equal(byClass(node, "route-minimap-school").length, 1);
  assert.equal(
    byClass(node, "route-minimap-signal")[0].dataset.phase,
    state.signal.phase
  );
});

test("updateMinimap은 위치·다음 친구·신호를 갱신한다", () => {
  const state = createSafetyRouteState("easy", { seed: 2 });
  const node = renderMinimap(document, state);
  const moved = {
    ...state,
    position: { x: 9, y: 4 },
    nextFriend: 4,
    signal: { phase: "pedestrian-go", elapsedMs: 0 }
  };
  updateMinimap(node, moved);
  const friend4 = moved.map.friends.find(friend => friend.number === 4);
  assert.equal(
    byClass(node, "route-minimap-target")[0].style.values.get("--mini-x"),
    String((friend4.x / moved.map.width) * 100)
  );
  assert.equal(
    byClass(node, "route-minimap-player")[0].style.values.get("--mini-x"),
    String((9 / moved.map.width) * 100)
  );
  assert.equal(
    byClass(node, "route-minimap-signal")[0].dataset.phase,
    "pedestrian-go"
  );
});

test("친구를 모두 만나면 미니맵 타깃은 학교를 가리킨다", () => {
  const state = createSafetyRouteState("easy", { seed: 2 });
  const node = renderMinimap(document, state);
  updateMinimap(node, { ...state, nextFriend: 11 });
  assert.equal(
    byClass(node, "route-minimap-target")[0].style.values.get("--mini-x"),
    String((state.map.goal.x / state.map.width) * 100)
  );
});
