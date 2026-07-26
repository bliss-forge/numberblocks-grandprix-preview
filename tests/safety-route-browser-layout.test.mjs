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
  ".mp3": "audio/mpeg"
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
      response.writeHead(200, {
        "content-type": contentTypes[extname(file)] ?? "application/octet-stream"
      });
      response.end(await readFile(file));
    } catch {
      response.writeHead(404).end();
    }
  });

  await new Promise(resolveServer => server.listen(0, "127.0.0.1", resolveServer));
  const { port } = server.address();
  return { server, url: `http://127.0.0.1:${port}` };
}

async function openSafetyRoute(page, url) {
  await page.goto(url, { waitUntil: "networkidle" });
  await page.locator('[data-mode="safety"]').click();
  await page.waitForSelector(".safety-viewport");
}

test("1280×720 PC 안전길은 7×5칸을 자르지 않고 모바일 방향키를 바꾸지 않는다", async t => {
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

  const desktop = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await openSafetyRoute(desktop, url);
  const desktopMetrics = await desktop.evaluate(() => {
    const viewport = document.querySelector(".safety-viewport");
    const world = document.querySelector(".safety-world");
    const route = document.querySelector(".safety-route");
    const top = document.querySelector(".safety-route-top");
    const viewportRect = viewport.getBoundingClientRect();
    const worldRect = world.getBoundingClientRect();
    const routeRect = route.getBoundingClientRect();
    const topRect = top.getBoundingClientRect();
    const gameRect = document.querySelector("#game").getBoundingClientRect();
    const rows = Number(world.style.getPropertyValue("--world-rows"));
    const columns = Number(world.style.getPropertyValue("--world-cols"));
    const cell = worldRect.height / rows;
    const usableRouteHeight = routeRect.height - topRect.height;

    return {
      cell,
      clientColumnsVisible: viewport.clientWidth / cell,
      clientRowsVisible: viewport.clientHeight / cell,
      gameBottom: gameRect.bottom,
      maximumCell: Math.min((innerWidth * .94) / 7, usableRouteHeight / 5),
      pageHeight: document.documentElement.scrollHeight,
      usableRouteHeight,
      viewportBottom: viewportRect.bottom,
      viewportColumns: viewport.style.getPropertyValue("--viewport-cols"),
      viewportRows: viewport.style.getPropertyValue("--viewport-rows"),
      worldColumns: columns
    };
  });

  assert.equal(desktopMetrics.viewportColumns, "7");
  assert.equal(desktopMetrics.viewportRows, "5");
  assert.equal(desktopMetrics.worldColumns, 32);
  assert.ok(
    desktopMetrics.clientColumnsVisible >= 7 - .01,
    `client-visible columns: ${desktopMetrics.clientColumnsVisible}`
  );
  assert.ok(
    desktopMetrics.clientRowsVisible >= 5 - .01,
    `client-visible rows: ${desktopMetrics.clientRowsVisible}`
  );
  assert.ok(
    Math.abs(desktopMetrics.cell - desktopMetrics.maximumCell) <= .02,
    `cell ${desktopMetrics.cell}, maximum ${desktopMetrics.maximumCell}`
  );
  assert.ok(desktopMetrics.viewportBottom <= desktopMetrics.gameBottom + .01);
  assert.ok(desktopMetrics.pageHeight <= 720, `page height: ${desktopMetrics.pageHeight}`);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await openSafetyRoute(mobile, url);
  const mobileMetrics = await mobile.evaluate(() => {
    const pad = document.querySelector(".route-pad");
    const button = document.querySelector(".route-pad button");
    const style = getComputedStyle(button);
    return {
      buttonHeight: button.getBoundingClientRect().height,
      buttonWidth: button.getBoundingClientRect().width,
      fontSize: style.fontSize,
      minHeight: style.minHeight,
      minWidth: style.minWidth,
      opacity: getComputedStyle(pad).opacity
    };
  });

  assert.equal(mobileMetrics.opacity, "1");
  assert.equal(mobileMetrics.fontSize, "28px");
  assert.equal(mobileMetrics.minWidth, "48px");
  assert.equal(mobileMetrics.minHeight, "48px");
  assert.ok(mobileMetrics.buttonWidth >= 48);
  assert.ok(mobileMetrics.buttonHeight >= 48);
});
