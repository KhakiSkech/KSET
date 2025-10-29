# Migration Guide to KSET

This guide helps you migrate from other Korean trading libraries to KSET, ensuring a smooth transition with minimal disruption to your existing codebase.

## 🎯 Migration Overview

KSET provides a unified, modern interface for Korean securities trading. This guide covers migration from:

- **Legacy Kiwoom COM API**
- **Korea Investment API**
- **Custom trading implementations**
- **Other third-party libraries**

## 📋 Migration Checklist

Before starting migration:

- [ ] Backup your existing codebase
- [ ] Review current provider integrations
- [ ] Document existing trading workflows
- [ ] Set up development environment for KSET
- [ ] Create test data for validation
- [ ] Plan phased migration approach

## 🔄 From Legacy Kiwoom COM API

### Key Differences

| Feature | Kiwoom COM API | KSET |
|---------|----------------|------|
| Language | COM (VB/C++) | TypeScript/JavaScript |
| Connection | COM Port | WebSocket/HTTP |
| Error Handling | Return codes | Exceptions/Promises |
| Data Types | Variant | Strongly-typed objects |
| Async Support | Limited | Native async/await |
| Event Handling | COM Events | EventEmitter |

### Migration Steps

#### 1. Connection Setup

**Before (Kiwoom COM):**
```vb
Dim kiwoom As Object
Set kiwoom = CreateObject("KHOPENAPI.KHOpenAPICtrl")

kiwoom.Connect
```

**After (KSET):**
```typescript
import { KSETSDK } from '@kset/kset';

const sdk = new KSETSDK({
  providers: ['kiwoom'],
  kiwoom: {
    port: 3333,
    password: 'your_password',
    certificatePassword: 'your_cert_password'
  }
});

await sdk.connect();
```

#### 2. Order Creation

**Before (Kiwoom COM):**
```vb
kiwoom.SendOrder("RQ_1", "SP_SEND_ORDER_REQ", "0001", 1, "005930", 1, 100, 0, "03", "")
```

**After (KSET):**
```typescript
const order = await sdk.createOrder({
  symbol: '005930',
  side: 'buy',
  type: 'limit',
  quantity: 100,
  price: 80000
});
```

#### 3. Market Data Subscription

**Before (Kiwoom COM):**
```vb
kiwoom.SetInputValue("종목코드", "005930")
kiwoom.CommRqData("RQ_1", "OPT10001", 0)
```

**After (KSET):**
```typescript
await sdk.subscribeMarketData(['005930']);

sdk.on('market:data', (data) => {
  console.log('Market data:', data);
});
```

#### 4. Event Handling

**Before (Kiwoom COM):**
```vb
Private Sub kiwoom_OnReceiveTrData(ByVal sScrNo As String, ByVal sRQName As String, ByVal sTrCode As String, ByVal sRecordName As String, ByVal sPrevNext As String, ByVal nDataLength As Long, ByVal sErrCode As String, ByVal sMessage As String, ByVal sSplmMsg As String)
    If sRQName = "RQ_1" Then
        ' Handle data
    End If
End Sub
```

**After (KSET):**
```typescript
sdk.on('order:filled', (order, fill) => {
  console.log('Order filled:', order.id);
});

sdk.on('market:data', (data) => {
  console.log('Market data update:', data);
});
```

### Migration Script Example

```typescript
// Helper class to migrate from Kiwoom COM patterns
class KiwoomMigrator {
  private sdk: KSETSDK;

  constructor(sdk: KSETSDK) {
    this.sdk = sdk;
  }

  // Migrate SendOrder calls
  async migrateSendOrder(
    screenNo: string,
    requestName: string,
    accountNo: string,
    orderType: number,
    symbol: string,
    quantity: number,
    price: number,
    hogaGb: string,
    originalOrderNo: string
  ): Promise<EnhancedOrder> {
    // Map Kiwoom order types to KSET
    const sideMap: Record<number, 'buy' | 'sell'> = {
      1: 'buy',
      2: 'sell'
    };

    const typeMap: Record<string, 'market' | 'limit'> = {
      '01': 'limit',
      '03': 'market'
    };

    return this.sdk.createOrder({
      symbol,
      side: sideMap[orderType],
      type: typeMap[hogaGb] || 'limit',
      quantity,
      price: typeMap[hogaGb] === 'market' ? undefined : price,
      metadata: {
        source: 'kiwoom_migration',
        originalOrderNo,
        screenNo,
        requestName
      }
    });
  }

  // Migrate CommRqData calls
  async migrateCommRqData(
    requestName: string,
    trCode: string,
    prevNext: string,
    screenNo: string
  ): Promise<any> {
    // Map Kiwoom TR codes to KSET methods
    const trCodeMap: Record<string, string> = {
      'OPT10001': 'getMarketData',
      'OPT10080': 'getAccountInfo',
      'OPT10085': 'getBalances'
    };

    const method = trCodeMap[trCode];
    if (!method) {
      throw new Error(`Unsupported TR code: ${trCode}`);
    }

    return (this.sdk as any)[method]();
  }
}
```

