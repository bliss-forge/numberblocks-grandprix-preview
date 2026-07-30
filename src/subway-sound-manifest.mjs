export const SUBWAY_REAL_SOUNDS = Object.freeze({
  "mind-gap": "subway_sound/발빠짐 주의.mp3",
  "door-close": "subway_sound/열차출입문닫힘예고.mp3",
  "arrive-melody": "subway_sound/도착멜로디.mp3"
});

export function subwaySoundSrc(key) {
  const src = SUBWAY_REAL_SOUNDS[key];
  return src ? encodeURI(src) : null;
}

export function stationSoundSrc(station) {
  return encodeURI(`subway_sound/${station}.mp3`);
}
