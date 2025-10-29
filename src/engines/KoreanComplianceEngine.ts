/**
 * Korean Compliance Engine
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 한국 금융 규제 준수 엔진:
 * - 외국인 투자 제한
 * - 공매도 제한
 * - 세금 계산
 * - 신고 의무
 * - 기타 규제 사항
 */

import {
  MarketType,
  OrderRequest,
  ValidationResult,
  OrderSide,
  OrderStatus
} from '@/types';

import {
  Position,
  Balance,
  Transaction
} from '@/interfaces';

import {
  KSETErrorFactory,
  ERROR_CODES
} from '@/errors';

/**
 * 한국 규제 준수 엔진
 */
export class KoreanComplianceEngine {
  private foreignInvestmentLimits = new Map<string, ForeignInvestmentLimit>();
  private shortSellingRestrictions = new Map<string, ShortSellingRestriction>();
  private taxRates: TaxRates;

  constructor() {
    this.initializeForeignInvestmentLimits();
    this.initializeShortSellingRestrictions();
    this.initializeTaxRates();
  }

  // ==========================================================================
  // FOREIGN INVESTMENT LIMITS
  // ==========================================================================

  /**
   * 외국인 투자 제한 초기화
   */
  private initializeForeignInvestmentLimits(): void {
    // TODO: 실제 외국인 투자 제한 데이터 로드 필요
    // 여기는 예시 데이터
    this.foreignInvestmentLimits.set('005930', { // 삼성전자
      totalLimit: 50, // 50%
      currentHolding: 30.2,
      remainingQuota: 19.8,
      lastUpdated: new Date()
    });
  }

  /**
   * 외국인 투자 제한 확인
   */
  checkForeignInvestmentLimit(
    symbol: string,
    orderSide: OrderSide,
    orderQuantity: number,
    currentHoldings: number,
    totalShares: number
  ): ComplianceCheck {
    const limit = this.foreignInvestmentLimits.get(symbol);

    if (!limit) {
      // 제한 정보가 없으면 기본 제한 적용
      return this.checkDefaultForeignInvestmentLimit(
        symbol, orderSide, orderQuantity, currentHoldings, totalShares
      );
    }

    // 매도 주문은 외국인 제한 체크 불필요
    if (orderSide === 'SELL') {
      return { compliant: true };
    }

    const currentHoldingRatio = (currentHoldings / totalShares) * 100;
    const orderRatio = (orderQuantity / totalShares) * 100;
    const newHoldingRatio = currentHoldingRatio + orderRatio;

    if (newHoldingRatio > limit.totalLimit) {
      return {
        compliant: false,
        reason: 'ForeignInvestmentLimitExceeded',
        message: `Foreign investment limit (${limit.totalLimit}%) would be exceeded. Current: ${currentHoldingRatio.toFixed(2)}%, Order: ${orderRatio.toFixed(2)}%, New total: ${newHoldingRatio.toFixed(2)}%`,
        details: {
          symbol,
          currentLimit: limit.totalLimit,
          currentHolding: currentHoldingRatio,
          orderSize: orderRatio,
          projectedHolding: newHoldingRatio,
          remainingQuota: Math.max(0, limit.totalLimit - currentHoldingRatio)
        }
      };
    }

    return {
      compliant: true,
      message: `Foreign investment within limits. Current: ${currentHoldingRatio.toFixed(2)}%, After order: ${newHoldingRatio.toFixed(2)}%`,
      details: {
        symbol,
        limit: limit.totalLimit,
        current: currentHoldingRatio,
        projected: newHoldingRatio
      }
    };
  }

  /**
   * 기본 외국인 투자 제한 확인
   */
  private checkDefaultForeignInvestmentLimit(
    symbol: string,
    orderSide: OrderSide,
    orderQuantity: number,
    currentHoldings: number,
    totalShares: number
  ): ComplianceCheck {
    // 매도 주문은 체크 불필요
    if (orderSide === 'SELL') {
      return { compliant: true };
    }

    // 기본 외국인 투자 제한: 50%
    const defaultLimit = 50;
    const currentHoldingRatio = (currentHoldings / totalShares) * 100;
    const orderRatio = (orderQuantity / totalShares) * 100;
    const newHoldingRatio = currentHoldingRatio + orderRatio;

    if (newHoldingRatio > defaultLimit) {
      return {
        compliant: false,
        reason: 'ForeignInvestmentLimitExceeded',
        message: `Default foreign investment limit (${defaultLimit}%) would be exceeded`,
        details: {
          symbol,
          limit: defaultLimit,
          current: currentHoldingRatio,
          projected: newHoldingRatio
        }
      };
    }

    return { compliant: true };
  }

