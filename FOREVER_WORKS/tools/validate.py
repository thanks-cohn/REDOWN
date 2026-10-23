"""Independent published-schema, source-anchor, upstream-byte and domain-link checks."""
import hashlib,json,sys
from pathlib import Path
from jsonschema import Draft202012Validator,RefResolver
ROOT=Path(__file__).resolve().parents[2]
F=ROOT/'forever';UP=ROOT/'FOREVER_WORKS/upstream/forever-works'
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def validate():
 errors=[];schema_store={}
 for p in (UP/'schemas').glob('*.json'):
  s=json.loads(p.read_text());schema_store[s['$id']]=s
 def check(doc,schema):
  validator=Draft202012Validator(schema,resolver=RefResolver.from_schema(schema,store=schema_store))
  return [e.message for e in validator.iter_errors(doc)]
 manifest=json.loads((F/'manifest.json').read_text())
 schemas={p.name:json.loads(p.read_text()) for p in (UP/'schemas').glob('*.json')}
 errors+=check(manifest,schemas['manifest.schema.json'])
 kinds={'intent':'project-intent','dependency':'dependency-intent','compatibility':'compatibility-contract'}
 docs=[]
 for group,paths in manifest['records'].items():
  for p in paths:
   if not (F/p).resolve().is_relative_to(F):errors.append('path escape '+p);continue
   b=(F/p).read_text();d=json.loads(b);docs.append(d)
   errors += [p+': '+e for e in check(d,schemas[kinds.get(d['kind'],d['kind'])+'.schema.json'])]
   if b!=json.dumps(d,ensure_ascii=False,sort_keys=True,indent=2)+'\n':errors.append('noncanonical '+p)
 ids={d['id'] for d in docs}
 if len(ids)!=len(docs):errors.append('duplicate ID')
 for d in docs:
  e=d['extensions']['org.redown']
  for key in ['testEvidence','dependsOn','relatedIssues','affectedCapabilities']:
   for target in e.get(key,[]):
    if target not in ids:errors.append('missing extension target '+target)
  for r in e.get('sourceRefs',[]):
   p=(ROOT/r['path']).resolve()
   if not p.is_relative_to(ROOT) or not p.is_file():errors.append('missing/escaped source '+r['path']);continue
   if digest(p)!=r['sha256']:errors.append('source drift '+r['path'])
   if r.get('symbol') and r['symbol'] not in p.read_text():errors.append('missing anchor '+r['path']+':'+r['symbol'])
 for p,expected in json.loads((UP/'UPSTREAM.json').read_text())['files'].items():
  if digest(UP/p)!=expected:errors.append('upstream drift '+p)
 return {'valid':not errors,'records':len(docs),'sourceAndExtensionChecks':True,'schemaDraft':'2020-12','errors':errors,'scope':'Structural/source freshness only; not accepted intent or live product proof.'}
if __name__=='__main__':
 result=validate();print(json.dumps(result,indent=2));sys.exit(0 if result['valid'] else 1)
