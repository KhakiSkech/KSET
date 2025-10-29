# KSET Code Examples

This page provides comprehensive code examples demonstrating various KSET features and use cases.

## 📋 Table of Contents

- [Basic Setup](#basic-setup)
- [Order Management](#order-management)
- [Market Data](#market-data)
- [Real-time Features](#real-time-features)
- [Advanced Order Types](#advanced-order-types)
- [Risk Management](#risk-management)
- [Algorithmic Trading](#algorithmic-trading)
- [Portfolio Management](#portfolio-management)
- [Error Handling](#error-handling)
- [Performance Optimization](#performance-optimization)
- [Testing](#testing)
- [Plugin Development](#plugin-development)

## Basic Setup

### Initialize KSET SDK

```typescript
import { KSETSDK, createKSETSDK } from '@kset/kset';

// Method 1: Direct instantiation
const sdk = new KSETSDK({
  providers: ['kiwoom', 'korea_investment'],
  debug: true,
  performance: {
    enabled: true,
    samplingRate: 1.0,
    maxLatency: 1000
  },
  errorHandling: {
    maxRetries: 3,
    retryDelay: 1000,
    enableFallback: true
  },
  cache: {
    enabled: true,
    ttl: 300,
    maxSize: 1000
  }
});

// Method 2: Using factory function
const sdk = createKSETSDK({
  providers: ['kiwoom'],
  debug: false
});

// Connect to providers
await sdk.connect();
console.log('KSET connected successfully');
```

### Configuration with Environment Variables

```typescript
import dotenv from 'dotenv';

dotenv.config();

const sdk = new KSETSDK({
  providers: process.env.KSET_PROVIDERS?.split(',') || ['kiwoom'],
  kiwoom: {
    port: parseInt(process.env.KIWOOM_PORT || '3333'),
    password: process.env.KIWOOM_PASSWORD,
    certificatePassword: process.env.KIWOOM_CERT_PASSWORD
  },
  korea_investment: {
    appKey: process.env.KOREA_INV_APP_KEY,
    appSecret: process.env.KOREA_INV_APP_SECRET,
    accessToken: process.env.KOREA_INV_ACCESS_TOKEN
  },
  debug: process.env.NODE_ENV === 'development'
});
```

## Order Management

### Create Basic Orders

```typescript
// Market Order
const marketOrder = await sdk.createOrder({
  symbol: '005930', // Samsung Electronics
  side: 'buy',
  type: 'market',
  quantity: 100
});

// Limit Order
const limitOrder = await sdk.createOrder({
  symbol: '000660', // SK Hynix
  side: 'sell',
  type: 'limit',
  quantity: 50,
  price: 120000
});

console.log('Orders created:', { marketOrder, limitOrder });
```

### Enhanced Orders with Metadata

```typescript
const enhancedOrder = await sdk.createOrder({
  symbol: '051910', // LG Chem
  side: 'buy',
  type: 'limit',
  quantity: 10,
  price: 450000,
  metadata: {
    source: 'algorithm',
    strategyId: 'mean_reversion_v1',
    tags: ['intraday', 'momentum', 'large_cap'],
    priority: 8,
    notes: 'RSI oversold signal'
  },
  riskSettings: {
    maxOrderSize: 5000000,
    maxPositionSize: 50000000,
    maxDailyLoss: 10000000
  }
});

console.log('Enhanced order created:', enhancedOrder);
```

### Order Monitoring

```typescript
// Listen for order updates
sdk.on('order:submitted', (order) => {
  console.log('Order submitted:', order.id);
});

sdk.on('order:accepted', (order) => {
  console.log('Order accepted:', order.id);
});

sdk.on('order:filled', (order, fill) => {
  console.log('Order filled:', {
    orderId: order.id,
    fillId: fill.fillId,
    quantity: fill.quantity,
    price: fill.price,
    commission: fill.commission
  });
});

sdk.on('order:cancelled', (order) => {
  console.log('Order cancelled:', order.id);
});

// Create order and monitor
const order = await sdk.createOrder({
  symbol: '005930',
  side: 'buy',
  type: 'limit',
  quantity: 100,
  price: 80000
});

// Wait for order completion
const completedOrder = await new Promise((resolve) => {
  const checkOrder = async () => {
    const currentOrder = await sdk.getOrder(order.id);
    if (currentOrder?.status === 'filled' || currentOrder?.status === 'cancelled') {
      resolve(currentOrder);
    } else {
      setTimeout(checkOrder, 1000);
    }
  };
  checkOrder();
});

console.log('Order completed:', completedOrder);
```

### Order Modification and Cancellation

```typescript
// Create initial order
const order = await sdk.createOrder({
  symbol: '035420', // NAVER
  side: 'buy',
  type: 'limit',
  quantity: 20,
  price: 150000
});

// Modify order
const modifiedOrder = await sdk.modifyOrder(order.id, {
  quantity: 30,
  price: 148000
});

console.log('Order modified:', modifiedOrder);

// Cancel order
const cancelResult = await sdk.cancelOrder(modifiedOrder.id);
console.log('Order cancelled:', cancelResult);
```

## Market Data

### Get Current Market Data

```typescript
// Get single symbol market data
const marketData = await sdk.getMarketData('005930');
console.log('Market Data:', {
  symbol: marketData.symbol,
  price: marketData.price,
  volume: marketData.volume,
  timestamp: marketData.timestamp
});

// Get enhanced market data with analytics
const enhancedData = await sdk.getMarketData('005930');
console.log('Technical Indicators:', enhancedData.technicalIndicators);
console.log('Market Sentiment:', enhancedData.sentiment);
console.log('Trade Statistics:', enhancedData.tradeStats);
```

### Batch Market Data Requests

```typescript
const symbols = ['005930', '000660', '051910', '035420', '068270'];
const marketDataPromises = symbols.map(symbol =>
  sdk.getMarketData(symbol)
);

const marketDataResults = await Promise.all(marketDataPromises);

marketDataResults.forEach(data => {
  if (data) {
    console.log(`${data.symbol}: ₩${data.price.toLocaleString()} (${data.volume} shares)`);
  }
});
```

### Real-time Market Data Subscription

```typescript
// Subscribe to real-time data
const symbols = ['005930', '000660'];
await sdk.subscribeMarketData(symbols);

// Listen for market data updates
sdk.on('market:data', (data) => {
  console.log('Market Data Update:', {
    symbol: data.symbol,
    price: data.price,
    volume: data.volume,
    timestamp: data.timestamp
  });
});

// Listen to specific market events
sdk.on('market:trade', (trade) => {
  console.log('Trade:', trade);
});

sdk.on('market:quote', (quote) => {
  console.log('Quote:', quote);
});

sdk.on('market:orderbook', (orderbook) => {
  console.log('Order Book:', orderbook);
});

// Keep subscription active
setTimeout(async () => {
  await sdk.unsubscribeMarketData(symbols);
  console.log('Unsubscribed from market data');
}, 60000); // 1 minute
```

### Technical Analysis

```typescript
const marketData = await sdk.getMarketData('005930');
const indicators = marketData.technicalIndicators;

console.log('Moving Averages:', indicators.movingAverages);
console.log('Momentum Indicators:', indicators.momentum);
console.log('Volatility Indicators:', indicators.volatility);

// Example: RSI-based signal
const rsi = indicators.momentum.rsi;
if (rsi < 30) {
  console.log('Oversold signal - potential buy opportunity');
} else if (rsi > 70) {
  console.log('Overbought signal - potential sell opportunity');
}

// Example: Moving average crossover
const sma5 = indicators.movingAverages.sma5;
const sma20 = indicators.movingAverages.sma20;
if (sma5 > sma20) {
  console.log('Golden cross - bullish signal');
} else if (sma5 < sma20) {
  console.log('Death cross - bearish signal');
}
```

## Real-time Features

### WebSocket Connection Management

```typescript
// Custom WebSocket event handling
sdk.on('connection:connected', (provider) => {
  console.log(`Connected to provider: ${provider}`);
});

sdk.on('connection:disconnected', (provider, reason) => {
  console.log(`Disconnected from ${provider}:`, reason);
});

sdk.on('connection:error', (provider, error) => {
  console.error(`Connection error with ${provider}:`, error);
});

// Monitor connection status
setInterval(() => {
  console.log('Connection status:', sdk.isConnected());
}, 5000);
```

### Real-time Order Book

```typescript
class OrderBookManager {
  private orderBooks: Map<string, any> = new Map();

  constructor(private sdk: KSETSDK) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.sdk.on('market:orderbook', (orderbook) => {
      this.orderBooks.set(orderbook.symbol, orderbook);
      this.displayOrderBook(orderbook);
    });
  }

  private displayOrderBook(orderbook: any) {
    console.log(`\n=== Order Book: ${orderbook.symbol} ===`);
    console.log('Bids:');
    orderbook.bids.slice(0, 5).forEach((bid: any) => {
      console.log(`  ₩${bid.price} - ${bid.quantity}`);
    });
    console.log('Asks:');
    orderbook.asks.slice(0, 5).forEach((ask: any) => {
      console.log(`  ₩${ask.price} - ${ask.quantity}`);
    });
  }

  getBestBid(symbol: string): number | null {
    const orderBook = this.orderBooks.get(symbol);
    return orderBook?.bids[0]?.price || null;
  }

  getBestAsk(symbol: string): number | null {
    const orderBook = this.orderBooks.get(symbol);
    return orderBook?.asks[0]?.price || null;
  }

  getSpread(symbol: string): number | null {
    const bid = this.getBestBid(symbol);
    const ask = this.getBestAsk(symbol);
    return bid && ask ? ask - bid : null;
  }
}

const orderBookManager = new OrderBookManager(sdk);
await sdk.subscribeMarketData(['005930']);
```

## Advanced Order Types

### TWAP (Time-Weighted Average Price) Execution

```typescript
const twapOrder = await sdk.createOrder({
  symbol: '005930',
  side: 'buy',
  type: 'limit',
  quantity: 1000,
  price: 80500, // Maximum price
  executionStrategy: {
    type: 'TWAP',
    parameters: {
      duration: 300000, // 5 minutes
      sliceCount: 10,   // 10 slices
      minSliceSize: 50
    },
    timeConstraints: {
      startTime: new Date(),
      endTime: new Date(Date.now() + 300000)
    }
  }
});

console.log('TWAP order created:', twapOrder);
```

### Iceberg Order

```typescript
const icebergOrder = await sdk.createOrder({
  symbol: '000660',
  side: 'buy',
  type: 'limit',
  quantity: 10000, // Total quantity
  price: 120000,
  executionStrategy: {
    type: 'ICEBERG',
    parameters: {
      displayQuantity: 500, // Show only 500 shares at a time
      randomization: true  // Randomize slice sizes
    }
  }
});

console.log('Iceberg order created:', icebergOrder);
```

### Conditional Order

```typescript
// Create a conditional order that triggers when price crosses a threshold
const conditionalOrder = await sdk.createOrder({
  symbol: '051910',
  side: 'buy',
  type: 'limit',
  quantity: 100,
  price: 445000,
  metadata: {
    source: 'conditional',
    condition: {
      type: 'price_cross',
      threshold: 440000,
      direction: 'above'
    }
  }
});

console.log('Conditional order created:', conditionalOrder);
```

## Risk Management

### Risk Limits

```typescript
const orderWithRiskLimits = await sdk.createOrder({
  symbol: '005930',
  side: 'buy',
  type: 'limit',
  quantity: 100,
  price: 80000,
  riskSettings: {
    maxOrderSize: 1000000, // Maximum 1M KRW per order
    maxDailyLoss: 5000000, // Maximum 5M KRW daily loss
    maxPositionSize: 50000000, // Maximum 50M KRW position
    riskLimits: [
      {
        type: 'max_orders_per_minute',
        value: 10,
        period: 'minute',
        action: 'reject'
      },
      {
        type: 'max_daily_loss',
        value: 5000000,
        period: 'day',
        action: 'stop'
      }
    ]
  }
});
```

### Risk Monitoring

```typescript
// Listen to risk alerts
sdk.on('risk:alert', (alert) => {
  console.warn('Risk Alert:', {
    id: alert.id,
    type: alert.type,
    severity: alert.severity,
    message: alert.message,
    suggestedActions: alert.suggestedActions
  });
});

sdk.on('risk:limit_breached', (limit, value) => {
  console.error('Risk Limit Breached:', {
    type: limit.type,
    value: value,
    limit: limit.value,
    action: limit.action
  });
});
```

## Algorithmic Trading

### Simple Moving Average Crossover Strategy

```typescript
class MovingAverageStrategy {
  private position = 0;
  private prices: number[] = [];

  constructor(
    private sdk: KSETSDK,
    private symbol: string,
    private shortPeriod: number = 5,
    private longPeriod: number = 20
  ) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.sdk.on('market:data', (data) => {
      if (data.symbol === this.symbol) {
        this.handleMarketData(data);
      }
    });
  }

  private async handleMarketData(data: EnhancedMarketData) {
    this.prices.push(data.price);

    // Keep only recent prices
    if (this.prices.length > this.longPeriod) {
      this.prices.shift();
    }

    if (this.prices.length === this.longPeriod) {
      const shortMA = this.calculateMA(this.shortPeriod);
      const longMA = this.calculateMA(this.longPeriod);

      await this.checkSignals(shortMA, longMA);
    }
  }

  private calculateMA(period: number): number {
    const recentPrices = this.prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private async checkSignals(shortMA: number, longMA: number) {
    const currentPrice = this.prices[this.prices.length - 1];

    // Golden cross - buy signal
    if (this.position === 0 && shortMA > longMA) {
      try {
        const order = await this.sdk.createOrder({
          symbol: this.symbol,
          side: 'buy',
          type: 'market',
          quantity: 100,
          metadata: {
            source: 'algorithm',
            strategyId: 'ma_crossover',
            signal: 'golden_cross'
          }
        });
        this.position = 100;
        console.log(`Buy order placed: ${order.id} at ${currentPrice}`);
      } catch (error) {
        console.error('Failed to place buy order:', error);
      }
    }

    // Death cross - sell signal
    else if (this.position > 0 && shortMA < longMA) {
      try {
        const order = await this.sdk.createOrder({
          symbol: this.symbol,
          side: 'sell',
          type: 'market',
          quantity: this.position,
          metadata: {
            source: 'algorithm',
            strategyId: 'ma_crossover',
            signal: 'death_cross'
          }
        });
        this.position = 0;
        console.log(`Sell order placed: ${order.id} at ${currentPrice}`);
      } catch (error) {
        console.error('Failed to place sell order:', error);
      }
    }
  }
}

// Start strategy
const strategy = new MovingAverageStrategy(sdk, '005930');
await sdk.subscribeMarketData(['005930']);
```

### Mean Reversion Strategy

```typescript
class MeanReversionStrategy {
  private lookbackPeriod = 20;
  private zScoreThreshold = 2.0;

  constructor(private sdk: KSETSDK, private symbol: string) {
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.sdk.on('market:data', (data) => {
      if (data.symbol === this.symbol) {
        this.handleMarketData(data);
      }
    });
  }

  private async handleMarketData(data: EnhancedMarketData) {
    // Get historical data (this would need to be implemented)
    const historicalPrices = await this.getHistoricalPrices(this.symbol, this.lookbackPeriod);

    if (historicalPrices.length < this.lookbackPeriod) {
      return;
    }

    const currentPrice = data.price;
    const mean = historicalPrices.reduce((sum, price) => sum + price, 0) / historicalPrices.length;
    const stdDev = Math.sqrt(
      historicalPrices.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / historicalPrices.length
    );

    const zScore = (currentPrice - mean) / stdDev;

    // Oversold condition (zScore < -2)
    if (zScore < -this.zScoreThreshold) {
      await this.placeBuyOrder(currentPrice, zScore);
    }

    // Overbought condition (zScore > 2)
    else if (zScore > this.zScoreThreshold) {
      await this.placeSellOrder(currentPrice, zScore);
    }
  }

  private async placeBuyOrder(price: number, zScore: number) {
    try {
      const order = await this.sdk.createOrder({
        symbol: this.symbol,
        side: 'buy',
        type: 'limit',
        quantity: 100,
        price: price * 0.99, // Buy 1% below current price
        metadata: {
          source: 'algorithm',
          strategyId: 'mean_reversion',
          signal: 'oversold',
          zScore: zScore
        }
      });
      console.log(`Mean reversion buy order placed: ${order.id}, Z-score: ${zScore.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to place buy order:', error);
    }
  }

  private async placeSellOrder(price: number, zScore: number) {
    try {
      const order = await this.sdk.createOrder({
        symbol: this.symbol,
        side: 'sell',
        type: 'limit',
        quantity: 100,
        price: price * 1.01, // Sell 1% above current price
        metadata: {
          source: 'algorithm',
          strategyId: 'mean_reversion',
          signal: 'overbought',
          zScore: zScore
        }
      });
      console.log(`Mean reversion sell order placed: ${order.id}, Z-score: ${zScore.toFixed(2)}`);
    } catch (error) {
      console.error('Failed to place sell order:', error);
    }
  }

  private async getHistoricalPrices(symbol: string, days: number): Promise<number[]> {
    // This would fetch historical price data
    // For now, return empty array
    return [];
  }
}
```

## Portfolio Management

### Portfolio Overview

```typescript
async function getPortfolioOverview(sdk: KSETSDK) {
  const accountInfo = await sdk.getAccountInfo();
  const balances = await sdk.getBalances();
  const positions = await sdk.getPositions();

  console.log('=== Portfolio Overview ===');
  console.log('Account:', accountInfo.name);
  console.log('Status:', accountInfo.status);
  console.log('Currency:', accountInfo.currency);

  console.log('\nBalances:');
  balances.forEach(balance => {
    console.log(`${balance.asset}: ${balance.available.toLocaleString()} (locked: ${balance.locked})`);
  });

  console.log('\nPositions:');
  let totalUnrealizedPnL = 0;
  positions.forEach(position => {
    totalUnrealizedPnL += position.unrealizedPnL;
    console.log(`${position.symbol}: ${position.quantity} shares @ ₩${position.averagePrice.toLocaleString()} (PnL: ₩${position.unrealizedPnL.toLocaleString()})`);
  });

  console.log(`\nTotal Unrealized P&L: ₩${totalUnrealizedPnL.toLocaleString()}`);
}

// Get portfolio overview
await getPortfolioOverview(sdk);
```

### Portfolio Rebalancing

```typescript
class PortfolioRebalancer {
  private targetAllocations: Map<string, number> = new Map();

  constructor(private sdk: KSETSDK) {
    // Set target allocations (e.g., 50% stocks, 30% bonds, 20% cash)
    this.targetAllocations.set('stocks', 0.5);
    this.targetAllocations.set('bonds', 0.3);
    this.targetAllocations.set('cash', 0.2);
  }

  async rebalancePortfolio() {
    const positions = await this.sdk.getPositions();
    const balances = await sdk.getBalances();

    const currentPortfolioValue = await this.calculatePortfolioValue(positions, balances);
    const rebalancingOrders: any[] = [];

    for (const [assetClass, targetAllocation] of this.targetAllocations) {
      const currentValue = await this.getAssetClassValue(assetClass, positions, balances);
      const targetValue = currentPortfolioValue * targetAllocation;
      const difference = targetValue - currentValue;

      if (Math.abs(difference) > currentPortfolioValue * 0.05) { // 5% threshold
        const order = await this.createRebalancingOrder(assetClass, difference);
        if (order) {
          rebalancingOrders.push(order);
        }
      }
    }

    return rebalancingOrders;
  }

  private async calculatePortfolioValue(positions: any[], balances: any[]): Promise<number> {
    // Calculate total portfolio value
    return 0; // Implementation would calculate based on current positions and balances
  }

  private async getAssetClassValue(assetClass: string, positions: any[], balances: any[]): Promise<number> {
    // Get current value for specific asset class
    return 0; // Implementation would filter by asset class
  }

  private async createRebalancingOrder(assetClass: string, amount: number): Promise<any> {
    // Create order to rebalance asset class
    return null; // Implementation would create appropriate order
  }
}
```

## Error Handling

### Comprehensive Error Handling

```typescript
import { CircuitBreaker, RateLimiter } from '@kset/kset/middleware';

// Create circuit breaker for API calls
const circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute timeout

// Create rate limiter
const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

class RobustTradingService {
  constructor(private sdk: KSETSDK) {}

  async createOrderWithRetry(orderData: any): Promise<any> {
    return circuitBreaker.execute(async () => {
      if (!rateLimiter.isAllowed('create_order')) {
        throw new Error('Rate limit exceeded for order creation');
      }

      try {
        const order = await this.sdk.createOrder(orderData);
        return order;
      } catch (error) {
        console.error('Order creation failed:', error);

        // Implement fallback logic
        if ((error as Error).message.includes('network')) {
          // Save order to local queue for later processing
          await this.saveOrderToQueue(orderData);
          throw new Error('Order saved to queue due to network error');
        }

        throw error;
      }
    });
  }

  private async saveOrderToQueue(orderData: any): Promise<void> {
    // Save to local storage or message queue
    console.log('Order saved to queue:', orderData);
  }
}
```

### Error Recovery

```typescript
class ErrorRecoveryService {
  private failedOrders: any[] = [];
  private maxRetries = 3;

  constructor(private sdk: KSETSDK) {
    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    this.sdk.on('order:rejected', (order, reason) => {
      console.warn('Order rejected:', { orderId: order.id, reason });
      this.handleRejectedOrder(order, reason);
    });

    this.sdk.on('connection:error', (provider, error) => {
      console.error('Connection error:', { provider, error });
      this.handleConnectionError(provider, error);
    });
  }

  private async handleRejectedOrder(order: any, reason: string) {
    // Retry logic for rejected orders
    if (reason.includes('temporary') || reason.includes('timeout')) {
      const retries = order.metadata?.retries || 0;

      if (retries < this.maxRetries) {
        console.log(`Retrying order ${order.id} (attempt ${retries + 1})`);

        setTimeout(async () => {
          try {
            const retryOrder = await this.sdk.createOrder({
              ...order,
              metadata: {
                ...order.metadata,
                retries: retries + 1,
                originalOrderId: order.id
              }
            });
            console.log('Order retry successful:', retryOrder.id);
          } catch (error) {
            console.error('Order retry failed:', error);
          }
        }, 5000 * (retries + 1)); // Exponential backoff
      } else {
        console.error(`Order ${order.id} failed after ${this.maxRetries} retries`);
        this.failedOrders.push({ order, reason });
      }
    }
  }

  private async handleConnectionError(provider: string, error: Error) {
    // Implement connection recovery logic
    console.log(`Attempting to reconnect to ${provider}...`);

    setTimeout(async () => {
      try {
        await this.sdk.connect();
        console.log(`Successfully reconnected to ${provider}`);
      } catch (reconnectError) {
        console.error(`Reconnection to ${provider} failed:`, reconnectError);
      }
    }, 10000); // Wait 10 seconds before reconnecting
  }
}
```

## Performance Optimization

### Batch Operations

```typescript
class BatchOrderProcessor {
  private batchSize = 10;
  private batchDelay = 100; // milliseconds between batches

  constructor(private sdk: KSETSDK) {}

  async processBatchOrders(orders: any[]): Promise<any[]> {
    const results: any[] = [];

    for (let i = 0; i < orders.length; i += this.batchSize) {
      const batch = orders.slice(i, i + this.batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(order => this.sdk.createOrder(order))
      );

      results.push(...batchResults);

      // Add delay between batches to avoid rate limiting
      if (i + this.batchSize < orders.length) {
        await new Promise(resolve => setTimeout(resolve, this.batchDelay));
      }
    }

    return results;
  }
}
```

### Caching Strategy

```typescript
class CachedMarketDataService {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTimeout = 5000; // 5 seconds

  constructor(private sdk: KSETSDK) {}

  async getMarketData(symbol: string): Promise<any> {
    const cached = this.cache.get(symbol);
    const now = Date.now();

    if (cached && (now - cached.timestamp) < this.cacheTimeout) {
      return cached.data;
    }

    const marketData = await this.sdk.getMarketData(symbol);
    this.cache.set(symbol, { data: marketData, timestamp: now });

    return marketData;
  }

  async getMultipleMarketData(symbols: string[]): Promise<Map<string, any>> {
    const results = new Map<string, any>();
    const uncachedSymbols: string[] = [];

    // Check cache first
    for (const symbol of symbols) {
      const cached = this.cache.get(symbol);
      const now = Date.now();

      if (cached && (now - cached.timestamp) < this.cacheTimeout) {
        results.set(symbol, cached.data);
      } else {
        uncachedSymbols.push(symbol);
      }
    }

    // Fetch uncached symbols in parallel
    if (uncachedSymbols.length > 0) {
      const fetchPromises = uncachedSymbols.map(async (symbol) => {
        const marketData = await this.sdk.getMarketData(symbol);
        this.cache.set(symbol, { data: marketData, timestamp: Date.now() });
        return { symbol, marketData };
      });

      const fetchedData = await Promise.all(fetchPromises);
      fetchedData.forEach(({ symbol, marketData }) => {
        results.set(symbol, marketData);
      });
    }

    return results;
  }
}
```

## Testing

### Unit Tests

```typescript
import { KSETTestFramework, createMockOrder } from '@kset/kset/testing';

describe('Order Management', () => {
  let framework: KSETTestFramework;
  let sdk: any;

  beforeAll(async () => {
    framework = new KSETTestFramework({
      verbose: true,
      mockProviders: true
    });
  });

  beforeEach(async () => {
    const testContext = await framework.createTestContext();
    sdk = testContext.sdk;
    await sdk.connect();
  });

  afterEach(async () => {
    await sdk.disconnect();
  });

  test('should create a limit order', async () => {
    const orderData = {
      symbol: '005930',
      side: 'buy',
      type: 'limit',
      quantity: 100,
      price: 80000
    };

    const order = await sdk.createOrder(orderData);

    expect(order).toBeDefined();
    expect(order.id).toBeDefined();
    expect(order.symbol).toBe('005930');
    expect(order.side).toBe('buy');
    expect(order.type).toBe('limit');
    expect(order.quantity).toBe(100);
    expect(order.price).toBe(80000);
    expect(order.status).toBe('pending');
  });

  test('should cancel an order', async () => {
    const order = await sdk.createOrder({
      symbol: '000660',
      side: 'sell',
      type: 'limit',
      quantity: 50,
      price: 120000
    });

    const cancelResult = await sdk.cancelOrder(order.id);
    expect(cancelResult).toBe(true);

    const cancelledOrder = await sdk.getOrder(order.id);
    expect(cancelledOrder?.status).toBe('cancelled');
  });
});
```

### Integration Tests

```typescript
import { KSETIntegrationTestFramework } from '@kset/kset/testing';

describe('Trading Workflow Integration', () => {
  let framework: KSETIntegrationTestFramework;

  beforeAll(async () => {
    framework = new KSETIntegrationTestFramework({
      providers: ['mock'],
      symbols: ['005930', '000660'],
      realTimeSimulation: true
    });
  });

  test('should handle complete trading workflow', async () => {
    await framework.runAllTests();
    const summary = framework.getSummary();

    expect(summary.failed).toBe(0);
    expect(summary.passed).toBeGreaterThan(0);
  });
});
```

## Plugin Development

### Custom Plugin Example

```typescript
import { KSETPlugin } from '@kset/kset';

@Plugin({
  name: 'volatility-tracker',
  version: '1.0.0',
  dependencies: []
})
class VolatilityTrackerPlugin implements KSETPlugin {
  name = 'volatility-tracker';
  version = '1.0.0';
  private prices: Map<string, number[]> = new Map();
  private volatilityThreshold = 0.02; // 2%

  async initialize(sdk: KSETSDK): Promise<void> {
    console.log('Initializing Volatility Tracker Plugin');

    sdk.on('market:data', (data) => {
      this.trackVolatility(data);
    });

    sdk.on('connection:connected', () => {
      console.log('Volatility tracker connected');
    });
  }

  async destroy(): Promise<void> {
    console.log('Destroying Volatility Tracker Plugin');
    this.prices.clear();
  }

  private trackVolatility(data: EnhancedMarketData): void {
    const symbol = data.symbol;
    const price = data.price;

    if (!this.prices.has(symbol)) {
      this.prices.set(symbol, []);
    }

    const priceHistory = this.prices.get(symbol)!;
    priceHistory.push(price);

    // Keep only last 20 prices
    if (priceHistory.length > 20) {
      priceHistory.shift();
    }

    // Calculate volatility if we have enough data
    if (priceHistory.length >= 10) {
      const returns = this.calculateReturns(priceHistory);
      const volatility = this.calculateStandardDeviation(returns);

      if (volatility > this.volatilityThreshold) {
        console.warn(`High volatility detected for ${symbol}: ${(volatility * 100).toFixed(2)}%`);
      }
    }
  }

  private calculateReturns(prices: number[]): number[] {
    const returns: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
    }
    return returns;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }
}

// Register the plugin
const plugin = new VolatilityTrackerPlugin();
await sdk.getPluginManager().register(plugin);
```

---

These examples demonstrate the comprehensive capabilities of KSET. For more specific use cases and advanced configurations, refer to the individual documentation sections.