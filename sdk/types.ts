/**
 * Enhanced TypeScript definitions for KSET SDK
 * Provides comprehensive type safety and developer experience
 */

import { EventEmitter } from 'events';

// Base KSET types (importing from main package)
import type {
  Order,
  OrderStatus,
  OrderType,
  Market,
  ProviderType,
  WebSocketMessage,
  AccountInfo,
  Balance,
  Position,
  MarketData,
  KSETConfig
} from '../src/types';

// Enhanced SDK Types
export interface KSETSDKConfig extends KSETConfig {
  /** Enable debugging mode with detailed logging */
  debug?: boolean;
  /** Performance monitoring configuration */
  performance?: {
    enabled: boolean;
    samplingRate?: number;
    maxLatency?: number;
  };
  /** Error handling configuration */
  errorHandling?: {
    maxRetries?: number;
    retryDelay?: number;
    enableFallback?: boolean;
  };
  /** Cache configuration */
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  /** Development tools configuration */
  devTools?: {
    enabled: boolean;
    port?: number;
    host?: string;
  };
}

// Enhanced Order Types
export interface EnhancedOrder extends Order {
  /** Unique client-side order identifier */
  clientOrderId?: string;
  /** Order metadata for tracking and analytics */
  metadata?: OrderMetadata;
  /** Execution strategy */
  executionStrategy?: ExecutionStrategy;
  /** Risk management settings */
  riskSettings?: RiskSettings;
}

export interface OrderMetadata {
  /** Order creation timestamp */
  createdAt: Date;
  /** Source of the order (manual, algorithm, API, etc.) */
  source: OrderSource;
  /** Strategy identifier if order comes from algorithm */
  strategyId?: string;
  /** Custom tags for organization */
  tags?: string[];
  /** Priority level for execution */
  priority?: OrderPriority;
  /** Parent order ID for complex orders */
  parentOrderId?: string;
  /** Child order IDs for complex orders */
  childOrderIds?: string[];
}

export enum OrderSource {
  MANUAL = 'manual',
  ALGORITHM = 'algorithm',
  API = 'api',
  WEBHOOK = 'webhook',
  SCHEDULED = 'scheduled'
}

export enum OrderPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 20
}

// Execution Strategy Types
export interface ExecutionStrategy {
  /** Type of execution algorithm */
  type: ExecutionType;
  /** Algorithm-specific parameters */
  parameters: Record<string, any>;
  /** Time constraints */
  timeConstraints?: TimeConstraints;
  /** Price constraints */
  priceConstraints?: PriceConstraints;
}

export enum ExecutionType {
  MARKET = 'market',
  LIMIT = 'limit',
  TWAP = 'twap', // Time-Weighted Average Price
  VWAP = 'vwap', // Volume-Weighted Average Price
  ICEBERG = 'iceberg',
  PEGGED = 'pegged',
  IMPLEMENTATION_SHORTFALL = 'implementation_shortfall'
}

export interface TimeConstraints {
  /** Maximum execution duration */
  maxDuration?: number;
  /** Start time for execution */
  startTime?: Date;
  /** End time for execution */
  endTime?: Date;
  /** Allowed execution times */
  allowedTimes?: TimeWindow[];
}

export interface TimeWindow {
  start: string; // HH:mm format
  end: string;   // HH:mm format
  days?: number[]; // 0-6 (Sunday-Saturday)
}

export interface PriceConstraints {
  /** Reference price for algorithms */
  referencePrice?: number;
  /** Maximum deviation from reference price */
  maxDeviation?: number;
  /** Price improvement target */
  improvementTarget?: number;
}

// Risk Management Types
export interface RiskSettings {
  /** Maximum order size */
  maxOrderSize?: number;
  /** Maximum daily loss */
  maxDailyLoss?: number;
  /** Maximum position size */
  maxPositionSize?: number;
  /** Risk limits */
  riskLimits?: RiskLimit[];
}

export interface RiskLimit {
  /** Type of risk limit */
  type: RiskLimitType;
  /** Limit value */
  value: number;
  /** Time period for limit */
  period: RiskPeriod;
  /** Action when limit is breached */
  action: RiskAction;
}

export enum RiskLimitType {
  MAX_ORDER_SIZE = 'max_order_size',
  MAX_DAILY_LOSS = 'max_daily_loss',
  MAX_POSITION_SIZE = 'max_position_size',
  MAX_ORDERS_PER_MINUTE = 'max_orders_per_minute',
  MAX_TURNOVER = 'max_turnover'
}

export enum RiskPeriod {
  REAL_TIME = 'real_time',
  MINUTE = 'minute',
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month'
}

export enum RiskAction {
  WARN = 'warn',
  REJECT = 'reject',
  REDUCE = 'reduce',
  STOP = 'stop'
}

// Enhanced Market Data Types
export interface EnhancedMarketData extends MarketData {
  /** Trade execution statistics */
  tradeStats?: TradeStatistics;
  /** Order book analysis */
  orderBookAnalysis?: OrderBookAnalysis;
  /** Technical indicators */
  technicalIndicators?: TechnicalIndicators;
  /** Market sentiment indicators */
  sentiment?: MarketSentiment;
}

