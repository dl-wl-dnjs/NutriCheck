# Backend image: FastAPI + Uvicorn on Python 3.12 (3.14 still lacks wheels for
# psycopg2-binary on common base images). Used by docker-compose locally and
# also by Fly.io / Railway in production.
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

COPY backend ./backend

ENV PYTHONPATH=/app

EXPOSE 8000

# Run migrations on container start, then boot the API. The migrate step is
# idempotent (Alembic) so it's safe to run on every deploy.
CMD ["sh", "-c", "alembic -c backend/alembic.ini upgrade head && uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
