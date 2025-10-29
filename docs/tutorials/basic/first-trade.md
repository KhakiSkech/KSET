# Tutorial: Your First Trade with KSET

**Learning Time:** 15 minutes
**Difficulty:** Beginner
**Prerequisites:** Node.js, Korean securities account, KSET installation

## 🎯 Learning Objectives

By the end of this tutorial, you'll be able to:
- Initialize KSET with your broker credentials
- Connect to a Korean securities provider
- Retrieve real-time market data
- Place your first stock order
- Monitor order execution
- Handle common errors

## 📋 Prerequisites

Before starting, ensure you have:

1. **Node.js 16.0+** installed
2. **KSET installed**: `npm install kset`
3. **Korean securities account** with supported broker
4. **Trading certificate** (공인인증서) for Korean brokers

## 🚀 Step 1: Project Setup

Create a new project directory and initialize it:

```bash
mkdir kset-first-trade
cd kset-first-trade
npm init -y
npm install kset dotenv

# Create environment file
touch .env
touch index.ts
```

Set up your environment variables in `.env`:

```bash
# .env
KSET_PROVIDER=kiwoom
KSET_CERT_PATH=./certs/your_cert.pfx
KSET_CERT_PASSWORD=your_certificate_password
KSET_ACCOUNT_NUMBER=12345678-01
KSET_ENVIRONMENT=development
```

## 🚀 Step 2: Initialize KSET

Create your main application file:

```typescript
// index.ts
import { KSET } from 'kset';
import { config } from 'dotenv';

// Load environment variables
config();

async function main() {
  console.log('🚀 Starting KSET First Trade Tutorial...');

  // Initialize KSET with your credentials
  const kset = new KSET({
    provider: process.env.KSET_PROVIDER || 'kiwoom',
    credentials: {
      certificatePath: process.env.KSET_CERT_PATH!,
      certificatePassword: process.env.KSET_CERT_PASSWORD!,
      accountNumber: process.env.KSET_ACCOUNT_NUMBER!
    },
    environment: (process.env.KSET_ENVIRONMENT as any) || 'development',
    logLevel: 'info'
  });

  try {
    // Connect to the provider
    await kset.connect();
    console.log('✅ Successfully connected to', process.env.KSET_PROVIDER);

    // Continue with trading logic...

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

main().catch(console.error);
```

Run your application to test the connection:

```bash
npx tsx index.ts
```

You should see a success message if everything is configured correctly.

## 🚀 Step 3: Get Market Data

Add market data retrieval to your application:

```typescript
// Add this function to index.ts
async function getMarketData(kset: KSET, symbol: string) {
  try {
    console.log(`📊 Fetching market data for ${symbol}...`);

    const marketData = await kset.getMarketData(symbol);

    console.log('\n📈 Market Data:');
    console.log(`Name: ${marketData.name}`);
    console.log(`Current Price: ₩${marketData.currentPrice.toLocaleString()}`);
    console.log(`Previous Close: ₩${marketData.previousClose.toLocaleString()}`);
    console.log(`Change: ₩${marketData.changeAmount.toLocaleString()} (${marketData.changeRate.toFixed(2)}%)`);
    console.log(`Volume: ${marketData.volume.toLocaleString()} shares`);
    console.log(`Market Cap: ₩${(marketData.marketCap / 1e12).toFixed(1)}T`);
    console.log(`Updated: ${new Date(marketData.timestamp).toLocaleString()}`);

    return marketData;

  } catch (error) {
    console.error('❌ Failed to get market data:', error.message);
    throw error;
  }
}

// Update the main function
async function main() {
  // ... existing code ...

  // Get market data for Samsung Electronics (005930)
  const samsungData = await getMarketData(kset, '005930');

  // Continue with order placement...
}
```

## 🚀 Step 4: Check Account Balance

Before placing an order, let's check your available balance:

```typescript
// Add this function to index.ts
async function getAccountInfo(kset: KSET) {
  try {
    console.log('\n💰 Account Information:');

    // Get balance
    const balance = await kset.getBalance();
    console.log(`Cash: ₩${balance.cash.toLocaleString()}`);
    console.log(`Orderable: ₩${balance.orderable.toLocaleString()}`);
    console.log(`Total including margin: ₩${balance.totalIncludingMargin.toLocaleString()}`);

    // Get portfolio
    const portfolio = await kset.getPortfolio();
    console.log(`Portfolio Value: ₩${portfolio.totalValue.toLocaleString()}`);
    console.log(`Daily P&L: ₩${portfolio.dailyPnL.toLocaleString()} (${portfolio.dailyPnLRate.toFixed(2)}%)`);

    return { balance, portfolio };

  } catch (error) {
    console.error('❌ Failed to get account info:', error.message);
    throw error;
  }
}

// Update the main function
async function main() {
  // ... existing code ...

  const accountInfo = await getAccountInfo(kset);

  // Continue with order placement...
}
```

## 🚀 Step 5: Place Your First Order

