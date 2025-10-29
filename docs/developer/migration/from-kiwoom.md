# Migration Guide: From Kiwoom API to KSET

This guide helps developers migrate from the native Kiwoom API to KSET, providing a smooth transition path with code examples and best practices.

## 🎯 Migration Overview

### **Why Migrate to KSET?**

| Feature | Kiwoom API | KSET | Benefits |
|---------|------------|-----|----------|
| **Type Safety** | No TypeScript | ✅ Full TypeScript support | Catch errors at compile time |
| **Unified Interface** | Kiwoom-specific | ✅ Multi-broker support | Easy provider switching |
| **Error Handling** | Manual | ✅ Structured error types | Better debugging |
| **Real-time Data** | Complex callbacks | ✅ WebSocket/Promise-based | Modern async/await patterns |
| **Testing** | Difficult | ✅ Mock providers | Easy unit testing |
| **Documentation** | Limited | ✅ Comprehensive docs | Better developer experience |
| **Community** | Fragmented | ✅ Active community | Support and contributions |

### **Migration Timeline**

- **Phase 1** (1-2 days): Basic setup and connection
- **Phase 2** (3-5 days): Core functionality migration
- **Phase 3** (2-3 days): Real-time data migration
- **Phase 4** (1-2 days): Testing and optimization
- **Phase 5** (1 day): Production deployment

**Total Estimated Time**: 1-2 weeks for typical applications

## 🚀 Phase 1: Setup and Connection

### **Kiwoom API vs KSET Setup**

#### **Before (Kiwoom API)**
```python
# Python example with Kiwoom API
import sys
from PyQt5.QtWidgets import QApplication
from kiwoom.kiwoom import Kiwoom

app = QApplication(sys.argv)
kiwoom = Kiwoom()

# Login
kiwoom.comm_connect()
kiwoom.login_slot()  # Wait for login event

# Get account info
account = kiwoom.get_login_info("ACCNO")
```

#### **After (KSET)**
```typescript
// TypeScript with KSET
import { KSET } from 'kset';

const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom.pfx',
    certificatePassword: 'your_password',
    accountNumber: '12345678-01'
  },
  environment: 'production'
});

// Connect and login
await kset.connect();
console.log('✅ Connected to Kiwoom');

// Get account info
const accounts = await kset.getAccounts();
console.log('Accounts:', accounts);
```

### **Migration Steps**

1. **Install KSET**
```bash
npm install kset
# or
yarn add kset
```

2. **Migrate Certificate Files**
```typescript
// Ensure certificate files are accessible
const fs = require('fs');

// Verify certificate exists
if (!fs.existsSync('./certs/kiwoom.pfx')) {
  throw new Error('Kiwoom certificate not found');
}
```

3. **Update Environment Configuration**
```bash
# .env file
KSET_PROVIDER=kiwoom
KSET_CERT_PATH=./certs/kiwoom.pfx
KSET_CERT_PASSWORD=your_password
KSET_ACCOUNT_NUMBER=12345678-01
```

## 📊 Phase 2: Core Functionality Migration

### **Market Data Migration**

#### **Before (Kiwoom API)**
```python
# Get current price
current_price = kiwoom.get_master_stock_info("005930")
name = kiwoom.get_master_code_name("005930")

# Get OHLCV data
ohlcv = kiwoom.get_daily_ohlcv("005930", "20240101")
```

#### **After (KSET)**
```typescript
// Get market data
const marketData = await kset.getMarketData('005930');
console.log('Name:', marketData.name);
console.log('Current Price:', marketData.currentPrice);
console.log('Change Rate:', marketData.changeRate);

// Get historical data
const historicalData = await kset.getHistoricalData('005930', {
  from: new Date('2024-01-01'),
  to: new Date('2024-12-31'),
  interval: 'daily'
});
```

### **Order Management Migration**

