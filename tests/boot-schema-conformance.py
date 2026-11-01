"""Local BOOT result validation; requires the existing jsonschema test dependency."""
import copy
import json
import subprocess
from pathlib import Path
import jsonschema

root = Path(__file__).resolve().parent.parent
subprocess.run(['node', 'scripts/boot-fixtures.mjs'], cwd=root, check=True)
schema = json.loads((root / 'schemas/boot/v1.schema.json').read_text())
validator = jsonschema.Draft202012Validator(schema)
fixtures = json.loads((root / 'work/boot/schema-fixtures.json').read_text())
for fixture in fixtures.values():
    validator.validate(fixture)
wrong_version = copy.deepcopy(fixtures['status'])
wrong_version['schemaVersion'] = 2
extra_field = copy.deepcopy(fixtures['status'])
extra_field['accessToken'] = 'must-not-export'
over_limit = copy.deepcopy(fixtures['history'])
over_limit['events'] = over_limit['events'] * 65
for invalid in [wrong_version, extra_field, over_limit]:
    assert not validator.is_valid(invalid), 'Invalid BOOT contract was accepted'
print('BOOT schema: 6 valid fixtures; 3 invalid fixtures rejected')
