/**
 * KSET Plugin Manager
 * Handles plugin lifecycle, installation, and management
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { EventEmitter } from 'events';
import { KSETError } from '../errors';

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  license: string;
  main: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    kset?: string;
  };
  kset?: {
    type: 'provider' | 'strategy' | 'algorithm' | 'utility' | 'middleware';
    hooks?: string[];
    config?: Record<string, any>;
    compatibility?: string[];
  };
  repository?: {
    type: string;
    url: string;
  };
  keywords?: string[];
}

export interface LoadedPlugin {
  manifest: PluginManifest;
  instance: any;
  config: Record<string, any>;
  enabled: boolean;
  loadedAt: Date;
}

export interface PluginRegistry {
  name: string;
  version: string;
  url: string;
  description: string;
  author: string;
  downloads: number;
  rating: number;
  lastUpdated: Date;
  tags: string[];
}

export class PluginManager extends EventEmitter {
  private plugins: Map<string, LoadedPlugin> = new Map();
  private pluginsDirectory: string;
  private registryUrl: string;
  private loadingPromises: Map<string, Promise<LoadedPlugin>> = new Map();

  constructor(options: {
    pluginsDirectory?: string;
    registryUrl?: string;
  } = {}) {
    super();
    this.pluginsDirectory = options.pluginsDirectory || path.join(process.cwd(), 'plugins');
    this.registryUrl = options.registryUrl || 'https://registry.kset.dev';

    this.ensurePluginsDirectory();
  }

  private ensurePluginsDirectory(): void {
    fs.ensureDirSync(this.pluginsDirectory);
  }

  /**
   * Install a plugin from the registry or local path
   */
  public async installPlugin(source: string, options: {
    version?: string;
    force?: boolean;
    config?: Record<string, any>;
  } = {}): Promise<void> {
    try {
      this.emit('plugin:install:start', { source, options });

      const pluginPath = await this.resolvePluginSource(source, options);
      const manifest = await this.loadManifest(pluginPath);

      // Check for conflicts
      if (this.plugins.has(manifest.name) && !options.force) {
        throw new KSETError(`Plugin ${manifest.name} is already installed. Use --force to reinstall.`);
      }

      // Validate compatibility
      await this.validateCompatibility(manifest);

      // Install dependencies
      await this.installDependencies(manifest, pluginPath);

      // Load the plugin
      const loadedPlugin = await this.loadPlugin(pluginPath, manifest, options.config);

      // Register the plugin
      this.plugins.set(manifest.name, loadedPlugin);

      this.emit('plugin:install:success', { manifest, plugin: loadedPlugin });
    } catch (error) {
      this.emit('plugin:install:error', { source, error });
      throw new KSETError(`Failed to install plugin ${source}: ${error.message}`);
    }
  }

  /**
   * Uninstall a plugin
   */
  public async uninstallPlugin(name: string, options: {
    removeConfig?: boolean;
  } = {}): Promise<void> {
    try {
      const plugin = this.plugins.get(name);
      if (!plugin) {
        throw new KSETError(`Plugin ${name} is not installed`);
      }

      this.emit('plugin:uninstall:start', { name, plugin });

      // Call plugin cleanup if available
      if (plugin.instance && typeof plugin.instance.cleanup === 'function') {
        await plugin.instance.cleanup();
      }

      // Remove from registry
      this.plugins.delete(name);

      // Remove plugin directory
      const pluginPath = path.join(this.pluginsDirectory, name);
      if (await fs.pathExists(pluginPath)) {
        await fs.remove(pluginPath);
      }

      // Remove config if requested
      if (options.removeConfig) {
        await this.removePluginConfig(name);
      }

      this.emit('plugin:uninstall:success', { name });
    } catch (error) {
      this.emit('plugin:uninstall:error', { name, error });
      throw new KSETError(`Failed to uninstall plugin ${name}: ${error.message}`);
    }
  }

  /**
   * Enable a plugin
   */
  public async enablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new KSETError(`Plugin ${name} is not installed`);
    }

    if (plugin.enabled) {
      return; // Already enabled
    }

    try {
      // Call plugin initialization if available
      if (plugin.instance && typeof plugin.instance.initialize === 'function') {
        await plugin.instance.initialize(plugin.config);
      }

      plugin.enabled = true;
      this.emit('plugin:enabled', { name, plugin });
    } catch (error) {
      throw new KSETError(`Failed to enable plugin ${name}: ${error.message}`);
    }
  }

  /**
   * Disable a plugin
   */
  public async disablePlugin(name: string): Promise<void> {
    const plugin = this.plugins.get(name);
    if (!plugin) {
      throw new KSETError(`Plugin ${name} is not installed`);
    }

    if (!plugin.enabled) {
      return; // Already disabled
    }

    try {
      // Call plugin shutdown if available
      if (plugin.instance && typeof plugin.instance.shutdown === 'function') {
        await plugin.instance.shutdown();
      }

      plugin.enabled = false;
      this.emit('plugin:disabled', { name, plugin });
    } catch (error) {
      throw new KSETError(`Failed to disable plugin ${name}: ${error.message}`);
    }
  }

  /**
   * Get a loaded plugin
   */
  public getPlugin(name: string): LoadedPlugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Get all loaded plugins
   */
  public getAllPlugins(): Map<string, LoadedPlugin> {
    return new Map(this.plugins);
  }

  /**
   * Get enabled plugins
   */
  public getEnabledPlugins(): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(plugin => plugin.enabled);
  }

  /**
   * Get plugins by type
   */
  public getPluginsByType(type: string): LoadedPlugin[] {
    return Array.from(this.plugins.values()).filter(
      plugin => plugin.manifest.kset?.type === type
    );
  }

  /**
   * Search for plugins in the registry
   */
  public async searchPlugins(query: string, options: {
    limit?: number;
    offset?: number;
    type?: string;
  } = {}): Promise<PluginRegistry[]> {
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: (options.limit || 20).toString(),
        offset: (options.offset || 0).toString()
      });

      if (options.type) {
        searchParams.append('type', options.type);
      }

      const response = await fetch(`${this.registryUrl}/search?${searchParams}`);
      if (!response.ok) {
        throw new Error(`Registry search failed: ${response.statusText}`);
      }

      const results = await response.json();
      return results.plugins || [];
    } catch (error) {
      throw new KSETError(`Failed to search plugins: ${error.message}`);
    }
  }

  /**
   * Get plugin information from registry
   */
  public async getPluginInfo(name: string): Promise<PluginRegistry> {
    try {
      const response = await fetch(`${this.registryUrl}/plugin/${name}`);
      if (!response.ok) {
        throw new Error(`Plugin not found: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new KSETError(`Failed to get plugin info for ${name}: ${error.message}`);
    }
  }

  /**
   * Load all plugins from the plugins directory
   */
  public async loadAllPlugins(): Promise<void> {
    try {
      const pluginDirs = await fs.readdir(this.pluginsDirectory);

      for (const dirName of pluginDirs) {
        const pluginPath = path.join(this.pluginsDirectory, dirName);
        const stat = await fs.stat(pluginPath);

        if (stat.isDirectory()) {
          try {
            await this.loadPluginFromDirectory(pluginPath);
          } catch (error) {
            console.warn(`Failed to load plugin from ${dirName}:`, error.message);
          }
        }
      }
    } catch (error) {
      throw new KSETError(`Failed to load plugins: ${error.message}`);
    }
  }

  /**
   * Execute a hook across all enabled plugins
   */
  public async executeHook(hookName: string, ...args: any[]): Promise<any[]> {
    const results = [];
    const enabledPlugins = this.getEnabledPlugins();

    for (const plugin of enabledPlugins) {
      if (plugin.instance && typeof plugin.instance[hookName] === 'function') {
        try {
          const result = await plugin.instance[hookName](...args);
          results.push({ plugin: plugin.manifest.name, result });
        } catch (error) {
          console.error(`Plugin ${plugin.manifest.name} hook ${hookName} failed:`, error);
          results.push({ plugin: plugin.manifest.name, error });
        }
      }
    }

    return results;
  }

  private async resolvePluginSource(source: string, options: any): Promise<string> {
    // If it's a local path
    if (await fs.pathExists(source)) {
      return path.resolve(source);
    }

    // If it's a registry package
    if (!source.startsWith('http') && !source.startsWith('./') && !path.isAbsolute(source)) {
      return await this.downloadFromRegistry(source, options.version);
    }

    // If it's a URL
    if (source.startsWith('http')) {
      return await this.downloadFromUrl(source);
    }

    throw new KSETError(`Invalid plugin source: ${source}`);
  }

  private async downloadFromRegistry(packageName: string, version?: string): Promise<string> {
    const versionSpec = version || 'latest';
    const tarballUrl = `${this.registryUrl}/package/${packageName}/${versionSpec}`;

    return await this.downloadFromUrl(tarballUrl);
  }

  private async downloadFromUrl(url: string): Promise<string> {
    // Implementation would download and extract the plugin
    // For now, return a mock path
    throw new KSETError('URL download not implemented yet');
  }

  private async loadManifest(pluginPath: string): Promise<PluginManifest> {
    const manifestPath = path.join(pluginPath, 'kset.json');

    if (!await fs.pathExists(manifestPath)) {
      // Try package.json fallback
      const packagePath = path.join(pluginPath, 'package.json');
      if (await fs.pathExists(packagePath)) {
        const packageJson = await fs.readJson(packagePath);
        return this.convertPackageJsonToManifest(packageJson);
      }

      throw new KSETError('Plugin manifest not found');
    }

    const manifest = await fs.readJson(manifestPath);
    this.validateManifest(manifest);

    return manifest;
  }

  private validateManifest(manifest: any): void {
    const required = ['name', 'version', 'description', 'author', 'main'];

    for (const field of required) {
      if (!manifest[field]) {
        throw new KSETError(`Plugin manifest missing required field: ${field}`);
      }
    }

    // Validate version format
    if (!/^\d+\.\d+\.\d+/.test(manifest.version)) {
      throw new KSETError('Invalid version format in plugin manifest');
    }
  }

  private convertPackageJsonToManifest(packageJson: any): PluginManifest {
    return {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      author: packageJson.author,
      license: packageJson.license,
      main: packageJson.main,
      dependencies: packageJson.dependencies,
      peerDependencies: packageJson.peerDependencies,
      kset: packageJson.kset || {
        type: 'utility'
      }
    };
  }

  private async validateCompatibility(manifest: PluginManifest): Promise<void> {
    // Check KSET version compatibility
    if (manifest.kset?.compatibility) {
      const ksetVersion = require('../../../package.json').version;
      if (!this.isVersionCompatible(ksetVersion, manifest.kset.compatibility)) {
        throw new KSETError(`Plugin ${manifest.name} is not compatible with KSET version ${ksetVersion}`);
      }
    }

    // Check Node.js version compatibility
    if (manifest.engines?.node) {
      if (!this.isVersionCompatible(process.version, manifest.engines.node)) {
        throw new KSETError(`Plugin ${manifest.name} requires Node.js ${manifest.engines.node}`);
      }
    }
  }

  private isVersionCompatible(current: string, required: string | string[]): boolean {
    // Simplified version compatibility check
    // In production, use semver library
    return true;
  }

  private async installDependencies(manifest: PluginManifest, pluginPath: string): Promise<void> {
    if (!manifest.dependencies || Object.keys(manifest.dependencies).length === 0) {
      return;
    }

    // Implementation would install dependencies using npm or yarn
    console.log(`Installing dependencies for ${manifest.name}...`);
  }

  private async loadPlugin(pluginPath: string, manifest: PluginManifest, config?: Record<string, any>): Promise<LoadedPlugin> {
    const mainPath = path.join(pluginPath, manifest.main);

    if (!await fs.pathExists(mainPath)) {
      throw new KSETError(`Plugin main file not found: ${mainPath}`);
    }

    // Load the plugin module
    const PluginClass = require(mainPath);
    const PluginConstructor = PluginClass.default || PluginClass;

    // Create instance
    const instance = new PluginConstructor();

    // Load configuration
    const pluginConfig = await this.loadPluginConfig(manifest.name, config);

    return {
      manifest,
      instance,
      config: pluginConfig,
      enabled: false,
      loadedAt: new Date()
    };
  }

  private async loadPluginConfig(name: string, defaultConfig?: Record<string, any>): Promise<Record<string, any>> {
    const configPath = path.join(this.pluginsDirectory, `${name}.config.json`);

    let config = defaultConfig || {};

    if (await fs.pathExists(configPath)) {
      const fileConfig = await fs.readJson(configPath);
      config = { ...config, ...fileConfig };
    }

    return config;
  }

  private async removePluginConfig(name: string): Promise<void> {
    const configPath = path.join(this.pluginsDirectory, `${name}.config.json`);

    if (await fs.pathExists(configPath)) {
      await fs.remove(configPath);
    }
  }

  private async loadPluginFromDirectory(pluginPath: string): Promise<void> {
    const manifest = await this.loadManifest(pluginPath);

    if (this.loadingPromises.has(manifest.name)) {
      await this.loadingPromises.get(manifest.name);
      return;
    }

    const loadingPromise = this.loadPlugin(pluginPath, manifest);
    this.loadingPromises.set(manifest.name, loadingPromise);

    try {
      const plugin = await loadingPromise;
      this.plugins.set(manifest.name, plugin);
    } finally {
      this.loadingPromises.delete(manifest.name);
    }
  }
}