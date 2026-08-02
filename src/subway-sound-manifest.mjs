// Real Seoul-metro recordings shipped in subway_sound/. Keys the game asks
// for are mapped here; a missing key falls back to the TTS voice pack.
import { FAMILY_HOME, FAMILY_STATIONS } from "./subway-map-data.mjs";

// 가족역은 지어낸 역이라 실제 안내방송이 있을 리 없다. 이름을 물어보면
// 없는 파일을 받으러 가서 404만 쌓이므로 아예 없다고 답한다.
const SILENT_STATIONS = new Set([
  ...FAMILY_STATIONS.map(member => member.station),
  FAMILY_HOME.station
]);
export const SUBWAY_REAL_SOUNDS = Object.freeze({
  // plays when the train pulls into the station where the child gets off
  "mind-gap": "subway_sound/승강장발빠짐 주의.mp3",
  "door-close": "subway_sound/열차출입문닫힘예고.mp3",
  // the two real arrival fanfares: trumpet for down-line, bell for up-line
  "arrive-melody-down": "subway_sound/서울교통공사(하선-나팔)_수정.mp3",
  "arrive-melody-up": "subway_sound/서울교통공사(상선-벨)_수정.mp3"
});

export function subwaySoundSrc(key) {
  const src = SUBWAY_REAL_SOUNDS[key];
  return src ? encodeURI(src) : null;
}

export function stationSoundSrc(station) {
  if (SILENT_STATIONS.has(station)) return null;
  return encodeURI(`subway_sound/${station}.mp3`);
}
