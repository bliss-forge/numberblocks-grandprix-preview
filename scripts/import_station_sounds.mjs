#!/usr/bin/env node
// Sorts downloaded station-announcement recordings into subway_sound/ under the
// names the game loads them by. Reads loose mp3s, nested folders, and the .zip
// bundles the announcement packs are distributed as.
//
//   node scripts/import_station_sounds.mjs subway_sound/original_subway_sound
//   node scripts/import_station_sounds.mjs <폴더> --apply          # 복사
//   node scripts/import_station_sounds.mjs <폴더> --apply --move   # 이동
//
// Dry run is the default on purpose: it prints the whole plan first so nothing
// is copied over or moved out of a folder by surprise.

import { readdir, copyFile, rename, mkdir, stat, rm, mkdtemp }
  from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SUBWAY_LINES, SUBWAY_PLACES, isTransferStation }
  from "../src/subway-map-data.mjs";
import { describeAnnouncement, matchStation, planImport }
  from "../src/station-sound-import.mjs";

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, "..");
const SOUND_DIR = path.join(REPO, "subway_sound");
const SAMPLE = 8;

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

// Folders a file sat in become part of its name, joined by "__". That keeps two
// different 교대.mp3 apart and still leaves the station name where the matcher
// looks for it.
async function collect(dir, trail, found) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    // macOS hands back decomposed Hangul; the station names are composed.
    const name = entry.name.normalize("NFC");
    if (entry.isDirectory()) {
      await collect(full, [...trail, name], found);
    } else if (/\.mp3$/i.test(name)) {
      found.push({ key: [...trail, name].join("__"), path: full });
    }
  }
  return found;
}

// The packs are zipped on Windows, so their entry names are CP949 bytes. bsdtar
// (plain `tar` on macOS) detects that and writes proper Korean names, where
// `unzip` would hand the raw bytes to a filesystem that rejects them.
async function unpack(zipPath, into) {
  await mkdir(into, { recursive: true });
  try {
    await run("tar", ["-xf", zipPath, "-C", into]);
  } catch {
    await run("bsdtar", ["-xf", zipPath, "-C", into]);
  }
}

// A short "이번 역은 OO역입니다" beats a long take that trails off into transfer
// notices, so the plan wants durations. afinfo ships with macOS; ffprobe covers
// everything else. Neither present just means the plan falls back on names.
function measure(file) {
  try {
    const out = execFileSync("afinfo", [file], { encoding: "utf8" });
    const found = out.match(/estimated duration: ([0-9.]+)/);
    if (found) return Number(found[1]);
  } catch { /* fall through to ffprobe */ }
  try {
    const out = execFileSync("ffprobe", [
      "-v", "error", "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1", file
    ], { encoding: "utf8" });
    const seconds = Number(out.trim());
    return Number.isFinite(seconds) ? seconds : null;
  } catch {
    return null;
  }
}

// The packs ship 128kbps stereo takes of what is one person talking. Mono at
// 64kbps sounds the same through a tablet speaker and quarters what the repo
// and the phones loading the game have to carry. --raw keeps the original.
async function transcode(src, dest) {
  await run("ffmpeg", [
    "-y", "-loglevel", "error", "-i", src,
    "-ac", "1", "-b:a", "64k", "-map_metadata", "-1", dest
  ]);
}

