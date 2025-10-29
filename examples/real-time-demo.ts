/**
 * KSET Real-time Data Streaming Demo
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 실시간 데이터 스트리밍 데모 애플리케이션
 */

import { KSET } from '../src';

/**
 * 실시간 데이터 스트리밍 데모
 */
async function runRealTimeDemo(): Promise<void> {
  console.log('🚀 KSET Real-time Data Streaming Demo');
  console.log('==========================================');

  try {
    // 1. KSET 인스턴스 생성
    console.log('\n📦 Step 1: Creating KSET instance...');
    const kset = new KSET({
      logLevel: 'info',
      defaultTimeout: 30000,
      realTime: {
        maxSubscriptions: 50,
        reconnectAttempts: 5,
        reconnectDelay: 3000
      }
    });

    // 2. 키움증권 Provider 생성 (실시간 데이터 지원)
    console.log('\n🔗 Step 2: Creating Kiwoom provider with real-time data...');
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12', // 실제 인증서 경로
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development',
      realTime: {
        enabled: true,
        reconnectAttempts: 3,
        reconnectDelay: 5000
      }
    });

    console.log('✅ Kiwoom provider created with real-time data support');

    // 3. 한국투자증권 Provider 생성
    console.log('\n🔗 Step 3: Creating Korea Investment provider...');
    const koreaInvestment = await kset.createProvider('korea-investment', {
      credentials: {
        apiKey: 'demo-api-key',
        secret: 'demo-secret',
        accountNumber: '87654321-01'
      },
      environment: 'development',
      realTime: {
        enabled: true,
        reconnectAttempts: 3,
        reconnectDelay: 5000
      }
    });

    console.log('✅ Korea Investment provider created with real-time data support');

    // 4. 실시간 시장 데이터 구독 - 키움증권
    console.log('\n📡 Step 4: Subscribing to real-time market data (Kiwoom)...');
    const kiwoomSubscription = await kset.subscribeToRealTimeData(
      'kiwoom',
      ['005930', '000660'], // 삼성전자, SK하이닉스
      (data) => {
        console.log(`📈 [Kiwoom] ${data.name}: ${data.currentPrice}원 (${data.changeRate > 0 ? '+' : ''}${data.changeRate}%)`);
        console.log(`   호가: 매도 ${data.askPrice}원 / 매수 ${data.bidPrice}원`);
        console.log(`   거래량: ${data.volume.toLocaleString()}주`);
        console.log(`   시간: ${new Date(data.timestamp).toLocaleTimeString('ko-KR')}`);
        console.log('---');
      }
    );

    console.log(`✅ Kiwoom real-time subscription created: ${kiwoomSubscription.subscriptionId}`);

    // 5. 실시간 주문 업데이트 구독 - 한국투자증권
    console.log('\n📋 Step 5: Subscribing to order updates (Korea Investment)...');
    const orderSubscription = await kset.subscribeToOrderUpdates(
      'korea-investment',
      (orderData) => {
        console.log(`📋 [Korea Investment] Order Update:`);
        console.log(`   ID: ${orderData.id}`);
        console.log(`   종목: ${orderData.symbol} (${orderData.side})`);
        console.log(`   상태: ${orderData.status}`);
        console.log(`   체결량: ${orderData.filledQuantity}/${orderData.quantity}`);
        if (orderData.filledQuantity > 0) {
          console.log(`   평균가: ${orderData.averageFillPrice}원`);
        }
        console.log('---');
      }
    );

    console.log(`✅ Order subscription created: ${orderSubscription.subscriptionId}`);

    // 6. 다중 Provider 실시간 데이터 비교 구독
    console.log('\n⚖️ Step 6: Multi-provider real-time data comparison...');
    const multiSubscription = await kset.subscribeToMultiProviderRealTimeData(
      ['kiwoom', 'korea-investment'],
      ['005930'], // 삼성전자만 비교
      (brokerId, data) => {
        console.log(`⚖️ [${brokerId.toUpperCase()}] Samsung Electronics:`);
        console.log(`   가격: ${data.currentPrice}원`);
        console.log(`   등락: ${data.changeRate > 0 ? '+' : ''}${data.changeRate}%`);
        console.log(`   거래량: ${data.volume.toLocaleString()}주`);
        console.log(`   소스: ${data.source}`);
        console.log('---');
      }
    );

    console.log(`✅ Multi-provider subscription created for ${multiSubscription.subscriptions.size} providers`);

    // 7. 실시간 데이터 상태 확인
    console.log('\n📊 Step 7: Real-time data status check...');
    const kiwoomStatus = await kset.getRealTimeDataStatus('kiwoom');
    console.log('Kiwoom Real-time Status:');
    console.log(`  Enabled: ${kiwoomStatus.enabled}`);
    console.log(`  Connected: ${kiwoomStatus.webSocketConnected}`);
    console.log(`  Subscriptions: ${kiwoomStatus.subscriptionCount}`);
    console.log(`  Active: [${kiwoomStatus.activeSubscriptions.join(', ')}]`);

    const allStatus = await kset.getAllRealTimeDataStatus();
    console.log('\nAll Providers Real-time Status:');
    for (const [brokerId, status] of allStatus.entries()) {
      console.log(`  ${brokerId}: ${status.enabled ? '✅' : '❌'} (${status.subscriptionCount} subscriptions)`);
    }

    // 8. 실시간 데이터 스트림 관리자 정보
    console.log('\n🔧 Step 8: Stream manager statistics...');
    const streamManager = kset.getRealTimeStreamManager();
    const streamStats = streamManager.getStreamStats();
    console.log('Stream Statistics:');
    console.log(`  Total streams: ${streamStats.totalStreams}`);
    console.log(`  Active connections: ${streamStats.activeConnections}`);
    console.log(`  Total subscriptions: ${streamStats.totalSubscriptions}`);

    // 9. 데이터 구독 유지 시뮬레이션
    console.log('\n⏳ Step 9: Maintaining subscriptions for 30 seconds...');
    console.log('(실시간 데이터가 수신되면 위에서 설정한 콜백이 실행됩니다)');

    // 30초간 대기 (실제 환경에서는 필요한 만큼 유지)
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 10. 구독 해제
    console.log('\n🔌 Step 10: Cleaning up subscriptions...');
    await kiwoomSubscription.unsubscribe();
    await orderSubscription.unsubscribe();
    await multiSubscription.unsubscribeAll();

    console.log('✅ All subscriptions cleaned up');

    // 11. 최종 상태 확인
    console.log('\n📊 Step 11: Final status check...');
    const finalStatus = await kset.getAllRealTimeDataStatus();
    for (const [brokerId, status] of finalStatus.entries()) {
      console.log(`  ${brokerId}: ${status.subscriptionCount} active subscriptions`);
    }

    // 12. 연결 해제
    console.log('\n🔌 Step 12: Disconnecting providers...');
    await kiwoom.disconnect();
    await koreaInvestment.disconnect();

    console.log('✅ All providers disconnected');

    console.log('\n🎉 Real-time demo completed successfully!');
    console.log('==========================================');

  } catch (error) {
    console.error('❌ Real-time demo failed:', error);
    process.exit(1);
  }
}

