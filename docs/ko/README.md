# KSET: 한국 주식 거래 라이브러리

[![npm version](https://badge.fury.io/js/kset.svg)](https://badge.fury.io/js/kset)
[![Build Status](https://github.com/kset/kset/workflows/CI/badge.svg)](https://github.com/kset/kset/actions)
[![Coverage Status](https://coveralls.io/repos/github/kset/kset/badge.svg?branch=main)](https://coveralls.io/github.com/kset/kset?branch=main)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2+-blue.svg)](https://www.typescriptlang.org/)
[![Downloads](https://img.shields.io/npm/dm/kset.svg)](https://www.npmjs.com/package/kset)

> **KSET (Korea Stock Exchange Trading Library)** - 한국의 표준 증권 거래 인터페이스
> _Korea's Standard Trading Interface for Unified Access to Korean Securities Markets_

🌟 **KSET**는 한국의 모든 증권사 API를 통합하여 하나의 표준화된 인터페이스로 제공하는 차세대 트레이딩 라이브러리입니다. TypeScript로 개발되어 완벽한 타입 안정성을 제공하며, 복잡한 각 증권사 API의 차이점을 추상화하여 일관된 개발 경험을 제공합니다.

## ✨ 주요 특징

### 🏢 **전국가적 지원**
- **키움증권 (Kiwoom)** - OpenAPI+ 전체 지원
- **한국투자증권 (Korea Investment)** - KIS API 전체 지원
- **확장 가능한 아키텍처** - 새로운 증권사 쉽게 추가 가능

### ⚡ **고성능 실시간 처리**
- **WebSocket 기반 실시간 데이터** - 주가, 호가, 체결 데이터 스트리밍
- **저지연 처리** - 1ms 미만의 데이터 처리 속도
- **대용량 틱 데이터** - 하루 수천만 건의 틱 데이터 처리 가능

### 🛡️ **기관급 안정성**
- **완벽한 에러 핸들링** - 모든 예외 상황에 대응
- **자동 재연결** - 네트워크 장애 시 자동 복구
- **규제 준수** - 금융감독원 규정 완벽 준수

### 🎯 **알고리즘 트레이딩**
- **고급 주문 라우팅** - 최적의 체결 조건 탐색
- **알고리즘 지원** - TWAP, VWAP, POV 알고리즘 내장
- **리스크 관리** - 실시간 포지션 및 손실 관리

### 🔬 **데이터 리서치**
- **DART 연동** - 금융감독원 전자공시 자동 수집
- **재무 분석** - 표준화된 재무제표 API
- **시장 분석** - 실시간 시장 지표 및 통계

## 🚀 빠른 시작

### 설치

```bash
# npm
npm install kset

# yarn
yarn add kset

# pnpm
pnpm add kset
```

### 기본 사용법

```typescript
import { KSET } from 'kset';

// KSET 인스턴스 생성
const kset = new KSET();

// 키움증권 Provider로 연결
await kset.connect('kiwoom', {
  id: 'your_id',
  password: 'your_password',
  certPassword: 'your_cert_password' // 실전 투자용
});

// 실시간 데이터 구독
const subscription = await kset.subscribeRealtime({
  symbol: '005930', // 삼성전자
  onTick: (tick) => {
    console.log(`가격: ${tick.price} / 시간: ${tick.time}`);
  }
});

// 주문 실행
const orderResult = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'market',
  quantity: 10,
  price: 85000
});

console.log('주문 결과:', orderResult);
```

## 📖 API 레퍼런스

### 핵심 클래스

#### **KSET 메인 클래스**
```typescript
import { KSET } from 'kset';

const kset = new KSET({
  logLevel: 'info',
  timeout: 30000
});

// Provider 연결
await kset.connect('kiwoom', credentials);
```

#### **Provider 연결**
```typescript
// 개별 Provider 연결
const kiwoom = await kset.createProvider('kiwoom', {
  credentials: {
    id: 'your_id',
    password: 'your_password',
    certPassword: 'your_cert_password'
  },
  environment: 'development'
});

// 한국투자증권 연결
const koreaInvestment = await kset.createProvider('korea-investment', {
  credentials: {
    apiKey: 'your_api_key',
    secret: 'your_secret',
    accountNumber: 'your_account'
  }
});
```

### 시장 데이터 API

#### **실시간 시세 조회**
```typescript
// 단일 종목 조회
const marketData = await kset.getMarketData(['005930']);

// 다중 종목 조회
const symbols = ['005930', '000660', '035420'];
const marketDataList = await kset.getMarketData(symbols);

console.log(marketDataList[0]); // 삼성전자 시세 정보
```

#### **과거 데이터 조회**
```typescript
// 일봉 데이터
const dailyData = await kset.getHistoricalData('005930', {
  period: 'daily',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  adjusted: true
});

// 분봉 데이터
const minuteData = await kset.getHistoricalData('005930', {
  period: 'minute',
  count: 100
});

// 틱 데이터
const tickData = await kset.getHistoricalData('005930', {
  period: 'tick',
  count: 1000
});
```

### 거래 API

#### **주문 실행**
```typescript
// 시장가 주문
const marketOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'market',
  quantity: 10
});

// 지정가 주문
const limitOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'limit',
  quantity: 10,
  price: 85000
});

// 최유리 지정가 주문
const bestOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'best',
  quantity: 10
});

// 스탑 주문
const stopOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'sell',
  orderType: 'stop',
  quantity: 10,
  stopPrice: 83000
});

// 조건부 주문 (OCO)
const ocoOrder = await kset.placeOrder({
  symbol: '005930',
  side: 'sell',
  orderType: 'oco',
  quantity: 10,
  price: 87000,    // 목표가
  stopPrice: 83000 // 손절가
});
```

#### **주문 관리**
```typescript
// 주문 수정
const modifiedOrder = await kset.modifyOrder(orderId, {
  price: 86000,
  quantity: 15
});

// 주문 취소
const cancelledOrder = await kset.cancelOrder(orderId);

// 주문 상태 조회
const orderStatus = await kset.getOrderStatus(orderId);

// 주문 내역 조회
const orderHistory = await kset.getOrderHistory({
  symbol: '005930',
  startDate: '2024-01-01',
  endDate: '2024-12-31'
});
```

### 계좌 정보 API

#### **계좌 정보 조회**
```typescript
// 전체 계좌 정보
const accountInfo = await kset.getAccountInfo();
console.log('계좌번호:', accountInfo.accountNumber);
console.log('예수금:', accountInfo.deposit);
console.log('인출가능금액:', accountInfo.withdrawable);

// 잔고 정보
const balance = await kset.getBalance();
console.log('현금잔고:', balance.cash);
console.log('총평가액:', balance.totalEvaluationPrice);
console.log('총손익:', balance.totalProfitLoss);
```

#### **포지션 정보**
```typescript
// 전체 포지션
const positions = await kset.getPositions();

// 특정 종목 포지션
const samsungPosition = await kset.getPositions('005930');

console.log('보유수량:', samsungPosition.quantity);
console.log('매입단가:', samsungPosition.averagePrice);
console.log('현재가:', samsungPosition.currentPrice);
console.log('평가손익:', samsungPosition.profitLoss);
console.log('수익률:', samsungPosition.profitLossRate);
```

### 실시간 데이터 API

#### **실시간 시세 구독**
```typescript
const subscription = await kset.subscribeToRealTimeData('kiwoom', ['005930'], (data) => {
  console.log(`삼성전자: ${data.currentPrice}원 (${data.changeRate > 0 ? '+' : ''}${data.changeRate}%)`);
  console.log(`거래량: ${data.volume}주`);
  console.log(`거래대금: ${data.totalValue.toLocaleString()}원`);
});

// 구독 해제
await subscription.unsubscribe();
```

#### **실시간 호가 정보**
```typescript
const orderBookSubscription = await kset.subscribeToOrderBook('kiwoom', ['005930'], (orderBook) => {
  console.log('매도 호가:', orderBook.asks.slice(0, 5));
  console.log('매수 호가:', orderBook.bids.slice(0, 5));
});
```

### 리서치 API

#### **기업 정보 검색**
```typescript
// 기업명으로 검색
const companies = await kset.searchCompany('삼성전자', {
  limit: 10
});

// 종목코드로 검색
const companyInfo = await kset.getCompanyInfo('005930');
console.log('회사명:', companyInfo.name);
console.log('시장구분:', companyInfo.market);
console.log('업종:', companyInfo.sector);
console.log('상장일:', companyInfo.listingDate);
```

#### **재무 정보**
```typescript
// 연간 재무 정보
const annualFinancials = await kset.getFinancialData('005930', 'annual');

// 분기별 재무 정보
const quarterlyFinancials = await kset.getFinancialData('005930', 'quarterly');

// 최신 재무 정보
financials.forEach((data) => {
  console.log(`${data.year} Q${data.quarter}`);
  console.log(`매출액: ${data.revenue?.toLocaleString()}원`);
  console.log(`영업이익: ${data.operatingIncome?.toLocaleString()}원`);
  console.log(`당기순이익: ${data.netIncome?.toLocaleString()}원`);
  console.log(`EPS: ${data.eps?.toLocaleString()}원`);
});
```

#### **DART 공시 정보**
```typescript
// DART 공시 검색
const disclosures = await kset.searchDARTDisclosures({
  corporationCode: '00126380', // 삼성전자 고유번호
  startDate: '20240101',
  endDate: '20241231',
  disclosureTypes: ['A001', 'A002'] // 사업보고서, 분기보고서
});

disclosures.forEach((disclosure) => {
  console.log('공시명:', disclosure.reportName);
  console.log('접수일:', disclosure.receiptDate);
  console.log('URL:', disclosure.url);
});

// 공시 상세 정보
const detail = await kset.getDisclosureDetail(disclosure.receiptNo);
console.log('상세 내용:', detail.summary);
```

## 🤖 알고리즘 트레이딩

### TWAP (Time Weighted Average Price)
```typescript
const twapOrder = await kset.executeTWAP('kiwoom', {
  symbol: '005930',
  side: 'buy',
  totalQuantity: 1000,
  startTime: new Date(),
  endTime: new Date(Date.now() + 30 * 60 * 1000), // 30분 후
  intervalSeconds: 60, // 1분 간격
  sliceCount: 30,
  callbacks: {
    onOrderPlaced: (order) => {
      console.log(`TWAP 주문: ${order.quantity}주 @ ${order.price}원`);
    },
    onProgressUpdate: (instance) => {
      console.log(`진행률: ${(instance.currentProgress * 100).toFixed(1)}%`);
    },
    onComplete: (result) => {
      console.log(`TWAP 완료: 평균가 ${result.averagePrice}원, 슬리피지 ${result.slippage.toFixed(3)}%`);
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
  endTime: new Date(Date.now() + 20 * 60 * 1000), // 20분 후
  lookbackPeriod: 30, // 30분 과거 데이터
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
  endTime: new Date(Date.now() + 15 * 60 * 1000), // 15분 후
  targetParticipationRate: 10, // 목표 10% 참여율
  minParticipationRate: 5,    // 최소 5%
  maxParticipationRate: 20,    // 최대 20%
});
```

### 알고리즘 제어
```typescript
// 알고리즘 상태 조회
const instances = await kset.getAlgorithmStatus();
instances.forEach((instance) => {
  console.log(`ID: ${instance.id}, 타입: ${instance.type}, 상태: ${instance.status}`);
});

// 알고리즘 제어
await kset.controlAlgorithm(twapOrder.id, 'pause');   // 일시정지
await kset.controlAlgorithm(twapOrder.id, 'resume');  // 재개
await kset.controlAlgorithm(twapOrder.id, 'cancel');  // 취소
```

## 🎯 스마트 오더 라우팅

### 다중 전략 지원
```typescript
// 최적 가격 라우팅
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

console.log('선택된 Provider:', bestPriceRouting.selectedProviders);
console.log('예상 가격:', bestPriceRouting.expectedPrice);
console.log('할당량:', bestPriceRouting.allocatedQuantities);

// 최고 속도 라우팅
const fastestRouting = await kset.routeOrder({
  symbol: '000660',
  side: 'sell',
  orderType: 'market',
  quantity: 50
}, {
  strategy: 'fastest-execution',
  maxLatency: 500
});

// 대형 주문 분할 라우팅
const largeOrder = await kset.routeOrder({
  symbol: '005930',
  side: 'buy',
  orderType: 'limit',
  quantity: 1000, // 1000주 대형 주문
  price: 84900
}, {
  strategy: 'balanced',
  enableSplitOrders: true,
  maxSplitProviders: 3
});
```

## 🇰🇷 한국 시장 특화 기능

### KRX 시장 타입
```typescript
// 지원 시장 타입
const marketTypes = ['KOSPI', 'KOSDAQ', 'KONEX', 'KRX-ETF', 'KRX-ETN'];

// 시장별 거래
const kospiStock = await kset.getMarketData(['005930']); // KOSPI
const kosdaqStock = await kset.getMarketData(['068270']); // KOSDAQ
const etf = await kset.getMarketData(['069500']);   // KRX-ETF
```

### 거래 시간 관리
```typescript
// 시장 상태 확인
const marketStatus = await kset.getMarketStatus('KOSPI');
console.log('시장 상태:', marketStatus);
// 'pre-market' | 'regular' | 'lunch-break' | 'after-hours' | 'closed' | 'holiday'

// 시장 정보
const marketInfo = await kset.getMarketInfo('KOSPI');
console.log('영업시간:', marketInfo.openingTime, '~', marketInfo.closingTime);
console.log('점심시간:', marketInfo.lunchBreakStart, '~', marketInfo.lunchBreakEnd);
console.log('거래단위:', marketInfo.tickSize);
```

### 휴장일 관리
```typescript
// 2024년 휴장일 정보
const holidays = await kset.getMarketHolidays(2024);
holidays.forEach((holiday) => {
  console.log(`${holiday.date}: ${holiday.name} (${holiday.type})`);
});

// 특정 월 휴장일
const marchHolidays = await kset.getMarketHolidays(2024, 3);
```

### 규제 준수
```typescript
// 외국인 투자 제한 확인
const complianceCheck = await kset.checkCompliance({
  symbol: '005930',
  orderSide: 'buy',
  quantity: 100,
  investorType: 'foreign',
  currentHoldings: 1000000,
  totalShares: 100000000
});

if (!complianceCheck.compliant) {
  console.log('규제 위반:', complianceCheck.reason);
}

// 세금 계산
const taxCalculation = await kset.calculateTax({
  symbol: '005930',
  sellValue: 1000000,
  market: 'KOSPI',
  isPreferred: false,
  holdingPeriod: 'short', // 'short' | 'long'
});

console.log('증권거래세:', taxCalculation.securitiesTransactionTax);
console.log('양도소득세:', taxCalculation.capitalGainsTax);
console.log('총 납부세액:', taxCalculation.totalTax);
```

## 🛡️ 에러 처리

### 에러 타입
```typescript
import { KSETError, ERROR_CODES } from 'kset';

try {
  const order = await kset.placeOrder(orderRequest);
} catch (error) {
  if (error instanceof KSETError) {
    switch (error.code) {
      case ERROR_CODES.MARKET_CLOSED:
        console.log('장이 열리지 않았습니다');
        break;
      case ERROR_CODES.INSUFFICIENT_FUNDS:
        console.log('잔고가 부족합니다');
        break;
      case ERROR_CODES.INVALID_SYMBOL:
        console.log('유효하지 않은 종목코드입니다');
        break;
      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
        console.log('API 호출 한도를 초과했습니다');
        break;
      case ERROR_CODES.COMPLIANCE_VIOLATION:
        console.log('규제 위반 주문입니다:', error.message);
        break;
      default:
        console.log('오류:', error.message);
    }
  }
}
```

### 재시도 및 회로 차단기
```typescript
const kset = new KSET({
  retryAttempts: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000
});
```

## 📊 포트폴리오 분석

### 포트폴리오 생성
```typescript
const portfolio = {
  id: 'my-portfolio',
  name: 'KOSPI 대표 포트폴리오',
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

// 포트폴리오 분석
const analysis = await kset.analyzePortfolio(portfolio);
console.log('총 수익률:', analysis.totalReturn.toFixed(2) + '%');
console.log('샤프 지수:', analysis.sharpeRatio.toFixed(2));
console.log('베타:', analysis.beta.toFixed(2));
```

## 🚀 고급 설정

### 환경 설정
```typescript
const kset = new KSET({
  // 로깅 설정
  logLevel: 'info',

  // 타임아웃 설정
  timeout: 30000,

  // 재시도 설정
  retryAttempts: 3,
  retryDelay: 1000,

  // 실시간 데이터 설정
  realtime: {
    maxSubscriptions: 20,
    reconnectAttempts: 3,
    reconnectDelay: 5000
  },

  // DART API 설정
  dart: {
    apiKey: process.env.DART_API_KEY,
    baseUrl: 'https://opendart.fss.or.kr/api',
    timeout: 10000
  },

  // 스마트 라우팅 설정
  routing: {
    defaultStrategy: 'best-price',
    enableSplitOrders: true,
    maxSplitProviders: 3,
    minOrderSize: 100000
  }
});
```

### Provider별 설정
```typescript
// 키움증권 설정
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

// 한국투자증권 설정
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

## 📋 상세 메서드 레퍼런스

### 🔗 KSET 핵심 메서드

#### `createProvider(brokerId: string, config: ProviderConfig): Promise<IKSETProvider>`
```typescript
// 키움증권 Provider 생성
const kiwoom = await kset.createProvider('kiwoom', {
  credentials: {
    id: 'your_id',
    password: 'your_password',
    certPassword: 'your_cert_password'
  },
  environment: 'production'
});

// 한국투자증권 Provider 생성
const koreaInvestment = await kset.createProvider('korea-investment', {
  credentials: {
    apiKey: 'your_api_key',
    secret: 'your_secret',
    accountNumber: 'your_account'
  }
});
```

#### `routeOrder(request: OrderRequest, criteria?: OrderRoutingCriteria): Promise<OrderRoutingResult>`
```typescript
// 최적 가격 라우팅
const result = await kset.routeOrder({
  symbol: '005930',
  side: 'BUY',
  quantity: 100,
  orderType: 'LIMIT',
  price: 85000
}, {
  strategy: 'best-price',
  maxProviders: 2
});

console.log('선택된 Provider:', result.selectedProviders);
console.log('할당량:', result.allocatedQuantities);
```

### 📊 시장 데이터 메서드

#### `getMarketData(symbols: string[], options?: MarketDataOptions): Promise<MarketData[]>`
```typescript
// 단일 종목 조회
const samsung = await kiwoom.getMarketData(['005930']);

// 다중 종목 조회
const stocks = await kiwoom.getMarketData(['005930', '000660', '035420']);

// 옵션 포함
const data = await kiwoom.getMarketData(['005930'], {
  includeOrderBook: true,
  includeVolume: true
});
```

#### `getHistoricalData(symbol: string, options: HistoricalDataOptions): Promise<HistoricalData[]>`
```typescript
// 일봉 데이터
const daily = await kiwoom.getHistoricalData('005930', {
  period: 'daily',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  adjusted: true
});

// 분봉 데이터
const minute = await kiwoom.getHistoricalData('005930', {
  period: 'minute',
  count: 100
});
```

### 🛒 거래 기능 메서드

#### `placeOrder(request: OrderRequest): Promise<Order>`
```typescript
// 시장가 주문
const marketOrder = await kiwoom.placeOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'MARKET',
  quantity: 10
});

// 지정가 주문
const limitOrder = await kiwoom.placeOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 85000
});

// 조건부 주문 (OCO)
const ocoOrder = await kiwoom.placeOrder({
  symbol: '005930',
  side: 'SELL',
  orderType: 'OCO',
  quantity: 10,
  price: 87000,      // 목표가
  stopPrice: 83000    // 손절가
});
```

#### `modifyOrder(orderId: string, modifications: OrderModifications): Promise<Order>`
```typescript
const modifiedOrder = await kiwoom.modifyOrder('order-123', {
  price: 86000,
  quantity: 15
});
```

#### `getOrderHistory(options?: OrderHistoryOptions): Promise<Order[]>`
```typescript
const orders = await kiwoom.getOrderHistory({
  symbol: '005930',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  status: ['FILLED', 'CANCELLED']
});
```

### 💰 계좌 정보 메서드

#### `getAccountInfo(): Promise<AccountInfo>`
```typescript
const account = await kiwoom.getAccountInfo();
console.log('계좌번호:', account.accountNumber);
console.log('예수금:', account.deposit);
console.log('인출가능금액:', account.withdrawable);
```

#### `getBalance(): Promise<Balance>`
```typescript
const balance = await kiwoom.getBalance();
console.log('현금잔고:', balance.cash);
console.log('총평가액:', balance.totalEvaluationPrice);
console.log('총손익:', balance.totalProfitLoss);
```

#### `getPositions(symbol?: string): Promise<Position[]>`
```typescript
// 전체 포지션
const allPositions = await kiwoom.getPositions();

// 특정 종목 포지션
const samsungPosition = await kiwoom.getPositions('005930');
console.log('보유수량:', samsungPosition.quantity);
console.log('매입단가:', samsungPosition.averagePrice);
console.log('평가손익:', samsungPosition.profitLoss);
```

### 📡 실시간 데이터 메서드

#### `subscribeToRealTimeData(symbols: string[], callbacks: RealTimeCallbacks): Promise<Subscription>`
```typescript
const subscription = await kiwoom.subscribeToRealTimeData(
  ['005930', '000660'],
  {
    onTick: (tick) => {
      console.log(`${tick.symbol}: ${tick.price}원 (${tick.change}%)`);
    },
    onOrderBook: (orderBook) => {
      console.log('호가정보:', orderBook.asks[0], orderBook.bids[0]);
    }
  }
);

// 구독 해제
await subscription.unsubscribe();
```

#### `subscribeToOrderUpdates(callback: (order: Order) => void): Promise<Subscription>`
```typescript
const orderSub = await kiwoom.subscribeToOrderUpdates((order) => {
  console.log(`주문 상태 변경: ${order.id} = ${order.status}`);
  if (order.status === 'FILLED') {
    console.log(`체결 완료: ${order.filledQuantity}주 @ ${order.averagePrice}원`);
  }
});
```

### 🔬 리서치 메서드

#### `searchCompany(query: string, options?: SearchOptions): Promise<CompanyInfo[]>`
```typescript
// 기업명으로 검색
const companies = await kset.searchCompany('삼성전자', {
  limit: 10,
  market: 'KOSPI'
});

// 종목코드로 검색
const company = await kset.searchCompany('005930');
console.log('회사명:', company[0].name);
console.log('시장:', company[0].market);
console.log('업종:', company[0].sector);
```

#### `getFinancialData(symbol: string, period: FinancialPeriod): Promise<FinancialData[]>`
```typescript
// 연간 재무 정보
const annual = await kset.getFinancialData('005930', 'annual');

// 분기별 재무 정보
const quarterly = await kset.getFinancialData('005930', 'quarterly');

quarterly.forEach((data) => {
  console.log(`${data.year} Q${data.quarter}`);
  console.log(`매출액: ${data.revenue?.toLocaleString()}원`);
  console.log(`영업이익: ${data.operatingIncome?.toLocaleString()}원`);
  console.log(`당기순이익: ${data.netIncome?.toLocaleString()}원`);
});
```

#### `searchDARTDisclosures(params: DARTSearchParams): Promise<DARTDisclosure[]>`
```typescript
const disclosures = await kset.searchDARTDisclosures({
  corporationCode: '00126380', // 삼성전자
  startDate: '20240101',
  endDate: '20241231',
  disclosureTypes: ['A001', 'A002'] // 사업보고서, 분기보고서
});

disclosures.forEach((disclosure) => {
  console.log('공시명:', disclosure.reportName);
  console.log('접수일:', disclosure.receiptDate);
  console.log('URL:', disclosure.url);
});
```

### 🤖 알고리즘 트레이딩 메서드

#### `executeTWAP(params: TWAPParams): Promise<AlgorithmInstance>`
```typescript
const twap = await kset.executeTWAP({
  symbol: '005930',
  side: 'BUY',
  totalQuantity: 1000,
  startTime: new Date(),
  endTime: new Date(Date.now() + 30 * 60 * 1000), // 30분 후
  intervalSeconds: 60,
  sliceCount: 30,
  callbacks: {
    onOrderPlaced: (order) => {
      console.log(`TWAP 주문: ${order.quantity}주 @ ${order.price}원`);
    },
    onComplete: (result) => {
      console.log(`TWAP 완료: 평균가 ${result.averagePrice}원`);
    }
  }
});
```

#### `controlAlgorithm(instanceId: string, action: AlgorithmControlAction): Promise<void>`
```typescript
await kset.controlAlgorithm(twap.id, 'pause');   // 일시정지
await kset.controlAlgorithm(twap.id, 'resume');  // 재개
await kset.controlAlgorithm(twap.id, 'cancel');  // 취소
```

### 📈 분석 메서드

#### `analyzeStock(symbol: string, options?: AnalysisOptions): Promise<StockAnalysis>`
```typescript
const analysis = await kset.analyzeStock('005930', {
  includeTechnical: true,
  includeFundamental: true,
  timeframe: 'daily'
});

console.log('종목코드:', analysis.symbol);
console.log('현재가:', analysis.currentPrice);
console.log('기술적 분석:', analysis.technicalAnalysis);
console.log('기본적 분석:', analysis.fundamentalAnalysis);
console.log('추천:', analysis.recommendation);
```

#### `analyzePortfolio(portfolio: Portfolio, options?: PortfolioAnalysisOptions): Promise<PortfolioAnalysis>`
```typescript
const portfolio = {
  positions: [
    { symbol: '005930', quantity: 100, averagePrice: 85000 },
    { symbol: '000660', quantity: 50, averagePrice: 120000 }
  ]
};

const analysis = await kset.analyzePortfolio(portfolio);
console.log('총 수익률:', analysis.totalReturn.toFixed(2) + '%');
console.log('샤프 지수:', analysis.sharpeRatio.toFixed(2));
console.log('베타:', analysis.beta.toFixed(2));
console.log('위험 분석:', analysis.riskAnalysis);
```

### ⚙️ 유틸리티 메서드

#### `getMarketStatus(market?: MarketType): Promise<MarketStatus>`
```typescript
const kospiStatus = await kset.getMarketStatus('KOSPI');
console.log('시장 상태:', kospiStatus.status);
// 'pre-market' | 'regular' | 'lunch-break' | 'after-hours' | 'closed'
```

#### `getMarketHolidays(year: number, month?: number): Promise<Holiday[]>`
```typescript
// 2024년 전체 휴장일
const holidays2024 = await kset.getMarketHolidays(2024);

// 2024년 3월 휴장일만
const marchHolidays = await kset.getMarketHolidays(2024, 3);

holidays2024.forEach((holiday) => {
  console.log(`${holiday.date}: ${holiday.name} (${holiday.type})`);
});
```

---

### 📞 지원 및 기여

- **GitHub Issues**: [https://github.com/KhakiSkech/KSET/issues](https://github.com/KhakiSkech/KSET/issues)
- **이메일**: khakiskech@gmail.com
- **라이선스**: [MIT License](LICENSE)

---

## 🤝 기여

KSET는 커뮤니티 기반 오픈소스 프로젝트입니다. 기여를 환영합니다!

[기여 가이드](../../CONTRIBUTING.md)를 참고하여 기여 방법을 확인하세요.

## 📄 라이선스

MIT License - [LICENSE](../../LICENSE) 파일을 참고하세요.

## 🆘 지원

- **GitHub Issues**: [https://github.com/kset/kset/issues](https://github.com/kset/kset/issues)
- **Discord 커뮤니티**: [초대 링크](https://discord.gg/kset)
- **이메일**: support@kset.dev

---

**KSET: 한국 증권 거래의 표준을 만들어갑니다 🇰🇷**