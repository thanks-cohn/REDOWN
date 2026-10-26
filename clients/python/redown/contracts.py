"""Allowlisted response diagnostics; never include response values or exception text."""
from .client import RedownError

CHECKPOINT_FIELDS = ('completedCases','remainingCases','verifiedFiles','verifiedBytes','coverage','estimatedRemainingSeconds','currentOperation','bytesPerSecond','ramObservation','cpuSeconds')

def require_fields(value, fields, component, version='1.0.0'):
    for field in fields:
        if not isinstance(value, dict) or field not in value:
            error = RedownError('RESPONSE_CONTRACT_MISMATCH')
            error.contract = dict(component=component, missingField=field, protocolVersion=version,
                                  code=error.code, recommendedAction='Update Python and REDOWN together, reload REDOWN, then establish a new approved pairing. Preserve the run checkpoint.')
            raise error
    return value

def checkpoint_view(report):
    require_fields(report, CHECKPOINT_FIELDS, 'adaptive-checkpoint', '2.8.0')
    return {key:report[key] for key in CHECKPOINT_FIELDS}

def describe_response(value):
    require_fields(value, ('locations','methods','limits'), 'session.describe')
    require_fields(value['limits'], ('maxBytes',), 'session.describe.limits')
    if not isinstance(value['locations'], list) or not isinstance(value['methods'], list):
        raise RedownError('INVALID_RESPONSE')
    for root in value['locations']:
        require_fields(root, ('account','container','provider','key'), 'session.describe.locations')
    return value
