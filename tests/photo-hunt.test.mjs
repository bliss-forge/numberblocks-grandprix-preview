import test from "node:test";
import assert from "node:assert/strict";
import {
  PHOTO_COLS,
  PHOTO_PITY,
  PHOTO_ROWS,
  PHOTO_SUBJECTS,
  addPhoto,
  albumBoard,
  createPhotoHunt,
  loadAlbum,
  movePhotoFrame,
  onSubject,
  photoHint,
  photoNudge,
  photoSubject,
  shootPhoto
} from "../src/photo-hunt.mjs";
import { SUBWAY_PLACES } from "../src/subway-map-data.mjs";

function fakeStorage(seed = {}) {
  const box = new Map(Object.entries(seed));
  return {
    getItem: key => (box.has(key) ? box.get(key) : null),
    setItem: (key, value) => box.set(key, String(value)),
    box
  };
}

function walkTo(hunt, col, row) {
  let current = hunt;
  for (let guard = 0; guard < 20 && current.col !== col; guard += 1) {
    current = movePhotoFrame(current, current.col < col ? "right" : "left").hunt;
  }
  for (let guard = 0; guard < 20 && current.row !== row; guard += 1) {
    current = movePhotoFrame(current, current.row < row ? "down" : "up").hunt;
  }
  return current;
}

test("목적지 열 곳 모두 찍을 주인공이 정해져 있다", () => {
  for (const place of SUBWAY_PLACES) {
    const subject = photoSubject(place.id);
    assert.ok(subject, place.label);
    assert.ok(subject.col >= 0 && subject.col < PHOTO_COLS, place.label);
    assert.ok(subject.row >= 0 && subject.row < PHOTO_ROWS, place.label);
    assert.ok(subject.label.length > 0, place.label);
  }
  assert.equal(Object.keys(PHOTO_SUBJECTS).length, SUBWAY_PLACES.length);
  assert.equal(photoSubject("nowhere"), null);
  assert.equal(createPhotoHunt("nowhere"), null);
});

test("프레임은 가운데에서 시작해 어느 주인공에게든 닿는다", () => {
  for (const place of SUBWAY_PLACES) {
    const hunt = createPhotoHunt(place.id);
    assert.equal(hunt.col, Math.floor(PHOTO_COLS / 2), place.label);
    assert.equal(hunt.row, Math.floor(PHOTO_ROWS / 2), place.label);
    assert.equal(hunt.taken, false);
    const arrived = walkTo(hunt, hunt.subject.col, hunt.subject.row);
    assert.equal(onSubject(arrived), true, `${place.label}까지 걸어갈 수 있다`);
  }
});

test("바깥으로는 못 나가고 제자리에 머문다", () => {
  let hunt = createPhotoHunt("zoo");
  for (let step = 0; step < 9; step += 1) hunt = movePhotoFrame(hunt, "left").hunt;
  assert.equal(hunt.col, 0);
  const blocked = movePhotoFrame(hunt, "left");
  assert.equal(blocked.event.type, "edge");
  assert.equal(blocked.hunt.col, 0, "제자리");
});

test("어느 쪽으로 가야 하는지 알려 준다", () => {
  const hunt = createPhotoHunt("zoo");           // 주인공은 왼쪽 칸
  assert.equal(photoNudge(hunt), "left");
  assert.match(photoHint(hunt), /왼쪽/);

  const above = createPhotoHunt("namsan");        // 주인공은 윗줄
  assert.equal(photoNudge(above), "up");

  const onIt = walkTo(hunt, hunt.subject.col, hunt.subject.row);
  assert.equal(photoNudge(onIt), null);
  assert.match(photoHint(onIt), /⎵/);
});

test("주인공을 담고 누르면 찍힌다", () => {
  const hunt = createPhotoHunt("baseball");
  const framed = walkTo(hunt, hunt.subject.col, hunt.subject.row);
  const shot = shootPhoto(framed);
  assert.equal(shot.event.type, "taken");
  assert.equal(shot.event.subject.label, "야구장");
  assert.equal(shot.hunt.taken, true);
  assert.equal(framed.taken, false, "원래 상태는 그대로 둔다");
  assert.equal(shootPhoto(shot.hunt).event.type, "already-taken");
});

test("빗나가도 벌점은 없고 네 번째는 그냥 찍힌다", () => {
  let hunt = createPhotoHunt("zoo");
  for (let miss = 0; miss < PHOTO_PITY; miss += 1) {
    const shot = shootPhoto(hunt);
    assert.equal(shot.event.type, "missed", `${miss + 1}번째`);
    assert.ok(shot.event.nudge, "어느 쪽인지 알려 준다");
    hunt = shot.hunt;
  }
  const pity = shootPhoto(hunt);
  assert.equal(pity.event.type, "taken", "네 번째는 그냥 찍힌다");
  assert.equal(onSubject(hunt), false, "주인공 위가 아니어도");
});

test("사진첩은 찍은 곳만 겹치지 않게 쌓는다", () => {
  const storage = fakeStorage();
  assert.deepEqual(loadAlbum(storage), []);
  assert.deepEqual(addPhoto("zoo", storage), ["zoo"]);
  assert.deepEqual(addPhoto("zoo", storage), ["zoo"], "같은 곳은 한 번만");
  assert.deepEqual(addPhoto("lake", storage), ["zoo", "lake"]);
  assert.deepEqual(loadAlbum(storage), ["zoo", "lake"], "다시 켜도 남는다");
});

test("사진첩이 깨져 있어도 놀이는 멈추지 않는다", () => {
  assert.deepEqual(loadAlbum(fakeStorage({ "numberblocks:photo-album": "{{" })), []);
  assert.deepEqual(loadAlbum(fakeStorage({ "numberblocks:photo-album": '"zoo"' })), []);
  assert.deepEqual(
    loadAlbum(fakeStorage({ "numberblocks:photo-album": '["zoo","없는곳"]' })),
    ["zoo"],
    "모르는 곳은 걸러낸다"
  );
  assert.deepEqual(loadAlbum(undefined), []);
});

test("사진첩 판은 목적지 열 칸을 순서대로 보여 준다", () => {
  const board = albumBoard(["zoo", "lake"]);
  assert.equal(board.length, SUBWAY_PLACES.length);
  assert.deepEqual(
    board.map(entry => entry.label),
    SUBWAY_PLACES.map(place => place.label)
  );
  assert.equal(board.find(entry => entry.id === "zoo").taken, true);
  assert.equal(board.find(entry => entry.id === "palace").taken, false);
});
