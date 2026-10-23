"""Run node scripts/phase2-schema-fixtures.mjs first; uses existing preservation jsonschema dependency."""
import json
from pathlib import Path
from jsonschema import Draft202012Validator
root = Path(__file__).resolve().parents[1]
schema = json.loads((root / 'extension/file-engine/schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema)
fixtures = json.loads((root / 'work/phase2/schema-fixtures.json').read_text())
for fixture in fixtures:
    validator.validate(fixture)
bad = dict(fixtures[0], apiVersion='2')
assert not validator.is_valid(bad)
bad = dict(fixtures[1], executor='production')
assert not validator.is_valid(bad)
bad = dict(fixtures[2], extra='unexpected')
assert not validator.is_valid(bad)
print(f'{len(fixtures)} request/job/event fixtures validate; 3 incompatible fixtures rejected; structural checks only')
