/* Real Chromium + production recorder over isolated localhost fixtures. Not an installed extension. */
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
const out = resolve(process.argv[2] || "work/p0-capless/browser");
await mkdir(out, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "redown-capless-chrome-")),
  pause = (ms) => new Promise((r) => setTimeout(r, ms));
const result = {
  scope:
    "Real Linux Chromium IndexedDB / production CAPLESS modules; Chrome extension APIs are explicitly mocked; no cloud transfers or installed-extension claim",
  state: "failed",
  assertions: [],
  measurements: [],
};
const root = resolve("extension"),
  scripts = [
    "save-evidence.js",
    "forensic-diagnostics.js",
    "capless-archive.js",
    "flight-recorder.js",
    "startup-crash-trace.js",
    "vendor/fflate.js",
    "capless-controls.js",
  ];
let browser, ws, server;
const bootstrap = `const local=JSON.parse(localStorage.getItem('fixture')||'{}'),listeners=[];globalThis.chrome={runtime:{id:'a'.repeat(32),getManifest:()=>({version:'0.5.27'})},storage:{local:{get:async keys=>keys===null?structuredClone(local):Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(local[k])])),set:async patch=>{Object.assign(local,structuredClone(patch));localStorage.setItem('fixture',JSON.stringify(local));for(const fn of listeners)fn(Object.fromEntries(Object.entries(patch).map(([k,v])=>[k,{newValue:v}])),'local');},remove:async keys=>{for(const k of Array.isArray(keys)?keys:[keys])delete local[k];}},onChanged:{addListener:fn=>listeners.push(fn)}}};`;
try {
  const options = await readFile(join(root, "options.html"), "utf8"),
    panel = options.slice(
      options.indexOf('  <details id="capless-panel">'),
      options.indexOf(
        "</details>",
        options.indexOf('  <details id="capless-panel">'),
      ) + 10,
    );
  const html =
    '<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="script-src &#39;self&#39;;object-src &#39;self&#39;"><title>REDOWN CAPLESS fixture</title></head><body style="font:15px system-ui;padding:18px;max-width:950px"><h1>REDOWN diagnostics — simulated extension APIs</h1>' +
    panel.replace(
      '<details id="capless-panel">',
      '<details id="capless-panel" open>',
    ) +
    '<script src="/fixture.js"></script>' +
    scripts.map((s) => '<script src="/' + s + '"></script>').join("") +
    "</body></html>";
  const shelf = (await readFile(join(root, "shelf.html"), "utf8"))
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, "")
    .replace(
      "</body>",
      '<script src="/fixture.js"></script><script src="/capless-archive.js"></script><script src="/flight-recorder.js"></script><script src="/startup-crash-trace.js"></script></body>',
    );
  server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url, "http://localhost").pathname;
      let body;
      if (path === "/options.html") body = html;
      else if (path === "/shelf.html") body = shelf;
      else if (path === "/fixture.js") body = bootstrap;
      else body = await readFile(join(root, path.replace(/^\//, "")));
      res.setHeader(
        "Content-Type",
        path.endsWith(".js")
          ? "application/javascript"
          : path.endsWith(".css")
            ? "text/css"
            : path.endsWith(".html")
              ? "text/html"
              : "application/octet-stream",
      );
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = "http://127.0.0.1:" + server.address().port;
  browser = spawn(
    "/usr/bin/chromium",
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--no-first-run",
      "--disable-background-networking",
      "--remote-debugging-port=0",
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  browser.stderr.resume();
  let port;
  for (let i = 0; i < 100; i++) {
    try {
      port = Number(
        (await readFile(join(profile, "DevToolsActivePort"), "utf8")).split(
          "\n",
        )[0],
      );
      break;
    } catch {
      await pause(100);
    }
  }
  const version = await (
    await fetch("http://127.0.0.1:" + port + "/json/version")
  ).json();
  result.browser = version.Browser;
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let seq = 0,
    acceptDialog = false;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Page.javascriptDialogOpening") {
      void call(
        "Page.handleJavaScriptDialog",
        { accept: acceptDialog },
        m.sessionId,
      );
      return;
    }
    const p = pending.get(m.id);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(m.id);
      m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result);
    }
  };
  const call = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = ++seq,
        timer = setTimeout(() => {
          pending.delete(id);
          reject(Error("CDP_TIMEOUT_" + method));
        }, 180000);
      pending.set(id, { resolve, reject, timer });
      ws.send(
        JSON.stringify({
          id,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  const { targetId } = await call("Target.createTarget", {
      url: origin + "/options.html",
    }),
    { sessionId } = await call("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
  await call("Page.enable", {}, sessionId);
  await call("Performance.enable", {}, sessionId);
  const evaluate = async (expression) => {
    const r = await call(
      "Runtime.evaluate",
      { expression, awaitPromise: true, returnByValue: true },
      sessionId,
    );
    if (r.exceptionDetails)
      throw Error(
        r.exceptionDetails.exception?.description || r.exceptionDetails.text,
      );
    return r.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 200; i++) {
      if (await evaluate(expression)) return;
      await pause(30);
    }
    throw Error("UI_STATE_TIMEOUT");
  };
  const check = (id, value) => {
    result.assertions.push({ id, passed: !!value });
    if (!value) throw Error("ASSERT_" + id);
  };
  await wait("!!globalThis.RedownFlightRecorder");
  check(
    "off-by-default",
    await evaluate("RedownFlightRecorder.status().then(s=>!s.on)"),
  );
  check(
    "off-does-not-open-capless-db",
    await evaluate(
      "indexedDB.databases().then(ds=>!ds.some(d=>d.name===RedownCaplessArchive.DB))",
    ),
  );
  const shot = async (name) => {
    const s = await call(
      "Page.captureScreenshot",
      { format: "png" },
      sessionId,
    );
    await writeFile(join(out, name), Buffer.from(s.data, "base64"));
  };
  await shot("options-off.png");
  const toggle = async () => {
    await evaluate('document.getElementById("capless-logging").focus()');
    await call(
      "Input.dispatchKeyEvent",
      { type: "keyDown", key: " ", code: "Space", windowsVirtualKeyCode: 32 },
      sessionId,
    );
    await call(
      "Input.dispatchKeyEvent",
      { type: "keyUp", key: " ", code: "Space", windowsVirtualKeyCode: 32 },
      sessionId,
    );
  };
  await toggle();
  await pause(100);
  check(
    "cancelled-confirmation-stays-off",
    await evaluate("RedownFlightRecorder.status().then(s=>!s.on)"),
  );
  acceptDialog = true;
  await toggle();
  await wait("RedownFlightRecorder.status().then(s=>s.on)");
  check(
    "confirmed-keyboard-enable",
    await evaluate(
      'document.getElementById("capless-state").textContent==="ON"',
    ),
  );
  const memory = async (at) => {
    await call("HeapProfiler.collectGarbage", {}, sessionId);
    const m = await call("Performance.getMetrics", {}, sessionId);
    const stats = await evaluate(
      "(async()=>{const a=await RedownFlightRecorder.reader();return {stats:await a.stats(),integrity:await a.verify(),status:await RedownFlightRecorder.status()};})()",
    );
    result.measurements.push({
      atSyntheticEvents: at,
      heap: m.metrics.filter((m) =>
        ["JSHeapUsedSize", "JSHeapTotalSize", "TaskDuration"].includes(m.name),
      ),
      ...stats,
    });
  };
  await memory(0);
  for (let block = 0; block < 2; block++) {
    await evaluate(
      `(async()=>{for(let n=0;n<50000;){const count=Math.min(128,50000-n);for(let i=0;i<count;i++)RedownFlightRecorder.save({id:crypto.randomUUID(),attemptId:null,at:Date.now(),kind:'observation',data:{phase:'source',bytes:${block}*50000+n+i}});await RedownFlightRecorder.flush();n+=count;}return true;})()`,
    );
    await memory((block + 1) * 50000);
    await writeFile(
      join(out, "progress.json"),
      JSON.stringify(result, null, 2),
    );
    console.log("Persisted synthetic events:", (block + 1) * 50000);
  }
  const last = result.measurements.at(-1),
    first = result.measurements[0];
  check(
    "100000-events-retained-without-pruning",
    last.stats.records - first.stats.records === 100000,
  );
  check(
    "checksums-and-sequences-verified",
    last.integrity.manifestMatches && last.integrity.state === "verified",
  );
  check(
    "bounded-runtime-queue",
    last.status.health.maxBacklog <= 256 &&
      last.status.health.maxBufferedBytes <= 1024 * 1024,
  );
  check("no-archive-loss", last.status.health.dropped === 0);
  await shot("options-on.png");
  await toggle();
  await wait("RedownFlightRecorder.status().then(s=>!s.on)");
  check(
    "off-preserves-count",
    await evaluate(
      "(async()=>{const a=await RedownFlightRecorder.reader();return (await a.stats()).records===" +
        last.stats.records +
        ";})()",
    ),
  );
  const beforeReload = last.stats.archiveId;
  await call("Page.reload", {}, sessionId);
  await wait("!!globalThis.RedownFlightRecorder");
  check(
    "off-persists-across-reload",
    await evaluate("RedownFlightRecorder.status().then(s=>!s.on)"),
  );
  check(
    "archive-id-survives-reload",
    await evaluate(
      "(async()=>{const a=await RedownFlightRecorder.reader();return (await a.stats()).archiveId=== " +
        JSON.stringify(beforeReload) +
        ";})()",
    ),
  );
  try {
    result.processInfo = await call("SystemInfo.getProcessInfo");
  } catch {
    result.processInfo = "unavailable";
  }
  await call("Page.navigate", { url: origin + "/shelf.html" }, sessionId);
  await wait('document.title==="REDOWN Shelf"');
  await shot("shelf-fixture.png");
  result.state = "passed";
  result.limitations = [
    "Not an installed extension; real unpacked loading is tested separately.",
    "JS heap is measured for this isolated production-recorder page fixture, not Windows Task Manager RSS or GPU pressure.",
    "Browser launched with the existing test harness GPU-disabled flag; this cannot validate a GPU-related incident.",
  ];
} catch (e) {
  result.code = String(e.message).slice(0, 200);
  process.exitCode = 1;
} finally {
  ws?.close();
  if (browser && browser.exitCode === null) {
    browser.kill("SIGTERM");
    await Promise.race([
      new Promise((r) => browser.once("exit", r)),
      pause(2000),
    ]);
    if (browser.exitCode === null) browser.kill("SIGKILL");
  }
  if (server) await new Promise((r) => server.close(r));
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
  await writeFile(
    join(out, "result.json"),
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(
    JSON.stringify({
      state: result.state,
      code: result.code,
      assertions: result.assertions.length,
    }),
  );
}
