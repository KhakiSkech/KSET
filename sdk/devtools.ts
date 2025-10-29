/**
 * KSET Development Tools
 * Visual debugging and monitoring tools for enhanced development experience
 */

import { EventEmitter } from 'events';
import { createServer, Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import * as express from 'express';
import * as path from 'path';
import type { DevTools as IDevTools, DevToolsConfig, DevTool, KSETSDKClient } from './types';
import type { PerformanceMetrics, EnhancedOrder, EnhancedMarketData } from './types';

export class DevToolsServer extends EventEmitter implements IDevTools {
  private server: Server | null = null;
  private wsServer: WebSocketServer | null = null;
  private app: express.Application;
  private config: DevToolsConfig;
  private connectedClients: Set<WebSocket> = new Set();
  private registeredTools: Map<string, DevTool> = new Map();
  private isRunning = false;

  constructor(config: DevToolsConfig) {
    super();
    this.config = config;
    this.app = express();
    this.setupExpress();
    this.registerDefaultTools();
  }

  /**
   * Start development tools server
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    const port = this.config.port || 3001;
    const host = this.config.host || 'localhost';

    // Create HTTP server
    this.server = createServer(this.app);

    // Create WebSocket server
    this.wsServer = new WebSocketServer({ server: this.server });
    this.setupWebSocket();

    // Start listening
    return new Promise((resolve, reject) => {
      this.server!.listen(port, host, () => {
        this.isRunning = true;
        console.log(`🛠️  KSET DevTools running at http://${host}:${port}`);
        this.emit('started', `http://${host}:${port}`);
        resolve();
      });

      this.server!.on('error', (error) => {
        console.error('Failed to start DevTools server:', error);
        reject(error);
      });
    });
  }

  /**
   * Stop development tools server
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Close WebSocket connections
    this.connectedClients.forEach(client => {
      client.close();
    });
    this.connectedClients.clear();

    // Close servers
    if (this.wsServer) {
      this.wsServer.close();
    }

    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.isRunning = false;
          console.log('🛠️  KSET DevTools stopped');
          this.emit('stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Get server status
   */
  getStatus(): {
    running: boolean;
    url?: string;
    connectedClients: number;
    availableTools: string[];
  } {
    return {
      running: this.isRunning,
      url: this.isRunning ? `http://${this.config.host || 'localhost'}:${this.config.port || 3001}` : undefined,
      connectedClients: this.connectedClients.size,
      availableTools: Array.from(this.registeredTools.keys())
    };
  }

  /**
   * Register custom tools
   */
  registerTool(tool: DevTool): void {
    this.registeredTools.set(tool.name, tool);
    this.broadcast({
      type: 'tool_registered',
      data: {
        name: tool.name,
        description: tool.description,
        config: tool.config
      }
    });
  }

  /**
   * Send data to connected clients
   */
  broadcast(data: any): void {
    const message = JSON.stringify(data);
    this.connectedClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  /**
   * Send market data update to clients
   */
  sendMarketData(data: EnhancedMarketData): void {
    this.broadcast({
      type: 'market_data',
      data
    });
  }

  /**
   * Send order update to clients
   */
  sendOrderUpdate(order: EnhancedOrder): void {
    this.broadcast({
      type: 'order_update',
      data: order
    });
  }

  /**
   * Send performance metrics to clients
   */
  sendPerformanceMetrics(metrics: PerformanceMetrics): void {
    this.broadcast({
      type: 'performance_metrics',
      data: metrics
    });
  }

  /**
   * Send log message to clients
   */
  sendLog(level: 'debug' | 'info' | 'warn' | 'error', message: string, context?: any): void {
    this.broadcast({
      type: 'log',
      data: {
        level,
        message,
        timestamp: new Date(),
        context
      }
    });
  }

  private setupExpress(): void {
    // Serve static files from the devtools directory
    this.app.use('/static', express.static(path.join(__dirname, '../devtools/public')));

    // API routes
    this.app.get('/api/status', (req, res) => {
      res.json(this.getStatus());
    });

    this.app.get('/api/tools', (req, res) => {
      const tools = Array.from(this.registeredTools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        config: tool.config
      }));
      res.json(tools);
    });

    this.app.post('/api/tools/:name', async (req, res) => {
      const toolName = req.params.name;
      const tool = this.registeredTools.get(toolName);

      if (!tool) {
        return res.status(404).json({ error: `Tool ${toolName} not found` });
      }

      try {
        const result = await tool.handler(req.body);
        res.json({ success: true, result });
      } catch (error) {
        res.status(500).json({
          error: (error as Error).message
        });
      }
    });

    // Serve main devtools interface
    this.app.get('/', (req, res) => {
      res.send(this.generateDevToolsHTML());
    });
  }

  private setupWebSocket(): void {
    if (!this.wsServer) return;

    this.wsServer.on('connection', (ws: WebSocket) => {
      this.connectedClients.add(ws);
      console.log('🔗 DevTools client connected');

      // Send initial data
      ws.send(JSON.stringify({
        type: 'connected',
        data: {
          status: this.getStatus(),
          tools: Array.from(this.registeredTools.keys())
        }
      }));

      // Handle client messages
      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Invalid message from client:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        this.connectedClients.delete(ws);
        console.log('🔗 DevTools client disconnected');
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.connectedClients.delete(ws);
      });
    });
  }

  private async handleClientMessage(ws: WebSocket, message: any): Promise<void> {
    switch (message.type) {
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;

      case 'tool_request':
        const tool = this.registeredTools.get(message.toolName);
        if (tool) {
          try {
            const result = await tool.handler(message.data);
            ws.send(JSON.stringify({
              type: 'tool_response',
              id: message.id,
              success: true,
              result
            }));
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'tool_response',
              id: message.id,
              success: false,
              error: (error as Error).message
            }));
          }
        } else {
          ws.send(JSON.stringify({
            type: 'tool_response',
            id: message.id,
            success: false,
            error: `Tool ${message.toolName} not found`
          }));
        }
        break;

      case 'subscribe':
        // Handle subscription requests
        ws.send(JSON.stringify({
          type: 'subscribed',
          data: message.data
        }));
        break;
    }
  }

  private registerDefaultTools(): void {
    // Debugger tool
    this.registerTool({
      name: 'debugger',
      description: 'Debug trading workflows and inspect state',
      handler: async (request) => {
        switch (request.action) {
          case 'get_state':
            return { state: 'debugging enabled' };
          case 'set_breakpoint':
            return { breakpoint: request.breakpoint, status: 'set' };
          default:
            throw new Error(`Unknown debugger action: ${request.action}`);
        }
      }
    });

    // Market data visualizer
    this.registerTool({
      name: 'market_visualizer',
      description: 'Visualize real-time market data',
      handler: async (request) => {
        switch (request.action) {
          case 'get_chart_data':
            return {
              symbol: request.symbol,
              data: this.generateMockChartData(request.symbol)
            };
          case 'get_orderbook':
            return {
              symbol: request.symbol,
              orderbook: this.generateMockOrderBook(request.symbol)
            };
          default:
            throw new Error(`Unknown visualizer action: ${request.action}`);
        }
      }
    });

    // Performance monitor
    this.registerTool({
      name: 'performance_monitor',
      description: 'Monitor system performance and metrics',
      handler: async (request) => {
        switch (request.action) {
          case 'get_metrics':
            return {
              timestamp: new Date(),
              latency: { average: 45, p95: 120 },
              throughput: { ordersPerSecond: 25 },
              memory: { used: 45, total: 128 },
              errors: { count: 2, rate: 0.1 }
            };
          case 'start_profiling':
            return { profiling: true, sessionId: `prof_${Date.now()}` };
          case 'stop_profiling':
            return { profiling: false, results: [] };
          default:
            throw new Error(`Unknown monitor action: ${request.action}`);
        }
      }
    });

    // Connection inspector
    this.registerTool({
      name: 'connection_inspector',
      description: 'Inspect provider connections and WebSocket streams',
      handler: async (request) => {
        switch (request.action) {
          case 'get_connections':
            return {
              connections: [
                {
                  provider: 'kiwoom',
                  status: 'connected',
                  latency: 23,
                  lastPing: new Date()
                },
                {
                  provider: 'korea_investment',
                  status: 'connected',
                  latency: 45,
                  lastPing: new Date()
                }
              ]
            };
          case 'test_connection':
            return {
              provider: request.provider,
              test: 'success',
              latency: Math.random() * 100
            };
          default:
            throw new Error(`Unknown inspector action: ${request.action}`);
        }
      }
    });

    // Log viewer
    this.registerTool({
      name: 'log_viewer',
      description: 'View and filter application logs',
      handler: async (request) => {
        switch (request.action) {
          case 'get_logs':
            return {
              logs: this.generateMockLogs(request.level, request.limit),
              total: 100
            };
          case 'clear_logs':
            return { cleared: true };
          default:
            throw new Error(`Unknown log action: ${request.action}`);
        }
      }
    });
  }

  private generateMockChartData(symbol: string): any[] {
    const data = [];
    const basePrice = 80000;
    const now = Date.now();

    for (let i = 100; i >= 0; i--) {
      const time = new Date(now - i * 60000); // 1-minute intervals
      const price = basePrice + (Math.random() - 0.5) * 1000;
      const volume = Math.floor(Math.random() * 10000);

      data.push({
        time: time.toISOString(),
        open: price,
        high: price * 1.002,
        low: price * 0.998,
        close: price,
        volume
      });
    }

    return data;
  }

  private generateMockOrderBook(symbol: string): any {
    const basePrice = 80000;
    const bids = [];
    const asks = [];

    for (let i = 1; i <= 10; i++) {
      bids.push({
        price: basePrice - i * 10,
        quantity: Math.floor(Math.random() * 1000) + 100,
        orders: Math.floor(Math.random() * 10) + 1
      });

      asks.push({
        price: basePrice + i * 10,
        quantity: Math.floor(Math.random() * 1000) + 100,
        orders: Math.floor(Math.random() * 10) + 1
      });
    }

    return { bids, asks };
  }

  private generateMockLogs(level?: string, limit: number = 50): any[] {
    const logs = [];
    const levels = level ? [level] : ['debug', 'info', 'warn', 'error'];
    const messages = [
      'Order submitted successfully',
      'Market data received',
      'Connection established',
      'Performance threshold exceeded',
      'Risk check passed',
      'Cache miss for market data',
      'WebSocket connection closed',
      'API rate limit approached'
    ];

    for (let i = 0; i < limit; i++) {
      const logLevel = levels[Math.floor(Math.random() * levels.length)];
      const message = messages[Math.floor(Math.random() * messages.length)];
      const timestamp = new Date(Date.now() - Math.random() * 3600000); // Last hour

      logs.push({
        timestamp: timestamp.toISOString(),
        level: logLevel,
        message,
        context: {
          orderId: Math.random() > 0.7 ? `order_${Math.floor(Math.random() * 1000)}` : undefined,
          symbol: Math.random() > 0.5 ? '005930' : undefined,
          provider: Math.random() > 0.6 ? 'kiwoom' : 'korea_investment'
        }
      });
    }

    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  private generateDevToolsHTML(): string {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KSET Development Tools</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        .tab-content { display: none; }
        .tab-content.active { display: block; }
        .log-debug { color: #6b7280; }
        .log-info { color: #3b82f6; }
        .log-warn { color: #f59e0b; }
        .log-error { color: #ef4444; }
    </style>
</head>
<body class="bg-gray-900 text-white">
    <div class="container mx-auto p-4">
        <header class="mb-6">
            <h1 class="text-3xl font-bold text-blue-400">🛠️ KSET Development Tools</h1>
            <p class="text-gray-400">Visual debugging and monitoring for Korean securities trading</p>
        </header>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
            <div class="bg-gray-800 p-4 rounded">
                <h3 class="text-sm font-semibold text-gray-400 mb-1">Connection Status</h3>
                <p class="text-2xl font-bold text-green-400" id="connection-status">Connected</p>
            </div>
            <div class="bg-gray-800 p-4 rounded">
                <h3 class="text-sm font-semibold text-gray-400 mb-1">Active Orders</h3>
                <p class="text-2xl font-bold text-blue-400" id="active-orders">0</p>
            </div>
            <div class="bg-gray-800 p-4 rounded">
                <h3 class="text-sm font-semibold text-gray-400 mb-1">Avg Latency</h3>
                <p class="text-2xl font-bold text-yellow-400" id="avg-latency">0ms</p>
            </div>
            <div class="bg-gray-800 p-4 rounded">
                <h3 class="text-sm font-semibold text-gray-400 mb-1">Error Rate</h3>
                <p class="text-2xl font-bold text-red-400" id="error-rate">0%</p>
            </div>
        </div>

        <div class="bg-gray-800 rounded-lg">
            <div class="flex border-b border-gray-700">
                <button class="tab-btn px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700" data-tab="market-data">
                    📊 Market Data
                </button>
                <button class="tab-btn px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700" data-tab="orders">
                    📋 Orders
                </button>
                <button class="tab-btn px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700" data-tab="performance">
                    ⚡ Performance
                </button>
                <button class="tab-btn px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700" data-tab="connections">
                    🔗 Connections
                </button>
                <button class="tab-btn px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700" data-tab="logs">
                    📝 Logs
                </button>
                <button class="tab-btn px-6 py-3 text-gray-400 hover:text-white hover:bg-gray-700" data-tab="debugger">
                    🐛 Debugger
                </button>
            </div>

            <!-- Market Data Tab -->
            <div id="market-data" class="tab-content p-6">
                <div class="mb-4">
                    <input type="text" id="symbol-input" placeholder="Enter symbol (e.g., 005930)"
                           class="bg-gray-700 text-white px-4 py-2 rounded mr-2">
                    <button id="subscribe-btn" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                        Subscribe
                    </button>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <h3 class="text-lg font-semibold mb-2">Price Chart</h3>
                        <canvas id="price-chart"></canvas>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold mb-2">Order Book</h3>
                        <div id="orderbook" class="bg-gray-700 rounded p-4 h-64 overflow-y-auto">
                            <p class="text-gray-400">Select a symbol to view order book</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Orders Tab -->
            <div id="orders" class="tab-content p-6">
                <h3 class="text-lg font-semibold mb-4">Recent Orders</h3>
                <div class="overflow-x-auto">
                    <table class="w-full text-sm">
                        <thead>
                            <tr class="border-b border-gray-700">
                                <th class="text-left py-2">ID</th>
                                <th class="text-left py-2">Symbol</th>
                                <th class="text-left py-2">Side</th>
                                <th class="text-left py-2">Type</th>
                                <th class="text-left py-2">Quantity</th>
                                <th class="text-left py-2">Price</th>
                                <th class="text-left py-2">Status</th>
                                <th class="text-left py-2">Time</th>
                            </tr>
                        </thead>
                        <tbody id="orders-table">
                            <tr>
                                <td colspan="8" class="text-center py-4 text-gray-400">No orders yet</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Performance Tab -->
            <div id="performance" class="tab-content p-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div class="bg-gray-700 rounded p-4">
                        <h3 class="text-sm font-semibold text-gray-400 mb-2">Latency Distribution</h3>
                        <canvas id="latency-chart"></canvas>
                    </div>
                    <div class="bg-gray-700 rounded p-4">
                        <h3 class="text-sm font-semibold text-gray-400 mb-2">Throughput</h3>
                        <canvas id="throughput-chart"></canvas>
                    </div>
                </div>
                <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div class="bg-gray-700 rounded p-4">
                        <h3 class="text-sm font-semibold text-gray-400 mb-2">Memory Usage</h3>
                        <div class="text-2xl font-bold text-green-400" id="memory-usage">45 MB</div>
                    </div>
                    <div class="bg-gray-700 rounded p-4">
                        <h3 class="text-sm font-semibold text-gray-400 mb-2">CPU Usage</h3>
                        <div class="text-2xl font-bold text-yellow-400" id="cpu-usage">12%</div>
                    </div>
                    <div class="bg-gray-700 rounded p-4">
                        <h3 class="text-sm font-semibold text-gray-400 mb-2">Active Connections</h3>
                        <div class="text-2xl font-bold text-blue-400" id="active-connections">3</div>
                    </div>
                </div>
            </div>

            <!-- Connections Tab -->
            <div id="connections" class="tab-content p-6">
                <h3 class="text-lg font-semibold mb-4">Provider Connections</h3>
                <div id="connections-list" class="space-y-2">
                    <!-- Connections will be populated here -->
                </div>
            </div>

            <!-- Logs Tab -->
            <div id="logs" class="tab-content p-6">
                <div class="mb-4 flex gap-2">
                    <select id="log-level" class="bg-gray-700 text-white px-4 py-2 rounded">
                        <option value="">All Levels</option>
                        <option value="debug">Debug</option>
                        <option value="info">Info</option>
                        <option value="warn">Warning</option>
                        <option value="error">Error</option>
                    </select>
                    <button id="clear-logs" class="bg-red-600 hover:bg-red-700 px-4 py-2 rounded">
                        Clear Logs
                    </button>
                </div>
                <div id="logs-container" class="bg-gray-700 rounded p-4 h-96 overflow-y-auto font-mono text-sm">
                    <p class="text-gray-400">No logs yet</p>
                </div>
            </div>

            <!-- Debugger Tab -->
            <div id="debugger" class="tab-content p-6">
                <h3 class="text-lg font-semibold mb-4">Trading Workflow Debugger</h3>
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div>
                        <h4 class="font-semibold mb-2">Breakpoints</h4>
                        <div id="breakpoints" class="bg-gray-700 rounded p-4 mb-4">
                            <p class="text-gray-400">No breakpoints set</p>
                        </div>
                        <input type="text" id="breakpoint-input" placeholder="Enter condition"
                               class="bg-gray-700 text-white px-4 py-2 rounded w-full mb-2">
                        <button id="add-breakpoint" class="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded">
                            Add Breakpoint
                        </button>
                    </div>
                    <div>
                        <h4 class="font-semibold mb-2">Execution State</h4>
                        <div id="execution-state" class="bg-gray-700 rounded p-4">
                            <p class="text-gray-400">Not debugging</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <script>
        // WebSocket connection for real-time updates
        const ws = new WebSocket('ws://localhost:${this.config.port || 3001}');

        ws.onopen = function() {
            console.log('Connected to DevTools server');
        };

        ws.onmessage = function(event) {
            const data = JSON.parse(event.data);
            handleRealtimeUpdate(data);
        };

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const tabName = this.dataset.tab;

                // Hide all tabs
                document.querySelectorAll('.tab-content').forEach(content => {
                    content.classList.remove('active');
                });

                // Remove active state from all buttons
                document.querySelectorAll('.tab-btn').forEach(button => {
                    button.classList.remove('bg-gray-700', 'text-white');
                    button.classList.add('text-gray-400');
                });

                // Show selected tab
                document.getElementById(tabName).classList.add('active');
                this.classList.add('bg-gray-700', 'text-white');
                this.classList.remove('text-gray-400');
            });
        });

        // Initialize first tab
        document.querySelector('.tab-btn').click();

        function handleRealtimeUpdate(data) {
            switch(data.type) {
                case 'market_data':
                    updateMarketData(data.data);
                    break;
                case 'order_update':
                    updateOrdersTable(data.data);
                    break;
                case 'performance_metrics':
                    updatePerformanceMetrics(data.data);
                    break;
                case 'log':
                    addLogEntry(data.data);
                    break;
            }
        }

        // Additional JavaScript for interactive features would go here
        // For brevity, showing just the structure
    </script>
</body>
</html>`;
  }
}

// Additional development tools components
export class VisualDebugger {
  private breakpoints: Map<string, Function> = new Map();
  private isDebugging = false;

  /**
   * Set a breakpoint for debugging
   */
  setBreakpoint(condition: string, callback: Function): void {
    this.breakpoints.set(condition, callback);
  }

  /**
   * Start debugging session
   */
  startDebugging(): void {
    this.isDebugging = true;
    console.log('🐛 Debugging session started');
  }

  /**
   * Stop debugging session
   */
  stopDebugging(): void {
    this.isDebugging = false;
    console.log('🐛 Debugging session stopped');
  }

  /**
   * Check if debugging is active
   */
  isDebuggingActive(): boolean {
    return this.isDebugging;
  }
}

export class MarketDataVisualizer {
  private charts: Map<string, any> = new Map();

  /**
   * Create price chart for symbol
   */
  createPriceChart(symbol: string, container: HTMLElement): void {
    // Implementation would create a real chart using Chart.js or similar
    console.log(`📊 Creating price chart for ${symbol}`);
  }

  /**
   * Update chart with new data
   */
  updateChart(symbol: string, data: any): void {
    const chart = this.charts.get(symbol);
    if (chart) {
      // Update chart with new data
    }
  }

  /**
   * Create order book visualization
   */
  createOrderBook(symbol: string, container: HTMLElement): void {
    console.log(`📋 Creating order book for ${symbol}`);
  }

  /**
   * Update order book with new data
   */
  updateOrderBook(symbol: string, orderBook: any): void {
    // Update order book visualization
  }
}

export class PerformanceProfiler {
  private isProfiling = false;
  private profileData: any[] = [];

  /**
   * Start performance profiling
   */
  startProfiling(): string {
    this.isProfiling = true;
    this.profileData = [];
    const sessionId = `prof_${Date.now()}`;
    console.log(`⚡ Performance profiling started: ${sessionId}`);
    return sessionId;
  }

  /**
   * Stop performance profiling
   */
  stopProfiling(sessionId: string): any[] {
    this.isProfiling = false;
    console.log(`⚡ Performance profiling stopped: ${sessionId}`);
    return this.profileData;
  }

  /**
   * Record performance metric
   */
  recordMetric(name: string, value: number, unit: string): void {
    if (this.isProfiling) {
      this.profileData.push({
        timestamp: Date.now(),
        name,
        value,
        unit
      });
    }
  }
}