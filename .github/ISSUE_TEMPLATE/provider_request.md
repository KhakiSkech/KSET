---
name: Provider Request
about: Request support for a new broker or data provider
title: "[PROVIDER] "
labels: ["provider", "enhancement", "needs-triage"]
assignees: ""

---

## Provider Information

**Provider Name**: (e.g., 미래에셋증권, NH투자증권, 신한증권)

**Provider Type**:
- [ ] Securities Broker (증권사)
- [ ] Data Provider (데이터 제공업체)
- [ ] Financial Service (금융 서비스)
- [ ] Other: _______

**Provider Website**:

## Current Status

**API Availability**:
- [ ] Public API available
- [ ] Private API with documentation
- [ ] API requires partnership/contract
- [ ] API status unknown

**Authentication Methods**:
- [ ] API Key/Secret
- [ ] Certificate-based (공인인증서)
- [ ] OAuth 2.0
- [ ] Other: _______

## Integration Requirements

### API Documentation

**Documentation Availability**:
- [ ] Public documentation available
- [ ] Documentation requires registration
- [ ] Documentation only available to partners
- [ ] No documentation available

**Documentation URL**:

**Access Requirements**:
- [ ] Open access
- [ ] Account registration required
- [ ] Business partnership required
- [ ] Korean residency/citizenship required

### Technical Capabilities

**Supported Features**:
- [ ] Market Data (실시간 시세)
- [ ] Historical Data (과거 데이터)
- [ ] Order Placement (주문)
- [ ] Account Information (계좌 정보)
- [ ] Real-time Streaming (실시간 스트리밍)
- [ ] Research Data (리서치 데이터)
- [ ] Corporate Actions (주식 정보)
- [ ] Algorithm Trading (알고리즘 트레이딩)

**Markets Supported**:
- [ ] KOSPI
- [ ] KOSDAQ
- [ ] KONEX
- [ ] ETFs
- [ ] Bonds
- [ ] Derivatives (선물/옵션)
- [ ] Overseas Markets
- [ ] Cryptocurrencies

## Integration Priority

### Business Impact

**Market Share**: (What is the provider's market share in Korea?)

**User Demand**: (How many users have requested this provider?)

**Strategic Importance**:
- [ ] Critical - Major Korean broker
- [ ] High - Significant user base
- [ ] Medium - Growing provider
- [ ] Low - Niche provider

### Technical Complexity

**Estimated Complexity**:
- [ ] Low - Simple REST API
- [ ] Medium - Requires WebSocket integration
- [ ] High - Complex authentication or proprietary protocols
- [ ] Very High - Requires reverse engineering or partnership

**Known Challenges**:
-
-
-

## Community Support

### Availability for Testing

**Test Account Access**:
- [ ] I have access to a test/paper trading account
- [ ] I can provide test credentials (privately)
- [ ] I'm willing to help with testing
- [ ] I don't have access but can help with documentation review

**Technical Expertise**:
- [ ] I have experience with this provider's API
- [ ] I can help reverse engineer their API
- [ ] I can provide API documentation
- [ ] I can help with Korean language translation

### Implementation Interest

**Community Contributors**:
- [ ] I'm interested in implementing this provider
- [ ] I know someone who can help implement this
- [ ] I can provide financial/technical support
- [ ] I can help test and validate the implementation

## Provider Contact Information

**Official Contact**:
- Website:
- Developer Portal:
- API Documentation:
- Support Email:

**Personal Contacts** (if any):
-

## Integration Examples

**Similar Integrations**:
- [ ] I've used similar APIs before
- [ ] I know of other libraries that support this provider
- [ ] I have examples of API calls/requests
- [ ] I can provide sample responses

**API Examples** (if available):

```typescript
// Example API request/response
interface ProviderAPI {
  getMarketData(symbols: string[]): Promise<MarketDataResponse>;
  placeOrder(order: OrderRequest): Promise<OrderResponse>;
}
```

## Requirements for Implementation

### Documentation Needed

- [ ] API specification
- [ ] Authentication flow documentation
- [ ] Error code reference
- [ ] Rate limiting information
- [ ] WebSocket protocol specification (if applicable)

### Test Environment

- [ ] Sandbox/development environment
- [ ] Test API keys/credentials
- [ ] Mock server for testing
- [ ] Test market data

### Legal/Regulatory

- [ ] API terms of service
- [ ] Usage restrictions
- [ ] Data licensing requirements
- [ ] Compliance considerations

## Additional Context

### Market Position

**Why is this provider important?**
-
-
-

**Unique Features**:
-
-
-

### Implementation Timeline

**Estimated Timeline**:
- Research & Documentation: weeks
- Initial Implementation: weeks
- Testing & Validation: weeks
- Documentation & Examples: weeks

**Dependencies**:
- [ ] Provider partnership/approval
- [ ] API documentation access
- [ ] Test environment setup
- [ ] Community contributors

## Related Issues

- Related to issue #
- Depends on issue #
- Blocks issue #

## Checklist

- [ ] I have researched the provider's API capabilities
- [ ] I have provided contact information or documentation links
- [ ] I understand implementation complexity and requirements
- [ ] I am willing to help with testing or implementation
- [ ] I understand this requires significant development effort
- [ ] I have checked for existing provider requests

---

**Thank you for requesting a new provider!** 🏦

Adding new providers helps make KSET more comprehensive and useful for the entire Korean trading community. Provider integrations require significant effort and often involve partnerships with financial institutions, so your contribution and support are greatly appreciated.

The maintainers will evaluate your request based on technical feasibility, community demand, and resource availability. We'll provide feedback on next steps and timeline once we've reviewed your request.