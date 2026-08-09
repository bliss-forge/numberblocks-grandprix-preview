import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".png": "image/png",
  ".webp": "image/webp"
};

function loadChromium() {
  try {
    const globalModules = execFileSync("npm", ["root", "-g"], {
      encoding: "utf8"
    }).trim();
    return require(resolve(globalModules, "playwright")).chromium;
  } catch {
    return null;
  }
}

async function startStaticServer() {
  const server = createServer(async (request, response) => {
    const pathname = new URL(request.url, "http://localhost").pathname;
    const file = resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    if (file !== root && !file.startsWith(`${root}${sep}`)) {
      response.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      response.writeHead(200, {
        "content-type": contentTypes[extname(file)] ?? "application/octet-stream"
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise(resolveServer => server.listen(0, "127.0.0.1", resolveServer));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}` };
}

test("실제 CSSOM에서도 활성 SRT 사진은 월드 이동값을 이어받는다", async t => {
  const chromium = loadChromium();
  if (!chromium) {
    t.skip("Playwright is not installed globally");
    return;
  }

  const { server, url } = await startStaticServer();
  const browser = await chromium.launch({ headless: true });
  t.after(async () => {
    await browser.close();
    await new Promise(resolveServer => server.close(resolveServer));
  });

  const page = await browser.newPage({ viewport: { width: 1228, height: 620 } });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    const journey = await import("/src/ktx-journey.mjs");
    const scene = await import("/src/ktx-scene.mjs");
    const base = journey.createKtxJourney(17, "srt");
    const makeState = x => ({
      ...base,
      phase: "driving",
      doors: "closed",
      segIndex: 0,
      station: "수서",
      x,
      v: 240,
      zoneEntered: false,
      armed: false
    });
    const game = scene.renderKtxScene(document, makeState(800), "side");
    document.body.replaceChildren(game);
    window.__motionQa = { game, scene, makeState };
  });
  await page.locator('.ktx-game[data-motion-realistic="ready"]').waitFor();

  const values = await page.evaluate(() => {
    const { game, scene, makeState } = window.__motionQa;
    scene.updateKtxScene(game, makeState(900), "side", [], {});
    const motion = game.querySelector(".ktx-motion-scene");
    const plate = motion.querySelector('.ktx-motion-plate[data-active="true"]');
    const before = plate.style.getPropertyValue("--motion-plate-x");
    scene.updateKtxScene(game, makeState(1200), "side", [], {});
    return {
      before,
      sceneX: motion.style.getPropertyValue("--motion-scene-x"),
      plateX: plate.style.getPropertyValue("--motion-plate-x")
    };
  });

  assert.notEqual(values.before, "");
  assert.notEqual(values.sceneX, "");
  assert.notEqual(values.plateX, values.before);
  assert.equal(values.plateX, values.sceneX);
});
