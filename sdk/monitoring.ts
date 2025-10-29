/**
 * KSET Performance Monitoring
 * Comprehensive performance monitoring and metrics collection
 */

import { EventEmitter } from 'events';
import type { PerformanceMetrics, LatencyMetrics, ThroughputMetrics, ErrorMetrics, ResourceMetrics } from './types';

export interface MonitoringConfig {
  /** Enable monitoring */
  enabled: boolean;
  /** Sampling rate (0.0 to 1.0) */
  samplingRate: number;
  /** Metrics collection interval in milliseconds */
  interval: number;
  /** Maximum number of data points to keep */
  maxDataPoints: number;
  /** Alert thresholds */
  thresholds?: {
    latency?: number;
    errorRate?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  /** Enable alerts */
  alertsEnabled: boolean;
}

export interface MetricSnapshot {
  timestamp: number;
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  errors: ErrorMetrics;
  resources: ResourceMetrics;
}

export interface Alert {
  id: string;
  type: 'latency' | 'error_rate' | 'memory' | 'cpu' | 'custom';
  severity: 'warning' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
}

export class PerformanceMonitor extends EventEmitter {
  private config: MonitoringConfig;
  private isMonitoring = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private metrics: MetricSnapshot[] = [];
  private counters: Map<string, number> = new Map();
  private timers: Map<string, number[]> = new Map();
  private gauges: Map<string, number> = new Map();
  private alerts: Alert[] = [];
  private activeAlerts: Set<string> = new Set();

  constructor(config: Partial<MonitoringConfig> = {}) {
    super();

    this.config = {
      enabled: true,
      samplingRate: 1.0,
      interval: 5000, // 5 seconds
      maxDataPoints: 1000,
      thresholds: {
        latency: 1000,
        errorRate: 5.0,
        memoryUsage: 80, // percentage
        cpuUsage: 80 // percentage
      },
      alertsEnabled: true,
      ...config
    };

    if (this.config.enabled) {
      this.startMonitoring();
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);

    console.log('📊 Performance monitoring started');
    this.emit('monitoring:started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('📊 Performance monitoring stopped');
    this.emit('monitoring:stopped');
  }

  /**
   * Record operation latency
   */
  recordLatency(operation: string, latency: number): void {
    if (Math.random() > this.config.samplingRate) {
      return; // Skip based on sampling rate
    }

    if (!this.timers.has(operation)) {
      this.timers.set(operation, []);
    }

    const latencies = this.timers.get(operation)!;
    latencies.push(latency);

    // Keep only recent measurements
    if (latencies.length > 1000) {
      latencies.splice(0, latencies.length - 1000);
    }

    // Check for latency alerts
    if (this.config.alertsEnabled && this.config.thresholds?.latency) {
      this.checkLatencyAlert(operation, latency);
    }
  }

  /**
   * Increment a counter
   */
  incrementCounter(counter: string, value: number = 1): void {
    const current = this.counters.get(counter) || 0;
    this.counters.set(counter, current + value);
  }

  /**
   * Set a gauge value
   */
  setGauge(gauge: string, value: number): void {
    this.gauges.set(gauge, value);

    // Check for alerts on specific gauges
    if (this.config.alertsEnabled) {
      this.checkGaugeAlert(gauge, value);
    }
  }

  /**
   * Record an error
   */
  recordError(error: Error, context?: Record<string, any>): void {
    this.incrementCounter('errors_total');
    this.incrementCounter(`errors_by_type_${error.name}`);

    if (context?.operation) {
      this.incrementCounter(`errors_by_operation_${context.operation}`);
    }

    this.emit('error:recorded', { error, context });
  }

  /**
   * Start a timer for an operation
   */
  startTimer(operation: string): () => void {
    const startTime = process.hrtime.bigint();

    return () => {
      const endTime = process.hrtime.bigint();
      const latency = Number(endTime - startTime) / 1000000; // Convert to milliseconds
      this.recordLatency(operation, latency);
    };
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    if (this.metrics.length === 0) {
      return this.getEmptyMetrics();
    }

    const latest = this.metrics[this.metrics.length - 1];
    return {
      latency: latest.latency,
      throughput: latest.throughput,
      errors: latest.errors,
      resources: latest.resources
    };
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(duration?: number): MetricSnapshot[] {
    if (!duration) {
      return [...this.metrics];
    }

    const cutoff = Date.now() - duration;
    return this.metrics.filter(snapshot => snapshot.timestamp >= cutoff);
  }

  /**
   * Get operation-specific metrics
   */
  getOperationMetrics(operation: string): {
    count: number;
    averageLatency: number;
    p50Latency: number;
    p95Latency: number;
    p99Latency: number;
    errorRate: number;
  } {
    const latencies = this.timers.get(operation) || [];
    const totalErrors = this.counters.get(`errors_by_operation_${operation}`) || 0;
    const totalOperations = latencies.length + totalErrors;

    if (latencies.length === 0) {
      return {
        count: 0,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        errorRate: 0
      };
    }

    const sorted = [...latencies].sort((a, b) => a - b);
    const sum = latencies.reduce((acc, val) => acc + val, 0);

    return {
      count: totalOperations,
      averageLatency: sum / latencies.length,
      p50Latency: sorted[Math.floor(sorted.length * 0.5)],
      p95Latency: sorted[Math.floor(sorted.length * 0.95)],
      p99Latency: sorted[Math.floor(sorted.length * 0.99)],
      errorRate: totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0
    };
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts).map(id =>
      this.alerts.find(alert => alert.id === id)
    ).filter(Boolean) as Alert[];
  }

  /**
   * Clear metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.counters.clear();
    this.timers.clear();
    this.gauges.clear();
    this.alerts = [];
    this.activeAlerts.clear();
  }

  /**
   * Export metrics in Prometheus format
   */
  exportPrometheusMetrics(): string {
    const metrics: string[] = [];

    // Export counters
    for (const [name, value] of this.counters) {
      metrics.push(`# TYPE ${name} counter`);
      metrics.push(`${name} ${value}`);
    }

    // Export gauges
    for (const [name, value] of this.gauges) {
      metrics.push(`# TYPE ${name} gauge`);
      metrics.push(`${name} ${value}`);
    }

    // Export operation metrics
    for (const [operation] of this.timers) {
      const opMetrics = this.getOperationMetrics(operation);
      const safeOperation = operation.replace(/[^a-zA-Z0-9_]/g, '_');

      metrics.push(`# TYPE operation_duration_seconds histogram`);
      metrics.push(`operation_duration_seconds_sum{operation="${operation}"} ${opMetrics.averageLatency / 1000}`);
      metrics.push(`operation_duration_seconds_count{operation="${operation}"} ${opMetrics.count}`);
    }

    return metrics.join('\n') + '\n';
  }

  private collectMetrics(): void {
    const timestamp = Date.now();

    const snapshot: MetricSnapshot = {
      timestamp,
      latency: this.calculateLatencyMetrics(),
      throughput: this.calculateThroughputMetrics(),
      errors: this.calculateErrorMetrics(),
      resources: this.calculateResourceMetrics()
    };

    this.metrics.push(snapshot);

    // Keep only recent data points
    if (this.metrics.length > this.config.maxDataPoints) {
      this.metrics.splice(0, this.metrics.length - this.config.maxDataPoints);
    }

    // Check for alerts
    if (this.config.alertsEnabled) {
      this.checkThresholds(snapshot);
    }

    this.emit('metrics:collected', snapshot);
  }

  private calculateLatencyMetrics(): LatencyMetrics {
    const allLatencies: number[] = [];

    for (const latencies of this.timers.values()) {
      allLatencies.push(...latencies);
    }

    if (allLatencies.length === 0) {
      return {
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        max: 0
      };
    }

    const sorted = [...allLatencies].sort((a, b) => a - b);
    const sum = allLatencies.reduce((acc, val) => acc + val, 0);

    return {
      average: sum / allLatencies.length,
      median: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)],
      max: Math.max(...allLatencies)
    };
  }