  /**
   * 외국인 투자 제한 정보 업데이트
   */
  updateForeignInvestmentLimit(symbol: string, update: ForeignInvestmentLimitUpdate): void {
    const current = this.foreignInvestmentLimits.get(symbol);

    if (current) {
      // 기존 정보 업데이트
      this.foreignInvestmentLimits.set(symbol, {
        ...current,
        ...update,
        lastUpdated: new Date()
      });
    } else {
      // 새 정보 추가
      this.foreignInvestingLimits.set(symbol, {
        totalLimit: update.totalLimit || 50,
        currentHolding: update.currentHolding || 0,
        remainingQuota: (update.totalLimit || 50) - (update.currentHolding || 0),
        lastUpdated: new Date()
      });
    }
  }

  // ==========================================================================
  // SHORT SELLING RESTRICTIONS
  // ==========================================================================

  /**
   * 공매도 제한 초기화
   */
  private initializeShortSellingRestrictions(): void {
    // TODO: 실제 공매도 제한 데이터 로드 필요
    // 여기는 예시 데이터
    this.shortSellingRestrictions.set('005930', { // 삼성전자
      restricted: false,
      restrictionType: 'none',
      startDate: null,
      endDate: null,
      reason: null
    });

    // 공매도 제한 종목 예시
    this.shortSellingRestrictions.set('035420', { // NAVER
      restricted: true,
      restrictionType: 'temporary',
      startDate: new Date('2024-01-15'),
      endDate: new Date('2024-03-15'),
      reason: 'Market volatility'
    });
  }

  /**
   * 공매도 제한 확인
   */
  checkShortSellingRestriction(
    symbol: string,
    orderSide: OrderSide,
    market: MarketType
  ): ComplianceCheck {
    // 공매도가 아닌 경우 체크 불필요
    if (orderSide !== 'SELL') {
      return { compliant: true };
    }

    const restriction = this.shortSellingRestrictions.get(symbol);

    if (restriction && restriction.restricted) {
      // 제한 기간 확인
      if (restriction.startDate && restriction.endDate) {
        const now = new Date();
        if (now >= restriction.startDate && now <= restriction.endDate) {
          return {
            compliant: false,
            reason: 'ShortSellingRestricted',
            message: `Short selling is restricted for ${symbol} from ${restriction.startDate.toISOString()} to ${restriction.endDate.toISOString()}`,
            details: {
              symbol,
              restrictionType: restriction.restrictionType,
              startDate: restriction.startDate,
              endDate: restriction.endDate,
              reason: restriction.reason
            }
          };
        }
      } else if (restriction.startDate && !restriction.endDate) {
        // 무기한 제한
        const now = new Date();
        if (now >= restriction.startDate) {
          return {
            compliant: false,
            reason: 'ShortSellingRestricted',
            message: `Short selling is indefinitely restricted for ${symbol} since ${restriction.startDate.toISOString()}`,
            details: {
              symbol,
              restrictionType: restriction.restrictionType,
              startDate: restriction.startDate,
              reason: restriction.reason
            }
          };
        }
      }
    }

    return { compliant: true };
  }

  /**
   * 공매도 제한 정보 업데이트
   */
  updateShortSellingRestriction(symbol: string, restriction: ShortSellingRestriction): void {
    this.shortSellingRestrictions.set(symbol, restriction);
  }

  // ==========================================================================
  // TAX CALCULATIONS
  // ==========================================================================

