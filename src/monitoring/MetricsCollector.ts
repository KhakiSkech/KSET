/**
 * KSET Metrics Collector
 * Optimized for Korean financial services monitoring and compliance
 */

import EventEmitter from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { KSETConfig } from '../types';

export interface MetricOptions {
  labels?: Record<string, string>;
  timestamp?: number;
}

export interface HistogramOptions extends MetricOptions {
  buckets?: number[];
}

export interface CounterMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export interface HistogramMetric {
  name: string;
  value: number;
  buckets: number[];
  counts: number[];
  labels: Record<string, string>;
  timestamp: number;
}

export interface GaugeMetric {
  name: string;
  value: number;
  labels: Record<string, string>;
  timestamp: number;
}

export class MetricsCollector extends EventEmitter {
  private config: KSETConfig;
  private counters: Map<string, CounterMetric> = new Map();
  private histograms: Map<string, HistogramMetric> = new Map();
  private gauges: Map<string, GaugeMetric> = new Map();
  private startTime: number = Date.now();
  private metricsPath: string;

  constructor(config: KSETConfig) {
    super();
    this.config = config;
    this.metricsPath = config.monitoring?.metricsPath || '/metrics';

    // Initialize system metrics
    this.initializeSystemMetrics();

    // Start periodic metrics collection
    this.startMetricsCollection();
  }

  /**
   * Initialize system-wide metrics
   */
  private initializeSystemMetrics(): void {
    // System info metrics
    this.setGauge('kset_process_info', 1, {
      pid: process.pid.toString(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'unknown',
      node_version: process.version
    });

    // Memory metrics
    this.collectMemoryMetrics();

    // Korean market status
    this.setGauge('kset_korean_market_status', this.getKoreanMarketStatus(), {
      market: 'KRX',
      timezone: 'Asia/Seoul'
    });
  }

  /**
   * Collect memory metrics
   */
  private collectMemoryMetrics(): void {
    const memUsage = process.memoryUsage();

    this.setGauge('kset_memory_bytes', memUsage.rss, { type: 'rss' });
    this.setGauge('kset_memory_bytes', memUsage.heapTotal, { type: 'heapTotal' });
    this.setGauge('kset_memory_bytes', memUsage.heapUsed, { type: 'heapUsed' });
    this.setGauge('kset_memory_bytes', memUsage.external, { type: 'external' });
    this.setGauge('kset_memory_bytes', memUsage.arrayBuffers, { type: 'arrayBuffers' });
  }

  /**
   * Start periodic metrics collection
   */
  private startMetricsCollection(): void {
    // Collect system metrics every 15 seconds
    setInterval(() => {
      this.collectMemoryMetrics();
      this.setGauge('kset_process_uptime_seconds', process.uptime());

      // Update Korean market status
      this.setGauge('kset_korean_market_status', this.getKoreanMarketStatus(), {
        market: 'KRX',
        timezone: 'Asia/Seoul'
      });
    }, 15000);

    // Clean up old metrics every hour
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000);
  }

  /**
   * Get Korean market status (1 for open, 0 for closed)
   */
  private getKoreanMarketStatus(): number {
    const now = new Date();
    const koreanTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Seoul" }));

    const day = koreanTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hours = koreanTime.getHours();
    const minutes = koreanTime.getMinutes();
    const timeInMinutes = hours * 60 + minutes;

    // Check if it's weekend
    if (day === 0 || day === 6) {
      return 0;
    }

    // Check if it's within trading hours (9:00 AM - 3:30 PM KST)
    if (timeInMinutes >= 540 && timeInMinutes <= 930) {
      return 1;
    }

    return 0;
  }

  /**
   * Increment a counter metric
   */
  public incrementCounter(name: string, value: number = 1, options: MetricOptions = {}): void {
    const key = this.createMetricKey(name, options.labels);
    const existing = this.counters.get(key);

    const metric: CounterMetric = {
      name,
      value: (existing?.value || 0) + value,
      labels: options.labels || {},
      timestamp: options.timestamp || Date.now()
    };

    this.counters.set(key, metric);
    this.emit('metric', { type: 'counter', metric });
  }

  /**
   * Record a histogram metric
   */
  public recordHistogram(name: string, value: number, options: HistogramOptions = {}): void {
    const key = this.createMetricKey(name, options.labels);
    const existing = this.histograms.get(key);
    const buckets = options.buckets || [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120, 300];

    let counts: number[];
    if (existing) {
      counts = [...existing.counts];
      for (let i = 0; i < buckets.length; i++) {
        if (value <= buckets[i]) {
          counts[i]++;
        }
      }
    } else {
      counts = buckets.map(bucket => value <= bucket ? 1 : 0);
    }

    const metric: HistogramMetric = {
      name,
      value,
      buckets,
      counts,
      labels: options.labels || {},
      timestamp: options.timestamp || Date.now()
    };

    this.histograms.set(key, metric);
    this.emit('metric', { type: 'histogram', metric });
  }

