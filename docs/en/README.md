# KSET: Korea Stock Exchange Trading Library

[![npm version](https://badge.fury.io/js/kset.svg)](https://badge.fury.io/js/kset)
[![Build Status](https://github.com/kset/kset/workflows/CI/badge.svg)](https://github.com/kset/kset/actions)
[![Coverage Status](https://coveralls.io/repos/github/kset/kset/badge.svg?branch=main)](https://coveralls.io/github.com/kset/kset?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/kset.svg)](https://www.npmjs.com/package/kset)

> **KSET (Korea Stock Exchange Trading Library)** - Korea's Standard Trading Interface
> _Unified API for Seamless Access to Korean Securities Markets_

🌟 **KSET** is a next-generation trading library that provides unified access to all Korean securities brokers through a standardized interface. Built with TypeScript, it offers complete type safety and abstracts away the complexities of individual broker APIs, delivering a consistent development experience.

## ✨ Key Features

### 🏢 **Nationwide Coverage**
- **Kiwoom Securities** - Full OpenAPI+ support
- **Korea Investment & Securities** - Complete KIS API support
- **Extensible Architecture** - Easy addition of new brokers

### ⚡ **High-Performance Real-Time Processing**
- **WebSocket-based Real-Time Data** - Stream tick, order book, and execution data
- **Low Latency Processing** - Sub-millisecond data processing speed
- **High-Volume Tick Data** - Capable of processing millions of daily ticks

### 🛡️ **Institutional-Grade Stability**
- **Comprehensive Error Handling** - Responds to all exception scenarios
- **Auto-Reconnection** - Automatic recovery from network failures
- **Regulatory Compliance** - Full compliance with FSC regulations

### 🎯 **Algorithmic Trading**
- **Advanced Order Routing** - Searches for optimal execution conditions
- **Algorithm Support** - Built-in TWAP, VWAP, POV algorithms
- **Risk Management** - Real-time position and loss management

### 🔬 **Data Research**
- **DART Integration** - Automatic collection of FSC electronic disclosures
- **Financial Analysis** - Standardized financial statement APIs
- **Market Analysis** - Real-time market indicators and statistics

## 🚀 Quick Start

### Installation

```bash
# npm
npm install kset

# yarn
yarn add kset

# pnpm
pnpm add kset
```

### Basic Usage

```typescript
import { KSET } from 'kset';

// Create KSET instance
const kset = new KSET();

// Connect with Kiwoom provider
await kset.connect('kiwoom', {
  id: 'your_id',
  password: 'your_password',
  certPassword: 'your_cert_password' // For live trading
});

// Subscribe to real-time data
const subscription = await kset.subscribeRealtime({
  symbol: '005930', // Samsung Electronics
  onTick: (tick) => {
    console.log(`Price: ${tick.price} / Time: ${tick.time}`);
  }
});

// Place an order
const orderResult = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'market',
  quantity: 10,
  price: 85000
});

console.log('Order Result:', orderResult);
```

## 📖 API Reference

### Core Classes

#### **KSET Main Class**
```typescript
import { KSET } from 'kset';

const kset = new KSET({
  logLevel: 'info',
  timeout: 30000
});

// Connect to provider
await kset.connect('kiwoom', credentials);
```

#### **Provider Connection**
```typescript
// Individual provider connection
const kiwoom = await kset.createProvider('kiwoom', {
  credentials: {
    id: 'your_id',
    password: 'your_password',
    certPassword: 'your_cert_password'
  },
  environment: 'development'
});

// Korea Investment connection
const koreaInvestment = await kset.createProvider('korea-investment', {
  credentials: {
    apiKey: 'your_api_key',
    secret: 'your_secret',
    accountNumber: 'your_account'
  }
});
```

### Market Data APIs

#### **Real-Time Market Data**
```typescript
// Single symbol data
const marketData = await kset.getMarketData(['005930']);

// Multiple symbols data
const symbols = ['005930', '000660', '035420'];
const marketDataList = await kset.getMarketData(symbols);

console.log(marketDataList[0]); // Samsung Electronics market data
```

#### **Historical Data Retrieval**
```typescript
// Daily data
const dailyData = await kset.getHistoricalData('005930', {
  period: 'daily',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  adjusted: true
});

// Minute data
const minuteData = await kset.getHistoricalData('005930', {
  period: 'minute',
  count: 100
});

// Tick data
const tickData = await kset.getHistoricalData('005930', {
  period: 'tick',
  count: 1000
});
```

### Trading APIs

#### **Order Placement**
```typescript
// Market order
const marketOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'market',
  quantity: 10
});

// Limit order
const limitOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'limit',
  quantity: 10,
  price: 85000
});

// Best limit order
const bestOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'best',
  quantity: 10
});

// Stop order
const stopOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'sell',
  orderType: 'stop',
  quantity: 10,
  stopPrice: 83000
});

// OCO (One-Cancels-Other) order
const ocoOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'sell',
  orderType: 'oco',
  quantity: 10,
  price: 87000,    // Target price
  stopPrice: 83000 // Stop price
});
```

#### **Order Management**
```typescript
// Modify order
const modifiedOrder = await kset.modifyOrder(orderId, {
  price: 86000,
  quantity: 15
});

// Cancel order
const cancelledOrder = await kset.cancelOrder(orderId);

// Check order status
const orderStatus = await kset.getOrderStatus(orderId);

// Order history
const orderHistory = await kset.getOrderHistory({
  symbol: '005930',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

### Account Information APIs

#### **Account Information Retrieval**
```typescript
// Full account information
const accountInfo = await kset.getAccountInfo();
console.log('Account Number:', accountInfo.accountNumber);
console.log('Deposit:', accountInfo.deposit);
console.log('Withdrawable:', accountInfo.withdrawable);

// Balance information
const balance = await kset.getBalance();
console.log('Cash Balance:', balance.cash);
console.log('Total Evaluation:', balance.totalEvaluationPrice);
console.log('Total P&L:', balance.totalProfitLoss);
```

#### **Position Information**
```typescript
// All positions
const positions = await kset.getPositions();

// Specific symbol position
const samsungPosition = await kset.getPositions('005930');

console.log('Quantity:', samsungPosition.quantity);
console.log('Average Price:', samsungPosition.averagePrice);
console.log('Current Price:', samsungPosition.currentPrice);
console.log('Unrealized P&L:', samsungPosition.profitLoss);
console.log('Return Rate:', samsungPosition.profitLossRate);
```

### Real-Time Data APIs

#### **Real-Time Market Data Subscription**
```typescript
const subscription = await kset.subscribeToRealTimeData('kiwoom', ['005930'], (data) => {
  console.log(`Samsung: ${data.currentPrice}KRW (${data.changeRate > 0 ? '+' : ''}${data.changeRate}%)`);
  console.log(`Volume: ${data.volume} shares`);
  console.log(`Total Value: ${data.totalValue.toLocaleString()}KRW`);
});

// Unsubscribe
await subscription.unsubscribe();
```

#### **Real-Time Order Book**
```typescript
const orderBookSubscription = await kset.subscribeToOrderBook('kiwoom', ['005930'], (orderBook) => {
  console.log('Ask Orders:', orderBook.asks.slice(0, 5));
  console.log('Bid Orders:', orderBook.bids.slice(0, 5));
});
```

### Research APIs

#### **Company Information Search**
```typescript
// Search by company name
const companies = await kset.searchCompany('Samsung Electronics', {
  limit: 10
});

// Search by stock symbol
const companyInfo = await kset.getCompanyInfo('005930');
console.log('Company Name:', companyInfo.name);
console.log('Market Segment:', companyInfo.market);
console.log('Sector:', companyInfo.sector);
console.log('Listing Date:', companyInfo.listingDate);
```

#### **Financial Data**
```typescript
// Annual financial data
const annualFinancials = await kset.getFinancialData('005930', 'annual');

// Quarterly financial data
const quarterlyFinancials = await kset.getFinancialData('005930', 'quarterly');

// Latest financial data
financials.forEach((data) => {
  console.log(`${data.year} Q${data.quarter}`);
  console.log(`Revenue: ${data.revenue?.toLocaleString()}KRW`);
  console.log(`Operating Income: ${data.operatingIncome?.toLocaleString()}KRW`);
  console.log(`Net Income: ${data.netIncome?.toLocaleString()}KRW`);
  console.log(`EPS: ${data.eps?.toLocaleString()}KRW`);
});
```

#### **DART Disclosure Information**
```typescript
// Search DART disclosures
const disclosures = await kset.searchDARTDisclosures({
  corporationCode: '00126380', // Samsung Electronics unique code
  startDate: '20240101',
  endDate: '20241231',
  disclosureTypes: ['A001', 'A002'] // Business reports, quarterly reports
});

disclosures.forEach((disclosure) => {
  console.log('Report Name:', disclosure.reportName);
  console.log('Receipt Date:', disclosure.receiptDate);
  console.log('URL:', disclosure.url);
});

// Detailed disclosure information
const detail = await kset.getDisclosureDetail(disclosure.receiptNo);
console.log('Summary:', detail.summary);
```

## 🤖 Algorithmic Trading

### TWAP (Time Weighted Average Price)
```typescript
const twapOrder = await kset.executeTWAP('kiwoom', {
  symbol: '005930',
  side: 'buy',
  totalQuantity: 1000,
  startTime: new Date(),
  endTime: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes later
  intervalSeconds: 60, // 1 minute intervals
  sliceCount: 30,
  callbacks: {
    onOrderPlaced: (order) => {
      console.log(`TWAP Order: ${order.quantity} shares @ ${order.price}KRW`);
    },
    onProgressUpdate: (instance) => {
      console.log(`Progress: ${(instance.currentProgress * 100).toFixed(1)}%`);
    },
    onComplete: (result) => {
      console.log(`TWAP Completed: Average price ${result.averagePrice}KRW, Slippage ${result.slippage.toFixed(3)}%`);
    }
  }
});
```

### VWAP (Volume Weighted Average Price)
```typescript
const vwapOrder = await kset.executeVWAP('kiwoom', {
  symbol: '000660',
  side: 'sell',
  totalQuantity: 500,
  startTime: new Date(),
  endTime: new Date(Date.now() + 20 * 60 * 1000), // 20 minutes later
  lookbackPeriod: 30, // 30 minutes of historical data
  volumeProfile: [
    { time: 540, expectedVolume: 1000000, participationRate: 5 }, // 09:00
    { time: 600, expectedVolume: 1500000, participationRate: 8 }, // 10:00
    { time: 660, expectedVolume: 2000000, participationRate: 10 }, // 11:00
  ]
});
```

### POV (Percentage of Volume)
```typescript
const povOrder = await kset.executePOV('kiwoom', {
  symbol: '035420',
  side: 'buy',
  totalQuantity: 200,
  startTime: new Date(),
  endTime: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes later
  targetParticipationRate: 10, // Target 10% participation
  minParticipationRate: 5,    // Minimum 5%
  maxParticipationRate: 20,    // Maximum 20%
});
```

### Algorithm Control
```typescript
// Algorithm status check
const instances = await kset.getAlgorithmStatus();
instances.forEach((instance) => {
  console.log(`ID: ${instance.id}, Type: ${instance.type}, Status: ${instance.status}`);
});

// Algorithm control
await kset.controlAlgorithm(twapOrder.id, 'pause');   // Pause
await kset.controlAlgorithm(twapOrder.id, 'resume');  // Resume
await kset.controlAlgorithm(twapOrder.id, 'cancel');  // Cancel
```

## 🎯 Smart Order Routing

### Multiple Strategy Support
```typescript
// Best price routing
const bestPriceRouting = await kset.routeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'limit',
  quantity: 100,
  price: 84900
}, {
  strategy: 'best-price',
  maxProviders: 2,
  maxLatency: 1000
});

console.log('Selected Providers:', bestPriceRouting.selectedProviders);
console.log('Expected Price:', bestPriceRouting.expectedPrice);
console.log('Allocated Quantities:', bestPriceRouting.allocatedQuantities);

// Fastest execution routing
const fastestRouting = await kset.routeOrder({
  symbol: '000660',
  side: 'sell',
  orderType: 'market',
  quantity: 50
}, {
  strategy: 'fastest-execution',
  maxLatency: 500
});

// Large order split routing
const largeOrder = await kset.routeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'limit',
  quantity: 1000, // Large order of 1000 shares
  price: 84900
}, {
  strategy: 'balanced',
  enableSplitOrders: true,
  maxSplitProviders: 3
});
```

## 🇰🇷 Korean Market Specific Features

### KRX Market Types
```typescript
// Supported market types
const marketTypes = ['KOSPI', 'KOSDAQ', 'KONEX', 'KRX-ETF', 'KRX-ETN'];

// Market-specific trading
const kospiStock = await kset.getMarketData(['005930']); // KOSPI
const kosdaqStock = await kset.getMarketData(['068270']); // KOSDAQ
const etf = await kset.getMarketData(['069500']);   // KRX-ETF
```

### Trading Hours Management
```typescript
// Market status check
const marketStatus = await kset.getMarketStatus('KOSPI');
console.log('Market Status:', marketStatus);
// 'pre-market' | 'regular' | 'lunch-break' | 'after-hours' | 'closed' | 'holiday'

// Market information
const marketInfo = await kset.getMarketInfo('KOSPI');
console.log('Trading Hours:', marketInfo.openingTime, '~', marketInfo.closingTime);
console.log('Lunch Break:', marketInfo.lunchBreakStart, '~', marketInfo.lunchBreakEnd);
console.log('Tick Size:', marketInfo.tickSize);
```

### Holiday Management
```typescript
// 2024 holiday information
const holidays = await kset.getMarketHolidays(2024);
holidays.forEach((holiday) => {
  console.log(`${holiday.date}: ${holiday.name} (${holiday.type})`);
});

// Specific month holidays
const marchHolidays = await kset.getMarketHolidays(2024, 3);
```

### Regulatory Compliance
```typescript
// Foreign investment limit check
const complianceCheck = await kset.checkCompliance({
  symbol: '005930',
  orderSide: 'buy',
  quantity: 100,
  investorType: 'foreign',
  currentHoldings: 1000000,
  totalShares: 100000000
});

if (!complianceCheck.compliant) {
  console.log('Regulation Violation:', complianceCheck.reason);
}

// Tax calculation
const taxCalculation = await kset.calculateTax({
  symbol: '005930',
  sellValue: 1000000,
  market: 'KOSPI',
  isPreferred: false,
  holdingPeriod: 'short' // 'short' | 'long'
});

console.log('Securities Transaction Tax:', taxCalculation.securitiesTransactionTax);
console.log('Capital Gains Tax:', taxCalculation.capitalGainsTax);
console.log('Total Tax:', taxCalculation.totalTax);
```

## 🛡️ Error Handling

### Error Types
```typescript
import { KSETError, ERROR_CODES } from 'kset';

try {
  const order = await kset.placeOrder(orderRequest);
} catch (error) {
  if (error instanceof KSETError) {
    switch (error.code) {
      case ERROR_CODES.MARKET_CLOSED:
        console.log('Market is not open');
        break;
      case ERROR_CODES.INSUFFICIENT_FUNDS:
        console.log('Insufficient funds');
        break;
      case ERROR_CODES.INVALID_SYMBOL:
        console.log('Invalid stock symbol');
        break;
      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
        console.log('API rate limit exceeded');
        break;
      case ERROR_CODES.COMPLIANCE_VIOLATION:
        console.log('Regulation violation:', error.message);
        break;
      default:
        console.log('Error:', error.message);
    }
  }
}
```

### Retry and Circuit Breaker
```typescript
const kset = new KSET({
  retryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000
});
```

## 📊 Portfolio Analysis

### Portfolio Creation
```typescript
const portfolio = {
  id: 'my-portfolio',
  name: 'KOSPI Representative Portfolio',
  positions: [
    {
      symbol: '005930',
      quantity: 100,
      averagePrice: 85000,
      currentPrice: 86000
    },
    {
      symbol: '000660',
      quantity: 50,
      averagePrice: 120000,
      currentPrice: 125000
    },
    {
      symbol: '035420',
      quantity: 20,
      averagePrice: 180000,
      currentPrice: 185000
    }
  ]
};

// Portfolio analysis
const analysis = await kset.analyzePortfolio(portfolio);
console.log('Total Return:', analysis.totalReturn.toFixed(2) + '%');
console.log('Sharpe Ratio:', analysis.sharpeRatio.toFixed(2));
console.log('Beta:', analysis.beta.toFixed(2));
```

## 🚀 Advanced Configuration

### Environment Settings
```typescript
const kset = new KSET({
  // Logging settings
  logLevel: 'info',

  // Timeout settings
  timeout: 30000,

  // Retry settings
  retryAttempts: 3,
  retryDelay: 1000,

  // Real-time data settings
  realtime: {
    maxSubscriptions: 20,
    reconnectAttempts: 3,
    reconnectDelay: 5000
  },

  // DART API settings
  dart: {
    apiKey: process.env.DART_API_KEY,
    baseUrl: 'https://opendart.fss.or.kr/api',
    timeout: 10000
  },

  // Smart order routing settings
  routing: {
    defaultStrategy: 'best-price',
    enableSplitOrders: true,
    maxSplitProviders: 3,
    minOrderSize: 100000
  }
});
```

### Provider-Specific Configuration
```typescript
// Kiwoom configuration
const kiwoomConfig = {
  credentials: {
    id: 'your_id',
    password: 'your_password',
    certPassword: 'your_cert_password'
  },
  environment: 'development',
  options: {
    port: 9999,
    timeout: 10000
  }
};

// Korea Investment configuration
const koreaInvestmentConfig = {
  credentials: {
    apiKey: 'your_api_key',
    secret: 'your_secret',
    accountNumber: 'your_account'
  },
  environment: 'production',
  options: {
    apiBaseUrl: 'https://openapi.koreainvestment.com:9443',
    websocketUrl: 'ws://ops.koreainvestment.com:21000'
  }
};
```

## 📋 Supported Methods

### KSET Core Methods
- `connect()` - Connect to provider
- `disconnect()` - Disconnect provider
- `createProvider()` - Create new provider
- `getProviders()` - List registered providers

### Market Data
- `getMarketData()` - Get real-time market data
- `getHistoricalData()` - Get historical data
- `getMarketInfo()` - Get market information
- `getMarketStatus()` - Get market status
- `getMarketHolidays()` - Get holiday information

### Trading Functions
- `placeOrder()` - Place order
- `modifyOrder()` - Modify order
- `cancelOrder()` - Cancel order
- `getOrderStatus()` - Get order status
- `getOrderHistory()` - Get order history

### Account Information
- `getAccountInfo()` - Get account information
- `getBalance()` - Get balance information
- `getPositions()` - Get position information
- `getPortfolio()` - Get portfolio information

### Real-Time Data
- `subscribeToRealTimeData()` - Subscribe to real-time data
- `subscribeToOrderBook()` - Subscribe to order book data
- `unsubscribe()` - Unsubscribe from data streams

### Research
- `searchCompany()` - Search for companies
- `getCompanyInfo()` - Get company information
- `getFinancialData()` - Get financial data
- `searchDARTDisclosures()` - Search DART disclosures
- `getDisclosureDetail()` - Get detailed disclosure information

### Algorithmic Trading
- `executeTWAP()` - Execute TWAP algorithm
- `executeVWAP()` - Execute VWAP algorithm
- `executePOV()` - Execute POV algorithm
- `controlAlgorithm()` - Control algorithm execution
- `getAlgorithmStatus()` - Get algorithm status

### Smart Order Routing
- `routeOrder()` - Route orders across providers
- `getRoutingStatistics()` - Get routing statistics

### Analysis
- `analyzeStock()` - Analyze stock
- `analyzePortfolio()` - Analyze portfolio

---

## 🤝 Contributing

KSET is a community-driven open-source project. Contributions are welcome!

See the [Contributing Guide](../../CONTRIBUTING.md) for details on how to contribute.

## 📄 License

MIT License - See [LICENSE](../../LICENSE) file for details.

## 🆘 Support

- **GitHub Issues**: [https://github.com/kset/kset/issues](https://github.com/kset/kset/issues)
- **Discord Community**: [Invite Link](https://discord.gg/kset)
- **Email**: support@kset.dev

---

**KSET: Building the Standard for Korean Securities Trading 🇰🇷**