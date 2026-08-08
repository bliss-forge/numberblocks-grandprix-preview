import { realisticMotionAssets } from "./ktx-realistic-assets.mjs";
import { realisticMotionFrame } from "./ktx-realistic-motion.mjs";

const controllers = new WeakMap();
const PLATE_SPAN = 4000;
const PLATE_SWAP_GUARD = 400;
const PHOTO_SAFE_PAN_PX = 120;
const PATTERN_PERIOD_PX = Object.freeze({ near: 720, track: 144, streak: 310 });

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

function applyFrame(scene, state, band, controller = null) {
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
  scene.dataset.stationVisible = String(frame.stationStage !== "hidden");
  scene.dataset.nearSuppressed = String(
    frame.stationStage === "detail" || frame.stationStage === "stopped" || frame.departing
  );
  scene.dataset.tunnel = String(frame.land === "tunnel");
  scene.dataset.moving = String(frame.moving);
  scene.dataset.motionMoving = String(frame.moving);
  scene.style.setProperty("--motion-scene-x",
    `${monotonicPhotoPan(state.x)}px`);
  setPatternMotion(scene, "near", frame.offsets.near, PATTERN_PERIOD_PX.near);
  setPatternMotion(scene, "track", frame.offsets.track, PATTERN_PERIOD_PX.track);
  setPatternMotion(scene, "streak", frame.offsets.track, PATTERN_PERIOD_PX.streak);
  scene.style.setProperty("--motion-speed", String(frame.speedRatio));
  scene.style.setProperty("--motion-blur", `${frame.blurPx}px`);
  scene.style.setProperty("--motion-brake-pitch", String(frame.brakePitch));
  scene.style.setProperty("--station-progress", String(frame.stationProgress));
  scene.style.setProperty("--station-x", `${rounded((1 - frame.stationProgress) * 35)}%`);
  scene.style.setProperty("--station-y", `${rounded((1 - frame.stationProgress) * -18)}%`);
  scene.style.setProperty("--station-scale", String(rounded(.28 + frame.stationProgress * .72)));
  scene.style.setProperty("--cab-track-phase", `${rounded(-frame.offsets.track)}px`);
  scene.style.setProperty("--cab-sleeper-gap", `${rounded(42 - frame.speedRatio * 12)}px`);
  scene.style.setProperty("--tunnel-light-gap", `${rounded(98 - frame.speedRatio * 42)}px`);
  scene.style.setProperty("--tunnel-phase",
    frame.land === "tunnel" ? `${rounded(-frame.offsets.track)}px` : "0px");
  scene.style.setProperty("--tunnel-progress",
    frame.land === "tunnel" ? String(rounded(Math.min(1, Math.max(0, state.x / 600)))) : "0");
  scene.style.setProperty("--tunnel-scale",
    frame.land === "tunnel"
      ? String(rounded(.18 + Math.min(1, Math.max(0, state.x / 600)) * 1.15))
      : ".18");
  scene.style.setProperty("--motion-vibration-y",
    `${motionVibration(state.x, state.v, frame.moving)}px`);
  const durationMs = controller?.crossfade?.durationMs ??
    crossfadeDuration(frame.speedRatio);
  scene.style.setProperty("--motion-crossfade-ms", `${durationMs}ms`);
  scene.style.setProperty("--motion-crossfade-play-state",
    frame.moving ? "running" : "paused");
  if (controller?.station) {
    controller.station.dataset.lifecycle = frame.departing
      ? "departing" : frame.stationStage;
  }
  return frame;
}

function rounded(value) {
  return Number(value.toFixed(2));
}

function monotonicPhotoPan(x) {
  const distanceInPlate = Math.max(0, x) % PLATE_SPAN;
  return rounded(-Math.min(PHOTO_SAFE_PAN_PX,
    distanceInPlate * (PHOTO_SAFE_PAN_PX / (PLATE_SPAN / 2))));
}

function setPatternMotion(scene, layer, offset, period) {
  const phaseProperty = `--motion-${layer}-phase-x`;
  const phase = rounded(-(offset % period));
  const previous = Number.parseFloat(scene.style[phaseProperty]);
  scene.dataset[`${layer}LoopReset`] = String(
    Number.isFinite(previous) && Math.abs(phase - previous) > period / 2
  );
  scene.style.setProperty(`--motion-${layer}-x`, `${rounded(-offset)}px`);
  scene.style.setProperty(phaseProperty, `${phase}px`);
}

function crossfadeDuration(speedRatio) {
  return Math.round(900 - speedRatio * 450);
}

function motionVibration(x, v, moving) {
  if (!moving || v <= 160) return 0;
  const amplitude = Math.min(1.5, ((v - 160) / 140) * 1.5);
  return rounded(Math.sin(x * 0.16) * amplitude);
}

function finishPlateCrossfade(controller, slot) {
  const crossfade = controller.crossfade;
  if (!crossfade || !crossfade.remainingSlots.has(slot)) return;
  crossfade.remainingSlots.delete(slot);
  if (crossfade.remainingSlots.size > 0) return;
  controller.crossfade = null;
  controller.plates.forEach((plate, index) => {
    delete plate.dataset.crossfade;
    plate.hidden = index !== controller.activeSlot;
  });
}

function resetPlateSlots(controller, catalog) {
  controller.catalog = catalog;
  controller.activeSlot = 0;
  controller.activeCatalogIndex = 0;
  controller.platePreload = null;
  controller.crossfade = null;
  controller.failedPlateSources.clear();
  controller.plates.forEach((plate, index) => {
    plate.dataset.active = String(index === 0);
    delete plate.dataset.crossfade;
    plate.hidden = index !== 0;
  });
}

