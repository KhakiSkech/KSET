#!/usr/bin/env node

/**
 * KSET CLI - Korea Stock Exchange Trading Library Command Line Interface
 * Korea's Standard Trading Interface
 */

const { Command } = require('commander');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

const packageJson = require('../package.json');

const program = new Command();

program
  .name('kset')
  .description('KSET - Korea Stock Exchange Trading Library CLI')
  .version(packageJson.version, '-v, --version', 'Display KSET version');

// ASCII Art Banner
const banner = `
${chalk.cyan('╔══════════════════════════════════════════════════════════════╗')}
${chalk.cyan('║')} ${chalk.bold.white('KSET - Korea Stock Exchange Trading Library')}               ${chalk.cyan('║')}
${chalk.cyan('║')} ${chalk.gray('Korea\'s Standard Trading Interface v' + packageJson.version)}            ${chalk.cyan('║')}
${chalk.cyan('╚══════════════════════════════════════════════════════════════╝')}
`;

console.log(banner);

// Build command
program
  .command('build')
  .description('Build KSET library for production')
  .option('-e, --env <environment>', 'Target environment (development|production)', 'production')
  .option('-t, --target <target>', 'Target platform (node|browser|all)', 'all')
  .option('-w, --watch', 'Enable watch mode')
  .option('-m, --minify', 'Minify output')
  .option('-a, --analyze', 'Analyze bundle size')
  .action(async (options) => {
    const spinner = ora('Building KSET library...').start();

    try {
      const buildScript = options.watch ? 'build:watch' : 'build';
      const env = { ...process.env, NODE_ENV: options.env };

      if (options.target === 'all') {
        // Build all targets
        await runCommand('npm', ['run', 'build:node'], env);
        await runCommand('npm', ['run', 'build:browser'], env);
        await runCommand('npm', ['run', 'build:umd'], env);
      } else {
        // Build specific target
        await runCommand('npm', [`run:${options.target}`, 'build'], env);
      }

      if (options.analyze) {
        await runCommand('npm', ['run', 'analyze']);
      }

      spinner.succeed(`${chalk.green('✓')} KSET built successfully for ${options.target}`);
    } catch (error) {
      spinner.fail(`${chalk.red('✗')} Build failed: ${error.message}`);
      process.exit(1);
    }
  });

// Init command
program
  .command('init')
  .description('Initialize a new KSET project')
  .option('-t, --template <template>', 'Project template (basic|advanced|algo)', 'basic')
  .option('-d, --directory <directory>', 'Project directory name', 'kset-project')
  .action(async (options) => {
    console.log(`${chalk.blue('🚀')} Initializing KSET project...\n`);

    try {
      await createProject(options.template, options.directory);
      console.log(`${chalk.green('✓')} Project initialized successfully!`);
      console.log(`\nNext steps:`);
      console.log(`  cd ${options.directory}`);
      console.log(`  npm install`);
      console.log(`  kset dev`);
    } catch (error) {
      console.error(`${chalk.red('✗')} Failed to initialize project: ${error.message}`);
      process.exit(1);
    }
  });

// Dev command
program
  .command('dev')
  .description('Start development server')
  .option('-p, --port <port>', 'Development server port', '3000')
  .option('-w, --watch', 'Enable watch mode', true)
  .action(async (options) => {
    const spinner = ora('Starting development server...').start();

    try {
      await runCommand('npm', ['run', 'dev'], {
        ...process.env,
        PORT: options.port
      });

      spinner.succeed(`${chalk.green('✓')} Development server started on port ${options.port}`);
    } catch (error) {
      spinner.fail(`${chalk.red('✗')} Failed to start dev server: ${error.message}`);
      process.exit(1);
    }
  });

// Provider commands
const providerCommand = program
  .command('provider')
  .description('Manage KSET providers');

providerCommand
  .command('list')
  .description('List available providers')
  .action(async () => {
    console.log(`${chalk.blue('📋')} Available Providers:\n`);

    const providers = [
      { name: 'Kiwoom', status: '✓', description: 'Kiwoom Securities API' },
      { name: 'KoreaInvestment', status: '✓', description: 'Korea Investment & Securities API' },
      { name: 'MiraeAsset', status: '⚠', description: 'Mirae Asset Securities (Coming Soon)' },
      { name: 'KB', status: '⚠', description: 'KB Securities (Coming Soon)' }
    ];

    providers.forEach(provider => {
      console.log(`  ${provider.status} ${chalk.bold(provider.name.padEnd(15))} - ${provider.description}`);
    });
  });

