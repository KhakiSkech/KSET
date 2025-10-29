/**
 * WebSocket Manager
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * Real-time data streaming infrastructure for Korean securities market data
 */

import {
  EventEmitter
} from 'events';

import {
  WebSocket,
  WebSocketServer
} from 'ws';

import {
  RealTimeCallback,
  OrderCallback,
  BalanceCallback,
  PositionCallback,
  ErrorCallback,
  Subscription,
  MarketData,
  Order,
  Balance,
  Position
} from '@/interfaces';

import {
  KSETErrorFactory,
  ERROR_CODES,
  Logger,
  ConsoleLogger,
  CircuitBreaker,
  RetryManager
} from '@/errors';

/**
 * WebSocket 연결 상태
 */
export type WebSocketState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

/**
 * 구독 정보
 */
export interface SubscriptionInfo {
  id: string;
  type: 'market-data' | 'order' | 'balance' | 'position' | 'custom';
  symbols: string[];
  filters?: any;
  callback: Function;
  createdAt: Date;
  lastMessageAt?: Date;
  isActive: boolean;
}

/**
 * WebSocket 메시지
 */
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: number;
  provider?: string;
  subscriptionId?: string;
}

/**
 * 연결 설정
 */
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  headers?: Record<string, string>;
  pingInterval?: number;
  pongTimeout?: number;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  timeout?: number;
}

/**
 * WebSocket 관리자
 */
export class WebSocketManager extends EventEmitter {
  private ws?: WebSocket;
  private state: WebSocketState = 'disconnected';
  private config: WebSocketConfig;
  private subscriptions = new Map<string, SubscriptionInfo>();
  private pingInterval?: NodeJS.Timeout;
  private reconnectTimeout?: NodeJS.Timeout;
  private reconnectAttempts = 0;
  private logger: Logger;
  private circuitBreaker: CircuitBreaker;
  private messageQueue: WebSocketMessage[] = [];
  private isProcessing = false;

