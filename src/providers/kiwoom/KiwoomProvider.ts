/**
 * Kiwoom Securities Provider Implementation
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 키움증권 API Provider 완전 구현
 * REST API + 실시간 WebSocket 지원
 */

import {
  IKSETProvider,
  ProviderConfig,
  AuthCredentials,
  AuthResult,
  ProviderHealthStatus,
  MarketData,
  Order,
  OrderRequest,
  OrderBook,
  AccountInfo,
  Balance,
  Position,
  Portfolio,
  CompanyInfo,
  FinancialData,
  Disclosure,
  ApiResponse,
  RealTimeCallback,
  OrderCallback,
  Subscription,
  HistoricalDataPeriod,
  OrderModification,
  OrderFilters,
  TransactionFilters,
  PaginationOptions,
  MarketInfo,
  Holiday,
  RateLimitInfo,
  ErrorContext,
  MarketType,
  ResearchType,
  DisclosureType,
  FinancialPeriod
} from '@/interfaces';

import {
  ProviderCapabilities,
  OrderStatus,
  OrderType,
  OrderSide,
  TimeInForce,
  AssetType
} from '@/types';

import {
  KSETError,
  KSETErrorFactory,
  ERROR_CODES
} from '@/errors';

import { KSETProvider } from '@/providers/base/KSETProvider';
import { KiwoomWebSocketProvider } from '@/real-time/KiwoomWebSocketProvider';
import { KoreanMarketEngine } from '@/engines/KoreanMarketEngine';
import { KoreanComplianceEngine } from '@/engines/KoreanComplianceEngine';

// 키움 API 관련 타입 정의
interface KiwoomAccountInfo {
  accountNumber: string;
  accountName: string;
  accountType: string;
  deposit: number;
  withdrawable: number;
  totalPurchasePrice: number;
  totalEvaluationPrice: number;
  totalEvaluationProfitLoss: number;
  totalEvaluationProfitLossRate: number;
}

interface KiwoomBalance {
  accountNumber: string;
  totalDeposit: number;
  withdrawableAmount: number;
  cash: number;
  margin: number;
  credit: number;
  totalPurchasePrice: number;
  totalEvaluationPrice: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
}

interface KiwoomPosition {
  accountNumber: string;
  symbol: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  currentPrice: number;
  evaluationPrice: number;
  profitLoss: number;
  profitLossRate: number;
  holdingDays: number;
  quantityRemaining: number;
}

interface KiwoomOrder {
  accountNumber: string;
  orderId: string;
  symbol: string;
  name: string;
  orderType: string;
  orderSide: string;
  quantity: number;
  price: number;
  executedQuantity: number;
  executedPrice: number;
  remainingQuantity: number;
  orderStatus: string;
  orderTime: string;
  orderNumber: string;
  originalOrderNumber: string;
}

interface KiwoomMarketData {
  symbol: string;
  name: string;
  currentPrice: number;
  changePrice: number;
  changeRate: number;
  volume: number;
  tradingValue: number;
  openPrice: number;
  highPrice: number;
  lowPrice: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
  marketCap: number;
  listedShares: number;
  foreignHoldingRatio: number;
  marketStatus: string;
}

/**
 * 키움증권 Provider 구현체
 */
