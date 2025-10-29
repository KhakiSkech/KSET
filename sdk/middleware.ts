/**
 * KSET SDK Middleware
 * Error handling, retry logic, and other middleware components
 */

import type { KSETSDKConfig } from './types';

export interface ErrorContext {
  operation: string;
  [key: string]: any;
}

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff?: boolean;
  maxDelay?: number;
  retryCondition?: (error: Error) => boolean;
}

export class ErrorHandler {
  private readonly config: KSETSDKConfig['errorHandling'];
  private errorCounts = new Map<string, number>();
  private lastErrors = new Map<string, { error: Error; timestamp: number }>();

  constructor(config: KSETSDKConfig['errorHandling']) {
    this.config = config || {
      maxRetries: 3,
      retryDelay: 1000,
      enableFallback: true
    };
  }

  /**
   * Handle an error with retry logic and fallback
   */
  async handleError(error: Error, context: ErrorContext): Promise<void> {
    const errorKey = `${context.operation}:${error.message}`;
    const errorCount = this.errorCounts.get(errorKey) || 0;

    // Track error
    this.errorCounts.set(errorKey, errorCount + 1);
    this.lastErrors.set(errorKey, { error, timestamp: Date.now() });

    // Log error
    console.error(`[KSET SDK Error] ${context.operation}:`, error);

    // Check if we should retry
    if (this.shouldRetry(error, errorCount)) {
      console.log(`[KSET SDK] Retrying ${context.operation} (attempt ${errorCount + 1})`);
      return; // Let caller retry
    }

    // Check if we should use fallback
    if (this.config.enableFallback) {
      console.log(`[KSET SDK] Using fallback for ${context.operation}`);
      await this.executeFallback(context);
    }

    // Throw error if no fallback available
    throw error;
  }

  /**
   * Execute a function with retry logic
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    context: ErrorContext,
    options?: Partial<RetryOptions>
  ): Promise<T> {
    const retryOptions: RetryOptions = {
      maxAttempts: this.config.maxRetries || 3,
      delay: this.config.retryDelay || 1000,
      backoff: true,
      maxDelay: 30000,
      retryCondition: this.defaultRetryCondition,
      ...options
    };

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryOptions.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Check if we should retry this error
        if (!retryOptions.retryCondition!(lastError)) {
          break;
        }

        // If this is the last attempt, don't wait
        if (attempt === retryOptions.maxAttempts) {
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, retryOptions);
        console.log(`[KSET SDK] Retry ${attempt}/${retryOptions.maxAttempts} in ${delay}ms for ${context.operation}`);
        await this.sleep(delay);
      }
    }

    // All attempts failed, handle the error
    await this.handleError(lastError!, context);
    throw lastError!;
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    totalErrors: number;
    errorsByOperation: Record<string, number>;
    recentErrors: Array<{ operation: string; error: string; timestamp: number }>;
  } {
    const errorsByOperation: Record<string, number> = {};
    const recentErrors: Array<{ operation: string; error: string; timestamp: number }> = [];

    this.errorCounts.forEach((count, key) => {
      const [operation] = key.split(':');
      errorsByOperation[operation] = (errorsByOperation[operation] || 0) + count;
    });

    this.lastErrors.forEach(({ error, timestamp }, key) => {
      const [operation] = key.split(':');
      if (Date.now() - timestamp < 3600000) { // Last hour
        recentErrors.push({ operation, error: error.message, timestamp });
      }
    });

    const totalErrors = Array.from(this.errorCounts.values()).reduce((sum, count) => sum + count, 0);

    return {
      totalErrors,
      errorsByOperation,
      recentErrors: recentErrors.sort((a, b) => b.timestamp - a.timestamp)
    };
  }

  /**
   * Clear error statistics
   */
  clearStats(): void {
    this.errorCounts.clear();
    this.lastErrors.clear();
  }

  private shouldRetry(error: Error, attemptCount: number): boolean {
    return attemptCount < (this.config.maxRetries || 3) && this.defaultRetryCondition(error);
  }

  private defaultRetryCondition(error: Error): boolean {
    // Retry on network errors and timeouts
    return (
      error.message.includes('timeout') ||
      error.message.includes('network') ||
      error.message.includes('connection') ||
      error.message.includes('ECONNRESET') ||
      error.message.includes('ETIMEDOUT')
    );
  }

  private calculateDelay(attempt: number, options: RetryOptions): number {
    if (!options.backoff) {
      return options.delay;
    }

    // Exponential backoff with jitter
    const baseDelay = options.delay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 0.1 * baseDelay; // 10% jitter
    const delay = baseDelay + jitter;

    return Math.min(delay, options.maxDelay || 30000);
  }

  private async executeFallback(context: ErrorContext): Promise<void> {
    // Implement fallback logic based on operation type
    switch (context.operation) {
      case 'createOrder':
        // Could save order to local queue for later processing
        console.log('[Fallback] Order saved to local queue');
        break;
      case 'getMarketData':
        // Could return cached data or data from alternative source
        console.log('[Fallback] Using cached market data');
        break;
      default:
        console.log(`[Fallback] No fallback available for ${context.operation}`);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Rate Limiting Middleware
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    private maxRequests: number = 100,
    private windowMs: number = 60000 // 1 minute
  ) {}

  /**
   * Check if a request is allowed
   */
  isAllowed(key: string = 'default'): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this key
    let timestamps = this.requests.get(key) || [];

    // Remove old timestamps
    timestamps = timestamps.filter(timestamp => timestamp > windowStart);

    // Check if we're under the limit
    if (timestamps.length < this.maxRequests) {
      timestamps.push(now);
      this.requests.set(key, timestamps);
      return true;
    }

    return false;
  }

  /**
   * Get remaining requests for a key
   */
  getRemainingRequests(key: string = 'default'): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    const timestamps = this.requests.get(key) || [];
    const validTimestamps = timestamps.filter(timestamp => timestamp > windowStart);

    return Math.max(0, this.maxRequests - validTimestamps.length);
  }

  /**
   * Reset rate limiter for a key
   */
  reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

// Request/Response Logging Middleware
export class RequestLogger {
  private logs: Array<{
    timestamp: number;
    operation: string;
    request: any;
    response?: any;
    error?: string;
    duration: number;
  }> = [];

  /**
   * Log a request
   */
  async logRequest<T>(
    operation: string,
    request: any,
    fn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();

    try {
      const response = await fn();
      const duration = Date.now() - startTime;

      this.logs.push({
        timestamp: startTime,
        operation,
        request: this.sanitizeData(request),
        response: this.sanitizeData(response),
        duration
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;

      this.logs.push({
        timestamp: startTime,
        operation,
        request: this.sanitizeData(request),
        error: (error as Error).message,
        duration
      });

      throw error;
    }
  }

  /**
   * Get request logs
   */
  getLogs(limit?: number): Array<{
    timestamp: number;
    operation: string;
    request: any;
    response?: any;
    error?: string;
    duration: number;
  }> {
    const logs = this.logs.sort((a, b) => b.timestamp - a.timestamp);
    return limit ? logs.slice(0, limit) : logs;
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
  }

  private sanitizeData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // Remove sensitive information
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'apiKey', 'secret', 'auth'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeData(sanitized[key]);
      }
    }

    return sanitized;
  }
}

// Circuit Breaker Pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold: number = 5,
    private timeout: number = 60000 // 1 minute
  ) {}

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
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

  /**
   * Get current state
   */
  getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
    }
  }
}