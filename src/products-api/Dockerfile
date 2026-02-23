# Stage 1: Build
FROM python:3.11-slim AS builder
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Stage 2: Runtime
FROM python:3.11-slim
WORKDIR /app

RUN useradd -m -u 1001 appuser

COPY --from=builder /root/.local /home/appuser/.local
ENV PATH=/home/appuser/.local/bin:$PATH
ENV PYTHONDONTWRITEBYTECODE=1

COPY --chown=appuser:appuser . .

RUN find /home/appuser/.local -type d '(' -name "__pycache__" -o -name "tests" -o -name "test" -o -name "docs" -o -name "doc" -o -name "examples" -o -name "example" ')' -prune -exec rm -rf {} + && \
    find /home/appuser/.local -type f -name "*.pyc" -delete

USER appuser

EXPOSE 8082

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8082/health').read()"

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8082"]