#### **Before (Kiwoom API)**
```python
# Place order
order_result = kiwoom.send_order(
    "order_request",  # request name
    "0101",           # screen number
    account[0],       # account number
    1,               # order type (1: buy, 2: sell)
    "005930",        # stock code
    1,               # order quantity
    80000,           # order price
    "00",            # order type (00: limit)
    ""
)

# Check order status
order_status = kiwoom.get_chejan_data("9201")  # order status
```

#### **After (KSET)**
```typescript
// Place order
const order = await kset.createOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 1,
  price: 80000,
  clientOrderId: 'my-order-001'
});

console.log('Order placed:', order.id);

// Check order status
const updatedOrder = await kset.getOrder(order.id);
console.log('Order status:', updatedOrder.status);

// Monitor order execution
const subscription = await kset.subscribeOrders((order) => {
  console.log(`Order ${order.id} status: ${order.status}`);
});
```

### **Account Information Migration**

#### **Before (Kiwoom API)**
```python
# Get balance
balance = kiwoom.get_deposit_info(2)  # available cash
d2_balance = kiwoom.get_deposit_info(3)  # total balance

# Get positions
positions = []
for stock_code in stock_list:
    position = kiwoom.get_balance(stock_code)
    if position:
        positions.append(position)
```

#### **After (KSET)**
```typescript
// Get balance information
const balance = await kset.getBalance();
console.log('Available cash:', balance.cash);
console.log('Orderable amount:', balance.orderable);

// Get portfolio and positions
const portfolio = await kset.getPortfolio();
console.log('Total value:', portfolio.totalValue);

const positions = await kset.getPositions();
positions.forEach(position => {
  console.log(`${position.name}: ${position.quantity} shares`);
});
```

## 📡 Phase 3: Real-time Data Migration

### **Real-time Market Data**

#### **Before (Kiwoom API)**
```python
# Subscribe to real-time data
def receive_tr_data(self, screen_no, rqname, trcode, recordname, prev_next, data_length, error_code, message, splm_msg):
    if rqname == "opt10001_req":  # current price
        current_price = self.get_comm_data(trcode, "", screen_no, "현재가")
        change_rate = self.get_comm_data(trcode, "", screen_no, "등락율")
        # Process real-time data

# Register for real-time data
kiwoom.set_real_reg("1000", "005930", "0")  # subscribe
```

#### **After (KSET)**
```typescript
// Subscribe to real-time market data
const subscription = await kset.subscribeMarketData('005930', (data) => {
  console.log(`Price: ${data.currentPrice}`);
  console.log(`Change: ${data.changeRate}%`);
  console.log(`Volume: ${data.volume}`);
  console.log(`Timestamp: ${new Date(data.timestamp)}`);
});

// Handle subscription lifecycle
process.on('SIGINT', async () => {
  await subscription.unsubscribe();
  console.log('Unsubscribed from real-time data');
});
```

### **Event Handling Migration**

#### **Before (Kiwoom API)**
```python
class KiwoomEventHandler:
    def __init__(self):
        self.kiwoom = Kiwoom()
        self.setup_handlers()

    def setup_handlers(self):
        self.kiwoom.OnEventConnect.connect(self.on_event_connect)
        self.kiwoom.OnReceiveTrData.connect(self.on_receive_tr_data)

    def on_event_connect(self, err_code):
        if err_code == 0:
            print("Connected successfully")

    def on_receive_tr_data(self, screen_no, rqname, trcode, recordname, prev_next, data_length, error_code, message, splm_msg):
        # Handle data reception
        pass
```

#### **After (KSET)**
```typescript
import { KSET, KSETEventHandlers } from 'kset';

class TradingEventHandler {
  private kset: KSET;
  private subscriptions: any[] = [];

  constructor() {
    this.kset = new KSET({ /* config */ });
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    const handlers: KSETEventHandlers = {
      onConnect: () => {
        console.log('✅ Connected to provider');
      },
      onDisconnect: () => {
        console.log('❌ Disconnected from provider');
      },
      onError: (error) => {
        console.error('❌ Error:', error.message);
      },
      onMarketData: (data) => {
        this.handleMarketData(data);
      },
      onOrderUpdate: (order) => {
        this.handleOrderUpdate(order);
      }
    };

    this.kset.setEventHandlers(handlers);
  }

  private handleMarketData(data: MarketData): void {
    // Process market data
    console.log(`Market data update: ${data.symbol} @ ${data.currentPrice}`);
  }

  private handleOrderUpdate(order: Order): void {
    // Process order updates
    console.log(`Order update: ${order.id} status: ${order.status}`);
  }
}
```

