"""JSON input/output preserves opaque identities across every registered provider."""
import argparse
import json
from .client import Client, RedownError
from .extension import ExtensionClient
import sys

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--extension", action="store_true", help="Pair with the authenticated REDOWN extension")
    group.add_argument("--command", help="Owner command as a JSON string array")
    parser.add_argument("--cwd")
    parser.add_argument("--timeout", type=float, default=30, help="Stdio command timeout; extension pairing allows 120 seconds")
    parser.add_argument("method", choices=["describe", "execute", "plan", "jobs", "inspect", "evidence", "resources", "cancel", "reconcile", "renewAuthorization"])
    parser.add_argument("--input", default="{}", help="Session method input as JSON")
    args = parser.parse_args()
    try:
        with (ExtensionClient(on_pairing=lambda code: print("Approve connection code " + code + " in REDOWN", file=sys.stderr)) if args.extension else Client(json.loads(args.command), cwd=args.cwd, timeout=args.timeout)) as client:
            result = client.query(args.method, **json.loads(args.input))
        print(json.dumps(result, ensure_ascii=False))
        return 1 if isinstance(result, dict) and result.get("state") in ("failed", "uncertain", "blocked_authorization", "partially_completed") else 0
    except (RedownError, ValueError, TypeError, OSError) as error:
        print(json.dumps({"state": "failed", "error": {"code": error.code if isinstance(error, RedownError) else "INVALID_INPUT"}}))
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
