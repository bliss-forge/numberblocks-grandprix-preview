// 도하네 가족. 여섯 분이 각자 살던 역에서 도하네 집(도하역)으로 모여
// 마중 나온다. 역마다 내렸다 타는 것이 지루해서, 지금은 지나가며 이름만
// 보고 마지막에 한꺼번에 만난다.
export const FAMILY_STATIONS = Object.freeze([
  Object.freeze({ id: "mom", station: "엄마", label: "엄마" }),
  Object.freeze({ id: "dad", station: "아빠", label: "아빠" }),
  Object.freeze({
    id: "goyang-grandpa", station: "고양 할아버지", label: "고양 할아버지"
  }),
  Object.freeze({
    id: "goyang-grandma", station: "고양 할머니", label: "고양 할머니"
  }),
  Object.freeze({
    id: "gimhae-grandpa", station: "김해 할아버지", label: "김해 할아버지"
  }),
  Object.freeze({
    id: "gimhae-grandma", station: "김해 할머니", label: "김해 할머니"
  })
]);

// 가족이 다 모이는 곳 — 도하네 집.
export const FAMILY_HOME = Object.freeze({
  id: "family", label: "도하네 집", station: "도하", icon: "⭐"
});

export const SUBWAY_LINES = Object.freeze([
  Object.freeze({
    number: 1,
    color: "#0052A4",
    loop: false,
    stations: Object.freeze([
      "서울역", "시청", "종각", "종로3가", "종로5가",
      "동대문", "동묘앞", "신설동", "제기동", "청량리"
    ])
  }),
  Object.freeze({
    number: 2,
    color: "#00A84D",
    loop: true,
    stations: Object.freeze([
      "시청", "을지로3가", "동대문역사문화공원", "왕십리", "성수",
      "건대입구", "잠실", "종합운동장", "삼성", "강남", "교대",
      "사당", "신림", "신도림", "영등포구청", "당산", "합정",
      "홍대입구", "충정로"
    ])
  }),
  Object.freeze({
    number: 3,
    color: "#EF7C1C",
    loop: false,
    stations: Object.freeze([
      "불광", "독립문", "경복궁", "안국", "종로3가", "을지로3가",
      "충무로", "약수", "압구정", "고속터미널", "교대", "양재"
    ])
  }),
  Object.freeze({
    number: 4,
    color: "#00A5DE",
    loop: false,
    stations: Object.freeze([
      "노원", "미아사거리", "혜화", "동대문", "동대문역사문화공원",
      "충무로", "명동", "회현", "서울역", "삼각지", "이촌",
      "동작", "사당", "대공원"
    ])
  }),
  Object.freeze({
    number: 5,
    color: "#996CAC",
    loop: false,
    stations: Object.freeze([
      "김포공항", "여의도", "여의나루", "공덕", "충정로", "광화문",
      "종로3가", "동대문역사문화공원", "왕십리", "군자", "천호"
    ])
  }),
  Object.freeze({
    number: 6,
    color: "#CD7C2F",
    loop: false,
    stations: Object.freeze([
      "월드컵경기장", "합정", "공덕", "삼각지", "이태원", "약수", "동묘앞"
    ])
  }),
  Object.freeze({
    number: 7,
    color: "#747F00",
    loop: false,
    stations: Object.freeze([
      "노원", "군자", "어린이대공원", "건대입구", "청담", "고속터미널", "이수"
    ])
  }),
  Object.freeze({
    number: 8,
    color: "#E6186C",
    loop: false,
    stations: Object.freeze([
      "천호", "몽촌토성", "잠실", "석촌", "송파", "모란"
    ])
  }),
  Object.freeze({
    number: 9,
    color: "#BDB092",
    loop: false,
    stations: Object.freeze([
      "김포공항", "가양", "당산", "국회의사당", "여의도", "노량진",
      "동작", "고속터미널", "봉은사", "종합운동장"
    ])
  }),
  // 서울에는 없는 노선입니다. 도하네 가족이 사는 곳을 한 줄로 이어 놓은
  // 보너스 노선이라 진짜 지하철과 만나는 데가 없고, 목적지를 고르는 화면에서
  // 스페이스바로만 들어갑니다.
  Object.freeze({
    number: 10,
    color: "#00B3A4",
    loop: false,
    family: true,
    // 신도림에서 2호선과 만나 남쪽으로 내려간다. 진짜 노선망에 붙어 있어야
    // 갈아타며 찾아가는 여정이 된다.
    stations: Object.freeze([
      "신도림",
      ...FAMILY_STATIONS.map(member => member.station),
      FAMILY_HOME.station
    ])
  })
]);

