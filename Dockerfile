FROM node:24-alpine

# Build arguments
ARG BUILDTIME
ARG VERSION

# Labels for better image metadata
LABEL org.opencontainers.image.created=$BUILDTIME
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.source="https://github.com/ottes/gps-car-tracker"
LABEL org.opencontainers.image.title="GPS Car Tracker"
LABEL org.opencontainers.image.description="GPS tracking solution with ESP32-C3 and fuel consumption tracking"

# Install dependencies for better-sqlite3 compilation on arm64
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S cartracker -u 1001 -G nodejs && \
    mkdir -p /data && \
    chown -R cartracker:nodejs /data /app

USER cartracker

VOLUME ["/data"]
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080/health', (res) => process.exit(res.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "index.js"]
