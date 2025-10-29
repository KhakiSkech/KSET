# KSET 전체 API 레퍼런스

> **KSET (Korea Stock Exchange Trading Library)** - 개발자를 위한 완벽한 API 가이드
> _다른 개발자들이 혼동 없이 KSET을 학습하고 사용할 수 있도록 완벽하게 문서화_

## 📋 목차

1. [코어 인터페이스](#코어-인터페이스)
2. [데이터 타입](#데이터-타입)
3. [Provider 구현](#provider-구현)
4. [에러 처리](#에러-처리)
5. [실시간 데이터](#실시간-데이터)
6. [알고리즘 트레이딩](#알고리즘-트레이딩)
7. [리서치 API](#리서치-api)
8. [완전 사용 예제](#완전-사용-예제)

---

# 🔗 코어 인터페이스

## IKSETProvider

모든 증권사 Provider가 구현해야 하는 핵심 인터페이스

```typescript
interface IKSETProvider {
  /** Provider 식별자 */
  readonly id: string;
  /** Provider 이름 */
  readonly name: string;
  /** Provider 버전 */
  readonly version: string;
  /** Provider 기능 정보 */
  readonly capabilities: ProviderCapabilities;
}
```

### 생명주기 관리 메서드

#### `initialize(config: ProviderConfig): Promise<void>`
Provider를 초기화합니다.

**매개변수:**
- `config` (ProviderConfig): Provider 설정 정보
  - `credentials`: 인증 정보
  - `environment`: 환경 설정 ('development' | 'production')
  - `timeout`: 타임아웃 설정 (ms)
  - `retryAttempts`: 재시도 횟수

**반환값:**
- `Promise<void>`: 초기화 완료 시 resolve

**예외:**
- `KSETError.INITIALIZATION_FAILED`: 초기화 실패
- `KSETError.INVALID_CREDENTIALS`: 유효하지 않은 인증 정보

```typescript
// 사용 예시
await kiwoomProvider.initialize({
  credentials: {
    id: 'your_id',
    password: 'your_password',
    certPassword: 'your_cert_password'
  },
  environment: 'production',
  timeout: 30000,
  retryAttempts: 3
});
```

#### `authenticate(credentials: AuthCredentials): Promise<AuthResult>`
증권사 API 인증을 수행합니다.

**매개변수:**
- `credentials` (AuthCredentials): 인증 정보
  - `id`: 사용자 ID
  - `password`: 비밀번호
  - `certPassword`: 공인인증서 비밀번호 (실전투자용)
  - `apiKey`: API 키 (일부 증권사)
  - `secret`: API 시크릿 (일부 증권사)

**반환값:**
```typescript
interface AuthResult {
  success: boolean;
  token?: string;
  expiresAt?: Date;
  accountNumbers?: string[];
  permissions?: string[];
}
```

**예외:**
- `KSETError.AUTHENTICATION_FAILED`: 인증 실패
- `KSETError.CERTIFICATE_EXPIRED`: 공인인증서 만료
- `KSETError.NETWORK_ERROR`: 네트워크 오류

```typescript
// 사용 예시
const authResult = await kiwoomProvider.authenticate({
  id: 'your_id',
  password: 'your_password',
  certPassword: 'your_cert_password'
});

if (authResult.success) {
  console.log('인증 성공:', authResult.accountNumbers);
}
```

#### `disconnect(): Promise<void>`
Provider 연결을 해제합니다.

**반환값:**
- `Promise<void>`: 연결 해제 완료 시 resolve

```typescript
// 사용 예시
await kiwoomProvider.disconnect();
```

#### `getHealthStatus(): Promise<ProviderHealthStatus>`
Provider의 현재 상태를 확인합니다.

**반환값:**
```typescript
interface ProviderHealthStatus {
  status: 'healthy' | 'unhealthy' | 'disconnected';
  lastConnected?: Date;
  responseTime?: number;
  errorCount: number;
  uptime: number;
}
```

```typescript
// 사용 예시
const health = await kiwoomProvider.getHealthStatus();
console.log('Provider 상태:', health.status);
console.log('응답 시간:', health.responseTime, 'ms');
```

---

### 📊 시장 데이터 API

#### `getMarketData(symbols: string[]): Promise<ApiResponse<MarketData[]>>`
실시간 시세 데이터를 조회합니다.

**매개변수:**
- `symbols` (string[]): 종목 코드 배열 (예: ['005930', '000660'])

**반환값:**
```typescript
interface ApiResponse<MarketData[]> {
  success: boolean;
  data?: MarketData[];
  error?: KSETError;
  timestamp: Date;
  requestId: string;
}

interface MarketData {
  symbol: string;
  name: string;
  market: MarketType;

  // 가격 정보
  currentPrice: number;
  previousClose: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;

  // 변동 정보
  change: number;
  changeRate: number;

  // 거래 정보
  volume: number;
  totalValue: number;

  // 호가 정보
  asks: AskPrice[];
  bids: BidPrice[];

  // 시간 정보
  timestamp: Date;
  marketStatus: MarketStatus;
}
```

**예외:**
- `KSETError.INVALID_SYMBOL`: 유효하지 않은 종목 코드
- `KSETError.MARKET_CLOSED`: 장이 열리지 않았을 때
- `KSETError.RATE_LIMIT_EXCEEDED`: API 호출 한도 초과

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getMarketData(['005930', '000660']);

  if (response.success && response.data) {
    response.data.forEach(stock => {
      console.log(`${stock.name}: ${stock.currentPrice}원 (${stock.changeRate > 0 ? '+' : ''}${stock.changeRate}%)`);
      console.log(`거래량: ${stock.volume.toLocaleString()}주`);
      console.log(`시가총액: ${stock.totalValue.toLocaleString()}원`);
    });
  }
} catch (error) {
  console.error('시세 조회 실패:', error.message);
}
```

#### `getHistoricalData(symbol: string, period: HistoricalDataPeriod, options?: HistoricalDataOptions): Promise<ApiResponse<HistoricalData[]>>`
과거 차트 데이터를 조회합니다.

**매개변수:**
- `symbol` (string): 종목 코드
- `period` (HistoricalDataPeriod): 데이터 기간
  - `'minute'`: 분봉
  - `'daily'`: 일봉
  - `'weekly'`: 주봉
  - `'monthly'`: 월봉
- `options` (HistoricalDataOptions): 추가 옵션
  - `startDate`: 시작일 (YYYY-MM-DD)
  - `endDate`: 종료일 (YYYY-MM-DD)
  - `count`: 데이터 개수
  - `adjusted`: 수정주가 여부 (default: true)
  - `fields`: 조회 필드 (['open', 'high', 'low', 'close', 'volume'])

**반환값:**
```typescript
interface HistoricalData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose?: number;
}
```

**예외:**
- `KSETError.INVALID_DATE_RANGE`: 유효하지 않은 날짜 범위
- `KSETError.INSUFFICIENT_DATA`: 데이터 부족
- `KSETError.HISTORY_LIMIT_EXCEEDED`: 조회 기간 초과

```typescript
// 사용 예시: 삼성전자 2024년 일봉 데이터
try {
  const response = await kiwoomProvider.getHistoricalData(
    '005930',
    'daily',
    {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      adjusted: true,
      fields: ['open', 'high', 'low', 'close', 'volume']
    }
  );

  if (response.success && response.data) {
    console.log(`총 ${response.data.length}개의 일봉 데이터 조회 완료`);
    response.data.slice(-5).forEach(data => {
      console.log(`${data.date.toLocaleDateString()}: 시가 ${data.open} | 고가 ${data.high} | 저가 ${data.low} | 종가 ${data.close} | 거래량 ${data.volume.toLocaleString()}`);
    });
  }
} catch (error) {
  console.error('과거 데이터 조회 실패:', error.message);
}
```

#### `getOrderBook(symbol: string, depth?: number): Promise<ApiResponse<OrderBook>>`
호가 정보를 조회합니다.

**매개변수:**
- `symbol` (string): 종목 코드
- `depth` (number): 호가 깊이 (default: 5, 최대: 20)

**반환값:**
```typescript
interface OrderBook {
  symbol: string;
  timestamp: Date;

  // 매도 호가 (높은 가격 순)
  asks: Array<{
    price: number;
    quantity: number;
    totalQuantity: number;
  }>;

  // 매수 호가 (높은 가격 순)
  bids: Array<{
    price: number;
    quantity: number;
    totalQuantity: number;
  }>;

  // 총호가
  totalAskQuantity: number;
  totalBidQuantity: number;
  spread: number;
}
```

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getOrderBook('005930', 10);

  if (response.success && response.data) {
    const orderBook = response.data;
    console.log(`=== ${orderBook.symbol} 호가 정보 ===`);
    console.log(`매도/매수 스프레드: ${orderBook.spread}원`);

    console.log('\n[매도 호가]');
    orderBook.asks.slice(0, 5).forEach((ask, index) => {
      console.log(`${index + 1}호: ${ask.price.toLocaleString()}원 / ${ask.quantity.toLocaleString()}주`);
    });

    console.log('\n[매수 호가]');
    orderBook.bids.slice(0, 5).forEach((bid, index) => {
      console.log(`${index + 1}호: ${bid.price.toLocaleString()}원 / ${bid.quantity.toLocaleString()}주`);
    });
  }
} catch (error) {
  console.error('호가 정보 조회 실패:', error.message);
}
```

---

### 🛒 거래 API

#### `placeOrder(order: OrderRequest): Promise<ApiResponse<Order>>`
주문을 실행합니다.

**매개변수:**
```typescript
interface OrderRequest {
  symbol: string;           // 종목 코드
  side: OrderSide;          // 매수/매도 ('BUY' | 'SELL')
  orderType: OrderType;     // 주문 유형
  quantity: number;         // 주문 수량
  price?: number;           // 주문 가격 (지정가/조건부 주문 필수)

  // 고급 옵션
  timeInForce?: TimeInForce;      // 주문 유효 기간
  stopPrice?: number;            // 스탑 가격
  icebergQty?: number;           // 아이스버그 수량
  goodAfterDate?: Date;          // 특정일자 이후 유효
  goodTillDate?: Date;           // 특정일자까지 유효

  // OCO 주문용
  ocoPrice?: number;             // 목표가 (OCO 주문)
  ocoStopPrice?: number;         // 손절가 (OCO 주문)

  // 기타
  accountNumber?: string;        // 계좌번호 (다수 계좌 시)
  clientOrderId?: string;        // 클라이언트 주문 ID
  remarks?: string;              // 주문 메모
}
```

**반환값:**
```typescript
interface Order {
  id: string;                   // 주문 ID
  clientOrderId?: string;        // 클라이언트 주문 ID
  symbol: string;               // 종목 코드
  side: OrderSide;              // 매수/매도
  orderType: OrderType;         // 주문 유형
  quantity: number;             // 주문 수량
  price?: number;               // 주문 가격

  // 체결 정보
  filledQuantity: number;       // 체결 수량
  remainingQuantity: number;    // 남은 수량
  averagePrice?: number;        // 평균 체결가
  totalValue: number;           // 체결 총액

  // 상태 정보
  status: OrderStatus;          // 주문 상태
  createdAt: Date;              // 주문 시간
  updatedAt: Date;              // 마지막 업데이트 시간
  filledAt?: Date;              // 체결 시간

  // 수수료
  commission: number;           // 수수료
  tax: number;                  // 세금

  // 기타
  accountNumber: string;        // 계좌번호
  remarks?: string;             // 주문 메모
  errorCode?: string;           // 오류 코드
  errorMessage?: string;        // 오류 메시지
}
```

**예외:**
- `KSETError.INSUFFICIENT_FUNDS`: 잔고 부족
- `KSETError.INVALID_ORDER`: 유효하지 않은 주문
- `KSETError.MARKET_CLOSED`: 장이 열리지 않았을 때
- `KSETError.QUANTITY_TOO_SMALL`: 수량 단위 오류
- `KSETError.PRICE_OUT_OF_RANGE`: 가격 범위 오류

```typescript
// 사용 예시 1: 시장가 매수
try {
  const marketOrder = await kiwoomProvider.placeOrder({
    symbol: '005930',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: 10,
    accountNumber: '12345678-01',
    clientOrderId: 'order-001',
    remarks: '시장가 매수 테스트'
  });

  if (marketOrder.success) {
    console.log(`주문 접수: ${marketOrder.data.id}`);
    console.log(`주문 상태: ${marketOrder.data.status}`);
    console.log(`주문 수량: ${marketOrder.data.quantity}주`);
  }
} catch (error) {
  console.error('시장가 주문 실패:', error.message);
}

// 사용 예시 2: 지정가 매수
try {
  const limitOrder = await kiwoomProvider.placeOrder({
    symbol: '005930',
    side: 'BUY',
    orderType: 'LIMIT',
    quantity: 10,
    price: 85000,
    timeInForce: 'DAY',
    accountNumber: '12345678-01'
  });

  if (limitOrder.success) {
    console.log(`지정가 주문 접수: ${limitOrder.data.id}`);
    console.log(`주문 가격: ${limitOrder.data.price}원`);
  }
} catch (error) {
  console.error('지정가 주문 실패:', error.message);
}

// 사용 예시 3: OCO 주문 (목표가/손절가)
try {
  const ocoOrder = await kiwoomProvider.placeOrder({
    symbol: '005930',
    side: 'SELL',
    orderType: 'OCO',
    quantity: 20,
    price: 87000,        // 목표가
    ocoStopPrice: 83000,  // 손절가
    accountNumber: '12345678-01',
    remarks: 'OCO 주문: 87k 목표 / 83k 손절'
  });

  if (ocoOrder.success) {
    console.log(`OCO 주문 접수: ${ocoOrder.data.id}`);
    console.log(`목표가: ${ocoOrder.data.price}원`);
    console.log(`손절가: ${ocoOrder.data.ocoStopPrice}원`);
  }
} catch (error) {
  console.error('OCO 주문 실패:', error.message);
}
```

#### `modifyOrder(orderId: string, modifications: OrderModification): Promise<ApiResponse<Order>>`
기존 주문을 수정합니다.

**매개변수:**
- `orderId` (string): 수정할 주문 ID
- `modifications` (OrderModification): 수정 내용
  - `price`: 새로운 가격
  - `quantity`: 새로운 수량
  - `timeInForce`: 새로운 유효기간

**반환값:** `ApiResponse<Order>` (수정된 주문 정보)

**예외:**
- `KSETError.ORDER_NOT_FOUND`: 주문을 찾을 수 없음
- `KSETError.ORDER_NOT_MODIFIABLE`: 수정 불가능한 주문 상태
- `KSETError.INVALID_MODIFICATION`: 유효하지 않은 수정

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.modifyOrder('order-123', {
    price: 86000,
    quantity: 15,
    timeInForce: 'GTC'
  });

  if (response.success) {
    const modifiedOrder = response.data;
    console.log(`주문 수정 완료: ${modifiedOrder.id}`);
    console.log(`새 가격: ${modifiedOrder.price}원`);
    console.log(`새 수량: ${modifiedOrder.quantity}주`);
  }
} catch (error) {
  console.error('주문 수정 실패:', error.message);
}
```

#### `cancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message?: string }>>`
주문을 취소합니다.

**매개변수:**
- `orderId` (string): 취소할 주문 ID

**반환값:**
```typescript
{
  success: boolean;
  message?: string;
}
```

**예외:**
- `KSETError.ORDER_NOT_FOUND`: 주문을 찾을 수 없음
- `KSETError.ORDER_NOT_CANCELLABLE`: 취소 불가능한 주문 상태
- `KSETError.CANCELLATION_FAILED`: 취소 실패

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.cancelOrder('order-123');

  if (response.success) {
    console.log('주문 취소 성공');
    console.log(response.message || '주문이 정상적으로 취소되었습니다.');
  }
} catch (error) {
  console.error('주문 취소 실패:', error.message);
}
```

#### `getOrder(orderId: string): Promise<ApiResponse<Order>>`
특정 주문 정보를 조회합니다.

**매개변수:**
- `orderId` (string): 조회할 주문 ID

**반환값:** `ApiResponse<Order>` (주문 상세 정보)

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getOrder('order-123');

  if (response.success && response.data) {
    const order = response.data;
    console.log(`주문 ID: ${order.id}`);
    console.log(`종목: ${order.symbol}`);
    console.log(`상태: ${order.status}`);
    console.log(`수량: ${order.filledQuantity}/${order.quantity}`);
    console.log(`평균가: ${order.averagePrice || '미체결'}원`);
    console.log(`체결금액: ${order.totalValue.toLocaleString()}원`);
    console.log(`수수료: ${order.commission.toLocaleString()}원`);
  }
} catch (error) {
  console.error('주문 정보 조회 실패:', error.message);
}
```

#### `getOrders(filters?: OrderFilters, options?: PaginationOptions): Promise<ApiResponse<Order[]>>`
주문 목록을 조회합니다.

**매개변수:**
- `filters` (OrderFilters): 필터링 조건
  - `symbol`: 종목 코드
  - `status`: 주문 상태 배열
  - `side`: 매수/매도
  - `startDate`: 시작일
  - `endDate`: 종료일
  - `accountNumber`: 계좌번호
- `options` (PaginationOptions): 페이지 옵션
  - `page`: 페이지 번호 (default: 1)
  - `limit`: 페이지당 개수 (default: 50, max: 1000)

**반환값:** `ApiResponse<Order[]>` (주문 목록)

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getOrders({
    symbol: '005930',
    status: ['filled', 'partial'],
    side: 'BUY',
    startDate: '2024-01-01',
    endDate: '2024-12-31'
  }, {
    page: 1,
    limit: 100
  });

  if (response.success && response.data) {
    console.log(`총 ${response.data.length}개의 주문 조회 완료`);
    response.data.forEach(order => {
      console.log(`${order.symbol} ${order.side} ${order.quantity}주 @ ${order.averagePrice || '미체결'}원 (${order.status})`);
    });
  }
} catch (error) {
  console.error('주문 목록 조회 실패:', error.message);
}
```

---

### 💰 계좌 정보 API

#### `getAccountInfo(): Promise<ApiResponse<AccountInfo>>`
계좌 기본 정보를 조회합니다.

**반환값:**
```typescript
interface AccountInfo {
  accountNumber: string;         // 계좌번호
  accountName: string;           // 계좌명
  accountType: string;           // 계좌 종류
  ownerName: string;             // 예금주명

  // 자금 정보
  deposit: number;               // 예수금
  withdrawable: number;          // 인출가능금액
  buyingPower: number;           // 매입가능금액

  // 평가 정보
  totalAssets: number;           // 총자산
  totalEvaluationPrice: number;  // 총평가액
  totalProfitLoss: number;       // 총손익
  totalProfitLossRate: number;   // 총수익률

  // 기타
  currency: string;              // 통화 (KRW)
  isActive: boolean;             // 활성화 여부
  openedAt: Date;               // 개설일
  lastTransactionAt?: Date;     // 마지막 거래일
}
```

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getAccountInfo();

  if (response.success && response.data) {
    const account = response.data;
    console.log(`계좌번호: ${account.accountNumber}`);
    console.log(`계좌명: ${account.accountName}`);
    console.log(`예수금: ${account.deposit.toLocaleString()}원`);
    console.log(`인출가능금액: ${account.withdrawable.toLocaleString()}원`);
    console.log(`매입가능금액: ${account.buyingPower.toLocaleString()}원`);
    console.log(`총자산: ${account.totalAssets.toLocaleString()}원`);
    console.log(`총평가액: ${account.totalEvaluationPrice.toLocaleString()}원`);
    console.log(`총손익: ${account.totalProfitLoss.toLocaleString()}원 (${account.totalProfitLossRate.toFixed(2)}%)`);
  }
} catch (error) {
  console.error('계좌 정보 조회 실패:', error.message);
}
```

#### `getBalance(): Promise<ApiResponse<Balance>>`
잔고 정보를 상세히 조회합니다.

**반환값:**
```typescript
interface Balance {
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

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getBalance();

  if (response.success && response.data) {
    const balance = response.data;
    console.log(`=== 잔고 정보 ===`);
    console.log(`현금: ${balance.cash.toLocaleString()}원`);
    console.log(`예수금: ${balance.deposit.toLocaleString()}원`);
    console.log(`인출가능: ${balance.withdrawable.toLocaleString()}원`);
    console.log(`매입가능: ${balance.buyingPower.toLocaleString()}원`);
    console.log(`주식 평가액: ${balance.stockEvaluationPrice.toLocaleString()}원`);
    console.log(`주식 손익: ${balance.stockProfitLoss.toLocaleString()}원 (${balance.stockProfitLossRate.toFixed(2)}%)`);
    console.log(`총평가액: ${balance.totalEvaluationPrice.toLocaleString()}원`);
    console.log(`총손익: ${balance.totalProfitLoss.toLocaleString()}원 (${balance.totalProfitLossRate.toFixed(2)}%)`);
    console.log(`업데이트: ${balance.updatedAt.toLocaleString()}`);
  }
} catch (error) {
  console.error('잔고 조회 실패:', error.message);
}
```

#### `getPositions(symbols?: string[]): Promise<ApiResponse<Position[]>>`
보유 포지션 정보를 조회합니다.

**매개변수:**
- `symbols` (string[]): 특정 종목만 조회 (선택 사항)

**반환값:**
```typescript
interface Position {
  symbol: string;               // 종목 코드
  name: string;                 // 종목명
  market: MarketType;           // 시장 구분

  // 수량 정보
  quantity: number;             // 보유 수량
  buyableQuantity: number;      // 매매 가능 수량
  sellableQuantity: number;     // 매도 가능 수량

  // 가격 정보
  averagePrice: number;         // 평균 매입단가
  currentPrice: number;         // 현재가
  evaluationPrice: number;      // 평가액

  // 손익 정보
  profitLoss: number;           // 손익
  profitLossRate: number;       // 수익률
  dailyProfitLoss: number;      // 당일 손익

  // 거래 정보
  purchaseDate?: Date;          // 최종 매입일
  purchaseValue: number;        // 매입 금액

  // 기타
  currency: string;             // 통화
  updatedAt: Date;             // 업데이트 시간
}
```

```typescript
// 사용 예시 1: 전체 포지션 조회
try {
  const response = await kiwoomProvider.getPositions();

  if (response.success && response.data) {
    const positions = response.data;
    console.log(`총 ${positions.length}개 보유 종목`);

    let totalEvaluation = 0;
    let totalProfitLoss = 0;

    positions.forEach(position => {
      console.log(`\n${position.name} (${position.symbol})`);
      console.log(`보유 수량: ${position.quantity.toLocaleString()}주`);
      console.log(`평균 단가: ${position.averagePrice.toLocaleString()}원`);
      console.log(`현재가: ${position.currentPrice.toLocaleString()}원`);
      console.log(`평가액: ${position.evaluationPrice.toLocaleString()}원`);
      console.log(`손익: ${position.profitLoss.toLocaleString()}원 (${position.profitLossRate.toFixed(2)}%)`);
      console.log(`당일 손익: ${position.dailyProfitLoss.toLocaleString()}원`);

      totalEvaluation += position.evaluationPrice;
      totalProfitLoss += position.profitLoss;
    });

    console.log(`\n=== 포지션 요약 ===`);
    console.log(`총 평가액: ${totalEvaluation.toLocaleString()}원`);
    console.log(`총 손익: ${totalProfitLoss.toLocaleString()}원`);
  }
} catch (error) {
  console.error('포지션 조회 실패:', error.message);
}

// 사용 예시 2: 특정 종목 포지션 조회
try {
  const response = await kiwoomProvider.getPositions(['005930', '000660']);

  if (response.success && response.data) {
    response.data.forEach(position => {
      console.log(`${position.name}: ${position.quantity}주 보유 (평균 ${position.averagePrice}원)`);
    });
  }
} catch (error) {
  console.error('특정 종목 포지션 조회 실패:', error.message);
}
```

---

### 📡 실시간 데이터 API

#### `subscribeToRealTimeData(symbols: string[], callback: RealTimeCallback): Promise<Subscription>`
실시간 시세 데이터를 구독합니다.

**매개변수:**
- `symbols` (string[]): 구독할 종목 코드 배열
- `callback` (RealTimeCallback): 실시간 데이터 콜백 함수

**반환값:**
```typescript
interface Subscription {
  id: string;                   // 구독 ID
  symbols: string[];            // 구독 종목
  isActive: boolean;            // 활성화 여부
  createdAt: Date;             // 구독 시작 시간

  // 제어 메서드
  unsubscribe(): Promise<void>; // 구독 해제
  pause(): Promise<void>;       // 일시 정지
  resume(): Promise<void>;      // 재개
}
```

**콜백 함수:**
```typescript
interface RealTimeCallback {
  onTick?: (tick: TickData) => void;              // 체결 데이터
  onQuote?: (quote: QuoteData) => void;          // 호가 데이터
  onOrderBook?: (orderBook: OrderBook) => void;  // 주문 호가
  onTrade?: (trade: TradeData) => void;          // 거래 데이터
  onError?: (error: KSETError) => void;          // 에러
}

interface TickData {
  symbol: string;
  price: number;
  volume: number;
  change: number;
  changeRate: number;
  timestamp: Date;
  accumulatedVolume: number;
  marketStatus: MarketStatus;
}
```

**예외:**
- `KSETError.SUBSCRIPTION_LIMIT_EXCEEDED`: 구독 한도 초과
- `KSETError.INVALID_SYMBOL`: 유효하지 않은 종목
- `KSETError.WEBSOCKET_ERROR`: WebSocket 연결 오류

```typescript
// 사용 예시
try {
  const subscription = await kiwoomProvider.subscribeToRealTimeData(
    ['005930', '000660', '035420'],
    {
      // 체결 데이터 콜백
      onTick: (tick) => {
        console.log(`[${tick.timestamp.toLocaleTimeString()}] ${tick.symbol}: ${tick.price.toLocaleString()}원 (${tick.changeRate > 0 ? '+' : ''}${tick.changeRate.toFixed(2)}%)`);
        console.log(`체결량: ${tick.volume.toLocaleString()}주 / 누적거래량: ${tick.accumulatedVolume.toLocaleString()}주`);
      },

      // 호가 데이터 콜백
      onQuote: (quote) => {
        console.log(`[${quote.symbol}] 호가 업데이트`);
        console.log(`매도1호: ${quote.askPrice.toLocaleString()}원 / ${quote.askQuantity.toLocaleString()}주`);
        console.log(`매수1호: ${quote.bidPrice.toLocaleString()}원 / ${quote.bidQuantity.toLocaleString()}주`);
      },

      // 주문호가 콜백
      onOrderBook: (orderBook) => {
        const bestAsk = orderBook.asks[0];
        const bestBid = orderBook.bids[0];
        if (bestAsk && bestBid) {
          console.log(`[${orderBook.symbol}] 스프레드: ${bestAsk.price - bestBid.price}원`);
        }
      },

      // 에러 콜백
      onError: (error) => {
        console.error('실시간 데이터 에러:', error.message);
      }
    }
  );

  console.log(`실시간 데이터 구독 시작: ${subscription.id}`);

  // 10초 후 구독 해제
  setTimeout(async () => {
    await subscription.unsubscribe();
    console.log('실시간 데이터 구독 해제됨');
  }, 10000);

} catch (error) {
  console.error('실시간 데이터 구독 실패:', error.message);
}
```

#### `subscribeToOrderUpdates(callback: OrderCallback): Promise<Subscription>`
주문 상태 변경을 구독합니다.

**매개변수:**
- `callback` (OrderCallback): 주문 상태 변경 콜백

**콜백 함수:**
```typescript
interface OrderCallback {
  onOrderPlaced?: (order: Order) => void;        // 주문 접수
  onOrderFilled?: (order: Order) => void;        // 체결
  onOrderPartial?: (order: Order) => void;       // 부분 체결
  onOrderCancelled?: (order: Order) => void;     // 취소
  onOrderRejected?: (order: Order) => void;      // 거부
  onOrderUpdated?: (order: Order) => void;       // 상태 업데이트
  onError?: (error: KSETError) => void;          // 에러
}
```

```typescript
// 사용 예시
try {
  const orderSubscription = await kiwoomProvider.subscribeToOrderUpdates({
    onOrderPlaced: (order) => {
      console.log(`📝 주문 접수: ${order.id}`);
      console.log(`${order.symbol} ${order.side} ${order.quantity}주 @ ${order.price || '시장가'}`);
    },

    onOrderPartial: (order) => {
      console.log(`⚡ 부분 체결: ${order.id}`);
      console.log(`${order.filledQuantity}/${order.quantity}주 체결됨`);
      console.log(`평균가: ${order.averagePrice?.toLocaleString() || '미확인'}원`);
    },

    onOrderFilled: (order) => {
      console.log(`✅ 전체 체결: ${order.id}`);
      console.log(`${order.quantity}주 @ ${order.averagePrice?.toLocaleString()}원`);
      console.log(`체결금액: ${order.totalValue.toLocaleString()}원`);
      console.log(`수수료: ${order.commission.toLocaleString()}원`);
    },

    onOrderCancelled: (order) => {
      console.log(`❌ 주문 취소: ${order.id}`);
      console.log(`취소된 수량: ${order.quantity - order.filledQuantity}주`);
    },

    onOrderRejected: (order) => {
      console.log(`🚫 주문 거부: ${order.id}`);
      console.log(`사유: ${order.errorMessage || '알 수 없는 이유'}`);
    },

    onError: (error) => {
      console.error('주문 구독 에러:', error.message);
    }
  });

  console.log('주문 상태 변경 구독 시작');

  // 테스트 주문 실행
  const testOrder = await kiwoomProvider.placeOrder({
    symbol: '005930',
    side: 'BUY',
    orderType: 'LIMIT',
    quantity: 1,
    price: 80000,  // 낮은 가격으로 당장 체결되지 않도록
    remarks: '실시간 구독 테스트'
  });

  if (testOrder.success) {
    console.log('테스트 주문 접수:', testOrder.data.id);

    // 5초 후 주문 취소
    setTimeout(async () => {
      await kiwoomProvider.cancelOrder(testOrder.data.id);
    }, 5000);
  }

} catch (error) {
  console.error('주문 구독 실패:', error.message);
}
```

---

### 🔬 리서치 API

#### `getCompanyInfo(symbol: string): Promise<ApiResponse<CompanyInfo>>`
기업 정보를 조회합니다.

**매개변수:**
- `symbol` (string): 종목 코드

**반환값:**
```typescript
interface CompanyInfo {
  symbol: string;               // 종목 코드
  name: string;                 // 종목명
  englishName: string;          // 영문 종목명
  market: MarketType;           // 시장 구분

  // 기본 정보
  sector: string;               // 섹터
  industry: string;             // 산업 분류
  listingDate: Date;           // 상장일
  faceValue: number;           // 액면가

  // 주식 정보
  totalShares: number;         // 총 발행 주식 수
  outstandingShares: number;    // 유통 주식 수

  // 주주 정보
  largestShareholder: string;   // 최대 주주
  foreignOwnershipLimit: number; // 외국인 보유 한도 (%)
  foreignOwnership: number;      // 외국인 보유율 (%)

  // 주가 정보
  listingPrice: number;         // 상장가
  parValue: number;            // 액면가

  // 기타
  isPreferred: boolean;         // 우선주 여부
  isETF: boolean;              // ETF 여부
  isREITs: boolean;            // 리츠 여부
  website?: string;            // 웹사이트
  address?: string;            // 주소
  phone?: string;              // 전화번호
}
```

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getCompanyInfo('005930');

  if (response.success && response.data) {
    const company = response.data;
    console.log(`=== ${company.name} 기업 정보 ===`);
    console.log(`종목코드: ${company.symbol}`);
    console.log(`영문명: ${company.englishName}`);
    console.log(`시장: ${company.market}`);
    console.log(`섹터: ${company.sector}`);
    console.log(`산업: ${company.industry}`);
    console.log(`상장일: ${company.listingDate.toLocaleDateString()}`);
    console.log(`액면가: ${company.faceValue.toLocaleString()}원`);
    console.log(`총 발행 주식: ${company.totalShares.toLocaleString()}주`);
    console.log(`유통 주식: ${company.outstandingShares.toLocaleString()}주`);
    console.log(`최대 주주: ${company.largestShareholder}`);
    console.log(`외국인 보유 한도: ${company.foreignOwnershipLimit}%`);
    console.log(`외국인 보유율: ${company.foreignOwnershipRate}%`);
    console.log(`상장가: ${company.listingPrice.toLocaleString()}원`);

    if (company.website) {
      console.log(`웹사이트: ${company.website}`);
    }
  }
} catch (error) {
  console.error('기업 정보 조회 실패:', error.message);
}
```

#### `getDisclosures(symbol: string, filters?: DisclosureFilters, options?: PaginationOptions): Promise<ApiResponse<Disclosure[]>>`
공시 정보를 조회합니다.

**매개변수:**
- `symbol` (string): 종목 코드
- `filters` (DisclosureFilters): 필터링 조건
  - `startDate`: 시작일
  - `endDate`: 종료일
  - `types`: 공시 타입 배열
  - `importance`: 중요도
- `options` (PaginationOptions): 페이지 옵션

**반환값:**
```typescript
interface Disclosure {
  id: string;                   // 공시 ID
  corporationCode: string;      // 법인 코드
  corporationName: string;      // 법인명
  reportName: string;           // 보고서명
  receiptDate: Date;           // 접수일
  disclosureDate: Date;        // 공시일

  // 공시 정보
  type: string;                // 공시 타입
  importance: 'high' | 'medium' | 'low'; // 중요도
  summary?: string;            // 요약

  // 파일 정보
  url?: string;                // 공시 URL
  fileSize?: number;           // 파일 크기
  fileName?: string;           // 파일명

  // 기타
  relatedTo?: string[];        // 관련 종목
  keywords?: string[];         // 키워드
}
```

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getDisclosures('005930', {
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    types: ['A001', 'A002', 'A003'], // 사업보고서, 분기보고서, 반기보고서
    importance: 'high'
  }, {
    page: 1,
    limit: 20
  });

  if (response.success && response.data) {
    console.log(`총 ${response.data.length}개의 공시 조회 완료`);

    response.data.forEach(disclosure => {
      console.log(`\n📄 ${disclosure.reportName}`);
      console.log(`공시일: ${disclosure.disclosureDate.toLocaleDateString()}`);
      console.log(`접수일: ${disclosure.receiptDate.toLocaleDateString()}`);
      console.log(`타입: ${disclosure.type}`);
      console.log(`중요도: ${disclosure.importance}`);

      if (disclosure.summary) {
        console.log(`요약: ${disclosure.summary}`);
      }

      if (disclosure.url) {
        console.log(`URL: ${disclosure.url}`);
      }

      if (disclosure.keywords && disclosure.keywords.length > 0) {
        console.log(`키워드: ${disclosure.keywords.join(', ')}`);
      }
    });
  }
} catch (error) {
  console.error('공시 정보 조회 실패:', error.message);
}
```

#### `getResearch(symbol: string, type: ResearchType, options?: ResearchOptions): Promise<ApiResponse<ResearchData[]>>`
리서치 데이터를 조회합니다.

**매개변수:**
- `symbol` (string): 종목 코드
- `type` (ResearchType): 리서치 타입
  - `'analyst'`: 애널리스트 리포트
  - `'technical'`: 기술적 분석
  - `'fundamental'`: 기본적 분석
  - `'forecast'`: 실적 예측
- `options` (ResearchOptions): 추가 옵션

**반환값:**
```typescript
interface ResearchData {
  id: string;                   // 리서치 ID
  type: ResearchType;          // 리서치 타입
  title: string;               // 제목
  content: string;             // 내용

  // 작성 정보
  author: string;               // 작성자
  firm: string;                // 소속 기관
  publishedAt: Date;           // 발행일

  // 분석 정보
  rating?: 'BUY' | 'HOLD' | 'SELL'; // 투자의견
  targetPrice?: number;         // 목표가
  currentPrice?: number;        // 현재가

  // 기간
  validFrom: Date;             // 유효 시작일
  validTo: Date;               // 유효 종료일

  // 기타
  confidence: number;          // 신뢰도 (0-1)
  tags?: string[];             // 태그
}
```

```typescript
// 사용 예시
try {
  const response = await kiwoomProvider.getResearch('005930', 'analyst', {
    includeHistorical: true,
    maxAge: 30, // 30일 이내 데이터만
    minimumConfidence: 0.7
  });

  if (response.success && response.data) {
    console.log(`총 ${response.data.length}개의 애널리스트 리포트 조회 완료`);

    response.data.forEach(research => {
      console.log(`\n📊 ${research.title}`);
      console.log(`작성자: ${research.author} (${research.firm})`);
      console.log(`발행일: ${research.publishedAt.toLocaleDateString()}`);
      console.log(`투자의견: ${research.rating || '해당 없음'}`);

      if (research.targetPrice) {
        console.log(`목표가: ${research.targetPrice.toLocaleString()}원`);
      }

      if (research.currentPrice) {
        const potential = ((research.targetPrice! - research.currentPrice) / research.currentPrice * 100);
        console.log(`현재가: ${research.currentPrice.toLocaleString()}원 (잠재수익률: ${potential.toFixed(2)}%)`);
      }

      console.log(`신뢰도: ${(research.confidence * 100).toFixed(0)}%`);
      console.log(`유효기간: ${research.validFrom.toLocaleDateString()} ~ ${research.validTo.toLocaleDateString()}`);

      if (research.content) {
        const summary = research.content.substring(0, 200) + '...';
        console.log(`요약: ${summary}`);
      }
    });
  }
} catch (error) {
  console.error('리서치 데이터 조회 실패:', error.message);
}
```

---

# 🚨 에러 처리

## 에러 타입

KSET은 체계적인 에러 처리를 위해 30+ 개의 에러 타입을 제공합니다.

### 주요 에러 코드

```typescript
enum ERROR_CODES {
  // 인증 에러
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  CERTIFICATE_EXPIRED = 'CERTIFICATE_EXPIRED',

  // 주문 에러
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  INVALID_ORDER = 'INVALID_ORDER',
  MARKET_CLOSED = 'MARKET_CLOSED',
  QUANTITY_TOO_SMALL = 'QUANTITY_TOO_SMALL',
  PRICE_OUT_OF_RANGE = 'PRICE_OUT_OF_RANGE',

  // 데이터 에러
  INVALID_SYMBOL = 'INVALID_SYMBOL',
  INVALID_DATE_RANGE = 'INVALID_DATE_RANGE',
  INSUFFICIENT_DATA = 'INSUFFICIENT_DATA',

  // 시스템 에러
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SUBSCRIPTION_LIMIT_EXCEEDED = 'SUBSCRIPTION_LIMIT_EXCEEDED',
  WEBSOCKET_ERROR = 'WEBSOCKET_ERROR',

  // 기타
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}
```

## 에러 핸들링 예제

```typescript
import { KSETError, ERROR_CODES } from 'kset';

async function handleOrderError() {
  try {
    const order = await kiwoomProvider.placeOrder({
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 10,
      price: 85000
    });

  } catch (error) {
    if (error instanceof KSETError) {
      switch (error.code) {
        case ERROR_CODES.INSUFFICIENT_FUNDS:
          console.log('잔고가 부족합니다. 현금 잔고를 확인해주세요.');
          console.log(`부족액: ${error.details?.shortfall.toLocaleString()}원`);
          break;

        case ERROR_CODES.MARKET_CLOSED:
          console.log('장이 열리지 않았습니다. 장 시간을 확인해주세요.');
          console.log(`현재 시간: ${new Date().toLocaleString()}`);
          break;

        case ERROR_CODES.INVALID_ORDER:
          console.log('주문 정보가 유효하지 않습니다.');
          if (error.details?.field) {
            console.log(`오류 필드: ${error.details.field}`);
          }
          break;

        case ERROR_CODES.RATE_LIMIT_EXCEEDED:
          console.log('API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.');
          console.log(`재시도 가능 시간: ${error.details?.retryAfter}초`);
          break;

        default:
          console.log(`알 수 없는 에러: ${error.message}`);
      }
    } else {
      console.log(`예상치 못한 에러: ${error.message}`);
    }
  }
}
```

---

# 📖 완전 사용 예제

## 기본 사용 예제

```typescript
import { KSET } from 'kset';

async function basicExample() {
  // KSET 인스턴스 생성
  const kset = new KSET({
    logLevel: 'info',
    timeout: 30000
  });

  try {
    // 1. 키움증권 Provider 생성
    console.log('1. 키움증권 Provider 연결...');
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        id: 'your_id',
        password: 'your_password',
        certPassword: 'your_cert_password'
      },
      environment: 'production'
    });

    // 2. 계좌 정보 조회
    console.log('\n2. 계좌 정보 조회...');
    const accountInfo = await kiwoom.getAccountInfo();
    if (accountInfo.success) {
      const account = accountInfo.data!;
      console.log(`계좌번호: ${account.accountNumber}`);
      console.log(`예수금: ${account.deposit.toLocaleString()}원`);
      console.log(`매입가능: ${account.buyingPower.toLocaleString()}원`);
    }

    // 3. 시장 데이터 조회
    console.log('\n3. 실시간 시세 조회...');
    const marketData = await kiwoom.getMarketData(['005930', '000660']);
    if (marketData.success) {
      marketData.data!.forEach(stock => {
        console.log(`${stock.name}: ${stock.currentPrice.toLocaleString()}원 (${stock.changeRate > 0 ? '+' : ''}${stock.changeRate.toFixed(2)}%)`);
      });
    }

    // 4. 실시간 데이터 구독
    console.log('\n4. 실시간 데이터 구독...');
    const subscription = await kiwoom.subscribeToRealTimeData(
      ['005930'],
      {
        onTick: (tick) => {
          console.log(`삼성전자: ${tick.price.toLocaleString()}원 (${tick.changeRate.toFixed(2)}%)`);
        },
        onError: (error) => {
          console.error('실시간 데이터 에러:', error.message);
        }
      }
    );

    // 5. 10초 후 구독 해제
    setTimeout(async () => {
      await subscription.unsubscribe();
      console.log('실시간 데이터 구독 해제됨');

      // 6. 연결 해제
      await kiwoom.disconnect();
      console.log('Provider 연결 해제됨');
    }, 10000);

  } catch (error) {
    console.error('기본 사용 예제 실패:', error);
  }
}

