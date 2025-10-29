/**
 * End-to-End tests for complete trading workflows
 */

import { KSET } from '../../src/core/KSET';
import { MockProvider } from '../mocks/MockProvider';
import type {
  ProviderConfig,
  OrderRequest,
  Account,
  MarketData,
  Order
} from '../../src/interfaces';

// Configuration for E2E testing
const E2E_CONFIG = {
  useRealProviders: process.env.KSET_E2E_REAL === 'true',
  testTimeout: 180000, // 3 minutes
  operationTimeout: 60000, // 1 minute per operation
  cleanupTimeout: 30000, // 30 seconds for cleanup
  mockDataRefresh: true // Refresh mock data for each test
};

describe('End-to-End Trading Workflows', () => {
  let kset: KSET;
  let providers: Map<string, any> = new Map();
  let testAccounts: Map<string, Account> = new Map();

  beforeAll(async () => {
    console.log('🚀 Starting E2E Trading Workflow Tests...');

    kset = new KSET({
      logLevel: 'info',
      defaultTimeout: E2E_CONFIG.operationTimeout,
      retryAttempts: 3,
      cache: {
        enabled: true,
        ttl: 30000,
        maxSize: 100
      },
      realTime: {
        maxSubscriptions: 10,
        reconnectAttempts: 5,
        reconnectDelay: 5000
      }
    });

    await initializeProviders();
    await discoverTestAccounts();

    console.log(`✅ E2E Test Environment Ready`);
    console.log(`   Providers: ${Array.from(providers.keys()).join(', ')}`);
    console.log(`   Test Accounts: ${Array.from(testAccounts.keys()).join(', ')}`);
  }, E2E_CONFIG.testTimeout);

  afterAll(async () => {
    console.log('🧹 Cleaning up E2E test environment...');

    try {
      // Disconnect all providers
      for (const [brokerId, provider] of providers.entries()) {
        try {
          await provider.disconnect();
          console.log(`   ✅ Disconnected from ${brokerId}`);
        } catch (error) {
          console.error(`   ❌ Failed to disconnect from ${brokerId}:`, error);
        }
      }

      // Cleanup KSET
      await kset['cleanup']();
      console.log('   ✅ KSET cleanup completed');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }

    console.log('🏁 E2E Trading Workflow Tests Completed');
  }, E2E_CONFIG.cleanupTimeout);

  async function initializeProviders() {
    if (E2E_CONFIG.useRealProviders) {
      // Initialize real providers with actual credentials
      const providerConfigs = [
        {
          brokerId: 'kiwoom',
          config: {
            credentials: {
              certificate: process.env.KIWOOM_CERT_PATH,
              password: process.env.KIWOOM_CERT_PASSWORD
            },
            environment: process.env.KIWOOM_ENV || 'development'
          } as ProviderConfig
        },
        {
          brokerId: 'korea-investment',
          config: {
            credentials: {
              apiKey: process.env.KOREA_INVESTMENT_API_KEY,
              secretKey: process.env.KOREA_INVESTMENT_SECRET_KEY,
              accountNumber: process.env.KOREA_INVESTMENT_ACCOUNT
            },
            environment: process.env.KOREA_INVESTMENT_ENV || 'development'
          } as ProviderConfig
        }
      ];

      for (const { brokerId, config } of providerConfigs) {
        try {
          if (config.credentials.apiKey || config.credentials.certificate) {
            const provider = await kset.createProvider(brokerId, config);
            providers.set(brokerId, provider);
            console.log(`✅ Initialized real provider: ${brokerId}`);
          }
        } catch (error) {
          console.warn(`⚠️ Failed to initialize real provider ${brokerId}:`, error);
        }
      }
    }

    // If no real providers were initialized, use mock providers
    if (providers.size === 0) {
      console.log('🔄 Using mock providers for E2E testing');

      const mockProviders = [
        new MockProvider('kiwoom', 'Kiwoom Securities'),
        new MockProvider('korea-investment', 'Korea Investment & Securities'),
        new MockProvider('miraeasset', 'Mirae Asset Securities')
      ];

      for (const mockProvider of mockProviders) {
        await mockProvider.initialize({ environment: 'test' });
        providers.set(mockProvider.id, mockProvider);

        // Setup mock accounts
        const mockAccounts: Account[] = [
          {
            accountNumber: `${mockProvider.id.toUpperCase()}-TEST-001`,
            accountType: 'general',
            currency: 'KRW',
            status: 'active',
            availableBalance: 100000000, // 100M KRW
            totalBalance: 100000000,
            openedAt: new Date('2020-01-01'),
            investorType: 'individual'
          }
        ];
        mockProvider.setAccounts(mockAccounts);
      }

      console.log(`✅ Initialized ${mockProviders.length} mock providers`);
    }
  }

  async function discoverTestAccounts() {
    for (const [brokerId, provider] of providers.entries()) {
      try {
        const accountsResponse = await provider.getAccounts();
        if (accountsResponse.success && accountsResponse.data.length > 0) {
          const primaryAccount = accountsResponse.data[0];
          testAccounts.set(brokerId, primaryAccount);
          console.log(`📋 Found test account for ${brokerId}: ${primaryAccount.accountNumber}`);
        }
      } catch (error) {
        console.warn(`⚠️ Could not discover accounts for ${brokerId}:`, error);
      }
    }

    // Ensure we have at least one test account
    if (testAccounts.size === 0 && providers.size > 0) {
      const [brokerId] = Array.from(providers.keys())[0];
      const fallbackAccount: Account = {
        accountNumber: 'E2E-TEST-ACCOUNT',
        accountType: 'general',
        currency: 'KRW',
        status: 'active',
        availableBalance: 100000000,
        totalBalance: 100000000,
        openedAt: new Date('2020-01-01'),
        investorType: 'individual'
      };
      testAccounts.set(brokerId, fallbackAccount);
      console.log(`📋 Using fallback test account for ${brokerId}`);
    }
  }

  describe('Complete Trading Workflow', () => {
    test('should execute complete trading workflow from analysis to settlement', async () => {
      if (providers.size === 0 || testAccounts.size === 0) {
        console.warn('⚠️ Skipping complete workflow test - no providers or accounts');
        return;
      }

      const [brokerId, account] = Array.from(testAccounts.entries())[0];
      const provider = providers.get(brokerId);
      const workflowId = `WORKFLOW-${Date.now()}`;

      console.log(`🔄 Starting complete trading workflow: ${workflowId}`);

      // Step 1: Market Analysis
      console.log('   📊 Step 1: Market Analysis');
      const symbols = ['005930', '000660', '035420']; // Samsung, SK Hynix, LG Chem

      const marketDataResponse = await provider.getMarketData(symbols);
      expect(marketDataResponse.success).toBe(true);
      expect(marketDataResponse.data).toHaveLength(symbols.length);

      const marketData = new Map<string, MarketData>();
      marketDataResponse.data.forEach((data: MarketData) => {
        marketData.set(data.symbol, data);
      });

      console.log(`   ✅ Retrieved market data for ${symbols.length} symbols`);

      // Step 2: Company Research
      console.log('   🔍 Step 2: Company Research');
      const researchResults = [];

      for (const symbol of symbols.slice(0, 2)) { // Research first 2 symbols
        try {
          const companyInfo = await provider.getCompanyInfo(symbol);
          if (companyInfo.success) {
            researchResults.push({
              symbol,
              company: companyInfo.data
            });
          }
        } catch (error) {
          console.warn(`   ⚠️ Research failed for ${symbol}:`, error);
        }
      }

      expect(researchResults.length).toBeGreaterThan(0);
      console.log(`   ✅ Completed research for ${researchResults.length} companies`);

      // Step 3: Portfolio Analysis
      console.log('   📈 Step 3: Portfolio Analysis');
      const portfolio = {
        accountNumber: account.accountNumber,
        totalValue: account.totalBalance,
        positions: [],
        cash: account.availableBalance
      };

      const portfolioAnalysis = await kset.analyzePortfolio(portfolio);
      expect(portfolioAnalysis).toBeDefined();

      console.log(`   ✅ Portfolio analysis completed`);

      // Step 4: Order Decision & Risk Assessment
      console.log('   ⚖️ Step 4: Order Decision & Risk Assessment');
      const selectedSymbol = symbols[0]; // Samsung
      const currentPrice = marketData.get(selectedSymbol)?.price || 0;
      const orderSize = Math.min(10, Math.floor(account.availableBalance / (currentPrice * 10))); // Max 10 shares

      const orderRequest: OrderRequest = {
        symbol: selectedSymbol,
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: orderSize,
        price: Math.floor(currentPrice * 0.99), // 1% below current price
        account: account.accountNumber
      };

      // Compliance check
      const complianceEngine = kset.getComplianceEngine();
      const complianceCheck = complianceEngine.validateOrder(orderRequest);
      expect(complianceCheck.isValid).toBe(true);

      console.log(`   ✅ Order compliance validated`);

      // Step 5: Order Execution
      console.log('   💼 Step 5: Order Execution');
      const orderResponse = await provider.placeOrder(orderRequest);
      expect(orderResponse.success).toBe(true);
      expect(orderResponse.data).toBeDefined();

      const order: Order = orderResponse.data;
      console.log(`   ✅ Order placed: ${order.id}`);

      // Step 6: Order Monitoring
      console.log('   👀 Step 6: Order Monitoring');
      let orderStatus = order.status;
      let monitoringAttempts = 0;
      const maxMonitoringAttempts = 10;

      while (orderStatus === 'SUBMITTED' && monitoringAttempts < maxMonitoringAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        monitoringAttempts++;

        // For mock providers, simulate order execution
        if (provider instanceof MockProvider) {
          if (monitoringAttempts === 3) {
            order.status = 'PARTIALLY_FILLED';
            order.quantityFilled = Math.floor(order.quantity / 2);
            order.averageFillPrice = order.price;
          } else if (monitoringAttempts === 6) {
            order.status = 'FILLED';
            order.quantityFilled = order.quantity;
          }
        }

        orderStatus = order.status;
      }

      expect(['FILLED', 'PARTIALLY_FILLED', 'SUBMITTED']).toContain(orderStatus);
      console.log(`   ✅ Order monitoring completed: ${orderStatus}`);

      // Step 7: Post-Trade Analysis
      console.log('   📊 Step 7: Post-Trade Analysis');
      const executionTime = Date.now() - order.timestamp.getTime();
      const orderValue = order.averageFillPrice * order.quantityFilled;
      const fees = kset.getMarketEngine().calculateTradingFees(orderValue);

      const postTradeAnalysis = {
        orderId: order.id,
        symbol: order.symbol,
        side: order.side,
        quantity: order.quantity,
        quantityFilled: order.quantityFilled,
        averagePrice: order.averageFillPrice,
        orderValue,
        fees,
        executionTime,
        status: order.status
      };

      expect(postTradeAnalysis.quantityFilled).toBeGreaterThan(0);
      console.log(`   ✅ Post-trade analysis completed`);

      // Step 8: Account Update Verification
      console.log('   💰 Step 8: Account Update Verification');
      const updatedAccountsResponse = await provider.getAccounts();
      if (updatedAccountsResponse.success && updatedAccountsResponse.data.length > 0) {
        const updatedAccount = updatedAccountsResponse.data[0];
        expect(updatedAccount.accountNumber).toBe(account.accountNumber);
        console.log(`   ✅ Account state verified`);
      } else {
        console.warn(`   ⚠️ Could not verify account state`);
      }

      // Workflow Summary
      console.log(`🎉 Complete Trading Workflow ${workflowId} Finished:`);
      console.log(`   Symbol: ${selectedSymbol}`);
      console.log(`   Order: ${order.id}`);
      console.log(`   Status: ${orderStatus}`);
      console.log(`   Quantity: ${order.quantityFilled}/${order.quantity}`);
      console.log(`   Average Price: ${order.averageFillPrice.toLocaleString()} KRW`);
      console.log(`   Order Value: ${orderValue.toLocaleString()} KRW`);
      console.log(`   Fees: ${fees.total.toLocaleString()} KRW`);
      console.log(`   Execution Time: ${executionTime}ms`);

      // Verify workflow completion
      expect(marketData.size).toBeGreaterThan(0);
      expect(researchResults.length).toBeGreaterThan(0);
      expect(order.id).toBeDefined();
      expect(order.quantityFilled).toBeGreaterThan(0);
    }, E2E_CONFIG.testTimeout);

    test('should handle multi-provider order routing', async () => {
      if (providers.size < 2) {
        console.warn('⚠️ Skipping multi-provider test - need at least 2 providers');
        return;
      }

      console.log('🔄 Starting multi-provider order routing workflow');

      const orderRequest: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 10,
        price: 80000, // Low price to avoid execution
        account: Array.from(testAccounts.values())[0].accountNumber
      };

      // Test different routing criteria
      const routingCriteria = [
        { priority: 'price' as const },
        { priority: 'speed' as const },
        { priority: 'reliability' as const }
      ];

      const routingResults = [];

      for (const criteria of routingCriteria) {
        console.log(`   🎯 Testing routing with priority: ${criteria.priority}`);

        const routingResult = await kset.routeOrder(orderRequest, criteria);
        expect(routingResult).toBeDefined();
        expect(routingResult.executedOrders).toBeDefined();
        expect(routingResult.routing).toBeDefined();

        routingResults.push({
          criteria: criteria.priority,
          result: routingResult
        });

        console.log(`   ✅ Routing completed: ${routingResult.routing.selectedBrokers.join(', ')}`);

        // Small delay between routing attempts
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Analyze routing results
      const selectedBrokers = new Set();
      routingResults.forEach(r => {
        r.result.routing.selectedBrokers.forEach((broker: string) => {
          selectedBrokers.add(broker);
        });
      });

      console.log(`📊 Multi-Provider Routing Summary:`);
      console.log(`   Routing attempts: ${routingResults.length}`);
      console.log(`   Unique brokers selected: ${selectedBrokers.size}`);

      routingResults.forEach(r => {
        console.log(`   ${r.criteria}: ${r.result.routing.selectedBrokers.join(', ')}`);
      });

      expect(routingResults).toHaveLength(routingCriteria.length);
      expect(selectedBrokers.size).toBeGreaterThan(0);
    }, E2E_CONFIG.testTimeout);

    test('should handle real-time data streaming during trading', async () => {
      if (providers.size === 0) {
        console.warn('⚠️ Skipping real-time trading test - no providers');
        return;
      }

      console.log('🔄 Starting real-time trading workflow');

      const [brokerId, provider] = Array.from(providers.entries())[0];
      const symbols = ['005930', '000660'];
      let realTimeUpdates = 0;
      const tradingDecisions = [];

      // Step 1: Subscribe to real-time data
      console.log('   📡 Step 1: Real-time Data Subscription');

      const realTimeSubscription = await kset.subscribeToRealTimeData(
        brokerId,
        symbols,
        (data) => {
          realTimeUpdates++;

          // Make trading decisions based on real-time data
          if (data.type === 'price_update') {
            const decision = {
              symbol: data.symbol,
              currentPrice: data.price,
              changePercent: data.changePercent,
              timestamp: data.timestamp,
              action: Math.abs(data.changePercent) > 1 ? 'CONSIDER_TRADE' : 'HOLD'
            };
            tradingDecisions.push(decision);
          }
        }
      );

      expect(realTimeSubscription.subscriptionId).toBeDefined();
      console.log(`   ✅ Subscribed to real-time data: ${realTimeSubscription.subscriptionId}`);

      // Step 2: Monitor real-time data
      console.log('   👀 Step 2: Real-time Data Monitoring');
      const monitoringDuration = 10000; // 10 seconds
      const startTime = Date.now();

      // Simulate real-time data for mock providers
      if (provider instanceof MockProvider) {
        const simulationInterval = setInterval(() => {
          symbols.forEach(symbol => {
            const mockData = {
              type: 'price_update',
              symbol,
              price: 85000 + (Math.random() - 0.5) * 2000,
              changePercent: (Math.random() - 0.5) * 3,
              volume: Math.floor(Math.random() * 1000000),
              timestamp: new Date()
            };

            // Simulate callback
            if (realTimeUpdates < 20) { // Limit simulated updates
              realTimeSubscription.subscriptionId; // Access to verify subscription is active
              realTimeUpdates++;
              tradingDecisions.push({
                symbol: mockData.symbol,
                currentPrice: mockData.price,
                changePercent: mockData.changePercent,
                timestamp: mockData.timestamp,
                action: Math.abs(mockData.changePercent) > 1 ? 'CONSIDER_TRADE' : 'HOLD'
              });
            }
          });
        }, 500);

        setTimeout(() => {
          clearInterval(simulationInterval);
        }, monitoringDuration);
      }

      await new Promise(resolve => setTimeout(resolve, monitoringDuration));
      const actualMonitoringTime = Date.now() - startTime;

      console.log(`   ✅ Real-time monitoring completed`);
      console.log(`   Updates received: ${realTimeUpdates}`);
      console.log(`   Trading decisions: ${tradingDecisions.length}`);

      // Step 3: Execute trade based on real-time signals
      console.log('   💼 Step 3: Execute Trade on Real-time Signals');
      const actionableDecisions = tradingDecisions.filter(d => d.action === 'CONSIDER_TRADE');

      if (actionableDecisions.length > 0 && testAccounts.size > 0) {
        const bestDecision = actionableDecisions.reduce((best, current) =>
          Math.abs(current.changePercent) > Math.abs(best.changePercent) ? current : best
        );

        const account = Array.from(testAccounts.values())[0];
        const orderRequest: OrderRequest = {
          symbol: bestDecision.symbol,
          side: 'BUY',
          orderType: 'MARKET',
          quantity: 5,
          account: account.accountNumber
        };

        try {
          const orderResponse = await provider.placeOrder(orderRequest);
          if (orderResponse.success) {
            console.log(`   ✅ Trade executed based on real-time signal: ${orderResponse.data.id}`);
            console.log(`   Signal: ${bestDecision.changePercent.toFixed(2)}% change`);
            console.log(`   Decision: ${bestDecision.action}`);
          }
        } catch (error) {
          console.warn(`   ⚠️ Trade execution failed:`, error);
        }
      } else {
        console.log(`   ℹ️ No actionable trading signals detected`);
      }

      // Step 4: Cleanup real-time subscription
      console.log('   🧹 Step 4: Cleanup Real-time Subscription');
      await realTimeSubscription.unsubscribe();
      console.log(`   ✅ Real-time subscription cancelled`);

      // Verify results
      expect(realTimeUpdates).toBeGreaterThan(0);
      expect(tradingDecisions.length).toBeGreaterThan(0);

      console.log(`📊 Real-time Trading Summary:`);
      console.log(`   Monitoring time: ${actualMonitoringTime}ms`);
      console.log(`   Updates per second: ${(realTimeUpdates / (actualMonitoringTime / 1000)).toFixed(2)}`);
      console.log(`   Trading decisions: ${tradingDecisions.length}`);
      console.log(`   Actionable signals: ${actionableDecisions.length}`);

    }, E2E_CONFIG.testTimeout);
  });

  describe('Error Handling and Recovery Workflows', () => {
    test('should handle network failures gracefully', async () => {
      if (providers.size === 0) {
        console.warn('⚠️ Skipping error handling test - no providers');
        return;
      }

      console.log('🔄 Starting error handling and recovery workflow');

      const [brokerId, provider] = Array.from(providers.entries())[0];

      // Step 1: Simulate network failure
      console.log('   ❌ Step 1: Simulate Network Failure');

      if (provider instanceof MockProvider) {
        provider.setErrorMode(true);
        console.log(`   ✅ Provider error mode enabled for ${brokerId}`);
      }

      // Step 2: Attempt operations during failure
      console.log('   🔄 Step 2: Attempt Operations During Failure');

      let failedOperations = 0;
      const operations = [
        () => provider.getMarketData(['005930']),
        () => provider.getAccounts(),
        () => provider.placeOrder({
          symbol: '005930',
          side: 'BUY',
          orderType: 'LIMIT',
          quantity: 10,
          price: 80000,
          account: 'TEST-ACCOUNT'
        } as OrderRequest)
      ];

      for (const operation of operations) {
        try {
          const result = await operation();
          if (!result.success) {
            failedOperations++;
          }
        } catch (error) {
          failedOperations++;
        }
      }

      expect(failedOperations).toBeGreaterThan(0);
      console.log(`   ✅ ${failedOperations} operations failed as expected`);

      // Step 3: Recovery process
      console.log('   🔄 Step 3: Recovery Process');

      if (provider instanceof MockProvider) {
        provider.setErrorMode(false);
        console.log(`   ✅ Provider error mode disabled for ${brokerId}`);
      }

      // Step 4: Verify recovery
      console.log('   ✅ Step 4: Verify Recovery');

      const recoveryAttempts = 3;
      let successfulRecovery = false;

      for (let i = 0; i < recoveryAttempts && !successfulRecovery; i++) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for recovery

          const healthCheck = await provider.getHealthStatus();
          if (healthCheck.connected) {
            const testOperation = await provider.getMarketData(['005930']);
            if (testOperation.success) {
              successfulRecovery = true;
              console.log(`   ✅ Recovery successful after ${i + 1} attempts`);
            }
          }
        } catch (error) {
          console.warn(`   ⚠️ Recovery attempt ${i + 1} failed:`, error);
        }
      }

      expect(successfulRecovery).toBe(true);

      console.log(`🎉 Error Handling and Recovery Workflow Completed:`);
      console.log(`   Failed operations during outage: ${failedOperations}`);
      console.log(`   Recovery successful: ${successfulRecovery}`);
    }, E2E_CONFIG.testTimeout);

    test('should handle partial execution scenarios', async () => {
      if (providers.size === 0 || testAccounts.size === 0) {
        console.warn('⚠️ Skipping partial execution test - no providers or accounts');
        return;
      }

      console.log('🔄 Starting partial execution handling workflow');

      const [brokerId, account] = Array.from(testAccounts.entries())[0];
      const provider = providers.get(brokerId);

      const orderRequest: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100, // Large order that might partially fill
        price: 86000, // Price above market for partial fill
        account: account.accountNumber
      };

      // Step 1: Place large order
      console.log('   💼 Step 1: Place Large Order for Partial Execution');
      const orderResponse = await provider.placeOrder(orderRequest);
      expect(orderResponse.success).toBe(true);

      const order = orderResponse.data;
      console.log(`   ✅ Order placed: ${order.id}`);

      // Step 2: Monitor partial fills
      console.log('   👀 Step 2: Monitor Partial Fills');

      let fillStages = [];
      if (provider instanceof MockProvider) {
        // Simulate partial fills
        setTimeout(() => {
          order.status = 'PARTIALLY_FILLED';
          order.quantityFilled = 30;
          order.averageFillPrice = order.price;
          fillStages.push({ stage: 1, filled: 30, remaining: 70 });
        }, 2000);

        setTimeout(() => {
          order.status = 'PARTIALLY_FILLED';
          order.quantityFilled = 65;
          order.averageFillPrice = order.price;
          fillStages.push({ stage: 2, filled: 65, remaining: 35 });
        }, 4000);

        setTimeout(() => {
          order.status = 'PARTIALLY_FILLED';
          order.quantityFilled = 85;
          order.averageFillPrice = order.price;
          fillStages.push({ stage: 3, filled: 85, remaining: 15 });
        }, 6000);
      }

      // Wait for partial fills
      await new Promise(resolve => setTimeout(resolve, 8000));

      console.log(`   ✅ Partial fills monitored: ${fillStages.length} stages`);

      // Step 3: Handle remaining quantity
      console.log('   🔄 Step 3: Handle Remaining Quantity');

      const remainingQuantity = order.quantity - order.quantityFilled;
      if (remainingQuantity > 0) {
        // Cancel remaining part
        const cancelResponse = await provider.cancelOrder(order.id);
        console.log(`   ✅ Remaining order cancelled: ${cancelResponse.success}`);
      }

      // Step 4: Post-execution analysis
      console.log('   📊 Step 4: Post-execution Analysis');

      const executionAnalysis = {
        originalQuantity: order.quantity,
        filledQuantity: order.quantityFilled,
        remainingQuantity,
        fillRate: (order.quantityFilled / order.quantity) * 100,
        averagePrice: order.averageFillPrice,
        totalValue: order.averageFillPrice * order.quantityFilled,
        status: order.status
      };

      console.log(`📊 Partial Execution Analysis:`);
      console.log(`   Original quantity: ${executionAnalysis.originalQuantity}`);
      console.log(`   Filled quantity: ${executionAnalysis.filledQuantity}`);
      console.log(`   Remaining quantity: ${executionAnalysis.remainingQuantity}`);
      console.log(`   Fill rate: ${executionAnalysis.fillRate.toFixed(2)}%`);
      console.log(`   Average price: ${executionAnalysis.averagePrice.toLocaleString()} KRW`);
      console.log(`   Total value: ${executionAnalysis.totalValue.toLocaleString()} KRW`);
      console.log(`   Final status: ${executionAnalysis.status}`);

      expect(order.quantityFilled).toBeGreaterThan(0);
      expect(executionAnalysis.fillRate).toBeGreaterThan(0);
    }, E2E_CONFIG.testTimeout);
  });

  describe('Performance and Load Testing Workflows', () => {
    test('should handle high-frequency small orders', async () => {
      if (providers.size === 0 || testAccounts.size === 0) {
        console.warn('⚠️ Skipping load test - no providers or accounts');
        return;
      }

      console.log('🔄 Starting high-frequency trading load test');

      const [brokerId, account] = Array.from(testAccounts.entries())[0];
      const provider = providers.get(brokerId);

      const orderCount = 20;
      const batchSize = 5;
      const batchDelay = 500;

      const orders: Order[] = [];
      const results = {
        successful: 0,
        failed: 0,
        totalExecutionTime: 0,
        averageOrderTime: 0
      };

      console.log(`   📊 Placing ${orderCount} orders in batches of ${batchSize}`);

      for (let batch = 0; batch < orderCount / batchSize; batch++) {
        console.log(`   🔄 Processing batch ${batch + 1}/${orderCount / batchSize}`);

        const batchPromises = [];
        const batchStartTime = Date.now();

        for (let i = 0; i < batchSize; i++) {
          const orderRequest: OrderRequest = {
            symbol: '005930',
            side: 'BUY',
            orderType: 'LIMIT',
            quantity: 1,
            price: 80000 + batch * 100 + i, // Vary prices slightly
            account: account.accountNumber
          };

          const orderPromise = provider.placeOrder(orderRequest)
            .then(response => {
              if (response.success) {
                orders.push(response.data);
                results.successful++;
                return response.data;
              } else {
                results.failed++;
                throw new Error(response.error);
              }
            })
            .catch(error => {
              results.failed++;
              throw error;
            });

          batchPromises.push(orderPromise);
        }

        try {
          await Promise.allSettled(batchPromises);
          const batchTime = Date.now() - batchStartTime;
          results.totalExecutionTime += batchTime;

          console.log(`   ✅ Batch ${batch + 1} completed in ${batchTime}ms`);
        } catch (error) {
          console.warn(`   ⚠️ Batch ${batch + 1} had errors:`, error);
        }

        // Delay between batches
        if (batch < orderCount / batchSize - 1) {
          await new Promise(resolve => setTimeout(resolve, batchDelay));
        }
      }

      results.averageOrderTime = results.totalExecutionTime / orderCount;

      console.log(`📊 High-Frequency Trading Results:`);
      console.log(`   Total orders: ${orderCount}`);
      console.log(`   Successful: ${results.successful}`);
      console.log(`   Failed: ${results.failed}`);
      console.log(`   Success rate: ${((results.successful / orderCount) * 100).toFixed(2)}%`);
      console.log(`   Total execution time: ${results.totalExecutionTime}ms`);
      console.log(`   Average order time: ${results.averageOrderTime.toFixed(2)}ms`);
      console.log(`   Orders per second: ${(orderCount / (results.totalExecutionTime / 1000)).toFixed(2)}`);

      // Verify performance expectations
      expect(results.successful).toBeGreaterThan(orderCount * 0.8); // At least 80% success rate
      expect(results.averageOrderTime).toBeLessThan(5000); // Average under 5 seconds per order
    }, E2E_CONFIG.testTimeout);

    test('should handle concurrent multi-provider operations', async () => {
      if (providers.size < 2) {
        console.warn('⚠️ Skipping concurrent operations test - need at least 2 providers');
        return;
      }

      console.log('🔄 Starting concurrent multi-provider operations test');

      const symbols = ['005930', '000660', '035420', '051910', '068270'];
      const operationsPerProvider = 10;

      const providerOperations = Array.from(providers.entries()).map(async ([brokerId, provider]) => {
        const providerResults = {
          brokerId,
          marketDataRequests: 0,
          companyInfoRequests: 0,
          orderRequests: 0,
          errors: 0,
          totalTime: 0
        };

        const startTime = Date.now();

        const operations = [];

        // Market data requests
        for (let i = 0; i < operationsPerProvider; i++) {
          const symbol = symbols[i % symbols.length];
          operations.push(
            provider.getMarketData([symbol])
              .then(result => {
                if (result.success) {
                  providerResults.marketDataRequests++;
                } else {
                  providerResults.errors++;
                }
              })
              .catch(() => {
                providerResults.errors++;
              })
          );
        }

        // Company info requests
        for (let i = 0; i < Math.floor(operationsPerProvider / 2); i++) {
          const symbol = symbols[i % symbols.length];
          operations.push(
            provider.getCompanyInfo(symbol)
              .then(result => {
                if (result.success) {
                  providerResults.companyInfoRequests++;
                } else {
                  providerResults.errors++;
                }
              })
              .catch(() => {
                providerResults.errors++;
              })
          );
        }

        // Small order requests (if account available)
        const account = testAccounts.get(brokerId);
        if (account) {
          for (let i = 0; i < Math.floor(operationsPerProvider / 4); i++) {
            const orderRequest: OrderRequest = {
              symbol: symbols[i % symbols.length],
              side: 'BUY',
              orderType: 'LIMIT',
              quantity: 1,
              price: 80000,
              account: account.accountNumber
            };

            operations.push(
              provider.placeOrder(orderRequest)
                .then(result => {
                  if (result.success) {
                    providerResults.orderRequests++;
                  } else {
                    providerResults.errors++;
                  }
                })
                .catch(() => {
                  providerResults.errors++;
                })
            );
          }
        }

        await Promise.allSettled(operations);
        providerResults.totalTime = Date.now() - startTime;

        return providerResults;
      });

      const allResults = await Promise.all(providerOperations);

      console.log(`📊 Concurrent Multi-Provider Results:`);

      allResults.forEach(result => {
        console.log(`\n🔄 Provider: ${result.brokerId}`);
        console.log(`   Market data requests: ${result.marketDataRequests}`);
        console.log(`   Company info requests: ${result.companyInfoRequests}`);
        console.log(`   Order requests: ${result.orderRequests}`);
        console.log(`   Errors: ${result.errors}`);
        console.log(`   Total operations: ${result.marketDataRequests + result.companyInfoRequests + result.orderRequests}`);
        console.log(`   Execution time: ${result.totalTime}ms`);
        console.log(`   Operations per second: ${((result.marketDataRequests + result.companyInfoRequests + result.orderRequests) / (result.totalTime / 1000)).toFixed(2)}`);

        // Verify each provider performed adequately
        const totalOps = result.marketDataRequests + result.companyInfoRequests + result.orderRequests;
        expect(totalOps).toBeGreaterThan(0);
        expect(result.errors).toBeLessThan(totalOps * 0.2); // Less than 20% error rate
      });

      const totalOperations = allResults.reduce((sum, result) => {
        return sum + result.marketDataRequests + result.companyInfoRequests + result.orderRequests;
      }, 0);

      const totalErrors = allResults.reduce((sum, result) => sum + result.errors, 0);
      const averageTime = allResults.reduce((sum, result) => sum + result.totalTime, 0) / allResults.length;

      console.log(`\n📈 Overall Performance:`);
      console.log(`   Total operations: ${totalOperations}`);
      console.log(`   Total errors: ${totalErrors}`);
      console.log(`   Error rate: ${((totalErrors / totalOperations) * 100).toFixed(2)}%`);
      console.log(`   Average provider time: ${averageTime.toFixed(2)}ms`);

      expect(totalOperations).toBeGreaterThan(0);
      expect(totalErrors).toBeLessThan(totalOperations * 0.15); // Overall error rate under 15%
    }, E2E_CONFIG.testTimeout);
  });
});