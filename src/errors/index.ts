/**
 * KSET Error Handling System
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 */

import {
  KSETError,
  AuthenticationError,
  NetworkError,
  DataNotFoundError,
  InvalidSymbolError,
  InvalidOrderError,
  InsufficientFundsError,
  MarketClosedError,
  RateLimitError,
  ComplianceError,
  ConfigurationError
} from '@/types';

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERROR_CODES = {
  // Generic Errors
  UNKNOWN: 'UNKNOWN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',

  // Authentication Errors
  AUTH_FAILED: 'AUTH_FAILED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  CERTIFICATE_ERROR: 'CERTIFICATE_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  PERMISSION_DENIED: 'PERMISSION_DENIED',

  // Network Errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  CONNECTION_TIMEOUT: 'CONNECTION_TIMEOUT',
  CONNECTION_REFUSED: 'CONNECTION_REFUSED',
  DNS_RESOLUTION_FAILED: 'DNS_RESOLUTION_FAILED',

  // Data Errors
  DATA_NOT_FOUND: 'DATA_NOT_FOUND',
  INVALID_SYMBOL: 'INVALID_SYMBOL',
  INVALID_MARKET: 'INVALID_MARKET',
  DATA_CORRUPTION: 'DATA_CORRUPTION',

  // Order Errors
  INVALID_ORDER: 'INVALID_ORDER',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  INSUFFICIENT_POSITIONS: 'INSUFFICIENT_POSITIONS',
  ORDER_NOT_FOUND: 'ORDER_NOT_FOUND',
  ORDER_ALREADY_FILLED: 'ORDER_ALREADY_FILLED',
  ORDER_MODIFICATION_FAILED: 'ORDER_MODIFICATION_FAILED',
  ORDER_CANCELLATION_FAILED: 'ORDER_CANCELLATION_FAILED',

  // Market Errors
  MARKET_CLOSED: 'MARKET_CLOSED',
  MARKET_SUSPENDED: 'MARKET_SUSPENDED',
  TRADING_HALTED: 'TRADING_HALTED',

  // Rate Limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED: 'DAILY_LIMIT_EXCEEDED',

  // Compliance Errors
  COMPLIANCE_VIOLATION: 'COMPLIANCE_VIOLATION',
  FOREIGN_INVESTMENT_LIMIT: 'FOREIGN_INVESTMENT_LIMIT',
  SHORT_SELLING_RESTRICTED: 'SHORT_SELLING_RESTRICTED',
  PRICE_LIMIT_VIOLATION: 'PRICE_LIMIT_VIOLATION',

  // Configuration Errors
  INVALID_CONFIGURATION: 'INVALID_CONFIGURATION',
  MISSING_REQUIRED_CONFIG: 'MISSING_REQUIRED_CONFIG',
  PROVIDER_NOT_SUPPORTED: 'PROVIDER_NOT_SUPPORTED',

  // Validation Errors
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  INVALID_PARAMETERS: 'INVALID_PARAMETERS',
  MISSING_REQUIRED_PARAMETER: 'MISSING_REQUIRED_PARAMETER',

  // Research Errors
  RESEARCH_FAILED: 'RESEARCH_FAILED',
  DART_API_ERROR: 'DART_API_ERROR',
  DATA_ANALYSIS_ERROR: 'DATA_ANALYSIS_ERROR',
  VALUATION_ERROR: 'VALUATION_ERROR',
  NO_PROVIDER_AVAILABLE: 'NO_PROVIDER_AVAILABLE',
  NOT_SUPPORTED: 'NOT_SUPPORTED',
  INVALID_RESPONSE: 'INVALID_RESPONSE',
  AUTHENTICATION_FAILED: 'AUTHENTICATION_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  NOT_FOUND: 'NOT_FOUND'
} as const;

// ============================================================================
// ERROR FACTORY
// ============================================================================

export class KSETErrorFactory {
  /**
   * 에러 생성
   * @param code 에러 코드
   * @param message 에러 메시지
   * @param provider Provider 이름
   * @param details 추가 정보
   */
  static create(
    code: string,
    message: string,
    provider?: string,
    details?: any
  ): KSETError {
    const errorClass = this.getErrorClass(code);
    return new errorClass(message, provider, code, details);
  }

