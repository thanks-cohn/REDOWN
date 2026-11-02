import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import vm from 'node:vm';

const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
const source=await readFile(new URL('../extension/options.js',import.meta.url),'utf8');
const beginning=source.indexOf('// R2-Ask is an isolated Debug Mode-only visual preview.');
const end=source.indexOf('function applyBetaMode(){',beginning);
if(beginning<0||end<0)throw Error('R2-Ask Debug Mode handlers are unavailable.');
const handlers=source.slice(beginning,end);

function harness(){
  const dom=new JSDOM(html,{runScripts:'outside-only',url:'https://example.test/options.html'});
  const document=dom.window.document;
  const dialog=document.getElementById('r2-ask-dialog');
  const calls=[];
  dialog.showModal=()=>{calls.push('open');dialog.open=true;};
  dialog.close=()=>{calls.push('close');dialog.open=false;dialog.dispatchEvent(new dom.window.Event('close'));};
  const context=vm.createContext({document,debugModeEnabled:false,storageTraining:null,
    $:id=>document.getElementById(id),applyOnboarding:()=>{},applyBetaMode:()=>{}});
  vm.runInContext(handlers,context);
  return {dom,document,dialog,calls,context};
}

test('R2-Ask stays hidden and inert in normal mode; opens only after Debug is enabled and clicked',()=>{
  const h=harness(),d=h.document,trigger=d.getElementById('debug-r2-ask');
  assert.equal(d.querySelector('[data-debug-detail]').hidden,true);
  assert.equal(h.dialog.open,false);
  trigger.click();
  assert.deepEqual(h.calls,[]);
  vm.runInContext('applyDebugMode()',h.context);
  trigger.click();
  assert.deepEqual(h.calls,[],'normal mode does not open the dialog');
  h.context.debugModeEnabled=true;
  vm.runInContext('applyDebugMode()',h.context);
  assert.equal(d.querySelector('[data-debug-detail]').hidden,false);
  assert.equal(h.dialog.open,false,'Debug enable alone does not auto-open R2-Ask');
  trigger.click();
  assert.deepEqual(h.calls,['open']);
  trigger.click();
  assert.deepEqual(h.calls,['open'],'repeated clicks do not stack dialogs');
  assert.equal(d.activeElement,d.getElementById('r2-ask-dismiss'));
  h.dom.window.close();
});

test('R2-Ask dismissal restores focus and disabling Debug closes the popup',()=>{
  const h=harness(),d=h.document,trigger=d.getElementById('debug-r2-ask');
  h.context.debugModeEnabled=true;
  vm.runInContext('applyDebugMode()',h.context);
  trigger.click();
  d.getElementById('r2-ask-later').click();
  assert.equal(h.dialog.open,false);
  assert.equal(d.activeElement,trigger);
  trigger.click();
  d.getElementById('r2-ask-dismiss').click();
  assert.equal(h.dialog.open,false);
  trigger.click();
  h.context.debugModeEnabled=false;
  vm.runInContext('applyDebugMode()',h.context);
  assert.equal(h.dialog.open,false);
  assert.equal(d.querySelector('[data-debug-detail]').hidden,true);
  trigger.click();
  assert.equal(h.dialog.open,false);
  h.dom.window.close();
});

test('R2-Ask preview is non-mutating and offers an external R2 setup link',()=>{
  const d=new JSDOM(html).window.document;
  const link=d.getElementById('r2-ask-enable');
  assert.ok(link);
  assert.equal(link.target,'_blank');
  assert.match(link.rel,/noopener/);
  assert.match(link.href,/dash\.cloudflare\.com/);
  assert.equal(d.getElementById('r2-ask-dialog').open,false);
  assert.match(d.getElementById('r2-ask-description').textContent,/R2 and enjoy the REDOWN ecosystem/i);
  assert.doesNotMatch(handlers.slice(0,handlers.indexOf('const oneDriveTest=')),/chrome\.runtime|cfCreateBucket|cfSetupRedownQuick|cfProvision|fetch\(|send\(/);
});

test('OneDrive Test stays in the Debug dropdown and runs only on explicit click',async()=>{
  const h=harness(),d=h.document,button=d.getElementById('debug-onedrive-test'),messages=[];
  h.context.chrome={runtime:{sendMessage:async request=>{
    messages.push(request.type);return {ok:true,code:'DIAGNOSTIC_OK',message:'Read-only check passed.'};
  }}};
  assert.equal(button.closest('#settings-disclosure')!==null,true);
  assert.equal(button.closest('[data-debug-detail]').hidden,true);
  button.click();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(messages,[],'not accessible before Debug Mode');
  h.context.debugModeEnabled=true;
  vm.runInContext('applyDebugMode()',h.context);
  assert.equal(button.closest('[data-debug-detail]').hidden,false);
  assert.deepEqual(messages,[],'turning on Debug does not start Microsoft login');
  button.click();await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(messages,['onedriveDiagnostic']);
  assert.match(d.getElementById('debug-onedrive-test-status').textContent,/Passed:/);
  h.context.debugModeEnabled=false;
  vm.runInContext('applyDebugMode()',h.context);
  button.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(messages.length,1,'diagnostic stays inert after Debug Mode is disabled');
  assert.equal(d.getElementById('shelf-onedrive-diagnostic'),null);
  h.dom.window.close();
});