## 🔄 From Korea Investment API

### Key Differences

| Feature | Korea Investment API | KSET |
|---------|----------------------|------|
| Authentication | Token-based | Unified config |
| Request Format | HTTP requests | Method calls |
| Response Format | JSON | Typed objects |
| Rate Limiting | Manual | Built-in |
| WebSocket | Separate API | Integrated |

### Migration Steps

#### 1. Authentication

**Before (Korea Investment):**
```typescript
const response = await fetch('/oauth2/tokenP', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    grant_type: 'client_credentials',
    appkey: 'your_app_key',
    appsecret: 'your_app_secret'
  })
});

const { access_token } = await response.json();
```

**After (KSET):**
```typescript
const sdk = new KSETSDK({
  providers: ['korea_investment'],
  korea_investment: {
    appKey: 'your_app_key',
    appSecret: 'your_app_secret',
    accessToken: 'your_access_token' // Optional, will auto-refresh
  }
});
```

#### 2. Order Placement

**Before (Korea Investment):**
```typescript
const response = await fetch('/uapi/domestic-stock/v1/trading/order-cash', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'appKey': appKey,
    'appSecret': appSecret,
    'tr_id': 'TTTC0802U'
  },
  body: JSON.stringify({
    CANO: '12345678',
    ACNT_PRDT_CD: '01',
    PDNO: '005930',
    ORD_DVSN: '01',
    ORD_QTY: '100',
    ORD_UNPR: '80000',
    CTAC_TLNO: ''
  })
});
```

**After (KSET):**
```typescript
const order = await sdk.createOrder({
  symbol: '005930',
  side: 'buy',
  type: 'limit',
  quantity: 100,
  price: 80000
});
```

### Migration Helper

```typescript
class KoreaInvestmentMigrator {
  private sdk: KSETSDK;

  constructor(sdk: KSETSDK) {
    this.sdk = sdk;
  }

  // Map Korea Investment order codes to KSET
  mapOrderType(ordDvsn: string): 'buy' | 'sell' {
    const map: Record<string, 'buy' | 'sell'> = {
      '01': 'buy',
      '02': 'sell'
    };
    return map[ordDvsn] || 'buy';
  }

  // Migrate existing order parameters
  async migrateOrder({
    CANO,
    PDNO,
    ORD_DVSN,
    ORD_QTY,
    ORD_UNPR,
    CTAC_TLNO
  }: any): Promise<EnhancedOrder> {
    return this.sdk.createOrder({
      symbol: PDNO,
      side: this.mapOrderType(ORD_DVSN),
      type: 'limit',
      quantity: parseInt(ORD_QTY),
      price: parseInt(ORD_UNPR),
      metadata: {
        source: 'korea_investment_migration',
        accountNo: CANO,
        originalOrderNo: CTAC_TLNO
      }
    });
  }
}
```

## 🔄 From Custom Implementation

### Migration Strategy

1. **Analysis Phase**
   - Document current implementation
   - Identify core functionality
   - Map features to KSET equivalents

2. **Proof of Concept**
   - Implement critical path with KSET
   - Compare performance and functionality
   - Validate with test data

3. **Incremental Migration**
   - Replace components one at a time
   - Maintain parallel systems during transition
   - Gradually phase out custom code

4. **Validation**
   - Compare results between systems
   - Performance testing
   - User acceptance testing

### Example Migration

