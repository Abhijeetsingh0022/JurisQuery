# ── Build stage ──────────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv (fast Python package installer)
RUN pip install --no-cache-dir uv

# Copy dependency spec and install into the system Python
COPY pyproject.toml .
RUN uv pip install --system --no-cache .

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

# Copy application source
COPY app/ ./app/
COPY alembic/ ./alembic/
COPY alembic.ini .
COPY start.sh .
RUN chmod +x start.sh

EXPOSE 8000

CMD ["./start.sh"]
