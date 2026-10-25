"""Provider-neutral REDOWN session client. No provider credentials or transfers."""
from .client import Client, RedownError
__all__ = ["Client", "ExtensionClient", "RedownError", "connect"]

from .extension import ExtensionClient

def connect(mode="extension", **options):
    """Connection-mode boundary; direct S3 is deliberately not implemented."""
    if mode != "extension":
        raise RedownError("CONNECTION_MODE_UNSUPPORTED")
    return ExtensionClient(**options)
