import test from "node:test";
import assert from "node:assert/strict";
import {
  matchStation,
  normalizeCandidate,
  planImport
} from "../src/station-sound-import.mjs";
import { SUBWAY_LINES } from "../src/subway-map-data.mjs";

const STATIONS = [...new Set(
  SUBWAY_LINES.flatMap(line => line.stations)
)];

test("사람들이 쓰는 온갖 파일명에서 역 이름을 찾아낸다", () => {
  const cases = [
    ["시청.mp3", "시청"],
    ["시청역.mp3", "시청"],
    ["02_시청역.mp3", "시청"],
    ["12. 시청역 도착.mp3", "시청"],
    ["서울교통공사_시청역_안내방송.mp3", "시청"],
    ["시청(1호선).mp3", "시청"],
    ["시청역-수정.mp3", "시청"],
    ["시청역 안내방송 최종.MP3", "시청"],
    ["［상선］시청역.mp3", "시청"]
  ];
  for (const [fileName, expected] of cases) {
    assert.equal(matchStation(fileName, STATIONS).station, expected, fileName);
  }
});

test("긴 역 이름이 짧은 역 이름에 먹히지 않는다", () => {
  assert.equal(
    matchStation("동대문역사문화공원역.mp3", STATIONS).station,
    "동대문역사문화공원"
  );
  assert.equal(matchStation("동대문역.mp3", STATIONS).station, "동대문");
  assert.equal(matchStation("여의나루역.mp3", STATIONS).station, "여의나루");
  assert.equal(matchStation("여의도역.mp3", STATIONS).station, "여의도");
  assert.equal(matchStation("동묘앞역.mp3", STATIONS).station, "동묘앞");
});

test("역 이름이 없는 파일은 억지로 맞추지 않는다", () => {
  for (const fileName of ["안내방송.mp3", "track01.mp3", "발빠짐 주의.mp3"]) {
    assert.equal(matchStation(fileName, STATIONS).station, null, fileName);
  }
});

test("정리 계획은 겹침·미해결·빈 역을 각각 갈라 알려준다", () => {
  const plan = planImport(
    [
      "시청역.mp3",
      "01_시청 도착.mp3",
      "교대역.mp3",
      "잡음.mp3"
    ],
    ["시청", "교대", "사당"],
    ["사당"]
  );
  assert.deepEqual(
    plan.moves.map(move => [move.fileName, move.target]),
    [["교대역.mp3", "교대.mp3"], ["시청역.mp3", "시청.mp3"]]
  );
  assert.equal(plan.conflicts.length, 1, "같은 역 두 번째 파일은 건너뛴다");
  assert.equal(plan.conflicts[0].station, "시청");
  assert.equal(
    plan.conflicts[0].fileName,
    "01_시청 도착.mp3",
    "군더더기 적은 시청역.mp3가 선택되고 이쪽이 밀린다"
  );
  assert.deepEqual(plan.unmatched.map(entry => entry.fileName), ["잡음.mp3"]);
  assert.deepEqual(plan.missing, [], "이미 있는 사당은 빈 역이 아니다");
});

test("이미 있는 파일을 덮어쓰게 되면 미리 표시한다", () => {
  const plan = planImport(["시청역.mp3"], ["시청"], ["시청"]);
  assert.equal(plan.moves[0].overwrites, true);
});

test("normalizeCandidate는 번호·괄호·잡음 단어를 걷어낸다", () => {
  assert.equal(normalizeCandidate("07_강남역(2호선) 안내방송.mp3"), "강남역");
  assert.equal(normalizeCandidate("강남.mp3"), "강남");
});
