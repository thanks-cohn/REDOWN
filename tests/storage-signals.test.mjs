import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
const html=await readFile(new URL('../extension/options.html',import.meta.url),'utf8');
const code=await readFile(new URL('../extension/storage-signals.js',import.meta.url),'utf8');
function setup({ignoreCancel=false}={}){
 const dom=new JSDOM(html,{runScripts:'outside-only'}),document=dom.window.document;
 const realGrid=document.getElementById('bucket-grid');realGrid.textContent='Real storage remains unchanged';
 const scope={};vm.runInNewContext(code,scope);
 let now=0,id=0;const queue=new Map();
 const schedule=(fn,delay)=>{queue.set(++id,{fn,at:now+delay});return id;};
 const advance=ms=>{const end=now+ms;for(;;){const next=[...queue].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!next)break;queue.delete(next[0]);now=next[1].at;next[1].fn();}now=end;};
 const training=scope.RedownStorageSignals.mountTraining({document,schedule,cancel:id=>{if(!ignoreCancel)queue.delete(id);}});
 return {dom,document,training,advance,queue,realGrid};
}
test('guided simulation waits for the correct controls, completes, and settles',()=>{
 const h=setup(),d=h.document,buttons=d.querySelectorAll('.signal-demo-action');
 d.getElementById('run-storage-training').click();assert.equal(h.training.stage,'checking');
 h.advance(850);assert.equal(h.training.stage,'refresh');assert.equal(buttons[1].disabled,false);assert.equal(buttons[2].disabled,true);
 h.advance(20000);assert.equal(h.training.stage,'refresh','time alone cannot advance training');
 buttons[2].click();assert.equal(h.training.stage,'refresh');buttons[1].click();assert.equal(h.training.stage,'refreshing');
 h.advance(550);assert.equal(h.training.stage,'repair');assert.equal(buttons[2].disabled,false);
 buttons[2].click();assert.equal(h.training.stage,'repairing');h.advance(950);assert.equal(h.training.stage,'complete');
 for(const tile of d.querySelectorAll('.signal-demo-tile')){assert.equal(tile.dataset.signal,'ready');assert.equal(tile.querySelector('button').textContent,'✓');}
 assert.match(d.getElementById('storage-training-message').textContent,/simulated|Simulation/);
 h.advance(2400);assert.equal(h.training.stage,'rest');assert.equal(h.realGrid.textContent,'Real storage remains unchanged');
 h.dom.window.close();
});
test('reset and exit reject old callbacks even if timer cancellation loses a race',()=>{
 const h=setup({ignoreCancel:true}),d=h.document;
 h.training.start();h.advance(400);h.training.reset();h.advance(450);assert.equal(h.training.stage,'checking');
 h.training.exit();h.advance(5000);assert.equal(h.training.stage,'closed');assert.equal(d.getElementById('storage-training').hidden,true);
 assert.equal(d.activeElement.id,'run-storage-training');
 h.training.start();h.advance(850);assert.equal(h.training.stage,'refresh');
 d.getElementById('storage-training').dispatchEvent(new h.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 h.advance(5000);assert.equal(h.training.stage,'closed');assert.equal(h.realGrid.textContent,'Real storage remains unchanged');h.dom.window.close();
});
test('simulation executes without Chrome, fetch, messaging, profiles, or authentication',()=>{
 const h=setup();
 h.training.start();h.advance(850);h.document.querySelectorAll('.signal-demo-action')[1].click();h.advance(550);
 h.document.querySelectorAll('.signal-demo-action')[2].click();h.advance(3350);
 assert.equal(h.training.stage,'rest');assert.equal(h.realGrid.textContent,'Real storage remains unchanged');h.dom.window.close();
});
