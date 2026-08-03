import test from "node:test";
import assert from "node:assert/strict";
import { createKtxJourney } from "../src/ktx-journey.mjs";
import { renderKtxScene, updateKtxScene } from "../src/ktx-scene.mjs";

class FakeStyle {
  setProperty(name, value) {
    this[name] = String(value);
  }
}

class FakeElement {
  constructor(document, tagName) {
    this.ownerDocument = document;
    this.tagName = tagName.toUpperCase();
    this.className = "";
    this.dataset = {};
    this.style = new FakeStyle();
    this.children = [];
    this.attributes = new Map();
    this.textContent = "";
    this.listeners = new Map();
    this.srcWrites = 0;
  }

  set src(value) {
    this._src = String(value);
    this.srcWrites += 1;
  }

  get src() {
    return new URL(this._src, "https://game.test/").href;
  }

  set innerHTML(markup) {
    this.children = [...markup.matchAll(/class="([^"]+)"/g)].map(match => {
      const child = new FakeElement(this.ownerDocument, "span");
      child.className = match[1];
      return child;
    });
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

  remove() {}

  addEventListener(type, listener) {
    this.listeners.set(type, listener);
  }

  dispatch(type) {
    this.listeners.get(type)?.();
  }

  get classList() {
    return {
      add: name => {
        if (!this.className.split(/\s+/).includes(name)) {
          this.className = `${this.className} ${name}`.trim();
        }
      },
      remove: name => {
        this.className = this.className.split(/\s+/)
          .filter(value => value && value !== name)
          .join(" ");
      }
    };
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const target = selector.trim().split(/\s+/).at(-1);
    const descendants = this.children.flatMap(child => [child, ...child.#descendants()]);
    if (target.startsWith(".")) {
      const className = target.slice(1);
      return descendants.filter(node => node.className.split(/\s+/).includes(className));
    }
    return descendants.filter(node => node.tagName.toLowerCase() === target.toLowerCase());
  }

  #descendants() {
    return this.children.flatMap(child => [child, ...child.#descendants()]);
  }
}

function fakeDocument() {
  const document = {
    createElement(tagName) {
      return new FakeElement(document, tagName);
    },
    createElementNS(_namespace, tagName) {
      return new FakeElement(document, tagName);
    }
  };
  return document;
}

function nodeList(items) {
  return {
    ...items,
    length: items.length,
    forEach: callback => items.forEach(callback),
    [Symbol.iterator]: () => items[Symbol.iterator]()
  };
}

test("운전실과 바깥 뷰는 실사 이미지와 기존 SVG 폴백을 함께 마운트한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "cab");

  assert.ok(root.querySelector(".ktx-real-scene"));
  assert.ok(root.querySelector(".ktx-real-cab-image"));
  assert.ok(root.querySelector(".ktx-real-exterior-image"));
  assert.ok(root.querySelector(".ktx-cab-backdrop"), "기존 폴백 유지");
  assert.ok(root.querySelector(".ktx-side-train"), "기존 폴백 유지");
});

test("장면 갱신은 이미지 노드를 재마운트하지 않고 경로가 바뀔 때만 src를 바꾼다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "cab");
  const cab = root.querySelector(".ktx-real-cab-image");
  const exterior = root.querySelector(".ktx-real-exterior-image");

  updateKtxScene(root, initial, "side");
  assert.equal(root.querySelector(".ktx-real-cab-image"), cab);
  assert.equal(root.querySelector(".ktx-real-exterior-image"), exterior);
  assert.equal(cab.srcWrites, 1, "같은 운전실 경로는 다시 쓰지 않음");
  assert.equal(exterior.srcWrites, 1, "같은 외부 경로는 다시 쓰지 않음");

  const field = { ...initial, phase: "driving", x: 2000 };
  updateKtxScene(root, field, "side");
  assert.equal(root.querySelector(".ktx-real-cab-image"), cab);
  assert.equal(root.querySelector(".ktx-real-exterior-image"), exterior);
  assert.equal(cab.src, "https://game.test/assets/train-realistic/cab-day.webp");
  assert.equal(cab.srcWrites, 1, "같은 주간 운전실 경로는 유지");
  assert.equal(exterior.src,
    "https://game.test/assets/train-realistic/srt-exterior-field.webp");
  assert.equal(exterior.srcWrites, 2, "환경이 바뀐 외부 경로만 갱신");
});

test("실사 이미지 오류는 즉시 SVG 폴백 상태로 전환한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "cab");
  const cab = root.querySelector(".ktx-real-cab-image");

  assert.equal(root.dataset.realistic, "ready");
  cab.dispatch("error");

  assert.equal(cab.dataset.failed, "true");
  assert.equal(root.dataset.realistic, "fallback");
  assert.ok(root.querySelector(".ktx-cab-backdrop"), "운전실 SVG 폴백 유지");
  assert.ok(root.querySelector(".ktx-side-train"), "외부 SVG 폴백 유지");
});

test("브라우저 NodeList처럼 배열 메서드가 없어도 실사 상태를 갱신한다", () => {
  const state = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), state, "cab");
  const querySelectorAll = root.querySelectorAll.bind(root);
  root.querySelectorAll = selector => selector === ".ktx-real-scene img"
    ? nodeList(querySelectorAll(selector))
    : querySelectorAll(selector);

  assert.doesNotThrow(() => updateKtxScene(root, state, "cab"));
  assert.equal(root.dataset.realistic, "ready");
});
