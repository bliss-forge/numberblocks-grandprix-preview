// Works out which station a dropped mp3 belongs to.
//
// The game loads station announcements as `subway_sound/<역이름>.mp3`, but the
// files people actually download are named all sorts of ways:
//   강남.mp3 · 강남역.mp3 · 02_강남역.mp3 · 강남역 도착.mp3
//   서울교통공사_강남역_안내방송.mp3 · 강남(2호선).mp3 · 강남역-수정.mp3
// This module turns any of those into the station name the game expects, and
// says plainly when it cannot.

const NOISE_WORDS = [
  "안내방송", "안내", "방송", "도착", "출발", "예고", "수정", "최종", "원본",
  "서울교통공사", "서울지하철", "코레일", "상선", "하선", "내선", "외선",
  "환승", "역명", "음성", "녹음", "mp3", "MP3", "final", "copy"
];

// Announcement packs ship several recordings per station. These mark the ones
// that are not "이번 역은 OO역입니다": departure announcements name the train's
// destination rather than the station you are standing in, and the foreign
// language takes are not what a Korean-speaking child needs.
const FOREIGN_MARKS = ["영문", "중문", "일문", "English", "제니퍼", "클라이드"];
const DEPARTURE_MARK = "출발";

export function describeAnnouncement(fileName) {
  const name = String(fileName);
  const kind = name.includes("도착") ? "도착"
    : name.includes("환승") ? "환승"
    : name.includes("종착") ? "종착"
    : "기본";
  const foreign = FOREIGN_MARKS.some(mark => name.includes(mark));
  const departure = name.includes(DEPARTURE_MARK);
  return { kind, foreign, departure, usable: !foreign && !departure };
}

// Pulls the station out of the slot it occupies in the packs people download:
//   5호선__공덕 환승상_한글_왼쪽 · 1호선__동묘앞_환승 · 시청_내선 · 경복궁
//   1. 장암~온수, 부평구청__17. 어린이대공원, 세종대 - 국문 (강희선)
// Folders a file sat in are flattened onto the front with "__", so everything
// up to the last one is where the file came from, and everything after the
// station name describes the recording rather than the place.
export function stationToken(fileName) {
  let text = String(fileName).replace(/\.[A-Za-z0-9]+$/, "");
  text = text.replace(/[([{（【][^)\]}）】]*[)\]}）】]/g, " ");
  text = text.replace(/^.*__/, "");
  text = text.replace(/^\s*\d+\s*[.)]\s*/, "");
  text = text.replace(/\s+-\s+.*$/, "");
  const head = text.trim().split(/[_\s]/)[0] ?? "";
  return head.split(/[,、]/)[0].trim();
}

// 서울역 is spelled 서울 in most packs, so a station already ending in 역 also
// answers to its bare form — the mirror of 강남 also answering to 강남역.
function nameVariants(station) {
  return station.endsWith("역")
    ? [station, station.slice(0, -1)]
    : [station, `${station}역`];
}

const isHangul = character => character !== undefined && /[가-힣]/.test(character);

// 시청 must not swallow 부천시청, and 잠실 must not swallow 잠실나루: a station
// only counts when no extra Hangul is glued to either end of it.
function containsStation(compact, station) {
  for (let from = 0; ; from += 1) {
    const at = compact.indexOf(station, from);
    if (at < 0) return false;
    const before = compact[at - 1];
    const afterIndex = at + station.length;
    const after = compact[afterIndex] === "역"
      ? compact[afterIndex + 1]
      : compact[afterIndex];
    if (!isHangul(before) && !isHangul(after)) return true;
    from = at;
  }
}

