/**
 * KSET Advanced Trading Features Demo
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 고급 거래 기능 데모 애플리케이션
 */

import { KSET } from '../src';

/**
 * 스마트 오더 라우팅 데모
 */
async function runSmartOrderRoutingDemo(): Promise<void> {
  console.log('🧠 Smart Order Routing Demo');
  console.log('=============================');

  try {
    // 1. KSET 인스턴스 생성
    console.log('\n📦 Step 1: Creating KSET instance...');
    const kset = new KSET({
      logLevel: 'info',
      defaultTimeout: 30000,
      routing: {
        defaultStrategy: 'best-price',
        enableSplitOrders: true,
        maxSplitProviders: 3,
        minOrderSize: 100000
      }
    });

    // 2. 여러 Provider 생성
    console.log('\n🔗 Step 2: Creating multiple providers...');
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    const koreaInvestment = await kset.createProvider('korea-investment', {
      credentials: {
        apiKey: 'demo-api-key',
        secret: 'demo-secret',
        accountNumber: '87654321-01'
      },
      environment: 'development'
    });

    console.log('✅ Multiple providers created for routing');

    // 3. 라우팅 통계 확인
    console.log('\n📊 Step 3: Checking routing statistics...');
    const routingStats = kset.getRoutingStatistics();
    console.log('Routing Statistics:');
    console.log(`  Total providers: ${routingStats.totalProviders}`);
    console.log(`  Active providers: [${routingStats.activeProviders.join(', ')}]`);
    console.log(`  Average latency: ${routingStats.averageLatency}ms`);
    console.log(`  Average reliability: ${routingStats.averageReliability}%`);

    // 4. 최우선 가격 전략으로 주문 라우팅
    console.log('\n🎯 Step 4: Routing order with BEST_PRICE strategy...');
    const bestPriceOrder = {
      symbol: '005930', // 삼성전자
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 100,
      price: 85000
    };

    const bestPriceRouting = await kset.routeOrder(bestPriceOrder, {
      strategy: 'best-price',
      maxProviders: 2,
      maxLatency: 1000
    });

    console.log('✅ Best Price Routing Result:');
    console.log(`  Selected providers: [${bestPriceRouting.selectedProviders.join(', ')}]`);
    console.log(`  Expected price: ${bestPriceRouting.expectedPrice}원`);
    console.log(`  Estimated cost: ${bestPriceRouting.estimatedCost.toFixed(2)}원`);
    console.log(`  Confidence: ${(bestPriceRouting.confidence * 100).toFixed(1)}%`);
    console.log(`  Reasoning: ${bestPriceRouting.reasoning}`);
    console.log(`  Allocations:`);
    for (const [provider, quantity] of bestPriceRouting.allocatedQuantities.entries()) {
      console.log(`    ${provider}: ${quantity}주`);
    }

    // 5. 최고 속도 전략으로 주문 라우팅
    console.log('\n⚡ Step 5: Routing order with FASTEST_EXECUTION strategy...');
    const speedOrder = {
      symbol: '000660', // SK하이닉스
      side: 'SELL',
      orderType: 'MARKET',
      quantity: 50
    };

    const speedRouting = await kset.routeOrder(speedOrder, {
      strategy: 'fastest-execution',
      maxLatency: 500
    });

    console.log('✅ Fastest Execution Routing Result:');
    console.log(`  Selected providers: [${speedRouting.selectedProviders.join(', ')}]`);
    console.log(`  Estimated latency: ${speedRouting.estimatedLatency}ms`);
    console.log(`  Reasoning: ${speedRouting.reasoning}`);

    // 6. 대형 주문 분할 실행
    console.log('\n📦 Step 6: Splitting large order across providers...');
    const largeOrder = {
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 1000, // 1000주 대형 주문
      price: 84900
    };

    const splitRouting = await kset.routeOrder(largeOrder, {
      strategy: 'balanced',
      enableSplitOrders: true,
      maxSplitProviders: 3
    });

    console.log('✅ Split Order Routing Result:');
    console.log(`  Total quantity: ${splitRouting.totalQuantity}주`);
    console.log(`  Providers used: ${splitRouting.selectedProviders.length}`);
    console.log(`  Allocations:`);
    for (const [provider, quantity] of splitRouting.allocatedQuantities.entries()) {
      console.log(`    ${provider}: ${quantity}주 (${((quantity/largeOrder.quantity)*100).toFixed(1)}%)`);
    }

    // 7. 분할 주문 실행 시뮬레이션
    console.log('\n⚙️ Step 7: Executing split order...');
    const executionResults = await kset.executeSplitOrder(
      largeOrder,
      splitRouting.selectedProviders,
      splitRouting.allocatedQuantities
    );

    console.log('✅ Split Order Execution Results:');
    for (const result of executionResults) {
      if (result.success) {
        console.log(`  ✅ ${result.providerId}: ${result.quantity}주 executed (Order: ${result.order.id})`);
      } else {
        console.log(`  ❌ ${result.providerId}: Failed - ${result.error}`);
      }
    }

    // 8. 대안 라우팅 계획 확인
    console.log('\n🔄 Step 8: Checking alternative routing plans...');
    if (bestPriceRouting.alternatives.length > 0) {
      console.log('Alternative Routing Plans:');
      for (let i = 0; i < Math.min(2, bestPriceRouting.alternatives.length); i++) {
        const alt = bestPriceRouting.alternatives[i];
        console.log(`  Alternative ${i + 1}:`);
        console.log(`    Provider: ${alt.selectedProviders[0]}`);
        console.log(`    Expected price: ${alt.expectedPrice}원`);
        console.log(`    Confidence: ${(alt.confidence * 100).toFixed(1)}%`);
      }
    }

    console.log('\n🎉 Smart order routing demo completed!');

  } catch (error) {
    console.error('❌ Smart order routing demo failed:', error);
  }
}