  /**
   * 세금율 초기화
   */
  private initializeTaxRates(): void {
    this.taxRates = {
      securitiesTransactionTax: {
        default: 0.0025,      // 0.25%
        kosdaqPreferred: 0.0020, // 0.20%
        smallMediumEnterprises: 0.0020 // 0.20%
      },
      capitalGainsTax: {
        general: 0.22,         // 22%
        longTerm: 0.20,        // 20% (1년 이상 보유)
        smallAmount: 0.10,     // 10% (연간 250만원 이하)
        majorShareholder: 0.30 // 30% (대주주)
      },
      dividendIncomeTax: {
        general: 0.154,        // 15.4%
        financialInvestment: 0.09 // 9% (금융소득 종합과세)
      }
    };
  }

  /**
   * 증권거래세 계산
   */
  calculateSecuritiesTransactionTax(
    symbol: string,
    sellValue: number,
    market: MarketType,
    isPreferred: boolean,
    isSmallMediumEnterprise: boolean = false
  ): TaxCalculation {
    let taxRate = this.taxRates.securitiesTransactionTax.default;

    // KOSDAQ 우선주 우대
    if (market === 'KOSDAQ' && isPreferred) {
      taxRate = this.taxRates.securitiesTransactionTax.kosdaqPreferred;
    }
    // 중소·중견기업 우대
    else if (isSmallMediumEnterprise) {
      taxRate = this.taxRates.securitiesTransactionTax.smallMediumEnterprises;
    }

    const tax = sellValue * taxRate;

    return {
      type: 'securities-transaction-tax',
      taxableAmount: sellValue,
      taxRate,
      tax,
      symbol,
      market,
      exemptions: []
    };
  }

  /**
   * 양도소득세 계산
   */
  calculateCapitalGainsTax(
    symbol: string,
    proceeds: number,
    costBasis: number,
    holdingPeriod: number,
    isMajorShareholder: boolean = false,
    annualGains: number = 0
  ): TaxCalculation {
    const gains = Math.max(0, proceeds - costBasis);
    const holdingPeriodYears = Math.floor(holdingPeriod / 365);

    let taxRate: number;
    let exemptions: string[] = [];

    // 대주원 여부에 따른 세율 결정
    if (isMajorShareholder) {
      taxRate = this.taxRates.capitalGainsTax.majorShareholder;
    } else if (holdingPeriodYears >= 1) {
      taxRate = this.taxRates.capitalGainsTax.longTerm;
    } else {
      taxRate = this.taxRates.capitalGainsTax.general;
    }

    // 소액 과세 면제
    if (annualGains <= 2500000) { // 250만원 이하
      taxRate = this.taxRates.capitalGainsTax.smallAmount;
      exemptions.push('small-amount-exemption');
    }

    // 2023년 이후 매도 차익 250만원 이하 면제
    if (gains <= 2500000) {
      exemptions.push('small-gain-exemption');
      return {
        type: 'capital-gains-tax',
        taxableAmount: gains,
        taxRate: 0,
        tax: 0,
        symbol,
        holdingPeriod,
        exemptions
      };
    }

    const tax = gains * taxRate;

    return {
      type: 'capital-gains-tax',
      taxableAmount: gains,
      taxRate,
      tax,
      symbol,
      holdingPeriod,
      exemptions
    };
  }

  /**
   * 배당소득세 계산
   */
  calculateDividendIncomeTax(
    symbol: string,
    dividendAmount: number,
    isFinancialInvestmentIncome: boolean = false
  ): TaxCalculation {
    let taxRate: number;
    let exemptions: string[] = [];

    if (isFinancialInvestmentIncome) {
      taxRate = this.taxRates.dividendIncomeTax.financialInvestment;
    } else {
      taxRate = this.taxRates.dividendIncomeTax.general;
    }

    // 배당소득 공제 (월 10만원 이하)
    if (dividendAmount <= 100000) {
      exemptions.push('small-dividend-exemption');
      return {
        type: 'dividend-income-tax',
        taxableAmount: dividendAmount,
        taxRate: 0,
        tax: 0,
        symbol,
        exemptions
      };
    }

    const tax = dividendAmount * taxRate;

    return {
      type: 'dividend-income-tax',
      taxableAmount: dividendAmount,
      taxRate,
      tax,
      symbol,
      exemptions
    };
  }

