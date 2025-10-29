# Getting Started with KSET

Welcome to KSET (Korea Stock Exchange Trading Library), the comprehensive TypeScript/JavaScript library for Korean securities trading. This guide will help you get up and running quickly.

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 16.0 or higher
- **npm** or **yarn** package manager
- **TypeScript** 4.5+ (recommended for type safety)
- A valid Korean securities account with supported broker
- Trading certificate (공인인증서) for Korean brokers

## 🚀 Installation

### Using npm
```bash
npm install kset
```

### Using yarn
```bash
yarn add kset
```

### Using pnpm
```bash
pnpm add kset
```

## 🔧 Basic Setup

### 1. Import KSET
```typescript
import { KSET } from 'kset';
// Or for CommonJS
const { KSET } = require('kset');
```

### 2. Configure Your Provider
KSET supports multiple Korean securities providers. Here's how to configure the most popular ones:

#### Kiwoom Securities (키움증권)
```typescript
const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom_cert.pfx',
    certificatePassword: 'your_certificate_password',
    accountNumber: '12345678-01' // Your Kiwoom account number
  },
  environment: 'production' // or 'development'
});
```

#### Korea Investment & Securities (한국투자증권)
```typescript
const kset = new KSET({
  provider: 'korea-investment',
  credentials: {
    apiKey: 'your_api_key',
    secret: 'your_api_secret',
    accountNumber: '56789012-34',
    appKey: 'your_app_key',
    appSecret: 'your_app_secret'
  },
  environment: 'production'
});
```

### 3. Connect to the Provider
```typescript
async function initializeTrading() {
  try {
    // Connect to the provider
    await kset.connect();
    console.log('✅ Successfully connected to provider');

    // Get account information
    const accounts = await kset.getAccounts();
    console.log('Available accounts:', accounts);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

initializeTrading();
```

## 📊 First Trade: Getting Market Data

```typescript
async function getMarketData() {
  try {
    // Get Samsung Electronics (005930) market data
    const samsungData = await kset.getMarketData('005930');

    console.log('Samsung Electronics Market Data:');
    console.log(`Current Price: ₩${samsungData.currentPrice.toLocaleString()}`);
    console.log(`Change: ${samsungData.changeAmount > 0 ? '+' : ''}${samsungData.changeRate.toFixed(2)}%`);
    console.log(`Volume: ${samsungData.volume.toLocaleString()} shares`);
    console.log(`Market Cap: ₩${(samsungData.marketCap / 1e12).toFixed(1)}T`);

  } catch (error) {
    console.error('❌ Failed to get market data:', error.message);
  }
}

getMarketData();
```

## 🛒 First Trade: Placing an Order

```typescript
async function placeFirstOrder() {
  try {
    // Create a limit buy order for Samsung Electronics
    const order = await kset.createOrder({
      symbol: '005930', // Samsung Electronics
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 10, // 10 shares
      price: 80000, // ₩80,000 per share
      clientOrderId: 'my-first-order-001' // Optional client order ID
    });

    console.log('✅ Order placed successfully:');
    console.log(`Order ID: ${order.id}`);
    console.log(`Status: ${order.status}`);
    console.log(`Quantity: ${order.quantity} shares`);
    console.log(`Price: ₩${order.price?.toLocaleString()}`);

    // Monitor order status
    const updatedOrder = await kset.getOrder(order.id);
    console.log('Updated status:', updatedOrder.status);

  } catch (error) {
    console.error('❌ Order failed:', error.message);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('💡 Tip: Check your account balance');
    } else if (error.code === 'MARKET_CLOSED') {
      console.log('💡 Tip: Market is currently closed');
    }
  }
}

placeFirstOrder();
```

## 📈 Real-time Market Data

```typescript
async function subscribeToMarketData() {
  try {
    // Subscribe to real-time data for Samsung Electronics
    const subscription = await kset.subscribeMarketData('005930', (data) => {
      console.log('📊 Real-time Update:');
      console.log(`Price: ₩${data.currentPrice.toLocaleString()}`);
      console.log(`Change: ${data.changeRate.toFixed(2)}%`);
      console.log(`Volume: ${data.volume.toLocaleString()}`);
      console.log(`Time: ${new Date(data.timestamp).toLocaleTimeString()}`);
    });

    console.log('✅ Subscribed to real-time data');

    // Unsubscribe after 60 seconds
    setTimeout(async () => {
      await subscription.unsubscribe();
      console.log('🔇 Unsubscribed from real-time data');
    }, 60000);

  } catch (error) {
    console.error('❌ Subscription failed:', error.message);
  }
}

subscribeToMarketData();
```

## 💼 Portfolio Management

