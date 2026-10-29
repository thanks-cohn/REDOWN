const ROOT_MENU_ID = "redown";
const CF_CLIENT_ID = "d9db0f71eb24cd2eed86b50a650a045e";
const CF_AUTH_URL = "https://dash.cloudflare.com/oauth2/auth";
const CF_TOKEN_URL = "https://dash.cloudflare.com/oauth2/token";
const CF_API = "https://api.cloudflare.com/client/v4";

const GITHUB_WORKFLOW = `name: REDOWN Remote Ingest

on:
  workflow_dispatch:
    inputs:
      source_url:
        description: Remote HTTPS URL to fetch
        required: true
        type: string
      destination_path:
        description: Repository path to write
        required: true
        type: string

permissions:
  contents: write

jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Validate destination
        shell: bash
        run: |
          case "\${{ inputs.destination_path }}" in
            /*|*..*) echo "Unsafe destination path"; exit 1 ;;
          esac
      - name: Download remotely on GitHub runner
        shell: bash
        run: |
          mkdir -p "$(dirname "\${{ inputs.destination_path }}")"
          curl --fail --location --proto '=https' --max-redirs 5 \\
            --output "\${{ inputs.destination_path }}" \\
            "\${{ inputs.source_url }}"
      - name: Commit asset
        shell: bash
        run: |
          git config user.name "redown-ingest"
          git config user.email "redown-ingest@users.noreply.github.com"
          git add -- "\${{ inputs.destination_path }}"
          if git diff --cached --quiet; then exit 0; fi
          git commit -m "asset: ingest $(basename "\${{ inputs.destination_path }}")"
          git push
`;

