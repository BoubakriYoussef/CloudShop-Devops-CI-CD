FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser && \
    apk add --no-cache libcap && \
    setcap 'cap_net_bind_service=+ep' /usr/sbin/nginx && \
    mkdir -p /var/cache/nginx /var/run /run && \
    chown -R appuser:appgroup /var/cache/nginx /var/run /run /etc/nginx /usr/share/nginx/html
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
USER appuser
EXPOSE 8080
CMD ["nginx", "-g", "daemon off;"]