// 10호선만 숫자키가 두 자리라 0으로 부릅니다. 목적지 열 번째도 이미 0이라
// 아이가 배운 규칙 그대로입니다.
export const LINE_KEYS = Object.freeze({ 10: "0" });

export function lineKeyLabel(number) {
  return LINE_KEYS[number] ?? String(number);
}

export function lineForKey(key) {
  const found = Object.entries(LINE_KEYS)
    .find(([, digit]) => digit === String(key));
  return found ? Number(found[0]) : Number(key);
}

export const STATION_COORDS = Object.freeze({
  서울역: Object.freeze({ x: 44, y: 44 }),
  시청: Object.freeze({ x: 45, y: 40 }),
  종각: Object.freeze({ x: 48, y: 37 }),
  종로3가: Object.freeze({ x: 51, y: 36 }),
  종로5가: Object.freeze({ x: 54, y: 36 }),
  동대문: Object.freeze({ x: 57, y: 35 }),
  동묘앞: Object.freeze({ x: 59, y: 33 }),
  신설동: Object.freeze({ x: 61, y: 31 }),
  제기동: Object.freeze({ x: 63, y: 29 }),
  청량리: Object.freeze({ x: 65, y: 27 }),
  을지로3가: Object.freeze({ x: 49, y: 39 }),
  동대문역사문화공원: Object.freeze({ x: 55, y: 39 }),
  왕십리: Object.freeze({ x: 63, y: 40 }),
  성수: Object.freeze({ x: 68, y: 41 }),
  건대입구: Object.freeze({ x: 72, y: 43 }),
  잠실: Object.freeze({ x: 78, y: 52 }),
  종합운동장: Object.freeze({ x: 74, y: 56 }),
  삼성: Object.freeze({ x: 70, y: 58 }),
  강남: Object.freeze({ x: 62, y: 62 }),
  교대: Object.freeze({ x: 58, y: 63 }),
  사당: Object.freeze({ x: 42, y: 70 }),
  신림: Object.freeze({ x: 34, y: 72 }),
  신도림: Object.freeze({ x: 26, y: 66 }),
  영등포구청: Object.freeze({ x: 26, y: 60 }),
  당산: Object.freeze({ x: 26, y: 55 }),
  합정: Object.freeze({ x: 30, y: 48 }),
  홍대입구: Object.freeze({ x: 34, y: 45 }),
  충정로: Object.freeze({ x: 41, y: 42 }),
  불광: Object.freeze({ x: 32, y: 22 }),
  독립문: Object.freeze({ x: 39, y: 32 }),
  경복궁: Object.freeze({ x: 44, y: 32 }),
  안국: Object.freeze({ x: 47, y: 33 }),
  충무로: Object.freeze({ x: 51, y: 42 }),
  약수: Object.freeze({ x: 55, y: 45 }),
  압구정: Object.freeze({ x: 63, y: 53 }),
  고속터미널: Object.freeze({ x: 54, y: 60 }),
  양재: Object.freeze({ x: 60, y: 68 }),
  노원: Object.freeze({ x: 62, y: 8 }),
  미아사거리: Object.freeze({ x: 56, y: 18 }),
  혜화: Object.freeze({ x: 52, y: 30 }),
  명동: Object.freeze({ x: 48, y: 43 }),
  회현: Object.freeze({ x: 46, y: 44 }),
  삼각지: Object.freeze({ x: 44, y: 50 }),
  이촌: Object.freeze({ x: 45, y: 54 }),
  동작: Object.freeze({ x: 42, y: 61 }),
  대공원: Object.freeze({ x: 46, y: 86 }),
  김포공항: Object.freeze({ x: 6, y: 52 }),
  여의도: Object.freeze({ x: 28, y: 60 }),
  여의나루: Object.freeze({ x: 31, y: 57 }),
  공덕: Object.freeze({ x: 39, y: 47 }),
  광화문: Object.freeze({ x: 46, y: 38 }),
  군자: Object.freeze({ x: 71, y: 36 }),
  천호: Object.freeze({ x: 80, y: 45 }),
  월드컵경기장: Object.freeze({ x: 24, y: 40 }),
  이태원: Object.freeze({ x: 48, y: 50 }),
  어린이대공원: Object.freeze({ x: 73, y: 40 }),
  청담: Object.freeze({ x: 68, y: 52 }),
  이수: Object.freeze({ x: 44, y: 66 }),
  몽촌토성: Object.freeze({ x: 79, y: 49 }),
  석촌: Object.freeze({ x: 77, y: 56 }),
  송파: Object.freeze({ x: 78, y: 60 }),
  모란: Object.freeze({ x: 82, y: 78 }),
  가양: Object.freeze({ x: 14, y: 55 }),
  국회의사당: Object.freeze({ x: 24, y: 60 }),
  노량진: Object.freeze({ x: 34, y: 63 }),
  봉은사: Object.freeze({ x: 68, y: 56 }),
  // 가족 노선은 신도림에서 갈라져 도시 남쪽 빈 자리를 지나 도하네 집에서
  // 끝난다. 다른 노선과 겹치지 않는 길로 내려간다.
  엄마: Object.freeze({ x: 20, y: 76 }),
  아빠: Object.freeze({ x: 18, y: 85 }),
  "고양 할아버지": Object.freeze({ x: 24, y: 92 }),
  "고양 할머니": Object.freeze({ x: 33, y: 96 }),
  "김해 할아버지": Object.freeze({ x: 43, y: 97 }),
  "김해 할머니": Object.freeze({ x: 53, y: 96 }),
  도하: Object.freeze({ x: 62, y: 93 })
});

