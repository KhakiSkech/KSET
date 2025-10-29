/**
 * Research Module Types
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 리서치 모듈 타입 정의
 */

import {
  CompanyInfo,
  FinancialData,
  Disclosure,
  MarketData,
  PaginationOptions,
  ApiResponse
} from '@/interfaces';

import {
  ResearchType,
  FinancialPeriod
} from '@/types';

/**
 * 리서치 엔진 인터페이스
 */
export interface ResearchEngine {
  /**
   * 기업 정보 검색
   */
  searchCompany(query: string, options?: PaginationOptions): Promise<ApiResponse<CompanyInfo[]>>;

  /**
   * 재무 정보 조회
   */
  getFinancialData(symbol: string, period: FinancialPeriod): Promise<ApiResponse<FinancialData[]>>;

  /**
   * 공시 정보 조회
   */
  getDisclosures(symbol: string, options?: DisclosureSearchParams): Promise<ApiResponse<Disclosure[]>>;

  /**
   * 산업 분석
   */
  analyzeIndustry(industryCode: string): Promise<ApiResponse<IndustryAnalysis>>;

  /**
   * 투자 의견 조회
   */
  getInvestmentOpinion(symbol: string): Promise<ApiResponse<InvestmentOpinion>>;

  /**
   * 경제 지표 조회
   */
  getEconomicIndicators(): Promise<ApiResponse<EconomicIndicator[]>>;

  /**
   * 리서치 리포트 조회
   */
  getResearchReports(symbol: string, options?: ReportSearchParams): Promise<ApiResponse<ResearchReport[]>>;
}

/**
 * 리서치 설정
 */
export interface ResearchConfig {
  /**
   * 데이터 소스 우선순위
   */
  dataSourcePriority: string[];

  /**
   * 캐시 설정
   */
  cache: {
    enabled: boolean;
    ttl: number; // 캐시 유효기간 (초)
  };

  /**
   * DART API 설정
   */
  dart: {
    apiKey?: string;
    baseUrl: string;
    timeout: number;
  };

  /**
   * 분석 설정
   */
  analytics: {
    enableValuation: boolean;
    enableRiskAnalysis: boolean;
    enableTechnicalAnalysis: boolean;
  };
}

/**
 * 공시 검색 파라미터
 */
export interface DisclosureSearchParams {
  startDate?: string;
  endDate?: string;
  type?: ResearchType;
  keyword?: string;
}

/**
 * 리포트 검색 파라미터
 */
export interface ReportSearchParams {
  startDate?: string;
  endDate?: string;
  brokerage?: string;
  analyst?: string;
}

/**
 * 산업 분석 결과
 */
export interface IndustryAnalysis {
  industryCode: string;
  industryName: string;
  description: string;
  trends: IndustryTrend[];
  outlook: string;
  keyMetrics: IndustryMetrics;
  topCompanies: CompanyInfo[];
  marketSize: number;
  growthRate: number;
  lastUpdated: string;
}

/**
 * 산업 트렌드
 */
export interface IndustryTrend {
  name: string;
  description: string;
  impact: 'positive' | 'negative' | 'neutral';
  timeframe: string;
  confidence: number;
}

/**
 * 산업 지표
 */
export interface IndustryMetrics {
  averagePE: number;
  averagePSR: number;
  averageROE: number;
  averageDebtRatio: number;
  averageMargin: number;
  marketCap: number;
  revenue: number;
}

/**
 * 투자 의견
 */
export interface InvestmentOpinion {
  symbol: string;
  companyName: string;
  targetPrice: number;
  recommendation: 'BUY' | 'HOLD' | 'SELL' | 'NEUTRAL';
  confidence: number;
  reasoning: string;
  keyDrivers: string[];
  risks: string[];
  analystName: string;
  brokerageName: string;
  reportDate: string;
  priceHistory: PriceTarget[];
}

/**
 * 가격 목표 이력
 */
export interface PriceTarget {
  date: string;
  targetPrice: number;
  recommendation: string;
  analystName: string;
  brokerageName: string;
}

/**
 * 경제 지표
 */
export interface EconomicIndicator {
  name: string;
  code: string;
  value: number;
  unit: string;
  change: number;
  changeRate: number;
  date: string;
  description: string;
  category: 'GDP' | 'CPI' | 'PPI' | 'UNEMPLOYMENT' | 'INTEREST' | 'EXCHANGE' | 'OTHER';
}

/**
 * 리서치 리포트
 */
export interface ResearchReport {
  id: string;
  title: string;
  symbol: string;
  companyName: string;
  brokerageName: string;
  analystName: string;
  reportType: string;
  recommendation: string;
  targetPrice: number;
  summary: string;
  keyPoints: string[];
  valuation: ValuationSummary;
  riskFactors: string[];
  investmentHighlights: string[];
  publishedDate: string;
  pages: number;
  language: string;
  downloadUrl?: string;
}

