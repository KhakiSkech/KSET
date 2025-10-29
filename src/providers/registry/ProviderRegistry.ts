/**
 * Provider Registry Implementation
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * Provider 등록, 생성, 관리를 담당하는 레지스트리 시스템
 */

import {
  IKSETProvider,
  IProviderRegistry,
  ProviderConfig,
  ProviderInfo,
  ProviderComparison,
  ProviderHealthStatus,
  ErrorContext
} from '@/interfaces';

import {
  KSETErrorFactory,
  ERROR_CODES,
  RetryManager,
  CircuitBreaker
} from '@/errors';

import { KoreanMarketEngine } from '@/engines/KoreanMarketEngine';
import { KoreanComplianceEngine } from '@/engines/KoreanComplianceEngine';

/**
 * Provider 레지스트리 구현체
 */
export class ProviderRegistry implements IProviderRegistry {
  private providers = new Map<string, ProviderConstructor>();
  private instances = new Map<string, IKSETProvider>();
  private capabilities = new Map<string, any>();
  private marketEngine = new KoreanMarketEngine();
  private complianceEngine = new KoreanComplianceEngine();

  // Circuit Breaker for provider creation
  private creationCircuitBreaker = new CircuitBreaker({
    failureThreshold: 20,
    minimumThroughput: 5,
    timeout: 30000,
    halfOpenMaxCalls: 3
  });

  constructor() {
    this.setupErrorHandling();
  }

  // ==========================================================================
  // PROVIDER REGISTRATION
  // ==========================================================================

  /**
   * Provider 등록
   */
  register<T extends IKSETProvider>(providerClass: new () => T): void {
    const tempInstance = new providerClass();
    const providerId = tempInstance.id;

    // 중복 등록 확인
    if (this.providers.has(providerId)) {
      console.warn(`Provider ${providerId} is already registered. Overwriting...`);
    }

    // Provider 인터페이스 검증
    this.validateProviderInterface(tempInstance);

    // 등록
    this.providers.set(providerId, providerClass as ProviderConstructor);
    this.discoverCapabilities(tempInstance);

    console.log(`✅ Registered provider: ${tempInstance.name} (${providerId})`);

    // Provider 정보 출력
    this.logProviderInfo(tempInstance);
  }

  /**
   * 여러 Provider 일괄 등록
   */
  registerMultiple<T extends IKSETProvider>(providerClasses: (new () => T)[]): void {
    for (const providerClass of providerClasses) {
      try {
        this.register(providerClass);
      } catch (error) {
        console.error(`❌ Failed to register provider:`, error);
      }
    }
  }

  /**
   * Provider 등록 해제
   */
  unregister(providerId: string): boolean {
    const success = this.providers.delete(providerId);
    if (success) {
      // 관련 인스턴스 정리
      const instance = this.instances.get(providerId);
      if (instance) {
        this.disconnectProvider(instance);
        this.instances.delete(providerId);
      }

      this.capabilities.delete(providerId);
      console.log(`🗑️ Unregistered provider: ${providerId}`);
    }

    return success;
  }

  /**
   * 사용 가능한 Provider 목록 조회
   */
  getAvailableProviders(): ProviderInfo[] {
    const providers: ProviderInfo[] = [];

    for (const [providerId, ProviderClass] of this.providers.entries()) {
      const tempInstance = new ProviderClass();
      const capabilities = this.capabilities.get(providerId) || tempInstance.getCapabilities();

      providers.push({
        id: providerId,
        name: tempInstance.name,
        description: this.getProviderDescription(tempInstance),
        version: tempInstance.version,
        website: this.getProviderWebsite(tempInstance),
        capabilities,
        supportedMarkets: capabilities.limitations.supportedMarkets,
        status: this.getProviderStatus(tempInstance)
      });
    }

    return providers.sort((a, b) => a.name.localeCompare(b.name));
  }

  // ==========================================================================
  // PROVIDER CREATION & MANAGEMENT
  // ==========================================================================

