import test from "node:test";
import assert from "node:assert/strict";
import { createKtxJourney, distanceToMarker } from "../src/ktx-journey.mjs";
import { renderKtxScene, updateKtxScene } from "../src/ktx-scene.mjs";
import { updateRealisticMotionScene } from "../src/ktx-realistic-motion-scene.mjs";

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
    this._innerHTML = String(markup);
    this.children = [...markup.matchAll(/class="([^"]+)"/g)].map(match => {
      const child = new FakeElement(this.ownerDocument, "span");
      child.className = match[1];
      return child;
    });
  }

  get innerHTML() {
    return this._innerHTML ?? "";
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
    if (selector === ".ktx-real-scene img") {
      const scenes = descendants.filter(node =>
        node.className.split(/\s+/).includes("ktx-real-scene")
      );
      return scenes.flatMap(scene => scene.#descendants())
        .filter(node => node.tagName === "IMG");
    }
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
    createdElements: [],
    createElement(tagName) {
      const element = new FakeElement(document, tagName);
      document.createdElements.push(element);
      return element;
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

test("SRT는 분리 실사 모션 리그와 정적 폴백을 함께 마운트한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "side");

  assert.ok(root.querySelector(".ktx-motion-scene"));
  assert.equal(root.querySelectorAll(".ktx-motion-plate").length, 2);
  assert.ok(root.querySelector(".ktx-motion-track"));
  assert.ok(root.querySelector(".ktx-motion-near"));
  assert.ok(root.querySelector(".ktx-motion-train"));
  assert.ok(root.querySelector(".ktx-motion-cab-frame"));
  assert.ok(root.querySelector(".ktx-motion-station"));
  assert.ok(root.querySelector(".ktx-real-exterior-image"), "정적 실사 폴백 유지");
});

test("KTX는 분리 실사 모션 리그와 모션 자산 요청을 만들지 않는다", () => {
  const document = fakeDocument();
  const root = renderKtxScene(document, createKtxJourney(3, "ktx"), "side");

  assert.equal(root.querySelector(".ktx-motion-scene"), null);
  assert.equal(document.createdElements.some(element =>
    element.tagName === "IMG" &&
    element.src.includes("/assets/train-realistic/motion/")), false);
  assert.equal(root.dataset.motionRealistic, "fallback");
});

function loadMotionSideAssets(root) {
  root.querySelectorAll(".ktx-motion-plate").forEach(plate => plate.dispatch("load"));
  root.querySelector(".ktx-motion-station").dispatch("load");
  root.querySelector(".ktx-motion-train").dispatch("load");
}

test("현재 바깥 뷰 필수 모션 자산이 모두 로드된 뒤에만 ready가 된다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "side");
  const plates = root.querySelectorAll(".ktx-motion-plate");

  assert.equal(root.dataset.motionRealistic, "pending");
  plates[0].dispatch("load");
  plates[1].dispatch("load");
  root.querySelector(".ktx-motion-station").dispatch("load");
  assert.equal(root.dataset.motionRealistic, "pending", "열차가 남으면 대기");
  root.querySelector(".ktx-motion-train").dispatch("load");
  assert.equal(root.dataset.motionRealistic, "ready");
  assert.equal(plates[0].dataset.active, "true");
  assert.equal(plates[1].dataset.active, "false", "두 번째 슬롯은 선로드 전용");
  assert.equal(plates[1].hidden, true, "교차 전환 전에는 비활성 장면을 표시하지 않음");
});

test("필수 모션 플레이트 오류는 정적 실사 상태를 보존한 채 폴백한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "side");
  root.querySelector(".ktx-real-cab-image").dispatch("load");
  root.querySelector(".ktx-real-exterior-image").dispatch("load");
  assert.equal(root.dataset.realistic, "ready");

  root.querySelectorAll(".ktx-motion-plate")[0].dispatch("error");

  assert.equal(root.dataset.motionRealistic, "fallback");
  assert.equal(root.dataset.realistic, "ready", "정상 정적 실사 폴백 상태는 변경하지 않음");
  assert.ok(root.querySelector(".ktx-side-train"), "최종 SVG 폴백도 유지");
});

