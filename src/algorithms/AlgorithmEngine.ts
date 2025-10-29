/**
 * Algorithm Trading Engine
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 알고리즘 트레이딩 엔진
 */

import {
  OrderRequest,
  Order,
  MarketData,
  Balance,
  Position,
  Portfolio,
  ApiResponse
} from '@/interfaces';

import {
  OrderType,
  OrderSide,
  OrderStatus,
  MarketType
} from '@/types';

import {
  KSETError,
  KSETErrorFactory,
  ERROR_CODES,
  Logger,
  ConsoleLogger
} from '@/errors';

/**
 * 알고리즘 타입
 */
export enum AlgorithmType {
  TWAP = 'twap',                    // Time Weighted Average Price
  VWAP = 'vwap',                    // Volume Weighted Average Price
  POV = 'pov',                      // Percentage of Volume
  IMPLEMENTATION_SHORTFALL = 'is',  // Implementation Shortfall
  ARBITRAGE = 'arbitrage',          // 차익거래
  PAIR_TRADING = 'pair-trading',    // 페어 트레이딩
  MOMENTUM = 'momentum',            // 모멘텀
  MEAN_REVERSION = 'mean-reversion', // 평균 회귀
  CUSTOM = 'custom'                  // 사용자 정의
}

/**
 * 알고리즘 실행 상태
 */
export enum AlgorithmStatus {
  PENDING = 'pending',              // 대기
  RUNNING = 'running',              // 실행 중
  PAUSED = 'paused',                // 일시 정지
  COMPLETED = 'completed',          // 완료
  CANCELLED = 'cancelled',          // 취소
  ERROR = 'error'                   // 오류
}

/**
 * 알고리즘 파라미터 기본 인터페이스
 */
export interface AlgorithmParameters {
  symbol: string;
  side: OrderSide;
  totalQuantity: number;
  startTime: Date;
  endTime: Date;
  maxParticipationRate?: number;     // 최대 참여율 (%)
  minOrderSize?: number;            // 최소 주문 크기
  maxOrderSize?: number;            // 최대 주문 크기
  priceLimit?: {
    upper?: number;
    lower?: number;
  };
}

/**
 * TWAP 파라미터
 */
export interface TWAPParameters extends AlgorithmParameters {
  intervalSeconds: number;          // 실행 간격 (초)
  sliceCount: number;               // 분할 수
  allowOvershoot: boolean;          // 초과 허용 여부
}

/**
 * VWAP 파라미터
 */
export interface VWAPParameters extends AlgorithmParameters {
  lookbackPeriod: number;           // 과거 데이터 기간 (분)
  volumeProfile: Array<{
    time: number;                    // 시간 (분)
    expectedVolume: number;          // 예상 거래량
    participationRate: number;       // 참여율 (%)
  }>;
}

/**
 * POV 파라미터
 */
export interface POVParameters extends AlgorithmParameters {
  targetParticipationRate: number;   // 목표 참여율 (%)
  minParticipationRate: number;      // 최소 참여율 (%)
  maxParticipationRate: number;      // 최대 참여율 (%)
  adjustmentFactor: number;          // 조정 계수
}

/**
 * 알고리즘 실행 인스턴스
 */
export interface AlgorithmInstance {
  id: string;
  type: AlgorithmType;
  parameters: AlgorithmParameters;
  status: AlgorithmStatus;
  createdTime: Date;
  startTime?: Date;
  endTime?: Date;
  currentProgress: number;          // 현재 진행률 (0-1)
  executedQuantity: number;         // 실행된 수량
  remainingQuantity: number;         // 남은 수량
  averageExecutionPrice: number;     // 평균 실행 가격
  totalCost: number;                 // 총비용
  orders: Order[];                   // 생성된 주문들
  lastUpdateTime: Date;
  error?: string;
}

/**
 * 알고리즘 실행 결과
 */
export interface AlgorithmExecutionResult {
  instanceId: string;
  status: AlgorithmStatus;
  executedQuantity: number;
  averagePrice: number;
  totalCost: number;
  slippage: number;                  // 슬리피지
  timingCost: number;                // 타이밍 비용
  marketImpact: number;              // 시장 영향
  orders: Order[];
  performance: {
    sharpeRatio?: number;
    maxDrawdown?: number;
    winRate?: number;
  };
}