/**
 * 알고리즘 트레이딩 데모
 */
async function runAlgorithmTradingDemo(): Promise<void> {
  console.log('\n🤖 Algorithm Trading Demo');
  console.log('=========================');

  try {
    const kset = new KSET();

    // 1. TWAP 알고리즘 실행
    console.log('\n📈 Step 1: Executing TWAP algorithm...');
    const twapParams = {
      symbol: '005930',
      side: 'BUY',
      totalQuantity: 500,
      startTime: new Date(),
      endTime: new Date(Date.now() + 10 * 60 * 1000), // 10분 후
      intervalSeconds: 60, // 1분 간격
      sliceCount: 10,
      allowOvershoot: true,
      minOrderSize: 10,
      maxOrderSize: 100
    };

    const twapCallbacks = {
      onOrderPlaced: (order: any) => {
        console.log(`📋 TWAP Order placed: ${order.id} (${order.quantity}주 @ ${order.price}원)`);
      },
      onOrderFilled: (order: any) => {
        console.log(`✅ TWAP Order filled: ${order.id} (${order.filledQuantity}주 @ ${order.averageFillPrice}원)`);
      },
      onProgressUpdate: (instance: any) => {
        console.log(`📊 TWAP Progress: ${(instance.currentProgress * 100).toFixed(1)}% (${instance.executedQuantity}/${instance.parameters.totalQuantity}주)`);
      },
      onComplete: (result: any) => {
        console.log(`🎉 TWAP Completed! Avg Price: ${result.averagePrice}원, Slippage: ${result.slippage.toFixed(3)}%`);
      }
    };

    const twapInstanceId = await kset.executeTWAP('kiwoom', twapParams, twapCallbacks);
    console.log(`✅ TWAP algorithm started: ${twapInstanceId}`);

    // 2. VWAP 알고리즘 실행
    console.log('\n📊 Step 2: Executing VWAP algorithm...');
    const vwapParams = {
      symbol: '000660',
      side: 'SELL',
      totalQuantity: 300,
      startTime: new Date(),
      endTime: new Date(Date.now() + 15 * 60 * 1000), // 15분 후
      lookbackPeriod: 30, // 30분 과거 데이터
      volumeProfile: [
        { time: 540, expectedVolume: 1000000, participationRate: 5 }, // 09:00
        { time: 600, expectedVolume: 1500000, participationRate: 8 }, // 10:00
        { time: 660, expectedVolume: 2000000, participationRate: 10 }, // 11:00
        { time: 720, expectedVolume: 1800000, participationRate: 7 }, // 12:00
        { time: 780, expectedVolume: 1600000, participationRate: 6 }  // 13:00
      ],
      minOrderSize: 5
    };

    const vwapCallbacks = {
      onOrderPlaced: (order: any) => {
        console.log(`📋 VWAP Order placed: ${order.id} (${order.quantity}주 @ ${order.price}원)`);
      },
      onComplete: (result: any) => {
        console.log(`🎉 VWAP Completed! Avg Price: ${result.averagePrice}원, Market Impact: ${result.marketImpact.toFixed(3)}%`);
      }
    };

    const vwapInstanceId = await kset.executeVWAP('korea-investment', vwapParams, vwapCallbacks);
    console.log(`✅ VWAP algorithm started: ${vwapInstanceId}`);

    // 3. POV 알고리즘 실행
    console.log('\n⚖️ Step 3: Executing POV algorithm...');
    const povParams = {
      symbol: '035420', // NAVER
      side: 'BUY',
      totalQuantity: 200,
      startTime: new Date(),
      endTime: new Date(Date.now() + 20 * 60 * 1000), // 20분 후
      targetParticipationRate: 10, // 목표 10% 참여
      minParticipationRate: 5,    // 최소 5%
      maxParticipationRate: 20,    // 최대 20%
      adjustmentFactor: 1.2,
      minOrderSize: 5
    };

    const povCallbacks = {
      onOrderPlaced: (order: any) => {
        console.log(`📋 POV Order placed: ${order.id} (${order.quantity}주 @ ${order.price}원)`);
      },
      onProgressUpdate: (instance: any) => {
        console.log(`📊 POV Progress: ${(instance.currentProgress * 100).toFixed(1)}%`);
      },
      onComplete: (result: any) => {
        console.log(`🎉 POV Completed! Timing Cost: ${result.timingCost.toFixed(3)}%`);
      }
    };

    const povInstanceId = await kset.executePOV('kiwoom', povParams, povCallbacks);
    console.log(`✅ POV algorithm started: ${povInstanceId}`);

    // 4. 알고리즘 상태 모니터링
    console.log('\n📊 Step 4: Monitoring algorithm status...');
    const monitorInterval = setInterval(async () => {
      const stats = await kset.getAlgorithmStatistics();
      console.log('Algorithm Statistics:');
      console.log(`  Total: ${stats.total}, Running: ${stats.running}, Completed: ${stats.completed}`);

      const instances = await kset.getAlgorithmStatus();
      if (instances.length > 0) {
        console.log('Active Instances:');
        for (const instance of instances) {
          if (instance.status === 'running') {
            console.log(`  ${instance.id} (${instance.type}): ${(instance.currentProgress * 100).toFixed(1)}%`);
          }
        }
      }
    }, 5000);

    // 30초간 모니터링
    await new Promise(resolve => setTimeout(resolve, 30000));
    clearInterval(monitorInterval);

    // 5. 알고리즘 제어 시뮬레이션
    console.log('\n🎮 Step 5: Algorithm control simulation...');

    // TWAP 일시 정지
    await kset.controlAlgorithm(twapInstanceId, 'pause');
    console.log(`⏸️ Paused TWAP algorithm: ${twapInstanceId}`);

    // 5초 후 재개
    setTimeout(async () => {
      await kset.controlAlgorithm(twapInstanceId, 'resume');
      console.log(`▶️ Resumed TWAP algorithm: ${twapInstanceId}`);
    }, 5000);

    // VWAP 취소
    setTimeout(async () => {
      await kset.controlAlgorithm(vwapInstanceId, 'cancel');
      console.log(`❌ Cancelled VWAP algorithm: ${vwapInstanceId}`);
    }, 10000);

    // 최종 상태 확인
    await new Promise(resolve => setTimeout(resolve, 15000));

    const finalStats = await kset.getAlgorithmStatistics();
    console.log('\n📊 Final Algorithm Statistics:');
    console.log(`  Total: ${finalStats.total}`);
    console.log(`  Running: ${finalStats.running}`);
    console.log(`  Completed: ${finalStats.completed}`);
    console.log(`  Cancelled: ${finalStats.cancelled}`);
    console.log(`  Error: ${finalStats.error}`);

    console.log('\n🎉 Algorithm trading demo completed!');

  } catch (error) {
    console.error('❌ Algorithm trading demo failed:', error);
  }
}

