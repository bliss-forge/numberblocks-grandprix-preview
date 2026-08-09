// 역 안내방송 계약 — 아이가 정차한 역의 이름을 어떤 경로로든 듣는다.
// 감사(2026-08-06): 실음원이 없는 4역이 경로만 만들어 404를 받고, 통과역은
// 폴백도 없어 통째로 무음이었다. 새 역을 추가하면서 음원을 빠뜨리면
// 이 테스트가 잡는다 — 실음원을 넣거나 폴백 키를 등록하거나 둘 중 하나.

import test from "node:test";
import assert from "node:assert/strict";
import { readdir } from "node:fs/promises";
import {
  STATIONS_WITHOUT_RECORDING,
  stationSoundSrc,
  stationVoiceKey
} from "../src/subway-sound-manifest.mjs";
import {
  FAMILY_HOME,
  FAMILY_STATIONS,
  SUBWAY_LINES
} from "../src/subway-map-data.mjs";
import { VOICE } from "../src/audio-manifest.mjs";

const familyStations = new Set([
  ...FAMILY_STATIONS.map(member => member.station),
  FAMILY_HOME.station
]);

const realStations = [...new Set(
  SUBWAY_LINES.flatMap(line => line.stations.map(station => station.name ?? station))
)].filter(name => !familyStations.has(name));

const recordings = new Set(
  (await readdir(new URL("../subway_sound", import.meta.url)))
    .filter(file => file.endsWith(".mp3"))
    .map(file => file.replace(/\.mp3$/, ""))
);

test("모든 실제 역은 실음원이 있거나 이름 낭독 폴백이 등록돼 있다", () => {
  const orphans = realStations.filter(station =>
    !recordings.has(station) && !stationVoiceKey(station)
  );
  assert.deepEqual(orphans, [], "음원도 폴백도 없는 역");
});

test("실음원이 없는 역은 경로를 만들지 않는다 (404 금지)", () => {
  for (const station of Object.keys(STATIONS_WITHOUT_RECORDING)) {
    assert.equal(stationSoundSrc(station), null, station);
    assert.ok(stationVoiceKey(station), `${station} 폴백 키`);
  }
});

test("폴백 목록은 실제로 음원이 없는 역만 담는다", () => {
  for (const station of Object.keys(STATIONS_WITHOUT_RECORDING)) {
    assert.ok(
      realStations.includes(station),
      `${station}은 노선에 없는 역 — 목록에서 지운다`
    );
    assert.ok(
      !recordings.has(station),
      `${station} 음원이 생겼다 — 폴백 목록에서 지워 실음원을 쓰게 한다`
    );
  }
});

test("역 이름 폴백 키는 음성 매니페스트에 등록돼 있다", () => {
  for (const key of Object.values(STATIONS_WITHOUT_RECORDING)) {
    assert.ok(VOICE[key]?.ko, `${key} 한국어`);
    assert.ok(VOICE[key]?.en, `${key} 영어`);
  }
});

test("실음원이 있는 역은 그 파일을 먼저 쓴다", () => {
  const sampled = realStations.filter(station => recordings.has(station)).slice(0, 5);
  assert.ok(sampled.length >= 5, "표본 역이 있다");
  for (const station of sampled) {
    assert.equal(stationSoundSrc(station), encodeURI(`subway_sound/${station}.mp3`));
    assert.equal(stationVoiceKey(station), null, `${station}은 폴백이 필요 없다`);
  }
});

test("가족역은 실음원도 폴백도 없이 조용히 지나간다", () => {
  for (const station of familyStations) {
    assert.equal(stationSoundSrc(station), null, station);
    assert.equal(stationVoiceKey(station), null, station);
  }
});