test("환경 변경은 활성·비활성 플레이트를 모두 선로드한 뒤 교체한다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  const plates = root.querySelectorAll(".ktx-motion-plate");
  loadMotionSideAssets(root);
  assert.equal(root.dataset.motionRealistic, "ready");

  const field = { ...initial, phase: "driving", x: 2000, v: 80 };
  updateKtxScene(root, field, "side");

  assert.equal(root.dataset.motionRealistic, "pending");
  assert.ok(plates[0].src.endsWith("/city-a.webp"), "선로드 중 현재 장면 유지");
  assert.ok(plates[1].src.endsWith("/city-b.webp"), "비활성 현재 장면도 유지");
  const fieldPreloads = document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));
  assert.equal(fieldPreloads.length, 2, "다음 활성 장면과 비활성 장면을 함께 선로드");

  fieldPreloads[0].dispatch("load");
  assert.equal(root.dataset.motionRealistic, "pending", "한 장만 준비되면 교체하지 않음");
  assert.ok(plates[0].src.endsWith("/city-a.webp"));
  fieldPreloads[1].dispatch("load");

  assert.equal(root.dataset.motionRealistic, "ready");
  assert.ok(plates[0].src.endsWith("/field-a.webp"));
  assert.ok(plates[1].src.endsWith("/field-b.webp"));
});

test("새 환경 대기 중 무관한 고정 프레임 로드는 pending을 해제하지 않는다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  assert.equal(root.dataset.motionRealistic, "ready");

  const field = { ...initial, phase: "driving", x: 2000, v: 80 };
  updateKtxScene(root, field, "side");
  assert.equal(root.dataset.motionRealistic, "pending");

  root.querySelector(".ktx-motion-cab-frame").dispatch("load");

  assert.equal(root.dataset.motionRealistic, "pending",
    "요청한 field 플레이트가 끝나기 전 city 준비 상태로 돌아가지 않음");
});

test("로드된 환경으로 복귀하거나 재진입하면 중복 선로드하지 않는다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const field = { ...initial, phase: "driving", x: 2000, v: 80 };

  updateKtxScene(root, field, "side");
  const fieldPreloads = document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));
  fieldPreloads.forEach(image => image.dispatch("load"));
  assert.equal(root.dataset.motionRealistic, "ready");

  updateKtxScene(root, initial, "side");
  assert.equal(root.dataset.motionRealistic, "ready");
  assert.ok(root.querySelectorAll(".ktx-motion-plate")[0].src.endsWith("/city-a.webp"));
  updateKtxScene(root, field, "side");

  const afterReturn = document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/(city|field)-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));
  assert.equal(afterReturn.length, 2, "두 환경 모두 캐시되어 새 선로드 없음");
  assert.equal(root.dataset.motionRealistic, "ready");
});

test("실패한 환경은 정상 환경 복귀 후 다시 선로드할 수 있다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const field = { ...initial, phase: "driving", x: 2000, v: 80 };

  updateKtxScene(root, field, "side");
  let attempts = document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));
  attempts[0].dispatch("error");
  assert.equal(root.dataset.motionRealistic, "fallback");

  updateKtxScene(root, initial, "side");
  assert.equal(root.dataset.motionRealistic, "ready");
  updateKtxScene(root, field, "side");
  attempts = document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));
  assert.equal(attempts.length, 4, "실패한 두 장을 새 이미지 요청으로 재시도");
  attempts.slice(-2).forEach(image => image.dispatch("load"));
  assert.equal(root.dataset.motionRealistic, "ready");
});

