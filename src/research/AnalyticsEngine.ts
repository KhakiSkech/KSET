/**
 * Analytics Engine
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 기업 분석 및 리서치 데이터 분석 엔진
 */

import {
  MarketData,
  CompanyInfo,
  FinancialData,
  Disclosure,
  Portfolio,
  Position
} from '@/interfaces';

import {
  MarketType,
  FinancialPeriod
} from '@/types';

import {
  KSETError,
  KSETErrorFactory,
  ERROR_CODES,
  Logger,
  ConsoleLogger
} from '@/errors';

/**
 * 분석 지표
 */
export interface AnalysisMetrics {
  // 가치 평가 지표
  priceToEarnings: number;           // PER
  priceToBook: number;              // PBR
  priceToSales: number;              // PSR
  evToEbitda: number;               // EV/EBITDA
  dividendYield: number;             // 배당수익률

  // 수익성 지표
  returnOnEquity: number;           // ROE
  returnOnAssets: number;            // ROA
  operatingMargin: number;          // 영업이익률
  netProfitMargin: number;          // 순이익률
  grossMargin: number;              // 매출총이익률
  ebitdaMargin: number;             // EBITDA 이익률

  // 안정성 지표
  debtToEquity: number;             // 부채비율
  currentRatio: number;             // 유동비율
  quickRatio: number;               // 당좌비율
  interestCoverage: number;         // 이자보상배수

  // 성장성 지표
  revenueGrowthRate: number;        // 매출 성장률
  earningsGrowthRate: number;       // 이익 성장률
  equityGrowthRate: number;         // 자기성장률
  epsGrowthRate: number;            // EPS 성장률

  // 효율성 지표
  totalAssetTurnover: number;       // 총자산회전율
  equityTurnover: number;           // 자기본회전율
  inventoryTurnover: number;         // 재고자산회전율
  receivablesTurnover: number;      // 매출채권회전율

  // 시장 관련 지표
  marketCap: number;               // 시가총액
  enterpriseValue: number;          // 기업가치
  beta: number;                     // 베타 계수
  volatility: number;               // 변동성
  tradingVolume: number;            // 거래량

  // 분석 메타데이터
  lastUpdated: number;              // 마지막 업데이트 시간
  dataQuality: 'high' | 'medium' | 'low'; // 데이터 품질
  confidence: number;                // 분석 신뢰도 (0-1)
}

/**
 * 밸류액 추정 결과
 */
export interface ValuationResult {
  symbol: string;
  name: string;

  // DCF 모델 결과
  dcfValue: number;
  dcfRange: {
    lower: number;
    upper: number;
  };
  wacc: number;                     // 가중평균자본비용
  terminalGrowthRate: number;       // 영구성장률

  // 상대가치 모델 결과
  perValue: number;                 // P/E 밸류액
  pbValue: number;                 // P/B 밸류액
  psValue: number;                 // P/S 밸류액
  evValue: number;                 // EV/EBITDA 밸류액

  // 종합 밸류액
  consensusValue: number;
  consensusRange: {
    lower: number;
    upper: number;
  };

  // 분석 정보
  methodologies: string[];
  assumptions: string[];
  sensitivities: {
    discountRate: number;
    growthRate: number;
    margin: number;
  };

  // 리스크 요인
  riskFactors: string[];
  opportunityFactors: string[];

  // 메타데이터
  analysisDate: Date;
  analystRating: 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell' | 'neutral';
  targetPrice: number;

  // 원본 데이터
  rawData: any;
  source: string;
}

/**
 * 산업 비교 분석 결과
 */
export interface IndustryComparisonResult {
  symbol: string;
  name: string;
  industry: string;

  // 산업 평균
  industryAvg: Partial<AnalysisMetrics>;

  // 상대 순위 (백분위)
  percentile: {
    per: number;                    // PER 순위
    pb: number;                     // PBR 순위
    roe: number;                    // ROE 순위
    debtToEquity: number;           // 부채비율 순위
  };

  // 동종 기업 리스트
  peers: Array<{
    symbol: string;
    name: string;
    metrics: Partial<AnalysisMetrics>;
    similarity: number;            // 유사도 (0-1)
  }>;

  // 분석 인사이트
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];

  // 메타데이터
  comparisonDate: Date;
  peerCount: number;
  dataCompleteness: number;       // 데이터 완전도 (0-1)
}

/**
 * 포트폴리오 분석 결과
 */
export interface PortfolioAnalysisResult {
  portfolioId: string;
  analysisDate: Date;

  // 포트폴리오 구성
  composition: {
    totalValue: number;
    cashWeight: number;
    stockWeight: number;
    sectorWeights: Map<string, number>;
    countryWeights: Map<string, number>;
  };

  // 성과 지표
  performance: {
    totalReturn: number;           // 총수익률
    annualizedReturn: number;      // 연환산 수익률
    volatility: number;            // 변동성
    sharpeRatio: number;           // 샤프 비율
    maxDrawdown: number;           // 최대 낙폭
    winRate: number;               // 승률
  };

  // 리스크 분석
  risk: {
    concentrationRisk: number;       // 집중도 리스크
    sectorRisk: number;            // 섹터 리스크
    currencyRisk: number;          // 통화 리스크
    marketRisk: number;            // 시장 리스크
    companyRisk: number;           // 기업별 리스크
  };

