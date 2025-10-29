/**
 * KSET Core Interfaces
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 */

import {
  MarketData,
  Order,
  OrderRequest,
  OrderBook,
  AccountInfo,
  Balance,
  Position,
  Portfolio,
  CompanyInfo,
  FinancialData,
  Disclosure,
  AuthCredentials,
  AuthResult,
  ProviderCapabilities,
  ProviderConfig,
  ValidationResult,
  ApiResponse,
  RealTimeCallback,
  OrderCallback,
  Subscription,
  Symbol,
  MarketType
} from '@/types';

// ============================================================================
// CORE KSET PROVIDER INTERFACE
// ============================================================================

/**
 * 모든 Provider가 구현해야 할 핵심 인터페이스
 * 한국 증권사 API의 표준 추상화
 */
export interface IKSETProvider {
  /** Provider 식별자 */
  readonly id: string;
  /** Provider 이름 */
  readonly name: string;
  /** Provider 버전 */
  readonly version: string;
  /** Provider 기능 정보 */
  readonly capabilities: ProviderCapabilities;

  // ==========================================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * Provider 초기화
   * @param config Provider 설정
   */
  initialize(config: ProviderConfig): Promise<void>;

  /**
   * 인증 수행
   * @param credentials 인증 정보
   * @returns 인증 결과
   */
  authenticate(credentials: AuthCredentials): Promise<AuthResult>;

  /**
   * Provider 연결 해제
   */
  disconnect(): Promise<void>;

  /**
   * Provider 상태 확인
   */
  getHealthStatus(): Promise<ProviderHealthStatus>;

  // ==========================================================================
  // MARKET DATA APIS
  // ==========================================================================

  /**
   * 실시간 시세 데이터 조회
   * @param symbols 종목 코드 배열
   */
  getMarketData(symbols: string[]): Promise<ApiResponse<MarketData[]>>;

  /**
   * 과거 데이터 조회
   * @param symbol 종목 코드
   * @param period 기간
   * @param options 추가 옵션
   */
  getHistoricalData(
    symbol: string,
    period: HistoricalDataPeriod,
    options?: HistoricalDataOptions
  ): Promise<ApiResponse<HistoricalData[]>>;

  /**
   * 호가 정보 조회
   * @param symbol 종목 코드
   * @param depth 호가 깊이
   */
  getOrderBook(symbol: string, depth?: number): Promise<ApiResponse<OrderBook>>;

  /**
   * 실시간 데이터 구독
   * @param symbols 종목 코드 배열
   * @param callback 데이터 콜백
   * @returns 구독 정보
   */
  subscribeToRealTimeData(symbols: string[], callback: RealTimeCallback): Promise<Subscription>;

  /**
   * 종목 정보 조회
   * @param symbols 종목 코드 배열
   */
  getSymbols(symbols?: string[]): Promise<ApiResponse<Symbol[]>>;

  // ==========================================================================
  // TRADING APIS
  // ==========================================================================

  /**
   * 주문 생성
   * @param order 주문 정보
   * @returns 주문 결과
   */
  placeOrder(order: OrderRequest): Promise<ApiResponse<Order>>;

  /**
   * 주문 수정
   * @param orderId 주문 ID
   * @param modifications 수정 내역
   * @returns 수정된 주문 정보
   */
  modifyOrder(orderId: string, modifications: OrderModification): Promise<ApiResponse<Order>>;

