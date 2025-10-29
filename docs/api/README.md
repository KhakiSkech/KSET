# API Reference

This section provides comprehensive documentation for all KSET APIs, including detailed method signatures, parameters, return types, and usage examples.

## 📚 API Documentation Sections

### **[Core Classes](./core-classes.md)**
- **KSET Class** - Main library interface and methods
- **Provider Classes** - Trading provider implementations
- **Configuration** - Setup and configuration options
- **Error Handling** - Error types and handling patterns

### **[Types and Interfaces](./types.md)**
- **Market Types** - Symbol, MarketData, OrderBook
- **Trading Types** - Order, Position, Balance
- **Account Types** - AccountInfo, Portfolio
- **Research Types** - CompanyInfo, FinancialData, Disclosure
- **Provider Types** - Capabilities, Authentication, Configuration

### **[Real-time Data API](./realtime.md)**
- **WebSocket Connections** - Real-time market data streaming
- **Subscription Management** - Subscribe/unsubscribe operations
- **Event Handling** - Market data, order, and balance events
- **Connection Management** - Reconnection and error handling

### **[Provider API](./providers.md)**
- **Kiwoom Provider** - 키움증권 API integration
- **Korea Investment Provider** - 한국투자증권 API integration
- **Custom Providers** - Building custom provider implementations
- **Provider Registry** - Managing multiple providers

### **[Algorithm Engine API](./algorithms.md)**
- **Order Routing** - Smart order routing algorithms
- **Execution Strategies** - TWAP, VWAP, Iceberg algorithms
- **Risk Management** - Risk checks and position limits
- **Performance Optimization** - Execution optimization

### **[Research API](./research.md)**
- **DART Integration** - Korean disclosure system
- **Financial Analytics** - Financial statement analysis
- **Market Analytics** - Technical indicators and analysis
- **Company Research** - Company information and fundamentals

### **[Compliance API](./compliance.md)**
- **Regulatory Compliance** - Korean market regulations
- **Risk Management** - Position limits and exposure checks
- **Audit Logging** - Trade logging and reporting
- **Compliance Rules** - Trading rules and restrictions

### **[Testing API](./testing.md)**
- **Mock Provider** - Development and testing utilities
- **Test Framework** - Unit and integration testing
- **Data Generation** - Test data generation utilities
- **Performance Testing** - Load and stress testing

### **[Monitoring API](./monitoring.md)**
- **Metrics Collection** - Performance and usage metrics
- **Health Checks** - System health monitoring
- **Alerting** - Custom alert configuration
- **Analytics** - Usage and performance analytics

## 🔧 Quick API Reference

### Installation
```bash
npm install kset
```

### Basic Usage
```typescript
import { KSET } from 'kset';

const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom.pfx',
    certificatePassword: 'password',
    accountNumber: '12345678-01'
  }
});

await kset.connect();

// Get market data
const data = await kset.getMarketData('005930');

// Place an order
const order = await kset.createOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 80000
});

// Subscribe to real-time data
const subscription = await kset.subscribeMarketData('005930', (data) => {
  console.log('Price update:', data.currentPrice);
});
```

## 📊 API Response Formats

### MarketData Response
```typescript
{
  symbol: '005930',
  name: '삼성전자',
  market: 'KOSPI',
  currentPrice: 80000,
  previousClose: 79500,
  changeAmount: 500,
  changeRate: 0.63,
  volume: 1234567,
  timestamp: 1640995200000,
  source: 'kiwoom'
}
```

### Order Response
```typescript
{
  id: 'kset-order-123',
  providerOrderId: 'kiwoom-456',
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 80000,
  status: 'filled',
  filledQuantity: 10,
  averageFillPrice: 80000,
  createdAt: new Date('2024-01-01T09:00:00Z'),
  provider: 'kiwoom'
}
```

### Portfolio Response
```typescript
{
  totalValue: 100000000,
  totalMarketValue: 95000000,
  totalCostBasis: 90000000,
  totalCash: 5000000,
  totalUnrealizedPnL: 5000000,
  totalUnrealizedPnLRate: 5.56,
  dailyPnL: 1000000,
  dailyPnLRate: 1.01,
  updatedAt: new Date('2024-01-01T15:30:00Z')
}
```

## 🔍 Common Usage Patterns

### Batch Market Data
```typescript
// Get data for multiple symbols efficiently
const symbols = ['005930', '000660', '035420'];
const marketData = await kset.getMarketDataBatch(symbols);
```

### Order Monitoring
```typescript
// Monitor order status in real-time
const subscription = await kset.subscribeOrders((order) => {
  if (order.status === 'filled') {
    console.log(`Order filled: ${order.filledQuantity}@${order.averageFillPrice}`);
  }
});
```

### Portfolio Tracking
```typescript
// Track portfolio changes
const portfolio = await kset.getPortfolio();
console.log(`Portfolio value: ₩${portfolio.totalValue.toLocaleString()}`);
console.log(`Daily P&L: ${portfolio.dailyPnLRate.toFixed(2)}%`);
```

### Error Handling
```typescript
import { KSETError, MarketClosedError } from 'kset';

try {
  await kset.createOrder(orderRequest);
} catch (error) {
  if (error instanceof MarketClosedError) {
    console.log('Market is closed. Trading hours: 09:00-15:30 KST');
  } else if (error instanceof KSETError) {
    console.log(`Error: ${error.message} (Code: ${error.code})`);
  }
}
```

## 🚀 Advanced Features

### Algorithmic Trading
```typescript
// Use TWAP execution strategy
const order = await kset.createOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 1000,
  price: 80000,
  executionStrategy: {
    type: 'TWAP',
    duration: 300000, // 5 minutes
    sliceCount: 10
  }
});
```

### Real-time Analytics
```typescript
// Get enhanced market data with analytics
const data = await kset.getMarketData('005930', {
  includeTechnicalIndicators: true,
  includeSentiment: true,
  includeOrderBookAnalysis: true
});
```

### Custom Provider
```typescript
import { KSETProvider } from 'kset';

class MyCustomProvider extends KSETProvider {
  async connect(): Promise<void> {
    // Custom connection logic
  }

  async createOrder(order: OrderRequest): Promise<Order> {
    // Custom order execution
  }
}

kset.registerProvider('custom', new MyCustomProvider());
```

## 📈 Performance Considerations

- **Use batch operations** for multiple symbols
- **Enable caching** for frequently accessed data
- **Use real-time subscriptions** instead of polling
- **Monitor rate limits** and implement throttling
- **Use connection pooling** for high-frequency operations
- **Implement proper error handling** and retry logic

## 🔗 Related Documentation

- [Getting Started Guide](../guides/getting-started.md)
- [Tutorials](../tutorials/)
- [Korean Market Guide](../korean-market/)
- [Deployment Guide](../deployment/)
- [Troubleshooting](../guides/troubleshooting.md)

## 📞 API Support

- **Documentation**: docs@kset.dev
- **GitHub Issues**: [Report issues](https://github.com/kset/kset/issues)
- **Discord Community**: [Join our community](https://discord.gg/kset)
- **API Status**: [status.kset.dev](https://status.kset.dev)

---

**Need help?** Check our [troubleshooting guide](../guides/troubleshooting.md) or join our [Discord community](https://discord.gg/kset) for support.