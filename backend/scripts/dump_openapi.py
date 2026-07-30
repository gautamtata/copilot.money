"""Dump the FastAPI OpenAPI schema for frontend type generation."""

import json
import sys

from main import app

json.dump(app.openapi(), sys.stdout, sort_keys=True)
