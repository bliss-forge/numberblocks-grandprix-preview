import { realisticMotionAssets } from "./ktx-realistic-assets.mjs";
import { realisticMotionFrame } from "./ktx-realistic-motion.mjs";

const controllers = new WeakMap();

function el(document, tag, className) {
  const node = document.createElement(tag);
  node.className = className;
  return node;
}

function motionImage(document, className, src, alt, controller) {
  const image = el(document, "img", className);
  image.dataset.assetSrc = src;
  image.src = src;
  image.alt = alt;
  image.decoding = "async";
  image.addEventListener?.("load", () => {
    if (image.dataset.assetSrc !== src) return;
    image.dataset.loaded = "true";
    delete image.dataset.failed;
    syncReadiness(controller);
  });
  image.addEventListener?.("error", () => {
    if (image.dataset.assetSrc !== src) return;
    delete image.dataset.loaded;
    image.dataset.failed = "true";
    syncReadiness(controller);
  });
  return image;
}

function setStatus(controller, status) {
  controller.scene.dataset.readiness = status;
  if (controller.root) controller.root.dataset.motionRealistic = status;
  controller.onStateChange?.(status);
}

function requiredImages(controller) {
  return [
    ...controller.plates,
    controller.station,
    controller.view === "cab" ? controller.cabFrame : controller.train
  ];
}

function syncReadiness(controller) {
  if (controller.failedEnvironments.has(controller.requestedLand)) {
    setStatus(controller, "fallback");
    return;
  }
  if (controller.pending?.land === controller.requestedLand ||
    controller.requestedLand !== controller.land) {
    setStatus(controller, "pending");
    return;
  }
  const required = requiredImages(controller);
  if (required.some(image => image.dataset.failed === "true")) {
    setStatus(controller, "fallback");
    return;
  }
  const ready = required.every(image => image.dataset.loaded === "true");
  if (ready) {
    controller.loadedEnvironments.set(controller.land, controller.scenes);
    controller.failedEnvironments.clear();
  }
  setStatus(controller, ready ? "ready" : "pending");
}

function applyFrame(scene, state, band) {
  const frame = realisticMotionFrame({
    x: state.x,
    v: state.v,
    phase: state.phase,
    markerDistance: state.markerDistance,
    land: band.land
  });
  scene.dataset.land = frame.land;
  scene.dataset.speedBand = frame.speedBand;
  scene.dataset.stationStage = frame.stationStage;
  scene.dataset.moving = String(frame.moving);
}

function assignLoadedScenes(controller, land, sources) {
  controller.land = land;
  controller.scenes = sources;
  controller.failedEnvironments.clear();
  controller.plates.forEach((plate, index) => {
    const src = sources[index];
    if (plate.dataset.assetSrc !== src) {
      plate.dataset.assetSrc = src;
      plate.src = src;
    }
    plate.dataset.loaded = "true";
    delete plate.dataset.failed;
  });
  syncReadiness(controller);
}

function preloadEnvironment(controller, land, sources) {
  if (controller.pending?.land === land) return;
  const request = { land, sources, loaded: new Set(), failed: false };
  controller.pending = request;
  setStatus(controller, "pending");

  sources.forEach((src, index) => {
    const preloader = controller.document.createElement("img");
    preloader.decoding = "async";
    preloader.addEventListener?.("load", () => {
      if (controller.pending !== request || request.failed) return;
      request.loaded.add(index);
      if (request.loaded.size !== sources.length) return;
      controller.pending = null;
      controller.loadedEnvironments.set(land, sources);
      assignLoadedScenes(controller, land, sources);
    });
    preloader.addEventListener?.("error", () => {
      if (controller.pending !== request) return;
      request.failed = true;
      controller.pending = null;
      controller.failedEnvironments.add(land);
      setStatus(controller, "fallback");
    });
    preloader.src = src;
  });
}

export function buildRealisticMotionScene(document, state, onStateChange) {
  const pack = realisticMotionAssets(state.train.id, state.land);
  if (!pack) return null;

  const scene = el(document, "div", "ktx-motion-scene");
  scene.setAttribute("aria-hidden", "true");
  const controller = {
    document,
    scene,
    root: null,
    view: "side",
    land: state.land,
    requestedLand: state.land,
    scenes: pack.scenes.slice(0, 2),
    loadedEnvironments: new Map(),
    failedEnvironments: new Set(),
    pending: null,
    onStateChange
  };

  const plates = pack.scenes.slice(0, 2).map((src, index) => {
    const plate = motionImage(document,
      `ktx-motion-plate ktx-motion-plate-${index + 1}`, src, "", controller);
    plate.dataset.active = String(index === 0);
    plate.hidden = index !== 0;
    return plate;
  });
  controller.plates = plates;

  const track = el(document, "div", "ktx-motion-track");
  const near = el(document, "div", "ktx-motion-near");
  const station = motionImage(document, "ktx-motion-station",
    pack.station[0], "", controller);
  const train = motionImage(document, "ktx-motion-train",
    pack.train, "실사 SRT 열차", controller);
  const cabFrame = motionImage(document, "ktx-motion-cab-frame",
    pack.cabMask, "실사 SRT 운전실", controller);
  Object.assign(controller, { station, train, cabFrame });

  scene.append(...plates, track, near, station, train, cabFrame);
  scene.dataset.readiness = "pending";
  applyFrame(scene, state, { land: state.land });
  controllers.set(scene, controller);
  return scene;
}

export function updateRealisticMotionScene(root, state, band) {
  const scene = root.querySelector(".ktx-motion-scene");
  if (state.train.id !== "srt" || !scene) {
    root.dataset.motionRealistic = "fallback";
    return;
  }

  const controller = controllers.get(scene);
  if (!controller) {
    root.dataset.motionRealistic = "fallback";
    return;
  }
  controller.root = root;
  controller.view = root.dataset.view === "cab" ? "cab" : "side";
  applyFrame(scene, state, band);

  const pack = realisticMotionAssets(state.train.id, band.land);
  const sources = pack.scenes.slice(0, 2);
  const previousRequestedLand = controller.requestedLand;
  controller.requestedLand = band.land;
  if (controller.pending && controller.pending.land !== band.land) {
    controller.pending = null;
  }
  if (previousRequestedLand !== band.land && controller.land === band.land &&
    controller.loadedEnvironments.has(band.land)) {
    controller.failedEnvironments.clear();
  }
  if (controller.failedEnvironments.has(band.land)) {
    setStatus(controller, "fallback");
    return;
  }
  if (controller.land !== band.land) {
    const loaded = controller.loadedEnvironments.get(band.land);
    if (loaded) {
      controller.pending = null;
      assignLoadedScenes(controller, band.land, loaded);
    } else {
      preloadEnvironment(controller, band.land, sources);
    }
    return;
  }
  syncReadiness(controller);
}