  /**
   * 주문 취소
   * @param orderId 주문 ID
   * @returns 취소 결과
   */
  cancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message?: string }>>;

  /**
   * 주문 상태 조회
   * @param orderId 주문 ID
   * @returns 주문 정보
   */
  getOrder(orderId: string): Promise<ApiResponse<Order>>;

  /**
   * 주문 목록 조회
   * @param filters 필터링 조건
   * @param options 페이징 옵션
   */
  getOrders(filters?: OrderFilters, options?: PaginationOptions): Promise<ApiResponse<Order[]>>;

  /**
   * 주문 체결 내역 조회
   * @param filters 필터링 조건
   * @param options 페이징 옵션
   */
  getOrderExecutions(filters?: ExecutionFilters, options?: PaginationOptions): Promise<ApiResponse<OrderExecution[]>>;

  /**
   * 주문 상태 변경 구독
   * @param callback 상태 변경 콜백
   * @returns 구독 정보
   */
  subscribeToOrderUpdates(callback: OrderCallback): Promise<Subscription>;

  // ==========================================================================
  // ACCOUNT APIS
  // ==========================================================================

  /**
   * 계좌 정보 조회
   */
  getAccountInfo(): Promise<ApiResponse<AccountInfo>>;

  /**
   * 예수금 정보 조회
   */
  getBalance(): Promise<ApiResponse<Balance>>;

  /**
   * 보유 종목 조회
   * @param symbols 종목 코드 배열 (선택 사항)
   */
  getPositions(symbols?: string[]): Promise<ApiResponse<Position[]>>;

  /**
   * 포트폴리오 조회
   */
  getPortfolio(): Promise<ApiResponse<Portfolio>>;

  /**
   * 입출금 내역 조회
   * @param filters 필터링 조건
   * @param options 페이징 옵션
   */
  getTransactions(filters?: TransactionFilters, options?: PaginationOptions): Promise<ApiResponse<Transaction[]>>;

  /**
   * 잔고 변동 구독
   * @param callback 잔고 변동 콜백
   * @returns 구독 정보
   */
  subscribeToBalanceUpdates(callback: BalanceCallback): Promise<Subscription>;

  // ==========================================================================
  // RESEARCH APIS
  // ==========================================================================

  /**
   * 기업 정보 조회
   * @param symbol 종목 코드
   */
  getCompanyInfo(symbol: string): Promise<ApiResponse<CompanyInfo>>;

  /**
   * 재무 정보 조회
   * @param symbol 종목 코드
   * @param period 기간 유형
   * @param options 추가 옵션
   */
  getFinancials(
    symbol: string,
    period: FinancialPeriod,
    options?: FinancialOptions
  ): Promise<ApiResponse<FinancialData[]>>;

  /**
   * 공시 정보 조회
   * @param symbol 종목 코드
   * @param filters 필터링 조건
   * @param options 페이징 옵션
   */
  getDisclosures(symbol: string, filters?: DisclosureFilters, options?: PaginationOptions): Promise<ApiResponse<Disclosure[]>>;

  /**
   * 리서치 데이터 조회
   * @param symbol 종목 코드
   * @param type 리서치 타입
   * @param options 추가 옵션
   */
  getResearch(symbol: string, type: ResearchType, options?: ResearchOptions): Promise<ApiResponse<ResearchData[]>>;

  // ==========================================================================
  // UTILITY APIS
  // ==========================================================================

  /**
   * 시장 정보 조회
   * @param market 시장 타입
   */
  getMarketInfo(market?: MarketType): Promise<ApiResponse<MarketInfo>>;

  /**
   * 시장 상태 조회
   * @param market 시장 타입
   */
  getMarketStatus(market?: MarketType): Promise<ApiResponse<MarketStatus>>;

  /**
   * 휴장일 정보 조회
   * @param year 연도
   * @param month 월
   */
  getMarketHolidays(year: number, month?: number): Promise<ApiResponse<Holiday[]>>;

  /**
   * Provider 기능 확인
   */
  getCapabilities(): ProviderCapabilities;

  /**
   * 요청 제한 정보 조회
   */
  getRateLimits(): RateLimitInfo[];
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

export interface ProviderHealthStatus {
  /** Provider ID */
  provider: string;
  /** 연결 상태 */
  connected: boolean;
  /** 마지막 통신 시각 */
  lastHeartbeat: Date;
  /** API 상태 */
  apiStatus: 'operational' | 'degraded' | 'down';
  /** 지연 시간 (ms) */
  latency: number;
  /** 에러 발생률 */
  errorRate: number;
  /** 추가 정보 */
  details?: any;
}

