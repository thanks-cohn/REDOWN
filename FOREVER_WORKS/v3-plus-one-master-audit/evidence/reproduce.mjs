// Audit-only fixture: current source in VM/JSDOM, synthetic identities, no network.
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {JSDOM} from 'jsdom';
const base=new URL('../../..',import.meta.url).pathname;
// Run from repository root. Deliberately no imports of production background.
const source=fs.readFileSync('extension/right-click-v3.js','utf8');
const c=vm.createContext({TextEncoder,setTimeout,clearTimeout});vm.runInContext(source,c);const m=c.RedownRightClickV3;
const p={id:'p',type:'cloudflare-r2',accountId:'a',bucketName:'bucket',workerUrl:'https://fixture.invalid',token:'synthetic'};
const d=(id,prefix,label=id,parentId=null,extra={})=>({id,profileId:'p',accountId:'a',bucketName:'bucket',prefix,label,parentId,enabled:true,...extra});
const cases=[
 ['01-common-last',[d('w','Art/Photography/Weddings'),d('p','Art/Photography/Portraits')]],
 ['02-diverge-two',[d('j','Art/Photography/Clients/John'),d('f','Art/Photography/Personal/Family')]],
 ['03-parent-selected',[d('a','Art'),d('b','Art/Photography','Photography','a'),d('c','Art/Photography/Portraits','Portraits','b')]],
 ['04-two-aliases',[d('c','Art/Photography/Portraits','Client Photography'),d('m','Art/Photography/Portraits','My Portraits')]],
 ['05-identical-label',[d('c','Art/Photography/Portraits','Photos'),d('m','Art/Photography/Portraits','Photos')]],
 ['06-alias-children',[d('c','Art/Photography','Client Photography'),d('m','Art/Photography','My Photos'),d('kid','Art/Photography/Portraits','Portraits','c')]],
 ['07-alternate-branch-attempt',[d('first','Art','Work'),d('second','Art','Personal'),d('one','Art/Photography','Work photos','first'),d('two','Art/Photography','Personal photos','second')]],
 ['08-same-label-scopes',[d('one','Art','Photos'),d('two','Other','Photos'),d('q','Art','Photos',null,{profileId:'q',accountId:'b'})]],
 ['09-prefix-case-unicode',[d('x','x'),d('xx','x-extra'),d('up','X'),d('u','写真/é'),d('u2','写真/é')]],
 ['10-disabled',[d('parent','Art','Art',null,{enabled:false}),d('child','Art/Photography','Photography','parent'),d('independent','Art/Independent')]],
 ['10-invalid-path',[d('bad','x/../z')]],['10-duplicate-id',[d('dup','x'),d('dup','y')]],
 ['10-revoked',[d('one','Art', 'Art',null,{accountId:'missing'})]],
 ['11-shared-modes',[d('shared','Art','Shared alias')]],
 ['12-root-alias',[d('root','','Independently named root',null,{profileId:'home',bucketName:'redown'})]]
];
const profiles=[p,{...p,id:'q',accountId:'b'},{...p,id:'home',bucketName:'redown'}];
const results=[];
function tree(entries){const lines=[];function walk(parent,depth){for(const e of entries.filter(e=>e.parentId===parent)){const branch=entries.some(x=>x.parentId===e.id),save=e.id.endsWith(':send')?'SAVE HERE':m.resolve(e.id,current,profiles,mode)?'SAVE':'NAV ONLY';lines.push('  '.repeat(depth)+(e.title||'────────')+' ['+(e.type==='separator'?'SEPARATOR':branch?'NAV ONLY':save)+'] '+e.id);walk(e.id,depth+1);}}walk('redown',0);return lines.join('\n');}
let current,mode;
for(const [name,records] of cases){current={version:1,revision:0,destinations:records};const r={name,config:current,checkmarks:records.map(d=>[d.id,d.enabled]),projections:{}};
 for(const style of ['simple','nested']){mode={style,nested:'narrow',depth:3};try{m.validate(current,profiles);const plan=m.project(current,profiles,mode,null);r.projections[style]={entries:plan.entries,tree:tree(plan.entries),routes:plan.entries.map(e=>{const t=m.resolve(e.id,current,profiles,mode,null);return {id:e.id,target:t?[t.profile.type,t.profile.id,t.profile.accountId,t.profile.bucketName,t.prefix]:null};}),staleRoute:m.resolve('v3:deleted',current,profiles,mode,null)};}catch(e){r.projections[style]={error:e.message};}}
 results.push(r);
}
const depthConfig={version:1,revision:0,destinations:[],levelScopes:{version:1,revision:0,buckets:[{id:'s',profileId:'p',accountId:'a',bucketName:'bucket',enabled:true}]}},calls=[];
const listing=async(a,b,prefix,cursor)=>{calls.push({a,b,prefix,cursor});return {delimited:prefix.split('/').filter(Boolean).length<5?[prefix+'L/']:[],objects:[]};};
const opts=depth=>({style:'nested',nested:'level',depth});let inv=await m.discover(depthConfig,[p],opts(5),listing,()=>100);const known5=inv.nodes.length;inv=await m.discover(depthConfig,[p],opts(3),listing,()=>200,inv);const known3=inv.nodes.length;inv=await m.discover(depthConfig,[p],opts(5),listing,()=>300,inv);
const depth={known5,known3,known5again:inv.nodes.length,calls,inventory:inv,projection:m.project(depthConfig,[p],opts(5),inv,'redown',300)};
const dom=new JSDOM(fs.readFileSync('extension/beta/explorer.html','utf8'),{runScripts:'outside-only',url:'https://fixture.invalid/beta/explorer.html'}),w=dom.window,uiCalls=[];
w.TextEncoder=TextEncoder;w.structuredClone=structuredClone;w.confirm=()=>false;w.chrome={storage:{onChanged:{addListener(){}}},runtime:{sendMessage:async msg=>{uiCalls.push(msg);if(msg.type==='rightClickV3Snapshot')return {ok:true,config:{version:1,revision:0,destinations:[]},profiles:[p],engine:'v3'};if(msg.type==='cfDestinationFolders')return {ok:true,folders:[{prefix:msg.prefix?msg.prefix+'/Child/':'Art/'}],cursor:''};throw Error(msg.type);}}};w.eval(source);w.eval(fs.readFileSync('extension/beta/right-click-v3-ui.js','utf8'));const settle=async()=>{for(let i=0;i<10;i++)await new Promise(r=>setTimeout(r,2));};await settle();
const outline=w.document.getElementById('v3-outline'),snapshot=label=>({label,requests:uiCalls.map(x=>({...x})),rows:[...outline.querySelectorAll('[role=treeitem]')].map(x=>x.dataset.key)}),browse=[snapshot('first-open')];
for(let i=0;i<2;i++){outline.querySelector('[data-key="bucket:p"] button').click();await settle();}browse.push(snapshot('bucket-collapse-expand'));
[...outline.querySelectorAll('button')].find(x=>x.textContent==='Browse folders').click();await settle();browse.push(snapshot('after-Browse'));
outline.querySelector('[data-key="folder:p:Art"] button').click();await settle();browse.push(snapshot('folder-arrow'));
fs.writeFileSync('FOREVER_WORKS/v3-plus-one-master-audit/evidence/observations.json',JSON.stringify({sourceSHA256:crypto.createHash('sha256').update(source).digest('hex'),cases:results,depth,browse},null,2)+'\n');dom.window.close();
console.log(JSON.stringify({cases:results.length,depth:{known5,known3,known5again:inv.nodes.length},browse:browse.map(s=>({label:s.label,folderRequests:s.requests.filter(x=>x.type==='cfDestinationFolders').length,rows:s.rows}))},null,2));
