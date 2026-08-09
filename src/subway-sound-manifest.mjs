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

// 실음원을 아직 못 구한 역. 경로를 만들면 404만 받고 그동안 아이는 역 이름을
// 못 듣는다 — 없다고 답해서 TTS 폴백(STATION_VOICE_KEYS)이 대신 나오게 한다.
// 여기 목록은 tests/subway-station-sound.test.mjs가 실제 파일 목록과 대조한다.
const STATIONS_WITHOUT_RECORDING = Object.freeze({
  모란: "subway-station-moran",
  가양: "subway-station-gayang",
  국회의사당: "subway-station-assembly",
  봉은사: "subway-station-bongeunsa"
});

export function stationSoundSrc(station) {
  if (SILENT_STATIONS.has(station)) return null;
  if (station in STATIONS_WITHOUT_RECORDING) return null;
  return encodeURI(`subway_sound/${station}.mp3`);
}

// 실음원이 없을 때 대신 낭독할 음성 키. 가족역은 지어낸 역이라 폴백도 없다.
export function stationVoiceKey(station) {
  return STATIONS_WITHOUT_RECORDING[station] ?? null;
}

export { STATIONS_WITHOUT_RECORDING };
