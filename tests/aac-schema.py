import json,sys,copy,subprocess
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
root=Path(__file__).resolve().parents[1]
def load(path):return json.loads((root/path).read_text())
# Use the independently implemented upstream validators and existing positive/negative controls.
for test in ['tests/universal-file-schema.py','tests/resource-atlas-schema.py']:
 p=subprocess.run([sys.executable,str(root/test)],cwd=root,capture_output=True,text=True)
 if p.returncode:raise RuntimeError(test+': '+p.stderr[:500])
schema=load('agent/aac/report.schema.json');Draft202012Validator.check_schema(schema)
result={'aacSchemaVersion':'1.0.0','contractValidators':2,'positiveReports':0,'negativeControls':0,'valid':True}
if '--contracts-only' not in sys.argv:
 v=Draft202012Validator(schema,format_checker=FormatChecker());report=load('verification/aac/latest.json');v.validate(report);result['positiveReports']=1
 for mutate in [lambda r:r.update(aacVersion='99'),lambda r:r['capabilities'][0].update(status='MAYBE'),lambda r:r['summary']['coverage']['execution'].update(percentage=101),lambda r:r['graph']['edges'][0].update(status='certain')]:
  bad=copy.deepcopy(report);mutate(bad);assert list(v.iter_errors(bad));result['negativeControls']+=1
 for d,row in report['summary']['coverage'].items():
  assert row['passed']==row['counts']['PASS'];assert sum(row['counts'].values())==row['denominator'];assert row['percentage']==round(100*row['passed']/max(1,row['denominator']),2)
(root/'verification/aac').mkdir(parents=True,exist_ok=True);(root/'verification/aac/schema.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result))
