"""Equivalent bounded local workload. No cloud or performance superiority claims."""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import statistics
import subprocess
import tempfile
import time
from redown import Client

parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',default='work/phase26-benchmark.json')
parser.add_argument('--rclone',help='Explicit owner-installed rclone executable')
parser.add_argument('--trials',type=int,default=3)
args=parser.parse_args()
if not 1<=args.trials<=10:raise SystemExit('trials must be 1..10')
rclone=args.rclone or shutil.which('rclone')
report={'version':'0.1.0','workload':{'files':16,'bytesPerFile':8192,'concurrency':1,'verification':'fresh local SHA-256 for both candidates','scope':'Linux owner-exclusive local reference; not R2'},'trials':[],'limitations':['no network/provider timing','no cold-agent measure','no process peak memory sampling','no rclone comparison if unavailable']}
if not rclone:
 report.update(state='blocked',blocker='RCLONE_NOT_INSTALLED',rclone=None)
else:
 report['rclone']=subprocess.run([rclone,'version'],capture_output=True,text=True,check=True).stdout.splitlines()[0]
 with tempfile.TemporaryDirectory(prefix='redown-compare-') as temp:
  root=Path(temp);source=root/'source';source.mkdir()
  for i in range(16):(source/f'{i:02}.bin').write_bytes(bytes((j+i)%256 for j in range(8192)))
  expected={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in source.iterdir()}
  for trial in range(args.trials):
   # Alternate order to reduce a constant warm-cache ordering bias.
   for candidate in (['REDOWN','rclone'] if trial%2==0 else ['rclone','REDOWN']):
    dest=root/f'{candidate}-{trial}';dest.mkdir();started=time.perf_counter();error=None
    try:
     if candidate=='rclone':subprocess.run([rclone,'copy',str(source),str(dest),'--transfers','1','--checkers','1','--retries','1','--low-level-retries','1'],check=True,capture_output=True,timeout=60)
     else:
      config=root/'owner.json';config.write_text(json.dumps({'adapters':[{'type':'local-reference','directory':str(dest)}]}));command=['node','tests/providers/local-entry.mjs','--config',str(config),'--operations','upload,read,list']
      with Client(command) as client:
       location=client.describe()['locations'][0]
       for p in sorted(source.iterdir()):
        job=client.upload(p,{**location,'key':p.name})
        if job['state']!='completed':raise RuntimeError('TRANSFER_FAILED')
     actual={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in dest.iterdir()}
     if actual!=expected:raise RuntimeError('ORACLE_DISAGREEMENT')
    except Exception as e:error=type(e).__name__
    report['trials'].append({'trial':trial,'candidate':candidate,'elapsedMs':(time.perf_counter()-started)*1000,'state':'failed' if error else 'passed','error':error,'condition':'OS cache uncontrolled; new destination/process each trial'})
 report['state']='failed' if any(t['state']=='failed' for t in report['trials']) else 'measured-local-only'
 report['summary']={name:{'n':len(values),'medianMs':statistics.median(values),'minMs':min(values),'maxMs':max(values)} for name in ['REDOWN','rclone'] if (values:=[t['elapsedMs'] for t in report['trials'] if t['candidate']==name])}
path=Path(args.output);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'state':report['state'],'output':str(path)}))
if report['state'] in ['blocked','failed']:raise SystemExit(1)
