#!/bin/bash
set -e
ANTENV_PY=$(find /tmp -maxdepth 5 -path "*/antenv/bin/python*" -type f 2>/dev/null | head -1)
if [ -z "$ANTENV_PY" ]; then
  echo "antenv python not found"; exit 1
fi
exec "$ANTENV_PY" -m gunicorn \
  -w 2 -k uvicorn.workers.UvicornWorker \
  app.main:app \
  --bind 0.0.0.0:${PORT:-8000} \
  --timeout 120
