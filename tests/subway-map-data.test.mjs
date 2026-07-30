import test from "node:test";
import assert from "node:assert/strict";
import {
  STATION_COORDS,
  SUBWAY_LINES,
  SUBWAY_PLACES,
  isTransferStation,
  lineByNumber,
  linesAtStation,
  stationLabel
} from "../src/subway-map-data.mjs";

test("서울 지하철 1~9호선이 실제 노선 색으로 준비된다", () => {
  assert.deepEqual(SUBWAY_LINES.map(line => line.number), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  const colors = {
    1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A5DE",
    5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092"
  };
  for (const line of SUBWAY_LINES) {
    assert.equal(line.color, colors[line.number], `line ${line.number}`);
    assert.ok(line.stations.length >= 6, `line ${line.number} stations`);
  }
  assert.equal(lineByNumber(2).loop, true, "2호선은 순환선");
});

test("모든 역은 고유 좌표를 가지고 노선 안에서 중복되지 않는다", () => {
  const seen = new Map();
  for (const line of SUBWAY_LINES) {
    assert.equal(
      new Set(line.stations).size,
      line.stations.length,
      `line ${line.number} duplicates`
    );
    for (const station of line.stations) {
      const coord = STATION_COORDS[station];
      assert.ok(coord, `coord for ${station}`);
      assert.ok(coord.x >= 0 && coord.x <= 100 && coord.y >= 0 && coord.y <= 100);
      const key = `${coord.x},${coord.y}`;
      if (seen.has(key)) {
        assert.equal(seen.get(key), station, `coord clash ${station}/${seen.get(key)}`);
      }
      seen.set(key, station);
    }
  }
});

test("주요 환승역은 여러 노선이 공유한다", () => {
  for (const [station, expected] of [
    ["종로3가", [1, 3, 5]],
    ["동대문역사문화공원", [2, 4, 5]],
    ["고속터미널", [3, 7, 9]],
    ["잠실", [2, 8]],
    ["김포공항", [5, 9]],
    ["사당", [2, 4]]
  ]) {
    assert.deepEqual(
      linesAtStation(station).map(line => line.number),
      expected,
      station
    );
    assert.equal(isTransferStation(station), true, station);
  }
});

test("목적지 10곳은 모두 수록된 역에 있고 아이콘·음성 키를 가진다", () => {
  assert.equal(SUBWAY_PLACES.length, 10);
  const lineNumbers = new Set();
  for (const place of SUBWAY_PLACES) {
    const lines = linesAtStation(place.station);
    assert.ok(lines.length >= 1, `${place.label} station listed`);
    lines.forEach(line => lineNumbers.add(line.number));
    assert.ok(place.icon.length > 0);
    assert.match(place.voiceKey, /^subway-place-[a-z]+$/);
    assert.ok(place.label.length > 0);
  }
  assert.equal(new Set(SUBWAY_PLACES.map(place => place.id)).size, 10);
});

test("역 이름 뒤에 역을 두 번 붙이지 않는다", () => {
  assert.equal(stationLabel("시청"), "시청역");
  assert.equal(stationLabel("서울역"), "서울역", "no 서울역역");
  const doubled = [];
  for (const line of SUBWAY_LINES) {
    for (const station of line.stations) {
      if (stationLabel(station).endsWith("역역")) doubled.push(station);
    }
  }
  assert.deepEqual(doubled, []);
});
