/**
 * Research Module
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 리서치 모듈
 */

export { DARTIntegration, DARTDisclosureType, type DARTSearchParams, type DARTDisclosureDetail, type DARTFinancialData, type DARTDetailResponse } from './DARTIntegration';
export { AnalyticsEngine, AnalysisType, ValuationMethod, RiskLevel, RecommendationLevel, type AnalyticsEngineConfig, type AnalysisMetrics, type ValuationResult, type PortfolioAnalysisResult, type IndustryComparisonResult, type InvestmentRecommendation } from './AnalyticsEngine';
export type { ResearchEngine, ResearchConfig } from './types';