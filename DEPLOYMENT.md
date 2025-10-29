# KSET Trading Library - Deployment Guide

## Overview

This guide covers the deployment of the KSET Trading Library in production environments, with special considerations for Korean financial services compliance and security requirements.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Build Process](#build-process)
4. [Deployment Strategies](#deployment-strategies)
5. [Monitoring and Observability](#monitoring-and-observability)
6. [Security and Compliance](#security-and-compliance)
7. [Troubleshooting](#troubleshooting)
8. [Rollback Procedures](#rollback-procedures)

## Prerequisites

### System Requirements

- **Node.js**: 18.x or higher
- **Docker**: 20.x or higher
- **Docker Compose**: 2.x or higher
- **Memory**: Minimum 2GB RAM
- **Storage**: Minimum 10GB available space
- **Network**: Stable internet connection for Korean market data

### Korean Financial Services Requirements

- **Data Retention**: 7 years for transaction data
- **Encryption**: AES-256-GCM for sensitive data
- **Audit Logging**: Complete audit trail for all operations
- **Time Zone**: Asia/Seoul (KST) for market operations
- **Compliance**: Korean Financial Services Commission (FSC) regulations

## Environment Setup

### Environment Variables

Create a `.env.production` file with the following variables:

```bash
# Application Configuration
NODE_ENV=production
PORT=3000
WS_PORT=9000
METRICS_PORT=9090
TZ=Asia/Seoul

# Database Configuration
DB_HOST=kset-db
DB_PORT=5432
DB_NAME=kset_prod
DB_USER=kset
DB_PASSWORD=your_secure_password

# Redis Configuration
REDIS_HOST=kset-redis
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password

# Korean Broker APIs
KIWOOM_API_KEY=your_kiwoom_api_key
KIWOOM_API_SECRET=your_kiwoom_api_secret
KOREA_INVESTMENT_API_KEY=your_koreainvestment_api_key
KOREA_INVESTMENT_API_SECRET=your_koreainvestment_api_secret

# Security Configuration
ALLOWED_ORIGINS=https://kset.kro.kr,https://app.kset.dev
SESSION_SECRET=your_session_secret
JWT_SECRET=your_jwt_secret

# Monitoring and Logging
PROMETHEUS_METRICS_ENABLED=true
LOG_LEVEL=warn
AUDIT_LOG_ENABLED=true

# Backup Configuration
BACKUP_ENABLED=true
BACKUP_SCHEDULE=0 2 * * *
BACKUP_RETENTION_DAYS=30
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
BACKUP_BUCKET=kset-backups
```

### SSL/TLS Certificates

For production deployment, ensure you have valid SSL certificates:

```bash
# Certificate paths (for Nginx)
SSL_CERT_PATH=/etc/nginx/ssl/cert.pem
SSL_KEY_PATH=/etc/nginx/ssl/key.pem
```

## Build Process

### Production Build

```bash
# Set environment variables
export NODE_ENV=production
export BUILD_NUMBER=${BUILD_NUMBER:-$(date +%s)}
export BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
export VERSION=${VERSION:-$(node -p "require('./package.json').version")}
export VCS_REF=${VCS_REF:-$(git rev-parse HEAD)}

# Run production build
npm run build:prod
```

### Docker Build

```bash
# Build production Docker image
docker build \
  --build-arg NODE_ENV=production \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VERSION=$VERSION \
  --build-arg VCS_REF=$VCS_REF \
  -t kset:$VERSION \
  -t kset:latest \
  .

# Tag for registry
docker tag kset:$VERSION ghcr.io/kset/kset:$VERSION
docker tag kset:latest ghcr.io/kset/kset:latest
```

## Deployment Strategies

### 1. Blue-Green Deployment

Blue-green deployment maintains two identical production environments:

```bash
# Deploy to green environment
docker-compose -f docker-compose.prod.yml up -d --scale kset-app=2
docker-compose -f docker-compose.prod.yml -f docker-compose.green.yml up -d

# Switch traffic
# Update load balancer configuration to point to green environment

# Keep blue environment for rollback
```

### 2. Rolling Update

Gradual replacement of old instances with new ones:

```bash
# Rolling update with zero downtime
docker-compose -f docker-compose.prod.yml up -d --no-deps kset-app
docker-compose -f docker-compose.prod.yml up -d --scale kset-app=3

# Wait for health checks
sleep 30

# Scale down old instances
docker-compose -f docker-compose.prod.yml up -d --scale kset-app=2
```

### 3. Canary Deployment

Gradual traffic shifting to new version:

```bash
# Deploy canary instances (10% traffic)
docker-compose -f docker-compose.prod.yml -f docker-compose.canary.yml up -d

# Monitor canary performance
# Check metrics, error rates, response times

# Gradually increase traffic
# 25% → 50% → 100%

# Full deployment
docker-compose -f docker-compose.prod.yml up -d
```

## Production Deployment

### Using Docker Compose

```bash
# Clone repository
git clone https://github.com/kset/kset.git
cd kset

# Copy environment configuration
cp .env.example .env.production
# Edit .env.production with your values

# Start production stack
docker-compose -f docker-compose.prod.yml up -d

# Verify deployment
docker-compose -f docker-compose.prod.yml ps
curl -f http://localhost:3000/health
```

### Using Kubernetes

```yaml
# kset-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kset-app
  labels:
    app: kset
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kset
  template:
    metadata:
      labels:
        app: kset
    spec:
      containers:
      - name: kset
        image: ghcr.io/kset/kset:latest
        ports:
        - containerPort: 3000
        env:
        - name: NODE_ENV
          value: "production"
        envFrom:
        - secretRef:
            name: kset-secrets
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "2Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health
            port: 9090
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 9090
          initialDelaySeconds: 5
          periodSeconds: 5
```

## Monitoring and Observability

### Health Checks

```bash
# Application health
curl -f http://localhost:9090/health

# Metrics endpoint
curl -f http://localhost:9090/metrics

# Readiness check
curl -f http://localhost:9090/ready
```

### Prometheus Metrics

Access metrics at `http://localhost:9090/metrics`:

- `kset_process_uptime_seconds` - Process uptime
- `kset_memory_bytes` - Memory usage by type
- `kset_http_requests_total` - HTTP request count
- `kset_trades_total` - Total trades executed
- `kset_orders_total` - Total orders placed
- `kset_websocket_connections_current` - Active WebSocket connections
- `kset_korean_market_status` - Korean market status (1=open, 0=closed)

### Grafana Dashboard

Access Grafana at `http://localhost:3001` (default credentials: admin/admin).

Key dashboards:
- KSET Application Metrics
- Infrastructure Health
- Korean Market Status
- Trading Performance

### Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f kset-app

# View specific log levels
docker-compose -f docker-compose.prod.yml logs kset-app | grep ERROR

# Aggregate logs from all services
docker-compose -f docker-compose.prod.yml logs -f
```

## Security and Compliance

### Korean Financial Compliance

1. **Data Encryption**: All sensitive data encrypted with AES-256-GCM
2. **Audit Logging**: Complete audit trail with timestamps
3. **Data Retention**: 7-year retention for regulatory compliance
4. **API Security**: Rate limiting and authentication
5. **Market Hours**: Respect Korean market hours (9:00 AM - 3:30 PM KST)

### Security Best Practices

```bash
# Regular security scans
npm audit
docker run --rm -v $(pwd):/app clair-scanner:latest

# SSL certificate monitoring
echo | openssl s_client -connect kset.kro.kr:443 -servername kset.kro.kr 2>/dev/null | openssl x509 -noout -dates

# Check for vulnerabilities
trivy image kset:latest
```

### Access Control

```bash
# Firewall rules (example)
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw deny 3000/tcp  # Block direct access to app port
ufw deny 9000/tcp  # Block direct access to WebSocket port
```

## Troubleshooting

### Common Issues

#### Application Won't Start

```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs kset-app

# Check environment variables
docker-compose -f docker-compose.prod.yml exec kset-app env | grep -E "(NODE_ENV|DB_|REDIS_)"

# Check dependencies
docker-compose -f docker-compose.prod.yml exec kset-app npm ls
```

#### Database Connection Issues

```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec kset-db psql -U kset -d kset_prod

# Check database logs
docker-compose -f docker-compose.prod.yml logs kset-db

# Verify connection string
docker-compose -f docker-compose.prod.yml exec kset-app node -e "
const { Client } = require('pg');
const client = new Client({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
client.connect().then(() => console.log('DB connected')).catch(console.error);
"
```

#### Korean Market Data Issues

```bash
# Check Korean market status
curl -s http://localhost:9090/metrics | grep kset_korean_market_status

# Verify API keys
docker-compose -f docker-compose.prod.yml exec kset-app node -e "
console.log('Kiwoom API Key:', process.env.KIWOOM_API_KEY ? 'Set' : 'Not set');
console.log('Korea Investment API Key:', process.env.KOREA_INVESTMENT_API_KEY ? 'Set' : 'Not set');
"

# Check WebSocket connections
curl -s http://localhost:9090/metrics | grep kset_websocket_connections
```

### Performance Issues

```bash
# Check memory usage
docker stats kset-app

# Profile Node.js application
docker-compose -f docker-compose.prod.yml exec kset-app node --inspect=0.0.0.0:9229 dist/index.js

# Check database performance
docker-compose -f docker-compose.prod.yml exec kset-db psql -U kset -d kset_prod -c "
SELECT query, mean_time, calls
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
"
```

## Rollback Procedures

### Emergency Rollback

```bash
# Identify last known good version
git tag --sort=-version:refname | head -5

# Rollback to specific version
npm run release:rollback 1.2.3

# Or rollback using git
git checkout v1.2.3
docker-compose -f docker-compose.prod.yml up -d --force-recreate
```

### Database Rollback

```bash
# List database backups
docker-compose -f docker-compose.prod.yml exec kset-backup ls -la /backups

# Restore from backup
docker-compose -f docker-compose.prod.yml exec kset-backup sh -c "
gunzip -c /backups/kset_backup_20240101_020000.sql.gz | \
psql -h kset-db -U kset kset_prod
"
```

### Service Health Check After Rollback

```bash
# Verify application health
curl -f http://localhost:9090/health

# Check database connectivity
docker-compose -f docker-compose.prod.yml exec kset-app node -e "
require('./dist/index.js').then(kset => {
  console.log('KSET initialized successfully');
}).catch(console.error);
"

# Monitor metrics for 5 minutes
watch -n 30 'curl -s http://localhost:9090/metrics | grep -E "(up|kset_process_uptime_seconds)"'
```

## Maintenance Tasks

### Daily

- Monitor application logs for errors
- Check backup completion
- Verify SSL certificate validity
- Review Korean market data connectivity

### Weekly

- Update security patches
- Review performance metrics
- Check disk space usage
- Test disaster recovery procedures

### Monthly

- Security audit and vulnerability scanning
- Database performance optimization
- Review and rotate API keys
- Update documentation

### Quarterly

- Compliance audit for Korean regulations
- Load testing and performance benchmarking
- Disaster recovery testing
- Security penetration testing

## Support

For deployment issues:

- **Documentation**: https://docs.kset.dev
- **Issues**: https://github.com/kset/kset/issues
- **Email**: support@kset.dev
- **Korean Support**: https://kset.dev/ko/support

## Emergency Contacts

- **24/7 Operations**: ops@kset.dev
- **Security Issues**: security@kset.dev
- **Korean Regulatory Compliance**: compliance@kset.dev