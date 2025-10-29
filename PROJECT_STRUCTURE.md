# KSET Library - Project Structure

This document outlines the optimized project structure of the Korea Stock Exchange Trading Library (KSET), designed for clean distribution and professional use.

## 📁 Core Directory Structure

```
kset/
├── 📄 package.json                 # Library metadata and scripts
├── 📄 README.md                    # Main documentation
├── 📄 LICENSE                      # MIT license
├── 📄 CHANGELOG.md                 # Version history
├── 📄 CONTRIBUTING.md              # Contribution guidelines
├── 📄 CODE_OF_CONDUCT.md           # Community standards
├── 📄 DEPLOYMENT.md                # Deployment instructions
├── 📄 .gitignore                   # Git ignore rules
├── 📄 .dockerignore                # Docker ignore rules
├── 📄 .releaserc.js                # Semantic release configuration
├── 📄 Dockerfile                   # Production Docker image
├── 📄 docker-compose.prod.yml      # Production Docker compose
├── 📄 tsconfig.json                # TypeScript configuration
├── 📄 tsconfig.prod.json           # Production TypeScript config
├── 📄 rollup.config.js             # Bundle configuration
├── 📄 webpack.prod.config.js       # Production webpack config
│
├── 📁 src/                         # Source code
│   ├── 📄 index.ts                 # Main entry point
│   ├── 📁 core/                    # Core KSET functionality
│   ├── 📁 engines/                 # Trading and compliance engines
│   ├── 📁 providers/               # Broker provider implementations
│   ├── 📁 real-time/               # WebSocket and real-time data
│   ├── 📁 research/                # DART integration and analytics
│   ├── 📁 algorithms/              # Trading algorithms
│   ├── 📁 routing/                 # Order routing logic
│   ├── 📁 types/                   # TypeScript type definitions
│   ├── 📁 interfaces/              # Interface definitions
│   ├── 📁 utils/                   # Utility functions
│   ├── 📁 errors/                  # Error handling
│   ├── 📁 cli/                     # Command-line interface
│   ├── 📁 plugins/                 # Plugin system
│   └── 📁 monitoring/              # Performance metrics
│
├── 📁 docs/                        # Documentation
│   ├── 📁 api/                     # API documentation
│   ├── 📁 guides/                  # User guides
│   ├── 📁 tutorials/               # Step-by-step tutorials
│   ├── 📁 korean-market/           # Korean market specifics
│   ├── 📁 developer/               # Development documentation
│   ├── 📁 deployment/              # Deployment guides
│   └── 📁 ko/                      # Korean documentation
│
├── 📁 examples/                    # Usage examples
│   ├── 📄 demo.ts                  # Basic usage example
│   ├── 📄 real-time-demo.ts        # Real-time trading demo
│   ├── 📄 advanced-trading-demo.ts # Advanced features demo
│   └── 📄 research-demo.ts         # Research integration demo
│
├── 📁 tests/                       # Test suite
│   ├── 📁 unit/                    # Unit tests
│   ├── 📁 integration/             # Integration tests
│   ├── 📁 e2e/                     # End-to-end tests
│   ├── 📁 security/                # Security tests
│   ├── 📁 compliance/              # Compliance tests
│   └── 📁 mocks/                   # Test mocks
│
├── 📁 docker/                      # Docker configurations
│   ├── 📄 entrypoint.sh            # Container entry script
│   └── 📄 health-check.sh          # Health check script
│
├── 📁 bin/                         # Executable scripts
│   └── 📄 kset.js                  # CLI entry point
│
├── 📁 sdk/                         # SDK for advanced users
│   ├── 📄 index.ts                 # SDK entry point
│   ├── 📄 client.ts                # Client implementation
│   ├── 📄 types.ts                 # SDK types
│   ├── 📄 decorators.ts            # SDK decorators
│   ├── 📄 middleware.ts            # SDK middleware
│   ├── 📄 devtools.ts              # Development tools
│   └── 📄 monitoring.ts            # SDK monitoring
│
└── 📁 .github/                     # GitHub workflows
    └── 📁 workflows/               # CI/CD pipelines
```

## 🎯 Library Components

### Core Features (`src/core/`)
- **KSET.ts**: Main library class with unified API
- Core functionality for trading operations

