"""Independent report contract validation; no network, provider or GUI execution."""
import copy
import json
from pathlib import Path
import sys
import tempfile
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'clients/python'))
from jsonschema import Draft202012Validator, FormatChecker
from redown.inventory import inventory
from redown.architecture import run
root = Path(__file__).resolve().parents[1]
schema = json.loads((root/'docs/phase27/architecture-report.schema.json').read_text())
Draft202012Validator.check_schema(schema)
validator = Draft202012Validator(schema, format_checker=FormatChecker())
report = run(None, inventory(root/'test-fixtures/architecture-samples'), evidence_tier='OFFLINE_NO_PROVIDER')
validator.validate(report)
for status in ['PASS', 'FAIL', 'BLOCKED', 'UNSUPPORTED', 'NOT_TESTED', 'INDETERMINATE']:
    control = copy.deepcopy(report)
    control['cases'][0]['status'] = status
    validator.validate(control)
for mutate in [lambda r:r['cases'][0].update(status='SUCCESS'), lambda r:r.update(acceptance='COMPLETE'), lambda r:r['cleanup'].update(mutationsAttempted=True), lambda r:r['inventory']['selected'][0].update(sha256='etag')]:
    control = copy.deepcopy(report); mutate(control)
    assert list(validator.iter_errors(control)), 'negative control must fail'
print(json.dumps({'state':'passed','statuses':6,'negativeControls':4,'scope':'independent report schema, not live acceptance'}))
