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
  const candidate = normalizeCandidate(fileName);
  if (!candidate) return { station: null, reason: "empty" };

  const exact = ordered.find(
    station => candidate === station || candidate === `${station}역`
  );
  if (exact) return { station: exact, reason: "exact" };

  const compact = candidate.replace(/\s+/g, "");
  const compactHit = ordered.find(
    station => compact === station || compact === `${station}역`
  );
  if (compactHit) return { station: compactHit, reason: "exact" };

  const contained = ordered.filter(station => compact.includes(station));
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
export function planImport(fileNames, stations, existing = []) {
  const have = new Set(existing);
  const moves = [];
  const conflicts = [];
  const unmatched = [];

  // Rank so the cleanest name wins a station: an exact hit beats a substring
  // hit, and among equals the file carrying the least extra wording wins.
  const RANK = { exact: 0, contains: 1, "contains-ambiguous": 2 };
  const scored = [];
  for (const fileName of fileNames) {
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
      rank: RANK[reason] ?? 9,
      noise: Math.min(
        Math.abs(candidate.length - station.length),
        Math.abs(candidate.length - station.length - 1)
      )
    });
  }
  scored.sort((a, b) =>
    a.rank - b.rank ||
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
      also: entry.also,
      overwrites: have.has(entry.station)
    });
  }
  moves.sort((a, b) => a.station.localeCompare(b.station, "ko"));

  const missing = stations
    .filter(station => !claimed.has(station) && !have.has(station))
    .sort((a, b) => a.localeCompare(b, "ko"));

  return { moves, conflicts, unmatched, missing };
}
