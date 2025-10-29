/**
 * Korea Investment & Securities Provider Implementation
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 한국투자증권(키움) API Provider 완전 구현
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
import { KoreaInvestmentWebSocketProvider } from '@/real-time/KoreaInvestmentWebSocketProvider';
import { KoreanMarketEngine } from '@/engines/KoreanMarketEngine';
import { KoreanComplianceEngine } from '@/engines/KoreanComplianceEngine';

// 한국투자증권 API 관련 타입 정의
interface KoreaInvestmentAuthData {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface KoreaInvestmentAccountInfo {
  accountNumber: string;
  accountName: string;
  accountType: string;
  accountProductCode: string;
  accountStatus: string;
  accountCurrency: string;
  accountCreatedAt: string;
  accountUpdatedAt: string;
}

interface KoreaInvestmentBalance {
  accountNumber: string;
  currency: string;
  cashBalance: number;
  d2CashBalance: number;
  dpsCashBalance: number;
  cashDepositAmount: number;
  cashWithdrawAmount: number;
  purchaseAmount: number;
  salesAmount: number;
  totalEvaluationAmount: number;
  totalProfitLoss: number;
  totalProfitLossRate: number;
  assetEvaluationAmount: number;
  cashEvaluationAmount: number;
  bondEvaluationAmount: number;
  depositAmount: number;
  prepaidAmount: number;
  prepaidExpensesAmount: number;
  etcAmount: number;
  d2AssetEvaluationAmount: number;
  dpsAssetEvaluationAmount: number;
}

interface KoreaInvestmentPosition {
  accountNumber: string;
  symbol: string;
  symbolName: string;
  quantity: number;
  currentPrice: number;
  evaluationAmount: number;
  purchasePrice: number;
  purchaseAmount: number;
  profitLoss: number;
  profitLossRate: number;
  yesterdayClosePrice: number;
  yesterdayCloseAmount: number;
  yesterdayProfitLoss: number;
  yesterdayProfitLossRate: number;
  foreignHoldingRatio: number;
  securitiesType: string;
  securitiesTypeCode: string;
  marketType: string;
  marketCode: string;
}

interface KoreaInvestmentOrder {
  accountNumber: string;
  orderId: string;
  originalOrderId: string;
  orderNumber: string;
  orderDateTime: string;
  orderType: string;
  orderSide: string;
  symbol: string;
  symbolName: string;
  orderQuantity: number;
  orderPrice: number;
  orderCondition: string;
  orderTimeInForce: string;
  orderStatus: string;
  orderAmount: number;
  executedQuantity: number;
  executedPrice: number;
  executedAmount: number;
  remainingQuantity: number;
  cancelQuantity: number;
  failQuantity: number;
  successQuantity: number;
  processingQuantity: number;
  orderFee: number;
  orderTax: number;
  commissionRate: number;
  taxRate: number;
}

interface KoreaInvestmentMarketData {
  symbol: string;
  symbolName: string;
  marketType: string;
  currentPrice: number;
  changePrice: number;
  changeRate: number;
  changeAmount: number;
  tradeVolume: number;
  tradeAmount: number;
  tradeDate: string;
  tradeTime: string;
  openingPrice: number;
  highestPrice: number;
  lowestPrice: number;
  previousClosePrice: number;
  previousTradeVolume: number;
  previousTradeAmount: number;
  marketCap: number;
  listedShares: number;
  foreignHoldingLimit: number;
  foreignHoldingRatio: number;
  upperLimitPrice: number;
  lowerLimitPrice: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
  bidAskPriceRatio: number;
  marketStatus: string;
  trustPrice: number;
  faceValue: number;
  parValue: number;
  securitiesType: string;
  securitiesTypeCode: string;
}

/**
 * 한국투자증권 Provider 구현체
 */
