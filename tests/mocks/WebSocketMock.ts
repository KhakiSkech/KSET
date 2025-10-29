/**
 * WebSocket mock for testing
 */
export class WebSocketMock {
  public url: string;
  public readyState: number = WebSocket.CONNECTING;
  public listeners: Map<string, Function[]> = new Map();
  public messages: any[] = [];
  public connected: boolean = false;

  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  constructor(url: string) {
    this.url = url;

    // Simulate connection after a delay
    setTimeout(() => {
      this.readyState = WebSocketMock.OPEN;
      this.connected = true;
      this.emit('open');
    }, 50);
  }

  addEventListener(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  removeEventListener(event: string, listener: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      const index = eventListeners.indexOf(listener);
      if (index > -1) {
        eventListeners.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`WebSocket event listener error for ${event}:`, error);
        }
      });
    }
  }

  send(data: string): void {
    if (this.readyState !== WebSocketMock.OPEN) {
      throw new Error('WebSocket is not open');
    }

    this.messages.push(JSON.parse(data));
  }

  close(code?: number, reason?: string): void {
    this.readyState = WebSocketMock.CLOSING;
    this.connected = false;

    setTimeout(() => {
      this.readyState = WebSocketMock.CLOSED;
      this.emit('close', { code, reason });
    }, 10);
  }

  // Helper methods for testing
  simulateMessage(data: any): void {
    if (this.connected) {
      this.emit('message', { data: JSON.stringify(data) });
    }
  }

  simulateError(error: Error): void {
    this.emit('error', error);
  }

  simulateDisconnect(): void {
    this.connected = false;
    this.readyState = WebSocketMock.CLOSED;
    this.emit('close');
  }

  getMessages(): any[] {
    return [...this.messages];
  }

  clearMessages(): void {
    this.messages = [];
  }

  hasListener(event: string): boolean {
    const eventListeners = this.listeners.get(event);
    return eventListeners && eventListeners.length > 0;
  }

  getListenerCount(event: string): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.length : 0;
  }
}