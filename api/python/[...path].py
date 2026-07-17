import sys
import os

# Resolve path: api/python/[...path].py -> ../../ai_service
project_root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ai_service_path = os.path.join(project_root, 'ai_service')

if ai_service_path not in sys.path:
    sys.path.insert(0, ai_service_path)

# Import the FastAPI app — Vercel's Python runtime supports ASGI natively, no Mangum needed
from main import app
