/**
 * KSET Research and Analytics Demo
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 리서치 및 분석 기능 데모
 */

import { KSET } from '../src';

/**
 * 기업 정보 검색 데모
 */
async function runCompanySearchDemo(): Promise<void> {
  console.log('🔍 Company Search Demo');
  console.log('=======================');

  try {
    // 1. KSET 인스턴스 생성
    console.log('\n📦 Step 1: Creating KSET instance...');
    const kset = new KSET({
      logLevel: 'info',
      dart: {
        apiKey: process.env.DART_API_KEY,
        baseUrl: 'https://opendart.fss.or.kr/api'
      }
    });

    // 2. Provider 생성
    console.log('\n🔗 Step 2: Creating provider...');
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    // 3. 기업 정보 검색
    console.log('\n🔍 Step 3: Searching for companies...');

    // 삼성전자 검색
    const samsungResults = await kset.searchCompany('삼성전자', {
      limit: 5,
      offset: 0
    });

    console.log('✅ Samsung Electronics Search Results:');
    samsungResults.forEach((company: any, index: number) => {
      console.log(`  ${index + 1}. ${company.name} (${company.symbol})`);
      console.log(`     Market: ${company.market}`);
      console.log(`     Sector: ${company.sector}`);
    });

    // 4. 상세 기업 정보 조회
    console.log('\n📊 Step 4: Getting detailed company info...');
    const samsungInfo = await kiwoom.getCompanyInfo('005930');

    if (samsungInfo.success) {
      console.log('✅ Samsung Electronics Details:');
      console.log(`  Name: ${samsungInfo.data.name}`);
      console.log(`  Symbol: ${samsungInfo.data.symbol}`);
      console.log(`  Market: ${samsungInfo.data.market}`);
      console.log(`  Sector: ${samsungInfo.data.sector}`);
      console.log(`  Listing Date: ${samsungInfo.data.listingDate}`);
      console.log(`  Paid-in Capital: ${samsungInfo.data.paidInCapital.toLocaleString()}원`);
    }

    console.log('\n🎉 Company search demo completed!');

  } catch (error) {
    console.error('❌ Company search demo failed:', error);
  }
}

/**
 * 재무 정보 분석 데모
 */
async function runFinancialAnalysisDemo(): Promise<void> {
  console.log('\n💰 Financial Analysis Demo');
  console.log('============================');

  try {
    const kset = new KSET({
      logLevel: 'info'
    });

    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    // 1. 재무 정보 조회
    console.log('\n📊 Step 1: Retrieving financial data...');
    const financialData = await kset.getFinancialData('005930', 'ANNUAL');

    if (financialData.length > 0) {
      console.log('✅ Recent Financial Data:');
      financialData.slice(0, 3).forEach((data: any, index: number) => {
        console.log(`  ${data.year} Q${data.quarter}:`);
        console.log(`    Revenue: ${data.revenue?.toLocaleString()}원`);
        console.log(`    Operating Income: ${data.operatingIncome?.toLocaleString()}원`);
        console.log(`    Net Income: ${data.netIncome?.toLocaleString()}원`);
        console.log(`    EPS: ${data.eps?.toLocaleString()}원`);
        console.log(`    PER: ${data.priceToEarnings?.toFixed(2)}`);
        console.log(`    PBR: ${data.priceToBook?.toFixed(2)}`);
        console.log(`    ROE: ${(data.roe * 100).toFixed(2)}%`);
      });
    }

    // 2. DART 상세 재무 정보 조회
    console.log('\n📈 Step 2: Getting DART financial data...');
    try {
      const dartFinancialData = await kset.getDARTFinancialData('00126380', 2023, 4); // 삼성전자 DART 코드

      console.log('✅ DART Financial Data:');
      dartFinancialData.slice(0, 3).forEach((data: any) => {
        console.log(`  Account: ${data.accountNm}`);
        console.log(`  Amount: ${data.thstrmAmount?.toLocaleString()}원`);
      });
    } catch (error) {
      console.log('⚠️ DART API not available in demo mode');
    }

    console.log('\n🎉 Financial analysis demo completed!');

  } catch (error) {
    console.error('❌ Financial analysis demo failed:', error);
  }
}

