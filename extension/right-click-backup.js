/* User-selected independent files. AES-GCM authenticates metadata; raw cloud
 * credentials are never part of this schema. No automatic cloud provisioning. */
(() => {
  'use strict';
  const encoder=new TextEncoder(),decoder=new TextDecoder(),limit=32*1024*1024;
  const names=['state','records','journal','pointers','backups'];
  const b64=bytes=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
  const un64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  function validate(bundle){
    if(!bundle||bundle.format!=='redown-right-click'||bundle.schemaVersion!==1||bundle.requiresReconnect!==true||!Number.isFinite(bundle.exportedAt)||!bundle.stores||Object.keys(bundle.stores).sort().join()!==[...names].sort().join())throw Error('Unsupported directory backup schema.');
    if(JSON.stringify(RedownRightClickCurrent.safe(bundle))!==JSON.stringify(bundle))throw Error('Backup contains disallowed credential fields.');
    for(const name of names){
      const rows=bundle.stores[name];if(!Array.isArray(rows)||rows.length>100000)throw Error('Invalid backup records.');const ids=new Set();
      for(const r of rows){if(!r||typeof r.id!=='string'||r.id.length>20000||ids.has(r.id))throw Error('Duplicate or invalid backup record.');ids.add(r.id);}
    }
    if(bundle.journalJSONL!==bundle.stores.journal.map(event=>JSON.stringify(event)).join('\n'))throw Error('Journal integrity mismatch.');
    const allowed=['rightClickV3','rightClickV3Presentation','rightClickV3LevelScopes','rightClickActivatedBuckets','rightClickV3Inventory'];
    for(const r of bundle.stores.state){
      if(!allowed.includes(r.id))throw Error('Unknown CURRENT record.');
      if(r.id==='rightClickV3'){
        if(r.value?.version!==1||!Number.isSafeInteger(r.value.revision)||r.value.revision<0||!Array.isArray(r.value.destinations)||r.value.destinations.length>200)throw Error('Invalid destination configuration.');
        const ids=new Set();for(const d of r.value.destinations){
          if(!/^[a-zA-Z0-9_-]{1,80}$/.test(d.id)||ids.has(d.id)||typeof d.label!=='string'||!d.label.trim()||d.label.length>60||typeof d.enabled!=='boolean'||typeof d.profileId!=='string'||typeof d.accountId!=='string'||typeof d.bucketName!=='string'||typeof d.prefix!=='string'||d.prefix&&d.prefix.split('/').some(p=>!p||p==='.'||p==='..')||/[\\\x00-\x1f\x7f]/.test(d.prefix))throw Error('Invalid restored destination.');ids.add(d.id);
        }
        for(const d of r.value.destinations){const seen=new Set([d.id]);let node=d;while(node.parentId!==null){const parent=r.value.destinations.find(p=>p.id===node.parentId);if(!parent||seen.has(parent.id)||parent.profileId!==node.profileId||parent.accountId!==node.accountId||parent.bucketName!==node.bucketName||!node.prefix.startsWith(parent.prefix?parent.prefix+'/':''))throw Error('Invalid restored hierarchy.');seen.add(parent.id);node=parent;}}
      }
      if(r.id==='rightClickV3Presentation'&&!['simple','nested'].includes(r.value?.style))throw Error('Invalid restored presentation.');
    }
    const validNamespace=ns=>{
      if(ns==='settings')return;
      let tuple;try{tuple=JSON.parse(ns);}catch{throw Error('Invalid provider identity.');}
      if(!Array.isArray(tuple)||tuple.length!==5||tuple[0]!=='cloudflare-r2'||tuple.slice(1).some(s=>typeof s!=='string')||!tuple[1]||!tuple[2]||!tuple[4])throw Error('Invalid provider identity.');
      if(tuple[3]){const u=new URL(tuple[3]);if(u.protocol!=='https:'||u.username||u.password||u.search||u.hash)throw Error('Unsafe provider endpoint.');}
    };
    for(const r of bundle.stores.records){
      validNamespace(r.namespace);let key;try{key=JSON.parse(r.id);}catch{throw Error('Invalid record identity.');}
      if(!Array.isArray(key)||key.length!==3||key[0]!==r.namespace||key[1]!==r.kind)throw Error('Record identity mismatch.');
      if(r.kind==='directory'){
        const n=r.value,tuple=JSON.parse(r.namespace);
        if(!n||n.profileId!==tuple[1]||n.accountId!==tuple[2]||n.bucketName!==tuple[4]||key[2]!==n.prefix||typeof n.prefix!=='string'||/[\\\x00-\x1f\x7f]/.test(n.prefix)||n.prefix&&n.prefix.split('/').some(p=>!p||p==='.'||p==='..')||n.level!==(n.prefix?n.prefix.split('/').length:0)||n.parent!==(n.prefix?n.prefix.split('/').slice(0,-1).join('/'):null))throw Error('Invalid directory binding.');
      }
    }
    for(const p of bundle.stores.pointers){validNamespace(p.id);if(!Number.isSafeInteger(p.generation)||p.generation<0||p.desired!==p.generation)throw Error('Invalid CURRENT generation.');}
    for(const r of [...bundle.stores.journal,...bundle.stores.backups])validNamespace(r.namespace);
    return bundle;
  }
  async function key(passphrase,salt){
    if(typeof passphrase!=='string'||passphrase.length<12)throw Error('Use a backup passphrase of at least 12 characters.');
    const material=await crypto.subtle.importKey('raw',encoder.encode(passphrase),'PBKDF2',false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:210000},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  }
  async function encode(bundle,passphrase){
    validate(bundle);const bytes=encoder.encode(JSON.stringify(bundle));if(bytes.length>limit)throw Error('Backup exceeds the supported 32 MiB size.');
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv},await key(passphrase,salt),bytes);
    return JSON.stringify({format:'redown-encrypted-directory-backup',version:1,kdf:'PBKDF2-SHA256-210000',salt:b64(salt),iv:b64(iv),ciphertext:b64(new Uint8Array(encrypted))});
  }
  async function decode(text,passphrase){
    if(typeof text!=='string'||text.length>limit*1.5)throw Error('Invalid backup size.');
    let envelope;try{envelope=JSON.parse(text);}catch{throw Error('Invalid backup file.');}
    if(envelope.format!=='redown-encrypted-directory-backup'||envelope.version!==1||envelope.kdf!=='PBKDF2-SHA256-210000')throw Error('Unsupported encrypted backup.');
    try{
      const salt=un64(envelope.salt),iv=un64(envelope.iv);if(salt.length!==16||iv.length!==12)throw Error();
      const plaintext=await crypto.subtle.decrypt({name:'AES-GCM',iv},await key(passphrase,salt),un64(envelope.ciphertext));
      return validate(JSON.parse(decoder.decode(plaintext)));
    }catch{throw Error('Backup integrity, schema or passphrase check failed. Nothing was restored.');}
  }
  globalThis.RedownRightClickBackup=Object.freeze({validate,encode,decode});
})();