export class KiwoomProvider extends KSETProvider {
  readonly id = 'kiwoom';
  readonly name = 'Kiwoom Securities';
  readonly version = '1.0.0';
  readonly capabilities: ProviderCapabilities = {
    supportedCategories: [
      'market-data',
      'trading',
      'account',
      'research',
      'real-time',
      'historical-data',
      'order-book',
      'financial-statements',
      'disclosures'
    ],
    marketData: {
      realTimeQuotes: true,
      historicalData: true,
      orderBook: true,
      technicalIndicators: true,
      marketDepth: true,
      updateFrequency: 100 // ms
    },
    trading: {
      orderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP,
        OrderType.STOP_LIMIT,
        OrderType.ICEBERG,
        OrderType.TWAP,
        OrderType.VWAP
      ],
      supportedMarkets: [
        MarketType.KOSPI,
        MarketType.KOSDAQ,
        MarketType.KONEX,
        MarketType.ETF,
        MarketType.ETN,
        MarketType.ELW
      ],
      orderModification: true,
      orderCancellation: true,
      conditionalOrders: true,
      algorithmicOrders: true
    },
    account: {
      balanceQuery: true,
      positionQuery: true,
      transactionHistory: true,
      portfolioAnalysis: true,
      taxReporting: true,
      performanceAnalysis: true
    },
    research: {
      companyInfo: true,
      financialStatements: true,
      disclosures: true,
      analystRatings: true,
      economicIndicators: true,
      newsAnalysis: true
    },
    authentication: {
      methods: ['certificate', 'api-key'],
      twoFactorAuth: true,
      sessionTimeout: 3600, // 1시간
      refreshToken: true
    },
    limitations: {
      rateLimits: {
        requestsPerSecond: 10,
        requestsPerMinute: 200,
        requestsPerHour: 5000,
        requestsPerDay: 50000
      },
      supportedMarkets: [
        MarketType.KOSPI,
        MarketType.KOSDAQ,
        MarketType.KONEX,
        MarketType.ETF,
        MarketType.ETN,
        MarketType.ELW
      ],
      maxOrdersPerSecond: 5,
      maxConnections: 3
    }
  };

  private marketEngine = new KoreanMarketEngine();
  private complianceEngine = new KoreanComplianceEngine();
  private apiToken?: string;
  private certificatePath?: string;

  constructor() {
    super();
  }

  // ==========================================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================================

  protected async doInitialize(): Promise<void> {
    console.log('🚀 Initializing Kiwoom Provider...');

    if (!this.config) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Configuration not set',
        'kiwoom'
      );
    }

    // API 엔드포인트 설정 확인
    if (!this.config.apiEndpoints?.rest) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'REST API endpoint is required',
        'kiwoom'
      );
    }

    // WebSocket 엔드포인트 설정 확인
    if (!this.config.apiEndpoints?.websocket) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'WebSocket endpoint is required',
        'kiwoom'
      );
    }

    // 인증서 경로 설정 확인
    this.certificatePath = this.config.certificatePath;
    if (!this.certificatePath) {
      console.warn('⚠️ Certificate path not configured. Some features may be limited.');
    }

    console.log('✅ Kiwoom Provider initialized successfully');
  }

  protected async doAuthenticate(credentials: AuthCredentials): Promise<AuthResult> {
    console.log('🔐 Authenticating with Kiwoom Securities...');

    try {
      // API 키 기반 인증 시도
      if (credentials.apiKey) {
        return await this.authenticateWithApiKey(credentials.apiKey);
      }

      // 인증서 기반 인증 시도
      if (this.certificatePath) {
        return await this.authenticateWithCertificate(credentials.password);
      }

      throw KSETErrorFactory.create(
        ERROR_CODES.AUTH_FAILED,
        'No valid authentication method provided',
        'kiwoom'
      );
    } catch (error) {
      throw KSETErrorFactory.create(
        ERROR_CODES.AUTH_FAILED,
        `Authentication failed: ${(error as Error).message}`,
        'kiwoom'
      );
    }
  }

  private async authenticateWithApiKey(apiKey: string): Promise<AuthResult> {
    // API 키 기반 인증 로직
    const response = await this.makeRequest('/auth/api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        client_id: this.config?.clientId,
        client_secret: this.config?.clientSecret
      })
    });

    if (!response.success) {
      throw new Error(response.error || 'API key authentication failed');
    }

    const data = response.data;
    this.apiToken = data.access_token;

    return {
      success: true,
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      permissions: data.permissions || [],
      userId: data.user_id,
      accounts: data.accounts || []
    };
  }

  private async authenticateWithCertificate(password: string): Promise<AuthResult> {
    if (!this.certificatePath) {
      throw KSETErrorFactory.create(
        ERROR_CODES.AUTH_FAILED,
        'Certificate path is required for certificate authentication',
        'kiwoom'
      );
    }

    // 인증서 기반 인증 로직
    const response = await this.makeRequest('/auth/certificate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        certificate_path: this.certificatePath,
        password: password
      })
    });

    if (!response.success) {
      throw new Error(response.error || 'Certificate authentication failed');
    }

    const data = response.data;
    this.apiToken = data.access_token;

    return {
      success: true,
      token: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(data.expires_at),
      permissions: data.permissions || [],
      userId: data.user_id,
      accounts: data.accounts || []
    };
  }

  protected async doDisconnect(): Promise<void> {
    console.log('🔌 Disconnecting from Kiwoom Securities...');

    try {
      // 실시간 데이터 연결 해제
      await this.disableRealTimeData();

      // 로그아웃 요청
      if (this.apiToken) {
        await this.makeRequest('/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          }
        });
      }

      this.apiToken = undefined;
      this.isAuthenticated = false;
      this.authResult = undefined;

      console.log('✅ Disconnected from Kiwoom Securities');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }

  protected async doHealthCheck(): Promise<ProviderHealthStatus> {
    try {
      const response = await this.makeRequest('/health', {
        method: 'GET',
        timeout: 5000
      });

      return {
        provider: this.id,
        connected: true,
        lastHeartbeat: new Date(),
        apiStatus: 'healthy',
        latency: response.latency || 0,
        errorRate: 0,
        details: {
          serverTime: response.data?.serverTime,
          version: response.data?.version,
          uptime: response.data?.uptime
        }
      };
    } catch (error) {
      return {
        provider: this.id,
        connected: false,
        lastHeartbeat: this.lastHeartbeat,
        apiStatus: 'down',
        latency: -1,
        errorRate: 100,
        details: { error: (error as Error).message }
      };
    }
  }

  // ==========================================================================
  // MARKET DATA APIS
  // ==========================================================================

  protected async doGetMarketData(symbols: string[]): Promise<ApiResponse<MarketData[]>> {
    try {
      const response = await this.makeRequest('/market/data/quotes', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch market data');
      }

      const marketData: MarketData[] = response.data.map((item: KiwoomMarketData) => ({
        symbol: item.symbol,
        name: item.name,
        lastPrice: item.currentPrice,
        change: item.changePrice,
        changePercent: item.changeRate * 100,
        volume: item.volume,
        value: item.tradingValue,
        open: item.openPrice,
        high: item.highPrice,
        low: item.lowPrice,
        bid: item.bidPrice,
        ask: item.askPrice,
        bidSize: item.bidQuantity,
        askSize: item.askQuantity,
        timestamp: Date.now(),
        market: this.detectMarketType(item.symbol),
        extended: {
          marketCap: item.marketCap,
          listedShares: item.listedShares,
          foreignHoldingRatio: item.foreignHoldingRatio,
          marketStatus: item.marketStatus
        }
      }));

      return this.createSuccessResponse(marketData);
    } catch (error) {
      throw this.handleError(error as Error, 'getMarketData', { symbols });
    }
  }

  protected async doGetHistoricalData(
    symbol: string,
    period: HistoricalDataPeriod,
    options?: any
  ): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.makeRequest('/market/data/historical', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          period: this.convertHistoricalPeriod(period),
          count: options?.count || 100,
          adjust: options?.adjust || 'price'
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch historical data');
      }

      return this.createSuccessResponse(response.data);
    } catch (error) {
      throw this.handleError(error as Error, 'getHistoricalData', { symbol, period, options });
    }
  }

  protected async doGetOrderBook(symbol: string, depth?: number): Promise<ApiResponse<OrderBook>> {
    try {
      const response = await this.makeRequest('/market/data/orderbook', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol,
          depth: depth || 10
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch order book');
      }

      const orderBook: OrderBook = {
        symbol,
        bids: response.data.bids,
        asks: response.data.asks,
        timestamp: Date.now(),
        spread: response.data.asks[0]?.price - response.data.bids[0]?.price || 0
      };

      return this.createSuccessResponse(orderBook);
    } catch (error) {
      throw this.handleError(error as Error, 'getOrderBook', { symbol, depth });
    }
  }

  protected async doSubscribeToRealTimeData(
    symbols: string[],
    callback: RealTimeCallback
  ): Promise<Subscription> {
    try {
      if (!this.webSocketProvider) {
        await this.initializeWebSocketProvider();
      }

      const subscription = await this.webSocketProvider.subscribeToMarketData(symbols, callback);
      this.addRealTimeSubscription(subscription);

      return subscription;
    } catch (error) {
      throw this.handleError(error as Error, 'subscribeToRealTimeData', { symbols });
    }
  }

  protected async doGetSymbols(symbols?: string[]): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.makeRequest('/market/symbols', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch symbols');
      }

      return this.createSuccessResponse(response.data);
    } catch (error) {
      throw this.handleError(error as Error, 'getSymbols', { symbols });
    }
  }

  // ==========================================================================
  // TRADING APIS
  // ==========================================================================

  protected async doPlaceOrder(order: OrderRequest): Promise<ApiResponse<Order>> {
    try {
      // 한국 증권 규제 준수 검증
      await this.complianceEngine.validateOrder(order);

      const response = await this.makeRequest('/trading/orders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          account_number: order.accountId,
          symbol: order.symbol,
          order_type: order.orderType,
          order_side: order.side,
          quantity: order.quantity,
          price: order.price,
          stop_price: order.stopPrice,
          time_in_force: order.timeInForce || 'DAY',
          condition: order.condition
        })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to place order');
      }

      const kiwoomOrder = response.data as KiwoomOrder;
      const placedOrder: Order = {
        id: kiwoomOrder.orderNumber,
        accountId: kiwoomOrder.accountNumber,
        symbol: kiwoomOrder.symbol,
        name: kiwoomOrder.name,
        type: this.convertKiwoomOrderType(kiwoomOrder.orderType),
        side: this.convertKiwoomOrderSide(kiwoomOrder.orderSide),
        quantity: kiwoomOrder.quantity,
        price: kiwoomOrder.price,
        stopPrice: order.stopPrice,
        timeInForce: order.timeInForce || TimeInForce.DAY,
        status: this.convertKiwoomOrderStatus(kiwoomOrder.orderStatus),
        filledQuantity: kiwoomOrder.executedQuantity,
        averagePrice: kiwoomOrder.executedPrice,
        remainingQuantity: kiwoomOrder.remainingQuantity,
        createdAt: new Date(kiwoomOrder.orderTime),
        updatedAt: new Date(kiwoomOrder.orderTime),
        fees: 0,
        commissions: 0,
        exchange: this.detectMarketType(kiwoomOrder.symbol),
        extended: {
          originalOrderNumber: kiwoomOrder.originalOrderNumber
        }
      };

      return this.createSuccessResponse(placedOrder);
    } catch (error) {
      throw this.handleError(error as Error, 'placeOrder', { order });
    }
  }

  protected async doModifyOrder(orderId: string, modifications: OrderModification): Promise<ApiResponse<Order>> {
    try {
      const response = await this.makeRequest(`/trading/orders/${orderId}/modify`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(modifications)
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to modify order');
      }

      return this.createSuccessResponse(response.data as Order);
    } catch (error) {
      throw this.handleError(error as Error, 'modifyOrder', { orderId, modifications });
    }
  }

  protected async doCancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    try {
      const response = await this.makeRequest(`/trading/orders/${orderId}/cancel`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to cancel order');
      }

      return this.createSuccessResponse({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
      throw this.handleError(error as Error, 'cancelOrder', { orderId });
    }
  }

  protected async doGetOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const response = await this.makeRequest(`/trading/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch order');
      }

      return this.createSuccessResponse(response.data as Order);
    } catch (error) {
      throw this.handleError(error as Error, 'getOrder', { orderId });
    }
  }

  protected async doGetOrders(filters?: OrderFilters, options?: PaginationOptions): Promise<ApiResponse<Order[]>> {
    try {
      const response = await this.makeRequest('/trading/orders', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: {
          ...filters,
          ...options
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch orders');
      }

      return this.createSuccessResponse(response.data as Order[]);
    } catch (error) {
      throw this.handleError(error as Error, 'getOrders', { filters, options });
    }
  }

  protected async doSubscribeToOrderUpdates(callback: OrderCallback): Promise<Subscription> {
    try {
      if (!this.webSocketProvider) {
        await this.initializeWebSocketProvider();
      }

      const subscription = await this.webSocketProvider.subscribeToOrderUpdates(callback);
      this.addRealTimeSubscription(subscription);

      return subscription;
    } catch (error) {
      throw this.handleError(error as Error, 'subscribeToOrderUpdates', {});
    }
  }

  // ==========================================================================
  // ACCOUNT APIS
  // ==========================================================================

  protected async doGetAccountInfo(): Promise<ApiResponse<AccountInfo>> {
    try {
      const response = await this.makeRequest('/account/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch account info');
      }

      const kiwoomAccount = response.data as KiwoomAccountInfo;
      const accountInfo: AccountInfo = {
        id: kiwoomAccount.accountNumber,
        name: kiwoomAccount.accountName,
        type: kiwoomAccount.accountType,
        status: 'active',
        currency: 'KRW',
        balance: {
          cash: kiwoomAccount.deposit,
          available: kiwoomAccount.withdrawable,
          total: kiwoomAccount.deposit,
          currency: 'KRW'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        extended: {
          totalPurchasePrice: kiwoomAccount.totalPurchasePrice,
          totalEvaluationPrice: kiwoomAccount.totalEvaluationPrice,
          totalEvaluationProfitLoss: kiwoomAccount.totalEvaluationProfitLoss,
          totalEvaluationProfitLossRate: kiwoomAccount.totalEvaluationProfitLossRate
        }
      };

      return this.createSuccessResponse(accountInfo);
    } catch (error) {
      throw this.handleError(error as Error, 'getAccountInfo', {});
    }
  }

  protected async doGetBalance(): Promise<ApiResponse<Balance>> {
    try {
      const response = await this.makeRequest('/account/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch balance');
      }

      const kiwoomBalance = response.data as KiwoomBalance;
      const balance: Balance = {
        cash: kiwoomBalance.cash,
        available: kiwoomBalance.withdrawableAmount,
        total: kiwoomBalance.totalDeposit,
        currency: 'KRW',
        margin: kiwoomBalance.margin,
        credit: kiwoomBalance.credit,
        extended: {
          totalPurchasePrice: kiwoomBalance.totalPurchasePrice,
          totalEvaluationPrice: kiwoomBalance.totalEvaluationPrice,
          totalProfitLoss: kiwoomBalance.totalProfitLoss,
          totalProfitLossRate: kiwoomBalance.totalProfitLossRate
        }
      };

      return this.createSuccessResponse(balance);
    } catch (error) {
      throw this.handleError(error as Error, 'getBalance', {});
    }
  }

  protected async doGetPositions(symbols?: string[]): Promise<ApiResponse<Position[]>> {
    try {
      const response = await this.makeRequest('/account/positions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ symbols })
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch positions');
      }

      const positions: Position[] = response.data.map((item: KiwoomPosition) => ({
        symbol: item.symbol,
        name: item.name,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        currentPrice: item.currentPrice,
        marketValue: item.evaluationPrice,
        unrealizedPnL: item.profitLoss,
        unrealizedPnLPercent: item.profitLossRate * 100,
        side: 'long',
        currency: 'KRW',
        extended: {
          holdingDays: item.holdingDays,
          quantityRemaining: item.quantityRemaining
        }
      }));

      return this.createSuccessResponse(positions);
    } catch (error) {
      throw this.handleError(error as Error, 'getPositions', { symbols });
    }
  }

  protected async doGetPortfolio(): Promise<ApiResponse<Portfolio>> {
    try {
      const response = await this.makeRequest('/account/portfolio', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch portfolio');
      }

      return this.createSuccessResponse(response.data as Portfolio);
    } catch (error) {
      throw this.handleError(error as Error, 'getPortfolio', {});
    }
  }

  protected async doGetTransactions(filters?: TransactionFilters, options?: PaginationOptions): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.makeRequest('/account/transactions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: {
          ...filters,
          ...options
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch transactions');
      }

      return this.createSuccessResponse(response.data);
    } catch (error) {
      throw this.handleError(error as Error, 'getTransactions', { filters, options });
    }
  }

  // ==========================================================================
  // RESEARCH APIS
  // ==========================================================================

  protected async doGetCompanyInfo(symbol: string): Promise<ApiResponse<CompanyInfo>> {
    try {
      const response = await this.makeRequest(`/research/company/${symbol}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch company info');
      }

      return this.createSuccessResponse(response.data as CompanyInfo);
    } catch (error) {
      throw this.handleError(error as Error, 'getCompanyInfo', { symbol });
    }
  }

  protected async doGetFinancials(
    symbol: string,
    period: FinancialPeriod,
    options?: any
  ): Promise<ApiResponse<FinancialData[]>> {
    try {
      const response = await this.makeRequest(`/research/company/${symbol}/financials`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: {
          period,
          ...options
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch financials');
      }

      return this.createSuccessResponse(response.data as FinancialData[]);
    } catch (error) {
      throw this.handleError(error as Error, 'getFinancials', { symbol, period, options });
    }
  }

  protected async doGetDisclosures(
    symbol: string,
    filters?: any,
    options?: PaginationOptions
  ): Promise<ApiResponse<Disclosure[]>> {
    try {
      const response = await this.makeRequest(`/research/company/${symbol}/disclosures`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: {
          ...filters,
          ...options
        }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch disclosures');
      }

      return this.createSuccessResponse(response.data as Disclosure[]);
    } catch (error) {
      throw this.handleError(error as Error, 'getDisclosures', { symbol, filters, options });
    }
  }

  protected async doGetResearch(symbol: string, type: ResearchType, options?: any): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.makeRequest(`/research/company/${symbol}/${type}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: options
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch research data');
      }

      return this.createSuccessResponse(response.data);
    } catch (error) {
      throw this.handleError(error as Error, 'getResearch', { symbol, type, options });
    }
  }

  // ==========================================================================
  // UTILITY APIS
  // ==========================================================================

  protected async doGetMarketInfo(market?: MarketType): Promise<ApiResponse<MarketInfo>> {
    try {
      const response = await this.makeRequest('/market/info', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: { market }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch market info');
      }

      return this.createSuccessResponse(response.data as MarketInfo);
    } catch (error) {
      throw this.handleError(error as Error, 'getMarketInfo', { market });
    }
  }

  protected async doGetMarketStatus(market?: MarketType): Promise<ApiResponse<string>> {
    try {
      const response = await this.makeRequest('/market/status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: { market }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch market status');
      }

      return this.createSuccessResponse(response.data.status);
    } catch (error) {
      throw this.handleError(error as Error, 'getMarketStatus', { market });
    }
  }

  protected async doGetMarketHolidays(year: number, month?: number): Promise<ApiResponse<Holiday[]>> {
    try {
      const response = await this.makeRequest('/market/holidays', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiToken}`
        },
        params: { year, month }
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch market holidays');
      }

      return this.createSuccessResponse(response.data as Holiday[]);
    } catch (error) {
      throw this.handleError(error as Error, 'getMarketHolidays', { year, month });
    }
  }

  // ==========================================================================
  // REAL-TIME DATA MANAGEMENT
  // ==========================================================================

  protected async initializeWebSocketProvider(): Promise<void> {
    if (!this.config?.apiEndpoints?.websocket) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'WebSocket endpoint not configured',
        'kiwoom'
      );
    }

    this.webSocketProvider = new KiwoomWebSocketProvider({
      url: this.config.apiEndpoints.websocket,
      token: this.apiToken!,
      providerId: this.id
    });

    await this.webSocketProvider.connect();
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  private async makeRequest(path: string, options: any): Promise<any> {
    const url = this.buildUrl(path, options.params);

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        ...options.headers
      }
    };

    if (options.body) {
      fetchOptions.body = options.body;
    }

    const startTime = Date.now();

    try {
      const response = await fetch(url, fetchOptions);
      const data = await response.json();
      const endTime = Date.now();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}`);
      }

      return {
        ...data,
        latency: endTime - startTime
      };
    } catch (error) {
      const endTime = Date.now();
      throw error;
    }
  }

  private detectMarketType(symbol: string): MarketType {
    if (symbol.startsWith('00')) return MarketType.KOSPI;
    if (symbol.startsWith('05') || symbol.startsWith('06')) return MarketType.KOSDAQ;
    if (symbol.startsWith('09')) return MarketType.KONEX;
    if (symbol.startsWith('1') || symbol.startsWith('2')) return MarketType.ETF;
    if (symbol.startsWith('Q')) return MarketType.ETN;
    return MarketType.KOSPI; // default
  }

  private convertHistoricalPeriod(period: HistoricalDataPeriod): string {
    const periodMap: Record<HistoricalDataPeriod, string> = {
      '1d': 'day',
      '1w': 'week',
      '1m': 'month',
      '3m': '3month',
      '6m': '6month',
      '1y': 'year',
      '3y': '3year',
      '5y': '5year',
      'all': 'all'
    };
    return periodMap[period] || 'day';
  }

  private convertKiwoomOrderType(kiwoomType: string): OrderType {
    const typeMap: Record<string, OrderType> = {
      '시장가': OrderType.MARKET,
      '지정가': OrderType.LIMIT,
      '조건부지정가': OrderType.LIMIT,
      '최유리지정가': OrderType.LIMIT,
      '최우선지정가': OrderType.LIMIT,
      '시간외단일가': OrderType.LIMIT,
      '시간외종가': OrderType.LIMIT
    };
    return typeMap[kiwoomType] || OrderType.MARKET;
  }

  private convertKiwoomOrderSide(kiwoomSide: string): OrderSide {
    const sideMap: Record<string, OrderSide> = {
      '매수': OrderSide.BUY,
      '매도': OrderSide.SELL
    };
    return sideMap[kiwoomSide] || OrderSide.BUY;
  }

  private convertKiwoomOrderStatus(kiwoomStatus: string): OrderStatus {
    const statusMap: Record<string, OrderStatus> = {
      '접수': OrderStatus.PENDING,
      '확인': OrderStatus.CONFIRMED,
      '체결': OrderStatus.FILLED,
      '부분체결': OrderStatus.PARTIALLY_FILLED,
      '취소': OrderStatus.CANCELLED,
      '취소접수': OrderStatus.PENDING_CANCEL,
      '정정': OrderStatus.MODIFIED,
      '정정접수': OrderStatus.PENDING_MODIFY,
      '거부': OrderStatus.REJECTED,
      '오류': OrderStatus.FAILED
    };
    return statusMap[kiwoomStatus] || OrderStatus.PENDING;
  }
}