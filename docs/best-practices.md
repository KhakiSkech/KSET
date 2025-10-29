# KSET Best Practices

This guide outlines recommended patterns, conventions, and best practices for developing with KSET to ensure optimal performance, maintainability, and reliability.

## 📋 Table of Contents

- [Architecture & Design](#architecture--design)
- [Performance Optimization](#performance-optimization)
- [Error Handling](#error-handling)
- [Security](#security)
- [Testing](#testing)
- [Configuration Management](#configuration-management)
- [Monitoring & Observability](#monitoring--observability)
- [Code Organization](#code-organization)
- [Deployment](#deployment)

## 🏗️ Architecture & Design

### 1. Dependency Injection

Use dependency injection for better testability and modularity:

```typescript
// Good: Use dependency injection
class TradingService {
  constructor(
    private sdk: KSETSDK,
    private logger: Logger,
    private config: TradingConfig
  ) {}

  async executeOrder(orderRequest: OrderRequest): Promise<Order> {
    this.logger.info('Executing order', orderRequest);
    return this.sdk.createOrder(orderRequest);
  }
}

// Bad: Hard-coded dependencies
class TradingService {
  private sdk = new KSETSDK({ /* config */ });
  private logger = console;

  async executeOrder(orderRequest: OrderRequest): Promise<Order> {
    this.logger.info('Executing order', orderRequest);
    return this.sdk.createOrder(orderRequest);
  }
}
```

### 2. Service Layer Pattern

Organize your code with clear service boundaries:

```typescript
// Services handle business logic
class OrderService {
  constructor(private sdk: KSETSDK, private riskService: RiskService) {}

  async createOrder(orderData: OrderRequest): Promise<Order> {
    // Risk validation
    await this.riskService.validateOrder(orderData);

    // Create order
    const order = await this.sdk.createOrder(orderData);

    // Post-processing
    await this.updateAnalytics(order);

    return order;
  }
}

class MarketDataService {
  constructor(private sdk: KSETSDK, private cache: CacheService) {}

  async getMarketData(symbol: string): Promise<EnhancedMarketData> {
    // Check cache first
    const cached = await this.cache.get(`market:${symbol}`);
    if (cached) return cached;

    // Fetch from SDK
    const data = await this.sdk.getMarketData(symbol);
    await this.cache.set(`market:${symbol}`, data, 30000); // 30 seconds

    return data;
  }
}
```

### 3. Repository Pattern

Abstract data access with repository pattern:

```typescript
interface OrderRepository {
  create(order: OrderRequest): Promise<Order>;
  findById(id: string): Promise<Order | null>;
  findBySymbol(symbol: string): Promise<Order[]>;
  update(id: string, updates: Partial<Order>): Promise<Order>;
}

class KSETOrderRepository implements OrderRepository {
  constructor(private sdk: KSETSDK) {}

  async create(orderData: OrderRequest): Promise<Order> {
    return this.sdk.createOrder(orderData);
  }

  async findById(id: string): Promise<Order | null> {
    return this.sdk.getOrder(id);
  }

  async findBySymbol(symbol: string): Promise<Order[]> {
    return this.sdk.getOrders({ symbol });
  }

  async update(id: string, updates: Partial<Order>): Promise<Order> {
    return this.sdk.modifyOrder(id, updates);
  }
}
```

## ⚡ Performance Optimization

### 1. Connection Management

Maintain persistent connections and reuse them:

```typescript
// Good: Singleton SDK instance
class SDKManager {
  private static instance: KSETSDK;

  static getInstance(): KSETSDK {
    if (!SDKManager.instance) {
      SDKManager.instance = new KSETSDK({
        providers: ['kiwoom', 'korea_investment'],
        cache: { enabled: true, ttl: 300 },
        performance: { enabled: true }
      });
    }
    return SDKManager.instance;
  }
}

// Usage throughout application
const sdk = SDKManager.getInstance();
```

### 2. Batch Operations

Batch multiple operations for better efficiency:

```typescript
class BatchOrderProcessor {
  private readonly batchSize = 50;
  private readonly batchDelay = 100; // ms

  constructor(private sdk: KSETSDK) {}

  async processOrders(orders: OrderRequest[]): Promise<Order[]> {
    const results: Order[] = [];

    for (let i = 0; i < orders.length; i += this.batchSize) {
      const batch = orders.slice(i, i + this.batchSize);

      // Process batch in parallel with concurrency control
      const batchResults = await this.processBatch(batch);
      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + this.batchSize < orders.length) {
        await this.delay(this.batchDelay);
      }
    }

    return results;
  }

  private async processBatch(batch: OrderRequest[]): Promise<Order[]> {
    return Promise.all(
      batch.map(order => this.sdk.createOrder(order))
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 3. Intelligent Caching

Implement multi-level caching strategy:

```typescript
class MultiLevelCache {
  private memoryCache = new Map<string, CacheItem>();
  private redisCache: Redis;

  constructor(redisClient: Redis) {
    this.redisCache = redisClient;
  }

  async get<T>(key: string): Promise<T | null> {
    // Level 1: Memory cache
    const memoryItem = this.memoryCache.get(key);
    if (memoryItem && !this.isExpired(memoryItem)) {
      return memoryItem.value;
    }

    // Level 2: Redis cache
    const redisValue = await this.redisCache.get(key);
    if (redisValue) {
      const parsed = JSON.parse(redisValue);
      this.memoryCache.set(key, {
        value: parsed,
        expiresAt: Date.now() + 60000 // 1 minute
      });
      return parsed;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    // Set in memory cache
    this.memoryCache.set(key, {
      value,
      expiresAt: Date.now() + Math.min(ttl, 60000)
    });

    // Set in Redis cache
    await this.redisCache.setex(key, Math.ceil(ttl / 1000), JSON.stringify(value));
  }

  private isExpired(item: CacheItem): boolean {
    return Date.now() > item.expiresAt;
  }
}

interface CacheItem {
  value: any;
  expiresAt: number;
}
```

### 4. Connection Pooling

For high-frequency operations, implement connection pooling:

```typescript
class ConnectionPool {
  private connections: KSETSDK[] = [];
  private available: boolean[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number = 5) {
    this.maxSize = maxSize;
  }

  async getConnection(): Promise<KSETSDK> {
    const availableIndex = this.available.findIndex(available => available);

    if (availableIndex !== -1) {
      this.available[availableIndex] = false;
      return this.connections[availableIndex];
    }

    if (this.connections.length < this.maxSize) {
      const newConnection = new KSETSDK({ /* config */ });
      await newConnection.connect();
      this.connections.push(newConnection);
      this.available.push(false);
      return newConnection;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const index = this.available.findIndex(available => available);
        if (index !== -1) {
          clearInterval(checkInterval);
          this.available[index] = false;
          resolve(this.connections[index]);
        }
      }, 10);
    });
  }

  releaseConnection(connection: KSETSDK): void {
    const index = this.connections.indexOf(connection);
    if (index !== -1) {
      this.available[index] = true;
    }
  }
}
```

## 🚨 Error Handling

### 1. Structured Error Handling

Implement consistent error handling patterns:

```typescript
// Custom error types
class KSETError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly context?: any,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'KSETError';
  }
}

class ValidationError extends KSETError {
  constructor(message: string, context?: any) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
  }
}

class NetworkError extends KSETError {
  constructor(message: string, context?: any, cause?: Error) {
    super(message, 'NETWORK_ERROR', context, cause);
    this.name = 'NetworkError';
  }
}

// Error handling service
class ErrorHandlingService {
  async handleOrderError(error: Error, orderData: OrderRequest): Promise<void> {
    if (error instanceof ValidationError) {
      logger.warn('Order validation failed', { error: error.message, orderData });
      throw error; // Re-throw validation errors
    }

    if (error instanceof NetworkError) {
      logger.error('Network error during order creation', { error: error.message, orderData });
      await this.retryOrder(orderData);
      return;
    }

    // Unknown error - escalate
    logger.error('Unexpected error during order creation', { error, orderData });
    await this.notifyAdministrator(error, orderData);
    throw new KSETError('Order creation failed', 'UNKNOWN_ERROR', { orderData }, error);
  }

  private async retryOrder(orderData: OrderRequest): Promise<void> {
    // Implement retry logic with exponential backoff
  }

  private async notifyAdministrator(error: Error, context: any): Promise<void> {
    // Send notification to monitoring system
  }
}
```

### 2. Graceful Degradation

Implement fallback mechanisms:

```typescript
class ResilientMarketDataService {
  constructor(
    private primarySDK: KSETSDK,
    private fallbackSDK: KSETSDK,
    private cache: CacheService
  ) {}

  async getMarketData(symbol: string): Promise<EnhancedMarketData | null> {
    try {
      // Try primary source
      const data = await this.primarySDK.getMarketData(symbol);
      await this.cache.set(`market:${symbol}`, data, 30000);
      return data;
    } catch (primaryError) {
      logger.warn('Primary SDK failed, trying fallback', { symbol, error: primaryError.message });

      try {
        // Try fallback source
        const data = await this.fallbackSDK.getMarketData(symbol);
        await this.cache.set(`market:${symbol}`, data, 30000);
        return data;
      } catch (fallbackError) {
        logger.error('Both primary and fallback SDKs failed', { symbol, primaryError, fallbackError });

        // Try cache as last resort
        const cached = await this.cache.get(`market:${symbol}`);
        if (cached) {
          logger.info('Serving from cache due to SDK failures', { symbol });
          return cached;
        }

        throw new Error(`Unable to fetch market data for ${symbol}`);
      }
    }
  }
}
```

## 🔒 Security

### 1. Configuration Security

Never hardcode sensitive information:

```typescript
// Good: Use environment variables
const config = {
  kiwoom: {
    password: process.env.KIWOOM_PASSWORD,
    certificatePassword: process.env.KIWOOM_CERT_PASSWORD
  },
  korea_investment: {
    appKey: process.env.KOREA_INV_APP_KEY,
    appSecret: process.env.KOREA_INV_APP_SECRET
  }
};

// Bad: Hardcoded credentials
const config = {
  kiwoom: {
    password: 'hardcoded_password',
    certificatePassword: 'hardcoded_cert_password'
  }
};
```

### 2. Input Validation

Validate all inputs before processing:

```typescript
class OrderValidator {
  private readonly validSymbols = new Set(['005930', '000660', '051910']); // Whitelist
  private readonly maxOrderValue = 100000000; // 100M KRW

  validateOrder(order: OrderRequest): ValidationResult {
    const errors: string[] = [];

    // Validate symbol
    if (!this.validSymbols.has(order.symbol)) {
      errors.push(`Invalid symbol: ${order.symbol}`);
    }

    // Validate quantity
    if (order.quantity <= 0 || order.quantity > 10000) {
      errors.push(`Invalid quantity: ${order.quantity}`);
    }

    // Validate price
    if (order.price && (order.price <= 0 || order.price > 10000000)) {
      errors.push(`Invalid price: ${order.price}`);
    }

    // Validate order value
    const orderValue = (order.quantity || 0) * (order.price || 0);
    if (orderValue > this.maxOrderValue) {
      errors.push(`Order value exceeds limit: ${orderValue}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

### 3. Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  isAllowed(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    let requests = this.requests.get(key) || [];
    requests = requests.filter(timestamp => timestamp > windowStart);

    if (requests.length < this.maxRequests) {
      requests.push(now);
      this.requests.set(key, requests);
      return true;
    }

    return false;
  }

  getRetryAfter(key: string): number {
    const requests = this.requests.get(key) || [];
    if (requests.length === 0) return 0;

    const oldestRequest = Math.min(...requests);
    const retryAfter = oldestRequest + this.windowMs - Date.now();
    return Math.max(0, retryAfter);
  }
}

// Usage
const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

app.post('/orders', async (req, res) => {
  const clientId = req.headers['x-client-id'] as string;

  if (!rateLimiter.isAllowed(clientId)) {
    const retryAfter = Math.ceil(rateLimiter.getRetryAfter(clientId) / 1000);
    res.set('Retry-After', retryAfter.toString());
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  // Process order
});
```

## 🧪 Testing

### 1. Test Organization

Organize tests with clear structure:

```typescript
// unit/services/order.service.test.ts
describe('OrderService', () => {
  let orderService: OrderService;
  let mockSDK: jest.Mocked<KSETSDK>;
  let mockRiskService: jest.Mocked<RiskService>;

  beforeEach(() => {
    mockSDK = createMockKSETSDK();
    mockRiskService = createMockRiskService();
    orderService = new OrderService(mockSDK, mockRiskService);
  });

  describe('createOrder', () => {
    it('should create order when risk validation passes', async () => {
      // Arrange
      const orderData: OrderRequest = {
        symbol: '005930',
        side: 'buy',
        type: 'limit',
        quantity: 100,
        price: 80000
      };

      mockRiskService.validateOrder.mockResolvedValue(true);
      mockSDK.createOrder.mockResolvedValue(createMockOrder(orderData));

      // Act
      const result = await orderService.createOrder(orderData);

      // Assert
      expect(result).toBeDefined();
      expect(mockRiskService.validateOrder).toHaveBeenCalledWith(orderData);
      expect(mockSDK.createOrder).toHaveBeenCalledWith(orderData);
    });

    it('should throw error when risk validation fails', async () => {
      // Arrange
      const orderData: OrderRequest = {
        symbol: '005930',
        side: 'buy',
        type: 'limit',
        quantity: 100,
        price: 80000
      };

      mockRiskService.validateOrder.mockRejectedValue(new Error('Risk limit exceeded'));

      // Act & Assert
      await expect(orderService.createOrder(orderData)).rejects.toThrow('Risk limit exceeded');
      expect(mockSDK.createOrder).not.toHaveBeenCalled();
    });
  });
});
```

### 2. Integration Testing

Test real-world scenarios:

```typescript
// integration/trading-workflow.test.ts
describe('Trading Workflow Integration', () => {
  let sdk: KSETSDK;
  let testAccount: string;

  beforeAll(async () => {
    sdk = new KSETSDK({
      providers: ['mock'],
      environment: 'testing'
    });
    await sdk.connect();
    testAccount = process.env.TEST_ACCOUNT_ID!;
  });

  afterAll(async () => {
    await sdk.disconnect();
  });

  it('should complete end-to-end trading workflow', async () => {
    // Step 1: Get market data
    const marketData = await sdk.getMarketData('005930');
    expect(marketData).toBeDefined();
    expect(marketData!.price).toBeGreaterThan(0);

    // Step 2: Create order
    const order = await sdk.createOrder({
      symbol: '005930',
      side: 'buy',
      type: 'limit',
      quantity: 10,
      price: marketData!.price * 0.99 // 1% below market
    });
    expect(order.status).toBe('pending');

    // Step 3: Wait for order execution
    const executedOrder = await waitForOrderExecution(sdk, order.id, 10000);
    expect(executedOrder.status).toBe('filled');

    // Step 4: Verify position
    const positions = await sdk.getPositions();
    const position = positions.find(p => p.symbol === '005930');
    expect(position).toBeDefined();
    expect(position!.quantity).toBe(10);
  });
});

async function waitForOrderExecution(sdk: KSETSDK, orderId: string, timeout: number): Promise<Order> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();

    const checkOrder = async () => {
      try {
        const order = await sdk.getOrder(orderId);
        if (order?.status === 'filled' || order?.status === 'cancelled') {
          resolve(order);
        } else if (Date.now() - startTime > timeout) {
          reject(new Error(`Order execution timeout: ${orderId}`));
        } else {
          setTimeout(checkOrder, 500);
        }
      } catch (error) {
        reject(error);
      }
    };

    checkOrder();
  });
}
```

### 3. Performance Testing

Monitor performance characteristics:

```typescript
// performance/order-creation.test.ts
describe('Order Creation Performance', () => {
  let sdk: KSETSDK;

  beforeAll(async () => {
    sdk = new KSETSDK({
      providers: ['mock'],
      performance: { enabled: true }
    });
    await sdk.connect();
  });

  it('should handle 100 orders within 5 seconds', async () => {
    const orderCount = 100;
    const startTime = Date.now();

    const orders = await Promise.all(
      Array.from({ length: orderCount }, (_, i) =>
        sdk.createOrder({
          symbol: '005930',
          side: i % 2 === 0 ? 'buy' : 'sell',
          type: 'limit',
          quantity: 10,
          price: 80000 + i
        })
      )
    );

    const duration = Date.now() - startTime;
    const throughput = orderCount / (duration / 1000);

    expect(duration).toBeLessThan(5000); // 5 seconds
    expect(throughput).toBeGreaterThan(20); // 20 orders per second
    expect(orders.length).toBe(orderCount);
  });
});
```

## 📁 Configuration Management

### 1. Environment-based Configuration

```typescript
// config/index.ts
interface Config {
  environment: 'development' | 'testing' | 'staging' | 'production';
  providers: string[];
  kiwoom?: KiwoomConfig;
  korea_investment?: KoreaInvestmentConfig;
  cache: CacheConfig;
  monitoring: MonitoringConfig;
}

const config: Config = {
  environment: (process.env.NODE_ENV as any) || 'development',
  providers: process.env.KSET_PROVIDERS?.split(',') || ['kiwoom'],
  cache: {
    enabled: process.env.CACHE_ENABLED !== 'false',
    ttl: parseInt(process.env.CACHE_TTL || '300'),
    maxSize: parseInt(process.env.CACHE_MAX_SIZE || '1000')
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED !== 'false',
    samplingRate: parseFloat(process.env.MONITORING_SAMPLING_RATE || '1.0')
  }
};

// Provider-specific configs
if (config.providers.includes('kiwoom')) {
  config.kiwoom = {
    port: parseInt(process.env.KIWOOM_PORT || '3333'),
    password: process.env.KIWOOM_PASSWORD!,
    certificatePassword: process.env.KIWOOM_CERT_PASSWORD!
  };
}

if (config.providers.includes('korea_investment')) {
  config.korea_investment = {
    appKey: process.env.KOREA_INV_APP_KEY!,
    appSecret: process.env.KOREA_INV_APP_SECRET!,
    accessToken: process.env.KOREA_INV_ACCESS_TOKEN,
    environment: config.environment === 'production' ? 'real' : 'virtual'
  };
}

export default config;
```

### 2. Configuration Validation

```typescript
// config/validator.ts
import Joi from 'joi';

const configSchema = Joi.object({
  environment: Joi.string().valid('development', 'testing', 'staging', 'production').required(),
  providers: Joi.array().items(Joi.string().valid('kiwoom', 'korea_investment')).min(1).required(),
  kiwoom: Joi.when('providers', {
    is: Joi.array().has('kiwoom'),
    then: Joi.object({
      port: Joi.number().port().required(),
      password: Joi.string().required(),
      certificatePassword: Joi.string().required()
    }).required(),
    otherwise: Joi.optional()
  }),
  korea_investment: Joi.when('providers', {
    is: Joi.array().has('korea_investment'),
    then: Joi.object({
      appKey: Joi.string().required(),
      appSecret: Joi.string().required(),
      accessToken: Joi.string().optional(),
      environment: Joi.string().valid('real', 'virtual').default('virtual')
    }).required(),
    otherwise: Joi.optional()
  })
});

export function validateConfig(config: any): void {
  const { error } = configSchema.validate(config);
  if (error) {
    throw new Error(`Configuration validation failed: ${error.message}`);
  }
}
```

## 📊 Monitoring & Observability

### 1. Structured Logging

```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Usage with context
logger.info('Order created', {
  orderId: order.id,
  symbol: order.symbol,
  userId: context.userId,
  duration: Date.now() - startTime
});
```

### 2. Metrics Collection

```typescript
class MetricsCollector {
  private counters: Map<string, number> = new Map();
  private histograms: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();

  increment(name: string, value: number = 1, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.counters.set(key, (this.counters.get(key) || 0) + value);
  }

  record(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key)!.push(value);
  }

  set(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.buildKey(name, labels);
    this.gauges.set(key, value);
  }

  getPrometheusMetrics(): string {
    const metrics: string[] = [];

    // Counters
    for (const [key, value] of this.counters) {
      metrics.push(`${key} ${value}`);
    }

    // Histograms
    for (const [key, values] of this.histograms) {
      const sum = values.reduce((a, b) => a + b, 0);
      const count = values.length;
      metrics.push(`${key}_sum ${sum}`);
      metrics.push(`${key}_count ${count}`);
    }

    // Gauges
    for (const [key, value] of this.gauges) {
      metrics.push(`${key} ${value}`);
    }

    return metrics.join('\n');
  }

  private buildKey(name: string, labels?: Record<string, string>): string {
    if (!labels) return name;
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}
```

### 3. Health Checks

```typescript
class HealthChecker {
  constructor(
    private sdk: KSETSDK,
    private dependencies: { [name: string]: () => Promise<boolean> }
  ) {}

  async checkHealth(): Promise<HealthStatus> {
    const checks: HealthCheck[] = [];

    // SDK connection check
    checks.push({
      name: 'sdk_connection',
      status: this.sdk.isConnected() ? 'healthy' : 'unhealthy',
      message: this.sdk.isConnected() ? 'Connected' : 'Disconnected'
    });

    // Dependency checks
    for (const [name, checkFn] of Object.entries(this.dependencies)) {
      try {
        const isHealthy = await checkFn();
        checks.push({
          name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          message: isHealthy ? 'OK' : 'Failed'
        });
      } catch (error) {
        checks.push({
          name,
          status: 'unhealthy',
          message: (error as Error).message
        });
      }
    }

    const overallStatus = checks.every(c => c.status === 'healthy') ? 'healthy' : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks
    };
  }
}

interface HealthStatus {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  checks: HealthCheck[];
}

interface HealthCheck {
  name: string;
  status: 'healthy' | 'unhealthy';
  message: string;
}
```

## 📦 Code Organization

### 1. Project Structure

```
src/
├── config/           # Configuration management
├── services/         # Business logic services
├── repositories/     # Data access layer
├── models/          # Domain models
├── utils/           # Utility functions
├── middleware/      # Express middleware
├── controllers/     # HTTP controllers
├── validators/      # Input validation
├── errors/          # Custom error types
├── types/           # TypeScript type definitions
└── index.ts         # Application entry point
```

### 2. Naming Conventions

```typescript
// Files: kebab-case
order-service.ts
market-data-repository.ts
trading-validator.ts

// Classes: PascalCase
class OrderService {}
class MarketDataRepository {}
class TradingValidator {}

// Functions: camelCase
function createOrder() {}
function validateMarketData() {}
function calculatePortfolioValue() {}

// Constants: UPPER_SNAKE_CASE
const MAX_ORDER_SIZE = 1000000;
const DEFAULT_TIMEOUT = 30000;
const SUPPORTED_SYMBOLS = ['005930', '000660'];

// Interfaces: PascalCase with 'I' prefix (optional)
interface OrderRequest {}
interface MarketDataResponse {}
// or
interface OrderRequest {}
interface MarketDataResponse {}
```

### 3. Type Definitions

```typescript
// types/index.ts
export interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit';
  quantity: number;
  price?: number;
  metadata?: OrderMetadata;
}

export interface OrderMetadata {
  source: string;
  strategyId?: string;
  tags?: string[];
  [key: string]: any;
}

// Use union types for enums
export type OrderStatus = 'pending' | 'accepted' | 'filled' | 'cancelled' | 'rejected';

// Use generic types for reusable components
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
```

## 🚀 Deployment

### 1. Docker Configuration

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY dist/ ./dist/

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S kset -u 1001

# Change ownership
RUN chown -R kset:nodejs /app
USER kset

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

### 2. Environment Configuration

```yaml
# docker-compose.yml
version: '3.8'

services:
  kset-app:
    build: .
    environment:
      - NODE_ENV=production
      - KSET_PROVIDERS=kiwoom,korea_investment
      - KIWOOM_PORT=3333
      - KOREA_INV_APP_KEY=${KOREA_INV_APP_KEY}
      - KOREA_INV_APP_SECRET=${KOREA_INV_APP_SECRET}
      - REDIS_URL=redis://redis:6379
    ports:
      - "3000:3000"
    depends_on:
      - redis
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

volumes:
  redis_data:
```

### 3. Monitoring Setup

```yaml
# monitoring/docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus

  grafana:
    image: grafana/grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./grafana/datasources:/etc/grafana/provisioning/datasources

volumes:
  prometheus_data:
  grafana_data:
```

---

By following these best practices, you'll create robust, maintainable, and performant applications with KSET. For specific implementation details, refer to the other documentation sections and examples.