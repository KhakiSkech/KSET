## Description

Brief description of changes made in this pull request.

### Changes Made

- [ ] Added new functionality
- [ ] Fixed bug(s)
- [ ] Updated documentation
- [ ] Improved performance
- [ ] Refactored code
- [ ] Added tests
- [ ] Other: _______

### Issue(s) Addressed

Fixes # (issue number)
Resolves # (issue number)
Related to # (issue number)

## Type of Change

- [ ] **Bug fix** (non-breaking change that fixes an issue)
- [ ] **New feature** (non-breaking change that adds functionality)
- [ ] **Breaking change** (fix or feature that would cause existing functionality to not work as expected)
- [ ] **Documentation update** (changes only to documentation)
- [ ] **Performance improvement** (changes that improve performance)
- [ ] **Code refactor** (code changes that neither fix a bug nor add a feature)
- [ ] **Test improvement** (changes to tests, test infrastructure)
- [ ] **Build/CI improvement** (changes to build process, CI/CD)

## Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing completed

### Test Results

**Unit Tests**: ✅ PASSED (coverage: %)
**Integration Tests**: ✅ PASSED
**E2E Tests**: ✅ PASSED
**Linting**: ✅ PASSED
**Type Checking**: ✅ PASSED
**Build**: ✅ PASSED

### Testing Environment

- **Node.js Version**:
- **Provider(s) Tested**:
- **Environment**: (development/test/production)
- **Test Data**: (mock/real/sandbox)

### Manual Testing

Describe any manual testing performed:

- [ ] Tested with provider
- [ ] Tested with sample data
- [ ] Tested edge cases
- [ ] Performance testing completed

## Breaking Changes (if applicable)

### API Changes

- **Method**:
- **Old**:
- **New**:

### Configuration Changes

- **Property**:
- **Old**:
- **New**:

### Migration Guide

[Provide migration instructions for breaking changes]

```typescript
// Example migration
// Old way
const provider = kset.createProvider('kiwoom', oldConfig);

// New way
const provider = kset.createProvider('kiwoom', newConfig);
```

## Performance Impact

### Metrics

- **Latency**: (no change / improved / regressed)
- **Memory Usage**: (no change / improved / regressed)
- **CPU Usage**: (no change / improved / regressed)
- **Bundle Size**: (no change / increased / decreased)

### Benchmarks

[Include relevant benchmark results if applicable]

## Documentation

### Code Documentation

- [ ] JSDoc comments added/updated
- [ ] Type definitions updated
- [ ] Inline comments added/updated

### User Documentation

- [ ] README.md updated
- [ ] API documentation updated
- [ ] Examples updated
- [ ] Migration guide added (if breaking changes)
- [ ] Changelog updated

### Translation

- [ ] English documentation
- [ ] Korean documentation
- [ ] Other languages

## Provider Support

### Affected Providers

- [ ] Kiwoom (키움증권)
- [ ] Korea Investment (한국투자증권)
- [ ] Future providers (향후 추가될 증권사)
- [ ] All providers

### Testing by Provider

| Provider | Unit Tests | Integration Tests | Manual Tests |
|----------|------------|-------------------|--------------|
| Kiwoom   | ✅         | ✅                | ✅           |
| Korea Inv. | ✅       | ✅                | ✅           |
| ...      | ...        | ...               | ...          |

## Security Considerations

### Security Changes

- [ ] No security changes
- [ ] Added input validation
- [ ] Updated authentication
- [ ] Fixed security vulnerability
- [ ] Updated dependencies

### Security Review

- [ ] Code reviewed for security issues
- [ ] Dependencies checked for vulnerabilities
- [ ] Sensitive data properly handled
- [ ] Input validation implemented

## Dependencies

### Added Dependencies

-

### Updated Dependencies

-

### Removed Dependencies

-

### Security Updates

- [ ] Updated dependencies for security
- [ ] No security updates needed

## Deployment

### Version Bump

- [ ] Patch version (x.x.X)
- [ ] Minor version (x.X.x)
- [ ] Major version (X.x.x)

### Release Notes

[Draft release notes for this change]

### Deployment Checklist

- [ ] All CI checks passing
- [ ] Documentation updated
- [ ] Version bumped
- [ ] Changelog updated
- [ ] Release notes prepared
- [ ] Backward compatibility verified (if applicable)

## Review Checklist

### Code Review

- [ ] Code follows project style guidelines
- [ ] TypeScript types are properly defined
- [ ] Error handling is appropriate
- [ ] Performance implications considered
- [ ] Security implications considered

### Testing Review

- [ ] Tests cover new functionality
- [ ] Tests cover edge cases
- [ ] Test assertions are appropriate
- [ ] Mock data is realistic
- [ ] Tests are maintainable

### Documentation Review

- [ ] Documentation is accurate and complete
- [ ] Examples are clear and functional
- [ ] API documentation is up to date
- [ ] Breaking changes are documented

## Additional Context

### Background

[Provide any additional context about the change]

### Screenshots

[Add screenshots if applicable]

### Performance Charts

[Add performance charts if applicable]

### Related Issues

- Depends on #
- Closes #
- Fixes #
- Related to #

## Community Impact

### Users Affected

- [ ] All users
- [ ] Specific providers only
- [ ] Advanced users only
- [ ] Developers only

### Migration Required

- [ ] No migration required
- [ ] Simple configuration change
- [ ] Code changes required
- [ ] Complex migration process

## Questions for Reviewers

1.
2.
3.

## Approval Required

- [ ] Code review by maintainer
- [ ] Security review (if applicable)
- [ ] Performance review (if applicable)
- [ ] Documentation review
- [ ] Testing review

---

**By submitting this pull request, I confirm that:**

- [ ] I have read and understood the [Contributing Guidelines](CONTRIBUTING.md)
- [ ] I have read and understood the [Code of Conduct](CODE_OF_CONDUCT.md)
- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my own code
- [ ] I have made corresponding changes to the documentation
- [ ] My changes generate no new warnings
- [ ] I have added tests that prove my fix is effective or that my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] Any dependent changes have been merged and published in downstream modules

**Thank you for contributing to KSET!** 🙏

Your contributions help make the Korea Stock Exchange Trading Library better for everyone. We appreciate the time and effort you've put into this pull request.