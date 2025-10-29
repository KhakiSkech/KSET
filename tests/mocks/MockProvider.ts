import {
  IKSETProvider,
  ProviderCapabilities,
  MarketData,
  Order,
  OrderRequest,
  Account,
  Position,
  Balance,
  CompanyInfo,
  ProviderHealthStatus,
  RealTimeDataStatus
} from '../../src/interfaces';
import { MockLogger } from './MockLogger';

/**
 * Mock Provider implementation for testing
 */
export class MockProvider implements IKSETProvider {
  public id: string;
  public name: string;
  public capabilities: ProviderCapabilities;
  public connected: boolean = false;
  public logger: MockLogger;
  public marketData: Map<string, MarketData> = new Map();
  public accounts: Account[] = [];
  public orders: Order[] = [];
  public errorMode: boolean = false;
  public responseDelay: number = 0;

  constructor(
    id: string,
    name: string,
    capabilities?: Partial<ProviderCapabilities>
  ) {
    this.id = id;
    this.name = name;
    this.logger = new MockLogger();
    this.capabilities = {
      marketData: {
        historicalData: true,
        realTimeData: true,
        marketDepth: true,
        tickData: false
      },
      trading: {
        orderTypes: ['MARKET', 'LIMIT', 'STOP', 'STOP_LIMIT'],
        orderSides: ['BUY', 'SELL'],
        timeInForce: ['DAY', 'GTC', 'IOC', 'FOK'],
        algorithmicTrading: false,
        icebergOrders: false,
        afterHours: false
      },
      account: {
        balance: true,
        positions: true,
        history: true,
        statements: true
      },
      research: {
        companyInfo: true,
        financials: true,
        news: true,
        analysis: false
      },
      realTimeData: true,
      orderUpdates: true,
      balanceUpdates: true,
      positionUpdates: true,
      ...capabilities
    };
  }

  async initialize(config: any): Promise<void> {
    if (this.responseDelay > 0) {
      await this.delay(this.responseDelay);
    }

    if (this.errorMode) {
      throw new Error(`Mock provider ${this.id} initialization failed`);
    }

    this.connected = true;
    this.logger.info(`Mock provider ${this.id} initialized`);
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.logger.info(`Mock provider ${this.id} disconnected`);
  }

  async getMarketData(symbols: string[]): Promise<{
    success: boolean;
    data?: MarketData[];
    error?: string;
  }> {
    if (this.responseDelay > 0) {
      await this.delay(this.responseDelay);
    }

    if (this.errorMode) {
      return {
        success: false,
        error: 'Mock provider market data error'
      };
    }

    const data: MarketData[] = symbols.map(symbol => {
      const existingData = this.marketData.get(symbol);
      if (existingData) return existingData;

      const mockData: MarketData = {
        symbol,
        name: `${symbol} Mock Stock`,
        price: Math.random() * 100000 + 10000,
        change: (Math.random() - 0.5) * 1000,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.floor(Math.random() * 1000000),
        market: 'KOSPI',
        timestamp: new Date(),
        bid: Math.random() * 100000 + 10000,
        ask: Math.random() * 100000 + 10000,
        high: Math.random() * 100000 + 10000,
        low: Math.random() * 100000 + 10000,
        open: Math.random() * 100000 + 10000,
        previousClose: Math.random() * 100000 + 10000
      };

      this.marketData.set(symbol, mockData);
      return mockData;
    });

    return { success: true, data };
  }

