import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import vm from "node:vm";

const background=await readFile(new URL("../extension/background.js",import.meta.url),"utf8");
const legacy=await readFile(new URL("../extension/options.js",import.meta.url),"utf8");
const html=await readFile(new URL("../extension/options.html",import.meta.url),"utf8");

function isolateFunction(source,name){
  const start=source.indexOf("function "+name+"(");
  assert.ok(start>=0,name+" must exist");
  const end=source.indexOf("\n}",start);
  assert.ok(end>start,name+" must have a closing line");
  const context={};
  vm.runInNewContext(source.slice(start,end+2)+"\nthis.fn="+name+";",context);
  return context.fn;
}
const fromContext=isolateFunction(background,"contextUrlsFromMenu");
const ordered=isolateFunction(legacy,"historySourceLinks");
const native=value=>JSON.parse(JSON.stringify(value));

test("right-click image keeps page, direct media, frame and link independently",()=>{
  const captured=native(fromContext({
    pageUrl:"https://example.test/gallery?topic=art",
    srcUrl:"https://cdn.example.test/image.webp",
    frameUrl:"https://frames.example.test/embed",
    linkUrl:"https://publisher.example.test/article"
  },{url:"https://fallback.example.test"}));
  assert.deepEqual(captured,{
    pageUrl:"https://example.test/gallery?topic=art",
    srcUrl:"https://cdn.example.test/image.webp",
    frameUrl:"https://frames.example.test/embed",
    linkUrl:"https://publisher.example.test/article"
  });
  const links=native(ordered({...captured,sourceUrl:captured.srcUrl}));
  assert.deepEqual(links.map(x=>x.label),["Parent webpage","Direct image / media URL","Frame URL","Link URL"]);
  assert.equal(links[1].url,captured.srcUrl);
});

test("partial browser context still records available URLs without inventing missing URLs",()=>{
  const captured=native(fromContext({pageUrl:"https://site.test/view",linkUrl:"https://files.test/download"},{}));
  assert.deepEqual(captured,{pageUrl:"https://site.test/view",linkUrl:"https://files.test/download"});
  const links=native(ordered({...captured,sourceUrl:captured.linkUrl}));
  assert.deepEqual(links.map(x=>x.label),["Parent webpage","Direct link URL"]);
  const tabFallback=native(fromContext({srcUrl:"https://cdn.test/p.jpg"},{url:"https://tabs.test/page"}));
  assert.equal(tabFallback.pageUrl,"https://tabs.test/page");
  assert.equal(tabFallback.srcUrl,"https://cdn.test/p.jpg");
  assert.equal(Object.hasOwn(tabFallback,"frameUrl"),false);
});

test("old transfers without context fields retain their existing download source",()=>{
  assert.deepEqual(native(ordered({sourceUrl:"https://archive.example.test/item.zip"})),[
    {label:"Download source URL",url:"https://archive.example.test/item.zip"}
  ]);
  assert.deepEqual(native(ordered({sourceUrl:""})),[]);
  assert.deepEqual(native(fromContext({},{})),{});
});

test("both successful and failed history entries render collapsible URL rows without hijacking destination clicks",()=>{
  assert.match(legacy,/row\.append\(sources\)/);
  assert.match(legacy,/copy\.append\(sources\)/);
  assert.match(legacy,/closest\("button,input,a,\.download-location,\.download-name,\.history-sources"\)/);
  assert.match(legacy,/details\.addEventListener\("toggle"/);
  assert.match(html,/\.history-source-address\{[^}]*overflow-wrap:anywhere/);
  assert.match(legacy,/target\.rel="noopener noreferrer"/);
  assert.match(legacy,/target\.referrerPolicy="no-referrer"/);
});

test("all normal menu receipt branches and asynchronous gallery receipts retain context URLs",()=>{
  const handler=background.slice(background.indexOf("chrome.contextMenus.onClicked.addListener"),background.indexOf("\n});\n\nchrome.runtime.onMessage.addListener"));
  assert.ok(handler.includes("contextUrlsFromMenu(info,tab)"));
  assert.ok((handler.match(/await recordContextTransfer\(/g)||[]).length>=6);
  assert.ok(background.includes("contextUrls,tabId:tab.id"));
  assert.ok(background.includes("...intent.contextUrls,ok:true"));
  assert.ok(background.includes("...intent.contextUrls,ok:false"));
});