  /**
   * HTTP 상태 코드로부터 에러 생성
   * @param statusCode HTTP 상태 코드
   * @param message 에러 메시지
   * @param provider Provider 이름
   */
  static fromHttpStatus(
    statusCode: number,
    message: string,
    provider?: string
  ): KSETError {
    const errorCode = this.getErrorCodeFromHttpStatus(statusCode);
    return this.create(errorCode, message, provider, { statusCode });
  }

  /**
   * Provider API 에러로부터 에러 생성
   * @param provider Provider 이름
   * @param apiResponse Provider API 응답
   */
  static fromProviderResponse(
    provider: string,
    apiResponse: any
  ): KSETError {
    const errorCode = apiResponse.code || ERROR_CODES.UNKNOWN;
    const message = apiResponse.message || 'Unknown error occurred';

    return this.create(errorCode, message, provider, {
      providerResponse: apiResponse
    });
  }

  private static getErrorClass(code: string): typeof KSETError {
    switch (code) {
      case ERROR_CODES.AUTH_FAILED:
      case ERROR_CODES.INVALID_CREDENTIALS:
      case ERROR_CODES.CERTIFICATE_ERROR:
      case ERROR_CODES.TOKEN_EXPIRED:
      case ERROR_CODES.PERMISSION_DENIED:
        return AuthenticationError;

      case ERROR_CODES.NETWORK_ERROR:
      case ERROR_CODES.CONNECTION_TIMEOUT:
      case ERROR_CODES.CONNECTION_REFUSED:
      case ERROR_CODES.DNS_RESOLUTION_FAILED:
        return NetworkError;

      case ERROR_CODES.DATA_NOT_FOUND:
        return DataNotFoundError;

      case ERROR_CODES.INVALID_SYMBOL:
        return InvalidSymbolError;

      case ERROR_CODES.INVALID_ORDER:
      case ERROR_CODES.ORDER_NOT_FOUND:
      case ERROR_CODES.ORDER_ALREADY_FILLED:
      case ERROR_CODES.ORDER_MODIFICATION_FAILED:
      case ERROR_CODES.ORDER_CANCELLATION_FAILED:
        return InvalidOrderError;

      case ERROR_CODES.INSUFFICIENT_FUNDS:
        return InsufficientFundsError;

      case ERROR_CODES.MARKET_CLOSED:
      case ERROR_CODES.MARKET_SUSPENDED:
      case ERROR_CODES.TRADING_HALTED:
        return MarketClosedError;

      case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      case ERROR_CODES.DAILY_LIMIT_EXCEEDED:
        return RateLimitError;

      case ERROR_CODES.COMPLIANCE_VIOLATION:
      case ERROR_CODES.FOREIGN_INVESTMENT_LIMIT:
      case ERROR_CODES.SHORT_SELLING_RESTRICTED:
      case ERROR_CODES.PRICE_LIMIT_VIOLATION:
        return ComplianceError;

      case ERROR_CODES.INVALID_CONFIGURATION:
      case ERROR_CODES.MISSING_REQUIRED_CONFIG:
      case ERROR_CODES.PROVIDER_NOT_SUPPORTED:
        return ConfigurationError;

      default:
        return KSETError;
    }
  }

  private static getErrorCodeFromHttpStatus(statusCode: number): string {
    switch (statusCode) {
      case 401:
        return ERROR_CODES.AUTH_FAILED;
      case 403:
        return ERROR_CODES.PERMISSION_DENIED;
      case 404:
        return ERROR_CODES.DATA_NOT_FOUND;
      case 422:
        return ERROR_CODES.INVALID_PARAMETERS;
      case 429:
        return ERROR_CODES.RATE_LIMIT_EXCEEDED;
      case 500:
        return ERROR_CODES.INTERNAL_ERROR;
      case 502:
      case ERROR_CODES.503:
      case ERROR_CODES.504:
        return ERROR_CODES.NETWORK_ERROR;
      default:
        return ERROR_CODES.UNKNOWN;
    }
  }
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

export interface ErrorHandler {
  /**
   * 에러 처리
   * @param error 발생한 에러
   * @param context 에러 발생 컨텍스트
   */
  handle(error: Error, context?: ErrorContext): void;
}

export interface ErrorContext {
  /** Provider 이름 */
  provider?: string;
  /** API 엔드포인트 */
  endpoint?: string;
  /** 요청 파라미터 */
  request?: any;
  /** 응답 데이터 */
  response?: any;
  /** 재시도 횟수 */
  retryCount?: number;
  /** 추가 정보 */
  additional?: Record<string, any>;
}

export class DefaultErrorHandler implements ErrorHandler {
  constructor(private logger: Logger = new ConsoleLogger()) {}