Now for the exciting part - placing your first order:

```typescript
// Add this function to index.ts
async function placeOrder(kset: KSET, symbol: string, side: 'BUY' | 'SELL', quantity: number, price?: number) {
  try {
    console.log(`\n🛒 Placing ${side} order for ${quantity} shares of ${symbol}...`);

    const orderRequest = {
      symbol,
      side,
      orderType: price ? 'LIMIT' : 'MARKET',
      quantity,
      price,
      clientOrderId: `tutorial-order-${Date.now()}` // Optional client order ID
    };

    if (price) {
      console.log(`Order Type: LIMIT @ ₩${price.toLocaleString()}`);
    } else {
      console.log('Order Type: MARKET');
    }

    const order = await kset.createOrder(orderRequest);

    console.log('\n✅ Order placed successfully!');
    console.log(`Order ID: ${order.id}`);
    console.log(`Provider Order ID: ${order.providerOrderId}`);
    console.log(`Status: ${order.status}`);
    console.log(`Symbol: ${order.symbol}`);
    console.log(`Side: ${order.side}`);
    console.log(`Type: ${order.orderType}`);
    console.log(`Quantity: ${order.quantity}`);
    if (order.price) {
      console.log(`Price: ₩${order.price.toLocaleString()}`);
    }
    console.log(`Order Value: ₩${order.orderValue.toLocaleString()}`);
    console.log(`Created: ${order.createdAt.toLocaleString()}`);

    return order;

  } catch (error) {
    console.error('❌ Order failed:', error.message);

    // Handle specific errors
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('💡 Tip: Check your account balance and order size');
    } else if (error.code === 'MARKET_CLOSED') {
      console.log('💡 Tip: Market is closed (09:00-15:30 KST on weekdays)');
    } else if (error.code === 'INVALID_SYMBOL') {
      console.log('💡 Tip: Check if the symbol code is correct');
    }

    throw error;
  }
}

// Update the main function
async function main() {
  // ... existing code ...

  // Example: Buy 1 share of Samsung Electronics at market price
  const order = await placeOrder(kset, '005930', 'BUY', 1);

  // Continue with order monitoring...
}
```

## 🚀 Step 6: Monitor Order Status

Let's monitor the order to see when it gets executed:

```typescript
// Add this function to index.ts
async function monitorOrder(kset: KSET, orderId: string, timeoutMs: number = 60000) {
  try {
    console.log(`\n👀 Monitoring order ${orderId}...`);

    const startTime = Date.now();
    let order = await kset.getOrder(orderId);

    console.log(`Initial status: ${order.status}`);

    // Poll for order updates
    while (order.status !== 'filled' && order.status !== 'cancelled' && order.status !== 'rejected') {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second

      try {
        order = await kset.getOrder(orderId);
        console.log(`Status: ${order.status} | Filled: ${order.filledQuantity}/${order.quantity}`);

        if (order.filledQuantity > 0 && !order.fillPrice) {
          console.log(`Average Fill Price: ₩${order.averageFillPrice.toLocaleString()}`);
        }

      } catch (error) {
        console.log('⚠️ Failed to get order update:', error.message);
      }

      // Timeout after specified time
      if (Date.now() - startTime > timeoutMs) {
        console.log('⏰ Monitoring timeout reached');
        break;
      }
    }

    console.log('\n📊 Final Order Status:');
    console.log(`Status: ${order.status}`);
    console.log(`Filled Quantity: ${order.filledQuantity}`);
    console.log(`Remaining Quantity: ${order.remainingQuantity}`);
    if (order.averageFillPrice > 0) {
      console.log(`Average Fill Price: ₩${order.averageFillPrice.toLocaleString()}`);
    }
    if (order.filledValue > 0) {
      console.log(`Filled Value: ₩${order.filledValue.toLocaleString()}`);
    }
    if (order.commission) {
      console.log(`Commission: ₩${order.commission.toLocaleString()}`);
    }

    return order;

  } catch (error) {
    console.error('❌ Failed to monitor order:', error.message);
    throw error;
  }
}

// Update the main function
async function main() {
  // ... existing code ...

  // Monitor the order until it's filled or timeout
  const finalOrder = await monitorOrder(kset, order.id, 30000); // 30 second timeout

  // Continue with cleanup...
}
```

## 🚀 Step 7: Real-time Updates (Optional)

For a more advanced experience, let's set up real-time order updates:

