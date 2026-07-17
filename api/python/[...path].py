import sys
import os

# Add the ai_service directory to the Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../../ai_service')))

from main import app
from mangum import Mangum

# Wrap FastAPI app with Mangum to handle Serverless requests
handler = Mangum(app)
