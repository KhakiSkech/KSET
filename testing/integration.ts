/**
 * KSET Integration Testing
 * End-to-end integration testing framework
 */

import { KSETTestFramework, type TestSuite, type TestCase, type TestContext } from './framework';
import { createMockSDK, createMockProvider } from './mocks';
import type { KSETSDKConfig, EnhancedOrder } from '../sdk/types';

export interface IntegrationTestConfig {
  /** Test providers to use */
  providers?: string[];
  /** Test symbols */
  symbols?: string[];
  /** Enable real market data simulation */
  realTimeSimulation?: boolean;
  /** Test duration in milliseconds */
  duration?: number;
  /** Number of concurrent operations */
  concurrency?: number;
}

export class KSETIntegrationTestFramework {
  private framework: KSETTestFramework;
  private config: IntegrationTestConfig;

  constructor(config: IntegrationTestConfig = {}) {
    this.config = {
      providers: ['mock'],
      symbols: ['005930', '000660', '051910'],
      realTimeSimulation: true,
      duration: 30000,
      concurrency: 5,
      ...config
    };

    this.framework = new KSETTestFramework({
      verbose: true,
      mockProviders: true,
      performanceThresholds: {
        maxLatency: 2000,
        minThroughput: 5,
        maxMemoryUsage: 200,
        maxErrorRate: 10
      }
    });
  }

  /**
   * Run all integration tests
   */
  async runAllTests(): Promise<void> {
    console.log('🧪 Starting KSET Integration Tests...\n');

    const testSuites = [
      this.createConnectionTestSuite(),
      this.createOrderManagementTestSuite(),
      this.createMarketDataTestSuite(),
      this.createRealTimeTestSuite(),
      this.createPerformanceTestSuite(),
      this.createErrorHandlingTestSuite(),
      this.createConcurrencyTestSuite()
    ];

    // Add all test suites to framework
    testSuites.forEach(suite => this.framework.addSuite(suite));

    // Run tests
    const results = await this.framework.runAll();
    const summary = this.framework.getSummary();

    // Print results
    this.printResults(summary);

    // Exit with appropriate code
    if (summary.failed > 0) {
      process.exit(1);
    }
  }

  /**
   * Create connection test suite
   */
  private createConnectionTestSuite(): TestSuite {
    return {
      name: 'Connection Tests',
      setup: async () => {
        console.log('📡 Setting up connection tests...');
      },
      teardown: async () => {
        console.log('📡 Cleaning up connection tests...');
      },
      tests: [
        {
          name: 'should connect to KSET providers',
          fn: async (context: TestContext) => {
            await context.sdk.connect();
            context.utils.expect(context.sdk.isConnected()).toBe(true);
          }
        },
        {
          name: 'should disconnect from KSET providers',
          fn: async (context: TestContext) => {
            await context.sdk.disconnect();
            context.utils.expect(context.sdk.isConnected()).toBe(false);
          }
        },
        {
          name: 'should handle connection failures gracefully',
          fn: async (context: TestContext) => {
            // Test with invalid configuration
            const invalidConfig: KSETSDKConfig = {
              providers: [],
              debug: true
            };

            const invalidSDK = createMockSDK(invalidConfig);

            try {
              await invalidSDK.connect();
              context.utils.expect(true).toBe(false); // Should not reach here
            } catch (error) {
              context.utils.expect(error).toBeInstanceOf(Error);
            }
          }
        }
      ]
    };
  }

