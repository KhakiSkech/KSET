/**
 * KSET Strategy Plugin Template
 * Template for creating new trading strategy plugins
 */

import { MarketData, OrderRequest, Portfolio, Position } from '../../types';

export interface StrategyPluginConfig {
  symbols: string[];
  timeframes: string[];
  parameters: Record<string, any>;
  riskManagement: {
    maxPositionSize: number;
    maxDailyLoss: number;
    stopLossPercent: number;
    takeProfitPercent: number;
  };
}

export interface Signal {
  symbol: string;
  action: 'buy' | 'sell' | 'hold';
  strength: number; // 0-1
  confidence: number; // 0-1
  timestamp: Date;
  reason: string;
  metadata?: Record<string, any>;
}

export interface BacktestResult {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  equity: Array<{ date: Date; value: number }>;
  trades: Array<{
    symbol: string;
    entryDate: Date;
    exitDate: Date;
    entryPrice: number;
    exitPrice: number;
    quantity: number;
    pnl: number;
    pnlPercent: number;
  }>;
}

export default class StrategyPlugin {
  private config: StrategyPluginConfig;
  private isRunning: boolean = false;
  private positions: Map<string, Position> = new Map();
  private signals: Signal[] = [];
  private trades: any[] = [];

  constructor(config: StrategyPluginConfig) {
    this.config = config;
  }

  /**
   * Initialize the strategy
   */
  public async initialize(): Promise<void> {
    try {
      // Validate configuration
      this.validateConfig();

      // Initialize indicators
      await this.initializeIndicators();

      // Load historical data if needed
      await this.loadHistoricalData();

      console.log(`Strategy initialized for symbols: ${this.config.symbols.join(', ')}`);
    } catch (error) {
      throw new Error(`Failed to initialize strategy: ${error.message}`);
    }
  }

  /**
   * Start the strategy
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Strategy is already running');
      return;
    }

    try {
      this.isRunning = true;
      console.log('Strategy started');

      // Main strategy loop
      this.runStrategyLoop();
    } catch (error) {
      this.isRunning = false;
      throw new Error(`Failed to start strategy: ${error.message}`);
    }
  }

  /**
   * Stop the strategy
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Strategy is not running');
      return;
    }

    try {
      this.isRunning = false;

      // Close all positions if configured
      if (this.config.riskManagement) {
        await this.closeAllPositions();
      }

      console.log('Strategy stopped');
    } catch (error) {
      throw new Error(`Failed to stop strategy: ${error.message}`);
    }
  }

  /**
   * Process new market data
   */
  public async processMarketData(data: MarketData): Promise<Signal[]> {
    if (!this.isRunning) {
      return [];
    }

    try {
      // Update indicators
      this.updateIndicators(data);

      // Generate signals
      const signals = this.generateSignals(data);

      // Apply risk management
      const filteredSignals = this.applyRiskManagement(signals, data);

      // Store signals
      this.signals.push(...filteredSignals);

      // Keep only recent signals (last 1000)
      if (this.signals.length > 1000) {
        this.signals = this.signals.slice(-1000);
      }

      return filteredSignals;
    } catch (error) {
      console.error(`Error processing market data for ${data.symbol}:`, error);
      return [];
    }
  }

  /**
   * Execute a signal
   */
  public async executeSignal(signal: Signal): Promise<OrderRequest | null> {
    try {
      if (signal.action === 'hold') {
        return null;
      }

      // Get current position
      const position = this.positions.get(signal.symbol);

      // Determine order details
      const order = this.createOrderFromSignal(signal, position);

      if (!order) {
        return null;
      }

      // Validate order against risk management
      if (!this.validateOrderRisk(order, position)) {
        console.warn(`Order rejected by risk management: ${JSON.stringify(order)}`);
        return null;
      }

      return order;
    } catch (error) {
      console.error(`Error executing signal:`, error);
      return null;
    }
  }

  /**
   * Update positions after order execution
   */
  public updatePosition(symbol: string, order: OrderRequest, execution: any): void {
    const position = this.positions.get(symbol);

    if (!position) {
      // New position
      this.positions.set(symbol, {
        symbol,
        quantity: execution.quantity * (order.side === 'buy' ? 1 : -1),
        averagePrice: execution.price,
        currentPrice: execution.price,
        marketValue: execution.quantity * execution.price,
        unrealizedPnL: 0,
        unrealizedPnLPercent: 0
      });
    } else {
      // Update existing position
      const newQuantity = position.quantity + (execution.quantity * (order.side === 'buy' ? 1 : -1));

      if (newQuantity === 0) {
        // Position closed
        this.recordTrade(position, order, execution);
        this.positions.delete(symbol);
      } else {
        // Position updated
        const totalCost = (position.averagePrice * Math.abs(position.quantity)) +
                         (execution.price * execution.quantity);
        const newAveragePrice = totalCost / Math.abs(newQuantity);

        this.positions.set(symbol, {
          ...position,
          quantity: newQuantity,
          averagePrice: newAveragePrice,
          currentPrice: execution.price,
          marketValue: Math.abs(newQuantity) * execution.price,
          unrealizedPnL: (execution.price - newAveragePrice) * newQuantity,
          unrealizedPnLPercent: ((execution.price - newAveragePrice) / newAveragePrice) * 100
        });
      }
    }
  }

