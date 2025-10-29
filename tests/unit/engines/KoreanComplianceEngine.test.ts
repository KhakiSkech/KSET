/**
 * Unit tests for KoreanComplianceEngine
 */

import { KoreanComplianceEngine } from '../../../src/engines/KoreanComplianceEngine';
import { KSETErrorFactory, ERROR_CODES } from '../../../src/errors';
import type { OrderRequest } from '../../../src/interfaces';

describe('KoreanComplianceEngine', () => {
  let complianceEngine: KoreanComplianceEngine;

  beforeEach(() => {
    complianceEngine = new KoreanComplianceEngine();
  });

  describe('Order Validation', () => {
    it('should validate a compliant order', () => {
      const compliantOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateOrder(compliantOrder);

      expect(result.isValid).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.summary).toBe('Order complies with all regulations');
    });

    it('should detect insufficient quantity validation', () => {
      const invalidOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 5, // Less than minimum for KOSPI (should be multiple of 10)
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateOrder(invalidOrder);

      expect(result.isValid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0]).toContain('quantity');
      expect(result.summary).toContain('violations');
    });

    it('should detect invalid price range', () => {
      const invalidOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 50, // Below minimum price
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateOrder(invalidOrder);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('price'))).toBe(true);
    });

    it('should detect after-hours trading violations', () => {
      const afterHoursOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      // Mock time to be after market hours (4:00 PM)
      const afterHoursTime = new Date(2024, 0, 15, 16, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(afterHoursTime.getTime());

      const result = complianceEngine.validateOrder(afterHoursOrder);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('after-hours'))).toBe(true);
    });

    it('should detect holiday trading violations', () => {
      const holidayOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      // Mock date to be a holiday (Lunar New Year)
      const holidayTime = new Date(2024, 1, 12, 10, 0, 0); // Monday (Lunar New Year)
      jest.spyOn(Date, 'now').mockReturnValue(holidayTime.getTime());

      const result = complianceEngine.validateOrder(holidayOrder);

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('holiday'))).toBe(true);
    });

    it('should validate short selling restrictions', () => {
      const shortSellOrder: OrderRequest = {
        symbol: '005930',
        side: 'SELL',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateOrder(shortSellOrder, {
        hasPosition: false // No position to sell
      });

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('short selling'))).toBe(true);
    });

    it('should validate algorithmic trading requirements', () => {
      const algoOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'TWAP',
        quantity: 10000,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateOrder(algoOrder, {
        isAlgorithmic: true,
        algoRegistrationRequired: true,
        hasAlgoRegistration: false
      });

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('algorithmic registration'))).toBe(true);
    });
  });

  describe('Account Compliance', () => {
    it('should validate basic account requirements', () => {
      const accountInfo = {
        accountNumber: '12345678',
        accountType: 'general',
        investorType: 'individual',
        riskLevel: 'moderate',
        investmentPeriod: 'long-term'
      };

      const result = complianceEngine.validateAccount(accountInfo);

      expect(result.isCompliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it('should detect minor investor restrictions', () => {
      const minorAccount = {
        accountNumber: '12345678',
        accountType: 'general',
        investorType: 'minor',
        riskLevel: 'high',
        investmentPeriod: 'short-term'
      };

      const result = complianceEngine.validateAccount(minorAccount);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.includes('minor investor'))).toBe(true);
      expect(result.violations.some(v => v.includes('high risk'))).toBe(true);
    });

    it('should validate foreign investor requirements', () => {
      const foreignAccount = {
        accountNumber: '12345678',
        accountType: 'general',
        investorType: 'foreign',
        riskLevel: 'moderate',
        investmentPeriod: 'long-term',
        alienRegistrationNumber: '123456-1234567'
      };

      const result = complianceEngine.validateAccount(foreignAccount);

      expect(result.isCompliant).toBe(true);
    });

    it('should detect missing foreign investor documentation', () => {
      const foreignAccount = {
        accountNumber: '12345678',
        accountType: 'general',
        investorType: 'foreign',
        riskLevel: 'moderate',
        investmentPeriod: 'long-term'
        // Missing alien registration number
      };

      const result = complianceEngine.validateAccount(foreignAccount);

      expect(result.isCompliant).toBe(false);
      expect(result.violations.some(v => v.includes('alien registration'))).toBe(true);
    });
  });

  describe('Position Limits', () => {
    it('should validate within position limits', () => {
      const currentPosition = {
        symbol: '005930',
        quantity: 500,
        averagePrice: 84000,
        marketValue: 42000000
      };

      const newOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validatePositionLimits(currentPosition, newOrder, {
        maxPositionValue: 100000000,
        maxPositionPercentage: 10
      });

      expect(result.isValid).toBe(true);
    });

    it('should detect position limit violations', () => {
      const largePosition = {
        symbol: '005930',
        quantity: 10000,
        averagePrice: 84000,
        marketValue: 840000000
      };

      const newOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 1000,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validatePositionLimits(largePosition, newOrder, {
        maxPositionValue: 100000000,
        maxPositionPercentage: 10
      });

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('position limit'))).toBe(true);
    });

    it('should validate concentration limits', () => {
      const portfolio = {
        totalValue: 100000000,
        positions: [
          { symbol: '005930', marketValue: 20000000 }, // 20%
          { symbol: '000660', marketValue: 15000000 }, // 15%
          { symbol: '035420', marketValue: 10000000 }  // 10%
        ]
      };

      const newOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateConcentrationLimits(portfolio, newOrder, {
        maxConcentrationPercentage: 25
      });

      expect(result.isValid).toBe(true);
    });

    it('should detect concentration limit violations', () => {
      const concentratedPortfolio = {
        totalValue: 100000000,
        positions: [
          { symbol: '005930', marketValue: 70000000 }, // 70% - exceeds limit
          { symbol: '000660', marketValue: 15000000 },
          { symbol: '035420', marketValue: 10000000 }
        ]
      };

      const newOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const result = complianceEngine.validateConcentrationLimits(concentratedPortfolio, newOrder, {
        maxConcentrationPercentage: 50
      });

      expect(result.isValid).toBe(false);
      expect(result.violations.some(v => v.includes('concentration'))).toBe(true);
    });
  });

  describe('Trading Restrictions', () => {
    it('should identify restricted securities', () => {
      const restrictedSecurities = ['123456', '234567', '345678'];

      restrictedSecurities.forEach(symbol => {
        expect(complianceEngine.isRestrictedSecurity(symbol)).toBe(true);
      });
    });

    it('should allow trading in non-restricted securities', () => {
      const normalSecurities = ['005930', '000660', '035420'];

      normalSecurities.forEach(symbol => {
        expect(complianceEngine.isRestrictedSecurity(symbol)).toBe(false);
      });
    });

    it('should validate order during restricted trading periods', () => {
      // Mock time to be during pre-market restriction period
      const restrictedTime = new Date(2024, 0, 15, 8, 30, 0);
      jest.spyOn(Date, 'now').mockReturnValue(restrictedTime.getTime());

      const order: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const isRestricted = complianceEngine.isRestrictedTradingPeriod(order);
      expect(isRestricted).toBe(true);
    });
  });

  describe('Report Generation', () => {
    it('should generate compliance report for order', () => {
      const order: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const report = complianceEngine.generateComplianceReport(order);

      expect(report).toHaveProperty('orderId');
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('complianceStatus');
      expect(report).toHaveProperty('violations');
      expect(report).toHaveProperty('warnings');
      expect(report).toHaveProperty('recommendations');
      expect(report).toHaveProperty('regulations');

      expect(Array.isArray(report.violations)).toBe(true);
      expect(Array.isArray(report.warnings)).toBe(true);
      expect(Array.isArray(report.recommendations)).toBe(true);
      expect(Array.isArray(report.regulations)).toBe(true);
    });

    it('should include relevant regulations in report', () => {
      const order: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const report = complianceEngine.generateComplianceReport(order);

      expect(report.regulations.length).toBeGreaterThan(0);
      expect(report.regulations[0]).toHaveProperty('name');
      expect(report.regulations[0]).toHaveProperty('description');
      expect(report.regulations[0]).toHaveProperty('applicable');
    });
  });

  describe('Regulatory Updates', () => {
    it('should check for regulatory updates', () => {
      const updates = complianceEngine.checkRegulatoryUpdates();

      expect(Array.isArray(updates)).toBe(true);
      updates.forEach(update => {
        expect(update).toHaveProperty('type');
        expect(update).toHaveProperty('description');
        expect(update).toHaveProperty('effectiveDate');
        expect(update).toHaveProperty('impact');
      });
    });

    it('should apply regulatory updates', () => {
      const update = {
        type: 'TRADING_RULES',
        description: 'New position limit rules',
        effectiveDate: new Date(),
        impact: 'HIGH',
        changes: {
          positionLimits: {
            maxPositionValue: 50000000
          }
        }
      };

      const result = complianceEngine.applyRegulatoryUpdate(update);

      expect(result.success).toBe(true);
      expect(result.message).toContain('Applied successfully');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit trail entry', () => {
      const order: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const auditEntry = complianceEngine.createAuditEntry('ORDER_VALIDATION', {
        order,
        result: 'COMPLIANT',
        timestamp: new Date()
      });

      expect(auditEntry).toHaveProperty('id');
      expect(auditEntry).toHaveProperty('timestamp');
      expect(auditEntry).toHaveProperty('eventType');
      expect(auditEntry).toHaveProperty('userId');
      expect(auditEntry).toHaveProperty('details');
      expect(auditEntry.eventType).toBe('ORDER_VALIDATION');
    });

    it('should retrieve audit trail', () => {
      const startDate = new Date(2024, 0, 1);
      const endDate = new Date(2024, 0, 31);

      const auditTrail = complianceEngine.getAuditTrail(startDate, endDate);

      expect(Array.isArray(auditTrail)).toBe(true);
      auditTrail.forEach(entry => {
        expect(entry).toHaveProperty('id');
        expect(entry).toHaveProperty('timestamp');
        expect(entry).toHaveProperty('eventType');
      });
    });
  });

  describe('Risk Assessment', () => {
    it('should assess order risk level', () => {
      const order: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'TEST-ACCOUNT-001'
      };

      const riskAssessment = complianceEngine.assessOrderRisk(order);

      expect(riskAssessment).toHaveProperty('riskLevel');
      expect(riskAssessment).toHaveProperty('riskFactors');
      expect(riskAssessment).toHaveProperty('recommendations');
      expect(riskAssessment).toHaveProperty('mitigation');

      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(riskAssessment.riskLevel);
      expect(Array.isArray(riskAssessment.riskFactors)).toBe(true);
      expect(Array.isArray(riskAssessment.recommendations)).toBe(true);
    });

    it('should identify high-risk orders', () => {
      const highRiskOrder: OrderRequest = {
        symbol: '005930',
        side: 'BUY',
        orderType: 'MARKET', // Market order during volatile period
        quantity: 10000, // Large quantity
        account: 'TEST-ACCOUNT-001'
      };

      const riskAssessment = complianceEngine.assessOrderRisk(highRiskOrder);

      expect(['HIGH', 'CRITICAL']).toContain(riskAssessment.riskLevel);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});