/**
 * 알고리즘 콜백
 */
export interface AlgorithmCallbacks {
  onOrderPlaced?: (order: Order) => void;
  onOrderFilled?: (order: Order) => void;
  onProgressUpdate?: (instance: AlgorithmInstance) => void;
  onError?: (instance: AlgorithmInstance, error: Error) => void;
  onComplete?: (result: AlgorithmExecutionResult) => void;
}

/**
 * 알고리즘 트레이딩 엔진
 */
export class AlgorithmEngine {
  private logger: Logger;
  private instances = new Map<string, AlgorithmInstance>();
  private activeTimers = new Map<string, NodeJS.Timeout>();
  private marketDataCache = new Map<string, MarketData[]>();
  private callbacks = new Map<string, AlgorithmCallbacks>();

  constructor() {
    this.logger = new ConsoleLogger('algorithm-engine');
  }

  // ==========================================================================
  // ALGORITHM EXECUTION
  // ==========================================================================

  /**
   * TWAP 알고리즘 실행
   */
  async executeTWAP(
    parameters: TWAPParameters,
    callbacks?: AlgorithmCallbacks
  ): Promise<string> {
    this.validateParameters(parameters);

    const instance = this.createAlgorithmInstance(
      AlgorithmType.TWAP,
      parameters,
      callbacks
    );

    this.instances.set(instance.id, instance);
    if (callbacks) {
      this.callbacks.set(instance.id, callbacks);
    }

    // 첫 실행
    this.scheduleNextTWAPExecution(instance);

    this.logger.info(`TWAP algorithm started: ${instance.id}`);
    return instance.id;
  }

  /**
   * VWAP 알고리즘 실행
   */
  async executeVWAP(
    parameters: VWAPParameters,
    callbacks?: AlgorithmCallbacks
  ): Promise<string> {
    this.validateParameters(parameters);

    const instance = this.createAlgorithmInstance(
      AlgorithmType.VWAP,
      parameters,
      callbacks
    );

    this.instances.set(instance.id, instance);
    if (callbacks) {
      this.callbacks.set(instance.id, callbacks);
    }

    // 첫 실행
    this.scheduleNextVWAPExecution(instance);

    this.logger.info(`VWAP algorithm started: ${instance.id}`);
    return instance.id;
  }

  /**
   * POV 알고리즘 실행
   */
  async executePOV(
    parameters: POVParameters,
    callbacks?: AlgorithmCallbacks
  ): Promise<string> {
    this.validateParameters(parameters);

    const instance = this.createAlgorithmInstance(
      AlgorithmType.POV,
      parameters,
      callbacks
    );

    this.instances.set(instance.id, instance);
    if (callbacks) {
      this.callbacks.set(instance.id, callbacks);
    }

    // 첫 실행
    this.scheduleNextPOVExecution(instance);

    this.logger.info(`POV algorithm started: ${instance.id}`);
    return instance.id;
  }

  // ==========================================================================
  // ALGORITHM CONTROL
  // ==========================================================================