  // 다이버시피케이션
  diversification: {
    count: number;                 // 보유 종목 수
    effectiveCount: number;         // 유효 종목 수
    herfindahlIndex: number;       // 허핀달 지수
    concentrationRatio: number;     // 상위 10개 종목 비중
  };

  // 추천
  recommendations: Array<{
    type: 'rebalance' | 'optimize' | 'reduce_risk' | 'increase_return';
    priority: 'high' | 'medium' | 'low';
    description: string;
    action: string;
    expectedImpact: string;
  }>;

  // 메타데이터
  analysisMethod: string;
  confidence: number;
}

/**
 * 분석 엔진
 */
export class AnalyticsEngine {
  private logger: Logger;
  private marketDataCache = new Map<string, MarketData[]>();
  private analysisCache = new Map<string, {
    data: any;
    expiresAt: number;
  }>();
  private cacheTtl = 300000; // 5분 캐시

  constructor() {
    this.logger = new ConsoleLogger('analytics-engine');
  }

  // ==========================================================================
  // FINANCIAL METRICS CALCULATION
  // ==========================================================================

  /**
   * 재무 분석 지표 계산
   */
  calculateFinancialMetrics(
    symbol: string,
    marketData: MarketData,
    companyInfo: CompanyInfo,
    financialData: FinancialData[]
  ): AnalysisMetrics {
    try {
      const metrics: Partial<AnalysisMetrics> = {};

      // 시장 데이터 기반 지표
      metrics.marketCap = this.calculateMarketCap(marketData);
      metrics.tradingVolume = marketData.volume;
      metrics.currentPrice = marketData.currentPrice;

      // 재무 데이터 기반 지표
      if (financialData.length > 0) {
        this.populateFinancialMetrics(metrics, marketData, financialData);
      }

      // 산업 평균 기반 상대 지표
      // TODO: 실제 산업 데이터로 계산

      // 변동성 및 베타 계산 (시뮬레이션)
      metrics.volatility = this.calculateVolatility(symbol);
      metrics.beta = 1.0; // TODO: 베타 계산 로직 추가

      // 데이터 품질 평가
      const quality = this.assessDataQuality(metrics, marketData, financialData);
      metrics.dataQuality = quality;
      metrics.confidence = quality === 'high' ? 0.9 : quality === 'medium' ? 0.7 : 0.5;

      metrics.lastUpdated = Date.now();

      return metrics as AnalysisMetrics;

    } catch (error) {
      this.logger.error(`Failed to calculate metrics for ${symbol}:`, error);
      throw KSETErrorFactory.create(
        ERROR_CODES.ANALYSIS_ERROR,
        `Financial metrics calculation failed: ${error.message}`,
        'analytics-engine'
      );
    }
  }

  /**
   * 재무 지표 채우기
   */
  private populateFinancialMetrics(
    metrics: Partial<AnalysisMetrics>,
    marketData: MarketData,
    financialData: FinancialData[]
  ): void {
    // 최신 재무 데이터 찾기
    const latestFinancial = financialData.reduce((latest, current) => {
      const currentScore = this.calculateFinancialRecencyScore(current);
      const latestScore = this.calculateFinancialRecencyScore(latest);
      return currentScore > latestScore ? current : latest;
    });

    const previousFinancial = this.getPreviousFinancialData(financialData, latestFinancial);

    if (!latestFinancial) return;

    const marketPrice = marketData.currentPrice;

    // 밸류액 지표
    if (latestFinancial.eps > 0) {
      metrics.priceToEarnings = marketPrice / latestFinancial.eps;
    }

    if (latestFinancial.bps > 0) {
      metrics.priceToBook = marketPrice / latestFinancial.bps;
    }

    if (latestFinancial.priceToSales > 0) {
      metrics.priceToSales = marketPrice / latestFinancial.priceToSales;
    }

    if (latestFinancial.dividendYield !== undefined) {
      metrics.dividendYield = latestFinancial.dividendYield;
    }

    // 수익성 지표
    if (latestFinancial.roe !== undefined) {
      metrics.returnOnEquity = latestFinancial.roe;
    }

    if (latestFinancial.roa !== undefined) {
      metrics.returnOnAssets = latestFinancial.roa;
    }

    if (latestFinancial.operatingMargin !== undefined) {
      metrics.operatingMargin = latestFinancial.operatingMargin;
    }

    if (latestFinancial.netProfitMargin !== undefined) {
      metrics.netProfitMargin = latestFinancial.netProfitMargin;
    }

    // 안정성 지표
    if (latestFinancial.debtRatio !== undefined) {
      metrics.debtToEquity = latestFinancial.debtRatio;
    }

    if (latestFinancial.currentRatio !== undefined) {
      metrics.currentRatio = latestFinancial.currentRatio;
    }

    if (latestFinancial.quickRatio !== undefined) {
      metrics.quickRatio = latestFinancial.quickRatio;
    }

    // 성장성 지표 (전기 대비)
    if (previousFinancial) {
      metrics.revenueGrowthRate = this.calculateGrowthRate(
        latestFinancial.revenue,
        previousFinancial.revenue
      );

      metrics.earningsGrowthRate = this.calculateGrowthRate(
        latestFinancial.netIncome,
        previousFinancial.netIncome
      );

      metrics.epsGrowthRate = this.calculateGrowthRate(
        latestFinancial.eps,
        previousFinancial.eps
      );
    }

    // 효율성 지표
    if (latestFinancial.totalAssetTurnover !== undefined) {
      metrics.totalAssetTurnover = latestFinancial.totalAssetTurnover;
    }

    if (latestFinancial.equityTurnover !== undefined) {
      metrics.equityTurnover = latestFinancial.equityTurnover;
    }

    // 기업가치 관련 지표
    metrics.enterpriseValue = this.calculateEnterpriseValue(metrics as AnalysisMetrics, marketData);
    if (latestFinancial.ebitda && metrics.enterpriseValue > 0) {
      metrics.evToEbitda = metrics.enterpriseValue / latestFinancial.ebitda;
    }
  }