function haveFfmpeg() {
  try {
    execFileSync("ffmpeg", ["-version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function listSome(entries, describe) {
  for (const entry of entries.slice(0, SAMPLE)) console.log(`  ${describe(entry)}`);
  if (entries.length > SAMPLE) console.log(`  … 그 밖에 ${entries.length - SAMPLE}개`);
}

async function main() {
  const args = process.argv.slice(2);
  const source = args.find(arg => !arg.startsWith("--"));
  const apply = args.includes("--apply");
  const move = args.includes("--move");
  const shrink = !args.includes("--raw") && haveFfmpeg();

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

  const unpacked = await mkdtemp(path.join(os.tmpdir(), "station-sounds-"));
  try {
    const zips = (await readdir(from, { recursive: true }))
      .filter(name => /\.zip$/i.test(name));
    for (const name of zips) {
      const stem = path.basename(name, path.extname(name));
      await unpack(path.join(from, name), path.join(unpacked, stem));
    }
    const files = await collect(from, [], []);
    if (zips.length > 0) files.push(...await collect(unpacked, [], []));
    files.sort((a, b) => a.key.localeCompare(b.key, "ko"));

    if (files.length === 0) {
      console.error(`${from} 안에 mp3가 없어요.`);
      process.exit(1);
    }

    await mkdir(SOUND_DIR, { recursive: true });
    const existing = (await readdir(SOUND_DIR))
      .filter(name => /\.mp3$/i.test(name))
      .map(name => name.replace(/\.mp3$/i, ""));

    // Match against every station so extra files are still filed correctly, and
    // report the gap only for the stations the game actually announces. Only the
    // files that can win a station are worth measuring.
    const stations = allStations();
    const durations = {};
    for (const file of files) {
      if (!describeAnnouncement(file.key).usable) continue;
      if (!matchStation(file.key, stations).station) continue;
      const seconds = measure(file.path);
      if (seconds !== null) durations[file.key] = seconds;
    }

    const plan = planImport(files.map(file => file.key), stations, existing, { durations });
    const sourceOf = new Map(files.map(file => [file.key, file.path]));
    const speak = stationsThatSpeak();
    const stillMissing = speak.filter(
      station => !plan.moves.some(entry => entry.station === station) &&
        !existing.includes(station)
    ).sort((a, b) => a.localeCompare(b, "ko"));

    console.log(`가져올 곳: ${from}`);
    console.log(`보낼 곳:   ${SOUND_DIR}`);
    console.log(`mp3 ${files.length}개 발견 (zip ${zips.length}개 펼침)\n`);

    if (plan.moves.length > 0) {
      console.log(`정리할 파일 ${plan.moves.length}개`);
      for (const entry of plan.moves) {
        const note = [
          entry.seconds ? `${entry.seconds.toFixed(0)}초` : "",
          entry.kind === "기본" ? "" : entry.kind,
          entry.reason === "exact" ? "" : `(${entry.reason})`,
          entry.overwrites ? "※ 기존 파일 덮어씀" : "",
          entry.also.length ? `※ ${entry.also.join(",")}와도 겹쳐 보임` : ""
        ].filter(Boolean).join(" ");
        console.log(`  ${entry.target.padEnd(22)} ← ${entry.fileName}  ${note}`.trimEnd());
      }
      console.log("");
    }

    if (plan.skipped.length > 0) {
      const departures = plan.skipped.filter(entry => entry.reason === "departure");
      console.log(
        `도착 안내가 아니라 건너뛴 파일 ${plan.skipped.length}개 ` +
        `(출발·행선 안내 ${departures.length}, 외국어 ${plan.skipped.length - departures.length})\n`
      );
    }

    if (plan.conflicts.length > 0) {
      console.log(`같은 역에 여러 파일 ${plan.conflicts.length}개 — 건너뜁니다`);
      listSome(plan.conflicts, entry => `${entry.fileName} (${entry.station}: ${entry.keeping} 사용)`);
      console.log("");
    }

    if (plan.unmatched.length > 0) {
      console.log(`게임에 없는 역이거나 이름을 못 찾은 파일 ${plan.unmatched.length}개 — 그대로 둡니다`);
      listSome(plan.unmatched, entry => entry.fileName);
      console.log("");
    }

    console.log(
      stillMissing.length === 0
        ? "음성이 필요한 역 전부 준비됨 ✓"
        : `아직 음성 없는 역 ${stillMissing.length}개: ${stillMissing.join(" ")}`
    );

    if (!apply) {
      console.log(
        shrink
          ? "\n가져올 때 64kbps 모노로 다시 인코딩합니다 (원본 그대로 두려면 --raw)."
          : "\n원본 파일 그대로 가져옵니다."
      );
      console.log("미리보기입니다. 실제로 옮기려면 --apply 를 붙여주세요.");
      console.log("  (원본을 남기지 않고 이동하려면 --apply --move)");
      return;
    }

    let done = 0;
    let bytes = 0;
    for (const entry of plan.moves) {
      const src = sourceOf.get(entry.fileName);
      if (!src) continue;
      const dest = path.join(SOUND_DIR, entry.target);
      const info = await stat(src);
      if (info.size < 1024) {
        console.log(`  건너뜀 (너무 작음): ${entry.fileName}`);
        continue;
      }
      if (shrink) {
        await transcode(src, dest);
      } else if (move && !src.startsWith(unpacked)) {
        // Files pulled out of a zip live in a scratch folder that is about to
        // be deleted, so "move" only applies to what the user actually dropped.
        await rename(src, dest).catch(async error => {
          if (error.code !== "EXDEV") throw error;
          await copyFile(src, dest);
        });
      } else {
        await copyFile(src, dest);
      }
      bytes += (await stat(dest)).size;
      done += 1;
    }
    const how = shrink ? "다시 인코딩" : move ? "이동" : "복사";
    console.log(`\n${done}개 ${how} 완료 — 합계 ${(bytes / 1024 / 1024).toFixed(1)}MB.`);
  } finally {
    await rm(unpacked, { recursive: true, force: true });
  }
}

await main();