/**
 * 공시 정보 검색 데모
 */
async function runDisclosureSearchDemo(): Promise<void> {
  console.log('\n📋 Disclosure Search Demo');
  console.log('==========================');

  try {
    const kset = new KSET({
      logLevel: 'info',
      dart: {
        apiKey: process.env.DART_API_KEY,
        baseUrl: 'https://opendart.fss.or.kr/api'
      }
    });

    // 1. 최근 공시 검색
    console.log('\n📋 Step 1: Searching recent disclosures...');

    try {
      const disclosures = await kset.searchDARTDisclosures({
        corporationCode: '00126380', // 삼성전자
        startDate: '20240101',
        endDate: '20241231',
        disclosureTypes: ['A001', 'A002', 'D001', 'D002'] // 사업보고서, 분기보고서, 배당 관련
      });

      console.log('✅ Recent Disclosures:');
      disclosures.slice(0, 5).forEach((disclosure: any) => {
        console.log(`  ${disclosure.reportName}`);
        console.log(`    Date: ${disclosure.receiptDate}`);
        console.log(`    Type: ${disclosure.type}`);
        console.log(`    URL: ${disclosure.url}`);
      });
    } catch (error) {
      console.log('⚠️ DART API not available in demo mode');
    }

    // 2. Provider 기반 공시 정보 조회
    console.log('\n📊 Step 2: Getting disclosures via provider...');
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    const providerDisclosures = await kset.getDisclosures('005930', {
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      limit: 10
    });

    if (providerDisclosures.length > 0) {
      console.log('✅ Provider Disclosures:');
      providerDisclosures.slice(0, 3).forEach((disclosure: any) => {
        console.log(`  ${disclosure.title}`);
        console.log(`    Date: ${disclosure.publishDate}`);
        console.log(`    Type: ${disclosure.type}`);
      });
    }

    console.log('\n🎉 Disclosure search demo completed!');

  } catch (error) {
    console.error('❌ Disclosure search demo failed:', error);
  }
}

/**
 * 종목 분석 데모
 */
async function runStockAnalysisDemo(): Promise<void> {
  console.log('\n📈 Stock Analysis Demo');
  console.log('=======================');

  try {
    const kset = new KSET({
      logLevel: 'info'
    });

    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    // 1. 종목 분석 실행
    console.log('\n📊 Step 1: Analyzing Samsung Electronics...');

    try {
      const analysis = await kset.analyzeStock('005930');

      console.log('✅ Stock Analysis Results:');
      console.log(`  Symbol: ${analysis.symbol}`);
      console.log(`  Timestamp: ${analysis.timestamp}`);

      if (analysis.analysis) {
        console.log('\n  Financial Metrics:');
        console.log(`    PER: ${analysis.analysis.per?.toFixed(2)}`);
        console.log(`    PBR: ${analysis.analysis.pbr?.toFixed(2)}`);
        console.log(`    ROE: ${(analysis.analysis.roe * 100)?.toFixed(2)}%`);
        console.log(`    Debt Ratio: ${analysis.analysis.debtRatio?.toFixed(2)}%`);
        console.log(`    Current Ratio: ${analysis.analysis.currentRatio?.toFixed(2)}`);
      }

      if (analysis.valuation) {
        console.log('\n  Valuation Analysis:');
        console.log(`    Method: ${analysis.valuation.method}`);
        console.log(`    Fair Value: ${analysis.valuation.fairValue?.toLocaleString()}원`);
        console.log(`    Upside: ${analysis.valuation.upside?.toFixed(2)}%`);
        console.log(`    Recommendation: ${analysis.valuation.recommendation}`);
      }
    } catch (error) {
      console.log('⚠️ Advanced analysis requires market data and financial information');
    }

    console.log('\n🎉 Stock analysis demo completed!');

  } catch (error) {
    console.error('❌ Stock analysis demo failed:', error);
  }
}

