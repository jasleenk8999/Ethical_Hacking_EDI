#!/bin/bash
# Start CAIRA backend, loading the API key from .env
set -a
. /home/dazzanova/project/Ethical_Hacking_EDI/backend/.env
set +a

cd /home/dazzanova/project/Ethical_Hacking_EDI/backend
venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 > /tmp/caira_server.log 2>&1 &
echo $! > /tmp/caira_server.pid
echo "Server PID: $(cat /tmp/caira_server.pid)"
