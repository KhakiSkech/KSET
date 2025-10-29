/**
 * KSET - Korea Stock Exchange Trading Library
 * Korea's Standard Trading Interface
 *
 * Main entry point for the KSET library.
 * Provides unified access to all Korean securities brokers.
 */

// Export core types and interfaces
export * from './types';
export * from './interfaces';
export * from './errors';

// Export engines
export { KoreanMarketEngine } from './engines/KoreanMarketEngine';
export { KoreanComplianceEngine } from './engines/KoreanComplianceEngine';

// Export base provider
export { KSETProvider } from './providers/base/KSETProvider';

// Export registry
export { ProviderRegistry } from './providers/registry/ProviderRegistry';

// Export main KSET class
export { KSET } from './core/KSET';

// Export utilities
export * from './utils';

// Version information
export const KSET_VERSION = '1.0.0';
export const KSET_BUILD_DATE = new Date().toISOString();