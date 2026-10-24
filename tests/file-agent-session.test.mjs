import test from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';
import {createFileSession} from '../agent/files/api.mjs';import {fixture} from '../agent/aac/scenarios.mjs';
const id=key=>({provider:'fake-r2',account:'demo',container:'sandbox',key});
const req=(operation,args={})=>({apiVersion:'0.2.0',operation,idempotencyKey:crypto.randomUUID(),...args});
const make=(operations=['list','read','metadata','copy'],options={})=>{const f=fixture(options);return {...f,session:createFileSession({engine:f.engine,scope:{operations,locations:[id('Documents/')],maxOperations:4}})};};
test('scoped sessions execute canonical operations, correlate evidence and expose no runtime handles',async()=>{
 const {session,peek}=make();const discovered=await session.query('describe');assert.equal(discovered.state,'available');assert.equal(Object.keys(session).join(','),'query');
 const browse=await session.query('execute',{request:req('list',{source:id('Documents/'),limit:10})});assert.equal(browse.data.state,'completed');
 const copied=await session.query('execute',{request:req('copy',{source:id('Documents/Example.txt'),destination:id('Documents/copied.txt')})});assert.equal(copied.data.state,'completed');
 const bytes=o=>o.bytesBase64===undefined?Buffer.from(o.content):Buffer.from(o.bytesBase64,'base64');
 assert.deepEqual(bytes(peek().objects.find(o=>o.key==='Documents/copied.txt')),bytes(peek().objects.find(o=>o.key==='Documents/Example.txt')));
 for(const method of ['inspect','evidence'])assert.equal((await session.query(method,{id:copied.data.id})).state,'available');
 for(const metric of ['getTrace','getMemoryProfile','getLatencyBreakdown'])assert.equal((await session.query('resources',{id:copied.data.id,metric})).data.state,'available');
 assert.equal((await session.query('jobs',{limit:1})).data.nextOffset,1);
});
test('session scope intersects engine authority, prevents escapes and limits payloads',async()=>{
 const {session,peek}=make(['list','read']);const before=JSON.stringify(peek().objects);
 for(const request of [req('list',{source:id('')}),req('read',{source:id('Welcome.txt')}),req('copy',{source:id('Documents/Example.txt'),destination:id('Documents/copied.txt')})])assert.equal((await session.query('execute',{request})).error.code,'AUTHORIZATION_DENIED');
 assert.equal((await session.query('execute',{request:req('list',{source:id('Documents/'),limit:101})})).error.code,'RESPONSE_BUDGET');
 assert.equal((await session.query('execute',{request:{...req('list',{source:id('Documents/')}),privateField:true}})).error.code,'INVALID_INPUT');
 for(const method of ['store','recover','run','resources.store'])assert.equal((await session.query(method)).error.code,'UNSUPPORTED_OPERATION');
 assert.equal((await session.query('inspect',{id:'another-session-job'})).error.code,'AUTHORIZATION_DENIED');
 assert.equal(JSON.stringify(peek().objects),before);
 const denied=make(['list'],{authorize:()=>false});assert.equal((await denied.session.query('execute',{request:req('list',{source:id('Documents/')})})).data.state,'blocked_authorization');
 for(let i=0;i<4;i++)await session.query('execute',{request:req('list',{source:id('Documents/')})});
 assert.equal((await session.query('execute',{request:req('list',{source:id('Documents/')})})).error.code,'OPERATION_BUDGET');
});
test('actual stdio process rejects malformed lines and executes within explicitly launched simulation',async()=>{
 const child=spawn(process.execPath,['agent/files/cli.mjs','--simulation','--operations','list,read']);let stdout='',stderr='';child.stdout.on('data',b=>stdout+=b);child.stderr.on('data',b=>stderr+=b);
 const exited=new Promise(resolve=>child.on('close',resolve));child.stdin.end('bad JSON\n'+JSON.stringify({method:'describe'})+'\n'+JSON.stringify({method:'execute',input:{request:req('list',{source:id(''),limit:2})}})+'\n');
 assert.equal(await exited,0,stderr);const lines=stdout.trim().split('\n').map(JSON.parse);assert.equal(lines.length,3);assert.equal(lines[0].error.code,'INVALID_INPUT');assert.equal(lines[2].data.result.objects.length,2);
});
