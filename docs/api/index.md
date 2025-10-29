# KSET API Documentation

> Complete API reference for the Korea Stock Exchange Trading Library

## Overview

KSET provides a unified interface for accessing Korean securities markets through multiple brokers. This comprehensive API documentation covers all classes, methods, and interfaces available in the library.

## Table of Contents

- [Core Classes](#core-classes)
- [Providers](#providers)
- [Engines](#engines)
- [Interfaces](#interfaces)
- [Types](#types)
- [Error Handling](#error-handling)
- [Real-time Data](#real-time-data)
- [Algorithm Trading](#algorithm-trading)
- [Research & Analytics](#research--analytics)

## Core Classes

### KSET

The main entry point for the KSET library. Provides unified access to all Korean securities brokers.

```typescript
import { KSET } from 'kset';

const kset = new KSET({
  logLevel: 'info',
  defaultTimeout: 30000,
  retryAttempts: 3
});
```

#### Constructor

```typescript
constructor(settings?: Partial<KSETSettings>)
```

Creates a new KSET instance with optional configuration settings.

**Parameters:**
- `settings` (optional): Configuration object for the KSET instance

**Returns:** A new KSET instance

#### Methods

##### Provider Management

###### createProvider

```typescript
async createProvider(brokerId: string, config: ProviderConfig): Promise<IKSETProvider>
```

Creates and initializes a broker provider.

**Parameters:**
- `brokerId`: The broker identifier (e.g., 'kiwoom', 'korea-investment')
- `config`: Provider configuration object

**Returns:** Initialized provider instance

**Example:**
```typescript
const kiwoom = await kset.createProvider('kiwoom', {
  credentials: {
    certificate: './cert.p12',
    password: 'password',
    accountNumber: '12345678-01'
  },
  environment: 'production'
});
```

###### createMultipleProviders

```typescript
async createMultipleProviders(
  configs: { brokerId: string; config: ProviderConfig }[]
): Promise<Map<string, IKSETProvider>>
```

Creates multiple providers simultaneously.

**Parameters:**
- `configs`: Array of broker configurations

**Returns:** Map of broker IDs to provider instances

###### getAvailableBrokers

```typescript
getAvailableBrokers(): string[]
```

Returns a list of available broker providers.

**Returns:** Array of broker IDs

###### compareBrokers

```typescript
compareBrokers(brokerIds: string[]): ProviderComparison
```

Compares features and capabilities of multiple brokers.

**Parameters:**
- `brokerIds`: Array of broker IDs to compare

**Returns:** Comparison results

###### getBrokersWithFeature

```typescript
getBrokersWithFeature(feature: string): string[]
```

Filters brokers that support a specific feature.

**Parameters:**
- `feature`: Feature name (e.g., 'real-time-data', 'trading')

**Returns:** Array of broker IDs supporting the feature

##### Market Data

###### compareMarketData

```typescript
async compareMarketData(symbol: string): Promise<Map<string, MarketData>>
```

Retrieves and compares market data from all available providers.

**Parameters:**
- `symbol`: Stock symbol code

**Returns:** Map of provider IDs to market data

**Example:**
```typescript
const comparison = await kset.compareMarketData('005930');
for (const [provider, data] of comparison.entries()) {
  console.log(`${provider}: ${data.currentPrice}원`);
}
```

##### Smart Order Routing

###### routeOrder

```typescript
async routeOrder(
  order: OrderRequest,
  criteria: OrderRoutingCriteria = { priority: 'price' }
): Promise<OrderRoutingResult>
```

Routes an order to the optimal provider based on specified criteria.

**Parameters:**
- `order`: Order request details
- `criteria`: Routing criteria (optional, defaults to price priority)

**Returns:** Order routing result with execution details

**Example:**
```typescript
const result = await kset.routeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'limit',
  quantity: 10,
  price: 85000
}, {
  priority: 'best_price',
  excludeBrokers: ['problematic-broker']
});
```

##### Analytics

###### getMarketStatistics

```typescript
getMarketStatistics(): MarketStatistics
```

Returns current market statistics and system metrics.

**Returns:** Market statistics object

##### Configuration

###### configure

```typescript
configure(settings: KSETSettings): void
```

Updates global configuration settings.

**Parameters:**
- `settings`: New configuration settings

###### getSettings

```typescript
getSettings(): KSETSettings
```

Returns current configuration settings.

**Returns:** Current settings object

##### Advanced Features

###### getMarketEngine

```typescript
getMarketEngine(): KoreanMarketEngine
```

Access to the Korean market engine for advanced operations.

**Returns:** Market engine instance

###### getComplianceEngine

```typescript
getComplianceEngine(): KoreanComplianceEngine
```

Access to the compliance engine for regulatory checks.

**Returns:** Compliance engine instance

## Interfaces

### KSETSettings

Configuration interface for KSET instances.

```typescript
interface KSETSettings {
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  defaultTimeout: number;
  retryAttempts: number;
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  realTime: {
    maxSubscriptions: number;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
}
```

### ProviderConfig

Configuration interface for broker providers.

```typescript
interface ProviderConfig {
  credentials: {
    certificate?: string;
    password?: string;
    accountNumber?: string;
    apiKey?: string;
    apiSecret?: string;
  };
  environment: 'development' | 'production' | 'paper';
  options?: Record<string, any>;
}
```

### OrderRequest

Interface for order requests.

```typescript
interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit' | 'stop' | 'stop-limit' | 'iceberg';
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: 'day' | 'gtc' | 'ioc' | 'fok';
}
```

### MarketData

Interface for market data responses.

```typescript
interface MarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  changePrice: number;
  changeRate: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  previousClose: number;
  marketCap: number;
  timestamp: Date;
}
```

## Types

### MarketType

Supported Korean market types.

```typescript
type MarketType = 'KOSPI' | 'KOSDAQ' | 'KONEX';
```

### OrderSide

Order direction types.

```typescript
type OrderSide = 'buy' | 'sell';
```

### OrderType

Supported order types.

```typescript
type OrderType =
  | 'market'
  | 'limit'
  | 'stop'
  | 'stop-limit'
  | 'iceberg'
  | 'twap'
  | 'vwap';
```

### ProviderStatus

Provider connection status.

```typescript
type ProviderStatus = 'connected' | 'disconnected' | 'connecting' | 'error';
```

## Error Handling

KSET provides comprehensive error handling with specific error types:

### KSETError

Base error class for all KSET-related errors.

```typescript
class KSETError extends Error {
  readonly code: string;
  readonly provider: string;
  readonly details: any;

  constructor(code: string, message: string, provider: string, details?: any);
}
```

### Error Codes

Common error codes used throughout the library:

```typescript
enum ERROR_CODES {
  // Connection errors
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',

  // Order errors
  INVALID_ORDER = 'INVALID_ORDER',
  INSUFFICIENT_BALANCE = 'INSUFFICIENT_BALANCE',
  ORDER_NOT_FOUND = 'ORDER_NOT_FOUND',

  // Market data errors
  DATA_UNAVAILABLE = 'DATA_UNAVAILABLE',
  INVALID_SYMBOL = 'INVALID_SYMBOL',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // Compliance errors
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',

  // Provider errors
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
  NOT_SUPPORTED = 'NOT_SUPPORTED'
}
```

### Error Handling Example

```typescript
import { KSET, KSETError, ERROR_CODES } from 'kset';

try {
  const order = await provider.placeOrder(orderRequest);
} catch (error) {
  if (error instanceof KSETError) {
    switch (error.code) {
      case ERROR_CODES.INSUFFICIENT_BALANCE:
        console.log('Insufficient balance for order');
        break;
      case ERROR_CODES.INVALID_ORDER:
        console.log('Invalid order parameters');
        break;
      default:
        console.log(`Unexpected error: ${error.message}`);
    }
  }
}
```

## Real-time Data

### Subscription Management

KSET provides WebSocket-based real-time data streaming:

#### subscribeToRealTimeData

```typescript
async subscribeToRealTimeData(
  brokerId: string,
  symbols: string[],
  callback: (data: RealTimeData) => void
): Promise<RealTimeSubscription>
```

Subscribes to real-time market data for specified symbols.

**Parameters:**
- `brokerId`: Provider to use for subscription
- `symbols`: Array of stock symbols to subscribe to
- `callback`: Callback function for real-time updates

**Returns:** Subscription object with unsubscribe method

**Example:**
```typescript
const subscription = await kset.subscribeToRealTimeData(
  'kiwoom',
  ['005930', '000660'],
  (data) => {
    console.log(`${data.symbol}: ${data.price} (${data.change})`);
  }
);

// Unsubscribe later
await subscription.unsubscribe();
```

#### RealTimeData Interface

```typescript
interface RealTimeData {
  symbol: string;
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  bidPrice: number;
  askPrice: number;
  timestamp: Date;
}
```

#### Multiple Provider Subscription

```typescript
const multiSubscription = await kset.subscribeToMultiProviderRealTimeData(
  ['kiwoom', 'korea-investment'],
  ['005930'],
  (brokerId, data) => {
    console.log(`${brokerId} - ${data.symbol}: ${data.price}`);
  }
);
```

## Algorithm Trading

### Supported Algorithms

KSET supports various algorithmic trading strategies:

#### TWAP (Time-Weighted Average Price)

```typescript
async executeTWAP(
  brokerId: string,
  parameters: TWAPParameters,
  callbacks?: AlgorithmCallbacks
): Promise<string>
```

Executes orders using TWAP algorithm.

**Parameters:**
- `brokerId`: Provider to execute algorithm
- `parameters`: TWAP configuration parameters
- `callbacks`: Optional event callbacks

**Example:**
```typescript
const algorithmId = await kset.executeTWAP('kiwoom', {
  symbol: '005930',
  side: 'buy',
  totalQuantity: 1000,
  startTime: '09:00:00',
  endTime: '15:20:00',
  maxParticipationRate: 0.1
}, {
  onPartialFill: (fill) => console.log('Partial fill:', fill),
  onComplete: (summary) => console.log('Algorithm completed:', summary)
});
```

#### VWAP (Volume-Weighted Average Price)

```typescript
async executeVWAP(
  brokerId: string,
  parameters: VWAPParameters,
  callbacks?: AlgorithmCallbacks
): Promise<string>
```

Executes orders using VWAP algorithm.

#### POV (Percentage of Volume)

```typescript
async executePOV(
  brokerId: string,
  parameters: POVParameters,
  callbacks?: AlgorithmCallbacks
): Promise<string>
```

Executes orders using POV algorithm.

### Algorithm Control

#### Control Algorithm Execution

```typescript
// Pause algorithm
await kset.controlAlgorithm(algorithmId, 'pause');

// Resume algorithm
await kset.controlAlgorithm(algorithmId, 'resume');

// Cancel algorithm
await kset.controlAlgorithm(algorithmId, 'cancel');
```

#### Algorithm Status

```typescript
const status = await kset.getAlgorithmStatus(algorithmId);
const allStatuses = await kset.getAlgorithmStatus();
```

## Research & Analytics

### Company Information

#### searchCompany

```typescript
async searchCompany(query: string, options?: SearchOptions): Promise<CompanyInfo[]>
```

Searches for companies by name or symbol.

#### getFinancialData

```typescript
async getFinancialData(symbol: string, period: FinancialPeriod): Promise<FinancialData[]>
```

Retrieves financial statements for a company.

**Example:**
```typescript
const annualData = await kset.getFinancialData('005930', 'annual');
const quarterlyData = await kset.getFinancialData('005930', 'quarterly');
```

### Market Analysis

#### analyzeStock

```typescript
async analyzeStock(symbol: string): Promise<StockAnalysis>
```

Performs comprehensive stock analysis including valuation metrics.

#### analyzePortfolio

```typescript
async analyzePortfolio(portfolio: Portfolio): Promise<PortfolioAnalysis>
```

Analyzes portfolio performance and risk metrics.

### DART Integration

KSET provides direct integration with Korea's DART (Data Analysis, Retrieval, and Transfer System):

#### searchDARTDisclosures

```typescript
async searchDARTDisclosures(params: DARTSearchParams): Promise<DARTDisclosure[]>
```

Searches corporate disclosures from DART.

**Example:**
```typescript
const disclosures = await kset.searchDARTDisclosures({
  corporationCode: '00126380',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  reportType: 'quarterly'
});
```

#### getDARTFinancialData

```typescript
async getDARTFinancialData(
  corporationCode: string,
  year: number,
  quarter?: number
): Promise<DARTFinancialData>
```

Retrieves financial data directly from DART.

## Usage Examples

### Basic Trading Workflow

```typescript
import { KSET } from 'kset';

async function basicTradingExample() {
  // Initialize KSET
  const kset = new KSET();

  // Connect to broker
  const provider = await kset.createProvider('kiwoom', {
    credentials: {
      certificate: './cert.p12',
      password: 'password',
      accountNumber: '12345678-01'
    }
  });

  // Get market data
  const marketData = await provider.getMarketData(['005930']);
  console.log('Samsung Electronics:', marketData.data[0]);

  // Place order
  const order = await provider.placeOrder({
    symbol: '005930',
    side: 'buy',
    orderType: 'limit',
    quantity: 10,
    price: 85000
  });

  console.log('Order placed:', order.data);
}
```

### Multi-Provider Strategy

```typescript
async function multiProviderExample() {
  const kset = new KSET();

  // Connect to multiple providers
  const providers = await kset.createMultipleProviders([
    { brokerId: 'kiwoom', config: kiwoomConfig },
    { brokerId: 'korea-investment', config: koreaInvestmentConfig }
  ]);

  // Compare market data
  const comparison = await kset.compareMarketData('005930');

  // Route order to best provider
  const result = await kset.routeOrder({
    symbol: '005930',
    side: 'buy',
    orderType: 'limit',
    quantity: 100,
    price: 85000
  }, {
    priority: 'best_price'
  });

  console.log('Order executed via:', result.routing.selectedBrokers);
}
```

### Real-time Data Streaming

```typescript
async function realTimeExample() {
  const kset = new KSET();
  await kset.createProvider('kiwoom', kiwoomConfig);

  // Subscribe to real-time data
  const subscription = await kset.subscribeToRealTimeData(
    'kiwoom',
    ['005930', '000660', '035420'],
    (data) => {
      console.log(`Real-time update: ${data.symbol} = ${data.price}원`);
    }
  );

  // Keep subscription active
  setTimeout(async () => {
    await subscription.unsubscribe();
    console.log('Unsubscribed from real-time data');
  }, 60000); // Unsubscribe after 1 minute
}
```

### Algorithm Trading

```typescript
async function algorithmExample() {
  const kset = new KSET();
  await kset.createProvider('kiwoom', kiwoomConfig);

  // Execute TWAP algorithm
  const algorithmId = await kset.executeTWAP('kiwoom', {
    symbol: '005930',
    side: 'buy',
    totalQuantity: 1000,
    startTime: '09:00:00',
    endTime: '15:20:00',
    maxParticipationRate: 0.05
  }, {
    onPartialFill: (fill) => {
      console.log(`Partial fill: ${fill.quantity} @ ${fill.price}`);
    },
    onComplete: (summary) => {
      console.log(`TWAP completed: ${summary.averagePrice} average price`);
    }
  });

  // Monitor algorithm status
  const status = await kset.getAlgorithmStatus(algorithmId);
  console.log('Algorithm status:', status);
}
```

## Best Practices

### Error Handling

Always implement comprehensive error handling:

```typescript
try {
  const result = await provider.placeOrder(order);
  // Handle success
} catch (error) {
  if (error instanceof KSETError) {
    // Handle KSET-specific errors
    logger.error(`KSET Error [${error.code}]: ${error.message}`);

    // Implement retry logic for transient errors
    if (error.code === ERROR_CODES.TIMEOUT_ERROR) {
      // Retry with exponential backoff
    }
  } else {
    // Handle unexpected errors
    logger.error('Unexpected error:', error);
  }
}
```

### Connection Management

Properly manage provider connections:

```typescript
// Use try-finally for cleanup
try {
  await kset.createProvider('kiwoom', config);
  // Use provider...
} finally {
  // Cleanup resources
  await kset.cleanup();
}
```

### Real-time Data

Handle real-time subscriptions properly:

```typescript
const subscription = await kset.subscribeToRealTimeData(
  'kiwoom',
  symbols,
  (data) => {
    // Process real-time data quickly
    // Avoid blocking operations in callbacks
  }
);

// Always unsubscribe when done
process.on('SIGINT', async () => {
  await subscription.unsubscribe();
  process.exit(0);
});
```

### Algorithm Trading

Monitor algorithm execution:

```typescript
const algorithmId = await kset.executeTWAP('kiwoom', parameters, {
  onProgress: (progress) => {
    console.log(`Progress: ${progress.percentage}%`);
  },
  onWarning: (warning) => {
    console.log('Warning:', warning.message);
  }
});

// Set up monitoring
const monitor = setInterval(async () => {
  const status = await kset.getAlgorithmStatus(algorithmId);
  if (status.completed) {
    clearInterval(monitor);
    console.log('Algorithm completed successfully');
  }
}, 5000);
```

## Support

For additional support:

- **Documentation**: [https://docs.kset.dev](https://docs.kset.dev)
- **GitHub Issues**: [https://github.com/kset/kset/issues](https://github.com/kset/kset/issues)
- **Community**: [https://discord.gg/kset](https://discord.gg/kset)

---

© 2024 KSET Team. All rights reserved.