// 실행
basicExample();
```

## 고급 거래 예제

```typescript
import { KSET } from 'kset';

async function advancedTradingExample() {
  const kset = new KSET();

  try {
    // 여러 Provider 연결
    const [kiwoom, koreaInvestment] = await Promise.all([
      kset.createProvider('kiwoom', kiwoomConfig),
      kset.createProvider('korea-investment', koreaInvestmentConfig)
    ]);

    // 1. 포지션 분석
    console.log('1. 포지션 분석...');
    const positions = await kiwoom.getPositions();
    if (positions.success && positions.data!.length > 0) {
      const analysis = await kset.analyzePortfolio({
        positions: positions.data!
      });

      console.log(`총 수익률: ${analysis.totalReturn.toFixed(2)}%`);
      console.log(`샤프 지수: ${analysis.sharpeRatio.toFixed(2)}`);
      console.log(`베타: ${analysis.beta.toFixed(2)}`);
    }

    // 2. 스마트 오더 라우팅
    console.log('\n2. 스마트 오더 라우팅...');
    const routingResult = await kset.routeOrder({
      symbol: '005930',
      side: 'BUY',
      quantity: 100,
      orderType: 'LIMIT',
      price: 85000
    }, {
      strategy: 'best-price',
      maxProviders: 2
    });

    console.log(`선택된 Provider: ${routingResult.selectedProviders.join(', ')}`);
    console.log(`할당량: ${routingResult.allocatedQuantities.join(', ')}`);

    // 3. TWAP 알고리즘 실행
    console.log('\n3. TWAP 알고리즘 실행...');
    const twapInstance = await kset.executeTWAP({
      symbol: '000660',
      side: 'BUY',
      totalQuantity: 500,
      startTime: new Date(),
      endTime: new Date(Date.now() + 10 * 60 * 1000), // 10분
      intervalSeconds: 60,
      sliceCount: 10,
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

    // 4. 실시간 주문 모니터링
    console.log('\n4. 실시간 주문 모니터링...');
    const orderSubscription = await kiwoom.subscribeToOrderUpdates({
      onOrderFilled: (order) => {
        console.log(`주문 체결: ${order.symbol} ${order.filledQuantity}주 @ ${order.averagePrice}원`);
      },
      onOrderCancelled: (order) => {
        console.log(`주문 취소: ${order.id}`);
      }
    });

    // 5. 5분 후 알고리즘 정지
    setTimeout(async () => {
      await kset.controlAlgorithm(twapInstance.id, 'cancel');
      await orderSubscription.unsubscribe();
      console.log('알고리즘 정지 및 구독 해제됨');
    }, 5 * 60 * 1000);

  } catch (error) {
    console.error('고급 거래 예제 실패:', error);
  }
}

// 실행
advancedTradingExample();
```

## 리서치 및 분석 예제

```typescript
import { KSET } from 'kset';

async function researchExample() {
  const kset = new KSET();

  try {
    const kiwoom = await kset.createProvider('kiwoom', kiwoomConfig);

    // 1. 기업 정보 조회
    console.log('1. 삼성전자 기업 정보...');
    const companyInfo = await kiwoom.getCompanyInfo('005930');
    if (companyInfo.success) {
      const company = companyInfo.data!;
      console.log(`${company.name} (${company.symbol})`);
      console.log(`섹터: ${company.sector} | 산업: ${company.industry}`);
      console.log(`외국인 보유율: ${company.foreignOwnershipRate}%`);
    }

    // 2. 최근 공시 조회
    console.log('\n2. 최근 공시 조회...');
    const disclosures = await kiwoom.getDisclosures('005930', {
      startDate: '2024-01-01',
      importance: 'high'
    }, { limit: 5 });

    if (disclosures.success) {
      disclosures.data!.forEach(disclosure => {
        console.log(`📄 ${disclosure.reportName}`);
        console.log(`공시일: ${disclosure.disclosureDate.toLocaleDateString()}`);
        if (disclosure.url) {
          console.log(`링크: ${disclosure.url}`);
        }
      });
    }

    // 3. 재무 데이터 조회
    console.log('\n3. 재무 데이터 조회...');
    const financialData = await kset.getFinancialData('005930', 'quarterly');
    console.log(`최근 4분기 재무 정보:`);
    financialData.slice(0, 4).forEach(data => {
      console.log(`${data.year} Q${data.quarter}:`);
      console.log(`  매출액: ${data.revenue?.toLocaleString()}원`);
      console.log(`  영업이익: ${data.operatingIncome?.toLocaleString()}원`);
      console.log(`  당기순이익: ${data.netIncome?.toLocaleString()}원`);
      console.log(`  EPS: ${data.eps?.toLocaleString()}원`);
    });

    // 4. 종목 분석
    console.log('\n4. 종목 분석...');
    const analysis = await kset.analyzeStock('005930', {
      includeTechnical: true,
      includeFundamental: true,
      timeframe: 'daily'
    });

    console.log(`현재가: ${analysis.currentPrice.toLocaleString()}원`);
    console.log(`기술적 분석: ${analysis.technicalAnalysis.summary}`);
    console.log(`기본적 분석: ${analysis.fundamentalAnalysis.summary}`);
    console.log(`추천: ${analysis.recommendation} (${analysis.confidence.toFixed(1)}% 신뢰도)`);

  } catch (error) {
    console.error('리서치 예제 실패:', error);
  }
}

// 실행
researchExample();
```

---

## 📞 지원 및 문의

**이 문서는 KSET 라이브러리의 모든 API를 완벽하게 문서화하여 개발자들이 혼동 없이 사용할 수 있도록 작성되었습니다.**

- **GitHub Issues**: [https://github.com/KhakiSkech/KSET/issues](https://github.com/KhakiSkech/KSET/issues)
- **이메일**: khakiskech@gmail.com
- **라이선스**: MIT License

**KSET: 한국 증권 거래의 표준을 만들어갑니다 🇰🇷**