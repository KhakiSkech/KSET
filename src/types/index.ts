/**
 * KSET Core Types
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 */

// ============================================================================
// MARKET TYPES
// ============================================================================

export type MarketType = 'KOSPI' | 'KOSDAQ' | 'KONEX' | 'KRX-ETF' | 'KRX-ETN';

export type MarketStatus =
  | 'pre-market'     // 장 시작 전 (08:30-09:00)
  | 'regular'        // 정규장 (09:00-12:00, 13:00-15:30)
  | 'lunch-break'    // 점심시간 (12:00-13:00)
  | 'after-hours'    // 장 후 (15:30-16:00)
  | 'closed'         // 장 종료
  | 'holiday'        // 휴장
  | 'maintenance';   // 시스템 점검

export type OrderSide = 'BUY' | 'SELL';

export type OrderType =
  | 'MARKET'         // 시장가
  | 'LIMIT'          // 지정가
  | 'BEST'           // 최유리지정가
  | 'BEST_LIMIT'     // 최우선지정가
  | 'STOP'           // 스탑
  | 'STOP_LIMIT'     // 스탑지정가
  | 'OCO'            // OCO (One-Cancels-Other)
  | 'ICEBERG'        // 아이스버그
  | 'TIME_IN_FORCE'; // 조건부지정가

export type TimeInForce =
  | 'DAY'            // 당일
  | 'GTC'            // 주문유효기한
  | 'IOC'            // 즉시체결
  | 'FOK'            // 전량체결
  | 'GTD'            // 지정일자
  | 'GAP'            // 당일+GAP;

export type OrderStatus =
  | 'pending'        // 접수 대기
  | 'received'       // 접수
  | 'confirmed'      // 확인
  | 'partial'        // 부분체결
  | 'filled'         // 전체체결
  | 'cancelled'      // 취소
  | 'rejected'       // 거부
  | 'expired'        // 유효기한만료
  | 'suspended';     // 정지

// ============================================================================
// TRADING TYPES
// ============================================================================

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
  /** 변동액 */
  changeAmount: number;
  /** 변동율 */
  changeRate: number;

  // 호가 정보
  /** 매수호가 1단계 */
  bidPrice: number;
  /** 매도호가 1단계 */
  askPrice: number;
  /** 매수호가 1단계 수량 */
  bidSize: number;
  /** 매도호가 1단계 수량 */
  askSize: number;

  // 거래 정보
  /** 누적 거래량 */
  volume: number;
  /** 누적 거래대금 */
  tradingValue: number;

  // 시장 정보
  /** 시가총액 */
  marketCap: number;
  /** 외국인 보유율 */
  foreignHoldingRatio: number;
  /** 기관 보유율 */
  institutionalHoldingRatio: number;

  // 타임스탬프
  /** 생성 시각 (Unix timestamp) */
  timestamp: number;
  /** 생성 시각 (ISO string) */
  datetime: string;
  /** 데이터 소스 */
  source: string;

  // 원본 데이터
  /** Provider별 원본 데이터 */
  rawData: any;
}

export interface OrderBookLevel {
  /** 가격 */
  price: number;
  /** 수량 */
  size: number;
  /** 호가 건수 */
  count: number;
}

export interface OrderBook {
  /** 종목 코드 */
  symbol: string;
  /** 시간 */
  timestamp: number;
  /** 매수 호가 (매수 1호부터 순서대로) */
  bids: OrderBookLevel[];
  /** 매도 호가 (매도 1호부터 순서대로) */
  asks: OrderBookLevel[];
  /** 통화 */
  currency: string;
  /** 원본 데이터 */
  rawData: any;
}

export interface OrderRequest {
  /** 종목 코드 */
  symbol: string;
  /** 매수/매도 */
  side: OrderSide;
  /** 주문 유형 */
  orderType: OrderType;
  /** 수량 */
  quantity: number;
  /** 가격 (지정가 주문의 경우) */
  price?: number;
  /** 스탑 가격 (스탑 주문의 경우) */
  stopPrice?: number;
  /** 주문 유효기간 */
  timeInForce?: TimeInForce;
  /** 주문 유효일자 */
  goodTillDate?: Date;
  /** 주문 비고 */
  notes?: string;
  /** 사용자 정의 ID */
  clientOrderId?: string;
}

export interface Order {
  /** KSET 주문 ID */
  id: string;
  /** Provider 주문 ID */
  providerOrderId: string;
  /** 클라이언트 주문 ID */
  clientOrderId?: string;