test("실패 환경은 같은 밴드에서 고정되고 정상 환경을 거친 뒤 한 번만 재시도한다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const field = { ...initial, phase: "driving", x: 2000, v: 80 };
  const fieldPreloads = () => document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));

  updateKtxScene(root, field, "side");
  assert.equal(fieldPreloads().length, 2);
  fieldPreloads()[0].dispatch("error");
  assert.equal(root.dataset.motionRealistic, "fallback");

  updateKtxScene(root, field, "side");
  assert.equal(fieldPreloads().length, 2, "같은 실패 밴드는 즉시 다시 요청하지 않음");
  assert.equal(root.dataset.motionRealistic, "fallback");

  updateKtxScene(root, initial, "side");
  assert.equal(root.dataset.motionRealistic, "ready");
  updateKtxScene(root, field, "side");

  assert.equal(fieldPreloads().length, 4, "정상 city를 거친 뒤 새 두 장만 재시도");
  assert.equal(root.dataset.motionRealistic, "pending");
});

test("늦게 ready가 된 정상 환경도 실패 환경 재시도를 다시 허용한다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  const field = { ...initial, phase: "driving", x: 2000, v: 80 };
  const fieldPreloads = () => document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));

  assert.equal(root.dataset.motionRealistic, "pending", "city가 아직 로드되지 않음");
  updateKtxScene(root, field, "side");
  assert.equal(fieldPreloads().length, 2);
  fieldPreloads()[0].dispatch("error");
  assert.equal(root.dataset.motionRealistic, "fallback");

  updateKtxScene(root, initial, "side");
  assert.equal(root.dataset.motionRealistic, "pending");
  loadMotionSideAssets(root);
  assert.equal(root.dataset.motionRealistic, "ready", "돌아온 city가 뒤늦게 준비됨");

  updateKtxScene(root, field, "side");

  assert.equal(fieldPreloads().length, 4, "field에 정확히 한 쌍의 재시도 요청 추가");
  assert.equal(root.dataset.motionRealistic, "pending");
});

test("환경 선로드 중 원래 장면으로 돌아오면 늦은 요청이 화면을 덮지 않는다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const field = { ...initial, phase: "driving", x: 2000, v: 80 };

  updateKtxScene(root, field, "side");
  const stalePreloads = document.createdElements.filter(element =>
    element.tagName === "IMG" && /\/field-[ab]\.webp$/.test(element.src) &&
    !element.className.includes("ktx-motion-plate"));
  assert.equal(stalePreloads.length, 2);

  updateKtxScene(root, initial, "side");
  assert.equal(root.dataset.motionRealistic, "ready");
  stalePreloads.forEach(image => image.dispatch("load"));

  const plates = root.querySelectorAll(".ktx-motion-plate");
  assert.ok(plates[0].src.endsWith("/city-a.webp"));
  assert.ok(plates[1].src.endsWith("/city-b.webp"));
  assert.equal(root.querySelector(".ktx-motion-scene").dataset.land, "city");
});

test("뷰가 바뀌면 그 뷰의 고정 프레임 준비 상태를 사용한다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  loadMotionSideAssets(root);
  assert.equal(root.dataset.motionRealistic, "ready");

  updateKtxScene(root, initial, "cab");
  assert.equal(root.dataset.motionRealistic, "pending", "운전실 프레임이 아직 로드 전");
  root.querySelector(".ktx-motion-cab-frame").dispatch("load");
  assert.equal(root.dataset.motionRealistic, "ready");
});

test("모션 리그 갱신은 실제 속도·단계·환경·마커 거리를 모델에 전달한다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  const markerX = distanceToMarker(initial) + initial.x;
  const stopping = {
    ...initial,
    phase: "stopping",
    x: markerX - 100,
    v: 240
  };

  updateKtxScene(root, stopping, "side");
  const scene = root.querySelector(".ktx-motion-scene");

  assert.equal(scene.dataset.speedBand, "very-fast");
  assert.equal(scene.dataset.stationStage, "detail");
  assert.equal(scene.dataset.moving, "true");
  assert.equal(scene.dataset.land, root.dataset.land);
});