  /**
   * Provider 생성
   */
  async createProvider(providerId: string, config: ProviderConfig): Promise<IKSETProvider> {
    try {
      return await this.creationCircuitBreaker.execute(async () => {
        const ProviderClass = this.providers.get(providerId);
        if (!ProviderClass) {
          throw KSETErrorFactory.create(
            ERROR_CODES.PROVIDER_NOT_SUPPORTED,
            `Provider ${providerId} not found. Available: ${Array.from(this.providers.keys()).join(', ')}`,
            'registry'
          );
        }

        // 설정 유효성 검증
        this.validateProviderConfig(providerId, config);

        // 기존 인스턴스 확인
        const existingInstance = this.instances.get(providerId);
        if (existingInstance) {
          console.warn(`Provider ${providerId} already exists. Returning existing instance.`);
          return existingInstance;
        }

        // 새 인스턴스 생성
        const instance = await this.createAndInitializeProvider(ProviderClass, config);

        // 인스턴스 등록
        this.instances.set(providerId, instance);

        // 상태 모니터링 시작
        this.startHealthMonitoring(providerId, instance);

        console.log(`🔗 Successfully created and initialized provider: ${instance.name}`);

        return instance;
      });
    } catch (error) {
      const ksetError = KSETErrorFactory.create(
        ERROR_CODES.INTERNAL_ERROR,
        `Failed to create provider ${providerId}: ${(error as Error).message}`,
        'registry',
        { originalError: error }
      );
      throw ksetError;
    }
  }

