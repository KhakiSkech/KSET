# KSET Documentation

**Korea Stock Exchange Trading Library** - Korea's Standard Trading Interface

Welcome to the comprehensive documentation for KSET, the premier TypeScript/JavaScript library for Korean securities trading. This documentation provides everything you need to integrate, develop, and deploy trading applications for the Korean financial markets.

## 🚀 Quick Start

```bash
npm install kset
```

```typescript
import { KSET } from 'kset';

// Initialize KSET with your preferred provider
const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/your_cert.pfx',
    certificatePassword: 'your_password',
    accountNumber: 'your_account_number'
  }
});

// Start trading
await kset.connect();
const samsung = await kset.getMarketData('005930'); // Samsung Electronics
console.log(`Current Price: ${samsung.currentPrice}`);
```

## 📚 Documentation Structure

### **[Getting Started](guides/getting-started.md)**
- Installation and setup
- Basic configuration
- First trade tutorial
- Architecture overview

### **[API Reference](api/)**
- Complete API documentation
- TypeScript definitions
- Method signatures
- Usage examples

### **[Tutorials](tutorials/)**
- Basic trading operations
- Real-time data streaming
- Algorithmic trading
- Research and analytics

### **[Korean Market Guide](korean-market/)**
- Market structure overview
- Trading sessions and hours
- Regulatory compliance
- Local broker integration

### **[Developer Resources](developer/)**
- Plugin development
- Provider implementation
- Migration guides
- Performance optimization

### **[Deployment Guide](deployment/)**
- Production setup
- Security best practices
- Monitoring and maintenance
- Scaling strategies

### **[한국어 문서](ko/)**
- 한국어 사용 가이드
- 국내 증권사 연동
- 규제 준수 가이드
- 지원 및 문의

## 🎯 Key Features

- **Unified Interface**: Single API for multiple Korean brokers
- **Real-time Data**: WebSocket streaming for market data and orders
- **Type-safe**: Full TypeScript support with comprehensive type definitions
- **Compliance Built-in**: Korean market regulations and trading rules
- **Algorithmic Trading**: Advanced order routing and execution algorithms
- **Research Integration**: DART disclosures and financial analytics
- **Extensible**: Plugin system for custom providers and strategies

## 🏛️ Supported Markets

- **KOSPI**: Korea Composite Stock Price Index
- **KOSDAQ**: Korean Securities Dealers Automated Quotations
- **KONEX**: Korea New Exchange
- **KRX-ETF**: Exchange Traded Funds
- **KRX-ETN**: Exchange Traded Notes

## 🤝 Supported Providers

- **Kiwoom Securities** (키움증권)
- **Korea Investment & Securities** (한국투자증권)
- **Mirae Asset Securities** (미래에셋증권)
- **Samsung Securities** (삼성증권)
- And more...

## 🛡️ Security & Compliance

- FSC (Financial Services Commission) compliant
- TLS encryption for all communications
- Certificate-based authentication
- Rate limiting and throttling
- Audit logging and monitoring

## 📞 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/kset/kset/issues)
- **Discord Community**: [Join our developer community](https://discord.gg/kset)
- **Email Support**: support@kset.dev
- **Documentation**: docs@kset.dev

## 📄 License

MIT License - see [LICENSE](https://github.com/kset/kset/blob/main/LICENSE) file for details.

---

**KSET** - Empowering developers to build the future of Korean financial technology. 🇰🇷