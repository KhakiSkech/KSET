#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ProductionBuilder {
  constructor() {
    this.buildDir = path.join(__dirname, '..', 'dist');
    this.version = require('../package.json').version;
    this.buildHash = this.generateBuildHash();
    this.startTime = Date.now();
  }

  generateBuildHash() {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2);
    return crypto.createHash('md5').update(timestamp + random).digest('hex').substring(0, 8);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${message}`);
  }

  error(message) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ERROR: ${message}`);
    process.exit(1);
  }

  async clean() {
    this.log('🧹 Cleaning build directory...');
    try {
      await fs.remove(this.buildDir);
      this.log('✅ Build directory cleaned');
    } catch (error) {
      this.error(`Failed to clean build directory: ${error.message}`);
    }
  }

  async validateEnvironment() {
    this.log('🔍 Validating environment...');

    const requiredEnvVars = [
      'NODE_ENV',
      'BUILD_NUMBER',
      'BUILD_DATE'
    ];

    const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
    if (missing.length > 0) {
      this.log(`⚠️  Missing environment variables: ${missing.join(', ')}`);
    }

    // Set defaults if not provided
    process.env.NODE_ENV = process.env.NODE_ENV || 'production';
    process.env.BUILD_NUMBER = process.env.BUILD_NUMBER || this.buildHash;
    process.env.BUILD_DATE = process.env.BUILD_DATE || new Date().toISOString();

    this.log('✅ Environment validation completed');
  }

  async lint() {
    this.log('🔍 Running linting...');
    try {
      execSync('npm run lint', { stdio: 'inherit' });
      this.log('✅ Linting passed');
    } catch (error) {
      this.error('Linting failed');
    }
  }

  async typeCheck() {
    this.log('🔍 Running type checking...');
    try {
      execSync('npm run typecheck', { stdio: 'inherit' });
      this.log('✅ Type checking passed');
    } catch (error) {
      this.error('Type checking failed');
    }
  }

  async unitTests() {
    this.log('🧪 Running unit tests...');
    try {
      execSync('npm run test:coverage', { stdio: 'inherit' });
      this.log('✅ Unit tests passed');
    } catch (error) {
      this.error('Unit tests failed');
    }
  }

  async securityAudit() {
    this.log('🔒 Running security audit...');
    try {
      execSync('npm audit --audit-level=moderate', { stdio: 'inherit' });
      this.log('✅ Security audit passed');
    } catch (error) {
      this.error('Security audit found vulnerabilities');
    }
  }

  async buildNode() {
    this.log('📦 Building Node.js version...');
    try {
      execSync('npm run build:node', { stdio: 'inherit' });
      this.log('✅ Node.js build completed');
    } catch (error) {
      this.error('Node.js build failed');
    }
  }

  async buildBrowser() {
    this.log('📦 Building browser version...');
    try {
      execSync('npx webpack --config webpack.prod.config.js', { stdio: 'inherit' });
      this.log('✅ Browser build completed');
    } catch (error) {
      this.error('Browser build failed');
    }
  }

  async buildUMD() {
    this.log('📦 Building UMD version...');
    try {
      execSync('npm run build:umd', { stdio: 'inherit' });
      this.log('✅ UMD build completed');
    } catch (error) {
      this.error('UMD build failed');
    }
  }

  async generateBuildInfo() {
    this.log('📋 Generating build information...');

    const buildInfo = {
      version: this.version,
      buildNumber: process.env.BUILD_NUMBER,
      buildDate: process.env.BUILD_DATE,
      buildHash: this.buildHash,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      buildTime: Date.now() - this.startTime,
      bundles: {}
    };

    // Analyze bundle sizes
    const distPath = path.join(__dirname, '..', 'dist');
    if (await fs.pathExists(distPath)) {
      const browserPath = path.join(distPath, 'browser');
      if (await fs.pathExists(browserPath)) {
        const files = await fs.readdir(browserPath);
        for (const file of files) {
          const filePath = path.join(browserPath, file);
          const stats = await fs.stat(filePath);
          buildInfo.bundles[file] = {
            size: stats.size,
            sizeKB: Math.round(stats.size / 1024 * 100) / 100
          };
        }
      }
    }

    const buildInfoPath = path.join(distPath, 'build-info.json');
    await fs.writeJSON(buildInfoPath, buildInfo, { spaces: 2 });
    this.log('✅ Build information generated');
  }

  async generateChangelog() {
    this.log('📝 Generating changelog...');
    try {
      execSync('npm run release:dry', { stdio: 'inherit' });
      this.log('✅ Changelog generated');
    } catch (error) {
      this.log('⚠️  Changelog generation failed (non-critical)');
    }
  }

  async validateBundles() {
    this.log('✅ Validating bundles...');

    const distPath = path.join(__dirname, '..', 'dist');
    const requiredFiles = [
      'index.js',
      'index.d.ts',
      'browser/kset.js',
      'browser/kset.min.js'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(distPath, file);
      if (!(await fs.pathExists(filePath))) {
        this.error(`Required file missing: ${file}`);
      }
    }

    // Check bundle sizes
    const maxSize = 1024 * 1024; // 1MB
    const browserPath = path.join(distPath, 'browser', 'kset.min.js');
    if (await fs.pathExists(browserPath)) {
      const stats = await fs.stat(browserPath);
      if (stats.size > maxSize) {
        this.log(`⚠️  Bundle size warning: ${Math.round(stats.size / 1024)}KB (max: ${Math.round(maxSize / 1024)}KB)`);
      }
    }

    this.log('✅ Bundle validation completed');
  }

  async createPackageJson() {
    this.log('📦 Creating package.json for distribution...');

    const packageJson = require('../package.json');
    const distPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
      main: 'index.js',
      types: 'index.d.ts',
      browser: 'browser/kset.min.js',
      files: [
        'index.js',
        'index.d.ts',
        'browser/',
        'types/',
        'README.md',
        'LICENSE'
      ],
      keywords: packageJson.keywords,
      author: packageJson.author,
      license: packageJson.license,
      repository: packageJson.repository,
      bugs: packageJson.bugs,
      homepage: packageJson.homepage,
      engines: packageJson.engines,
      dependencies: {
        "ws": "^8.14.2",
        "big.js": "^6.2.1",
        "lodash": "^4.17.21",
        "moment-timezone": "^0.5.43",
        "uuid": "^9.0.1"
      }
    };

    const distPackagePath = path.join(this.buildDir, 'package.json');
    await fs.writeJSON(distPackagePath, distPackageJson, { spaces: 2 });
    this.log('✅ Distribution package.json created');
  }

  async copyAdditionalFiles() {
    this.log('📋 Copying additional files...');

    const filesToCopy = [
      'README.md',
      'LICENSE',
      'docs/README.md',
      'docs/examples.md'
    ];

    for (const file of filesToCopy) {
      const srcPath = path.join(__dirname, '..', file);
      const destPath = path.join(this.buildDir, file);

      if (await fs.pathExists(srcPath)) {
        await fs.copy(srcPath, destPath);
        this.log(`✅ Copied: ${file}`);
      } else {
        this.log(`⚠️  File not found: ${file}`);
      }
    }
  }

  async compressBundles() {
    this.log('🗜️  Compressing bundles...');
    try {
      const zlib = require('zlib');
      const browserPath = path.join(this.buildDir, 'browser');

      if (await fs.pathExists(browserPath)) {
        const files = await fs.readdir(browserPath);
        for (const file of files) {
          if (file.endsWith('.js')) {
            const filePath = path.join(browserPath, file);
            const content = await fs.readFile(filePath);
            const compressed = zlib.gzipSync(content, { level: 9 });
            const gzPath = filePath + '.gz';
            await fs.writeFile(gzPath, compressed);

            const originalSize = content.length;
            const compressedSize = compressed.length;
            const savings = ((originalSize - compressedSize) / originalSize * 100).toFixed(1);

            this.log(`✅ Compressed ${file}: ${Math.round(originalSize / 1024)}KB → ${Math.round(compressedSize / 1024)}KB (${savings}% saved)`);
          }
        }
      }
    } catch (error) {
      this.log(`⚠️  Bundle compression failed: ${error.message}`);
    }
  }

  async build() {
    this.log(`🚀 Starting KSET Production Build v${this.version}`);
    this.log(`📋 Build Hash: ${this.buildHash}`);
    this.log(`📅 Build Date: ${process.env.BUILD_DATE}`);

    try {
      await this.validateEnvironment();
      await this.clean();
      await this.lint();
      await this.typeCheck();
      await this.unitTests();
      await this.securityAudit();
      await this.buildNode();
      await this.buildBrowser();
      await this.buildUMD();
      await this.validateBundles();
      await this.generateBuildInfo();
      await this.createPackageJson();
      await this.copyAdditionalFiles();
      await this.compressBundles();
      await this.generateChangelog();

      const buildTime = Date.now() - this.startTime;
      this.log(`🎉 Production build completed successfully in ${Math.round(buildTime / 1000)}s`);
      this.log(`📦 Version: ${this.version} (${this.buildHash})`);

    } catch (error) {
      this.error(`Production build failed: ${error.message}`);
    }
  }
}

// Run the build if this file is executed directly
if (require.main === module) {
  const builder = new ProductionBuilder();
  builder.build().catch(error => {
    console.error('Build failed:', error);
    process.exit(1);
  });
}

module.exports = ProductionBuilder;