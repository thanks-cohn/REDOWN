import {spawnSync} from "node:child_process";
// Agent-run UI acceptance. Fresh browser context, fake providers only; never an attached user session.
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw Error('Set CODEX_PRIMARY_RUNTIME_NODE_MODULES to a Playwright runtime; use BETA_CHROMIUM_PATH for its browser binary');
const { chromium } = await import(
  pathToFileURL(
    resolve(
      process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,
      "playwright/index.mjs",
    ),
  )
);
const root = resolve("extension"),
  out = resolve("work/beta-walkthrough");
await mkdir(out, { recursive: true });
const server = createServer(async (req, res) => {
  try {
    const path = resolve(
      root,
      "." + new URL(req.url, "http://localhost").pathname,
    );
    if (!path.startsWith(root + "/")) throw Error();
    res.writeHead(200, {
      "content-type":
        {
          ".html": "text/html",
          ".css": "text/css",
          ".mjs": "text/javascript",
          ".woff": "font/woff",
        }[extname(path)] || "application/octet-stream",
    });
    res.end(await readFile(path));
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
const results = [],
  errors = [];
let context;
try {
  context = await browser.newContext({
    viewport: { width: 1366, height: 960 },
  });
  await context.addInitScript(() => {
    globalThis.betaEnabled = true;
    globalThis.betaListeners = [];
    globalThis.chrome = {
      storage: {
        local: {
          get: async () => ({ betaModeEnabled: globalThis.betaEnabled }),
        },
        onChanged: { addListener: (fn) => globalThis.betaListeners.push(fn) },
      },
    };
    globalThis.qaEvents = [];
    document.addEventListener("beta:guide-event", (event) =>
      globalThis.qaEvents.push(event.detail),
    );
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const url = `http://127.0.0.1:${server.address().port}/beta-explorer.html`;
  await page.goto(url);
  await page.locator("#files li").first().waitFor();
  const settle = () =>
    page.evaluate(async () => {
      const { controller } = await import("/beta-explorer.mjs");
      await controller.settle();
    });
  const go = async (key = "", query = "") => {
    await page.locator("#prefix").fill(key);
    await page.locator("#query").fill(query);
    await page.locator("#navigation").evaluate((form) => form.requestSubmit());
    await settle();
  };
  const select = async (key) => {
    await page
      .locator("#files li")
      .filter({ has: page.locator("button") })
      .evaluateAll((rows, key) => {
        const row = rows.find((r) => r.dataset.key === key);
        if (!row) throw Error("FIXTURE_ROW_MISSING");
        row.querySelector("input").click();
      }, key);
  };
  const click = async (id) => {
    await page.locator("#" + id).click();
    await settle();
  };
  const dialog = async (id, value) => {
    page.once("dialog", (d) =>
      value === false
        ? d.dismiss()
        : d.accept(typeof value === "string" ? value : undefined),
    );
    await click(id);
  };
  const metadata = async (provider, key) =>
    page.evaluate(
      async ({ provider, key }) => {
        const { openBetaStore } = await import(
          "/file-engine/indexeddb-store.mjs"
        );
        const store = await openBetaStore();
        try {
          const snapshot = await store.read(),
            o = snapshot.objects.find(
              (o) => o.provider === provider && o.key === key,
            );
          return o ? { content: o.content, revision: o.revision } : null;
        } finally {
          store.close();
        }
      },
      { provider, key },
    );
  const provider = async (value) => {
    await page.locator("#provider").selectOption(value);
    await settle();
  };
  const destination = async (value) =>
    page.locator("#destination").selectOption(value);
  const sha = (text) => createHash("sha256").update(text).digest("hex");
  async function check(id, fn) {
    const start = Date.now();
    await page.evaluate((id) => {
      globalThis.RedownBetaQA.startGuide("help", id);
      globalThis.qaEvents = [];
    }, id);
    await page.locator("#walkthrough-minimize").click();
    try {
      const proof = await fn();
      await settle();
      const events = await page.evaluate(() => globalThis.qaEvents);
      results.push({
        stepId: id,
        state: "passed",
        durationMs: Date.now() - start,
        evidence: proof || {},
        operationIds: events
          .filter((e) => e.kind === "operation")
          .map((e) => e.operationId),
      });
    } catch (error) {
      results.push({
        stepId: id,
        state: "failed",
        durationMs: Date.now() - start,
        code: error.code || "UI_ASSERTION_FAILED",
      });
    }
    await page.evaluate(() => globalThis.RedownBetaQA.getWalkthroughReport());
  }
  await check("welcome", async () => {
    assert.match(await page.locator(".notice").textContent(), /sandbox/);
    assert.equal(
      await page.locator("#gate").getAttribute("data-enabled"),
      "true",
    );
  });
  await check("storage", async () => {
    assert.equal(await page.locator("#provider option").count(), 2);
    assert.equal(await page.locator("#destination option").count(), 2);
    await destination("fake-drive");
    assert.equal(await page.locator("#provider").inputValue(), "fake-r2");
  });
  await check("navigation", async () => {
    await go("Documents/");
    assert.equal(
      await page.locator("#location-label").textContent(),
      "Documents",
    );
    await go();
  });
  await check("files", async () => {
    await select("Welcome.txt");
    assert.equal(await page.locator("#copy").isEnabled(), true);
  });
  await check("help", async () => {
    await page.evaluate(() => globalThis.RedownBetaQA.startGuide("quick"));
    for (let i = 0; i < 5; i++) await page.locator("#walkthrough-next").click();
    assert.equal(await page.locator("#walkthrough-finish").isVisible(), true);
    const report = await page.evaluate(() =>
      globalThis.RedownBetaQA.getWalkthroughReport(),
    );
    assert.equal(report.results.length, 5);
    assert.ok(report.results.every((r) => r.status === "read"));
    await page.locator("#walkthrough-close").click();
  });
  await check("browse", async () => {
    await go();
    assert.equal(await page.locator("#files li").count(), 2);
  });
  await check("selection", async () => {
    await select("Welcome.txt");
    assert.equal(
      await page.locator("#files li[data-selected=true]").count(),
      1,
    );
  });
  await check("details", async () => {
    assert.equal(
      await page.locator("#selection-name").textContent(),
      "Welcome.txt",
    );
    assert.match(
      await page.locator("#selection-meta").textContent(),
      /50 bytes/,
    );
  });
  await check("preview", async () => {
    await click("read");
    assert.match(
      await page.locator("#preview").textContent(),
      /Welcome to REDOWN/,
    );
  });
  await check("grid", async () => {
    await click("view-grid");
    assert.equal(
      await page.locator("#view-grid").getAttribute("aria-pressed"),
      "true",
    );
  });
  await check("list", async () => {
    await click("view-list");
    assert.equal(
      await page.locator("#view-list").getAttribute("aria-pressed"),
      "true",
    );
  });
  await check("folder", async () => {
    await page.locator('#files li[data-key="Documents/"] button').click();
    await settle();
    assert.equal(await page.locator("#files li").count(), 1);
  });
  await check("parent", async () => {
    await click("up");
    assert.equal(await page.locator("#prefix").inputValue(), "");
  });
  await check("search", async () => {
    await go("", "Welcome");
    assert.equal(await page.locator("#files li").count(), 1);
  });
  await check("empty", async () => {
    await go("", "not-a-real-fixture-123");
    assert.equal(await page.locator("#empty-state").isVisible(), true);
    await go();
  });
  await check("mkdir", async () => {
    await dialog("mkdir", "Walkthrough");
    assert.ok(await metadata("fake-r2", "Walkthrough/"));
  });
  const content = "Automated REDOWN walkthrough fixture ✓";
  await check("upload", async () => {
    await go("Walkthrough/");
    await page.locator("#upload").setInputFiles({
      name: "QA.txt",
      mimeType: "text/plain",
      buffer: Buffer.from(content),
    });
    await settle();
    const object = await metadata("fake-r2", "Walkthrough/QA.txt");
    assert.equal(sha(object.content), sha(content));
    return {
      algorithm: "SHA-256",
      expected: sha(content),
      observed: sha(object.content),
    };
  });
  await check("copy", async () => {
    await select("Walkthrough/QA.txt");
    await click("copy");
    assert.ok(await metadata("fake-r2", "Walkthrough/QA.txt"));
  });
  await check("destination", async () => {
    await destination("fake-r2");
    await destination("fake-drive");
    assert.equal(await page.locator("#provider").inputValue(), "fake-r2");
  });
  await check("paste", async () => {
    await click("paste");
    const source = await metadata("fake-r2", "Walkthrough/QA.txt"),
      target = await metadata("fake-drive", "Walkthrough/QA.txt");
    assert.equal(sha(source.content), sha(target.content));
    return {
      sourceRetained: true,
      sourceHash: sha(source.content),
      destinationHash: sha(target.content),
    };
  });
  await check("switch", async () => {
    await provider("fake-drive");
    await go("Walkthrough/");
    assert.equal(await page.locator("#files li").count(), 1);
  });
  await check("cut", async () => {
    await select("Walkthrough/QA.txt");
    await click("cut");
    assert.ok(await metadata("fake-drive", "Walkthrough/QA.txt"));
  });
  await check("move", async () => {
    await destination("fake-r2");
    await page.locator("#prefix").fill("Documents/");
    await dialog("paste", true);
    assert.equal(await metadata("fake-drive", "Walkthrough/QA.txt"), null);
    assert.equal(
      sha((await metadata("fake-r2", "Documents/QA.txt")).content),
      sha(content),
    );
    return { sourceRemoved: true, destinationHash: sha(content) };
  });
  await check("rename", async () => {
    await provider("fake-r2");
    await go("Documents/");
    await select("Documents/QA.txt");
    await dialog("rename", "Renamed.txt");
    assert.equal(await metadata("fake-r2", "Documents/QA.txt"), null);
    assert.ok(await metadata("fake-r2", "Documents/Renamed.txt"));
  });
  await check("conflict", async () => {
    await select("Documents/Renamed.txt");await click("copy");await destination("fake-drive");
    await click("paste");const before=await metadata('fake-drive','Documents/Renamed.txt'),source=await metadata('fake-r2','Documents/Renamed.txt');
    await click("paste");assert.equal(await page.locator('#status').getAttribute('data-state'),'failed');
    const failure=await page.evaluate(()=>globalThis.qaEvents.filter(e=>e.kind==='operation'&&e.state==='failed').at(-1));
    assert.equal(failure?.code,'CONFLICT');assert.deepEqual(await metadata('fake-drive','Documents/Renamed.txt'),before);assert.deepEqual(await metadata('fake-r2','Documents/Renamed.txt'),source);
    return {expectedFailure:'CONFLICT',observedFailure:failure.code,sourceUnchanged:true,destinationUnchanged:true};
  });
  await check("delete", async () => {
    await select("Documents/Renamed.txt");
    await dialog("delete", false);
    assert.ok(await metadata("fake-r2", "Documents/Renamed.txt"));
    await dialog("delete", true);
    assert.equal(await metadata("fake-r2", "Documents/Renamed.txt"), null);
    assert.ok(await metadata("fake-r2", "Documents/Example.txt"));
    return {
      cancelRetained: true,
      exactTargetRemoved: true,
      unrelatedRetained: true,
    };
  });
  await check("history", async () => {
    await click("show-activity");
    assert.equal(await page.locator("#activity").getAttribute("open"), "");
  });
  await check("trace", async () => {
    await click("inspect");
    const trace = JSON.parse(await page.locator("#trace").textContent());
    assert.ok(trace.id);
    assert.ok(trace.evidence.length);
    const redacted = await page.evaluate(
      (id) => globalThis.RedownBetaQA.inspectOperation(id),
      trace.id,
    );
    assert.equal(redacted.id, trace.id);
    assert.equal(Object.hasOwn(redacted, "request"), false);
    return { operationId: trace.id, stages: trace.evidence.length };
  });
  await check("refresh-history", async () => {
    const before = await page.locator("#jobs option").count();
    await click("refresh-jobs");
    assert.equal(await page.locator("#jobs option").count(), before);
  });
  await check("pagination", async () => {
    await page.evaluate(async () => {
      const { openBetaStore } = await import(
          "/file-engine/indexeddb-store.mjs"
        ),
        { createSimulationEngine } = await import(
          "/file-engine/simulation.mjs"
        );
      const store = await openBetaStore(),
        engine = createSimulationEngine(store);
      try {
        for (let i = 0; i < 55; i++)
          await engine.run({
            apiVersion: "0.1.0",
            operation: "upload",
            destination: {
              provider: "fake-r2",
              account: "demo",
              container: "sandbox",
              key: "Pages/" + i + ".txt",
            },
            content: "Pagination fixture",
            idempotencyKey: "page-fixture-" + i,
          });
      } finally {
        store.close();
      }
    });
    await go("Pages/");
    assert.equal(await page.locator("#files li").count(), 50);
    await click("next");
    assert.equal(await page.locator("#files li").count(), 55);
    assert.equal(await page.locator("#next").isVisible(), false);
    return { expected: 55, observed: 55 };
  });
  await check("comparison", async () => {
    if ((await page.locator(".comparison").getAttribute("open")) === null)
      await page.locator(".comparison summary").click();
    assert.equal(await page.locator(".comparison").getAttribute("open"), "");
  });
  await check("reopen", async () => {
    await page.evaluate(() => globalThis.RedownBetaQA.startGuide("full"));
    await page.locator("#walkthrough-next").click();
    await page.locator("#walkthrough-close").click();
    const before = await page.locator("#jobs option").count();
    await page.reload();
    await page.locator("#files li").first().waitFor();
    await page.locator("#walkthrough-launch").click();
    await page.locator("#walkthrough-resume").click();
    assert.equal(
      (
        await page.evaluate(() =>
          globalThis.RedownBetaQA.getWalkthroughReport(),
        )
      ).index,
      1,
    );
    assert.equal(await page.locator("#jobs option").count(), before + 1);
    await page.locator("#walkthrough-close").click();
    return { guideResumed: true, onlyListingAdded: true };
  });
  await check("rollback", async () => {
    await page.evaluate(() => {
      globalThis.betaEnabled = false;
      for (const fn of globalThis.betaListeners)
        fn({ betaModeEnabled: { newValue: false } }, "local");
    });
    await settle();
    assert.equal(await page.locator("#explorer").isVisible(), false);
    assert.equal(await page.locator("#walkthrough-restore").isVisible(), false);
    await page.evaluate(() => {
      globalThis.betaEnabled = true;
      for (const fn of globalThis.betaListeners)
        fn({ betaModeEnabled: { newValue: true } }, "local");
    });
    await settle();
    assert.equal(await page.locator("#explorer").isVisible(), true);
  });
  await check("review", async () => {
    const report = await page.evaluate(async () => {
      const before = document.getElementById("jobs").options.length;
      const result = await globalThis.RedownBetaQA.runSelfTest();
      return {
        result,
        before,
        after: document.getElementById("jobs").options.length,
      };
    });
    assert.equal(report.result.state, "passed");
    assert.equal(report.before, report.after);
    await page.locator('#walkthrough-restore').click();const downloadPromise=page.waitForEvent('download');await page.locator('#walkthrough-export').click();const download=await downloadPromise;const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.guideVersion,'1.0.0');assert.ok(Array.isArray(exported.results));await page.locator('#walkthrough-minimize').click();
    return {
      exportParsed:true,
      isolatedCoreChecks: report.result.passed,
      userJournalUnchanged: true,
    };
  });
  // Verify the popup remains visible and reachable on three viewport sizes, not just the page beneath it.
  const layouts = [];
  for (const width of [1366, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(() => globalThis.RedownBetaQA.startGuide("quick"));
    await page.locator("#walkthrough-panel").waitFor({ state: "visible" });
    const geometry = await page.locator("#walkthrough-panel").boundingBox();
    assert.ok(
      geometry.x >= 0 &&
        geometry.y >= 0 &&
        geometry.x + geometry.width <= width + 1 &&
        geometry.y + geometry.height <= 901,
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    await page.screenshot({
      path: out + "/guide-" + width + ".jpg",
      fullPage: true,
      quality: 85,
    });
    layouts.push({ width, popupInViewport: true, noHorizontalOverflow: true });
    await page.locator("#walkthrough-close").click();
  }
  const catalog = await page.evaluate(() => globalThis.RedownBetaQA.describe());
  assert.equal(results.length, catalog.steps.length);
  assert.deepEqual(errors, []);
  const report = {
    version: "1.0.0",
    sourceCommit: spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim(),
    sourceFiles:await Promise.all(['extension/beta-explorer.html','extension/beta-explorer.css','extension/beta-explorer.mjs','extension/beta-walkthrough.mjs','extension/beta-walkthrough-steps.mjs','extension/file-engine/simulation.mjs','extension/file-engine/acceptance.mjs','scripts/beta-walkthrough-acceptance.mjs'].map(async path=>({path,sha256:createHash('sha256').update(await readFile(path)).digest('hex')}))),
    readiness: catalog.readiness,
    scope:
      "automated ordinary Chromium; fresh isolated profile, actual UI/shared engine/IndexedDB, mocked Chrome setting, no cloud/provider certification",
    browser: browser.version(),
    finishedAt: new Date().toISOString(),
    passed: results.filter((r) => r.state === "passed").length,
    failed: results.filter((r) => r.state === "failed").length,
    results,
    layouts,
    pageErrors: errors,
    unverified: [
      "installed Chrome extension",
      "live provider bindings and bytes",
      "local filesystem bridge",
      "cross-computer transport",
      "competitor parity",
    ],
  };
  await writeFile(
    out + "/acceptance.json",
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.failed) process.exitCode = 1;
} finally {
  await context?.close();
  await browser.close();
  await new Promise((r) => server.close(r));
}
