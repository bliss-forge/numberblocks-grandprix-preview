// 목적지에 내린 뒤 하는 사진 찍기.
//
// 방향키로 네모 프레임을 옮겨 그 장소의 주인공(코끼리·관람차·야구공…)을
// 가운데 넣고 스페이스를 누르면 찰칵. 자유롭게 움직이면 네다섯 살 손에는
// 너무 미끄러워서 칸으로 끊어 움직인다.
//
// 틀려도 벌점은 없다 — 어느 쪽으로 가야 하는지 알려 주고, 세 번 빗나가면
// 네 번째는 그냥 찍힌다. 폴짝 게임과 같은 규칙이라 아이가 새로 배울 게 없다.

import { SUBWAY_PLACES } from "./subway-map-data.mjs";

export const PHOTO_COLS = 5;
export const PHOTO_ROWS = 3;
export const PHOTO_PITY = 3;

// 각 도착지 그림에서 주인공이 서 있는 칸. 그림은 모두 1000×520 무대라
// 칸 하나가 200×173쯤 된다.
export const PHOTO_SUBJECTS = Object.freeze({
  zoo: Object.freeze({ col: 1, row: 2, label: "코끼리" }),
  lunapark: Object.freeze({ col: 0, row: 1, label: "관람차" }),
  baseball: Object.freeze({ col: 2, row: 1, label: "야구장" }),
  palace: Object.freeze({ col: 2, row: 1, label: "경복궁" }),
  namsan: Object.freeze({ col: 2, row: 0, label: "남산타워" }),
  hanriver: Object.freeze({ col: 0, row: 2, label: "텐트" }),
  skypark: Object.freeze({ col: 3, row: 1, label: "바람개비" }),
  childpark: Object.freeze({ col: 3, row: 1, label: "풍선" }),
  lake: Object.freeze({ col: 2, row: 1, label: "백조" }),
  assembly: Object.freeze({ col: 2, row: 1, label: "국회의사당" })
});

export { withObjectParticle };

export function photoSubject(placeId) {
  return PHOTO_SUBJECTS[placeId] ?? null;
}

export function createPhotoHunt(placeId) {
  const subject = photoSubject(placeId);
  if (!subject) return null;
  return {
    placeId,
    subject,
    // 가운데에서 시작한다 — 어느 쪽으로든 두 칸이면 닿는다.
    col: Math.floor(PHOTO_COLS / 2),
    row: Math.floor(PHOTO_ROWS / 2),
    misses: 0,
    taken: false
  };
}

export function onSubject(hunt) {
  return hunt.col === hunt.subject.col && hunt.row === hunt.subject.row;
}

// 어느 쪽으로 가야 하는지 한 마디로. 가로가 더 멀면 가로부터 알려 준다.
export function photoNudge(hunt) {
  const dx = hunt.subject.col - hunt.col;
  const dy = hunt.subject.row - hunt.row;
  if (dx === 0 && dy === 0) return null;
  if (Math.abs(dx) >= Math.abs(dy)) return dx > 0 ? "right" : "left";
  return dy > 0 ? "down" : "up";
}

// 받침이 있으면 "을", 없으면 "를" — 야구장'를'은 아이 귀에 바로 걸린다.
function withObjectParticle(word) {
  const last = word.charCodeAt(word.length - 1);
  const hangul = last >= 0xac00 && last <= 0xd7a3;
  const hasFinal = hangul && (last - 0xac00) % 28 !== 0;
  return `${word}${hasFinal ? "을" : "를"}`;
}

const NUDGE_WORDS = Object.freeze({
  left: "← 왼쪽으로 가요",
  right: "→ 오른쪽으로 가요",
  up: "↑ 위로 가요",
  down: "↓ 아래로 가요"
});

export function photoHint(hunt) {
  if (hunt.taken) return "찰칵! 잘 찍었어요";
  const subject = withObjectParticle(hunt.subject.label);
  if (onSubject(hunt)) return `${subject} 담았어요! ⎵ 눌러서 찰칵`;
  return `${subject} 찾아요 — ${NUDGE_WORDS[photoNudge(hunt)]}`;
}

export function movePhotoFrame(hunt, direction) {
  if (hunt.taken) return { hunt, event: { type: "already-taken" } };
  const step = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[direction];
  if (!step) return { hunt, event: { type: "ignored" } };
  const col = hunt.col + step[0];
  const row = hunt.row + step[1];
  if (col < 0 || col >= PHOTO_COLS || row < 0 || row >= PHOTO_ROWS) {
    return { hunt, event: { type: "edge" } };
  }
  return {
    hunt: { ...hunt, col, row },
    event: { type: "framed", onSubject: col === hunt.subject.col && row === hunt.subject.row }
  };
}

export function shootPhoto(hunt) {
  if (hunt.taken) return { hunt, event: { type: "already-taken" } };
  // 세 번 빗나갔으면 네 번째는 그냥 찍힌다. 이 놀이는 눈대중을 가르치지,
  // 아이를 도착지에 붙잡아 두려는 것이 아니다.
  if (onSubject(hunt) || hunt.misses >= PHOTO_PITY) {
    return {
      hunt: { ...hunt, taken: true },
      event: { type: "taken", subject: hunt.subject }
    };
  }
  return {
    hunt: { ...hunt, misses: hunt.misses + 1 },
    event: { type: "missed", nudge: photoNudge(hunt) }
  };
}

// ── 사진첩 ────────────────────────────────────────────────────────────────
// 찍은 곳이 쌓이는 것이 다음에 또 가고 싶은 이유가 된다.

const ALBUM_KEY = "numberblocks:photo-album";

export function loadAlbum(storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem(ALBUM_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const known = new Set(SUBWAY_PLACES.map(place => place.id));
    return parsed.filter(id => known.has(id));
  } catch {
    return [];
  }
}

export function saveAlbum(album, storage = globalThis.localStorage) {
  try {
    storage?.setItem(ALBUM_KEY, JSON.stringify([...new Set(album)]));
  } catch {
    // 사진첩을 못 적는다고 놀이가 멈출 이유는 없다.
  }
  return album;
}

export function addPhoto(placeId, storage = globalThis.localStorage) {
  const album = loadAlbum(storage);
  if (album.includes(placeId)) return album;
  const next = [...album, placeId];
  saveAlbum(next, storage);
  return next;
}

export function albumBoard(album) {
  return SUBWAY_PLACES.map(place => ({
    id: place.id,
    label: place.label,
    taken: album.includes(place.id)
  }));
}
