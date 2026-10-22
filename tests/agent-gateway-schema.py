"""Offline schema conformance; never imports credentials or calls a provider."""
import copy
import json
import subprocess
from pathlib import Path
from jsonschema import Draft202012Validator
root = Path(__file__).resolve().parents[1]
def schema(name):
    value = json.loads((root / 'schemas/diagnostics' / name).read_text())
    Draft202012Validator.check_schema(value)
    return Draft202012Validator(value)
registry = json.loads((root / 'agent/diagnostics/registry.json').read_text())
registry_schema = schema('registry-' + registry['registryVersion'] + '.schema.json')
envelope_schema = schema('gateway-' + registry['gatewayVersion'] + '.schema.json')
registry_schema.validate(registry)
run = subprocess.run(['node', 'scripts/agent-gateway-fixtures.mjs'], cwd=root, capture_output=True, text=True, check=True, timeout=30)
cases = json.loads(run.stdout)
assert len(cases) == 59
for case in cases:
    envelope_schema.validate(case['result'])
for mutation in [dict(cases[0]['result'], token='PRIVATE'), dict(cases[0]['result'], diagnosticApiVersion='99'), dict(cases[0]['result'], state='healthy')]:
    assert list(envelope_schema.iter_errors(mutation))
bad = copy.deepcopy(registry)
bad['limits']['responseBytes'] = 999999999
assert list(registry_schema.iter_errors(bad))
print(f'2 gateway schemas valid; {len(cases)} routed/error fixtures pass; extra fields, unsupported versions/states and expanded limits rejected')
assessment_schema = schema('issue-assessments-1.0.0.schema.json')
assessments = json.loads((root / 'agent/diagnostics/issue-assessments.json').read_text())
assessment_schema.validate(assessments)
bad = copy.deepcopy(assessments)
bad['assessments'][0]['status'] = 'guaranteed-working'
assert list(assessment_schema.iter_errors(bad))
print('Issue assessment schema valid; reviewed notes pass; unsupported success claim rejected')
