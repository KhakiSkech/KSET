# KSET Tutorials

Welcome to the KSET tutorial series! These hands-on tutorials will guide you through everything from basic trading operations to advanced algorithmic strategies. Each tutorial includes working code examples and best practices.

## 🎯 Tutorial Path

### **Beginner Tutorials**
For developers new to KSET or Korean securities trading.

1. **[Your First Trade](./basic/first-trade.md)** - Complete end-to-end trading workflow
2. **[Market Data Basics](./basic/market-data.md)** - Fetching and displaying market information
3. **[Account Management](./basic/account-management.md)** - Managing accounts and balances
4. **[Order Management](./basic/order-management.md)** - Creating, monitoring, and managing orders
5. **[Portfolio Tracking](./basic/portfolio-tracking.md)** - Building a portfolio dashboard

### **Intermediate Tutorials**
For developers comfortable with basic operations.

6. **[Real-time Data Streaming](./intermediate/real-time-streaming.md)** - WebSocket connections and live data
7. **[Advanced Order Types](./intermediate/advanced-orders.md)** - Complex order types and strategies
8. **[Risk Management](./intermediate/risk-management.md)** - Implementing risk controls
9. **[Error Handling & Resilience](./intermediate/error-handling.md)** - Building robust trading applications
10. **[Data Persistence](./intermediate/data-persistence.md)** - Storing and analyzing trading data

### **Advanced Tutorials**
For experienced developers building production systems.

11. **[Algorithmic Trading](./advanced/algorithmic-trading.md)** - Building automated trading strategies
12. **[Multi-Provider Architecture](./advanced/multi-provider.md)** - Managing multiple broker connections
13. **[High-Frequency Trading](./advanced/high-frequency.md)** - Optimizing for speed and performance
14. **[Custom Provider Development](./advanced/custom-provider.md)** - Creating your own provider implementations
15. **[Performance Optimization](./advanced/performance.md)** - Scaling and optimization techniques

### **Specialized Tutorials**
Domain-specific tutorials for particular use cases.

16. **[Quantitative Research](./research/quantitative-analysis.md)** - Research and backtesting strategies
17. **[DART Integration](./research/dart-integration.md)** - Korean disclosure system integration
18. **[Technical Analysis](./research/technical-analysis.md)** - Implementing technical indicators
19. **[Mobile Trading App](./specialized/mobile-app.md)** - Building mobile trading applications
20. **[Trading Dashboard](./specialized/dashboard.md)** - Creating professional trading interfaces

## 🚀 Getting Started

### Prerequisites
- Node.js 16.0+
- TypeScript knowledge (recommended)
- Basic understanding of financial markets
- Korean securities account with supported broker

### Setup
```bash
# Clone the examples repository
git clone https://github.com/kset/kset-examples.git
cd kset-examples

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your credentials
```

### Environment Configuration
```bash
# .env file
KSET_PROVIDER=kiwoom
KSET_CERT_PATH=./certs/your_cert.pfx
KSET_CERT_PASSWORD=your_password
KSET_ACCOUNT_NUMBER=12345678-01
KSET_ENVIRONMENT=development
```

## 📚 Tutorial Structure

Each tutorial follows this structure:

### **Learning Objectives**
What you'll learn in the tutorial

### **Prerequisites**
Required knowledge and setup

### **Step-by-Step Guide**
Detailed instructions with code examples

### **Complete Example**
Full working code that you can run

### **Best Practices**
Key takeaways and recommendations

### **Next Steps**
What to learn next

### **Troubleshooting**
Common issues and solutions

## 🛠️ Code Examples

