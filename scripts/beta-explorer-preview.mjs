// Ordinary browser QA of the actual Beta page; Chrome settings are mocked, storage is real IndexedDB.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtime)
  throw Error(
    "Set CODEX_PRIMARY_RUNTIME_NODE_MODULES to a Playwright installation",
  );
const { chromium } = await import(
  pathToFileURL(resolve(runtime, "playwright/index.mjs"))
);
const root = resolve("extension"),
  out = resolve("work/beta-chrome-red");
await mkdir(out, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith(root + "/")) throw Error();
    const body = await readFile(path);
    res.writeHead(200, {
      "content-type":
        {
          ".html": "text/html",
          ".mjs": "text/javascript",
          ".css": "text/css",
          ".woff": "font/woff",
        }[extname(path)] || "application/octet-stream",
    });
    res.end(body);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.BETA_CHROMIUM_PATH
    ? { executablePath: process.env.BETA_CHROMIUM_PATH }
    : {}),
  args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
});
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    globalThis.betaListeners = [];
    globalThis.betaEnabled = true;
    globalThis.chrome = {
      storage: {
        local: {
          get: async () => ({ betaModeEnabled: globalThis.betaEnabled }),
        },
        onChanged: { addListener: (fn) => globalThis.betaListeners.push(fn) },
      },
    };
  });
  const page = await context.newPage(),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(
    `http://127.0.0.1:${server.address().port}/beta-explorer.html`,
  );
  await page.locator("#files li").first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  const checks = [];
  for (const width of [1366, 768, 390]) {
    await page.setViewportSize({ width, height: 960 });
    await page.screenshot({
      path: out + "/explorer-" + width + ".jpg",
      fullPage: true,
      quality: 88,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
      "Horizontal overflow at " + width,
    );
    await page.locator("#view-list").click();
    assert.equal(
      await page.locator("#view-list").getAttribute("aria-pressed"),
      "true",
    );
    await page.locator("#view-grid").click();
    checks.push({ width, noHorizontalOverflow: true, viewSwitch: true });
  }
  await page.setViewportSize({ width: 1366, height: 960 });
  await page.locator("#files input").nth(1).check();
  assert.equal(
    await page.locator("#selection-name").textContent(),
    "Welcome.txt",
  );
  await page.locator("#read").click();
  await page.locator("#preview").waitFor({ state: "visible" });
  assert.match(
    await page.locator("#preview").textContent(),
    /Welcome to REDOWN/,
  );
  await page.locator("#copy").click();
  await page.locator("#destination").selectOption("fake-drive");
  await page.locator("#prefix").fill("Documents/");
  await page.locator("#paste").click();
  await page.waitForFunction(() =>
    document.getElementById("trace").textContent.includes("completed"),
  );
  await page.locator("#provider").selectOption("fake-drive");
  await page.locator("#prefix").fill("Documents/");
  await page.locator("#navigation").evaluate((form) => form.requestSubmit());
  await page.waitForFunction(() =>
    document.getElementById("files").textContent.includes("Welcome.txt"),
  );
  await page.locator("#home").click();
  await page.waitForFunction(() =>
    document.querySelector("h1").textContent.includes("All files"),
  );
  await page.evaluate(() => {
    globalThis.betaEnabled = false;
    for (const fn of globalThis.betaListeners)
      fn({ betaModeEnabled: { newValue: false } }, "local");
  });
  await page.locator("#explorer").waitFor({ state: "hidden" });
  await page.evaluate(() => {
    globalThis.betaEnabled = true;
    for (const fn of globalThis.betaListeners)
      fn({ betaModeEnabled: { newValue: true } }, "local");
  });
  await page.locator("#explorer").waitFor({ state: "visible" });
  await page.locator("#files li").first().waitFor();
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await page
      .locator(".file-grid li")
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration),
    "0s",
  );
  assert.deepEqual(errors, []);
  const report = {
    scope:
      "Ordinary Chromium / mocked Chrome Beta setting / real local IndexedDB / no installed extension or live providers",
    browser: browser.version(),
    checks,
    preview: true,
    copyPaste: true,
    navigation: true,
    betaToggle: true,
    reducedMotion: true,
    pageErrors: errors,
  };
  await writeFile(out + "/report.json", JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report));
} finally {
  await browser.close();
  await new Promise((r) => server.close(r));
}
