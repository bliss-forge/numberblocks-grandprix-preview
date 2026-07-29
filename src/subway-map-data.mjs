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
  })
]);

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
  봉은사: Object.freeze({ x: 68, y: 56 })
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
