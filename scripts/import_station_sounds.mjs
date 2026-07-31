#!/usr/bin/env node
// Sorts dropped station-announcement mp3s into subway_sound/ under the names
// the game loads them by.
//
//   node scripts/import_station_sounds.mjs ~/Downloads/역이름            # dry run
//   node scripts/import_station_sounds.mjs ~/Downloads/역이름 --apply    # copy
//   node scripts/import_station_sounds.mjs ~/Downloads/역이름 --apply --move
//
// Dry run is the default on purpose: it prints the whole plan first so nothing
// is copied over or moved out of a folder by surprise.

import { readdir, copyFile, rename, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUBWAY_LINES, SUBWAY_PLACES, isTransferStation }
  from "../src/subway-map-data.mjs";
import { planImport } from "../src/station-sound-import.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SOUND_DIR = path.join(REPO, "subway_sound");

function stationsThatSpeak() {
  const wanted = new Set();
  for (const line of SUBWAY_LINES) {
    for (const station of line.stations) {
      if (isTransferStation(station)) wanted.add(station);
    }
  }
  for (const place of SUBWAY_PLACES) wanted.add(place.station);
  return [...wanted];
}

function allStations() {
  const every = new Set();
  for (const line of SUBWAY_LINES) {
    for (const station of line.stations) every.add(station);
  }
  return [...every];
}

async function main() {
  const args = process.argv.slice(2);
  const source = args.find(arg => !arg.startsWith("--"));
  const apply = args.includes("--apply");
  const move = args.includes("--move");

  if (!source) {
    console.error("어디서 가져올까요? 폴더 경로를 알려주세요.");
    console.error("  node scripts/import_station_sounds.mjs <폴더> [--apply] [--move]");
    process.exit(1);
  }
  const from = path.resolve(source.replace(/^~/, process.env.HOME ?? "~"));
  if (!existsSync(from)) {
    console.error(`폴더를 찾을 수 없어요: ${from}`);
    process.exit(1);
  }

  const entries = await readdir(from, { withFileTypes: true });
  const files = entries
    .filter(entry => entry.isFile() && /\.mp3$/i.test(entry.name))
    .map(entry => entry.name)
    .sort((a, b) => a.localeCompare(b, "ko"));

  if (files.length === 0) {
    console.error(`${from} 안에 mp3가 없어요.`);
    process.exit(1);
  }

  await mkdir(SOUND_DIR, { recursive: true });
  const existing = (await readdir(SOUND_DIR))
    .filter(name => /\.mp3$/i.test(name))
    .map(name => name.replace(/\.mp3$/i, ""));

  // Match against every station so extra files are still filed correctly, and
  // report the gap only for the stations the game actually announces.
  const speak = stationsThatSpeak();
  const plan = planImport(files, allStations(), existing);
  const stillMissing = speak.filter(
    station => !plan.moves.some(m => m.station === station) &&
      !existing.includes(station)
  ).sort((a, b) => a.localeCompare(b, "ko"));

  console.log(`가져올 곳: ${from}`);
  console.log(`보낼 곳:   ${SOUND_DIR}`);
  console.log(`mp3 ${files.length}개 발견\n`);

  if (plan.moves.length > 0) {
    console.log(`정리할 파일 ${plan.moves.length}개`);
    for (const entry of plan.moves) {
      const note = [
        entry.reason === "exact" ? "" : `(${entry.reason})`,
        entry.overwrites ? "※ 기존 파일 덮어씀" : "",
        entry.also.length ? `※ ${entry.also.join(",")}와도 겹쳐 보임` : ""
      ].filter(Boolean).join(" ");
      console.log(`  ${entry.fileName}  ->  ${entry.target} ${note}`.trimEnd());
    }
    console.log("");
  }

  if (plan.conflicts.length > 0) {
    console.log(`같은 역에 여러 파일 ${plan.conflicts.length}개 — 건너뜁니다`);
    for (const entry of plan.conflicts) {
      console.log(`  ${entry.fileName} (${entry.station}: ${entry.keeping} 사용)`);
    }
    console.log("");
  }

  if (plan.unmatched.length > 0) {
    console.log(`역 이름을 못 찾은 파일 ${plan.unmatched.length}개 — 그대로 둡니다`);
    for (const entry of plan.unmatched) console.log(`  ${entry.fileName}`);
    console.log("");
  }

  console.log(
    stillMissing.length === 0
      ? "음성이 필요한 역 전부 준비됨 ✓"
      : `아직 음성 없는 역 ${stillMissing.length}개: ${stillMissing.join(" ")}`
  );

  if (!apply) {
    console.log("\n미리보기입니다. 실제로 옮기려면 --apply 를 붙여주세요.");
    console.log("  (원본을 남기지 않고 이동하려면 --apply --move)");
    return;
  }

  let done = 0;
  for (const entry of plan.moves) {
    const src = path.join(from, entry.fileName);
    const dest = path.join(SOUND_DIR, entry.target);
    const info = await stat(src);
    if (info.size < 1024) {
      console.log(`  건너뜀 (너무 작음): ${entry.fileName}`);
      continue;
    }
    if (move) await rename(src, dest).catch(async error => {
      if (error.code !== "EXDEV") throw error;
      await copyFile(src, dest);
    });
    else await copyFile(src, dest);
    done += 1;
  }
  console.log(`\n${done}개 ${move ? "이동" : "복사"} 완료.`);
}

await main();