  /** 주문 정보 */
  symbol: string;
  side: OrderSide;
  orderType: OrderType;
  quantity: number;
  price?: number;
  stopPrice?: number;
  timeInForce?: TimeInForce;

  /** 체결 정보 */
  status: OrderStatus;
  filledQuantity: number;
  remainingQuantity: number;
  averageFillPrice: number;
  fillPrice?: number;

  /** 시간 정보 */
  createdAt: Date;
  updatedAt: Date;
  filledAt?: Date;
  expiresAt?: Date;

  /** 금액 정보 */
  orderValue: number;
  filledValue: number;
  commission?: number;
  tax?: number;

  /** Provider 정보 */
  provider: string;

  /** 에러 정보 */
  errorMessage?: string;
  errorCode?: string;

  /** 원본 데이터 */
  rawData: any;
}

export interface Position {
  /** 종목 코드 */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 보유 수량 (양수: 매수, 음수: 공매도) */
  quantity: number;
  /** 평균 매입 단가 */
  averagePrice: number;
  /** 현재가 */
  currentPrice: number;
  /** 총 평가금액 */
  marketValue: number;
  /** 총 매입금액 */
  costBasis: number;
  /** 미실현 손익 */
  unrealizedPnL: number;
  /** 미실현 손익률 */
  unrealizedPnLRate: number;
  /** 실현 손익 */
  realizedPnL: number;
  /** 일일 손익 */
  dailyPnL: number;
  /** 최종 업데이트 시각 */
  updatedAt: Date;
  /** Provider */
  provider: string;
  /** 원본 데이터 */
  rawData: any;
}

// ============================================================================
// ACCOUNT TYPES
// ============================================================================

export interface AccountInfo {
  /** 계좌번호 */
  accountNumber: string;
  /** 계좌명 */
  accountName: string;
  /** 계좌 유형 */
  accountType: string;
  /** 계좌 상태 */
  accountStatus: 'active' | 'inactive' | 'suspended' | 'closed';
  /** 개설일 */
  openedAt: Date;
  /** 통화 */
  currency: string;
  /** Provider */
  provider: string;
}

export interface Balance {
  /** 통화 */
  currency: string;
  /** 예수금 */
  cash: number;
  /** 출금 가능 금액 */
  withdrawable: number;
  /** 주문 가능 금액 */
  orderable: number;
  ** 증거금 포함 예수금 */
  totalIncludingMargin: number;
  /** 증거금 */
  margin: number;
  /** 대출금 */
  loan: number;
  /** 업데이트 시각 */
  updatedAt: Date;
}

export interface Portfolio {
  /** 총 자산 */
  totalValue: number;
  /** 총 평가금액 */
  totalMarketValue: number;
  /** 총 매입금액 */
  totalCostBasis: number;
  /** 총 현금 */
  totalCash: number;
  /** 총 미실현 손익 */
  totalUnrealizedPnL: number;
  /** 총 미실현 손익률 */
  totalUnrealizedPnLRate: number;
  /** 총 실현 손익 */
  totalRealizedPnL: number;
  /** 일일 손익 */
  dailyPnL: number;
  /** 일일 손익률 */
  dailyPnLRate: number;
  /** 위험 자산 비율 */
  riskAssetRatio: number;
  /** 업데이트 시각 */
  updatedAt: Date;
}

// ============================================================================
// RESEARCH & ANALYTICS TYPES
// ============================================================================

export interface CompanyInfo {
  /** 종목 코드 */
  symbol: string;
  /** 종목명 */
  name: string;
  /** 영문명 */
  englishName: string;
  /** 시장 구분 */
  market: MarketType;
  /** 섹터 */
  sector: string;
  /** 산업 분류 */
  industry: string;

  // 기본 정보
  /** 대표자명 */
  ceo: string;
  /** 본사 주소 */
  address: string;
  /** 전화번호 */
  phone: string;
  /** 홈페이지 */
  website: string;
  /** 설립일 */
  foundedDate: Date;
  /** 상장일 */
  listingDate: Date;

  // 사업 정보
  /** 사업내용 */
  businessDescription: string;
  /** 주요제품 */
  mainProducts: string[];
  /** 관련회사 */
  relatedCompanies: string[];

  // 재무 정보
  /** 자본금 */
  capital: number;
  /** 자산총계 */
  totalAssets: number;
  /** 부채총계 */
  totalLiabilities: number;
  /** 자본총계 */
  totalEquity: number;

