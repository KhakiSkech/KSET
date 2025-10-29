# Multi-stage production Dockerfile for KSET Trading Library
# Optimized for Korean financial services compliance and security

# Stage 1: Build Stage
FROM node:18-alpine AS builder

# Set build environment variables
ARG NODE_ENV=production
ARG BUILD_DATE
ARG VERSION
ARG VCS_REF

ENV NODE_ENV=${NODE_ENV} \
    BUILD_DATE=${BUILD_DATE} \
    VERSION=${VERSION} \
    VCS_REF=${VCS_REF} \
    NPM_CONFIG_LOGLEVEL=error \
    NPM_CONFIG_PROGRESS=false

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    git

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY webpack*.js ./
COPY rollup.config.js ./
COPY bundlesize.config.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/
COPY scripts/ ./scripts/
COPY config/ ./config/
COPY bin/ ./bin/
COPY examples/ ./examples/

# Build the application
RUN npm run build:prod

# Stage 2: Production Runtime
FROM node:18-alpine AS production

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3000 \
    WS_PORT=9000 \
    METRICS_PORT=9090 \
    TZ=Asia/Seoul

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ca-certificates \
    tzdata \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S kset && \
    adduser -S kset -u 1001

# Set working directory
WORKDIR /app

# Copy built application from builder stage
COPY --from=builder --chown=kset:kset /app/dist ./dist
COPY --from=builder --chown=kset:kset /app/node_modules ./node_modules
COPY --from=builder --chown=kset:kset /app/package.json ./

# Copy configuration and scripts
COPY --chown=kset:kset config/ ./config/
COPY --chown=kset:kset docker/entrypoint.sh /usr/local/bin/
COPY --chown=kset:kset docker/health-check.sh /usr/local/bin/

# Set permissions
RUN chmod +x /usr/local/bin/entrypoint.sh \
    && chmod +x /usr/local/bin/health-check.sh

# Create directories with proper permissions
RUN mkdir -p /app/logs /app/data /app/cache && \
    chown -R kset:kset /app

# Expose ports
EXPOSE 3000 9000 9090

# Switch to non-root user
USER kset

# Set health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:9090/health || exit 1

# Use dumb-init as PID 1
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["/usr/local/bin/entrypoint.sh"]

# Labels for container metadata
LABEL org.label-schema.build-date=$BUILD_DATE \
      org.label-schema.name="KSET Trading Library" \
      org.label-schema.description="Korea Stock Exchange Trading Library - Production Container" \
      org.label-schema.url="https://kset.dev" \
      org.label-schema.vcs-ref=$VCS_REF \
      org.label-schema.vcs-url="https://github.com/kset/kset" \
      org.label-schema.vendor="KSET Team" \
      org.label-schema.version=$VERSION \
      org.label-schema.schema-version="1.0"

# Stage 3: Development Stage
FROM builder AS development

# Set development environment
ENV NODE_ENV=development \
    PORT=3000 \
    WS_PORT=9000

# Install development dependencies
RUN npm install

# Expose development ports
EXPOSE 3000 9000 9229

# Development entrypoint
CMD ["npm", "run", "dev"]

# Stage 4: Test Stage
FROM builder AS test

# Install test dependencies
RUN npm install

# Copy test files
COPY jest*.js ./
COPY tests/ ./tests/
COPY examples/ ./examples/

# Run tests
RUN npm run test:coverage

# Security scanning stage
FROM builder AS security

# Install security tools
RUN npm install -g audit-ci snyk

# Run security audits
RUN npm audit --audit-level=moderate \
    && audit-ci --moderate