export const SUBWAY_PLACES = Object.freeze([
  Object.freeze({
    id: "zoo", label: "동물원", station: "대공원",
    icon: "🐘", voiceKey: "subway-place-zoo"
  }),
  Object.freeze({
    id: "lunapark", label: "놀이공원", station: "잠실",
    icon: "🎢", voiceKey: "subway-place-lunapark"
  }),
  Object.freeze({
    id: "baseball", label: "야구장", station: "종합운동장",
    icon: "⚾", voiceKey: "subway-place-baseball"
  }),
  Object.freeze({
    id: "palace", label: "경복궁", station: "경복궁",
    icon: "🏯", voiceKey: "subway-place-palace"
  }),
  Object.freeze({
    id: "namsan", label: "남산타워", station: "명동",
    icon: "🗼", voiceKey: "subway-place-namsan"
  }),
  Object.freeze({
    id: "hanriver", label: "한강공원", station: "여의나루",
    icon: "⛵", voiceKey: "subway-place-hanriver"
  }),
  Object.freeze({
    id: "skypark", label: "하늘공원", station: "월드컵경기장",
    icon: "🪁", voiceKey: "subway-place-skypark"
  }),
  Object.freeze({
    id: "childpark", label: "어린이대공원", station: "어린이대공원",
    icon: "🎠", voiceKey: "subway-place-childpark"
  }),
  Object.freeze({
    id: "lake", label: "석촌호수", station: "석촌",
    icon: "🦆", voiceKey: "subway-place-lake"
  }),
  Object.freeze({
    id: "assembly", label: "국회의사당", station: "국회의사당",
    icon: "🏛️", voiceKey: "subway-place-assembly"
  })
]);

export function lineByNumber(number) {
  return SUBWAY_LINES.find(line => line.number === number) ?? null;
}

export function linesAtStation(station) {
  return SUBWAY_LINES.filter(line => line.stations.includes(station));
}

export function isTransferStation(station) {
  return linesAtStation(station).length >= 2;
}

// 서울역 already ends in 역; appending another one gives "서울역역".
export function stationLabel(name) {
  const text = String(name);
  return text.endsWith("역") ? text : `${text}역`;
}
