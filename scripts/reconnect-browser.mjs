// Real Chromium UI/accessibility only. Provider and extension APIs are explicit fixtures.
import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, writeFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import { resolve, join } from "node:path";
import { tmpdir } from "node:os";
const out = resolve(process.argv[2] || "work/p0-followup/browser"),
  root = resolve("extension");
await mkdir(out, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), "redown-reconnect-")),
  pause = (ms) => new Promise((r) => setTimeout(r, ms));
const result = {
  scope:
    "Real Linux Chromium DOM/keyboard/AX at 320px, production Shelf markup/CSS/provider UI; mocked extension/OAuth/tabs APIs; no provider writes",
  state: "failed",
  assertions: [],
};
let browser, server, ws;
try {
  const bootstrap = `const local={googleDriveState:{phase:'connected',accountId:'synthetic-google'},googleDriveTransfer:{status:'uncertain',error:'OAuth2 not granted or revoked.'},'onedrive:state':{phase:'unavailable',accountId:'synthetic-ms',code:'ONEDRIVE_GRAPH_503'},'dropbox:state':{phase:'connected',accountId:'synthetic-dropbox',rootReady:true}};window.__auth=[];window.__tabs=[];window.__pending=[];window.chrome={runtime:{sendMessage:async m=>{if(/Status$/.test(m.type))return {ok:true};__auth.push(m.type);return new Promise(resolve=>__pending.push(resolve));}},tabs:{create:async p=>__tabs.push(p)},storage:{local:{get:async keys=>Object.fromEntries((Array.isArray(keys)?keys:[keys]).map(k=>[k,structuredClone(local[k])]))},onChanged:{addListener(){}}}};`;
  let html = (await readFile(join(root, "shelf.html"), "utf8")).replace(
    /<script\b[^>]*>[\s\S]*?<\/script>/g,
    "",
  );
  html = html.replace(
    "<body>",
    '<body><p style="font:12px system-ui">UI fixture — simulated extension/OAuth APIs</p>',
  );
  html = html.replace(
    "</body>",
    '<script src="/fixture.js"></script>' +
      [
        "provider-connection.js",
        "provider-reconnect.js",
        "shelf-google-drive.js",
        "shelf-dropbox.js",
        "shelf-onedrive.js",
      ]
        .map((f) => '<script src="/' + f + '"></script>')
        .join("") +
      "</body>",
  );
  server = createServer(async (req, res) => {
    try {
      const p = new URL(req.url, "http://localhost").pathname;
      res.setHeader(
        "Content-Type",
        p.endsWith(".js")
          ? "application/javascript"
          : p.endsWith(".css")
            ? "text/css"
            : p.endsWith(".html")
              ? "text/html"
              : "application/octet-stream",
      );
      res.end(
        p === "/shelf.html"
          ? html
          : p === "/fixture.js"
            ? bootstrap
            : await readFile(join(root, p.slice(1))),
      );
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
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
  for (let n = 0; n < 100; n++) {
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
  const v = await (
    await fetch("http://127.0.0.1:" + port + "/json/version")
  ).json();
  result.browser = v.Browser;
  ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((r, j) => {
    ws.onopen = r;
    ws.onerror = j;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data),
      p = pending.get(m.id);
    if (p) {
      clearTimeout(p.timer);
      pending.delete(m.id);
      m.error ? p.reject(Error(m.error.message)) : p.resolve(m.result);
    }
  };
  const call = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const key = ++id,
        timer = setTimeout(() => reject(Error("CDP_TIMEOUT_" + method)), 20000);
      pending.set(key, { resolve, reject, timer });
      ws.send(
        JSON.stringify({
          id: key,
          method,
          params,
          ...(sessionId ? { sessionId } : {}),
        }),
      );
    });
  const { targetId } = await call("Target.createTarget", {
      url: "http://127.0.0.1:" + server.address().port + "/shelf.html",
    }),
    { sessionId } = await call("Target.attachToTarget", {
      targetId,
      flatten: true,
    });
  const evalJS = async (expression) => {
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
  const check = (id, passed) => {
    result.assertions.push({ id, passed: !!passed });
    if (!passed) throw Error("ASSERT_" + id);
  };
  await call(
    "Emulation.setDeviceMetricsOverride",
    { width: 320, height: 1000, deviceScaleFactor: 1, mobile: false },
    sessionId,
  );
  for (let n = 0; n < 100; n++) {
    if (
      await evalJS(
        '!!globalThis.RedownProviderConnection&&document.getElementById("shelf-google-label").textContent==="GO TO"',
      )
    )
      break;
    await pause(30);
  }
  const key = async (selector, kind) => {
    await evalJS(
      "document.querySelector(" + JSON.stringify(selector) + ").focus()",
    );
    await call(
      "Input.dispatchKeyEvent",
      {
        type: "keyDown",
        text: kind === "Space" ? " " : "\r",
        unmodifiedText: kind === "Space" ? " " : "\r",
        key: kind === "Space" ? " " : "Enter",
        code: kind,
        windowsVirtualKeyCode: kind === "Space" ? 32 : 13,
      },
      sessionId,
    );
    await call(
      "Input.dispatchKeyEvent",
      {
        type: "keyUp",
        key: kind === "Space" ? " " : "Enter",
        code: kind,
        windowsVirtualKeyCode: kind === "Space" ? 32 : 13,
      },
      sessionId,
    );
    await pause(40);
  };
  for (const p of ["google", "dropbox", "onedrive"])
    check(
      p + "-go-to",
      await evalJS(
        'document.getElementById("shelf-' +
          p +
          '-label").textContent==="GO TO"',
      ),
    );
  await key("#shelf-google-drive", "Enter");
  await key("#shelf-dropbox", "Space");
  await key("#shelf-onedrive", "Enter");
  result.navigationSnapshot = await evalJS(
    "({tabs:__tabs,auth:__auth,active:document.activeElement.id})",
  );
  check(
    "navigation-never-authorizes",
    await evalJS("__tabs.length===3&&__auth.length===0"),
  );
  await key("#shelf-google-reconnect", "Space");
  check(
    "keyboard-reconnect-independent-and-busy",
    await evalJS(
      '__auth.join()==="googleDriveOpen"&&document.getElementById("shelf-google-reconnect").disabled&&!document.getElementById("shelf-google-drive").disabled',
    ),
  );
  await key("#shelf-google-drive", "Enter");
  check(
    "go-to-remains-available-during-refresh",
    await evalJS("__tabs.length===4&&__auth.length===1"),
  );
  await evalJS(
    '__pending.shift()({ok:false,code:"GOOGLE_AUTH_CANCELLED",error:"Authorization cancelled. Existing saves preserved."})',
  );
  await pause(30);
  check(
    "cancelled-auth-is-not-a-save-or-signout",
    await evalJS(
      '!document.getElementById("shelf-google-reconnect").disabled&&document.getElementById("shelf-google-label").textContent==="GO TO"&&document.getElementById("shelf-google-authorization").textContent.includes("CANCELLED")',
    ),
  );
  await key("#shelf-onedrive-reconnect", "Enter");
  await evalJS(
    '__pending.shift()({ok:false,code:"ONEDRIVE_GRAPH_503",error:"Microsoft temporarily unavailable."})',
  );
  await pause(30);
  check(
    "503-preserves-navigation-and-other-providers",
    await evalJS(
      'document.getElementById("shelf-onedrive-label").textContent==="GO TO"&&__auth.filter(x=>x==="dropboxConnect").length===0',
    ),
  );
  const ax = await call("Accessibility.getFullAXTree", {}, sessionId);
  check(
    "accessible-button-names",
    ["Google Drive", "Dropbox", "OneDrive"].every((name) =>
      ax.nodes.some(
        (n) =>
          n.role?.value === "button" && n.name?.value === "Reconnect " + name,
      ),
    ),
  );
  result.bounds = await evalJS(
    `['google','dropbox','onedrive'].map(p=>{const a=document.getElementById(p==='google'?'shelf-google-drive':'shelf-'+p).getBoundingClientRect(),b=document.getElementById('shelf-'+p+'-reconnect').getBoundingClientRect();return {provider:p,primary:{left:a.left,right:a.right},refresh:{left:b.left,right:b.right,width:b.width,height:b.height},separate:a.right<=b.left+1,visible:b.left>=0&&b.right<=innerWidth};})`,
  );
  check(
    "320px-distinct-visible-touch-targets",
    result.bounds.every(
      (b) =>
        b.separate &&
        b.visible &&
        b.refresh.width >= 24 &&
        b.refresh.height >= 24,
    ),
  );
  const shot = await call(
    "Page.captureScreenshot",
    { format: "png" },
    sessionId,
  );
  await writeFile(join(out, "shelf-320.png"), Buffer.from(shot.data, "base64"));
  result.responsive=[];
  for(const width of [400,480,640]){
    await call('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
    const fits=await evalJS(`['google','dropbox','onedrive'].every(p=>{const range=document.createRange();range.selectNodeContents(document.getElementById('shelf-'+p+'-label'));const word=range.getBoundingClientRect(),button=document.getElementById('shelf-'+p+'-reconnect').getBoundingClientRect();return word.right<=button.left+1&&button.right<=innerWidth;})`);
    result.responsive.push({width,fits});check('labels-and-reconnect-fit-'+width,fits);
  }
  await call('Emulation.setDeviceMetricsOverride',{width:320,height:1000,deviceScaleFactor:1,mobile:false},sessionId);
  await call(
    "Emulation.setEmulatedMedia",
    {
      features: [
        { name: "prefers-reduced-motion", value: "reduce" },
        { name: "forced-colors", value: "active" },
      ],
    },
    sessionId,
  );
  await key("#shelf-dropbox-reconnect", "Space");
  check(
    "forced-colors-keyboard-focus-and-busy",
    await evalJS(
      'document.getElementById("shelf-dropbox-reconnect").getAttribute("aria-busy")==="true"',
    ),
  );
  await evalJS("__pending.shift()({ok:true})");
  await pause(30);
  check(
    "focus-restored-after-authorization",
    await evalJS('document.activeElement.id==="shelf-dropbox-reconnect"'),
  );
  const contrast = await call(
    "Page.captureScreenshot",
    { format: "png" },
    sessionId,
  );
  await writeFile(
    join(out, "shelf-contrast.png"),
    Buffer.from(contrast.data, "base64"),
  );
  result.state = "passed";
} catch (e) {
  result.code = String(e.message).slice(0, 300);
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
