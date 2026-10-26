"""Dependency-free defensive validation of the shared redacted diagnostic envelope."""
import json
import re
from pathlib import Path
from datetime import datetime
from uuid import UUID
SCHEMA=json.loads(Path(__file__).with_name('diagnostic.schema.json').read_text(encoding='utf-8'))
def valid(value,schema=None):
    # Evaluate only the constructs used by the canonical diagnostic contract.
    # Differential tests compare this dependency-free boundary with JS + jsonschema.
    schema=SCHEMA if schema is None else schema
    if '$ref' in schema:
        target=SCHEMA
        for part in schema['$ref'].removeprefix('#').split('/')[1:]:
            target=target[part.replace('~1','/').replace('~0','~')]
        if not valid(value,target):return False
    if 'anyOf' in schema and not any(valid(value,s) for s in schema['anyOf']):return False
    if 'const' in schema and value!=schema['const']:return False
    if 'enum' in schema and value not in schema['enum']:return False
    kind=schema.get('type')
    if kind=='null':return value is None
    if kind=='object' and not isinstance(value,dict):return False
    if isinstance(value,dict):
        properties=schema.get('properties',{})
        if not set(schema.get('required',[])).issubset(value):return False
        if schema.get('additionalProperties') is False and any(k not in properties for k in value):return False
        if not all(valid(value[k],s) for k,s in properties.items() if k in value):return False
    if kind=='array' and not isinstance(value,list):return False
    if isinstance(value,list):
        if len(value)>schema.get('maxItems',len(value)):return False
        if 'items' in schema and not all(valid(v,schema['items']) for v in value):return False
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