  /** Provider */
  provider: string;
  /** 원본 데이터 */
  rawData: any;
}

export interface FinancialData {
  /** 종목 코드 */
  symbol: string;
  /** 기간 유형 */
  period: 'quarterly' | 'annual';
  /** 기준일자 */
  asOfDate: Date;
  /** 통화 단위 */
  currency: string;

  // 손익계산서
  /** 매출액 */
  revenue: number;
  /** 매출원가 */
  costOfGoodsSold: number;
  /** 매출총이익 */
  grossProfit: number;
  /** 영업이익 */
  operatingIncome: number;
  /** 당기순이익 */
  netIncome: number;

  // 재무상태표
  /** 유동자산 */
  currentAssets: number;
  /** 비유동자산 */
  nonCurrentAssets: number;
  /** 유동부채 */
  currentLiabilities: number;
  /** 비유동부채 */
  nonCurrentLiabilities: number;
  /** 자본총계 */
  totalEquity: number;

  // 현금흐름표
  /** 영업활동현금흐름 */
  operatingCashFlow: number;
  /** 투자활동현금흐름 */
  investingCashFlow: number;
  /** 재무활동현금흐름 */
  financingCashFlow: number;

  // 주요 지표
  /** 주당순이익 (EPS) */
  earningsPerShare: number;
  /** 주당순자산 (BPS) */
  bookValuePerShare: number;
  /** ROE (%) */
  roe: number;
  /** ROA (%) */
  roa: number;
  /** 부채비율 (%) */
  debtRatio: number;
  /** 영업이익률 (%) */
  operatingMargin: number;
  /** 순이익률 (%) */
  netMargin: number;

  /** Provider */
  provider: string;
  /** 원본 데이터 */
  rawData: any;
}

export interface Disclosure {
  /** 공시 ID */
  id: string;
  /** 종목 코드 */
  symbol: string;
  /** 공시 제목 */
  title: string;
  /** 공시 내용 */
  content: string;
  /** 공시 시각 */
  publishedAt: Date;
  /** 공시자 */
  publisher: string;
  /** 공시 구분 */
  type: 'regular' | 'ir' | 'material' | 'ownership' | 'other';
  /** 중요 공시 여부 */
  isImportant: boolean;
  /** 첨부파일 URL */
  attachmentUrl?: string;
  /** Provider */
  provider: string;
  /** 원본 데이터 */
  rawData: any;
}

// ============================================================================
// PROVIDER TYPES
// ============================================================================

export interface ProviderCapabilities {
  /** 지원 기능 카테고리 */
  supportedCategories: string[];

  /** 시장 데이터 능력 */
  marketData: {
    /** 실시간 시세 */
    realTimeQuotes: boolean;
    /** 과거 데이터 */
    historicalData: boolean;
    /** 호가 정보 */
    orderBookDepth: number;
    /** 기술적 지표 */
    technicalIndicators: string[];
    /** 업데이트 빈도 (ms) */
    updateFrequency: number;
  };

  /** 거래 능력 */
  trading: {
    /** 지원 주문 유형 */
    orderTypes: OrderType[];
    /** 알고리즘 트레이딩 */
    algorithmicTrading: boolean;
    /** 장전/장후 거래 */
    preMarketTrading: boolean;
    /** 대량 주문 */
    bulkOperations: boolean;
    /** 평균 실행 속도 (ms) */
    executionSpeed: number;
  };

  /** 인증 능력 */
  authentication: {
    /** 인증서 인증 */
    certificateAuth: boolean;
    /** API 키 인증 */
    apiKeyAuth: boolean;
    /** OAuth 지원 */
    oauthSupport: boolean;
    /** MFA 필수 여부 */
    mfaRequired: boolean;
  };

  /** 제한 사항 */
  limitations: {
    /** 요청 제한 */
    rateLimits: RateLimit[];
    /** 일일 제한 */
    dailyLimits: DailyLimit[];
    /** 거래 시간 */
    marketHours: TradingHours;
    /** 지원 시장 */
    supportedMarkets: MarketType[];
  };
}

export interface RateLimit {
  /** 엔드포인트 */
  endpoint: string;
  /** 제한 횟수 */
  limit: number;
  /** 시간창 (ms) */
  window: number;
}

export interface DailyLimit {
  /** 제한 유형 */
  type: string;
  /** 일일 제한 */
  limit: number;
}