  /**
   * Get strategy performance
   */
  public getPerformance(): {
    totalPnL: number;
    totalReturn: number;
    winRate: number;
    sharpeRatio: number;
    maxDrawdown: number;
    totalTrades: number;
  } {
    const pnl = this.trades.reduce((sum, trade) => sum + trade.pnl, 0);
    const winningTrades = this.trades.filter(trade => trade.pnl > 0).length;
    const totalTrades = this.trades.length;

    return {
      totalPnL: pnl,
      totalReturn: (pnl / this.getInitialCapital()) * 100,
      winRate: totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown(),
      totalTrades
    };
  }

  /**
   * Run backtest
   */
  public async runBacktest(
    historicalData: MarketData[],
    initialCapital: number = 100000
  ): Promise<BacktestResult> {
    console.log('Starting backtest...');

    const equity = [];
    let cash = initialCapital;
    let totalValue = initialCapital;

    for (const data of historicalData) {
      // Process data
      const signals = await this.processMarketData(data);

      // Execute signals (simplified for backtest)
      for (const signal of signals) {
        const order = await this.executeSignal(signal);

        if (order) {
          // Simulate order execution
          const execution = {
            price: data.price,
            quantity: order.quantity
          };

          this.updatePosition(data.symbol, order, execution);

          // Update cash
          if (order.side === 'buy') {
            cash -= (execution.price * execution.quantity);
          } else {
            cash += (execution.price * execution.quantity);
          }
        }
      }

      // Calculate total portfolio value
      const positionsValue = Array.from(this.positions.values())
        .reduce((sum, pos) => sum + pos.marketValue, 0);

      totalValue = cash + positionsValue;

      equity.push({
        date: data.timestamp,
        value: totalValue
      });
    }

    return this.calculateBacktestResults(equity, initialCapital);
  }

  // Protected methods to be implemented by concrete strategies

  protected async initializeIndicators(): Promise<void> {
    // Override in concrete strategy
  }

  protected updateIndicators(data: MarketData): void {
    // Override in concrete strategy
  }

  protected generateSignals(data: MarketData): Signal[] {
    // Override in concrete strategy
    return [];
  }

  // Private helper methods

  private validateConfig(): void {
    if (!this.config.symbols || this.config.symbols.length === 0) {
      throw new Error('At least one symbol must be specified');
    }

    if (!this.config.timeframes || this.config.timeframes.length === 0) {
      throw new Error('At least one timeframe must be specified');
    }

    if (this.config.riskManagement) {
      if (this.config.riskManagement.maxPositionSize <= 0 ||
          this.config.riskManagement.maxDailyLoss <= 0) {
        throw new Error('Risk management parameters must be positive');
      }
    }
  }

  private async loadHistoricalData(): Promise<void> {
    // Load historical data if needed for indicators
    // Implementation depends on data source
  }

  private async runStrategyLoop(): Promise<void> {
    // Main strategy loop implementation
    // This would typically use a timer or event-based approach
    console.log('Strategy loop started');
  }

  private applyRiskManagement(signals: Signal[], data: MarketData): Signal[] {
    if (!this.config.riskManagement) {
      return signals;
    }

    return signals.filter(signal => {
      // Check position size limits
      const position = this.positions.get(signal.symbol);
      if (position && Math.abs(position.quantity) >= this.config.riskManagement.maxPositionSize) {
        return false;
      }

      // Check daily loss limits
      const todayLoss = this.calculateTodayLoss();
      if (todayLoss >= this.config.riskManagement.maxDailyLoss) {
        return false;
      }

      // Apply stop loss and take profit
      if (position) {
        const pnlPercent = (data.price - position.averagePrice) / position.averagePrice * 100;

        if (position.quantity > 0 && pnlPercent <= -this.config.riskManagement.stopLossPercent) {
          // Stop loss for long position
          signal.action = 'sell';
          signal.reason = 'Stop loss triggered';
        } else if (position.quantity > 0 && pnlPercent >= this.config.riskManagement.takeProfitPercent) {
          // Take profit for long position
          signal.action = 'sell';
          signal.reason = 'Take profit triggered';
        } else if (position.quantity < 0 && pnlPercent >= this.config.riskManagement.stopLossPercent) {
          // Stop loss for short position
          signal.action = 'buy';
          signal.reason = 'Stop loss triggered';
        } else if (position.quantity < 0 && pnlPercent <= -this.config.riskManagement.takeProfitPercent) {
          // Take profit for short position
          signal.action = 'buy';
          signal.reason = 'Take profit triggered';
        }
      }

      return true;
    });
  }

