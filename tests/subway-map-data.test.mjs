import test from "node:test";
import assert from "node:assert/strict";
import {
  STATION_COORDS,
  SUBWAY_LINES,
  SUBWAY_PLACES,
  isTransferStation,
  lineByNumber,
  lineForKey,
  lineKeyLabel,
  linesAtStation,
  stationLabel
} from "../src/subway-map-data.mjs";

test("서울 지하철 1~9호선이 실제 노선 색으로 준비된다", () => {
  assert.deepEqual(
    SUBWAY_LINES.map(line => line.number),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  );
  const colors = {
    1: "#0052A4", 2: "#00A84D", 3: "#EF7C1C", 4: "#00A5DE",
    5: "#996CAC", 6: "#CD7C2F", 7: "#747F00", 8: "#E6186C", 9: "#BDB092",
    10: "#00B3A4"
  };
  for (const line of SUBWAY_LINES) {
    assert.equal(line.color, colors[line.number], `line ${line.number}`);
    assert.ok(line.stations.length >= 6, `line ${line.number} stations`);
  }
  assert.equal(new Set(Object.values(colors)).size, 10, "노선 색은 서로 다르다");
  assert.equal(lineByNumber(2).loop, true, "2호선은 순환선");
});

test("10호선은 도하역을 지나 재미있는 곳들을 한 줄로 잇는다", () => {
  const ten = lineByNumber(10);
  assert.ok(ten, "10호선이 있다");
  assert.ok(ten.stations.includes("도하"), "도하역이 있다");
  assert.deepEqual(
    linesAtStation("도하").map(line => line.number),
    [10],
    "도하역은 10호선에만 있어 갈아탈 일이 없다"
  );
  assert.equal(isTransferStation("도하"), false);

  const straightTo = SUBWAY_PLACES
    .filter(place => ten.stations.includes(place.station))
    .map(place => place.label);
  assert.deepEqual(
    straightTo,
    ["놀이공원", "경복궁", "남산타워", "하늘공원", "어린이대공원"],
    "갈아타지 않고 닿는 다섯 곳"
  );
});

test("10호선은 숫자키 0으로 부른다", () => {
  assert.equal(lineKeyLabel(10), "0");
  assert.equal(lineKeyLabel(6), "6");
  assert.equal(lineForKey("0"), 10);
  assert.equal(lineForKey("6"), 6);
  for (const line of SUBWAY_LINES) {
    assert.equal(lineForKey(lineKeyLabel(line.number)), line.number, `line ${line.number}`);
  }
  const keys = SUBWAY_LINES.map(line => lineKeyLabel(line.number));
  assert.equal(new Set(keys).size, keys.length, "노선마다 키가 겹치지 않는다");
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
    ["잠실", [2, 8, 10]],
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
