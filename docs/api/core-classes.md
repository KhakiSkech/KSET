# Core Classes API Reference

This section provides detailed documentation for KSET's core classes and their methods.

## KSET Class

The main entry point for all KSET operations. Provides unified access to Korean securities trading functionality.

### Constructor

```typescript
constructor(config: KSETConfig)
```

Creates a new KSET instance with the specified configuration.

**Parameters:**
- `config` ([KSETConfig](#ksetconfig)) - Configuration object

**Example:**
```typescript
const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom.pfx',
    certificatePassword: 'password123',
    accountNumber: '12345678-01'
  },
  environment: 'production',
  logLevel: 'info'
});
```

### Methods

#### Connection Management

##### `connect(): Promise<void>`

Establishes connection to the configured provider.

**Returns:** `Promise<void>`

**Throws:**
- [AuthenticationError](../guides/getting-started.md#error-handling)
- [NetworkError](../guides/getting-started.md#error-handling)

**Example:**
```typescript
await kset.connect();
console.log('Connected to provider');
```

##### `disconnect(): Promise<void>`

Closes connection to the provider and cleans up resources.

**Returns:** `Promise<void>`

**Example:**
```typescript
await kset.disconnect();
console.log('Disconnected from provider');
```

##### `isConnected(): boolean`

Check if currently connected to the provider.

**Returns:** `boolean` - Connection status

**Example:**
```typescript
if (kset.isConnected()) {
  console.log('Provider is connected');
} else {
  await kset.connect();
}
```

#### Account Management

##### `getAccounts(): Promise<AccountInfo[]>`

Retrieves all available accounts for the authenticated user.

**Returns:** `Promise<AccountInfo[]>` - Array of account information

**Example:**
```typescript
const accounts = await kset.getAccounts();
accounts.forEach(account => {
  console.log(`Account: ${account.accountNumber} (${account.accountType})`);
});
```

##### `getBalance(accountNumber?: string): Promise<Balance>`

Retrieves account balance information.

**Parameters:**
- `accountNumber` (optional) - Specific account number, defaults to primary account

**Returns:** `Promise<Balance>` - Balance information

**Example:**
```typescript
const balance = await kset.getBalance();
console.log(`Available cash: ₩${balance.cash.toLocaleString()}`);
console.log(`Orderable amount: ₩${balance.orderable.toLocaleString()}`);
```

##### `getPortfolio(accountNumber?: string): Promise<Portfolio>`

Retrieves comprehensive portfolio information.

**Parameters:**
- `accountNumber` (optional) - Specific account number

**Returns:** `Promise<Portfolio>` - Portfolio summary

**Example:**
```typescript
const portfolio = await kset.getPortfolio();
console.log(`Total portfolio value: ₩${portfolio.totalValue.toLocaleString()}`);
console.log(`Daily P&L: ${portfolio.dailyPnLRate.toFixed(2)}%`);
```

#### Market Data

##### `getMarketData(symbol: string): Promise<MarketData>`

Retrieves current market data for a specific symbol.

**Parameters:**
- `symbol` (string) - Stock symbol (6-digit code)

**Returns:** `Promise<MarketData>` - Market data information

**Example:**
```typescript
const samsung = await kset.getMarketData('005930');
console.log(`Samsung Electronics: ₩${samsung.currentPrice.toLocaleString()}`);
console.log(`Change: ${samsung.changeRate.toFixed(2)}%`);
```

##### `getMarketDataBatch(symbols: string[]): Promise<MarketData[]>`

Retrieves market data for multiple symbols in a single request.

**Parameters:**
- `symbols` (string[]) - Array of stock symbols

**Returns:** `Promise<MarketData[]>` - Array of market data

**Example:**
```typescript
const symbols = ['005930', '000660', '035420']; // Samsung, SK Hynix, NAVER
const marketData = await kset.getMarketDataBatch(symbols);
marketData.forEach(data => {
  console.log(`${data.name}: ₩${data.currentPrice.toLocaleString()}`);
});
```

##### `getOrderBook(symbol: string, depth?: number): Promise<OrderBook>`

Retrieves order book information for a symbol.

**Parameters:**
- `symbol` (string) - Stock symbol
- `depth` (optional number) - Order book depth (default: 5)

**Returns:** `Promise<OrderBook>` - Order book data

**Example:**
```typescript
const orderBook = await kset.getOrderBook('005930', 10);
console.log('Best bid:', orderBook.bids[0]);
console.log('Best ask:', orderBook.asks[0]);
```

#### Order Management

##### `createOrder(orderRequest: OrderRequest): Promise<Order>`

Creates a new trading order.

**Parameters:**
- `orderRequest` ([OrderRequest](#orderrequest)) - Order specification

**Returns:** `Promise<Order>` - Created order information

**Example:**
```typescript
const order = await kset.createOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 80000,
  clientOrderId: 'my-order-001'
});
console.log(`Order placed: ${order.id}`);
```

##### `getOrder(orderId: string): Promise<Order>`

Retrieves order information by ID.

**Parameters:**
- `orderId` (string) - KSET order ID

**Returns:** `Promise<Order>` - Order information

**Example:**
```typescript
const order = await kset.getOrder('order-12345');
console.log(`Order status: ${order.status}`);
console.log(`Filled quantity: ${order.filledQuantity}`);
```

##### `getOrders(filter?: OrderFilter): Promise<Order[]>`

Retrieves orders with optional filtering.

**Parameters:**
- `filter` (optional [OrderFilter](#orderfilter)) - Filter criteria

**Returns:** `Promise<Order[]>` - Array of orders

**Example:**
```typescript
// Get today's orders
const todayOrders = await kset.getOrders({
  dateFrom: new Date().setHours(0, 0, 0, 0),
  status: ['filled', 'partial']
});
```

##### `cancelOrder(orderId: string): Promise<Order>`

Cancels an existing order.

**Parameters:**
- `orderId` (string) - Order ID to cancel

**Returns:** `Promise<Order>` - Updated order information

**Example:**
```typescript
const cancelledOrder = await kset.cancelOrder('order-12345');
console.log(`Order cancelled: ${cancelledOrder.status}`);
```

##### `modifyOrder(orderId: string, modifications: OrderModification): Promise<Order>`

Modifies an existing order.

**Parameters:**
- `orderId` (string) - Order ID to modify
- `modifications` ([OrderModification](#ordermodification)) - Modifications to apply

**Returns:** `Promise<Order>` - Updated order information

**Example:**
```typescript
const modifiedOrder = await kset.modifyOrder('order-12345', {
  price: 81000,
  quantity: 15
});
```

#### Position Management

##### `getPositions(accountNumber?: string): Promise<Position[]>`

Retrieves current positions.

**Parameters:**
- `accountNumber` (optional string) - Specific account number

**Returns:** `Promise<Position[]>` - Array of positions

**Example:**
```typescript
const positions = await kset.getPositions();
positions.forEach(position => {
  console.log(`${position.name}: ${position.quantity} shares`);
  console.log(`P&L: ₩${position.unrealizedPnL.toLocaleString()}`);
});
```

##### `getPosition(symbol: string, accountNumber?: string): Promise<Position | null>`

Retrieves position for a specific symbol.

**Parameters:**
- `symbol` (string) - Stock symbol
- `accountNumber` (optional string) - Specific account number

**Returns:** `Promise<Position | null>` - Position information or null if no position

**Example:**
```typescript
const samsungPosition = await kset.getPosition('005930');
if (samsungPosition) {
  console.log(`Samsung position: ${samsungPosition.quantity} shares`);
} else {
  console.log('No position in Samsung Electronics');
}
```

#### Real-time Data

##### `subscribeMarketData(symbol: string, callback: RealTimeCallback): Promise<Subscription>`

Subscribes to real-time market data for a symbol.

**Parameters:**
- `symbol` (string) - Stock symbol
- `callback` ([RealTimeCallback](#realtimecallback)) - Callback function for data updates

**Returns:** `Promise<Subscription>` - Subscription object with unsubscribe method

**Example:**
```typescript
const subscription = await kset.subscribeMarketData('005930', (data) => {
  console.log(`Price update: ₩${data.currentPrice.toLocaleString()}`);
});

// Later, unsubscribe
await subscription.unsubscribe();
```

##### `subscribeOrders(callback: OrderCallback): Promise<Subscription>`

Subscribes to real-time order updates.

**Parameters:**
- `callback` ([OrderCallback](#ordercallback)) - Callback function for order updates

**Returns:** `Promise<Subscription>` - Subscription object

**Example:**
```typescript
const subscription = await kset.subscribeOrders((order) => {
  console.log(`Order ${order.id} status: ${order.status}`);
});
```

#### Research & Analytics

##### `getCompanyInfo(symbol: string): Promise<CompanyInfo>`

Retrieves detailed company information.

**Parameters:**
- `symbol` (string) - Stock symbol

**Returns:** `Promise<CompanyInfo>` - Company information

**Example:**
```typescript
const companyInfo = await kset.getCompanyInfo('005930');
console.log(`CEO: ${companyInfo.ceo}`);
console.log(`Industry: ${companyInfo.industry}`);
```

##### `getFinancialData(symbol: symbol: string, period: 'quarterly' | 'annual'): Promise<FinancialData[]>`

Retrieves financial statement data.

**Parameters:**
- `symbol` (string) - Stock symbol
- `period` ('quarterly' | 'annual') - Data period

**Returns:** `Promise<FinancialData[]>` - Array of financial data

**Example:**
```typescript
const financials = await kset.getFinancialData('005930', 'quarterly');
const latestQuarter = financials[0];
console.log(`Revenue: ₩${latestQuarter.revenue.toLocaleString()}`);
console.log(`Net income: ₩${latestQuarter.netIncome.toLocaleString()}`);
```

##### `getDisclosures(symbol?: string, limit?: number): Promise<Disclosure[]>`

Retrieves DART disclosures.

**Parameters:**
- `symbol` (optional string) - Filter by symbol
- `limit` (optional number) - Maximum number of disclosures

**Returns:** `Promise<Disclosure[]>` - Array of disclosures

**Example:**
```typescript
const disclosures = await kset.getDisclosures('005930', 10);
disclosures.forEach(disclosure => {
  console.log(`${disclosure.title} - ${disclosure.publishedAt.toLocaleDateString()}`);
});
```

## Type Definitions

### KSETConfig

```typescript
interface KSETConfig {
  provider: string;
  credentials: AuthCredentials;
  environment?: 'development' | 'staging' | 'production';
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  connection?: {
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
  };
  cache?: {
    enabled?: boolean;
    ttl?: number;
  };
  rateLimit?: {
    enabled?: boolean;
    maxRequests?: number;
    windowMs?: number;
  };
}
```

### OrderRequest

```typescript
interface OrderRequest {
  symbol: string;
  side: 'BUY' | 'SELL';
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;
  goodTillDate?: Date;
  notes?: string;
  clientOrderId?: string;
}
```

### OrderFilter

```typescript
interface OrderFilter {
  symbol?: string;
  side?: 'BUY' | 'SELL';
  status?: OrderStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
}
```

### OrderModification

```typescript
interface OrderModification {
  price?: number;
  quantity?: number;
  timeInForce?: TimeInForce;
}
```

### RealTimeCallback

```typescript
type RealTimeCallback = (data: MarketData) => void;
```

### OrderCallback

```typescript
type OrderCallback = (order: Order) => void;
```

## Error Handling

KSET methods throw specific error types for different failure scenarios:

- **AuthenticationError** - Authentication/authorization failures
- **NetworkError** - Network connectivity issues
- **MarketClosedError** - Market is closed for trading
- **InsufficientFundsError** - Insufficient funds for order
- **InvalidSymbolError** - Invalid or unknown symbol
- **InvalidOrderError** - Invalid order parameters
- **RateLimitError** - API rate limit exceeded
- **ComplianceError** - Regulatory compliance violations

Always wrap KSET operations in try-catch blocks and handle errors appropriately:

```typescript
import {
  KSETError,
  MarketClosedError,
  InsufficientFundsError
} from 'kset';

try {
  await kset.createOrder(orderRequest);
} catch (error) {
  if (error instanceof MarketClosedError) {
    console.log('Market is closed');
  } else if (error instanceof InsufficientFundsError) {
    console.log('Insufficient funds');
  } else if (error instanceof KSETError) {
    console.log(`KSET Error: ${error.message}`);
  }
}
```

## Performance Considerations

- Use **batch operations** where possible for multiple symbols
- Implement **caching** for frequently accessed market data
- Use **real-time subscriptions** instead of polling for live data
- Monitor **rate limits** and implement appropriate throttling
- Use **connection pooling** for high-frequency operations

## Best Practices

1. **Always handle errors** and provide meaningful error messages
2. **Validate order parameters** before submission
3. **Monitor connection status** and implement reconnection logic
4. **Use appropriate time in force** settings for your trading strategy
5. **Implement proper logging** for debugging and audit purposes
6. **Set reasonable timeouts** for network operations
7. **Use mock providers** for development and testing