**Before (Custom Implementation):**
```typescript
class CustomTradingAPI {
  private httpClient: HttpClient;
  private webSocket: WebSocket;

  async connect(): Promise<void> {
    this.httpClient = new HttpClient('api.trading.com');
    this.webSocket = new WebSocket('ws://api.trading.com/ws');
  }

  async createOrder(order: OrderRequest): Promise<OrderResponse> {
    const response = await this.httpClient.post('/orders', order);
    return response.data;
  }

  subscribeToMarketData(callback: (data: MarketData) => void): void {
    this.webSocket.onmessage = (event) => {
      callback(JSON.parse(event.data));
    };
  }
}
```

**After (KSET):**
```typescript
import { KSETSDK } from '@kset/kset';

class MigratedTradingAPI {
  private sdk: KSETSDK;

  constructor() {
    this.sdk = new KSETSDK({
      providers: ['kiwoom', 'korea_investment'],
      debug: true
    });
  }

  async connect(): Promise<void> {
    await this.sdk.connect();
  }

  async createOrder(order: OrderRequest): Promise<OrderResponse> {
    const ksetOrder = await this.sdk.createOrder({
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price
    });

    return this.convertToOrderResponse(ksetOrder);
  }

  subscribeToMarketData(callback: (data: MarketData) => void): void {
    this.sdk.on('market:data', (ksetData) => {
      callback(this.convertToMarketData(ksetData));
    });
  }

  private convertToOrderResponse(ksetOrder: EnhancedOrder): OrderResponse {
    return {
      id: ksetOrder.id,
      symbol: ksetOrder.symbol,
      status: ksetOrder.status,
      // ... other mappings
    };
  }

  private convertToMarketData(ksetData: EnhancedMarketData): MarketData {
    return {
      symbol: ksetData.symbol,
      price: ksetData.price,
      volume: ksetData.volume,
      timestamp: ksetData.timestamp
    };
  }
}
```

## 🛠️ Best Practices for Migration

### 1. Incremental Approach

```typescript
// Feature flag for gradual migration
const USE_KSET = process.env.USE_KSET === 'true';

class HybridTradingService {
  private ksetSDK: KSETSDK;
  private legacyAPI: CustomTradingAPI;

  constructor() {
    this.ksetSDK = new KSETSDK({ providers: ['kiwoom'] });
    this.legacyAPI = new CustomTradingAPI();
  }

  async createOrder(orderData: any): Promise<any> {
    if (USE_KSET) {
      return this.ksetSDK.createOrder(orderData);
    } else {
      return this.legacyAPI.createOrder(orderData);
    }
  }
}
```

### 2. Data Validation

```typescript
class MigrationValidator {
  async validateOrder(legacyOrder: any, ksetOrder: EnhancedOrder): boolean {
    return (
      legacyOrder.symbol === ksetOrder.symbol &&
      legacyOrder.side === ksetOrder.side &&
      legacyOrder.quantity === ksetOrder.quantity &&
      Math.abs(legacyOrder.price - (ksetOrder.price || 0)) < 1
    );
  }

  async validateMarketData(legacyData: any, ksetData: EnhancedMarketData): boolean {
    return (
      legacyData.symbol === ksetData.symbol &&
      Math.abs(legacyData.price - ksetData.price) < 0.01
    );
  }
}
```

### 3. Performance Monitoring

```typescript
class MigrationMonitor {
  private legacyMetrics: Map<string, number> = new Map();
  private ksetMetrics: Map<string, number> = new Map();

  recordLegacyMetric(operation: string, duration: number): void {
    this.legacyMetrics.set(operation, duration);
  }

  recordKSETMetric(operation: string, duration: number): void {
    this.ksetMetrics.set(operation, duration);
  }

  comparePerformance(operation: string): {
    legacy: number;
    kset: number;
    improvement: number;
  } {
    const legacy = this.legacyMetrics.get(operation) || 0;
    const kset = this.ksetMetrics.get(operation) || 0;
    const improvement = ((legacy - kset) / legacy) * 100;

    return { legacy, kset, improvement };
  }
}
```

## 🧪 Testing Migration

### 1. Parallel Testing

```typescript
class ParallelTester {
  async testOrderCreation(orderData: any): Promise<{
    legacyResult: any;
    ksetResult: any;
    passed: boolean;
  }> {
    // Test both systems in parallel
    const [legacyResult, ksetResult] = await Promise.all([
      this.legacyAPI.createOrder(orderData),
      this.ksetSDK.createOrder(orderData)
    ]);

    // Validate results
    const validator = new MigrationValidator();
    const passed = await validator.validateOrder(legacyResult, ksetResult);

    return { legacyResult, ksetResult, passed };
  }
}
```

