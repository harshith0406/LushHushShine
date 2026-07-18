import sys
import os

# Add the ai_service folder to Python path so 'main' can be found
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'ai_service')))

from main import app
