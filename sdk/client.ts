/**
 * KSET SDK Client
 * Main SDK client with enhanced features and developer experience
 */

import { EventEmitter } from 'events';
import { KSET } from '../src/core/KSET';
import type {
  KSETSDKConfig,
  KSETSDKClient,
  EnhancedOrder,
  EnhancedMarketData,
  PerformanceMetrics,
  PluginManager,
  DevTools,
  OrderFilter
} from './types';
import { KSETPluginManager } from './plugins';
import { PerformanceMonitor } from './monitoring';
import { ErrorHandler } from './middleware';
import { DevToolsServer } from './devtools';
import { CacheManager } from './cache';
import { ValidationEngine } from './validation';

export class KSETSDK extends EventEmitter implements KSETSDKClient {
  private readonly kset: KSET;
  private readonly config: KSETSDKConfig;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly errorHandler: ErrorHandler;
  private readonly pluginManager: PluginManager;
  private readonly cacheManager: CacheManager;
  private readonly validationEngine: ValidationEngine;
  private readonly devTools: DevTools | null;
  private isConnectedFlag = false;

  constructor(config: KSETSDKConfig) {
    super();
    this.config = this.mergeWithDefaults(config);
    this.kset = new KSET(this.config);

    // Initialize SDK components
    this.performanceMonitor = new PerformanceMonitor(this.config.performance);
    this.errorHandler = new ErrorHandler(this.config.errorHandling);
    this.pluginManager = new KSETPluginManager();
    this.cacheManager = new CacheManager(this.config.cache);
    this.validationEngine = new ValidationEngine();
    this.devTools = this.config.devTools?.enabled
      ? new DevToolsServer(this.config.devTools)
      : null;

    this.setupEventForwarding();
    this.setupPerformanceMonitoring();
  }

