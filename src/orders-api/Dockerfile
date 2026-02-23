# Stage 1: Build
FROM golang:1.21-alpine AS builder
WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -ldflags "-s -w" -o orders-api .

# Stage 2: Runtime
FROM busybox:1.36.1-musl
WORKDIR /root/

RUN adduser -D -u 1001 appuser

COPY --from=builder --chown=appuser:appuser /app/orders-api .

USER appuser

EXPOSE 8083

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:8083/health >/dev/null 2>&1 || exit 1

CMD ["./orders-api"]
