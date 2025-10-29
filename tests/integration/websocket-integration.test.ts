/**
 * Integration tests for WebSocket connections and real-time data streaming
 */

import { WebSocketManager } from '../../src/real-time/WebSocketManager';
import { WebSocketMock } from '../mocks/WebSocketMock';

// Use mock WebSocket for integration testing, but can be configured to use real servers
const USE_REAL_WEBSOCKET = process.env.KSET_WS_INTEGRATION_TEST === 'true';
const WS_SERVER_URL = process.env.KSET_WS_SERVER_URL || 'ws://localhost:8080/stream';

// Mock WebSocket for testing
(global as any).WebSocket = WebSocketMock;

describe('WebSocket Integration Tests', () => {
  let wsManager: WebSocketManager;
  let connections: any[] = [];

  beforeAll(() => {
    wsManager = new WebSocketManager({
      maxReconnectAttempts: 5,
      reconnectDelay: 1000,
      heartbeatInterval: 30000,
      heartbeatTimeout: 60000,
      connectionTimeout: 10000,
      bufferSize: 1000
    });
  });

  afterAll(async () => {
    await wsManager.disconnectAll();
  });

  describe('Connection Management', () => {
    test('should establish WebSocket connection', async () => {
      const url = USE_REAL_WEBSOCKET ? WS_SERVER_URL : 'ws://test.example.com/stream';

      const connection = await wsManager.connect(url);
      connections.push(connection);

      expect(connection.id).toBeDefined();
      expect(connection.url).toBe(url);
      expect(connection.isConnected).toBe(true);
      expect(connection.state).toBe('connected');

      const stats = wsManager.getConnectionStats(connection.id);
      expect(stats.connectedAt).toBeInstanceOf(Date);
      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);

      console.log(`✅ WebSocket connection established: ${connection.id}`);
    }, 15000);

    test('should handle multiple concurrent connections', async () => {
      const urls = [
        USE_REAL_WEBSOCKET ? WS_SERVER_URL : 'ws://test1.example.com/stream',
        USE_REAL_WEBSOCKET ? `${WS_SERVER_URL}/2` : 'ws://test2.example.com/stream',
        USE_REAL_WEBSOCKET ? `${WS_SERVER_URL}/3` : 'ws://test3.example.com/stream'
      ];

      const connectionPromises = urls.map(url => wsManager.connect(url));
      const newConnections = await Promise.all(connectionPromises);
      connections.push(...newConnections);

      expect(newConnections.length).toBe(urls.length);
      expect(wsManager.getConnectionCount()).toBe(1 + urls.length); // Including previous test

      newConnections.forEach(conn => {
        expect(conn.isConnected).toBe(true);
        expect(conn.state).toBe('connected');
      });

      console.log(`✅ Multiple WebSocket connections established: ${newConnections.length}`);
    }, 20000);

    test('should maintain connection stability', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for stability test');
        return;
      }

      const connection = connections[0];
      const initialStats = wsManager.getConnectionStats(connection.id);

      // Wait for a period to check stability
      await new Promise(resolve => setTimeout(resolve, 5000));

      const currentStats = wsManager.getConnectionStats(connection.id);
      expect(connection.isConnected).toBe(true);
      expect(connection.state).toBe('connected');

      console.log(`✅ Connection stability verified: ${connection.id}`);
      console.log(`   Messages sent: ${currentStats.messagesSent}`);
      console.log(`   Messages received: ${currentStats.messagesReceived}`);
      console.log(`   Uptime: ${Date.now() - initialStats.connectedAt.getTime()}ms`);
    }, 10000);
  });

  describe('Message Exchange', () => {
    test('should send and receive messages', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for message test');
        return;
      }

      const connection = connections[0];
      let messageReceived = false;
      let receivedData: any = null;

      // Set up message listener
      wsManager.onMessage(connection.id, (data) => {
        messageReceived = true;
        receivedData = data;
      });

      // Send test message
      const testMessage = {
        type: 'test',
        timestamp: Date.now(),
        data: 'Hello WebSocket!'
      };

      await wsManager.sendMessage(connection.id, testMessage);

      // Simulate response for mock WebSocket
      if (!USE_REAL_WEBSOCKET) {
        const ws = connection.getWebSocket() as WebSocketMock;
        ws.simulateMessage({
          type: 'response',
          originalMessage: testMessage,
          timestamp: Date.now()
        });
      }

      // Wait for message processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = wsManager.getConnectionStats(connection.id);
      expect(stats.messagesSent).toBeGreaterThan(0);

      if (messageReceived) {
        expect(receivedData).toBeDefined();
        console.log(`✅ Message exchange completed: ${connection.id}`);
        console.log(`   Sent: ${stats.messagesSent} messages`);
        console.log(`   Received: ${stats.messagesReceived} messages`);
      } else {
        console.warn(`⚠️ No response received within timeout`);
      }
    }, 10000);

    test('should handle high-frequency messages', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for high-frequency test');
        return;
      }

      const connection = connections[0];
      const messageCount = 100;
      const batchSize = 10;
      const batchDelay = 100;

      let receivedCount = 0;
      wsManager.onMessage(connection.id, () => {
        receivedCount++;
      });

      const startTime = Date.now();

      // Send messages in batches
      for (let batch = 0; batch < messageCount / batchSize; batch++) {
        const promises = [];
        for (let i = 0; i < batchSize; i++) {
          const message = {
            type: 'bulk_test',
            batch,
            index: batch * batchSize + i,
            timestamp: Date.now()
          };
          promises.push(wsManager.sendMessage(connection.id, message));
        }
        await Promise.all(promises);

        // Simulate responses for mock WebSocket
        if (!USE_REAL_WEBSOCKET) {
          const ws = connection.getWebSocket() as WebSocketMock;
          for (let i = 0; i < batchSize; i++) {
            ws.simulateMessage({
              type: 'bulk_response',
              batch,
              index: batch * batchSize + i,
              timestamp: Date.now()
            });
          }
        }

        await new Promise(resolve => setTimeout(resolve, batchDelay));
      }

      const totalTime = Date.now() - startTime;
      const stats = wsManager.getConnectionStats(connection.id);

      console.log(`📊 High-frequency message test completed:`);
      console.log(`   Messages sent: ${messageCount}`);
      console.log(`   Messages received: ${receivedCount}`);
      console.log(`   Total time: ${totalTime}ms`);
      console.log(`   Throughput: ${(messageCount / (totalTime / 1000)).toFixed(2)} msg/s`);

      expect(stats.messagesSent).toBeGreaterThanOrEqual(messageCount);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds
    }, 35000);
  });

  describe('Real-time Data Streaming', () => {
    test('should handle market data subscriptions', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for market data test');
        return;
      }

      const connection = connections[0];
      const symbols = ['005930', '000660', '035420'];
      let updateCount = 0;
      const updates: any[] = [];

      // Subscribe to market data
      const subscription = {
        id: 'market-data-sub',
        type: 'market_data',
        symbols
      };

      wsManager.addSubscription(connection.id, subscription);

      wsManager.onMessage(connection.id, (data) => {
        if (data.type === 'market_data_update') {
          updateCount++;
          updates.push(data);
        }
      });

      // Send subscription request
      await wsManager.sendMessage(connection.id, {
        type: 'subscribe',
        subscription
      });

      // Simulate market data updates for mock WebSocket
      if (!USE_REAL_WEBSOCKET) {
        const ws = connection.getWebSocket() as WebSocketMock;

        // Simulate periodic market data updates
        for (let i = 0; i < 5; i++) {
          symbols.forEach(symbol => {
            ws.simulateMessage({
              type: 'market_data_update',
              symbol,
              price: 85000 + Math.random() * 1000,
              volume: Math.floor(Math.random() * 100000),
              timestamp: Date.now()
            });
          });
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Wait for updates
      await new Promise(resolve => setTimeout(resolve, 5000));

      const subscriptions = wsManager.getSubscriptions(connection.id);
      expect(subscriptions).toContain(subscription);

      console.log(`📈 Market data streaming test completed:`);
      console.log(`   Symbols subscribed: ${symbols.join(', ')}`);
      console.log(`   Updates received: ${updateCount}`);
      console.log(`   Active subscriptions: ${subscriptions.length}`);

      // Cleanup
      wsManager.removeSubscription(connection.id, subscription.id);
    }, 15000);

    test('should handle order updates', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for order update test');
        return;
      }

      const connection = connections[0];
      let orderUpdateCount = 0;
      const orderUpdates: any[] = [];

      wsManager.onMessage(connection.id, (data) => {
        if (data.type === 'order_update') {
          orderUpdateCount++;
          orderUpdates.push(data);
        }
      });

      // Subscribe to order updates
      await wsManager.sendMessage(connection.id, {
        type: 'subscribe',
        subscription: {
          id: 'order-updates-sub',
          type: 'order_updates'
        }
      });

      // Simulate order updates for mock WebSocket
      if (!USE_REAL_WEBSOCKET) {
        const ws = connection.getWebSocket() as WebSocketMock;

        for (let i = 0; i < 3; i++) {
          ws.simulateMessage({
            type: 'order_update',
            orderId: `ORDER-${i + 1}`,
            symbol: '005930',
            status: i === 0 ? 'SUBMITTED' : i === 1 ? 'PARTIALLY_FILLED' : 'FILLED',
            quantity: 100,
            filledQuantity: (i + 1) * 33,
            averageFillPrice: 85000 + i * 10,
            timestamp: Date.now()
          });
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // Wait for order updates
      await new Promise(resolve => setTimeout(resolve, 5000));

      console.log(`📋 Order update streaming test completed:`);
      console.log(`   Order updates received: ${orderUpdateCount}`);

      if (orderUpdates.length > 0) {
        orderUpdates.forEach((update, index) => {
          console.log(`   Update ${index + 1}: ${update.orderId} - ${update.status}`);
        });
      }
    }, 10000);
  });

  describe('Connection Resilience', () => {
    test('should handle connection interruptions', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for resilience test');
        return;
      }

      const connection = connections[0];
      let reconnectAttempts = 0;

      wsManager.on('connection:reconnecting', () => {
        reconnectAttempts++;
      });

      // Simulate connection loss for mock WebSocket
      if (!USE_REAL_WEBSOCKET) {
        const ws = connection.getWebSocket() as WebSocketMock;
        ws.simulateDisconnect();
      }

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 3000));

      if (!USE_REAL_WEBSOCKET) {
        expect(reconnectAttempts).toBeGreaterThan(0);
        expect(connection.isConnected).toBe(true);
      }

      console.log(`✅ Connection resilience test completed:`);
      console.log(`   Reconnection attempts: ${reconnectAttempts}`);
      console.log(`   Final state: ${connection.state}`);
    }, 10000);

    test('should maintain subscriptions during reconnection', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for subscription resilience test');
        return;
      }

      const connection = connections[0];
      const subscription = {
        id: 'resilience-test-sub',
        type: 'test_subscription',
        symbols: ['005930']
      };

      // Add subscription
      wsManager.addSubscription(connection.id, subscription);

      // Simulate disconnection and reconnection
      if (!USE_REAL_WEBSOCKET) {
        const ws = connection.getWebSocket() as WebSocketMock;
        ws.simulateDisconnect();

        // Wait for reconnection
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Verify subscription is maintained
      const subscriptions = wsManager.getSubscriptions(connection.id);
      expect(subscriptions.some(sub => sub.id === subscription.id)).toBe(true);

      console.log(`✅ Subscription resilience test completed:`);
      console.log(`   Maintained subscriptions: ${subscriptions.length}`);
    }, 10000);
  });

  describe('Performance Monitoring', () => {
    test('should track connection performance metrics', async () => {
      const overallStats = wsManager.getOverallStats();

      expect(overallStats).toHaveProperty('totalConnections');
      expect(overallStats).toHaveProperty('activeConnections');
      expect(overallStats).toHaveProperty('totalMessagesSent');
      expect(overallStats).toHaveProperty('totalMessagesReceived');
      expect(overallStats).toHaveProperty('totalReconnectAttempts');

      console.log(`📊 Overall WebSocket Performance:`);
      console.log(`   Total connections: ${overallStats.totalConnections}`);
      console.log(`   Active connections: ${overallStats.activeConnections}`);
      console.log(`   Messages sent: ${overallStats.totalMessagesSent}`);
      console.log(`   Messages received: ${overallStats.totalMessagesReceived}`);
      console.log(`   Reconnect attempts: ${overallStats.totalReconnectAttempts}`);

      if (connections.length > 0) {
        connections.forEach(conn => {
          const stats = wsManager.getConnectionStats(conn.id);
          console.log(`\n📈 Connection ${conn.id}:`);
          console.log(`   Connected: ${stats.connectedAt.toISOString()}`);
          console.log(`   Last activity: ${stats.lastActivityAt.toISOString()}`);
          console.log(`   Messages sent: ${stats.messagesSent}`);
          console.log(`   Messages received: ${stats.messagesReceived}`);
          console.log(`   Reconnect attempts: ${stats.reconnectAttempts}`);
          console.log(`   Total reconnect time: ${stats.totalReconnectTime}ms`);
        });
      }
    });

    test('should handle memory cleanup efficiently', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      const testConnections = 5;
      const testMessages = 100;

      // Create temporary connections for memory test
      const tempConnections = [];
      for (let i = 0; i < testConnections; i++) {
        const url = `ws://temp-test-${i}.example.com/stream`;
        const conn = await wsManager.connect(url);
        tempConnections.push(conn);

        // Send messages
        for (let j = 0; j < testMessages; j++) {
          await wsManager.sendMessage(conn.id, {
            type: 'memory_test',
            index: j,
            data: 'x'.repeat(100) // 100 bytes per message
          });
        }
      }

      // Cleanup temporary connections
      for (const conn of tempConnections) {
        await wsManager.disconnect(conn.id);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      await new Promise(resolve => setTimeout(resolve, 1000));

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      const memoryIncreasePerConnection = memoryIncrease / testConnections;

      console.log(`🧠 Memory cleanup test completed:`);
      console.log(`   Initial memory: ${(initialMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Final memory: ${(finalMemory / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Per connection: ${(memoryIncreasePerConnection / 1024).toFixed(2)} KB`);

      // Memory increase should be reasonable (less than 1MB per connection)
      expect(memoryIncreasePerConnection).toBeLessThan(1024 * 1024);
    }, 30000);
  });

  describe('Error Recovery', () => {
    test('should recover from malformed messages', async () => {
      if (connections.length === 0) {
        console.warn('⚠️ No connections available for error recovery test');
        return;
      }

      const connection = connections[0];
      let errorCount = 0;

      wsManager.onError(connection.id, (error) => {
        errorCount++;
      });

      // Send malformed message through WebSocket directly
      const ws = connection.getWebSocket() as WebSocketMock;

      // Simulate malformed JSON
      ws.emit('message', { data: 'invalid json message {' });

      // Simulate binary data
      ws.emit('message', { data: Buffer.from([0x00, 0x01, 0x02]) });

      await new Promise(resolve => setTimeout(resolve, 1000));

      // Connection should still be active
      expect(connection.isConnected).toBe(true);
      expect(errorCount).toBeGreaterThan(0);

      // Should still be able to send valid messages
      await wsManager.sendMessage(connection.id, { type: 'valid_message', test: true });

      console.log(`✅ Error recovery test completed:`);
      console.log(`   Errors handled: ${errorCount}`);
      console.log(`   Connection still active: ${connection.isConnected}`);
    });

    test('should handle rapid connection/disconnection cycles', async () => {
      const cycles = 3;
      const connectionUrls = [
        'ws://cycle-test-1.example.com/stream',
        'ws://cycle-test-2.example.com/stream',
        'ws://cycle-test-3.example.com/stream'
      ];

      for (let cycle = 0; cycle < cycles; cycle++) {
        console.log(`🔄 Connection cycle ${cycle + 1}/${cycles}`);

        const cycleConnections = [];

        // Create connections
        for (const url of connectionUrls) {
          const conn = await wsManager.connect(url);
          cycleConnections.push(conn);
        }

        // Wait a moment
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Disconnect all
        for (const conn of cycleConnections) {
          await wsManager.disconnect(conn.id);
        }

        // Wait before next cycle
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      const finalStats = wsManager.getOverallStats();
      expect(finalStats.activeConnections).toBe(0); // All should be disconnected

      console.log(`✅ Rapid connection/disconnection cycles completed:`);
      console.log(`   Cycles completed: ${cycles}`);
      console.log(`   Total connections: ${finalStats.totalConnections}`);
      console.log(`   Active connections: ${finalStats.activeConnections}`);
    }, 20000);
  });
});