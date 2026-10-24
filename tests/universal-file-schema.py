"""Independent JSON Schema validation, including negative controls and pinned FW records."""
import json, subprocess
from pathlib import Path
from jsonschema import Draft202012Validator
from referencing import Registry, Resource
root=Path(__file__).resolve().parents[1]
subprocess.run(['node','scripts/r2-lab/schema-fixtures.mjs'],cwd=root,check=True)
schema=json.loads((root/'extension/file-engine/schema-0.2.json').read_text())
Draft202012Validator.check_schema(schema)
v=Draft202012Validator(schema)
fixtures=json.loads((root/'work/r2-lab/schema-fixtures.json').read_text())
for fixture in fixtures: v.validate(fixture)
for invalid in [dict(fixtures[0],apiVersion='9'),dict(fixtures[0],extra=True),dict(fixtures[1],content='also-text'),dict(fixtures[3],confirmed=False),dict(fixtures[0],source={'key':'incomplete'})]:
    assert not v.is_valid(invalid), invalid
schemas={p.name:json.loads(p.read_text()) for p in (root/'FOREVER_WORKS/upstream/forever-works/schemas').glob('*.json')}
registry=Registry().with_resources((s['$id'],Resource.from_contents(s)) for s in schemas.values())
model=root/'FOREVER_WORKS/P2-R2-API'
manifest=json.loads((model/'manifest.json').read_text())
Draft202012Validator(schemas['manifest.schema.json'],registry=registry).validate(manifest)
count=1
for group,paths in manifest['records'].items():
    for path in paths:
        record=json.loads((model/path).read_text())
        Draft202012Validator(schemas[('compatibility-contract' if record['kind']=='compatibility' else record['kind'])+'.schema.json'],registry=registry).validate(record)
        count+=1
print(json.dumps({'schemaFixtures':len(fixtures),'negativeControls':5,'foreverRecords':count,'state':'passed','scope':'independent structure validation; not live behavior'}))
