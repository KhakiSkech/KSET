/**
 * KSET SDK Decorators
 * Useful decorators for enhanced development experience
 */

import 'reflect-metadata';

// Decorator metadata keys
const METADATA_KEYS = {
  VALIDATION: 'kset:validation',
  RATE_LIMIT: 'kset:rate_limit',
  CACHE: 'kset:cache',
  RETRY: 'kset:retry',
  MONITOR: 'kset:monitor',
  LOG: 'kset:log'
} as const;

// Validation Decorator
export function Validation(schema?: any) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.VALIDATION, schema, target, propertyKey);
    return descriptor;
  };
}

// Rate Limiting Decorator
export function RateLimit(options: { maxRequests: number; windowMs: number }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.RATE_LIMIT, options, target, propertyKey);
    return descriptor;
  };
}

// Caching Decorator
export function Cache(options: { ttl?: number; key?: string }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.CACHE, options, target, propertyKey);
    return descriptor;
  };
}

// Retry Decorator
export function Retry(options: { maxAttempts: number; delay?: number; backoff?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.RETRY, options, target, propertyKey);
    return descriptor;
  };
}

// Performance Monitoring Decorator
export function Monitor(options: { logArgs?: boolean; logResult?: boolean; threshold?: number }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.MONITOR, options, target, propertyKey);
    return descriptor;
  };
}

// Logging Decorator
export function Log(options: { level?: 'debug' | 'info' | 'warn' | 'error'; logArgs?: boolean; logResult?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    Reflect.defineMetadata(METADATA_KEYS.LOG, options, target, propertyKey);
    return descriptor;
  };
}

// Order Processing Decorator
export function OrderProcessor(options: { validateRisk?: boolean; checkLimits?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Pre-processing
      if (options.validateRisk) {
        console.log(`[OrderProcessor] Validating risk for order: ${args[0]?.id}`);
      }

      if (options.checkLimits) {
        console.log(`[OrderProcessor] Checking limits for order: ${args[0]?.id}`);
      }

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Post-processing
      console.log(`[OrderProcessor] Order processed: ${args[0]?.id}`);

      return result;
    };

    return descriptor;
  };
}

// Market Data Handler Decorator
export function MarketDataHandler(options: { symbols?: string[]; validateData?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const data = args[0];

      // Filter by symbols if specified
      if (options.symbols && options.symbols.length > 0) {
        if (!options.symbols.includes(data.symbol)) {
          return; // Skip processing for non-matching symbols
        }
      }

      // Validate data if requested
      if (options.validateData) {
        if (!data.symbol || !data.price || !data.timestamp) {
          console.warn('[MarketDataHandler] Invalid market data:', data);
          return;
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// WebSocket Handler Decorator
export function WebSocketHandler(options: { reconnect?: boolean; heartbeat?: boolean }) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const message = args[0];

      // Handle connection events
      if (message.type === 'connection') {
        console.log('[WebSocketHandler] Connection event:', message.status);
      }

      // Handle heartbeat if enabled
      if (options.heartbeat && message.type === 'heartbeat') {
        console.log('[WebSocketHandler] Heartbeat received');
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

// Plugin Decorator
export function Plugin(options: { name: string; version: string; dependencies?: string[] }) {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
      public readonly pluginName = options.name;
      public readonly pluginVersion = options.version;
      public readonly pluginDependencies = options.dependencies || [];

      constructor(...args: any[]) {
        super(...args);
        console.log(`[Plugin] Loading plugin: ${options.name} v${options.version}`);
      }
    };
  };
}

// Export helper functions for accessing decorator metadata
export function getValidationMetadata(target: any, propertyKey: string) {
  return Reflect.getMetadata(METADATA_KEYS.VALIDATION, target, propertyKey);
}

export function getRateLimitMetadata(target: any, propertyKey: string) {
  return Reflect.getMetadata(METADATA_KEYS.RATE_LIMIT, target, propertyKey);
}

export function getCacheMetadata(target: any, propertyKey: string) {
  return Reflect.getMetadata(METADATA_KEYS.CACHE, target, propertyKey);
}

export function getRetryMetadata(target: any, propertyKey: string) {
  return Reflect.getMetadata(METADATA_KEYS.RETRY, target, propertyKey);
}

export function getMonitorMetadata(target: any, propertyKey: string) {
  return Reflect.getMetadata(METADATA_KEYS.MONITOR, target, propertyKey);
}

export function getLogMetadata(target: any, propertyKey: string) {
  return Reflect.getMetadata(METADATA_KEYS.LOG, target, propertyKey);
}