export interface HistoricalDataPeriod {
  /** 시작일 */
  start: Date;
  /** 종료일 */
  end: Date;
  /** 데이터 간격 */
  interval: '1m' | '5m' | '15m' | '30m' | '1h' | '1d' | '1w' | '1M';
}

export interface HistoricalDataOptions {
  /** 필드 선택 */
  fields?: string[];
  /** 수량 제한 */
  limit?: number;
  /** 정렬 방식 */
  sort?: 'asc' | 'desc';
}

export interface HistoricalData {
  /** 시각 */
  timestamp: Date;
  /** 종가 */
  close: number;
  /** 시가 */
  open: number;
  /** 고가 */
  high: number;
  /** 저가 */
  low: number;
  /** 거래량 */
  volume: number;
  /** 거래대금 */
  value: number;
  /** 수정 주가 여부 */
  adjusted?: boolean;
}

export interface OrderModification {
  /** 변경할 수량 */
  quantity?: number;
  /** 변경할 가격 */
  price?: number;
  /** 변경할 스탑 가격 */
  stopPrice?: number;
  /** 변경 사유 */
  reason?: string;
}

export interface OrderFilters {
  /** 종목 코드 */
  symbol?: string;
  /** 주문 상태 */
  status?: string[];
  /** 주문 타입 */
  orderType?: string[];
  /** 주문 방향 */
  side?: 'BUY' | 'SELL';
  /** 시작일 */
  startDate?: Date;
  /** 종료일 */
  endDate?: Date;
}

export interface ExecutionFilters extends OrderFilters {
  /** 최소 체결 금액 */
  minAmount?: number;
  /** 최대 체결 금액 */
  maxAmount?: number;
}

export interface PaginationOptions {
  /** 페이지 번호 */
  page?: number;
  /** 페이지당 건수 */
  limit?: number;
  /** 정렬 필드 */
  sortBy?: string;
  /** 정렬 방식 */
  sortOrder?: 'asc' | 'desc';
}

export interface OrderExecution {
  /** 실행 ID */
  id: string;
  /** 주문 ID */
  orderId: string;
  /** 종목 코드 */
  symbol: string;
  /** 실행 방향 */
  side: 'BUY' | 'SELL';
  /** 실행 수량 */
  quantity: number;
  /** 실행 가격 */
  price: number;
  /** 실행 금액 */
  value: number;
  /** 수수료 */
  commission: number;
  /** 세금 */
  tax: number;
  /** 실행 시각 */
  executedAt: Date;
}

export interface TransactionFilters {
  /** 거래 유형 */
  type?: 'deposit' | 'withdrawal' | 'transfer' | 'fee' | 'tax' | 'interest';
  /** 통화 */
  currency?: string;
  /** 최소 금액 */
  minAmount?: number;
  /** 최대 금액 */
  maxAmount?: number;
  /** 시작일 */
  startDate?: Date;
  /** 종료일 */
  endDate?: Date;
}

export interface Transaction {
  /** 거래 ID */
  id: string;
  /** 거래 유형 */
  type: string;
  /** 금액 */
  amount: number;
  /** 통화 */
  currency: string;
  /** 잔액 */
  balance: number;
  /** 설명 */
  description: string;
  /** 거래 시각 */
  timestamp: Date;
  /** Provider */
  provider: string;
}

export type FinancialPeriod = 'quarterly' | 'annual';

export interface FinancialOptions {
  /** 최대 기간 수 */
  limit?: number;
  /** 필드 선택 */
  fields?: string[];
}

export type DisclosureType = 'regular' | 'ir' | 'material' | 'ownership' | 'sustainability' | 'other';

export interface DisclosureFilters {
  /** 공시 타입 */
  type?: DisclosureType[];
  /** 시작일 */
  startDate?: Date;
  /** 종료일 */
  endDate?: Date;
  /** 검색어 */
  keyword?: string;
  /** 중요 공시만 */
  importantOnly?: boolean;
}

export type ResearchType = 'analyst' | 'report' | 'recommendation' | 'technical' | 'fundamental';