  /**
   * 다중 Provider 생성
   */
  async createMultipleProviders(
    configs: { brokerId: string; config: ProviderConfig }[]
  ): Promise<Map<string, IKSETProvider>> {
    const providers = new Map<string, IKSETProvider>();
    const errors: { brokerId: string; error: Error }[] = [];

    // 병렬 생성 시도
    const creationPromises = configs.map(async ({ brokerId, config }) => {
      try {
        const provider = await this.createProvider(brokerId, config);
        return { brokerId, provider, success: true };
      } catch (error) {
        errors.push({ brokerId, error: error as Error });
        return { brokerId, error, success: false };
      }
    });

    const results = await Promise.allSettled(creationPromises);

    // 결과 처리
    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const { brokerId, provider, success } = result.value;
        if (success) {
          providers.set(brokerId, provider);
        }
      }
    });

    // 에러 보고
    if (errors.length > 0) {
      console.error(`❌ Failed to create ${errors.length} providers:`, errors);
      for (const { brokerId, error } of errors) {
        console.error(`  - ${brokerId}: ${error.message}`);
      }
    }

    console.log(`✅ Created ${providers.size} providers successfully`);

    return providers;
  }

  /**
   * Provider 인스턴스 조회
   */
  getProviderInstance(providerId: string): IKSETProvider | undefined {
    return this.instances.get(providerId);
  }

  /**
   * 활성 Provider 목록 조회
   */
  getActiveProviders(): Map<string, IKSETProvider> {
    const activeProviders = new Map<string, IKSETProvider>();

    for (const [providerId, instance] of this.instances.entries()) {
      // TODO: 실제 활성 상태 확인 필요
      activeProviders.set(providerId, instance);
    }

    return activeProviders;
  }

  /**
   * 모든 Provider 연결 해제
   */
  async disconnectAllProviders(): Promise<void> {
    const disconnectPromises: Promise<void>[] = [];

    for (const [providerId, instance] of this.instances.entries()) {
      try {
        disconnectPromises.push(this.disconnectProvider(instance));
        console.log(`🔌 Disconnecting provider: ${providerId}`);
      } catch (error) {
        console.error(`❌ Failed to disconnect provider ${providerId}:`, error);
      }
    }

    await Promise.allSettled(disconnectPromises);
    this.instances.clear();

    console.log('🔌 All providers disconnected');
  }

  // ==========================================================================
  // PROVIDER COMPARISON & ANALYSIS
  // ==========================================================================

  /**
   * Provider 기능 비교
   */
  compareProviders(providerIds: string[]): ProviderComparison {
    const providers: ProviderInfo[] = [];
    const featureMatrix: Record<string, Record<string, boolean>> = {};

    // Provider 정보 수집
    for (const providerId of providerIds) {
      const providerInfo = this.getProviderInfo(providerId);
      if (providerInfo) {
        providers.push(providerInfo);
      }
    }

    // 기능 매트릭스 생성
    const allFeatures = this.extractAllFeatures(providers);
    for (const feature of allFeatures) {
      featureMatrix[feature] = {};
      for (const provider of providers) {
        featureMatrix[feature][provider.id] = this.hasFeature(provider, feature);
      }
    }

    // 성능 비교
    const performanceComparison = this.createPerformanceComparison(providers);

    // 기능 비교
    const capabilityComparison = this.createCapabilityComparison(providers);

    return {
      providers,
      featureMatrix,
      performanceComparison,
      capabilityComparison
    };
  }

  /**
   * 기능별 Provider 필터링
   */
  getProvidersWithFeature(feature: string): string[] {
    const matchingProviders: string[] = [];

    for (const [providerId, capabilities] of this.capabilities.entries()) {
      if (this.hasFeatureById(providerId, feature)) {
        matchingProviders.push(providerId);
      }
    }

    return matchingProviders;
  }

  /**
   * Provider 정보 조회
   */
  getProviderInfo(providerId: string): ProviderInfo | null {
    const ProviderClass = this.providers.get(providerId);
    if (!ProviderClass) {
      return null;
    }

    const tempInstance = new ProviderClass();
    const capabilities = this.capabilities.get(providerId) || tempInstance.getCapabilities();

    return {
      id: providerId,
      name: tempInstance.name,
      description: this.getProviderDescription(tempInstance),
      version: tempInstance.version,
      website: this.getProviderWebsite(tempInstance),
      capabilities,
      supportedMarkets: capabilities.limitations.supportedMarkets,
      status: this.getProviderStatus(tempInstance)
    };
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  /**
   * Provider 인터페이스 검증
   */
  private validateProviderInterface(instance: IKSETProvider): void {
    const requiredMethods = [
      'initialize', 'authenticate', 'disconnect', 'getHealthStatus',
      'getMarketData', 'placeOrder', 'getAccountInfo', 'getCapabilities'
    ];

    for (const method of requiredMethods) {
      if (typeof (instance as any)[method] !== 'function') {
        throw KSETErrorFactory.create(
          ERROR_CODES.INVALID_CONFIGURATION,
          `Provider ${instance.id} is missing required method: ${method}`,
          'registry'
        );
      }
    }
  }

  /**
   * Provider 설정 유효성 검증
   */
  private validateProviderConfig(providerId: string, config: ProviderConfig): void {
    if (!config) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Provider configuration is required',
        providerId
      );
    }

    if (!config.credentials) {
      throw KSETErrorFactory.create(
        ERROR_CODES.MISSING_REQUIRED_CONFIG,
        'Provider credentials are required',
        providerId
      );
    }

    if (!config.id || config.id !== providerId) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Provider configuration ID must match the provider ID',
        providerId
      );
    }

    // Provider별 특화 설정 검증
    this.validateProviderSpecificConfig(providerId, config);
  }

  /**
   * Provider별 특화 설정 검증
   */
  private validateProviderSpecificConfig(providerId: string, config: ProviderConfig): void {
    // TODO: Provider별 특화 설정 검증 로직 추가
    // 예: 키움증권은 인증서 경로 필수, 한국투자증권은 API 키 필수 등
  }

  /**
   * Provider 생성 및 초기화
   */
  private async createAndInitializeProvider(
    ProviderClass: ProviderConstructor,
    config: ProviderConfig
  ): Promise<IKSETProvider> {
    // 인스턴스 생성
    const instance = new ProviderClass();

    try {
      // 초기화
      await instance.initialize(config);

      // 인증
      await instance.authenticate(config.credentials);

      return instance;
    } catch (error) {
      // 초기화 실패 시 정리
      try {
        await instance.disconnect();
      } catch (cleanupError) {
        console.error('Failed to cleanup provider after initialization failure:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Provider 연결 해제
   */
  private async disconnectProvider(instance: IKSETProvider): Promise<void> {
    try {
      await instance.disconnect();
    } catch (error) {
      console.error(`Failed to disconnect provider ${instance.id}:`, error);
    }
  }

  /**
   * Provider 기능 자동 발견
   */
  private discoverCapabilities(instance: IKSETProvider): void {
    try {
      const capabilities = instance.getCapabilities();
      this.capabilities.set(instance.id, capabilities);

      console.log(`🔍 Discovered capabilities for ${instance.name}:`, {
        markets: capabilities.limitations.supportedMarkets,
        features: capabilities.supportedCategories,
        orderTypes: capabilities.trading.orderTypes,
        authentication: capabilities.authentication
      });
    } catch (error) {
      console.error(`Failed to discover capabilities for ${instance.id}:`, error);
    }
  }

  /**
   * 상태 모니터링 시작
   */
  private startHealthMonitoring(providerId: string, instance: IKSETProvider): void {
    // TODO: 주기적인 헬스 체크 구현
    // 1분 간격으로 Provider 상태 확인
    const healthCheckInterval = setInterval(async () => {
      try {
        const health = await instance.getHealthStatus();
        if (!health.connected) {
          console.warn(`⚠️ Provider ${providerId} is disconnected:`, health);
          // TODO: 재연결 로직 추가
        }
      } catch (error) {
        console.error(`❌ Health check failed for provider ${providerId}:`, error);
      }
    }, 60000); // 1분

    // 프로세스 종료 시 정리
    process.on('exit', () => {
      clearInterval(healthCheckInterval);
    });
  }

  /**
   * 모든 기능 추출
   */
  private extractAllFeatures(providers: ProviderInfo[]): string[] {
    const features = new Set<string>();

    for (const provider of providers) {
      // 시장 데이터 기능
      features.add('real-time-quotes');
      features.add('historical-data');
      features.add('order-book');
      features.add('technical-indicators');

      // 거래 기능
      features.add('market-orders');
      features.add('limit-orders');
      features.add('stop-orders');
      features.add('algorithmic-trading');

      // 계좌 기능
      features.add('balance-query');
      features.add('position-query');
      features.add('portfolio-valuation');

      // 리서치 기능
      features.add('company-info');
      features.add('financial-statements');
      features.add('disclosures');
    }

    return Array.from(features);
  }

  /**
   * 기능 보유 여부 확인
   */
  private hasFeature(provider: ProviderInfo, feature: string): boolean {
    // TODO: 실제 기능 확인 로직 구현
    return provider.capabilities.supportedCategories.includes(feature);
  }

  /**
   * ID별 기능 보유 여부 확인
   */
  private hasFeatureById(providerId: string, feature: string): boolean {
    const capabilities = this.capabilities.get(providerId);
    if (!capabilities) {
      return false;
    }

    // TODO: 실제 기능 확인 로직 구현
    return capabilities.supportedCategories.includes(feature);
  }

  /**
   * 성능 비교 생성
   */
  private createPerformanceComparison(providers: ProviderInfo[]): any {
    const comparison: any = {};

    for (const provider of providers) {
      // TODO: 실제 성능 데이터 수집 필요
      comparison[provider.id] = {
        responseTime: Math.random() * 100 + 50, // 예시 데이터
        updateFrequency: provider.capabilities.marketData.updateFrequency,
        reliability: 95 + Math.random() * 5 // 예시 데이터
      };
    }

    return comparison;
  }

  /**
   * 기능 비교 생성
   */
  private createCapabilityComparison(providers: ProviderInfo[]): any {
    const comparison: any = {};

    for (const provider of providers) {
      comparison[provider.id] = {
        supportedMarkets: provider.capabilities.limitations.supportedMarkets,
        orderTypes: provider.capabilities.trading.orderTypes,
        authentication: provider.capabilities.authentication,
        rateLimits: provider.capabilities.limitations.rateLimits
      };
    }

    return comparison;
  }

  /**
   * Provider 설명 조회
   */
  private getProviderDescription(instance: IKSETProvider): string {
    // TODO: Provider별 설명 정의
    const descriptions: Record<string, string> = {
      'kiwoom': '대한민국 대표 증권사 키움증권의 공식 API',
      'korea-investment': '한국투자증권의 오픈 API',
      'mirae-asset': '미래에셋증권의 트레이딩 API'
    };

    return descriptions[instance.id] || `${instance.name} trading provider`;
  }

  /**
   * Provider 웹사이트 조회
   */
  private getProviderWebsite(instance: IKSETProvider): string | undefined {
    // TODO: Provider별 웹사이트 정의
    const websites: Record<string, string> = {
      'kiwoom': 'https://www.kiwoom.com',
      'korea-investment': 'https://www.kis.co.kr',
      'mirae-asset': 'https://www.miraeasset.com'
    };

    return websites[instance.id];
  }

  /**
   * Provider 상태 조회
   */
  private getProviderStatus(instance: IKSETProvider): 'active' | 'deprecated' | 'beta' | 'development' {
    // TODO: 실제 상태 관리 필요
    return 'active';
  }

  /**
   * 에러 처리 설정
   */
  private setupErrorHandling(): void {
    // 레지스트리 전용 에러 처리 설정
    process.on('unhandledRejection', (error) => {
      console.error('Unhandled rejection in ProviderRegistry:', error);
    });
  }

  /**
   * Provider 정보 로깅
   */
  private logProviderInfo(instance: IKSETProvider): void {
    const capabilities = instance.getCapabilities();
    console.log(`📋 Provider Information:`, {
      id: instance.id,
      name: instance.name,
      version: instance.version,
      markets: capabilities.limitations.supportedMarkets,
      features: capabilities.supportedCategories,
      orderTypes: capabilities.trading.orderTypes
    });
  }
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type ProviderConstructor = new () => IKSETProvider;