  /**
   * Set a gauge metric
   */
  public setGauge(name: string, value: number, options: MetricOptions = {}): void {
    const key = this.createMetricKey(name, options.labels);

    const metric: GaugeMetric = {
      name,
      value,
      labels: options.labels || {},
      timestamp: options.timestamp || Date.now()
    };

    this.gauges.set(key, metric);
    this.emit('metric', { type: 'gauge', metric });
  }

  /**
   * Create a unique key for a metric with labels
   */
  private createMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }

    const sortedLabels = Object.keys(labels)
      .sort()
      .map(key => `${key}="${labels[key]}"`)
      .join(',');

    return `${name}{${sortedLabels}}`;
  }

  /**
   * Clean up old metrics to prevent memory leaks
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean old counters
    for (const [key, metric] of this.counters.entries()) {
      if (metric.timestamp < cutoffTime) {
        this.counters.delete(key);
      }
    }

    // Clean old histograms
    for (const [key, metric] of this.histograms.entries()) {
      if (metric.timestamp < cutoffTime) {
        this.histograms.delete(key);
      }
    }

    // Clean old gauges (keep recent ones)
    for (const [key, metric] of this.gauges.entries()) {
      if (metric.timestamp < cutoffTime && !key.startsWith('kset_process_')) {
        this.gauges.delete(key);
      }
    }
  }

  /**
   * Generate Prometheus format metrics
   */
  public getPrometheusMetrics(): string {
    const metrics: string[] = [];

    // Add metadata
    metrics.push('# KSET Trading Library Metrics');
    metrics.push('# Generated at: ' + new Date().toISOString());
    metrics.push('# Environment: ' + (process.env.NODE_ENV || 'unknown'));
    metrics.push('');

    // Add process uptime
    metrics.push('# HELP kset_process_uptime_seconds Process uptime in seconds');
    metrics.push('# TYPE kset_process_uptime_seconds counter');
    metrics.push(`kset_process_uptime_seconds ${process.uptime()}`);
    metrics.push('');

    // Add counters
    const counterGroups = this.groupMetricsByName(Array.from(this.counters.values()));
    for (const [name, metrics] of counterGroups) {
      metrics.push(`# HELP ${name} ${this.getMetricHelp(name)}`);
      metrics.push(`# TYPE ${name} counter`);

      for (const metric of metrics) {
        const labelStr = this.formatLabels(metric.labels);
        metrics.push(`${name}${labelStr} ${metric.value}`);
      }
      metrics.push('');
    }

    // Add gauges
    const gaugeGroups = this.groupMetricsByName(Array.from(this.gauges.values()));
    for (const [name, metrics] of gaugeGroups) {
      metrics.push(`# HELP ${name} ${this.getMetricHelp(name)}`);
      metrics.push(`# TYPE ${name} gauge`);

      for (const metric of metrics) {
        const labelStr = this.formatLabels(metric.labels);
        metrics.push(`${name}${labelStr} ${metric.value}`);
      }
      metrics.push('');
    }

    // Add histograms
    const histogramGroups = this.groupMetricsByName(Array.from(this.histograms.values()));
    for (const [name, metrics] of histogramGroups) {
      metrics.push(`# HELP ${name} ${this.getMetricHelp(name)}`);
      metrics.push(`# TYPE ${name} histogram`);

      for (const metric of metrics) {
        const labelStr = this.formatLabels(metric.labels);

        // Add bucket counts
        for (let i = 0; i < metric.buckets.length; i++) {
          const bucketLabels = { ...metric.labels, le: metric.buckets[i].toString() };
          const bucketLabelStr = this.formatLabels(bucketLabels);
          metrics.push(`${name}_bucket${bucketLabelStr} ${metric.counts[i]}`);
        }

        // Add +Inf bucket
        const infLabels = { ...metric.labels, le: '+Inf' };
        const infLabelStr = this.formatLabels(infLabels);
        metrics.push(`${name}_bucket${infLabelStr} ${metric.counts[metric.counts.length - 1]}`);

        // Add count and sum
        metrics.push(`${name}_count${labelStr} ${metric.counts[metric.counts.length - 1]}`);
        metrics.push(`${name}_sum${labelStr} ${metric.value}`);
      }
      metrics.push('');
    }

    return metrics.join('\n');
  }

  /**
   * Group metrics by name
   */
  private groupMetricsByName<T extends { name: string }>(metrics: T[]): Map<string, T[]> {
    const groups = new Map<string, T[]>();

    for (const metric of metrics) {
      if (!groups.has(metric.name)) {
        groups.set(metric.name, []);
      }
      groups.get(metric.name)!.push(metric);
    }

    return groups;
  }

  /**
   * Get help text for a metric
   */
  private getMetricHelp(name: string): string {
    const helpTexts: Record<string, string> = {
      'kset_http_requests_total': 'Total number of HTTP requests',
      'kset_http_request_duration_seconds': 'HTTP request duration in seconds',
      'kset_trades_total': 'Total number of trades executed',
      'kset_orders_total': 'Total number of orders placed',
      'kset_orders_failed_total': 'Total number of failed orders',
      'kset_market_data_messages_total': 'Total number of market data messages received',
      'kset_websocket_connections_current': 'Current number of WebSocket connections',
      'kset_korean_market_status': 'Korean market status (1=open, 0=closed)',
      'kset_memory_bytes': 'Memory usage in bytes',
      'kset_process_info': 'Process information',
      'kset_trading_system_status': 'Trading system status (1=up, 0=down)',
      'kset_market_data_feed_status': 'Market data feed status (1=up, 0=down)',
      'kset_api_requests_total': 'Total number of API requests',
      'kset_login_failed_total': 'Total number of failed login attempts',
      'kset_audit_log_errors_total': 'Total number of audit log errors'
    };

    return helpTexts[name] || 'KSET trading library metric';
  }

  /**
   * Format labels for Prometheus output
   */
  private formatLabels(labels: Record<string, string>): string {
    const keys = Object.keys(labels);
    if (keys.length === 0) {
      return '';
    }

    const labelPairs = keys.map(key => `${key}="${labels[key]}"`);
    return `{${labelPairs.join(',')}}`;
  }

  /**
   * Get all metrics as JSON
   */
  public getMetricsJSON(): object {
    return {
      timestamp: Date.now(),
      uptime: process.uptime(),
      counters: Array.from(this.counters.values()),
      gauges: Array.from(this.gauges.values()),
      histograms: Array.from(this.histograms.values())
    };
  }

  /**
   * Reset all metrics (useful for testing)
   */
  public reset(): void {
    this.counters.clear();
    this.histograms.clear();
    this.gauges.clear();
    this.initializeSystemMetrics();
  }

  /**
   * Trading system specific metrics
   */
  public recordTrade(provider: string, symbol: string, quantity: number, price: number, value: number): void {
    this.incrementCounter('kset_trades_total', 1, { provider, symbol });
    this.setGauge('kset_last_trade_price', price, { provider, symbol });
    this.setGauge('kset_last_trade_quantity', quantity, { provider, symbol });
    this.setGauge('kset_last_trade_value', value, { provider, symbol });
  }

  public recordOrder(provider: string, type: string, status: string): void {
    this.incrementCounter('kset_orders_total', 1, { provider, type, status });
  }

  public recordOrderFailure(provider: string, type: string, reason: string): void {
    this.incrementCounter('kset_orders_failed_total', 1, { provider, type, reason });
  }

  public recordMarketDataMessage(provider: string, type: string, symbol: string): void {
    this.incrementCounter('kset_market_data_messages_total', 1, { provider, type, symbol });
  }

  public recordAPIRequest(endpoint: string, method: string, statusCode: number): void {
    this.incrementCounter('kset_api_requests_total', 1, { endpoint, method, status: statusCode.toString() });
  }

  public recordLoginAttempt(success: boolean, userId?: string): void {
    if (success) {
      this.incrementCounter('kset_login_success_total', 1, userId ? { user_id: userId } : {});
    } else {
      this.incrementCounter('kset_login_failed_total', 1, userId ? { user_id: userId } : {});
    }
  }

  public setWebSocketConnections(count: number): void {
    this.setGauge('kset_websocket_connections_current', count);
  }

  public setTradingSystemStatus(status: number, provider?: string): void {
    const labels = provider ? { provider } : {};
    this.setGauge('kset_trading_system_status', status, labels);
  }

  public setMarketDataFeedStatus(status: number, provider: string): void {
    this.setGauge('kset_market_data_feed_status', status, { provider });
  }

  public recordAuditLogError(error: string): void {
    this.incrementCounter('kset_audit_log_errors_total', 1, { error });
  }
}