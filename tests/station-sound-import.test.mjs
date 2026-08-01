import test from "node:test";
import assert from "node:assert/strict";
import {
  describeAnnouncement,
  matchStation,
  normalizeCandidate,
  planImport,
  stationToken
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

test("배포용 안내방송 묶음의 여러 이름 모양에서 역 이름 자리를 집어낸다", () => {
  const cases = [
    ["5호선__공덕 환승상_한글_왼쪽.mp3", "공덕"],
    ["8호선__석촌 도착상_한글_오른쪽.mp3", "석촌"],
    ["1호선__동묘앞_환승.mp3", "동묘앞"],
    ["시청_내선.mp3", "시청"],
    ["충무로_하행.mp3", "충무로"],
    ["경복궁.mp3", "경복궁"],
    ["1. 장암~온수, 부평구청__17. 어린이대공원, 세종대 - 국문 (강희선).mp3", "어린이대공원"],
    ["1. 장암~온수, 부평구청__4. 노원 - 영문 (제니퍼).mp3", "노원"],
    ["1호선_안내방송.zip__1호선__동묘앞_환승.mp3", "동묘앞"],
    ["2호선_안내방송.zip__교대.mp3", "교대"]
  ];
  for (const [fileName, expected] of cases) {
    assert.equal(stationToken(fileName), expected, fileName);
  }
});

test("역 이름에 다른 글자가 붙은 파일은 그 역으로 보지 않는다", () => {
  const stations = ["시청", "왕십리", "잠실", "종합운동장"];
  const wrong = [
    "1. 장암~온수, 부평구청__46. 부천시청 - 국문 (강희선).mp3",
    "상왕십리.mp3",
    "잠실나루.mp3",
    "잠실새내.mp3",
    "1. 장암~온수, 부평구청__43. 부천종합운동장 - 국문 (강희선).mp3"
  ];
  for (const fileName of wrong) {
    assert.equal(matchStation(fileName, stations).station, null, fileName);
  }
});

test("이름이 역으로 끝나는 역은 역을 뺀 파일명과도 이어진다", () => {
  const stations = ["서울역", "시청"];
  assert.equal(matchStation("서울.mp3", stations).station, "서울역");
  assert.equal(matchStation("1호선__서울_환승.mp3", stations).station, "서울역");
  assert.equal(matchStation("서울역.mp3", stations).station, "서울역");
});

test("출발 안내와 외국어 안내는 도착 음성 후보에서 뺀다", () => {
  const departure = describeAnnouncement("5호선__방화 출발 왕십리,성동구청행.mp3");
  assert.equal(departure.departure, true);
  assert.equal(departure.usable, false);

  const foreign = describeAnnouncement("1. 장암~온수, 부평구청__4. 노원 - 영문 (제니퍼).mp3");
  assert.equal(foreign.foreign, true);
  assert.equal(foreign.usable, false);

  const arrival = describeAnnouncement("8호선__석촌 도착상_한글_오른쪽.mp3");
  assert.deepEqual(
    [arrival.kind, arrival.departure, arrival.foreign, arrival.usable],
    ["도착", false, false, true]
  );
  assert.equal(describeAnnouncement("1호선__동묘앞_환승.mp3").kind, "환승");
  assert.equal(describeAnnouncement("사당_종착.mp3").kind, "종착");
});

test("정리 계획은 출발·외국어 파일을 옮기지 않고 따로 세어 둔다", () => {
  const plan = planImport(
    [
      "8호선__석촌 도착상_한글_오른쪽.mp3",
      "8호선__석촌 도착상_영문_오른쪽.mp3",
      "5호선__마천, 상일동 출발 여의도행.mp3"
    ],
    ["석촌", "여의도"]
  );
  assert.deepEqual(
    plan.moves.map(move => move.target),
    ["석촌.mp3"],
    "한글 도착 안내만 옮긴다"
  );
  assert.deepEqual(
    plan.skipped.map(entry => entry.reason).sort(),
    ["departure", "foreign"]
  );
  assert.deepEqual(plan.missing, ["여의도"]);
});

test("길이를 알려주면 짧은 안내를 고르고, 모르면 종착 안내를 뒤로 민다", () => {
  const short = planImport(
    ["4호선__노원_상행.mp3", "7호선__노원 - 국문.mp3"],
    ["노원"],
    [],
    { durations: { "4호선__노원_상행.mp3": 32.1, "7호선__노원 - 국문.mp3": 14.3 } }
  );
  assert.equal(short.moves[0].fileName, "7호선__노원 - 국문.mp3");

  const noDurations = planImport(["노원_종착.mp3", "노원_상행.mp3"], ["노원"]);
  assert.equal(noDurations.moves[0].fileName, "노원_상행.mp3");
});