test("실사 외부 모션은 위치·속도를 정확한 CSS 변수로 동기화한다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  const moving = { ...initial, phase: "driving", x: 2000, v: 240 };

  updateRealisticMotionScene(root, moving, { land: "city" });
  const scene = root.querySelector(".ktx-motion-scene");

  assert.equal(scene.style["--motion-scene-x"], "-120px");
  assert.equal(scene.style["--motion-near-x"], "-1700px");
  assert.equal(scene.style["--motion-track-x"], "-2000px");
  assert.equal(scene.style["--motion-speed"], "0.8");
  assert.ok(Number.parseFloat(scene.style["--motion-blur"]) > 0);
  assert.equal(scene.dataset.motionMoving, "true");
});

test("정차한 실사 외부 모션은 모든 보간 효과를 즉시 멈춘다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  const stopped = { ...initial, phase: "stopped", x: 2000, v: 0 };

  updateRealisticMotionScene(root, stopped, { land: "city" });
  const scene = root.querySelector(".ktx-motion-scene");

  assert.equal(scene.dataset.motionMoving, "false");
  assert.equal(scene.style["--motion-speed"], "0");
  assert.equal(scene.style["--motion-blur"], "0px");
  assert.equal(scene.style["--motion-brake-pitch"], "0");
});

test("고속 진동은 160km/h 위에서만 생기고 1.5px를 넘지 않는다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  const scene = root.querySelector(".ktx-motion-scene");

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 2000, v: 160 }, { land: "city" });
  assert.equal(scene.style["--motion-vibration-y"], "0px");

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 2000, v: 300 }, { land: "city" });
  const vibration = Math.abs(Number.parseFloat(scene.style["--motion-vibration-y"]));
  assert.ok(vibration > 0);
  assert.ok(vibration <= 1.5);

  updateRealisticMotionScene(root,
    { ...initial, phase: "stopping", x: 2000, v: 240 }, { land: "city" });
  assert.ok(Number.parseFloat(scene.style["--motion-brake-pitch"]) > 0);
});

test("사진 팬은 큰 주행 위치에서도 안전 크롭 범위 안에 머문다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");

  for (const x of [0, 2000, 20_000, 200_000]) {
    updateRealisticMotionScene(root,
      { ...initial, phase: "driving", x, v: 240 }, { land: "city" });
    const pan = Number.parseFloat(
      root.querySelector(".ktx-motion-scene").style["--motion-scene-x"]
    );
    assert.ok(pan >= -120 && pan <= 120, `${x}m의 팬 ${pan}px가 안전 범위 안`);
  }
});

test("주행 위치가 플레이트 구간을 넘으면 준비된 다음 완성 장면으로 교차한다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  loadMotionSideAssets(root);
  const plates = root.querySelectorAll(".ktx-motion-plate");

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 4500, v: 240 }, { land: "city" });

  assert.equal(plates[0].dataset.active, "false");
  assert.equal(plates[1].dataset.active, "true");
  assert.equal(plates[0].hidden, false, "이전 완성 장면은 교차 페이드 동안만 함께 마운트");
  assert.equal(plates[1].hidden, false);
  assert.ok(Number.parseFloat(
    root.querySelector(".ktx-motion-scene").style["--motion-crossfade-ms"]
  ) >= 450);
});