/**
 * 가치 평가 요약
 */
export interface ValuationSummary {
  method: string;
  fairValue: number;
  upside: number;
  assumptions: string[];
  sensitivity: SensitivityAnalysis[];
}

/**
 * 민감도 분석
 */
export interface SensitivityAnalysis {
  variable: string;
  scenarios: {
    base: number;
    optimistic: number;
    pessimistic: number;
  };
}

/**
 * 기업 재무 상세 정보
 */
export interface DetailedFinancialData extends FinancialData {
  cashFlowStatement: CashFlowStatement;
  balanceSheet: BalanceSheet;
  incomeStatement: IncomeStatement;
  financialRatios: FinancialRatios;
  segmentData: SegmentData[];
}

/**
 * 현금 흐름표
 */
export interface CashFlowStatement {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  freeCashFlow: number;
  capitalExpenditure: number;
  dividendPaid: number;
  shareRepurchase: number;
}

/**
 * 대차대조표
 */
export interface BalanceSheet {
  totalAssets: number;
  currentAssets: number;
  nonCurrentAssets: number;
  totalLiabilities: number;
  currentLiabilities: number;
  nonCurrentLiabilities: number;
  totalEquity: number;
  retainedEarnings: number;
  totalDebt: number;
  netDebt: number;
}

/**
 * 손익계산서
 */
export interface IncomeStatement {
  revenue: number;
  grossProfit: number;
  operatingIncome: number;
  ebit: number;
  netIncome: number;
  ebitda: number;
  operatingMargin: number;
  netMargin: number;
  grossMargin: number;
}

/**
 * 재무 비율
 */
export interface FinancialRatios {
  profitabilityRatios: {
    roe: number;
    roa: number;
    roic: number;
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
  };
  liquidityRatios: {
    currentRatio: number;
    quickRatio: number;
    cashRatio: number;
  };
  leverageRatios: {
    debtToEquity: number;
    debtToAssets: number;
    interestCoverage: number;
  };
  efficiencyRatios: {
    assetTurnover: number;
    inventoryTurnover: number;
    receivableTurnover: number;
  };
  valuationRatios: {
    pe: number;
    pb: number;
    ps: number;
    evEbitda: number;
    dividendYield: number;
  };
}

/**
 * 사업 부문 데이터
 */
export interface SegmentData {
  segmentName: string;
  revenue: number;
  operatingIncome: number;
  assets: number;
  revenuePercentage: number;
  operatingMargin: number;
}

/**
 * 시장 참여자 분석
 */
export interface MarketParticipantAnalysis {
  foreigners: {
    ownershipRatio: number;
    netPurchase: number;
    tradingValue: number;
  };
  institutions: {
    ownershipRatio: number;
    netPurchase: number;
    tradingValue: number;
  };
  individuals: {
    ownershipRatio: number;
    netPurchase: number;
    tradingValue: number;
  };
  lastUpdated: string;
}

/**
 * 기술적 분석 결과
 */
export interface TechnicalAnalysis {
  symbol: string;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  strength: number;
  support: number;
  resistance: number;
  indicators: {
    rsi: number;
    macd: {
      macd: number;
      signal: number;
      histogram: number;
    };
    bollinger: {
      upper: number;
      middle: number;
      lower: number;
    };
    movingAverages: {
      ma5: number;
      ma20: number;
      ma60: number;
      ma120: number;
    };
  };
  signals: TradingSignal[];
  lastUpdated: string;
}

/**
 * 매매 신호
 */
export interface TradingSignal {
  type: 'BUY' | 'SELL' | 'HOLD';
  strength: 'WEAK' | 'MODERATE' | 'STRONG';
  reason: string;
  indicator: string;
  timestamp: string;
}

/**
 * 리스크 분석
 */
export interface RiskAnalysis {
  symbol: string;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: RiskFactor[];
  beta: number;
  volatility: number;
  maxDrawdown: number;
  var: ValueAtRisk;
  stressTest: StressTestResult[];
  lastUpdated: string;
}

/**
 * 리스크 요소
 */
export interface RiskFactor {
  type: 'MARKET' | 'CREDIT' | 'LIQUIDITY' | 'OPERATIONAL' | 'REGULATORY';
  level: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  impact: string;
  mitigation: string;
}

/**
 * VaR (Value at Risk)
 */
export interface ValueAtRisk {
  oneDay: number;
  fiveDay: number;
  confidence: number;
}

/**
 * 스트레스 테스트 결과
 */
export interface StressTestResult {
  scenario: string;
  impact: number;
  probability: number;
  description: string;
}