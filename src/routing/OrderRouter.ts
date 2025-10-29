/**
 * Smart Order Router
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 스마트 오더 라우팅 시스템
 */

import {
  OrderRequest,
  Order,
  ProviderCapabilities,
  BrokerInfo,
  ApiResponse,
  MarketData,
  Balance,
  Position
} from '@/interfaces';

import {
  OrderType,
  OrderSide,
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
 * 라우팅 전략
 */
export enum RoutingStrategy {
  BEST_PRICE = 'best-price',           // 최우선 가격
  FASTEST_EXECUTION = 'fastest-execution', // 최고 속도
  LOWEST_COST = 'lowest-cost',         // 최저 수수료
  HIGHEST_RELIABILITY = 'highest-reliability', // 최고 신뢰성
  BALANCED = 'balanced',               // 균형
  CUSTOM = 'custom'                    // 사용자 정의
}

/**
 * 라우팅 우선순위
 */
export interface RoutingPriority {
  strategy: RoutingStrategy;
  maxProviders?: number;
  minLiquidity?: number;
  maxLatency?: number;
  maxCost?: number;
  customWeights?: {
    price: number;
    speed: number;
    cost: number;
    reliability: number;
  };
}

/**
 * 라우팅 평가 지표
 */
export interface RoutingMetrics {
  providerId: string;
  price: number;
  latency: number;
  cost: number;
  reliability: number;
  liquidity: number;
  score: number;
  lastUpdated: number;
}

/**
 * 라우팅 결과
 */
export interface RoutingResult {
  selectedProviders: string[];
  routingStrategy: RoutingStrategy;
  totalQuantity: number;
  allocatedQuantities: Map<string, number>;
  expectedPrice: number;
  estimatedCost: number;
  estimatedLatency: number;
  confidence: number;
  reasoning: string;
  alternatives: RoutingResult[];
}

/**
 * 라우팅 설정
 */
export interface RoutingConfig {
  defaultStrategy: RoutingStrategy;
  enableSplitOrders: boolean;
  maxSplitProviders: number;
  minOrderSize: number;
  enableRebalancing: boolean;
  rebalanceThreshold: number;
  metricsUpdateInterval: number;
  fallbackProviders: string[];
}

/**
 * 스마트 오더 라우터
 */
export class OrderRouter {
  private config: RoutingConfig;
  private providers: Map<string, BrokerInfo> = new Map();
  private capabilities: Map<string, ProviderCapabilities> = new Map();
  private metrics: Map<string, RoutingMetrics> = new Map();
  private logger: Logger;
  private lastMetricsUpdate = 0;

  constructor(config?: Partial<RoutingConfig>) {
    this.config = {
      defaultStrategy: RoutingStrategy.BEST_PRICE,
      enableSplitOrders: true,
      maxSplitProviders: 3,
      minOrderSize: 100000,
      enableRebalancing: true,
      rebalanceThreshold: 0.01,
      metricsUpdateInterval: 30000,
      fallbackProviders: [],
      ...config
    };

    this.logger = new ConsoleLogger('order-router');
  }

  // ==========================================================================
  // PROVIDER MANAGEMENT
  // ==========================================================================

  /**
   * Provider 등록
   */
  registerProvider(providerId: string, brokerInfo: BrokerInfo, capabilities: ProviderCapabilities): void {
    this.providers.set(providerId, brokerInfo);
    this.capabilities.set(providerId, capabilities);

    // 초기 메트릭 설정
    this.metrics.set(providerId, {
      providerId,
      price: 0,
      latency: brokerInfo.averageResponseTime || 1000,
      cost: brokerInfo.fees?.trading?.percentage || 0.01,
      reliability: brokerInfo.uptime || 99.9,
      liquidity: 0,
      score: 0,
      lastUpdated: Date.now()
    });

    this.logger.info(`Provider registered: ${providerId}`);
  }

  /**
   * Provider 제거
   */
  unregisterProvider(providerId: string): void {
    this.providers.delete(providerId);
    this.capabilities.delete(providerId);
    this.metrics.delete(providerId);
    this.logger.info(`Provider unregistered: ${providerId}`);
  }

  /**
   * 사용 가능한 Provider 목록
   */
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // ==========================================================================
  // ROUTING METHODS
  // ==========================================================================

  /**
   * 스마트 오더 라우팅
   */
  async routeOrder(
    orderRequest: OrderRequest,
    priority?: RoutingPriority
  ): Promise<RoutingResult> {
    this.validateOrderRequest(orderRequest);

    const strategy = priority?.strategy || this.config.defaultStrategy;
    const eligibleProviders = this.getEligibleProviders(orderRequest);

    if (eligibleProviders.length === 0) {
      throw KSETErrorFactory.create(
        ERROR_CODES.NO_ELIGIBLE_PROVIDERS,
        'No eligible providers available for this order',
        'order-router'
      );
    }

    // 메트릭 업데이트
    await this.updateMetrics();

    // Provider 평가 및 선택
    const scoredProviders = await this.scoreProviders(eligibleProviders, orderRequest, priority);

    // 주문 분할 결정
    const shouldSplit = this.shouldSplitOrder(orderRequest, scoredProviders);

    if (shouldSplit && this.config.enableSplitOrders) {
      return this.createSplitRoutingResult(orderRequest, scoredProviders, priority);
    } else {
      return this.createSingleRoutingResult(orderRequest, scoredProviders, priority);
    }
  }

  /**
   * 자동 리밸런싱
   */
  async rebalanceOrder(
    originalRouting: RoutingResult,
    currentMarketData: Map<string, MarketData>
  ): Promise<RoutingResult> {
    if (!this.config.enableRebalancing) {
      return originalRouting;
    }

    // 현재 시장 데이터 기반으로 재평가
    const updatedMetrics = await this.evaluateCurrentMarket(currentMarketData);

    // 리밸런싱 필요 여부 확인
    const needsRebalancing = this.needsRebalancing(originalRouting, updatedMetrics);

    if (!needsRebalancing) {
      return originalRouting;
    }

    this.logger.info('Rebalancing order due to market changes');

    // 새로운 라우팅 계획 생성
    // 실제 구현에서는 현재 진행 중인 주문을 고려해야 함
    return originalRouting; // 단순화된 반환
  }

  // ==========================================================================
  // PROVIDER EVALUATION
  // ==========================================================================

  /**
   * 적격 Provider 목록
   */
  private getEligibleProviders(orderRequest: OrderRequest): string[] {
    const eligible: string[] = [];

    for (const [providerId, capabilities] of this.capabilities.entries()) {
      if (this.isProviderEligible(capabilities, orderRequest)) {
        eligible.push(providerId);
      }
    }

    return eligible;
  }

  /**
   * Provider 적격성 확인
   */
  private isProviderEligible(capabilities: ProviderCapabilities, orderRequest: OrderRequest): boolean {
    // 기본 기능 확인
    if (!capabilities.trading) {
      return false;
    }

    // 주문 타입 지원 확인
    const supportedOrderTypes = capabilities.supportedOrderTypes || [];
    if (!supportedOrderTypes.includes(orderRequest.orderType)) {
      return false;
    }

    // 시장 지원 확인
    if (capabilities.supportedMarkets) {
      // 실제 구현에서는 종목 코드로 시장 타입을 확인해야 함
      // const marketType = this.detectMarketType(orderRequest.symbol);
      // if (!capabilities.supportedMarkets.includes(marketType)) {
      //   return false;
      // }
    }

    // 최소 주문 크기 확인
    const minOrderSize = capabilities.limits?.minOrderSize || 0;
    const orderValue = orderRequest.quantity * (orderRequest.price || 0);
    if (orderValue < minOrderSize) {
      return false;
    }

    return true;
  }

  /**
   * Provider 평가 점수 계산
   */
  private async scoreProviders(
    providers: string[],
    orderRequest: OrderRequest,
    priority?: RoutingPriority
  ): Promise<RoutingMetrics[]> {
    const scoredProviders: RoutingMetrics[] = [];

    for (const providerId of providers) {
      const metrics = this.metrics.get(providerId);
      if (!metrics) continue;

      // 시장 상황에 따른 점수 조정
      const adjustedMetrics = await this.adjustMetricsForMarket(
        providerId,
        metrics,
        orderRequest
      );

      // 최종 점수 계산
      adjustedMetrics.score = this.calculateFinalScore(adjustedMetrics, priority);
      scoredProviders.push(adjustedMetrics);
    }

    // 점수순 정렬
    return scoredProviders.sort((a, b) => b.score - a.score);
  }

  /**
   * 최종 점수 계산
   */
  private calculateFinalScore(metrics: RoutingMetrics, priority?: RoutingPriority): number {
    const weights = this.getStrategyWeights(priority?.strategy || this.config.defaultStrategy);

    if (priority?.customWeights) {
      Object.assign(weights, priority.customWeights);
    }

    // 정규화된 점수 계산 (0-1 범위)
    const normalizedPrice = 1 - (metrics.price / 100000); // 가격이 낮을수록 좋음
    const normalizedSpeed = 1 - (metrics.latency / 5000); // 지연이 낮을수록 좋음
    const normalizedCost = 1 - (metrics.cost / 0.1); // 수수료가 낮을수록 좋음
    const normalizedReliability = metrics.reliability / 100; // 신뢰도가 높을수록 좋음
    const normalizedLiquidity = Math.min(metrics.liquidity / 1000000, 1); // 유동성이 높을수록 좋음

    return (
      normalizedPrice * weights.price +
      normalizedSpeed * weights.speed +
      normalizedCost * weights.cost +
      normalizedReliability * weights.reliability +
      normalizedLiquidity * weights.liquidity
    ) * 100;
  }

  /**
   * 전략별 가중치
   */
  private getStrategyWeights(strategy: RoutingStrategy): {
    price: number;
    speed: number;
    cost: number;
    reliability: number;
  } {
    switch (strategy) {
      case RoutingStrategy.BEST_PRICE:
        return { price: 0.5, speed: 0.1, cost: 0.1, reliability: 0.3 };

      case RoutingStrategy.FASTEST_EXECUTION:
        return { price: 0.1, speed: 0.6, cost: 0.1, reliability: 0.2 };

      case RoutingStrategy.LOWEST_COST:
        return { price: 0.2, speed: 0.1, cost: 0.6, reliability: 0.1 };

      case RoutingStrategy.HIGHEST_RELIABILITY:
        return { price: 0.2, speed: 0.1, cost: 0.1, reliability: 0.6 };

      case RoutingStrategy.BALANCED:
        return { price: 0.25, speed: 0.25, cost: 0.25, reliability: 0.25 };

      default:
        return { price: 0.25, speed: 0.25, cost: 0.25, reliability: 0.25 };
    }
  }

  // ==========================================================================
  // ORDER SPLITTING
  // ==========================================================================

  /**
   * 주문 분할 여부 결정
   */
  private shouldSplitOrder(
    orderRequest: OrderRequest,
    scoredProviders: RoutingMetrics[]
  ): boolean {
    // 주문 크기가 큰 경우 분할
    const orderValue = orderRequest.quantity * (orderRequest.price || 0);
    if (orderValue > this.config.minOrderSize && scoredProviders.length > 1) {
      return true;
    }

    // 여러 Provider가 유사한 점수를 가진 경우 분할
    if (scoredProviders.length >= 2) {
      const scoreDiff = scoredProviders[0].score - scoredProviders[1].score;
      if (scoreDiff < 10) { // 10점 미만 차이
        return true;
      }
    }

    return false;
  }

  /**
   * 분할 라우팅 결과 생성
   */
  private createSplitRoutingResult(
    orderRequest: OrderRequest,
    scoredProviders: RoutingMetrics[],
    priority?: RoutingPriority
  ): RoutingResult {
    const maxProviders = Math.min(
      priority?.maxProviders || this.config.maxSplitProviders,
      scoredProviders.length
    );

    const selectedProviders = scoredProviders.slice(0, maxProviders);
    const allocatedQuantities = new Map<string, number>();

    // 가중치 기반 수량 분배
    const totalWeight = selectedProviders.reduce((sum, p) => sum + p.score, 0);
    let remainingQuantity = orderRequest.quantity;

    for (let i = 0; i < selectedProviders.length; i++) {
      const provider = selectedProviders[i];

      if (i === selectedProviders.length - 1) {
        // 마지막 Provider는 남은 수량 전부 할당
        allocatedQuantities.set(provider.providerId, remainingQuantity);
      } else {
        const weight = provider.score / totalWeight;
        const allocated = Math.floor(orderRequest.quantity * weight);
        allocatedQuantities.set(provider.providerId, allocated);
        remainingQuantity -= allocated;
      }
    }

    // 예상 가격 및 비용 계산
    const expectedPrice = this.calculateWeightedPrice(selectedProviders, allocatedQuantities);
    const estimatedCost = this.calculateTotalCost(selectedProviders, allocatedQuantities, orderRequest);
    const estimatedLatency = Math.max(...selectedProviders.map(p => p.latency));

    return {
      selectedProviders: selectedProviders.map(p => p.providerId),
      routingStrategy: priority?.strategy || this.config.defaultStrategy,
      totalQuantity: orderRequest.quantity,
      allocatedQuantities,
      expectedPrice,
      estimatedCost,
      estimatedLatency,
      confidence: this.calculateRoutingConfidence(selectedProviders),
      reasoning: `Split order across ${selectedProviders.length} providers based on ${priority?.strategy || this.config.defaultStrategy} strategy`,
      alternatives: []
    };
  }

  /**
   * 단일 라우팅 결과 생성
   */
  private createSingleRoutingResult(
    orderRequest: OrderRequest,
    scoredProviders: RoutingMetrics[],
    priority?: RoutingPriority
  ): RoutingResult {
    const selectedProvider = scoredProviders[0];
    const allocatedQuantities = new Map<string, number>();
    allocatedQuantities.set(selectedProvider.providerId, orderRequest.quantity);

    return {
      selectedProviders: [selectedProvider.providerId],
      routingStrategy: priority?.strategy || this.config.defaultStrategy,
      totalQuantity: orderRequest.quantity,
      allocatedQuantities,
      expectedPrice: selectedProvider.price,
      estimatedCost: this.calculateOrderCost(selectedProvider, orderRequest),
      estimatedLatency: selectedProvider.latency,
      confidence: selectedProvider.score / 100,
      reasoning: `Selected ${selectedProvider.providerId} based on ${priority?.strategy || this.config.defaultStrategy} strategy with score ${selectedProvider.score.toFixed(2)}`,
      alternatives: this.generateAlternatives(scoredProviders.slice(1), orderRequest, priority)
    };
  }

  // ==========================================================================
  // METRICS MANAGEMENT
  // ==========================================================================

  /**
   * 메트릭 업데이트
   */
  private async updateMetrics(): Promise<void> {
    const now = Date.now();
    if (now - this.lastMetricsUpdate < this.config.metricsUpdateInterval) {
      return;
    }

    // 실제 구현에서는 각 Provider에 대한 실시간 데이터 수집
    // 여기서는 시뮬레이션

    this.lastMetricsUpdate = now;
  }

  /**
   * 시장 상황에 따른 메트릭 조정
   */
  private async adjustMetricsForMarket(
    providerId: string,
    metrics: RoutingMetrics,
    orderRequest: OrderRequest
  ): Promise<RoutingMetrics> {
    // 시장 상황에 따른 지연 시간 조정
    const adjustedLatency = this.adjustLatencyForMarketConditions(
      metrics.latency,
      orderRequest
    );

    // 유동성 평가
    const liquidity = await this.evaluateLiquidity(providerId, orderRequest);

    return {
      ...metrics,
      latency: adjustedLatency,
      liquidity,
      lastUpdated: Date.now()
    };
  }

  /**
   * 시장 상황에 따른 지연 시간 조정
   */
  private adjustLatencyForMarketConditions(
    baseLatency: number,
    orderRequest: OrderRequest
  ): number {
    // 장 시작/마감 시간에는 지연 증가
    const now = new Date();
    const hour = now.getHours();

    if ((hour >= 9 && hour <= 9.5) || (hour >= 14.5 && hour <= 15.5)) {
      return baseLatency * 1.5; // 50% 증가
    }

    // 대형 주문의 경우 지연 증가
    const orderValue = orderRequest.quantity * (orderRequest.price || 0);
    if (orderValue > 1000000000) { // 10억원 이상
      return baseLatency * 1.3; // 30% 증가
    }

    return baseLatency;
  }

  /**
   * 유동성 평가
   */
  private async evaluateLiquidity(providerId: string, orderRequest: OrderRequest): Promise<number> {
    // 실제 구현에서는 Provider의 호가 정보와 거래량 데이터로 유동성 계산
    // 여기서는 시뮬레이션된 값 반환
    return Math.random() * 1000000 + 100000; // 10만 ~ 110만
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 주문 요청 유효성 검증
   */
  private validateOrderRequest(orderRequest: OrderRequest): void {
    if (!orderRequest.symbol) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Symbol is required',
        'order-router'
      );
    }

    if (!orderRequest.side) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order side is required',
        'order-router'
      );
    }

    if (!orderRequest.orderType) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order type is required',
        'order-router'
      );
    }

    if (!orderRequest.quantity || orderRequest.quantity <= 0) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Order quantity must be greater than 0',
        'order-router'
      );
    }

    if (['LIMIT', 'STOP_LIMIT'].includes(orderRequest.orderType) &&
        (!orderRequest.price || orderRequest.price <= 0)) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_ORDER,
        'Price is required for limit orders',
        'order-router'
      );
    }
  }

  /**
   * 가중 평균 가격 계산
   */
  private calculateWeightedPrice(
    providers: RoutingMetrics[],
    allocations: Map<string, number>
  ): number {
    let totalPrice = 0;
    let totalQuantity = 0;

    for (const provider of providers) {
      const quantity = allocations.get(provider.providerId) || 0;
      totalPrice += provider.price * quantity;
      totalQuantity += quantity;
    }

    return totalQuantity > 0 ? totalPrice / totalQuantity : 0;
  }

  /**
   * 총비용 계산
   */
  private calculateTotalCost(
    providers: RoutingMetrics[],
    allocations: Map<string, number>,
    orderRequest: OrderRequest
  ): number {
    let totalCost = 0;

    for (const provider of providers) {
      const quantity = allocations.get(provider.providerId) || 0;
      const orderValue = quantity * (orderRequest.price || 0);
      totalCost += orderValue * provider.cost;
    }

    return totalCost;
  }

  /**
   * 주문 비용 계산
   */
  private calculateOrderCost(provider: RoutingMetrics, orderRequest: OrderRequest): number {
    const orderValue = orderRequest.quantity * (orderRequest.price || 0);
    return orderValue * provider.cost;
  }

  /**
   * 라우팅 신뢰도 계산
   */
  private calculateRoutingConfidence(providers: RoutingMetrics[]): number {
    if (providers.length === 0) return 0;

    const avgScore = providers.reduce((sum, p) => sum + p.score, 0) / providers.length;
    const scoreVariance = providers.reduce((sum, p) => sum + Math.pow(p.score - avgScore, 2), 0) / providers.length;

    // 점수가 높고 분산이 낮을수록 신뢰도 높음
    return Math.min((avgScore / 100) * (1 - scoreVariance / 10000), 1);
  }

  /**
   * 대안 생성
   */
  private generateAlternatives(
    providers: RoutingMetrics[],
    orderRequest: OrderRequest,
    priority?: RoutingPriority
  ): RoutingResult[] {
    const alternatives: RoutingResult[] = [];
    const maxAlternatives = Math.min(3, providers.length);

    for (let i = 0; i < maxAlternatives; i++) {
      const provider = providers[i];
      const allocatedQuantities = new Map<string, number>();
      allocatedQuantities.set(provider.providerId, orderRequest.quantity);

      alternatives.push({
        selectedProviders: [provider.providerId],
        routingStrategy: priority?.strategy || this.config.defaultStrategy,
        totalQuantity: orderRequest.quantity,
        allocatedQuantities,
        expectedPrice: provider.price,
        estimatedCost: this.calculateOrderCost(provider, orderRequest),
        estimatedLatency: provider.latency,
        confidence: provider.score / 100,
        reasoning: `Alternative provider ${provider.providerId} with score ${provider.score.toFixed(2)}`,
        alternatives: []
      });
    }

    return alternatives;
  }

  /**
   * 리밸런싱 필요 여부 확인
   */
  private needsRebalancing(
    originalRouting: RoutingResult,
    updatedMetrics: Map<string, RoutingMetrics>
  ): boolean {
    // 가격 변동 임계값 확인
    for (const providerId of originalRouting.selectedProviders) {
      const updated = updatedMetrics.get(providerId);
      if (!updated) continue;

      const priceChange = Math.abs(updated.price - originalRouting.expectedPrice) / originalRouting.expectedPrice;
      if (priceChange > this.config.rebalanceThreshold) {
        return true;
      }
    }

    return false;
  }

  /**
   * 현재 시장 평가
   */
  private async evaluateCurrentMarket(
    marketData: Map<string, MarketData>
  ): Promise<Map<string, RoutingMetrics>> {
    const updatedMetrics = new Map<string, RoutingMetrics>();

    for (const [providerId, existingMetrics] of this.metrics.entries()) {
      // 시장 데이터 기반으로 메트릭 업데이트
      const updated = { ...existingMetrics };

      // 실제 구현에서는 시장 데이터를 기반으로 가격, 유동성 등 업데이트
      updated.lastUpdated = Date.now();

      updatedMetrics.set(providerId, updated);
    }

    return updatedMetrics;
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * 라우팅 통계
   */
  getRoutingStatistics(): {
    totalProviders: number;
    activeProviders: string[];
    averageLatency: number;
    averageReliability: number;
    lastUpdate: number;
  } {
    const metrics = Array.from(this.metrics.values());

    return {
      totalProviders: this.providers.size,
      activeProviders: this.getAvailableProviders(),
      averageLatency: metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length,
      averageReliability: metrics.reduce((sum, m) => sum + m.reliability, 0) / metrics.length,
      lastUpdate: this.lastMetricsUpdate
    };
  }

  /**
   * 설정 업데이트
   */
  updateConfig(newConfig: Partial<RoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.logger.info('Routing configuration updated', newConfig);
  }

  /**
   * 현재 설정 조회
   */
  getConfig(): RoutingConfig {
    return { ...this.config };
  }
}