export interface TradeStatistics {
  /** Total volume */
  totalVolume: number;
  /** Number of trades */
  tradeCount: number;
  /** Average trade size */
  avgTradeSize: number;
  /** Volume-weighted average price */
  vwap: number;
  /** Price range */
  priceRange: {
    high: number;
    low: number;
    spread: number;
  };
}

export interface OrderBookAnalysis {
  /** Total bid volume */
  totalBidVolume: number;
  /** Total ask volume */
  totalAskVolume: number;
  /** Bid-ask spread */
  spread: number;
  /** Order book imbalance */
  imbalance: number;
  /** Market depth at different levels */
  depth: OrderBookDepth[];
}

export interface OrderBookDepth {
  /** Price level */
  price: number;
  /** Bid volume at this level */
  bidVolume: number;
  /** Ask volume at this level */
  askVolume: number;
  /** Cumulative bid volume */
  cumulativeBidVolume: number;
  /** Cumulative ask volume */
  cumulativeAskVolume: number;
}

export interface TechnicalIndicators {
  /** Moving averages */
  movingAverages: {
    sma5?: number;
    sma20?: number;
    ema12?: number;
    ema26?: number;
  };
  /** Momentum indicators */
  momentum: {
    rsi?: number;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
    };
  };
  /** Volatility indicators */
  volatility: {
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
    };
    atr?: number;
  };
  /** Volume indicators */
  volume: {
    obv?: number;
    ad?: number;
  };
}

export interface MarketSentiment {
  /** Overall sentiment score (-1 to 1) */
  score: number;
  /** Sentiment trend */
  trend: 'bullish' | 'bearish' | 'neutral';
  /** Confidence level */
  confidence: number;
  /** Contributing factors */
  factors: SentimentFactor[];
}

export interface SentimentFactor {
  /** Factor name */
  name: string;
  /** Factor value */
  value: number;
  /** Factor weight */
  weight: number;
}

// Performance Monitoring Types
export interface PerformanceMetrics {
  /** Request latency metrics */
  latency: LatencyMetrics;
  /** Throughput metrics */
  throughput: ThroughputMetrics;
  /** Error metrics */
  errors: ErrorMetrics;
  /** Resource usage metrics */
  resources: ResourceMetrics;
}

export interface LatencyMetrics {
  /** Average latency in milliseconds */
  average: number;
  /** Median latency */
  median: number;
  /** 95th percentile latency */
  p95: number;
  /** 99th percentile latency */
  p99: number;
  /** Maximum latency */
  max: number;
}

export interface ThroughputMetrics {
  /** Requests per second */
  requestsPerSecond: number;
  /** Orders per second */
  ordersPerSecond: number;
  /** Messages per second */
  messagesPerSecond: number;
}

export interface ErrorMetrics {
  /** Total error count */
  total: number;
  /** Error rate */
  errorRate: number;
  /** Errors by type */
  errorsByType: Record<string, number>;
  /** Recent errors */
  recentErrors: RecentError[];
}

export interface RecentError {
  /** Error message */
  message: string;
  /** Error timestamp */
  timestamp: Date;
  /** Error context */
  context?: Record<string, any>;
}

export interface ResourceMetrics {
  /** Memory usage in MB */
  memoryUsage: number;
  /** CPU usage percentage */
  cpuUsage: number;
  /** Active connections */
  activeConnections: number;
  /** Queue sizes */
  queueSizes: Record<string, number>;
}

// Event Types
export interface KSETEvents {
  // Order events
  'order:submitted': (order: EnhancedOrder) => void;
  'order:accepted': (order: EnhancedOrder) => void;
  'order:rejected': (order: EnhancedOrder, reason: string) => void;
  'order:filled': (order: EnhancedOrder, fill: OrderFill) => void;
  'order:partially_filled': (order: EnhancedOrder, fill: OrderFill) => void;
  'order:cancelled': (order: EnhancedOrder) => void;
  'order:updated': (order: EnhancedOrder, updates: Partial<EnhancedOrder>) => void;

  // Market data events
  'market:data': (data: EnhancedMarketData) => void;
  'market:trade': (trade: Trade) => void;
  'market:quote': (quote: Quote) => void;
  'market:orderbook': (orderbook: OrderBook) => void;

  // Connection events
  'connection:connected': (provider: string) => void;
  'connection:disconnected': (provider: string, reason?: string) => void;
  'connection:error': (provider: string, error: Error) => void;

  // Performance events
  'performance:alert': (metrics: PerformanceMetrics) => void;
  'performance:threshold': (metric: string, value: number, threshold: number) => void;

  // Risk events
  'risk:alert': (alert: RiskAlert) => void;
  'risk:limit_breached': (limit: RiskLimit, value: number) => void;

  // System events
  'system:error': (error: Error, context?: Record<string, any>) => void;
  'system:warning': (message: string, context?: Record<string, any>) => void;
  'system:shutdown': () => void;
}

