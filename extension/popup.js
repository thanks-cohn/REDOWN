const $ = (id) => document.getElementById(id);
const urlInput=$("url"), filenameInput=$("filename"), profileSelect=$("profile"), categorySelect=$("category");
const send=$("send"), setup=$("setup"), status=$("status");
let popupProfiles=[],folderLevels=[],folderGeneration=0,profileGeneration=0,sending=false;
let destinationEpoch=0,restoringDestination=false,restoreBlocked=false,hasRestored=false,rememberQueue=Promise.resolve();
let connectionBusy=false,loginTimer=null,loginDeadline=0;
function paintConnection(state,label){
  const button=$("connection");button.dataset.state=state;button.title=label;button.setAttribute("aria-label",label);button.disabled=connectionBusy;
}
async function followLogin(){
  try{
    const result=await popupDiscovery({type:"cfLoginStatus"});
    if(!result?.ok)throw Error("Connection status unavailable");
    if(["opening","authorizing","verifying"].includes(result.phase)){
      if(Date.now()>loginDeadline)throw Error("Sign-in is taking longer than expected. Click the connection light to retry.");
      loginTimer=setTimeout(followLogin,1000);return;
    }
    connectionBusy=false;
    if(result.phase!=="connected"&&result.phase!=="complete"&&result.phase!=="success"){
      // The account read below is the authority for connection readiness.
      if(["failed","cancelled","canceled"].includes(result.phase))throw Error(result.error||"Sign-in was not completed. Click the connection light to retry.");
    }
    await loadProfiles();
  }catch(error){connectionBusy=false;paintConnection("disconnected","Cloudflare unavailable — click to reconnect");setStatus(error.message||"Could not reconnect. Click the connection light to retry.","bad");}
}
$("connection").addEventListener("click",async()=>{
  if(connectionBusy)return;
  if($("connection").dataset.state==="connected"){void loadProfiles();return;}
  connectionBusy=true;paintConnection("checking","Connecting to Cloudflare…");setStatus("Complete Cloudflare sign-in in the window that opens.");
  try{
    const result=await popupDiscovery({type:"cfConnect"});
    if(!result?.ok)throw Error(result?.error||"Could not open Cloudflare sign-in. Click the connection light to retry.");
    loginDeadline=Date.now()+5*60*1000;await followLogin();
  }catch(error){connectionBusy=false;paintConnection("disconnected","Cloudflare disconnected — click to reconnect");setStatus(error.message,"bad");}
});
globalThis.addEventListener?.("pagehide",()=>clearTimeout(loginTimer));
if(chrome.storage.session?.get)chrome.storage.session.get("cloudflareLogin").then(stored=>{if(["opening","authorizing","verifying"].includes(stored.cloudflareLogin?.phase)){connectionBusy=true;paintConnection("checking","Connecting to Cloudflare…");loginDeadline=Date.now()+5*60*1000;void followLogin();}}).catch(()=>{});
const currentProfile=()=>popupProfiles.find(profile=>profile.id===profileSelect.value);
const selectedPrefix=()=>folderLevels.filter(level=>level.selected).at(-1)?.selected||"";
function updateDestination(){
  const profile=currentProfile(),cloud=profile?.type==="cloudflare-r2";
  $("cloudflare-folders").hidden=!cloud;
  $("category-field").hidden=cloud;
  $("folder-deeper").disabled=sending||!cloud||!folderLevels.at(-1)?.selected||folderLevels.some(level=>level.loading);
  $("folder-destination").textContent=cloud?"Save to · "+profile.bucketName+" / "+(selectedPrefix()||"Bucket root"):"";
  send.disabled=sending||restoringDestination||restoreBlocked||!profile||Boolean(cloud&&folderLevels.some(level=>level.loading));
}
function renderFolderLevels(focusIndex){
  const activeId=document.activeElement?.closest("#folder-levels")?document.activeElement.id:null;
  const host=$("folder-levels");host.replaceChildren();
  folderLevels.forEach((level,index)=>{
    const section=document.createElement("div");section.className="folder-level";
    const row=document.createElement("div");row.className="folder-row";
    const step=document.createElement("span");step.className="folder-step";step.textContent=String(index+1);step.setAttribute("aria-hidden","true");
    const select=document.createElement("select");select.id="folder-level-"+index;select.setAttribute("aria-label","Folder level "+(index+1));select.disabled=sending||level.loading;
    const empty=document.createElement("option");empty.value="";empty.textContent=level.loading?"Loading folders…":index===0?"Bucket root":level.folders.length?"Stay in current folder":"No subfolders — stay here";select.append(empty);
    for(const folder of level.folders){const option=document.createElement("option");option.value=folder.prefix;option.textContent=folder.name;select.append(option);}
    select.value=level.selected;
    select.addEventListener("change",()=>{
      level.selected=select.value;folderLevels=folderLevels.slice(0,index+1);
      // A truncated parent selection invalidates all pending descendant replies.
      destinationEdited();renderFolderLevels(index);rememberDestination();
    });
    row.append(step,select);
    if(index>0){const remove=document.createElement("button");remove.type="button";remove.id="folder-remove-"+index;remove.className="folder-remove";remove.textContent="×";remove.disabled=sending;remove.title="Remove this level and deeper levels";remove.setAttribute("aria-label","Remove folder level "+(index+1)+" and deeper levels");remove.onclick=()=>{folderLevels=folderLevels.slice(0,index);destinationEdited();renderFolderLevels(index-1);rememberDestination();};row.append(remove);}
    section.append(row);
    if(level.error||level.cursor){const note=document.createElement("div");note.className="folder-note";
      if(level.error){const text=document.createElement("span");text.textContent="Folders could not be loaded. ";note.append(text);}
      const retry=document.createElement("button");retry.type="button";retry.id="folder-retry-"+index;retry.textContent=level.error?"Retry":"Load more folders";retry.disabled=sending||level.loading;retry.onclick=()=>loadFolderLevel(level,index);note.append(retry);section.append(note);
    }
    host.append(section);
  });
  updateDestination();
  const focus=focusIndex!==undefined?$("folder-level-"+focusIndex):activeId?$(activeId):null;
  if(focus&&!focus.disabled)focus.focus({preventScroll:true});
}
async function loadFolderLevel(level,index,focusOnReady=false){
  const profile=currentProfile(),generation=folderGeneration;
  if(!profile?.accountId){level.error="Connection details unavailable";level.loading=false;renderFolderLevels();return;}
  const live=()=>generation===folderGeneration&&folderLevels[index]===level&&currentProfile()?.accountId===profile.accountId&&currentProfile()?.bucketName===profile.bucketName;
  level.loading=true;level.error="";renderFolderLevels();let timer;
  try{
    const response=await Promise.race([
      chrome.runtime.sendMessage({type:"cfDestinationFolders",accountId:profile.accountId,bucketName:profile.bucketName,prefix:level.parent,cursor:level.cursor||""}),
      new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Folder request timed out")),12000);})
    ]);
    if(!live())return;
    if(!response?.ok||!Array.isArray(response.folders))throw Error("Folder listing unavailable");
    const folders=response.folders;
    if(folders.some(folder=>typeof folder?.name!=="string"||typeof folder.prefix!=="string"||!folder.prefix.startsWith(level.parent)||folder.prefix===level.parent||!folder.prefix.endsWith("/")))throw Error("Invalid folder listing");
    if(response.cursor!==undefined&&typeof response.cursor!=="string")throw Error("Invalid folder cursor");
    if(response.cursor&&level.cursors.has(response.cursor))throw Error("Repeated folder page");
    if(response.cursor)level.cursors.add(response.cursor);
    const known=new Set(level.folders.map(folder=>folder.prefix));
    for(const folder of folders)if(!known.has(folder.prefix)){level.folders.push(folder);known.add(folder.prefix);}
    level.cursor=response.cursor||"";
  }catch{if(live())level.error="Folder listing unavailable";}
  finally{clearTimeout(timer);if(live()){level.loading=false;renderFolderLevels(focusOnReady&&document.activeElement===document.body?index:undefined);}}
}
function addFolderLevel(){
  const level={parent:selectedPrefix(),selected:"",folders:[],cursor:"",cursors:new Set(),loading:false,error:""};
  folderLevels.push(level);renderFolderLevels(folderLevels.length-1);return loadFolderLevel(level,folderLevels.length-1,true);
}
function resetFolderLevels(){folderGeneration++;folderLevels=[];if(currentProfile()?.type==="cloudflare-r2")return addFolderLevel();else renderFolderLevels();}
$("folder-deeper").addEventListener("click",()=>{if(!$("folder-deeper").disabled){destinationEdited();void addFolderLevel();rememberDestination();}});
profileSelect.addEventListener("change",()=>{destinationEdited();void resetFolderLevels();rememberDestination();});
categorySelect.addEventListener("change",()=>{destinationEdited();rememberDestination();});
function destinationEdited(){destinationEpoch++;restoringDestination=false;restoreBlocked=false;}
function rememberDestination(){
  const profile=currentProfile();if(!profile||restoringDestination)return;
  const value={version:1,profileId:profile.id,accountId:profile.accountId||"",bucketName:profile.bucketName||"",prefix:selectedPrefix(),depth:folderLevels.length,category:categorySelect.value};
  rememberQueue=rememberQueue.catch(()=>{}).then(()=>chrome.storage.local.set({popupDestination:value})).catch(()=>setStatus("This destination could not be remembered. Your current selection is still available.","bad"));
}
async function restoreDestination(saved){
  const epoch=destinationEpoch,live=()=>epoch===destinationEpoch;
  restoringDestination=true;updateDestination();
  try{
    if(["3d","2d","files"].includes(saved.category))categorySelect.value=saved.category;
    if(currentProfile()?.type!=="cloudflare-r2")return;
    const prefix=saved.prefix;if(typeof prefix!=="string"||prefix.length>1024||prefix.includes("\0")||prefix&&!prefix.endsWith("/"))throw Error("Saved folder is invalid. Choose a destination again.");
    let parent="",index=0;
    while(parent!==prefix){
      if(!live())return;
      const level=folderLevels[index];if(!level)throw Error("Saved folder could not be restored. Choose a destination again.");
      let folder=level.folders.find(folder=>prefix.startsWith(folder.prefix));
      for(let page=0;!folder&&level.cursor&&!level.error&&page<100;page++){
        await loadFolderLevel(level,index);if(!live())return;folder=level.folders.find(folder=>prefix.startsWith(folder.prefix));
      }
      if(!folder)throw Error(level.error?"Saved folder could not be loaded. Refresh or choose a destination.":"Saved folder is no longer available. Choose a destination again.");
      level.selected=folder.prefix;parent=folder.prefix;renderFolderLevels();index++;
      if(parent!==prefix){await addFolderLevel();if(!live())return;}
    }
    if(Number.isInteger(saved.depth)&&saved.depth>folderLevels.length&&saved.depth<=512){await addFolderLevel();if(!live())return;}
  }catch(error){if(live()){restoreBlocked=true;setStatus(error.message,"bad");}}
  finally{if(live()){restoringDestination=false;renderFolderLevels();}}
}