  /**
   * 알고리즘 일시 정지
   */
  async pauseAlgorithm(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Algorithm instance not found: ${instanceId}`,
        'algorithm-engine'
      );
    }

    if (instance.status !== AlgorithmStatus.RUNNING) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_STATE,
        `Cannot pause algorithm in ${instance.status} state`,
        'algorithm-engine'
      );
    }

    instance.status = AlgorithmStatus.PAUSED;
    instance.lastUpdateTime = new Date();

    // 타이머 취소
    const timer = this.activeTimers.get(instanceId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(instanceId);
    }

    this.logger.info(`Algorithm paused: ${instanceId}`);
  }

  /**
   * 알고리즘 재개
   */
  async resumeAlgorithm(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Algorithm instance not found: ${instanceId}`,
        'algorithm-engine'
      );
    }

    if (instance.status !== AlgorithmStatus.PAUSED) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_STATE,
        `Cannot resume algorithm in ${instance.status} state`,
        'algorithm-engine'
      );
    }

    instance.status = AlgorithmStatus.RUNNING;
    instance.lastUpdateTime = new Date();

    // 실행 재개
    this.scheduleNextExecution(instance);

    this.logger.info(`Algorithm resumed: ${instanceId}`);
  }

  /**
   * 알고리즘 취소
   */
  async cancelAlgorithm(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NOT_FOUND,
        `Algorithm instance not found: ${instanceId}`,
        'algorithm-engine'
      );
    }

    instance.status = AlgorithmStatus.CANCELLED;
    instance.lastUpdateTime = new Date();

    // 타이머 취소
    const timer = this.activeTimers.get(instanceId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(instanceId);
    }

    // 진행 중인 주문 취소 (실제 구현에서는 API 호출)
    await this.cancelPendingOrders(instance);

    this.logger.info(`Algorithm cancelled: ${instanceId}`);
  }

  // ==========================================================================
  // TWAP IMPLEMENTATION
  // ==========================================================================

  /**
   * TWAP 다음 실행 예약
   */
  private scheduleNextTWAPExecution(instance: AlgorithmInstance): void {
    const params = instance.parameters as TWAPParameters;

    if (instance.status !== AlgorithmStatus.RUNNING) {
      return;
    }

    const now = new Date();
    if (now >= params.endTime) {
      this.completeAlgorithm(instance);
      return;
    }

    // 다음 실행 시간 계산
    const nextExecutionTime = new Date(now.getTime() + params.intervalSeconds * 1000);

    // 종료 시간을 초과하는지 확인
    if (nextExecutionTime > params.endTime) {
      nextExecutionTime.setTime(params.endTime.getTime());
    }

    const delay = nextExecutionTime.getTime() - now.getTime();

    const timer = setTimeout(() => {
      this.executeTWAPSlice(instance);
    }, delay);

    this.activeTimers.set(instance.id, timer);
  }

  /**
   * TWAP 슬라이스 실행
   */
  private async executeTWAPSlice(instance: AlgorithmInstance): Promise<void> {
    const params = instance.parameters as TWAPParameters;

    try {
      const sliceQuantity = this.calculateTWAPSliceQuantity(instance, params);

      if (sliceQuantity <= 0) {
        this.completeAlgorithm(instance);
        return;
      }

      // 주문 생성 (실제 구현에서는 KSET API 호출)
      const order = await this.createOrder({
        symbol: params.symbol,
        side: params.side,
        orderType: OrderType.MARKET,
        quantity: sliceQuantity
      });

      instance.orders.push(order);
      instance.executedQuantity += order.filledQuantity || 0;
      instance.remainingQuantity = Math.max(0, params.totalQuantity - instance.executedQuantity);
      instance.currentProgress = instance.executedQuantity / params.totalQuantity;
      instance.lastUpdateTime = new Date();

      // 콜백 호출
      this.triggerCallbacks(instance.id, 'onOrderPlaced', order);

      if (order.status === OrderStatus.FILLED) {
        instance.averageExecutionPrice = this.calculateAveragePrice(instance);
        this.triggerCallbacks(instance.id, 'onOrderFilled', order);
      }

      this.triggerCallbacks(instance.id, 'onProgressUpdate', instance);

      // 다음 실행 예약
      this.scheduleNextTWAPExecution(instance);

    } catch (error) {
      this.handleAlgorithmError(instance, error as Error);
    }
  }

  /**
   * TWAP 슬라이스 수량 계산
   */
  private calculateTWAPSliceQuantity(instance: AlgorithmInstance, params: TWAPParameters): number {
    const remainingTime = params.endTime.getTime() - Date.now();
    const remainingSlices = Math.ceil(remainingTime / (params.intervalSeconds * 1000));

    if (remainingSlices <= 0) {
      return instance.remainingQuantity;
    }

    let sliceQuantity = instance.remainingQuantity / remainingSlices;

    // 최소/최대 주문 크기 조정
    if (params.minOrderSize && sliceQuantity < params.minOrderSize) {
      sliceQuantity = params.minOrderSize;
    }

    if (params.maxOrderSize && sliceQuantity > params.maxOrderSize) {
      sliceQuantity = params.maxOrderSize;
    }

    return Math.floor(sliceQuantity);
  }

  // ==========================================================================
  // VWAP IMPLEMENTATION
  // ==========================================================================

  /**
   * VWAP 다음 실행 예약
   */
  private scheduleNextVWAPExecution(instance: AlgorithmInstance): void {
    const params = instance.parameters as VWAPParameters;

    if (instance.status !== AlgorithmStatus.RUNNING) {
      return;
    }

    const now = new Date();
    if (now >= params.endTime) {
      this.completeAlgorithm(instance);
      return;
    }

    // 현재 시간에 해당하는 볼륨 프로필 찾기
    const currentProfile = this.getCurrentVWAPProfile(params, now);
    if (!currentProfile) {
      this.scheduleNextVWAPExecution(instance);
      return;
    }

    const delay = 60000; // 1분 간격

    const timer = setTimeout(() => {
      this.executeVWAPSlice(instance, currentProfile);
    }, delay);

    this.activeTimers.set(instance.id, timer);
  }

  /**
   * VWAP 슬라이스 실행
   */
  private async executeVWAPSlice(
    instance: AlgorithmInstance,
    profile: { expectedVolume: number; participationRate: number }
  ): Promise<void> {
    const params = instance.parameters as VWAPParameters;

    try {
      const targetQuantity = Math.floor(
        profile.expectedVolume * (profile.participationRate / 100)
      );

      if (targetQuantity <= 0 || targetQuantity > instance.remainingQuantity) {
        this.scheduleNextVWAPExecution(instance);
        return;
      }

      // 주문 생성
      const order = await this.createOrder({
        symbol: params.symbol,
        side: params.side,
        orderType: OrderType.LIMIT,
        quantity: targetQuantity,
        price: this.calculateVWAPPrice(params)
      });

      instance.orders.push(order);
      instance.executedQuantity += order.filledQuantity || 0;
      instance.remainingQuantity = Math.max(0, params.totalQuantity - instance.executedQuantity);
      instance.currentProgress = instance.executedQuantity / params.totalQuantity;
      instance.lastUpdateTime = new Date();

      this.triggerCallbacks(instance.id, 'onOrderPlaced', order);

      if (order.status === OrderStatus.FILLED) {
        instance.averageExecutionPrice = this.calculateAveragePrice(instance);
        this.triggerCallbacks(instance.id, 'onOrderFilled', order);
      }

      this.triggerCallbacks(instance.id, 'onProgressUpdate', instance);

      // 다음 실행 예약
      this.scheduleNextVWAPExecution(instance);

    } catch (error) {
      this.handleAlgorithmError(instance, error as Error);
    }
  }

  /**
   * 현재 VWAP 프로필 조회
   */
  private getCurrentVWAPProfile(params: VWAPParameters, currentTime: Date): {
    expectedVolume: number;
    participationRate: number;
  } | null {
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();

    for (const profile of params.volumeProfile) {
      if (Math.abs(profile.time - currentMinutes) < 1) {
        return {
          expectedVolume: profile.expectedVolume,
          participationRate: profile.participationRate
        };
      }
    }

    return null;
  }

  /**
   * VWAP 가격 계산
   */
  private calculateVWAPPrice(params: AlgorithmParameters): number {
    // 실제 구현에서는 과거 VWAP 데이터 기반으로 가격 계산
    // 여기서는 시장가 기준으로 약간 조정
    const marketData = this.getLatestMarketData(params.symbol);
    if (!marketData) {
      throw KSETErrorFactory.create(
        ERROR_CODES.MARKET_DATA_UNAVAILABLE,
        'Market data not available for price calculation',
        'algorithm-engine'
      );
    }

    const adjustment = params.side === OrderSide.BUY ? -0.01 : 0.01; // 0.01% 조정
    return marketData.currentPrice * (1 + adjustment);
  }

  // ==========================================================================
  // POV IMPLEMENTATION
  // ==========================================================================

  /**
   * POV 다음 실행 예약
   */
  private scheduleNextPOVExecution(instance: AlgorithmInstance): void {
    const params = instance.parameters as POVParameters;

    if (instance.status !== AlgorithmStatus.RUNNING) {
      return;
    }

    const now = new Date();
    if (now >= params.endTime) {
      this.completeAlgorithm(instance);
      return;
    }

    const delay = 30000; // 30초 간격

    const timer = setTimeout(() => {
      this.executePOVSlice(instance);
    }, delay);

    this.activeTimers.set(instance.id, timer);
  }

  /**
   * POV 슬라이스 실행
   */
  private async executePOVSlice(instance: AlgorithmInstance): Promise<void> {
    const params = instance.parameters as POVParameters;

    try {
      const marketData = this.getLatestMarketData(params.symbol);
      if (!marketData) {
        this.scheduleNextPOVExecution(instance);
        return;
      }

      // 현재 거래량 기반으로 주문 크기 계산
      const currentVolume = marketData.volume;
      const targetParticipationRate = this.calculatePOVParticipationRate(
        instance,
        params,
        currentVolume
      );

      const targetQuantity = Math.floor(
        currentVolume * (targetParticipationRate / 100)
      );

      if (targetQuantity <= 0 || targetQuantity > instance.remainingQuantity) {
        this.scheduleNextPOVExecution(instance);
        return;
      }

      // 주문 생성
      const order = await this.createOrder({
        symbol: params.symbol,
        side: params.side,
        orderType: OrderType.LIMIT,
        quantity: targetQuantity,
        price: this.calculatePOVPrice(params, marketData)
      });

      instance.orders.push(order);
      instance.executedQuantity += order.filledQuantity || 0;
      instance.remainingQuantity = Math.max(0, params.totalQuantity - instance.executedQuantity);
      instance.currentProgress = instance.executedQuantity / params.totalQuantity;
      instance.lastUpdateTime = new Date();

      this.triggerCallbacks(instance.id, 'onOrderPlaced', order);

      if (order.status === OrderStatus.FILLED) {
        instance.averageExecutionPrice = this.calculateAveragePrice(instance);
        this.triggerCallbacks(instance.id, 'onOrderFilled', order);
      }

      this.triggerCallbacks(instance.id, 'onProgressUpdate', instance);

      // 다음 실행 예약
      this.scheduleNextPOVExecution(instance);

    } catch (error) {
      this.handleAlgorithmError(instance, error as Error);
    }
  }

  /**
   * POV 참여율 계산
   */
  private calculatePOVParticipationRate(
    instance: AlgorithmInstance,
    params: POVParameters,
    currentVolume: number
  ): number {
    // 목표 참여율과 현재 진행률 기반으로 조정
    const targetRate = params.targetParticipationRate;
    const progressRate = instance.currentProgress;

    // 진행이 늦으면 참여율 증가
    let adjustedRate = targetRate;
    if (progressRate < 0.5 && instance.remainingQuantity > params.totalQuantity * 0.6) {
      adjustedRate = Math.min(targetRate * 1.5, params.maxParticipationRate);
    }

    // 진행이 빠르면 참여율 감소
    if (progressRate > 0.8) {
      adjustedRate = Math.max(targetRate * 0.7, params.minParticipationRate);
    }

    return adjustedRate;
  }

  /**
   * POV 가격 계산
   */
  private calculatePOVPrice(params: AlgorithmParameters, marketData: MarketData): number {
    // POV는 시장가에 근접하게 실행
    const spread = marketData.askPrice - marketData.bidPrice;
    const midPrice = (marketData.askPrice + marketData.bidPrice) / 2;

    if (params.side === OrderSide.BUY) {
      return Math.min(marketData.askPrice, midPrice + spread * 0.1);
    } else {
      return Math.max(marketData.bidPrice, midPrice - spread * 0.1);
    }
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 알고리즘 인스턴스 생성
   */
  private createAlgorithmInstance(
    type: AlgorithmType,
    parameters: AlgorithmParameters,
    callbacks?: AlgorithmCallbacks
  ): AlgorithmInstance {
    const instance: AlgorithmInstance = {
      id: this.generateAlgorithmId(type),
      type,
      parameters,
      status: AlgorithmStatus.PENDING,
      createdTime: new Date(),
      currentProgress: 0,
      executedQuantity: 0,
      remainingQuantity: parameters.totalQuantity,
      averageExecutionPrice: 0,
      totalCost: 0,
      orders: [],
      lastUpdateTime: new Date()
    };

    return instance;
  }

  /**
   * 다음 실행 예약 (공통)
   */
  private scheduleNextExecution(instance: AlgorithmInstance): void {
    switch (instance.type) {
      case AlgorithmType.TWAP:
        this.scheduleNextTWAPExecution(instance);
        break;
      case AlgorithmType.VWAP:
        this.scheduleNextVWAPExecution(instance);
        break;
      case AlgorithmType.POV:
        this.scheduleNextPOVExecution(instance);
        break;
    }
  }

  /**
   * 알고리즘 완료
   */
  private completeAlgorithm(instance: AlgorithmInstance): void {
    instance.status = AlgorithmStatus.COMPLETED;
    instance.endTime = new Date();
    instance.lastUpdateTime = new Date();

    // 타이머 정리
    const timer = this.activeTimers.get(instance.id);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(instance.id);
    }

    // 실행 결과 생성
    const result = this.generateExecutionResult(instance);

    this.triggerCallbacks(instance.id, 'onComplete', result);
    this.logger.info(`Algorithm completed: ${instance.id}`);
  }

  /**
   * 알고리즘 오류 처리
   */
  private handleAlgorithmError(instance: AlgorithmInstance, error: Error): void {
    instance.status = AlgorithmStatus.ERROR;
    instance.error = error.message;
    instance.lastUpdateTime = new Date();

    // 타이머 정리
    const timer = this.activeTimers.get(instance.id);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(instance.id);
    }

    this.triggerCallbacks(instance.id, 'onError', instance, error);
    this.logger.error(`Algorithm error: ${instance.id}`, error);
  }

  /**
   * 콜백 트리거
   */
  private triggerCallbacks<T>(
    instanceId: string,
    callbackType: keyof AlgorithmCallbacks,
    data: T
  ): void {
    const callbacks = this.callbacks.get(instanceId);
    if (callbacks && callbacks[callbackType]) {
      try {
        (callbacks[callbackType] as Function)(data);
      } catch (error) {
        this.logger.error(`Callback error for ${instanceId}:`, error);
      }
    }
  }

  /**
   * 실행 결과 생성
   */
  private generateExecutionResult(instance: AlgorithmInstance): AlgorithmExecutionResult {
    return {
      instanceId: instance.id,
      status: instance.status,
      executedQuantity: instance.executedQuantity,
      averagePrice: instance.averageExecutionPrice,
      totalCost: instance.totalCost,
      slippage: this.calculateSlippage(instance),
      timingCost: this.calculateTimingCost(instance),
      marketImpact: this.calculateMarketImpact(instance),
      orders: instance.orders,
      performance: {
        sharpeRatio: 0, // TODO: 실제 성능 지표 계산
        maxDrawdown: 0,
        winRate: 0
      }
    };
  }

  /**
   * 알고리즘 ID 생성
   */
  private generateAlgorithmId(type: AlgorithmType): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    return `${type}-${timestamp}-${random}`;
  }

  /**
   * 파라미터 유효성 검증
   */
  private validateParameters(parameters: AlgorithmParameters): void {
    if (!parameters.symbol) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'Symbol is required',
        'algorithm-engine'
      );
    }

    if (!parameters.side) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'Order side is required',
        'algorithm-engine'
      );
    }

    if (!parameters.totalQuantity || parameters.totalQuantity <= 0) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'Total quantity must be greater than 0',
        'algorithm-engine'
      );
    }

    if (parameters.startTime >= parameters.endTime) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'End time must be after start time',
        'algorithm-engine'
      );
    }

    if (parameters.endTime <= new Date()) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_PARAMETERS,
        'End time must be in the future',
        'algorithm-engine'
      );
    }
  }

  /**
   * 주문 생성 (시뮬레이션)
   */
  private async createOrder(orderRequest: OrderRequest): Promise<Order> {
    // 실제 구현에서는 KSET API를 통해 주문 생성
    const mockOrder: Order = {
      id: this.generateOrderId(),
      providerOrderId: this.generateOrderId(),
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      orderType: orderRequest.orderType,
      quantity: orderRequest.quantity,
      price: orderRequest.price || 0,
      status: OrderStatus.FILLED,
      filledQuantity: orderRequest.quantity,
      remainingQuantity: 0,
      averageFillPrice: orderRequest.price || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      provider: 'algorithm-engine',
      rawData: orderRequest
    };

    return mockOrder;
  }

  /**
   * 주문 ID 생성
   */
  private generateOrderId(): string {
    return `algo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 진행 중인 주문 취소
   */
  private async cancelPendingOrders(instance: AlgorithmInstance): Promise<void> {
    // 실제 구현에서는 KSET API를 통해 주문 취소
    this.logger.info(`Cancelling ${instance.orders.length} orders for instance ${instance.id}`);
  }

  /**
   * 평균 가격 계산
   */
  private calculateAveragePrice(instance: AlgorithmInstance): number {
    const filledOrders = instance.orders.filter(order => order.status === OrderStatus.FILLED);

    if (filledOrders.length === 0) {
      return 0;
    }

    const totalValue = filledOrders.reduce((sum, order) => {
      return sum + (order.averageFillPrice * order.filledQuantity);
    }, 0);

    const totalQuantity = filledOrders.reduce((sum, order) => sum + order.filledQuantity, 0);

    return totalQuantity > 0 ? totalValue / totalQuantity : 0;
  }

  /**
   * 슬리피지 계산
   */
  private calculateSlippage(instance: AlgorithmInstance): number {
    // 실제 구현에서는 목표 가격 대비 실행 가격 차이 계산
    return 0.01; // 0.01% 슬리피지 (시뮬레이션)
  }

  /**
   * 타이밍 비용 계산
   */
  private calculateTimingCost(instance: AlgorithmInstance): number {
    // 실제 구현에서는 시장 움직임에 따른 비용 계산
    return 0.005; // 0.005% 타이밍 비용 (시뮬레이션)
  }

  /**
   * 시장 영향 계산
   */
  private calculateMarketImpact(instance: AlgorithmInstance): number {
    // 실제 구현에서는 주문 크기에 따른 시장 영향 계산
    return 0.02; // 0.02% 시장 영향 (시뮬레이션)
  }

  /**
   * 최신 시장 데이터 조회
   */
  private getLatestMarketData(symbol: string): MarketData | null {
    const cache = this.marketDataCache.get(symbol);
    if (cache && cache.length > 0) {
      return cache[cache.length - 1];
    }
    return null;
  }

  /**
   * 시장 데이터 업데이트
   */
  updateMarketData(symbol: string, data: MarketData): void {
    if (!this.marketDataCache.has(symbol)) {
      this.marketDataCache.set(symbol, []);
    }

    const cache = this.marketDataCache.get(symbol)!;
    cache.push(data);

    // 최근 100개 데이터만 유지
    if (cache.length > 100) {
      cache.splice(0, cache.length - 100);
    }
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * 알고리즘 인스턴스 조회
   */
  getAlgorithmInstance(instanceId: string): AlgorithmInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * 모든 알고리즘 인스턴스 조회
   */
  getAllAlgorithmInstances(): AlgorithmInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * 알고리즘 통계
   */
  getAlgorithmStatistics(): {
    total: number;
    running: number;
    completed: number;
    cancelled: number;
    error: number;
  } {
    const instances = Array.from(this.instances.values());

    return {
      total: instances.length,
      running: instances.filter(i => i.status === AlgorithmStatus.RUNNING).length,
      completed: instances.filter(i => i.status === AlgorithmStatus.COMPLETED).length,
      cancelled: instances.filter(i => i.status === AlgorithmStatus.CANCELLED).length,
      error: instances.filter(i => i.status === AlgorithmStatus.ERROR).length
    };
  }

  /**
   * 활성 타이머 수
   */
  getActiveTimerCount(): number {
    return this.activeTimers.size;
  }
}