  // ==========================================================================
  // REGULATORY COMPLIANCE CHECKS
  // ==========================================================================

  /**
   * 주문 규제 준수 종합 확인
   */
  checkOrderCompliance(
    order: OrderRequest,
    currentPosition?: Position,
    accountInfo?: any,
    market: MarketType = 'KOSPI'
  ): ComplianceCheckResult {
    const checks: ComplianceCheck[] = [];
    const violations: ComplianceViolation[] = [];

    // 1. 외국인 투자 제한 확인
    if (accountInfo?.isForeignInvestor) {
      const foreignInvestmentCheck = this.checkForeignInvestmentLimit(
        order.symbol,
        order.side,
        order.quantity,
        currentPosition?.quantity || 0,
        1000000 // TODO: 실식 총 주식 수 조회 필요
      );
      checks.push(foreignInvestmentCheck);

      if (!foreignInvestmentCheck.compliant) {
        violations.push({
          type: 'foreign-investment-limit',
          severity: 'high',
          message: foreignInvestmentCheck.message || 'Foreign investment limit exceeded',
          details: foreignInvestmentCheck.details
        });
      }
    }

    // 2. 공매도 제한 확인
    const shortSellingCheck = this.checkShortSellingRestriction(
      order.symbol,
      order.side,
      market
    );
    checks.push(shortSellingCheck);

    if (!shortSellingCheck.compliant) {
      violations.push({
        type: 'short-selling-restriction',
        severity: 'high',
        message: shortSellingCheck.message || 'Short selling restricted',
        details: shortSellingCheck.details
      });
    }

    // 3. 대주임 보고 의무 확인
    if (currentPosition) {
      const majorShareholderCheck = this.checkMajorShareholderReporting(
        order.symbol,
        currentPosition.quantity,
        order.side === 'BUY' ? currentPosition.quantity + order.quantity : Math.max(0, currentPosition.quantity - order.quantity)
      );
      checks.push(majorShareholderCheck);

      if (!majorShareholderCheck.compliant) {
        violations.push({
          type: 'major-shareholder-reporting',
          severity: 'medium',
          message: majorShareholderCheck.message || 'Major shareholder reporting required',
          details: majorShareholderCheck.details
        });
      }
    }

    return {
      overallCompliant: violations.length === 0,
      checks,
      violations,
      summary: violations.length > 0 ?
        `${violations.length} compliance violations found` :
        'All compliance checks passed'
    };
  }

  /**
   * 대주임 보고 의무 확인
   */
  private checkMajorShareholderReporting(
    symbol: string,
    currentHolding: number,
    projectedHolding: number
  ): ComplianceCheck {
    const majorShareholderThreshold = 5; // 5%
    const reportingThreshold = 1; // 1% 변동 시 보고

    // TODO: 실제 총 주식 수와 보유 비율 계산 필요
    const currentRatio = currentHolding / 1000000 * 100; // 예시
    const projectedRatio = projectedHolding / 1000000 * 100;
    const ratioChange = Math.abs(projectedRatio - currentRatio);

    // 대주임 기준 확인
    if (projectedRatio >= majorShareholderThreshold) {
      // 보고 의무 확인
      if (ratioChange >= reportingThreshold) {
        return {
          compliant: false,
          reason: 'MajorShareholderReportingRequired',
          message: `Major shareholder change (${ratioChange.toFixed(2)}%) requires reporting to financial authorities`,
          details: {
            symbol,
            currentRatio,
            projectedRatio,
            ratioChange,
            majorShareholderThreshold,
            reportingThreshold
          }
        };
      }
    }

    return { compliant: true };
  }

  // ==========================================================================
  // REPORTING & DISCLOSURE
  // ==========================================================================

  /**
   * 규제 보고서 생성
   */
  generateComplianceReport(
    period: 'daily' | 'weekly' | 'monthly',
    transactions: Transaction[],
    positions: Position[]
  ): ComplianceReport {
    const report: ComplianceReport = {
      period,
      generatedAt: new Date(),
      transactions: transactions.length,
      totalValue: transactions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0),
      taxCalculations: [],
      foreignInvestmentStatus: [],
      shortSellingActivities: [],
      violations: [],
      recommendations: []
    };