  private createOrderFromSignal(signal: Signal, position?: Position): OrderRequest | null {
    const quantity = this.calculatePositionSize(signal, position);

    if (quantity <= 0) {
      return null;
    }

    return {
      symbol: signal.symbol,
      side: signal.action,
      quantity,
      price: undefined, // Market order
      type: 'market'
    };
  }

  private calculatePositionSize(signal: Signal, position?: Position): number {
    // Simple position sizing - can be overridden for more complex strategies
    const defaultSize = 100; // Default position size

    if (this.config.riskManagement) {
      return Math.min(defaultSize, this.config.riskManagement.maxPositionSize);
    }

    return defaultSize;
  }

  private validateOrderRisk(order: OrderRequest, position?: Position): boolean {
    if (!this.config.riskManagement) {
      return true;
    }

    // Check position size
    const newPositionSize = position ?
      Math.abs(position.quantity + (order.quantity * (order.side === 'buy' ? 1 : -1))) :
      order.quantity;

    if (newPositionSize > this.config.riskManagement.maxPositionSize) {
      return false;
    }

    return true;
  }

  private calculateTodayLoss(): number {
    const today = new Date().toDateString();
    return this.trades
      .filter(trade => trade.exitDate.toDateString() === today)
      .reduce((sum, trade) => sum + Math.min(0, trade.pnl), 0);
  }

  private recordTrade(position: Position, order: OrderRequest, execution: any): void {
    const pnl = (execution.price - position.averagePrice) * position.quantity;
    const pnlPercent = (pnl / (position.averagePrice * Math.abs(position.quantity))) * 100;

    this.trades.push({
      symbol: position.symbol,
      entryDate: new Date(), // Would track actual entry date
      exitDate: new Date(),
      entryPrice: position.averagePrice,
      exitPrice: execution.price,
      quantity: Math.abs(position.quantity),
      pnl,
      pnlPercent
    });
  }

  private calculateSharpeRatio(): number {
    if (this.trades.length < 2) return 0;

    const returns = this.trades.map(trade => trade.pnlPercent);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);

    return stdDev === 0 ? 0 : avgReturn / stdDev * Math.sqrt(252); // Annualized
  }

  private calculateMaxDrawdown(): number {
    if (this.trades.length === 0) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulativePnL = 0;

    for (const trade of this.trades) {
      cumulativePnL += trade.pnl;
      peak = Math.max(peak, cumulativePnL);
      maxDrawdown = Math.max(maxDrawdown, peak - cumulativePnL);
    }

    return maxDrawdown;
  }

  private getInitialCapital(): number {
    return 100000; // Default initial capital
  }

  private calculateBacktestResults(equity: Array<{ date: Date; value: number }>, initialCapital: number): BacktestResult {
    const finalValue = equity[equity.length - 1].value;
    const totalReturn = ((finalValue - initialCapital) / initialCapital) * 100;

    // Calculate annualized return (assuming 252 trading days per year)
    const days = (equity[equity.length - 1].date.getTime() - equity[0].date.getTime()) / (1000 * 60 * 60 * 24);
    const annualizedReturn = Math.pow(finalValue / initialCapital, 252 / days) - 1;

    return {
      totalReturn,
      annualizedReturn: annualizedReturn * 100,
      sharpeRatio: this.calculateSharpeRatio(),
      maxDrawdown: this.calculateMaxDrawdown(),
      winRate: this.getPerformance().winRate,
      totalTrades: this.trades.length,
      profitFactor: this.calculateProfitFactor(),
      equity,
      trades: this.trades
    };
  }

  private calculateProfitFactor(): number {
    const grossProfit = this.trades
      .filter(trade => trade.pnl > 0)
      .reduce((sum, trade) => sum + trade.pnl, 0);

    const grossLoss = Math.abs(this.trades
      .filter(trade => trade.pnl < 0)
      .reduce((sum, trade) => sum + trade.pnl, 0));

    return grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
  }

  private async closeAllPositions(): Promise<void> {
    for (const [symbol, position] of this.positions) {
      const closeSignal: Signal = {
        symbol,
        action: position.quantity > 0 ? 'sell' : 'buy',
        strength: 1,
        confidence: 1,
        timestamp: new Date(),
        reason: 'Strategy shutdown - closing position'
      };

      await this.executeSignal(closeSignal);
    }
  }
}