providerCommand
  .command('test <provider>')
  .description('Test provider connection')
  .action(async (provider) => {
    const spinner = ora(`Testing ${provider} provider...`).start();

    try {
      // Implementation would test actual provider connection
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate test

      spinner.succeed(`${chalk.green('✓')} ${provider} provider is working`);
    } catch (error) {
      spinner.fail(`${chalk.red('✗')} ${provider} provider test failed: ${error.message}`);
      process.exit(1);
    }
  });

providerCommand
  .command('configure <provider>')
  .description('Configure provider settings')
  .action(async (provider) => {
    console.log(`${chalk.blue('⚙️')} Configuring ${provider} provider...\n`);

    const questions = [
      {
        type: 'input',
        name: 'apiKey',
        message: 'Enter API Key:',
        validate: input => input.length > 0 || 'API Key is required'
      },
      {
        type: 'input',
        name: 'apiSecret',
        message: 'Enter API Secret:',
        validate: input => input.length > 0 || 'API Secret is required'
      },
      {
        type: 'confirm',
        name: 'useDemo',
        message: 'Use demo environment?',
        default: true
      }
    ];

    try {
      const answers = await inquirer.prompt(questions);
      await saveProviderConfig(provider, answers);

      console.log(`${chalk.green('✓')} ${provider} provider configured successfully`);
    } catch (error) {
      console.error(`${chalk.red('✗')} Configuration failed: ${error.message}`);
      process.exit(1);
    }
  });

// Plugin commands
const pluginCommand = program
  .command('plugin')
  .description('Manage KSET plugins');

pluginCommand
  .command('list')
  .description('List installed plugins')
  .action(async () => {
    console.log(`${chalk.blue('🔌')} Installed Plugins:\n`);

    try {
      const configPath = path.join(process.cwd(), 'kset.config.json');
      const config = await fs.readJson(configPath).catch(() => ({}));
      const plugins = config.plugins || [];

      if (plugins.length === 0) {
        console.log('  No plugins installed');
        return;
      }

      plugins.forEach(plugin => {
        console.log(`  ✓ ${chalk.bold(plugin.name)} v${plugin.version}`);
        console.log(`    ${plugin.description}\n`);
      });
    } catch (error) {
      console.error(`${chalk.red('✗')} Failed to list plugins: ${error.message}`);
    }
  });

pluginCommand
  .command('install <plugin>')
  .description('Install a plugin')
  .action(async (plugin) => {
    const spinner = ora(`Installing ${plugin} plugin...`).start();

    try {
      // Implementation would install plugin from registry
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate installation

      spinner.succeed(`${chalk.green('✓')} ${plugin} plugin installed successfully`);
    } catch (error) {
      spinner.fail(`${chalk.red('✗')} Failed to install ${plugin}: ${error.message}`);
      process.exit(1);
    }
  });

// Test command
program
  .command('test')
  .description('Run KSET tests')
  .option('-w, --watch', 'Run tests in watch mode')
  .option('-c, --coverage', 'Generate coverage report')
  .option('-t, --testPattern <pattern>', 'Test pattern to run')
  .action(async (options) => {
    const spinner = ora('Running tests...').start();

    try {
      const testArgs = [];
      if (options.watch) testArgs.push('--watch');
      if (options.coverage) testArgs.push('--coverage');
      if (options.testPattern) testArgs.push('--testNamePattern', options.testPattern);

      await runCommand('npm', ['test', ...testArgs]);

      spinner.succeed(`${chalk.green('✓')} All tests passed`);
    } catch (error) {
      spinner.fail(`${chalk.red('✗')} Tests failed: ${error.message}`);
      process.exit(1);
    }
  });

// Deploy command
program
  .command('deploy')
  .description('Deploy KSET application')
  .option('-e, --env <environment>', 'Deployment environment', 'staging')
  .option('-d, --dry-run', 'Dry run without actual deployment')
  .action(async (options) => {
    console.log(`${chalk.blue('🚀')} Deploying to ${options.env}...\n`);

    if (options.dryRun) {
      console.log(`${chalk.yellow('⚠️')} Dry run mode - no actual deployment`);
    }

    try {
      // Implementation would handle actual deployment
      await runDeploymentSteps(options);
      console.log(`${chalk.green('✓')} Deployment successful`);
    } catch (error) {
      console.error(`${chalk.red('✗')} Deployment failed: ${error.message}`);
      process.exit(1);
    }
  });