  handle(error: Error, context?: ErrorContext): void {
    if (error instanceof KSETError) {
      this.handleKSETError(error, context);
    } else {
      this.handleGenericError(error, context);
    }
  }

  private handleKSETError(error: KSETError, context?: ErrorContext): void {
    const logLevel = this.getLogLevel(error);

    this.logger.log(logLevel, `[${error.code}] ${error.message}`, {
      provider: error.provider,
      context,
      stack: error.stack
    });

    // 에러 통계 수집
    this.recordErrorStats(error, context);
  }

  private handleGenericError(error: Error, context?: ErrorContext): void {
    this.logger.log('error', `Unexpected error: ${error.message}`, {
      context,
      stack: error.stack
    });
  }

  private getLogLevel(error: KSETError): 'error' | 'warn' | 'info' {
    const criticalErrors = [
      ERROR_CODES.AUTH_FAILED,
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.INTERNAL_ERROR
    ];

    return criticalErrors.includes(error.code) ? 'error' : 'warn';
  }

  private recordErrorStats(error: KSETError, context?: ErrorContext): void {
    // 에러 통계 수집 로직
    // TODO: Implement error statistics collection
  }
}

// ============================================================================
// LOGGER INTERFACE
// ============================================================================

export interface Logger {
  log(level: LogLevel, message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export class ConsoleLogger implements Logger {
  constructor(private level: LogLevel = 'info') {}

  log(level: LogLevel, message: string, meta?: any): void {
    if (!this.shouldLog(level)) return;

    const timestamp = new Date().toISOString();
    const metaString = meta ? ` ${JSON.stringify(meta)}` : '';

    console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}${metaString}`);
  }

  error(message: string, meta?: any): void {
    this.log('error', message, meta);
  }

  warn(message: string, meta?: any): void {
    this.log('warn', message, meta);
  }

  info(message: string, meta?: any): void {
    this.log('info', message, meta);
  }

  debug(message: string, meta?: any): void {
    this.log('debug', message, meta);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }
}

// ============================================================================
// RETRY MECHANISM
// ============================================================================

export interface RetryConfig {
  /** 최대 재시도 횟수 */
  maxAttempts: number;
  /** 초기 지연 시간 (ms) */
  initialDelay: number;
  /** 최대 지연 시간 (ms) */
  maxDelay: number;
  /** 지연 시간 배수 */
  backoffMultiplier: number;
  /** 재시도 가능한 에러 코드 */
  retryableErrors: string[];
}

export class RetryManager {
  private static defaultConfig: RetryConfig = {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    retryableErrors: [
      ERROR_CODES.NETWORK_ERROR,
      ERROR_CODES.CONNECTION_TIMEOUT,
      ERROR_CODES.RATE_LIMIT_EXCEEDED
    ]
  };

  /**
   * 재시도가 필요한지 확인
   * @param error 발생한 에러
   * @param currentAttempt 현재 시도 횟수
   * @param config 재시도 설정
   */
  static shouldRetry(
    error: Error,
    currentAttempt: number,
    config: Partial<RetryConfig> = {}
  ): boolean {
    const retryConfig = { ...this.defaultConfig, ...config };

    if (currentAttempt >= retryConfig.maxAttempts) {
      return false;
    }

    if (!(error instanceof KSETError)) {
      return false;
    }

    return retryConfig.retryableErrors.includes(error.code);
  }

  /**
   * 재시도 지연 시간 계산
   * @param currentAttempt 현재 시도 횟수
   * @param config 재시도 설정
   */
  static calculateDelay(
    currentAttempt: number,
    config: Partial<RetryConfig> = {}
  ): number {
    const retryConfig = { ...this.defaultConfig, ...config };

    const delay = retryConfig.initialDelay * Math.pow(retryConfig.backoffMultiplier, currentAttempt - 1);
    return Math.min(delay, retryConfig.maxDelay);
  }

  /**
   * 함수를 재시도하면서 실행
   * @param fn 실행할 함수
   * @param config 재시도 설정
   */
  static async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: Partial<RetryConfig> = {},
    errorHandler?: ErrorHandler
  ): Promise<T> {
    const retryConfig = { ...this.defaultConfig, ...config };
    let lastError: Error;

    for (let attempt = 1; attempt <= retryConfig.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        if (attempt === retryConfig.maxAttempts ||
            !this.shouldRetry(lastError as Error, attempt, config)) {
          throw lastError;
        }

        const delay = this.calculateDelay(attempt, config);
        await this.sleep(delay);

        if (errorHandler) {
          errorHandler.handle(lastError, {
            retryCount: attempt,
            nextRetryIn: delay
          });
        }
      }
    }

    throw lastError!;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// ============================================================================
// CIRCUIT BREAKER
// ============================================================================

export interface CircuitBreakerConfig {
  /** 실패 임계값 (백분율) */
  failureThreshold: number;
  /** 최소 요청 수 */
  minimumThroughput: number;
  /** 열린 상태 지속 시간 (ms) */
  timeout: number;
  /** 반열림 상태 지속 시간 (ms) */
  halfOpenMaxCalls: number;
}

enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: number = 0;
  private halfOpenCalls = 0;

  constructor(
    private config: CircuitBreakerConfig,
    private logger: Logger = new ConsoleLogger()
  ) {}

  /**
   * 함수를 Circuit Breaker로 보호하면서 실행
   * @param fn 실행할 함수
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitBreakerState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.transitionToHalfOpen();
      } else {
        throw new KSETErrorFactory.create(
          ERROR_CODES.NETWORK_ERROR,
          'Circuit breaker is OPEN',
          'circuit-breaker'
        );
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.successes++;
    this.failures = 0;

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.transitionToClosed();
    }

    this.logger.debug('Circuit breaker success', {
      state: this.state,
      successes: this.successes,
      failures: this.failures
    });
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.shouldTrip()) {
      this.transitionToOpen();
    }

    this.logger.warn('Circuit breaker failure', {
      state: this.state,
      successes: this.successes,
      failures: this.failures,
      failureRate: this.getFailureRate()
    });
  }

  private shouldTrip(): boolean {
    const totalCalls = this.successes + this.failures;

    if (totalCalls < this.config.minimumThroughput) {
      return false;
    }

    return this.getFailureRate() >= this.config.failureThreshold;
  }

  private getFailureRate(): number {
    const totalCalls = this.successes + this.failures;
    return totalCalls === 0 ? 0 : (this.failures / totalCalls) * 100;
  }

  private shouldAttemptReset(): boolean {
    return Date.now() - this.lastFailureTime >= this.config.timeout;
  }

  private transitionToOpen(): void {
    this.state = CircuitBreakerState.OPEN;
    this.halfOpenCalls = 0;
    this.logger.warn('Circuit breaker transitioned to OPEN');
  }

  private transitionToHalfOpen(): void {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.halfOpenCalls = 0;
    this.logger.info('Circuit breaker transitioned to HALF_OPEN');
  }

  private transitionToClosed(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.successes = 0;
    this.failures = 0;
    this.logger.info('Circuit breaker transitioned to CLOSED');
  }

  /**
   * 현재 상태 조회
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * 통계 정보 조회
   */
  getStats(): {
    state: CircuitBreakerState;
    successes: number;
    failures: number;
    failureRate: number;
  } {
    return {
      state: this.state,
      successes: this.successes,
      failures: this.failures,
      failureRate: this.getFailureRate()
    };
  }
}

// ============================================================================
// ERROR RECOVERY
// ============================================================================

export class ErrorRecoveryManager {
  private recoveryStrategies = new Map<string, RecoveryStrategy>();

  constructor(private logger: Logger = new ConsoleLogger()) {
    this.initializeDefaultStrategies();
  }

  /**
   * 복구 전략 등록
   * @param errorCode 에러 코드
   * @param strategy 복구 전략
   */
  registerStrategy(errorCode: string, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(errorCode, strategy);
  }

  /**
   * 에러 복구 시도
   * @param error 발생한 에러
   * @param context 에러 컨텍스트
   */
  async attemptRecovery(error: KSETError, context?: ErrorContext): Promise<RecoveryResult> {
    const strategy = this.recoveryStrategies.get(error.code);

    if (!strategy) {
      return { recovered: false, reason: 'No recovery strategy found' };
    }

    try {
      this.logger.info(`Attempting recovery for error: ${error.code}`, { error, context });
      const result = await strategy.recover(error, context);

      if (result.recovered) {
        this.logger.info(`Successfully recovered from error: ${error.code}`, result);
      } else {
        this.logger.warn(`Recovery failed for error: ${error.code}`, result);
      }

      return result;
    } catch (recoveryError) {
      this.logger.error(`Recovery strategy failed for error: ${error.code}`, {
        originalError: error,
        recoveryError
      });

      return {
        recovered: false,
        reason: `Recovery strategy failed: ${(recoveryError as Error).message}`
      };
    }
  }

  private initializeDefaultStrategies(): void {
    // 인증 에러 복구 전략
    this.registerStrategy(ERROR_CODES.TOKEN_EXPIRED, new TokenRefreshStrategy());

    // Rate Limit 에러 복구 전략
    this.registerStrategy(ERROR_CODES.RATE_LIMIT_EXCEEDED, new RateLimitWaitStrategy());

    // 네트워크 에러 복구 전략
    this.registerStrategy(ERROR_CODES.NETWORK_ERROR, new NetworkRecoveryStrategy());
  }
}

export interface RecoveryStrategy {
  recover(error: KSETError, context?: ErrorContext): Promise<RecoveryResult>;
}

export interface RecoveryResult {
  recovered: boolean;
  message?: string;
  reason?: string;
  actions?: string[];
}

// 인증 토큰 새로고침 전략
class TokenRefreshStrategy implements RecoveryStrategy {
  async recover(error: KSETError, context?: ErrorContext): Promise<RecoveryResult> {
    if (!context?.request?.auth) {
      return { recovered: false, reason: 'No auth context available' };
    }

    try {
      // TODO: Implement token refresh logic
      // await context.request.auth.refreshToken();

      return {
        recovered: true,
        message: 'Token refreshed successfully',
        actions: ['Token refreshed', 'Request can be retried']
      };
    } catch (refreshError) {
      return {
        recovered: false,
        reason: `Token refresh failed: ${(refreshError as Error).message}`
      };
    }
  }
}

// Rate Limit 대기 전략
class RateLimitWaitStrategy implements RecoveryStrategy {
  async recover(error: KSETError, context?: ErrorContext): Promise<RecoveryResult> {
    const resetTime = error.details?.resetTime;

    if (!resetTime) {
      return { recovered: false, reason: 'No reset time available' };
    }

    const waitTime = resetTime - Date.now();
    if (waitTime <= 0) {
      return { recovered: true, message: 'Rate limit has been reset' };
    }

    try {
      await new Promise(resolve => setTimeout(resolve, waitTime));

      return {
        recovered: true,
        message: `Waited ${waitTime}ms for rate limit reset`,
        actions: [`Waited ${waitTime}ms`, 'Request can be retried']
      };
    } catch (waitError) {
      return {
        recovered: false,
        reason: `Wait failed: ${(waitError as Error).message}`
      };
    }
  }
}

// 네트워크 복구 전략
class NetworkRecoveryStrategy implements RecoveryStrategy {
  async recover(error: KSETError, context?: ErrorContext): Promise<RecoveryResult> {
    // TODO: Implement network recovery logic (check connection, switch to backup, etc.)
    return {
      recovered: false,
      reason: 'Network recovery not implemented yet'
    };
  }
}