const WORKER_SOURCE = `
const REDOWN_SHARED_SECRET = "__REDOWN_SHARED_SECRET__";
function privateHost(hostname) {
  const h = hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".localhost") || h === "::1" || h === "0.0.0.0") return true;
  const m = h.match(/^(\\\\d{1,3})\\\\.(\\\\d{1,3})\\\\.(\\\\d{1,3})\\\\.(\\\\d{1,3})$/);
  if (!m) return false;
  const a = Number(m[1]), b = Number(m[2]);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}
function cleanName(value) {
  const name = String(value || "").split(/[?#]/)[0].split("/").pop()
    .replace(/[^a-zA-Z0-9._ -]/g, "-").replace(/^\\\\.+/, "").slice(0, 180);
  if (!name || name === "." || name === "..") throw new Error("Invalid filename");
  return name;
}
function cleanPrefix(value) {
  const parts = String(value || "").split("/").map(x => x.trim()).filter(Boolean);
  if (parts.some(x => x === "." || x === "..")) throw new Error("Invalid object path");
  return parts.map(x => x.replace(/[^a-zA-Z0-9._ -]/g, "-")).join("/");
}
async function explorerWire(request,env,authorized) {
  if(!authorized)return null;
  let context;try{context=JSON.parse(request.headers.get("x-redown-diagnostic")||"null");}catch{return null;}
  if(context?.protocol!==1||!/^[a-f0-9-]{36}$/.test(context.operationId||"")||!/^[a-f0-9]{64}$/.test(context.seed||""))return null;
  const events=[];let truncated=false;
  const event=(stage,outcome,details={})=>{if(events.length<32)events.push({stage,component:"worker",outcome,requestId:context.requestId,...details});else truncated=true;};
  async function fingerprint(kind,value){
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(context.seed),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const digest=await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(kind+"\\0"+String(value)));
    return Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,"0")).join("");
  }
  event("worker.check","confirmed",{workerVersion:6,protocol:1,safeTransfers:true,bindingDeclared:Boolean(env.REDOWN_DIAGNOSTIC_BINDING),origin:await fingerprint("origin",new URL(request.url).origin),expectedOrigin:context.expectedOrigin});
  if(env.REDOWN_DIAGNOSTIC_BINDING)event("worker.check","confirmed",{binding:await fingerprint("bucket",env.REDOWN_DIAGNOSTIC_BINDING),expectedBinding:context.expectedBinding,bindingDeclared:true});
  function payload(){return {protocol:1,operationId:context.operationId,events,truncated};}
  return {context,event,fingerprint,payload,header:JSON.stringify(context),headers(){return {"x-redown-diagnostic":JSON.stringify(payload())};},json(body,options={}){return Response.json({...body,explorerDiagnostic:payload()},options);},merge(response){try{const data=JSON.parse(response.headers.get("x-redown-diagnostic")||"null");if(data?.operationId===context.operationId&&data.protocol===1)for(const item of (data.events||[]).slice(0,16))event(item.stage,item.outcome,item);}catch{}},async identity(key,role="source",encoding="literal"){try{event(role==="source"?"source.identity":"destination.identity","confirmed",{expectedKey:role==="source"?context.expectedKey:undefined,key:await fingerprint("key",key),encodedKey:await fingerprint("key",encoding==="query"?encodeURIComponent(key):key),encoding,role,scope:context.scope});}catch{}}};
}
function explorerWorkerError(message,code,status,stage){const error=new Error(message);error.code=code;error.status=status;error.stage=stage;error.component="worker";return error;}
function exactObjectKey(value) {
  if (typeof value !== "string" || !value || value.includes("\\0") || new TextEncoder().encode(value).byteLength > 1024) throw new Error("Invalid object key");
  return value;
}
function exactFolder(value) {
  const prefix=String(value||"");
  if (!prefix) return "";
  exactObjectKey(prefix);
  if(prefix.split("/").some(part=>part==="."||part===".."))throw new Error("Invalid folder path");
  return prefix.replace(/\\/+$/,"");
}
function checksumHex(object) {
  const md5=object.checksums?.md5;
  return md5?Array.from(new Uint8Array(md5),byte=>byte.toString(16).padStart(2,"0")).join(""):"";
}
async function verifiedObjectPut(storage,key,body,options,expectedSize,expectedMd5="") {
  const receipt=await storage.put(key,body,{...options,...(expectedMd5?{md5:expectedMd5}:{})});
  if(!receipt){const error=explorerWorkerError("Destination changed during this operation. Existing data was preserved.","EXPLORER_DESTINATION_CONFLICT",409,"destination.write");error.conflict=true;throw error;}
  const head=await storage.head(key);
  if(!head||head.size!==expectedSize||!receipt.etag||head.etag!==receipt.etag||receipt.version&&head.version!==receipt.version)throw explorerWorkerError("Destination verification failed. The source was preserved; inspect the destination before retrying.","EXPLORER_COPY_VERIFICATION_FAILED",409,"destination.verify");
  return head;
}
async function copyVerifiedObject(storage,entry,sourceWorkerUrl,sourceToken,conflict,diagnostic) {
  const sourceKey=exactObjectKey(entry.sourceKey);let destinationKey=exactObjectKey(entry.destinationKey);
  if(entry.sameBucket&&sourceKey===destinationKey)throw new Error("Source and destination are the same");
  if(diagnostic){diagnostic.context.requestId=entry.diagnosticRequestId;diagnostic.context.expectedKey=entry.diagnosticExpectedKey;}
  await diagnostic?.identity(sourceKey);await diagnostic?.identity(destinationKey,"destination");
  let existing=await storage.head(destinationKey);
  if(existing&&conflict==="skip")return {sourceKey,destinationKey,status:"conflict"};
  if(existing&&conflict==="keep"){destinationKey=await uniqueKey(storage,destinationKey);existing=null;}
  // Conditional create also protects keep-both against a filename race. Replace
  // is only allowed after explicit UI choice and only for the version inspected.
  const onlyIf=existing?{etagMatches:existing.etag}:new Headers({"If-None-Match":"*"});
  let stream,size,etag,md5,httpMetadata,customMetadata,sourceVersion;
  diagnostic?.event("source.read","started",{mechanism:entry.sameBucket?"local":"worker"});
  if(entry.sameBucket){
    const object=await storage.get(sourceKey);
    if(!object?.body)throw explorerWorkerError("Source object was not found","EXPLORER_SOURCE_NOT_FOUND",404,"source.read");
    stream=object.body;size=object.size;etag=object.etag;sourceVersion=object.version;md5=checksumHex(object);httpMetadata=object.httpMetadata;customMetadata=object.customMetadata;
  }else{
    if(!/^https:\\/\\/[^/]+$/.test(sourceWorkerUrl)||!sourceToken)throw new Error("Source bucket is not ready");
    const response=await fetch(sourceWorkerUrl+"/object?key="+encodeURIComponent(sourceKey),{redirect:"manual",headers:{authorization:"Bearer "+sourceToken,...(diagnostic?{"x-redown-diagnostic":JSON.stringify({...diagnostic.context,expectedBinding:diagnostic.context.sourceBinding,expectedOrigin:await diagnostic.fingerprint("origin",new URL(sourceWorkerUrl).origin)})}:{})},signal:AbortSignal.timeout(25000)});
    diagnostic?.merge(response);diagnostic?.event("source.read",response.ok?"confirmed":"failed",{status:response.status,mechanism:"worker",method:"GET",endpoint:"worker.object"});
    if(!response.ok||!response.body)throw explorerWorkerError("Source object was not available (HTTP "+response.status+")",response.status===404?"EXPLORER_HTTP_NOT_FOUND":response.status===401?"EXPLORER_AUTH_EXPIRED":response.status===403?"EXPLORER_PERMISSION_DENIED":"EXPLORER_RESULT_UNCONFIRMED",response.status,"source.read");
    stream=response.body;size=Number(response.headers.get("content-length"));etag=response.headers.get("x-redown-etag");sourceVersion=response.headers.get("x-redown-version");md5=response.headers.get("x-redown-md5")||"";
    if(!response.headers.has("content-length")||!Number.isSafeInteger(size)||size<0||!etag){await stream.cancel();throw new Error("Source Worker cannot confirm content. Repair its bucket and retry.");}
    httpMetadata=JSON.parse(decodeURIComponent(response.headers.get("x-redown-http-metadata")||"%7B%7D"));
    if(httpMetadata.cacheExpiry)httpMetadata.cacheExpiry=new Date(httpMetadata.cacheExpiry);
    customMetadata=JSON.parse(decodeURIComponent(response.headers.get("x-redown-metadata")||"%7B%7D"));
  }
  diagnostic?.event("source.read","confirmed",{size});diagnostic?.event("destination.write","started");
  const head=await verifiedObjectPut(storage,destinationKey,stream,{onlyIf,httpMetadata,customMetadata:{...(customMetadata||{}),copiedAt:new Date().toISOString()}},size,md5);
  diagnostic?.event("destination.write","confirmed",{size:head.size});diagnostic?.event("destination.verify","confirmed",{size:head.size});
  return {sourceKey,destinationKey,status:"copied",verified:true,sourceEtag:etag,sourceVersion,destinationEtag:head.etag,destinationVersion:head.version,size:head.size};
}
async function uniqueKey(storage, requested, firstIndex = 2, compact = false) {
  if (!(await storage.head(requested))) return requested;
  const slash = requested.lastIndexOf("/");
  const parent = slash >= 0 ? requested.slice(0, slash + 1) : "";
  const name = slash >= 0 ? requested.slice(slash + 1) : requested;
  const dot = name.lastIndexOf(".");
  const stem = dot > 0 ? name.slice(0, dot) : name;
  const extension = dot > 0 ? name.slice(dot) : "";
  for (let index = firstIndex; index < 10000; index++) {
    const candidate = parent + stem + (compact ? "-" + index : " (" + index + ")") + extension;
    if (!(await storage.head(candidate))) return candidate;
  }
  throw new Error("Could not choose an available filename");
}
async function putNewDownload(storage, key, value, metadata) {
  const result = await storage.put(key, value, { ...metadata, onlyIf: new Headers({ "If-None-Match": "*" }) });
  if (result === null) throw new Error("Another download claimed this filename. Please retry; the existing file was preserved.");
  return result;
}
function extensionForContentType(contentType) {
  const type = String(contentType || "").split(";")[0].trim().toLowerCase();
  const map = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/avif": "avif",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "audio/mpeg": "mp3",
    "audio/ogg": "ogg",
    "audio/wav": "wav",
    "model/gltf-binary": "glb",
    "model/gltf+json": "gltf",
    "application/pdf": "pdf"
  };
  return map[type] || "";
}
function filenameWithInferredExtension(filename, contentType) {
  const clean = cleanName(filename);
  if (/\\.[a-z0-9]{1,10}$/i.test(clean)) return clean;
  const ext = extensionForContentType(contentType);
  return ext ? clean + "." + ext : clean;
}
function safePublicBase(value, requestUrl) {
  const fallback = requestUrl.origin + "/assets";
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return fallback;
    return url.toString().replace(/\\/+$/, "");
  } catch {
    return fallback;
  }
}

async function checkedFetch(raw, hops = 5) {
  let url = new URL(raw);
  if (url.protocol !== "https:" || url.username || url.password || privateHost(url.hostname)) {
    throw new Error("Only public HTTPS source URLs are allowed");
  }
  for (let i = 0; i <= hops; i++) {
    const res = await fetch(url, { redirect: "manual", headers: { "user-agent": "REDOWN/0.3" } });
    if (![301,302,303,307,308].includes(res.status)) return res;
    const next = res.headers.get("location");
    if (!next) throw new Error("Remote redirect missing Location");
    url = new URL(next, url);
    if (url.protocol !== "https:" || privateHost(url.hostname)) throw new Error("Unsafe redirect blocked");
  }
  throw new Error("Too many redirects");
}
const utf8 = new TextEncoder();
const readUtf8 = new TextDecoder();
const ARCHIVE_MAX_INDEX = 4 * 1024 * 1024;
const ARCHIVE_MAX_ENTRY = 512 * 1024 * 1024;
function bytesHex(bytes) { return Array.from(bytes, x => x.toString(16).padStart(2, "0")).join(""); }
async function readSignature(key, expires) {
  const cryptoKey = await crypto.subtle.importKey("raw", utf8.encode(REDOWN_SHARED_SECRET), { name:"HMAC", hash:"SHA-256" }, false, ["sign"]);
  return bytesHex(new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, utf8.encode(key + "\\n" + expires))));
}
async function signedReadUrl(requestUrl, key, ttl = 900) {
  const expires = Math.floor(Date.now() / 1000) + Math.max(30, Math.min(3600, Number(ttl) || 900));
  const signature = await readSignature(key, expires);
  return requestUrl.origin + "/private/object?key=" + encodeURIComponent(key) + "&expires=" + expires + "&signature=" + signature;
}
async function validSignedRead(url, key) {
  const expires = Number(url.searchParams.get("expires"));
  const supplied = url.searchParams.get("signature") || "";
  if (!Number.isSafeInteger(expires) || expires < Math.floor(Date.now() / 1000) || expires > Math.floor(Date.now() / 1000) + 3605) return false;
  const expected = await readSignature(key, expires);
  if (supplied.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < expected.length; i++) difference |= supplied.charCodeAt(i) ^ expected.charCodeAt(i);
  return difference === 0;
}
async function objectBytes(storage, key, offset, length) {
  const object = await storage.get(key, { range:{ offset, length } });
  if (!object) throw new Error("Object not found");
  return new Uint8Array(await new Response(object.body).arrayBuffer());
}
function safeArchiveName(name) {
  const normalized = String(name || "").replace(/\\\\/g, "/").replace(/^\\.\\//, "");
  const directory = normalized.endsWith("/");
  const parts = normalized.split("/");
  if (directory) parts.pop();
  if (!normalized || normalized.startsWith("/") || /^[a-z]:\\//i.test(normalized) || !parts.length || parts.some(part => !part || part === "." || part === ".." || part.includes("\\0"))) throw new Error("Archive contains an unsafe path");
  if (parts.length > 64) throw new Error("Archive path is too deep");
  return normalized;
}
async function archiveEntries(storage, key) {
  if (!/\\.(zip|cbz)$/i.test(key)) throw new Error("Only ZIP and CBZ archives are supported");
  const head = await storage.head(key);
  if (!head || head.size < 22) throw new Error("Malformed ZIP archive");
  const tailLength = Math.min(head.size, 65557);
  const tailOffset = head.size - tailLength;
  const tail = await objectBytes(storage, key, tailOffset, tailLength);
  const view = new DataView(tail.buffer, tail.byteOffset, tail.byteLength);
  let eocd = -1;
  for (let i = tail.length - 22; i >= 0; i--) if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("Malformed ZIP archive: central directory was not found");
  const count = view.getUint16(eocd + 10, true), indexSize = view.getUint32(eocd + 12, true), indexOffset = view.getUint32(eocd + 16, true);
  if (count > 10000 || indexSize > ARCHIVE_MAX_INDEX || indexOffset + indexSize > head.size) throw new Error("Archive index exceeds safe limits");
  const index = await objectBytes(storage, key, indexOffset, indexSize);
  const central = new DataView(index.buffer, index.byteOffset, index.byteLength);
  const entries = [];
  let cursor = 0;
  for (let i = 0; i < count; i++) {
    if (cursor + 46 > index.length || central.getUint32(cursor, true) !== 0x02014b50) throw new Error("Malformed ZIP central directory");
    const flags = central.getUint16(cursor + 8, true), method = central.getUint16(cursor + 10, true);
    const compressedSize = central.getUint32(cursor + 20, true), size = central.getUint32(cursor + 24, true);
    const nameLength = central.getUint16(cursor + 28, true), extraLength = central.getUint16(cursor + 30, true), commentLength = central.getUint16(cursor + 32, true);
    const name = safeArchiveName(readUtf8.decode(index.slice(cursor + 46, cursor + 46 + nameLength)));
    if (flags & 1) throw new Error("Encrypted archives are not supported");
    if (![0, 8].includes(method)) throw new Error("Archive uses an unsupported compression method");
    if (size > ARCHIVE_MAX_ENTRY || (compressedSize && size / compressedSize > 200)) throw new Error("Archive entry exceeds safe expansion limits");
    entries.push({ name, size, compressedSize, method, directory:name.endsWith("/"), offset:central.getUint32(cursor + 42, true) });
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
async function archiveEntryBytes(storage, key, requested) {
  const entry = (await archiveEntries(storage, key)).find(item => item.name === requested);
  if (!entry || entry.directory) throw new Error("Archive entry was not found");
  const local = await objectBytes(storage, key, entry.offset, 30);
  const header = new DataView(local.buffer, local.byteOffset, local.byteLength);
  if (header.getUint32(0, true) !== 0x04034b50) throw new Error("Malformed ZIP entry");
  const dataOffset = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
  const compressed = await objectBytes(storage, key, dataOffset, entry.compressedSize);
  if (entry.method === 0) return compressed;
  const output = new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
  if (output.byteLength !== entry.size || output.byteLength > ARCHIVE_MAX_ENTRY) throw new Error("Archive entry failed safe decompression checks");
  return output;
}
export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const assetPrefix = "/assets/";

    if ((request.method === "GET" || request.method === "HEAD") && requestUrl.pathname.startsWith(assetPrefix)) {
      if (String(env.PUBLIC_ASSETS_ENABLED || "false") !== "true") {
        return new Response("Public asset delivery is not enabled", { status: 404 });
      }
      const rawKey = requestUrl.pathname.slice(assetPrefix.length);
      let key = "";
      try {
        key = decodeURIComponent(rawKey);
      } catch {
        return new Response("Invalid asset path", { status: 400 });
      }
      if (!key || key.split("/").some(part=>part==="."||part==="..")) return new Response("Invalid asset path", { status: 400 });

      const head = await env.STORAGE.head(key);
      if (!head) {
        return new Response("Not found", {
          status: 404,
          headers: { "access-control-allow-origin": "*" }
        });
      }

      const baseHeaders = new Headers();
      head.writeHttpMetadata(baseHeaders);
      baseHeaders.set("etag", head.httpEtag);
      baseHeaders.set("accept-ranges", "bytes");
      baseHeaders.set("access-control-allow-origin", "*");
      baseHeaders.set("access-control-expose-headers", "ETag, Content-Length, Content-Type, Accept-Ranges, Content-Range");
      baseHeaders.set("cache-control", baseHeaders.get("cache-control") || "public, max-age=31536000, immutable");

      if (request.method === "HEAD") {
        baseHeaders.set("content-length", String(head.size));
        return new Response(null, { status: 200, headers: baseHeaders });
      }

      const rangeHeader = request.headers.get("range");
      if (rangeHeader && rangeHeader.startsWith("bytes=")) {
        const firstRange = rangeHeader.slice(6).split(",")[0];
        const parts = firstRange.split("-");
        let start = parts[0] ? Number(parts[0]) : NaN;
        let end = parts[1] ? Number(parts[1]) : NaN;

        if (!Number.isFinite(start) && Number.isFinite(end)) {
          const suffixLength = Math.max(0, Math.floor(end));
          start = Math.max(0, head.size - suffixLength);
          end = head.size - 1;
        } else {
          start = Math.max(0, Math.floor(start));
          end = Number.isFinite(end) ? Math.min(head.size - 1, Math.floor(end)) : head.size - 1;
        }

        if (!Number.isFinite(start) || start >= head.size || end < start) {
          baseHeaders.set("content-range", \`bytes */\${head.size}\`);
          return new Response(null, { status: 416, headers: baseHeaders });
        }

        const length = end - start + 1;
        const object = await env.STORAGE.get(key, { range: { offset: start, length } });
        if (!object) return new Response("Not found", { status: 404, headers: baseHeaders });
        const headers = new Headers(baseHeaders);
        object.writeHttpMetadata(headers);
        headers.set("content-range", \`bytes \${start}-\${end}/\${head.size}\`);
        headers.set("content-length", String(length));
        return new Response(object.body, { status: 206, headers });
      }

      const object = await env.STORAGE.get(key);
      if (!object) return new Response("Not found", { status: 404, headers: baseHeaders });
      const headers = new Headers(baseHeaders);
      object.writeHttpMetadata(headers);
      headers.set("content-length", String(head.size));
      return new Response(object.body, { status: 200, headers });
    }

    if (request.method === "OPTIONS" && requestUrl.pathname.startsWith(assetPrefix)) {
      return new Response(null, {
        status: 204,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-methods": "GET, HEAD, OPTIONS",
          "access-control-allow-headers": "*",
          "access-control-max-age": "86400"
        }
      });
    }

    const auth = request.headers.get("authorization") || "";
    const authorized = Boolean(REDOWN_SHARED_SECRET) && auth === \`Bearer \${REDOWN_SHARED_SECRET}\`;
    let diagnostic=null;try{diagnostic=await explorerWire(request,env,authorized);}catch{}
    if (request.method === "GET" && requestUrl.pathname === "/private/archive-entry") {
      let key, entry;
      try { key = exactObjectKey(requestUrl.searchParams.get("key") || ""); entry = safeArchiveName(requestUrl.searchParams.get("entry") || ""); }
      catch (error) { return Response.json({ ok:false, error:error.message }, { status:400 }); }
      if (!authorized && !(await validSignedRead(requestUrl, key + "\\narchive:" + entry))) return Response.json({ ok:false, error:"Unauthorized" }, { status:401 });
      const bytes = await archiveEntryBytes(env.STORAGE, key, entry);
      return new Response(bytes, { headers:{ "content-type":requestUrl.searchParams.get("type") || "application/octet-stream", "content-length":String(bytes.byteLength), "cache-control":"private, no-store" } });
    }
    if ((request.method === "GET" || request.method === "HEAD") && (requestUrl.pathname === "/object" || requestUrl.pathname === "/private/object")) {
      let key;
      try { key = exactObjectKey(requestUrl.searchParams.get("key") || ""); } catch (error) { return Response.json({ ok:false, error:error.message }, { status:400 }); }
      const signed = requestUrl.pathname === "/private/object" && await validSignedRead(requestUrl, key);
      if (!authorized && !signed) return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
      await diagnostic?.identity(key,"source","query");
      const head = key && await env.STORAGE.head(key);
      if (!head){diagnostic?.event("source.read","failed",{status:404,code:"EXPLORER_SOURCE_NOT_FOUND"});return diagnostic?diagnostic.json({ok:false,error:"Object not found",code:"EXPLORER_SOURCE_NOT_FOUND",stage:"source.read"},{status:404,headers:diagnostic.headers()}):Response.json({ok:false,error:"Object not found"},{status:404});}
      diagnostic?.event("source.read","confirmed",{size:head.size});
      const headers = new Headers();
      head.writeHttpMetadata(headers);
      headers.set("accept-ranges", "bytes");
      headers.set("cache-control", "private, no-store");
      headers.set("x-redown-metadata", encodeURIComponent(JSON.stringify(head.customMetadata || {})));
      headers.set("x-redown-http-metadata", encodeURIComponent(JSON.stringify(head.httpMetadata || {})));
      if(diagnostic)for(const [name,value] of Object.entries(diagnostic.headers()))headers.set(name,value);
      headers.set("x-redown-etag", head.etag);
      headers.set("x-redown-version",head.version);
      if(checksumHex(head))headers.set("x-redown-md5",checksumHex(head));
      if (request.method === "HEAD") { headers.set("content-length", String(head.size)); return new Response(null, { status:200, headers }); }
      const match = request.headers.get("range")?.match(/^bytes=(\\d*)-(\\d*)$/);
      let offset = 0, length = head.size, status = 200;
      if (match) {
        const requestedStart = match[1] ? Number(match[1]) : Math.max(0, head.size - Number(match[2] || 0));
        const requestedEnd = match[1] ? (match[2] ? Number(match[2]) : head.size - 1) : head.size - 1;
        if (!Number.isSafeInteger(requestedStart) || requestedStart < 0 || requestedStart >= head.size || requestedEnd < requestedStart) return new Response(null, { status:416, headers:{ "content-range":\`bytes */\${head.size}\` } });
        offset = requestedStart; length = Math.min(head.size - 1, requestedEnd) - offset + 1; status = 206;
        headers.set("content-range", \`bytes \${offset}-\${offset + length - 1}/\${head.size}\`);
      }
      const object = await env.STORAGE.get(key, {onlyIf:{etagMatches:head.etag},...(match&&head.size?{range:{offset,length}}:{})});
      if(!object?.body||head.version&&object.version!==head.version)return Response.json({ok:false,error:"Object changed while reading. Refresh and retry."},{status:409});
      headers.set("content-length", String(length));
      return new Response(object.body, { status, headers });
    }
    if (request.method === "GET") return Response.json({ ok:true, service:"REDOWN", secretConfigured:Boolean(REDOWN_SHARED_SECRET), storageBound:Boolean(env.STORAGE), workerVersion:6, diagnosticProtocol:1, safeTransfers:true });
    if (request.method !== "POST") return Response.json({ ok:false, error:"Method not allowed" }, { status:405 });
    if (!authorized) return Response.json({ ok:false, error:"Unauthorized" }, { status:401 });
    try {
      if (request.headers.get("x-redown-action") === "upload-local") {
        const rawFilename = request.headers.get("x-redown-filename") || "upload";
        let requestedFilename = rawFilename;
        try { requestedFilename = decodeURIComponent(rawFilename); } catch {}
        requestedFilename = cleanName(requestedFilename);

        const prefix = cleanPrefix(request.headers.get("x-redown-folder") || "");
        const contentType = request.headers.get("content-type") || "application/octet-stream";
        const requested = filenameWithInferredExtension(requestedFilename, contentType);
        const key = await uniqueKey(env.STORAGE, prefix ? prefix + "/" + requested : requested, 1, true);
        const filename = key.split("/").pop();
        const encodedKey = key.split("/").map(encodeURIComponent).join("/");
        const publicPath = \`/assets/\${encodedKey}\`;
        const publicBaseUrl = safePublicBase(request.headers.get("x-redown-public-base"), requestUrl);
        const publicUrl = \`\${publicBaseUrl}/\${encodedKey}\`;

        const length = Number(request.headers.get("content-length") || 0);
        const max = Number(env.MAX_BYTES || 314572800);
        if (length && length > max) {
          return Response.json({ ok: false, error: "Local file is larger than this REDOWN profile allows" }, { status: 413 });
        }
        if (!request.body) throw new Error("Local upload body is empty");

        const metadata = {
          httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
          customMetadata: {
            sourceType: "local-upload",
            originalFilename: requestedFilename,
            publicPath,
            publicUrl,
            importedBy: "REDOWN",
            importedAt: new Date().toISOString()
          }
        };

        let bytesWritten = 0;
        if (length > 0) {
          const fixed = new FixedLengthStream(length);
          let count = 0;
          const limiter = new TransformStream({
            transform(chunk, controller) {
              count += chunk.byteLength || 0;
              if (count > max) throw new Error("Local file exceeded size limit");
              controller.enqueue(chunk);
            }
          });
          const pipePromise = request.body.pipeThrough(limiter).pipeTo(fixed.writable);
          const putPromise = putNewDownload(env.STORAGE, key, fixed.readable, metadata);
          await Promise.all([pipePromise, putPromise]);
          bytesWritten = count || length;
        } else {
          const bytes = new Uint8Array(await request.arrayBuffer());
          if (bytes.byteLength > max) throw new Error("Local file exceeded size limit");
          await putNewDownload(env.STORAGE, key, bytes, metadata);
          bytesWritten = bytes.byteLength;
        }

        return Response.json({
          ok: true,
          key,
          filename,
          publicPath,
          publicUrl,
          bytes: bytesWritten,
          contentType
        });
      }

      const body = await request.json();

      if (body.action === "headObject") {
        const key = exactObjectKey(body.key);
        const head = key && await env.STORAGE.head(key);
        if (!head) return Response.json({ ok:false, error:"Object not found" }, { status:404 });
        return Response.json({ ok:true, object:{ key, size:head.size, etag:head.etag, httpEtag:head.httpEtag, uploaded:head.uploaded, httpMetadata:head.httpMetadata, customMetadata:head.customMetadata } });
      }
      if (body.action === "createReadUrl") {
        const key = exactObjectKey(body.key);
        if (!key || !(await env.STORAGE.head(key))) return Response.json({ ok:false, error:"Object not found" }, { status:404 });
        return Response.json({ ok:true, url:await signedReadUrl(requestUrl, key, body.ttl), expiresIn:Math.max(30, Math.min(3600, Number(body.ttl) || 900)) });
      }
      if (body.action === "listArchive") {
        const key = exactObjectKey(body.key);
        return Response.json({ ok:true, archive:{ key, type:/\\.cbz$/i.test(key)?"cbz":"zip", entries:await archiveEntries(env.STORAGE, key) } });
      }
      if (body.action === "createArchiveEntryReadUrl") {
        const key = exactObjectKey(body.key), entry = safeArchiveName(body.entry);
        const canonical = key + "\\narchive:" + entry, expires = Math.floor(Date.now() / 1000) + 900;
        const signature = await readSignature(canonical, expires);
        const url = requestUrl.origin + "/private/archive-entry?key=" + encodeURIComponent(key) + "&entry=" + encodeURIComponent(entry) + "&type=" + encodeURIComponent(body.contentType || "application/octet-stream") + "&expires=" + expires + "&signature=" + signature;
        return Response.json({ ok:true, url, expiresIn:900 });
      }
      if (body.action === "extractArchiveEntries") {
        const key = exactObjectKey(body.key), prefix = exactFolder(body.destinationPrefix || "");
        const requested = Array.from(new Set(body.entries || [])).slice(0, 1000);
        const results = [];
        for (const rawName of requested) {
          try {
            const name = safeArchiveName(rawName), bytes = await archiveEntryBytes(env.STORAGE, key, name);
            const destinationKey = exactObjectKey((prefix ? prefix + "/" : "") + name);
            await verifiedObjectPut(env.STORAGE,destinationKey,bytes,{onlyIf:new Headers({"If-None-Match":"*"}),customMetadata:{extractedFrom:key,extractedAt:new Date().toISOString()}},bytes.byteLength);
            results.push({ name, destinationKey, status:"extracted" });
          } catch (error) { results.push({ name:String(rawName), status:"failed", error:error.message || String(error) }); }
        }
        return Response.json({ ok:true, results });
      }
      if (body.action === "receiveArchiveEntries") {
        const sourceWorkerUrl=String(body.sourceWorkerUrl || "").replace(/\\/+$/, ""), sourceToken=String(body.sourceToken || ""), sourceKey=exactObjectKey(body.sourceKey), prefix=exactFolder(body.destinationPrefix || "");
        if (!/^https:\\/\\/[^/]+$/.test(sourceWorkerUrl) || !sourceToken) throw new Error("Source bucket is not ready");
        const results=[];
        for (const rawName of Array.from(new Set(body.entries || [])).slice(0, 1000)) {
          try {
            const name=safeArchiveName(rawName), destinationKey=exactObjectKey((prefix ? prefix + "/" : "") + name);
            const response=await fetch(sourceWorkerUrl + "/private/archive-entry?key=" + encodeURIComponent(sourceKey) + "&entry=" + encodeURIComponent(name), { headers:{ authorization:"Bearer " + sourceToken } });
            if (!response.ok || !response.body) throw new Error("Archive entry was not available");
            if(!response.headers.has("content-length"))throw new Error("Archive entry length unavailable; nothing written");
            await verifiedObjectPut(env.STORAGE,destinationKey,response.body,{onlyIf:new Headers({"If-None-Match":"*"}),httpMetadata:{contentType:response.headers.get("content-type")||"application/octet-stream"},customMetadata:{extractedFrom:sourceKey,extractedAt:new Date().toISOString()}},Number(response.headers.get("content-length")));
            results.push({ name,destinationKey,status:"extracted" });
          } catch (error) { results.push({ name:String(rawName),status:"failed",error:error.message || String(error) }); }
        }
        return Response.json({ ok:true,results });
      }
      if (body.action === "deleteKeys") {
        const keys = Array.from(new Set((body.keys || []).map(exactObjectKey)));
        if (!keys.length||keys.length>100) throw new Error("Choose between 1 and 100 objects");
        for(const key of keys){
          const expected=body.expected?.find(item=>item.key===key);
          const head=await env.STORAGE.head(key);
          if(expected&&(!head||head.etag!==expected.etag||head.size!==expected.size||expected.version&&head.version!==expected.version))throw new Error("Source changed since copy. Original preserved; refresh before retrying.");
          if(expected){
            let destination;
            if(body.sameBucket)destination=await env.STORAGE.head(exactObjectKey(expected.destinationKey));
            else{
              const base=String(body.destinationWorkerUrl||"").replace(/\\/+$/,"");
              if(!/^https:\\/\\/[^/]+$/.test(base)||!body.destinationToken)throw new Error("Destination verification unavailable; source preserved.");
              const response=await fetch(base+"/object?key="+encodeURIComponent(expected.destinationKey),{method:"HEAD",headers:{authorization:"Bearer "+body.destinationToken},signal:AbortSignal.timeout(25000)});
              if(response.ok)destination={etag:response.headers.get("x-redown-etag"),size:Number(response.headers.get("content-length")),version:response.headers.get("x-redown-version")};
            }
            if(!destination||destination.etag!==expected.destinationEtag||destination.size!==expected.size||expected.destinationVersion&&destination.version!==expected.destinationVersion)throw new Error("Destination changed since copy. Original preserved; refresh before retrying.");
          }
        }
        diagnostic?.event("source.cleanup","started");
        await env.STORAGE.delete(keys);
        for(const key of keys)if(await env.STORAGE.head(key))throw new Error("Deletion could not be confirmed. Refresh before retrying.");
        diagnostic?.event("source.cleanup","confirmed");
        return diagnostic?diagnostic.json({ok:true,deleted:keys}):Response.json({ok:true,deleted:keys});
      }
      if (body.action === "capabilities") return Response.json({ok:true,workerVersion:6,diagnosticProtocol:1,readOnlyProbe:true,exactIngestPaths:true,safeTransfers:true,createOnlyFolders:true,storageBound:Boolean(env.STORAGE)});
      if (body.action === "probeSource") {
        const base=new URL(String(body.sourceWorkerUrl||""));
        if(base.protocol!=="https:"||base.username||base.password||base.pathname!=="/"||base.search||base.hash||!base.hostname.endsWith(".workers.dev")||!body.sourceToken)throw new Error("Choose a configured workers.dev source");
        const key=exactObjectKey(body.key);
        await diagnostic?.identity(key);
        const response=await fetch(base.origin+"/object?key="+encodeURIComponent(key),{method:"HEAD",redirect:"manual",headers:{authorization:"Bearer "+body.sourceToken,...(diagnostic?{"x-redown-diagnostic":JSON.stringify({...diagnostic.context,expectedBinding:diagnostic.context.sourceBinding,expectedOrigin:await diagnostic.fingerprint("origin",base.origin)})}:{})},signal:AbortSignal.timeout(10000)});
        diagnostic?.merge(response);
        diagnostic?.event("source.read",response.ok?"confirmed":"failed",{status:response.status,mechanism:"worker",method:"HEAD",endpoint:"worker.object"});
        await response.body?.cancel();
        const result={ok:true,readOnly:true,status:response.status};
        return diagnostic?diagnostic.json(result):Response.json(result);
      }
      if (body.action === "transferBatch") {
        if(!Array.isArray(body.entries)||!body.entries.length||body.entries.length>25)throw new Error("Choose between 1 and 25 transfer entries");
        const sourceWorkerUrl=String(body.sourceWorkerUrl||"").replace(/\\/+$/,"");
        const conflict=["replace","keep","skip"].includes(body.conflict)?body.conflict:"skip";
        const results=[];
        for(const entry of body.entries){
          try{results.push(await copyVerifiedObject(env.STORAGE,entry,sourceWorkerUrl,String(body.sourceToken||""),conflict,diagnostic));}
          catch(error){diagnostic?.event(error.stage||"destination.write","failed",{status:error.status,code:error.code});results.push({sourceKey:entry.sourceKey,destinationKey:entry.destinationKey,status:error.conflict?"conflict":"failed",error:error.message||String(error),code:error.code,httpStatus:error.status,stage:error.stage,component:"worker"});}
        }
        return diagnostic?diagnostic.json({ok:true,results}):Response.json({ok:true,results});
      }

      if (body.action === "renameObject") {
        const oldKey=exactObjectKey(body.oldKey);
        const newFilename=String(body.newFilename||"");
        if(!newFilename||/[\\/\\0]/.test(newFilename)||newFilename==="."||newFilename==="..")throw new Error("Enter a valid filename without slashes");
        const newKey=oldKey.slice(0,oldKey.lastIndexOf("/")+1)+newFilename;
        if(oldKey===newKey)return Response.json({ok:true,key:oldKey,filename:newFilename});
        const result=await copyVerifiedObject(env.STORAGE,{sourceKey:oldKey,destinationKey:newKey,sameBucket:true},"","","skip");
        if(result.status!=="copied")return Response.json({ok:false,error:"A file with that name already exists"},{status:409});
        const source=await env.STORAGE.head(oldKey);
        if(!source||source.etag!==result.sourceEtag||source.size!==result.size||result.sourceVersion&&source.version!==result.sourceVersion)throw new Error("Source changed during rename. Both objects retained; refresh before retrying.");
        await env.STORAGE.delete(oldKey);
        if(await env.STORAGE.head(oldKey))throw new Error("Renamed copy verified, but source deletion is unconfirmed. Refresh before retrying.");
        const encodedKey=newKey.split("/").map(encodeURIComponent).join("/");
        const publicPath="/assets/"+encodedKey,publicUrl=safePublicBase(body.publicBaseUrl,requestUrl)+"/"+encodedKey;
        return Response.json({ok:true,key:newKey,filename:newFilename,publicPath,publicUrl});
      }

      if (body.action === "ensurePrefixes") {
        const requested = Array.isArray(body.prefixes) ? body.prefixes : [];
        const created = [];
        for (const value of requested) {
          const prefix = exactFolder(value);
          if (!prefix) continue;
          const key = \`\${prefix}/.redown\`;
          const marker=await env.STORAGE.put(key, "", {
            onlyIf:new Headers({"If-None-Match":"*"}),
            httpMetadata: { contentType: "text/plain; charset=utf-8", cacheControl: "no-store" },
            customMetadata: { redownMarker: "true", createdAt: new Date().toISOString() }
          });
          if(!marker&&body.createOnly===true)throw new Error("That folder already exists. Choose an unused name.");
          if(!marker&&!(await env.STORAGE.head(key)))throw new Error("Folder creation could not be confirmed");
          created.push(key);
        }
        return Response.json({ ok: true, created });
      }

      const sourceUrl = String(body.sourceUrl || "");
      const source = new URL(sourceUrl);
      const requestedFilename = cleanName(body.filename || source.pathname);
      const prefix = body.exactFolder===true ? (body.folder===""?"":exactObjectKey(body.folder)) : cleanPrefix(body.folder);
      if(prefix.split("/").some(part=>part==="."||part===".."))throw new Error("Invalid object path");

      const remote = await checkedFetch(sourceUrl);
      if (!remote.ok || !remote.body) throw new Error(\`Remote fetch failed: \${remote.status}\`);

      const length = Number(remote.headers.get("content-length") || 0);
      const max = Number(env.MAX_BYTES || 314572800);
      if (length && length > max) {
        return Response.json({ ok: false, error: "Remote file is larger than this REDOWN profile allows" }, { status: 413 });
      }

      const contentType = remote.headers.get("content-type") || "application/octet-stream";
      const requested = filenameWithInferredExtension(requestedFilename, contentType);
      const key = await uniqueKey(env.STORAGE, prefix ? prefix + "/" + requested : requested, 1, true);
      const filename = key.split("/").pop();
      const encodedKey = key.split("/").map(encodeURIComponent).join("/");
      const publicPath = \`/assets/\${encodedKey}\`;
      const publicBaseUrl = safePublicBase(body.publicBaseUrl, requestUrl);
      const publicUrl = \`\${publicBaseUrl}/\${encodedKey}\`;

      const metadata = {
        httpMetadata: { contentType, cacheControl: "public, max-age=31536000, immutable" },
        customMetadata: {
          sourceUrl,
          publicPath,
          publicUrl,
          importedBy: "REDOWN",
          importedAt: new Date().toISOString()
        }
      };
      let bytesWritten = 0;

      if (length > 0) {
        // R2 requires streamed request bodies to have a known length.
        const fixed = new FixedLengthStream(length);
        let count = 0;
        const limiter = new TransformStream({
          transform(chunk, controller) {
            count += chunk.byteLength || 0;
            if (count > max) throw new Error("Remote file exceeded size limit");
            controller.enqueue(chunk);
          }
        });

        const pipePromise = remote.body.pipeThrough(limiter).pipeTo(fixed.writable);
        const putPromise = putNewDownload(env.STORAGE, key, fixed.readable, metadata);
        await Promise.all([pipePromise, putPromise]);
        bytesWritten = count || length;
      } else {
        // Some CDNs (including signed image URLs) omit Content-Length.
        // Buffer those responses so R2 receives a body with a definite size.
        const chunks = [];
        let count = 0;
        const reader = remote.body.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          count += value.byteLength || 0;
          if (count > max) throw new Error("Remote file exceeded size limit");
          chunks.push(value);
        }

        const combined = new Uint8Array(count);
        let offset = 0;
        for (const chunk of chunks) {
          combined.set(chunk, offset);
          offset += chunk.byteLength;
        }

        await putNewDownload(env.STORAGE, key, combined, metadata);
        bytesWritten = count;
      }

      return Response.json({ ok: true, key, filename, publicPath, publicUrl, bytes: bytesWritten, contentType });
    } catch (error) {
      diagnostic?.event(error.stage||"worker.response","failed",{code:error.code,status:error.status});
      const payload={ok:false,error:error?.message||"Ingest failed",code:error.code,stage:error.stage};
      return diagnostic?diagnostic.json(payload,{status:error.status||400}):Response.json(payload,{status:error.status||400});
    }
  }
};
`;