/**
 * 실시간 데이터 재연결 데모
 */
async function runReconnectionDemo(): Promise<void> {
  console.log('\n🔄 Real-time Data Reconnection Demo');
  console.log('==========================================');

  const kset = new KSET();

  try {
    // Provider 생성
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        certificate: './demo-cert.p12',
        password: 'demo-password',
        accountNumber: '12345678-01'
      },
      environment: 'development'
    });

    // 실시간 데이터 구독
    const subscription = await kset.subscribeToRealTimeData(
      'kiwoom',
      ['005930'],
      (data) => {
        console.log(`📈 [RECONNECTED] ${data.name}: ${data.currentPrice}원`);
      }
    );

    console.log('✅ Initial subscription created');

    // 10초 후 재연결 시뮬레이션
    setTimeout(async () => {
      console.log('\n🔄 Simulating connection loss and reconnection...');
      await kset.reconnectRealTimeData('kiwoom');
      console.log('✅ Reconnection completed');
    }, 10000);

    // 30초간 유지
    await new Promise(resolve => setTimeout(resolve, 30000));

    // 정리
    await subscription.unsubscribe();
    await kiwoom.disconnect();

  } catch (error) {
    console.error('❌ Reconnection demo failed:', error);
  }
}

// 메인 실행 함수
async function main(): Promise<void> {
  await runRealTimeDemo();
  await runReconnectionDemo();
}

// 데모 실행
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n👋 Real-time streaming demo completed!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}

export { runRealTimeDemo, runReconnectionDemo };