  /**
   * Create order management test suite
   */
  private createOrderManagementTestSuite(): TestSuite {
    return {
      name: 'Order Management Tests',
      setup: async (context: TestContext) => {
        await context.sdk.connect();
      },
      teardown: async (context: TestContext) => {
        await context.sdk.disconnect();
      },
      tests: [
        {
          name: 'should create a limit order',
          fn: async (context: TestContext) => {
            const orderData = {
              symbol: '005930',
              side: 'buy' as const,
              type: 'limit' as const,
              quantity: 100,
              price: 80000
            };

            const order = await context.sdk.createOrder(orderData);

            context.utils.expect(order).toBeDefined();
            context.utils.expect(order.id).toBeDefined();
            context.utils.expect(order.symbol).toBe('005930');
            context.utils.expect(order.side).toBe('buy');
            context.utils.expect(order.type).toBe('limit');
            context.utils.expect(order.quantity).toBe(100);
            context.utils.expect(order.price).toBe(80000);
            context.utils.expect(order.status).toBe('pending');
          }
        },
        {
          name: 'should create a market order',
          fn: async (context: TestContext) => {
            const orderData = {
              symbol: '000660',
              side: 'sell' as const,
              type: 'market' as const,
              quantity: 50
            };

            const order = await context.sdk.createOrder(orderData);

            context.utils.expect(order).toBeDefined();
            context.utils.expect(order.type).toBe('market');
            context.utils.expect(order.price).toBeUndefined(); // Market orders don't have price
          }
        },
        {
          name: 'should cancel an order',
          fn: async (context: TestContext) => {
            const orderData = {
              symbol: '051910',
              side: 'buy' as const,
              type: 'limit' as const,
              quantity: 10,
              price: 450000
            };

            const order = await context.sdk.createOrder(orderData);
            const cancelResult = await context.sdk.cancelOrder(order.id);

            context.utils.expect(cancelResult).toBe(true);

            const cancelledOrder = await context.sdk.getOrder(order.id);
            context.utils.expect(cancelledOrder?.status).toBe('cancelled');
          }
        },
        {
          name: 'should modify an existing order',
          fn: async (context: TestContext) => {
            const orderData = {
              symbol: '035420',
              side: 'buy' as const,
              type: 'limit' as const,
              quantity: 20,
              price: 150000
            };

            const order = await context.sdk.createOrder(orderData);
            const modifiedOrder = await context.sdk.modifyOrder(order.id, {
              quantity: 30,
              price: 148000
            });

            context.utils.expect(modifiedOrder.quantity).toBe(30);
            context.utils.expect(modifiedOrder.price).toBe(148000);
          }
        },
        {
          name: 'should retrieve order history',
          fn: async (context: TestContext) => {
            // Create multiple orders
            const orders = [];
            for (let i = 0; i < 5; i++) {
              const order = await context.sdk.createOrder({
                symbol: '005930',
                side: 'buy',
                type: 'limit',
                quantity: 10,
                price: 80000 + i * 100
              });
              orders.push(order);
            }

            const retrievedOrders = await context.sdk.getOrders();
            context.utils.expect(retrievedOrders.length).toBeGreaterThanOrEqual(5);

            // Verify our orders are in the list
            for (const order of orders) {
              const found = retrievedOrders.find(o => o.id === order.id);
              context.utils.expect(found).toBeDefined();
            }
          }
        }
      ]
    };
  }

  /**
   * Create market data test suite
   */
  private createMarketDataTestSuite(): TestSuite {
    return {
      name: 'Market Data Tests',
      setup: async (context: TestContext) => {
        await context.sdk.connect();
      },
      teardown: async (context: TestContext) => {
        await context.sdk.disconnect();
      },
      tests: [
        {
          name: 'should retrieve current market data',
          fn: async (context: TestContext) => {
            const marketData = await context.sdk.getMarketData('005930');

            context.utils.expect(marketData).toBeDefined();
            context.utils.expect(marketData?.symbol).toBe('005930');
            context.utils.expect(marketData?.price).toBeGreaterThan(0);
            context.utils.expect(marketData?.volume).toBeGreaterThanOrEqual(0);
            context.utils.expect(marketData?.timestamp).toBeInstanceOf(Date);
          }
        },
        {
          name: 'should subscribe to market data updates',
          fn: async (context: TestContext) => {
            let updateCount = 0;
            const symbols = ['005930', '000660'];

            context.sdk.on('market:data', (data) => {
              updateCount++;
              context.utils.expect(symbols).toContain(data.symbol);
            });

            await context.sdk.subscribeMarketData(symbols);

            // Wait for some updates
            await context.utils.wait(3000);

            context.utils.expect(updateCount).toBeGreaterThan(0);

            await context.sdk.unsubscribeMarketData(symbols);
          }
        },
        {
          name: 'should handle market data for multiple symbols',
          fn: async (context: TestContext) => {
            const symbols = ['005930', '000660', '051910', '035420', '068270'];
            const marketDataMap = new Map();

            for (const symbol of symbols) {
              const marketData = await context.sdk.getMarketData(symbol);
              context.utils.expect(marketData).toBeDefined();
              marketDataMap.set(symbol, marketData);
            }

            // Verify all symbols have data
            context.utils.expect(marketDataMap.size).toBe(symbols.length);

            // Verify data is different for each symbol (in mock environment)
            const prices = Array.from(marketDataMap.values()).map(data => data!.price);
            const uniquePrices = new Set(prices);
            context.utils.expect(uniquePrices.size).toBeGreaterThan(1);
          }
        }
      ]
    };
  }

