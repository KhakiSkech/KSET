/**
 * Unit tests for WebSocketManager
 */

import { WebSocketManager } from '../../../src/real-time/WebSocketManager';
import { WebSocketMock } from '../../mocks/WebSocketMock';

// Mock the global WebSocket
(global as any).WebSocket = WebSocketMock;

describe('WebSocketManager', () => {
  let wsManager: WebSocketManager;
  let mockWebSocket: WebSocketMock;

  beforeEach(() => {
    wsManager = new WebSocketManager({
      maxReconnectAttempts: 3,
      reconnectDelay: 100,
      heartbeatInterval: 50,
      connectionTimeout: 1000
    });
  });

  afterEach(async () => {
    await wsManager.disconnectAll();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      expect(connection.id).toBeDefined();
      expect(connection.url).toBe(url);
      expect(connection.isConnected).toBe(true);
      expect(connection.state).toBe('connected');
    });

    it('should handle connection timeout', async () => {
      const wsManager = new WebSocketManager({
        connectionTimeout: 50
      });

      // Mock WebSocket to never connect
      const originalWebSocket = global.WebSocket;
      (global as any).WebSocket = class extends WebSocketMock {
        constructor(url: string) {
          super(url);
          // Don't simulate connection
        }
      };

      const url = 'ws://test.example.com/stream';

      await expect(
        wsManager.connect(url)
      ).rejects.toThrow('Connection timeout');

      // Restore original WebSocket
      global.WebSocket = originalWebSocket;
    });

    it('should handle connection errors', async () => {
      const url = 'ws://invalid-url';

      await expect(
        wsManager.connect(url)
      ).rejects.toThrow();
    });

    it('should disconnect specific connection', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      expect(connection.isConnected).toBe(true);

      await wsManager.disconnect(connection.id);

      expect(connection.isConnected).toBe(false);
      expect(connection.state).toBe('disconnected');
    });

    it('should disconnect all connections', async () => {
      const url1 = 'ws://test.example.com/stream1';
      const url2 = 'ws://test.example.com/stream2';

      await wsManager.connect(url1);
      await wsManager.connect(url2);

      expect(wsManager.getConnectionCount()).toBe(2);

      await wsManager.disconnectAll();

      expect(wsManager.getConnectionCount()).toBe(0);
    });

    it('should prevent duplicate connections to same URL', async () => {
      const url = 'ws://test.example.com/stream';

      const connection1 = await wsManager.connect(url);
      const connection2 = await wsManager.connect(url);

      expect(connection1.id).toBe(connection2.id);
      expect(wsManager.getConnectionCount()).toBe(1);
    });
  });

  describe('Message Handling', () => {
    it('should send messages through WebSocket', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const message = { type: 'subscribe', symbol: '005930' };
      await wsManager.sendMessage(connection.id, message);

      const ws = connection.getWebSocket() as WebSocketMock;
      const sentMessages = ws.getMessages();

      expect(sentMessages).toHaveLength(1);
      expect(sentMessages[0]).toEqual(message);
    });

    it('should handle message sending errors', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      // Close the WebSocket to trigger error
      const ws = connection.getWebSocket() as WebSocketMock;
      ws.simulateDisconnect();

      const message = { type: 'subscribe', symbol: '005930' };

      await expect(
        wsManager.sendMessage(connection.id, message)
      ).rejects.toThrow();
    });

    it('should receive messages from WebSocket', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const messageCallback = jest.fn();
      wsManager.onMessage(connection.id, messageCallback);

      const receivedMessage = { type: 'price', symbol: '005930', price: 85000 };
      const ws = connection.getWebSocket() as WebSocketMock;
      ws.simulateMessage(receivedMessage);

      expect(messageCallback).toHaveBeenCalledWith(receivedMessage);
    });

    it('should handle JSON parsing errors for messages', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const errorCallback = jest.fn();
      wsManager.onError(connection.id, errorCallback);

      const ws = connection.getWebSocket() as WebSocketMock;

      // Simulate invalid JSON message
      ws.emit('message', { data: 'invalid json{' });

      expect(errorCallback).toHaveBeenCalled();
    });
  });

  describe('Event Management', () => {
    it('should handle connection events', async () => {
      const url = 'ws://test.example.com/stream';

      const openCallback = jest.fn();
      const closeCallback = jest.fn();
      const errorCallback = jest.fn();

      wsManager.on('connection:open', openCallback);
      wsManager.on('connection:close', closeCallback);
      wsManager.on('connection:error', errorCallback);

      const connection = await wsManager.connect(url);

      expect(openCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: connection.id,
          url,
          timestamp: expect.any(Date)
        })
      );

      await wsManager.disconnect(connection.id);

      expect(closeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          id: connection.id,
          code: expect.any(Number),
          reason: expect.any(String),
          timestamp: expect.any(Date)
        })
      );
    });

    it('should handle multiple event listeners', async () => {
      const url = 'ws://test.example.com/stream';

      const callback1 = jest.fn();
      const callback2 = jest.fn();

      wsManager.on('connection:open', callback1);
      wsManager.on('connection:open', callback2);

      await wsManager.connect(url);

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
    });

    it('should remove event listeners', async () => {
      const url = 'ws://test.example.com/stream';

      const callback = jest.fn();

      wsManager.on('connection:open', callback);
      wsManager.off('connection:open', callback);

      await wsManager.connect(url);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should emit custom events', () => {
      const callback = jest.fn();
      wsManager.on('custom:event', callback);

      const eventData = { type: 'test', data: 'example' };
      wsManager.emit('custom:event', eventData);

      expect(callback).toHaveBeenCalledWith(eventData);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection on connection loss', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const reconnectCallback = jest.fn();
      wsManager.on('connection:reconnecting', reconnectCallback);

      // Simulate connection loss
      const ws = connection.getWebSocket() as WebSocketMock;
      ws.simulateDisconnect();

      // Wait for reconnection attempt
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(reconnectCallback).toHaveBeenCalled();
      expect(connection.state).toBe('connected');
    });

    it('should respect maximum reconnection attempts', async () => {
      const wsManager = new WebSocketManager({
        maxReconnectAttempts: 2,
        reconnectDelay: 10
      });

      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      // Mock WebSocket to always fail
      const originalWebSocket = global.WebSocket;
      let connectionAttempts = 0;
      (global as any).WebSocket = class extends WebSocketMock {
        constructor(url: string) {
          super(url);
          connectionAttempts++;
          if (connectionAttempts > 1) {
            // Simulate connection failure after first attempt
            setTimeout(() => this.simulateError(new Error('Connection failed')), 10);
          }
        }
      };

      const ws = connection.getWebSocket() as WebSocketMock;
      ws.simulateDisconnect();

      // Wait for reconnection attempts
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connection.state).toBe('failed');
      expect(connectionAttempts).toBeGreaterThan(2);

      // Restore original WebSocket
      global.WebSocket = originalWebSocket;
    });

    it('should stop reconnection on manual disconnect', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const reconnectCallback = jest.fn();
      wsManager.on('connection:reconnecting', reconnectCallback);

      // Manually disconnect
      await wsManager.disconnect(connection.id);

      // Wait longer than reconnection delay
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(reconnectCallback).not.toHaveBeenCalled();
      expect(connection.state).toBe('disconnected');
    });
  });

  describe('Heartbeat Mechanism', () => {
    it('should send heartbeat messages', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const ws = connection.getWebSocket() as WebSocketMock;

      // Wait for heartbeat
      await new Promise(resolve => setTimeout(resolve, 100));

      const sentMessages = ws.getMessages();
      const heartbeatMessages = sentMessages.filter(msg => msg.type === 'heartbeat');

      expect(heartbeatMessages.length).toBeGreaterThan(0);
    });

    it('should handle heartbeat responses', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const ws = connection.getWebSocket() as WebSocketMock;

      // Simulate heartbeat response
      ws.simulateMessage({ type: 'heartbeat_response', timestamp: Date.now() });

      // Wait for next heartbeat to verify connection is still alive
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(connection.state).toBe('connected');
    });

    it('should detect connection failure on heartbeat timeout', async () => {
      const wsManager = new WebSocketManager({
        heartbeatInterval: 50,
        heartbeatTimeout: 100
      });

      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const reconnectCallback = jest.fn();
      wsManager.on('connection:reconnecting', reconnectCallback);

      // Wait for heartbeat timeout
      await new Promise(resolve => setTimeout(resolve, 200));

      expect(reconnectCallback).toHaveBeenCalled();
    });
  });

  describe('Connection Statistics', () => {
    it('should track connection statistics', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const stats = wsManager.getConnectionStats(connection.id);

      expect(stats).toHaveProperty('connectedAt');
      expect(stats).toHaveProperty('lastActivityAt');
      expect(stats).toHaveProperty('messagesSent');
      expect(stats).toHaveProperty('messagesReceived');
      expect(stats).toHaveProperty('reconnectAttempts');
      expect(stats).toHaveProperty('totalReconnectTime');

      expect(stats.messagesSent).toBe(0);
      expect(stats.messagesReceived).toBe(0);
      expect(stats.reconnectAttempts).toBe(0);
    });

    it('should update message statistics', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      // Send a message
      await wsManager.sendMessage(connection.id, { type: 'test' });

      let stats = wsManager.getConnectionStats(connection.id);
      expect(stats.messagesSent).toBe(1);

      // Simulate receiving a message
      const ws = connection.getWebSocket() as WebSocketMock;
      ws.simulateMessage({ type: 'response' });

      stats = wsManager.getConnectionStats(connection.id);
      expect(stats.messagesReceived).toBe(1);
    });

    it('should provide overall manager statistics', async () => {
      const url1 = 'ws://test.example.com/stream1';
      const url2 = 'ws://test.example.com/stream2';

      await wsManager.connect(url1);
      await wsManager.connect(url2);

      const overallStats = wsManager.getOverallStats();

      expect(overallStats).toHaveProperty('totalConnections');
      expect(overallStats).toHaveProperty('activeConnections');
      expect(overallStats).toHaveProperty('totalMessagesSent');
      expect(overallStats).toHaveProperty('totalMessagesReceived');
      expect(overallStats).toHaveProperty('totalReconnectAttempts');

      expect(overallStats.totalConnections).toBe(2);
      expect(overallStats.activeConnections).toBe(2);
    });
  });

  describe('Subscription Management', () => {
    it('should manage subscriptions per connection', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const subscription = {
        id: 'sub-001',
        type: 'price',
        symbols: ['005930', '000660']
      };

      wsManager.addSubscription(connection.id, subscription);

      const subscriptions = wsManager.getSubscriptions(connection.id);
      expect(subscriptions).toHaveLength(1);
      expect(subscriptions[0]).toEqual(subscription);
    });

    it('should remove subscriptions', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const subscription = {
        id: 'sub-001',
        type: 'price',
        symbols: ['005930', '000660']
      };

      wsManager.addSubscription(connection.id, subscription);
      wsManager.removeSubscription(connection.id, subscription.id);

      const subscriptions = wsManager.getSubscriptions(connection.id);
      expect(subscriptions).toHaveLength(0);
    });

    it('should clear all subscriptions on disconnect', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const subscription = {
        id: 'sub-001',
        type: 'price',
        symbols: ['005930', '000660']
      };

      wsManager.addSubscription(connection.id, subscription);
      await wsManager.disconnect(connection.id);

      const subscriptions = wsManager.getSubscriptions(connection.id);
      expect(subscriptions).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle WebSocket errors gracefully', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const errorCallback = jest.fn();
      wsManager.onError(connection.id, errorCallback);

      const ws = connection.getWebSocket() as WebSocketMock;
      const error = new Error('WebSocket error');
      ws.simulateError(error);

      expect(errorCallback).toHaveBeenCalledWith(error);
    });

    it('should handle invalid connection IDs', async () => {
      const invalidId = 'invalid-connection-id';

      await expect(
        wsManager.sendMessage(invalidId, { type: 'test' })
      ).rejects.toThrow('Connection not found');

      await expect(
        wsManager.disconnect(invalidId)
      ).rejects.toThrow('Connection not found');
    });

    it('should handle malformed messages', async () => {
      const url = 'ws://test.example.com/stream';
      const connection = await wsManager.connect(url);

      const errorCallback = jest.fn();
      wsManager.onError(connection.id, errorCallback);

      const ws = connection.getWebSocket() as WebSocketMock;

      // Send non-serializable data
      await expect(
        wsManager.sendMessage(connection.id, { circular: {} })
      ).rejects.toThrow();

      // Send circular reference
      const obj: any = { name: 'test' };
      obj.self = obj;
      await expect(
        wsManager.sendMessage(connection.id, obj)
      ).rejects.toThrow();
    });
  });
});