/**
 * 포트폴리오 분석 데모
 */
async function runPortfolioAnalysisDemo(): Promise<void> {
  console.log('\n📊 Portfolio Analysis Demo');
  console.log('===========================');

  try {
    const kset = new KSET({
      logLevel: 'info'
    });

    // 1. 샘플 포트폴리오 생성
    console.log('\n📦 Step 1: Creating sample portfolio...');
    const samplePortfolio = {
      id: 'demo-portfolio',
      name: 'KOSPI 대표 종목 포트폴리오',
      currency: 'KRW',
      totalValue: 10000000,
      positions: [
        {
          symbol: '005930',
          name: '삼성전자',
          quantity: 100,
          averagePrice: 85000,
          currentPrice: 86000,
          marketValue: 8600000,
          weight: 0.4
        },
        {
          symbol: '000660',
          name: 'SK하이닉스',
          quantity: 200,
          averagePrice: 120000,
          currentPrice: 125000,
          marketValue: 25000000,
          weight: 0.3
        },
        {
          symbol: '035420',
          name: 'NAVER',
          quantity: 50,
          averagePrice: 180000,
          currentPrice: 185000,
          marketValue: 9250000,
          weight: 0.3
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('✅ Sample Portfolio Created:');
    console.log(`  Total Positions: ${samplePortfolio.positions.length}`);
    console.log(`  Total Value: ${samplePortfolio.totalValue.toLocaleString()}원`);

    samplePortfolio.positions.forEach((position: any) => {
      const profit = (position.currentPrice - position.averagePrice) * position.quantity;
      const profitRate = ((position.currentPrice - position.averagePrice) / position.averagePrice) * 100;
      console.log(`  ${position.name}: ${position.quantity}주 (${position.weight * 100}%)`);
      console.log(`    손익: ${profit.toLocaleString()}원 (${profitRate.toFixed(2)}%)`);
    });

    // 2. 포트폴리오 분석 실행
    console.log('\n📈 Step 2: Analyzing portfolio...');

    try {
      const analysis = await kset.analyzePortfolio(samplePortfolio);

      console.log('✅ Portfolio Analysis Results:');
      console.log(`  Total Return: ${analysis.totalReturn?.toFixed(2)}%`);
      console.log(`  Annualized Return: ${analysis.annualizedReturn?.toFixed(2)}%`);
      console.log(`  Volatility: ${analysis.volatility?.toFixed(2)}%`);
      console.log(`  Sharpe Ratio: ${analysis.sharpeRatio?.toFixed(2)}`);

      if (analysis.riskMetrics) {
        console.log('\n  Risk Metrics:');
        console.log(`    Beta: ${analysis.riskMetrics.beta?.toFixed(2)}`);
        console.log(`    Max Drawdown: ${analysis.riskMetrics.maxDrawdown?.toFixed(2)}%`);
        console.log(`    VaR (95%): ${analysis.riskMetrics.var95?.toLocaleString()}원`);
      }

      if (analysis.recommendations) {
        console.log('\n  Recommendations:');
        analysis.recommendations.slice(0, 3).forEach((rec: any) => {
          console.log(`    ${rec.type}: ${rec.description}`);
        });
      }
    } catch (error) {
      console.log('⚠️ Portfolio analysis requires real market data');
    }

    console.log('\n🎉 Portfolio analysis demo completed!');

  } catch (error) {
    console.error('❌ Portfolio analysis demo failed:', error);
  }
}

/**
 * 리서치 기능 통합 데모
 */
async function runIntegratedResearchDemo(): Promise<void> {
  console.log('\n🔬 Integrated Research Demo');
  console.log('==========================');

  try {
    const kset = new KSET({
      logLevel: 'info',
      dart: {
        apiKey: process.env.DART_API_KEY,
        baseUrl: 'https://opendart.fss.or.kr/api'
      }
    });

    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    // 1. 종목 선택 (삼성전자)
    const targetSymbol = '005930';
    console.log(`\n🎯 Step 1: Selected target symbol: ${targetSymbol}`);

    // 2. 종합 정보 수집
    console.log('\n📊 Step 2: Collecting comprehensive information...');

    // 기업 정보
    const companyInfo = await kset.getCompanyInfo(targetSymbol);
    if (companyInfo.success) {
      console.log(`✅ Company: ${companyInfo.data.name}`);
    }

    // 시장 정보
    const marketData = await kset.getMarketData([targetSymbol]);
    if (marketData.success && marketData.data.length > 0) {
      const data = marketData.data[0];
      console.log(`✅ Current Price: ${data.currentPrice?.toLocaleString()}원 (${data.changeRate > 0 ? '+' : ''}${data.changeRate}%)`);
    }

    // 재무 정보
    const financialData = await kset.getFinancialData(targetSymbol, 'ANNUAL');
    if (financialData.length > 0) {
      const latest = financialData[0];
      console.log(`✅ Latest Financials: Revenue ${latest.revenue?.toLocaleString()}원, ROE ${(latest.roe * 100)?.toFixed(2)}%`);
    }

    // 3. 종합 분석 리포트 생성
    console.log('\n📋 Step 3: Generating comprehensive analysis...');

    console.log('📈 Comprehensive Analysis Report:');
    console.log('=====================================');
    console.log(`Symbol: ${targetSymbol}`);
    console.log(`Analysis Date: ${new Date().toLocaleDateString()}`);

    if (companyInfo.success) {
      console.log(`\nCompany Information:`);
      console.log(`  Name: ${companyInfo.data.name}`);
      console.log(`  Market: ${companyInfo.data.market}`);
      console.log(`  Sector: ${companyInfo.data.sector}`);
    }

    if (marketData.success && marketData.data.length > 0) {
      const data = marketData.data[0];
      console.log(`\nMarket Information:`);
      console.log(`  Current Price: ${data.currentPrice?.toLocaleString()}원`);
      console.log(`  Change: ${data.changeRate > 0 ? '+' : ''}${data.changeRate}% (${data.change?.toLocaleString()}원)`);
      console.log(`  Volume: ${data.volume?.toLocaleString()}주`);
      console.log(`  Market Cap: ${data.marketCap?.toLocaleString()}원`);
    }

    if (financialData.length > 0) {
      const latest = financialData[0];
      console.log(`\nFinancial Highlights:`);
      console.log(`  Revenue: ${latest.revenue?.toLocaleString()}원`);
      console.log(`  Operating Income: ${latest.operatingIncome?.toLocaleString()}원`);
      console.log(`  Net Income: ${latest.netIncome?.toLocaleString()}원`);
      console.log(`  ROE: ${(latest.roe * 100)?.toFixed(2)}%`);
      console.log(`  Debt Ratio: ${latest.debtRatio?.toFixed(2)}%`);
    }

    console.log('\n🎉 Integrated research demo completed!');

  } catch (error) {
    console.error('❌ Integrated research demo failed:', error);
  }
}

// 메인 실행 함수
async function main(): Promise<void> {
  await runCompanySearchDemo();
  await runFinancialAnalysisDemo();
  await runDisclosureSearchDemo();
  await runStockAnalysisDemo();
  await runPortfolioAnalysisDemo();
  await runIntegratedResearchDemo();
}

// 데모 실행
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n👋 Research and analytics demo completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export {
  runCompanySearchDemo,
  runFinancialAnalysisDemo,
  runDisclosureSearchDemo,
  runStockAnalysisDemo,
  runPortfolioAnalysisDemo,
  runIntegratedResearchDemo
};