function setStatus(message, kind=""){
  status.textContent=message||"";
  status.className="status"+(kind ? " "+kind : "");
}
async function popupDiscovery(message){
  let timer;
  try{return await Promise.race([chrome.runtime.sendMessage(message),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error("Bucket listing timed out")),12000);})]);}
  finally{clearTimeout(timer);}
}
async function loadProfiles(){
  const generation=++profileGeneration,epochAtStart=destinationEpoch;
  $("bucket-refresh").disabled=true;
  if(!popupProfiles.length)setStatus("Loading buckets…");
  try{
  const stored=await chrome.storage.local.get(["profiles","betaModeEnabled","cloudflareAuth","popupDestination"]);
  if(generation!==profileGeneration)return;
  let profiles=(stored.profiles||[]).filter(profile=>profile.type!=="github"||stored.betaModeEnabled===true);
  let discoveryWarning="";
  let connectionConfirmed=false;
  paintConnection("checking",connectionBusy?"Connecting to Cloudflare…":"Checking Cloudflare connection…");
  if(stored.cloudflareAuth?.accessToken){
    try{
      const response=await popupDiscovery({type:"cfAccounts"});
      if(!response?.ok||!Array.isArray(response.accounts))throw Error("Accounts unavailable");
      connectionConfirmed=true;
      const accounts=response.accounts,choices=[],discovered=new Set();
      for(let offset=0;offset<accounts.length;offset+=4){
        const batch=accounts.slice(offset,offset+4);
        const results=await Promise.allSettled(batch.map(account=>popupDiscovery({type:"cfBuckets",accountId:account.id})));
        if(generation!==profileGeneration)return;
        results.forEach((result,index)=>{
          const account=batch[index],value=result.status==="fulfilled"?result.value:null;
          if(!value?.ok||!Array.isArray(value.buckets)){
            discoveryWarning="Some buckets could not be refreshed. Saved destinations remain available.";
            choices.push(...profiles.filter(p=>p.type==="cloudflare-r2"&&p.accountId===account.id));return;
          }
          for(const bucket of value.buckets){
            if(typeof bucket?.name!=="string"||!bucket.name)continue;
            const identity=JSON.stringify([account.id,bucket.name]);if(discovered.has(identity))continue;discovered.add(identity);
            const saved=profiles.find(p=>p.type==="cloudflare-r2"&&p.accountId===account.id&&p.bucketName===bucket.name);
            choices.push({...saved,id:saved?.id||"r2-bucket:"+identity,type:"cloudflare-r2",accountId:account.id,accountName:account.name||"",bucketName:bucket.name,name:saved?.name||bucket.name,popupAccountLabel:accounts.length>1?account.name||account.id:""});
          }
        });
      }
      profiles=[...choices,...profiles.filter(p=>p.type!=="cloudflare-r2")];
    }catch{discoveryWarning="Buckets could not be refreshed. Saved destinations remain available; click the connection light to reconnect.";}
  }
  if(!connectionBusy)paintConnection(connectionConfirmed?"connected":"disconnected",connectionConfirmed?"Cloudflare connected — click to check again":"Cloudflare disconnected or unavailable — click to reconnect");
  const previousTarget=currentProfile(),previous=profileSelect.value;
  popupProfiles=profiles;
  profileSelect.replaceChildren();
  for(const profile of profiles){
    const option=document.createElement("option");
    option.value=profile.id;
    const detail=profile.type==="cloudflare-r2" ? profile.bucketName : profile.repository;
    option.textContent=profile.type==="cloudflare-r2"?profile.bucketName+(profile.name&&profile.name!==profile.bucketName?" · "+profile.name:""):profile.name+(detail?" · "+detail:"");
    if(profile.popupAccountLabel)option.textContent+=" · "+profile.popupAccountLabel;
    profileSelect.append(option);
  }
  const saved=!hasRestored&&stored.popupDestination?.version===1?stored.popupDestination:null;
  const savedTarget=saved&&profiles.find(profile=>saved.bucketName?profile.type==="cloudflare-r2"&&profile.accountId===saved.accountId&&profile.bucketName===saved.bucketName:profile.id===saved.profileId);
  const preserved=profiles.find(profile=>profile.id===previous)||profiles.find(profile=>profile.type==="cloudflare-r2"&&previousTarget?.type==="cloudflare-r2"&&profile.accountId===previousTarget.accountId&&profile.bucketName===previousTarget.bucketName)||savedTarget;
  if(preserved)profileSelect.value=preserved.id;
  const empty=!profiles.length;
  send.hidden=empty;
  setup.hidden=!empty;
  if(empty){
    const option=document.createElement("option");
    option.textContent="No destination yet";
    profileSelect.append(option);
    profileSelect.disabled=true;
    setStatus(stored.betaModeEnabled===true?"Add a Cloudflare or GitHub destination in Settings.":"Connect Cloudflare in Settings, or enable Beta Mode for experimental GitHub destinations.");
  }else{
    profileSelect.disabled=sending;
    if(!sending)setStatus(discoveryWarning,discoveryWarning?"bad":"");
  }
  const nextTarget=currentProfile();
  if(!saved&&previousTarget?.type===nextTarget?.type&&previousTarget?.accountId===nextTarget?.accountId&&previousTarget?.bucketName===nextTarget?.bucketName&&(nextTarget?.type==="cloudflare-r2"||previous===nextTarget?.id))updateDestination();else await resetFolderLevels();
  if(generation!==profileGeneration)return;
  if(!hasRestored){
    hasRestored=true;
    if(destinationEpoch!==epochAtStart){updateDestination();return;}
    if(saved&&!savedTarget){restoreBlocked=true;const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="Choose a bucket";profileSelect.prepend(placeholder);profileSelect.value="";setStatus("Your saved destination is unavailable. Choose a bucket to continue.","bad");updateDestination();}
    else if(saved)await restoreDestination(saved);
  }
  }finally{if(generation===profileGeneration)$("bucket-refresh").disabled=sending;}
}
$("bucket-refresh").addEventListener("click",()=>{if(restoreBlocked){hasRestored=false;destinationEdited();}void loadProfiles().catch(()=>setStatus("Could not load buckets. Retry Refresh or reconnect in Settings.","bad"));});
$("settings").addEventListener("click",()=>chrome.runtime.openOptionsPage());
setup.addEventListener("click",()=>chrome.runtime.openOptionsPage());

