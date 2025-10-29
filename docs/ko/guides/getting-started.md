# KSET 시작 가이드

KSET(Korea Stock Exchange Trading Library)을 시작하는 방법을 안내하는 가이드입니다. 이 가이드를 통해 한국 증권 거래 라이브러리를 쉽게 설정하고 사용할 수 있습니다.

## 📋 사전 준비 사항

시작하기 전에 다음이 필요합니다:

- **Node.js** 16.0 이상
- **npm** 또는 **yarn** 패키지 매니저
- **TypeScript** 4.5+ (타입 안정성을 위해 권장)
- 지원되는 국내 증권사 계좌
- 국내 증권사용 거래 인증서 (공인인증서)

## 🚀 설치

### npm 사용
```bash
npm install kset
```

### yarn 사용
```bash
yarn add kset
```

### pnpm 사용
```bash
pnpm add kset
```

## 🔧 기본 설정

### 1. KSET 가져오기
```typescript
import { KSET } from 'kset';
// CommonJS 사용 시
const { KSET } = require('kset');
```

### 2. 제공업체 설정
KSET은 여러 국내 증권사를 지원합니다. 가장 인기 있는 제공업체 설정 방법:

#### 키움증권
```typescript
const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom_cert.pfx',
    certificatePassword: 'your_certificate_password',
    accountNumber: '12345678-01' // 키움 계좌번호
  },
  environment: 'production' // 또는 'development'
});
```

#### 한국투자증권
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

### 3. 제공업체 연결
```typescript
async function initializeTrading() {
  try {
    // 제공업체에 연결
    await kset.connect();
    console.log('✅ 제공업체에 성공적으로 연결되었습니다');

    // 계좌 정보 가져오기
    const accounts = await kset.getAccounts();
    console.log('사용 가능한 계좌:', accounts);

  } catch (error) {
    console.error('❌ 연결 실패:', error.message);
  }
}

initializeTrading();
```

## 📊 첫 거래: 시장 데이터 가져오기

```typescript
async function getMarketData() {
  try {
    // 삼성전자 (005930) 시장 데이터 가져오기
    const samsungData = await kset.getMarketData('005930');

    console.log('삼성전자 시장 데이터:');
    console.log(`현재가: ${samsungData.currentPrice.toLocaleString()}원`);
    console.log(`전일대비: ${samsungData.changeAmount > 0 ? '+' : ''}${samsungData.changeRate.toFixed(2)}%`);
    console.log(`거래량: ${samsungData.volume.toLocaleString()}주`);
    console.log(`시가총액: ${Math.round(samsungData.marketCap / 1e12)}조원`);

  } catch (error) {
    console.error('❌ 시장 데이터 가져오기 실패:', error.message);
  }
}

getMarketData();
```

## 🛒 첫 거래: 주문하기

```typescript
async function placeFirstOrder() {
  try {
    // 삼성전자 지정가 매수 주문
    const order = await kset.createOrder({
      symbol: '005930', // 삼성전자
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 10, // 10주
      price: 80000, // 주당 80,000원
      clientOrderId: 'my-first-order-001' // 선택적 클라이언트 주문 ID
    });

    console.log('✅ 주문 성공적으로 체결:');
    console.log(`주문 ID: ${order.id}`);
    console.log(`상태: ${order.status}`);
    console.log(`수량: ${order.quantity}주`);
    console.log(`가격: ${order.price?.toLocaleString()}원`);

    // 주문 상태 모니터링
    const updatedOrder = await kset.getOrder(order.id);
    console.log('업데이트된 상태:', updatedOrder.status);

  } catch (error) {
    console.error('❌ 주문 실패:', error.message);

    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.log('💡 팁: 계좌 잔고를 확인하세요');
    } else if (error.code === 'MARKET_CLOSED') {
      console.log('💡 팁: 현재 장이 종료되었습니다');
    }
  }
}

placeFirstOrder();
```

## 📈 실시간 시장 데이터