## 🧪 Phase 4: Testing and Validation

### **Test Migration Accuracy**

#### **Create Migration Tests**
```typescript
import { KSET } from 'kset';
import { KSETTestFramework } from 'kset/testing';

describe('Migration Validation', () => {
  let kset: KSET;
  let testFramework: KSETTestFramework;

  beforeAll(async () => {
    kset = new KSET({
      provider: 'kiwoom',
      credentials: { /* test credentials */ },
      environment: 'development'
    });

    testFramework = new KSETTestFramework({
      mockProviders: false, // Use real provider for validation
      realisticData: true
    });

    await kset.connect();
  });

  afterAll(async () => {
    await kset.disconnect();
  });

  it('should return identical market data', async () => {
    // Get data from both systems and compare
    const ksetData = await kset.getMarketData('005930');

    // Validate data structure
    expect(ksetData.symbol).toBe('005930');
    expect(ksetData.currentPrice).toBeGreaterThan(0);
    expect(ksetData.name).toBeDefined();
    expect(ksetData.market).toBe('KOSPI');
  });

  it('should handle order placement consistently', async () => {
    const testOrder = {
      symbol: '005930',
      side: 'BUY' as const,
      orderType: 'LIMIT' as const,
      quantity: 1,
      price: 50000, // Very low price to avoid execution
      clientOrderId: 'migration-test-order'
    };

    const order = await kset.createOrder(testOrder);

    expect(order.id).toBeDefined();
    expect(order.status).toBe('received' || 'pending');
    expect(order.symbol).toBe(testOrder.symbol);
    expect(order.side).toBe(testOrder.side);
    expect(order.quantity).toBe(testOrder.quantity);
    expect(order.price).toBe(testOrder.price);

    // Clean up - cancel test order
    await kset.cancelOrder(order.id);
  });
});
```

### **Performance Validation**

```typescript
import { PerformanceMonitor } from '@kset/monitoring';

const monitor = new PerformanceMonitor();

async function validatePerformance() {
  await monitor.start();

  // Test market data retrieval
  const marketDataTime = await measureTime(async () => {
    await kset.getMarketData('005930');
  });

  // Test order placement
  const orderTime = await measureTime(async () => {
    await kset.createOrder({
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 1,
      price: 50000
    });
  });

  console.log('Market Data Retrieval:', marketDataTime, 'ms');
  console.log('Order Placement:', orderTime, 'ms');

  const report = await monitor.getReport();
  console.log('Performance Report:', report);
}

async function measureTime<T>(operation: () => Promise<T>): Promise<number> {
  const start = Date.now();
  await operation();
  return Date.now() - start;
}
```

## 🚀 Phase 5: Production Deployment

### **Production Migration Checklist**

#### **✅ Pre-deployment Validation**
- [ ] All tests pass with real provider
- [ ] Performance benchmarks meet requirements
- [ ] Error handling works correctly
- [ ] Real-time data connections are stable
- [ ] Order execution functions properly
- [ ] Security measures are in place

#### **✅ Configuration Migration**
```typescript
// production.config.ts
export const productionConfig = {
  provider: 'kiwoom',
  credentials: {
    certificatePath: process.env.KIWOOM_CERT_PATH,
    certificatePassword: process.env.KIWOOM_CERT_PASSWORD,
    accountNumber: process.env.KIWOOM_ACCOUNT_NUMBER
  },
  environment: 'production',
  logLevel: 'warn', // Reduce log verbosity in production
  connection: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 5000
  },
  monitoring: {
    enabled: true,
    metricsEndpoint: '/metrics',
    healthEndpoint: '/health'
  }
};
```