export interface ResearchOptions {
  /** 최대 건수 */
  limit?: number;
  /** 정렬 방식 */
  sortBy?: 'date' | 'relevance' | 'rating';
  /** 언어 */
  language?: 'ko' | 'en';
}

export interface ResearchData {
  /** 리서치 ID */
  id: string;
  /** 종목 코드 */
  symbol: string;
  /** 타이틀 */
  title: string;
  /** 내용 */
  content: string;
  /** 작성자 */
  author: string;
  /** 평점 */
  rating?: number;
  /** 추천 */
  recommendation?: 'BUY' | 'HOLD' | 'SELL';
  /** 목표가 */
  targetPrice?: number;
  /** 작성일 */
  publishedAt: Date;
  /** Provider */
  provider: string;
}

export interface MarketInfo {
  /** 시장 이름 */
  name: string;
  /** 시장 코드 */
  code: MarketType;
  /** 통화 */
  currency: string;
  /** 타임존 */
  timezone: string;
  /** 거래 시간 */
  tradingHours: {
    preMarket?: { open: string; close: string };
    regular: { open: string; close: string };
    break?: { start: string; end: string };
    afterHours?: { open: string; close: string };
  };
  /** 최소 가격 단위 */
  tickSize: number;
  /** 가격 제한 */
  priceLimits: {
    upper: number;  // 상한가 (%)
    lower: number;  // 하한가 (%)
  };
  /** 거래 단위 */
  boardLot: number;
}

export type MarketStatus = 'open' | 'closed' | 'pre-market' | 'after-hours' | 'break' | 'holiday';

export interface Holiday {
  /** 날짜 */
  date: Date;
  /** 휴장일 이름 */
  name: string;
  /** 휴장일 타입 */
  type: 'holiday' | 'weekend' | 'maintenance';
  /** 영업 여부 */
  isBusinessDay: boolean;
}

export interface RateLimitInfo {
  /** 엔드포인트 */
  endpoint: string;
  /** 현재 요청 수 */
  currentRequests: number;
  /** 최대 요청 수 */
  maxRequests: number;
  /** 남은 요청 수 */
  remainingRequests: number;
  /** 재설정 시각 */
  resetTime: Date;
  /** 시간창 */
  window: number;
}

// ============================================================================
// PROVIDER REGISTRY INTERFACES
// ============================================================================

export interface IProviderRegistry {
  /**
   * Provider 등록
   * @param providerClass Provider 클래스
   */
  register<T extends IKSETProvider>(providerClass: new () => T): void;

  /**
   * Provider 생성
   * @param providerId Provider ID
   * @param config 설정 정보
   */
  createProvider(providerId: string, config: ProviderConfig): Promise<IKSETProvider>;

  /**
   * 사용 가능한 Provider 목록
   */
  getAvailableProviders(): ProviderInfo[];

  /**
   * Provider 기능 비교
   * @param providerIds Provider ID 배열
   */
  compareProviders(providerIds: string[]): ProviderComparison;

  /**
   * 기능별 Provider 필터링
   * @param feature 기능
   */
  getProvidersWithFeature(feature: string): string[];

  /**
   * Provider 정보 조회
   * @param providerId Provider ID
   */
  getProviderInfo(providerId: string): ProviderInfo | null;
}

export interface ProviderInfo {
  /** Provider ID */
  id: string;
  /** Provider 이름 */
  name: string;
  /** 설명 */
  description: string;
  /** 버전 */
  version: string;
  /** 홈페이지 */
  website?: string;
  /** 지원 기능 */
  capabilities: ProviderCapabilities;
  /** 지원 시장 */
  supportedMarkets: MarketType[];
  /** 상태 */
  status: 'active' | 'deprecated' | 'beta' | 'development';
}

export interface ProviderComparison {
  /** 비교 대상 Provider */
  providers: ProviderInfo[];
  /** 기능 매트릭스 */
  featureMatrix: Record<string, Record<string, boolean>>;
  /** 성능 비교 */
  performanceComparison: PerformanceComparison;
  /** 지원 기능 비교 */
  capabilityComparison: Record<string, any>;
}