```typescript
// Add this function to index.ts
async function setupRealTimeUpdates(kset: KSET) {
  console.log('\n📡 Setting up real-time updates...');

  // Subscribe to order updates
  const orderSubscription = await kset.subscribeOrders((order) => {
    console.log(`🔔 Order Update: ${order.id} is now ${order.status}`);
    if (order.filledQuantity > 0) {
      console.log(`   Filled: ${order.filledQuantity}@₩${order.averageFillPrice.toLocaleString()}`);
    }
  });

  // Subscribe to market data updates
  const marketSubscription = await kset.subscribeMarketData('005930', (data) => {
    console.log(`📈 Samsung: ₩${data.currentPrice.toLocaleString()} (${data.changeRate > 0 ? '+' : ''}${data.changeRate.toFixed(2)}%)`);
  });

  console.log('✅ Real-time updates activated');

  return { orderSubscription, marketSubscription };
}

// Update the main function
async function main() {
  // ... existing connection code ...

  // Setup real-time updates
  const { orderSubscription, marketSubscription } = await setupRealTimeUpdates(kset);

  // ... rest of your trading logic ...

  // Remember to cleanup when done
  setTimeout(async () => {
    await orderSubscription.unsubscribe();
    await marketSubscription.unsubscribe();
    console.log('🔇 Real-time subscriptions cancelled');
  }, 60000); // Cancel after 1 minute
}
```

## 🚀 Step 8: Putting It All Together

Here's the complete application:

```typescript
// index.ts - Complete first trade application
import { KSET } from 'kset';
import { config } from 'dotenv';

config();

async function main() {
  console.log('🚀 KSET First Trade Tutorial\n');

  const kset = new KSET({
    provider: process.env.KSET_PROVIDER || 'kiwoom',
    credentials: {
      certificatePath: process.env.KSET_CERT_PATH!,
      certificatePassword: process.env.KSET_CERT_PASSWORD!,
      accountNumber: process.env.KSET_ACCOUNT_NUMBER!
    },
    environment: (process.env.KSET_ENVIRONMENT as any) || 'development',
    logLevel: 'info'
  });

  try {
    // Connect to provider
    await kset.connect();
    console.log('✅ Connected to', process.env.KSET_PROVIDER);

    // Get market data
    const marketData = await getMarketData(kset, '005930');

    // Check account
    const accountInfo = await getAccountInfo(kset);

    // Place a small order (modify as needed)
    console.log('\n⚠️  WARNING: This will place a real order!');
    console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Place order for 1 share at market price
    const order = await placeOrder(kset, '005930', 'BUY', 1);

    // Monitor order
    const finalOrder = await monitorOrder(kset, order.id);

    console.log('\n🎉 Tutorial completed successfully!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    // Disconnect
    await kset.disconnect();
    console.log('👋 Disconnected from provider');
  }
}

// Include all the helper functions from previous steps
async function getMarketData(kset: KSET, symbol: string) { /* ... */ }
async function getAccountInfo(kset: KSET) { /* ... */ }
async function placeOrder(kset: KSET, symbol: string, side: 'BUY' | 'SELL', quantity: number, price?: number) { /* ... */ }
async function monitorOrder(kset: KSET, orderId: string, timeoutMs: number = 60000) { /* ... */ }

main().catch(console.error);
```

## 🎯 Best Practices

### **Start Small**
- Begin with small quantities (1-10 shares)
- Use market orders for simplicity
- Test with liquid stocks like Samsung Electronics

### **Error Handling**
- Always wrap operations in try-catch blocks
- Check account balance before ordering
- Verify market is open before trading

### **Safety Measures**
- Add confirmation prompts for real orders
- Implement position size limits
- Use paper trading for testing strategies

### **Logging**
- Log all trading activities
- Track order IDs and execution details
- Monitor errors and connection issues

## 🔧 Troubleshooting

### **Common Issues**

**Connection Failed**
```
Error: Certificate not found or invalid password
```
- Check certificate path and password
- Ensure certificate file is accessible
- Verify account number format

**Market Closed**
```
Error: Market is currently closed
```
- Korean market hours: 09:00-15:30 KST
- Check for holidays and weekends
- Verify your system timezone

**Insufficient Funds**
```
Error: Insufficient funds for order
```
- Check your available balance
- Consider smaller order quantities
- Account for commission fees

**Invalid Symbol**
```
Error: Invalid or unknown symbol
```
- Use 6-digit Korean stock codes
- Verify symbol exists on chosen market
- Check market (KOSPI/KOSDAQ) compatibility

### **Getting Help**

- **Documentation**: [KSET Docs](../../)
- **Discord**: [Community Support](https://discord.gg/kset)
- **GitHub**: [Issue Tracker](https://github.com/kset/kset/issues)

## 🎓 Next Steps

Congratulations! You've completed your first trade with KSET. Here's what to learn next:

1. **[Market Data Basics](./market-data.md)** - Deep dive into market data features
2. **[Order Management](./order-management.md)** - Advanced order handling
3. **[Portfolio Tracking](./portfolio-tracking.md)** - Build portfolio monitoring
4. **[Real-time Streaming](../intermediate/real-time-streaming.md)** - WebSocket connections

## 💡 Pro Tips

- **Use environment variables** for credentials (never hardcode them)
- **Implement proper logging** for debugging and audit trails
- **Set up monitoring** for your trading applications
- **Join the community** to learn from other developers
- **Start with paper trading** before using real money

---

**Happy Trading!** 🚀 You've successfully integrated KSET and executed your first Korean securities trade. Welcome to the world of automated trading!