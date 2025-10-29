# KSET 타입 레퍼런스

> **KSET (Korea Stock Exchange Trading Library)** - 완벽한 타입 정의 가이드
> _모든 데이터 타입, 인터페이스, 열거형을 상세하게 문서화_

## 📋 목차

1. [시장 타입](#시장-타입)
2. [거래 타입](#거래-타입)
3. [데이터 인터페이스](#데이터-인터페이스)
4. [거래 인터페이스](#거래-인터페이스)
5. [계좌 인터페이스](#계좌-인터페이스)
6. [리서치 인터페이스](#리서치-인터페이스)
7. [실시간 데이터 타입](#실시간-데이터-타입)
8. [Provider 타입](#provider-타입)
9. [에러 타입](#에러-타입)

---

# 시장 타입

## MarketType

한국 증권 시장의 종류를 정의합니다.

```typescript
export type MarketType =
  | 'KOSPI'      // 코스피 (종합주가지수)
  | 'KOSDAQ'     // 코스닥 (코스닥지수)
  | 'KONEX'      // 코넥스 (한국거래소 넥스트마켓)
  | 'KRX-ETF'    // KRX 상장 ETF
  | 'KRX-ETN';   // KRX 상장 ETN
```

**사용 예시:**
```typescript
const market: MarketType = 'KOSPI';
console.log(`시장: ${market}`); // 출력: 시장: KOSPI
```

## MarketStatus

시장의 현재 상태를 정의합니다.

```typescript
export type MarketStatus =
  | 'pre-market'     // 장 시작 전 (08:30-09:00)
  | 'regular'        // 정규장 (09:00-12:00, 13:00-15:30)
  | 'lunch-break'    // 점심시간 (12:00-13:00)
  | 'after-hours'    // 장 후 (15:30-16:00)
  | 'closed'         // 장 종료
  | 'holiday'        // 휴장
  | 'maintenance';   // 시스템 점검
```

**사용 예시:**
```typescript
const status: MarketStatus = 'regular';
if (status === 'regular') {
  console.log('정규장 운영 중입니다.');
}
```

---

# 거래 타입

## OrderSide

주문의 방향을 정의합니다.

```typescript
export type OrderSide = 'BUY' | 'SELL';
```

## OrderType

주문의 종류를 정의합니다.

```typescript
export type OrderType =
  | 'MARKET'         // 시장가 주문
  | 'LIMIT'          // 지정가 주문
  | 'BEST'           // 최유리지정가 주문
  | 'BEST_LIMIT'     // 최우선지정가 주문
  | 'STOP'           // 스탑 주문
  | 'STOP_LIMIT'     // 스탑지정가 주문
  | 'OCO'            // OCO (One-Cancels-Other) 주문
  | 'ICEBERG'        // 아이스버그 주문
  | 'TIME_IN_FORCE'; // 조건부지정가 주문
```

**주문 타입별 설명:**

| 타입 | 설명 | 사용 시점 |
|------|------|-----------|
| `MARKET` | 현재 가격으로 즉시 체결 | 즉시 매수/매도가 필요할 때 |
| `LIMIT` | 지정한 가격으로만 체결 | 특정 가격에 거래하고 싶을 때 |
| `BEST` | 가장 유리한 가격으로 체결 | 최적 가격을 원할 때 |
| `STOP` | 특정 가격에 도달하면 시장가 체결 | 손절 또는 추세 따라 매매할 때 |
| `OCO` | 목표가와 손절가를 동시 설정 | 리스크 관리가 필요할 때 |

## TimeInForce

주문의 유효 기간을 정의합니다.

```typescript
export type TimeInForce =
  | 'DAY'            // 당일 유효
  | 'GTC'            // 주문 유효기한까지
  | 'IOC'            // 즉시 체결, 나머지 취소
  | 'FOK'            // 전량 체결, 아니면 전체 취소
  | 'GTD'            // 지정일자까지 유효
  | 'GAP'            // 당일 + GAP
  | 'GTD-EXT';       // 지정일자까지 (연장)
```

## OrderStatus

주문의 상태를 정의합니다.

```typescript
export type OrderStatus =
  | 'pending'        // 접수 대기
  | 'received'       // 접수 완료
  | 'confirmed'      // 확인 완료
  | 'partial'        // 부분 체결
  | 'filled'         // 전체 체결
  | 'cancelled'      // 취소됨
  | 'rejected'       // 거부됨
  | 'expired'        // 유효기한 만료
  | 'suspended';     // 정지됨
```

**주문 상태 흐름:**
```
pending → received → confirmed → partial → filled
                        ↓                      ↓
                     rejected ← ← ← ← cancelled
```

---

# 데이터 인터페이스

## Symbol

종목 기본 정보를 나타냅니다.

```typescript
export interface Symbol {
  /** 종목 코드 (6자리) */
  id: string;
  /** 종목명 */
  name: string;
  /** 영문 종목명 */
  englishName: string;
  /** 시장 구분 */
  market: MarketType;
  /** 섹터 */
  sector: string;
  /** 산업 분류 */
  industry: string;
  /** 상장일 */
  listingDate: Date;
  /** 액면가 */
  faceValue: number;
  /** 주식 수 */
  totalShares: number;
  /** 우선주 여부 */
  isPreferred: boolean;
  /** ETF 여부 */
  isETF: boolean;
  /** ETN 여부 */
  isETN: boolean;
  /** 리츠 여부 */
  isREITs: boolean;
  /** 스팩 여부 */
  isSPAC: boolean;
}
```

**사용 예시:**
```typescript
const samsung: Symbol = {
  id: '005930',
  name: '삼성전자',
  englishName: 'Samsung Electronics',
  market: 'KOSPI',
  sector: '전기·전자',
  industry: '반도체',
  listingDate: new Date('1975-06-11'),
  faceValue: 5000,
  totalShares: 5969782550,
  isPreferred: false,
  isETF: false,
  isETN: false,
  isREITs: false,
  isSPAC: false
};

console.log(`${samsung.name} (${samsung.id})`);
console.log(`시장: ${samsung.market}`);
console.log(`상장일: ${samsung.listingDate.toLocaleDateString()}`);
```

## MarketData

실시간 시장 데이터를 나타냅니다.

```typescript
export interface MarketData {
  /** 종목 코드 */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 시장 구분 */
  market: MarketType;

  // 가격 정보
  /** 현재가 */
  currentPrice: number;
  /** 전일 종가 */
  previousClose: number;
  /** 시가 */
  openPrice: number;
  /** 고가 */
  highPrice: number;
  /** 저가 */
  lowPrice: number;

  // 변동 정보
  /** 변동액 */
  change: number;
  /** 변동률 */
  changeRate: number;

  // 거래 정보
  /** 거래량 */
  volume: number;
  /** 거래대금 */
  totalValue: number;

  // 호가 정보
  /** 매도 호가 */
  asks: AskPrice[];
  /** 매수 호가 */
  bids: BidPrice[];

  // 시간 정보
  /** 데이터 시간 */
  timestamp: Date;
  /** 시장 상태 */
  marketStatus: MarketStatus;
}
```

**연관 타입:**
```typescript
export interface AskPrice {
  price: number;        // 호가
  quantity: number;     // 수량
}

export interface BidPrice {
  price: number;        // 호가
  quantity: number;     // 수량
}
```

**사용 예시:**
```typescript
const marketData: MarketData = {
  symbol: '005930',
  name: '삼성전자',
  market: 'KOSPI',
  currentPrice: 85000,
  previousClose: 84500,
  openPrice: 84600,
  highPrice: 85200,
  lowPrice: 84400,
  change: 500,
  changeRate: 0.59,
  volume: 15000000,
  totalValue: 1275000000000,
  asks: [{ price: 85100, quantity: 1000 }],
  bids: [{ price: 85000, quantity: 2000 }],
  timestamp: new Date(),
  marketStatus: 'regular'
};

console.log(`${marketData.name}: ${marketData.currentPrice.toLocaleString()}원`);
console.log(`변동: ${marketData.change > 0 ? '+' : ''}${marketData.change}원 (${marketData.changeRate.toFixed(2)}%)`);
```

## HistoricalData

과거 차트 데이터를 나타냅니다.

```typescript
export interface HistoricalData {
  /** 날짜 */
  date: Date;
  /** 시가 */
  open: number;
  /** 고가 */
  high: number;
  /** 저가 */
  low: number;
  /** 종가 */
  close: number;
  /** 거래량 */
  volume: number;
  /** 수정종가 */
  adjustedClose?: number;
}
```

**사용 예시:**
```typescript
const historicalData: HistoricalData = {
  date: new Date('2024-01-15'),
  open: 84500,
  high: 85200,
  low: 84300,
  close: 85000,
  volume: 12000000,
  adjustedClose: 85000
};

console.log(`${historicalData.date.toLocaleDateString()} OHLCV:`);
console.log(`시가: ${historicalData.open.toLocaleString()}원`);
console.log(`고가: ${historicalData.high.toLocaleString()}원`);
console.log(`저가: ${historicalData.low.toLocaleString()}원`);
console.log(`종가: ${historicalData.close.toLocaleString()}원`);
console.log(`거래량: ${historicalData.volume.toLocaleString()}주`);
```

## OrderBook

호가 정보를 상세하게 나타냅니다.

```typescript
export interface OrderBook {
  /** 종목 코드 */
  symbol: string;
  /** 시간 */
  timestamp: Date;

  // 매도 호가 (높은 가격 순)
  asks: Array<{
    price: number;           // 호가
    quantity: number;        // 수량
    totalQuantity: number;   // 누적 수량
  }>;

  // 매수 호가 (높은 가격 순)
  bids: Array<{
    price: number;           // 호가
    quantity: number;        // 수량
    totalQuantity: number;   // 누적 수량
  }>;

  // 총호가
  totalAskQuantity: number;  // 총 매도 수량
  totalBidQuantity: number;  // 총 매수 수량
  spread: number;            // 스프레드 (최우선 매도가 - 최우선 매수가)
}
```

**사용 예시:**
```typescript
const orderBook: OrderBook = {
  symbol: '005930',
  timestamp: new Date(),
  asks: [
    { price: 85100, quantity: 1000, totalQuantity: 1000 },
    { price: 85200, quantity: 500, totalQuantity: 1500 },
    { price: 85300, quantity: 2000, totalQuantity: 3500 }
  ],
  bids: [
    { price: 85000, quantity: 2000, totalQuantity: 2000 },
    { price: 84900, quantity: 1500, totalQuantity: 3500 },
    { price: 84800, quantity: 1000, totalQuantity: 4500 }
  ],
  totalAskQuantity: 3500,
  totalBidQuantity: 4500,
  spread: 100  // 85100 - 85000
};

console.log(`호가 스프레드: ${orderBook.spread}원`);
console.log(`최우선 매도: ${orderBook.asks[0].price.toLocaleString()}원 (${orderBook.asks[0].quantity}주)`);
console.log(`최우선 매수: ${orderBook.bids[0].price.toLocaleString()}원 (${orderBook.bids[0].quantity}주)`);
```

---

# 거래 인터페이스

## OrderRequest

주문 요청 정보를 나타냅니다.

```typescript
export interface OrderRequest {
  /** 종목 코드 */
  symbol: string;
  /** 매수/매도 */
  side: OrderSide;
  /** 주문 유형 */
  orderType: OrderType;
  /** 주문 수량 */
  quantity: number;
  /** 주문 가격 (지정가/조건부 주문 필수) */
  price?: number;

  // 고급 옵션
  /** 주문 유효 기간 */
  timeInForce?: TimeInForce;
  /** 스탑 가격 */
  stopPrice?: number;
  /** 아이스버그 수량 */
  icebergQty?: number;
  /** 특정일자 이후 유효 */
  goodAfterDate?: Date;
  /** 특정일자까지 유효 */
  goodTillDate?: Date;

  // OCO 주문용
  /** 목표가 (OCO 주문) */
  ocoPrice?: number;
  /** 손절가 (OCO 주문) */
  ocoStopPrice?: number;

  // 기타
  /** 계좌번호 (다수 계좌 시) */
  accountNumber?: string;
  /** 클라이언트 주문 ID */
  clientOrderId?: string;
  /** 주문 메모 */
  remarks?: string;
}
```

**사용 예시:**
```typescript
// 기본 지정가 주문
const limitOrder: OrderRequest = {
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 85000,
  timeInForce: 'DAY'
};

// OCO 주문
const ocoOrder: OrderRequest = {
  symbol: '005930',
  side: 'SELL',
  orderType: 'OCO',
  quantity: 20,
  price: 87000,        // 목표가
  ocoStopPrice: 83000, // 손절가
  timeInForce: 'GTC'
};

// 스탑 주문
const stopOrder: OrderRequest = {
  symbol: '005930',
  side: 'SELL',
  orderType: 'STOP',
  quantity: 15,
  stopPrice: 83000,
  timeInForce: 'DAY'
};
```

## Order

주문 정보를 나타냅니다.

```typescript
export interface Order {
  /** 주문 ID */
  id: string;
  /** 클라이언트 주문 ID */
  clientOrderId?: string;
  /** 종목 코드 */
  symbol: string;
  /** 매수/매도 */
  side: OrderSide;
  /** 주문 유형 */
  orderType: OrderType;
  /** 주문 수량 */
  quantity: number;
  /** 주문 가격 */
  price?: number;

  // 체결 정보
  /** 체결 수량 */
  filledQuantity: number;
  /** 남은 수량 */
  remainingQuantity: number;
  /** 평균 체결가 */
  averagePrice?: number;
  /** 체결 총액 */
  totalValue: number;

  // 상태 정보
  /** 주문 상태 */
  status: OrderStatus;
  /** 주문 시간 */
  createdAt: Date;
  /** 마지막 업데이트 시간 */
  updatedAt: Date;
  /** 체결 시간 */
  filledAt?: Date;

  // 수수료
  /** 수수료 */
  commission: number;
  /** 세금 */
  tax: number;

  // 기타
  /** 계좌번호 */
  accountNumber: string;
  /** 주문 메모 */
  remarks?: string;
  /** 오류 코드 */
  errorCode?: string;
  /** 오류 메시지 */
  errorMessage?: string;
}
```

**사용 예시:**
```typescript
const order: Order = {
  id: 'order-001',
  clientOrderId: 'client-001',
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 85000,
  filledQuantity: 10,
  remainingQuantity: 0,
  averagePrice: 85000,
  totalValue: 850000,
  status: 'filled',
  createdAt: new Date('2024-01-15T10:30:00'),
  updatedAt: new Date('2024-01-15T10:30:05'),
  filledAt: new Date('2024-01-15T10:30:05'),
  commission: 85,
  tax: 0,
  accountNumber: '12345678-01',
  remarks: '테스트 주문'
};

console.log(`주문 체결 완료: ${order.id}`);
console.log(`${order.symbol} ${order.side} ${order.filledQuantity}주 @ ${order.averagePrice}원`);
console.log(`체결금액: ${order.totalValue.toLocaleString()}원 (수수료: ${order.commission}원)`);
```

## OrderModification

주문 수정 정보를 나타냅니다.

```typescript
export interface OrderModification {
  /** 새로운 가격 */
  price?: number;
  /** 새로운 수량 */
  quantity?: number;
  /** 새로운 유효기간 */
  timeInForce?: TimeInForce;
}
```

---

# 계좌 인터페이스

## AccountInfo

계좌 기본 정보를 나타냅니다.

```typescript
export interface AccountInfo {
  /** 계좌번호 */
  accountNumber: string;
  /** 계좌명 */
  accountName: string;
  /** 계좌 종류 */
  accountType: string;
  /** 예금주명 */
  ownerName: string;

  // 자금 정보
  /** 예수금 */
  deposit: number;
  /** 인출가능금액 */
  withdrawable: number;
  /** 매입가능금액 */
  buyingPower: number;

  // 평가 정보
  /** 총자산 */
  totalAssets: number;
  /** 총평가액 */
  totalEvaluationPrice: number;
  /** 총손익 */
  totalProfitLoss: number;
  /** 총수익률 */
  totalProfitLossRate: number;

  // 기타
  /** 통화 */
  currency: string;
  /** 활성화 여부 */
  isActive: boolean;
  /** 개설일 */
  openedAt: Date;
  /** 마지막 거래일 */
  lastTransactionAt?: Date;
}
```

## Balance

잔고 정보를 상세하게 나타냅니다.

```typescript
export interface Balance {
  // 현금 잔고
  cash: number;                  // 현금
  deposit: number;               // 예수금
  withdrawable: number;          // 인출가능금액
  buyingPower: number;           // 매입가능금액

  // 주식 잔고
  stockEvaluationPrice: number;  // 주식 평가액
  stockProfitLoss: number;       // 주식 손익
  stockProfitLossRate: number;   // 주식 수익률

  // 총평가
  totalEvaluationPrice: number;  // 총평가액
  totalProfitLoss: number;       // 총손익
  totalProfitLossRate: number;   // 총수익률

  // 기타
  currency: string;              // 통화
  updatedAt: Date;              // 업데이트 시간
}
```

## Position

보유 포지션 정보를 나타냅니다.

```typescript
export interface Position {
  /** 종목 코드 */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 시장 구분 */
  market: MarketType;

  // 수량 정보
  /** 보유 수량 */
  quantity: number;
  /** 매매 가능 수량 */
  buyableQuantity: number;
  /** 매도 가능 수량 */
  sellableQuantity: number;

  // 가격 정보
  /** 평균 매입단가 */
  averagePrice: number;
  /** 현재가 */
  currentPrice: number;
  /** 평가액 */
  evaluationPrice: number;

  // 손익 정보
  /** 손익 */
  profitLoss: number;
  /** 수익률 */
  profitLossRate: number;
  /** 당일 손익 */
  dailyProfitLoss: number;

  // 거래 정보
  /** 최종 매입일 */
  purchaseDate?: Date;
  /** 매입 금액 */
  purchaseValue: number;

  // 기타
  /** 통화 */
  currency: string;
  /** 업데이트 시간 */
  updatedAt: Date;
}
```

**사용 예시:**
```typescript
const position: Position = {
  symbol: '005930',
  name: '삼성전자',
  market: 'KOSPI',
  quantity: 100,
  buyableQuantity: 100,
  sellableQuantity: 100,
  averagePrice: 82000,
  currentPrice: 85000,
  evaluationPrice: 8500000,
  profitLoss: 300000,
  profitLossRate: 3.66,
  dailyProfitLoss: 50000,
  purchaseDate: new Date('2024-01-10'),
  purchaseValue: 8200000,
  currency: 'KRW',
  updatedAt: new Date()
};

console.log(`${position.name} 포지션:`);
console.log(`보유 수량: ${position.quantity}주`);
console.log(`매입 단가: ${position.averagePrice.toLocaleString()}원`);
console.log(`현재가: ${position.currentPrice.toLocaleString()}원`);
console.log(`평가액: ${position.evaluationPrice.toLocaleString()}원`);
console.log(`손익: ${position.profitLoss.toLocaleString()}원 (${position.profitLossRate.toFixed(2)}%)`);
```

---

# 리서치 인터페이스

## CompanyInfo

기업 정보를 나타냅니다.

```typescript
export interface CompanyInfo {
  /** 종목 코드 */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 영문 종목명 */
  englishName: string;
  /** 시장 구분 */
  market: MarketType;

  // 기본 정보
  /** 섹터 */
  sector: string;
  /** 산업 분류 */
  industry: string;
  /** 상장일 */
  listingDate: Date;
  /** 액면가 */
  faceValue: number;

  // 주식 정보
  /** 총 발행 주식 수 */
  totalShares: number;
  /** 유통 주식 수 */
  outstandingShares: number;

  // 주주 정보
  /** 최대 주주 */
  largestShareholder: string;
  /** 외국인 보유 한도 (%) */
  foreignOwnershipLimit: number;
  /** 외국인 보유율 (%) */
  foreignOwnershipRate: number;

  // 주가 정보
  /** 상장가 */
  listingPrice: number;
  /** 액면가 */
  parValue: number;

  // 기타
  /** 우선주 여부 */
  isPreferred: boolean;
  /** ETF 여부 */
  isETF: boolean;
  /** 리츠 여부 */
  isREITs: boolean;
  /** 웹사이트 */
  website?: string;
  /** 주소 */
  address?: string;
  /** 전화번호 */
  phone?: string;
}
```

## FinancialData

재무 데이터를 나타냅니다.

```typescript
export interface FinancialData {
  /** 회계 연도 */
  year: number;
  /** 분기 (1-4, 0은 연간) */
  quarter: number;
  /** 매출액 */
  revenue?: number;
  /** 매출원가 */
  costOfRevenue?: number;
  /** 매출총이익 */
  grossProfit?: number;
  /** 영업이익 */
  operatingIncome?: number;
  /** 당기순이익 */
  netIncome?: number;
  /** EPS (주당순이익) */
  eps?: number;
  /** BPS (주당순자산가치) */
  bps?: number;
  /** PER (주가수익비율) */
  per?: number;
  /** PBR (주가순자산비율) */
  pbr?: number;
  /** ROE (자기자본이익률) */
  roe?: number;
  /** 부채비율 */
  debtRatio?: number;
  /** 영업이익률 */
  operatingMargin?: number;
  /** 순이익률 */
  netMargin?: number;
  /** 데이터 시점 */
  reportedAt?: Date;
}
```

**사용 예시:**
```typescript
const financialData: FinancialData = {
  year: 2024,
  quarter: 2,
  revenue: 74182000000000,     // 74.18조원
  operatingIncome: 10800000000000, // 10.8조원
  netIncome: 9684000000000,     // 9.68조원
  eps: 1450,
  per: 15.2,
  roe: 12.5,
  reportedAt: new Date('2024-07-26')
};

console.log(`2024년 2분기 실적:`);
console.log(`매출액: ${(financialData.revenue! / 1000000000000).toFixed(1)}조원`);
console.log(`영업이익: ${(financialData.operatingIncome! / 1000000000000).toFixed(1)}조원`);
console.log(`당기순이익: ${(financialData.netIncome! / 1000000000000).toFixed(1)}조원`);
console.log(`EPS: ${financialData.eps?.toLocaleString()}원`);
console.log(`ROE: ${financialData.roe?.toFixed(1)}%`);
```

## Disclosure

공시 정보를 나타냅니다.

```typescript
export interface Disclosure {
  /** 공시 ID */
  id: string;
  /** 법인 코드 */
  corporationCode: string;
  /** 법인명 */
  corporationName: string;
  /** 보고서명 */
  reportName: string;
  /** 접수일 */
  receiptDate: Date;
  /** 공시일 */
  disclosureDate: Date;

  // 공시 정보
  /** 공시 타입 */
  type: string;
  /** 중요도 */
  importance: 'high' | 'medium' | 'low';
  /** 요약 */
  summary?: string;

  // 파일 정보
  /** 공시 URL */
  url?: string;
  /** 파일 크기 */
  fileSize?: number;
  /** 파일명 */
  fileName?: string;

  // 기타
  /** 관련 종목 */
  relatedTo?: string[];
  /** 키워드 */
  keywords?: string[];
}
```

---

# 실시간 데이터 타입

## RealTimeCallback

실시간 데이터 콜백 함수들을 정의합니다.

```typescript
export interface RealTimeCallback {
  /** 체결 데이터 콜백 */
  onTick?: (tick: TickData) => void;
  /** 호가 데이터 콜백 */
  onQuote?: (quote: QuoteData) => void;
  /** 주문 호가 콜백 */
  onOrderBook?: (orderBook: OrderBook) => void;
  /** 거래 데이터 콜백 */
  onTrade?: (trade: TradeData) => void;
  /** 에러 콜백 */
  onError?: (error: KSETError) => void;
}
```

## TickData

실시간 체결 데이터를 나타냅니다.

```typescript
export interface TickData {
  /** 종목 코드 */
  symbol: string;
  /** 체결가 */
  price: number;
  /** 체결량 */
  volume: number;
  /** 변동액 */
  change: number;
  /** 변동률 */
  changeRate: number;
  /** 시간 */
  timestamp: Date;
  /** 누적 거래량 */
  accumulatedVolume: number;
  /** 시장 상태 */
  marketStatus: MarketStatus;
}
```

## QuoteData

실시간 호가 데이터를 나타냅니다.

```typescript
export interface QuoteData {
  /** 종목 코드 */
  symbol: string;
  /** 매도 1호가 */
  askPrice: number;
  /** 매도 1호량 */
  askQuantity: number;
  /** 매수 1호가 */
  bidPrice: number;
  /** 매수 1호량 */
  bidQuantity: number;
  /** 시간 */
  timestamp: Date;
}
```

## Subscription

실시간 데이터 구독 정보를 나타냅니다.

```typescript
export interface Subscription {
  /** 구독 ID */
  id: string;
  /** 구독 종목 */
  symbols: string[];
  /** 활성화 여부 */
  isActive: boolean;
  /** 구독 시작 시간 */
  createdAt: Date;

  // 제어 메서드
  /** 구독 해제 */
  unsubscribe(): Promise<void>;
  /** 일시 정지 */
  pause(): Promise<void>;
  /** 재개 */
  resume(): Promise<void>;
}
```

---

# Provider 타입

## ProviderConfig

Provider 설정 정보를 나타냅니다.

```typescript
export interface ProviderConfig {
  /** 인증 정보 */
  credentials: AuthCredentials;
  /** 환경 설정 */
  environment: 'development' | 'production';
  /** 타임아웃 (ms) */
  timeout?: number;
  /** 재시도 횟수 */
  retryAttempts?: number;
  /** 추가 옵션 */
  options?: Record<string, any>;
}
```

## AuthCredentials

인증 정보를 나타냅니다.

```typescript
export interface AuthCredentials {
  /** 사용자 ID */
  id?: string;
  /** 비밀번호 */
  password?: string;
  /** 공인인증서 비밀번호 */
  certPassword?: string;
  /** API 키 */
  apiKey?: string;
  /** API 시크릿 */
  secret?: string;
  /** 계좌번호 */
  accountNumber?: string;
  /** 인증서 파일 경로 */
  certificatePath?: string;
}
```

## ProviderCapabilities

Provider 기능 정보를 나타냅니다.

```typescript
export interface ProviderCapabilities {
  /** 지원 시장 */
  supportedMarkets: MarketType[];
  /** 지원 주문 타입 */
  supportedOrderTypes: OrderType[];
  /** 실시간 데이터 지원 */
  supportsRealTimeData: boolean;
  /** 알고리즘 트레이딩 지원 */
  supportsAlgorithmTrading: boolean;
  /** 리서치 데이터 지원 */
  supportsResearch: boolean;
  /** 최대 구독 수 */
  maxSubscriptions?: number;
  /** 최대 거래 수량 */
  maxOrderQuantity?: number;
}
```

---

# 에러 타입

## KSETError

KSET 표준 에러 클래스입니다.

```typescript
export class KSETError extends Error {
  /** 에러 코드 */
  readonly code: string;
  /** 에러 메시지 */
  readonly message: string;
  /** 상세 정보 */
  readonly details?: any;
  /** 원인 에러 */
  readonly cause?: Error;

  constructor(code: string, message: string, details?: any, cause?: Error) {
    super(message);
    this.name = 'KSETError';
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}
```

## ApiResponse

API 응답 표준 형식입니다.

```typescript
export interface ApiResponse<T> {
  /** 성공 여부 */
  success: boolean;
  /** 응답 데이터 */
  data?: T;
  /** 에러 정보 */
  error?: KSETError;
  /** 응답 시간 */
  timestamp: Date;
  /** 요청 ID */
  requestId: string;
}
```

---

# 사용 예제

## 완전한 타입 활용 예제

```typescript
import { KSET, MarketType, OrderType, OrderSide } from 'kset';

// 타입 안전성을 활용한 완전한 예제
async function typeSafeTradingExample() {
  const kset = new KSET();

  try {
    // Provider 생성 (타입 체크)
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        id: 'your_id',
        password: 'your_password',
        certPassword: 'your_cert_password'
      },
      environment: 'production',
      timeout: 30000,
      retryAttempts: 3
    });

    // 시장 데이터 조회 (타입 안전)
    const symbols: string[] = ['005930', '000660', '035420'];
    const marketResponse = await kiwoom.getMarketData(symbols);

    if (marketResponse.success && marketResponse.data) {
      // 타입 추론 활용
      marketResponse.data.forEach((stock: MarketData) => {
        console.log(`${stock.name} (${stock.market})`);
        console.log(`현재가: ${stock.currentPrice.toLocaleString()}원`);
        console.log(`변동률: ${stock.changeRate.toFixed(2)}%`);

        // 타입 기반 조건 처리
        if (stock.market === 'KOSPI') {
          console.log('KOSPI 종목입니다.');
        }
      });
    }

    // 주문 실행 (완전한 타입 지정)
    const orderRequest: OrderRequest = {
      symbol: '005930',
      side: 'BUY' as OrderSide,
      orderType: 'LIMIT' as OrderType,
      quantity: 10,
      price: 85000,
      timeInForce: 'DAY',
      accountNumber: '12345678-01',
      clientOrderId: `order-${Date.now()}`,
      remarks: '타입 안전 주문'
    };

    const orderResponse = await kiwoom.placeOrder(orderRequest);

    if (orderResponse.success && orderResponse.data) {
      const order: Order = orderResponse.data;

      // 타입 기반 상태 처리
      switch (order.status) {
        case 'pending':
          console.log('주문 접수 대기 중...');
          break;
        case 'received':
          console.log('주문 접수 완료');
          break;
        case 'filled':
          console.log(`주문 체결 완료: ${order.averagePrice?.toLocaleString()}원`);
          break;
        case 'cancelled':
          console.log('주문 취소됨');
          break;
      }
    }

    // 실시간 데이터 구독 (타입 콜백)
    const subscription = await kiwoom.subscribeToRealTimeData(
      ['005930'],
      {
        onTick: (tick: TickData) => {
          console.log(`체결: ${tick.price.toLocaleString()}원 (${tick.changeRate.toFixed(2)}%)`);
        },
        onOrderBook: (orderBook: OrderBook) => {
          console.log(`호가 스프레드: ${orderBook.spread}원`);
        },
        onError: (error: KSETError) => {
          console.error(`에러 (${error.code}): ${error.message}`);
        }
      }
    );

    // 포지션 조회 (타입 안전한 처리)
    const positionResponse = await kiwoom.getPositions();
    if (positionResponse.success && positionResponse.data) {
      const positions: Position[] = positionResponse.data;

      let totalProfitLoss = 0;
      positions.forEach((position: Position) => {
        console.log(`${position.name}: ${position.profitLoss.toLocaleString()}원`);
        totalProfitLoss += position.profitLoss;
      });

      console.log(`총 손익: ${totalProfitLoss.toLocaleString()}원`);
    }

  } catch (error) {
    // 타입 안전한 에러 처리
    if (error instanceof KSETError) {
      console.error(`KSET 에러 (${error.code}): ${error.message}`);
      if (error.details) {
        console.error('상세 정보:', error.details);
      }
    } else {
      console.error('알 수 없는 에러:', error.message);
    }
  }
}

// 타입 유틸리티 함수
function formatMarketData(data: MarketData): string {
  return `${data.name}: ${data.currentPrice.toLocaleString()}원 (${data.changeRate > 0 ? '+' : ''}${data.changeRate.toFixed(2)}%)`;
}

function validateOrderRequest(request: OrderRequest): boolean {
  if (!request.symbol || !request.side || !request.orderType || !request.quantity) {
    return false;
  }

  if (request.orderType === 'LIMIT' && !request.price) {
    return false;
  }

  return true;
}

// 실행
typeSafeTradingExample();
```

이 문서는 KSET 라이브러리의 모든 타입을 완벽하게 문서화하여 개발자들이 혼동 없이 타입 안전하게 개발할 수 있도록 지원합니다.