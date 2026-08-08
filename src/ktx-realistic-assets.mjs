const ROOT = "assets/train-realistic";
const MOTION_ROOT = `${ROOT}/motion`;
const MOTION_LANDS = Object.freeze(["city", "field", "mountain", "river", "sea", "tunnel"]);

export const REALISTIC_TRAIN_ASSETS = Object.freeze({
  srt: Object.freeze({
    exterior: Object.freeze(Object.fromEntries(
      ["city", "field", "mountain", "river", "sea", "tunnel"]
        .map(land => [land, `${ROOT}/srt-exterior-${land}.webp`]))),
    cab: Object.freeze({
      day: `${ROOT}/cab-day.webp`,
      night: `${ROOT}/cab-night.webp`,
      tunnel: `${ROOT}/cab-tunnel.webp`
    })
  })
});

export const REALISTIC_MOTION_ASSETS = Object.freeze({
  train: `${MOTION_ROOT}/srt-side-transparent.png`,
  cabMask: `${MOTION_ROOT}/cab-window-mask.png`,
  station: Object.freeze([`${MOTION_ROOT}/station-platform-a.webp`]),
  scenes: Object.freeze(Object.fromEntries(MOTION_LANDS.map(land => [
    land,
    Object.freeze(["a", "b", "c"].map(variant =>
      `${MOTION_ROOT}/${land}-${variant}.webp`))
  ])))
});

export function realisticExteriorAsset(trainId, land) {
  const train = Object.hasOwn(REALISTIC_TRAIN_ASSETS, trainId)
    ? REALISTIC_TRAIN_ASSETS[trainId]
    : null;
  if (!train) return null;
  return train.exterior[land]
    ?? train.exterior.city;
}

export function realisticCabAsset(sky, land) {
  const cab = REALISTIC_TRAIN_ASSETS.srt.cab;
  return cab[land === "tunnel" ? "tunnel" : sky === "night" ? "night" : "day"];
}

export function realisticMotionAssets(trainId, land) {
  if (trainId !== "srt") return null;
  const selected = Object.hasOwn(REALISTIC_MOTION_ASSETS.scenes, land)
    ? land
    : "city";
  return Object.freeze({
    train: REALISTIC_MOTION_ASSETS.train,
    cabMask: REALISTIC_MOTION_ASSETS.cabMask,
    station: REALISTIC_MOTION_ASSETS.station,
    scenes: REALISTIC_MOTION_ASSETS.scenes[selected]
  });
}

export function realisticAssetAlt(kind, context = "") {
  return `실사 SRT ${context} ${kind}`.trim();
}
