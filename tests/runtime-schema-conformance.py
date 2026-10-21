"""Run after node scripts/runtime-conformance.mjs; JSON Schema 2020-12."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator
root = Path(__file__).resolve().parents[1]
response = json.loads((root/'schemas/runtime/response-1.0.0.schema.json').read_text())
bundle = json.loads((root/'schemas/runtime/support-bundle-1.0.0.schema.json').read_text())
for schema in (response, bundle):
    Draft202012Validator.check_schema(schema)
files = sorted((root/'work/runtime-contracts').glob('*.json'))
assert len(files) == 5, 'Generate real fixtures first'
for path in files:
    data = json.loads(path.read_text())
    Draft202012Validator(response).validate(data)
    if path.stem == 'exportSupport':
        Draft202012Validator(bundle).validate(data['data'])
        data['data']['events'] *= 257
        assert not Draft202012Validator(bundle).is_valid(data['data'])
print('2 schemas valid; 5 responses and 1 bundle pass; oversized bundle rejected')
