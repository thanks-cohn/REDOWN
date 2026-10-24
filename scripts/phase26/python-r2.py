"""Explicit leased-lab Python SDK workload. Cleanup is a separately privileged lab action."""
import base64
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path
import sys
import time
import urllib.request
from redown import Client

if os.environ.get('REDOWN_ALLOW_LIVE_R2') != '1':
    raise SystemExit('Explicit lab authorization flag required')
c=json.loads(Path('work/r2-lab-secrets.json').read_text())
if c['expires'] <= time.time()*1000:
    raise SystemExit('Lease expired')
output=Path('work/phase26-live');output.mkdir(parents=True,exist_ok=True)
profile=output/'profile.json'
profile.write_text(json.dumps({'adapters':[{'type':'r2-worker','endpoint':c['endpoint'],'prefix':c['prefix'],'authorizationEnv':'REDOWN_LAB_AUTH'}]}))
os.chmod(profile,0o600)
os.environ['REDOWN_LAB_AUTH']=c['authorization']
source_files=json.loads(Path('verification/phase26/extension-freeze.json').read_text())['files']
runtime_hashes={p:hashlib.sha256(Path(p).read_bytes()).hexdigest() for p in source_files}
oracle=subprocess.Popen(['node','scripts/phase26/oracle.mjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
cohort=os.environ.get('REDOWN_LAB_COHORT','python')
if not re.fullmatch('[a-z0-9-]{1,40}',cohort):raise SystemExit('Invalid fixture cohort')
manifest=[];results=[]
manifest_path=output/'manifest.json'
def identity(bucket,name):
    return {'provider':'r2-lab','account':'lab','container':bucket,'key':c['prefix']+cohort+'/'+name}
def claim(target,expected):
    if not any(item['target']==target for item in manifest):
        manifest.append({'target':target,'sha256':expected});manifest_path.write_text(json.dumps(manifest,indent=2))
def rpc(method,target,**args):
    body={'method':method,'bucket':target['container'],'key':target['key'],**args}
    oracle.stdin.write(json.dumps(body)+'\n');oracle.stdin.flush()
    line=oracle.stdout.readline(3*1024*1024+1)
    if not line or len(line)>3*1024*1024:raise RuntimeError('ORACLE_RESPONSE_BUDGET')
    value=json.loads(line)
    if 'error' in value:raise RuntimeError(value['error'])
    return value['result']

command=['node','agent/files/cli.mjs','--config',str(profile),'--operations','list,metadata,read,upload,copy,move,delete,reconcile','--journal',str(output/'journal.json')]
fixtures=[('empty',b''),('binary',bytes(range(256))*32),('unicode-🌍.txt','é e\u0301 \x00\n'.encode())]
try:
 with Client(command,timeout=60) as client:
    description=client.describe()
    for bucket in ['test-1-new','test-2-new','test-3-new','test-4-new']:
        for name,data in fixtures:
            target=identity(bucket,name);expected=hashlib.sha256(data).hexdigest();claim(target,expected)
            start=time.perf_counter();job=client.execute('upload',destination=target,bytesBase64=base64.b64encode(data).decode())
            if job['state']!='completed':raise RuntimeError(job.get('error','UPLOAD_FAILED'))
            observed=rpc('read',target)
            assert hashlib.sha256(base64.b64decode(observed['bytesBase64'])).hexdigest()==expected
            results.append({'operation':'upload','operationId':job['id'],'state':'passed','bytes':len(data),'elapsedMs':(time.perf_counter()-start)*1000,'oracle':'fresh Worker R2 binding read; shared transport','trace':client.query('resources',id=job['id'],metric='getLatencyBreakdown')})
    for source_bucket in ['test-1-new','test-2-new','test-3-new','test-4-new']:
        for destination_bucket in ['test-1-new','test-2-new','test-3-new','test-4-new']:
            source=identity(source_bucket,'binary');target=identity(destination_bucket,'copy-'+source_bucket);data=fixtures[1][1];expected=hashlib.sha256(data).hexdigest();claim(target,expected)
            job=client.execute('copy',source=source,destination=target)
            assert job['state']=='completed',job.get('error')
            for location in [source,target]:assert hashlib.sha256(base64.b64decode(rpc('read',location)['bytesBase64'])).hexdigest()==expected
            results.append({'operation':'copy','operationId':job['id'],'state':'passed','direction':source_bucket+' -> '+destination_bucket,'sourcePreserved':True})
    blocked=client.execute('move',source=identity('test-1-new','binary'),destination=identity('test-4-new','unsafe-move'),confirmed=True)
    assert blocked['error']=='UNSUPPORTED_ATOMIC_DELETE'
    results.append({'operation':'move','state':'guard-passed','operationId':blocked['id'],'error':blocked['error']})
    (output/'jobs-summary.json').write_text(json.dumps(client.query('jobs',limit=25),indent=2))
except Exception as error:
 results.append({'state':'failed','error':str(error) if str(error).isupper() else type(error).__name__})
finally:
 cleanup=[]
 for item in manifest:
    try:
        target=item['target'];meta=rpc('stat',target)
        if meta:
            actual=rpc('read',target)
            assert hashlib.sha256(base64.b64decode(actual['bytesBase64'])).hexdigest()==item['sha256']
            rpc('cleanup',target,etag=meta['etag'])
        assert rpc('stat',target) is None
        cleanup.append({'container':target['container'],'state':'absent'})
    except Exception as error:
        cleanup.append({'container':item['target']['container'],'state':'failed','error':type(error).__name__})
 oracle.stdin.close();oracle.wait(timeout=5)
 report={'fixtureCohort':cohort,'runtimeSourceHashes':runtime_hashes,'oracleImplementation':'scripts/phase26/oracle.mjs: independent native-fetch process; no engine/SDK/adapter imports','version':'0.3.0','run':c['run'],'worker':c['name'],'results':results,'cleanup':cleanup,'independence':'Worker binding read bypasses engine and adapter; separate management prefix inspection still required','oracleUserAgent':'node; initial urllib/default-user-agent failure preserved separately','limitations':['small bounded fixtures','not full corpus or streaming','not independent S3 implementation','not cold agent or rclone comparison']}
 (output/'report.json').write_text(json.dumps(report,indent=2))
 print(json.dumps({'passed':sum(r['state']=='passed' for r in results),'guardPassed':sum(r['state']=='guard-passed' for r in results),'failed':sum(r['state']=='failed' for r in results),'cleanupFailed':sum(r['state']=='failed' for r in cleanup)}))
 if any(r['state']=='failed' for r in results+cleanup):raise SystemExit(1)
