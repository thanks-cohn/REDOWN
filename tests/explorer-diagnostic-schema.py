import json
from pathlib import Path
from jsonschema import Draft202012Validator
root=Path(__file__).resolve().parents[1]
schema=json.loads((root/'schemas/explorer/bundle-1.0.0.schema.json').read_text());Draft202012Validator.check_schema(schema);validator=Draft202012Validator(schema)
fixtures=list((root/'work/explorer-fault-fixtures').glob('*.json'));bundles=[p for p in fixtures if not p.name.endswith('.diagnosis.json')]
assert len(bundles)==17
for path in bundles:validator.validate(json.loads(path.read_text()))
bad=json.loads(bundles[0].read_text());bad['operations'][0]['events'][0]['privateFilename']='secret';assert list(validator.iter_errors(bad))
probe=json.loads(bundles[0].read_text());event=probe['operations'][0]['events'][0];event.update(probe='source.provider-settings',durationMs=12.5,bindingMatches=True,publicFetchEnabled=False,expectedKey='a'*64,code='EXPLORER_WORKER_ROUTING_CONFIG');validator.validate(probe)
event['probe']='arbitrary-private-probe';assert list(validator.iter_errors(probe))
Draft202012Validator.check_schema(json.loads((root/'schemas/explorer/response-1.0.0.schema.json').read_text()))
print('2 Explorer schemas valid;17 simulated bundles pass;new probe fields pass;unredacted fields and unknown probes rejected')
