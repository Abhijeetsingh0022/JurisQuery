#!/bin/bash
set -e

echo "▶ Starting JurisQuery API..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000}