function bytesToBase64Url(bytes) {
  let raw = "";
  for (const b of bytes) raw += String.fromCharCode(b);
  return btoa(raw).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function randomString(bytes = 32) {
  const array = crypto.getRandomValues(new Uint8Array(bytes));
  return bytesToBase64Url(array);
}
async function sha256Base64Url(value) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}
function selectedUrl(info) {
  // For images/video/audio Chrome supplies srcUrl; prefer the actual media bytes
  // even when the media is wrapped in a hyperlink.
  return info.srcUrl || info.linkUrl || info.pageUrl || "";
}
function categoryForContext(info, sourceUrl, profile) {
  if (info?.mediaType === "video") return "videos";
  if (info?.mediaType === "image") return "2d";
  if (info?.mediaType === "audio") return "files";
  const ext = basenameFromUrl(sourceUrl).toLowerCase().split(".").pop();
  if (["mp4","webm","mov","m4v","avi","mkv"].includes(ext)) return "videos";
  if (["jpg","jpeg","png","gif","webp","bmp","avif","svg"].includes(ext)) return "2d";
  if (["glb","gltf"].includes(ext)) return "3d";
  return profile?.defaultCategory || "files";
}
function basenameFromUrl(raw) {
  try {
    const u = new URL(raw);
    const base = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() || "download");
    return base.replace(/[^a-zA-Z0-9._ -]/g, "-") || "download";
  } catch { return "download"; }
}
function joinPath(...parts) {
  return parts.filter(Boolean).map((part, i) =>
    String(part).replace(i === 0 ? /\/+$/g : /^\/+|\/+$/g, "")
  ).filter(Boolean).join("/");
}
function safeSlug(value, max = 45) {
  return String(value || "assets").toLowerCase().replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, max) || "assets";
}
async function getProfiles() {
  const { profiles = [] } = await chrome.storage.local.get("profiles");
  return Array.isArray(profiles) ? profiles : [];
}
async function setProfiles(profiles) {
  await chrome.storage.local.set({ profiles });
}
// Toolbar feedback is cosmetic and independent of desktop notification preferences.
function createToolbarFeedback(api, loadPixels = async size => {
  const response = await fetch(chrome.runtime.getURL(`icons/icon${size}.png`));
  const bitmap = await createImageBitmap(await response.blob());
  try {
    const canvas = new OffscreenCanvas(size,size), context = canvas.getContext("2d");
    context.drawImage(bitmap,0,0,size,size);
    return context.getImageData(0,0,size,size);
  } finally { bitmap.close(); }
}, pause = ms => new Promise(resolve=>setTimeout(resolve,ms))) {
  let generation=0, pixelsPromise;
  const sizes=[16,32,48], colors={success:[45,205,144],failure:[239,82,107]};
  const originalPaths=Object.fromEntries(sizes.map(size=>[size,`icons/icon${size}.png`]));
  return async state => {
    if(!api?.setIcon || !colors[state])return;
    const ticket=++generation;
    try {
      pixelsPromise ||= Promise.all(sizes.map(async size=>[size,await loadPixels(size)])).then(Object.fromEntries).catch(error=>{pixelsPromise=null;throw error;});
      const original=await pixelsPromise;
      if(ticket!==generation)return;
      const color=colors[state], images={};
      for(const size of sizes){
        const base=original[size].data, data=new Uint8ClampedArray(base);
        for(let i=0;i<data.length;i+=4){
          const light=(base[i]*0.2126+base[i+1]*0.7152+base[i+2]*0.0722)/255;
          for(let c=0;c<3;c++)data[i+c]=Math.round(color[c]*(0.65+0.35*light));
        }
        images[size]=new ImageData(data,size,size);
      }
      await api.setTitle?.({title:state==="success"?"REDOWN · Transfer complete":"REDOWN · Transfer failed — check Dashboard"});
      // A short, two-hit palette flash, like a sprite effect, then exact original art.
      for(const [tinted,hold] of [[true,120],[false,160],[true,120]]){
        if(ticket!==generation)return;
        await api.setIcon(tinted?{imageData:images}:{path:originalPaths});
        if(ticket!==generation)return;
        await pause(hold);
      }
      // The last hit leaves a tint that gently dissolves into the original palette.
      for(let frame=1;frame<=10;frame++){
        if(ticket!==generation)return;
        const strength=Math.pow(1-frame/10,2), faded={};
        for(const size of sizes){
          const base=original[size].data, tint=images[size].data, data=new Uint8ClampedArray(base);
          for(let i=0;i<data.length;i+=4)for(let c=0;c<3;c++)data[i+c]=Math.round(base[i+c]+(tint[i+c]-base[i+c])*strength);
          faded[size]=new ImageData(data,size,size);
        }
        await api.setIcon({imageData:faded});
        if(ticket!==generation)return;
        await pause(60);
      }
    } catch { /* Toolbar rendering must never change transfer results. */ }
    finally {
      if(ticket===generation){
        try { await api.setIcon({path:originalPaths}); } catch {}
        if(ticket===generation)try { await api.setTitle?.({title:"REDOWN"}); } catch {}
      }
    }
  };
}

const toolbarFeedback=createToolbarFeedback(chrome.action);
async function recordTransfer(entry) {
  if(entry?.ok===false)void toolbarFeedback("failure");
  else if(entry?.ok===true&&typeof entry.location==="string"&&/^(https?:\/\/|R2: )/.test(entry.location))void toolbarFeedback("success");
  return transferCounter.record(entry);
}
async function notify(title, message) {
  try {
    const { notificationsEnabled } = await chrome.storage.local.get("notificationsEnabled");
    if (notificationsEnabled !== true) return;
    await chrome.notifications.create({
      type: "basic", iconUrl: "icons/icon128.png", title, message: String(message || "")
    });
  } catch (error) {
    // Notifications are cosmetic. A Chrome image/icon failure must never mark
    // an already-completed REDOWN transfer as failed.
    console.warn("REDOWN notification skipped:", error?.message || String(error));
  }
}
function cloudflareErrorMessage(body, fallback) {
  return body?.errors?.[0]?.message || body?.error_description || body?.error || fallback;
}
async function cfFetch(path, options = {}) {
  return RedownCloudflareApi.request(path, options);
}
async function cfJson(path, options = {}) {
  const res = await cfFetch(path, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.success === false) {
    throw new Error(body?.errors?.[0]?.message || body?.error || `Cloudflare request failed (${res.status})`);
  }
  return body.result ?? body;
}
importScripts("transfer-counter.js");
const transferCounter=RedownTransferCounter.create(chrome.storage.local,navigator.locks);
importScripts("cloudflare-auth.js");
importScripts("cloudflare-api.js");
importScripts("nested-locations.js");
importScripts("rfis-index.js");
importScripts("runtime-diagnostics.js");
importScripts("explorer-diagnostics.js");
importScripts("explorer-diagnostics-bridge.js");
try{globalThis.redownExplorerBridge=RedownExplorerBridge.install({context:"background",chrome});}catch{}
importScripts("search-session.js");
const runtimeDiagnostics = RedownRuntimeDiagnostics.create({build:chrome.runtime.getManifest().version});
globalThis.redownRuntimeObserver=runtimeDiagnostics;
chrome.storage.local.get("debugModeEnabled").then(value=>runtimeDiagnostics.setEnabled(value.debugModeEnabled)).catch(()=>{});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&changes.debugModeEnabled)runtimeDiagnostics.setEnabled(changes.debugModeEnabled.newValue);
  if(area==="local"&&changes.cloudflareAuth&&changes.cloudflareAuth.oldValue?.sessionId!==changes.cloudflareAuth.newValue?.sessionId)searchSessions.cancelAll();
});
const searchSessions = RedownSearchSessions.create({listPage:listObjectsPage,score:explorerSearchScore});

async function connectCloudflare() { return RedownCloudflareAuth.connect(); }
async function disconnectCloudflare() {
  return navigator.locks.request("redown-cloudflare-token",async()=>{
  const { cloudflareAuth } = await chrome.storage.local.get("cloudflareAuth");
  if (cloudflareAuth?.accessToken) {
    try {
      await RedownCloudflareApi.boundedFetch("https://dash.cloudflare.com/oauth2/revoke", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ token: cloudflareAuth.accessToken, client_id: CF_CLIENT_ID })
      });
    } catch {}
  }
  await chrome.storage.local.remove("cloudflareAuth");
  });
}
async function listCloudflareAccounts() {
  const accounts = [];
  for (let page = 1; page <= 20; page++) {
    const res = await cfFetch(`/accounts?per_page=50&page=${page}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) throw new Error(cloudflareErrorMessage(body, `Could not load Cloudflare accounts (${res.status})`));
    if(!Array.isArray(body.result))throw new Error("Cloudflare returned an unreadable account list. Retry Refresh.");
    const batch = body.result;
    accounts.push(...batch.map(x => ({ id:x.id, name:x.name })));
    const totalPages = Number(body?.result_info?.total_pages || 0);
    if (!batch.length || batch.length < 50 || (totalPages && page >= totalPages)) break;
  }
  return accounts;
}
async function listBuckets(accountId) {
  const buckets = [];
  let cursor = "";
  for (let page = 0; page < 100; page++) {
    const params = new URLSearchParams({ per_page:"100" });
    if (cursor) params.set("cursor", cursor);
    const res = await cfFetch(`/accounts/${accountId}/r2/buckets?${params}`);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) throw new Error(cloudflareErrorMessage(body, `Could not load R2 buckets (${res.status})`));
    const result = body.result || {};
    if(!Array.isArray(result)&&!Array.isArray(result.buckets))throw new Error("Cloudflare returned an unreadable bucket list. Retry Refresh.");
    const batch = Array.isArray(result?.buckets) ? result.buckets : (Array.isArray(result) ? result : []);
    buckets.push(...batch.map(x => ({ name:x.name, location:x.location, jurisdiction:x.jurisdiction })));
    const next = result?.cursor || body?.result_info?.cursor || "";
    if (!next || next === cursor) break;
    cursor = next;
  }
  return buckets;
}
async function createBucket(accountId, name, locationHint = "") {
  const clean = String(name || "").toLowerCase().trim();
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(clean)) {
    throw new Error("Bucket names must be 3–63 lowercase letters, numbers, or hyphens");
  }
  const payload = { name: clean };
  if (locationHint) payload.locationHint = locationHint;
  return cfJson(`/accounts/${accountId}/r2/buckets`, {
    method: "POST", body: JSON.stringify(payload)
  });
}
// Explicit first-run setup. Cloudflare R2 requires lowercase bucket names.
// Reuse an existing `redown` bucket; never retry an uncertain create blindly.
async function setupRedownQuickDestination(accountId,menuLabel='Cloudflare'){
  if(typeof accountId!=="string"||!accountId)throw Error("Choose a Cloudflare account first.");
  const label=String(menuLabel||'').trim();
  if(!label||label.length>60||/[\\u0000-\\u001f]/.test(label))throw Error('Enter a menu label (1–60 characters).');
  const accounts=await listCloudflareAccounts();
  const account=accounts.find(item=>item.id===accountId);
  if(!account)throw Error("This Cloudflare account is no longer available.");
  let buckets=await listBuckets(accountId);
  if(!buckets.some(item=>item.name==="redown")){
    await createBucket(accountId,"redown");
    buckets=await listBuckets(accountId);
    if(!buckets.some(item=>item.name==="redown"))
      throw Error("Bucket creation was accepted but not verified. Refresh R2 before retrying; do not create duplicates.");
  }
  // Reuse the original Legacy Worker and profile whenever already healthy.
  // A menu-label change alone must not redeploy Cloudflare infrastructure.
  const former=(await getProfiles()).find(p=>p.type==="cloudflare-r2"&&p.accountId===accountId&&p.bucketName==="redown");
  const ready=former?.workerVersion>=6 && await workerAcceptsProfile(former).catch(()=>false);
  const profile=ready?former:await provisionCloudflareProfile({
    accountId,accountName:account.name,bucketName:"redown",profileName:"Cloudflare",
    folders:former?.folders||{},explorerOnly:former?.explorerManaged??true
  });
  const profiles=await getProfiles(),index=profiles.findIndex(p=>p.id===profile.id);
  if(index<0)throw Error("REDOWN bucket setup succeeded, but its menu profile could not be found. Refresh and inspect Settings.");
  // Profile mutations stay scoped to this destination. Preserve unrelated users'
  // menu entries and any existing simple paths/options on this profile.
  profiles[index]={...profiles[index],name:"Cloudflare",menuLabel:label,
    defaultPrefix:former?.defaultPrefix ?? "",
    showInContextMenu:true,explorerManaged:false};
  await setProfiles(profiles);
  await chrome.storage.local.set({rightClickMode:"simple"});
  await rebuildMenus();
  return {accountId,bucketName:"redown",name:label,verified:true};
}
async function ensureWorkersSubdomain(accountId) {
  let res = await cfFetch(`/accounts/${accountId}/workers/subdomain`);
  if (res.ok) {
    const body = await res.json();
    if (body?.result?.subdomain) return body.result.subdomain;
  }
  const candidates = [
    `redown-${accountId.slice(0, 8)}`,
    `redown-${accountId.slice(0, 8)}-${Math.random().toString(36).slice(2, 7)}`
  ];
  for (const subdomain of candidates) {
    res = await cfFetch(`/accounts/${accountId}/workers/subdomain`, {
      method: "PUT",
      body: JSON.stringify({ subdomain })
    });
    if (res.ok) return subdomain;
  }
  throw new Error("Could not create a workers.dev subdomain for this Cloudflare account");
}
function isVerifiedWorkerHealth(body){
  return body?.ok===true && body.service==="REDOWN" && body.secretConfigured===true && body.storageBound===true;
}

async function provisionCloudflareProfile(options) {
  return navigator.locks.request("redown-provision-profile", () => deployCloudflareProfile(options));
}
async function deployCloudflareProfile({ accountId, accountName, bucketName, profileName, folders, explorerOnly = false }) {
  if (!accountId || !bucketName) throw new Error("Choose an account and bucket");

  const profiles = await getProfiles();
  const existingIndex = profiles.findIndex(p =>
    p.type === "cloudflare-r2" && p.accountId === accountId && p.bucketName === bucketName
  );
  const existing = existingIndex >= 0 ? profiles[existingIndex] : null;

  const secretKey = `redownWorkerSecret:${accountId}:${bucketName}`;
  const storedSecret = (await chrome.storage.session.get(secretKey))[secretKey];
  const secret = existing?.token || storedSecret || randomString(36);
  await chrome.storage.session.set({[secretKey]:secret});
  const scriptName = existing?.scriptName || `redown-${safeSlug(bucketName, 38)}-${accountId.slice(0, 6)}`;

  // A workers.dev account subdomain must exist before a script can be enabled there.
  const subdomain = await ensureWorkersSubdomain(accountId);

  const metadata = {
    main_module: "worker.js",
    compatibility_date: "2026-09-26",
    compatibility_flags: ["global_fetch_strictly_public"],
    bindings: [
      { type: "r2_bucket", name: "STORAGE", bucket_name: bucketName },
      {type:"plain_text",name:"REDOWN_DIAGNOSTIC_BINDING",text:JSON.stringify([accountId,bucketName])},
      { type: "plain_text", name: "MAX_BYTES", text: "314572800" },
      { type: "plain_text", name: "PUBLIC_ASSETS_ENABLED", text: String(Boolean(!explorerOnly && (existing?.publicAssetsEnabled ?? (existing && !existing.explorerManaged)))) }
    ]
  };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  const deployedWorkerSource = WORKER_SOURCE.replace("__REDOWN_SHARED_SECRET__", secret);
  form.append("worker.js", new Blob([deployedWorkerSource], { type: "application/javascript+module" }), "worker.js");

  const upload = await cfFetch(`/accounts/${accountId}/workers/scripts/${scriptName}`, {
    method: "PUT", body: form
  });
  if (!upload.ok) {
    const text = await upload.text();
    throw new Error(`Could not provision REDOWN Worker (${upload.status}): ${text.slice(0, 300)}`);
  }

  const enable = await cfFetch(`/accounts/${accountId}/workers/scripts/${scriptName}/subdomain`, {
    method: "POST",
    body: JSON.stringify({ enabled: true, previews_enabled: false })
  });
  if (!enable.ok) {
    const text = await enable.text();
    throw new Error(`Worker uploaded, but workers.dev could not be enabled (${enable.status}): ${text.slice(0, 300)}`);
  }

  const workerUrl = `https://${scriptName}.${subdomain}.workers.dev`;
  await assertExplorerTransferSettings({accountId,bucketName,scriptName});

  // Do not save a broken preset. Confirm Cloudflare can actually execute the Worker.
  let health = null;
  let healthError = null;
  const healthStartedAt = Date.now();
  const healthTimeoutMs = 60_000;
  let attempt = 0;

  while (Date.now() - healthStartedAt < healthTimeoutMs) {
    attempt++;
    try {
      const response = await RedownCloudflareApi.boundedFetch(workerUrl, {
        method: "GET",
        cache: "no-store",
        headers: { "cache-control": "no-cache" }
      });
      if (response.ok) {
        health = await response.json().catch(() => null);
        if (isVerifiedWorkerHealth(health)&&health.workerVersion>=6&&health.diagnosticProtocol===1&&health.safeTransfers===true) break;
        health = null;
      }
      healthError = response.ok?"Unexpected Worker health response":`HTTP ${response.status}`;
    } catch (error) {
      // A freshly-created workers.dev route can be temporarily unreachable
      // from a browser profile/resolver even though the deployment API succeeded.
      healthError = error?.message || String(error);
    }

    const waitMs = Math.min(1000 + attempt * 500, 4000);
    await new Promise(resolve => setTimeout(resolve, waitMs));
  }

  if (!health?.ok) {
    throw new Error(
      `REDOWN deployed the Worker, but could not verify its connection within 60 seconds` +
      `${healthError ? ` (last error: ${healthError})` : ""}. ` +
      "Check your connection and retry repair. Your bucket was not deleted."
    );
  }
  const desiredFolders = {
    "2d": existing?.folders?.["2d"] || folders?.["2d"] || "2d",
    "3d": existing?.folders?.["3d"] || folders?.["3d"] || "3d",
    "videos": existing?.folders?.videos || folders?.videos || "videos",
    "files": existing?.folders?.files || folders?.files || "files"
  };

  // Verify the R2 binding with an actual write and materialize visible prefix markers
  // so brand-new empty buckets immediately show their configured REDOWN locations.
  let prefixCheck;
  for (let attempt = 0; attempt < 3; attempt++) {
    prefixCheck = await RedownCloudflareApi.boundedFetch(workerUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${secret}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      action: "ensurePrefixes",
      prefixes: explorerOnly
        ? []
        : Array.from(new Set([
            ...Object.values(desiredFolders),
            existing?.defaultPrefix ?? folders?.files ?? "files"
          ].filter(Boolean)))
    })
  });
    if (![401,403,404].includes(prefixCheck.status) || attempt === 2) break;
    await prefixCheck.body?.cancel();
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  const prefixBody = await prefixCheck.json().catch(() => ({}));
  if (!prefixCheck.ok || !prefixBody?.ok) {
    throw new Error(
      prefixBody?.error ||
      `REDOWN Worker is reachable but cannot write to R2 (${prefixCheck.status})`
    );
  }

  const profile = {
    ...(existing || {}),
    id: existing?.id || crypto.randomUUID(),
    name: existing?.name || profileName || bucketName,
    type: "cloudflare-r2",
    accountId,
    accountName,
    bucketName,
    scriptName,
    workerUrl,
    publicBaseUrl: existing?.customAssetDomain
      ? `https://${existing.customAssetDomain}/assets`
      : `${workerUrl}/assets`,
    token: secret,
    folders: desiredFolders,
    defaultPrefix: existing?.defaultPrefix ?? existing?.folders?.files ?? folders?.files ?? "files",
    defaultCategory: existing?.defaultCategory || "files",
    menuTree: Array.isArray(existing?.menuTree) ? existing.menuTree : [],
    workerVersion: 6,
    explorerManaged: Boolean(explorerOnly),
    publicAssetsEnabled: Boolean(!explorerOnly && (existing?.publicAssetsEnabled ?? (existing && !existing.explorerManaged))),
    capabilities: {
      canBrowse: true,
      canPrivateRead: true,
      canPublicRead: Boolean(!explorerOnly && (existing?.publicAssetsEnabled ?? (existing && !existing.explorerManaged))),
      canWrite: true,
      canTransfer: true,
      canArchiveInspect: true
    },
    showInContextMenu: explorerOnly ? false : (existing?.showInContextMenu !== false),
    menuOrder: existing?.menuOrder ?? profiles.length
  };

  if (existingIndex >= 0) profiles[existingIndex] = profile;
  else profiles.push(profile);
  await setProfiles(profiles);
  return profile;
}
function normalizeWebOrigin(value) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("Enter a website such as webrev.online or cdn.website.com");
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new Error("Enter a valid website/domain");
  }
  if (url.protocol !== "https:") throw new Error("Production asset websites must use HTTPS");
  if (url.username || url.password) throw new Error("Website URL cannot contain credentials");
  if (url.pathname !== "/" || url.search || url.hash) {
    throw new Error("Enter only the website origin, without a path, query, or fragment");
  }
  return url.origin;
}