export interface TradingHours {
  /** 타임존 */
  timezone: string;
  /** 정규장 시간 */
  regular: { open: string; close: string };
  /** 점심시간 */
  break?: { start: string; end: string };
  /** 장전 시간 */
  preMarket?: { open: string; close: string };
  /** 장후 시간 */
  afterHours?: { open: string; close: string };
}

export interface AuthCredentials {
  /** Provider 유형 */
  providerType: string;
  /** API 키 */
  apiKey?: string;
  /** 비밀 키 */
  secret?: string;
  /** 인증서 경로 */
  certificatePath?: string;
  /** 인증서 비밀번호 */
  certificatePassword?: string;
  /** 계좌번호 */
  accountNumber?: string;
  /** 추가 정보 */
  additional?: Record<string, any>;
}

export interface AuthResult {
  /** 성공 여부 */
  success: boolean;
  /** 세션 ID */
  sessionId?: string;
  /** 만료 시각 */
  expiresAt?: Date;
  /** 접근 토큰 */
  accessToken?: string;
  /** 리프레시 토큰 */
  refreshToken?: string;
  /** 에러 메시지 */
  error?: string;
  /** Provider 정보 */
  providerInfo?: any;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

export interface ProviderConfig {
  /** Provider ID */
  id: string;
  /** Provider명 */
  name: string;
  /** 버전 */
  version: string;

  /** API 엔드포인트 */
  apiEndpoints: {
    rest?: string;
    websocket?: string;
    certification?: string;
  };

  /** 인증 정보 */
  credentials: AuthCredentials;

  /** 환경 설정 */
  environment: 'development' | 'staging' | 'production';

  /** 로그 레벨 */
  logLevel: 'error' | 'warn' | 'info' | 'debug';

  /** 연결 설정 */
  connection: {
    timeout: number;
    retryAttempts: number;
    retryDelay: number;
  };

  /** 캐시 설정 */
  cache: {
    enabled: boolean;
    ttl: number;
  };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class KSETError extends Error {
  constructor(
    message: string,
    public provider?: string,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class AuthenticationError extends KSETError {}
export class NetworkError extends KSETError {}
export class DataNotFoundError extends KSETError {}
export class InvalidSymbolError extends KSETError {}
export class InvalidOrderError extends KSETError {}
export class InsufficientFundsError extends KSETError {}
export class MarketClosedError extends KSETError {}
export class RateLimitError extends KSETError {}
export class ComplianceError extends KSETError {}
export class ConfigurationError extends KSETError {}

// ============================================================================
// CALLBACK & EVENT TYPES
// ============================================================================

export type RealTimeCallback = (data: MarketData) => void;
export type OrderCallback = (order: Order) => void;
export type BalanceCallback = (balance: Balance) => void;
export type PositionCallback = (position: Position) => void;
export type ErrorCallback = (error: KSETError) => void;

export interface KSETEventHandlers {
  onMarketData?: RealTimeCallback;
  onOrderUpdate?: OrderCallback;
  onBalanceUpdate?: BalanceCallback;
  onPositionUpdate?: PositionCallback;
  onError?: ErrorCallback;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface Subscription {
  /** 구독 ID */
  id: string;
  /** 구독 종목 */
  symbols: string[];
  /** 구독 상태 */
  active: boolean;
  /** 생성 시각 */
  createdAt: Date;
  /** 해제 함수 */
  unsubscribe: () => Promise<void>;
}

// ============================================================================
// VALIDATION & RESPONSE TYPES
// ============================================================================

export interface ValidationResult {
  /** 유효성 여부 */
  valid: boolean;
  /** 에러 메시지 */
  error?: string;
  /** 에러 코드 */
  errorCode?: string;
  /** 상세 정보 */
  details?: any;
}

export interface PaginationInfo {
  /** 현재 페이지 */
  currentPage: number;
  /** 페이지당 건수 */
  pageSize: number;
  /** 전체 건수 */
  totalCount: number;
  /** 전체 페이지 수 */
  totalPages: number;
  /** 다음 페이지 여부 */
  hasNext: boolean;
  /** 이전 페이지 여부 */
  hasPrevious: boolean;
}

export interface ApiResponse<T = any> {
  /** 성공 여부 */
  success: boolean;
  /** 데이터 */
  data?: T;
  /** 에러 정보 */
  error?: string;
  /** Provider 정보 */
  provider: string;
  /** 응답 시각 */
  timestamp: number;
  /** 요청 ID */
  requestId?: string;
  /** 페이지 정보 */
  pagination?: PaginationInfo;
}