  async placeOrder(orderRequest: OrderRequest): Promise<{
    success: boolean;
    data?: Order;
    error?: string;
  }> {
    if (this.responseDelay > 0) {
      await this.delay(this.responseDelay);
    }

    if (this.errorMode) {
      return {
        success: false,
        error: 'Mock provider order placement error'
      };
    }

    const order: Order = {
      id: `MOCK-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      symbol: orderRequest.symbol,
      side: orderRequest.side,
      type: orderRequest.orderType,
      quantity: orderRequest.quantity,
      price: orderRequest.price,
      status: 'SUBMITTED',
      timestamp: new Date(),
      quantityFilled: 0,
      averageFillPrice: 0,
      orderValue: 0,
      account: orderRequest.account || 'MOCK-ACCOUNT',
      exchange: 'KRX',
      timeInForce: orderRequest.timeInForce || 'DAY'
    };

    this.orders.push(order);
    this.logger.info(`Mock order placed: ${order.id}`);

    return { success: true, data: order };
  }

  async cancelOrder(orderId: string): Promise<{
    success: boolean;
    data?: Order;
    error?: string;
  }> {
    if (this.responseDelay > 0) {
      await this.delay(this.responseDelay);
    }

    const order = this.orders.find(o => o.id === orderId);
    if (!order) {
      return {
        success: false,
        error: 'Order not found'
      };
    }

    order.status = 'CANCELLED';
    return { success: true, data: order };
  }

  async getAccounts(): Promise<{
    success: boolean;
    data?: Account[];
    error?: string;
  }> {
    if (this.errorMode) {
      return {
        success: false,
        error: 'Mock provider accounts error'
      };
    }

    return { success: true, data: this.accounts };
  }

  async getPositions(accountId?: string): Promise<{
    success: boolean;
    data?: Position[];
    error?: string;
  }> {
    if (this.errorMode) {
      return {
        success: false,
        error: 'Mock provider positions error'
      };
    }

    return { success: true, data: [] };
  }

  async getBalances(accountId?: string): Promise<{
    success: boolean;
    data?: Balance[];
    error?: string;
  }> {
    if (this.errorMode) {
      return {
        success: false,
        error: 'Mock provider balances error'
      };
    }

    return { success: true, data: [] };
  }

  async getCompanyInfo(symbol: string): Promise<{
    success: boolean;
    data?: CompanyInfo;
    error?: string;
  }> {
    if (this.errorMode) {
      return {
        success: false,
        error: 'Mock provider company info error'
      };
    }

    const mockCompanyInfo: CompanyInfo = {
      symbol,
      name: `${symbol} Mock Company`,
      sector: 'Technology',
      industry: 'Software',
      description: 'Mock company for testing',
      marketCap: Math.random() * 1000000000000,
      employees: Math.floor(Math.random() * 10000),
      founded: new Date(2000, 0, 1),
      website: `https://mock-${symbol.toLowerCase()}.com`,
      address: '123 Mock Street, Seoul, South Korea'
    };

    return { success: true, data: mockCompanyInfo };
  }

  async getHealthStatus(): Promise<ProviderHealthStatus> {
    return {
      provider: this.id,
      connected: this.connected,
      lastHeartbeat: new Date(),
      apiStatus: this.connected ? 'healthy' : 'down',
      latency: this.responseDelay,
      errorRate: this.errorMode ? 100 : 0,
      details: {
        uptime: 99.9,
        requestsPerSecond: 100,
        averageResponseTime: this.responseDelay
      }
    };
  }

  async enableRealTimeData(): Promise<void> {
    this.logger.info(`Real-time data enabled for ${this.id}`);
  }

  async disableRealTimeData(): Promise<void> {
    this.logger.info(`Real-time data disabled for ${this.id}`);
  }

  async subscribeToRealTimeData(
    symbols: string[],
    callback: (data: any) => void
  ): Promise<{ id: string; unsubscribe: () => Promise<void> }> {
    const subscriptionId = `SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const unsubscribe = async () => {
      this.logger.info(`Unsubscribed from real-time data for ${subscriptionId}`);
    };

    this.logger.info(`Subscribed to real-time data for symbols: ${symbols.join(', ')}`);

    return { id: subscriptionId, unsubscribe };
  }

  async subscribeToOrderUpdates(
    callback: (data: any) => void
  ): Promise<{ id: string; unsubscribe: () => Promise<void> }> {
    const subscriptionId = `ORDER-SUB-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const unsubscribe = async () => {
      this.logger.info(`Unsubscribed from order updates for ${subscriptionId}`);
    };

    this.logger.info(`Subscribed to order updates: ${subscriptionId}`);

    return { id: subscriptionId, unsubscribe };
  }

  getRealTimeDataStatus(): RealTimeDataStatus {
    return {
      enabled: this.connected,
      subscriptionCount: 0,
      activeSubscriptions: [],
      webSocketConnected: this.connected
    };
  }

  async reconnectRealTimeData(): Promise<void> {
    this.logger.info(`Real-time data reconnected for ${this.id}`);
  }

  // Helper methods for testing
  setErrorMode(enabled: boolean): void {
    this.errorMode = enabled;
  }

  setResponseDelay(delay: number): void {
    this.responseDelay = delay;
  }

  setMarketData(symbol: string, data: MarketData): void {
    this.marketData.set(symbol, data);
  }

  setAccounts(accounts: Account[]): void {
    this.accounts = accounts;
  }

  clearOrders(): void {
    this.orders = [];
  }

  getCapabilities(): ProviderCapabilities {
    return this.capabilities;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Mock additional research methods
  async searchCompany(query: string, options?: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: []
    };
  }

  async getFinancialData(symbol: string, period: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: []
    };
  }

  async getDisclosures(symbol: string, options?: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: []
    };
  }

  async analyzeIndustry(industryCode: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: {}
    };
  }

  async getInvestmentOpinion(symbol: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: {}
    };
  }

  async getEconomicIndicators(): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: {}
    };
  }

  async getResearchReports(symbol: string, options?: any): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    return {
      success: true,
      data: []
    };
  }
}