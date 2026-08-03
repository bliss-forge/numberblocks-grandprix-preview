const ROOT = "assets/train-realistic";

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

export function realisticExteriorAsset(trainId, land) {
  return REALISTIC_TRAIN_ASSETS[trainId]?.exterior[land]
    ?? REALISTIC_TRAIN_ASSETS.srt.exterior.city;
}

export function realisticCabAsset(sky, land) {
  const cab = REALISTIC_TRAIN_ASSETS.srt.cab;
  return cab[land === "tunnel" ? "tunnel" : sky === "night" ? "night" : "day"];
}

export function realisticAssetAlt(kind, context = "") {
  return `실사 SRT ${context} ${kind}`.trim();
}