```typescript
async function getPortfolioInfo() {
  try {
    // Get account balance
    const balance = await kset.getBalance();
    console.log('💰 Account Balance:');
    console.log(`Cash: ₩${balance.cash.toLocaleString()}`);
    console.log(`Orderable: ₩${balance.orderable.toLocaleString()}`);
    console.log(`Total including margin: ₩${balance.totalIncludingMargin.toLocaleString()}`);

    // Get current positions
    const positions = await kset.getPositions();
    console.log('\n📊 Current Positions:');

    positions.forEach(position => {
      console.log(`${position.name} (${position.symbol})`);
      console.log(`  Quantity: ${position.quantity}`);
      console.log(`  Average Price: ₩${position.averagePrice.toLocaleString()}`);
      console.log(`  Current Price: ₩${position.currentPrice.toLocaleString()}`);
      console.log(`  P&L: ₩${position.unrealizedPnL.toLocaleString()} (${position.unrealizedPnLRate.toFixed(2)}%)`);
    });

    // Get portfolio summary
    const portfolio = await kset.getPortfolio();
    console.log('\n📈 Portfolio Summary:');
    console.log(`Total Value: ₩${portfolio.totalValue.toLocaleString()}`);
    console.log(`Daily P&L: ₩${portfolio.dailyPnL.toLocaleString()} (${portfolio.dailyPnLRate.toFixed(2)}%)`);
    console.log(`Unrealized P&L: ₩${portfolio.totalUnrealizedPnL.toLocaleString()}`);

  } catch (error) {
    console.error('❌ Failed to get portfolio info:', error.message);
  }
}

getPortfolioInfo();
```

## 🔍 Error Handling

KSET provides comprehensive error handling with specific error types:

```typescript
import {
  KSETError,
  AuthenticationError,
  MarketClosedError,
  InsufficientFundsError,
  RateLimitError
} from 'kset';

async function handleErrors() {
  try {
    await kset.createOrder({
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 1000,
      price: 50000
    });
  } catch (error) {
    if (error instanceof AuthenticationError) {
      console.log('🔐 Authentication failed. Check your credentials.');
    } else if (error instanceof MarketClosedError) {
      console.log('🕐 Market is closed. Trading hours: 09:00-15:30 KST');
    } else if (error instanceof InsufficientFundsError) {
      console.log('💸 Insufficient funds. Check your account balance.');
    } else if (error instanceof RateLimitError) {
      console.log('⏱️ Rate limit exceeded. Please wait before making another request.');
    } else if (error instanceof KSETError) {
      console.log(`❌ KSET Error [${error.code}]: ${error.message}`);
    } else {
      console.log('❌ Unknown error:', error.message);
    }
  }
}

handleErrors();
```

## 🎛️ Configuration Options

KSET provides various configuration options to customize behavior:

```typescript
const kset = new KSET({
  // Provider configuration
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom_cert.pfx',
    certificatePassword: 'your_password',
    accountNumber: '12345678-01'
  },

  // Environment
  environment: 'production', // 'production' | 'development' | 'staging'

  // Logging
  logLevel: 'info', // 'error' | 'warn' | 'info' | 'debug'

  // Connection settings
  connection: {
    timeout: 30000, // 30 seconds
    retryAttempts: 3,
    retryDelay: 1000 // 1 second
  },

  // Rate limiting
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000 // 1 minute
  },

  // Caching
  cache: {
    enabled: true,
    ttl: 300000 // 5 minutes
  },

  // Real-time settings
  realTime: {
    reconnectAttempts: 5,
    reconnectDelay: 5000 // 5 seconds
  }
});
```

## 🧪 Development and Testing

### Mock Provider for Testing
```typescript
import { KSETMockProvider } from 'kset/testing';

// Use mock provider for development/testing
const kset = new KSET({
  provider: 'mock',
  mockData: {
    symbols: ['005930', '000660', '035420'],
    defaultBalance: 100000000, // ₩100M
    marketData: {
      '005930': { price: 80000, change: 1.2 }
    }
  }
});
```

### Development Mode
```typescript
const kset = new KSET({
  provider: 'kiwoom',
  credentials: { /* ... */ },
  environment: 'development',
  debug: true // Enable debug logging
});
```

## 📚 Next Steps

Now that you have KSET set up, explore these topics:

1. **[Advanced Trading Patterns](../tutorials/advanced-trading.md)** - Learn about complex order types
2. **[Real-time Data Streaming](../tutorials/real-time-streaming.md)** - WebSocket connections
3. **[Algorithmic Trading](../tutorials/algorithmic-trading.md)** - Automated trading strategies
4. **[Research & Analytics](../tutorials/research-analytics.md)** - DART integration and analysis
5. **[Korean Market Guide](../korean-market/overview.md)** - Understanding Korean markets

## 🆘 Troubleshooting

### Common Issues

**Certificate Not Found**
```
Error: ENOENT: no such file or directory, open './certs/kiwoom_cert.pfx'
```
Solution: Ensure your certificate file exists and the path is correct.

**Authentication Failed**
```
Error: Authentication failed: Invalid certificate password
```
Solution: Verify your certificate password is correct.

**Market Closed**
```
Error: Market is currently closed
```
Solution: Check Korean market hours (09:00-15:30 KST, weekdays).

**Rate Limit Exceeded**
```
Error: Rate limit exceeded. Please wait before making another request.
```
Solution: Implement proper rate limiting in your application.

### Getting Help

- **Documentation**: [Complete API Reference](../api/)
- **Examples**: [Code Examples](../tutorials/examples/)
- **GitHub Issues**: [Report issues](https://github.com/kset/kset/issues)
- **Discord Community**: [Join our community](https://discord.gg/kset)

---

🎉 **Congratulations!** You've successfully set up KSET and made your first steps in Korean securities trading. Welcome to the future of Korean fintech development!