  private calculateThroughputMetrics(): ThroughputMetrics {
    const recentTime = Date.now() - 60000; // Last minute
    let requestsPerSecond = 0;
    let ordersPerSecond = 0;
    let messagesPerSecond = 0;

    // Calculate based on recent metrics
    const recentSnapshots = this.metrics.filter(s => s.timestamp >= recentTime);
    if (recentSnapshots.length > 1) {
      const timeSpan = (recentSnapshots[recentSnapshots.length - 1].timestamp - recentSnapshots[0].timestamp) / 1000;
      if (timeSpan > 0) {
        requestsPerSecond = this.counters.get('requests_total') || 0 / timeSpan;
        ordersPerSecond = this.counters.get('orders_total') || 0 / timeSpan;
        messagesPerSecond = this.counters.get('messages_total') || 0 / timeSpan;
      }
    }

    return {
      requestsPerSecond,
      ordersPerSecond,
      messagesPerSecond
    };
  }

  private calculateErrorMetrics(): ErrorMetrics {
    const totalErrors = this.counters.get('errors_total') || 0;
    const totalRequests = this.counters.get('requests_total') || 0;
    const errorRate = totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    const errorsByType: Record<string, number> = {};
    for (const [key, value] of this.counters) {
      if (key.startsWith('errors_by_type_')) {
        const errorType = key.replace('errors_by_type_', '');
        errorsByType[errorType] = value;
      }
    }

    const recentErrors: any[] = []; // Would need to track recent errors
    return {
      total: totalErrors,
      errorRate,
      errorsByType,
      recentErrors
    };
  }

  private calculateResourceMetrics(): ResourceMetrics {
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    return {
      memoryUsage: memoryUsageMB,
      cpuUsage: this.gauges.get('cpu_usage') || 0,
      activeConnections: this.gauges.get('active_connections') || 0,
      queueSizes: {
        orders: this.gauges.get('queue_orders') || 0,
        marketData: this.gauges.get('queue_market_data') || 0
      }
    };
  }

