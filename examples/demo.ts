/**
 * KSET Demo Application
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * KSET 라이브러리의 기본 사용법을 보여주는 데모 애플리케이션입니다.
 */

import { KSET } from '../src';

/**
 * 메인 데모 함수
 */
async function runDemo(): Promise<void> {
  console.log('🚀 KSET Demo Application Starting...');
  console.log('=====================================');

  try {
    // 1. KSET 인스턴스 생성
    console.log('\n📦 Step 1: Creating KSET instance...');
    const kset = new KSET({
      logLevel: 'info',
      defaultTimeout: 30000,
      cache: {
        enabled: true,
        ttl: 60000,
        maxSize: 1000
      }
    });

    // 2. 사용 가능한 브로커 확인
    console.log('\n🔍 Step 2: Checking available brokers...');
    const availableBrokers = kset.getAvailableBrokers();
    console.log('Available brokers:');
    for (const broker of availableBrokers) {
      console.log(`  - ${broker.name} (${broker.id}): ${broker.description}`);
      console.log(`    Markets: ${broker.supportedMarkets.join(', ')}`);
      console.log(`    Status: ${broker.status}`);
    }

    // 3. 브로커 기능 비교
    console.log('\n📊 Step 3: Comparing broker capabilities...');
    if (availableBrokers.length >= 2) {
      const comparison = kset.compareBrokers([availableBrokers[0].id, availableBrokers[1].id]);
      console.log('Comparison results:');
      console.log(`  Providers: ${comparison.providers.map(p => p.name).join(' vs ')}`);
      console.log(`  Feature matrix available`);
    }

    // 4. 기능별 브로커 필터링
    console.log('\n🎯 Step 4: Filtering brokers by features...');
    const tradingBrokers = kset.getBrokersWithFeature('trading');
    const realTimeBrokers = kset.getBrokersWithFeature('real-time-data');
    console.log(`Trading-capable brokers: ${tradingBrokers.join(', ')}`);
    console.log(`Real-time data brokers: ${realTimeBrokers.join(', ')}`);

    // 5. 시장 통계 확인
    console.log('\n📈 Step 5: Market statistics...');
    const stats = kset.getMarketStatistics();
    console.log('Market statistics:');
    console.log(`  Total providers: ${stats.totalProviders}`);
    console.log(`  Active providers: ${stats.activeProviders}`);
    console.log(`  Average response time: ${stats.averageResponseTime}ms`);

    // 6. 라이브러리 정보 확인
    console.log('\n📚 Step 6: Library information...');
    const libInfo = kset.getVersion();
    console.log('Library information:');
    console.log(`  Version: ${libInfo.version}`);
    console.log(`  Build time: ${libInfo.buildTime}`);
    console.log(`  Supported providers: ${libInfo.supportedProviders}`);
    console.log(`  Supported features: ${libInfo.supportedFeatures.join(', ')}`);
    console.log(`  Documentation: ${libInfo.documentation}`);
    console.log(`  License: ${libInfo.license}`);

    // 7. Provider 생성 시뮬레이션 (실제 API 호출 없음)
    console.log('\n🔗 Step 7: Provider creation simulation...');
    console.log('To create an actual provider, you would do:');
    console.log(`
const kiwoom = await kset.createProvider('kiwoom', {
  credentials: {
    certificate: './path/to/cert.p12',
    password: 'your-password',
    accountNumber: '12345678-01'
  },
  environment: 'production'
});
    `);

    console.log(`
const koreaInvestment = await kset.createProvider('korea-investment', {
  credentials: {
    apiKey: 'your-api-key',
    secret: 'your-secret',
    accountNumber: '87654321-01'
  },
  environment: 'production'
});
    `);

    // 8. 데이터 조회 시뮬레이션
    console.log('\n📊 Step 8: Data retrieval simulation...');
    console.log('Once providers are created, you can:');
    console.log(`
// 시장 데이터 조회
const marketData = await kiwoom.getMarketData(['005930', '000660']);
console.log('Samsung Electronics:', marketData.data[0]);
console.log('SK Hynix:', marketData.data[1]);

// 포트폴리오 조회
const portfolio = await kiwoom.getPortfolio();
console.log('Total portfolio value:', portfolio.data.totalValue);

// 주문 실행
const order = await kiwoom.placeOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 85000
});
console.log('Order result:', order.data);
    `);

    // 9. 시장 데이터 비교 시뮬레이션
    console.log('\n⚖️ Step 9: Market data comparison simulation...');
    console.log('Compare data from multiple providers:');
    console.log(`
const comparison = await kset.compareMarketData('005930');
for (const [provider, data] of comparison.entries()) {
  console.log(\`\${provider}: \${data.currentPrice} (\${data.changeRate}%)\`);
}
    `);

    // 10. 스마트 오더 라우팅 시뮬레이션
    console.log('\n🤖 Step 10: Smart order routing simulation...');
    console.log('Automatic broker selection for optimal execution:');
    console.log(`
const routingResult = await kset.routeOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10,
  price: 85000
}, {
  priority: 'price' // or 'speed', 'reliability', 'cost'
});
console.log('Order routed to:', routingResult.routing.selectedBrokers);
console.log('Execution summary:', routingResult.summary);
    `);

    // 11. 규제 준수 확인 시뮬레이션
    console.log('\n⚖️ Step 11: Compliance checking simulation...');
    console.log('Automated regulatory compliance checks:');
    console.log(`
const marketEngine = kset.getMarketEngine();
const complianceEngine = kset.getComplianceEngine();

// 주문 규제 준수 확인
const compliance = complianceEngine.checkOrderCompliance(order, position, accountInfo);
if (!compliance.overallCompliant) {
  console.log('Compliance violations:', compliance.violations);
}

// 시장 상태 확인
const marketStatus = marketEngine.getMarketStatus('KOSPI');
console.log('KOSPI market status:', marketStatus);
    `);

    // 12. 실시간 데이터 구독 시뮬레이션
    console.log('\n📡 Step 12: Real-time data subscription simulation...');
    console.log('Real-time market data streaming:');
    console.log(`
const subscription = await kiwoom.subscribeToRealTimeData(
  ['005930', '000660'],
  (data) => {
    console.log(\`Real-time update: \${data.symbol} = \${data.currentPrice}\`);
  }
);

// 구독 해제
// await subscription.unsubscribe();
    `);

    // 완료 메시지
    console.log('\n✅ Demo completed successfully!');
    console.log('=====================================');
    console.log('KSET is ready to use as Korea\'s standard trading interface!');
    console.log('📖 Documentation: https://kset.dev/docs');
    console.log('🐛 Issues: https://github.com/kset/kset/issues');
    console.log('💬 Community: https://github.com/kset/kset/discussions');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

/**
 * 실제 Provider 생성 데모 (실제 API 호출)
 * 이 함수는 실제 인증 정보가 필요하므로 기본적으로 비활성화됨
 */
async function runRealProviderDemo(): Promise<void> {
  console.log('\n🔗 Real Provider Demo');
  console.log('=====================');

  // 이 함수는 실제 인증 정보가 있을 때만 실행
  // 개발 중에는 주석 처리

  /*
  const kset = new KSET();

  try {
    // 키움증권 Provider 생성
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12', // 실제 인증서 경로
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development' // 개발 환경에서 시도
    });

    console.log('✅ Kiwoom provider created successfully');

    // 시장 데이터 조회
    const marketData = await kiwoom.getMarketData(['005930']); // 삼성전자
    if (marketData.success && marketData.data) {
      console.log('📊 Samsung Electronics data:', {
        name: marketData.data[0].name,
        price: marketData.data[0].currentPrice,
        change: marketData.data[0].changeAmount,
        changeRate: marketData.data[0].changeRate
      });
    }

    // 포트폴리오 조회
    const portfolio = await kiwoom.getPortfolio();
    if (portfolio.success && portfolio.data) {
      console.log('💼 Portfolio summary:', {
        totalValue: portfolio.data.totalValue,
        cash: portfolio.data.totalCash,
        positions: portfolio.data.totalMarketValue,
        pnl: portfolio.data.totalUnrealizedPnL
      });
    }

    await kiwoom.disconnect();
    console.log('🔌 Kiwoom provider disconnected');

  } catch (error) {
    console.error('❌ Real provider demo failed:', error);
  }
  */

  console.log('Real provider demo is disabled for security reasons.');
  console.log('To enable, please modify the code and add your actual credentials.');
}

// 데모 실행
if (require.main === module) {
  runDemo()
    .then(() => {
      console.log('\n👋 Thank you for trying KSET!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { runDemo, runRealProviderDemo };