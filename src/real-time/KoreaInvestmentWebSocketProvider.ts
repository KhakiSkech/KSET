/**
 * Korea Investment Securities WebSocket Provider
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 한국투자증권 실시간 데이터 WebSocket 전송 Provider
 */

import { WebSocketManager } from './WebSocketManager';
import { WebSocketConfig } from './WebSocketManager';
import { SubscriptionInfo } from './WebSocketManager';
import { MarketData, Order, Balance, Position } from '@/interfaces';
import { MarketType } from '@/types';
import { KSETErrorFactory, ERROR_CODES } from '@/errors';

/**
 * 한국투자증권 WebSocket 연결 설정
 */
interface KoreaInvestmentWebSocketConfig extends WebSocketConfig {
  apiKey: string;
  secret: string;
  accountNumber: string;
  approvalKey?: string;
  environment: 'development' | 'production';
}

/**
 * 한국투자증권 WebSocket 메시지 타입
 */
enum KoreaInvestmentMessageType {
  // 실시간 시세
  H0STCNT0 = 'H0STCNT0', // 주식 현재가
  H0STASP0 = 'H0STASP0', // 주식 호가
  H0STCNI0 = 'H0STCNI0', // 업종 현재가

  // 체결 정보
  H0STCNI1 = 'H0STCNI1', // 주식 체결가
  H0FSTCNT0 = 'H0FSTCNT0', // ELW 현재가

  // 잔고 정보
  H0TS00000 = 'H0TS00000', // 주문 체결 통보
  H0TS00001 = 'H0TS00001', // 주문 정정/취소 통보

  // 기타
  LOGIN = 'LOGIN',
  ERROR = 'ERROR'
}

/**
 * 한국투자증권 WebSocket 응답 데이터
 */
interface KoreaInvestmentResponse {
  header: {
    tr_id: string;
    tr_cont: string;
    glob_id: string;
    error_code: string;
    error_msg: string;
  };
  output?: any[];
  output2?: any[];
}

/**
 * 한국투자증권 실시간 시세 데이터
 */
interface KoreaInvestmentMarketData {
  // 종목 기본 정보
  mksc_shrn_iscd: string;    // 종목 코드
  stk_name: string;          // 종목명
  bstp_kor_isnm: string;     // 한글 종목약명

  // 가격 정보
  stck_prpr: number;         // 현재가
  stck_oprc: number;         // 시가
  stck_hgpr: number;         // 고가
  stck_lwpr: number;         // 저가
  prdy_vrsss_prc: number;    // 전일 종가
  prdy_clpr_vrss: number;    // 전일 대비

  // 거래 정보
  acml_vol: number;          // 누적 거래량
  acml_tr_pbmn: number;      // 누적 거래대금

  // 호가 정보
  askp1: number;             // 매도 1호가
  bidp1: number;             // 매수 1호가
  askp_rsqn1: number;        // 매도 1호가 잔량
  bidp_rsqn1: number;        // 매수 1호가 잔량

  // 변동 정보
  prdy_vrss_sign: string;    // 전일 대비 부호
  prdy_vrss_rate: number;    // 전일 대비 등락률

  // 시간 정보
  stck_bsop_date: string;    // 영업일자
  stck_cntg_hour: string;    // 체결 시간
  recv_time: string;         // 수신 시간
}

/**
 * 한국투자증권 WebSocket Provider
 */
export class KoreaInvestmentWebSocketProvider extends WebSocketManager {
  private config: KoreaInvestmentWebSocketConfig;
  private approvalKey?: string;
  private connectionId?: string;

