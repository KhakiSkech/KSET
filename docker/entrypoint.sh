#!/bin/sh

# KSET Production Entrypoint Script
# Optimized for Korean financial services deployment

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1" >&2
}

log_warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS:${NC} $1"
}

# Function to check if required environment variables are set
check_env_vars() {
    log "Checking environment variables..."

    required_vars="NODE_ENV PORT"
    missing_vars=""

    for var in $required_vars; do
        if [ -z "$(eval echo \$$var)" ]; then
            missing_vars="$missing_vars $var"
        fi
    done

    if [ ! -z "$missing_vars" ]; then
        log_error "Missing required environment variables:$missing_vars"
        exit 1
    fi

    log_success "Environment variables check passed"
}

# Function to setup logging
setup_logging() {
    log "Setting up logging..."

    # Create log directories
    mkdir -p /app/logs /app/data /app/cache

    # Set proper permissions
    chmod 755 /app/logs /app/data /app/cache

    log_success "Logging setup completed"
}

# Function to validate configuration
validate_config() {
    log "Validating configuration..."

    # Check if config file exists
    if [ ! -f "/app/config/environments/production.json" ]; then
        log_warn "Production configuration file not found, using defaults"
    fi

    # Validate critical paths
    if [ ! -d "/app/dist" ]; then
        log_error "Application dist directory not found"
        exit 1
    fi

    if [ ! -f "/app/dist/index.js" ]; then
        log_error "Application entry point not found"
        exit 1
    fi

    log_success "Configuration validation completed"
}

# Function to start health check server
start_health_check() {
    log "Starting health check server on port ${METRICS_PORT:-9090}..."

    # Create a simple health check server
    cat > /tmp/health-server.js << 'EOF'
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.METRICS_PORT || 9090;

const server = http.createServer((req, res) => {
    const url = req.url;

    // Health check endpoint
    if (url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });

        const health = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: process.env.npm_package_version || '1.0.0',
            environment: process.env.NODE_ENV || 'unknown',
            memory: process.memoryUsage(),
            pid: process.pid
        };

        res.end(JSON.stringify(health, null, 2));
        return;
    }

    // Metrics endpoint (basic Prometheus format)
    if (url === '/metrics') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });

        const memUsage = process.memoryUsage();
        const uptime = process.uptime();

        const metrics = `# HELP kset_process_uptime_seconds Process uptime in seconds
# TYPE kset_process_uptime_seconds counter
kset_process_uptime_seconds ${uptime}

# HELP kset_memory_bytes Memory usage in bytes
# TYPE kset_memory_bytes gauge
kset_memory_bytes{type="rss"} ${memUsage.rss}
kset_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}
kset_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}
kset_memory_bytes{type="external"} ${memUsage.external}

# HELP kset_process_info Process information
# TYPE kset_process_info gauge
kset_process_info{pid="${process.pid}",version="${process.env.npm_package_version || '1.0.0'}"} 1
`;

        res.end(metrics);
        return;
    }

    // Ready endpoint for Kubernetes
    if (url === '/ready') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ready' }));
        return;
    }

    // Default response
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(port, '0.0.0.0', () => {
    console.log(`Health check server listening on port ${port}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down gracefully');
    server.close(() => {
        process.exit(0);
    });
});
EOF

    # Start health check server in background
    node /tmp/health-server.js &
    HEALTH_PID=$!

    log_success "Health check server started (PID: $HEALTH_PID)"
}

# Function to handle graceful shutdown
graceful_shutdown() {
    log "Received shutdown signal, performing graceful shutdown..."

    # Stop health check server
    if [ ! -z "$HEALTH_PID" ]; then
        kill -TERM $HEALTH_PID 2>/dev/null || true
    fi

    # Add any other cleanup tasks here

    log_success "Graceful shutdown completed"
    exit 0
}

# Function to wait for dependencies
wait_for_dependencies() {
    log "Checking dependencies..."

    # Wait for Redis if configured
    if [ ! -z "$REDIS_HOST" ]; then
        log "Waiting for Redis at ${REDIS_HOST}:${REDIS_PORT:-6379}..."
        timeout 60 sh -c 'until nc -z $0 $1; do sleep 1; done' $REDIS_HOST ${REDIS_PORT:-6379} || {
            log_error "Redis is not responding"
            exit 1
        }
        log_success "Redis is ready"
    fi

    # Wait for Database if configured
    if [ ! -z "$DB_HOST" ]; then
        log "Waiting for Database at ${DB_HOST}:${DB_PORT:-5432}..."
        timeout 60 sh -c 'until nc -z $0 $1; do sleep 1; done' $DB_HOST ${DB_PORT:-5432} || {
            log_error "Database is not responding"
            exit 1
        }
        log_success "Database is ready"
    fi
}

# Function to start the main application
start_application() {
    log "Starting KSET Trading Library..."
    log "Version: $(cat /app/package.json | grep -o '"version": "[^"]*"' | cut -d'"' -f4)"
    log "Environment: $NODE_ENV"
    log "Port: $PORT"
    log "WebSocket Port: ${WS_PORT:-9000}"

    # Set additional environment variables
    export KSET_CONFIG_PATH="${KSET_CONFIG_PATH:-/app/config/environments/production.json}"
    export KSET_LOGS_PATH="${KSET_LOGS_PATH:-/app/logs}"
    export KSET_DATA_PATH="${KSET_DATA_PATH:-/app/data}"
    export KSET_CACHE_PATH="${KSET_CACHE_PATH:-/app/cache}"

    # Start the main application
    exec node /app/dist/index.js
}

# Main execution
main() {
    log "KSET Trading Library - Production Entrypoint"
    log "=========================================="

    # Setup signal handlers
    trap graceful_shutdown SIGTERM SIGINT

    # Run startup checks
    check_env_vars
    setup_logging
    validate_config
    wait_for_dependencies

    # Start health check server
    start_health_check

    # Start the application
    start_application
}

# Execute main function
main "$@"