  /**
   * Connect to KSET providers
   */
  async connect(): Promise<void> {
    const startTime = Date.now();

    try {
      await this.kset.connect();
      this.isConnectedFlag = true;

      // Start development tools if enabled
      if (this.devTools) {
        await this.devTools.start();
      }

      // Initialize plugins
      await this.initializePlugins();

      this.emit('connection:connected', 'kset');

      const latency = Date.now() - startTime;
      this.performanceMonitor.recordLatency('connect', latency);

      if (this.config.debug) {
        console.log(`[KSET SDK] Connected successfully in ${latency}ms`);
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'connect' });
      this.emit('connection:error', 'kset', error as Error);
      throw error;
    }
  }

  /**
   * Disconnect from KSET providers
   */
  async disconnect(): Promise<void> {
    try {
      // Stop development tools
      if (this.devTools) {
        await this.devTools.stop();
      }

      // Cleanup plugins
      await this.cleanupPlugins();

      await this.kset.disconnect();
      this.isConnectedFlag = false;

      this.emit('connection:disconnected', 'kset');

      if (this.config.debug) {
        console.log('[KSET SDK] Disconnected successfully');
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'disconnect' });
      throw error;
    }
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.isConnectedFlag && this.kset.isConnected();
  }

  /**
   * Create an enhanced order
   */
  async createOrder(orderData: Omit<EnhancedOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnhancedOrder> {
    const startTime = Date.now();

    try {
      // Validate order data
      await this.validationEngine.validateOrder(orderData);

      // Check cache for similar orders
      const cacheKey = this.generateOrderCacheKey(orderData);
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        if (this.config.debug) {
          console.log('[KSET SDK] Order served from cache');
        }
        return cached;
      }

      // Create enhanced order object
      const order: EnhancedOrder = {
        ...orderData,
        id: this.generateOrderId(),
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: {
          ...orderData.metadata,
          createdAt: new Date(),
          source: orderData.metadata?.source || 'manual'
        }
      };

      // Risk checks
      await this.performRiskChecks(order);

      // Submit order to KSET
      const result = await this.kset.createOrder(order);

      // Cache the result
      if (this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, result, this.config.cache.ttl);
      }

      this.emit('order:submitted', order);

      const latency = Date.now() - startTime;
      this.performanceMonitor.recordLatency('createOrder', latency);

      return result;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'createOrder', orderData });
      this.emit('order:rejected', orderData as any, (error as Error).message);
      throw error;
    }
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string): Promise<boolean> {
    const startTime = Date.now();

    try {
      const result = await this.kset.cancelOrder(orderId);

      this.emit('order:cancelled', { id: orderId } as EnhancedOrder);

      const latency = Date.now() - startTime;
      this.performanceMonitor.recordLatency('cancelOrder', latency);

      return result;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'cancelOrder', orderId });
      throw error;
    }
  }

  /**
   * Modify an existing order
   */
  async modifyOrder(orderId: string, updates: Partial<EnhancedOrder>): Promise<EnhancedOrder> {
    const startTime = Date.now();

    try {
      // Validate updates
      await this.validationEngine.validateOrderUpdates(updates);

      const result = await this.kset.modifyOrder(orderId, updates);

      this.emit('order:updated', result, updates);

      const latency = Date.now() - startTime;
      this.performanceMonitor.recordLatency('modifyOrder', latency);

      return result;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'modifyOrder', orderId, updates });
      throw error;
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string): Promise<EnhancedOrder | null> {
    try {
      // Check cache first
      const cacheKey = `order:${orderId}`;
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        return cached;
      }

      const order = await this.kset.getOrder(orderId);

      // Cache the result
      if (order && this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, order, this.config.cache.ttl);
      }

      return order;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'getOrder', orderId });
      throw error;
    }
  }

  /**
   * Get orders with filtering
   */
  async getOrders(filter?: OrderFilter): Promise<EnhancedOrder[]> {
    try {
      const cacheKey = `orders:${JSON.stringify(filter)}`;
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        return cached;
      }

      const orders = await this.kset.getOrders(filter);

      // Cache the result
      if (this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, orders, this.config.cache.ttl);
      }

      return orders;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'getOrders', filter });
      throw error;
    }
  }

  /**
   * Subscribe to market data
   */
  async subscribeMarketData(symbols: string[]): Promise<void> {
    try {
      await this.kset.subscribeMarketData(symbols);

      if (this.config.debug) {
        console.log(`[KSET SDK] Subscribed to market data for: ${symbols.join(', ')}`);
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'subscribeMarketData', symbols });
      throw error;
    }
  }

  /**
   * Unsubscribe from market data
   */
  async unsubscribeMarketData(symbols: string[]): Promise<void> {
    try {
      await this.kset.unsubscribeMarketData(symbols);

      if (this.config.debug) {
        console.log(`[KSET SDK] Unsubscribed from market data for: ${symbols.join(', ')}`);
      }
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'unsubscribeMarketData', symbols });
      throw error;
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(symbol: string): Promise<EnhancedMarketData | null> {
    try {
      const cacheKey = `marketData:${symbol}`;
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        return cached;
      }

      const marketData = await this.kset.getMarketData(symbol);

      // Enhance market data with additional analytics
      const enhancedData = this.enhanceMarketData(marketData);

      // Cache the result
      if (enhancedData && this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, enhancedData, 5); // 5 seconds TTL for market data
      }

      return enhancedData;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'getMarketData', symbol });
      throw error;
    }
  }

  /**
   * Get account information
   */
  async getAccountInfo() {
    try {
      const cacheKey = 'accountInfo';
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        return cached;
      }

      const accountInfo = await this.kset.getAccountInfo();

      // Cache the result
      if (this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, accountInfo, 60); // 1 minute TTL
      }

      return accountInfo;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'getAccountInfo' });
      throw error;
    }
  }

  /**
   * Get account balances
   */
  async getBalances() {
    try {
      const cacheKey = 'balances';
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        return cached;
      }

      const balances = await this.kset.getBalances();

      // Cache the result
      if (this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, balances, 30); // 30 seconds TTL
      }

      return balances;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'getBalances' });
      throw error;
    }
  }

  /**
   * Get account positions
   */
  async getPositions() {
    try {
      const cacheKey = 'positions';
      const cached = this.cacheManager.get(cacheKey);
      if (cached && this.config.cache?.enabled) {
        return cached;
      }

      const positions = await this.kset.getPositions();

      // Cache the result
      if (this.config.cache?.enabled) {
        this.cacheManager.set(cacheKey, positions, 30); // 30 seconds TTL
      }

      return positions;
    } catch (error) {
      this.errorHandler.handleError(error as Error, { operation: 'getPositions' });
      throw error;
    }
  }

  /**
   * Get performance metrics
   */
  async getMetrics(): Promise<PerformanceMetrics> {
    return this.performanceMonitor.getMetrics();
  }

  /**
   * Get plugin manager
   */
  getPluginManager(): PluginManager {
    return this.pluginManager;
  }

  /**
   * Get development tools
   */
  getDevTools(): DevTools | null {
    return this.devTools;
  }

  // Private helper methods

  private mergeWithDefaults(config: KSETSDKConfig): KSETSDKConfig {
    return {
      debug: false,
      performance: {
        enabled: true,
        samplingRate: 1.0,
        maxLatency: 5000,
        ...config.performance
      },
      errorHandling: {
        maxRetries: 3,
        retryDelay: 1000,
        enableFallback: true,
        ...config.errorHandling
      },
      cache: {
        enabled: true,
        ttl: 300,
        maxSize: 1000,
        ...config.cache
      },
      devTools: {
        enabled: false,
        port: 3001,
        host: 'localhost',
        features: {
          debugger: true,
          monitor: true,
          visualizer: true,
          logger: true,
          ...config.devTools?.features
        },
        ...config.devTools
      },
      ...config
    };
  }

  private setupEventForwarding(): void {
    // Forward events from core KSET
    this.kset.on('order:filled', (order, fill) => {
      this.emit('order:filled', order, fill);
    });

    this.kset.on('order:rejected', (order, reason) => {
      this.emit('order:rejected', order, reason);
    });

    this.kset.on('market:data', (data) => {
      const enhancedData = this.enhanceMarketData(data);
      this.emit('market:data', enhancedData);
    });

    this.kset.on('connection:error', (provider, error) => {
      this.emit('connection:error', provider, error);
    });
  }

  private setupPerformanceMonitoring(): void {
    this.on('order:submitted', () => {
      this.performanceMonitor.incrementCounter('orders_submitted');
    });

    this.on('order:filled', () => {
      this.performanceMonitor.incrementCounter('orders_filled');
    });

    this.on('market:data', () => {
      this.performanceMonitor.incrementCounter('market_data_updates');
    });
  }

  private async initializePlugins(): Promise<void> {
    // Initialize core plugins if any
    const plugins = this.pluginManager.getPlugins();
    for (const plugin of plugins) {
      try {
        await plugin.initialize(this);
        if (this.config.debug) {
          console.log(`[KSET SDK] Plugin initialized: ${plugin.name}`);
        }
      } catch (error) {
        console.error(`[KSET SDK] Failed to initialize plugin ${plugin.name}:`, error);
      }
    }
  }

  private async cleanupPlugins(): Promise<void> {
    const plugins = this.pluginManager.getPlugins();
    for (const plugin of plugins) {
      try {
        if (plugin.destroy) {
          await plugin.destroy();
        }
      } catch (error) {
        console.error(`[KSET SDK] Failed to cleanup plugin ${plugin.name}:`, error);
      }
    }
  }

  private generateOrderId(): string {
    return `sdk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateOrderCacheKey(order: Partial<EnhancedOrder>): string {
    const keyData = {
      symbol: order.symbol,
      side: order.side,
      type: order.type,
      quantity: order.quantity,
      price: order.price
    };
    return `order:${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  private async performRiskChecks(order: EnhancedOrder): Promise<void> {
    // Implement risk checks based on order metadata
    if (order.riskSettings) {
      // Check order size limits
      if (order.riskSettings.maxOrderSize && order.quantity > order.riskSettings.maxOrderSize) {
        throw new Error(`Order size ${order.quantity} exceeds maximum allowed ${order.riskSettings.maxOrderSize}`);
      }
    }
  }

  private enhanceMarketData(marketData: any): EnhancedMarketData | null {
    if (!marketData) return null;

    // Add enhanced analytics to market data
    // This is a placeholder for actual enhancement logic
    return {
      ...marketData,
      // Add technical indicators, sentiment analysis, etc.
      technicalIndicators: {},
      sentiment: {
        score: 0,
        trend: 'neutral',
        confidence: 0,
        factors: []
      }
    };
  }
}

// Export convenience function for creating SDK instances
export function createKSETSDK(config: KSETSDKConfig): KSETSDK {
  return new KSETSDK(config);
}