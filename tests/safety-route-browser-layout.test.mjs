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

async function openSafetyRoute(page, url, difficulty) {
  await page.goto(url, { waitUntil: "networkidle" });
  if (difficulty) {
    await page.locator(`[data-difficulty="${difficulty}"]`).click();
  }
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
  await openSafetyRoute(desktop, url, "steady");
  const desktopMetrics = await desktop.evaluate(() => {
    const viewport = document.querySelector(".safety-viewport");
    const world = document.querySelector(".safety-world");
    const route = document.querySelector(".safety-route");
    const top = document.querySelector(".safety-route-top");
    const construction = document.querySelector(".route-construction");
    const [constructionX, constructionY] = construction.dataset.approachAnchor
      .split(",")
      .map(Number);
    world.style.transition = "none";
    world.style.setProperty(
      "--camera-x",
      String(Math.max(0, Math.min(constructionX - 3, 32 - 7)))
    );
    world.style.setProperty(
      "--camera-y",
      String(Math.max(0, Math.min(constructionY - 2, 16 - 5)))
    );
    const viewportRect = viewport.getBoundingClientRect();
    const worldRect = world.getBoundingClientRect();
    const routeRect = route.getBoundingClientRect();
    const topRect = top.getBoundingClientRect();
    const gameRect = document.querySelector("#game").getBoundingClientRect();
    const rows = Number(world.style.getPropertyValue("--world-rows"));
    const columns = Number(world.style.getPropertyValue("--world-cols"));
    const cell = worldRect.height / rows;
    const usableRouteHeight = routeRect.height - topRect.height;
    const centerDivider = getComputedStyle(document.querySelector(
      '.route-road[data-road-position="center-left"]:not(.route-crosswalk)'
    ));
    const outerLeft = getComputedStyle(document.querySelector(
      '.route-road[data-road-position="outer-left"]:not(.route-crosswalk)'
    ));
    const outerRight = getComputedStyle(document.querySelector(
      '.route-road[data-road-position="outer-right"]:not(.route-crosswalk)'
    ));
    const crosswalk = getComputedStyle(document.querySelector(
      '.route-crosswalk[data-road-position="center-left"]'
    ));
    const signalMarkerCount =
      document.querySelectorAll(".route-signal-marker").length;
    const riderNodes = [
      document.querySelector(".route-scooter"),
      document.querySelector(".route-bicycle")
    ];
    const riders = riderNodes.map(vehicle => {
      vehicle.dataset.direction = "-1";
      const art = vehicle.querySelector(":scope > svg.route-art");
      return {
        directChild: art?.parentElement === vehicle,
        flip: getComputedStyle(vehicle).transform,
        helmets: vehicle.querySelectorAll(".route-rider-helmet").length,
        wheels: vehicle.querySelectorAll(".route-wheel").length
      };
    });
    const constructionRect = construction.getBoundingClientRect();
    const constructionFootprints = [
      ...document.querySelectorAll(".route-hazard-footprint-construction")
    ].map(node => node.getBoundingClientRect());
    const footprintBounds = {
      left: Math.min(...constructionFootprints.map(rect => rect.left)),
      right: Math.max(...constructionFootprints.map(rect => rect.right)),
      top: Math.min(...constructionFootprints.map(rect => rect.top)),
      bottom: Math.max(...constructionFootprints.map(rect => rect.bottom))
    };
    const board = getComputedStyle(construction, "::before");
    const posts = getComputedStyle(construction, "::after");

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
      worldColumns: columns,
      taskFour: {
        barrier: {
          boardZIndex: board.zIndex,
          approachAnchor: construction.dataset.approachAnchor,
          artworkBottom: constructionRect.bottom,
          artworkLeft: constructionRect.left,
          artworkRight: constructionRect.right,
          artworkTop: constructionRect.top,
          footprintCount: constructionFootprints.length,
          footprintTop: footprintBounds.top,
          heightInCells: constructionRect.height / cell,
          postBackgroundImages: posts.backgroundImage,
          postBackgroundPositions: posts.backgroundPosition,
          postBackgroundSizes: posts.backgroundSize,
          postsZIndex: posts.zIndex
        },
        riders
      },
      signalMarkerCount,
      street: {
        centerDivider: {
          color: centerDivider.borderInlineEndColor,
          style: centerDivider.borderInlineEndStyle,
          width: centerDivider.borderInlineEndWidth,
          zIndex: centerDivider.zIndex
        },
        crosswalk: {
          dividerWidth: crosswalk.borderInlineEndWidth,
          zIndex: crosswalk.zIndex
        },
        outerLeftShadow: outerLeft.boxShadow,
        outerRightShadow: outerRight.boxShadow
      }
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
  assert.deepEqual(desktopMetrics.street.centerDivider, {
    color: "rgb(244, 197, 66)",
    style: "double",
    width: "7px",
    zIndex: "1"
  });
  assert.deepEqual(desktopMetrics.street.crosswalk, {
    dividerWidth: "0px",
    zIndex: "3"
  });
  assert.match(
    desktopMetrics.street.outerLeftShadow,
    /rgb\(247, 242, 223\) 4px 0px 0px 0px inset/
  );
  assert.match(
    desktopMetrics.street.outerRightShadow,
    /rgb\(247, 242, 223\) -4px 0px 0px 0px inset/
  );
  assert.equal(desktopMetrics.signalMarkerCount, 0);

  assert.deepEqual(
    desktopMetrics.taskFour.riders.map(rider => rider.directChild),
    [true, true]
  );
  for (const rider of desktopMetrics.taskFour.riders) {
    assert.match(rider.flip, /^matrix\(-1, 0, 0, 1,/);
    assert.equal(rider.helmets, 1);
    assert.equal(rider.wheels, 2);
  }
  assert.deepEqual(
    {
      boardZIndex: desktopMetrics.taskFour.barrier.boardZIndex,
      footprintCount: desktopMetrics.taskFour.barrier.footprintCount,
      postBackgroundPositions:
        desktopMetrics.taskFour.barrier.postBackgroundPositions,
      postBackgroundSizes: desktopMetrics.taskFour.barrier.postBackgroundSizes,
      postsZIndex: desktopMetrics.taskFour.barrier.postsZIndex
    },
    {
      boardZIndex: "2",
      footprintCount: 5,
      postBackgroundPositions: "10% 0px, 90% 0px, 0px 100%, 100% 100%",
      postBackgroundSizes: "16px 84%, 16px 84%, 42px 12px, 42px 12px",
      postsZIndex: "1"
    }
  );
  assert.match(desktopMetrics.taskFour.barrier.approachAnchor, /^\d+,5$/);
  const barrierTopOverlap = (
    desktopMetrics.taskFour.barrier.footprintTop -
      desktopMetrics.taskFour.barrier.artworkTop
  ) / desktopMetrics.cell;
  assert.ok(barrierTopOverlap >= .09 && barrierTopOverlap <= .2);
  assert.ok(desktopMetrics.taskFour.barrier.artworkLeft >= 0);
  assert.ok(desktopMetrics.taskFour.barrier.artworkRight <= 1280);
  assert.ok(desktopMetrics.taskFour.barrier.artworkBottom <= 720);
  assert.ok(
    Math.abs(desktopMetrics.taskFour.barrier.heightInCells - 1.2) <= .02
  );
  const postPaintLayers = desktopMetrics.taskFour.barrier.postBackgroundImages
    .split(/\),\s*linear-gradient\(/);
  assert.equal(postPaintLayers.length, 4);
  for (const postLayer of postPaintLayers.slice(0, 2)) {
    assert.match(postLayer, /rgb\(239, 90, 41\)/);
    assert.match(postLayer, /rgb\(255, 255, 255\)/);
  }

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
