# Contributing to KSET

> Thank you for your interest in contributing to the Korea Stock Exchange Trading Library!

We welcome contributions from the community and are grateful for your help in making KSET better. This document provides guidelines and information about contributing to the project.

## Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Submitting Changes](#submitting-changes)
- [Review Process](#review-process)
- [Community Guidelines](#community-guidelines)
- [Getting Help](#getting-help)

## Getting Started

### Prerequisites

- **Node.js**: Version 16.0.0 or higher
- **npm**: Version 8.0.0 or higher
- **Git**: Latest stable version
- **TypeScript**: Version 5.0.0 or higher
- **IDE**: VS Code (recommended) with extensions

### Development Environment Setup

1. **Fork the Repository**
   ```bash
   # Fork the repository on GitHub, then clone your fork
   git clone https://github.com/your-username/kset.git
   cd kset
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Set Up Development Environment**
   ```bash
   # Install development dependencies
   npm install --dev

   # Set up pre-commit hooks
   npm run setup:hooks
   ```

4. **Configure Your Environment**
   ```bash
   # Copy environment template
   cp .env.example .env

   # Edit with your configuration
   # Note: Never commit actual credentials!
   ```

5. **Verify Setup**
   ```bash
   # Run tests to ensure everything works
   npm test

   # Build the project
   npm run build
   ```

### Recommended Tools

- **IDE**: VS Code with these extensions:
  - TypeScript and JavaScript Language Features
  - ESLint
  - Prettier
  - Jest Runner
  - GitLens

- **Browser**: Chrome/Edge for debugging

- **API Testing**: Postman or Insomnia for testing endpoints

## Development Workflow

### 1. Create a Branch

Always create a new branch for your work:

```bash
# Main development branch
git checkout -b develop

# Create feature branch from develop
git checkout -b feature/your-feature-name

# For bug fixes
git checkout -b fix/issue-number-description

# For documentation
git checkout -b docs/your-docs-changes
```

### 2. Make Your Changes

Follow these guidelines while making changes:

- **Small, focused commits**: Each commit should represent one logical change
- **Clear commit messages**: Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification
- **Test your changes**: Ensure all tests pass
- **Update documentation**: Keep docs in sync with code changes

### 3. Run Quality Checks

Before submitting your changes:

```bash
# Run all quality checks
npm run validate

# Individual checks
npm run lint          # Code linting
npm run typecheck     # TypeScript type checking
npm run test          # Unit tests
npm run test:coverage # Coverage report
npm run build         # Production build
```

### 4. Submit Your Changes

1. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request**
   - Use the pull request template
   - Provide a clear description of your changes
   - Link related issues
   - Request appropriate reviewers

## Code Standards

### TypeScript Guidelines

#### Type Safety

- **Strict typing**: Always use explicit types
- **Interfaces over types**: Prefer interfaces for object shapes
- **Avoid `any`**: Use `unknown` or proper types instead

```typescript
// Good
interface OrderRequest {
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price?: number;
}

// Bad
function processOrder(order: any) {
  // Implementation
}
```

#### Naming Conventions

- **Classes**: PascalCase (`class OrderManager`)
- **Methods/Properties**: camelCase (`const orderPrice = 100;`)
- **Constants**: UPPER_SNAKE_CASE (`const MAX_RETRIES = 3;`)
- **Interfaces**: PascalCase with 'I' prefix (`interface IKSETProvider`)
- **Types**: PascalCase with descriptive names (`type OrderSide = 'buy' | 'sell'`)

#### Code Organization

```typescript
// File structure
import { ExternalDependency } from 'external-package';
import { InternalDependency } from './internal-module';

// Constants
const DEFAULT_TIMEOUT = 30000;

// Interfaces
interface ProcessedData {
  id: string;
  value: number;
}

// Classes
class DataProcessor {
  private readonly config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  // Public methods first
  public process(data: RawData): ProcessedData {
    return this.transform(data);
  }

  // Private methods last
  private transform(data: RawData): ProcessedData {
    // Implementation
  }
}

// Exports
export { DataProcessor, ProcessedData };
```

### Error Handling

#### Custom Errors

```typescript
export class KSETError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly provider: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = 'KSETError';
  }
}
```

#### Error Handling Patterns

```typescript
// Good error handling
async function placeOrder(order: OrderRequest): Promise<OrderResult> {
  try {
    const result = await provider.executeOrder(order);
    return { success: true, data: result };
  } catch (error) {
    if (error instanceof KSETError) {
      logger.error(`KSET Error [${error.code}]: ${error.message}`);
      return {
        success: false,
        error: {
          code: error.code,
          message: error.message
        }
      };
    }

    // Handle unexpected errors
    logger.error('Unexpected error:', error);
    throw error;
  }
}
```

### Async/Await Patterns

- **Prefer async/await** over Promise chains
- **Handle errors appropriately**
- **Use proper TypeScript typing**

```typescript
// Good
async function fetchMarketData(symbols: string[]): Promise<MarketData[]> {
  try {
    const response = await api.get('/market-data', { symbols });
    return response.data;
  } catch (error) {
    throw new MarketDataError('Failed to fetch market data', error);
  }
}

// Avoid
function fetchMarketData(symbols: string[]): Promise<MarketData[]> {
  return api.get('/market-data', { symbols })
    .then(response => response.data)
    .catch(error => {
      throw new MarketDataError('Failed to fetch market data', error);
    });
}
```

## Testing Guidelines

### Test Structure

```
src/
├── providers/
│   ├── kiwoom/
│   │   ├── KiwoomProvider.ts
│   │   └── __tests__/
│   │       ├── KiwoomProvider.test.ts
│   │       └── fixtures/
│   │           └── mockData.json
│   └── ...
```

### Test Types

#### Unit Tests

```typescript
// KiwoomProvider.test.ts
import { KiwoomProvider } from '../KiwoomProvider';
import { MockKiwoomAPI } from './mocks/MockKiwoomAPI';

describe('KiwoomProvider', () => {
  let provider: KiwoomProvider;
  let mockAPI: MockKiwoomAPI;

  beforeEach(() => {
    mockAPI = new MockKiwoomAPI();
    provider = new KiwoomProvider(testConfig, mockAPI);
  });

  describe('getMarketData', () => {
    it('should return market data for valid symbols', async () => {
      // Arrange
      const symbols = ['005930'];
      const expectedData = createMockMarketData(symbols);
      mockAPI.setMarketData(expectedData);

      // Act
      const result = await provider.getMarketData(symbols);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(expectedData);
    });

    it('should handle invalid symbols gracefully', async () => {
      // Arrange
      const symbols = ['INVALID'];
      mockAPI.setError('Invalid symbol');

      // Act & Assert
      await expect(provider.getMarketData(symbols))
        .rejects.toThrow(KSETError);
    });
  });
});
```

#### Integration Tests

```typescript
// integration/ProviderIntegration.test.ts
import { KSET } from '../../src/KSET';

describe('Provider Integration', () => {
  let kset: KSET;

  beforeAll(async () => {
    kset = new KSET({ environment: 'test' });
  });

  afterAll(async () => {
    await kset.cleanup();
  });

  it('should connect to real provider', async () => {
    if (!process.env.RUN_INTEGRATION_TESTS) {
      return;
    }

    const provider = await kset.createProvider('kiwoom', integrationConfig);
    expect(provider.isConnected()).toBe(true);
  });
});
```

#### E2E Tests

```typescript
// e2e/TradingWorkflow.test.ts
describe('Trading Workflow E2E', () => {
  it('should execute complete trading workflow', async () => {
    // Test complete user journey
    const kset = new KSET();
    const provider = await kset.createProvider('kiwoom', config);

    // Get market data
    const marketData = await provider.getMarketData(['005930']);
    expect(marketData.success).toBe(true);

    // Place order
    const order = await provider.placeOrder(testOrder);
    expect(order.success).toBe(true);

    // Verify order
    const orderStatus = await provider.getOrderStatus(order.data.id);
    expect(orderStatus.status).toBe('filled');
  });
});
```

### Test Coverage Requirements

- **Overall Coverage**: Minimum 90%
- **Function Coverage**: Minimum 95%
- **Branch Coverage**: Minimum 85%
- **Statement Coverage**: Minimum 90%

### Mocking Guidelines

```typescript
// Use dependency injection for mocking
interface APIProvider {
  request<T>(endpoint: string, params: any): Promise<T>;
}

class KiwoomProvider {
  constructor(
    private config: KiwoomConfig,
    private api: APIProvider
  ) {}
}

// Test with mock
const mockAPI = new MockAPIProvider();
const provider = new KiwoomProvider(config, mockAPI);
```

## Documentation

### Code Documentation

Use JSDoc for all public APIs:

```typescript
/**
 * Creates a new broker provider instance
 *
 * @param brokerId - The broker identifier (e.g., 'kiwoom', 'korea-investment')
 * @param config - Provider configuration object containing credentials and settings
 *
 * @returns Promise that resolves to initialized provider instance
 *
 * @throws {KSETError} When provider initialization fails
 *
 * @example
 * ```typescript
 * const provider = await kset.createProvider('kiwoom', {
 *   credentials: {
 *     certificate: './cert.p12',
 *     password: 'password'
 *   },
 *   environment: 'production'
 * });
 * ```
 */
async createProvider(
  brokerId: string,
  config: ProviderConfig
): Promise<IKSETProvider> {
  // Implementation
}
```

### README Documentation

- Keep README.md up to date with latest changes
- Include installation and usage examples
- Document breaking changes in changelog
- Provide troubleshooting guide

### API Documentation

- Update TypeDoc documentation with new APIs
- Include examples for complex functionality
- Document error scenarios and handling

## Submitting Changes

### Pull Request Template

Use the provided PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Changelog updated
```

### Commit Message Guidelines

Follow [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `chore`: Build process or dependency changes

**Examples:**
```
feat(provider): add Korea Investment provider support

Implement comprehensive support for Korea Investment Securities API
including real-time data streaming and order execution.

Closes #123

fix(core): handle authentication timeout errors

Add proper timeout handling for provider authentication
to prevent hanging indefinitely.

Closes #124
```

## Review Process

### Review Requirements

1. **Self-Review**: Review your own code before requesting reviews
2. **Peer Review**: At least one maintainer must review changes
3. **Automated Checks**: All CI checks must pass
4. **Documentation**: Documentation must be updated

### Review Guidelines

#### For Reviewers

- **Functionality**: Does the code work as intended?
- **Quality**: Is the code well-written and maintainable?
- **Testing**: Are tests comprehensive and effective?
- **Documentation**: Is documentation accurate and complete?
- **Performance**: Any performance implications?

#### For Contributors

- **Respond promptly** to review feedback
- **Address all review comments** before merging
- **Provide context** for complex changes
- **Be open to suggestions** and improvements

### Merge Process

1. **All checks pass**: CI, tests, and coverage requirements
2. **Reviews approved**: Required reviewers have approved
3. **No conflicts**: Branch is up to date with main
4. **Documentation updated**: README and API docs are current

## Community Guidelines

### Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please read our [Code of Conduct](CODE_OF_CONDUCT.md) and follow it in all interactions.

### Communication Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For general questions and discussions
- **Discord**: For real-time chat and community support (coming soon)

### Expected Behavior

- **Be respectful**: Treat all community members with respect
- **Be constructive**: Provide helpful, constructive feedback
- **Be patient**: Understand that maintainers have limited time
- **Be collaborative**: Work together to find the best solutions

### Prohibited Behavior

- **Harassment**: Any form of harassment is unacceptable
- **Spam**: No promotional content or spam
- **Disruption**: Don't disrupt discussions or derail threads
- **Privacy**: Don't share private information

## Getting Help

### Resources

- **[Documentation](https://docs.kset.dev)**: Comprehensive API and usage documentation
- **[Examples](https://github.com/kset/kset-examples)**: Example projects and code samples
- **[GitHub Wiki](https://github.com/kset/kset/wiki)**: Additional guides and tutorials

### Support Channels

- **GitHub Issues**: For bug reports and feature requests
- **GitHub Discussions**: For questions and general discussions
- **Email**: support@kset.dev (for critical issues only)

### Common Issues

#### Setup Problems

```bash
# If npm install fails
rm -rf node_modules package-lock.json
npm install

# If tests fail
npm run clean
npm install
npm test
```

#### Build Issues

```bash
# If TypeScript compilation fails
npm run typecheck

# Clear build cache
npm run clean
npm run build
```

## Recognition

### Contributors

All contributors are recognized in:
- **README.md**: List of top contributors
- **CHANGELOG.md**: Contributors to each release
- **GitHub Contributors**: Automatic contributor tracking

### Ways to Contribute

1. **Code**: Implement features, fix bugs, improve performance
2. **Documentation**: Write guides, improve API docs, create examples
3. **Testing**: Write tests, improve coverage, report bugs
4. **Community**: Answer questions, review PRs, help others
5. **Design**: UI/UX improvements, logos, branding
6. **Translation**: Help translate documentation and UI

## Release Process

### Version Management

We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Cycle

- **Main Branch**: Always stable, production-ready code
- **Develop Branch**: Integration branch for new features
- **Feature Branches**: Individual feature development
- **Release Branches**: Preparation for releases

### Changelog

Maintain CHANGELOG.md with:
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

---

Thank you for contributing to KSET! Your contributions help make Korean securities trading more accessible and efficient for everyone.

If you have any questions or need help getting started, don't hesitate to reach out to our community.