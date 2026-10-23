const $ = (id) => document.getElementById(id);
const urlInput=$("url"), filenameInput=$("filename"), profileSelect=$("profile"), categorySelect=$("category");
const send=$("send"), setup=$("setup"), status=$("status");
let popupProfiles=[],folderLevels=[],folderGeneration=0,profileGeneration=0,sending=false;
const currentProfile=()=>popupProfiles.find(profile=>profile.id===profileSelect.value);
const selectedPrefix=()=>folderLevels.filter(level=>level.selected).at(-1)?.selected||"";
function updateDestination(){
  const profile=currentProfile(),cloud=profile?.type==="cloudflare-r2";
  $("cloudflare-folders").hidden=!cloud;
  $("category-field").hidden=cloud;
  $("folder-deeper").disabled=sending||!cloud||!folderLevels.at(-1)?.selected||folderLevels.some(level=>level.loading);
  $("folder-destination").textContent=cloud?"Save to · "+profile.bucketName+" / "+(selectedPrefix()||"Bucket root"):"";
  send.disabled=sending||Boolean(cloud&&folderLevels.some(level=>level.loading));
}
function renderFolderLevels(focusIndex){
  const activeId=document.activeElement?.closest("#folder-levels")?document.activeElement.id:null;
  const host=$("folder-levels");host.replaceChildren();
  folderLevels.forEach((level,index)=>{
    const section=document.createElement("div");section.className="folder-level";
    const row=document.createElement("div");row.className="folder-row";
    const step=document.createElement("span");step.className="folder-step";step.textContent=String(index+1).padStart(2,"0");step.setAttribute("aria-hidden","true");
    const select=document.createElement("select");select.id="folder-level-"+index;select.setAttribute("aria-label","Folder level "+(index+1));select.disabled=sending||level.loading;
    const empty=document.createElement("option");empty.value="";empty.textContent=level.loading?"Loading folders…":index===0?"Bucket root":level.folders.length?"Stay in current folder":"No subfolders — stay here";select.append(empty);
    for(const folder of level.folders){const option=document.createElement("option");option.value=folder.prefix;option.textContent=folder.name;select.append(option);}
    select.value=level.selected;
    select.addEventListener("change",()=>{
      level.selected=select.value;folderLevels=folderLevels.slice(0,index+1);
      // A truncated parent selection invalidates all pending descendant replies.
      renderFolderLevels(index);
    });
    row.append(step,select);
    if(index>0){const remove=document.createElement("button");remove.type="button";remove.id="folder-remove-"+index;remove.className="folder-remove";remove.textContent="×";remove.disabled=sending;remove.title="Remove this level and deeper levels";remove.setAttribute("aria-label","Remove folder level "+(index+1)+" and deeper levels");remove.onclick=()=>{folderLevels=folderLevels.slice(0,index);renderFolderLevels(index-1);};row.append(remove);}
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
  const live=()=>generation===folderGeneration&&folderLevels[index]===level&&currentProfile()?.id===profile.id;
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
  folderLevels.push(level);renderFolderLevels(folderLevels.length-1);void loadFolderLevel(level,folderLevels.length-1,true);
}
function resetFolderLevels(){folderGeneration++;folderLevels=[];if(currentProfile()?.type==="cloudflare-r2")addFolderLevel();else renderFolderLevels();}
$("folder-deeper").addEventListener("click",()=>{if(!$("folder-deeper").disabled)addFolderLevel();});
profileSelect.addEventListener("change",resetFolderLevels);

function setStatus(message, kind=""){
  status.textContent=message||"";
  status.className="status"+(kind ? " "+kind : "");
}
async function loadProfiles(){
  const generation=++profileGeneration;
  const stored=await chrome.storage.local.get(["profiles","betaModeEnabled"]);
  if(generation!==profileGeneration)return;
  const profiles=(stored.profiles||[]).filter(profile=>profile.type!=="github"||stored.betaModeEnabled===true);
  const previousTarget=currentProfile(),previous=profileSelect.value;
  popupProfiles=profiles;
  profileSelect.replaceChildren();
  for(const profile of profiles){
    const option=document.createElement("option");
    option.value=profile.id;
    const detail=profile.type==="cloudflare-r2" ? profile.bucketName : profile.repository;
    option.textContent=profile.type==="cloudflare-r2"?profile.bucketName+(profile.name&&profile.name!==profile.bucketName?" · "+profile.name:""):profile.name+(detail?" · "+detail:"");
    profileSelect.append(option);
  }
  if(profiles.some(profile=>profile.id===previous))profileSelect.value=previous;
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
    setStatus("");
  }
  const nextTarget=currentProfile();
  if(previous===nextTarget?.id&&previousTarget?.accountId===nextTarget?.accountId&&previousTarget?.bucketName===nextTarget?.bucketName)updateDestination();else resetFolderLevels();
}
$("settings").addEventListener("click",()=>chrome.runtime.openOptionsPage());
setup.addEventListener("click",()=>chrome.runtime.openOptionsPage());

send.addEventListener("click",async()=>{
  const sourceUrl=urlInput.value.trim();
  if(!sourceUrl) return setStatus("Paste a remote HTTPS URL first.","bad");
  if(!profileSelect.value) return setStatus("Choose a destination first.","bad");
  if(sending||send.disabled)return;
  const profile=currentProfile(),prefix=selectedPrefix();
  sending=true;profileSelect.disabled=true;categorySelect.disabled=true;renderFolderLevels();
  send.disabled=true;
  send.textContent="Sending…";
  setStatus("The file is moving remotely. It does not download through this computer.");
  try{
    const result=await chrome.runtime.sendMessage({
      type:"ingest", sourceUrl, filename:filenameInput.value.trim(),
      profileId:profile.id, category:categorySelect.value,
      ...(profile.type==="cloudflare-r2"?{prefix}:{})
    });
    if(!result?.ok) throw new Error(result?.error||"Unknown error");
    setStatus("Stored → "+result.location,"ok");
  }catch(error){
    setStatus(error?.message||String(error),"bad");
  }finally{
    sending=false;profileSelect.disabled=!popupProfiles.length;categorySelect.disabled=false;renderFolderLevels();
    send.textContent="Send with REDOWN";
  }
});
chrome.storage.onChanged.addListener((changes,area)=>{
  if(area==="local"&&(changes.profiles||changes.betaModeEnabled))loadProfiles().catch(()=>setStatus("Could not load destinations. Reopen REDOWN to retry.","bad"));
});
loadProfiles().catch(()=>setStatus("Could not load destinations. Reopen REDOWN to retry.","bad"));