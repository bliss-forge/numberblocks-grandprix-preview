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
  ".mp3": "audio/mpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml"
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

function observeErrors(page) {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", message => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", error => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

test("390×844 홈은 두 열과 넓은 5번 카드로 잘림 없이 표시된다", async t => {
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

  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = observeErrors(page);
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator(".mode-grid").waitFor({ state: "visible" });

  const metrics = await page.evaluate(() => {
    const grid = document.querySelector(".mode-grid");
    const cards = [...document.querySelectorAll(".mode-card")].slice(0, 5);
    const rects = cards.map(card => card.getBoundingClientRect());
    return {
      columns: getComputedStyle(grid).gridTemplateColumns.split(" ").length,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      firstWidth: rects[0].width,
      fifthWidth: rects[4].width,
      cardsInsideWidth: rects.every(
        rect => rect.left >= -0.5 && rect.right <= innerWidth + 0.5
      ),
      homeHeight: document.querySelector("#home").getBoundingClientRect().height,
      viewportHeight: innerHeight
    };
  });

  assert.equal(metrics.columns, 2);
  assert.equal(metrics.horizontalOverflow, false);
  assert.equal(metrics.cardsInsideWidth, true);
  assert.ok(metrics.fifthWidth >= metrics.firstWidth * 1.8);
  assert.ok(metrics.homeHeight >= metrics.viewportHeight);
  assert.deepEqual(errors, { consoleErrors: [], pageErrors: [] });
});