test("다음 플레이트는 비활성 슬롯 교체 전에 별도 이미지로 선로드된다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 4500, v: 240 }, { land: "city" });
  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 5000, v: 240 }, { land: "city" });

  const preload = document.createdElements.find(element =>
    element.tagName === "IMG" &&
    element.src.endsWith("/assets/train-realistic/motion/city-c.webp") &&
    !element.className.includes("ktx-motion-plate"));
  assert.ok(preload, "다음 city-c 완성 장면을 화면 밖에서 먼저 읽음");
  assert.ok(root.querySelectorAll(".ktx-motion-plate")[0].src.endsWith("/city-a.webp"),
    "로드 전 비활성 슬롯의 현재 장면은 보존");

  preload.dispatch("load");
  assert.ok(root.querySelectorAll(".ktx-motion-plate")[0].src.endsWith("/city-c.webp"));
});

test("다음 플레이트가 즉시 로드돼도 현재 교차 중인 이전 슬롯을 덮지 않는다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const plates = root.querySelectorAll(".ktx-motion-plate");

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 4500, v: 240 }, { land: "city" });
  const preload = document.createdElements.find(element =>
    element.tagName === "IMG" && element.src.endsWith("/city-c.webp") &&
    !element.className.includes("ktx-motion-plate"));
  preload.dispatch("load");

  assert.ok(plates[0].src.endsWith("/city-a.webp"), "A→B 교차가 끝날 때까지 A 유지");
  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 4900, v: 240 }, { land: "city" });
  assert.ok(plates[0].src.endsWith("/city-c.webp"), "충분히 진행한 뒤 비활성 슬롯 교체");
});

test("선택형 다음 플레이트 오류는 같은 환경의 상태 틱마다 재요청하지 않는다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const moving = { ...initial, phase: "driving", x: 4500, v: 240 };
  const optionalPreloads = () => document.createdElements.filter(element =>
    element.tagName === "IMG" && element.src.endsWith("/city-c.webp") &&
    !element.className.includes("ktx-motion-plate"));

  updateRealisticMotionScene(root, moving, { land: "city" });
  optionalPreloads()[0].dispatch("error");
  updateRealisticMotionScene(root, moving, { land: "city" });
  updateRealisticMotionScene(root, moving, { land: "city" });

  assert.equal(optionalPreloads().length, 1);
  assert.equal(root.dataset.motionRealistic, "ready", "현재 A/B 장면은 계속 정상 표시");
});

test("주행 위치를 건너뛰어도 해당 구간의 플레이트를 결정적으로 준비한다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "side");
  loadMotionSideAssets(root);
  const jumped = { ...initial, phase: "driving", x: 8500, v: 240 };

  updateRealisticMotionScene(root, jumped, { land: "city" });
  const preload = document.createdElements.find(element =>
    element.tagName === "IMG" &&
    element.src.endsWith("/assets/train-realistic/motion/city-c.webp") &&
    !element.className.includes("ktx-motion-plate"));
  assert.ok(preload, "현재 위치가 가리키는 city-c를 직접 준비");

  preload.dispatch("load");
  updateRealisticMotionScene(root, jumped, { land: "city" });
  const active = root.querySelectorAll(".ktx-motion-plate")
    .find(plate => plate.dataset.active === "true");
  assert.ok(active.src.endsWith("/city-c.webp"));
});

test("빠를수록 완성 장면 교차 시간은 짧아지되 450ms 아래로 내려가지 않는다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");
  const scene = root.querySelector(".ktx-motion-scene");

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 1000, v: 80 }, { land: "city" });
  const slow = Number.parseFloat(scene.style["--motion-crossfade-ms"]);
  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 1000, v: 300 }, { land: "city" });
  const fast = Number.parseFloat(scene.style["--motion-crossfade-ms"]);

  assert.ok(fast < slow);
  assert.ok(fast >= 450);
  assert.ok(slow <= 900);
});

test("선로 반복 경계를 넘을 때 큰 역방향 보간 없이 무봉합으로 되감는다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "side");

  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 2390, v: 240 }, { land: "city" });
  updateRealisticMotionScene(root,
    { ...initial, phase: "driving", x: 2410, v: 240 }, { land: "city" });

  const scene = root.querySelector(".ktx-motion-scene");
  assert.equal(scene.dataset.trackLoopReset, "true");
  assert.equal(scene.style["--motion-track-x"], "-10px");
});

