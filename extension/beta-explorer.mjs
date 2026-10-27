import {sha256} from './file-engine/vendor/sha256.mjs';
import {hex} from './file-engine/streaming.mjs';
import {createFileEngine} from './file-engine/engine.mjs';
import {createProviderRegistry,modelFor,providerDescription} from './file-engine/provider-contract.mjs';
import {r2HttpAdapter,LAB_BUCKETS} from "./file-engine/adapters/r2-http.mjs";
import { installWalkthrough } from "./beta-walkthrough.mjs";
import { API_VERSION } from "./file-engine/contract.mjs";
import { createSimulationEngine } from "./file-engine/simulation.mjs";
import {createResourceAtlas} from "./file-engine/resources.mjs";
import { openBetaStore } from "./file-engine/indexeddb-store.mjs";
export function installBetaExplorer({
  document,
  chrome,
  indexedDB = globalThis.indexedDB,
  confirm = globalThis.confirm,
  prompt = globalThis.prompt,
  providerBindings,
  authorize,
}) {
  const $ = (id) => document.getElementById(id);
  // Optional explicit, ephemeral lab injection. Never reads production profiles or persists a bearer.
  const lab=document.defaultView.RedownLabConfig?.enabled===true?document.defaultView.RedownLabConfig:null;
  const extraAdapters=lab?[r2HttpAdapter(lab)]:[];
  if(lab){for(const control of ['provider','destination'])for(const bucket of LAB_BUCKETS){const option=document.createElement('option');option.value='r2-lab:'+bucket;option.textContent='Live lab · '+bucket;$(control).append(option);}document.querySelector('.notice p').textContent='Authorized live test laboratory available. Only the four dedicated buckets and leased run prefix are accessible.';}
  const registry=providerBindings?createProviderRegistry(providerBindings):null;
  const bindings=new Map((providerBindings||[]).map((b,i)=>['binding-'+i,b]));
  const positions=new Map(),parents=new Map();
  if(registry)for(const control of ['provider','destination'])$(control).replaceChildren(...[...bindings].map(([key,b])=>{const option=document.createElement('option');option.value=key;option.textContent=b.label||b.adapter.id;return option;}));
  const activeBinding=control=>bindings.get($(control).value);
  const position=control=>{const root=positions.get($(control).value)||activeBinding(control)?.root;return root&&!root.locator?{...root,key:control==='provider'?$('prefix').value:root.key}:root;};
  const objectIdentity=object=>object.identity||{provider:object.provider,account:object.account,container:object.container,key:object.key};
  const nameOf=object=>object.name||displayName(object.key);
  const destinationFor=(control,name,folder=false)=>registry?modelFor(activeBinding(control).adapter).child(position(control),name,folder):identity($(control).value,$('prefix').value+name+(folder?'/':''));
  const navigateObject=object=>{const key=$('provider').value;if(registry&&object.identity?.locator){const stack=parents.get(key)||[];stack.push(position('provider'));parents.set(key,stack);positions.set(key,object.identity);$('prefix').value=object.name;}else $('prefix').value=object.key;};
  const displayProvider=id=>registry?(providerBindings.find(b=>b.adapter.id===id)?.label||id):id==='r2-lab'?'Live R2 test laboratory':id==='fake-r2'?'Simulated R2':'Simulated Drive';
  const walkthrough = installWalkthrough({
    document,
    inspectOperation: async (id) => {
      if (!engine) return { state: "unavailable" };
      const job = await engine.inspect(id);
      if (!job) return { state: "unavailable" };
      return {
        id: job.id,
        operation: job.request.operation,
        state: job.state,
        executor: job.executor,
        events: job.events,
        error: job.error || null,
        verification: job.receipt
          ? {
              level: job.receipt.level,
              providerEvidence: job.receipt.providerEvidence,
            }
          : null,
        source: job.request.source
          ? { provider: job.request.source.provider, identity: "redacted" }
          : null,
        destination: job.request.destination
          ? { provider: job.request.destination.provider, identity: "redacted" }
          : null,
      };
    },
  });
  const guideEvent = (detail) =>
    document.dispatchEvent(
      new document.defaultView.CustomEvent("beta:guide-event", { detail }),
    );
  let previewRelease,metadataRelease,listenerRelease,observer;
  const startupAt=performance.now();
  let collector, engine,
    store,
    opening,
    enabled = false,
    clipboard = null,
    selected = null,
    cursor = null,
    generation = 0;
  const identity = (provider,key) => {
    if(registry){const binding=bindings.get(provider);const root=positions.get(provider)||binding.root;return root.locator?structuredClone(root):{...root,key:key||root.key};}
    if(lab&&provider.startsWith('r2-lab:'))return {provider:'r2-lab',account:'lab',container:provider.slice(7),key:key.startsWith(lab.prefix)?key:lab.prefix+key};
    return {provider,account:'demo',container:'sandbox',key};
  };
  function icon(name) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"),
      use = document.createElementNS("http://www.w3.org/2000/svg", "use");
    use.setAttribute("href", "#i-" + name);
    svg.setAttribute("aria-hidden", "true");
    svg.append(use);
    return svg;
  }
  function displayName(key) {
    return key.replace(/\/$/, "").split("/").pop() || "All files";
  }
  function updateSelection() {
    $("selection-name").textContent = selected
      ? nameOf(selected)
      : "A closer look.";
    $("selection-meta").textContent = selected
      ? (selected.folder ? "Folder" : selected.size + " bytes") +
        " · " +
        displayProvider(objectIdentity(selected).provider)
      : "Select a file or folder to see its details.";
    $("selection-icon").replaceChildren(
      icon(selected?.folder ? "folder" : "file"),
    );
    for (const id of ["copy", "cut", "rename", "delete"])
      $(id).disabled = !enabled || !selected || selected.provider==='r2-lab'&&['cut','rename','delete'].includes(id);
    if(registry&&selected){const b=providerBindings.find(b=>b.adapter.id===objectIdentity(selected).provider),ops=providerDescription(b.adapter).operations;for(const [button,op] of [['cut','move'],['rename','rename'],['delete','delete']])$(button).disabled=!enabled||ops[op]==='unsupported';}
    $("read").disabled = !enabled || !selected || selected.folder;
    $("paste").disabled = !enabled || !clipboard;
    for (const row of $("files").children)
      row.dataset.selected = String(row.dataset.key === selected?.key);
  }
  function selectObject(object, check) {
    previewRelease?.();previewRelease=null;
    selected = object;
    check.checked = true;
    $("preview").hidden = true;
    updateSelection();
    guideEvent({ kind: "action", action: "selection" });
  }
  function showActivity() {
    const panel = $("activity");
    panel.open = true;
    panel.scrollIntoView?.({ behavior: "smooth", block: "nearest" });
    $("jobs").focus();
    guideEvent({ kind: "action", action: "activity" });
  }
  function message(text, state = "") {
    $("status").textContent = text;
    $("status").dataset.state = state;
  }
  async function gate() {
    enabled =
      (await chrome.storage.local.get("betaModeEnabled")).betaModeEnabled ===
      true;
    $("explorer").hidden = !enabled;
    $("gate").dataset.enabled = String(enabled);
    $("gate").textContent = enabled
      ? (registry?"Beta Mode enabled · Cloudflare R2":lab?"Beta Mode enabled · Authorized test laboratory":"Beta Mode enabled · Simulation foundation")
      : "Beta Explorer is hidden. Enable the existing Beta Mode in Dashboard settings. Saved simulation jobs are retained.";
    if (!enabled) {
      if($("explorer").contains(document.activeElement)){ $("gate").tabIndex=-1; $("gate").focus(); }
      previewRelease?.();previewRelease=null;$("preview").textContent="";
      generation++;
      clipboard = null;
      selected = null;
      $("preview").hidden = true;
      $("trace").textContent = "";
    }
    updateSelection();
    document.dispatchEvent(
      new document.defaultView.CustomEvent("beta:availability", {
        detail: { enabled },
      }),
    );
  }
  async function initialize() {
    if (!opening)
      opening = openBetaStore(indexedDB).then((value) => {
        store = value;
        collector=createResourceAtlas({store});
        engine = registry?createFileEngine({store,resources:collector,adapters:registry.adapters,authorize:async request=>{if(authorize?!await authorize(request):[request.source,request.destination].filter(Boolean).some(id=>registry.adapters.find(a=>a.id===id.provider)?.capabilities.realProvider!==false))return false;for(const id of [request.source,request.destination].filter(Boolean)){let within=false;for(const b of providerBindings)if(await registry.contains(b.root,id)){within=true;break;}if(!within)return false;}return true;}}):createSimulationEngine(store,{resources:collector,extraAdapters,...(lab?{authorize:request=>[request.source,request.destination].filter(Boolean).every(id=>id.provider==='r2-lab'?id.account==='lab'&&LAB_BUCKETS.includes(id.container)&&id.key.startsWith(lab.prefix):['fake-r2','fake-drive'].includes(id.provider))}:{})});
      });
    await opening;
    if(!listenerRelease)listenerRelease=collector.track('event-listener');
  }
  async function allowed() {
    await gate();
    if (!enabled) throw Error("BETA_MODE_DISABLED");
    await initialize();
  }
  async function run(operation, args = {}, transfer) {
    const inputAt=performance.now();
    await allowed();
    const traceId=await collector.begin(operation);
    collector.record(traceId,"ui.input","extension/beta-explorer.mjs",inputAt);
    const result = await (registry?engine.run.bind(engine):args.source?.provider==='r2-lab'||args.destination?.provider==='r2-lab'?engine.runCanonical.bind(engine):engine.run.bind(engine))({
      apiVersion: registry?'0.3.0':args.source?.provider==='r2-lab'||args.destination?.provider==='r2-lab'?'0.2.0':API_VERSION,
      operation,
      idempotencyKey: crypto.randomUUID(),
      ...args,
    },{traceId,transfer});
    guideEvent({
      kind: "operation",
      operation,
      state: result.state,
      operationId: result.id,
      ...(result.error
        ? {
            code: /^[A-Z_]{1,64}$/.test(result.error)
              ? result.error
              : "UNCLASSIFIED",
          }
        : {}),
      scope: args.source?.key ? "folder" : "root",
      search: Boolean(args.query),
      empty:
        Array.isArray(result.result?.objects) &&
        result.result.objects.length === 0,
      crossProvider: Boolean(
        args.source &&
          args.destination &&
          args.source.provider !== args.destination.provider,
      ),
    });
    return result;
  }
  async function browse(append = false) {
    await allowed();
    if(registry){const b=activeBinding('provider');$('prefix').disabled=!!b.root.locator;$('documents').disabled=!!b.root.locator;}
    const ticket = ++generation;
    const result = await run("list", {
      source: identity($("provider").value, $("prefix").value),
      query: $("query").value,
      limit: 50,
      ...(append && cursor ? { cursor } : {}),
    });
    if (ticket !== generation || !enabled) return;
    if (result.state !== "completed") {
      message(result.error, "failed");
      return;
    }
    const renderStart=performance.now();
    if (!append) {
      metadataRelease?.();metadataRelease=null;
      $("files").replaceChildren();
      selected = null;
    }
    for (const object of result.result.objects) {
      const row = document.createElement("li"),
        check = document.createElement("input"),
        button = document.createElement("button");
      row.dataset.key = object.key;
      check.type = "radio";
      check.name = "selected";
      check.setAttribute("aria-label", "Select " + nameOf(object));
      check.onchange = () => selectObject(object, check);
      const art = document.createElement("span"),
        name = document.createElement("span"),
        meta = document.createElement("span");
      art.className = "file-art" + (object.folder ? " folder-art" : "");
      art.append(icon(object.folder ? "folder" : "file"));
      name.className = "file-name";
      name.textContent = nameOf(object);
      meta.className = "file-meta";
      meta.textContent = object.folder
        ? "Folder"
        : object.size + " bytes · Text";
      button.append(art, name, meta);
      button.title = object.folder ? "Open " + object.key : object.key;
      button.onclick = () => {
        if (object.folder) {
          navigateObject(object);
          $("query").value = "";
          safe(() => browse());
        } else selectObject(object, check);
      };
      row.append(check, button);
      $("files").append(row);
    }
    $("file-count").textContent = $("files").children.length + " items";
    $("empty-state").hidden = $("files").children.length > 0;
    const folder = displayName($("prefix").value);
    $("location-label").textContent = folder;
    document.querySelector("h1").firstChild.textContent = folder;
    $("home").classList.toggle("active", !$("prefix").value);
    $("documents").classList.toggle(
      "active",
      $("prefix").value === "Documents/",
    );
    updateSelection();
    cursor = result.result.cursor;
    $("next").hidden = !cursor;
    message(
      "Simulated listing · " +
        (result.result.complete ? "complete" : "more pages available"),
      "completed",
    );
    metadataRelease?.();metadataRelease=collector.track("metadata-cache",$("files").children.length*128);
    collector.record(result.id,"ui.render","extension/beta-explorer.mjs",renderStart);
    await collector.close();
    await refreshJobs();
  }
  async function refreshJobs() {
    const jobs = await engine.inspect();
    $("job-count").textContent = jobs.length;
    $("jobs").replaceChildren(
      ...jobs
        .slice()
        .reverse()
        .map((job) => {
          const option = document.createElement("option");
          option.value = job.id;
          option.textContent =
            job.request.operation + " · " + job.state + " · " + job.id;
          return option;
        }),
    );
  }
  const pending = new Set();
  function safe(fn) {
    const task = Promise.resolve()
      .then(fn)
      .catch((error) =>
        message(error.code || error.message || "Action unavailable", "failed"),
      )
      .finally(() => pending.delete(task));
    pending.add(task);
    return task;
  }
  function requireSelection() {
    if (!selected) throw Error("Select one file or folder.");
    if(registry)return objectIdentity(selected);
    return selected.provider==='r2-lab'?{provider:selected.provider,account:selected.account,container:selected.container,key:selected.key}:identity(selected.provider, selected.key);
  }
  async function mutation(operation, args, transfer) {
    const result = await run(operation, args, transfer);
    message(
      result.state === "completed" ? (registry?"Transfer completed and verified":"Simulation completed") : result.error,
      result.state,
    );
    await refreshJobs();
    $("trace").textContent = JSON.stringify(
      await (registry?engine.exportEvidence(result.id):engine.diagnose(result.id)),
      null,
      2,
    );
    if (result.state === "completed") await browse();
    return result;
  }
  $("navigation").onsubmit = (event) => {
    event.preventDefault();
    safe(() => browse());
  };
  $("provider").onchange = () => {
    clipboard = null;
    if(registry){const b=activeBinding('provider');$('prefix').disabled=!!b.root.locator;$('documents').disabled=!!b.root.locator;positions.delete($('provider').value);parents.delete($('provider').value);}
    $("prefix").value = lab&&$("provider").value.startsWith("r2-lab:")?lab.prefix:"";
    safe(async () => {
      await browse();
      guideEvent({ kind: "action", action: "provider" });
    });
  };
  $("destination").onchange = () =>
    guideEvent({ kind: "action", action: "destination" });
  $("next").onclick = () =>
    safe(async () => {
      await browse(true);
      guideEvent({ kind: "action", action: "next-page" });
    });
  $("up").onclick = () => {
    if(registry&&position('provider')?.locator){const key=$('provider').value,stack=parents.get(key)||[];positions.set(key,stack.pop()||activeBinding('provider').root);$('prefix').value=stack.length?'Folder':'';safe(()=>browse());return;}
    const parts = $("prefix").value.replace(/\/$/, "").split("/");
    parts.pop();
    $("prefix").value = parts.length ? parts.join("/") + "/" : "";
    safe(async () => {
      await browse();
      guideEvent({ kind: "action", action: "up" });
    });
  };
  $("copy").onclick = () =>
    safe(async () => {
      await allowed();
      clipboard = { operation: "copy", source: requireSelection(),name:nameOf(selected),folder:selected.folder };
      updateSelection();
      message(clipboard.source.provider==='r2-lab'?"Test laboratory selection copied.":"Simulated selection copied.");
      guideEvent({ kind: "action", action: "copy" });
    });
  $("cut").onclick = () =>
    safe(async () => {
      await allowed();
      clipboard = { operation: "move", source: requireSelection(),name:nameOf(selected),folder:selected.folder };
      updateSelection();
      message("Simulated selection cut; source retained until paste.");
      guideEvent({ kind: "action", action: "cut" });
    });
  $("paste").onclick = () =>
    safe(async () => {
      if (!clipboard) throw Error("Copy or cut a simulated item first.");
      const captured = structuredClone(clipboard);
      if (
        captured.operation === "move" &&
        !confirm("Move this simulated item?")
      )
        return;
      const name = registry?captured.name:
        captured.source.key.replace(/\/$/, "").split("/").pop() +
        (captured.source.key.endsWith("/") ? "/" : "");
      const result = await mutation(captured.operation, {
        source: captured.source,
        destination: registry?destinationFor("destination",name,captured.folder):identity($("destination").value, $("prefix").value + name),
        ...(captured.operation === "move" ? { confirmed: true } : {}),
      });
      if (result.state === "completed" && captured.operation === "move") {
        clipboard = null;
        updateSelection();
      }
    });
  $("delete").onclick = () =>
    safe(async () => {
      const source = requireSelection();
      if (confirm("Delete the selected simulated item and its children?"))
        await mutation("delete", { source, confirmed: true });
    });
  $("rename").onclick = () =>
    safe(async () => {
      const source = requireSelection(),
        name = prompt("New name (same folder):");
      if (!name) return;
      if (name.includes("/") || name.includes("\\"))
        throw Error("Enter a single name.");
      if(registry){const b=providerBindings.find(b=>b.adapter.id===source.provider),parent=position('provider');await mutation('rename',{source,destination:modelFor(b.adapter).child(parent,name,selected.folder),confirmed:true});return;}
      const parts = source.key.replace(/\/$/, "").split("/");
      parts.pop();
      await mutation("rename", {
        source,
        destination: {
          ...source,
          key:
            (parts.length ? parts.join("/") + "/" : "") +
            name +
            (source.key.endsWith("/") ? "/" : ""),
        },
        confirmed: true,
      });
    });
  $("mkdir").onclick = () =>
    safe(async () => {
      const name = prompt("New simulated folder name:");
      if (!name) return;
      if (/[\/\\]/.test(name)) throw Error("Enter a single name.");
      await mutation("mkdir", {
        destination: destinationFor("provider",name,true),
      });
    });
  $("upload").onchange = () =>
    safe(async () => {
      const file = $("upload").files[0];
      if (!file) return;
      if(registry&&activeBinding('provider').adapter.manifest?.features.streamingUploads){
        const source=async function*(){for(let offset=0;offset<file.size;offset+=262144)yield new Uint8Array(await file.slice(offset,offset+262144).arrayBuffer());};
        const digest=sha256.create();for await(const bytes of source())digest.update(bytes);
        await mutation('upload',{destination:destinationFor('provider',file.name),transfer:{size:file.size,sha256:hex(digest.digest())},metadata:{contentType:file.type||'application/octet-stream'}},{source,onProgress:p=>message(`${p.bytes} / ${p.total} bytes`, 'executing')});
        $('upload').value='';return;
      }
      if (file.size > 65536)
        throw Error("Text fixtures are limited to 64 KiB.");
      if (file.type && !file.type.startsWith("text/"))
        throw Error("Choose a text fixture.");
      await mutation("upload", {
        destination: destinationFor("provider",file.name),
        content: await file.text(),
      });
      $("upload").value = "";
    });
  if($('download'))$('download').onclick=()=>safe(async()=>{
    const source=requireSelection();
    if(!registry||selected.folder)throw Error('Select a connected Cloudflare file.');
    if(typeof document.defaultView.showSaveFilePicker!=='function')throw Error('Streaming downloads require Chrome’s file save picker.');
    const handle=await document.defaultView.showSaveFilePicker({suggestedName:nameOf(selected)});
    const writer=await handle.createWritable();
    try{
      const result=await run('read',{source,transfer:{size:selected.size}},{sink:bytes=>writer.write(bytes),onProgress:p=>message(`${p.bytes} / ${p.total} bytes`,'executing')});
      if(result.state!=='completed')throw Error(result.error);
      await writer.close();message('Download verified: '+result.result.sha256,'completed');
    }catch(error){await writer.abort();throw error;}
  });
  $("read").onclick = () =>
    safe(async () => {
      const source = requireSelection();
      if (selected.folder)
        throw Error("Open the folder to browse it.");
      const result = await run("read", { source });
      if (result.state !== "completed") throw Error(result.error);
      if (!enabled) return;
      const previewStart=performance.now();previewRelease?.();
      previewRelease=collector.track("preview",new TextEncoder().encode(result.result.content).length);
      $("preview").textContent = result.result.content;
      $("preview").hidden = false;
      collector.record(result.id,"ui.preview","extension/beta-explorer.mjs",previewStart);
      await collector.close();
      await refreshJobs();
    });
  $("refresh-jobs").onclick = () =>
    safe(async () => {
      await allowed();
      await refreshJobs();
      guideEvent({ kind: "action", action: "refresh-jobs" });
    });
  $("inspect").onclick = () =>
    safe(async () => {
      await allowed();
      $("trace").textContent = JSON.stringify(
        await (registry?engine.exportEvidence($("jobs").value):engine.diagnose($("jobs").value)),
        null,
        2,
      );
      guideEvent({ kind: "action", action: "inspect" });
    });

  $("home").onclick = () => {
    if(registry){const key=$('provider').value;positions.delete(key);parents.delete(key);}
    $("prefix").value = "";
    $("query").value = "";
    safe(() => browse());
  };
  $("documents").onclick = () => {
    $("prefix").value = "Documents/";
    $("query").value = "";
    safe(() => browse());
  };
  $("activity-link").onclick = $("show-activity").onclick = showActivity;
  for (const mode of ["grid", "list"])
    $("view-" + mode).onclick = () => {
      $("files").classList.toggle("file-list", mode === "list");
      for (const value of ["grid", "list"])
        $("view-" + value).setAttribute("aria-pressed", String(mode === value));
      guideEvent({ kind: "action", action: "view-" + mode });
    };
  document
    .querySelector(".comparison summary")
    .addEventListener("click", () =>
      guideEvent({ kind: "action", action: "comparison" }),
    );
  const storageChanged=(changes, area) => {
    if (area === "local" && changes.betaModeEnabled)
      safe(async () => {
        await gate();
        if (enabled) await browse();
      });
  };
  chrome.storage.onChanged.addListener(storageChanged);
  safe(async () => {
    await gate();
    if (!enabled) return;
    await initialize();
    const startup=await collector.begin("startup");
    collector.record(startup,"startup","extension/beta-explorer.mjs",startupAt);
    await collector.finish(startup);
    await browse();
  });

  return {
    async settle() {
      while (pending.size) await Promise.allSettled([...pending]);
    },
    resources:{query:(method,input)=>engine?.resources.query(method,input),exportEvidence:()=>engine?.resources.exportEvidence()},
    close() {
      previewRelease?.();metadataRelease?.();listenerRelease?.();observer?.disconnect();
      chrome.storage.onChanged.removeListener?.(storageChanged);
      walkthrough.destroy();
      store?.close();
    },
  };
}
export const controller =
  typeof document !== "undefined" && typeof chrome !== "undefined" && !globalThis.REDOWN_CLOUDFLARE_BOOTSTRAP
    ? installBetaExplorer({ document, chrome })
    : null;