```typescript
async function subscribeToMarketData() {
  try {
    // 삼성전자 실시간 데이터 구독
    const subscription = await kset.subscribeMarketData('005930', (data) => {
      console.log('📊 실시간 업데이트:');
      console.log(`가격: ${data.currentPrice.toLocaleString()}원`);
      console.log(`변동: ${data.changeRate.toFixed(2)}%`);
      console.log(`거래량: ${data.volume.toLocaleString()}주`);
      console.log(`시간: ${new Date(data.timestamp).toLocaleTimeString()}`);
    });

    console.log('✅ 실시간 데이터 구독 완료');

    // 60초 후 구독 해지
    setTimeout(async () => {
      await subscription.unsubscribe();
      console.log('🔇 실시간 데이터 구독 해지');
    }, 60000);

  } catch (error) {
    console.error('❌ 구독 실패:', error.message);
  }
}

subscribeToMarketData();
```

## 💼 포트폴리오 관리

```typescript
async function getPortfolioInfo() {
  try {
    // 계좌 잔고 가져오기
    const balance = await kset.getBalance();
    console.log('💰 계좌 잔고:');
    console.log(`예수금: ${balance.cash.toLocaleString()}원`);
    console.log(`주문 가능 금액: ${balance.orderable.toLocaleString()}원`);
    console.log(`총평가 금액: ${balance.totalIncludingMargin.toLocaleString()}원`);

    // 현재 보유 포지션 가져오기
    const positions = await kset.getPositions();
    console.log('\n📊 현재 보유 종목:');

    positions.forEach(position => {
      console.log(`${position.name} (${position.symbol})`);
      console.log(`  보유 수량: ${position.quantity}주`);
      console.log(`  평균 단가: ${position.averagePrice.toLocaleString()}원`);
      console.log(`  현재가: ${position.currentPrice.toLocaleString()}원`);
      console.log(`  평가 손익: ${position.unrealizedPnL.toLocaleString()}원 (${position.unrealizedPnLRate.toFixed(2)}%)`);
    });

    // 포트폴리오 요약 가져오기
    const portfolio = await kset.getPortfolio();
    console.log('\n📈 포트폴리오 요약:');
    console.log(`총 평가금액: ${portfolio.totalValue.toLocaleString()}원`);
    console.log(`일일 손익: ${portfolio.dailyPnL.toLocaleString()}원 (${portfolio.dailyPnLRate.toFixed(2)}%)`);
    console.log(`총 미실현 손익: ${portfolio.totalUnrealizedPnL.toLocaleString()}원`);

  } catch (error) {
    console.error('❌ 포트폴리오 정보 가져오기 실패:', error.message);
  }
}

getPortfolioInfo();
```

## 🔍 오류 처리

KSET은 특정 오류 유형을 포함한 포괄적인 오류 처리를 제공합니다:

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
      console.log('🔐 인증 실패. 자격 증명을 확인하세요.');
    } else if (error instanceof MarketClosedError) {
      console.log('🕐 장이 종료되었습니다. 거래 시간: 09:00-15:30 KST');
    } else if (error instanceof InsufficientFundsError) {
      console.log('💸 잔고 부족. 계좌 잔고를 확인하세요.');
    } else if (error instanceof RateLimitError) {
      console.log('⏱️ 요청 한도 초과. 잠시 후 다시 시도하세요.');
    } else if (error instanceof KSETError) {
      console.log(`❌ KSET 오류 [${error.code}]: ${error.message}`);
    } else {
      console.log('❌ 알 수 없는 오류:', error.message);
    }
  }
}