export interface PerformanceComparison {
  /** API 응답 시간 */
  responseTime: Record<string, number>;
  /** 데이터 업데이트 빈도 */
  updateFrequency: Record<string, number>;
  /** 안정성 점수 */
  reliability: Record<string, number>;
}

// ============================================================================
// KSET MAIN INTERFACE
// ============================================================================

export interface IKSET {
  /**
   * Provider 생성
   * @param brokerId 브로커 ID
   * @param config 설정 정보
   */
  createProvider(brokerId: string, config: ProviderConfig): Promise<IKSETProvider>;

  /**
   * 다중 Provider 생성
   * @param configs 설정 정보 배열
   */
  createMultipleProviders(
    configs: { brokerId: string; config: ProviderConfig }[]
  ): Promise<Map<string, IKSETProvider>>;

  /**
   * 사용 가능한 브로커 목록
   */
  getAvailableBrokers(): ProviderInfo[];

  /**
   * 브로커 기능 비교
   * @param brokerIds 브로커 ID 배열
   */
  compareBrokers(brokerIds: string[]): ProviderComparison;

  /**
   * 기능별 브로커 필터링
   * @param feature 기능
   */
  getBrokersWithFeature(feature: string): string[];

  /**
   * 브로커 상태 확인
   */
  getBrokerStatus(): Map<string, ProviderHealthStatus>;

  /**
   * 여러 Provider에서 시장 데이터 비교
   * @param symbol 종목 코드
   */
  compareMarketData(symbol: string): Promise<Map<string, MarketData>>;

  /**
   * 스마트 오더 라우팅
   * @param order 주문 정보
   * @param criteria 선택 기준
   */
  routeOrder(order: OrderRequest, criteria?: OrderRoutingCriteria): Promise<OrderRoutingResult>;

  /**
   * 시장 통계
   */
  getMarketStatistics(): MarketStatistics;

  /**
   * 라이브러리 버전 정보
   */
  getVersion(): LibraryInfo;

  /**
   * 전역 설정
   */
  configure(settings: KSETSettings): void;
}

export interface OrderRoutingCriteria {
  /** 우선 순위 기준 */
  priority: 'price' | 'speed' | 'reliability' | 'cost';
  /** 최대 분할 개수 */
  maxSplits?: number;
  /** 제외할 브로커 */
  excludeBrokers?: string[];
}

export interface OrderRoutingResult {
  /** 실행된 주문 */
  executedOrders: Order[];
  /** 총 실행 결과 */
  summary: {
    totalQuantity: number;
    averagePrice: number;
    totalValue: number;
    totalCost: number;
  };
  /** 라우팅 정보 */
  routing: {
    selectedBrokers: string[];
    algorithm: string;
    executionTime: number;
  };
}

export interface MarketStatistics {
  /** 총 Provider 수 */
  totalProviders: number;
  /** 활성 Provider 수 */
  activeProviders: number;
  /** 지원 총 종목 수 */
  totalSymbols: number;
  /** 시장별 종목 수 */
  symbolsByMarket: Record<MarketType, number>;
  /** 평균 응답 시간 */
  averageResponseTime: number;
  /** 데이터 업데이트 빈도 */
  dataUpdateFrequency: number;
  /** 업데이트 시각 */
  updatedAt: Date;
}

export interface LibraryInfo {
  /** 버전 */
  version: string;
  /** 빌드 시각 */
  buildTime: Date;
  /** 지원 Provider 수 */
  supportedProviders: number;
  /** 지원 기능 */
  supportedFeatures: string[];
  /** 문서 URL */
  documentation: string;
  /** 라이센스 */
  license: string;
}

export interface KSETSettings {
  /** 로그 레벨 */
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  /** 기본 타임아웃 */
  defaultTimeout: number;
  /** 재시도 횟수 */
  retryAttempts: number;
  /** 캐시 설정 */
  cache: {
    enabled: boolean;
    ttl: number;
    maxSize: number;
  };
  /** 실시간 데이터 설정 */
  realTime: {
    maxSubscriptions: number;
    reconnectAttempts: number;
    reconnectDelay: number;
  };
}