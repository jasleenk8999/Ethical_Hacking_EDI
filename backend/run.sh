#!/bin/bash
# CAIRA Backend Startup Script

set -e

# Load environment variables
if [ -f ".env.local" ]; then
    echo "📦 Loading environment variables from .env.local..."
    set -a && . .env.local && set +a
elif [ -f ".env" ]; then
    echo "📦 Loading environment variables from .env..."
    set -a && . .env && set +a
else
    echo "⚠️  Warning: Neither .env.local nor .env found. Make sure OPENAI_COMPAT_API_KEY is set."
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
python <<PYEOF
import os
import sys
from app.core.config import get_settings

settings = get_settings()
provider = settings.agent.provider
api_key = os.getenv("OPENAI_COMPAT_API_KEY") if provider == "openai_compat" else os.getenv("ANTHROPIC_API_KEY")

print(f"   Provider: {provider}")
if provider == "openai_compat":
    print(f"   Model:    {settings.agent.openai_compat.model}")
    print(f"   Base URL: {settings.agent.openai_compat.base_url}")
elif provider == "anthropic":
    print(f"   Model:    {settings.agent.anthropic.model}")
print(f"   API Key:  {'✓ Set' if api_key else '✗ Missing'}")

if not api_key:
    env_var = "OPENAI_COMPAT_API_KEY" if provider == "openai_compat" else "ANTHROPIC_API_KEY"
    print(f"\n❌ Error: {env_var} not set")
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
