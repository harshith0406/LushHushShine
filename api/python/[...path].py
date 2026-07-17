import sys
import os

# Resolve the ai_service path relative to the project root
# In Vercel, __file__ is at /var/task/api/python/[...path].py
# So ../../ brings us to /var/task/ which is the project root
project_root = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ai_service_path = os.path.join(project_root, 'ai_service')

if ai_service_path not in sys.path:
    sys.path.insert(0, ai_service_path)

from main import app
from mangum import Mangum

# Wrap FastAPI with Mangum ASGI adapter for Vercel/Lambda
handler = Mangum(app, lifespan="off")
