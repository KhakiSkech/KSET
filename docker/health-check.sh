#!/bin/sh

# KSET Container Health Check Script
# Returns 0 if healthy, 1 if unhealthy

set -e

# Health check endpoints
HEALTH_URL="http://localhost:${METRICS_PORT:-9090}/health"
READY_URL="http://localhost:${METRICS_PORT:-9090}/ready"

# Function to check HTTP endpoint
check_endpoint() {
    local url="$1"
    local timeout="${2:-3}"

    if command -v curl >/dev/null 2>&1; then
        curl -f -s --max-time "$timeout" "$url" >/dev/null 2>&1
    elif command -v wget >/dev/null 2>&1; then
        wget -q --timeout="$timeout" -O - "$url" >/dev/null 2>&1
    else
        # Fallback to netcat if curl/wget not available
        nc -z localhost "${METRICS_PORT:-9090}" 2>/dev/null
    fi
}

# Function to check process health
check_process() {
    # Check if main process is running
    if [ -n "$MAIN_PID" ] && kill -0 "$MAIN_PID" 2>/dev/null; then
        return 0
    fi

    # Check if node processes are running
    if pgrep -f "node.*dist/index.js" >/dev/null 2>&1; then
        return 0
    fi

    return 1
}

# Function to check memory usage
check_memory() {
    # Get current memory usage
    if [ -f /proc/meminfo ]; then
        local available_mem=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        local threshold=1048576  # 1GB in KB

        if [ "$available_mem" -lt "$threshold" ]; then
            echo "WARNING: Low memory available: ${available_mem}KB"
            return 1
        fi
    fi

    return 0
}

# Function to check disk space
check_disk_space() {
    local app_usage=$(df /app 2>/dev/null | awk 'NR==2 {print $5}' | sed 's/%//')
    local threshold=90

    if [ "$app_usage" -gt "$threshold" ]; then
        echo "WARNING: High disk usage: ${app_usage}%"
        return 1
    fi

    return 0
}

# Main health check
main() {
    # Check if health endpoint is responding
    if ! check_endpoint "$HEALTH_URL"; then
        echo "Health check endpoint not responding"
        exit 1
    fi

    # Check if application is ready
    if ! check_endpoint "$READY_URL"; then
        echo "Application not ready"
        exit 1
    fi

    # Check main process
    if ! check_process; then
        echo "Main process not running"
        exit 1
    fi

    # Check memory usage
    if ! check_memory; then
        echo "Memory check failed"
        exit 1
    fi

    # Check disk space
    if ! check_disk_space; then
        echo "Disk space check failed"
        exit 1
    fi

    # All checks passed
    echo "Health check passed"
    exit 0
}

# Run health check
main "$@"