  constructor(config: KoreaInvestmentWebSocketConfig) {
    super(config);
    this.config = config;
    this.connectionId = this.generateConnectionId();
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * WebSocket 연결
   */
  async connect(): Promise<void> {
    // 한국투자증권 웹소켓 인증 처리
    await this.authenticate();

    const wsUrl = this.buildWebSocketUrl();
    this.config.url = wsUrl;

    // 인증 헤더 설정
    this.config.headers = {
      'User-Agent': 'KSET/1.0.0',
      'Connection-Id': this.connectionId,
      'Api-Key': this.config.apiKey,
      'Secret-Key': this.config.secret
    };

    await super.connect();
  }

  /**
   * 한국투자증권 인증 처리
   */
  private async authenticate(): Promise<void> {
    try {
      // WebSocket용 approval key 발급
      const authData = {
        grant_type: 'client_credentials',
        appkey: this.config.apiKey,
        appsecret: this.config.secret
      };

      const authResponse = await this.callKoreaInvestmentAPI(
        'POST',
        '/oauth2/tokenP',
        authData
      );

      if (authResponse.access_token) {
        this.approvalKey = authResponse.access_token;
      } else {
        throw KSETErrorFactory.create(
          ERROR_CODES.AUTHENTICATION_FAILED,
          'Failed to get approval key for WebSocket',
          'korea-investment-websocket'
        );
      }
    } catch (error) {
      this.logger.error('Korea Investment authentication failed:', error);
      throw error;
    }
  }

  /**
   * WebSocket URL 생성
   */
  private buildWebSocketUrl(): string {
    const baseUrl = this.config.environment === 'production'
      ? 'wss://openapi.koreainvestment.com:9443'
      : 'wss://openapivts.koreainvestment.com:29443';

    return `${baseUrl}/websocket`;
  }

  /**
   * 연결 ID 생성
   */
  private generateConnectionId(): string {
    return `krinv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================

  /**
   * 메시지 전송
   */
  protected async sendMessage(message: any): Promise<void> {
    const krInvestmentMessage = {
      ...message,
      approval_key: this.approvalKey,
      connectionId: this.connectionId,
      provider: 'korea-investment',
      timestamp: Date.now()
    };

    await super.sendMessage(krInvestmentMessage);
  }

  /**
   * 메시지 수신 처리
   */
  protected handleMessage(data: Buffer): void {
    try {
      const message = data.toString();

      // 한국투자증권 응답 형식 파싱
      const krInvestmentResponse = this.parseKoreaInvestmentResponse(message);

      if (krInvestmentResponse.header.error_code !== '0') {
        this.logger.error(`Korea Investment error: ${krInvestmentResponse.header.error_msg}`, krInvestmentResponse);
        return;
      }

      // 데이터 처리
      const trId = krInvestmentResponse.header.tr_id;

      if (this.isMarketDataMessage(trId)) {
        this.processMarketDataMessage(krInvestmentResponse);
      } else if (this.isOrderMessage(trId)) {
        this.processOrderMessage(krInvestmentResponse);
      } else if (this.isAccountMessage(trId)) {
        this.processAccountMessage(krInvestmentResponse);
      }

    } catch (error) {
      this.logger.error('Failed to handle Korea Investment message:', error);
    }
  }

  /**
   * 한국투자증권 응답 파싱
   */
  private parseKoreaInvestmentResponse(message: string): KoreaInvestmentResponse {
    try {
      return JSON.parse(message);
    } catch (error) {
      this.logger.warn('Failed to parse JSON message:', message, error);
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_RESPONSE,
        'Invalid Korea Investment response format',
        'korea-investment-websocket'
      );
    }
  }

  /**
   * 시장 데이터 메시지 처리
   */
  private processMarketDataMessage(response: KoreaInvestmentResponse): void {
    const data = response.output || response.output2;
    if (!data || !Array.isArray(data)) return;

    for (const item of data) {
      const marketData = this.transformMarketData(item);
      this.emit('marketData', marketData);
    }
  }

  /**
   * 주문 메시지 처리
   */
  private processOrderMessage(response: KoreaInvestmentResponse): void {
    const data = response.output || response.output2;
    if (!data || !Array.isArray(data)) return;

    for (const item of data) {
      const orderData = this.transformOrderData(item);
      this.emit('orderUpdate', orderData);
    }
  }

  /**
   * 계좌 메시지 처리
   */
  private processAccountMessage(response: KoreaInvestmentResponse): void {
    const data = response.output || response.output2;
    if (!data || !Array.isArray(data)) return;

    for (const item of data) {
      if (this.isBalanceData(item)) {
        const balanceData = this.transformBalanceData(item);
        this.emit('balanceUpdate', balanceData);
      } else if (this.isPositionData(item)) {
        const positionData = this.transformPositionData(item);
        this.emit('positionUpdate', positionData);
      }
    }
  }

  /**
   * 메시지 타입 확인
   */
  private isMarketDataMessage(trId: string): boolean {
    const marketDataTypes = [
      KoreaInvestmentMessageType.H0STCNT0,
      KoreaInvestmentMessageType.H0STASP0,
      KoreaInvestmentMessageType.H0STCNI0,
      KoreaInvestmentMessageType.H0STCNI1,
      KoreaInvestmentMessageType.H0FSTCNT0
    ];
    return marketDataTypes.includes(trId as KoreaInvestmentMessageType);
  }

  private isOrderMessage(trId: string): boolean {
    const orderTypes = [
      KoreaInvestmentMessageType.H0TS00000,
      KoreaInvestmentMessageType.H0TS00001
    ];
    return orderTypes.includes(trId as KoreaInvestmentMessageType);
  }

  private isAccountMessage(trId: string): boolean {
    return this.isOrderMessage(trId); // 주문 관련 메시지가 계좌 정보도 포함
  }

  private isBalanceData(data: any): boolean {
    return data.hasOwnProperty('cma_evlu_pbls_smtl') || data.hasOwnProperty('dnca_tot_aet');
  }

  private isPositionData(data: any): boolean {
    return data.hasOwnProperty('prd_pd_qty') || data.hasOwnProperty('pchs_avg_pric');
  }

  // ==========================================================================
  // SUBSCRIPTION METHODS
  // ==========================================================================

  /**
   * 구독 메시지 전송
   */
  protected sendSubscriptionMessage(subscription: SubscriptionInfo): void {
    const subscriptionMessage = {
      type: 'subscribe',
      tr_id: this.getTrIdBySubscriptionType(subscription.type),
      approval_key: this.approvalKey,
      subscriptionId: subscription.id,
      symbols: subscription.symbols,
      filters: subscription.filters
    };

    this.sendMessage(subscriptionMessage);
  }

  /**
   * 구독 해제 메시지 전송
   */
  protected sendUnsubscriptionMessage(subscription: SubscriptionInfo): void {
    const unsubscriptionMessage = {
      type: 'unsubscribe',
      tr_id: this.getTrIdBySubscriptionType(subscription.type),
      approval_key: this.approvalKey,
      subscriptionId: subscription.id,
      symbols: subscription.symbols
    };

    this.sendMessage(unsubscriptionMessage);
  }

  /**
   * 구독 타입별 TR ID 가져오기
   */
  private getTrIdBySubscriptionType(type: string): string {
    switch (type) {
      case 'market-data':
        return KoreaInvestmentMessageType.H0STCNT0;
      case 'order':
        return KoreaInvestmentMessageType.H0TS00000;
      case 'balance':
        return KoreaInvestmentMessageType.H0TS00000; // 주문 통보에 포함
      case 'position':
        return KoreaInvestmentMessageType.H0TS00000; // 주문 통보에 포함
      default:
        return KoreaInvestmentMessageType.H0STCNT0;
    }
  }

  /**
   * 시장 데이터 구독
   */
  async subscribeMarketData(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<SubscriptionInfo> {
    const subscription = this.createSubscription('market-data', symbols, callback);

    const message = {
      type: KoreaInvestmentMessageType.H0STCNT0,
      symbols: symbols.map(s => this.formatSymbol(s)),
      subscriptionId: subscription.id
    };

    await this.sendMessage(message);
    return subscription;
  }

  /**
   * 주문 업데이트 구독
   */
  async subscribeOrderUpdates(
    callback: (data: Order) => void
  ): Promise<SubscriptionInfo> {
    const subscription = this.createSubscription('order', [], callback);

    const message = {
      type: KoreaInvestmentMessageType.H0TS00000,
      subscriptionId: subscription.id,
      accountNumber: this.config.accountNumber
    };

    await this.sendMessage(message);
    return subscription;
  }

  /**
   * 잔고 업데이트 구독
   */
  async subscribeBalanceUpdates(
    callback: (data: Balance) => void
  ): Promise<SubscriptionInfo> {
    const subscription = this.createSubscription('balance', [], callback);

    const message = {
      type: 'balance-update',
      subscriptionId: subscription.id,
      accountNumber: this.config.accountNumber
    };

    await this.sendMessage(message);
    return subscription;
  }

  /**
   * 포지션 업데이트 구독
   */
  async subscribePositionUpdates(
    callback: (data: Position) => void
  ): Promise<SubscriptionInfo> {
    const subscription = this.createSubscription('position', [], callback);

    const message = {
      type: 'position-update',
      subscriptionId: subscription.id,
      accountNumber: this.config.accountNumber
    };

    await this.sendMessage(message);
    return subscription;
  }

  // ==========================================================================
  // DATA TRANSFORMATION
  // ==========================================================================

  /**
   * 시장 데이터 변환
   */
  protected transformMarketData(data: KoreaInvestmentMarketData): MarketData {
    return {
      symbol: data.mksc_shrn_iscd,
      name: data.stk_name || data.bstp_kor_isnm,
      market: this.detectMarketType(data.mksc_shrn_iscd),
      sector: '', // TODO: 섹터 정보 조회
      industry: '', // TODO: 산업 정보 조회

      // 가격 정보
      currentPrice: Number(data.stck_prpr) || 0,
      previousClose: Number(data.prdy_vrsss_prc) || 0,
      openPrice: Number(data.stck_oprc) || 0,
      highPrice: Number(data.stck_hgpr) || 0,
      lowPrice: Number(data.stck_lwpr) || 0,
      changeAmount: Number(data.prdy_clpr_vrss) || 0,
      changeRate: Number(data.prdy_vrss_rate) || 0,

      // 호가 정보
      bidPrice: Number(data.bidp1) || 0,
      askPrice: Number(data.askp1) || 0,
      bidSize: Number(data.bidp_rsqn1) || 0,
      askSize: Number(data.askp_rsqn1) || 0,

      // 거래 정보
      volume: Number(data.acml_vol) || 0,
      tradingValue: Number(data.acml_tr_pbmn) || 0,

      // 시장 정보
      marketCap: 0, // TODO: 시가총액 계산
      foreignHoldingRatio: 0, // TODO: 외국인 보유율 조회
      institutionalHoldingRatio: 0, // TODO: 기관 보유율 조회

      // 시간 정보
      timestamp: this.parseTimestamp(data.stck_bsop_date, data.stck_cntg_hour),
      datetime: new Date().toISOString(),

      // 원본 데이터
      rawData: data,
      source: 'korea-investment-websocket'
    };
  }

  /**
   * 주문 데이터 변환
   */
  protected transformOrderData(data: any): Order {
    return {
      id: data.odno || '',
      providerOrderId: data.odno || '',
      symbol: data.shtn_iscd || '',
      side: this.transformOrderSide(data.sll_buy_dvsn_cd),
      orderType: this.transformOrderType(data.ord_dvsn_cd),
      quantity: Number(data.ord_qty) || 0,
      price: Number(data.ord_unpr) || 0,
      status: this.transformOrderStatus(data.ord_stat_cd),
      filledQuantity: Number(data.tot_ccld_qty) || 0,
      remainingQuantity: Number(data.remn_qty) || 0,
      averageFillPrice: Number(data.avg_prvs) || 0,
      createdAt: this.parseKoreanDateTime(data.ord_dt, data.ord_tmd),
      updatedAt: new Date(),
      provider: 'korea-investment-websocket',
      rawData: data
    };
  }

  /**
   * 잔고 데이터 변환
   */
  protected transformBalanceData(data: any): Balance {
    return {
      currency: 'KRW',
      cash: Number(data.cma_evlu_pbls_smtl) || 0,
      withdrawable: Number(data.withdrawable_amount) || 0,
      orderable: Number(data.pord_amt) || 0,
      totalIncludingMargin: Number(data.dnca_tot_aet) || 0,
      margin: Number(data.margn_aet) || 0,
      loan: Number(data.loan_aet) || 0,
      updatedAt: new Date(),
      provider: 'korea-investment-websocket',
      rawData: data
    };
  }

  /**
   * 포지션 데이터 변환
   */
  protected transformPositionData(data: any): Position {
    const currentPrice = Number(data.prpr) || Number(data.stck_prpr) || 0;
    const quantity = Number(data.hldg_qty) || Number(data.prd_pd_qty) || 0;
    const averagePrice = Number(data.pchs_avg_pric) || 0;
    const marketValue = quantity * currentPrice;
    const costBasis = quantity * averagePrice;
    const unrealizedPnL = marketValue - costBasis;

    return {
      symbol: data.shtn_iscd || data.pdno || '',
      name: data.pdnm || data.stk_name || '',
      quantity: quantity,
      averagePrice: averagePrice,
      currentPrice: currentPrice,
      marketValue: marketValue,
      costBasis: costBasis,
      unrealizedPnL: unrealizedPnL,
      unrealizedPnLRate: this.calculatePnLRate(unrealizedPnL, costBasis),
      realizedPnL: Number(data.rglt_spl_dit) || 0,
      dailyPnL: Number(data.dys_crtr_smtl_pfls_amt) || 0,
      updatedAt: new Date(),
      provider: 'korea-investment-websocket',
      rawData: data
    };
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 시장 타입 감지
   */
  private detectMarketType(symbol: string): MarketType {
    // 한국투자증권 시장 타입 감지 로직
    if (symbol.startsWith('U')) { // ETF
      return 'KRX-ETF';
    } else if (symbol.startsWith('J')) { // ELW
      return 'KRX-ELW';
    } else if (symbol.startsWith('Q')) { // ETN
      return 'KRX-ETN';
    } else if (symbol.startsWith('2') || symbol.startsWith('5')) {
      return 'KOSPI'; // KOSPI 종목 규칙
    } else {
      return 'KOSDAQ'; // 기본값
    }
  }

  /**
   * 종목 코드 포맷팅
   */
  private formatSymbol(symbol: string): string {
    // 한국투자증권 종목 코드 포맷으로 변환
    if (!symbol) return '';
    return symbol.padStart(6, '0');
  }

  /**
   * 주문 방향 변환
   */
  private transformOrderSide(sideCode: string): string {
    return sideCode === '02' ? 'BUY' : 'SELL';
  }

  /**
   * 주문 타입 변환
   */
  private transformOrderType(orderTypeCode: string): string {
    const typeMap: Record<string, string> = {
      '00': 'MARKET',
      '01': 'LIMIT',
      '02': 'BEST',
      '03': 'BEST_LIMIT'
    };
    return typeMap[orderTypeCode] || 'LIMIT';
  }

  /**
   * 주문 상태 변환
   */
  private transformOrderStatus(statusCode: string): string {
    const statusMap: Record<string, string> = {
      '0': 'pending',
      '1': 'confirmed',
      '2': 'partial',
      '3': 'filled',
      '4': 'cancelled',
      '5': 'rejected'
    };
    return statusMap[statusCode] || 'pending';
  }

  /**
   * 시간 파싱
   */
  private parseTimestamp(date: string, time: string): number {
    try {
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);

      const hours = time.substring(0, 2);
      const minutes = time.substring(2, 4);
      const seconds = time.substring(4, 6);

      return new Date(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`).getTime();
    } catch (error) {
      this.logger.error('Failed to parse timestamp:', error);
      return Date.now();
    }
  }

  /**
   * 한국 시간 파싱
   */
  private parseKoreanDateTime(date: string, time: string): Date {
    try {
      const year = date.substring(0, 4);
      const month = date.substring(4, 6);
      const day = date.substring(6, 8);

      const hours = time.substring(0, 2);
      const minutes = time.substring(2, 4);
      const seconds = time.substring(4, 6);

      return new Date(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
    } catch (error) {
      this.logger.error('Failed to parse Korean datetime:', error);
      return new Date();
    }
  }

  /**
   * 손익률 계산
   */
  private calculatePnLRate(pnl: number, costBasis: number): number {
    if (costBasis === 0) return 0;
    return (pnl / costBasis) * 100;
  }

  /**
   * Korea Investment API 호출 (하위 클래스에서 재정의)
   */
  protected async callKoreaInvestmentAPI(
    method: string,
    endpoint: string,
    data: any = {}
  ): Promise<any> {
    // 하위 클래스에서 Korea Investment REST API 호출 구현
    throw new Error('callKoreaInvestmentAPI must be implemented by subclass');
  }

  // ==========================================================================
  // ADVANCED FEATURES
  // ==========================================================================

  /**
   * 실시간 데이터 캐시
   */
  private marketDataCache = new Map<string, MarketData>();

  /**
   * 캐시된 데이터 조회
   */
  getCachedMarketData(symbol: string): MarketData | null {
    return this.marketDataCache.get(symbol) || null;
  }

  /**
   * 캐시 데이터 업데이트
   */
  updateMarketDataCache(marketData: MarketData): void {
    this.marketDataCache.set(marketData.symbol, marketData);
  }

  /**
   * 캐시 데이터 만료 처리
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    const ttl = 60000; // 1분

    for (const [symbol, data] of this.marketDataCache.entries()) {
      if (now - data.timestamp > ttl) {
        this.marketDataCache.delete(symbol);
      }
    }
  }

  /**
   * 통계 정보 조회
   */
  getWebSocketStats(): any {
    return {
      ...super.getStats(),
      provider: 'korea-investment',
      connectionId: this.connectionId,
      approvalKey: this.approvalKey ? 'issued' : 'not_issued',
      cacheSize: this.marketDataCache.size,
      supportedFeatures: [
        'real-time-market-data',
        'order-updates',
        'balance-updates',
        'position-updates',
        'market-data-subscription',
        'account-updates'
      ]
    };
  }
}