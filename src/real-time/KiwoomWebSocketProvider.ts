/**
 * Kiwoom Securities WebSocket Provider
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 키움증권 실시간 데이터 WebSocket 전송 Provider
 */

import { WebSocketManager } from './WebSocketManager';
import { WebSocketConfig } from './WebSocketManager';
import { SubscriptionInfo } from './WebSocketManager';
import { MarketData, Order, Balance, Position } from '@/interfaces';
import { MarketType } from '@/types';
import { KSETErrorFactory, ERROR_CODES } from '@/errors';

/**
 * 키움증권 WebSocket 연결 설정
 */
interface KiwoomWebSocketConfig extends WebSocketConfig {
  serverIp: string;
  serverPort: number;
  userId: string;
  accountNumber: string;
  certificatePath: string;
  certificatePassword: string;
}

/**
 * 키움증권 WebSocket 메시지 타입
 */
enum KiwoomMessageType {
  // 실시간 시세
  OPT10001 = 'OPT10001', // 실시간 시세
  OPT10002 = 'OPT10002',  // 실시간 호가

  // 주문 정보
  OPT10003 = 'OPT10003', // 주문 체결
  OPT10004 = 'OPT10004', // 주문 체결 취소
  OPT10005 = 'OPT10005', // 주문 정정

  // 잔고 정보
  OPT10006 = 'OPT10006',  // 주문 가능 예수
  OPT10007 = 'OPT10007',  // 잔고 현금

  // 기타
  OPT90001 = 'OPT90001'  // 서버 상태
}

/**
 * 키움증권 WebSocket 응답 데이터
 */
interface KiwoomResponse {
  tr_code: string;    // 응답 코드
  tr_msg1: string;     // 응답 메시지 1
  tr_msg2: string;     // 응답메시지 2
  data?: any[];        // 데이터
}

/**
 * 키움증권 시세 데이터
 */
interface KiwoomMarketData {
  // 종목 기본 정보
  fid: string;            // 종목 코드
  fmk_name: string;        // 종목명
  fid_name: string;        // 종목명

  // 가격 정보
  price: number;          // 현재가
  open: number;           // 시가
  high: number;           // 고가
  low: number;            // 저가
  prevclose: number;       // 전일 종가

  // 거래 정보
  volume: number;         // 거래량
  tradingValue: number;    // 거래대금

  // 호가 정보
  ask1: number;           // 매도 1호가
  bid1: number;           // 매수 1호가
  ask1q: number;          // 매도 1호가 수량
  bid1q: number;          // 매수 1호가 수량

  // 변동 정보
  changeAmount: number;   // 변동액
  changeRate: number;     // 변동율

  // 시간 정보
  timestamp: number;      // 시간 정보
  date: string;          // 날짜 (YYYYMMDD)
  time: string;          // 시간 (HHMMSS)

  // 기타
  marketStatus: string;    // 시장 상태
  isMarketOpen: boolean; // 시장 개장 여부
}

/**
 * 키움증권 WebSocket Provider
 */
export class KiwoomWebSocketProvider extends WebSocketManager {
  private config: KiwoomWebSocketConfig;
  private connectionId?: string;

  constructor(config: KiwoomWebSocketConfig) {
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
    // 키움증권 웹소켓 연결을 위한 토크 처리
    const wsUrl = this.buildWebSocketUrl();
    this.config.url = wsUrl;

    // 인증 헤더 설정
    this.config.headers = {
      'User-Agent': 'KSET/1.0.0',
      'Connection-Id': this.connectionId
    };

    await super.connect();
  }

  /**
   * WebSocket URL 생성
   */
  private buildWebSocketUrl(): string {
    // 키움증권 웹소켓 주소 (예시)
    // 실제 구현에서는 키움증권 OpenAPI 웹소켓 주소 사용
    return `ws://${this.config.serverIp}:${this.config.serverPort}`;
  }