/**
 * 고급 거래 기능 통합 데모
 */
async function runIntegratedAdvancedDemo(): Promise<void> {
  console.log('\n🚀 Integrated Advanced Trading Demo');
  console.log('==================================');

  try {
    const kset = new KSET({
      logLevel: 'info',
      realTime: {
        maxSubscriptions: 20,
        reconnectAttempts: 3
      },
      routing: {
        defaultStrategy: 'balanced',
        enableSplitOrders: true
      }
    });

    // 1. 실시간 데이터 구독 + 스마트 라우팅 조합
    console.log('\n📡 Step 1: Combining real-time data with smart routing...');

    const realTimeSubscription = await kset.subscribeToRealTimeData(
      'kiwoom',
      ['005930', '000660'],
      (data) => {
        console.log(`📈 Real-time: ${data.name} ${data.currentPrice}원 (${data.changeRate > 0 ? '+' : ''}${data.changeRate}%)`);

        // 특정 조건에서 자동 주문 라우팅 (시뮬레이션)
        if (data.symbol === '005930' && data.changeRate < -1.0) {
          console.log('📉 Significant drop detected! Routing buy order...');
          // 실제 구현에서는 스마트 라우팅 호출
        }
      }
    );

    console.log('✅ Real-time subscription with smart routing integration active');

    // 2. 알고리즘 + 실시간 데이터 피드백
    console.log('\n🤖 Step 2: Algorithm with real-time feedback...');

    const adaptiveTwapParams = {
      symbol: '005930',
      side: 'BUY',
      totalQuantity: 100,
      startTime: new Date(),
      endTime: new Date(Date.now() + 5 * 60 * 1000), // 5분
      intervalSeconds: 30,
      sliceCount: 10,
      allowOvershoot: false
    };

    const adaptiveCallbacks = {
      onOrderPlaced: (order: any) => {
        console.log(`📋 Adaptive order placed: ${order.quantity}주`);
      },
      onProgressUpdate: async (instance: any) => {
        console.log(`📊 Adaptive progress: ${(instance.currentProgress * 100).toFixed(1)}%`);

        // 실시간 데이터 기반으로 전략 조정 (시뮬레이션)
        const marketData = await kset.getProvider('kiwoom').then(p => p.getMarketData(['005930']));
        if (marketData.success && marketData.data.length > 0) {
          const currentPrice = marketData.data[0].currentPrice;
          console.log(`💡 Current market price: ${currentPrice}원 - adjusting strategy...`);
        }
      }
    };

    const adaptiveInstanceId = await kset.executeTWAP('kiwoom', adaptiveTwapParams, adaptiveCallbacks);
    console.log(`✅ Adaptive TWAP started: ${adaptiveInstanceId}`);

    // 3. 시뮬레이션 실행
    await new Promise(resolve => setTimeout(resolve, 60000)); // 1분 실행

    // 4. 정리
    await realTimeSubscription.unsubscribe();
    await kset.controlAlgorithm(adaptiveInstanceId, 'cancel');

    console.log('\n🎉 Integrated advanced trading demo completed!');

  } catch (error) {
    console.error('❌ Integrated demo failed:', error);
  }
}

// 메인 실행 함수
async function main(): Promise<void> {
  await runSmartOrderRoutingDemo();
  await runAlgorithmTradingDemo();
  await runIntegratedAdvancedDemo();
}

// 데모 실행
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n👋 Advanced trading features demo completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { runSmartOrderRoutingDemo, runAlgorithmTradingDemo, runIntegratedAdvancedDemo };