function assignPreloadedPlate(controller, request) {
  if (controller.platePreload !== request || !request.loaded ||
    controller.requestedLand !== request.land ||
    controller.activeCatalogIndex !== request.fromIndex ||
    controller.currentX < request.minX) return;
  const inactiveSlot = 1 - controller.activeSlot;
  const plate = controller.plates[inactiveSlot];
  plate.dataset.assetSrc = request.source;
  plate.src = request.source;
  plate.dataset.loaded = "true";
  delete plate.dataset.failed;
  plate.dataset.active = "false";
  delete plate.dataset.crossfade;
  plate.hidden = true;
  controller.platePreload = null;
}

function preloadPlate(controller, catalogIndex, minX) {
  const source = controller.catalog[catalogIndex];
  if (controller.plates.some(plate => plate.dataset.assetSrc === source)) return;
  if (controller.failedPlateSources.has(source)) return;

  if (controller.platePreload?.source === source) {
    assignPreloadedPlate(controller, controller.platePreload);
    return;
  }

  const request = {
    land: controller.land,
    source,
    fromIndex: controller.activeCatalogIndex,
    minX,
    loaded: false
  };
  controller.platePreload = request;
  const preloader = controller.document.createElement("img");
  preloader.decoding = "async";
  preloader.addEventListener?.("load", () => {
    if (controller.platePreload !== request) return;
    request.loaded = true;
    controller.failedPlateSources.delete(source);
    assignPreloadedPlate(controller, request);
  });
  preloader.addEventListener?.("error", () => {
    if (controller.platePreload !== request) return;
    controller.failedPlateSources.add(source);
    controller.platePreload = null;
  });
  preloader.src = source;
}

function syncPlateMotion(controller, state, frame) {
  if (!frame.moving || controller.catalog.length < 2) return;
  controller.currentX = Math.max(0, state.x);
  const segment = Math.floor(Math.max(0, state.x) / PLATE_SPAN);
  const desiredIndex = segment % controller.catalog.length;
  const source = controller.catalog[desiredIndex];
  const desiredSlot = controller.plates.findIndex(
    plate => plate.dataset.assetSrc === source && plate.dataset.loaded === "true"
  );
  if (desiredSlot < 0) {
    preloadPlate(controller, desiredIndex, controller.currentX);
    return;
  }
  let switched = false;
  if (desiredSlot >= 0 && desiredSlot !== controller.activeSlot) {
    const outgoingSlot = controller.activeSlot;
    controller.plates.forEach((plate, index) => {
      plate.hidden = false;
      plate.dataset.active = String(index === desiredSlot);
    });
    controller.plates[outgoingSlot].dataset.crossfade = "out";
    controller.plates[desiredSlot].dataset.crossfade = "in";
    controller.crossfade = {
      durationMs: Number.parseFloat(
        controller.scene.style["--motion-crossfade-ms"]),
      remainingSlots: new Set([outgoingSlot, desiredSlot])
    };
    controller.activeSlot = desiredSlot;
    controller.activeCatalogIndex = desiredIndex;
    controller.platePreload = null;
    switched = true;
  } else if (desiredSlot >= 0) {
    controller.activeCatalogIndex = desiredIndex;
  }
  controller.plates[controller.activeSlot].style.setProperty(
    "--motion-plate-x", controller.scene.style["--motion-scene-x"]);
  preloadPlate(controller,
    (controller.activeCatalogIndex + 1) % controller.catalog.length,
    controller.currentX + (switched ? PLATE_SWAP_GUARD : 0));
}

function assignLoadedScenes(controller, land, sources) {
  controller.land = land;
  controller.scenes = sources;
  const pack = realisticMotionAssets("srt", land);
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
  resetPlateSlots(controller, pack.scenes);
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
    catalog: pack.scenes,
    activeSlot: 0,
    activeCatalogIndex: 0,
    platePreload: null,
    crossfade: null,
    failedPlateSources: new Set(),
    currentX: Math.max(0, state.x),
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
  plates.forEach((plate, index) => {
    plate.addEventListener?.("animationend", () =>
      finishPlateCrossfade(controller, index));
  });

  const track = el(document, "div", "ktx-motion-track");
  const near = el(document, "div", "ktx-motion-near");
  const station = motionImage(document, "ktx-motion-station",
    pack.station[0], "", controller);
  const stationSign = el(document, "div", "ktx-motion-station-sign");
  stationSign.textContent = "SRT 역";
  const cabWindow = el(document, "div", "ktx-motion-cab-window");
  const cabRailLeft = el(document, "div", "ktx-motion-cab-rail ktx-motion-cab-rail-left");
  const cabRailRight = el(document, "div", "ktx-motion-cab-rail ktx-motion-cab-rail-right");
  const cabSleepers = el(document, "div", "ktx-motion-cab-sleepers");
  const cabCatenary = el(document, "div", "ktx-motion-cab-catenary");
  const tunnel = el(document, "div", "ktx-motion-tunnel");
  const tunnelPortal = el(document, "div", "ktx-motion-tunnel-portal");
  const tunnelLights = el(document, "div", "ktx-motion-tunnel-lights");
  tunnel.append(tunnelPortal, tunnelLights);
  cabWindow.append(cabRailLeft, cabRailRight, cabSleepers, cabCatenary, tunnel);
  const train = motionImage(document, "ktx-motion-train",
    pack.train, "실사 SRT 열차", controller);
  const cabFrame = motionImage(document, "ktx-motion-cab-frame",
    pack.cabMask, "실사 SRT 운전실", controller);
  Object.assign(controller, { station, train, cabFrame });

  scene.append(...plates, station, stationSign, track, near, cabWindow, train, cabFrame);
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
  const frame = applyFrame(scene, state, band, controller);

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
  syncPlateMotion(controller, state, frame);
}
