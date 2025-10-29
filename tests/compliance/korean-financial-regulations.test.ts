/**
 * Compliance tests for Korean financial regulations
 */

import { KSET } from '../../src/core/KSET';
import { KoreanComplianceEngine } from '../../src/engines/KoreanComplianceEngine';
import { KoreanMarketEngine } from '../../src/engines/KoreanMarketEngine';
import type {
  OrderRequest,
  Account,
  MarketData,
  ProviderConfig
} from '../../src/interfaces';

describe('Korean Financial Regulations Compliance Tests', () => {
  let kset: KSET;
  let complianceEngine: KoreanComplianceEngine;
  let marketEngine: KoreanMarketEngine;

  beforeEach(() => {
    kset = new KSET({
      logLevel: 'debug',
      defaultTimeout: 30000,
      retryAttempts: 3
    });

    complianceEngine = new KoreanComplianceEngine();
    marketEngine = new KoreanMarketEngine();
  });

  describe('Capital Market Act Compliance', () => {
    test('should enforce trading hours restrictions', () => {
      // Test during market hours (9:00 AM - 3:30 PM on weekdays)
      const marketHours = [
        new Date(2024, 0, 15, 9, 0, 0),   // Monday 9:00 AM
        new Date(2024, 0, 15, 12, 30, 0), // Monday 12:30 PM
        new Date(2024, 0, 15, 15, 0, 0)   // Monday 3:00 PM
      ];

      marketHours.forEach(time => {
        jest.spyOn(Date, 'now').mockReturnValue(time.getTime());
        expect(marketEngine.isMarketOpen()).toBe(true);
      });

      // Test outside market hours
      const nonMarketHours = [
        new Date(2024, 0, 15, 8, 59, 59),  // Monday 8:59:59 AM
        new Date(2024, 0, 15, 15, 31, 0),  // Monday 3:31 PM
        new Date(2024, 0, 13, 10, 0, 0),   // Saturday 10:00 AM
        new Date(2024, 0, 14, 10, 0, 0)    // Sunday 10:00 AM
      ];

      nonMarketHours.forEach(time => {
        jest.spyOn(Date, 'now').mockReturnValue(time.getTime());
        expect(marketEngine.isMarketOpen()).toBe(false);
      });
    });

    test('should validate order quantities by market type', () => {
      // KOSPI stocks - minimum 10 shares, multiples of 10
      expect(marketEngine.isValidOrderQuantity('005930', 10)).toBe(true);   // Samsung (KOSPI)
      expect(marketEngine.isValidOrderQuantity('005930', 20)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('005930', 5)).toBe(false);   // Below minimum
      expect(marketEngine.isValidOrderQuantity('005930', 15)).toBe(false);  // Not multiple of 10

      // KOSDAQ stocks - minimum 1 share, multiples of 1
      expect(marketEngine.isValidOrderQuantity('068270', 1)).toBe(true);    // Celltrion (KOSDAQ)
      expect(marketEngine.isValidOrderQuantity('068270', 100)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('068270', 0)).toBe(false);   // Zero quantity

      // KONEX stocks - minimum 100 shares, multiples of 100
      expect(marketEngine.isValidOrderQuantity('258270', 100)).toBe(true);  // KONEX stock
      expect(marketEngine.isValidOrderQuantity('258270', 200)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('258270', 50)).toBe(false);  // Below minimum
    });

    test('should enforce price limits', () => {
      const kospiStock = '005930';

      // Test valid price ranges
      expect(marketEngine.isValidOrderPrice(kospiStock, 1000)).toBe(true);    // Minimum price
      expect(marketEngine.isValidOrderPrice(kospiStock, 50000)).toBe(true);   // Normal price
      expect(marketEngine.isValidOrderPrice(kospiStock, 1000000)).toBe(true); // Maximum price

      // Test invalid prices
      expect(marketEngine.isValidOrderPrice(kospiStock, 0)).toBe(false);      // Zero price
      expect(marketEngine.isValidOrderPrice(kospiStock, -1000)).toBe(false);  // Negative price
      expect(marketEngine.isValidOrderPrice(kospiStock, 50)).toBe(false);     // Below minimum
      expect(marketEngine.isValidOrderPrice(kospiStock, 2000000)).toBe(false); // Above maximum
    });

    test('should calculate trading fees correctly', () => {
      const orderValue = 1000000; // 1,000,000 KRW

      const fees = marketEngine.calculateTradingFees(orderValue);

      expect(fees).toHaveProperty('commission');
      expect(fees).toHaveProperty('tax');
      expect(fees).toHaveProperty('total');

      // Commission should be around 0.015% (max 2,500 KRW)
      expect(fees.commission).toBeGreaterThan(0);
      expect(fees.commission).toBeLessThanOrEqual(2500);

      // Securities transaction tax should be 0.25% for sales (0% for purchases)
      expect(fees.tax).toBeGreaterThanOrEqual(0);

      // Total fees should be reasonable
      expect(fees.total).toBeGreaterThan(0);
      expect(fees.total).toBeLessThan(orderValue * 0.01); // Less than 1%
    });
  });

  describe('Financial Investment Services and Capital Markets Act', () => {
    test('should validate investor suitability', () => {
      const accounts = [
        {
          accountNumber: 'ACC-001',
          accountType: 'general',
          investorType: 'individual',
          riskProfile: 'conservative',
          investmentExperience: 'beginner',
          netWorth: 100000000, // 100M KRW
          annualIncome: 50000000  // 50M KRW
        },
        {
          accountNumber: 'ACC-002',
          accountType: 'general',
          investorType: 'professional',
          riskProfile: 'aggressive',
          investmentExperience: 'expert',
          netWorth: 1000000000, // 1B KRW
          annualIncome: 200000000 // 200M KRW
        }
      ];

      accounts.forEach(account => {
        const suitability = complianceEngine.validateInvestorSuitability?.(account);

        expect(suitability).toBeDefined();
        expect(suitability.isSuitable).toBeDefined();
        expect(suitability.restrictions).toBeDefined();
        expect(suitability.recommendedProducts).toBeDefined();

        if (account.investorType === 'professional') {
          expect(suitability.isSuitable).toBe(true);
          expect(suitability.restrictions).toHaveLength(0);
        }
      });
    });

    test('should enforce product suitability requirements', () => {
      const products = [
        {
          id: 'ETF-001',
          type: 'ETF',
          riskLevel: 'medium',
          minimumInvestment: 100000,
          investorRequirements: ['general', 'professional'],
          complexity: 'simple'
        },
        {
          id: 'DERIV-001',
          type: 'derivative',
          riskLevel: 'high',
          minimumInvestment: 10000000,
          investorRequirements: ['professional'],
          complexity: 'complex'
        },
        {
          id: 'ELW-001',
          type: 'ELW',
          riskLevel: 'very_high',
          minimumInvestment: 5000000,
          investorRequirements: ['professional'],
          complexity: 'very_complex'
        }
      ];

      const investors = [
        { type: 'general', experience: 'beginner', netWorth: 50000000 },
        { type: 'professional', experience: 'expert', netWorth: 1000000000 }
      ];

      investors.forEach(investor => {
        products.forEach(product => {
          const suitability = complianceEngine.validateProductSuitability?.(product, investor);

          if (investor.type === 'general' && product.type === 'derivative') {
            expect(suitability.isSuitable).toBe(false);
            expect(suitability.reason).toContain('restricted to professional investors');
          }

          if (investor.netWorth < product.minimumInvestment) {
            expect(suitability.isSuitable).toBe(false);
            expect(suitability.reason).toContain('minimum investment');
          }
        });
      });
    });

    test('should ensure proper disclosure requirements', () => {
      const productDisclosure = {
        productId: 'FUND-001',
        productName: 'KOSPI 200 Index Fund',
        productType: 'mutual_fund',
        risks: ['market_risk', 'tracking_error_risk', 'liquidity_risk'],
        fees: {
          managementFee: 0.005, // 0.5%
          custodianFee: 0.0002, // 0.02%
          totalExpenseRatio: 0.0072 // 0.72%
        },
        performance: [
          { year: 2021, return: 0.12 },
          { year: 2022, return: -0.08 },
          { year: 2023, return: 0.15 }
        ],
        disclaimer: 'Past performance does not guarantee future results'
      };

      const disclosureCheck = complianceEngine.validateDisclosureCompliance?.(productDisclosure);

      expect(disclosureCheck).toBeDefined();
      expect(disclosureCheck.isCompliant).toBe(true);
      expect(disclosureCheck.requiredFields).toBeDefined();
      expect(disclosureCheck.riskWarnings).toBeDefined();
      expect(disclosureCheck.feeDisclosure).toBeDefined();

      // Test missing disclosure
      const incompleteDisclosure = { ...productDisclosure };
      delete incompleteDisclosure.fees;

      const incompleteCheck = complianceEngine.validateDisclosureCompliance?.(incompleteDisclosure);
      expect(incompleteCheck.isCompliant).toBe(false);
      expect(incompleteCheck.missingFields).toContain('fees');
    });
  });

  describe('Act on Specified Financial Transactions', () => {
    test('should monitor suspicious transaction reporting (STR)', () => {
      const suspiciousTransactions = [
        {
          transactionId: 'TXN-001',
          customerId: 'CUST-001',
          amount: 50000000, // 50M KRW - reportable threshold
          transactionType: 'cash_deposit',
          frequency: 'single_large',
          suspiciousIndicators: ['structure_avoidance', 'unusual_pattern']
        },
        {
          transactionId: 'TXN-002',
          customerId: 'CUST-002',
          amount: 200000000, // 200M KRW
          transactionType: 'multiple_transfers',
          frequency: 'frequent_small',
          suspiciousIndicators: ['round_numbers', 'rapid_movement']
        }
      ];

      suspiciousTransactions.forEach(transaction => {
        const strAssessment = complianceEngine.assessSTRRequirement?.(transaction);

        expect(strAssessment).toBeDefined();
        expect(strAssessment.requiresReporting).toBeDefined();
        expect(strAssessment.suspiciousScore).toBeGreaterThan(0);
        expect(strAssessment.reportReasons).toBeDefined();
        expect(strAssessment.reportingDeadline).toBeInstanceOf(Date);

        if (transaction.amount >= 50000000) {
          expect(strAssessment.requiresReporting).toBe(true);
        }
      });
    });

    test('should implement customer due diligence (CDD)', () => {
      const customers = [
        {
          customerId: 'CUST-001',
          name: '홍길동',
          riskLevel: 'low',
          identification: {
            type: 'resident_registration',
            number: '900101-1234567',
            issuedDate: new Date('2010-01-01'),
            expiryDate: new Date('2030-01-01')
          },
          address: '서울시 강남구 테헤란로 123',
          occupation: '소프트웨어 엔지니어',
          sourceOfFunds: 'employment_income',
          expectedTransactionVolume: 10000000 // 10M KRW monthly
        },
        {
          customerId: 'CUST-002',
          name: '김철수',
          riskLevel: 'high',
          identification: {
            type: 'passport',
            number: 'M12345678',
            issuedDate: new Date('2020-01-01'),
            expiryDate: new Date('2025-01-01')
          },
          address: 'Foreign Address',
          occupation: 'business_owner',
          sourceOfFunds: 'business_income',
          expectedTransactionVolume: 500000000, // 500M KRW monthly
          politicallyExposedPerson: true
        }
      ];

      customers.forEach(customer => {
        const cddResult = complianceEngine.performCustomerDueDiligence?.(customer);

        expect(cddResult).toBeDefined();
        expect(cddResult.dueDiligenceLevel).toBeDefined();
        expect(cddResult.verificationRequired).toBeDefined();
        expect(cddResult.monitoringFrequency).toBeDefined();
        expect(cddResult.riskAssessment).toBeDefined();

        if (customer.riskLevel === 'high' || customer.politicallyExposedPerson) {
          expect(cddResult.dueDiligenceLevel).toBe('enhanced');
          expect(cddResult.verificationRequired).toBe(true);
          expect(cddResult.monitoringFrequency).toBe('continuous');
        }
      });
    });

    test('should enforce transaction limits and monitoring', () => {
      const transactionLimits = {
        dailyLimit: 100000000,      // 100M KRW per day
        monthlyLimit: 1000000000,   // 1B KRW per month
        singleTransactionLimit: 50000000, // 50M KRW per transaction
        cashTransactionLimit: 20000000 // 20M KRW for cash transactions
      };

      const testTransactions = [
        {
          amount: 30000000,
          type: 'securities_purchase',
          customerDailyTotal: 80000000,
          customerMonthlyTotal: 500000000
        },
        {
          amount: 60000000,
          type: 'cash_withdrawal',
          customerDailyTotal: 110000000,
          customerMonthlyTotal: 800000000
        },
        {
          amount: 1200000000,
          type: 'securities_purchase',
          customerDailyTotal: 1200000000,
          customerMonthlyTotal: 1200000000
        }
      ];

      testTransactions.forEach(transaction => {
        const limitCheck = complianceEngine.checkTransactionLimits?.(transaction, transactionLimits);

        expect(limitCheck).toBeDefined();
        expect(limitCheck.isWithinLimits).toBeDefined();
        expect(limitCheck.violations).toBeDefined();
        expect(limitCheck.blockingRequired).toBeDefined();

        if (transaction.amount > transactionLimits.singleTransactionLimit ||
            transaction.customerDailyTotal > transactionLimits.dailyLimit ||
            transaction.customerMonthlyTotal > transactionLimits.monthlyLimit) {
          expect(limitCheck.isWithinLimits).toBe(false);
          expect(limitCheck.violations.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Electronic Financial Transactions Act', () => {
    test('should ensure secure electronic transaction processing', async () => {
      const electronicTransaction = {
        transactionId: 'ETX-001',
        transactionType: 'securities_purchase',
        amount: 10000000,
        customerAuthentication: {
          method: 'multi_factor',
          factors: ['password', 'sms_otp', 'biometric'],
          timestamp: new Date()
        },
        encryption: {
          algorithm: 'AES-256-GCM',
          keyLength: 256,
          protocol: 'TLS 1.3'
        },
        auditTrail: {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0...',
          deviceId: 'DEVICE-001',
          location: 'Seoul, Korea'
        }
      };

      const securityCheck = complianceEngine.validateElectronicTransactionSecurity?.(electronicTransaction);

      expect(securityCheck).toBeDefined();
      expect(securityCheck.isSecure).toBe(true);
      expect(securityCheck.encryptionValid).toBe(true);
      expect(securityCheck.authenticationValid).toBe(true);
      expect(securityCheck.auditTrailComplete).toBe(true);

      // Test insecure transaction
      const insecureTransaction = { ...electronicTransaction };
      insecureTransaction.customerAuthentication.method = 'password_only';
      insecureTransaction.encryption.algorithm = 'DES';

      const insecureCheck = complianceEngine.validateElectronicTransactionSecurity?.(insecureTransaction);
      expect(insecureCheck.isSecure).toBe(false);
      expect(insecureCheck.securityIssues.length).toBeGreaterThan(0);
    });

    test('should implement electronic signature requirements', () => {
      const electronicSignatures = [
        {
          signatureId: 'ESIG-001',
          type: 'certificate_based',
          certificate: {
            issuer: 'Korea Financial Certification Authority',
            subject: 'Hong Gildong',
            validFrom: new Date('2024-01-01'),
            validTo: new Date('2025-01-01'),
            publicKeyAlgorithm: 'RSA-2048'
          },
          signedData: 'document_hash_signature',
          timestamp: new Date()
        },
        {
          signatureId: 'ESIG-002',
          type: 'biometric',
          biometricData: {
            type: 'fingerprint',
            template: 'encrypted_fingerprint_template',
            confidence: 0.95
          },
          signedData: 'transaction_approval_signature',
          timestamp: new Date()
        }
      ];

      electronicSignatures.forEach(signature => {
        const signatureValidation = complianceEngine.validateElectronicSignature?.(signature);

        expect(signatureValidation).toBeDefined();
        expect(signatureValidation.isValid).toBeDefined();
        expect(signatureValidation.certificateValid).toBeDefined();
        expect(signatureValidation.timestampValid).toBeDefined();

        if (signature.type === 'certificate_based') {
          expect(signatureValidation.certificateValid).toBe(true);
          expect(signatureValidation.issuerTrusted).toBe(true);
        }

        if (signature.type === 'biometric') {
          expect(signatureValidation.confidenceScore).toBeGreaterThan(0.8);
        }
      });
    });
  });

  describe('Personal Information Protection Act (PIPA)', () => {
    test('should enforce consent management for personal data', () => {
      const consentRecords = [
        {
          consentId: 'CONSENT-001',
          customerId: 'CUST-001',
          dataCategories: ['personal_identification', 'financial_information', 'transaction_history'],
          purposes: ['service_provision', 'fraud_prevention', 'marketing'],
          consentDate: new Date('2024-01-01'),
          withdrawalDate: null,
          withdrawalAllowed: true
        },
        {
          consentId: 'CONSENT-002',
          customerId: 'CUST-002',
          dataCategories: ['personal_identification'],
          purposes: ['legal_compliance_only'],
          consentDate: new Date('2024-01-01'),
          withdrawalDate: null,
          withdrawalAllowed: false // Required for legal compliance
        }
      ];

      consentRecords.forEach(consent => {
        const consentValidation = complianceEngine.validateConsentRecord?.(consent);

        expect(consentValidation).toBeDefined();
        expect(consentValidation.isValid).toBe(true);
        expect(consentValidation.purposeSpecific).toBe(true);
        expect(consentValidation.informative).toBe(true);
        expect(consentValidation.revocable).toBeDefined();

        // Test consent withdrawal
        if (consent.withdrawalAllowed) {
          const withdrawalValidation = complianceEngine.processConsentWithdrawal?.(
            consent.consentId,
            new Date()
          );
          expect(withdrawalValidation.success).toBe(true);
          expect(withdrawalValidation.dataDeletionRequired).toBe(true);
        }
      });
    });

    test('should implement data minimization principles', () => {
      const dataCollectionScenarios = [
        {
          purpose: 'account_opening',
          requestedData: ['name', 'ssn', 'address', 'phone', 'email', 'income', 'credit_history'],
          expectedMinimalData: ['name', 'ssn', 'address', 'phone', 'email']
        },
        {
          purpose: 'trading_service',
          requestedData: ['name', 'ssn', 'income', 'family_composition', 'health_records', 'political_views'],
          expectedMinimalData: ['name'] // Only name needed for trading
        },
        {
          purpose: 'risk_assessment',
          requestedData: ['name', 'ssn', 'income', 'investment_experience', 'net_worth', 'risk_tolerance'],
          expectedMinimalData: ['income', 'investment_experience', 'net_worth', 'risk_tolerance']
        }
      ];

      dataCollectionScenarios.forEach(scenario => {
        const minimizationCheck = complianceEngine.applyDataMinimization?.(
          scenario.requestedData,
          scenario.purpose
        );

        expect(minimizationCheck).toBeDefined();
        expect(minimizationCheck.minimalData).toBeDefined();
        expect(minimizationCheck.excludedData).toBeDefined();
        expect(minimizationCheck.justification).toBeDefined();

        // Verify that only necessary data is collected
        scenario.expectedMinimalData.forEach(requiredData => {
          expect(minimizationCheck.minimalData).toContain(requiredData);
        });

        // Verify unnecessary data is excluded
        scenario.requestedData.forEach(requestedData => {
          if (!scenario.expectedMinimalData.includes(requestedData)) {
            expect(minimizationCheck.excludedData).toContain(requestedData);
          }
        });
      });
    });

    test('should ensure data subject rights implementation', () => {
      const dataSubjectRequests = [
        {
          requestId: 'DSR-001',
          customerId: 'CUST-001',
          requestType: 'access',
          dataType: 'all_personal_data',
          requestDate: new Date(),
          identityVerified: true
        },
        {
          requestId: 'DSR-002',
          customerId: 'CUST-002',
          requestType: 'correction',
          dataType: 'contact_information',
          corrections: {
            phone: '010-9999-8888',
            email: 'newemail@example.com'
          },
          requestDate: new Date(),
          identityVerified: true
        },
        {
          requestId: 'DSR-003',
          customerId: 'CUST-003',
          requestType: 'erasure',
          dataType: 'marketing_preferences',
          requestDate: new Date(),
          identityVerified: true
        }
      ];

      dataSubjectRequests.forEach(request => {
        const requestProcessing = complianceEngine.processDataSubjectRequest?.(request);

        expect(requestProcessing).toBeDefined();
        expect(requestProcessing.canProcess).toBeDefined();
        expect(requestProcessing.processingTime).toBeDefined();
        expect(requestProcessing.responseDeadline).toBeDefined();

        if (request.identityVerified) {
          expect(requestProcessing.canProcess).toBe(true);

          if (request.requestType === 'access') {
            expect(requestProcessing.providedData).toBeDefined();
            expect(requestProcessing.dataMaskingApplied).toBe(true);
          }

          if (request.requestType === 'correction') {
            expect(requestProcessing.correctionsApplied).toBe(true);
          }

          if (request.requestType === 'erasure') {
            expect(requestProcessing.dataErased).toBe(true);
            expect(requestProcessing.erasureCertificate).toBeDefined();
          }
        }
      });
    });
  });

  describe 'Foreign Exchange Transactions Act', () => {
    test('should monitor foreign exchange transaction reporting', () => {
      const foreignExchangeTransactions = [
        {
          transactionId: 'FX-001',
          customerId: 'CUST-001',
          currency: 'USD',
          amount: 50000, // $50,000 USD
          krwAmount: 65000000, // 65M KRW
          transactionType: 'securities_purchase',
          purpose: 'investment',
          isResident: true,
          reportingRequired: true
        },
        {
          transactionId: 'FX-002',
          customerId: 'CUST-002',
          currency: 'EUR',
          amount: 100000, // €100,000 EUR
          krwAmount: 145000000, // 145M KRW
          transactionType: 'foreign_account_transfer',
          purpose: 'remittance',
          isResident: false,
          reportingRequired: true
        }
      ];

      foreignExchangeTransactions.forEach(transaction => {
        const fxComplianceCheck = complianceEngine.validateForeignExchangeTransaction?.(transaction);

        expect(fxComplianceCheck).toBeDefined();
        expect(fxComplianceCheck.isCompliant).toBeDefined();
        expect(fxComplianceCheck.reportingRequirements).toBeDefined();
        expect(fxComplianceCheck.documentationRequired).toBeDefined();

        // Check annual limits for residents
        if (transaction.isResident) {
          const annualLimitCheck = complianceEngine.checkAnnualFXLimit?.(transaction);
          expect(annualLimitCheck).toBeDefined();
          expect(annualLimitCheck.withinLimit).toBeDefined();
          expect(annualLimitCheck.remainingLimit).toBeDefined();
        }

        // Check reporting thresholds
        if (transaction.krwAmount >= 10000000) { // $10,000 USD equivalent
          expect(fxComplianceCheck.reportingRequired).toBe(true);
        }
      });
    });

    test('should validate foreign investment registration', () => {
      const foreignInvestors = [
        {
          investorId: 'FOR-001',
          nationality: 'USA',
          investorType: 'individual',
          registrationNumber: 'FIA-2024-001',
          registrationDate: new Date('2024-01-01'),
          registrationExpiry: new Date('2025-01-01'),
          investmentLimit: 1000000000, // 1B KRW
          currentInvestment: 500000000, // 500M KRW
          restrictedSectors: ['defense', 'telecommunications']
        },
        {
          investorId: 'FOR-002',
          nationality: 'Singapore',
          investorType: 'institutional',
          registrationNumber: 'FIA-2024-002',
          registrationDate: new Date('2024-06-01'),
          registrationExpiry: new Date('2025-06-01'),
          investmentLimit: 5000000000, // 5B KRW
          currentInvestment: 2000000000, // 2B KRW
          restrictedSectors: []
        }
      ];

      foreignInvestors.forEach(investor => {
        const registrationValidation = complianceEngine.validateForeignInvestorRegistration?.(investor);

        expect(registrationValidation).toBeDefined();
        expect(registrationValidation.isRegistrationValid).toBeDefined();
        expect(registrationValidation.withinInvestmentLimits).toBeDefined();
        expect(registrationValidation.canInvest).toBeDefined();

        // Check registration expiry
        const now = new Date();
        if (investor.registrationExpiry < now) {
          expect(registrationValidation.isRegistrationValid).toBe(false);
          expect(registrationValidation.renewalRequired).toBe(true);
        }

        // Check investment limits
        if (investor.currentInvestment > investor.investmentLimit) {
          expect(registrationValidation.withinInvestmentLimits).toBe(false);
          expect(registrationValidation.limitExceeded).toBe(true);
        }
      });
    });
  });

  describe('Tax Compliance', () => {
    test('should calculate and withhold correct taxes', () => {
      const taxableTransactions = [
        {
          transactionId: 'TAX-001',
          transactionType: 'stock_sale',
          proceeds: 11000000, // 11M KRW
          costBasis: 10000000, // 10M KRW
          holdingPeriod: 180, // days
          investorType: 'individual',
          taxRate: 0.22 // 22% for individuals
        },
        {
          transactionId: 'TAX-002',
          transactionType: 'stock_sale',
          proceeds: 10500000, // 10.5M KRW
          costBasis: 10000000, // 10M KRW
          holdingPeriod: 30, // days (short-term)
          investorType: 'individual',
          taxRate: 0.22 // 22% for individuals
        },
        {
          transactionId: 'TAX-003',
          transactionType: 'stock_sale',
          proceeds: 12000000, // 12M KRW
          costBasis: 10000000, // 10M KRW
          holdingPeriod: 400, // days (long-term)
          investorType: 'foreigner',
          taxRate: 0.11 // 11% for foreigners
        }
      ];

      taxableTransactions.forEach(transaction => {
        const taxCalculation = complianceEngine.calculateCapitalGainsTax?.(transaction);

        expect(taxCalculation).toBeDefined();
        expect(taxCalculation.capitalGain).toBeDefined();
        expect(taxCalculation.taxAmount).toBeDefined();
        expect(taxCalculation.withholdingRequired).toBeDefined();

        const expectedGain = transaction.proceeds - transaction.costBasis;
        expect(taxCalculation.capitalGain).toBe(expectedGain);

        if (expectedGain > 0) {
          expect(taxCalculation.taxAmount).toBeGreaterThan(0);
          expect(taxCalculation.withholdingRequired).toBe(true);
        }

        // Verify tax rate application
        const expectedTax = expectedGain > 0 ? expectedGain * transaction.taxRate : 0;
        expect(taxCalculation.taxAmount).toBeCloseTo(expectedTax, 1);
      });
    });

    test('should generate required tax documentation', () => {
      const taxYear = 2023;
      const customerId = 'CUST-001';

      const taxDocumentation = {
        customerId,
        taxYear,
        transactions: [
          {
            date: new Date('2023-03-15'),
            type: 'purchase',
            symbol: '005930',
            quantity: 100,
            price: 80000,
            amount: 8000000
          },
          {
            date: new Date('2023-09-20'),
            type: 'sale',
            symbol: '005930',
            quantity: 100,
            price: 85000,
            amount: 8500000
          }
        ],
        totalCapitalGains: 500000,
        totalCapitalLosses: 0,
        taxableGains: 500000,
        taxWithheld: 110000,
        documentationRequired: ['yearly_tax_statement', 'transaction_history', 'foreign_tax_credit']
      };

      const taxDocsGeneration = complianceEngine.generateTaxDocumentation?.(taxDocumentation);

      expect(taxDocsGeneration).toBeDefined();
      expect(taxDocsGeneration.documents).toBeDefined();
      expect(taxDocsGeneration.documents).toContain('yearly_tax_statement');
      expect(taxDocsGeneration.documents).toContain('transaction_history');

      // Verify document content
      const taxStatement = taxDocsGeneration.getTaxStatement?.();
      expect(taxStatement).toBeDefined();
      expect(taxStatement.customerId).toBe(customerId);
      expect(taxStatement.taxYear).toBe(taxYear);
      expect(taxStatement.totalGains).toBe(500000);
      expect(taxStatement.taxWithheld).toBe(110000);

      // Verify digital signature and encryption
      expect(taxStatement.digitalSignature).toBeDefined();
      expect(taxStatement.encrypted).toBe(true);
    });
  });

  describe('Market Abuse Regulation', () => {
    test('should detect insider trading patterns', () => {
      const suspiciousTrades = [
        {
          traderId: 'TRADER-001',
          insider: true,
          trades: [
            {
              symbol: 'ABC-001',
              action: 'BUY',
              quantity: 10000,
              price: 15000,
              date: new Date('2024-01-15'),
              materialInformation: 'earnings_release_scheduled'
            },
            {
              symbol: 'ABC-001',
              action: 'SELL',
              quantity: 10000,
              price: 18000,
              date: new Date('2024-01-20'),
              materialInformation: 'positive_earnings_released'
            }
          ]
        }
      ];

      suspiciousTrades.forEach(tradePattern => {
        const insiderTradingAnalysis = complianceEngine.analyzeInsiderTradingRisk?.(tradePattern);

        expect(insiderTradingAnalysis).toBeDefined();
        expect(insiderTradingAnalysis.riskScore).toBeGreaterThan(0);
        expect(insiderTradingAnalysis.suspiciousPatterns).toBeDefined();
        expect(insiderTradingAnalysis.recommendation).toBeDefined();

        if (tradePattern.insider) {
          expect(insiderTradingAnalysis.requiresInvestigation).toBe(true);
        }
      });
    });

    test('should detect market manipulation patterns', () => {
      const manipulationPatterns = [
        {
          patternType: 'wash_trading',
          symbol: 'XYZ-001',
          trades: [
            { action: 'BUY', quantity: 1000, price: 10000, time: '09:30:00' },
            { action: 'SELL', quantity: 1000, price: 10000, time: '09:30:05' }
          ],
          indicators: ['same_price', 'immediate_sell', 'same_quantity']
        },
        {
          patternType: 'spoofing',
          symbol: 'DEF-001',
          trades: [
            { action: 'BUY', quantity: 50000, price: 9500, time: '10:00:00', cancelled: true },
            { action: 'SELL', quantity: 1000, price: 9400, time: '10:00:10' }
          ],
          indicators: ['large_order_cancelled', 'immediate_opposite_trade']
        }
      ];

      manipulationPatterns.forEach(pattern => {
        const manipulationAnalysis = complianceEngine.analyzeMarketManipulation?.(pattern);

        expect(manipulationAnalysis).toBeDefined();
        expect(manipulationAnalysis.isManipulative).toBeDefined();
        expect(manipulationAnalysis.confidenceScore).toBeGreaterThan(0);
        expect(manipulationAnalysis.alertLevel).toBeDefined();

        if (manipulationAnalysis.isManipulative) {
          expect(['HIGH', 'CRITICAL']).toContain(manipulationAnalysis.alertLevel);
          expect(manipulationAnalysis.requiresReporting).toBe(true);
        }
      });
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});