send.addEventListener("click",async()=>{
  const sourceUrl=urlInput.value.trim();
  if(!sourceUrl) return setStatus("Paste a remote HTTPS URL first.","bad");
  if(!profileSelect.value) return setStatus("Choose a destination first.","bad");
  if(sending||send.disabled)return;
  const profile=currentProfile(),prefix=selectedPrefix();
  sending=true;profileSelect.disabled=true;categorySelect.disabled=true;$("bucket-refresh").disabled=true;renderFolderLevels();
  send.disabled=true;
  send.textContent="Sending…";
  setStatus("The file is moving remotely. It does not download through this computer.");
  try{
    const result=await chrome.runtime.sendMessage({
      type:"ingest", sourceUrl, filename:filenameInput.value.trim(),
      profileId:profile.id, category:categorySelect.value,
      ...(profile.type==="cloudflare-r2"?{prefix,destination:{accountId:profile.accountId,bucketName:profile.bucketName,accountName:profile.accountName||""}}:{})
    });
    if(!result?.ok) throw new Error(result?.error||"Unknown error");
    setStatus("Stored → "+result.location,"ok");
  }catch(error){
    setStatus(error?.message||String(error),"bad");
  }finally{
    sending=false;profileSelect.disabled=!popupProfiles.length;categorySelect.disabled=false;$("bucket-refresh").disabled=false;renderFolderLevels();
    send.textContent="Send it home";
  }
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&(changes.profiles||changes.betaModeEnabled||changes.cloudflareAuth))loadProfiles().catch(()=>setStatus("Could not load destinations. Reopen REDOWN to retry.","bad"));
});
loadProfiles().catch(()=>setStatus("Could not load destinations. Reopen REDOWN to retry.","bad"));