All tutorial code is available in the [KSET Examples Repository](https://github.com/kset/kset-examples). You can:

- **Browse complete examples** for each tutorial
- **Run examples locally** with your own credentials
- **Fork and modify** examples for your own projects
- **Contribute new examples** to help the community

## 📖 Learning Path Recommendation

### **New to Trading?**
Start with the **Beginner Tutorials** in order:
1. Your First Trade → Market Data Basics → Account Management → Order Management → Portfolio Tracking

### **Experienced Developer?**
Skip to **Intermediate Tutorials**:
1. Real-time Data Streaming → Advanced Order Types → Risk Management

### **Quant/Finance Professional?**
Jump to **Advanced Tutorials**:
1. Algorithmic Trading → Quantitative Research → Performance Optimization

## 💡 Pro Tips

### **Start Small**
- Begin with paper trading or small amounts
- Test thoroughly with real market data
- Implement proper error handling before going live

### **Understand Korean Markets**
- Learn Korean market hours and rules
- Understand regulatory requirements
- Know the limitations of each provider

### **Build Incrementally**
- Start with basic features and add complexity
- Test each component thoroughly
- Monitor performance and optimize gradually

### **Join the Community**
- Ask questions in our Discord community
- Share your projects and learn from others
- Contribute back to the KSET ecosystem

## 🔧 Development Tools

### **KSET CLI**
```bash
# Generate a new trading project
npx kset-cli create my-trading-app

# Add a new provider
npx kset-cli add-provider mirae-asset

# Generate provider boilerplate
npx kset-cli generate-provider my-provider
```

### **Testing Framework**
```typescript
import { KSETTestFramework } from 'kset/testing';

const framework = new KSETTestFramework({
  mockProviders: true,
  realisticData: true
});

// Test your trading logic
await framework.testStrategy(myStrategy);
```

### **Development Dashboard**
```typescript
import { KSETDevTools } from 'kset/devtools';

const devTools = new KSETDevTools({
  port: 3001,
  enabled: process.env.NODE_ENV === 'development'
});

await devTools.start();
```

## 📊 Sample Applications

### **Basic Trading Bot**
```typescript
import { KSET } from 'kset';

const kset = new KSET({
  provider: 'kiwoom',
  credentials: { /* ... */ }
});

// Simple moving average crossover strategy
async function movingAverageBot() {
  await kset.connect();

  const shortMA = await getMovingAverage('005930', 10);
  const longMA = await getMovingAverage('005930', 30);

  if (shortMA > longMA) {
    // Buy signal
    await kset.createOrder({
      symbol: '005930',
      side: 'BUY',
      orderType: 'MARKET',
      quantity: 10
    });
  } else if (shortMA < longMA) {
    // Sell signal
    const position = await kset.getPosition('005930');
    if (position && position.quantity > 0) {
      await kset.createOrder({
        symbol: '005930',
        side: 'SELL',
        orderType: 'MARKET',
        quantity: position.quantity
      });
    }
  }
}
```

### **Real-time Dashboard**
```typescript
import React, { useState, useEffect } from 'react';
import { KSET } from 'kset';

function TradingDashboard() {
  const [portfolio, setPortfolio] = useState(null);
  const [marketData, setMarketData] = useState({});

  useEffect(() => {
    const kset = new KSET({ /* ... */ });

    // Subscribe to portfolio updates
    kset.subscribeOrders(async () => {
      const updatedPortfolio = await kset.getPortfolio();
      setPortfolio(updatedPortfolio);
    });

    // Subscribe to market data
    const symbols = ['005930', '000660', '035420'];
    symbols.forEach(symbol => {
      kset.subscribeMarketData(symbol, (data) => {
        setMarketData(prev => ({
          ...prev,
          [symbol]: data
        }));
      });
    });

  }, []);

  return (
    <div>
      <h1>Trading Dashboard</h1>
      {/* Render portfolio and market data */}
    </div>
  );
}
```

## 🔗 Additional Resources

### **Documentation**
- [API Reference](../api/)
- [Getting Started Guide](../guides/getting-started.md)
- [Korean Market Guide](../korean-market/)

### **Community**
- [Discord Community](https://discord.gg/kset)
- [GitHub Discussions](https://github.com/kset/kset/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/kset)

### **Learning**
- [Korean Securities Market](https://english.krx.co.kr/)
- [Financial Markets Courses](https://www.coursera.org/learn/financial-markets)
- [Algorithmic Trading Books](https://github.com/quantopian/research_public)

## 🏆 Tutorial Projects

Build these projects as you progress through the tutorials:

### **Beginner Level**
- **Portfolio Tracker** - Monitor your investments
- **Price Alert System** - Get notified on price movements
- **Simple Trading Bot** - Basic automated trading

### **Intermediate Level**
- **Real-time Dashboard** - Live trading interface
- **Risk Monitor** - Portfolio risk analysis
- **Market Scanner** - Find trading opportunities

### **Advanced Level**
- **Algorithmic Trading Platform** - Full trading system
- **Quantitative Research Tool** - Backtesting and analysis
- **Multi-broker Aggregator** - Trade across multiple brokers

---

**Ready to start?** Begin with [Your First Trade](./basic/first-trade.md) and join thousands of developers building the future of Korean fintech! 🚀