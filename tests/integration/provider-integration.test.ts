/**
 * Integration tests for provider connections and real API interactions
 */

import { KSET } from '../../src/core/KSET';
import { MockProvider } from '../mocks/MockProvider';
import type { ProviderConfig, OrderRequest, Account, Balance } from '../../src/interfaces';

// These tests can use real providers when configured for integration testing
const USE_REAL_PROVIDERS = process.env.KSET_INTEGRATION_TEST === 'true';
const TEST_CONFIG = {
  kiwoom: {
    credentials: {
      certificate: process.env.KIWOOM_CERT_PATH || './test-cert.p12',
      password: process.env.KIWOOM_CERT_PASSWORD || 'test123'
    },
    environment: process.env.KIWOOM_ENV || 'development',
    timeout: 30000
  },
  'korea-investment': {
    credentials: {
      apiKey: process.env.KOREA_INVESTMENT_API_KEY || 'test-api-key',
      secretKey: process.env.KOREA_INVESTMENT_SECRET_KEY || 'test-secret',
      accountNumber: process.env.KOREA_INVESTMENT_ACCOUNT || 'test-account'
    },
    environment: process.env.KOREA_INVESTMENT_ENV || 'development',
    timeout: 30000
  }
};

describe('Provider Integration Tests', () => {
  let kset: KSET;
  let providers: Map<string, any> = new Map();

  beforeAll(async () => {
    kset = new KSET({
      logLevel: 'debug',
      defaultTimeout: 60000,
      retryAttempts: 3
    });

    if (USE_REAL_PROVIDERS) {
      // Initialize real providers for integration testing
      try {
        console.log('Initializing real providers for integration testing...');

        if (process.env.KIWOOM_CERT_PATH) {
          const kiwoom = await kset.createProvider('kiwoom', TEST_CONFIG.kiwoom);
          providers.set('kiwoom', kiwoom);
          console.log('✅ Kiwoom provider initialized');
        }

        if (process.env.KOREA_INVESTMENT_API_KEY) {
          const koreaInvestment = await kset.createProvider('korea-investment', TEST_CONFIG['korea-investment']);
          providers.set('korea-investment', koreaInvestment);
          console.log('✅ Korea Investment provider initialized');
        }

        if (providers.size === 0) {
          console.warn('⚠️ No real providers configured, using mock providers');
          USE_REAL_PROVIDERS = false;
        }
      } catch (error) {
        console.error('❌ Failed to initialize real providers:', error);
        console.warn('⚠️ Falling back to mock providers');
        USE_REAL_PROVIDERS = false;
      }
    }

    // Initialize mock providers if real providers are not available
    if (!USE_REAL_PROVIDERS) {
      const mockKiwoom = new MockProvider('kiwoom', 'Kiwoom Securities');
      const mockKoreaInvestment = new MockProvider('korea-investment', 'Korea Investment & Securities');

      await mockKiwoom.initialize(TEST_CONFIG.kiwoom);
      await mockKoreaInvestment.initialize(TEST_CONFIG['korea-investment']);

      providers.set('kiwoom', mockKiwoom);
      providers.set('korea-investment', mockKoreaInvestment);
      console.log('✅ Mock providers initialized');
    }
  }, 120000); // 2 minutes timeout for provider initialization

  afterAll(async () => {
    // Cleanup connections
    for (const [brokerId, provider] of providers.entries()) {
      try {
        await provider.disconnect();
        console.log(`✅ Disconnected from ${brokerId}`);
      } catch (error) {
        console.error(`❌ Failed to disconnect from ${brokerId}:`, error);
      }
    }

    try {
      await kset['cleanup']();
      console.log('✅ KSET cleanup completed');
    } catch (error) {
      console.error('❌ KSET cleanup failed:', error);
    }
  }, 60000); // 1 minute timeout for cleanup

  describe('Provider Connection Tests', () => {
    test.each(Array.from(providers.keys()))(
      'should establish connection with %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);
        expect(provider).toBeDefined();

        const healthStatus = await provider.getHealthStatus();
        expect(healthStatus.connected).toBe(true);
        expect(healthStatus.apiStatus).toBe('healthy');
        expect(healthStatus.latency).toBeGreaterThanOrEqual(0);
        expect(healthStatus.errorRate).toBeLessThanOrEqual(100);

        console.log(`✅ ${brokerId} connection test passed`);
      }
    );

    test('should compare provider capabilities', async () => {
      if (providers.size < 2) {
        console.warn('⚠️ Skipping capability comparison - need at least 2 providers');
        return;
      }

      const comparison = kset.compareBrokers(Array.from(providers.keys()));
      expect(comparison).toBeDefined();

      for (const [brokerId, capabilities] of Object.entries(comparison)) {
        expect(providers.has(brokerId)).toBe(true);
        expect(capabilities).toBeDefined();
        expect(capabilities).toHaveProperty('fees');
        expect(capabilities).toHaveProperty('features');
      }

      console.log('✅ Provider capability comparison completed');
    });
  });

  describe('Market Data Integration', () => {
    const TEST_SYMBOLS = ['005930', '000660', '035420']; // Samsung, SK Hynix, LG Chem

    test.each(Array.from(providers.keys()))(
      'should fetch market data from %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);
        const startTime = Date.now();

        const response = await provider.getMarketData(TEST_SYMBOLS);
        const responseTime = Date.now() - startTime;

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);
        expect(response.data.length).toBe(TEST_SYMBOLS.length);

        // Validate market data structure
        response.data.forEach((data: any) => {
          expect(data).toHaveProperty('symbol');
          expect(data).toHaveProperty('price');
          expect(data).toHaveProperty('change');
          expect(data).toHaveProperty('volume');
          expect(data).toHaveProperty('timestamp');
          expect(TEST_SYMBOLS).toContain(data.symbol);
          expect(typeof data.price).toBe('number');
          expect(data.price).toBeGreaterThan(0);
        });

        console.log(`✅ ${brokerId} market data fetched in ${responseTime}ms`);
      }
    );

    test('should compare market data across providers', async () => {
      if (providers.size < 2) {
        console.warn('⚠️ Skipping market data comparison - need at least 2 providers');
        return;
      }

      const symbol = '005930';
      const comparison = await kset.compareMarketData(symbol);

      expect(comparison.size).toBe(providers.size);

      // Validate price consistency (should be reasonably close)
      const prices = Array.from(comparison.values()).map(data => data.price);
      if (prices.length > 1) {
        const maxPrice = Math.max(...prices);
        const minPrice = Math.min(...prices);
        const priceDifference = maxPrice - minPrice;
        const averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        const priceDifferencePercent = (priceDifference / averagePrice) * 100;

        // Prices should be within 5% of each other
        expect(priceDifferencePercent).toBeLessThan(5);
      }

      console.log(`✅ Market data comparison completed for ${symbol}`);
    }, 60000);
  });

  describe('Account Information Integration', () => {
    test.each(Array.from(providers.keys()))(
      'should fetch account information from %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);
        const startTime = Date.now();

        const response = await provider.getAccounts();
        const responseTime = Date.now() - startTime;

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);

        if (response.data.length > 0) {
          response.data.forEach((account: Account) => {
            expect(account).toHaveProperty('accountNumber');
            expect(account).toHaveProperty('accountType');
            expect(account).toHaveProperty('currency');
            expect(account).toHaveProperty('status');
          });
        } else {
          console.warn(`⚠️ No accounts found for ${brokerId}`);
        }

        console.log(`✅ ${brokerId} account information fetched in ${responseTime}ms`);
      }
    );

    test.each(Array.from(providers.keys()))(
      'should fetch balance information from %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);

        // First get accounts to get account numbers
        const accountsResponse = await provider.getAccounts();
        if (!accountsResponse.success || accountsResponse.data.length === 0) {
          console.warn(`⚠️ No accounts available for ${brokerId} balance test`);
          return;
        }

        const accountNumber = accountsResponse.data[0].accountNumber;
        const startTime = Date.now();

        const response = await provider.getBalances(accountNumber);
        const responseTime = Date.now() - startTime;

        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(Array.isArray(response.data)).toBe(true);

        if (response.data.length > 0) {
          response.data.forEach((balance: Balance) => {
            expect(balance).toHaveProperty('currency');
            expect(balance).toHaveProperty('available');
            expect(balance).toHaveProperty('total');
            expect(typeof balance.available).toBe('number');
            expect(typeof balance.total).toBe('number');
          });
        } else {
          console.warn(`⚠️ No balances found for ${brokerId} account ${accountNumber}`);
        }

        console.log(`✅ ${brokerId} balance information fetched in ${responseTime}ms`);
      }
    );
  });

  describe('Order Execution Integration', () => {
    const TEST_ORDER: OrderRequest = {
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 1, // Minimum quantity
      price: 1000, // Very low price to avoid execution
      account: process.env.TEST_ACCOUNT_NUMBER || 'TEST-ACCOUNT'
    };

    test.each(Array.from(providers.keys()))(
      'should validate order with %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);

        // Test order validation (don't actually place order)
        const capabilities = provider.getCapabilities();
        expect(capabilities.trading.orderTypes).toContain(TEST_ORDER.orderType);
        expect(capabilities.trading.orderSides).toContain(TEST_ORDER.side);

        console.log(`✅ ${brokerId} order validation completed`);
      }
    );

    test('should route order to optimal provider', async () => {
      if (providers.size === 0) {
        console.warn('⚠️ Skipping order routing - no providers available');
        return;
      }

      // Note: Using very low price to avoid actual execution in real providers
      const safeOrder: OrderRequest = {
        ...TEST_ORDER,
        price: 1 // Minimum possible price
      };

      const startTime = Date.now();
      try {
        const routingResult = await kset.routeOrder(safeOrder, { priority: 'price' });
        const routingTime = Date.now() - startTime;

        expect(routingResult).toBeDefined();
        expect(routingResult.executedOrders).toBeDefined();
        expect(routingResult.summary).toBeDefined();
        expect(routingResult.routing).toBeDefined();

        console.log(`✅ Order routed successfully in ${routingTime}ms`);
        console.log(`   Selected broker: ${routingResult.routing.selectedBrokers.join(', ')}`);
      } catch (error) {
        if (USE_REAL_PROVIDERS) {
          // Real providers might reject test orders
          console.warn(`⚠️ Order routing failed with real providers: ${error.message}`);
        } else {
          throw error;
        }
      }
    }, 30000);
  });

  describe('Real-time Data Integration', () => {
    test.each(Array.from(providers.keys()))(
      'should establish real-time data connection with %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);

        if (!provider.getCapabilities().realTimeData) {
          console.warn(`⚠️ ${brokerId} does not support real-time data`);
          return;
        }

        // Enable real-time data
        await provider.enableRealTimeData();

        const status = provider.getRealTimeDataStatus();
        expect(status.enabled).toBe(true);

        // Test subscription
        const symbols = ['005930'];
        let receivedData = false;
        const subscriptionPromise = new Promise((resolve) => {
          const timeout = setTimeout(() => {
            if (!receivedData) {
              console.warn(`⚠️ No real-time data received from ${brokerId} within timeout`);
              resolve(null);
            }
          }, 10000);

          provider.subscribeToRealTimeData(symbols, (data) => {
            receivedData = true;
            clearTimeout(timeout);
            resolve(data);
          });
        });

        const data = await subscriptionPromise;

        if (data) {
          expect(data).toBeDefined();
          expect(data.symbol).toBe('005930');
          console.log(`✅ ${brokerId} real-time data received`);
        }

        // Cleanup
        await provider.disableRealTimeData();
      }
    , 15000);
  });

  describe('Performance Integration', () => {
    test('should measure API response times', async () => {
      const responseTimes: { [key: string]: number[] } = {};

      for (const [brokerId, provider] of providers.entries()) {
        responseTimes[brokerId] = [];

        // Test multiple requests
        for (let i = 0; i < 5; i++) {
          const startTime = Date.now();
          const response = await provider.getMarketData(['005930']);
          const responseTime = Date.now() - startTime;

          expect(response.success).toBe(true);
          responseTimes[brokerId].push(responseTime);
        }
      }

      // Analyze performance
      for (const [brokerId, times] of Object.entries(responseTimes)) {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        const maxTime = Math.max(...times);
        const minTime = Math.min(...times);

        console.log(`📊 ${brokerId} Performance:`);
        console.log(`   Average: ${avgTime.toFixed(2)}ms`);
        console.log(`   Min: ${minTime}ms`);
        console.log(`   Max: ${maxTime}ms`);

        // Performance assertions
        expect(avgTime).toBeLessThan(5000); // Average should be under 5 seconds
        expect(maxTime).toBeLessThan(10000); // Max should be under 10 seconds
      }
    }, 30000);

    test('should handle concurrent requests', async () => {
      const concurrentRequests = 10;
      const symbols = ['005930', '000660', '035420', '051910', '068270'];

      const startTime = Date.now();

      const promises = [];
      for (let i = 0; i < concurrentRequests; i++) {
        const randomSymbol = symbols[Math.floor(Math.random() * symbols.length)];
        promises.push(
          kset.compareMarketData(randomSymbol)
        );
      }

      const results = await Promise.allSettled(promises);
      const totalTime = Date.now() - startTime;

      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;

      console.log(`📊 Concurrent Request Performance:`);
      console.log(`   Total requests: ${concurrentRequests}`);
      console.log(`   Successful: ${successful}`);
      console.log(`   Failed: ${failed}`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Average per request: ${(totalTime / concurrentRequests).toFixed(2)}ms`);

      expect(successful).toBeGreaterThan(concurrentRequests * 0.8); // At least 80% success rate
    }, 60000);
  });

  describe('Error Handling Integration', () => {
    test.each(Array.from(providers.keys()))(
      'should handle network errors gracefully with %s provider',
      async (brokerId) => {
        const provider = providers.get(brokerId);

        // Test with invalid symbol
        const response = await provider.getMarketData(['INVALID_SYMBOL']);

        // Provider should handle invalid symbols gracefully
        expect(response).toBeDefined();

        if (response.success) {
          // Some providers return success with empty data for invalid symbols
          expect(response.data).toBeDefined();
        } else {
          // Others return error
          expect(response.error).toBeDefined();
        }

        console.log(`✅ ${brokerId} error handling test completed`);
      }
    );

    test('should handle provider disconnection', async () => {
      if (providers.size === 0) {
        console.warn('⚠️ Skipping disconnection test - no providers available');
        return;
      }

      const [brokerId, provider] = Array.from(providers.entries())[0];

      // Test graceful disconnection
      await provider.disconnect();

      const healthStatus = await provider.getHealthStatus();
      expect(healthStatus.connected).toBe(false);

      // Reconnect
      await provider.initialize(TEST_CONFIG[brokerId as keyof typeof TEST_CONFIG]);
      const newHealthStatus = await provider.getHealthStatus();
      expect(newHealthStatus.connected).toBe(true);

      console.log(`✅ ${brokerId} disconnection/reconnection test completed`);
    }, 30000);
  });

  describe('Data Consistency Integration', () => {
    test('should maintain data consistency across multiple requests', async () => {
      if (providers.size === 0) {
        console.warn('⚠️ Skipping data consistency test - no providers available');
        return;
      }

      const [brokerId, provider] = Array.from(providers.entries())[0];
      const symbol = '005930';
      const requestCount = 5;

      const responses = [];
      for (let i = 0; i < requestCount; i++) {
        const response = await provider.getMarketData([symbol]);
        if (response.success && response.data.length > 0) {
          responses.push(response.data[0]);
        }
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      expect(responses.length).toBe(requestCount);

      // Check data consistency
      const firstResponse = responses[0];
      responses.forEach((response, index) => {
        expect(response.symbol).toBe(firstResponse.symbol);
        expect(response.name).toBe(firstResponse.name);
        expect(response.market).toBe(firstResponse.market);

        // Prices might change, but should be reasonable
        expect(response.price).toBeGreaterThan(0);
        expect(typeof response.change).toBe('number');
      });

      console.log(`✅ Data consistency test completed for ${symbol}`);
    }, 30000);

    test('should handle market hours correctly', async () => {
      // Test market status awareness
      const marketEngine = kset.getMarketEngine();
      const isMarketOpen = marketEngine.isMarketOpen();

      console.log(`📅 Market Status: ${isMarketOpen ? 'OPEN' : 'CLOSED'}`);

      if (isMarketOpen) {
        // During market hours, data should be fresh
        const [brokerId, provider] = Array.from(providers.entries())[0];
        const response = await provider.getMarketData(['005930']);

        if (response.success && response.data.length > 0) {
          const data = response.data[0];
          const now = new Date();
          const dataAge = now.getTime() - data.timestamp.getTime();

          // Data should be relatively fresh during market hours
          expect(dataAge).toBeLessThan(60000); // Less than 1 minute old
          console.log(`✅ Fresh market data received (${dataAge}ms old)`);
        }
      } else {
        console.log('⚠️ Market is closed - data freshness not verified');
      }
    });
  });
});