#!/bin/bash
# CAIRA Backend Startup Script with BharatCode Configuration

set -e

# Load environment variables
if [ -f ".env.local" ]; then
    echo "📦 Loading environment variables from .env.local..."
    source .env.local
else
    echo "⚠️  Warning: .env.local not found. Make sure BHARATCODE_API_KEY is set."
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    echo "🐍 Activating Python virtual environment..."
    source venv/bin/activate
else
    echo "❌ Error: Virtual environment not found at venv/"
    echo "   Run: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Verify configuration
echo "🔍 Verifying CAIRA configuration..."
python << PYEOF
import os
import sys
from app.core.config import get_settings

settings = get_settings()
api_key = os.getenv("BHARATCODE_API_KEY")

print(f"   Provider: {settings.agent.provider}")
print(f"   Model: {settings.agent.bharatcode.model}")
print(f"   API Key: {'✓ Set' if api_key else '✗ Missing'}")

if not api_key and settings.agent.provider == "bharatcode":
    print("\n❌ Error: BHARATCODE_API_KEY not set")
    sys.exit(1)
PYEOF

echo ""
echo "✅ Configuration verified!"
echo ""
echo "🚀 Starting CAIRA Backend Server..."
echo "   API Docs: http://localhost:8000/docs"
echo "   Health Check: http://localhost:8000/"
echo ""
echo "Press Ctrl+C to stop."
echo ""

uvicorn app.main:app --reload --port 8000 --host 0.0.0.0
