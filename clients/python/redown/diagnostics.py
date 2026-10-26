"""Dependency-free defensive validation of the shared redacted diagnostic envelope."""
import json
import re
from pathlib import Path
from datetime import datetime
from uuid import UUID
SCHEMA=json.loads(Path(__file__).with_name('diagnostic.schema.json').read_text(encoding='utf-8'))
def valid(value,schema=None):
    schema=schema or SCHEMA
    if '$ref' in schema:return valid(value,SCHEMA['$defs']['cause'])
    if 'anyOf' in schema:return any(valid(value,s) for s in schema['anyOf'])
    if 'const' in schema and value!=schema['const']:return False
    if 'enum' in schema and value not in schema['enum']:return False
    kind=schema.get('type')
    if kind=='null':return value is None
    if kind=='object':
        if not isinstance(value,dict) or set(value)!=set(schema['required']):return False
        return all(valid(v,schema['properties'][k]) for k,v in value.items())
    if kind=='array':return isinstance(value,list) and len(value)<=schema['maxItems'] and all(valid(v,schema.get('items',{})) for v in value)
    if kind=='integer':return type(value) is int and schema['minimum']<=value<=schema['maximum']
    if kind=='string':
        if not isinstance(value,str):return False
        if 'pattern' in schema and re.fullmatch(schema['pattern'],value) is None:return False
        try:
            if schema.get('format')=='uuid':
                if len(value)!=36 or str(UUID(value))!=value.lower():return False
            if schema.get('format')=='date-time':
                t=datetime.fromisoformat(value.replace('Z','+00:00'))
                if t.tzinfo is None:return False
        except (ValueError,TypeError):return False
    return True

def check_payload(value):
    # Native frames are already bounded; only diagnostic fields have this contract.
    if isinstance(value,dict):
        for key,item in value.items():
            if key=='diagnostic' and item is not None:
                if not valid(item) or len(json.dumps(item))>16384:raise ValueError('DIAGNOSTICS_LOST')
            elif isinstance(item,(dict,list)):check_payload(item)
    elif isinstance(value,list):
        for item in value:check_payload(item)
    return value
