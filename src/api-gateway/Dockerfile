FROM node:20-alpine

RUN addgroup -g 1001 appgroup && \
    adduser -D -u 1001 -G appgroup appuser

WORKDIR /app

COPY --chown=appuser:appgroup package*.json ./
RUN npm ci --omit=dev && npm cache clean --force && \
    rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx && \
    find node_modules -type d '(' -name test -o -name tests -o -name docs -o -name doc -o -name example -o -name examples ')' -prune -exec rm -rf {} + && \
    find node_modules -type f '(' -name '*.md' -o -name '*.map' -o -name 'LICENSE*' -o -name 'CHANGELOG*' ')' -delete

COPY --chown=appuser:appgroup . .

USER appuser

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "server.js"]
