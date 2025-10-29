/**
 * KSET Base Provider Implementation
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 */

import {
  IKSETProvider,
  ProviderConfig,
  AuthCredentials,
  AuthResult,
  ProviderHealthStatus,
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
  ApiResponse,
  RealTimeCallback,
  OrderCallback,
  Subscription,
  HistoricalDataPeriod,
  OrderModification,
  OrderFilters,
  TransactionFilters,
  PaginationOptions,
  MarketInfo,
  Holiday,
  RateLimitInfo,
  ErrorContext,
  ErrorHandler
} from '@/interfaces';

import {
  ProviderCapabilities,
  OrderStatus,
  MarketType,
  ResearchType,
  DisclosureType,
  FinancialPeriod
} from '@/types';

import {
  KSETError,
  KSETErrorFactory,
  RetryManager,
  CircuitBreaker,
  ErrorRecoveryManager,
  DefaultErrorHandler,
  ConsoleLogger,
  ERROR_CODES
} from '@/errors';

/**
 * KSET Provider의 추상 기본 클래스
 * 모든 Provider는 이 클래스를 상속받아 구현해야 함
 */
export abstract class KSETProvider implements IKSETProvider {
  // Abstract properties - 하위 클래스에서 반드시 구현
  abstract readonly id: string;
  abstract readonly name: string;
  abstract readonly version: string;
  abstract readonly capabilities: ProviderCapabilities;

  // Protected properties
  protected config?: ProviderConfig;
  protected isAuthenticated = false;
  protected authResult?: AuthResult;
  protected lastHeartbeat = new Date();
  protected errorHandler: ErrorHandler;
  protected circuitBreaker: CircuitBreaker;
  protected errorRecovery: ErrorRecoveryManager;

  // 실시간 데이터 관련
  protected realTimeSubscriptions = new Map<string, Subscription>();
  protected realTimeEnabled = false;
  protected webSocketProvider?: any; // WebSocket provider instance