export interface OrderFill {
  /** Fill identifier */
  fillId: string;
  /** Order identifier */
  orderId: string;
  /** Fill quantity */
  quantity: number;
  /** Fill price */
  price: number;
  /** Fill timestamp */
  timestamp: Date;
  /** Fill commission */
  commission?: number;
  /** Fill fees */
  fees?: number;
}

export interface Trade {
  /** Trade identifier */
  id: string;
  /** Symbol */
  symbol: string;
  /** Price */
  price: number;
  /** Quantity */
  quantity: number;
  /** Timestamp */
  timestamp: Date;
  /** Trade side */
  side: 'buy' | 'sell';
  /** Trade conditions */
  conditions?: string[];
}

export interface Quote {
  /** Symbol */
  symbol: string;
  /** Bid price */
  bidPrice: number;
  /** Bid size */
  bidSize: number;
  /** Ask price */
  askPrice: number;
  /** Ask size */
  askSize: number;
  /** Timestamp */
  timestamp: Date;
  /** Quote conditions */
  conditions?: string[];
}

export interface OrderBook {
  /** Symbol */
  symbol: string;
  /** Bids */
  bids: BookLevel[];
  /** Asks */
  asks: BookLevel[];
  /** Timestamp */
  timestamp: Date;
  /** Sequence number */
  sequence?: number;
}

export interface BookLevel {
  /** Price level */
  price: number;
  /** Quantity at this level */
  quantity: number;
  /** Number of orders at this level */
  orderCount?: number;
}

export interface RiskAlert {
  /** Alert identifier */
  id: string;
  /** Alert type */
  type: string;
  /** Alert severity */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Alert message */
  message: string;
  /** Alert timestamp */
  timestamp: Date;
  /** Alert context */
  context: Record<string, any>;
  /** Suggested actions */
  suggestedActions: string[];
}

// Plugin System Types
export interface KSETPlugin {
  /** Plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Plugin description */
  description?: string;
  /** Plugin initialization */
  initialize(sdk: KSETSDK): Promise<void>;
  /** Plugin cleanup */
  destroy?(): Promise<void>;
  /** Plugin configuration */
  config?: Record<string, any>;
}

export interface PluginManager {
  /** Register a plugin */
  register(plugin: KSETPlugin): Promise<void>;
  /** Unregister a plugin */
  unregister(pluginName: string): Promise<void>;
  /** Get registered plugins */
  getPlugins(): KSETPlugin[];
  /** Enable/disable plugins */
  togglePlugin(pluginName: string, enabled: boolean): Promise<void>;
}

// Development Tools Types
export interface DevToolsConfig {
  /** Enable development tools */
  enabled: boolean;
  /** Server port */
  port?: number;
  /** Server host */
  host?: string;
  /** Authentication */
  auth?: {
    enabled: boolean;
    token?: string;
  };
  /** Features */
  features: {
    debugger: boolean;
    monitor: boolean;
    visualizer: boolean;
    logger: boolean;
  };
}

// SDK Client Interface
export interface KSETSDKClient extends EventEmitter {
  // Core functionality
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;

  // Order management
  createOrder(order: Omit<EnhancedOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<EnhancedOrder>;
  cancelOrder(orderId: string): Promise<boolean>;
  modifyOrder(orderId: string, updates: Partial<EnhancedOrder>): Promise<EnhancedOrder>;
  getOrder(orderId: string): Promise<EnhancedOrder | null>;
  getOrders(filter?: OrderFilter): Promise<EnhancedOrder[]>;

  // Market data
  subscribeMarketData(symbols: string[]): Promise<void>;
  unsubscribeMarketData(symbols: string[]): Promise<void>;
  getMarketData(symbol: string): Promise<EnhancedMarketData | null>;

  // Account management
  getAccountInfo(): Promise<AccountInfo>;
  getBalances(): Promise<Balance[]>;
  getPositions(): Promise<Position[]>;

  // Performance monitoring
  getMetrics(): Promise<PerformanceMetrics>;

  // Plugin management
  getPluginManager(): PluginManager;

  // Development tools
  getDevTools(): DevTools | null;
}

// Filter Types
export interface OrderFilter {
  /** Order status filter */
  status?: OrderStatus[];
  /** Order type filter */
  type?: OrderType[];
  /** Symbol filter */
  symbol?: string[];
  /** Date range filter */
  dateRange?: {
    start: Date;
    end: Date;
  };
  /** Source filter */
  source?: OrderSource[];
  /** Strategy filter */
  strategyId?: string;
}

// Development Tools Interface
export interface DevTools {
  /** Start development tools server */
  start(): Promise<void>;
  /** Stop development tools server */
  stop(): Promise<void>;
  /** Get server status */
  getStatus(): DevToolsStatus;
  /** Register custom tools */
  registerTool(tool: DevTool): void;
}

export interface DevToolsStatus {
  /** Running status */
  running: boolean;
  /** Server URL */
  url?: string;
  /** Connected clients */
  connectedClients: number;
  /** Available tools */
  availableTools: string[];
}

export interface DevTool {
  /** Tool name */
  name: string;
  /** Tool description */
  description: string;
  /** Tool handler */
  handler: (request: any) => Promise<any>;
  /** Tool configuration */
  config?: Record<string, any>;
}