  private checkThresholds(snapshot: MetricSnapshot): void {
    // Check latency threshold
    if (this.config.thresholds?.latency && snapshot.latency.average > this.config.thresholds.latency) {
      this.createAlert('latency', 'warning',
        `Average latency (${snapshot.latency.average.toFixed(2)}ms) exceeds threshold (${this.config.thresholds.latency}ms)`,
        snapshot.latency.average,
        this.config.thresholds.latency
      );
    }

    // Check error rate threshold
    if (this.config.thresholds?.errorRate && snapshot.errors.errorRate > this.config.thresholds.errorRate) {
      this.createAlert('error_rate', 'critical',
        `Error rate (${snapshot.errors.errorRate.toFixed(2)}%) exceeds threshold (${this.config.thresholds.errorRate}%)`,
        snapshot.errors.errorRate,
        this.config.thresholds.errorRate
      );
    }

    // Check memory usage threshold
    if (this.config.thresholds?.memoryUsage && snapshot.resources.memoryUsage > this.config.thresholds.memoryUsage) {
      this.createAlert('memory', 'critical',
        `Memory usage (${snapshot.resources.memoryUsage.toFixed(2)}MB) exceeds threshold (${this.config.thresholds.memoryUsage}MB)`,
        snapshot.resources.memoryUsage,
        this.config.thresholds.memoryUsage
      );
    }

    // Check CPU usage threshold
    if (this.config.thresholds?.cpuUsage && snapshot.resources.cpuUsage > this.config.thresholds.cpuUsage) {
      this.createAlert('cpu', 'warning',
        `CPU usage (${snapshot.resources.cpuUsage.toFixed(2)}%) exceeds threshold (${this.config.thresholds.cpuUsage}%)`,
        snapshot.resources.cpuUsage,
        this.config.thresholds.cpuUsage
      );
    }
  }

  private checkLatencyAlert(operation: string, latency: number): void {
    if (this.config.thresholds?.latency && latency > this.config.thresholds.latency) {
      this.createAlert('latency', 'warning',
        `High latency detected for ${operation}: ${latency.toFixed(2)}ms`,
        latency,
        this.config.thresholds.latency
      );
    }
  }

  private checkGaugeAlert(gauge: string, value: number): void {
    if (gauge === 'cpu_usage' && this.config.thresholds?.cpuUsage && value > this.config.thresholds.cpuUsage) {
      this.createAlert('cpu', 'warning',
        `High CPU usage: ${value.toFixed(2)}%`,
        value,
        this.config.thresholds.cpuUsage
      );
    }
  }

  private createAlert(type: Alert['type'], severity: Alert['severity'], message: string, value: number, threshold: number): void {
    const alertId = `${type}_${Date.now()}`;

    // Check if we already have an active alert of this type
    const existingAlert = Array.from(this.activeAlerts).find(id =>
      this.alerts.find(a => a.id === id && a.type === type)
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    const alert: Alert = {
      id: alertId,
      type,
      severity,
      message,
      value,
      threshold,
      timestamp: Date.now()
    };

    this.alerts.push(alert);
    this.activeAlerts.add(alertId);

    this.emit('alert:triggered', alert);
    console.warn(`🚨 Performance Alert [${severity.toUpperCase()}]: ${message}`);

    // Auto-clear warning alerts after 5 minutes, critical after 10 minutes
    const clearTime = severity === 'critical' ? 10 * 60 * 1000 : 5 * 60 * 1000;
    setTimeout(() => {
      this.clearAlert(alertId);
    }, clearTime);
  }

  private clearAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      this.emit('alert:cleared', alert);
      console.log(`✅ Alert cleared: ${alert.message}`);
    }
  }

  private getEmptyMetrics(): PerformanceMetrics {
    return {
      latency: {
        average: 0,
        median: 0,
        p95: 0,
        p99: 0,
        max: 0
      },
      throughput: {
        requestsPerSecond: 0,
        ordersPerSecond: 0,
        messagesPerSecond: 0
      },
      errors: {
        total: 0,
        errorRate: 0,
        errorsByType: {},
        recentErrors: []
      },
      resources: {
        memoryUsage: 0,
        cpuUsage: 0,
        activeConnections: 0,
        queueSizes: {
          orders: 0,
          marketData: 0
        }
      }
    };
  }
}

// Performance decorator for automatic monitoring
export function monitor(operation: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      // Get performance monitor instance if available
      const monitor = (this as any).performanceMonitor;
      if (!monitor) {
        return originalMethod.apply(this, args);
      }

      const endTimer = monitor.startTimer(operation);
      monitor.incrementCounter('requests_total');

      try {
        const result = await originalMethod.apply(this, args);
        monitor.incrementCounter('requests_success');
        return result;
      } catch (error) {
        monitor.recordError(error as Error, { operation, args });
        monitor.incrementCounter('requests_failed');
        throw error;
      } finally {
        endTimer();
      }
    };

    return descriptor;
  };
}

// Export convenience functions
export function createPerformanceMonitor(config?: Partial<MonitoringConfig>): PerformanceMonitor {
  return new PerformanceMonitor(config);
}