### Trading Engines (`src/engines/`)
- **KoreanMarketEngine.ts**: Korean market-specific trading logic
- **KoreanComplianceEngine.ts**: Financial regulations compliance

### Provider System (`src/providers/`)
- **KiwoomProvider.ts**: Kiwoom Securities integration
- **KoreaInvestmentProvider.ts**: Korea Investment & Securities integration
- **registry/ProviderRegistry.ts**: Provider management system

### Real-time Data (`src/real-time/`)
- **WebSocketManager.ts**: WebSocket connection management
- **KiwoomWebSocketProvider.ts**: Kiwoom real-time data
- **KoreaInvestmentWebSocketProvider.ts**: Korea Investment real-time data

### Research & Analytics (`src/research/`)
- **DARTIntegration.ts**: DART (DART) system integration
- **AnalyticsEngine.ts**: Market analytics and insights

### Algorithmic Trading (`src/algorithms/`)
- **AlgorithmEngine.ts**: Trading algorithm framework

### Order Management (`src/routing/`)
- **OrderRouter.ts**: Intelligent order routing

## 🚀 Build System

### TypeScript Configuration
- **tsconfig.json**: Development TypeScript settings
- **tsconfig.prod.json**: Production-optimized settings

### Bundling
- **rollup.config.js**: Library bundling for distribution
- **webpack.prod.config.js**: Browser bundle configuration

### Docker Support
- **Dockerfile**: Production-ready container image
- **docker-compose.prod.yml**: Production deployment
- **.dockerignore**: Clean Docker builds

## 🧪 Testing Strategy

### Test Categories
- **Unit Tests**: Individual component testing
- **Integration Tests**: Component interaction testing
- **End-to-End Tests**: Complete workflow testing
- **Security Tests**: Vulnerability and penetration testing
- **Compliance Tests**: Korean financial regulations testing

### Test Execution
```bash
npm test                # Run all tests
npm run test:watch      # Watch mode for development
npm run test:coverage   # Coverage reporting
npm run test:e2e        # End-to-end testing
```

## 📚 Documentation Structure (100% 완벽한 문서화)

KSET는 모든 개발자가 혼동 없이 학습할 수 있도록 4,000+ 라인의 완벽한 문서를 제공합니다.

### 📘 Korean Documentation (`docs/ko/`) - 핵심 문서

#### **API_REFERENCE.md** (1,013 lines) ⭐
**목적**: 모든 KSET 메서드 100% 완벽 문서화
- ✅ **전체 메서드 시그니처** - TypeScript 타입 포함
- ✅ **상세한 파라미터** - 모든 매개변수 타입, 설명, 제약 조건
- ✅ **완벽한 반환값** - 전체 인터페이스 정의
- ✅ **예외 처리** - 30+ ERROR_CODES 및 처리 방법
- ✅ **실전 예제** - 30+ 메서드별 사용 예제

**주요 섹션**:
- 핵심 라이프사이클 (initialize, authenticate, disconnect, getHealthStatus)
- 시장 데이터 API (getMarketData, getHistoricalData, getOrderBook)
- 트레이딩 API (placeOrder, modifyOrder, cancelOrder, getOrder, getOrders)
- 계좌 API (getAccountInfo, getBalance, getPositions)
- 실시간 API (subscribeToRealTimeData, subscribeToOrderUpdates)
- 리서치 API (getCompanyInfo, getDisclosures, getResearch)
- 완벽한 에러 핸들링 문서

#### **TYPES_REFERENCE.md** (830 lines) 📘
**목적**: 모든 TypeScript 타입 완벽 문서화
- ✅ **Enum 타입** - MarketType, OrderType, OrderSide, TimeInForce, OrderStatus, MarketStatus
- ✅ **인터페이스 정의** - Symbol, MarketData, HistoricalData, OrderBook, Order, Position, Balance
- ✅ **필드별 상세 설명** - 각 인터페이스 필드의 목적과 사용법
- ✅ **타입 안전 예제** - 올바른 타입 사용 패턴

**주요 섹션**:
- 기본 타입 (MarketType, OrderType, OrderSide, TimeInForce)
- 상태 타입 (OrderStatus, MarketStatus)
- 시장 데이터 인터페이스 (Symbol, MarketData, HistoricalData, OrderBook)
- 트레이딩 인터페이스 (Order, Position, Balance)
- 기업 정보 인터페이스 (CompanyInfo, FinancialData, ResearchReport)