test("KTX 선택은 SRT 사진을 마운트하지 않고 전용 SVG 장면을 유지한다", () => {
  const document = fakeDocument();
  const root = renderKtxScene(document, createKtxJourney(3, "ktx"), "side");
  const train = root.querySelector(".ktx-side-train");

  assert.equal(root.querySelector(".ktx-real-cab-image"), null);
  assert.equal(root.querySelector(".ktx-real-exterior-image"), null);
  assert.equal(document.createdElements.some(element =>
    element.tagName === "IMG" && element.src.includes("/assets/train-realistic/")), false,
  "SRT 실사 자산을 백그라운드에서도 요청하지 않음");
  assert.equal(root.dataset.realistic, "fallback");
  assert.equal(root.dataset.loading, "false");
  assert.ok(train, "KTX 전용 SVG 열차 유지");
  assert.match(train.innerHTML, /ktx-tm-side-body-ktx/, "KTX 리버리 정의 사용");
  assert.match(train.innerHTML, />KTX<\/text>/, "KTX 로고 사용");
  assert.doesNotMatch(train.innerHTML, />SRT<\/text>/, "SRT 로고를 섞지 않음");
});

test("현재 실사 이미지가 모두 로드된 뒤에만 준비 상태가 된다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "cab");
  const cab = root.querySelector(".ktx-real-cab-image");
  const exterior = root.querySelector(".ktx-real-exterior-image");

  assert.equal(root.dataset.realistic, "pending");
  assert.equal(root.dataset.loading, "true");
  assert.ok(root.querySelector(".ktx-loading-veil"));
  cab.dispatch("load");
  assert.equal(root.dataset.realistic, "pending", "한 장만 로드되면 대기 유지");
  exterior.dispatch("load");
  assert.equal(root.dataset.realistic, "ready");
  assert.equal(root.dataset.loading, "false");
});

test("다음 환경 이미지는 미리 읽고 로드된 뒤에만 현재 장면을 교체한다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "cab");
  const cab = root.querySelector(".ktx-real-cab-image");
  const exterior = root.querySelector(".ktx-real-exterior-image");
  cab.dispatch("load");
  exterior.dispatch("load");

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
    "https://game.test/assets/train-realistic/srt-exterior-city.webp",
    "다음 사진이 준비되는 동안 현재 사진 유지");
  assert.equal(exterior.srcWrites, 1);
  assert.equal(root.dataset.realistic, "ready");
  assert.equal(root.dataset.loading, "true");

  const preloader = document.createdElements.find(element =>
    element.tagName === "IMG" &&
    element !== cab &&
    element !== exterior &&
    element.src.endsWith("/assets/train-realistic/srt-exterior-field.webp")
  );
  assert.ok(preloader, "다음 환경 자산을 별도 이미지로 미리 읽음");
  preloader.dispatch("load");

  assert.equal(exterior.src,
    "https://game.test/assets/train-realistic/srt-exterior-field.webp");
  assert.equal(exterior.srcWrites, 2, "미리 읽기가 끝난 뒤 현재 이미지 교체");
  assert.equal(root.dataset.realistic, "ready");
  assert.equal(root.dataset.loading, "false");
});