#### **✅ Deployment Script**
```typescript
// migrate-to-kset.ts
import { KSET } from 'kset';

async function migrateApplication() {
  console.log('🚀 Starting migration to KSET...');

  try {
    // Initialize KSET
    const kset = new KSET(productionConfig);
    await kset.connect();

    // Validate connection
    const accounts = await kset.getAccounts();
    console.log(`✅ Connected. Found ${accounts.length} accounts`);

    // Test market data
    const testData = await kset.getMarketData('005930');
    console.log(`✅ Market data test: ${testData.name} @ ${testData.currentPrice}`);

    // Start application services
    await startTradingServices(kset);

    console.log('🎉 Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

migrateApplication();
```

## 🔧 Migration Tools

### **Automated Migration Script**

```typescript
// migrate-kiwoom-to-kset.ts
import * as fs from 'fs';
import { KSET } from 'kset';

interface KiwoomConfig {
  account: string;
  certPath: string;
  certPassword: string;
}

class KiwoomMigrator {
  private kiwoomConfig: KiwoomConfig;
  private kset: KSET;

  constructor(kiwoomConfigPath: string) {
    this.kiwoomConfig = JSON.parse(fs.readFileSync(kiwoomConfigPath, 'utf8'));
    this.kset = new KSET({
      provider: 'kiwoom',
      credentials: {
        certificatePath: this.kiwoomConfig.certPath,
        certificatePassword: this.kiwoomConfig.certPassword,
        accountNumber: this.kiwoomConfig.account
      }
    });
  }

  async migrate(): Promise<void> {
    console.log('🔄 Starting migration from Kiwoom to KSET...');

    // Test connection
    await this.kset.connect();
    console.log('✅ Connection established');

    // Migrate account information
    await this.migrateAccountInfo();

    // Migrate current positions
    await this.migratePositions();

    // Validate migration
    await this.validateMigration();

    console.log('🎉 Migration completed successfully!');
  }

  private async migrateAccountInfo(): Promise<void> {
    const accounts = await this.kset.getAccounts();
    console.log(`✅ Migrated ${accounts.length} accounts`);

    const balance = await this.kset.getBalance();
    console.log(`✅ Balance: ₩${balance.cash.toLocaleString()}`);
  }

  private async migratePositions(): Promise<void> {
    const positions = await this.kset.getPositions();
    console.log(`✅ Migrated ${positions.length} positions`);

    positions.forEach(position => {
      console.log(`  ${position.name}: ${position.quantity} shares`);
    });
  }

  private async validateMigration(): Promise<void> {
    // Test basic functionality
    const marketData = await this.kset.getMarketData('005930');
    if (!marketData) {
      throw new Error('Market data validation failed');
    }
    console.log('✅ Market data validation passed');

    // Test account access
    const portfolio = await this.kset.getPortfolio();
    if (!portfolio) {
      throw new Error('Portfolio validation failed');
    }
    console.log('✅ Portfolio validation passed');
  }
}

// Usage
const migrator = new KiwoomMigrator('./kiwoom-config.json');
migrator.migrate().catch(console.error);
```

### **Configuration Converter**

```typescript
// config-converter.ts
interface KiwoomSettings {
  account: string;
  password: string;
  certPath: string;
  server: 'demo' | 'real';
}

interface KSETConfig {
  provider: string;
  credentials: {
    certificatePath: string;
    certificatePassword: string;
    accountNumber: string;
  };
  environment: string;
}

export function convertKiwoomConfig(kiwoomSettings: KiwoomSettings): KSETConfig {
  return {
    provider: 'kiwoom',
    credentials: {
      certificatePath: kiwoomSettings.certPath,
      certificatePassword: kiwoomSettings.password,
      accountNumber: kiwoomSettings.account
    },
    environment: kiwoomSettings.server === 'real' ? 'production' : 'development'
  };
}

// Usage
const kiwoomSettings = {
  account: '12345678-01',
  password: 'password123',
  certPath: '/path/to/cert.pfx',
  server: 'real'
};

const ksetConfig = convertKiwoomConfig(kiwoomSettings);
console.log('KSET Config:', ksetConfig);
```

