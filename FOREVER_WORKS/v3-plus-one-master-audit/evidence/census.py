"""Read-only static source census. Literal references are navigation, not a full parser."""
import subprocess,pathlib,json,hashlib,re
root=pathlib.Path('.')
paths=subprocess.check_output(['git','ls-files','extension'],text=True).splitlines()
rows=[]
for p in paths:
 if not p.endswith(('.js','.html','.json')) or '/vendor/' in p or 'model-viewer' in p:continue
 data=pathlib.Path(p).read_bytes()
 if len(data)>800000:continue
 text=data.decode('utf8'); lines=text.splitlines()
 patterns={'imports':r'importScripts\(|<script\b|\bimport\s','nativeMenuReferences':r'contextMenus\.', 'storageReferences':r'chrome\.storage\.|indexedDB|createObjectStore', 'lifecycle':r'\.on(?:Installed|Startup|Clicked|Message|Alarm|Changed)\.addListener', 'symbols':r'^\s*(?:async )?function\s+[\w$]+'}
 row={'path':p,'sha256':hashlib.sha256(data).hexdigest(),'lines':len(lines)}
 for kind,pattern in patterns.items():row[kind]=[{'line':i,'text':line.strip()[:500]} for i,line in enumerate(lines,1) if re.search(pattern,line)]
 rows.append(row)
head=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
pathlib.Path('FOREVER_WORKS/v3-plus-one-master-audit/evidence/source-census.json').write_text(json.dumps({'head':head,'method':'literal source references; dynamic wiring manually traced in chapters; excludes vendor and files over 800 KB','files':rows},indent=2)+'\n')
print(head,len(rows),'files')