export class KoreaInvestmentProvider extends KSETProvider {
  readonly id = 'korea-investment';
  readonly name = 'Korea Investment & Securities';
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
      'disclosures',
      'international-markets'
    ],
    marketData: {
      realTimeQuotes: true,
      historicalData: true,
      orderBook: true,
      technicalIndicators: true,
      marketDepth: true,
      updateFrequency: 50 // ms
    },
    trading: {
      orderTypes: [
        OrderType.MARKET,
        OrderType.LIMIT,
        OrderType.STOP,
        OrderType.STOP_LIMIT,
        OrderType.ICEBERG,
        OrderType.TWAP,
        OrderType.VWAP,
        OrderType.POV
      ],
      supportedMarkets: [
        MarketType.KOSPI,
        MarketType.KOSDAQ,
        MarketType.KONEX,
        MarketType.ETF,
        MarketType.ETN,
        MarketType.ELW,
        MarketType.NASDAQ,
        MarketType.NYSE,
        MarketType.AMEX,
        MarketType.TSE,
        MarketType.SSE,
        MarketType.HKEX
      ],
      orderModification: true,
      orderCancellation: true,
      conditionalOrders: true,
      algorithmicOrders: true,
      afterHoursTrading: true
    },
    account: {
      balanceQuery: true,
      positionQuery: true,
      transactionHistory: true,
      portfolioAnalysis: true,
      taxReporting: true,
      performanceAnalysis: true,
      multiCurrencySupport: true
    },
    research: {
      companyInfo: true,
      financialStatements: true,
      disclosures: true,
      analystRatings: true,
      economicIndicators: true,
      newsAnalysis: true,
      internationalMarkets: true
    },
    authentication: {
      methods: ['oauth2', 'api-key'],
      twoFactorAuth: true,
      sessionTimeout: 3600, // 1시간
      refreshToken: true
    },
    limitations: {
      rateLimits: {
        requestsPerSecond: 30,
        requestsPerMinute: 900,
        requestsPerHour: 15000,
        requestsPerDay: 100000
      },
      supportedMarkets: [
        MarketType.KOSPI,
        MarketType.KOSDAQ,
        MarketType.KONEX,
        MarketType.ETF,
        MarketType.ETN,
        MarketType.ELW,
        MarketType.NASDAQ,
        MarketType.NYSE,
        MarketType.AMEX
      ],
      maxOrdersPerSecond: 10,
      maxConnections: 5
    }
  };

  private marketEngine = new KoreanMarketEngine();
  private complianceEngine = new KoreanComplianceEngine();
  private apiToken?: string;
  private refreshToken?: string;
  private appKey?: string;
  private appSecret?: string;

  constructor() {
    super();
  }

  // ==========================================================================
  // LIFECYCLE MANAGEMENT
  // ==========================================================================

  protected async doInitialize(): Promise<void> {
    console.log('🚀 Initializing Korea Investment Provider...');

    if (!this.config) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'Configuration not set',
        'korea-investment'
      );
    }

    // API 엔드포인트 설정 확인
    if (!this.config.apiEndpoints?.rest) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'REST API endpoint is required',
        'korea-investment'
      );
    }

    // WebSocket 엔드포인트 설정 확인
    if (!this.config.apiEndpoints?.websocket) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_CONFIGURATION,
        'WebSocket endpoint is required',
        'korea-investment'
      );
    }

    // App Key, App Secret 설정 확인
    this.appKey = this.config.appKey;
    this.appSecret = this.config.appSecret;

    if (!this.appKey || !this.appSecret) {
      throw KSETErrorFactory.create(
        ERROR_CODES.MISSING_REQUIRED_CONFIG,
        'App Key and App Secret are required',
        'korea-investment'
      );
    }

    console.log('✅ Korea Investment Provider initialized successfully');
  }

  protected async doAuthenticate(credentials: AuthCredentials): Promise<AuthResult> {
    console.log('🔐 Authenticating with Korea Investment & Securities...');

    try {
      // OAuth 2.0 인증
      if (credentials.apiKey && credentials.clientId) {
        return await this.authenticateWithOAuth2(credentials);
      }

      // API Key 기반 인증
      if (credentials.apiKey) {
        return await this.authenticateWithApiKey(credentials.apiKey);
      }

      throw KSETErrorFactory.create(
        ERROR_CODES.AUTH_FAILED,
        'No valid authentication method provided',
        'korea-investment'
      );
    } catch (error) {
      throw KSETErrorFactory.create(
        ERROR_CODES.AUTH_FAILED,
        `Authentication failed: ${(error as Error).message}`,
        'korea-investment'
      );
    }
  }

  private async authenticateWithOAuth2(credentials: AuthCredentials): Promise<AuthResult> {
    const authData = {
      grant_type: 'client_credentials',
      client_id: this.appKey!,
      client_secret: this.appSecret!
    };

    const response = await this.makeOAuth2Request('/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authData)
    });

    if (!response.access_token) {
      throw new Error('OAuth2 authentication failed');
    }

    this.apiToken = response.access_token;
    this.refreshToken = response.refresh_token;

    return {
      success: true,
      token: response.access_token,
      refreshToken: response.refresh_token,
      expiresAt: new Date(Date.now() + response.expires_in * 1000),
      permissions: response.scope?.split(' ') || [],
      userId: credentials.clientId,
      accounts: []
    };
  }

  private async authenticateWithApiKey(apiKey: string): Promise<AuthResult> {
    const response = await this.makeRequest('/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'API-Key': apiKey,
        'App-Key': this.appKey!,
        'App-Secret': this.appSecret!
      }
    });

    if (!response.success) {
      throw new Error(response.error || 'API key authentication failed');
    }

    const data = response.data;
    this.apiToken = data.access_token;
    this.refreshToken = data.refresh_token;

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
    console.log('🔌 Disconnecting from Korea Investment & Securities...');

    try {
      // 실시간 데이터 연결 해제
      await this.disableRealTimeData();

      // 토큰 폐기 요청
      if (this.apiToken) {
        await this.makeRequest('/oauth2/revoke', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiToken}`
          },
          body: JSON.stringify({
            token: this.refreshToken
          })
        });
      }

      this.apiToken = undefined;
      this.refreshToken = undefined;
      this.isAuthenticated = false;
      this.authResult = undefined;

      console.log('✅ Disconnected from Korea Investment & Securities');
    } catch (error) {
      console.error('❌ Error during disconnect:', error);
    }
  }

  protected async doHealthCheck(): Promise<ProviderHealthStatus> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-ccnl', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: '005930'
        }
      });

      return {
        provider: this.id,
        connected: true,
        lastHeartbeat: new Date(),
        apiStatus: 'healthy',
        latency: response.latency || 0,
        errorRate: 0,
        details: {
          serverTime: response.rt_cd === '0' ? new Date().toISOString() : null,
          message: response.msg1,
          code: response.rt_cd
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
      const promises = symbols.map(symbol =>
        this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-price', {
          method: 'GET',
          params: {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_INPUT_ISCD: symbol
          }
        })
      );

      const responses = await Promise.allSettled(promises);
      const marketData: MarketData[] = [];

      responses.forEach((response, index) => {
        if (response.status === 'fulfilled' && response.value.rt_cd === '0') {
          const item = response.value.output as KoreaInvestmentMarketData;
          marketData.push({
            symbol: item.symbol,
            name: item.symbolName,
            lastPrice: item.currentPrice,
            change: item.changePrice,
            changePercent: item.changeRate * 100,
            volume: item.tradeVolume,
            value: item.tradeAmount,
            open: item.openingPrice,
            high: item.highestPrice,
            low: item.lowestPrice,
            bid: item.bidPrice,
            ask: item.askPrice,
            bidSize: item.bidQuantity,
            askSize: item.askQuantity,
            timestamp: Date.now(),
            market: this.detectMarketType(item.marketType),
            extended: {
              marketCap: item.marketCap,
              listedShares: item.listedShares,
              foreignHoldingRatio: item.foreignHoldingRatio,
              marketStatus: item.marketStatus,
              upperLimitPrice: item.upperLimitPrice,
              lowerLimitPrice: item.lowerLimitPrice,
              previousClosePrice: item.previousClosePrice
            }
          });
        } else {
          console.error(`Failed to fetch market data for symbol: ${symbols[index]}`);
        }
      });

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
      const periodCode = this.convertHistoricalPeriod(period);
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-daily-price', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol,
          FID_PERIOD_DIV_CODE: periodCode,
          FID_ORG_ADJ_PRC: options?.adjust ? '1' : '0',
          FID_INPUT_DATE_1: options?.startDate || '',
          FID_INPUT_DATE_2: options?.endDate || ''
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch historical data');
      }

      return this.createSuccessResponse(response.output);
    } catch (error) {
      throw this.handleError(error as Error, 'getHistoricalData', { symbol, period, options });
    }
  }

  protected async doGetOrderBook(symbol: string, depth?: number): Promise<ApiResponse<OrderBook>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-ccnl', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch order book');
      }

      const data = response.output;
      const orderBook: OrderBook = {
        symbol,
        bids: [
          { price: data.ask1, quantity: data.ask1_rsqn },
          { price: data.ask2, quantity: data.ask2_rsqn },
          { price: data.ask3, quantity: data.ask3_rsqn },
          { price: data.ask4, quantity: data.ask4_rsqn },
          { price: data.ask5, quantity: data.ask5_rsqn }
        ],
        asks: [
          { price: data.bid1, quantity: data.bid1_rsqn },
          { price: data.bid2, quantity: data.bid2_rsqn },
          { price: data.bid3, quantity: data.bid3_rsqn },
          { price: data.bid4, quantity: data.bid4_rsqn },
          { price: data.bid5, quantity: data.bid5_rsqn }
        ],
        timestamp: Date.now(),
        spread: data.bid1 - data.ask1
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
      if (symbols && symbols.length > 0) {
        // 특정 종목 정보 조회
        const promises = symbols.map(symbol =>
          this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-stock-info', {
            method: 'GET',
            params: {
              FID_COND_MRKT_DIV_CODE: 'J',
              FID_INPUT_ISCD: symbol
            }
          })
        );

        const responses = await Promise.allSettled(promises);
        const results = responses
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled' && r.value.rt_cd === '0')
          .map(r => r.value.output);

        return this.createSuccessResponse(results);
      } else {
        // 전체 종목 목록 조회
        const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-list', {
          method: 'GET',
          params: {
            FID_COND_MRKT_DIV_CODE: 'J',
            FID_COND_SCR_DIV_CODE: '0'
          }
        });

        if (response.rt_cd !== '0') {
          throw new Error(response.msg1 || 'Failed to fetch symbols');
        }

        return this.createSuccessResponse(response.output);
      }
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

      const orderTypeCode = this.convertOrderType(order.orderType);
      const orderSideCode = this.convertOrderSide(order.side);
      const timeInForceCode = this.convertTimeInForce(order.timeInForce || TimeInForce.DAY);

      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/order-cash', {
        method: 'POST',
        params: {
          CANO: order.accountId,
          ACNT_PRDT_CD: '01',
          PDNO: order.symbol,
          ORD_DVSN: orderSideCode,
          ORD_QTY: order.quantity.toString(),
          ORD_UND_PR: order.price?.toString() || '0',
          DVSN_TRD_DCD: orderTypeCode,
          LMT_PRC_UNIT_CD: '01',
          CTAC_TLNO: order.phone || '',
          ACNO_YOYO_TYPE: '00',
          SLL_BUY_DVSN_CD: '00',
          ORD_SVR_DVSN_CD: '00',
          CTAC_TLNO_GRAD_CD: '00',
          ORD_GNO_BRNC_CD: '0',
          DVSN_ABRD_CD: '0',
          ORD_AHRD_INF_DVSN_CD: '00',
          INQR_DVSN_DCD: '00',
          KRX_NATN_CD: 'KR',
          TRD_RCNCL_CD: '00',
          CTTR_ACPT_DIV_DCD: '0',
          AMT_ICDC_YN: 'N',
          CTTR_ORD_UNIT_CD: '01',
          KRX_FUTR_ORD_ICDC_YN: 'N',
          CTTR_ORD_UND_PRC: '0',
          KRX_HGIC_YN: 'N',
          ORD_DVSN_DCD: '00',
          TRAD_DVSN_CD: '00',
          INQR_DVSN_CD: '01',
          KRX_NATN_REXP_YN: 'N',
          SHTN_PDNO: '0',
          RMNG_PRC_ORD_YN: 'N',
          ORD_PRC_DCD: '00',
          KRX_SHTN_ORD_YN: 'N',
          CTTR_ACPT_CAU_CD: '0',
          ORD_TMD_DCD: '00',
          ORD_PHST_CD: '0',
          CTTR_ORD_TLNO: '0',
          ORD_PHST_INST_CD: '0',
          ORD_CTGRY_CD: '00',
          KRX_TRK_ML_NO: '0',
          CCLG_DVSN_CD: '00',
          ORD_WTTH_RCNCL_CD: '00',
          ORD_WTTH_RSN_CD: '00',
          KRX_ORD_ML_NO: '0',
          KRX_COOPT_ORD_YN: 'N',
          KRX_COOPT_ORD_ML_NO: '0',
          KRX_RGT_CTGR_CD: '00',
          KRX_COPRT_ORG_CD: '00',
          CTTR_TLNO_CST_CD: '00',
          CTTR_TLNO_RRN: '0',
          CTTR_TLNO_NATN_CD: '0',
          CTTR_TLNO_AREA_CD: '0',
          ORD_ML_NO: '0',
          KRX_INQR_DVSN_CD: '00',
          ORD_DVSN_CAU_CD: '0',
          CTTR_TLNO_CST_ACNO: '0',
          KRX_RLS_RCNCL_CD: '00',
          KRX_MKT_ID_CD: '00',
          KRX_SRT_CD: '00',
          KRX_SRS_CD: '00',
          KRX_SRS_VAL: '0',
          KRX_SRS_RSN_CD: '00',
          KRX_SRS_APRV_CD: '00',
          KRX_SRS_APRV_NO: '0',
          KRX_SRS_RSN_VAL: '0',
          KRX_SRS_RSN_VAL2: '0',
          KRX_SRS_RSN_VAL3: '0',
          KRX_SRS_RSN_VAL4: '0',
          KRX_SRS_RSN_VAL5: '0',
          KRX_SRS_RSN_VAL6: '0',
          KRX_SRS_RSN_VAL7: '0',
          KRX_SRS_RSN_VAL8: '0',
          KRX_SRS_RSN_VAL9: '0',
          KRX_SRS_RSN_VAL10: '0',
          KRX_SRS_RSN_VAL11: '0',
          KRX_SRS_RSN_VAL12: '0',
          KRX_SRS_RSN_VAL13: '0',
          KRX_SRS_RSN_VAL14: '0',
          KRX_SRS_RSN_VAL15: '0',
          KRX_SRS_RSN_VAL16: '0',
          KRX_SRS_RSN_VAL17: '0',
          KRX_SRS_RSN_VAL18: '0',
          KRX_SRS_RSN_VAL19: '0',
          KRX_SRS_RSN_VAL20: '0'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to place order');
      }

      const kiwoomOrder = response.output;
      const placedOrder: Order = {
        id: kiwoomOrder.ODNO,
        accountId: order.accountId,
        symbol: order.symbol,
        name: '', // API로부터 종목명 가져와야 함
        type: order.orderType,
        side: order.side,
        quantity: order.quantity,
        price: order.price,
        stopPrice: order.stopPrice,
        timeInForce: order.timeInForce || TimeInForce.DAY,
        status: OrderStatus.PENDING,
        filledQuantity: 0,
        averagePrice: 0,
        remainingQuantity: order.quantity,
        createdAt: new Date(),
        updatedAt: new Date(),
        fees: kiwoomOrder.ORD_FEE || 0,
        commissions: kiwoomOrder.ORD_COMM || 0,
        exchange: this.detectMarketType(order.symbol),
        extended: {
          orderNumber: kiwoomOrder.ODNO,
          orderDateTime: kiwoomOrder.ORD_TMD,
          orderPrice: kiwoomOrder.ORD_UND_PR,
          orderQuantity: kiwoomOrder.ORD_QTY
        }
      };

      return this.createSuccessResponse(placedOrder);
    } catch (error) {
      throw this.handleError(error as Error, 'placeOrder', { order });
    }
  }

  protected async doModifyOrder(orderId: string, modifications: OrderModification): Promise<ApiResponse<Order>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/modify-order', {
        method: 'PUT',
        params: {
          ODNO: orderId,
          ORD_QTY: modifications.quantity?.toString(),
          ORD_UND_PR: modifications.price?.toString()
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to modify order');
      }

      return this.createSuccessResponse(response.output as Order);
    } catch (error) {
      throw this.handleError(error as Error, 'modifyOrder', { orderId, modifications });
    }
  }

  protected async doCancelOrder(orderId: string): Promise<ApiResponse<{ success: boolean; message?: string }>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/cancel-order', {
        method: 'DELETE',
        params: {
          ODNO: orderId
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to cancel order');
      }

      return this.createSuccessResponse({ success: true, message: 'Order cancelled successfully' });
    } catch (error) {
      throw this.handleError(error as Error, 'cancelOrder', { orderId });
    }
  }

  protected async doGetOrder(orderId: string): Promise<ApiResponse<Order>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/inquire-order', {
        method: 'GET',
        params: {
          ODNO: orderId
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch order');
      }

      return this.createSuccessResponse(response.output as Order);
    } catch (error) {
      throw this.handleError(error as Error, 'getOrder', { orderId });
    }
  }

  protected async doGetOrders(filters?: OrderFilters, options?: PaginationOptions): Promise<ApiResponse<Order[]>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/inquire-psbl-rvsecncl', {
        method: 'GET',
        params: {
          ...filters,
          ...options
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch orders');
      }

      return this.createSuccessResponse(response.output as Order[]);
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
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/inquire-psbl-rvsecncl', {
        method: 'GET',
        params: {
          CANO: this.config?.accountId || '',
          ACNT_PRDT_CD: '01',
          INQR_DVSN: '01',
          INQR_DVSN_1: '0000',
          INQR_DVSN_2: '00000',
          INQR_DVSN_3: '000'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch account info');
      }

      const accountData = response.output;
      const accountInfo: AccountInfo = {
        id: accountData.CANO,
        name: 'Trading Account', // API로부터 실제 계좌명 가져와야 함
        type: 'TRADING',
        status: 'active',
        currency: 'KRW',
        balance: {
          cash: accountData.buy_psbl_cash,
          available: accountData.buy_psbl_cash,
          total: accountData.buy_psbl_cash,
          currency: 'KRW'
        },
        createdAt: new Date(),
        updatedAt: new Date(),
        extended: {
          accountProductCode: accountData.ACNT_PRDT_CD,
          accountStatus: accountData.ACCOUNT_STATUS
        }
      };

      return this.createSuccessResponse(accountInfo);
    } catch (error) {
      throw this.handleError(error as Error, 'getAccountInfo', {});
    }
  }

  protected async doGetBalance(): Promise<ApiResponse<Balance>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/inquire-balance', {
        method: 'GET',
        params: {
          CANO: this.config?.accountId || '',
          ACNT_PRDT_CD: '01',
          AFHR_FLPR_YN: 'N',
          UNPR_DVSN: '01',
          FUND_STTL_ICLD_YN: 'N',
          INQR_DVSN: '01'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch balance');
      }

      const balanceData = response.output[0] as KoreaInvestmentBalance;
      const balance: Balance = {
        cash: balanceData.cashBalance,
        available: balanceData.cashBalance,
        total: balanceData.totalEvaluationAmount,
        currency: balanceData.currency,
        margin: 0, // 한국투자증권 API에서 제공하는지 확인 필요
        credit: 0, // 한국투자증권 API에서 제공하는지 확인 필요
        extended: {
          d2CashBalance: balanceData.d2CashBalance,
          dpsCashBalance: balanceData.dpsCashBalance,
          cashDepositAmount: balanceData.cashDepositAmount,
          cashWithdrawAmount: balanceData.cashWithdrawAmount,
          purchaseAmount: balanceData.purchaseAmount,
          salesAmount: balanceData.salesAmount,
          totalProfitLoss: balanceData.totalProfitLoss,
          totalProfitLossRate: balanceData.totalProfitLossRate,
          assetEvaluationAmount: balanceData.assetEvaluationAmount,
          cashEvaluationAmount: balanceData.cashEvaluationAmount,
          bondEvaluationAmount: balanceData.bondEvaluationAmount,
          depositAmount: balanceData.depositAmount,
          prepaidAmount: balanceData.prepaidAmount,
          prepaidExpensesAmount: balanceData.prepaidExpensesAmount,
          etcAmount: balanceData.etcAmount,
          d2AssetEvaluationAmount: balanceData.d2AssetEvaluationAmount,
          dpsAssetEvaluationAmount: balanceData.dpsAssetEvaluationAmount
        }
      };

      return this.createSuccessResponse(balance);
    } catch (error) {
      throw this.handleError(error as Error, 'getBalance', {});
    }
  }

  protected async doGetPositions(symbols?: string[]): Promise<ApiResponse<Position[]>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/inquire-balance', {
        method: 'GET',
        params: {
          CANO: this.config?.accountId || '',
          ACNT_PRDT_CD: '01',
          AFHR_FLPR_YN: 'N',
          UNPR_DVSN: '01',
          FUND_STTL_ICLD_YN: 'N',
          INQR_DVSN: '02'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch positions');
      }

      const positions: Position[] = response.output.map((item: KoreaInvestmentPosition) => ({
        symbol: item.symbol,
        name: item.symbolName,
        quantity: item.quantity,
        purchasePrice: item.purchasePrice,
        currentPrice: item.currentPrice,
        marketValue: item.evaluationAmount,
        unrealizedPnL: item.profitLoss,
        unrealizedPnLPercent: item.profitLossRate * 100,
        side: 'long',
        currency: 'KRW',
        extended: {
          yesterdayClosePrice: item.yesterdayClosePrice,
          yesterdayCloseAmount: item.yesterdayCloseAmount,
          yesterdayProfitLoss: item.yesterdayProfitLoss,
          yesterdayProfitLossRate: item.yesterdayProfitLossRate,
          foreignHoldingRatio: item.foreignHoldingRatio,
          securitiesType: item.securitiesType,
          securitiesTypeCode: item.securitiesTypeCode,
          marketType: item.marketType,
          marketCode: item.marketCode
        }
      }));

      // 특정 종목 필터링
      if (symbols && symbols.length > 0) {
        const filteredPositions = positions.filter(p => symbols.includes(p.symbol));
        return this.createSuccessResponse(filteredPositions);
      }

      return this.createSuccessResponse(positions);
    } catch (error) {
      throw this.handleError(error as Error, 'getPositions', { symbols });
    }
  }

  protected async doGetPortfolio(): Promise<ApiResponse<Portfolio>> {
    try {
      const balanceResponse = await this.doGetBalance();
      const positionsResponse = await this.doGetPositions();

      const portfolio: Portfolio = {
        totalValue: balanceResponse.data.total,
        totalCost: balanceResponse.data.extended?.purchaseAmount || 0,
        totalPnL: balanceResponse.data.extended?.totalProfitLoss || 0,
        totalPnLPercent: balanceResponse.data.extended?.totalProfitLossRate || 0,
        positions: positionsResponse.data,
        allocation: this.calculatePortfolioAllocation(positionsResponse.data),
        lastUpdated: new Date()
      };

      return this.createSuccessResponse(portfolio);
    } catch (error) {
      throw this.handleError(error as Error, 'getPortfolio', {});
    }
  }

  protected async doGetTransactions(filters?: TransactionFilters, options?: PaginationOptions): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/trading/inquire-daily-ccld', {
        method: 'GET',
        params: {
          CANO: this.config?.accountId || '',
          ACNT_PRDT_CD: '01',
          INQR_DVSN: '01',
          INQR_DVSN_1: '0000',
          INQR_DVSN_2: '00000',
          INQR_DVSN_3: '000',
          STRT_DDT: filters?.startDate || '',
          END_DDT: filters?.endDate || '',
          SLL_BUY_DVSN_CD: filters?.side || '00',
          INQR_DVSN_4: '0000',
          INQR_DVSN_5: '00000',
          PDNO: filters?.symbol || '',
          CCLD_DVSN: '00',
          SORT_GUBUN: '01',
          CTX_AREA_FK100: '',
          CTX_AREA_NK100: ''
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch transactions');
      }

      return this.createSuccessResponse(response.output);
    } catch (error) {
      throw this.handleError(error as Error, 'getTransactions', { filters, options });
    }
  }

  // ==========================================================================
  // RESEARCH APIS
  // ==========================================================================

  protected async doGetCompanyInfo(symbol: string): Promise<ApiResponse<CompanyInfo>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-stock-info', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch company info');
      }

      return this.createSuccessResponse(response.output as CompanyInfo);
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
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-finance', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol,
          FID_PERIOD_DIV_CODE: this.convertFinancialPeriod(period),
          FID_ORG_ADJ_PRC: options?.adjust ? '1' : '0'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch financials');
      }

      return this.createSuccessResponse(response.output as FinancialData[]);
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
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-daily-price', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol,
          FID_PERIOD_DIV_CODE: 'D',
          FID_ORG_ADJ_PRC: '0',
          ...filters,
          ...options
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch disclosures');
      }

      return this.createSuccessResponse(response.output as Disclosure[]);
    } catch (error) {
      throw this.handleError(error as Error, 'getDisclosures', { symbol, filters, options });
    }
  }

  protected async doGetResearch(symbol: string, type: ResearchType, options?: any): Promise<ApiResponse<any[]>> {
    try {
      const endpointMap: Record<ResearchType, string> = {
        'analyst-ratings': '/uapi/domestic-stock/v1/quotations/inquire-search-financial',
        'news': '/uapi/domestic-stock/v1/quotations/inquire-news-item',
        'technical-analysis': '/uapi/domestic-stock/v1/quotations/inquire-search-chart',
        'sector-analysis': '/uapi/domestic-stock/v1/quotations/inquire-search-sector',
        'market-sentiment': '/uapi/domestic-stock/v1/quotations/inquire-search-valuation'
      };

      const endpoint = endpointMap[type];
      if (!endpoint) {
        throw KSETErrorFactory.create(
          ERROR_CODES.NOT_SUPPORTED,
          `Research type ${type} not supported`,
          'korea-investment'
        );
      }

      const response = await this.makeRequest(endpoint, {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: 'J',
          FID_INPUT_ISCD: symbol,
          ...options
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || `Failed to fetch ${type}`);
      }

      return this.createSuccessResponse(response.output);
    } catch (error) {
      throw this.handleError(error as Error, 'getResearch', { symbol, type, options });
    }
  }

  // ==========================================================================
  // UTILITY APIS
  // ==========================================================================

  protected async doGetMarketInfo(market?: MarketType): Promise<ApiResponse<MarketInfo>> {
    try {
      const marketCode = this.convertMarketType(market);
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-search-stock-info', {
        method: 'GET',
        params: {
          FID_COND_MRKT_DIV_CODE: marketCode || 'J',
          FID_ETC_CLS_CODE: '00'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch market info');
      }

      return this.createSuccessResponse(response.output as MarketInfo);
    } catch (error) {
      throw this.handleError(error as Error, 'getMarketInfo', { market });
    }
  }

  protected async doGetMarketStatus(market?: MarketType): Promise<ApiResponse<string>> {
    try {
      const response = await this.makeRequest('/uapi/domestic-stock/v1/quotations/inquire-ccnl-time', {
        method: 'GET',
        params: {
          FID_ETC_CLS_CODE: '00'
        }
      });

      if (response.rt_cd !== '0') {
        throw new Error(response.msg1 || 'Failed to fetch market status');
      }

      return this.createSuccessResponse(response.output.STR_TMZN);
    } catch (error) {
      throw this.handleError(error as Error, 'getMarketStatus', { market });
    }
  }

  protected async doGetMarketHolidays(year: number, month?: number): Promise<ApiResponse<Holiday[]>> {
    try {
      // 한국투자증권에서 휴장일 API를 제공하는지 확인 필요
      // 임시 구현
      const holidays: Holiday[] = [];
      return this.createSuccessResponse(holidays);
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
        'korea-investment'
      );
    }

    this.webSocketProvider = new KoreaInvestmentWebSocketProvider({
      url: this.config.apiEndpoints.websocket,
      token: this.apiToken!,
      appKey: this.appKey!,
      appSecret: this.appSecret!,
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
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiToken}`,
        'appKey': this.appKey,
        'appSecret': this.appSecret,
        'tr_id': options.tr_id || this.getDefaultTrId(options.method, path),
        'custtype': 'P',
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

      return {
        ...data,
        latency: endTime - startTime
      };
    } catch (error) {
      const endTime = Date.now();
      throw error;
    }
  }

  private async makeOAuth2Request(path: string, options: any): Promise<any> {
    const url = this.buildUrl(path);

    const fetchOptions: RequestInit = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    if (options.body) {
      fetchOptions.body = options.body;
    }

    const response = await fetch(url, fetchOptions);
    return await response.json();
  }

  private getDefaultTrId(method: string, path: string): string {
    const pathMap: Record<string, string> = {
      '/uapi/domestic-stock/v1/quotations/inquire-price': 'FHKST01010100',
      '/uapi/domestic-stock/v1/quotations/inquire-ccnl': 'FHKST01010200',
      '/uapi/domestic-stock/v1/quotations/inquire-daily-price': 'FHKST01010400',
      '/uapi/domestic-stock/v1/quotations/inquire-stock-info': 'FHKST01010300',
      '/uapi/domestic-stock/v1/trading/order-cash': 'TTTC0802U',
      '/uapi/domestic-stock/v1/trading/inquire-balance': 'TTTC8434R',
      '/uapi/domestic-stock/v1/trading/inquire-psbl-rvsecncl': 'TTTC0903R'
    };

    return pathMap[path] || 'TC0001';
  }

  private detectMarketType(symbol: string): MarketType {
    if (symbol.startsWith('00') || symbol.startsWith('01') || symbol.startsWith('02')) return MarketType.KOSPI;
    if (symbol.startsWith('03') || symbol.startsWith('04') || symbol.startsWith('05') || symbol.startsWith('06')) return MarketType.KOSDAQ;
    if (symbol.startsWith('09')) return MarketType.KONEX;
    if (symbol.startsWith('1') || symbol.startsWith('2')) return MarketType.ETF;
    if (symbol.startsWith('Q')) return MarketType.ETN;
    return MarketType.KOSPI; // default
  }

  private convertHistoricalPeriod(period: HistoricalDataPeriod): string {
    const periodMap: Record<HistoricalDataPeriod, string> = {
      '1d': 'D',
      '1w': 'W',
      '1m': 'M',
      '3m': 'M',
      '6m': 'M',
      '1y': 'M',
      '3y': 'M',
      '5y': 'M',
      'all': 'M'
    };
    return periodMap[period] || 'D';
  }

  private convertFinancialPeriod(period: FinancialPeriod): string {
    const periodMap: Record<FinancialPeriod, string> = {
      'quarterly': 'Q',
      'annual': 'Y',
      'ttm': 'Q'
    };
    return periodMap[period] || 'Q';
  }

  private convertOrderType(orderType: OrderType): string {
    const typeMap: Record<OrderType, string> = {
      [OrderType.MARKET]: '01',
      [OrderType.LIMIT]: '00',
      [OrderType.STOP]: '02',
      [OrderType.STOP_LIMIT]: '03',
      [OrderType.ICEBERG]: '04',
      [OrderType.TWAP]: '05',
      [OrderType.VWAP]: '06',
      [OrderType.POV]: '07'
    };
    return typeMap[orderType] || '00';
  }

  private convertOrderSide(orderSide: OrderSide): string {
    const sideMap: Record<OrderSide, string> = {
      [OrderSide.BUY]: '02',
      [OrderSide.SELL]: '01'
    };
    return sideMap[orderSide] || '02';
  }

  private convertTimeInForce(timeInForce: TimeInForce): string {
    const tifMap: Record<TimeInForce, string> = {
      [TimeInForce.DAY]: '01',
      [TimeInForce.GTC]: '02',
      [TimeInForce.IOC]: '03',
      [TimeInForce.FOK]: '04'
    };
    return tifMap[timeInForce] || '01';
  }

  private convertMarketType(market?: MarketType): string {
    if (!market) return 'J';
    const marketMap: Record<MarketType, string> = {
      [MarketType.KOSPI]: 'J',
      [MarketType.KOSDAQ]: 'Q',
      [MarketType.KONEX]: 'N',
      [MarketType.ETF]: 'J',
      [MarketType.ETN]: 'J',
      [MarketType.ELW]: 'J'
    };
    return marketMap[market] || 'J';
  }

  private calculatePortfolioAllocation(positions: Position[]): any {
    const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
    const allocation: any = {};

    positions.forEach(position => {
      const percentage = (position.marketValue / totalValue) * 100;
      allocation[position.symbol] = {
        value: position.marketValue,
        percentage: percentage,
        weight: percentage / 100
      };
    });

    return allocation;
  }
}