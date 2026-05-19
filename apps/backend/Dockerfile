# ──────────────────────────────────────────────────────────────────────────────
#  Sismik Mekanik ERP — Backend Dockerfile  (Oracle Cloud ARM uyumlu)
# ──────────────────────────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm AS builder

WORKDIR /app

# System deps (PostgreSQL driver compilation helpers)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ─── Runtime Image ───────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm

WORKDIR /app

# Runtime deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    redis-server \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r app && useradd -r -g app -d /home/app -m -s /usr/sbin/nologin app

# Copy installed deps from builder
COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin

COPY . .
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

RUN mkdir -p /home/app/.postgresql && chown -R app:app /app /home/app

RUN chmod +x /app/entrypoint.sh

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