test("다음 환경 이미지 미리 읽기가 실패하면 즉시 SVG 폴백을 보여 준다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "cab");
  const cab = root.querySelector(".ktx-real-cab-image");
  const exterior = root.querySelector(".ktx-real-exterior-image");
  cab.dispatch("load");
  exterior.dispatch("load");
  assert.equal(root.dataset.realistic, "ready");

  updateKtxScene(root, { ...initial, phase: "driving", x: 2000 }, "side");

  assert.equal(cab.dataset.loaded, "true", "같은 운전실 자산은 로드 상태 유지");
  assert.equal(exterior.dataset.loaded, "true", "현재 외부 자산도 화면에 유지");
  assert.equal(root.dataset.realistic, "ready");
  assert.equal(root.dataset.loading, "true");

  const preloader = document.createdElements.find(element =>
    element.tagName === "IMG" &&
    element !== cab &&
    element !== exterior &&
    element.src.endsWith("/assets/train-realistic/srt-exterior-field.webp")
  );
  assert.ok(preloader);
  preloader.dispatch("error");

  assert.equal(exterior.src,
    "https://game.test/assets/train-realistic/srt-exterior-city.webp",
    "실패한 자산은 현재 이미지에 쓰지 않음");
  assert.equal(exterior.dataset.loaded, "true", "이미 로드된 현재 자산은 유효함");
  assert.equal(exterior.dataset.failed, "true");
  assert.equal(exterior.dataset.failedSrc,
    "assets/train-realistic/srt-exterior-field.webp");
  assert.equal(root.dataset.realistic, "fallback");
  assert.equal(root.dataset.loading, "false");
  assert.ok(root.querySelector(".ktx-side-train"), "외부 SVG 폴백 유지");
});

test("로드된 A에서 B 미리 읽기 실패 후 A로 돌아오면 ready를 유지한다", () => {
  const document = fakeDocument();
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(document, initial, "cab");
  const cab = root.querySelector(".ktx-real-cab-image");
  const exterior = root.querySelector(".ktx-real-exterior-image");
  cab.dispatch("load");
  exterior.dispatch("load");

  const field = { ...initial, phase: "driving", x: 2000 };
  updateKtxScene(root, field, "side");
  const preloader = document.createdElements.find(element =>
    element.tagName === "IMG" &&
    element !== cab &&
    element !== exterior &&
    element.src.endsWith("/assets/train-realistic/srt-exterior-field.webp")
  );
  assert.ok(preloader);
  preloader.dispatch("error");

  updateKtxScene(root, initial, "side");

  assert.equal(exterior.src,
    "https://game.test/assets/train-realistic/srt-exterior-city.webp");
  assert.equal(exterior.dataset.loaded, "true");
  assert.equal(exterior.dataset.failed, undefined);
  assert.equal(root.dataset.realistic, "ready");
  assert.equal(root.dataset.loading, "false");

  updateKtxScene(root, field, "side");
  const retries = document.createdElements.filter(element =>
    element.tagName === "IMG" &&
    element !== cab &&
    element !== exterior &&
    element.src.endsWith("/assets/train-realistic/srt-exterior-field.webp")
  );
  assert.equal(retries.length, 2, "정상 장면으로 복귀한 뒤 실패 자산을 다시 시도");
  retries.at(-1).dispatch("load");
  assert.equal(exterior.src,
    "https://game.test/assets/train-realistic/srt-exterior-field.webp");
  assert.equal(root.dataset.realistic, "ready");
});

test("같은 이미지 경로를 써도 현재 장면 대체 텍스트를 갱신한다", () => {
  const initial = createKtxJourney(3, "srt");
  const root = renderKtxScene(fakeDocument(), initial, "cab");
  const cab = root.querySelector(".ktx-real-cab-image");

  assert.equal(cab.alt, "실사 SRT morning city 운전실");
  updateKtxScene(root, { ...initial, phase: "driving", x: 2000 }, "cab");

  assert.equal(cab.srcWrites, 1, "같은 주간 이미지 경로는 유지");
  assert.equal(cab.alt, "실사 SRT day field 운전실");
});

test("실사 이미지 오류는 즉시 SVG 폴백 상태로 전환한다", () => {
  const root = renderKtxScene(fakeDocument(), createKtxJourney(3, "srt"), "cab");
  const cab = root.querySelector(".ktx-real-cab-image");

  assert.equal(root.dataset.realistic, "pending");
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
  assert.equal(root.dataset.realistic, "pending");
});