// Helper functions
async function runCommand(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      env
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function createProject(template, directory) {
  const projectPath = path.resolve(directory);

  // Create project directory
  await fs.ensureDir(projectPath);

  // Create package.json
  const packageJsonTemplate = {
    name: directory,
    version: '1.0.0',
    description: 'KSET Trading Application',
    main: 'dist/index.js',
    scripts: {
      dev: 'kset dev',
      build: 'kset build',
      test: 'kset test',
      start: 'node dist/index.js'
    },
    dependencies: {
      'kset': '^' + packageJson.version
    },
    devDependencies: {
      'typescript': '^5.0.0',
      'tsx': '^4.0.0'
    }
  };

  await fs.writeJson(path.join(projectPath, 'package.json'), packageJsonTemplate, { spaces: 2 });

  // Create basic project structure based on template
  const srcDir = path.join(projectPath, 'src');
  await fs.ensureDir(srcDir);

  if (template === 'basic') {
    await createBasicTemplate(srcDir);
  } else if (template === 'advanced') {
    await createAdvancedTemplate(srcDir);
  } else if (template === 'algo') {
    await createAlgorithmTemplate(srcDir);
  }

  // Create kset.config.json
  const config = {
    providers: {
      kiwoom: {
        enabled: false,
        demo: true
      }
    },
    plugins: [],
    logging: {
      level: 'info'
    }
  };

  await fs.writeJson(path.join(projectPath, 'kset.config.json'), config, { spaces: 2 });
}

async function createBasicTemplate(srcDir) {
  const indexTs = `
import { KSET, KiwoomProvider } from 'kset';

async function main() {
  const kset = new KSET({
    providers: [new KiwoomProvider({
      apiKey: process.env.KIWOOM_API_KEY,
      apiSecret: process.env.KIWOOM_API_SECRET
    })]
  });

  try {
    const market = await kset.getMarketStatus();
    console.log('Market Status:', market);
  } catch (error) {
    console.error('Error:', error);
  }
}

main().catch(console.error);
`;

  await fs.writeFile(path.join(srcDir, 'index.ts'), indexTs);
}

async function createAdvancedTemplate(srcDir) {
  // Create advanced template with multiple providers and strategies
  await fs.ensureDir(path.join(srcDir, 'strategies'));
  await fs.ensureDir(path.join(srcDir, 'config'));

  const indexTs = `
import { KSET, KiwoomProvider, KoreaInvestmentProvider } from 'kset';
import { MyStrategy } from './strategies/MyStrategy';
import { config } from './config';

async function main() {
  const kset = new KSET({
    providers: [
      new KiwoomProvider(config.providers.kiwoom),
      new KoreaInvestmentProvider(config.providers.koreaInvestment)
    ],
    strategies: [new MyStrategy(config.strategy)]
  });

  await kset.start();
}

main().catch(console.error);
`;

  await fs.writeFile(path.join(srcDir, 'index.ts'), indexTs);
}

async function createAlgorithmTemplate(srcDir) {
  // Create algorithmic trading template
  await fs.ensureDir(path.join(srcDir, 'algorithms'));
  await fs.ensureDir(path.join(srcDir, 'backtesting'));

  const indexTs = `
import { KSET, AlgorithmEngine } from 'kset';
import { MomentumStrategy } from './algorithms/MomentumStrategy';
import { BacktestEngine } from './backtesting/BacktestEngine';

async function main() {
  const algorithm = new AlgorithmEngine({
    strategies: [new MomentumStrategy()],
    backtest: true
  });

  const results = await algorithm.run();
  console.log('Backtest Results:', results);
}

main().catch(console.error);
`;

  await fs.writeFile(path.join(srcDir, 'index.ts'), indexTs);
}

async function saveProviderConfig(provider, config) {
  const configPath = path.join(process.cwd(), 'kset.config.json');
  const currentConfig = await fs.readJson(configPath).catch(() => ({}));

  currentConfig.providers = {
    ...currentConfig.providers,
    [provider.toLowerCase()]: config
  };

  await fs.writeJson(configPath, currentConfig, { spaces: 2 });
}

async function runDeploymentSteps(options) {
  const steps = [
    'Building application',
    'Running tests',
    'Creating deployment package',
    'Deploying to ' + options.env
  ];

  for (const step of steps) {
    const spinner = ora(step + '...').start();
    await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate step
    spinner.succeed(step + ' completed');
  }
}

// Parse command line arguments
program.parse();