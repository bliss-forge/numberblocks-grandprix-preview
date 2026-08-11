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
      tunnel: `${ROOT}/cab-tunnel.webp`,
      dawn: `${ROOT}/cab-dawn.webp`,
      sunset: `${ROOT}/cab-sunset.webp`,
      field: `${ROOT}/cab-field.webp`,
      river: `${ROOT}/cab-river.webp`,
      sea: `${ROOT}/cab-sea.webp`,
      mountain: `${ROOT}/cab-mountain.webp`
    })
  })
});

export const REALISTIC_MOTION_ASSETS = Object.freeze({
  train: `${MOTION_ROOT}/srt-side-transparent.png`,
  trainNight: `${MOTION_ROOT}/srt-side-transparent-night.png`,
  cabMask: `${MOTION_ROOT}/cab-window-mask.png`,
  station: Object.freeze([`${MOTION_ROOT}/station-platform-a.webp`]),
  stationBySky: Object.freeze({
    sunset: `${MOTION_ROOT}/station-platform-sunset.webp`,
    night: `${MOTION_ROOT}/station-platform-night.webp`,
    dawn: `${MOTION_ROOT}/station-platform-dawn.webp`
  }),
  scenes: Object.freeze(Object.fromEntries(MOTION_LANDS.map(land => [
    land,
    Object.freeze(["a", "b", "c"].map(variant =>
      `${MOTION_ROOT}/${land}-${variant}.webp`))
  ])))
});

// 실사 이벤트 스프라이트 — Codex가 만든 것만 등재한다. 등재된 종류만 월드
// 스윕으로 승격되고, 없는 종류는 기존 평면 연출을 그대로 써서 빈 화면이
// 되지 않는다(자산 도착 순서와 배포를 분리하기 위한 장치).
export const REALISTIC_EVENT_ASSETS = Object.freeze({
  // 예: cows: `${MOTION_ROOT}/event-cows.webp`
});

export function realisticEventAsset(kind) {
  return Object.hasOwn(REALISTIC_EVENT_ASSETS, kind)
    ? REALISTIC_EVENT_ASSETS[kind]
    : null;
}

export function realisticExteriorAsset(trainId, land) {
  const train = Object.hasOwn(REALISTIC_TRAIN_ASSETS, trainId)
    ? REALISTIC_TRAIN_ASSETS[trainId]
    : null;
  if (!train) return null;
  return train.exterior[land]
    ?? train.exterior.city;
}

export function realisticCabAsset(sky, land) {
  // 우선순위: 터널 > 밤 > 새벽·노을 > 지형(주간) > 낮 — 시간대가 지형보다
  // 강한 단서다(PR #8 시간대·지형 자산, 협회 검수 8·11 해소).
  const cab = REALISTIC_TRAIN_ASSETS.srt.cab;
  if (land === "tunnel") return cab.tunnel;
  if (sky === "night") return cab.night;
  if (sky === "dawn") return cab.dawn;
  if (sky === "sunset") return cab.sunset;
  return cab[land] ?? cab.day;
}

export function realisticMotionAssets(trainId, land) {
  if (trainId !== "srt") return null;
  const selected = Object.hasOwn(REALISTIC_MOTION_ASSETS.scenes, land)
    ? land
    : "city";
  return Object.freeze({
    train: REALISTIC_MOTION_ASSETS.train,
    trainNight: REALISTIC_MOTION_ASSETS.trainNight,
    cabMask: REALISTIC_MOTION_ASSETS.cabMask,
    station: REALISTIC_MOTION_ASSETS.station,
    stationBySky: REALISTIC_MOTION_ASSETS.stationBySky,
    scenes: REALISTIC_MOTION_ASSETS.scenes[selected]
  });
}

export function realisticAssetAlt(kind, context = "") {
  return `실사 SRT ${context} ${kind}`.trim();
}