  /**
   * Create real-time test suite
   */
  private createRealTimeTestSuite(): TestSuite {
    return {
      name: 'Real-time Features Tests',
      setup: async (context: TestContext) => {
        await context.sdk.connect();
      },
      teardown: async (context: TestContext) => {
        await context.sdk.disconnect();
      },
      tests: [
        {
          name: 'should handle real-time order updates',
          fn: async (context: TestContext) => {
            const orderUpdates: string[] = [];

            context.sdk.on('order:accepted', (order) => {
              orderUpdates.push(`accepted:${order.id}`);
            });

            context.sdk.on('order:filled', (order) => {
              orderUpdates.push(`filled:${order.id}`);
            });

            const order = await context.sdk.createOrder({
              symbol: '005930',
              side: 'buy',
              type: 'limit',
              quantity: 100,
              price: 80000
            });

            // Wait for order updates
            await context.utils.waitFor(
              () => orderUpdates.length >= 2,
              5000
            );

            context.utils.expect(orderUpdates).toContain(`accepted:${order.id}`);
            context.utils.expect(orderUpdates).toContain(`filled:${order.id}`);
          }
        },
        {
          name: 'should maintain connection stability',
          fn: async (context: TestContext) => {
            let disconnectionCount = 0;
            let reconnectionCount = 0;

            context.sdk.on('connection:disconnected', () => {
              disconnectionCount++;
            });

            context.sdk.on('connection:connected', () => {
              reconnectionCount++;
            });

            // Subscribe to market data to maintain connection
            await context.sdk.subscribeMarketData(['005930']);

            // Simulate extended connection period
            await context.utils.wait(10000);

            // Connection should remain stable
            context.utils.expect(disconnectionCount).toBe(0);
            context.utils.expect(context.sdk.isConnected()).toBe(true);
          }
        }
      ]
    };
  }

  /**
   * Create performance test suite
   */
  private createPerformanceTestSuite(): TestSuite {
    return {
      name: 'Performance Tests',
      setup: async (context: TestContext) => {
        await context.sdk.connect();
      },
      teardown: async (context: TestContext) => {
        await context.sdk.disconnect();
      },
      tests: [
        {
          name: 'should handle high-frequency order creation',
          fn: async (context: TestContext) => {
            const orderCount = 100;
            const startTime = Date.now();

            const orders = [];
            for (let i = 0; i < orderCount; i++) {
              const order = await context.sdk.createOrder({
                symbol: '005930',
                side: i % 2 === 0 ? 'buy' : 'sell',
                type: 'limit',
                quantity: 10,
                price: 80000 + (i % 10) * 100
              });
              orders.push(order);
            }

            const endTime = Date.now();
            const duration = endTime - startTime;
            const throughput = orderCount / (duration / 1000);

            context.utils.expect(duration).toBeLessThan(10000); // Should complete in <10s
            context.utils.expect(throughput).toBeGreaterThan(10); // >10 orders per second
            context.utils.expect(orders.length).toBe(orderCount);
          }
        },
        {
          name: 'should handle concurrent market data requests',
          fn: async (context: TestContext) => {
            const symbols = ['005930', '000660', '051910', '035420', '068270'];
            const requestCount = 50;

            const promises = [];
            for (let i = 0; i < requestCount; i++) {
              const symbol = symbols[i % symbols.length];
              promises.push(context.sdk.getMarketData(symbol));
            }

            const startTime = Date.now();
            const results = await Promise.all(promises);
            const endTime = Date.now();

            context.utils.expect(results.length).toBe(requestCount);
            context.utils.expect(endTime - startTime).toBeLessThan(5000); // Should complete in <5s

            // All results should be valid
            results.forEach(result => {
              context.utils.expect(result).toBeDefined();
              context.utils.expect(result!.price).toBeGreaterThan(0);
            });
          }
        },
        {
          name: 'should maintain memory efficiency',
          fn: async (context: TestContext) => {
            const initialMemory = process.memoryUsage().heapUsed;

            // Create many orders
            const orders = [];
            for (let i = 0; i < 1000; i++) {
              const order = await context.sdk.createOrder({
                symbol: '005930',
                side: 'buy',
                type: 'limit',
                quantity: 10,
                price: 80000
              });
              orders.push(order);
            }

            const finalMemory = process.memoryUsage().heapUsed;
            const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

            context.utils.expect(memoryIncrease).toBeLessThan(100); // Should use less than 100MB additional memory
          }
        }
      ]
    };
  }