handleErrors();
```

## 🎛️ 설정 옵션

KSET은 동작을 사용자 정의할 수 있는 다양한 설정 옵션을 제공합니다:

```typescript
const kset = new KSET({
  // 제공업체 설정
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/kiwoom_cert.pfx',
    certificatePassword: 'your_password',
    accountNumber: '12345678-01'
  },

  // 환경
  environment: 'production', // 'production' | 'development' | 'staging'

  // 로깅
  logLevel: 'info', // 'error' | 'warn' | 'info' | 'debug'

  // 연결 설정
  connection: {
    timeout: 30000, // 30초
    retryAttempts: 3,
    retryDelay: 1000 // 1초
  },

  // 속도 제한
  rateLimit: {
    enabled: true,
    maxRequests: 100,
    windowMs: 60000 // 1분
  },

  // 캐싱
  cache: {
    enabled: true,
    ttl: 300000 // 5분
  },

  // 실시간 설정
  realTime: {
    reconnectAttempts: 5,
    reconnectDelay: 5000 // 5초
  }
});
```

## 🧪 개발 및 테스트

### 모의 제공업체로 테스트
```typescript
import { KSETMockProvider } from 'kset/testing';

// 개발/테스트를 위해 모의 제공업체 사용
const kset = new KSET({
  provider: 'mock',
  mockData: {
    symbols: ['005930', '000660', '035420'],
    defaultBalance: 100000000, // 1억원
    marketData: {
      '005930': { price: 80000, change: 1.2 }
    }
  }
});
```

### 개발 모드
```typescript
const kset = new KSET({
  provider: 'kiwoom',
  credentials: { /* ... */ },
  environment: 'development',
  debug: true // 디버그 로깅 활성화
});
```

## 📚 다음 단계

이제 KSET 설정이 완료되었으므로 다음 주제를 탐색해 보세요:

1. **[고급 거래 패턴](../tutorials/advanced-trading.md)** - 복잡한 주문 유형 학습
2. **[실시간 데이터 스트리밍](../tutorials/real-time-streaming.md)** - WebSocket 연결
3. **[알고리즘 트레이딩](../tutorials/algorithmic-trading.md)** - 자동화된 거래 전략
4. **[리서치 및 분석](../tutorials/research-analytics.md)** - DART 통합 및 분석
5. **[한국 시장 가이드](../korean-market/overview.md)** - 한국 시장 이해

## 🆆 문제 해결

### 일반적인 문제

**인증서를 찾을 수 없음**
```
Error: ENOENT: no such file or directory, open './certs/kiwoom_cert.pfx'
```
해결책: 인증서 파일이 존재하고 경로가 올바른지 확인하세요.

**인증 실패**
```
Error: Authentication failed: Invalid certificate password
```
해결책: 인증서 비밀번호가 올바른지 확인하세요.

**장 종료**
```
Error: Market is currently closed
```
해결책: 한국 시장 시간(09:00-15:30 KST, 평일)을 확인하세요.

**요청 한도 초과**
```
Error: Rate limit exceeded. Please wait before making another request.
```
해결책: 애플리케이션에 적절한 속도 제한을 구현하세요.

### 도움 받기

- **문서**: [전체 API 참조](../api/)
- **예제**: [코드 예제](../tutorials/examples/)
- **GitHub Issues**: [문제 보고](https://github.com/kset/kset/issues)
- **디스코드 커뮤니티**: [커뮤니티 참여](https://discord.gg/kset)

## 🎯 한국 시장 특화 팁

### **거래 시간**
- **오전 장**: 09:00-12:00 (외국인 매매 활발)
- **점심시간**: 12:00-13:00 (거래 중단)
- **오후 장**: 13:00-15:30 (기관 매매 집중)
- **장 전/장 후**: 동시호가 시간 (변동성 큼)

### **시장 구분**
- **KOSPI**: 대형주, 안정적 투자 적합
- **KOSDAQ**: 중소형주, 성장주 투자 적합
- **ETF/ETN**: 분산투자 및 위험 헷징

### **수수료 및 세금**
- **거래수수료**: 보통 0.015%~0.05%
- **증권거래세**: 매도차익의 0.25%
- **과세표준**: 연 250만원 초과 시 과세

---

🎉 **축하합니다!** KSET 설정을 완료하고 한국 증권 거래의 첫 단계를 밟으셨습니다. 한국 핀테크의 미래를 만들어나가세요! 🚀