    // 거래별 세금 계산
    for (const tx of transactions) {
      if (tx.type === 'sell') {
        const taxCalc = this.calculateSecuritiesTransactionTax(
          tx.symbol || '',
          Math.abs(tx.amount),
          'KOSPI', // TODO: 실제 시장 정보 필요
          false,
          false
        );
        report.taxCalculations.push(taxCalc);
      }
    }

    // 외국인 투자 현황
    // TODO: 외국인 투자 현황 계산

    // 공매도 활동
    // TODO: 공매도 활동 계산

    return report;
  }

  /**
   * 규제 업데이트 적용
   */
  applyRegulatoryUpdates(updates: RegulatoryUpdate[]): void {
    for (const update of updates) {
      switch (update.type) {
        case 'foreign-investment-limit':
          if (update.symbol && update.data) {
            this.updateForeignInvestmentLimit(update.symbol, update.data as ForeignInvestmentLimitUpdate);
          }
          break;

        case 'short-selling-restriction':
          if (update.symbol && update.data) {
            this.updateShortSellingRestriction(update.symbol, update.data as ShortSellingRestriction);
          }
          break;

        case 'tax-rate-change':
          if (update.data) {
            this.updateTaxRates(update.data as Partial<TaxRates>);
          }
          break;

        default:
          console.warn(`Unknown regulatory update type: ${update.type}`);
      }
    }
  }

  /**
   * 세금율 업데이트
   */
  private updateTaxRates(newRates: Partial<TaxRates>): void {
    if (newRates.securitiesTransactionTax) {
      this.taxRates.securitiesTransactionTax = {
        ...this.taxRates.securitiesTransactionTax,
        ...newRates.securitiesTransactionTax
      };
    }

    if (newRates.capitalGainsTax) {
      this.taxRates.capitalGainsTax = {
        ...this.taxRates.capitalGainsTax,
        ...newRates.capitalGainsTax
      };
    }

    if (newRates.dividendIncomeTax) {
      this.taxRates.dividendIncomeTax = {
        ...this.taxRates.dividendIncomeTax,
        ...newRates.dividendIncomeTax
      };
    }
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface ForeignInvestmentLimit {
  totalLimit: number;
  currentHolding: number;
  remainingQuota: number;
  lastUpdated: Date;
}

interface ForeignInvestmentLimitUpdate {
  totalLimit?: number;
  currentHolding?: number;
}

interface ShortSellingRestriction {
  restricted: boolean;
  restrictionType: 'temporary' | 'indefinite' | 'none';
  startDate?: Date;
  endDate?: Date;
  reason?: string;
}

interface TaxRates {
  securitiesTransactionTax: {
    default: number;
    kosdaqPreferred: number;
    smallMediumEnterprises: number;
  };
  capitalGainsTax: {
    general: number;
    longTerm: number;
    smallAmount: number;
    majorShareholder: number;
  };
  dividendIncomeTax: {
    general: number;
    financialInvestment: number;
  };
}

interface ComplianceCheck {
  compliant: boolean;
  reason?: string;
  message?: string;
  details?: any;
}

interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high';
  message: string;
  details?: any;
}

interface ComplianceCheckResult {
  overallCompliant: boolean;
  checks: ComplianceCheck[];
  violations: ComplianceViolation[];
  summary: string;
}

interface TaxCalculation {
  type: string;
  taxableAmount: number;
  taxRate: number;
  tax: number;
  symbol?: string;
  holdingPeriod?: number;
  market?: MarketType;
  exemptions: string[];
}

interface ComplianceReport {
  period: 'daily' | 'weekly' | 'monthly';
  generatedAt: Date;
  transactions: number;
  totalValue: number;
  taxCalculations: TaxCalculation[];
  foreignInvestmentStatus: any[];
  shortSellingActivities: any[];
  violations: any[];
  recommendations: string[];
}

interface RegulatoryUpdate {
  type: 'foreign-investment-limit' | 'short-selling-restriction' | 'tax-rate-change' | 'other';
  symbol?: string;
  effectiveDate: Date;
  data: any;
}