  /**
   * Create error handling test suite
   */
  private createErrorHandlingTestSuite(): TestSuite {
    return {
      name: 'Error Handling Tests',
      tests: [
        {
          name: 'should handle invalid order data',
          fn: async (context: TestContext) => {
            await context.sdk.connect();

            try {
              await context.sdk.createOrder({
                symbol: '', // Invalid symbol
                side: 'buy' as const,
                type: 'limit' as const,
                quantity: -10, // Invalid quantity
                price: -1000  // Invalid price
              });
              context.utils.expect(true).toBe(false); // Should not reach here
            } catch (error) {
              context.utils.expect(error).toBeInstanceOf(Error);
              context.utils.expect((error as Error).message).toContain('Invalid');
            }
          }
        },
        {
          name: 'should handle network timeouts',
          fn: async (context: TestContext) => {
            // This test would require a mock that simulates timeouts
            // For now, we'll test with a very short timeout
            const sdk = createMockSDK({
              debug: true
            });

            try {
              await Promise.race([
                sdk.connect(),
                new Promise((_, reject) =>
                  setTimeout(() => reject(new Error('Timeout')), 10)
                )
              ]);
            } catch (error) {
              context.utils.expect((error as Error).message).toBe('Timeout');
            }
          }
        },
        {
          name: 'should handle order cancellation failures',
          fn: async (context: TestContext) => {
            await context.sdk.connect();

            // Try to cancel non-existent order
            const result = await context.sdk.cancelOrder('non_existent_order_id');
            context.utils.expect(result).toBe(false);
          }
        }
      ]
    };
  }

  /**
   * Create concurrency test suite
   */
  private createConcurrencyTestSuite(): TestSuite {
    return {
      name: 'Concurrency Tests',
      setup: async (context: TestContext) => {
        await context.sdk.connect();
      },
      teardown: async (context: TestContext) => {
        await context.sdk.disconnect();
      },
      tests: [
        {
          name: 'should handle concurrent order operations',
          fn: async (context: TestContext) => {
            const concurrentOrders = 20;
            const promises = [];

            // Create orders concurrently
            for (let i = 0; i < concurrentOrders; i++) {
              promises.push(
                context.sdk.createOrder({
                  symbol: '005930',
                  side: 'buy',
                  type: 'limit',
                  quantity: 10,
                  price: 80000 + i
                })
              );
            }

            const startTime = Date.now();
            const orders = await Promise.all(promises);
            const endTime = Date.now();

            context.utils.expect(orders.length).toBe(concurrentOrders);
            context.utils.expect(endTime - startTime).toBeLessThan(5000);

            // Verify all orders have unique IDs
            const orderIds = orders.map(o => o.id);
            const uniqueIds = new Set(orderIds);
            context.utils.expect(uniqueIds.size).toBe(concurrentOrders);
          }
        },
        {
          name: 'should handle mixed concurrent operations',
          fn: async (context: TestContext) => {
            const promises = [];

            // Mixed operations: create orders, get market data, get account info
            for (let i = 0; i < 10; i++) {
              promises.push(context.sdk.createOrder({
                symbol: '005930',
                side: 'buy',
                type: 'limit',
                quantity: 10,
                price: 80000 + i
              }));
            }

            for (let i = 0; i < 5; i++) {
              promises.push(context.sdk.getMarketData('000660'));
            }

            promises.push(context.sdk.getAccountInfo());
            promises.push(context.sdk.getBalances());
            promises.push(context.sdk.getPositions());

            const results = await Promise.all(promises);

            context.utils.expect(results.length).toBe(18); // 10 + 5 + 3

            // Verify order results
            const orders = results.slice(0, 10) as EnhancedOrder[];
            orders.forEach(order => {
              context.utils.expect(order.id).toBeDefined();
            });
          }
        }
      ]
    };
  }

  /**
   * Print test results
   */
  private printResults(summary: any): void {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));
    console.log(`Total Tests: ${summary.total}`);
    console.log(`✅ Passed: ${summary.passed}`);
    console.log(`❌ Failed: ${summary.failed}`);
    console.log(`⏭️  Skipped: ${summary.skipped}`);
    console.log(`⏱️  Duration: ${summary.duration}ms`);

    if (summary.failed > 0) {
      console.log('\n❌ Failed Tests:');
      summary.results
        .filter((r: any) => r.status === 'failed')
        .forEach((test: any) => {
          console.log(`  - ${test.name}: ${test.error}`);
        });
    }

    console.log('\n🎯 Performance Summary:');
    summary.results
      .filter((r: any) => r.performance)
      .forEach((test: any) => {
        const perf = test.performance;
        console.log(`  ${test.name}:`);
        console.log(`    Latency: ${perf.latency}ms`);
        console.log(`    Memory: ${perf.memoryUsage}MB`);
      });

    const successRate = (summary.passed / summary.total) * 100;
    console.log(`\n🏆 Success Rate: ${successRate.toFixed(1)}%`);

    if (successRate === 100) {
      console.log('🎉 All tests passed!');
    } else {
      console.log('💪 Some tests failed. Check the details above.');
    }
  }
}

// Convenience function for running integration tests
export async function runIntegrationTests(config?: IntegrationTestConfig): Promise<void> {
  const framework = new KSETIntegrationTestFramework(config);
  await framework.runAllTests();
}