export function normalizeCandidate(fileName) {
  let text = String(fileName).replace(/\.[A-Za-z0-9]+$/, "");
  // strip bracketed asides: (2호선) [1] （상선）
  text = text.replace(/[([{（【][^)\]}）】]*[)\]}）】]/g, " ");
  // strip leading track numbers: 01_ · 12. · 3 -
  text = text.replace(/^\s*\d+\s*[-_.)]*\s*/, " ");
  for (const word of NOISE_WORDS) text = text.split(word).join(" ");
  // separators become spaces so the remaining Korean stands alone
  text = text.replace(/[_\-.·,~+#@!]+/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

// Longest station names are tried first so 동대문역사문화공원 is never mistaken
// for 동대문, and 여의나루 is never mistaken for 여의도.
function byLengthDesc(stations) {
  return [...stations].sort((a, b) => b.length - a.length);
}

export function matchStation(fileName, stations) {
  const ordered = byLengthDesc(stations);
  const spelled = station => nameVariants(station);

  const token = stationToken(fileName);
  const tokenHit = token
    ? ordered.find(station => spelled(station).includes(token))
    : null;
  if (tokenHit) return { station: tokenHit, reason: "exact" };

  const candidate = normalizeCandidate(fileName);
  if (!candidate) return { station: null, reason: "empty" };

  const exact = ordered.find(station => spelled(station).includes(candidate));
  if (exact) return { station: exact, reason: "exact" };

  const compact = candidate.replace(/\s+/g, "");
  const compactHit = ordered.find(station => spelled(station).includes(compact));
  if (compactHit) return { station: compactHit, reason: "exact" };

  const contained = ordered.filter(
    station => spelled(station).some(name => containsStation(compact, name))
  );
  if (contained.length === 1) {
    return { station: contained[0], reason: "contains" };
  }
  if (contained.length > 1) {
    // longest wins, but say so — the caller may want to eyeball it
    return { station: contained[0], reason: "contains-ambiguous", also: contained.slice(1) };
  }
  return { station: null, reason: "no-match" };
}

// Builds the whole move plan: what lands where, what collides, what is left
// over, and which stations still have no sound at all.
export function planImport(fileNames, stations, existing = [], options = {}) {
  const have = new Set(existing);
  const durations = options.durations ?? {};
  const moves = [];
  const conflicts = [];
  const unmatched = [];
  const skipped = [];

  // Rank so the best recording wins a station: an exact hit beats a substring
  // hit, a mid-route arrival beats a "종착역입니다" take, a shorter clip beats a
  // long one, and among equals the file carrying the least extra wording wins.
  const RANK = { exact: 0, contains: 1, "contains-ambiguous": 2 };
  const scored = [];
  for (const fileName of fileNames) {
    const announcement = describeAnnouncement(fileName);
    if (!announcement.usable) {
      skipped.push({
        fileName,
        reason: announcement.departure ? "departure" : "foreign"
      });
      continue;
    }
    const { station, reason, also } = matchStation(fileName, stations);
    if (!station) {
      unmatched.push({ fileName, reason });
      continue;
    }
    // "역" is the standard suffix, not noise: 시청역.mp3 is as clean a name as
    // 시청.mp3, and cleaner than 시청 도착.mp3.
    const candidate = normalizeCandidate(fileName);
    scored.push({
      fileName,
      station,
      reason,
      also: also ?? [],
      kind: announcement.kind,
      seconds: durations[fileName] ?? null,
      rank: RANK[reason] ?? 9,
      terminal: announcement.kind === "종착" ? 1 : 0,
      noise: Math.min(
        Math.abs(candidate.length - station.length),
        Math.abs(candidate.length - station.length - 1)
      )
    });
  }
  scored.sort((a, b) =>
    a.rank - b.rank ||
    a.terminal - b.terminal ||
    (a.seconds ?? Infinity) - (b.seconds ?? Infinity) ||
    a.noise - b.noise ||
    a.fileName.length - b.fileName.length ||
    a.fileName.localeCompare(b.fileName, "ko"));

  const claimed = new Map();
  for (const entry of scored) {
    if (claimed.has(entry.station)) {
      conflicts.push({
        fileName: entry.fileName,
        station: entry.station,
        keeping: claimed.get(entry.station)
      });
      continue;
    }
    claimed.set(entry.station, entry.fileName);
    moves.push({
      fileName: entry.fileName,
      station: entry.station,
      target: `${entry.station}.mp3`,
      reason: entry.reason,
      kind: entry.kind,
      seconds: entry.seconds,
      also: entry.also,
      overwrites: have.has(entry.station)
    });
  }
  moves.sort((a, b) => a.station.localeCompare(b.station, "ko"));

  const missing = stations
    .filter(station => !claimed.has(station) && !have.has(station))
    .sort((a, b) => a.localeCompare(b, "ko"));

  return { moves, conflicts, unmatched, skipped, missing };
}