async function configureBucketAssetCors(accountId, bucketName, website) {
  if (!accountId || !bucketName) throw new Error("Missing Cloudflare account or bucket");
  const origin = normalizeWebOrigin(website);
  const path = `/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucketName)}/cors`;

  let existingRules = [];
  const current = await cfFetch(path);
  if (current.ok) {
    const body = await current.json().catch(() => ({}));
    existingRules = Array.isArray(body?.result?.rules) ? body.result.rules : [];
  } else if (current.status !== 404) {
    const body = await current.json().catch(() => ({}));
    throw new Error(body?.errors?.[0]?.message || `Could not read R2 CORS configuration (${current.status})`);
  }

  // Cloudflare's REST API uses camelCase CORS fields. Read responses may carry
  // legacy/SDK field names or extra metadata; never replay those unfiltered.
  // Preserve existing rules and their permissions while updating this origin.
  const allowedMethods = new Set(["GET", "HEAD", "PUT", "POST", "DELETE"]);
  const stringList = value => Array.isArray(value) ? value.filter(item => typeof item === "string") : [];
  const rules = existingRules.map(rule => {
    const allowed = rule?.allowed || {};
    const methods = stringList(allowed.methods).filter(method => allowedMethods.has(method));
    const origins = stringList(allowed.origins);
    if (!methods.length || !origins.length) throw new Error("Existing CORS rules could not be safely preserved. No changes were made.");
    const normalized = { allowed: { origins, methods } };
    const headers = stringList(allowed.headers);
    if (headers.length) normalized.allowed.headers = headers;
    if (typeof rule.id === "string") normalized.id = rule.id;
    const exposed = stringList(rule.exposeHeaders ?? rule.expose_headers);
    if (exposed.length) normalized.exposeHeaders = exposed;
    const age = rule.maxAgeSeconds ?? rule.max_age_seconds;
    if (age !== undefined && age !== null && Number.isFinite(Number(age))) normalized.maxAgeSeconds = Number(age);
    return normalized;
  });
  let matched = false;
  for (const rule of rules) {
    if (!rule.allowed.origins.includes(origin)) continue;
    matched = true;
    rule.allowed.methods = Array.from(new Set([...rule.allowed.methods, "GET", "HEAD"]));
    rule.allowed.headers = Array.from(new Set([...(rule.allowed.headers || []), "*"]));
    rule.exposeHeaders = Array.from(new Set([
      ...(rule.exposeHeaders || []),
      "ETag", "Content-Length", "Content-Type", "Accept-Ranges", "Content-Range"
    ]));
    rule.maxAgeSeconds = Math.max(rule.maxAgeSeconds || 0, 3600);
  }
  if (!matched) {
    rules.push({
      allowed: { origins: [origin], methods: ["GET", "HEAD"], headers: ["*"] },
      exposeHeaders: ["ETag", "Content-Length", "Content-Type", "Accept-Ranges", "Content-Range"],
      maxAgeSeconds: 3600
    });
  }
  await cfJson(path, { method: "PUT", body: JSON.stringify({ rules }) });
  return origin;
}

async function configureAssetDomain(accountId, bucketName, website) {
  const origin = normalizeWebOrigin(website);
  const hostname = new URL(origin).hostname;
  const profiles = await getProfiles();
  const index = profiles.findIndex(p =>
    p.type === "cloudflare-r2" && p.accountId === accountId && p.bucketName === bucketName
  );
  if (index < 0) throw new Error("REDOWN destination not found");
  const profile = profiles[index];

  const attached = await cfJson(`/accounts/${accountId}/workers/domains`, {
    method: "PUT",
    body: JSON.stringify({
      hostname,
      service: profile.scriptName
    })
  });

  // Read back the exact association; a stored string or PUT acknowledgement is insufficient.
  let domains;
  try{domains=await cfJson(`/accounts/${accountId}/workers/domains?service=${encodeURIComponent(profile.scriptName)}&hostname=${encodeURIComponent(hostname)}`);}
  catch{return {hostname,state:"unknown",message:"Cloudflare accepted the request, but its association could not be refreshed. Check Cloudflare before retrying."};}
  const domain=(Array.isArray(domains)?domains:domains?.result||[]).find(item=>item.hostname===hostname&&item.service===profile.scriptName);
  if(!domain)return {hostname,state:"unknown",message:"Cloudflare has not confirmed this hostname on this bucket’s Worker. Refresh and check the domain before retrying."};
  // Reload before updating one profile: another page may have changed other destinations.
  const latest=await getProfiles();
  const current=latest.findIndex(p=>p.id===profile.id&&p.accountId===accountId&&p.bucketName===bucketName&&p.scriptName===profile.scriptName);
  if(current<0)return {hostname,state:"unknown",message:"The destination changed while attaching. Refresh Settings to inspect the outcome."};
  latest[current]={...latest[current],customAssetDomain:hostname,allowedWebsiteOrigin:origin,publicBaseUrl:`https://${hostname}/assets`,publicAssetsEnabled:true,explorerManaged:false};
  await setProfiles(latest);
  let published=latest[current];
  async function finish(state,message){
    const saved=await getProfiles();
    const destination=saved.find(p=>p.id===profile.id&&p.accountId===accountId&&p.bucketName===bucketName&&p.customAssetDomain===hostname);
    if(destination){destination.assetDomainState=state;destination.assetDomainMessage=message;await setProfiles(saved);published=destination;}
    return {origin,hostname,publicBaseUrl:published.publicBaseUrl,profile:published,domain:attached,state,message};
  }
  try{
    await configureBucketAssetCors(accountId,bucketName,origin);
    published=await provisionCloudflareProfile({accountId,accountName:profile.accountName,bucketName,profileName:profile.name,folders:profile.folders,explorerOnly:false});
  }catch(error){return finish("needs-setup",`Attached — Cloudflare reports the hostname association, but public delivery needs setup: ${error.message}. Check the Worker and DNS/SSL before retrying.`);}
  // This checks the public connection, not the existence or accessibility of any file.
  let reachable=false;
  try{
    const response=await RedownCloudflareApi.boundedFetch(origin+"/",{credentials:"omit",redirect:"error",timeoutMs:8000});
    const body=await response.json();reachable=response.ok&&isVerifiedWorkerHealth(body);
  }catch{}
  return finish(reachable?"verified":"attached",reachable?"Attached — Cloudflare confirmed the association. Public Worker connection verified; individual file access has not been tested.":"Attached — Cloudflare confirmed the association. Public connection is not verified; DNS or SSL may still need time or setup. Check the URLs below.");
}

// Read-only discovery: never provisions a Worker or enables a public address.
async function bucketPublicAddresses(accountId,bucketName){
  if(!accountId||!bucketName)throw new Error("Choose a bucket first.");
  const path=`/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/domains`;
  const profiles=await getProfiles();
  const profile=profiles.find(p=>p.type==="cloudflare-r2"&&p.accountId===accountId&&p.bucketName===bucketName);
  const result={accountId,bucketName,addresses:[],errors:[],managedPublicAccess:"unknown"};
  const reads=await Promise.allSettled([cfJson(path+"/managed"),cfJson(path+"/custom"),profile?.customAssetDomain?cfJson(`/accounts/${encodeURIComponent(accountId)}/workers/domains?service=${encodeURIComponent(profile.scriptName)}&hostname=${encodeURIComponent(profile.customAssetDomain)}`):Promise.resolve([])]);
  const [managed,custom,worker]=reads;
  if(managed.status==="fulfilled")result.managedPublicAccess=managed.value?.enabled===true?"enabled":managed.value?.enabled===false?"disabled":"unknown";
  if(managed.status==="fulfilled"&&managed.value?.domain)result.addresses.push({kind:"managed",label:"Cloudflare R2",base:`https://${managed.value.domain}/`,state:managed.value.enabled?"configured":"restricted"});
  if(custom.status==="fulfilled")for(const domain of custom.value?.domains||[])result.addresses.push({kind:"custom",label:"Custom domain",base:`https://${domain.domain}/`,state:!domain.enabled?"restricted":domain.status?.ssl==="active"&&domain.status?.ownership==="active"?"configured":"needs-setup"});
  if(profile?.customAssetDomain){
    const domains=worker.status==="fulfilled"?(Array.isArray(worker.value)?worker.value:worker.value?.result||[]):[];
    const found=domains.find(d=>d.hostname===profile.customAssetDomain&&d.service===profile.scriptName);
    result.addresses.push({kind:"worker",label:"Custom domain · REDOWN Worker",base:`https://${profile.customAssetDomain}/assets/`,state:worker.status==="rejected"?"unknown":!found?"unknown":profile.assetDomainState==="needs-setup"?"needs-setup":found.enabled===false||!profile.publicAssetsEnabled?"restricted":"configured"});
  }
  if(profile?.publicAssetsEnabled&&profile.workerUrl)result.addresses.push({kind:"worker",label:"REDOWN Worker URL",base:profile.workerUrl.replace(/\/+$/,"")+"/assets/",state:"configured"});
  for(const read of reads)if(read.status==="rejected")result.errors.push("Some public address configuration could not be refreshed.");
  return result;
}

// Explicit bucket-wide mutation; never called by public-address discovery.
async function enableBucketPublicAccess(message,sender){
  if(sender?.url!==chrome.runtime.getURL("options.html")||message.confirmed!==true)
    return {ok:false,code:"EXPLORER_PERMISSION_DENIED",error:"Confirm enabling public access from Get URL first."};
  const {accountId,bucketName}=message;
  if(typeof accountId!=="string"||!accountId||typeof bucketName!=="string"||!bucketName)
    return {ok:false,code:"EXPLORER_BUCKET_CONTEXT_MISMATCH",error:"Choose a bucket first."};
  const path=`/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/domains/managed`;
  try{
    const request=async options=>{
      const response=await cfFetch(path,options),body=await response.json().catch(()=>null);
      if(!response.ok||body?.success===false||!body?.result){const error=new Error("Public access request failed");error.status=response.status;throw error;}
      return body.result;
    };
    const before=await request();
    if(before.enabled!==true)await request({method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({enabled:true})});
    const verified=await request();
    if(verified.enabled!==true||typeof verified.domain!=="string"||!/^pub-[a-f0-9]+\.r2\.dev$/i.test(verified.domain))
      return {ok:false,code:"EXPLORER_RESULT_UNCONFIRMED",error:"Public access could not be verified. Refresh URL choices before retrying; the setting may have changed."};
    return {ok:true,accountId,bucketName};
  }catch(error){
    const denied=error?.status===403,expired=error?.status===401;
    return {ok:false,code:denied?"EXPLORER_PERMISSION_DENIED":expired?"EXPLORER_AUTH_EXPIRED":"EXPLORER_RESULT_UNCONFIRMED",error:denied?"Cloudflare denied this change. Check this login’s R2 bucket permissions.":expired?"Cloudflare rejected the login. Reconnect and try again.":"Could not verify public access. Refresh URL choices before retrying; the setting may have changed."};
  }
}

function publicAssetUrl(profile, key) {
  const base = String(profile.publicBaseUrl || `${profile.workerUrl}/assets`).replace(/\/+$/, "");
  return `${base}/${String(key).split("/").map(encodeURIComponent).join("/")}`;
}

