/**
 * KSET Testing Mocks
 * Comprehensive mock implementations for testing
 */

import type {
  KSETSDK,
  EnhancedOrder,
  EnhancedMarketData,
  KSETSDKConfig,
  AccountInfo,
  Balance,
  Position,
  PerformanceMetrics
} from '../sdk/types';

// Mock provider implementation
export class MockKSETProvider {
  private connected = false;
  private orders: Map<string, EnhancedOrder> = new Map();
  private marketData: Map<string, EnhancedMarketData> = new Map();
  private accountInfo: AccountInfo;
  private balances: Balance[] = [];
  private positions: Position[] = [];

  constructor(config: any = {}) {
    this.setupMockData();
    this.accountInfo = {
      id: 'mock_account',
      name: 'Mock Account',
      type: 'trading',
      status: 'active',
      currency: 'KRW',
      ...config.account
    };
  }

  async connect(): Promise<void> {
    // Simulate connection delay
    await this.delay(100);
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async createOrder(orderData: Omit<EnhancedOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnhancedOrder> {
    if (!this.connected) {
      throw new Error('Not connected to provider');
    }

    const order: EnhancedOrder = {
      ...orderData,
      id: `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.orders.set(order.id, order);

    // Simulate order processing
    setTimeout(() => {
      order.status = 'accepted';
      order.updatedAt = new Date();
    }, 50);

    setTimeout(() => {
      order.status = 'filled';
      order.updatedAt = new Date();
    }, 200);

    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const order = this.orders.get(orderId);
    if (!order) {
      return false;
    }

    if (order.status === 'filled') {
      return false;
    }

    order.status = 'cancelled';
    order.updatedAt = new Date();
    return true;
  }

  async modifyOrder(orderId: string, updates: Partial<EnhancedOrder>): Promise<EnhancedOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    if (order.status === 'filled' || order.status === 'cancelled') {
      throw new Error(`Cannot modify order in ${order.status} status`);
    }

    Object.assign(order, updates, { updatedAt: new Date() });
    return order;
  }

  async getOrder(orderId: string): Promise<EnhancedOrder | null> {
    return this.orders.get(orderId) || null;
  }

  async getOrders(): Promise<EnhancedOrder[]> {
    return Array.from(this.orders.values());
  }

  async getMarketData(symbol: string): Promise<EnhancedMarketData | null> {
    // Simulate real-time data updates
    const data = this.marketData.get(symbol);
    if (data) {
      // Add some randomness to simulate market movements
      data.price = data.price * (1 + (Math.random() - 0.5) * 0.001);
      data.timestamp = new Date();
      data.volume = data.volume + Math.floor(Math.random() * 1000);
    }
    return data || null;
  }

  async getAccountInfo(): Promise<AccountInfo> {
    return this.accountInfo;
  }

  async getBalances(): Promise<Balance[]> {
    return this.balances;
  }

  async getPositions(): Promise<Position[]> {
    return this.positions;
  }

  private setupMockData(): void {
    // Setup mock market data
    const symbols = ['005930', '000660', '051910', '035420', '068270'];
    const basePrices = [80000, 120000, 450000, 150000, 300000];

    symbols.forEach((symbol, index) => {
      this.marketData.set(symbol, {
        symbol,
        price: basePrices[index],
        volume: 1000000,
        timestamp: new Date(),
        tradeStats: {
          totalVolume: 1000000000,
          tradeCount: 10000,
          avgTradeSize: 100000,
          vwap: basePrices[index],
          priceRange: {
            high: basePrices[index] * 1.02,
            low: basePrices[index] * 0.98,
            spread: basePrices[index] * 0.02
          }
        },
        technicalIndicators: {
          movingAverages: {
            sma5: basePrices[index] * 0.998,
            sma20: basePrices[index] * 0.995,
            ema12: basePrices[index] * 0.999,
            ema26: basePrices[index] * 0.992
          },
          momentum: {
            rsi: 55,
            macd: {
              macd: 100,
              signal: 80,
              histogram: 20
            }
          },
          volatility: {
            bollinger: {
              upper: basePrices[index] * 1.015,
              middle: basePrices[index],
              lower: basePrices[index] * 0.985
            },
            atr: basePrices[index] * 0.02
          }
        },
        sentiment: {
          score: 0.1,
          trend: 'bullish',
          confidence: 0.65,
          factors: [
            { name: 'volume', value: 0.2, weight: 0.3 },
            { name: 'price_momentum', value: 0.1, weight: 0.4 },
            { name: 'news_sentiment', value: 0.05, weight: 0.3 }
          ]
        }
      });
    });

    // Setup mock balances
    this.balances = [
      {
        asset: 'KRW',
        available: 100000000,
        locked: 0,
        total: 100000000
      },
      {
        asset: '005930',
        available: 100,
        locked: 0,
        total: 100
      },
      {
        asset: '000660',
        available: 50,
        locked: 10,
        total: 60
      }
    ];

    // Setup mock positions
    this.positions = [
      {
        symbol: '005930',
        quantity: 100,
        averagePrice: 79500,
        currentPrice: 80000,
        unrealizedPnL: 50000,
        realizedPnL: 0,
        side: 'long'
      },
      {
        symbol: '000660',
        quantity: 50,
        averagePrice: 118000,
        currentPrice: 120000,
        unrealizedPnL: 100000,
        realizedPnL: -5000,
        side: 'long'
      }
    ];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Mock SDK implementation
export class MockKSETSDK {
  private provider: MockKSETProvider;
  private eventEmitter: any;

  constructor(config: KSETSDKConfig = {}) {
    this.provider = new MockKSETProvider(config);
    this.eventEmitter = new (require('events').EventEmitter)();
  }

  async connect(): Promise<void> {
    await this.provider.connect();
    this.eventEmitter.emit('connection:connected', 'mock');
  }

  async disconnect(): Promise<void> {
    await this.provider.disconnect();
    this.eventEmitter.emit('connection:disconnected', 'mock');
  }

  isConnected(): boolean {
    return this.provider.isConnected();
  }

  async createOrder(orderData: Omit<EnhancedOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnhancedOrder> {
    const order = await this.provider.createOrder(orderData);
    this.eventEmitter.emit('order:submitted', order);

    // Simulate order status updates
    setTimeout(() => {
      order.status = 'accepted';
      this.eventEmitter.emit('order:accepted', order);
    }, 50);

    setTimeout(() => {
      order.status = 'filled';
      this.eventEmitter.emit('order:filled', order, {
        fillId: `fill_${Date.now()}`,
        orderId: order.id,
        quantity: order.quantity,
        price: order.price || 0,
        timestamp: new Date()
      });
    }, 200);

    return order;
  }

  async cancelOrder(orderId: string): Promise<boolean> {
    const result = await this.provider.cancelOrder(orderId);
    if (result) {
      this.eventEmitter.emit('order:cancelled', { id: orderId });
    }
    return result;
  }

  async modifyOrder(orderId: string, updates: Partial<EnhancedOrder>): Promise<EnhancedOrder> {
    const order = await this.provider.modifyOrder(orderId, updates);
    this.eventEmitter.emit('order:updated', order, updates);
    return order;
  }

  async getOrder(orderId: string): Promise<EnhancedOrder | null> {
    return this.provider.getOrder(orderId);
  }

  async getOrders(): Promise<EnhancedOrder[]> {
    return this.provider.getOrders();
  }

  async subscribeMarketData(symbols: string[]): Promise<void> {
    // Simulate real-time market data updates
    setInterval(async () => {
      for (const symbol of symbols) {
        const data = await this.provider.getMarketData(symbol);
        if (data) {
          this.eventEmitter.emit('market:data', data);
        }
      }
    }, 1000);
  }

  async unsubscribeMarketData(symbols: string[]): Promise<void> {
    // Mock implementation
  }

  async getMarketData(symbol: string): Promise<EnhancedMarketData | null> {
    return this.provider.getMarketData(symbol);
  }

  async getAccountInfo(): Promise<AccountInfo> {
    return this.provider.getAccountInfo();
  }

  async getBalances(): Promise<Balance[]> {
    return this.provider.getBalances();
  }

  async getPositions(): Promise<Position[]> {
    return this.provider.getPositions();
  }

  async getMetrics(): Promise<PerformanceMetrics> {
    return {
      latency: {
        average: 45,
        median: 42,
        p95: 78,
        p99: 120,
        max: 200
      },
      throughput: {
        requestsPerSecond: 150,
        ordersPerSecond: 25,
        messagesPerSecond: 1000
      },
      errors: {
        total: 5,
        errorRate: 0.5,
        errorsByType: {
          'timeout': 2,
          'network': 2,
          'validation': 1
        },
        recentErrors: []
      },
      resources: {
        memoryUsage: 45,
        cpuUsage: 12,
        activeConnections: 3,
        queueSizes: {
          'orders': 0,
          'marketData': 5
        }
      }
    };
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  emit(event: string, ...args: any[]): void {
    this.eventEmitter.emit(event, ...args);
  }
}

// Mock WebSocket for testing real-time features
export class MockWebSocket {
  private connected = false;
  private eventEmitter: any;

  constructor(url: string) {
    this.eventEmitter = new (require('events').EventEmitter)();

    // Simulate connection
    setTimeout(() => {
      this.connected = true;
      this.eventEmitter.emit('open');
    }, 50);
  }

  send(data: string): void {
    if (!this.connected) {
      throw new Error('WebSocket not connected');
    }

    // Echo back the data for testing
    setTimeout(() => {
      this.eventEmitter.emit('message', data);
    }, 10);
  }

  close(): void {
    this.connected = false;
    this.eventEmitter.emit('close');
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  off(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.off(event, listener);
  }

  // Static method to create mock WebSocket server
  static createServer(): MockWebSocketServer {
    return new MockWebSocketServer();
  }
}

export class MockWebSocketServer {
  private clients: MockWebSocket[] = [];
  private eventEmitter: any;

  constructor() {
    this.eventEmitter = new (require('events').EventEmitter)();
  }

  addClient(client: MockWebSocket): void {
    this.clients.push(client);
    this.eventEmitter.emit('connection', client);
  }

  broadcast(data: string): void {
    this.clients.forEach(client => {
      try {
        client.send(data);
      } catch (error) {
        // Client might be disconnected
      }
    });
  }

  on(event: string, listener: (...args: any[]) => void): void {
    this.eventEmitter.on(event, listener);
  }

  close(): void {
    this.clients.forEach(client => client.close());
    this.clients = [];
  }
}

// Factory functions for creating mocks
export function createMockSDK(config?: KSETSDKConfig): MockKSETSDK {
  return new MockKSETSDK(config);
}

export function createMockProvider(config?: any): MockKSETProvider {
  return new MockKSETProvider(config);
}

export function createMockWebSocket(url?: string): MockWebSocket {
  return new MockWebSocket(url || 'ws://localhost:8080');
}

// Mock data factories
export function createMockOrder(overrides: Partial<EnhancedOrder> = {}): EnhancedOrder {
  return {
    id: `mock_order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    symbol: '005930',
    side: 'buy',
    type: 'limit',
    quantity: 100,
    price: 80000,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
    metadata: {
      createdAt: new Date(),
      source: 'manual',
      priority: 5
    },
    ...overrides
  };
}

export function createMockMarketData(overrides: Partial<EnhancedMarketData> = {}): EnhancedMarketData {
  const basePrice = 80000;
  return {
    symbol: '005930',
    price: basePrice,
    volume: 1000000,
    timestamp: new Date(),
    tradeStats: {
      totalVolume: 1000000000,
      tradeCount: 10000,
      avgTradeSize: 100000,
      vwap: basePrice,
      priceRange: {
        high: basePrice * 1.02,
        low: basePrice * 0.98,
        spread: basePrice * 0.02
      }
    },
    technicalIndicators: {
      movingAverages: {
        sma5: basePrice * 0.998,
        sma20: basePrice * 0.995,
        ema12: basePrice * 0.999,
        ema26: basePrice * 0.992
      },
      momentum: {
        rsi: 55,
        macd: {
          macd: 100,
          signal: 80,
          histogram: 20
        }
      },
      volatility: {
        bollinger: {
          upper: basePrice * 1.015,
          middle: basePrice,
          lower: basePrice * 0.985
        },
        atr: basePrice * 0.02
      }
    },
    sentiment: {
      score: 0.1,
      trend: 'bullish',
      confidence: 0.65,
      factors: [
        { name: 'volume', value: 0.2, weight: 0.3 },
        { name: 'price_momentum', value: 0.1, weight: 0.4 },
        { name: 'news_sentiment', value: 0.05, weight: 0.3 }
      ]
    },
    ...overrides
  };
}

// Jest matchers for KSET testing
export const customMatchers = {
  toBeValidOrder(received: EnhancedOrder) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.symbol === 'string' &&
      typeof received.side === 'string' &&
      typeof received.type === 'string' &&
      typeof received.quantity === 'number' &&
      received.quantity > 0 &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    return {
      message: () => pass
        ? `expected ${received} not to be a valid order`
        : `expected ${received} to be a valid order`,
      pass
    };
  },

  toBeValidMarketData(received: EnhancedMarketData) {
    const pass = received &&
      typeof received.symbol === 'string' &&
      typeof received.price === 'number' &&
      received.price > 0 &&
      typeof received.volume === 'number' &&
      received.volume >= 0 &&
      received.timestamp instanceof Date;

    return {
      message: () => pass
        ? `expected ${received} not to be valid market data`
        : `expected ${received} to be valid market data`,
      pass
    };
  }
};