/**
 * Security tests for authentication and authorization
 */

import { KSET } from '../../src/core/KSET';
import { MockProvider } from '../mocks/MockProvider';
import { KSETErrorFactory, ERROR_CODES } from '../../src/errors';
import type { ProviderConfig } from '../../src/interfaces';

describe('Security Authentication Tests', () => {
  let kset: KSET;
  let mockProvider: MockProvider;

  beforeEach(() => {
    kset = new KSET({
      logLevel: 'debug',
      defaultTimeout: 30000,
      retryAttempts: 3
    });

    mockProvider = new MockProvider('test-provider', 'Test Security Provider');
  });

  afterEach(async () => {
    try {
      await mockProvider.disconnect();
      await kset['cleanup']();
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Credential Validation', () => {
    test('should reject missing credentials', async () => {
      const invalidConfigs = [
        {}, // Empty config
        { credentials: {} }, // Empty credentials
        { credentials: null }, // Null credentials
        { credentials: undefined } // Undefined credentials
      ];

      for (const config of invalidConfigs) {
        await expect(
          kset.createProvider('test-broker', config as ProviderConfig)
        ).rejects.toThrow();
      }
    });

    test('should reject invalid certificate formats', async () => {
      const invalidCertificateConfigs = [
        {
          credentials: {
            certificate: 'invalid-format',
            password: 'test123'
          }
        },
        {
          credentials: {
            certificate: '', // Empty certificate
            password: 'test123'
          }
        },
        {
          credentials: {
            certificate: 'not-a-valid-certificate-file',
            password: '' // Empty password
          }
        }
      ];

      for (const config of invalidCertificateConfigs) {
        await expect(
          kset.createProvider('test-broker', config as ProviderConfig)
        ).rejects.toThrow();
      }
    });

    test('should reject weak passwords', async () => {
      const weakPasswordConfigs = [
        {
          credentials: {
            certificate: 'test-cert.p12',
            password: '123' // Too short
          }
        },
        {
          credentials: {
            certificate: 'test-cert.p12',
            password: 'password' // Common password
          }
        },
        {
          credentials: {
            certificate: 'test-cert.p12',
            password: 'qwerty' // Sequential keys
          }
        }
      ];

      for (const config of weakPasswordConfigs) {
        await expect(
          kset.createProvider('test-broker', config as ProviderConfig)
        ).rejects.toThrow();
      }
    });

    test('should validate API key format', async () => {
      const invalidAPIKeyConfigs = [
        {
          credentials: {
            apiKey: 'short',
            secretKey: 'test-secret'
          }
        },
        {
          credentials: {
            apiKey: '', // Empty API key
            secretKey: 'test-secret'
          }
        },
        {
          credentials: {
            apiKey: 'invalid-characters-!@#$%',
            secretKey: 'test-secret'
          }
        }
      ];

      for (const config of invalidAPIKeyConfigs) {
        await expect(
          kset.createProvider('test-broker', config as ProviderConfig)
        ).rejects.toThrow();
      }
    });

    test('should handle expired credentials', async () => {
      const expiredCredentialsConfig = {
        credentials: {
          certificate: 'expired-cert.p12',
          password: 'test123',
          expiryDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Expired yesterday
        }
      };

      await expect(
        kset.createProvider('test-broker', expiredCredentialsConfig as ProviderConfig)
      ).rejects.toThrow('Credentials have expired');
    });
  });

  describe('Session Management', () => {
    test('should create secure session tokens', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        }
      });

      // Mock session creation
      const sessionToken = mockProvider.generateSessionToken?.() || 'mock-session-token';

      expect(sessionToken).toBeDefined();
      expect(typeof sessionToken).toBe('string');
      expect(sessionToken.length).toBeGreaterThan(32); // Should be sufficiently long
    });

    test('should invalidate session on logout', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        }
      });

      // Mock session management
      const sessionToken = 'test-session-token';
      mockProvider.setSessionToken?.(sessionToken);

      // Simulate logout
      await mockProvider.logout?.();

      // Verify session is invalidated
      expect(mockProvider.getSessionToken?.()).not.toBe(sessionToken);
    });

    test('should handle session timeout', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        },
        sessionTimeout: 1000 // 1 second timeout for testing
      });

      const sessionToken = 'test-session-token';
      mockProvider.setSessionToken?.(sessionToken);

      // Wait for session timeout
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Verify session has expired
      expect(mockProvider.isSessionValid?.()).toBe(false);
    });

    test('should prevent session hijacking', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        }
      });

      const sessionToken = 'legitimate-session-token';
      mockProvider.setSessionToken?.(sessionToken);

      // Simulate hijack attempt with different IP
      const hijackedSession = {
        token: sessionToken,
        ipAddress: '192.168.1.100', // Different from original
        userAgent: 'Hijacked Browser'
      };

      expect(() => {
        mockProvider.validateSession?.(hijackedSession);
      }).toThrow('Session validation failed');
    });
  });

  describe('Multi-Factor Authentication', () => {
    test('should require MFA for sensitive operations', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!',
          mfaRequired: true
        }
      });

      // Attempt sensitive operation without MFA
      const sensitiveOperation = async () => {
        return mockProvider.placeOrder({
          symbol: '005930',
          side: 'BUY',
          orderType: 'LIMIT',
          quantity: 100,
          price: 85000,
          account: 'TEST-ACCOUNT'
        });
      };

      await expect(sensitiveOperation()).rejects.toThrow('Multi-factor authentication required');
    });

    test('should validate MFA codes', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!',
          mfaRequired: true
        }
      });

      // Test invalid MFA codes
      const invalidMFACodes = [
        '123456', // Too short
        'abcdef', // Non-numeric
        '1234567', // Too long
        '', // Empty
        '000000' // All zeros (often invalid)
      ];

      for (const mfaCode of invalidMFACodes) {
        expect(() => {
          mockProvider.validateMFACode?.(mfaCode);
        }).toThrow();
      }
    });

    test('should handle MFA rate limiting', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!',
          mfaRequired: true
        }
      });

      // Attempt multiple MFA validations with wrong codes
      for (let i = 0; i < 5; i++) {
        try {
          mockProvider.validateMFACode?.('000000');
        } catch (error) {
          // Expected to fail
        }
      }

      // Should be rate limited now
      await expect(
        mockProvider.validateMFACode?.('123456')
      ).rejects.toThrow('Too many MFA attempts');
    });
  });

  describe('Authorization and Access Control', () => {
    test('should enforce role-based access control', async () => {
      const userRoles = [
        { role: 'viewer', permissions: ['read'] },
        { role: 'trader', permissions: ['read', 'trade'] },
        { role: 'admin', permissions: ['read', 'trade', 'admin'] }
      ];

      for (const userRole of userRoles) {
        mockProvider.setUserRole?.(userRole);

        // Test permissions based on role
        if (userRole.role === 'viewer') {
          // Should be able to read market data
          const marketData = await mockProvider.getMarketData(['005930']);
          expect(marketData.success).toBe(true);

          // Should not be able to place orders
          await expect(
            mockProvider.placeOrder({
              symbol: '005930',
              side: 'BUY',
              orderType: 'LIMIT',
              quantity: 100,
              price: 85000,
              account: 'TEST-ACCOUNT'
            })
          ).rejects.toThrow('Insufficient permissions');
        } else if (userRole.role === 'trader') {
          // Should be able to place orders
          const order = await mockProvider.placeOrder({
            symbol: '005930',
            side: 'BUY',
            orderType: 'LIMIT',
            quantity: 100,
            price: 85000,
            account: 'TEST-ACCOUNT'
          });
          expect(order.success).toBe(true);

          // Should not be able to access admin functions
          await expect(
            mockProvider.getSystemLogs?.()
          ).rejects.toThrow('Insufficient permissions');
        }
      }
    });

    test('should validate account ownership', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        }
      });

      const userAccounts = ['ACCOUNT-001', 'ACCOUNT-002'];
      mockProvider.setUserAccounts?.(userAccounts);

      // Should allow operations on owned accounts
      const validOrder = await mockProvider.placeOrder({
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 100,
        price: 85000,
        account: 'ACCOUNT-001'
      });
      expect(validOrder.success).toBe(true);

      // Should reject operations on non-owned accounts
      await expect(
        mockProvider.placeOrder({
          symbol: '005930',
          side: 'BUY',
          orderType: 'LIMIT',
          quantity: 100,
          price: 85000,
          account: 'ACCOUNT-999' // Not owned
        })
      ).rejects.toThrow('Account not owned by user');
    });

    test('should enforce trading limits', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        },
        tradingLimits: {
          maxOrderValue: 10000000, // 10M KRW
          maxDailyVolume: 100000000, // 100M KRW
          maxPositionSize: 50000000 // 50M KRW
        }
      });

      // Should accept orders within limits
      const validOrder = await mockProvider.placeOrder({
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 10,
        price: 50000, // 500K KRW total
        account: 'TEST-ACCOUNT'
      });
      expect(validOrder.success).toBe(true);

      // Should reject orders exceeding limits
      await expect(
        mockProvider.placeOrder({
          symbol: '005930',
          side: 'BUY',
          orderType: 'LIMIT',
          quantity: 1000,
          price: 50000, // 50M KRW total - exceeds maxOrderValue
          account: 'TEST-ACCOUNT'
        })
      ).rejects.toThrow('Order value exceeds trading limits');
    });
  });

  describe('Encryption and Data Protection', () => {
    test('should encrypt sensitive data at rest', async () => {
      const sensitiveData = {
        certificate: 'sensitive-cert-data',
        password: 'sensitive-password',
        apiKey: 'sensitive-api-key'
      };

      const encryptedData = mockProvider.encryptSensitiveData?.(sensitiveData);

      expect(encryptedData).toBeDefined();
      expect(encryptedData).not.toEqual(sensitiveData);
      expect(typeof encryptedData).toBe('string');

      // Should be able to decrypt
      const decryptedData = mockProvider.decryptSensitiveData?.(encryptedData);
      expect(decryptedData).toEqual(sensitiveData);
    });

    test('should encrypt data in transit', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        },
        encryptionEnabled: true
      });

      // Mock data transmission
      const sensitiveMessage = {
        type: 'order_request',
        data: {
          symbol: '005930',
          quantity: 100,
          price: 85000
        }
      };

      const encryptedMessage = mockProvider.encryptMessage?.(sensitiveMessage);
      expect(encryptedMessage).toBeDefined();
      expect(encryptedMessage).not.toEqual(sensitiveMessage);

      // Should be able to decrypt
      const decryptedMessage = mockProvider.decryptMessage?.(encryptedMessage);
      expect(decryptedMessage).toEqual(sensitiveMessage);
    });

    test('should handle key rotation', async () => {
      await mockProvider.initialize({
        credentials: {
          certificate: 'test-cert.p12',
          password: 'SecurePassword123!'
        }
      });

      const originalKeyId = mockProvider.getCurrentKeyId?.();

      // Rotate keys
      await mockProvider.rotateEncryptionKeys?.();

      const newKeyId = mockProvider.getCurrentKeyId?.();
      expect(newKeyId).not.toBe(originalKeyId);

      // Should still be able to decrypt old data
      const oldData = 'sensitive-data-with-old-key';
      const encryptedWithOldKey = mockProvider.encryptWithKey?.(oldData, originalKeyId);
      const decryptedData = mockProvider.decryptMessage?.(encryptedWithOldKey);
      expect(decryptedData).toBe(oldData);
    });

    test('should securely handle data deletion', async () => {
      const sensitiveData = {
        accountNumber: '123-456-789',
        ssn: '900101-1234567',
        creditCard: '1234-5678-9012-3456'
      };

      // Store sensitive data
      const dataId = mockProvider.storeSensitiveData?.(sensitiveData);
      expect(dataId).toBeDefined();

      // Verify data exists
      let retrievedData = mockProvider.getSensitiveData?.(dataId);
      expect(retrievedData).toEqual(sensitiveData);

      // Securely delete data
      mockProvider.secureDeleteSensitiveData?.(dataId);

      // Verify data is completely deleted
      retrievedData = mockProvider.getSensitiveData?.(dataId);
      expect(retrievedData).toBeUndefined();

      // Verify data cannot be recovered from disk/memory
      expect(mockProvider.canRecoverData?.(dataId)).toBe(false);
    });
  });

  describe('Audit Logging and Monitoring', () => {
    test('should log all authentication attempts', async () => {
      const auditLogger = mockProvider.getAuditLogger?.();

      // Simulate login attempts
      const loginAttempts = [
        { username: 'user1', success: true, timestamp: new Date() },
        { username: 'user2', success: false, reason: 'invalid_password', timestamp: new Date() },
        { username: 'user3', success: false, reason: 'account_locked', timestamp: new Date() }
      ];

      loginAttempts.forEach(attempt => {
        mockProvider.logAuthenticationAttempt?.(attempt);
      });

      const authLogs = auditLogger?.getLogsByType?.('authentication');
      expect(authLogs).toHaveLength(loginAttempts.length);

      // Verify log content
      authLogs?.forEach((log: any, index: number) => {
        expect(log.username).toBe(loginAttempts[index].username);
        expect(log.success).toBe(loginAttempts[index].success);
        expect(log.timestamp).toBeInstanceOf(Date);
      });
    });

    test('should log all sensitive operations', async () => {
      const auditLogger = mockProvider.getAuditLogger?.();

      // Perform sensitive operations
      const operations = [
        { type: 'order_place', data: { symbol: '005930', quantity: 100 } },
        { type: 'account_balance_view', data: { account: 'ACC-001' } },
        { type: 'password_change', data: { username: 'user1' } },
        { type: 'mfa_disable', data: { username: 'user1', reason: 'support_request' } }
      ];

      operations.forEach(operation => {
        mockProvider.logSensitiveOperation?.(operation);
      });

      const sensitiveLogs = auditLogger?.getLogsByType?.('sensitive_operation');
      expect(sensitiveLogs).toHaveLength(operations.length);

      // Verify logs contain required security fields
      sensitiveLogs?.forEach((log: any) => {
        expect(log).toHaveProperty('type');
        expect(log).toHaveProperty('userId');
        expect(log).toHaveProperty('timestamp');
        expect(log).toHaveProperty('ipAddress');
        expect(log).toHaveProperty('userAgent');
        expect(log).toHaveProperty('data');
      });
    });

    test('should detect and log suspicious activities', async () => {
      const securityMonitor = mockProvider.getSecurityMonitor?.();

      // Simulate suspicious activities
      const suspiciousActivities = [
        {
          type: 'multiple_failed_logins',
          userId: 'user1',
          details: { attempts: 5, timeframe: '5 minutes' }
        },
        {
          type: 'unusual_access_pattern',
          userId: 'user2',
          details: { accessTime: '3:00 AM', location: 'Foreign country' }
        },
        {
          type: 'large_order_placement',
          userId: 'user3',
          details: { orderValue: '500M KRW', normalAverage: '10M KRW' }
        }
      ];

      suspiciousActivities.forEach(activity => {
        securityMonitor?.reportSuspiciousActivity?.(activity);
      });

      const alerts = securityMonitor?.getSecurityAlerts?.();
      expect(alerts.length).toBeGreaterThan(0);

      // Verify alerts contain required information
      alerts.forEach((alert: any) => {
        expect(alert).toHaveProperty('type');
        expect(alert).toHaveProperty('severity');
        expect(alert).toHaveProperty('timestamp');
        expect(alert).toHaveProperty('description');
        expect(alert).toHaveProperty('recommendations');
        expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(alert.severity);
      });
    });
  });

  describe('Network Security', () => {
    test('should validate SSL/TLS certificates', async () => {
      const networkSecurity = mockProvider.getNetworkSecurity?.();

      // Test valid certificates
      const validCertificates = [
        {
          hostname: 'api.kiwoom.com',
          port: 443,
          certificate: 'valid-ssl-certificate'
        }
      ];

      validCertificates.forEach(cert => {
        const isValid = networkSecurity?.validateCertificate?.(cert);
        expect(isValid).toBe(true);
      });

      // Test invalid certificates
      const invalidCertificates = [
        {
          hostname: 'api.kiwoom.com',
          port: 443,
          certificate: 'expired-certificate'
        },
        {
          hostname: 'api.kiwoom.com',
          port: 443,
          certificate: 'self-signed-certificate'
        },
        {
          hostname: 'wrong-hostname.com',
          port: 443,
          certificate: 'valid-but-wrong-host'
        }
      ];

      invalidCertificates.forEach(cert => {
        const isValid = networkSecurity?.validateCertificate?.(cert);
        expect(isValid).toBe(false);
      });
    });

    test('should enforce secure connection protocols', async () => {
      const networkSecurity = mockProvider.getNetworkSecurity?.();

      // Test secure protocols
      const secureProtocols = ['TLSv1.2', 'TLSv1.3'];
      secureProtocols.forEach(protocol => {
        const isSecure = networkSecurity?.isProtocolSecure?.(protocol);
        expect(isSecure).toBe(true);
      });

      // Test insecure protocols
      const insecureProtocols = ['SSLv2', 'SSLv3', 'TLSv1.0', 'TLSv1.1'];
      insecureProtocols.forEach(protocol => {
        const isSecure = networkSecurity?.isProtocolSecure?.(protocol);
        expect(isSecure).toBe(false);
      });
    });

    test('should detect and prevent man-in-the-middle attacks', async () => {
      const networkSecurity = mockProvider.getNetworkSecurity?.();

      // Simulate MITM detection
      const connectionDetails = {
        remoteAddress: '192.168.1.100',
        certificateFingerprint: 'suspicious-fingerprint',
        certificateChain: ['suspicious-intermediate-cert']
      };

      const mitmDetected = networkSecurity?.detectMITM?.(connectionDetails);
      expect(mitmDetected).toBe(true);

      // Should block connection if MITM detected
      expect(() => {
        networkSecurity?.establishSecureConnection?.(connectionDetails);
      }).toThrow('Potential man-in-the-middle attack detected');
    });

    test('should implement rate limiting', async () => {
      const rateLimiter = mockProvider.getRateLimiter?.();

      // Test normal usage
      for (let i = 0; i < 10; i++) {
        const allowed = rateLimiter?.isAllowed?.('test-client', 'api-request');
        expect(allowed).toBe(true);
      }

      // Simulate rapid requests to trigger rate limiting
      for (let i = 0; i < 100; i++) {
        rateLimiter?.isAllowed?.('test-client', 'api-request');
      }

      // Should be rate limited now
      const isAllowed = rateLimiter?.isAllowed?.('test-client', 'api-request');
      expect(isAllowed).toBe(false);

      // Verify rate limit details
      const rateLimitInfo = rateLimiter?.getRateLimitInfo?.('test-client');
      expect(rateLimitInfo).toBeDefined();
      expect(rateLimitInfo.remaining).toBe(0);
      expect(rateLimitInfo.resetTime).toBeInstanceOf(Date);
    });
  });
});