import json
from pathlib import Path
from jsonschema import Draft202012Validator
root=Path(__file__).resolve().parents[1]
schema=json.loads((root/'schemas/explorer/bundle-1.0.0.schema.json').read_text());Draft202012Validator.check_schema(schema);validator=Draft202012Validator(schema)
fixtures=list((root/'work/explorer-fault-fixtures').glob('*.json'));bundles=[p for p in fixtures if not p.name.endswith('.diagnosis.json')]
assert len(bundles)==17
for path in bundles:validator.validate(json.loads(path.read_text()))
bad=json.loads(bundles[0].read_text());bad['operations'][0]['events'][0]['privateFilename']='secret';assert list(validator.iter_errors(bad))
Draft202012Validator.check_schema(json.loads((root/'schemas/explorer/response-1.0.0.schema.json').read_text()))
print('2 Explorer schemas valid;17 simulated bundles pass;unredacted field rejected')
