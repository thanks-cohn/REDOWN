import vm from 'node:vm';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
export async function runContextMenuTrial(){
 const source=await readFile(new URL('../../extension/background.js',import.meta.url),'utf8');let listener,opened=0,providerCalls=0;const created=[];
 const context=vm.createContext({ROOT_MENU_ID:'REDOWN',chrome:{contextMenus:{create:item=>created.push(structuredClone(item)),onClicked:{addListener:fn=>{listener=fn;}}},runtime:{openOptionsPage:async()=>{opened++;}},storage:{local:{set:async()=>{throw Error('UNEXPECTED_SETTING_MUTATION');}}}},getProfiles:async()=>{providerCalls++;throw Error('UNEXPECTED_PROVIDER_DISCOVERY');}});
 const begin=source.indexOf('function addMenuControls(mode)'),end=source.indexOf('/* Explicit, opt-in gallery capture',begin);assert.ok(begin>=0&&end>begin);
 vm.runInContext(source.slice(begin,end),context);vm.runInContext("addMenuControls('simple')",context);
 const menu=created.find(m=>m.id==='redown-manage');assert.equal(menu.parentId,'REDOWN');assert.ok(menu.contexts.includes('page'));
 const handler=source.indexOf('chrome.contextMenus.onClicked.addListener(async (info, tab) => {'),boundary=source.indexOf('  const profiles = await getProfiles();',handler);assert.ok(handler>=0&&boundary>handler);
 vm.runInContext(source.slice(handler,boundary)+'});',context);
 await listener({menuItemId:menu.id});assert.equal(opened,1);assert.equal(providerCalls,0);
 return {registration:menu.id,operation:'chrome.runtime.openOptionsPage',authorization:'Native browser context-menu dispatch; no filesystem authority',result:'Options page opened exactly once; zero provider discovery or writes',scope:'Executed exact source fragments with mocked Chrome APIs, not installed-extension proof',test:'tests/context-menu-agent.test.mjs'};
}
