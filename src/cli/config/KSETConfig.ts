/**
 * KSET Configuration Management
 * Handles configuration loading, validation, and management
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { KSETError } from '../../errors';

export interface ProviderConfig {
  enabled: boolean;
  apiKey?: string;
  apiSecret?: string;
  demo?: boolean;
  timeout?: number;
  retryAttempts?: number;
  rateLimit?: {
    requestsPerSecond: number;
    burstSize: number;
  };
}

export interface PluginConfig {
  name: string;
  version: string;
  enabled: boolean;
  config?: Record<string, any>;
}

export interface LoggingConfig {
  level: 'error' | 'warn' | 'info' | 'debug';
  format: 'json' | 'text';
  file?: string;
  maxFileSize?: string;
  maxFiles?: number;
}

export interface SecurityConfig {
  encryptionKey?: string;
  enableEncryption: boolean;
  secureStorage: boolean;
  auditLogging: boolean;
}

export interface PerformanceConfig {
  cacheEnabled: boolean;
  cacheTTL: number;
  maxConcurrentRequests: number;
  requestTimeout: number;
  enableMetrics: boolean;
}

export interface KSETConfiguration {
  version: string;
  providers: Record<string, ProviderConfig>;
  plugins: PluginConfig[];
  logging: LoggingConfig;
  security: SecurityConfig;
  performance: PerformanceConfig;
  environment: 'development' | 'staging' | 'production';
  debug: boolean;
}

export class KSETConfig {
  private config: KSETConfiguration;
  private configPath: string;
  private watchers: Array<() => void> = [];

  constructor(configPath?: string) {
    this.configPath = configPath || this.findConfigFile();
    this.config = this.loadConfig();
    this.watchConfig();
  }

  private findConfigFile(): string {
    const possiblePaths = [
      'kset.config.json',
      'kset.config.js',
      '.ksetrc.json',
      '.ksetrc.js',
      'kset.json'
    ];

    for (const filePath of possiblePaths) {
      const fullPath = path.resolve(process.cwd(), filePath);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    // Return default config path if none found
    return path.resolve(process.cwd(), 'kset.config.json');
  }

  private loadConfig(): KSETConfiguration {
    try {
      if (!fs.existsSync(this.configPath)) {
        return this.createDefaultConfig();
      }

      const configData = fs.readJsonSync(this.configPath);
      return this.validateAndMergeConfig(configData);
    } catch (error) {
      throw new KSETError(`Failed to load configuration: ${error.message}`);
    }
  }

  private createDefaultConfig(): KSETConfiguration {
    return {
      version: '1.0.0',
      providers: {
        kiwoom: {
          enabled: false,
          demo: true,
          timeout: 30000,
          retryAttempts: 3,
          rateLimit: {
            requestsPerSecond: 10,
            burstSize: 20
          }
        },
        koreainvestment: {
          enabled: false,
          demo: true,
          timeout: 30000,
          retryAttempts: 3,
          rateLimit: {
            requestsPerSecond: 15,
            burstSize: 30
          }
        }
      },
      plugins: [],
      logging: {
        level: 'info',
        format: 'text',
        maxFileSize: '10MB',
        maxFiles: 5
      },
      security: {
        enableEncryption: false,
        secureStorage: true,
        auditLogging: true
      },
      performance: {
        cacheEnabled: true,
        cacheTTL: 300,
        maxConcurrentRequests: 100,
        requestTimeout: 30000,
        enableMetrics: true
      },
      environment: 'development',
      debug: false
    };
  }

  private validateAndMergeConfig(configData: any): KSETConfiguration {
    const defaultConfig = this.createDefaultConfig();
    const merged = this.deepMerge(defaultConfig, configData);

    // Validate required fields
    this.validateConfig(merged);

    return merged;
  }

  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  private validateConfig(config: KSETConfiguration): void {
    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (!validEnvironments.includes(config.environment)) {
      throw new KSETError(`Invalid environment: ${config.environment}`);
    }

    // Validate logging level
    const validLogLevels = ['error', 'warn', 'info', 'debug'];
    if (!validLogLevels.includes(config.logging.level)) {
      throw new KSETError(`Invalid logging level: ${config.logging.level}`);
    }

    // Validate providers
    for (const [providerName, providerConfig] of Object.entries(config.providers)) {
      if (!providerConfig.enabled && !providerConfig.demo) {
        throw new KSETError(`Provider ${providerName} must be enabled or in demo mode`);
      }

      if (providerConfig.enabled && (!providerConfig.apiKey || !providerConfig.apiSecret)) {
        throw new KSETError(`Provider ${providerName} requires apiKey and apiSecret when enabled`);
      }
    }

    // Validate plugins
    for (const plugin of config.plugins) {
      if (!plugin.name || !plugin.version) {
        throw new KSETError('Plugin must have name and version');
      }
    }
  }

  private watchConfig(): void {
    if (fs.existsSync(this.configPath)) {
      fs.watchFile(this.configPath, async () => {
        try {
          this.config = this.loadConfig();
          this.notifyWatchers();
        } catch (error) {
          console.error('Failed to reload configuration:', error);
        }
      });
    }
  }

  private notifyWatchers(): void {
    this.watchers.forEach(watcher => {
      try {
        watcher();
      } catch (error) {
        console.error('Config watcher error:', error);
      }
    });
  }

  public get<T = any>(path: string): T {
    const keys = path.split('.');
    let value: any = this.config;

    for (const key of keys) {
      if (value === undefined || value === null) {
        return undefined as any;
      }
      value = value[key];
    }

    return value as T;
  }

  public set(path: string, value: any): void {
    const keys = path.split('.');
    let target: any = this.config;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in target)) {
        target[key] = {};
      }
      target = target[key];
    }

    target[keys[keys.length - 1]] = value;
  }

  public save(): void {
    try {
      fs.writeJsonSync(this.configPath, this.config, { spaces: 2 });
    } catch (error) {
      throw new KSETError(`Failed to save configuration: ${error.message}`);
    }
  }

  public addPlugin(plugin: PluginConfig): void {
    const existingIndex = this.config.plugins.findIndex(p => p.name === plugin.name);

    if (existingIndex >= 0) {
      this.config.plugins[existingIndex] = plugin;
    } else {
      this.config.plugins.push(plugin);
    }

    this.save();
  }

  public removePlugin(name: string): void {
    this.config.plugins = this.config.plugins.filter(p => p.name !== name);
    this.save();
  }

  public enableProvider(providerName: string, config: Partial<ProviderConfig>): void {
    if (!this.config.providers[providerName]) {
      this.config.providers[providerName] = {
        enabled: false,
        demo: true,
        timeout: 30000,
        retryAttempts: 3,
        rateLimit: {
          requestsPerSecond: 10,
          burstSize: 20
        }
      };
    }

    Object.assign(this.config.providers[providerName], config, { enabled: true });
    this.save();
  }

  public disableProvider(providerName: string): void {
    if (this.config.providers[providerName]) {
      this.config.providers[providerName].enabled = false;
      this.save();
    }
  }

  public onConfigChange(callback: () => void): void {
    this.watchers.push(callback);
  }

  public getConfig(): KSETConfiguration {
    return { ...this.config };
  }

  public isProduction(): boolean {
    return this.config.environment === 'production';
  }

  public isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  public getEnabledProviders(): string[] {
    return Object.entries(this.config.providers)
      .filter(([_, config]) => config.enabled || config.demo)
      .map(([name, _]) => name);
  }

  public getProviderConfig(providerName: string): ProviderConfig | undefined {
    return this.config.providers[providerName];
  }

  public validate(): void {
    this.validateConfig(this.config);
  }

  public createTemplate(outputPath: string, options: {
    providers?: string[];
    environment?: string;
    includePlugins?: string[];
  } = {}): void {
    const template = this.createDefaultConfig();

    if (options.environment) {
      template.environment = options.environment as any;
    }

    if (options.providers) {
      for (const provider of options.providers) {
        if (template.providers[provider]) {
          template.providers[provider].enabled = true;
        }
      }
    }

    if (options.includePlugins) {
      template.plugins = options.includePlugins.map(name => ({
        name,
        version: '1.0.0',
        enabled: true
      }));
    }

    fs.writeJsonSync(outputPath, template, { spaces: 2 });
  }
}