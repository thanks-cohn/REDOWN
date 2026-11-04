/**
 * BOOT Golden 500 — deterministic fault-injection executor.
 * Harness proof ONLY. Not an installed-Chrome service-worker registration test.
 * Input: JSON {schemaVersion:1,cases:[{id,family,fault}]}.
 * Output: one JSON object per line, no credentials or URLs.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {worker, config} from '../tests/helpers/background-worker.mjs';

const ENTRY = readFileSync('extension/service-worker.js', 'utf8');
const argv = process.argv.slice(2);
const option = name => {
  const i = argv.indexOf(name);
  return i === -1 ? null : argv[i + 1];
};
const inputPath = option('--input');
const outputPath = option('--output');
if (!inputPath || !outputPath) {
  console.error('Usage: node scripts/boot-golden-matrix.mjs --input work/boot-golden/cases.json --output work/boot-golden/attempts.jsonl');
  process.exit(2);
}
const payload = JSON.parse(readFileSync(inputPath, 'utf8'));
if (payload.schemaVersion !== 1 || !Array.isArray(payload.cases) ||
    payload.cases.length > 500 || payload.cases.some(c => !/^BOOT-\d{3}$/.test(c.id))) {
  throw Error('Invalid Golden 500 case manifest');
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function drain(h) {
  await h.ready();
  await sleep(0);
}
const knownFamilies = [
  'baseline', 'fresh-empty', 'missing-id-cache', 'disconnected',
  'popup-preferred', 'stale-applying', 'stale-applied',
  'missing-destinations', 'disabled-destination', 'nested-selected',
  'depth-selected', 'two-destinations', 'unprepared-worker',
  'history-heavy', 'account-switched', 'reinstall-like-storage',
  'cold-worker-wake', 'missing-child-after-wake',
  'missing-root-after-wake', 'lost-cache-after-wake'
];
const knownFaults = [
  'none', 'panel-rejected', 'panel-synchronous-throw', 'popup-open-rejected',
  'popup-registration-rejected', 'panel-options-rejected', 'storage-rejected',
  'native-child-create-rejected', 'native-all-creates-rejected',
  'native-child-callback-lost', 'native-child-removal-rejected',
  'core-import-early', 'core-import-late', 'panel-close-rejected',
  'tab-create-rejected', 'window-create-rejected', 'remove-all-rejected',
  'panel-and-native-create', 'panel-and-lost-callback',
  'popup-registration-and-panel', 'storage-and-panel',
  'core-early-and-popup-registration', 'core-late-and-panel',
  'native-denial-and-storage', 'native-create-and-popup'
];
function faultFor(key) {
  if (!knownFaults.includes(key)) throw Error('Unknown fault: ' + key);
  const f = {};
  const flags = key.split('-and-');
  if (key === 'none') return f;
  if (key === 'panel-rejected' || key === 'panel-and-native-create' ||
      key === 'panel-and-lost-callback' || key === 'popup-registration-and-panel' ||
      key === 'storage-and-panel' || key === 'core-late-and-panel') f.panel = true;
  if (key === 'panel-synchronous-throw') f.syncPanel = true;
  if (key === 'popup-open-rejected') f.openPopup = true;
  if (key === 'popup-registration-rejected' || key === 'popup-registration-and-panel' ||
      key === 'core-early-and-popup-registration' || key === 'native-create-and-popup') f.setPopup = true;
  if (key === 'panel-options-rejected') f.options = true;
  if (key === 'storage-rejected' || key === 'storage-and-panel' || key === 'native-denial-and-storage') f.storage = true;
  if (key === 'native-child-create-rejected' || key === 'panel-and-native-create' ||
      key === 'native-create-and-popup') f.create = 'v3:one';
  if (key === 'native-all-creates-rejected' || key === 'native-denial-and-storage') f.allCreates = true;
  if (key === 'native-child-callback-lost' || key === 'panel-and-lost-callback') f.dropCallback = 'v3:one';
  if (key === 'native-child-removal-rejected') f.removeId = 'v3:one';
  if (key === 'core-import-early' || key === 'core-early-and-popup-registration') {
    f.backgroundSource = ENTRY; f.import = 'background.js';
  }
  if (key === 'core-import-late' || key === 'core-late-and-panel') {
    f.backgroundSource = ENTRY; f.import = 'cloudflare-api.js';
  }
  if (key === 'panel-close-rejected') { f.panel = true; f.close = true; }
  if (key === 'tab-create-rejected') f.tab = true;
  if (key === 'window-create-rejected') f.window = true;
  if (key === 'remove-all-rejected') f.remove = true;
  return f;
}
function changeLocal(local, family) {
  if (family === 'fresh-empty' || family === 'reinstall-like-storage') return {};
  if (family === 'missing-id-cache') delete local.rightClickNativeIds;
  if (family === 'disconnected') local.profiles = [];
  if (family === 'popup-preferred') local.toolbarOpenMode = 'popup';
  if (family === 'stale-applying') local.rightClickMenuStatus = {state:'applying', appliedGeneration:null};
  if (family === 'stale-applied') local.rightClickMenuStatus = {state:'registered', appliedGeneration:'outdated'};
  if (family === 'missing-destinations') local.rightClickV3.destinations = [];
  if (family === 'disabled-destination') local.rightClickV3.destinations[0].enabled = false;
  if (family === 'nested-selected') local.rightClickMode = 'narrow';
  if (family === 'depth-selected') local.rightClickMode = 'level';
  if (family === 'two-destinations') local.rightClickV3.destinations.push({
    ...structuredClone(local.rightClickV3.destinations[0]), id:'two', prefix:'second', label:'Second'
  });
  if (family === 'unprepared-worker') local.profiles[0].workerUrl = '';
  if (family === 'history-heavy') local.transferHistory = Array.from({length:70}, (_,i)=>({id:'prior-'+i}));
  if (family === 'account-switched') local.profiles[0].accountId = 'different-account';
  return local;
}
async function makeWorker(family, fault) {
  let local = changeLocal(config(), family);
  let nativeEntries = [];
  if (family.endsWith('-after-wake') || family === 'cold-worker-wake') {
    const prev = worker(); await drain(prev);
    local = prev.local;
    nativeEntries = [...prev.native];
    if (family === 'missing-child-after-wake') nativeEntries = nativeEntries.filter(([id])=>id!=='v3:one');
    if (family === 'missing-root-after-wake') nativeEntries = nativeEntries.filter(([id])=>id!=='redown');
    if (family === 'lost-cache-after-wake') delete local.rightClickNativeIds;
  }
  const injected = faultFor(fault);
  injected.nativeEntries = nativeEntries;
  return {h:worker(local, injected), injected};
}
async function evaluateCase(spec) {
  const start = performance.now();
  const checks = [];
  const check = (name, passed, evidence) => checks.push({name, passed:!!passed, ...(evidence?{evidence}: {})});
  try {
    if (!knownFamilies.includes(spec.family) || !knownFaults.includes(spec.fault)) throw Error('Unrecognized family/fault');
    const {h, injected} = await makeWorker(spec.family, spec.fault);
    await drain(h);
    const brokenCore = !!injected.import;
    const coreStatus = h.context.RedownWorkerCoreStatus || 'legacy-core-direct';
    const historyBefore = JSON.stringify(h.local.transferHistory);
    const beforeCalls = h.calls.length;
    check('one-toolbar-owner', h.chrome.action.onClicked.listeners.length === 1);
    check('at-most-one-menu-click-owner', h.chrome.contextMenus.onClicked.listeners.length <= 1);
    check('no-destructive-native-reset', !h.calls.some(c => c[0]==='removeAll'));
    check('core-failure-classified', brokenCore ? coreStatus==='failed' : coreStatus!=='failed');
    if (brokenCore) {
      const status = await h.context.RedownBoot.status();
      check('core-failure-not-falsely-ready', status.components.worker.state === 'failed' && status.overall === 'blocked');
    }
    if (!brokenCore && !injected.allCreates && !injected.storage && spec.family !== 'reinstall-like-storage') {
      check('recovery-root-present', h.native.has('redown'));
      check('recovery-manage-present', h.native.has('redown-manage'));
    }
    await h.click({id:1,windowId:7});
    await sleep(18);
    const newCalls = h.calls.slice(beforeCalls);
    check('toolbar-attempt-dispatched', newCalls.some(c=>['panel','nativePopup','attached'].includes(c[0])));
    check('no-detached-page-on-toolbar', !newCalls.some(c=>c[0]==='tab'||c[0]==='window'));
    check('no-menu-reset-after-gesture', !h.calls.some(c=>c[0]==='removeAll'));
    if (!injected.storage) check('history-preserved', JSON.stringify(h.local.transferHistory)===historyBefore);
    if (!brokenCore && !injected.storage && !injected.allCreates && !injected.dropCallback &&
        !injected.create && !injected.removeId && !injected.setPopup) {
      const state = (await h.context.RedownBoot.status()).components.nativeMenu;
      check('registered-generation-not-invented', state.visibleRows === 'not-verifiable');
    }
    const failed=checks.filter(x=>!x.passed).map(x=>x.name);
    return {id:spec.id,family:spec.family,fault:spec.fault,status:failed.length?'FAIL':'PASS',
      failureCodes:failed,durationMs:Math.round((performance.now()-start)*10)/10,checks};
  } catch(e) {
    return {id:spec.id,family:spec.family,fault:spec.fault,status:'ERROR',
      failureCodes:['HARNESS_EXCEPTION'],errorClass:e?.name || 'Error',
      errorMessage:String(e?.message||'unknown').replace(/synthetic|fixture\.invalid/gi,'[redacted]').slice(0,200),
      durationMs:Math.round((performance.now()-start)*10)/10,checks};
  }
}
let failures=0;
const results=[];
for (const spec of payload.cases) {
  const record=await evaluateCase(spec);
  results.push(JSON.stringify(record));
  if (record.status!=='PASS') failures++;
}
writeFileSync(outputPath, results.join('\n')+'\n', 'utf8');
console.log(JSON.stringify({schemaVersion:1, cases:results.length,failures,output:outputPath,evidence:'VM_MOCK_ONLY'}));
if (failures) process.exitCode=1;