  /**
   * 연결 ID 생성
   */
  private generateConnectionId(): string {
    return `kiwoom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================

  /**
   * 메시지 전송
   */
  protected async sendMessage(message: any): Promise<void> {
    // 키움증권 특화 메시지 형식으로 변환
    const kiwoomMessage = {
      ...message,
      connectionId: this.connectionId,
      provider: 'kiwoom',
      timestamp: Date.now()
    };

    await super.sendMessage(kiwoomMessage);
  }

  /**
   * 메시지 수신 처리
   */
  protected handleMessage(data: Buffer): void {
    try {
      const message = data.toString();

      // 키움증권 응답 형식 파싱
      const kiwoomResponse = this.parseKiwoomResponse(message);

      if (kiwoomResponse.tr_code !== '0') {
        this.logger.error(`Kiwoom error: ${kiwoomResponse.tr_msg1}`, kiwoomResponse);
        return;
      }

      // 데이터 처리
      if (kiwoomResponse.data && Array.isArray(kiwoomResponse.data)) {
        for (const item of kiwoomResponse.data) {
          this.processKiwoomData(item);
        }
      }
    } catch (error) {
      this.logger.error('Failed to handle Kiwoom message:', error);
    }
  }

  /**
   * 키움증권 응답 파싱
   */
  private parseKiwoomResponse(message: string): KiwoomResponse {
    const lines = message.split('\n');
    const response: KiwoomResponse = {
      tr_code: '',
      tr_msg1: '',
      tr_msg2: ''
    };

    for (const line of lines) {
      if (line.startsWith('tr_code')) {
        response.tr_code = line.split('=')[1]?.trim() || '';
      } else if (line.startsWith('tr_msg1')) {
        response.tr_msg1 = line.split('=')[1]?.trim() || '';
      } else if (line.startsWith('tr_msg2')) {
        response.tr_msg2 = line.split('=')[1]?.trim() || '';
      } else if (line.startsWith('{')) {
        try {
          response.data = JSON.parse(line);
        } catch (error) {
          this.logger.warn('Failed to parse JSON data:', line, error);
        }
      }
    }

    return response;
  }

  /**
   * 키움증권 데이터 처리
   */
  private processKiwoomData(data: any): void {
    // 메시지 타입별 처리
    if (data.hasOwnProperty('fid')) {
      this.processMarketData(data);
    } else if (data.hasOwnProperty('order_number')) {
      this.processOrderData(data);
    } else if (data.hasOwnProperty('cash_buyable')) {
      this.processBalanceData(data);
    } else if (data.hasOwnProperty('total_evaluated')) {
      this.processPositionData(data);
    } else {
      this.logger.debug('Unknown Kiwoom data type:', data);
    }
  }

  /**
   * 시장 데이터 처리
   */
  private processMarketData(data: any): void {
    try {
      const marketData: KiwoomMarketData = {
        // 종목 기본 정보
        fid: data.fid || '',
        fmk_name: data.fmk_name || '',
        fid_name: data.fid_name || '',

        // 가격 정보
        price: Number(data.price) || 0,
        open: Number(data.open) || 0,
        high: Number(data.high) || 0,
        low: Number(data.low) || 0,
        prevclose: Number(data.prevclose) || 0,

        // 거래 정보
        volume: Number(data.volume) || 0,
        tradingValue: Number(data.tradingValue) || 0,

        // 호가 정보
        ask1: Number(data.ask1) || 0,
        bid1: Number(data.bid1) || 0,
        ask1q: Number(data.ask1q) || 0,
        bid1q: Number(data.bid1q) || 0,

        // 변동 정보
        changeAmount: this.calculateChangeAmount(data.price, data.prevclose),
        changeRate: this.calculateChangeRate(data.price, data.prevclose),

        // 시간 정보
        timestamp: this.parseTimestamp(data.date, data.time),
        date: data.date || '',
        time: data.time || '',

        // 기타
        marketStatus: data.marketStatus || '',
        isMarketOpen: data.isMarketOpen || false
      };

      const transformedData = this.transformMarketData(marketData);
      this.emit('marketData', transformedData);

    } catch (error) {
      this.logger.error('Failed to process market data:', error);
    }
  }

  /**
   * 주문 데이터 처리
   */
  private processOrderData(data: any): void {
    try {
      const orderData = this.transformOrderData(data);
      this.emit('orderUpdate', orderData);
    } catch (error) {
      this.logger.error('Failed to process order data:', error);
    }
  }

  /**
   * 잔고 데이터 처리
   */
  private processBalanceData(data: any): void {
    try {
      const balanceData = this.transformBalanceData(data);
      this.emit('balanceUpdate', balanceData);
    } catch (error) {
      this.logger.error('Failed to process balance data:', error);
    }
  }

  /**
   * 포지션 데이터 처리
   */
  private processPositionData(data: any): void {
    try {
      const positionData = this.transformPositionData(data);
      this.emit('positionUpdate', positionData);
    } catch (error) {
      this.logger.error('Failed to process position data:', error);
    }
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
      subscriptionId: subscription.id,
      subscriptionType: subscription.type,
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
      subscriptionId: subscription.id,
      subscriptionType: subscription.type,
      symbols: subscription.symbols
    };

    this.sendMessage(unsubscriptionMessage);
  }

  /**
   * 시장 데이터 구독
   */
  async subscribeMarketData(
    symbols: string[],
    callback: (data: MarketData) => void
  ): Promise<SubscriptionInfo> {
    const subscription = this.createSubscription('market-data', symbols, callback);

    // 실시간 시세 데이터 구독 요청
    const message = {
      type: KiwoomMessageType.OPT10001,
      symbols: symbols,
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

    // 주문 업데이트 구독 요청
    const message = {
      type: KiwoomMessageType.OPT10003,
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

    // 잔고 현금 구독 요청
    const message = {
      type: KiwoomMessageType.OPT10006,
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

    // 포지션 정보 구독 요청
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
  protected transformMarketData(data: KiwoomMarketData): MarketData {
    return {
      symbol: data.fid,
      name: data.fid_name,
      market: this.detectMarketType(data.fid),
      sector: '', // TODO: 섹터 정보 조회
      industry: '', // TODO: 산업 정보 조회

      // 가격 정보
      currentPrice: data.price,
      previousClose: data.prevclose,
      openPrice: data.open,
      highPrice: data.high,
      lowPrice: data.low,
      changeAmount: data.changeAmount,
      changeRate: data.changeRate,

      // 호가 정보
      bidPrice: data.bid1,
      askPrice: data.ask1,
      bidSize: data.bid1q,
      askSize: data.ask1q,

      // 거래 정보
      volume: data.volume,
      tradingValue: data.tradingValue,

      // 시장 정보
      marketCap: 0, // TODO: 시가총액 계산
      foreignHoldingRatio: 0, // TODO: 외국인 보유율 조회
      institutionalHoldingRatio: 0, // TODO: 기관 보유율 조회

      // 시간 정보
      timestamp: data.timestamp,
      datetime: new Date(data.timestamp).toISOString(),

      // 원본 데이터
      rawData: data,
      source: 'kiwoom-websocket'
    };
  }

  /**
   * 주문 데이터 변환
   */
  protected transformOrderData(data: any): Order {
    // TODO: 키움증권 주문 데이터 형식으로 변환
    return {
      id: data.order_number || '',
      providerOrderId: data.order_number || '',
      symbol: data.fid || '',
      side: data.order_type === 'buy' ? 'BUY' : 'SELL',
      orderType: this.transformOrderType(data.order_type),
      quantity: data.quantity || 0,
      price: data.price || 0,
      status: this.transformOrderStatus(data.status),
      filledQuantity: data.filled_quantity || 0,
      remainingQuantity: data.remaining_quantity || 0,
      averageFillPrice: data.average_price || 0,
      createdAt: new Date(data.order_time || Date.now()),
      updatedAt: new Date(),
      provider: 'kiwoom-websocket',
      rawData: data
    };
  }

  /**
   * 잔고 데이터 변환
   */
  protected transformBalanceData(data: any): Balance {
    return {
      currency: 'KRW',
      cash: data.cash || 0,
      withdrawable: data.withdrawable || 0,
      orderable: data.orderable || 0,
      totalIncludingMargin: data.total_including_margin || 0,
      margin: data.margin || 0,
      loan: data.loan || 0,
      updatedAt: new Date(),
      provider: 'kiwoom-websocket',
      rawData: data
    };
  }

  /**
   * 포지션 데이터 변환
   */
  protected transformPositionData(data: any): Position {
    return {
      symbol: data.fid || '',
      name: data.name || '',
      quantity: data.quantity || 0,
      averagePrice: data.average_price || 0,
      currentPrice: data.current_price || 0,
      marketValue: data.market_value || 0,
      costBasis: data.cost_basis || 0,
      unrealizedPnL: data.unrealized_pnl || 0,
      unrealizedPnLRate: this.calculatePnLRate(data.unrealized_pnl || 0, data.cost_basis || 0),
      realizedPnL: data.realized_pnl || 0,
      dailyPnL: data.daily_pnl || 0,
      updatedAt: new Date(),
      provider: 'kiwoom-websocket',
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
    // 키움증권 시장 타입 감지 로직
    if (symbol.startsWith('KRX-ETF')) {
      return 'KRX-ETF';
    } else if (symbol.startsWith('KRX-ETN')) {
      return 'KRX-ETN';
    } else if (symbol.startsWith('00')) {
      // KOSPI/KOSDAQ 종목은 00으로 시작
      // TODO: 실제 시장 구분 로직 필요
      return 'KOSPI'; // 기본값
    }

    return 'KOSDAQ';
  }

  /**
   * 주문 타입 변환
   */
  private transformOrderType(orderType: string): string {
    const typeMap: Record<string, string> = {
      '00': 'MARKET',
      '01': 'LIMIT',
      '02': 'BEST',
      '03': 'BEST_LIMIT',
      '04': 'STOP',
      '05': 'STOP_LIMIT',
      '06': 'ICEBERG',
      '07': 'TIME_IN_FORCE',
      '08': 'OCO',
      '09': 'CUSTOM'
    };

    return typeMap[orderType] || 'LIMIT';
  }

  /**
   * 주문 상태 변환
   */
  private transformOrderStatus(status: string): string {
    const statusMap: Record<string, string> = {
      '0': 'pending',
      '1': 'received',
      '2': 'confirmed',
      '3': 'partial',
      '4': 'filled',
      '5': 'cancelled',
      '6': 'rejected',
      '7': 'expired',
      '8': 'suspended'
    };

    return statusMap[status] || 'pending';
  }

  /**
   * 시간 파싱
   */
  private parseTimestamp(date: string, time: string): number {
    try {
      // YYYYMMDD HHMMSS 형식을 timestamp으로 변환
      const dateTime = new Date();
      const year = dateTime.getFullYear();
      const month = date.substring(0, 2);
      const day = date.substring(2, 4);

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
   * 변동액 계산
   */
  private calculateChangeAmount(currentPrice: number, previousClose: number): number {
    return currentPrice - previousClose;
  }

  /**
   * 변동율 계산
   */
  private calculateChangeRate(currentPrice: number, previousClose: number): number {
    if (previousClose === 0) return 0;
    return ((currentPrice - previousClose) / previousClose) * 100;
  }

  /**
   * 손익률 계산
   */
  private calculatePnLRate(pnl: number, costBasis: number): number {
    if (costBasis === 0) return 0;
    return (pnl / costBasis) * 100;
  }

  /**
   * Kiwoom 웹소켓 API 호출 (하위 클래스에서 재정의)
   */
  protected async callKiwoomApi(
    method: string,
    parameters: any = {}
  ): Promise<any> {
    // 하위 클래스에서 Kiwoom REST API 호출 구현
    throw new Error('callKiwoomApi must be implemented by subclass');
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
    this.marketData.set(marketData.symbol, marketData);
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
      provider: 'kiwoom',
      connectionId: this.connectionId,
      cacheSize: this.marketDataCache.size,
      supportedFeatures: [
        'real-time-market-data',
        'order-updates',
        'balance-updates',
        'position-updates'
      ]
    };
  }
}