#### **COMPLETE_EXAMPLES.md** (2,542 lines) 🎓
**목적**: 초급부터 전문가까지 단계별 완벽한 학습 가이드
- ✅ **10+ 완벽한 예제** - 모든 난이도 커버
- ✅ **실행 가능한 코드** - 즉시 사용 가능한 전체 코드
- ✅ **상세한 주석** - 한국어로 모든 단계 설명
- ✅ **실전 시나리오** - 실제 트레이딩 환경의 사용 사례

**난이도별 예제**:
1. **초급 (Beginner)**
   - 첫 KSET 연결 및 시장 데이터 조회
   - 계좌 정보 및 잔고 확인

2. **중급 (Intermediate)**
   - 다양한 주문 유형 (시장가, 지정가, OCO)
   - 실시간 데이터 구독 및 처리

3. **고급 (Advanced)**
   - TWAP 알고리즘 트레이딩
   - 스마트 주문 라우팅

4. **전문가 (Expert)**
   - 완벽한 포트폴리오 관리 시스템
   - 자동 리밸런싱 및 리스크 관리

5. **에러 처리 (Error Handling)**
   - 포괄적인 에러 처리 패턴
   - 재시도 로직 및 폴백 전략

6. **테스트 (Testing)**
   - 단위 테스트 및 통합 테스트 예제
   - Mocking 패턴

7. **프로덕션 (Production)**
   - 프로덕션 환경 설정
   - 헬스 체크 및 모니터링
   - 정상 종료 (Graceful Shutdown)

#### **README.md** (Enhanced)
메인 README에서 모든 문서로 명확한 안내
- 📚 100% 완벽한 문서화 강조
- 🔍 핵심 문서 섹션 추가
- 💡 예제 모음 안내 박스 추가
- 🌐 온라인 리소스 구분

### API Documentation (`docs/api/`)
- Comprehensive API reference (영문)
- Method signatures and examples
- Type definitions

### User Guides (`docs/guides/`)
- Getting started tutorials
- Best practices
- Common use cases

### Korean Market (`docs/korean-market/`)
- Market-specific information
- Trading hours and holidays
- Regulations overview

### Developer Resources (`docs/developer/`)
- Plugin development
- Extension guidelines
- Contributing to KSET

## 🔧 Development Tools Removed

For clean distribution, the following development-only items have been removed:

### Removed Directories
- `.claude/` - Development environment configuration
- `exchange_api_docs/` - Raw API documentation files
- `testing/` - Development testing framework
- `monitoring/` - Development monitoring setup
- `config/environments/` - Environment-specific configs
- `scripts/` - Development and build scripts

### Removed Files
- `bundlesize.config.json` - Bundle size monitoring
- `tsconfig.browser.json` - Browser-specific dev config
- `docker-compose.dev.yml` - Development Docker compose
- `webpack.config.js` - Development webpack config

## 🎯 Focus: Korean Stock Exchange Trading

KSET is specifically designed for the Korean stock market with:

### Korean Broker Support
- Kiwoom Securities
- Korea Investment & Securities
- Extensible for other Korean brokers

### Compliance Features
- Korean financial regulations
- Real-time compliance checking
- Audit trail support

### Market-Specific Features
- Korean trading hours
- Market holidays
- Local market conventions
- Korean language support

### Real-time Capabilities
- WebSocket connections
- Live market data
- Real-time order status

## 📦 Distribution Ready

This optimized structure ensures:
- ✅ Clean production builds
- ✅ Minimal bundle size
- ✅ Professional appearance
- ✅ Easy installation and use
- ✅ Comprehensive documentation
- ✅ Full test coverage
- ✅ Docker deployment support
- ✅ Korean market expertise

## 🔄 Continuous Integration

The library includes automated:
- **Build validation**: TypeScript compilation and linting
- **Test execution**: Full test suite on all changes
- **Security scanning**: Vulnerability detection
- **Bundle analysis**: Size monitoring
- **Documentation generation**: Auto-generated API docs
- **Release automation**: Semantic versioning and publishing

---

**KSET (Korea Stock Exchange Trading Library)** - Professional-grade trading library for Korean securities markets.