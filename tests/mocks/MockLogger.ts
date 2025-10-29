import { Logger } from '../../src/errors';

/**
 * Mock Logger implementation for testing
 */
export class MockLogger implements Logger {
  public logs: Array<{ level: string; message: string; args?: any[] }> = [];

  info(message: string, ...args: any[]): void {
    this.logs.push({ level: 'info', message, args });
  }

  warn(message: string, ...args: any[]): void {
    this.logs.push({ level: 'warn', message, args });
  }

  error(message: string, ...args: any[]): void {
    this.logs.push({ level: 'error', message, args });
  }

  debug(message: string, ...args: any[]): void {
    this.logs.push({ level: 'debug', message, args });
  }

  clear(): void {
    this.logs = [];
  }

  getLogsByLevel(level: string): Array<{ message: string; args?: any[] }> {
    return this.logs
      .filter(log => log.level === level)
      .map(log => ({ message: log.message, args: log.args }));
  }

  hasLog(level: string, message: string): boolean {
    return this.logs.some(log =>
      log.level === level && log.message.includes(message)
    );
  }
}