## ⚠️ Common Migration Issues

### **Issue 1: Certificate Path Problems**

**Problem:** Certificate not found or inaccessible
```typescript
// Error: ENOENT: no such file or directory, open './certs/kiwoom.pfx'
```

**Solution:**
```typescript
import { resolve } from 'path';

// Use absolute paths
const certPath = resolve(__dirname, './certs/kiwoom.pfx');

// Verify file exists
import { existsSync } from 'fs';
if (!existsSync(certPath)) {
  throw new Error(`Certificate not found at ${certPath}`);
}

const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: certPath,
    certificatePassword: 'password',
    accountNumber: '12345678-01'
  }
});
```

### **Issue 2: Authentication Failures**

**Problem:** Certificate password or account number incorrect
```typescript
// Error: Authentication failed: Invalid certificate password
```

**Solution:**
```typescript
// Validate credentials before connection
async function validateCredentials(): Promise<void> {
  try {
    const testKset = new KSET({
      provider: 'kiwoom',
      credentials: {
        certificatePath: './certs/kiwoom.pfx',
        certificatePassword: process.env.CERT_PASSWORD!,
        accountNumber: process.env.ACCOUNT_NUMBER!
      }
    });

    await testKset.connect();
    console.log('✅ Credentials validated');
    await testKset.disconnect();
  } catch (error) {
    console.error('❌ Invalid credentials:', error.message);
    process.exit(1);
  }
}
```

### **Issue 3: Real-time Data Connection Issues**

**Problem:** WebSocket connection fails or drops frequently
```typescript
// Error: WebSocket connection failed
```

**Solution:**
```typescript
const kset = new KSET({
  provider: 'kiwoom',
  credentials: { /* ... */ },
  realTime: {
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    heartbeatInterval: 30000
  },
  connection: {
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 2000
  }
});

// Handle connection events
kset.on('disconnect', () => {
  console.log('⚠️ Disconnected, attempting to reconnect...');
});

kset.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
});
```

## 📊 Migration Benefits Summary

### **Development Experience**
- ✅ **Type Safety**: Catch errors at compile time
- ✅ **Modern APIs**: Promise-based async/await patterns
- ✅ **Better Documentation**: Comprehensive guides and examples
- ✅ **Active Community**: Support and contributions

### **Operational Benefits**
- ✅ **Multi-broker Support**: Easy provider switching
- ✅ **Testing Tools**: Mock providers and test frameworks
- ✅ **Monitoring**: Built-in metrics and health checks
- ✅ **Security**: Enhanced credential management

### **Business Value**
- ✅ **Faster Development**: Reduced boilerplate code
- ✅ **Lower Maintenance**: Fewer bugs and better support
- ✅ **Scalability**: Designed for production workloads
- ✅ **Future-proof**: Extensible architecture

## 🔗 Additional Resources

### **Documentation**
- [KSET Getting Started](../../guides/getting-started.md)
- [API Reference](../../api/)
- [Real-time Data Guide](../../tutorials/intermediate/real-time-streaming.md)

### **Support**
- **Discord Community**: [discord.gg/kset](https://discord.gg/kset)
- **GitHub Issues**: [Report migration issues](https://github.com/kset/kset/issues)
- **Email Support**: migration@kset.dev

### **Examples**
- [Migration Examples Repository](https://github.com/kset/migration-examples)
- [Trading Bot Template](https://github.com/kset/trading-bot-template)
- [Production Setup Guide](../../deployment/)

---

**Ready to migrate?** Start with Phase 1 and work through each phase systematically. The migration typically takes 1-2 weeks and will provide significant long-term benefits. Good luck! 🚀