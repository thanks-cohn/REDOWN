// Browser-only UI evidence. Never uses provider credentials or uploads objects.
// Requires Node 24+ and Chromium. Does not change or bypass managed browser policy.
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
import assert from "node:assert/strict";

const root = resolve(import.meta.dirname, "..");
const appRoot = resolve(
  process.env.BASIC_EXTENSION_PATH || join(root, "extension"),
);
const output = resolve(
  process.argv[2] || join(tmpdir(), "redown-basic-browser-smoke"),
);
await mkdir(output, { recursive: true });
await rm(join(output, "evidence.json"), { force: true }); // Never leave a stale passing report after failure.
const profile = await mkdtemp(join(tmpdir(), "redown-basic-chromium-"));
const records = [
  {
    id: "fixture-success",
    provider: "google",
    filename: "sample.png",
    state: "SAVED",
    createdAt: new Date().toISOString(),
    sourceUrl: "https://example.test/sample.png",
    hostUrl: "https://example.test/page",
    preview:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6fWQAAAAASUVORK5CYII=",
  },
  {
    id: "fixture-failure",
    provider: "dropbox",
    filename: "document.pdf",
    state: "FAILED",
    code: "AUTH_REQUIRED",
    message: "Extension upload authorization is required.",
    nextAction: "Sign in and retry.",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    sourceUrl: "https://example.test/document.pdf",
  },
  {
    id: "fixture-uncertain",
    provider: "onedrive",
    filename: "photo.jpg",
    state: "UNCERTAIN",
    code: "CONFIRMATION_UNAVAILABLE",
    nextAction: "Check provider before retrying.",
    createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
];
const mock = `globalThis.chrome={runtime:{id:'fixture',getManifest:()=>({version:'0.1.0-fixture'}),onMessage:{addListener(){}},sendMessage:async({op,input})=>{
let s=globalThis.fixtureSettings??={theme:'light',pageSize:40,expansionScope:'none',expansionComponent:'image',diagnosticsEnabled:true,diagnosticsCap:4000};
const records=${JSON.stringify(records)};
const value=op==='settings.get'?s:op==='settings.update'?(globalThis.fixtureSettings={...s,...input}):op==='counter.get'?{count:24}:op==='providers.list'?[{provider:'google',connected:true,authorized:true,ready:true},{provider:'dropbox',connected:false,authorized:false,ready:false},{provider:'onedrive',connected:true,authorized:false,ready:false,reason:'Upload permission needs approval.'}]:op==='history.list'?{items:records,page:1,pageSize:40,pages:1,total:3}:op==='diagnostics.list'?{items:[{id:1,timestamp:new Date().toISOString(),attemptId:'fixture-failure',provider:'dropbox',stage:'AUTH_CHECK',outcome:'Failure',code:'AUTH_REQUIRED',cause:'Extension upload authorization is required.'}],page:1,pageSize:40,pages:1,total:1}:{};return {ok:true,value};}}};`;
const html = (await readFile(join(appRoot, "shelf.html"), "utf8")).replace(
  '<script type="module" src="shelf.js"></script>',
  `<script>${mock}</script><script type="module" src="shelf.js"></script>`,
);
const routes = {
  "/shelf.js": "extension/shelf.js",
  "/shelf.css": "extension/shelf.css",
  ...Object.fromEntries(
    [
      "lib/presentation.js",
      "lib/identity.js",
      "config.js",
      "lib/store.js",
      "lib/coordinator.js",
      "lib/common.js",
      "lib/source.js",
      "lib/zip.js",
      "vendor/fflate.js",
    ].map((file) => ["/" + file, "extension/" + file]),
  ),
};
const server = createServer(async (req, res) => {
  try {
    if (req.url === "/" || req.url === "/shelf.html") {
      res.setHeader("Content-Type", "text/html");
      res.end(html);
    } else if (routes[req.url]) {
      res.setHeader(
        "Content-Type",
        req.url.endsWith(".css") ? "text/css" : "text/javascript",
      );
      res.end(
        await readFile(
          join(appRoot, routes[req.url].replace(/^extension\//, "")),
        ),
      );
    } else {
      res.statusCode = 404;
      res.end();
    }
  } catch {
    res.statusCode = 500;
    res.end();
  }
});
await new Promise((done) => server.listen(0, "127.0.0.1", done));
await mkdir(join(profile, "config"));
await mkdir(join(profile, "cache"));
const browser = spawn(
  process.env.CHROMIUM_BINARY || "chromium",
  [
    "--headless",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    `--user-data-dir=${profile}`,
    "--remote-debugging-port=0",
    "--no-first-run",
    "--no-default-browser-check",
    `--load-extension=${appRoot}`,
    "about:blank",
  ],
  {
    env: {
      ...process.env,
      XDG_CONFIG_HOME: join(profile, "config"),
      XDG_CACHE_HOME: join(profile, "cache"),
    },
    stdio: ["ignore", "ignore", "pipe"],
  },
);
let logs = "",
  spawnError;
browser.stderr.on("data", (chunk) => {
  logs = (logs + chunk).slice(-20000);
});
browser.on("error", (error) => {
  spawnError = error;
});
const clients = [];
async function connect(url) {
  const socket = new WebSocket(url);
  clients.push(socket);
  await new Promise((done, reject) => {
    socket.addEventListener("open", done, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  let seq = 0;
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const value = JSON.parse(event.data);
    if (value.id) {
      pending.get(value.id)?.(value);
      pending.delete(value.id);
    }
  });
  return (method, params = {}) =>
    new Promise((done, reject) => {
      const id = ++seq;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 10000);
      pending.set(id, (value) => {
        clearTimeout(timer);
        value.error
          ? reject(new Error(value.error.message))
          : done(value.result);
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
}
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const evidence = {
  timestamp: new Date().toISOString(),
  scope:
    "Local browser UI fixture with mocked extension API; no live provider calls.",
  liveRightClick: "UNVERIFIED — RELEASE BLOCKED",
  screenshots: [],
  checks: [],
};
try {
  let port;
  for (let i = 0; i < 100; i++) {
    if (spawnError) throw spawnError;
    try {
      port = (
        await readFile(join(profile, "DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {
      await wait(100);
    }
  }
  if (!port)
    throw new Error(
      "Chromium did not expose DevTools. Inspect browser log; no browser readiness claimed.",
    );
  const targets = async () =>
    await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  let worker;
  for (let i = 0; i < 20; i++) {
    worker = (await targets()).find(
      (target) =>
        target.type === "service_worker" &&
        target.url.startsWith("chrome-extension://"),
    );
    if (worker) break;
    await wait(100);
  }
  if (worker) {
    const extensionId = new URL(worker.url).host;
    const page = (await targets()).find((target) => target.type === "page");
    const call = await connect(page.webSocketDebuggerUrl);
    await call("Page.navigate", {
      url: `chrome-extension://${extensionId}/shelf.html`,
    });
    let result;
    for (let i = 0; i < 40; i++) {
      result = await call("Runtime.evaluate", {
        expression:
          'document.querySelectorAll(".provider-card").length === 3 && document.getElementById("save-count")?.textContent !== "—"',
        returnByValue: true,
      });
      if (result.result.value) break;
      await wait(100);
    }
    assert.equal(
      result.result.value,
      true,
      "Installed Shelf must use real extension API and storage",
    );
    evidence.installedExtension = {
      status: "SHELF_API_VERIFIED",
      extensionId,
      limits:
        "Native menu presentation, OAuth and real provider saves are unverified.",
    };
  } else {
    let blocked = false;
    try {
      const policy = JSON.parse(
        await readFile(
          "/etc/chromium/policies/managed/extensions.json",
          "utf8",
        ),
      );
      blocked = policy.ExtensionInstallBlocklist?.includes("*");
    } catch {
      /* No policy evidence available. */
    }
    evidence.installedExtension = {
      status: blocked
        ? "BLOCKED_BY_ADMINISTRATOR_POLICY"
        : "WORKER_NOT_OBSERVED",
      reason: blocked
        ? "Managed ExtensionInstallBlocklist contains *. No policy changes or bypass attempted."
        : "No extension service worker target appeared. Installed behavior remains unverified.",
    };
  }
  const page = (await targets()).find((target) => target.type === "page");
  const call = await connect(page.webSocketDebuggerUrl);
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
    });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  await call("Page.enable");
  await call("Page.navigate", {
    url: `http://127.0.0.1:${server.address().port}/`,
  });
  for (let i = 0; i < 50; i++) {
    if (
      await evaluate(
        'document.getElementById("save-count")?.textContent === "24"',
      )
    )
      break;
    await wait(100);
  }
  assert.equal(
    await evaluate('document.querySelectorAll(".provider-card").length'),
    3,
  );
  assert.equal(
    await evaluate('document.getElementById("save-count").textContent'),
    "24",
  );
  evidence.renderObservedMs = await evaluate("Math.round(performance.now())");
  evidence.checks.push(
    "Three consistent cards, mocked readiness states and confirmed counter rendered in Chromium.",
  );
  async function capture(name, width = 1440, height = 1000) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600,
    });
    await wait(80);
    assert.equal(
      await evaluate("document.documentElement.scrollWidth <= innerWidth"),
      true,
      `${name}: no horizontal overflow`,
    );
    const image = await call("Page.captureScreenshot", {
      format: "png",
      captureBeyondViewport: true,
    });
    const filename = join(output, `${name}.png`);
    await writeFile(filename, Buffer.from(image.data, "base64"));
    evidence.screenshots.push(filename);
  }
  await capture("providers-light");
  await evaluate('document.getElementById("theme-toggle").click()');
  await wait(80);
  assert.equal(
    await evaluate("document.documentElement.dataset.theme"),
    "dark",
  );
  await capture("providers-dark");
  await capture("providers-mobile", 390, 844);
  await capture("shelf-narrow", 360, 844);
  assert.equal(
    await evaluate('document.querySelectorAll("#theme-toggle svg").length'),
    1,
  );
  assert.equal(
    await evaluate(
      'document.getElementById("theme-toggle").getAttribute("aria-label")',
    ),
    "Switch to light mode",
  );
  await evaluate('document.querySelector("[data-view=history]").click()');
  await wait(80);
  assert.equal(
    await evaluate('document.querySelectorAll(".history-record").length'),
    3,
  );
  await evaluate(
    'document.querySelector("[data-component=urls] summary").click()',
  );
  await wait(80);
  assert.equal(
    await evaluate('document.querySelector("[data-component=urls]").open'),
    true,
  );
  await capture("history", 1440, 1000);
  evidence.checks.push(
    "History statuses and independent URL disclosure rendered; local data only.",
  );
  await evaluate('document.querySelector("[data-view=settings]").click()');
  await wait(80);
  await capture("settings");
  await evaluate('document.querySelector("[data-view=diagnostics]").click()');
  await wait(80);
  await capture("diagnostics");
  evidence.checks.push(
    "Light/dark, responsive layout, Settings and Diagnostics rendered without horizontal overflow.",
  );
  evidence.nativeBrowserProbe = await evaluate(`(async () => {
    const {openStore} = await import('/lib/store.js');
    const {createCoordinator} = await import('/lib/coordinator.js');
    const {exportDiagnostics} = await import('/lib/zip.js');
    const {unzipSync, strFromU8} = await import('/vendor/fflate.js');
    const expect = (condition, message) => { if (!condition) throw new Error(message); };
    const dbName = 'browser-smoke-' + crypto.randomUUID();
    let store = await openStore(indexedDB, dbName), uploads = 0;
    const checks = [];
    try {
      const auth = {status: async () => ({ready:true}), token: async () => 'LOCAL_MOCK_TOKEN'};
      const adapters = {google: {upload: async ({bytes,filename}) => { uploads++; return {confirmed:true,id:'mock-object',provider:'google',name:filename,size:bytes.length}; }}};
      const coordinator = createCoordinator({store,auth,adapters,acquire:async()=>({bytes:new Uint8Array([1,2,3]),filename:'fixture.bin',mime:'application/octet-stream'})});
      const input = {provider:'google',sourceUrl:'https://example.test/fixture.bin',hostUrl:'https://example.test/page',requestId:'browser-smoke-save'};
      const first = await coordinator.start(input);
      expect(first.state === 'SAVED', 'Native IDB coordinator completion');
      expect((await store.counter()).count === 1, 'Native IDB atomic saved counter');
      const replay = await coordinator.start(input);
      expect(replay.state === 'SAVED' && uploads === 1 && (await store.counter()).count === 1, 'Replay must not upload or count twice');
      checks.push('Actual browser IndexedDB: coordinator completion, durable confirmation ledger and replay exactly once.');
      await store.historyDelete(first.id);
      let blocked = false; try { await coordinator.start(input); } catch(error) { blocked = error.code === 'ALREADY_COMPLETED'; }
      expect(blocked && uploads === 1 && (await store.counter()).count === 1, 'History deletion preserves ledger/counter');
      await store.begin({id:'interrupted-browser-save',provider:'google',createdAt:new Date().toISOString(),state:'UPLOADING',requestHash:'local-fixture'});
      store.close(); store = await openStore(indexedDB, dbName);
      expect((await store.recover()).interrupted === 1, 'Reopen recovery must find interrupted attempt');
      expect((await store.getAttempt('interrupted-browser-save')).state === 'UNCERTAIN', 'Restart may never promote interrupted to saved');
      expect((await store.counter()).count === 1, 'Recovery preserves count');
      checks.push('Actual browser IndexedDB: deletion/counter independence and close/reopen interruption becomes UNCERTAIN.');
      await store.diagnosticsClear();
      await store.updateSettings({diagnosticsCap:3});
      for(let i=0;i<5;i++) await store.event({timestamp:new Date().toISOString(),stage:'FIXTURE',outcome:'Uncertain',code:'LOCAL_'+i});
      const retained = await store.diagnosticsList({page:1,pageSize:10});
      expect(retained.total === 3 && retained.items[0].code === 'LOCAL_4', 'Native event pruning keeps newest N');
      await store.updateSettings({diagnosticsEnabled:false});
      expect((await store.event({stage:'MUST_NOT_COLLECT'})).recorded === false, 'OFF must prevent optional events');
      const exported = await exportDiagnostics(store);
      const entries = unzipSync(exported.bytes), summary = JSON.parse(strFromU8(entries['summary.json']));
      expect(summary.count === 3 && summary.collectionEnabled === false && summary.retention === 3, 'ZIP while OFF retains expected metadata');
      expect(strFromU8(entries['events.jsonl']).trim().split('\\n').length === 3, 'ZIP expected JSONL event count');
      expect(Boolean(entries['README.txt']), 'ZIP privacy README');
      await store.updateSettings({diagnosticsEnabled:true,diagnosticsCap:null});
      await store.event({stage:'REENABLED',outcome:'Uncertain',timestamp:new Date().toISOString()});
      expect((await store.diagnosticsList({page:1,pageSize:10})).total === 4, 'Re-enable + Unlimited collects');
      await store.historyClear(); expect((await store.counter()).count === 1, 'History clear never resets count');
      checks.push('Actual browser IndexedDB: arbitrary finite cap, OFF, ZIP fields/JSONL/README, re-enable and Unlimited.');
      return {status:'PASS',provider:'Mock adapter only; no cloud calls.',checks};
    } finally { store.close(); await new Promise((done,reject)=>{const request=indexedDB.deleteDatabase(dbName);request.onsuccess=done;request.onerror=()=>reject(request.error);}); }
  })()`);
  await writeFile(
    join(output, "evidence.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  for (const socket of clients) socket.close();
  browser.kill("SIGTERM");
  await new Promise((done) => server.close(done));
  await writeFile(join(output, "chromium.log"), logs);
  await wait(150);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