  // Constructor
  constructor() {
    this.errorHandler = new DefaultErrorHandler();
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 50,
      minimumThroughput: 10,
      timeout: 60000,
      halfOpenMaxCalls: 5
    });
    this.errorRecovery = new ErrorRecoveryManager();
  }

  // ==========================================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================================

  /**
   * Provider 초기화
   */
  async initialize(config: ProviderConfig): Promise<void> {
    this.validateConfig(config);
    this.config = config;

    try {
      await this.doInitialize();
      this.setupErrorHandlers();
      this.setupHealthCheck();
    } catch (error) {
      throw this.handleError(error as Error, 'initialize');
    }
  }

  /**
   * 인증 수행
   */
  async authenticate(credentials: AuthCredentials): Promise<AuthResult> {
    if (!this.config) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Provider not initialized'
      );
    }

    try {
      this.authResult = await this.circuitBreaker.execute(async () => {
        return await this.doAuthenticate(credentials);
      });

      this.isAuthenticated = true;
      this.lastHeartbeat = new Date();

      return this.authResult;
    } catch (error) {
      const ksetError = this.handleError(error as Error, 'authenticate');

      // 에러 복구 시도
      const recovery = await this.errorRecovery.attemptRecovery(ksetError, {
        provider: this.id,
        endpoint: 'authenticate'
      });

      if (recovery.recovered) {
        return await this.authenticate(credentials); // 재시도
      }

      throw ksetError;
    }
  }

  /**
   * Provider 연결 해제
   */
  async disconnect(): Promise<void> {
    try {
      await this.doDisconnect();
      this.isAuthenticated = false;
      this.authResult = undefined;
    } catch (error) {
      throw this.handleError(error as Error, 'disconnect');
    }
  }

  /**
   * Provider 상태 확인
   */
  async getHealthStatus(): Promise<ProviderHealthStatus> {
    try {
      const health = await this.doHealthCheck();
      this.lastHeartbeat = new Date();
      return health;
    } catch (error) {
      return {
        provider: this.id,
        connected: false,
        lastHeartbeat: this.lastHeartbeat,
        apiStatus: 'down',
        latency: -1,
        errorRate: 100,
        details: { error: (error as Error).message }
      };
    }
  }

  // ==========================================================================
  // MARKET DATA APIS
  // ==========================================================================

  /**
   * 실시간 시세 데이터 조회
   */
  async getMarketData(symbols: string[]): Promise<ApiResponse<MarketData[]>> {
    this.validateAuthenticated();
    this.validateSymbols(symbols);

    return await this.executeWithValidation(
      () => this.doGetMarketData(symbols),
      'getMarketData',
      { symbols }
    );
  }

  /**
   * 과거 데이터 조회
   */
  async getHistoricalData(
    symbol: string,
    period: HistoricalDataPeriod,
    options?: any
  ): Promise<ApiResponse<any[]>> {
    this.validateAuthenticated();
    this.validateSymbols([symbol]);

    return await this.executeWithValidation(
      () => this.doGetHistoricalData(symbol, period, options),
      'getHistoricalData',
      { symbol, period, options }
    );
  }

  /**
   * 호가 정보 조회
   */
  async getOrderBook(symbol: string, depth?: number): Promise<ApiResponse<OrderBook>> {
    this.validateAuthenticated();
    this.validateSymbols([symbol]);

    return await this.executeWithValidation(
      () => this.doGetOrderBook(symbol, depth),
      'getOrderBook',
      { symbol, depth }
    );
  }

  /**
   * 실시간 데이터 구독
   */
  async subscribeToRealTimeData(
    symbols: string[],
    callback: RealTimeCallback
  ): Promise<Subscription> {
    this.validateAuthenticated();
    this.validateSymbols(symbols);

    if (!this.realTimeEnabled) {
      await this.enableRealTimeData();
    }

    return await this.executeWithValidation(
      () => this.doSubscribeToRealTimeData(symbols, callback),
      'subscribeToRealTimeData',
      { symbols }
    );
  }

  /**
   * 종목 정보 조회
   */
  async getSymbols(symbols?: string[]): Promise<ApiResponse<any[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetSymbols(symbols),
      'getSymbols',
      { symbols }
    );
  }

  // ==========================================================================
  // TRADING APIS
  // ==========================================================================

  /**
   * 주문 생성
   */
  async placeOrder(order: OrderRequest): Promise<ApiResponse<Order>> {
    this.validateAuthenticated();
    this.validateOrder(order);

    return await this.executeWithValidation(
      () => this.doPlaceOrder(order),
      'placeOrder',
      { order }
    );
  }

  /**
   * 주문 수정
   */
  async modifyOrder(orderId: string, modifications: OrderModification): Promise<ApiResponse<Order>> {
    this.validateAuthenticated();
    this.validateOrderId(orderId);

    return await this.executeWithValidation(
      () => this.doModifyOrder(orderId, modifications),
      'modifyOrder',
      { orderId, modifications }
    );
  }

  /**
   * 주문 취소
   */
  async cancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    this.validateAuthenticated();
    this.validateOrderId(orderId);

    return await this.executeWithValidation(
      () => this.doCancelOrder(orderId),
      'cancelOrder',
      { orderId }
    );
  }

  /**
   * 주문 상태 조회
   */
  async getOrder(orderId: string): Promise<ApiResponse<Order>> {
    this.validateAuthenticated();
    this.validateOrderId(orderId);

    return await this.executeWithValidation(
      () => this.doGetOrder(orderId),
      'getOrder',
      { orderId }
    );
  }

  /**
   * 주문 목록 조회
   */
  async getOrders(filters?: OrderFilters, options?: PaginationOptions): Promise<ApiResponse<Order[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetOrders(filters, options),
      'getOrders',
      { filters, options }
    );
  }

  /**
   * 주문 상태 변경 구독
   */
  async subscribeToOrderUpdates(callback: OrderCallback): Promise<Subscription> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doSubscribeToOrderUpdates(callback),
      'subscribeToOrderUpdates',
      {}
    );
  }

  // ==========================================================================
  // ACCOUNT APIS
  // ==========================================================================

  /**
   * 계좌 정보 조회
   */
  async getAccountInfo(): Promise<ApiResponse<AccountInfo>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetAccountInfo(),
      'getAccountInfo',
      {}
    );
  }

  /**
   * 예수금 정보 조회
   */
  async getBalance(): Promise<ApiResponse<Balance>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetBalance(),
      'getBalance',
      {}
    );
  }

  /**
   * 보유 종목 조회
   */
  async getPositions(symbols?: string[]): Promise<ApiResponse<Position[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetPositions(symbols),
      'getPositions',
      { symbols }
    );
  }

  /**
   * 포트폴리오 조회
   */
  async getPortfolio(): Promise<ApiResponse<Portfolio>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetPortfolio(),
      'getPortfolio',
      {}
    );
  }

  /**
   * 입출금 내역 조회
   */
  async getTransactions(filters?: TransactionFilters, options?: PaginationOptions): Promise<ApiResponse<any[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetTransactions(filters, options),
      'getTransactions',
      { filters, options }
    );
  }

  // ==========================================================================
  // RESEARCH APIS
  // ==========================================================================

  /**
   * 기업 정보 조회
   */
  async getCompanyInfo(symbol: string): Promise<ApiResponse<CompanyInfo>> {
    this.validateAuthenticated();
    this.validateSymbols([symbol]);

    return await this.executeWithValidation(
      () => this.doGetCompanyInfo(symbol),
      'getCompanyInfo',
      { symbol }
    );
  }

  /**
   * 재무 정보 조회
   */
  async getFinancials(
    symbol: string,
    period: FinancialPeriod,
    options?: any
  ): Promise<ApiResponse<FinancialData[]>> {
    this.validateAuthenticated();
    this.validateSymbols([symbol]);

    return await this.executeWithValidation(
      () => this.doGetFinancials(symbol, period, options),
      'getFinancials',
      { symbol, period, options }
    );
  }

  /**
   * 공시 정보 조회
   */
  async getDisclosures(
    symbol: string,
    filters?: any,
    options?: PaginationOptions
  ): Promise<ApiResponse<Disclosure[]>> {
    this.validateAuthenticated();
    this.validateSymbols([symbol]);

    return await this.executeWithValidation(
      () => this.doGetDisclosures(symbol, filters, options),
      'getDisclosures',
      { symbol, filters, options }
    );
  }

  /**
   * 리서치 데이터 조회
   */
  async getResearch(symbol: string, type: ResearchType, options?: any): Promise<ApiResponse<any[]>> {
    this.validateAuthenticated();
    this.validateSymbols([symbol]);

    return await this.executeWithValidation(
      () => this.doGetResearch(symbol, type, options),
      'getResearch',
      { symbol, type, options }
    );
  }

  // ==========================================================================
  // UTILITY APIS
  // ==========================================================================

  /**
   * 시장 정보 조회
   */
  async getMarketInfo(market?: MarketType): Promise<ApiResponse<MarketInfo>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetMarketInfo(market),
      'getMarketInfo',
      { market }
    );
  }

  /**
   * 시장 상태 조회
   */
  async getMarketStatus(market?: MarketType): Promise<ApiResponse<string>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetMarketStatus(market),
      'getMarketStatus',
      { market }
    );
  }

  /**
   * 휴장일 정보 조회
   */
  async getMarketHolidays(year: number, month?: number): Promise<ApiResponse<Holiday[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetMarketHolidays(year, month),
      'getMarketHolidays',
      { year, month }
    );
  }

  // ==========================================================================
  // RESEARCH APIS
  // ==========================================================================

  /**
   * 기업 정보 검색
   */
  async searchCompany(query: string, options?: PaginationOptions): Promise<ApiResponse<CompanyInfo[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doSearchCompany(query, options),
      'searchCompany',
      { query, options }
    );
  }

  /**
   * 재무 정보 조회
   */
  async getFinancialData(symbol: string, period: FinancialPeriod): Promise<ApiResponse<FinancialData[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetFinancialData(symbol, period),
      'getFinancialData',
      { symbol, period }
    );
  }

  /**
   * 공시 정보 조회
   */
  async getDisclosures(symbol: string, options?: any): Promise<ApiResponse<Disclosure[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetDisclosures(symbol, options),
      'getDisclosures',
      { symbol, options }
    );
  }

  /**
   * 산업 분석
   */
  async analyzeIndustry(industryCode: string): Promise<ApiResponse<any>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doAnalyzeIndustry(industryCode),
      'analyzeIndustry',
      { industryCode }
    );
  }

  /**
   * 투자 의견 조회
   */
  async getInvestmentOpinion(symbol: string): Promise<ApiResponse<any>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetInvestmentOpinion(symbol),
      'getInvestmentOpinion',
      { symbol }
    );
  }

  /**
   * 경제 지표 조회
   */
  async getEconomicIndicators(): Promise<ApiResponse<any[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetEconomicIndicators(),
      'getEconomicIndicators'
    );
  }

  /**
   * 리서치 리포트 조회
   */
  async getResearchReports(symbol: string, options?: any): Promise<ApiResponse<any[]>> {
    this.validateAuthenticated();

    return await this.executeWithValidation(
      () => this.doGetResearchReports(symbol, options),
      'getResearchReports',
      { symbol, options }
    );
  }

  /**
   * Provider 기능 확인
   */
  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  /**
   * 요청 제한 정보 조회
   */
  async getRateLimits(): Promise<RateLimitInfo[]> {
    // 기본 구현 - 하위 클래스에서 재정의 가능
    return [];
  }

  // ==========================================================================
  // PROTECTED ABSTRACT METHODS - 하위 클래스에서 반드시 구현
  // ==========================================================================

  protected abstract doInitialize(): Promise<void>;
  protected abstract doAuthenticate(credentials: AuthCredentials): Promise<AuthResult>;
  protected abstract doDisconnect(): Promise<void>;
  protected abstract doHealthCheck(): Promise<ProviderHealthStatus>;

  protected abstract doGetMarketData(symbols: string[]): Promise<ApiResponse<MarketData[]>>;
  protected abstract doGetHistoricalData(symbol: string, period: HistoricalDataPeriod, options?: any): Promise<ApiResponse<any[]>>;
  protected abstract doGetOrderBook(symbol: string, depth?: number): Promise<ApiResponse<OrderBook>>;
  protected abstract doSubscribeToRealTimeData(symbols: string[], callback: RealTimeCallback): Promise<Subscription>;
  protected abstract doGetSymbols(symbols?: string[]): Promise<ApiResponse<any[]>>;

  protected abstract doPlaceOrder(order: OrderRequest): Promise<ApiResponse<Order>>;
  protected abstract doModifyOrder(orderId: string, modifications: OrderModification): Promise<ApiResponse<Order>>;
  protected abstract doCancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message?: string }>>;
  protected abstract doGetOrder(orderId: string): Promise<ApiResponse<Order>>;
  protected abstract doGetOrders(filters?: OrderFilters, options?: PaginationOptions): Promise<ApiResponse<Order[]>>;
  protected abstract doSubscribeToOrderUpdates(callback: OrderCallback): Promise<Subscription>;

  protected abstract doGetAccountInfo(): Promise<ApiResponse<AccountInfo>>;
  protected abstract doGetBalance(): Promise<ApiResponse<Balance>>;
  protected abstract doGetPositions(symbols?: string[]): Promise<ApiResponse<Position[]>>;
  protected abstract doGetPortfolio(): Promise<ApiResponse<Portfolio>>;
  protected abstract doGetTransactions(filters?: TransactionFilters, options?: PaginationOptions): Promise<ApiResponse<any[]>>;

  protected abstract doGetCompanyInfo(symbol: string): Promise<ApiResponse<CompanyInfo>>;
  protected abstract doGetFinancials(symbol: string, period: FinancialPeriod, options?: any): Promise<ApiResponse<FinancialData[]>>;
  protected abstract doGetDisclosures(symbol: string, filters?: any, options?: PaginationOptions): Promise<ApiResponse<Disclosure[]>>;
  protected abstract doGetResearch(symbol: string, type: ResearchType, options?: any): Promise<ApiResponse<any[]>>;

  protected abstract doGetMarketInfo(market?: MarketType): Promise<ApiResponse<MarketInfo>>;
  protected abstract doGetMarketStatus(market?: MarketType): Promise<ApiResponse<string>>;
  protected abstract doGetMarketHolidays(year: number, month?: number): Promise<ApiResponse<Holiday[]>>;

  // ==========================================================================
  // PROTECTED HELPER METHODS
  // ==========================================================================

  /**
   * 유효성 검증과 함께 함수 실행
   */
  protected async executeWithValidation<T>(
    fn: () => Promise<ApiResponse<T>>,
    operation: string,
    context?: any
  ): Promise<ApiResponse<T>> {
    try {
      return await this.circuitBreaker.execute(async () => {
        return await RetryManager.executeWithRetry(fn, {
          maxAttempts: 3,
          initialDelay: 1000,
          maxDelay: 10000,
          backoffMultiplier: 2,
          retryableErrors: [
            ERROR_CODES.NETWORK_ERROR,
            ERROR_CODES.CONNECTION_TIMEOUT,
            ERROR_CODES.RATE_LIMIT_EXCEEDED
          ]
        }, this.errorHandler);
      });
    } catch (error) {
      const ksetError = this.handleError(error as Error, operation, context);

      // 에러 복구 시도
      const recovery = await this.errorRecovery.attemptRecovery(ksetError, {
        provider: this.id,
        endpoint: operation,
        request: context
      });

      if (recovery.recovered) {
        // 복구 성공 시 재시도
        return await fn();
      }

      return {
        success: false,
        error: ksetError.message,
        provider: this.id,
        timestamp: Date.now()
      };
    }
  }

  /**
   * 에러 처리
   */
  protected handleError(error: Error, operation: string, context?: any): KSETError {
    this.errorHandler.handle(error, {
      provider: this.id,
      endpoint: operation,
      request: context
    });

    if (error instanceof KSETError) {
      return error;
    }

    // Provider API 에러 변환
    if (this.isProviderError(error)) {
      return KSETErrorFactory.fromProviderResponse(this.id, error);
    }

    // 일반 에러 변환
    return KSETErrorFactory.create(
      ERROR_CODES.UNKNOWN,
      `${operation} failed: ${error.message}`,
      this.id,
      { originalError: error, context }
    );
  }

  /**
   * Provider 에러 여부 확인
   */
  protected isProviderError(error: any): boolean {
    // 하위 클래스에서 재정의하여 Provider 특화 에러 판별
    return false;
  }

  /**
   * 에러 응답 생성
   */
  protected createErrorResponse<T>(error: KSETError): ApiResponse<T> {
    return {
      success: false,
      error: error.message,
      provider: this.id,
      timestamp: Date.now()
    };
  }

  /**
   * 성공 응답 생성
   */
  protected createSuccessResponse<T>(data: T): ApiResponse<T> {
    return {
      success: true,
      data,
      provider: this.id,
      timestamp: Date.now()
    };
  }

  // ==========================================================================
  // VALIDATION METHODS
  // ==========================================================================

  /**
   * 초기화 여부 확인
   */
  protected validateInitialized(): void {
    if (!this.config) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Provider not initialized',
        this.id
      );
    }
  }

  /**
   * 인증 여부 확인
   */
  protected validateAuthenticated(): void {
    this.validateInitialized();

    if (!this.isAuthenticated) {
      throw KSETErrorFactory.create(
        ERROR_CODES.AUTH_FAILED,
        'Provider not authenticated',
        this.id
      );
    }
  }

  /**
   * 설정 유효성 검증
   */
  protected validateConfig(config: ProviderConfig): void {
    if (!config) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Configuration is required',
        this.id
      );
    }

    if (!config.credentials) {
      throw KSETErrorFactory.create(
        ERROR_CODES.MISSING_REQUIRED_CONFIG,
        'Credentials are required',
        this.id
      );
    }
  }

  /**
   * 종목 코드 유효성 검증
   */
  protected validateSymbols(symbols: string[]): void {
    if (!symbols || symbols.length === 0) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'At least one symbol is required',
        this.id
      );
    }

    for (const symbol of symbols) {
      if (!symbol || typeof symbol !== 'string') {
        throw KSETErrorFactory.create(
          ERROR_CODES.INVALID_SYMBOL,
          `Invalid symbol: ${symbol}`,
          this.id
        );
      }
    }
  }

  /**
   * 주문 유효성 검증
   */
  protected validateOrder(order: OrderRequest): void {
    if (!order) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order is required',
        this.id
      );
    }

    if (!order.symbol) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order symbol is required',
        this.id
      );
    }

    if (!order.side) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order side is required',
        this.id
      );
    }

    if (!order.orderType) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order type is required',
        this.id
      );
    }

    if (!order.quantity || order.quantity <= 0) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order quantity must be greater than 0',
        this.id
      );
    }

    // 지정가 주문의 경우 가격 검증
    if (['LIMIT', 'STOP_LIMIT'].includes(order.orderType) && (!order.price || order.price <= 0)) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Price is required for limit orders',
        this.id
      );
    }

    // 스탑 주문의 경우 스탑 가격 검증
    if (['STOP', 'STOP_LIMIT'].includes(order.orderType) && (!order.stopPrice || order.stopPrice <= 0)) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Stop price is required for stop orders',
        this.id
      );
    }
  }

  /**
   * 주문 ID 유효성 검증
   */
  protected validateOrderId(orderId: string): void {
    if (!orderId || typeof orderId !== 'string') {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'Order ID is required and must be a string',
        this.id
      );
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 에러 핸들러 설정
   */
  protected setupErrorHandlers(): void {
    // Provider 특화 에러 핸들러 설정
    // 하위 클래스에서 재정의 가능
  }

  /**
   * 헬스 체크 설정
   */
  protected setupHealthCheck(): void {
    // 주기적인 헬스 체크 설정
    // 하위 클래스에서 재정의 가능
  }

  /**
   * 요청 URL 생성
   */
  protected buildUrl(path: string, params?: Record<string, any>): string {
    const baseUrl = this.config?.apiEndpoints?.rest;
    if (!baseUrl) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'REST API endpoint not configured',
        this.id
      );
    }

    let url = `${baseUrl}${path}`;
    if (params && Object.keys(params).length > 0) {
      const queryString = new URLSearchParams(params).toString();
      url += `?${queryString}`;
    }

    return url;
  }

  /**
   * 타임스탬프 생성
   */
  protected createTimestamp(): number {
    return Date.now();
  }

  /**
   * 요청 ID 생성
   */
  protected createRequestId(): string {
    return `${this.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // REAL-TIME DATA MANAGEMENT
  // ==========================================================================

  /**
   * 실시간 데이터 활성화
   */
  async enableRealTimeData(): Promise<void> {
    if (this.realTimeEnabled) {
      return;
    }

    try {
      // WebSocket Provider 생성 및 연결
      await this.initializeWebSocketProvider();
      this.realTimeEnabled = true;
    } catch (error) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NETWORK_ERROR,
        `Failed to enable real-time data: ${error}`,
        this.id
      );
    }
  }

  /**
   * 실시간 데이터 비활성화
   */
  async disableRealTimeData(): Promise<void> {
    if (!this.realTimeEnabled) {
      return;
    }

    try {
      // 모든 구독 해제
      for (const subscription of this.realTimeSubscriptions.values()) {
        await subscription.unsubscribe();
      }
      this.realTimeSubscriptions.clear();

      // WebSocket 연결 해제
      if (this.webSocketProvider) {
        await this.webSocketProvider.disconnect();
        this.webSocketProvider = undefined;
      }

      this.realTimeEnabled = false;
    } catch (error) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NETWORK_ERROR,
        `Failed to disable real-time data: ${error}`,
        this.id
      );
    }
  }

  /**
   * WebSocket Provider 초기화
   */
  protected async initializeWebSocketProvider(): Promise<void> {
    // 하위 클래스에서 구현
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_IMPLEMENTED,
      'initializeWebSocketProvider must be implemented by subclass',
      this.id
    );
  }

  /**
   * 실시간 구독 관리
   */
  protected addRealTimeSubscription(subscription: Subscription): void {
    this.realTimeSubscriptions.set(subscription.id, subscription);
  }

  protected removeRealTimeSubscription(subscriptionId: string): void {
    this.realTimeSubscriptions.delete(subscriptionId);
  }

  protected getRealTimeSubscription(subscriptionId: string): Subscription | undefined {
    return this.realTimeSubscriptions.get(subscriptionId);
  }

  /**
   * 모든 실시간 구독 해제
   */
  async unsubscribeAllRealTimeData(): Promise<void> {
    const unsubscribes = Array.from(this.realTimeSubscriptions.values()).map(
      subscription => subscription.unsubscribe()
    );

    await Promise.allSettled(unsubscribes);
    this.realTimeSubscriptions.clear();
  }

  /**
   * 실시간 데이터 상태 조회
   */
  getRealTimeDataStatus(): {
    enabled: boolean;
    subscriptionCount: number;
    activeSubscriptions: string[];
    webSocketConnected: boolean;
  } {
    return {
      enabled: this.realTimeEnabled,
      subscriptionCount: this.realTimeSubscriptions.size,
      activeSubscriptions: Array.from(this.realTimeSubscriptions.keys()),
      webSocketConnected: this.webSocketProvider?.getState() === 'connected' || false
    };
  }

  /**
   * 구독 ID 생성
   */
  protected createSubscriptionId(): string {
    return `${this.id}-sub-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 실시간 데이터 재연결
   */
  async reconnectRealTimeData(): Promise<void> {
    if (!this.realTimeEnabled) {
      return;
    }

    try {
      // 현재 구독 정보 저장
      const currentSubscriptions = new Map(this.realTimeSubscriptions);

      // 실시간 데이터 재활성화
      await this.disableRealTimeData();
      await this.enableRealTimeData();

      // 구독 복원
      // 실제 구독 복원 로직은 하위 클래스에서 구현
    } catch (error) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NETWORK_ERROR,
        `Failed to reconnect real-time data: ${error}`,
        this.id
      );
    }
  }

  // ==========================================================================
  // RESEARCH ABSTRACT METHODS
  // ==========================================================================

  /**
   * 기업 정보 검색 구현 (하위 클래스에서 구현)
   */
  protected async doSearchCompany(query: string, options?: PaginationOptions): Promise<CompanyInfo[]> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Company search not supported by this provider',
      this.id
    );
  }

  /**
   * 재무 정보 조회 구현 (하위 클래스에서 구현)
   */
  protected async doGetFinancialData(symbol: string, period: FinancialPeriod): Promise<FinancialData[]> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Financial data not supported by this provider',
      this.id
    );
  }

  /**
   * 공시 정보 조회 구현 (하위 클래스에서 구현)
   */
  protected async doGetDisclosures(symbol: string, options?: any): Promise<Disclosure[]> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Disclosures not supported by this provider',
      this.id
    );
  }

  /**
   * 산업 분석 구현 (하위 클래스에서 구현)
   */
  protected async doAnalyzeIndustry(industryCode: string): Promise<any> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Industry analysis not supported by this provider',
      this.id
    );
  }

  /**
   * 투자 의견 조회 구현 (하위 클래스에서 구현)
   */
  protected async doGetInvestmentOpinion(symbol: string): Promise<any> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Investment opinions not supported by this provider',
      this.id
    );
  }

  /**
   * 경제 지표 조회 구현 (하위 클래스에서 구현)
   */
  protected async doGetEconomicIndicators(): Promise<any[]> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Economic indicators not supported by this provider',
      this.id
    );
  }

  /**
   * 리서치 리포트 조회 구현 (하위 클래스에서 구현)
   */
  protected async doGetResearchReports(symbol: string, options?: any): Promise<any[]> {
    throw KSETErrorFactory.create(
      ERROR_CODES.NOT_SUPPORTED,
      'Research reports not supported by this provider',
      this.id
    );
  }
}