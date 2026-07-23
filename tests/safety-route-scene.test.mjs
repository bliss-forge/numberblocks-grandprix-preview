import test from "node:test";
import assert from "node:assert/strict";
import { createSafetyRouteState } from "../src/safety-route-model.mjs";
import { renderSafetyRouteScene } from "../src/safety-route-scene.mjs";

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
    node.className.split(/\s+/).includes(className)
  );
}

test("길찾기 장면은 목표, 수집 행렬, 지도와 네 방향 버튼을 만든다", () => {
  const scene = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy")
  );

  assert.equal(scene.className, "safety-route");
  assert.equal(byClass(scene, "safety-grid").length, 1);
  assert.equal(byClass(scene, "safety-goal").length, 1);
  assert.match(byClass(scene, "safety-goal")[0].textContent, /2 친구/);
  assert.equal(byClass(scene, "route-player").length, 1);
  assert.equal(byClass(scene, "route-player")[0].dataset.number, "1");
  assert.equal(byClass(scene, "route-friend").length, 9);

  const directions = descendants(scene)
    .filter(node => node.dataset.routeDirection)
    .map(node => node.dataset.routeDirection)
    .sort();
  assert.deepEqual(directions, ["down", "left", "right", "up"]);
});

test("만난 친구는 지도에서 사라지고 상단 행렬에 표시된다", () => {
  const state = {
    ...createSafetyRouteState("easy"),
    collected: [1, 2, 3],
    nextFriend: 4
  };
  const scene = renderSafetyRouteScene(document, state);

  const mapNumbers = byClass(scene, "route-friend")
    .map(node => Number(node.dataset.number))
    .sort((a, b) => a - b);
  const collectedNumbers = byClass(scene, "collected-friend")
    .map(node => Number(node.dataset.number));

  assert.deepEqual(mapNumbers, [4, 5, 6, 7, 8, 9, 10]);
  assert.deepEqual(collectedNumbers, [1, 2, 3]);
});

test("난이도별 장애물과 움직이는 교통 요소를 장면에 표시한다", () => {
  const steady = renderSafetyRouteScene(
    document,
    createSafetyRouteState("steady")
  );
  assert.equal(byClass(steady, "route-manhole").length, 1);
  assert.equal(byClass(steady, "route-construction").length, 1);
  assert.equal(byClass(steady, "route-scooter").length, 1);

  const challenge = renderSafetyRouteScene(
    document,
    createSafetyRouteState("challenge")
  );
  assert.equal(byClass(challenge, "route-bicycle").length, 1);
  assert.equal(byClass(challenge, "route-car").length, 1);
});

test("초록불과 빨간불 상태를 색 외의 데이터로도 표시한다", () => {
  const red = renderSafetyRouteScene(
    document,
    createSafetyRouteState("easy")
  );
  assert.equal(byClass(red, "route-signal")[0].dataset.signal, "red");

  const green = renderSafetyRouteScene(
    document,
    { ...createSafetyRouteState("easy"), signal: "green" }
  );
  assert.equal(byClass(green, "route-signal")[0].dataset.signal, "green");
});