  /**
   * 시가총액 계산
   */
  private calculateMarketCap(marketData: MarketData): number {
    return marketData.currentPrice * marketData.tradingValue * 0.01; // 거래대금을 주식 수로 추정
  }

  /**
   * 기업가치 계산
   */
  private calculateEnterpriseValue(
    metrics: AnalysisMetrics,
    marketData: MarketData
  ): number {
    // EV = 시가총액 + 부채 - 현금
    const marketCap = metrics.marketCap || 0;
    const debt = (metrics.debtToEquity || 0) * (marketCap / (metrics.priceToBook || 1));
    const cash = marketData.tradingValue * 0.02; // 거래대금의 2%를 현금으로 추정

    return marketCap + debt - cash;
  }

  /**
   * 변동성 계산
   */
  private calculateVolatility(symbol: string): number {
    const cache = this.marketDataCache.get(symbol);
    if (!cache || cache.length < 20) {
      return 0.2; // 기본 변동성 20%
    }

    // 최근 20일 종가 기준 변동성 계산
    const prices = cache.slice(-20).map(d => d.currentPrice);
    if (prices.length < 2) return 0.2;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    // 연환산 변동성
    return Math.sqrt(variance * 252); // 252 거래일 기준
  }

  /**
   * 성장률 계산
   */
  private calculateGrowthRate(current: number, previous: number): number {
    if (previous <= 0) return 0;
    return ((current - previous) / previous) * 100;
  }

  /**
   * 재무 데이터 신선도 점수 계산
   */
  private calculateFinancialRecencyScore(financial: FinancialData): number {
    const now = Date.now();
    const financialDate = financial.timestamp;
    const daysDiff = (now - financialDate) / (1000 * 60 * 60 * 24);

    // 최신일수록 높은 점수
    return Math.max(0, 100 - daysDiff);
  }

  /**
   * 이전 재무 데이터 찾기
   */
  private getPreviousFinancialData(
    financialData: FinancialData[],
    latest: FinancialData
  ): FinancialData | null {
    const latestPeriod = `${latest.year}-${latest.quarter}`;

    let previous = null;
    let maxScore = 0;

    for (const current of financialData) {
      if (current === latest) continue;

      const currentPeriod = `${current.year}-${current.quarter}`;
      if (currentPeriod === latestPeriod) continue;

      // 같은 연도 이전 분기
      if (current.year === latest.year && current.quarter < latest.quarter) {
        const score = (latest.quarter - current.quarter);
        if (score > maxScore) {
          maxScore = score;
          previous = current;
        }
      }
      // 이전 연도 4분기
      else if (current.year === latest.year - 1 && current.quarter === 4) {
        if (maxScore < 4) {
          maxScore = 4;
          previous = current;
        }
      }
    }

    return previous;
  }

  /**
   * 데이터 품질 평가
   */
  private assessDataQuality(
    metrics: Partial<AnalysisMetrics>,
    marketData: MarketData,
    financialData: FinancialData[]
  ): 'high' | 'medium' | 'low' {
    let score = 0;

    // 시장 데이터 품질
    if (marketData && marketData.currentPrice > 0) {
      score += 30;
    }

    // 재무 데이터 품질
    if (financialData.length > 0) {
      score += 40;

      // 최신 데이터 여부
      const latest = financialData.reduce((latest, current) => {
        const currentScore = this.calculateFinancialRecencyScore(current);
        const latestScore = this.calculateFinancialRecencyScore(latest);
        return currentScore > latestScore ? current : latest;
      });

      if ((Date.now() - latest.timestamp) < 90 * 24 * 60 * 60 * 1000) { // 90일 이내
        score += 20;
      }

      // 완성도 확인
      const requiredFields = ['revenue', 'netIncome', 'eps', 'totalAssets', 'totalLiabilities'];
      const completeness = requiredFields.filter(field =>
        (latest as any)[field] && (latest as any)[field] > 0
      ).length / requiredFields.length;
      score += completeness * 10;
    }

    // 지표 완성도
    const calculatedFields = Object.keys(metrics).filter(key =>
      (metrics as any)[key] !== undefined && (metrics as any)[key] !== 0
    ).length;
    const totalFields = 15; // 주요 지표 수
    score += (calculatedFields / totalFields) * 20;

    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  }