async function listObjectsPage(accountId, bucketName, prefix = "", cursor = "", delimiter = "") {
  const params = new URLSearchParams({ per_page:"1000" });
  if (prefix) params.set("prefix", prefix);
  if (cursor) params.set("cursor", cursor);
  if (delimiter) params.set("delimiter", delimiter);
  const res = await cfFetch(`/accounts/${accountId}/r2/buckets/${encodeURIComponent(bucketName)}/objects?${params}`);
  const body = await res.json().catch(() => null);
  if (!body || typeof body!=="object" || (!Array.isArray(body.result) && !Array.isArray(body.result?.objects) && !Array.isArray(body.objects))) {
    throw new Error("Cloudflare returned an unreadable listing. Retry Refresh; your files have not been changed.");
  }
  if (!res.ok || body.success === false) throw new Error(cloudflareErrorMessage(body, `Could not list bucket objects (${res.status})`));
  const result = body.result ?? body;
  const objects = Array.isArray(result?.objects) ? result.objects : (Array.isArray(result) ? result : []);
  const info=body?.result_info || {};
  const delimited = Array.isArray(result?.delimited)
    ? result.delimited
    : Array.isArray(info?.delimited)
      ? info.delimited
      : [];
  // Persist only confirmed objects returned by R2. Index failures must not block browsing.
  try {
    const { rfisPreviewEnabled=false }=await chrome.storage.local.get("rfisPreviewEnabled");
    if(rfisPreviewEnabled)await RedownRFIS.observe(accountId,bucketName,objects);
  } catch (error) { console.warn("RFIS observation unavailable:",error); }
  return {
    objects,
    delimited,
    cursor:result?.cursor || info?.cursor || "",
    truncated:Boolean(result?.truncated ?? info?.is_truncated)
  };
}
async function listObjects(accountId, bucketName, prefix = "", cursor = "") {
  return listObjectsPage(accountId, bucketName, prefix, cursor);
}
async function listAllObjects(accountId, bucketName, prefix = "") {
  const objects=[],seen=new Set();let cursor="";
  for(let page=0;page<1000;page++){
    const result=await listObjectsPage(accountId,bucketName,prefix,cursor);
    objects.push(...result.objects);
    if(!result.cursor){if(result.truncated)throw new Error("Folder listing is incomplete. Refresh before changing files.");return objects;}
    if(seen.has(result.cursor))throw new Error("Cloudflare repeated a folder page. No file changes were started; refresh and retry.");
    seen.add(result.cursor);cursor=result.cursor;
  }
  throw new Error("Folder listing exceeded its safe page limit. Open a smaller folder before changing files.");
}
function explorerSearchScore(query, key) {
  const q=String(query||"").trim().toLocaleLowerCase().replace(/\\/g,"/");
  const value=String(key||"").toLocaleLowerCase();
  if(!q||!value)return -1;
  if(value===q)return 10000;
  if(value.startsWith(q))return 9000-q.length;
  const direct=value.indexOf(q);
  if(direct>=0)return 8000-direct;

  const tokens=q.split("/").filter(Boolean);
  let tokenScore=0, cursor=0;
  for(const token of tokens){
    const found=value.indexOf(token,cursor);
    if(found<0){
      // Loose subsequence match, useful for incomplete path fragments.
      let qi=0;
      for(let i=cursor;i<value.length&&qi<token.length;i++) if(value[i]===token[qi]) qi++;
      if(qi!==token.length)return -1;
      tokenScore+=250;
    }else{
      tokenScore+=1000-Math.min(found,500);
      cursor=found+token.length;
    }
  }
  return tokenScore;
}
async function searchExplorerObjects(targets, query, limit = 200) {
  const ranked=[];
  const seenFolders=new Set();
  for(const target of targets||[]){
    if(!target?.accountId||!target?.bucketName)continue;
    const objects=await listAllObjects(target.accountId,target.bucketName,"");
    for(const object of objects){
      const key=String(object.key||object.name||"");
      if(!key)continue;
      const fileScore=explorerSearchScore(query,key);
      if(fileScore>=0&&key.split("/").pop()!==".redown"){
        ranked.push({
          score:fileScore,
          accountId:target.accountId,
          accountName:target.accountName||"",
          bucketName:target.bucketName,
          key,
          folder:false,
          object
        });
      }
      const parts=key.split("/").filter(Boolean);
      const depth=parts[parts.length-1]===".redown"?parts.length-1:Math.max(0,parts.length-1);
      let folder="";
      for(let i=0;i<depth;i++){
        folder+=(folder?"/":"")+parts[i];
        const id=target.accountId+"\n"+target.bucketName+"\n"+folder;
        if(seenFolders.has(id))continue;
        seenFolders.add(id);
        const score=explorerSearchScore(query,folder+"/");
        if(score>=0)ranked.push({
          score:score+100,
          accountId:target.accountId,
          accountName:target.accountName||"",
          bucketName:target.bucketName,
          key:folder+"/",
          folder:true
        });
      }
    }
  }
  ranked.sort((a,b)=>b.score-a.score||String(a.key).localeCompare(String(b.key),undefined,{numeric:true,sensitivity:"base"}));
  return ranked.slice(0,Math.max(1,Math.min(500,Number(limit)||200)));
}
async function listFolderPrefixes(accountId, bucketName, limit = 5000) {
  const objects = await listAllObjects(accountId, bucketName, "");
  const prefixes = new Set([""]);
  for (const object of objects) {
    const key = String(object.key || object.name || "");
    if (!key) continue;
    const parts = key.split("/").filter(Boolean);
    // Files contribute each parent path; R2 folder markers contribute their folder too.
    const isMarker = parts[parts.length - 1] === ".redown";
    const depth = isMarker ? parts.length - 1 : Math.max(0, parts.length - 1);
    let current = "";
    for (let i = 0; i < depth; i++) {
      current += (current ? "/" : "") + parts[i];
      prefixes.add(current);
      if (prefixes.size >= limit) break;
    }
    if (prefixes.size >= limit) break;
  }
  return Array.from(prefixes).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric:true, sensitivity:"base" })
  );
}
async function listFolderChildren(accountId, bucketName, parentPrefix = "", limit = 250) {
  const parent = cleanExplorerPrefix(parentPrefix || "");
  const children = new Set();
  let cursor = "";
  while (children.size < limit) {
    const result = await listObjectsPage(accountId, bucketName, parent, cursor, "/");
    for (const raw of result.delimited || []) {
      const full=String(raw||"").replace(/\/$/,"");
      if(!full)continue;
      const relative=parent && full.startsWith(parent) ? full.slice(parent.length) : full;
      const child=relative.split("/").filter(Boolean)[0];
      if(child)children.add(child);
      if(children.size>=limit)break;
    }
    // Folder marker objects can appear as ordinary objects at this level.
    for (const object of result.objects || []) {
      const key=String(object.key||object.name||"");
      if(!key||!key.startsWith(parent))continue;
      const relative=key.slice(parent.length);
      const slash=relative.indexOf("/");
      if(slash>0)children.add(relative.slice(0,slash));
      if(children.size>=limit)break;
    }
    if(!result.cursor||result.cursor===cursor)break;
    cursor=result.cursor;
  }
  return Array.from(children).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true,sensitivity:"base"}));
}
function cleanExplorerPrefix(value) {
  const prefix=String(value||"");
  if(!prefix)return "";
  if(prefix.split("/").some(part=>part==="."||part==="..")||prefix.includes("\0"))throw new Error("That location is not valid");
  return prefix.endsWith("/")?prefix:prefix+"/";
}
function cleanExplorerKey(value){
  if(typeof value!=="string"||!value||value.includes("\0")||new TextEncoder().encode(value).byteLength>1024)throw new Error("Invalid object key");
  return value;
}
function cleanExplorerName(value) {
  const name = String(value || "").trim();
  if (!name || name === "." || name === ".." || /[\\/\0]/.test(name)) throw new Error("Enter a valid name without slashes");
  if(new TextEncoder().encode(name).byteLength>1024)throw new Error("That name is too long");
  return name;
}
async function workerAcceptsProfile(profile,explorerTrace) {
  if (!profile?.workerUrl || !profile?.token) return false;
  try {
    const response = await RedownCloudflareApi.boundedFetch(profile.workerUrl, {
      timeoutMs:8000,method:"POST",
      cache:"no-store",
      headers:{
        authorization:`Bearer ${profile.token}`,
        "content-type":"application/json",
        "cache-control":"no-cache"
      },
      body:JSON.stringify({ action:"capabilities" })
    });
    if(response.status===401)return false;
    if(!response.ok)throw new Error("Bucket connection check failed (HTTP "+response.status+"). Reconnect or retry Refresh; no repair was attempted.");
    const result = await response.json().catch(() => ({}));
    globalThis.redownExplorerBridge?.event(explorerTrace?.operationId,"worker.check",result?.safeTransfers?"confirmed":"unknown",{workerVersion:result.workerVersion,protocol:result.diagnosticProtocol||0,safeTransfers:result.safeTransfers});
    return response.ok && result?.ok===true && result.workerVersion>=5 && result.safeTransfers===true && result.storageBound===true;
  } catch(error) {
    throw new Error(error?.message||"Bucket connection check failed. Retry Refresh; no repair was attempted.");
  }
}
// Beta opts out of implicit infrastructure changes; Legacy retains its existing defaults.
async function preparedProfile(accountId, bucketName, accountName = "", forceRepair = false, explorerTrace = null, noProvision = false) {
  globalThis.redownExplorerBridge?.event(explorerTrace?.operationId,"worker.check","started");
  let profiles = await getProfiles();
  let profile = profiles.find(p => p.type === "cloudflare-r2" && p.accountId === accountId && p.bucketName === bucketName);
  if (!forceRepair && profile?.workerVersion >= 5 && await workerAcceptsProfile(profile,explorerTrace)) return noProvision?{...profile,betaNoRepair:true}:profile;
  if(noProvision)throw new Error("Bucket Worker needs explicit setup. Use Set up right-click destination in Beta; no infrastructure was changed.");

  return provisionCloudflareProfile({
    accountId,
    accountName:accountName || profile?.accountName,
    bucketName,
    profileName:profile?.name || bucketName,
    folders:profile?.folders || {},
    explorerOnly:Boolean(profile?.explorerManaged || !profile)
  });
}
async function callBucketWorker(profile, body, allowRepair = true) {
  async function run(active){
    const started=globalThis.performance?.now?.()||0;
    const read=["headObject","capabilities","probeSource","createReadUrl","listArchive","createArchiveEntryReadUrl"].includes(body.action);
    const observe=(outcome,code,status)=>{try{globalThis.redownRuntimeObserver?.record({operation:read?"api.read":"api.write",outcome,code,status,durationMs:(globalThis.performance?.now?.()||0)-started});}catch{}};
    let response,result;
    const trace=body.explorerTrace;
    try{
      const wire=await globalThis.redownExplorerBridge?.wire(trace,active);
      globalThis.redownExplorerBridge?.event(trace?.operationId,"worker.request","started",{method:"POST",endpoint:"worker.manage",origin:wire?.expectedOrigin});
      response=await RedownCloudflareApi.boundedFetch(active.workerUrl,{
        timeoutMs:body.action==="probeSource"||body.action==="capabilities"?15000:30000,method:"POST",
        headers:{authorization:`Bearer ${active.token||""}`,"content-type":"application/json"},
        body:JSON.stringify({...body,explorerTrace:wire}),
        ...(wire?{headers:{authorization:`Bearer ${active.token||""}`,"content-type":"application/json","x-redown-diagnostic":JSON.stringify(wire)}}:{})
      });
      result=await response.json().catch(error=>{if(error?.name==="TimeoutError"||response.ok)throw error;return {};});
    }catch(error){
      observe("unknown",error?.name==="TimeoutError"?"TIMEOUT":"NETWORK");
      const failure=new Error(error?.name==="TimeoutError"?(read?"The read-only bucket request exceeded its deadline.":"The bucket did not confirm this operation within 30 seconds. Refresh the destination before retrying; a copy may already exist."):"The bucket did not confirm this operation. Check the destination before retrying; a change may already have completed.");
      failure.code=error?.name==="TimeoutError"?"EXPLORER_REQUEST_TIMEOUT":error?.name==="AbortError"?"EXPLORER_RESULT_UNCONFIRMED":"EXPLORER_NETWORK_ERROR";failure.stage="worker.response";throw failure;
    }
    globalThis.redownExplorerBridge?.event(trace?.operationId,"worker.response",response.ok?"confirmed":"failed",{status:response.status,code:response.status===404?"EXPLORER_HTTP_NOT_FOUND":undefined});
    globalThis.redownExplorerBridge?.workerEvents(trace,result.explorerDiagnostic);
    const confirmed=response.ok&&result?.ok===true&&!(result.results||[]).some(item=>item.status==="failed");
    observe(confirmed?"success":"failed",confirmed?"OK":response.ok?"UNEXPECTED_RESPONSE":response.status>=500?"HTTP_5XX":`HTTP_${response.status}`,response.status);
    return {response,result};
  }
  let active=profile;
  let {response,result}=await run(active);
  if(allowRepair&&!profile.betaNoRepair&&response.status===401){
    active=await preparedProfile(active.accountId,active.bucketName,active.accountName,true);
    ({response,result}=await run(active));
  }
  if(!response.ok||result?.ok!==true){
    const error=new Error((result?.error||"Bucket operation failed")+` (HTTP ${response.status}). Refresh or reconnect if access was rejected.`);
    error.status=response.status;error.code=result?.code;error.stage=result?.stage;throw error;
  }
  return result;
}

async function expandExplorerEntries(accountId, bucketName, entries) {
  const expanded = [];
  for (const entry of entries || []) {
    if (entry.folder) {
      const prefix = cleanExplorerPrefix(entry.key);
      const objects = await listAllObjects(accountId, bucketName, prefix);
      for (const object of objects) {
        const key = object.key || object.name;
        if (key) expanded.push({ key, root:prefix, displayName:entry.displayName || prefix.split("/").filter(Boolean).pop() });
      }
    } else {
      const key = cleanExplorerKey(entry.key);
      if (key) expanded.push({ key, root:key, displayName:entry.displayName || key.split("/").pop() });
    }
  }
  return Array.from(new Map(expanded.map(entry => [entry.key, entry])).values());
}
// Explicit Debug action. Uses saved endpoints only: never prepares/repairs a Worker.
let explorerProbeRunning=false;
async function probeExplorerSource(input) {
  const bridge=globalThis.redownExplorerBridge,collector=bridge?.collector;
  if(!collector?.enabled)throw new Error("Enable Debug Mode first.");
  if(explorerProbeRunning)throw new Error("An Explorer probe is already running.");
  const valid=value=>value&&typeof value.accountId==="string"&&value.accountId&&typeof value.bucketName==="string"&&value.bucketName;
  if(!valid(input?.source)||!valid(input?.destination)||typeof input.key!=="string"||!input.key||new TextEncoder().encode(input.key).byteLength>1024||input.key.includes("\0"))throw new Error("Choose one ordinary file and a destination bucket.");
  explorerProbeRunning=true;
  try{
    const profiles=await getProfiles();
    const find=target=>profiles.find(p=>p.type==="cloudflare-r2"&&p.accountId===target.accountId&&p.bucketName===target.bucketName);
    const source=find(input.source),destination=find(input.destination);
    const validEndpoint=profile=>{try{const url=new URL(profile?.workerUrl);return url.protocol==="https:"&&!url.username&&!url.password&&url.pathname==="/"&&!url.search&&!url.hash&&url.hostname.endsWith(".workers.dev")&&typeof profile.token==="string"&&profile.token;}catch{return false;}};
    if(!validEndpoint(source)||!validEndpoint(destination))throw new Error("Both buckets need saved workers.dev connections. Use the existing setup controls; the probe never deploys or repairs.");
    const id=collector.begin("properties"),checks=[],requestId=crypto.randomUUID();
    const trace={operationId:id,protocol:1,sourceBinding:await collector.fingerprint("bucket",JSON.stringify([source.accountId,source.bucketName])),requestId,expectedKey:await collector.fingerprint("key",input.key)};
    const live=()=>{if(!collector.enabled||!collector.getOperationTrace(id))throw new Error("Probe collection was cleared or disabled.");};
    const check=async(name,stage,fn)=>{
      live();const started=Date.now();
      try{const value=await fn();live();checks.push({name,...value});bridge.event(id,stage,value.state==="passed"?"confirmed":value.state==="failed"?"failed":"unknown",{status:value.status,code:value.code,probe:name,bindingMatches:value.bindingMatches,publicFetchEnabled:value.publicFetchEnabled,durationMs:Math.max(0,Date.now()-started),requestId});return value;}
      catch(error){live();const code=globalThis.RedownExplorerDiagnostics.classify(error);checks.push({name,state:"unknown",code});bridge.event(id,stage,"unknown",{code,probe:name,durationMs:Math.max(0,Date.now()-started),requestId});return {state:"unknown"};}
    };
    await collector.identity(id,source,input.key,{encoding:"literal",requestId,expectedKey:trace.expectedKey});
    for(const [role,profile] of [["source",source],["destination",destination]]){
      await check(role+".provider-settings","worker.check",async()=>{
        if(!profile.scriptName)return {state:"unsupported"};
        const result=await cfJson(`/accounts/${encodeURIComponent(profile.accountId)}/workers/scripts/${encodeURIComponent(profile.scriptName)}/settings`,{timeoutMs:10000});
        const binding=(result.bindings||[]).find(b=>b.name==="STORAGE"&&b.type==="r2_bucket");
        const bindingMatches=Boolean(binding&&binding.bucket_name===profile.bucketName);
        const publicFetchEnabled=(result.compatibility_flags||[]).includes("global_fetch_strictly_public");
        return {state:bindingMatches&&publicFetchEnabled?"passed":"failed",bindingMatches,publicFetchEnabled,code:!bindingMatches?"EXPLORER_BUCKET_CONTEXT_MISMATCH":!publicFetchEnabled?"EXPLORER_WORKER_ROUTING_CONFIG":undefined};
      });
    }
    await check("source.api-read","api.response",async()=>{
      const path=`/accounts/${encodeURIComponent(source.accountId)}/r2/buckets/${encodeURIComponent(source.bucketName)}/objects/${input.key.split("/").map(encodeURIComponent).join("/")}`;
      const response=await cfFetch(path,{headers:{range:"bytes=0-0"},redirect:"error",timeoutMs:10000});
      await response.body?.cancel();
      return {state:response.ok?"passed":"failed",status:response.status,code:response.ok?undefined:globalThis.RedownExplorerDiagnostics.classify({status:response.status})};
    });
    await check("source.direct-head","source.read",async()=>{
      const wire=await bridge.wire(trace,source);
      const response=await RedownCloudflareApi.boundedFetch(source.workerUrl+"/object?key="+encodeURIComponent(input.key),{method:"HEAD",redirect:"manual",timeoutMs:10000,headers:{authorization:`Bearer ${source.token}`,"x-redown-diagnostic":JSON.stringify(wire)}});
      try{bridge.workerEvents(trace,JSON.parse(response.headers.get("x-redown-diagnostic")||"null"));}catch{}
      await response.body?.cancel();
      return {state:response.ok?"passed":"failed",status:response.status,code:response.ok?undefined:globalThis.RedownExplorerDiagnostics.classify({status:response.status})};
    });
    await check("source.via-destination-head","source.read",async()=>{
      const capability=await callBucketWorker(destination,{action:"capabilities",explorerTrace:trace},false);
      live();if(capability.readOnlyProbe!==true)return {state:"unsupported",code:"EXPLORER_WORKER_CAPABILITY_MISMATCH"};
      const result=await callBucketWorker(destination,{action:"probeSource",sourceWorkerUrl:source.workerUrl,sourceToken:source.token,key:input.key,explorerTrace:trace},false);
      return {state:result.status===200?"passed":"failed",status:result.status,code:result.status===200?undefined:globalThis.RedownExplorerDiagnostics.classify({status:result.status})};
    });
    const state=checks.some(c=>c.state==="failed")?"failed":checks.every(c=>c.state==="passed")?"confirmed":"unknown";
    collector.finish(id,state);return {explorerDiagnosticVersion:"1.0.0",state:state==="confirmed"?"available":"partial",data:{operationId:id,readOnly:true,checks,diagnosis:collector.diagnose(id),limitations:["Headers and metadata only; no file byte integrity established","Older Workers may lack the read-only proxy capability","Settings inspect provider configuration, not deployed code identity","No writes, repair, provisioning, or automatic write retries"]}};
  }finally{explorerProbeRunning=false;}
}