### 2. Load Testing

```typescript
class MigrationLoadTester {
  async testConcurrentOrders(
    orderCount: number,
    concurrency: number
  ): Promise<{
    legacyResults: any[];
    ksetResults: any[];
    comparison: any;
  }> {
    const legacyPromises = this.createOrderBatch(orderCount, 'legacy');
    const ksetPromises = this.createOrderBatch(orderCount, 'kset');

    const [legacyResults, ksetResults] = await Promise.all([
      this.executeBatch(legacyPromises, concurrency),
      this.executeBatch(ksetPromises, concurrency)
    ]);

    const comparison = this.compareResults(legacyResults, ksetResults);

    return { legacyResults, ksetResults, comparison };
  }

  private createOrderBatch(count: number, system: 'legacy' | 'kset'): Promise<any>[] {
    // Create batch of order promises
    return [];
  }

  private async executeBatch(promises: Promise<any>[], concurrency: number): Promise<any[]> {
    // Execute with concurrency control
    return [];
  }

  private compareResults(legacy: any[], kset: any[]): any {
    // Compare performance and accuracy
    return {};
  }
}
```

## 🚨 Common Migration Issues

### 1. Authentication Differences

**Issue:** Different authentication mechanisms between providers

**Solution:** Use KSET's unified configuration
```typescript
const sdk = new KSETSDK({
  providers: ['kiwoom', 'korea_investment'],
  kiwoom: {
    // Kiwoom-specific auth
  },
  korea_investment: {
    // Korea Investment-specific auth
  }
});
```

### 2. Data Format Mismatches

**Issue:** Different data structures and field names

**Solution:** Create mapping utilities
```typescript
class DataMapper {
  static toKSETOrder(legacyOrder: any): EnhancedOrder {
    return {
      id: legacyOrder.orderId,
      symbol: legacyOrder.stockCode,
      side: legacyOrder.buySell === '1' ? 'buy' : 'sell',
      // ... map other fields
    };
  }

  static fromKSETOrder(ksetOrder: EnhancedOrder): any {
    return {
      orderId: ksetOrder.id,
      stockCode: ksetOrder.symbol,
      buySell: ksetOrder.side === 'buy' ? '1' : '2',
      // ... map other fields
    };
  }
}
```

### 3. Event Handling Differences

**Issue:** Different event systems and message formats

**Solution:** Create event adapters
```typescript
class EventAdapter {
  constructor(private sdk: KSETSDK) {
    this.setupEventMapping();
  }

  private setupEventMapping(): void {
    this.sdk.on('order:filled', (order, fill) => {
      // Convert to legacy event format
      this.emitLegacyEvent('onOrderFilled', {
        orderId: order.id,
        fillPrice: fill.price,
        fillQuantity: fill.quantity
      });
    });
  }

  private emitLegacyEvent(eventType: string, data: any): void {
    // Emit in legacy format
  }
}
```

## 📊 Migration Timeline

### Phase 1: Preparation (1-2 weeks)
- Set up development environment
- Install KSET dependencies
- Create migration plan
- Set up testing infrastructure

### Phase 2: Proof of Concept (2-3 weeks)
- Implement core functionality with KSET
- Compare performance with existing system
- Validate critical workflows

### Phase 3: Partial Migration (4-6 weeks)
- Migrate non-critical components
- Run parallel systems
- Monitor performance and accuracy

### Phase 4: Full Migration (2-3 weeks)
- Migrate remaining components
- Switch to KSET for production
- Decommission legacy code

### Phase 5: Optimization (1-2 weeks)
- Fine-tune performance
- Implement advanced KSET features
- Train team on new system

## 📞 Support

For migration assistance:

- 📧 Email: migration@kset.dev
- 💬 Discord: https://discord.gg/kset
- 📚 Documentation: https://docs.kset.dev
- 🐛 Issues: https://github.com/kset/kset/issues

---

Ready to start your migration journey? Check out our [Getting Started](./getting-started.md) guide and [Examples](./examples.md) for more detailed implementation guidance.