  // ==========================================================================
  // VALUATION ANALYSIS
  // ==========================================================================

  /**
   * 밸류액 분석
   */
  async performValuationAnalysis(
    symbol: string,
    metrics: AnalysisMetrics,
    financialData: FinancialData[]
  ): Promise<ValuationResult> {
    try {
      const cacheKey = `valuation:${symbol}`;
      const cached = this.analysisCache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.data;
      }

      const result: ValuationResult = {
        symbol,
        name: '', // TODO: 기업명 조회
        dcfValue: 0,
        dcfRange: { lower: 0, upper: 0 },
        wacc: 0,
        terminalGrowthRate: 0,
        perValue: 0,
        pbValue: 0,
        psValue: 0,
        evValue: 0,
        consensusValue: 0,
        consensusRange: { lower: 0, upper: 0 },
        methodologies: [],
        assumptions: [],
        sensitivities: {
          discountRate: 0,
          growthRate: 0,
          margin: 0
        },
        riskFactors: [],
        opportunityFactors: [],
        analysisDate: new Date(),
        analystRating: 'neutral',
        targetPrice: 0,
        rawData: { metrics, financialData },
        source: 'analytics-engine'
      };

      // DCF 모델 밸류액
      if (financialData.length > 1) {
        result.dcfValue = this.calculateDCFValue(metrics, financialData);
        result.dcfRange = this.calculateDCFRange(result.dcfValue);
        result.wacc = this.calculateWACC(metrics);
        result.terminalGrowthRate = 0.025; // 2.5% 영구성장률
      }

      // 상대가치 모델 밸류액
      result.perValue = this.calculatePERValuation(metrics);
      result.pbValue = this.calculatePBRValuation(metrics);
      result.psValue = this.calculatePSRValuation(metrics);
      result.evValue = this.calculateEVValuation(metrics);

      // 종합 밸류액 계산
      result.consensusValue = this.calculateConsensusValue(result);
      result.consensusRange = this.calculateConsensusRange(result);

      // 메타데이터 설정
      result.methodologies = ['DCF', 'PER', 'PBR', 'PSR', 'EV/EBITDA'];
      result.assumptions = this.generateValuationAssumptions(metrics, financialData);
      result.sensitivities = this.calculateSensitivities(result);

      // 캐시 저장
      this.analysisCache.set(cacheKey, {
        data: result,
        expiresAt: Date.now() + this.cacheTtl
      });

      return result;

    } catch (error) {
      this.logger.error(`Valuation analysis failed for ${symbol}:`, error);
      throw KSETErrorFactory.create(
        ERROR_CODES.ANALYSIS_ERROR,
        `Valuation analysis failed: ${error.message}`,
        'analytics-engine'
      );
    }
  }

  /**
   * DCF 모델 밸류액 계산
   */
  private calculateDCFValue(
    metrics: AnalysisMetrics,
    financialData: FinancialData[]
  ): number {
    if (financialData.length < 2) return 0;

    // 가장 최신 재무 데이터
    const latest = financialData.reduce((latest, current) => {
      const currentScore = this.calculateFinancialRecencyScore(current);
      const latestScore = this.calculateFinancialRecencyScore(latest);
      return currentScore > latestScore ? current : latest;
    });

    // 과거 5년 평균 성장률
    const historicalGrowthRates = [];
    for (let i = 1; i < Math.min(5, financialData.length); i++) {
      const previous = financialData[financialData.length - 1 - i];
      if (previous) {
        const growthRate = this.calculateGrowthRate(latest.netIncome, previous.netIncome);
        if (Math.abs(growthRate) < 100) { // 비정상적인 성장률 제외
          historicalGrowthRates.push(growthRate);
        }
      }
    }

    const avgGrowthRate = historicalGrowthRates.length > 0
      ? historicalGrowthRates.reduce((sum, rate) => sum + rate, 0) / historicalGrowthRates.length
      : 0.05; // 기본 5%

    // 미래 현금흐름 계산 (5년 예측)
    let presentValue = 0;
    const wacc = this.calculateWACC(metrics);
    const terminalGrowthRate = 0.025;
    const terminalValue = (latest.netIncome * (1 + terminalGrowthRate)) / (wacc - terminalGrowthRate);

    for (let year = 1; year <= 5; year++) {
      const futureFCF = latest.netIncome * (1 + avgGrowthRate) ** year;
      const discountFactor = (1 + wacc) ** year;
      presentValue += futureFCF / discountFactor;
    }

    // 턴미가치의 현재가치
    presentValue += terminalValue / ((1 + wacc) ** 5);

    return presentValue;
  }

  /**
   * DCF 밸류액 범위 계산
   */
  private calculateDCFRange(dcfValue: number): { lower: number; upper: number } {
    const range = 0.2; // ±20%
    return {
      lower: dcfValue * (1 - range),
      upper: dcfValue * (1 + range)
    };
  }

  /**
   * WACC(가중평균자본비용) 계산
   */
  private calculateWACC(metrics: AnalysisMetrics): number {
    // 한국 시장 평균 파라미터
    const riskFreeRate = 0.025; // 2.5% 무위험수익률
    const marketRiskPremium = 0.055; // 5.5% 시장위험프리미엄
    const beta = metrics.beta || 1.0;
    const costOfEquity = riskFreeRate + beta * marketRiskPremium;

    // 부채 비용
    const debtCost = 0.05; // 5% 부채 이자율
    const debtRatio = metrics.debtToEquity / (1 + metrics.debtToEquity);
    const equityRatio = 1 - debtRatio;

    return costOfEquity * equityRatio + debtCost * debtRatio * (1 - 0.25); // 25% 법인세 고려
  }

  /**
   * PER 밸류액 계산
   */
  private calculatePERValuation(metrics: AnalysisMetrics): number {
    const industryAvgPER = 15; // TODO: 실제 산업 평균 PER
    return industryAvgPER * metrics.eps;
  }

  /**
   * PBR 밸류액 계산
   */
  private calculatePBRValuation(metrics: AnalysisMetrics): number {
    const industryAvgPBR = 1.2; // TODO: 실제 산업 평균 PBR
    return industryAvgPBR * metrics.bps;
  }

  /**
   * PSR 밸류액 계산
   */
  private calculatePSRValuation(metrics: AnalysisMetrics): number {
    const industryAvgPSR = 1.0; // TODO: 실제 산업 평균 PSR
    return industryAvgPSR * metrics.priceToSales;
  }

  /**
   * EV/EBITDA 밸류액 계산
   */
  private calculateEVValuation(metrics: AnalysisMetrics): number {
    const industryAvgEV = 8.0; // TODO: 실제 산업 평균 EV/EBITDA
    return industryAvgEV * (metrics.evToEbitda || 0);
  }

  /**
   * 종합 밸류액 계산
   */
  private calculateConsensusValue(result: ValuationResult): number {
    const weights = {
      dcf: 0.4,
      per: 0.2,
      pb: 0.15,
      ps: 0.15,
      ev: 0.1
    };

    return (
      result.dcfValue * weights.dcf +
      result.perValue * weights.per +
      result.pbValue * weights.pb +
      result.psValue * weights.ps +
      result.evValue * weights.ev
    );
  }

  /**
   * 종합 밸류액 범위 계산
   */
  private calculateConsensusRange(result: ValuationResult): { lower: number; upper: number } {
    const range = 0.15; // ±15%
    return {
      lower: result.consensusValue * (1 - range),
      upper: result.consensusValue * (1 + range)
    };
  }

  /**
   * 밸류액 가정 생성
   */
  private generateValuationAssumptions(
    metrics: AnalysisMetrics,
    financialData: FinancialData[]
  ): string[] {
    return [
      `무위험수익률: 2.5%`,
      `시장위험프리미엄: 5.5%`,
      `베타 계수: ${metrics.beta.toFixed(2)}`,
      `영구성장률: 2.5%`,
      `WACC: ${(this.calculateWACC(metrics) * 100).toFixed(1)}%`,
      `과거 5년 평균 성장률: ${this.calculateHistoricalGrowthRate(financialData).toFixed(1)}%`,
      `할인율 범위: ±20%`
    ];
  }

  /**
   * 민감도 분석
   */
  private calculateSensitivities(result: ValuationResult): {
    discountRate: number;
    growthRate: number;
    margin: number;
  } {
    // DCF 모델 민감도 분석
    const sensitivity = 0.1;
    return {
      discountRate: sensitivity,
      growthRate: sensitivity,
      margin: sensitivity
    };
  }

  /**
   * 과거 성장률 계산
   */
  private calculateHistoricalGrowthRate(financialData: FinancialData[]): number {
    if (financialData.length < 2) return 0.05;

    const growthRates = [];
    for (let i = 1; i < Math.min(5, financialData.length); i++) {
      const current = financialData[financialData.length - i];
      const previous = financialData[financialData.length - 1 - i];
      const rate = this.calculateGrowthRate(current.revenue, previous.revenue);
      if (Math.abs(rate) < 100) {
        growthRates.push(rate);
      }
    }

    return growthRates.length > 0
      ? growthRates.reduce((sum, rate) => sum + rate, 0) / growthRates.length
      : 0.05;
  }

  // ==========================================================================
  // INDUSTRY COMPARISON
  // ==========================================================================

  /**
   * 산업 비교 분석
   */
  async performIndustryComparison(
    symbol: string,
    metrics: AnalysisMetrics,
    peers: Array<{ symbol: string; metrics: Partial<AnalysisMetrics> }>
  ): Promise<IndustryComparisonResult> {
    try {
      const result: IndustryComparisonResult = {
        symbol,
        name: '', // TODO: 기업명 조회
        industry: '', // TODO: 산업 정보 조회
        industryAvg: {},
        percentile: {
          per: 50,
          pb: 50,
          roe: 50,
          debtToEquity: 50
        },
        peers: peers.map(peer => ({
          ...peer,
          similarity: this.calculateSimilarity(metrics, peer.metrics)
        })),
        strengths: [],
        weaknesses: [],
        opportunities: [],
        threats: [],
        comparisonDate: new Date(),
        peerCount: peers.length,
        dataCompleteness: 0
      };

      // 산업 평균 계산
      result.industryAvg = this.calculateIndustryAverage(peers);

      // 백분위 계산
      result.percentile = this.calculatePercentiles(metrics, peers);

      // 데이터 완전도
      result.dataCompleteness = this.calculateDataCompleteness(result.peers);

      // 분석 인사이트 생성
      this.generateIndustryInsights(result);

      return result;

    } catch (error) {
      this.logger.error(`Industry comparison failed for ${symbol}:`, error);
      throw KSETErrorFactory.create(
        ERROR_CODES.ANALYSIS_ERROR,
        `Industry comparison failed: ${error.message}`,
        'analytics-engine'
      );
    }
  }

  /**
   * 유사도 계산
   */
  private calculateSimilarity(
    target: AnalysisMetrics,
    peer: Partial<AnalysisMetrics>
  ): number {
    // 주요 지표 기반 유사도 계산
    const fields = ['per', 'pb', 'roe', 'debtToEquity', 'roa', 'currentRatio'];
    let totalScore = 0;
    let fieldCount = 0;

    for (const field of fields) {
      if (target[field] !== undefined && peer[field] !== undefined) {
        const targetValue = target[field];
        const peerValue = peer[field];
        const similarity = 1 - Math.abs(targetValue - peerValue) / Math.max(Math.abs(targetValue), Math.abs(peerValue));
        totalScore += similarity;
        fieldCount++;
      }
    }

    return fieldCount > 0 ? totalScore / fieldCount : 0;
  }

  /**
   * 산업 평균 계산
   */
  private calculateIndustryAverage(
    peers: Array<{ metrics: Partial<AnalysisMetrics> }>
  ): Partial<AnalysisMetrics> {
    const avg: Partial<AnalysisMetrics> = {};
    const fields = ['per', 'pb', 'roe', 'roa', 'debtToEquity', 'currentRatio', 'netProfitMargin', 'operatingMargin'];

    for (const field of fields) {
      const values = peers
        .map(peer => peer.metrics[field])
        .filter(value => value !== undefined && value !== 0);

      if (values.length > 0) {
        (avg as any)[field] = values.reduce((sum, value) => sum + value, 0) / values.length;
      }
    }

    return avg;
  }

  /**
   * 백분위 계산
   */
  private calculatePercentiles(
    target: AnalysisMetrics,
    peers: Array<{ metrics: Partial<AnalysisMetrics> }>
  ): {
    per: number;
    pb: number;
    roe: number;
    debtToEquity: number;
  } {
    const percentiles = { per: 50, pb: 50, roe: 50, debtToEquity: 50 };

    ['per', 'pb', 'roe', 'debtToEquity'].forEach(field => {
      const values = peers
        .map(peer => peer.metrics[field])
        .filter(value => value !== undefined && value !== 0)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        const targetValue = target[field];
        const rank = values.findIndex(value => value >= targetValue) + 1;
        (percentiles as any)[field] = (rank / values.length) * 100;
      }
    });

    return percentiles;
  }

  /**
   * 데이터 완전도 계산
   */
  private calculateDataCompleteness(
    peers: Array<{ metrics: Partial<AnalysisMetrics> }>
  ): number {
    const fields = ['per', 'pb', 'roe', 'debtToEquity', 'currentRatio'];
    let totalFields = 0;
    let availableFields = 0;

    for (const peer of peers) {
      for (const field of fields) {
        totalFields++;
        if (peer.metrics[field] !== undefined && peer.metrics[field] !== 0) {
          availableFields++;
        }
      }
    }

    return totalFields > 0 ? availableFields / totalFields : 0;
  }

  /**
   * 산업 분석 인사이트 생성
   */
  private generateIndustryInsights(result: IndustryComparisonResult): void {
    const { percentile, industryAvg } = result;

    // 강점
    if (percentile.roe > 70) {
      result.strengths.push('ROE가 산업 평균보다 높음');
    }
    if (percentile.debtToEquity < 30) {
      result.strengths.push('안정성이 높음 (낮은 부채비율)');
    }

    // 약점
    if (percentile.roe < 30) {
      result.weaknesses.push('ROE가 산업 평균보다 낮음');
    }
    if (percentile.debtToEquity > 70) {
      result.weaknesses.push('재무 리스크가 높음');
    }

    // 기회
    if (percentile.per > 80 && percentile.roe > 80) {
      result.opportunities.push('우량한 성장성과 안정성을 동시에 만족');
    }

    // 위협
    if (percentile.per < 20 && percentile.roe < 20) {
      result.threats.push('가치 평가과 수익성 모두 낮음');
    }
  }

  // ==========================================================================
  // PORTFOLIO ANALYSIS
  // ==========================================================================

  /**
   * 포트폴리오 분석
   */
  async analyzePortfolio(
    portfolio: Portfolio,
    marketDataMap: Map<string, MarketData>,
    companyInfoMap: Map<string, CompanyInfo>,
    financialDataMap: Map<string, FinancialData[]>
  ): Promise<PortfolioAnalysisResult> {
    try {
      const result: PortfolioAnalysisResult = {
        portfolioId: portfolio.id || 'unknown',
        analysisDate: new Date(),
        composition: {
          totalValue: portfolio.totalValue,
          cashWeight: 0,
          stockWeight: 0,
          sectorWeights: new Map(),
          countryWeights: new Map()
        },
        performance: {
          totalReturn: 0,
          annualizedReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 0,
          winRate: 0
        },
        risk: {
          concentrationRisk: 0,
          sectorRisk: 0,
          currencyRisk: 0,
          marketRisk: 0,
          companyRisk: 0
        },
        diversification: {
          count: portfolio.positions.length,
          effectiveCount: 0,
          herfindahlIndex: 0,
          concentrationRatio: 0
        },
        recommendations: [],
        analysisMethod: 'comprehensive',
        confidence: 0.8
      };

      // 포트폴리오 구성 분석
      this.analyzePortfolioComposition(result, portfolio);

      // 성과 분석
      this.analyzePortfolioPerformance(result, portfolio, marketDataMap);

      // 리스크 분석
      this.analyzePortfolioRisk(result, portfolio, companyInfoMap, financialDataMap);

      // 다이버시피케이션 분석
      this.analyzeDiversification(result, portfolio);

      // 추천 생성
      this.generatePortfolioRecommendations(result);

      return result;

    } catch (error) {
      this.logger.error('Portfolio analysis failed:', error);
      throw KSETErrorFactory.create(
        ERROR_CODES.ANALYSIS_ERROR,
        `Portfolio analysis failed: ${error.message}`,
        'analytics-engine'
      );
    }
  }

  /**
   * 포트폴리오 구성 분석
   */
  private analyzePortfolioComposition(
    result: PortfolioAnalysisResult,
    portfolio: Portfolio
  ): void {
    const totalValue = portfolio.totalValue;

    // 포지션 기반 분석
    for (const position of portfolio.positions) {
      const weight = (position.marketValue / totalValue) * 100;

      if (position.quantity > 0) {
        result.composition.stockWeight += weight;
      } else {
        result.composition.cashWeight += Math.abs(weight);
      }

      // 섹터별 가중 (TODO: 실제 섹터 데이터 매핑)
      const sector = 'Technology'; // 임시 값
      result.composition.sectorWeights.set(
        sector,
        (result.composition.sectorWeights.get(sector) || 0) + weight
      );
    }

    // 국가별 가중 (TODO: 실제 국가 데이터 매핑)
    const country = 'Korea'; // 임시 값
    result.composition.countryWeights.set(
      country,
      (result.composition.countryWeights.get(country) || 0) + result.composition.stockWeight
    );
  }

  /**
   * 포트폴리오 성과 분석
   */
  private analyzePortfolioPerformance(
    result: PortfolioAnalysisResult,
    portfolio: Portfolio,
    marketDataMap: Map<string, MarketData>
  ): void {
    // 현재 가치 기준 총수익률 계산
    const currentTotalValue = portfolio.totalValue;
    const originalTotalValue = portfolio.totalValue; // TODO: 초기 가치 저장

    result.performance.totalReturn = ((currentTotalValue - originalTotalValue) / originalTotalValue) * 100;

    // 연환산 수익률 (TODO: 기간 기반 계산)
    result.performance.annualizedReturn = result.performance.totalReturn; // 간단화

    // 변동성 계산
    const volatilities = portfolio.positions
      .map(position => this.calculatePositionVolatility(position, marketDataMap))
      .filter(v => v > 0);

    if (volatilities.length > 0) {
      result.performance.volatility = this.calculatePortfolioVolatility(
        portfolio.positions,
        volatilities
      );
    }

    // 샤프 비율 계산 (단순화된 계산)
    const riskFreeRate = 0.025;
    const excessReturn = result.performance.annualizedReturn / 100 - riskFreeRate;
    if (result.performance.volatility > 0) {
      result.performance.sharpeRatio = excessReturn / (result.performance.volatility / 100);
    }

    // 최대 낙폭 (TODO: 실적 시계열 데이터 기반 계산)
    result.performance.maxDrawdown = -15.0; // 시뮬레이션

    // 승률 (TODO: 실제 거래 기록 기반 계산)
    result.performance.winRate = 0.65; // 시뮬레이션
  }

  /**
   * 포트폴리오 리스크 분석
   */
  private analyzePortfolioRisk(
    result: PortfolioAnalysisResult,
    portfolio: Portfolio,
    companyInfoMap: Map<string, CompanyInfo>,
    financialDataMap: Map<string, FinancialData[]>
  ): void {
    const totalValue = portfolio.totalValue;

    // 집중도 리스크
    const weights = portfolio.positions.map(p => p.marketValue / totalValue);
    const squaredWeights = weights.map(w => w * w);
    result.risk.concentrationRisk = squaredWeights.reduce((sum, w) => sum + w, 0) * 100;

    // 섹터 리스크
    const sectorWeights = Array.from(result.composition.sectorWeights.values());
    const sectorSquaredWeights = sectorWeights.map(w => Math.pow(w / 100, 2));
    result.risk.sectorRisk = sectorSquaredWeights.reduce((sum, w) => sum + w, 0) * 100;

    // 기업별 리스크
    const companyRisks = portfolio.positions.map(position => {
      const financials = financialDataMap.get(position.symbol);
      if (financials && financials.length > 0) {
        const latest = financials.reduce((latest, current) => {
          const currentScore = this.calculateFinancialRecencyScore(current);
          const latestScore = this.calculateFinancialRecencyScore(latest);
          return currentScore > latestScore ? current : latest;
        });
        return latest.debtRatio || 0.3; // 기본값 30%
      }
      return 0.3;
    });

    const weightedCompanyRisk = companyRisks.reduce((sum, risk, i) =>
      sum + risk * weights[i], 0
    );
    result.risk.companyRisk = weightedCompanyRisk;

    // 시장 및 통화 리스크 (고정)
    result.risk.marketRisk = 15.0;
    result.risk.currencyRisk = 2.0;
  }

  /**
   * 다이버시피케이션 분석
   */
  private analyzeDiversification(
    result: PortfolioAnalysisResult,
    portfolio: Portfolio
  ): void {
    result.diversification.count = portfolio.positions.length;

    // 유효 종목 수 계산
    const weights = portfolio.positions.map(p => p.marketValue / portfolio.totalValue);
    const effectiveCount = 1 / weights.reduce((sum, w) => sum + w * w, 0);
    result.diversification.effectiveCount = effectiveCount;

    // 허핀달 지수 계산
    result.diversification.herfindahlIndex = weights.reduce((sum, w) => sum + w * w, 0);

    // 상위 10개 종목 비중
    const sortedWeights = [...weights].sort((a, b) => b - a);
    const top10Weights = sortedWeights.slice(0, 10);
    result.diversification.concentrationRatio = top10Weights.reduce((sum, w) => sum + w, 0) * 100;
  }

  /**
   * 포트폴리오 추천 생성
   */
  private generatePortfolioRecommendations(
    result: PortfolioAnalysisResult
  ): void {
      const recommendations = [];

      // 리스크 관련 추천
      if (result.risk.concentrationRisk > 30) {
        recommendations.push({
          type: 'reduce_risk',
          priority: 'high',
          description: '포트폴리오가 특정 종목에 과도하게 집중되어 있습니다',
          action: '소규 비중이 높은 종목 일부 매도',
          expectedImpact: '리스크 감소 및 안정성 향상'
        });
      }

      // 리밸런싱 관련 추천
      if (result.diversification.effectiveCount < 10) {
        recommendations.push({
          type: 'optimize',
          priority: 'medium',
          description: '다각화를 위해 더 많은 종목을 고려해 보세요',
          action: '새로운 종목을 추가하여 포트폴리오 다각화',
          expectedImpact: '위험 분산 및 안정성 향상'
        });
      }

      // 성과 관련 추천
      if (result.performance.sharpeRatio < 0.5) {
        recommendations.push({
          type: 'increase_return',
          priority: 'medium',
          description: '샤프 비율 개선을 위해 자산 재배치를 고려해 보세요',
          action: '고수익성 자산으로 비중 조정',
          expectedImpact: '수익률 개선'
        });
      }

      result.recommendations = recommendations;
    }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 포지션 변동성 계산
   */
  private calculatePositionVolatility(
    position: Position,
    marketDataMap: Map<string, MarketData>
  ): number {
    const marketData = marketDataMap.get(position.symbol);
    if (!marketData) return 0;

    const cache = this.marketDataCache.get(position.symbol);
    if (!cache || cache.length < 20) return 0.2;

    // 최근 20일 변동성
    const prices = cache.slice(-20).map(d => d.currentPrice);
    if (prices.length < 2) return 0.2;

    const returns = [];
    for (let i = 1; i < prices.length; i++) {
      returns.push((prices[i] - prices[i-1]) / prices[i-1]);
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;

    return Math.sqrt(variance * 252); // 연환산
  }

  /**
   * 포트폴리오 변동성 계산
   */
  private calculatePortfolioVolatility(
    positions: Position[],
    volatilities: number[]
  ): number {
    const weights = positions.map(p => p.marketValue / positions.reduce((sum, p) => sum + p.marketValue, 0));
    const weightedVariances = volatilities.map((vol, i) =>
      Math.pow(vol, 2) * Math.pow(weights[i], 2)
    );

    return Math.sqrt(weightedVariances.reduce((sum, v) => sum + v, 0));
  }

  // ==========================================================================
  // PUBLIC API
  // ==========================================================================

  /**
   * 시장 데이터 업데이트
   */
  updateMarketData(symbol: string, data: MarketData): void {
    if (!this.marketDataCache.has(symbol)) {
      this.marketDataCache.set(symbol, []);
    }

    const cache = this.marketDataCache.get(symbol)!;
    cache.push(data);

    // 최근 100개 데이터만 유지
    if (cache.length > 100) {
      cache.splice(0, cache.length - 100);
    }
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.marketDataCache.clear();
    this.analysisCache.clear();
    this.logger.info('Analytics engine cache cleared');
  }

  /**
   * 캐시 통계
   */
  getCacheStats(): {
    marketDataCache: { size: number; memoryUsage?: number };
    analysisCache: { size: number; memoryUsage?: number };
  } {
    return {
      marketDataCache: {
        size: this.marketDataCache.size
      },
      analysisCache: {
        size: this.analysisCache.size
      }
    };
  }
}