  constructor(config: WebSocketConfig, logger?: Logger) {
    super();
    this.config = {
      pingInterval: 30000, // 30초
      pongTimeout: 5000,   // 5초
      reconnectInterval: 5000, // 5초
      maxReconnectAttempts: 10,
      timeout: 30000,       // 30초
      ...config
    };

    this.logger = logger || new ConsoleLogger('websocket');
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: 5,
      minimumThroughput: 10,
      timeout: 60000,
      halfOpenMaxCalls: 3
    });

    this.setupEventHandlers();
  }

  // ==========================================================================
  // CONNECTION MANAGEMENT
  // ==========================================================================

  /**
   * WebSocket 연결
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      return;
    }

    this.state = 'connecting';
    this.logger.info(`Connecting to WebSocket: ${this.config.url}`);

    try {
      return await this.circuitBreaker.execute(async () => {
        return new Promise<void>((resolve, reject) => {
          this.ws = new WebSocket(this.config.url, this.config.protocols, {
            headers: this.config.headers,
            handshakeTimeout: this.config.timeout
          });

          this.ws.on('open', () => {
            this.handleOpen();
            resolve();
          });

          this.ws.on('error', (error) => {
            this.handleError(error);
            reject(error);
          });

          this.ws.on('close', (code, reason) => {
            this.handleClose(code, reason);
            if (this.state !== 'disconnected') {
              reject(new Error(`WebSocket closed: ${code} ${reason}`));
            }
          });

          // 연결 타임아웃
          setTimeout(() => {
            if (this.state === 'connecting') {
              this.ws?.close();
              reject(new Error('WebSocket connection timeout'));
            }
          }, this.config.timeout);
        });
      });
    } catch (error) {
      this.state = 'error';
      throw error;
    }
  }

  /**
   * WebSocket 연결 해제
   */
  async disconnect(): Promise<void> {
    this.logger.info('Disconnecting WebSocket...');
    this.state = 'disconnected';
    this.reconnectAttempts = 0;

    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }

    if (this.ws) {
      this.ws.close(1000, 'User requested disconnect');
      this.ws = undefined;
    }

    this.subscriptions.clear();
    this.messageQueue = [];
    this.removeAllListeners();
  }

  /**
   * 재연결
   */
  private async reconnect(): Promise<void> {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) {
      this.logger.error('Max reconnection attempts reached');
      this.state = 'disconnected';
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.reconnectAttempts++;
    this.state = 'reconnecting';

    const delay = this.config.reconnectInterval! * Math.pow(2, this.reconnectAttempts - 1);
    this.logger.info(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        this.logger.error('Reconnection failed:', error);
      }
    }, delay);
  }

  // ==========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ==========================================================================

  /**
   * 구독 생성
   */
  createSubscription(
    type: SubscriptionInfo['type'],
    symbols: string[],
    callback: Function,
    filters?: any
  ): Subscription {
    const subscriptionId = this.generateSubscriptionId();

    const subscription: SubscriptionInfo = {
      id: subscriptionId,
      type,
      symbols,
      callback,
      filters,
      createdAt: new Date(),
      isActive: false
    };

    this.subscriptions.set(subscriptionId, subscription);

    // 연결된 경우 즉시 구독 메시지 전송
    if (this.state === 'connected') {
      this.sendSubscriptionMessage(subscription);
    }

    const unsubscribeCallback = async () => {
      await this.unsubscribe(subscriptionId);
    };

    return {
      id: subscriptionId,
      symbols,
      active: true,
      createdAt: subscription.createdAt,
      unsubscribe: unsubscribeCallback
    };
  }

  /**
   * 구독 해제
   */
  async unsubscribe(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    subscription.isActive = false;
    this.subscriptions.delete(subscriptionId);

    // 연결된 경우 구독 해제 메시지 전송
    if (this.state === 'connected') {
      this.sendUnsubscriptionMessage(subscription);
    }

    this.logger.debug(`Unsubscribed: ${subscriptionId}`);
  }

  /**
   * 모든 구독 해제
   */
  async unsubscribeAll(): Promise<void> {
    const unsubscribes = Array.from(this.subscriptions.entries()).map(
      ([id]) => this.unsubscribe(id)
    );

    await Promise.allSettled(unsubscribes);
  }

  // ==========================================================================
  // MESSAGE HANDLING
  // ==========================================================================

  /**
   * 메시지 전송
   */
  async sendMessage(message: WebSocketMessage): Promise<void> {
    if (this.state !== 'connected' || !this.ws) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NETWORK_ERROR,
        'WebSocket is not connected',
        'websocket'
      );
    }

    try {
      const messageStr = JSON.stringify(message);
      this.ws.send(messageStr);
      this.logger.debug(`Message sent: ${message.type}`, message.data);
    } catch (error) {
      this.logger.error('Failed to send message:', error);
      throw error;
    }
  }

  /**
   * 메시지 수신 처리
   */
  private handleMessage(data: Buffer): void {
    try {
      const message: WebSocketMessage = JSON.parse(data.toString());
      this.logger.debug(`Message received: ${message.type}`, message.data);

      // 메시지 타입별 처리
      switch (message.type) {
        case 'market-data':
          this.handleMarketDataMessage(message);
          break;
        case 'order-update':
          this.handleOrderUpdateMessage(message);
          break;
        case 'balance-update':
          this.handleBalanceUpdateMessage(message);
          break;
        case 'position-update':
          this.handlePositionUpdateMessage(message);
          break;
        case 'pong':
          this.handlePongMessage(message);
          break;
        case 'error':
          this.handleErrorMessage(message);
          break;
        case 'subscription-ack':
          this.handleSubscriptionAckMessage(message);
          break;
        default:
          this.logger.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      this.logger.error('Failed to handle message:', error);
    }
  }

  /**
   * 시장 데이터 메시지 처리
   */
  private handleMarketDataMessage(message: WebSocketMessage): void {
    const subscriptionId = message.subscriptionId;
    const subscription = subscriptionId ? this.subscriptions.get(subscriptionId) : null;

    if (subscription && subscription.isActive) {
      const marketData = this.transformMarketData(message.data);
      subscription.lastMessageAt = new Date();

      try {
        (subscription.callback as RealTimeCallback)(marketData);
        this.emit('marketData', marketData);
      } catch (error) {
        this.logger.error('Error in market data callback:', error);
        this.emit('callbackError', { type: 'market-data', error, subscription });
      }
    }
  }

  /**
   * 주문 업데이트 메시지 처리
   */
  private handleOrderUpdateMessage(message: WebSocketMessage): void {
    const orderData = this.transformOrderData(message.data);
    this.emit('orderUpdate', orderData);

    // 관련 구독자에게 알림
    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === 'order' && subscription.isActive) {
        try {
          (subscription.callback as OrderCallback)(orderData);
        } catch (error) {
          this.logger.error('Error in order callback:', error);
          this.emit('callbackError', { type: 'order', error, subscription });
        }
      }
    }
  }

  /**
   * 잔고 업데이트 메시지 처리
   */
  private handleBalanceUpdateMessage(message: WebSocketMessage): void {
    const balanceData = this.transformBalanceData(message.data);
    this.emit('balanceUpdate', balanceData);

    // 관련 구독자에게 알림
    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === 'balance' && subscription.isActive) {
        try {
          (subscription.callback as BalanceCallback)(balanceData);
        } catch (error) {
          this.logger.error('Error in balance callback:', error);
          this.emit('callbackError', { type: 'balance', error, subscription });
        }
      }
    }
  }

  /**
   * 포지션 업데이트 메시지 처리
   */
  private handlePositionUpdateMessage(message: WebSocketMessage): void {
    const positionData = this.transformPositionData(message.data);
    this.emit('positionUpdate', positionData);

    // 관련 구독자에게 알림
    for (const subscription of this.subscriptions.values()) {
      if (subscription.type === 'position' && subscription.isActive) {
        try {
          (subscription.callback as PositionCallback)(positionData);
        } catch (error) {
          this.logger.error('Error in position callback:', error);
          this.emit('callbackError', { type: 'position', error, subscription });
        }
      }
    }
  }

  /**
   * Pong 메시지 처리
   */
  private handlePongMessage(message: WebSocketMessage): void {
    this.logger.debug('Received pong message');
    this.emit('pong', message);
  }

  /**
   * 에러 메시지 처리
   */
  private handleErrorMessage(message: WebSocketMessage): void {
    this.logger.error('WebSocket error message:', message.data);
    this.emit('error', message.data);
  }

  /**
   * 구독 확인 메시지 처리
   */
  private handleSubscriptionAckMessage(message: WebSocketMessage): void {
    const subscriptionId = message.subscriptionId;
    const subscription = subscriptionId ? this.subscriptions.get(subscriptionId) : null;

    if (subscription) {
      subscription.isActive = message.data.success;
      this.logger.info(`Subscription ${subscriptionId} ${message.data.success ? 'acknowledged' : 'rejected'}`);
    }
  }

  // ==========================================================================
  // PROVIDER-SPECIFIC METHODS
  // ==========================================================================

  /**
   * 구독 메시지 전송 (하위 클래스에서 구현)
   */
  protected sendSubscriptionMessage(subscription: SubscriptionInfo): void {
    // 하위 클래스에서 Provider별로 구현
    throw new Error('sendSubscriptionMessage must be implemented by subclass');
  }

  /**
   * 구독 해제 메시지 전송 (하위 클래스에서 구현)
   */
  protected sendUnsubscriptionMessage(subscription: SubscriptionInfo): void {
    // 하위 클래스에서 Provider별로 구현
    throw new Error('sendUnsubscriptionMessage must be implemented by subclass');
  }

  /**
   * 시장 데이터 변환 (하위 클래스에서 구현)
   */
  protected transformMarketData(data: any): MarketData {
    // 하위 클래스에서 Provider별로 구현
    throw new Error('transformMarketData must be implemented by subclass');
  }

  /**
   * 주문 데이터 변환 (하위 클래스에서 구현)
   */
  protected transformOrderData(data: any): Order {
    // 하위 클래스에서 Provider별로 구현
    throw new Error('transformOrderData must be implemented by subclass');
  }

  /**
   * 잔고 데이터 변환 (하위 클래스에서 구현)
   */
  protected transformBalanceData(data: any): Balance {
    // 하위 클래스에서 Provider별로 구현
    throw new Error('transformBalanceData must be implemented by subclass');
  }

  /**
   * 포지션 데이터 변환 (하위 클래스에서 구현)
   */
  protected transformPositionData(data: any): Position {
    // 하위 클래스에서 Provider별로 구현
    throw new Error('transformPositionData must be implemented by subclass');
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  /**
   * 연결 성공 핸들러
   */
  private handleOpen(): void {
    this.state = 'connected';
    this.reconnectAttempts = 0;
    this.logger.info('WebSocket connected successfully');

    // Ping/pong 시작
    this.startPingInterval();

    // 대기 중인 메시지 전송
    this.processMessageQueue();

    // 재연결 시 구독 복원
    this.resubscribeAll();

    this.emit('connected');
  }

  /**
   * 에러 핸들러
   */
  private handleError(error: Error): void {
    this.logger.error('WebSocket error:', error);
    this.state = 'error';
    this.emit('error', error);
  }

  /**
   * 연결 종료 핸들러
   */
  private handleClose(code: number, reason: string): void {
    this.logger.warn(`WebSocket closed: ${code} ${reason}`);
    this.state = 'disconnected';

    // Ping 중지
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = undefined;
    }

    this.emit('disconnected', { code, reason });

    // 재연결 시도 (비정상 종료가 아닌 경우)
    if (code !== 1000) {
      this.reconnect();
    }
  }

  /**
   * 메시지 핸들러
   */
  private setupEventHandlers(): void {
    this.ws?.on('message', (data) => {
      this.handleMessage(data as Buffer);
    });

    this.ws?.on('open', () => {
      this.handleOpen();
    });

    this.ws?.on('error', (error) => {
      this.handleError(error);
    });

    this.ws?.on('close', (code, reason) => {
      this.handleClose(code, reason);
    });

    this.ws?.on('pong', () => {
      this.logger.debug('Received pong');
    });
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 구독 ID 생성
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Ping/pong 시작
   */
  private startPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ping();
      }
    }, this.config.pingInterval);
  }

  /**
   * Ping 전송
   */
  private ping(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const message: WebSocketMessage = {
        type: 'ping',
        timestamp: Date.now()
      };

      this.sendMessage(message);

      // Pong 타임아웃 설정
      const pongTimeout = setTimeout(() => {
        this.logger.warn('Pong timeout, reconnecting...');
        this.ws?.close();
      }, this.config.pongTimeout);

      this.once('pong', () => {
        clearTimeout(pongTimeout);
      });
    }
  }

  /**
   * 대기 중인 메시지 처리
   */
  private async processMessageQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      try {
        await this.sendMessage(message);
      } catch (error) {
        this.logger.error('Failed to process queued message:', error);
      }
    }

    this.isProcessing = false;
  }

  /**
   * 메시지 큐에 추가
   */
  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);

    // 비동기적으로 큐 처리 시도
    setImmediate(() => {
      this.processMessageQueue();
    });
  }

  /**
   * 모든 구독 복원
   */
  private resubscribeAll(): void {
    const subscriptions = Array.from(this.subscriptions.values());

    for (const subscription of subscriptions) {
      if (subscription.isActive) {
        this.sendSubscriptionMessage(subscription);
      }
    }
  }

  /**
   * 연결 상태 조회
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * 활성 구독 수 조회
   */
  getActiveSubscriptionCount(): number {
    return Array.from(this.subscriptions.values()).filter(s => s.isActive).length;
  }

  /**
   * 모든 구독 정보 조회
   */
  getAllSubscriptions(): SubscriptionInfo[] {
    return Array.from(this.subscriptions.values());
  }

  /**
   * 통계 정보 조회
   */
  getStats(): {
    state: WebSocketState;
    subscriptionCount: number;
    activeSubscriptionCount: number;
    reconnectAttempts: number;
    uptime: number;
  } {
    return {
      state: this.state,
      subscriptionCount: this.subscriptions.size,
      activeSubscriptionCount: this.getActiveSubscriptionCount(),
      reconnectAttempts: this.reconnectAttempts,
      uptime: Date.now() - (this.stats?.startTime || Date.now())
    };
  }

  private stats?: {
    startTime: number;
  };
}