#!/bin/bash
set -e

echo "▶ Starting JurisQuery API..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
