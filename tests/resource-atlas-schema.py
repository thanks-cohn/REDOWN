import json,copy
from pathlib import Path
from jsonschema import Draft202012Validator,FormatChecker
schema=json.loads(Path('agent/resources/evidence.schema.json').read_text());validator=Draft202012Validator(schema,format_checker=FormatChecker());validator.check_schema(schema)
bundle=json.loads(Path('verification/resources/evidence.json').read_text());validator.validate(bundle)
for mutate in [lambda b:b.update(authorization='secret'),lambda b:b['traces'][0].update(operation='unknown'),lambda b:b['traces'][0]['spans'][0].update(durationMs=-1),lambda b:b['traces'][0]['spans'][0].update(source='private/key')]:
 b=copy.deepcopy(bundle);mutate(b);assert list(validator.iter_errors(b)), 'negative control accepted'
contracts=json.loads(Path('agent/resources/contracts.json').read_text())
for op in contracts['operations']:
 Draft202012Validator.check_schema(op['inputSchema']);Draft202012Validator(op['inputSchema']).validate(op['example'])
print(json.dumps({'valid':True,'operations':len(contracts['operations']),'negativeControls':4,'traceCount':len(bundle['traces'])}))