// Cross-bucket reads must use the intended storage binding and public fetch routing.
// Read settings afresh: an older extension can redeploy a Worker without its routing flag.
async function assertExplorerTransferSettings(profile, trace, role="destination") {
  if(!profile.scriptName)throw Object.assign(new Error("The bucket connection has no Worker identity. Use its Repair control before transferring."),{code:"EXPLORER_WORKER_NOT_READY",stage:"worker.check"});
  const settings=await cfJson(`/accounts/${encodeURIComponent(profile.accountId)}/workers/scripts/${encodeURIComponent(profile.scriptName)}/settings`,{timeoutMs:10000});
  const binding=(settings.bindings||[]).find(b=>b.name==="STORAGE"&&b.type==="r2_bucket");
  const bindingMatches=binding?.bucket_name===profile.bucketName;
  const publicFetchEnabled=(settings.compatibility_flags||[]).includes("global_fetch_strictly_public");
  const code=!bindingMatches?"EXPLORER_BUCKET_CONTEXT_MISMATCH":!publicFetchEnabled?"EXPLORER_WORKER_ROUTING_CONFIG":undefined;
  globalThis.redownExplorerBridge?.event(trace?.operationId,"worker.check",code?"failed":"confirmed",{bindingMatches,publicFetchEnabled,code,probe:role+".provider-settings"});
  if(code)throw Object.assign(new Error(!bindingMatches?"The saved bucket and Worker storage binding disagree. Use Repair before transferring; no files were changed.":"The bucket Worker is missing its cross-bucket routing setting. Use Repair before transferring; no files were changed."),{code,stage:"worker.check"});
}
async function explorerDirectoryExists(destination, prefix) {
  const page=await listObjectsPage(destination.accountId,destination.bucketName,prefix);
  if(page.objects.length||page.delimited?.length)return true;
  if(page.truncated||page.cursor)throw new Error("Directory existence could not be confirmed. Refresh before transferring; no files were changed.");
  return false;
}
async function transferExplorerObjects(message) {
  const operation = message.operation === "move" ? "move" : "copy";
  const destinationPrefix = cleanExplorerPrefix(message.destination?.prefix || "");
  const source = message.source || {};
  const destination = message.destination || {};
  if (!source.accountId || !source.bucketName || !destination.accountId || !destination.bucketName) throw new Error("Choose source and destination buckets");
  const expanded = await expandExplorerEntries(source.accountId, source.bucketName, message.entries || []);
  if (!expanded.length) throw new Error("The selected items no longer contain any files");
  const sourceProfile = await preparedProfile(source.accountId, source.bucketName, source.accountName,false,message.explorerTrace,message.betaNoProvision===true);
  const destinationProfile = source.accountId === destination.accountId && source.bucketName === destination.bucketName
    ? sourceProfile : await preparedProfile(destination.accountId, destination.bucketName, destination.accountName,false,message.explorerTrace,message.betaNoProvision===true);
  if(sourceProfile!==destinationProfile)await Promise.all([[sourceProfile,"source"],[destinationProfile,"destination"]].map(([profile,role])=>assertExplorerTransferSettings(profile,message.explorerTrace,role)));
  const roots = new Map((message.entries || []).filter(entry=>entry.folder).map(entry => [cleanExplorerPrefix(entry.key), entry]));
  const folderTargets=new Map(),folderConflicts=[],reserved=new Set();
  const planningDeadline=Date.now()+10000;
  const directoryExists=async prefix=>{
    if(Date.now()>planningDeadline)throw new Error("Directory planning exceeded its deadline. No files were changed.");
    const exists=await explorerDirectoryExists(destination,prefix);
    if(Date.now()>planningDeadline)throw new Error("Directory planning exceeded its deadline. No files were changed.");
    return exists;
  };
  for(const [root,entry] of roots){
    const requested=entry.destinationKey?cleanExplorerPrefix(entry.destinationKey):destinationPrefix+(message.renameTo||root.split("/").filter(Boolean).pop())+"/";
    if(source.accountId===destination.accountId&&source.bucketName===destination.bucketName&&requested.startsWith(root))throw new Error("A folder cannot be moved into itself");
    let target=requested;
    const exists=reserved.has(target)||await directoryExists(target);
    if(exists&&message.conflict!=="replace"){
      if(message.conflict!=="keep"){
        folderConflicts.push({sourceKey:root,destinationKey:requested,folder:true,status:"conflict",code:"EXPLORER_DESTINATION_CONFLICT"});continue;
      }
      const base=requested.slice(0,-1);let available=false;
      for(let index=2;index<66;index++){
        target=base+" ("+index+")/";
        if(!reserved.has(target)&&!await directoryExists(target)){available=true;break;}
      }
      if(!available)throw new Error("Could not choose an available directory name. No files were changed.");
    }
    reserved.add(target);folderTargets.set(root,target);
  }
  const mapped = expanded.map(entry => {
    const folderRoot = Array.from(roots.keys()).find(root => root.endsWith("/") && entry.key.startsWith(root));
    if(folderRoot&&!folderTargets.has(folderRoot))return null;
    const explicitDestination = (message.entries || []).find(candidate => !candidate.folder&&candidate.key === entry.key)?.destinationKey;
    const destinationKey = explicitDestination
      ? cleanExplorerKey(explicitDestination)
      : folderRoot
        ? folderTargets.get(folderRoot) + entry.key.slice(folderRoot.length)
        : destinationPrefix + (message.renameTo || entry.key.split("/").pop());
    if (source.accountId === destination.accountId && source.bucketName === destination.bucketName && destinationKey === entry.key) throw new Error("Source and destination are the same");
    if (source.accountId === destination.accountId && source.bucketName === destination.bucketName && folderRoot && destinationKey.startsWith(folderRoot)) throw new Error("A folder cannot be moved into itself");
    return { sourceKey:entry.key, destinationKey, sameBucket:source.accountId === destination.accountId && source.bucketName === destination.bucketName };
  }).filter(Boolean);
  const results = [];
  for (let index = 0; index < mapped.length; index += 25) {
    const batch=mapped.slice(index,index+25);
    if(message.explorerTrace)for(const entry of batch){entry.diagnosticRequestId=crypto.randomUUID();entry.diagnosticExpectedKey=await globalThis.redownExplorerBridge.collector.fingerprint("key",entry.sourceKey);}
    const response = await callBucketWorker(destinationProfile, { action:"transferBatch", entries:batch, sourceWorkerUrl:sourceProfile.workerUrl, sourceToken:sourceProfile.token, conflict:message.conflict || "skip",explorerTrace:message.explorerTrace });
    const expected=new Set(batch.map(entry=>entry.sourceKey)),seen=new Set();
    if(!Array.isArray(response.results)||response.results.length!==batch.length||response.results.some(result=>{
      if(!expected.has(result.sourceKey)||seen.has(result.sourceKey)||!["copied","conflict","failed"].includes(result.status))return true;
      seen.add(result.sourceKey);
      if(result.status!=="copied")return false;
      const requested=batch.find(entry=>entry.sourceKey===result.sourceKey).destinationKey;
      const parent=key=>key.slice(0,key.lastIndexOf("/")+1);
      let expectedDestination=result.destinationKey===requested;
      if(!expectedDestination&&message.conflict==="keep"&&typeof result.destinationKey==="string"){
        const name=requested.slice(parent(requested).length),dot=name.lastIndexOf(".");
        const stem=dot>0?name.slice(0,dot):name,extension=dot>0?name.slice(dot):"";
        const start=parent(requested)+stem+" (",end=")"+extension;
        const index=result.destinationKey.slice(start.length,-end.length);
        expectedDestination=result.destinationKey.startsWith(start)&&result.destinationKey.endsWith(end)&&/^\d+$/.test(index)&&Number(index)>=2;
      }
      return !(result.verified===true&&typeof result.destinationKey==="string"&&result.destinationKey&&typeof result.sourceEtag==="string"&&result.sourceEtag&&typeof result.destinationEtag==="string"&&result.destinationEtag&&Number.isSafeInteger(result.size)&&result.size>=0&&expectedDestination&&!(batch.find(entry=>entry.sourceKey===result.sourceKey).sameBucket&&result.destinationKey===result.sourceKey));
    }))throw new Error("The bucket did not confirm all selected files. Refresh the destination before retrying; some copies may already exist.");
    results.push(...response.results);
    if(operation==="copy"&&!message.renameTo){const count=response.results.filter(item=>item.status==="copied"&&!item.sourceKey.endsWith("/")).length;if(count)await transferCounter.add(count).catch(()=>console.warn("REDOWN delivery counter unavailable"));}
  }
  const copied = results.filter(result => result.status === "copied");
  const deleteErrors = [];let deletedCount=0;
  if (operation === "move" && copied.length) {
    for (let index = 0; index < copied.length; index += 100) {
      try {
        const batch=copied.slice(index,index+100),keys=batch.map(result=>result.sourceKey);
        const result=await callBucketWorker(sourceProfile,{action:"deleteKeys",keys,expected:batch.map(result=>({key:result.sourceKey,etag:result.sourceEtag,version:result.sourceVersion,size:result.size,destinationKey:result.destinationKey,destinationEtag:result.destinationEtag,destinationVersion:result.destinationVersion})),destinationWorkerUrl:destinationProfile.workerUrl,destinationToken:destinationProfile.token,explorerTrace:message.explorerTrace,sameBucket:source.accountId===destination.accountId&&source.bucketName===destination.bucketName});
        if(!Array.isArray(result.deleted)||result.deleted.length!==keys.length||keys.some(key=>!result.deleted.includes(key)))throw new Error("Source deletion was not confirmed. Refresh both locations before retrying.");
        deletedCount+=keys.length;
        if(!message.renameTo){const count=keys.filter(key=>!key.endsWith("/")).length;if(count)await transferCounter.add(count).catch(()=>console.warn("REDOWN delivery counter unavailable"));}
      }
      catch (error) { deleteErrors.push(error.message || String(error)); }
    }
  }
  return { total:expanded.length, completed:operation==="move"?deletedCount:copied.length, copied:copied.length, conflicts:[...folderConflicts,...results.filter(x => x.status === "conflict")], errors:[...results.filter(x => x.status === "failed"), ...deleteErrors.map(error => ({ error }))], partialMove:Boolean(deleteErrors.length), results };
}
async function deleteExplorerObjects(message) {
  const source = message.source || {};
  const expanded = await expandExplorerEntries(source.accountId, source.bucketName, message.entries || []);
  const profile = await preparedProfile(source.accountId, source.bucketName, source.accountName,false,message.explorerTrace,message.betaNoProvision===true);
  let completed = 0; const errors = [];
  for (let index = 0; index < expanded.length; index += 100) {
    try { const keys=expanded.slice(index,index+100).map(x => x.key); const receipt=await callBucketWorker(profile,{action:"deleteKeys",keys,explorerTrace:message.explorerTrace});if(!Array.isArray(receipt.deleted)||receipt.deleted.length!==keys.length||keys.some(key=>!receipt.deleted.includes(key)))throw new Error("Deletion was not confirmed. Refresh before retrying.");completed+=keys.length; }
    catch (error) { errors.push(error.message || String(error)); }
  }
  return { total:expanded.length, completed, errors };
}
async function renameExplorerEntry(message) {
  const entry = message.entry || {};
  const name = cleanExplorerName(message.newName);
  const key = String(entry.key || "");
  const oldName = entry.displayName || key.replace(/\/$/, "").split("/").pop();
  if (name === oldName) return { total:0, completed:0, errors:[] };
  const parent = key.replace(/\/$/, "").split("/").slice(0,-1).join("/");
  return transferExplorerObjects({ operation:"move", source:message.source, destination:{...message.source,prefix:parent}, entries:[entry], conflict:"skip", renameTo:name,explorerTrace:message.explorerTrace,betaNoProvision:message.betaNoProvision });
}
async function createExplorerFolder(message) {
  const prefix = cleanExplorerPrefix(message.prefix) + cleanExplorerName(message.name);
  const profile = await preparedProfile(message.accountId, message.bucketName, message.accountName,false,message.explorerTrace,message.betaNoProvision===true);
  if(message.createOnly===true){
    const capabilities=await callBucketWorker(profile,{action:"capabilities"});
    if(capabilities.createOnlyFolders!==true)throw new Error("New practice folders require the create-only folder Worker update. Use explicit bucket setup before testing; no folder was changed.");
    const page=await listObjectsPage(message.accountId,message.bucketName,prefix);
    if(page.objects.some(o=>o.key===prefix||o.key.startsWith(prefix+"/"))||page.delimited?.some(p=>(typeof p==="string"?p:p.prefix)===prefix+"/")||page.truncated||page.cursor)throw new Error("That folder name already exists or could not be checked.");
  }
  await callBucketWorker(profile, { action:"ensurePrefixes", prefixes:[prefix],createOnly:message.createOnly===true,explorerTrace:message.explorerTrace });
  return { key:`${prefix}/` };
}
function objectKeyFromLocation(profile, location) {
  try {
    const target = new URL(String(location || ""));
    const base = new URL(String(profile.publicBaseUrl || `${profile.workerUrl}/assets`).replace(/\/+$/, "") + "/");
    if (target.origin !== base.origin) return "";
    const basePath = base.pathname.replace(/\/+$/, "") + "/";
    if (!target.pathname.startsWith(basePath)) return "";
    return target.pathname.slice(basePath.length).split("/").map(decodeURIComponent).join("/");
  } catch {
    return "";
  }
}
async function renameCloudflareTransfer(profile, location, newFilename, exactKey = "") {
  const oldKey = exactKey || objectKeyFromLocation(profile, location);
  if (!oldKey) throw new Error("Could not determine the R2 object path for this download");
  const response = await RedownCloudflareApi.boundedFetch(profile.workerUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${profile.token || ""}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      action: "renameObject",
      oldKey,
      newFilename,
      publicBaseUrl: profile.publicBaseUrl || `${profile.workerUrl}/assets`
    })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body?.ok) throw new Error(body?.error || `Rename failed (${response.status})`);
  return body;
}
async function renameTransferHistoryItem(id, newFilename) {
  const { transferHistory = [] } = await chrome.storage.local.get("transferHistory");
  const history = Array.isArray(transferHistory) ? transferHistory : [];
  const index = history.findIndex(item => item?.id === id);
  if (index < 0) throw new Error("Download history entry was not found");
  const item = history[index];
  if (!item?.ok) throw new Error("Only completed downloads can be renamed");
  const profiles = await getProfiles();
  const profile = item.destination?await preparedProfile(item.destination.accountId,item.destination.bucketName,item.destination.accountName):profiles.find(p => p.id === item.profileId);
  if (!profile || profile.type !== "cloudflare-r2") throw new Error("Inline rename is currently available for Cloudflare R2 downloads");
  const renamed = await renameCloudflareTransfer(profile, item.location, newFilename, item.destination?.key);
  if(item.destination)item.destination={...item.destination,key:renamed.key,prefix:renamed.key.split("/").slice(0,-1).join("/")};
  history[index] = { ...item, location: renamed.publicUrl || publicAssetUrl(profile, renamed.key), renamedAt: new Date().toISOString() };
  await chrome.storage.local.set({ transferHistory: history });
  return history[index];
}
async function ensureGitHubWorkflow(profile) {
  const repo = String(profile.repository || "").trim();
  const workflow = profile.workflowFile || "redown-ingest.yml";
  const branch = profile.branch || "main";
  const headers = {
    authorization: `Bearer ${profile.token || ""}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28"
  };
  const path = `.github/workflows/${workflow}`;
  const apiPath = encodeURIComponent(path).replace(/%2F/g, "/");
  const lookup = await fetch(
    `https://api.github.com/repos/${repo}/contents/${apiPath}?ref=${encodeURIComponent(branch)}`,
    { headers }
  );
  if (lookup.ok) return;
  if (lookup.status !== 404) throw new Error(`Could not check GitHub workflow (${lookup.status})`);
  const encoded = btoa(unescape(encodeURIComponent(GITHUB_WORKFLOW)));
  const create = await fetch(`https://api.github.com/repos/${repo}/contents/${apiPath}`, {
    method: "PUT",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      message: "chore: add REDOWN remote ingest workflow",
      content: encoded, branch
    })
  });
  if (!create.ok) throw new Error(`Could not install GitHub ingest workflow (${create.status})`);
}
async function ingestCloudflareAtPrefix(profile, sourceUrl, prefix, filename, receipt = null, noProvision = false) {
  const prepared = await preparedProfile(
    profile.accountId,
    profile.bucketName,
    profile.accountName,false,null,noProvision
  );
  const folder = cleanExplorerPrefix(prefix || "").replace(/\/$/, "");
  // Older Workers normalize these paths. Refuse before writing unless exact paths
  // are explicitly supported; ordinary legacy ASCII destinations still work.
  const needsExactPath=/[^a-zA-Z0-9._ /-]/.test(folder)||folder.split("/").some(part=>part!==part.trim())||folder.includes("//")||folder.endsWith("/");
  if(needsExactPath){
    const capabilities=await callBucketWorker(prepared,{action:"capabilities"},false);
    if(capabilities.exactIngestPaths!==true)throw Object.assign(new Error("This folder needs exact-path support. Use the bucket’s Repair control in Settings, then retry. No upload was started."),{code:"EXPLORER_WORKER_CAPABILITY_MISMATCH"});
  }
  const response = await fetch(prepared.workerUrl, {
    method: "POST",
    headers: {
      authorization: `Bearer ${prepared.token || ""}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      sourceUrl,
      folder,
      exactFolder:true,
      filename,
      publicBaseUrl: prepared.publicBaseUrl || `${prepared.workerUrl}/assets`
    })
  });
  const text = await response.text();
  let body;
  try { body = JSON.parse(text); } catch { body = { ok:false, error:text }; }
  if (!response.ok || !body.ok)
    throw new Error(body.error || `Cloudflare ingest failed (${response.status})`);
  const key=String(body.key||"");
  const actualFolder=key.split("/").slice(0,-1).join("/");
  if(!key||actualFolder!==folder)throw new Error("Destination verification failed: Worker returned a different folder. The file may have been written; check storage before retrying.");
  if(receipt)receipt.destination={accountId:profile.accountId,accountName:profile.accountName||"",bucketName:profile.bucketName,prefix:folder,key};
  return body.publicUrl || publicAssetUrl(prepared, key);
}
async function ingestCloudflare(profile, sourceUrl, category, filename) {
  const folder = profile.folders?.[category] || category;
  return ingestCloudflareAtPrefix(profile, sourceUrl, folder, filename);
}
async function ingestGitHub(profile, sourceUrl, category, filename) {
  const repo = String(profile.repository || "").trim();
  if (!/^[^/]+\/[^/]+$/.test(repo)) throw new Error("GitHub repository must be owner/name");
  const workflow = profile.workflowFile || "redown-ingest.yml";
  const ref = profile.branch || "main";
  const destinationPath = joinPath(profile.paths?.[category] || profile.defaultPath || "", filename);
  await ensureGitHubWorkflow(profile);
  const response = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/${encodeURIComponent(workflow)}/dispatches`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${profile.token || ""}`,
        accept: "application/vnd.github+json",
        "x-github-api-version": "2022-11-28",
        "content-type": "application/json"
      },
      body: JSON.stringify({ ref, inputs: { source_url: sourceUrl, destination_path: destinationPath } })
    }
  );
  if (!response.ok) throw new Error(`GitHub dispatch failed (${response.status})`);
  return `${repo} → ${destinationPath}`;
}
async function ingest(profile, sourceUrl, category, filename) {
  const finalFilename = filename || basenameFromUrl(sourceUrl);
  if (!/^https:\/\//i.test(sourceUrl)) throw new Error("REDOWN accepts public HTTPS source URLs");
  if (profile.type === "cloudflare-r2") return ingestCloudflare(profile, sourceUrl, category, finalFilename);
  if (profile.type === "github") return ingestGitHub(profile, sourceUrl, category, finalFilename);
  throw new Error("Unsupported destination type");
}


function sanitizeMenuId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

function addPresetTree(profile, nodes, parentId, pathPrefix = []) {
  for (const node of nodes || []) {
    const nodeId = sanitizeMenuId(node.id || crypto.randomUUID());
    const fullPath = [...pathPrefix, nodeId];
    const menuId = `tree:${profile.id}:${fullPath.join(".")}`;
    const isLeaf = !Array.isArray(node.children) || node.children.length === 0;

    chrome.contextMenus.create({
      id: menuId,
      parentId,
      title: node.label || node.name || node.prefix || "Destination",
      contexts: ["link","image","video","audio","page"]
    });

    if (!isLeaf) {
      addPresetTree(profile, node.children, menuId, fullPath);
    }
  }
}

function addNestedLocations(profile){
  const locations=RedownNestedLocations.destinations(profile.nestedMenu);
  if(!locations.length)return;
  const parent=ROOT_MENU_ID;
  const contexts=["link","image","video","audio","page"];
  for(const item of locations){
    const id=`nested:${profile.id}:${item.rootId}:${item.nodeId}`;
    const parentNode=item.ids.length>1?item.ids.at(-2):item.rootId;
    const parentId=item.ids.length?`nested:${profile.id}:${item.rootId}:${parentNode}`:parent;
    chrome.contextMenus.create({id,parentId,title:item.name,contexts});
    if(locations.some(child=>child.rootId===item.rootId && child.ids.length===item.ids.length+1 && (item.ids.length===0 || child.ids.at(-2)===item.nodeId)))
      chrome.contextMenus.create({id:`${id}:send`,parentId:id,title:"Send here",contexts});
  }
}

let menuRebuildQueue=Promise.resolve();
async function rebuildMenus() {
  // Location verification can save several rows together. Chrome menu rebuilds
  // must finish in order so another removeAll cannot delete a pending parent.
  const operation=menuRebuildQueue.catch(()=>{}).then(buildMenus);
  menuRebuildQueue=operation;return operation;
}
async function buildMenus() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: ROOT_MENU_ID, title: "REDOWN", contexts: ["link","image","video","audio","page"]
  });

  const profiles = await getProfiles();
  const menuSettings=await chrome.storage.local.get(["rightClickMode","simpleLabelFallback"]);
  const storedMode=menuSettings.rightClickMode;
  const labelFallback=["bucket","deepest"].includes(menuSettings.simpleLabelFallback)?menuSettings.simpleLabelFallback:"menu";
  const mode=RedownNestedLocations.menuMode(storedMode,profiles);
  if(storedMode!=="simple" && storedMode!=="nested")await chrome.storage.local.set({rightClickMode:mode});
  const presets = profiles
    .filter(p => !p.explorerManaged && (mode==='nested'
      ? p.type==='cloudflare-r2' && (p.nestedMenu ? p.nestedMenu.enabled : p.menuTree?.length)
      : p.showInContextMenu !== false))
    .sort((a,b) => (a.menuOrder ?? 999) - (b.menuOrder ?? 999));

  if (!presets.length) {
    chrome.contextMenus.create({
      id:"redown-setup", parentId:ROOT_MENU_ID, title:"Set up a destination…",
      contexts:["link","image","video","audio","page"]
    });
    addMenuControls(mode);return;
  }

  for (const p of presets) {
    const title = p.menuLabel || p.name || p.bucketName || p.repository || "Destination";

    if(mode==='nested' && p.nestedMenu){
      addNestedLocations(p);
    } else if ((mode==='nested' || p.type==='github') && Array.isArray(p.menuTree) && p.menuTree.length) {
      const parentId = `preset:${p.id}`;
      chrome.contextMenus.create({
        id: parentId, parentId: ROOT_MENU_ID, title,
        contexts:["link","image","video","audio","page"]
      });
      addPresetTree(p, p.menuTree, parentId);
    } else if(mode==='simple' && p.type==='cloudflare-r2'){
      // Simple means one menu level regardless of R2 directory depth.
      // Keep stable IDs for click routing; labels are presentation only.
      const contexts=["link","image","video","audio","page"];
      const displayName=(label,prefix,bucket)=>{
        const explicit=String(label||"").trim();
        const segments=String(prefix||"").split("/").filter(Boolean);
        if(explicit)return explicit;
        return labelFallback==="bucket" ? (bucket||segments.at(-1)||"Destination") : (segments.at(-1)||bucket||"Destination");
      };
      chrome.contextMenus.create({
        id:`quick:${p.id}`,parentId:ROOT_MENU_ID,
        title:displayName(p.menuLabel,p.defaultPrefix,p.simpleBucketName||p.bucketName),contexts
      });
      for(const item of p.simpleOptions||[]){
        if(!item?.id || typeof item.prefix!=="string")continue;
        chrome.contextMenus.create({
          id:`simple-option:${p.id}:${item.id}`,parentId:ROOT_MENU_ID,
          title:displayName(item.label,item.prefix,item.bucketName||p.bucketName),contexts
        });
      }
    } else {
      chrome.contextMenus.create({
        id:`quick:${p.id}`, parentId:ROOT_MENU_ID, title,
        contexts:["link","image","video","audio","page"]
      });
    }
  }

  addMenuControls(mode);
}
function addMenuControls(mode){
  const contexts=["link","image","video","audio","page"];
  chrome.contextMenus.create({id:"redown-mode-separator",parentId:ROOT_MENU_ID,type:"separator",contexts});
  chrome.contextMenus.create({id:"redown-nested-mode",parentId:ROOT_MENU_ID,type:"checkbox",title:"Use nested menu",checked:mode==='nested',contexts});
  chrome.contextMenus.create({
    id:"redown-saved-urls",parentId:ROOT_MENU_ID,title:"View saved object's URLs…",
    contexts:["link","image","video","audio","page"]
  });
  chrome.contextMenus.create({
    id:"redown-manage", parentId:ROOT_MENU_ID, title:"Manage destinations…",
    contexts:["link","image","video","audio","page"]
  });
}


/* Explicit, opt-in gallery capture, scoped to a right-click action on hitomi.la.
 * First slice limits whole-file buffering to 64 MiB; larger galleries need
 * persistent streaming/multipart R2 upload, not unbounded MV3 service worker RAM.
 */
const hitomiIntents = new Map();
const HITOMI_QUEUE_KEY="redownHitomiQueueV1";
async function readHitomiQueue(){
  const data=await chrome.storage.local.get(HITOMI_QUEUE_KEY);
  return Array.isArray(data[HITOMI_QUEUE_KEY])?data[HITOMI_QUEUE_KEY]:[];
}
async function markHitomiQueue(id,patch){
  const jobs=await readHitomiQueue();
  const index=jobs.findIndex(job=>job.id===id);
  if(index<0)return;
  jobs[index]={...jobs[index],...patch,updatedAt:Date.now()};
  await chrome.storage.local.set({[HITOMI_QUEUE_KEY]:jobs});
}
async function retryPendingHitomi(){
  const jobs=await readHitomiQueue();
  for(const job of jobs){
    if(job.status==="complete"||job.status==="needs-tab"||job.nextAt>Date.now())continue;
    if(job.status==="capturing"&&Date.now()-(job.updatedAt||job.createdAt)<180000)continue;
    const tab=await chrome.tabs.get(job.tabId).catch(()=>null);
    if(!tab||tab.url!==job.url){
      await markHitomiQueue(job.id,{status:"needs-tab",lastError:"Reopen the original gallery and retry the right-click action; request retained."});
      continue;
    }
    const profiles=await getProfiles();
    try{
      await initiateHitomiCapture({menuItemId:job.menuId,pageUrl:job.url},tab,profiles,job.id);
    }catch(error){
      const retries=(job.retries||0)+1;
      await markHitomiQueue(job.id,{status:"pending",retries,nextAt:Date.now()+Math.min(300000,5000*Math.pow(2,Math.min(retries,6))),lastError:error?.message||String(error)});
    }
  }
}
chrome.alarms.onAlarm.addListener(alarm=>{
  if(alarm.name==="redown-hitomi-queue")retryPendingHitomi().catch(error=>console.warn("Hitomi queued retry",error));
});
chrome.runtime.onStartup.addListener(()=>retryPendingHitomi().catch(()=>{}));

const HITOMI_MAX_BYTES = 64 * 1024 * 1024;
function hitomiDestination(menuId, profiles) {
  const id=String(menuId);
  let m=id.match(/^simple-option:([^:]+):([^:]+)$/);
  if(m) {
    const p=profiles.find(x=>x.id===m[1] && x.type==="cloudflare-r2");
    const item=p?.simpleOptions?.find(x=>x.id===m[2]);
    if(!item)return null;
    const target=profiles.find(x=>x.type==="cloudflare-r2"&&x.accountId===p.accountId&&x.bucketName===(item.bucketName||p.bucketName));
    return target?{profile:target,prefix:item.prefix||""}:null;
  }
  m=id.match(/^quick:([^:]+)$/);
  if(m) {
    const p=profiles.find(x=>x.id===m[1]&&x.type==="cloudflare-r2");
    if(!p)return null;
    const target=profiles.find(x=>x.type==="cloudflare-r2"&&x.accountId===p.accountId&&x.bucketName===(p.simpleBucketName||p.bucketName));
    return target?{profile:target,prefix:p.defaultPrefix||""}:null;
  }
  m=id.match(/^nested:([^:]+):([^:]+):([^:]+)(?::send)?$/);
  if(m){
    const p=profiles.find(x=>x.id===m[1]&&x.type==="cloudflare-r2");
    const item=RedownNestedLocations.destinations(p?.nestedMenu).find(x=>x.rootId===m[2]&&x.nodeId===m[3]);
    return p&&item?{profile:{...p,bucketName:item.bucketName},prefix:item.prefix||""}:null;
  }
  m=id.match(/^tree:([^:]+):(.+)$/);
  if(m){
    const p=profiles.find(x=>x.id===m[1]&&x.type==="cloudflare-r2");
    let nodes=p?.menuTree||[],node;
    for(const key of m[2].split(".")){node=nodes.find(x=>sanitizeMenuId(x.id)===key);if(!node)return null;nodes=node.children||[];}
    if(nodes.length)return null;
    return {profile:p,prefix:node.prefix||""};
  }
  return null;
}
async function initiateHitomiCapture(info, tab, profiles,existingJobId=null) {
  const target=hitomiDestination(info.menuItemId,profiles);
  if(!target)throw new Error("Choose a prepared Cloudflare R2 destination");
  if(!tab?.id)throw new Error("No source tab found");
  const existing=hitomiIntents.get(tab.id);
  if(existing && Date.now()-existing.at<180000)throw new Error("A gallery capture is already active in this tab");
  const jobId=existingJobId||crypto.randomUUID();
  if(!existingJobId){
    const jobs=await readHitomiQueue();
    jobs.push({id:jobId,menuId:String(info.menuItemId),url:tab.url,tabId:tab.id,status:"pending",createdAt:Date.now(),updatedAt:Date.now(),retries:0,nextAt:0});
    await chrome.storage.local.set({[HITOMI_QUEUE_KEY]:jobs.slice(-250)});
  }
  hitomiIntents.set(tab.id,{...target,jobId,at:Date.now(),chunks:[],size:0,state:"armed"});
  await markHitomiQueue(jobId,{status:"capturing"});
  chrome.alarms.create("redown-hitomi-queue",{periodInMinutes:1});
  try {
    await chrome.scripting.executeScript({target:{tabId:tab.id},files:["hitomi-capture.js"],world:"ISOLATED"});
    await chrome.scripting.executeScript({
      target:{tabId:tab.id},world:"MAIN",
      func:()=>{
        const button=document.querySelector("#dl-button");
        if(!button)throw new Error("Hitomi Download button not found");
        const original=URL.createObjectURL;
        let captured=false;
        const onClick=(event)=>{
          const a=event.target?.closest?.("a[download]");
          if(a && a.href?.startsWith("blob:")){event.preventDefault();event.stopImmediatePropagation();}
        };
        document.addEventListener("click",onClick,true);
        URL.createObjectURL=function(object){
          const url=original.apply(this,arguments);
          if(!captured && object instanceof Blob && object.size>0 && (object.type==="" || /(?:zip|octet-stream)/i.test(object.type))){
            captured=true;
            window.postMessage({kind:"redown-hitomi-blob-ready",url,filename:document.querySelector("#gallery-brand")?.textContent?.trim()||"hitomi-gallery"},"*");
          }
          return url;
        };
        setTimeout(()=>{URL.createObjectURL=original;document.removeEventListener("click",onClick,true);},120000);
        button.click();
      }
    });
    await notify("REDOWN","Hitomi is preparing the gallery ZIP for your chosen R2 bucket.");
  }catch(e){hitomiIntents.delete(tab.id);await markHitomiQueue(jobId,{status:"pending",nextAt:Date.now()+15000,lastError:e?.message||String(e)});throw e;}
}
async function handleHitomiCaptureMessage(message,sender) {
  const tabId=sender.tab?.id;
  const intent=hitomiIntents.get(tabId);
  if(!intent)throw new Error("No active gallery capture. The queued request is retained; retry the right-click action.");
  if(!String(sender.url||"").startsWith("https://hitomi.la/"))throw new Error("Unexpected gallery origin");
  if(message.type==="hitomiCaptureError"){
    hitomiIntents.delete(tabId);
    const error=String(message.error||"Capture failed");
    await markHitomiQueue(intent.jobId,{status:"pending",nextAt:Date.now()+15000,lastError:error});
    await recordTransfer({ok:false,sourceUrl:sender.url,profileId:intent.profile?.id,profileName:intent.profile?.name||"Hitomi gallery",category:"files",error}).catch(()=>{});
    await notify("REDOWN gallery failed",error);
    return {ok:true};
  }
  if(message.type==="hitomiCaptureStart"){
    if(intent.state!=="armed")throw new Error("Capture already started");
    if(!Number.isSafeInteger(message.size)||message.size<=0||message.size>HITOMI_MAX_BYTES)throw new Error("Gallery ZIP exceeds the 64 MiB initial capture limit");
    intent.state="receiving";intent.expected=message.size;intent.filename=cleanExplorerName(message.filename||"hitomi-gallery.zip");
    intent.id=crypto.randomUUID();return {ok:true,id:intent.id};
  }
  if(intent.state!=="receiving"||intent.id!==message.id)throw new Error("Invalid transfer session");
  if(message.type==="hitomiCaptureChunk"){
    const binary=atob(message.data||"");
    if(binary.length>262144||intent.size+binary.length>intent.expected)throw new Error("Invalid gallery ZIP chunk");
    const buf=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)buf[i]=binary.charCodeAt(i);
    intent.chunks.push(buf);intent.size+=buf.length;return {ok:true};
  }
  if(message.type!=="hitomiCaptureFinish")throw new Error("Unknown gallery action");
  if(intent.size!==intent.expected)throw new Error("Incomplete gallery ZIP");
  intent.state="uploading";
  try{
    const prepared=await preparedProfile(intent.profile.accountId,intent.profile.bucketName,intent.profile.accountName);
    const folder=cleanExplorerPrefix(intent.prefix||"").replace(/\/$/,"");
    const response=await fetch(prepared.workerUrl,{
      method:"POST",headers:{
        authorization:`Bearer ${prepared.token||""}`,
        "content-type":"application/zip",
        "x-redown-action":"upload-local",
        "x-redown-filename":encodeURIComponent(intent.filename),
        "x-redown-folder":folder,
        "x-redown-public-base":prepared.publicBaseUrl||`${prepared.workerUrl}/assets`
      },body:new Blob(intent.chunks,{type:"application/zip"})
    });
    const body=await response.json().catch(()=>({}));
    if(!response.ok||!body.ok)throw new Error(body.error||`R2 upload failed (${response.status})`);
    const location=body.publicUrl||publicAssetUrl(prepared,body.key);
    const key=String(body.key||"");
    if(!key||key.split("/").slice(0,-1).join("/")!==folder)throw new Error("Destination verification failed. Check storage before retrying.");
    await recordTransfer({ok:true,sourceUrl:sender.url,profileId:intent.profile.id,profileName:intent.profile.name,category:"files",location,destination:{accountId:intent.profile.accountId,accountName:intent.profile.accountName||"",bucketName:intent.profile.bucketName,prefix:folder,key}});
    await markHitomiQueue(intent.jobId,{status:"complete",location});
    await notify("REDOWN gallery complete",location);
    return {ok:true,location};
  }catch(error){
    await markHitomiQueue(intent.jobId,{status:"pending",nextAt:Date.now()+30000,lastError:error?.message||String(error)});
    throw error;
  }finally{hitomiIntents.delete(tabId);}
}

// Toolbar presentation: Shelf by default, compact popup on explicit preference.
async function applyToolbarOpenMode() {
  const {toolbarOpenMode} = await chrome.storage.local.get('toolbarOpenMode');
  const mode = toolbarOpenMode === 'popup' ? 'popup' : 'shelf';
  // Popup mode still opens the toolbar Popup, but Settings needs the Shelf available.
  await chrome.sidePanel.setOptions({path:'shelf.html',enabled:true});
  await chrome.action.setPopup({popup:mode==='popup'?'popup.html':''});
}
chrome.action.onClicked.addListener(tab => {
  // Invoke open during the toolbar-click gesture; await would risk losing it.
  void chrome.sidePanel.open({windowId:tab.windowId}).catch(error=>{
    console.warn('REDOWN Shelf could not open:',error);
  });
});
chrome.runtime.onInstalled.addListener(()=>{void applyToolbarOpenMode().catch(console.error);});
chrome.runtime.onStartup.addListener(()=>{void applyToolbarOpenMode().catch(console.error);});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==='local'&&changes.toolbarOpenMode)void applyToolbarOpenMode().catch(console.error);
});
void applyToolbarOpenMode().catch(console.error);

chrome.runtime.onInstalled.addListener(rebuildMenus);
chrome.runtime.onStartup.addListener(rebuildMenus);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.profiles || changes.rightClickMode || changes.simpleLabelFallback)) rebuildMenus();
});
/* Cosmetic only. A context-menu gesture grants activeTab for a one-off effect.
   No persistent page injection, tracking, or new host permissions. Chrome does
   not let page DOM paint across its sidebar chrome: the orb ends at the page's
   right edge and a separate Shelf impact pulse completes the illusion. */
function launchSaveDroplet(info,tab){
  if(!Number.isInteger(tab?.id))return;
  const sources={
    src:String(info.srcUrl||"").slice(0,2048),
    link:String(info.linkUrl||"").slice(0,2048)
  };
  void chrome.scripting.executeScript({
    target:{tabId:tab.id},
    world:"ISOLATED",
    args:[sources],
    func:(clicked)=>{
      if(globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches)return;
      if(!document.documentElement||!document.body)return;
      void chrome.storage.local.get('shelfColorScheme').then(data=>{
        const colors={
          porcelain:['#bda3f4','#6743a2'],midnight:['#c0e6ff','#82c4fc'],
          ocean:['#9cf4e6','#2ccfc9'],neon:['#ff9ddb','#81fff0']
        };
        const theme=colors[data.shelfColorScheme]||colors.porcelain;
        let startX=Math.round(innerWidth*.56),startY=Math.round(innerHeight*.42);
        // Context-menu APIs omit cursor coordinates. Prefer the matching image
        // or link's visible center, never pretend to know an exact mouse point.
        if(clicked.src||clicked.link){
          const candidates=document.querySelectorAll('img[src],video[src],a[href]');
          const count=Math.min(candidates.length,800);
          for(let i=0;i<count;i++){
            const item=candidates[i];
            const url=String(item.currentSrc||item.href||item.src||'');
            if(url!==clicked.src&&url!==clicked.link)continue;
            const rect=item.getBoundingClientRect();
            if(rect.width>0&&rect.height>0&&rect.bottom>0&&rect.top<innerHeight&&rect.right>0&&rect.left<innerWidth){
              startX=Math.max(12,Math.min(innerWidth-12,rect.left+rect.width/2));
              startY=Math.max(12,Math.min(innerHeight-12,rect.top+rect.height/2));
              break;
            }
          }
        }
        const endX=innerWidth-10,endY=Math.max(65,Math.round(innerHeight*.29));
        const dx=endX-startX,dy=endY-startY;
        const orb=document.createElement('span');
        orb.setAttribute('aria-hidden','true');
        orb.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;'+
          'left:'+startX+'px;top:'+startY+'px;width:18px;height:18px;'+
          'margin:-9px 0 0 -9px;border-radius:50%;'+
          'background:radial-gradient(circle at 33% 29%,#fff 0%, '+theme[0]+' 36%, '+theme[1]+' 78%);'+
          'box-shadow:0 0 16px '+theme[0]+',0 0 31px '+theme[1]+';'+
          'will-change:transform,opacity;';
        document.documentElement.appendChild(orb);
        const motion=orb.animate([
          {offset:0,opacity:0,transform:'translate3d(0,0,0) scale(.4)'},
          {offset:.12,opacity:1,transform:'translate3d(0,0,0) scale(1)'},
          {offset:.55,opacity:1,transform:'translate3d('+(dx*.52)+'px,'+(dy*.43-76)+'px,0) scale(1.15)'},
          {offset:.88,opacity:1,transform:'translate3d('+(dx*.97)+'px,'+(dy*.96)+'px,0) scale(.8)'},
          {offset:.94,opacity:.9,transform:'translate3d('+dx+'px,'+dy+'px,0) scale(1.7,.4)'},
          {offset:1,opacity:0,transform:'translate3d('+dx+'px,'+dy+'px,0) scale(.05)'}
        ],{duration:860,easing:'cubic-bezier(.25,.65,.35,1)',fill:'forwards'});
        void motion.finished.then(()=>{
          orb.remove();
          const impact=document.createElement('span');
          impact.setAttribute('aria-hidden','true');
          impact.style.cssText='position:fixed;pointer-events:none;z-index:2147483647;left:'+(endX-15)+
            'px;top:'+(endY-15)+'px;width:30px;height:30px;border-radius:50%;border:2px solid '+theme[0]+';';
          document.documentElement.appendChild(impact);
          const ring=impact.animate([
            {opacity:.9,transform:'scale(.45)'},{opacity:0,transform:'scale(2.6)'}
          ],{duration:420,easing:'ease-out',fill:'forwards'});
          void ring.finished.finally(()=>impact.remove());
          void chrome.storage.local.set({redownShelfImpact:Date.now()}).catch(()=>{});
        }).catch(()=>orb.remove());
      }).catch(()=>{});
    }
  }).catch(()=>{/* Restricted tabs and browser pages deliberately skip the effect. */});
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if(info.menuItemId==='redown-nested-mode'){
    await chrome.storage.local.set({rightClickMode:info.checked ? 'nested' : 'simple'});
    return;
  }
  if(info.menuItemId==="redown-saved-urls"){
    const url=String(info.srcUrl||info.linkUrl||info.pageUrl||tab?.url||"");
    const {transferHistory=[]}=await chrome.storage.local.get("transferHistory");
    const saved=Array.isArray(transferHistory)?transferHistory.find(item=>
      item?.ok===true&&item.sourceUrl===url&&item.destination?.accountId&&
      item.destination?.bucketName&&item.destination?.key):null;
    if(!saved){
      await chrome.tabs.create({url:chrome.runtime.getURL("beta/explorer.html?savedUrlMissing=1")});
      return;
    }
    const token=crypto.randomUUID();
    await chrome.storage.session.set({["redownUrlLookup:"+token]:{
      accountId:saved.destination.accountId,bucketName:saved.destination.bucketName,
      key:saved.destination.key,createdAt:Date.now()
    }});
    await chrome.tabs.create({url:chrome.runtime.getURL("beta/explorer.html?savedUrls="+encodeURIComponent(token))});
    return;
  }
  if (info.menuItemId === "redown-setup" || info.menuItemId === "redown-manage") {
    return chrome.runtime.openOptionsPage();
  }

  if(/^(quick:|simple-option:|nested:|tree:)/.test(String(info.menuItemId)))launchSaveDroplet(info,tab);
  const profiles = await getProfiles();
  // Hitomi gallery Download is an anchor and can expose a javascript: or
  // same-page link. Do not mistake it for a remote downloadable asset.
  // Hitomi's Download control can be a link to a same-site HTML document.
  // Do not route gallery context-menu choices through generic URL ingestion.
  // Detect gallery pages by the currently loaded document (not the clicked
  // anchor href), and capture generated ZIP bytes for R2 destinations.
  const pageUrl=String(info.pageUrl||tab?.url||"");
  const onHitomiGallery=/^https:\/\/hitomi\.la\//i.test(pageUrl);
  const isGalleryDocument=/^https:\/\/hitomi\.la\/(?:imageset|doujinshi|manga|cg|gamecg|artistcg|galleries|reader|tag|series|character|group|type)\//i.test(pageUrl) &&
    !/\/(?:index|popular|search)\.html(?:[?#]|$)/i.test(pageUrl);
  const chosenDestination=/^(quick:|simple-option:|nested:|tree:)/.test(String(info.menuItemId));
  if(onHitomiGallery && isGalleryDocument && chosenDestination && !info.srcUrl){
    try { await initiateHitomiCapture(info,tab,profiles); }
    catch(error){
      console.error("REDOWN Hitomi capture failed to start",error);
      const message=error?.message||String(error);
      await recordTransfer({ok:false,sourceUrl:pageUrl,profileName:"Hitomi gallery capture",category:"files",error:message}).catch(()=>{});
      await notify("REDOWN gallery failed",message);
    }
    return;
  }
  const sourceUrl=selectedUrl(info);
  // Explicitly block accidental HTML transfers from Hitomi pages.
  if(onHitomiGallery && chosenDestination && !info.srcUrl &&
      /^https:\/\/hitomi\.la\/[^?#]+\.html(?:[?#]|$)/i.test(sourceUrl)){
    const message="Hitomi HTML pages cannot be uploaded as gallery ZIPs. Open the gallery and choose REDOWN from its Download control.";
    await recordTransfer({ok:false,sourceUrl,profileName:"Hitomi gallery capture",category:"files",error:message}).catch(()=>{});
    await notify("REDOWN gallery capture required",message);
    return;
  }

  const extraSimpleMatch=String(info.menuItemId).match(/^simple-option:([^:]+):([^:]+)$/);
  if(extraSimpleMatch){
    const profile=profiles.find(p=>p.id===extraSimpleMatch[1] && p.type==="cloudflare-r2");
    const item=profile?.simpleOptions?.find(x=>x.id===extraSimpleMatch[2]);
    if(!profile||!item)return notify("REDOWN","That Simple destination is no longer available.");
    try {
      const prefix=String(item.prefix||"").replace(/^\/+|\/+$/g,"");
      if(prefix.split("/").some(part=>part==="."||part===".."||part.includes("\\\\")))
        throw new Error("This destination has an invalid path. Edit it in Settings.");
      const selectedBucket=item.bucketName||profile.bucketName;
      const destinationProfile=profiles.find(p=>p.type==="cloudflare-r2" && p.accountId===profile.accountId && p.bucketName===selectedBucket);
      if(!destinationProfile)throw new Error("Selected bucket is not prepared for ReDown transfers. Prepare it in Cloudflare settings first.");
      const receipt={};
      const location=await ingestCloudflareAtPrefix(destinationProfile,sourceUrl,prefix,basenameFromUrl(sourceUrl),receipt);
      await recordTransfer({ok:true,sourceUrl,profileId:profile.id,profileName:profile.name,category:"files",location,...receipt});
      await notify("REDOWN complete",location);
    }catch(error){
      const message=error?.message||String(error);
      await recordTransfer({ok:false,sourceUrl,profileId:profile.id,profileName:profile.name,category:"files",error:message});
      await notify("REDOWN failed",message);
    }
    return;
  }

  const quickMatch = String(info.menuItemId).match(/^quick:([^:]+)$/);
  if (quickMatch) {
    const profile = profiles.find(p => p.id === quickMatch[1]);
    if (!profile) return notify("REDOWN", "That destination no longer exists.");
    try {
      const category = categoryForContext(info, sourceUrl, profile);
      const selectedBucket=profile.type==="cloudflare-r2" ? (profile.simpleBucketName||profile.bucketName) : "";
      const destinationProfile=selectedBucket!==profile.bucketName
        ? profiles.find(p=>p.type==="cloudflare-r2"&&p.accountId===profile.accountId&&p.bucketName===selectedBucket)
        : profile;
      if(selectedBucket&&!destinationProfile)throw new Error("Selected bucket is not prepared for ReDown transfers. Prepare it in Cloudflare settings first.");
      const receipt={};
      const location = profile.type === "cloudflare-r2"
        ? await ingestCloudflareAtPrefix(destinationProfile,sourceUrl,
            profile.defaultPrefix != null?profile.defaultPrefix:(profile.folders?.[category]||category),
            basenameFromUrl(sourceUrl),receipt)
        : await ingest(destinationProfile, sourceUrl, category);
      await recordTransfer({ ok:true, sourceUrl, profileId:profile.id, profileName:profile.name, category, location, ...receipt });
      await notify("REDOWN complete", location);
    } catch (error) {
      const message = error?.message || String(error);
      await recordTransfer({ ok:false, sourceUrl, profileId:profile.id, profileName:profile.name, category:profile.defaultCategory || "files", error:message });
      await notify("REDOWN failed", message);
    }
    return;
  }

  const nestedMatch=String(info.menuItemId).match(/^nested:([^:]+):([^:]+):([^:]+)(?::send)?$/);
  if(nestedMatch){
    const profile=profiles.find(p=>p.id===nestedMatch[1]);
    const destination=RedownNestedLocations.destinations(profile?.nestedMenu).find(item=>item.rootId===nestedMatch[2] && item.nodeId===nestedMatch[3]);
    if(!profile || !destination)return notify("REDOWN","That nested location is no longer available. Refresh it in settings.");
    const target={...profile,bucketName:destination.bucketName};
    try{
      const receipt={};
      const location=await ingestCloudflareAtPrefix(target,sourceUrl,destination.prefix,basenameFromUrl(sourceUrl),receipt);
      await recordTransfer({ok:true,sourceUrl,profileId:profile.id,profileName:profile.name,category:"files",location,...receipt});
      await notify("REDOWN complete",location);
    }catch(error){
      const message=error?.message || String(error);
      await recordTransfer({ok:false,sourceUrl,profileId:profile.id,profileName:profile.name,category:"files",error:message});
      await notify("REDOWN failed",message);
    }
    return;
  }

  const treeMatch = String(info.menuItemId).match(/^tree:([^:]+):(.+)$/);
  if (!treeMatch) return;

  const profile = profiles.find(p => p.id === treeMatch[1]);
  if (!profile) return notify("REDOWN", "That destination no longer exists.");

  const ids = treeMatch[2].split(".");
  let nodes = profile.menuTree || [];
  let node = null;
  for (const id of ids) {
    node = nodes.find(n => sanitizeMenuId(n.id) === id);
    if (!node) break;
    nodes = node.children || [];
  }
  if (!node || (Array.isArray(node.children) && node.children.length)) return;

  const category = node.category || profile.defaultCategory || "files";

  try {
    let location;
    const receipt={};
    if (profile.type === "cloudflare-r2") {
      const prefix = String(node.prefix ?? "").trim();
      location = await ingestCloudflareAtPrefix(
        profile,
        sourceUrl,
        prefix,
        basenameFromUrl(sourceUrl),receipt
      );
    } else if (profile.type === "github") {
      const originalPaths = profile.paths;
      try {
        profile.paths = { ...(profile.paths || {}), [category]: node.path ?? "" };
        location = await ingest(profile, sourceUrl, category);
      } finally {
        profile.paths = originalPaths;
      }
    } else {
      location = await ingest(profile, sourceUrl, category);
    }

    await recordTransfer({
      ok:true,
      sourceUrl,
      profileId:profile.id,
      profileName:profile.name,
      category,
      location,
      ...receipt
    });
    await notify("REDOWN complete", location);
  } catch (error) {
    const message = error?.message || String(error);
    await recordTransfer({
      ok:false,
      sourceUrl,
      profileId:profile.id,
      profileName:profile.name,
      category,
      error:message
    });
    await notify("REDOWN failed", message);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  const traceId=crypto.randomUUID();
  const traceStart=performance.now();
  const respond=sendResponse;
  sendResponse=value=>{
    try {if(message?.type!=="runtimeDiagnosticsV1")runtimeDiagnostics.record({operation:"message",requestId:traceId,durationMs:performance.now()-traceStart,outcome:value?.ok===false||value?.errors?.length||value?.partialMove?"failed":"success",code:value?.ok===false||value?.errors?.length||value?.partialMove?"UNKNOWN":"OK"});} catch {}
    const explorerDiagnostic=globalThis.redownExplorerBridge?.complete(message,value);
    respond({...value,correlationId:traceId,...(explorerDiagnostic?{explorerDiagnostic}:{})});
  };
  (async () => {
    try {
      if(message?.type==="runtimeDiagnosticsV1"){
        const allowed=_sender?.url===chrome.runtime.getURL("options.html");
        const {debugModeEnabled}=await chrome.storage.local.get("debugModeEnabled");
        if(!allowed||!debugModeEnabled)return sendResponse({ok:false,error:"Enable Debug Mode in Settings.",code:"DIAGNOSTICS_DISABLED"});
        const result=runtimeDiagnostics.query(message.operation,message.input);
        if(message.operation==="snapshot"){
          const {cloudflareAuth:auth}=await chrome.storage.local.get("cloudflareAuth");
          result.data.components.authorization=!auth?.accessToken?"disconnected":auth.reconnectRequired?"reconnect-required":auth.expiresAt&&Date.now()>=auth.expiresAt-60000?auth.refreshToken?"renewal-due":"reconnect-required":"credential-present";
          result.data.components.renewal=auth?.refreshToken?"credential-present":"unavailable";
          result.data.build={extensionVersion:chrome.runtime.getManifest().version,runtimeApiVersion:"1.0.0",workerCompatibility:"unknown"};
        }
        return sendResponse({ok:true,result});
      }
      if (message?.type === "explorerDiagnosticsV1") {
        const stored=await chrome.storage.local.get("debugModeEnabled");
        if(_sender?.url!==chrome.runtime.getURL("options.html")||stored.debugModeEnabled!==true)return sendResponse({ok:false,code:"DIAGNOSTICS_DISABLED"});
        await globalThis.redownExplorerBridge.ready;
        if(message.operation==="runReadOnlyProbe")return sendResponse({ok:true,result:await probeExplorerSource(message.input)});
        if(message.operation==="sessionContext")return sendResponse({ok:true,context:await globalThis.redownExplorerBridge.sessionContext()});
        return sendResponse({ok:true,result:globalThis.redownExplorerBridge.query(message.operation,message.input)});
      }
      const explorerTrace=await globalThis.redownExplorerBridge?.accept(message,_sender);
      if(explorerTrace)message.explorerTrace=explorerTrace;else delete message.explorerTrace;
      if(message?.type==="cfSearchStart")return sendResponse({ok:true,search:searchSessions.start(message.targets,message.query)});
      if(message?.type==="cfSearchStep")return sendResponse({ok:true,search:await searchSessions.step(message.sessionId)});
      if(message?.type==="cfSearchCancel")return sendResponse({ok:true,search:searchSessions.cancel(message.sessionId)});
      if(message?.type==="cfSearchRetry")return sendResponse({ok:true,search:searchSessions.retry(message.sessionId)});
      if (/^hitomiCapture(Start|Chunk|Finish|Error)$/.test(message?.type||"")) return sendResponse(await handleHitomiCaptureMessage(message,_sender));
      if (message?.type === "ingest") {
        const profiles = await getProfiles();
        let profile = profiles.find(p => p.id === message.profileId);
        if(message.destination){
          const target=message.destination;
          if(typeof target.accountId!=="string"||!target.accountId||typeof target.bucketName!=="string"||!target.bucketName)throw new Error("Choose a valid bucket.");
          profile=profiles.find(p=>p.type==="cloudflare-r2"&&p.accountId===target.accountId&&p.bucketName===target.bucketName);
          if(!profile){
            const buckets=await listBuckets(target.accountId);
            if(!buckets.some(bucket=>bucket.name===target.bucketName))throw new Error("The selected bucket is no longer available. Refresh the bucket list.");
            profile={id:"r2-bucket:"+JSON.stringify([target.accountId,target.bucketName]),type:"cloudflare-r2",accountId:target.accountId,bucketName:target.bucketName,accountName:typeof target.accountName==="string"?target.accountName:"",name:target.bucketName};
          }
        }
        if (!profile) throw new Error("Destination not found");
        const sourceUrl = String(message.sourceUrl || "");
        const category = message.category || "files";
        try {
          if(Object.hasOwn(message,"prefix")&&typeof message.prefix!=="string")throw new Error("Choose a valid destination folder.");
          const location = profile.type==="cloudflare-r2"&&Object.hasOwn(message,"prefix")
            ? await ingestCloudflareAtPrefix(profile,sourceUrl,cleanExplorerPrefix(message.prefix),message.filename||undefined,null,message.betaNoProvision===true)
            : await ingest(profile, sourceUrl, category, message.filename || undefined);
          await recordTransfer({ ok:true, sourceUrl, profileId:profile.id, profileName:profile.name, category, location });
          return sendResponse({ ok:true, location });
        } catch (error) {
          const errorMessage = error?.message || String(error);
          await recordTransfer({ ok:false, sourceUrl, profileId:profile.id, profileName:profile.name, category, error:errorMessage });
          throw error;
        }
      }
      if (message?.type === "cfConnect") return sendResponse({ ok:true, ...(await connectCloudflare()) });
      if (message?.type === "cfLoginStatus") { return sendResponse({ ok:true, ...(await RedownCloudflareAuth.status()) }); }
      if (message?.type === "cfLoginCancel") { await RedownCloudflareAuth.cancel(message.attemptId); return sendResponse({ ok:true }); }
      if (message?.type === "cfDisconnect") { await disconnectCloudflare(); return sendResponse({ ok:true }); }
      if (message?.type === "cfAccounts") return sendResponse({ ok:true, accounts:await listCloudflareAccounts() });
      if (message?.type === "cfBuckets") return sendResponse({ ok:true, buckets:await listBuckets(message.accountId) });
      if (message?.type === "cfCreateBucket") return sendResponse({ ok:true, bucket:await createBucket(message.accountId,message.name,message.locationHint) });
      if(message?.type==="cfSetupRedownQuick") {
        if(_sender?.url?.split(/[?#]/)[0]!==chrome.runtime.getURL("beta/explorer.html")||message.confirmed!==true)
          throw Error("Confirm REDOWN quick setup from Explorer first.");
        return sendResponse({ok:true,setup:await setupRedownQuickDestination(message.accountId,message.menuLabel)});
      }
      if (message?.type === "cfProvision") return sendResponse({ ok:true, profile:await provisionCloudflareProfile(message), verification:{workerReachable:true} });
      if (message?.type === "cfSetAssetCors" || message?.type === "cfSetAssetDomain") {
        return sendResponse({ ok:true, ...(await configureAssetDomain(message.accountId,message.bucketName,message.website)) });
      }
      if (message?.type === "cfEnablePublicAccess") return sendResponse(await enableBucketPublicAccess(message,_sender));
      if (message?.type === "cfPublicAddresses") return sendResponse({ok:true,...(await bucketPublicAddresses(message.accountId,message.bucketName))});
      if (message?.type === "cfObjects") return sendResponse({ ok:true, ...(await listObjects(message.accountId,message.bucketName,message.prefix,message.cursor)) });
      if (message?.type === "rfisExport") {
        const { rfisPreviewEnabled=false }=await chrome.storage.local.get("rfisPreviewEnabled");
        if(!rfisPreviewEnabled)throw new Error("Enable the experimental RFIS preview before exporting.");
        return sendResponse({ok:true,manifest:await RedownRFIS.exportJSON()});
      }
      if (message?.type === "cfFolderPrefixes") return sendResponse({ ok:true, prefixes:await listFolderPrefixes(message.accountId,message.bucketName,message.limit || 5000) });
      if (message?.type === "cfFolderChildren") return sendResponse({
        ok:true,
        children:await listFolderChildren(message.accountId,message.bucketName,message.parentPrefix || "",message.limit || 250)
      });
      if(message?.type==="cfDestinationFolders"){
        if(!message.accountId||!message.bucketName)throw new Error("Choose a bucket first.");
        const parent=cleanExplorerPrefix(message.prefix||"");
        const page=await listObjectsPage(message.accountId,message.bucketName,parent,message.cursor||"","/");
        if(page.cursor&&page.cursor===message.cursor||page.truncated&&!page.cursor)throw new Error("Cloudflare did not return a usable folder page. Retry.");
        const names=new Set();
        for(const path of [...page.delimited,...page.objects.map(object=>object.key||object.name||"")]){
          const key=String(path);if(!key.startsWith(parent))continue;
          const relative=key.slice(parent.length),slash=relative.indexOf("/");
          if(slash>0)names.add(relative.slice(0,slash));
        }
        return sendResponse({ok:true,folders:[...names].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(name=>({name,prefix:parent+name+"/"})),cursor:page.cursor||""});
      }
      if (message?.type === "cfSearchObjects") return sendResponse({ ok:true, results:await searchExplorerObjects(message.targets || [], message.query, message.limit || 200) });
      if (message?.type === "cfPrepareBucket") return sendResponse({ ok:true, profile:await preparedProfile(message.accountId,message.bucketName,message.accountName) });
      if (message?.type === "cfTransferObjects") {
        const result=await transferExplorerObjects(message);
        if(result.errors?.length||result.partialMove)void toolbarFeedback("failure");
        else if(result.completed>0)void toolbarFeedback("success");
        return sendResponse({ok:true,...result});
      }
      if (message?.type === "cfDeleteObjects") return sendResponse({ ok:true, ...(await deleteExplorerObjects(message)) });
      if (message?.type === "cfRenameEntry") return sendResponse({ ok:true, ...(await renameExplorerEntry(message)) });
      if (message?.type === "cfCreateFolder") return sendResponse({ ok:true, ...(await createExplorerFolder(message)) });
      if (message?.type === "cfEnsurePrefixes") {
        const profile=await preparedProfile(message.accountId,message.bucketName,message.accountName);
        return sendResponse({
          ok:true,
          ...(await callBucketWorker(profile,{
            action:"ensurePrefixes",
            prefixes:Array.isArray(message.prefixes)?message.prefixes:[]
          }))
        });
      }
      if (message?.type === "cfObjectProperties") {
        const key=cleanExplorerKey(message.key);
        const page=await listObjectsPage(message.accountId,message.bucketName,key);
        const object=page.objects.find(item=>(item.key||item.name)===key);
        if(!object)throw new Error(page.cursor?"Object metadata could not be confirmed. Refresh and retry.":"Object not found. Refresh this folder.");
        return sendResponse({ok:true,object:{...object,key,httpMetadata:object.httpMetadata||object.http_metadata||{},customMetadata:object.customMetadata||object.custom_metadata||{},uploaded:object.uploaded||object.last_modified}});
      }
      if (message?.type === "cfPrivateObjectUrl") {
        const profile=await preparedProfile(message.accountId,message.bucketName,message.accountName);
        const key=cleanExplorerKey(message.key);
        return sendResponse({ ok:true, ...(await callBucketWorker(profile,{action:"createReadUrl",key,ttl:message.ttl || 900})) });
      }
      if (message?.type === "cfArchiveEntries") {
        const profile=await preparedProfile(message.accountId,message.bucketName,message.accountName,false,message.explorerTrace,message.betaNoProvision===true);
        return sendResponse({ ok:true, ...(await callBucketWorker(profile,{action:"listArchive",key:message.key})) });
      }
      if (message?.type === "cfArchiveEntryUrl") {
        const profile=await preparedProfile(message.accountId,message.bucketName,message.accountName);
        return sendResponse({ ok:true, ...(await callBucketWorker(profile,{action:"createArchiveEntryReadUrl",key:message.key,entry:message.entry,contentType:message.contentType})) });
      }
      if (message?.type === "cfExtractArchive") {
        const profile=await preparedProfile(message.accountId,message.bucketName,message.accountName,false,message.explorerTrace,message.betaNoProvision===true);
        return sendResponse({ ok:true, ...(await callBucketWorker(profile,{action:"extractArchiveEntries",key:message.key,entries:message.entries,destinationPrefix:message.destinationPrefix || ""})) });
      }
      if (message?.type === "cfTransferArchive") {
        const source=await preparedProfile(message.source.accountId,message.source.bucketName,message.source.accountName);
        const destination=await preparedProfile(message.destination.accountId,message.destination.bucketName,message.destination.accountName);
        if(source.id===destination.id) return sendResponse({ok:true,...(await callBucketWorker(source,{action:"extractArchiveEntries",key:message.key,entries:message.entries,destinationPrefix:message.destination.prefix || ""}))});
        return sendResponse({ok:true,...(await callBucketWorker(destination,{action:"receiveArchiveEntries",sourceWorkerUrl:source.workerUrl,sourceToken:source.token,sourceKey:message.key,entries:message.entries,destinationPrefix:message.destination.prefix || ""}))});
      }
      if (message?.type === "cfDownloadObject") {
        const profile=await preparedProfile(message.accountId,message.bucketName,message.accountName);
        const key=cleanExplorerKey(message.key);
        if (!key) throw new Error("Choose a file to download");
        const signed=await callBucketWorker(profile,{action:"createReadUrl",key,ttl:3600});
        const downloadId=await chrome.downloads.download({ url:signed.url, filename:cleanExplorerName(message.filename || key.split("/").pop()), saveAs:message.saveAs !== false });
        return sendResponse({ ok:true, downloadId });
      }
      if (message?.type === "recordLocalTransfer") {
        await recordTransfer({
          ok: message.ok !== false,
          sourceUrl: "local-file",
          profileId: message.profileId,
          profileName: message.profileName,
          category: message.category || "files",
          location: message.location,
          error: message.error
        });
        return sendResponse({ ok:true });
      }
      if (message?.type === "deliveryCount") return sendResponse({ok:true,counter:await transferCounter.read()});
      if (message?.type === "profiles") return sendResponse({ ok:true, profiles:await getProfiles() });
      if (message?.type === "transferHistory") {
        const { transferHistory = [] } = await chrome.storage.local.get("transferHistory");
        return sendResponse({ ok:true, transferHistory });
      }
      if (message?.type === "renameTransfer") {
        return sendResponse({ ok:true, item:await renameTransferHistoryItem(message.id, message.newFilename) });
      }
      throw new Error("Unknown request");
    } catch (error) {
      if(message?.type==="cfTransferObjects")void toolbarFeedback("failure");
      sendResponse({ ok:false, error:error?.message || String(error),diagnosticError:{code:error?.code,status:error?.status,stage:error?.stage,component:"background"} });
    }
  })();
  return true;
});
