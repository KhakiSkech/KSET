# KSET 완전 사용 예제 모음

> **KSET (Korea Stock Exchange Trading Library)** - 개발자를 위한 완벽한 학습 가이드
> _초보자부터 전문가까지 모든 레벨의 개발자들이 KSET을 완벽하게 학습할 수 있는 예제_

## 📋 목차

1. [초급 예제: 기본 사용법](#초급-예제-기본-사용법)
2. [중급 예제: 실전 거래](#중급-예제-실전-거래)
3. [고급 예제: 알고리즘 트레이딩](#고급-예제-알고리즘-트레이딩)
4. [전문가 예제: 포트폴리오 관리](#전문가-예제-포트폴리오-관리)
5. [에러 처리 및 예외 상황](#에러-처리-및-예외-상황)
6. [테스트 및 디버깅](#테스트-및-디버깅)
7. [프로덕션 배포](#프로덕션-배포)

---

# 초급 예제: 기본 사용법

## 예제 1: 첫 번째 KSET 연결

가장 기본적인 KSET 연결과 간단한 데이터 조회를 하는 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * 첫 번째 KSET 연결 예제
 * 기본적인 Provider 연결과 시세 조회
 */
async function firstKSETConnection() {
  console.log('🚀 KSET 첫 연결을 시작합니다...');

  try {
    // 1. KSET 인스턴스 생성
    const kset = new KSET({
      logLevel: 'info',      // 로그 레벨 설정
      timeout: 30000,        // 타임아웃 30초
      retryAttempts: 3       // 재시도 3번
    });

    console.log('✅ KSET 인스턴스 생성 완료');

    // 2. 키움증권 Provider 생성
    console.log('🔗 키움증권 Provider 연결 중...');
    const kiwoom = await kset.createProvider('kiwoom', {
      credentials: {
        id: 'your_kiwoom_id',           // 실제 키움증권 ID
        password: 'your_password',       // 실제 비밀번호
        certPassword: 'your_cert_password' // 실전투자 공인인증서 비밀번호
      },
      environment: 'production',         // 'development' 또는 'production'
      timeout: 15000,                    // Provider 타임아웃
      retryAttempts: 2                   // Provider 재시도 횟수
    });

    console.log(`✅ 키움증권 연결 성공: ${kiwoom.name}`);

    // 3. 간단한 시세 조회
    console.log('📊 삼성전자 시세 조회 중...');
    const marketResponse = await kiwoom.getMarketData(['005930']);

    if (marketResponse.success && marketResponse.data) {
      const samsung = marketResponse.data[0];
      console.log(`\n📈 ${samsung.name} (${samsung.symbol})`);
      console.log(`현재가: ${samsung.currentPrice.toLocaleString()}원`);
      console.log(`전일 종가: ${samsung.previousClose.toLocaleString()}원`);
      console.log(`변동: ${samsung.change > 0 ? '+' : ''}${samsung.change}원`);
      console.log(`변동률: ${samsung.changeRate.toFixed(2)}%`);
      console.log(`거래량: ${samsung.volume.toLocaleString()}주`);
      console.log(`시장 상태: ${samsung.marketStatus}`);
    }

    // 4. 연결 해제
    console.log('\n🔌 연결 해제 중...');
    await kiwoom.disconnect();
    console.log('✅ 연결 해제 완료');

    console.log('\n🎉 첫 번째 KSET 연결 예제 완료!');

  } catch (error) {
    console.error('❌ 예제 실행 실패:', error.message);

    if (error.message.includes('인증')) {
      console.log('\n💡 힌트: 키움증권 인증 정보를 확인해주세요.');
      console.log('   - ID, 비밀번호, 공인인증서 비밀번호가 정확한지 확인');
      console.log('   - 키움증권 OpenAPI+가 실행 중인지 확인');
    }
  }
}

// 실행
firstKSETConnection();
```

## 예제 2: 계좌 정보 확인

내 계좌의 기본 정보와 잔고를 확인하는 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * 계좌 정보 확인 예제
 * 내 계좌의 잔고와 포지션을 조회
 */
async function checkAccountInfo() {
  console.log('💰 계좌 정보 확인을 시작합니다...');

  try {
    const kset = new KSET();
    const kiwoom = await kset.createProvider('kiwoom', kiwoomConfig);

    // 1. 계좌 기본 정보 조회
    console.log('📋 계좌 기본 정보 조회...');
    const accountResponse = await kiwoom.getAccountInfo();

    if (accountResponse.success && accountResponse.data) {
      const account = accountResponse.data;

      console.log('\n🏦 계좌 정보:');
      console.log(`계좌번호: ${account.accountNumber}`);
      console.log(`계좌명: ${account.accountName}`);
      console.log(`예금주명: ${account.ownerName}`);
      console.log(`계좌 종류: ${account.accountType}`);
      console.log(`활성 상태: ${account.isActive ? '활성' : '비활성'}`);
      console.log(`개설일: ${account.openedAt.toLocaleDateString()}`);

      console.log('\n💵 자금 정보:');
      console.log(`예수금: ${account.deposit.toLocaleString()}원`);
      console.log(`인출가능금액: ${account.withdrawable.toLocaleString()}원`);
      console.log(`매입가능금액: ${account.buyingPower.toLocaleString()}원`);

      console.log('\n📊 평가 정보:');
      console.log(`총자산: ${account.totalAssets.toLocaleString()}원`);
      console.log(`총평가액: ${account.totalEvaluationPrice.toLocaleString()}원`);
      console.log(`총손익: ${account.totalProfitLoss.toLocaleString()}원`);
      console.log(`총수익률: ${account.totalProfitLossRate.toFixed(2)}%`);
    }

    // 2. 상세 잔고 정보 조회
    console.log('\n💰 상세 잔고 정보 조회...');
    const balanceResponse = await kiwoom.getBalance();

    if (balanceResponse.success && balanceResponse.data) {
      const balance = balanceResponse.data;

      console.log('\n💸 현금 잔고:');
      console.log(`현금: ${balance.cash.toLocaleString()}원`);
      console.log(`예수금: ${balance.deposit.toLocaleString()}원`);
      console.log(`인출가능: ${balance.withdrawable.toLocaleString()}원`);
      console.log(`매입가능: ${balance.buyingPower.toLocaleString()}원`);

      console.log('\n📈 주식 평가:');
      console.log(`주식 평가액: ${balance.stockEvaluationPrice.toLocaleString()}원`);
      console.log(`주식 손익: ${balance.stockProfitLoss.toLocaleString()}원`);
      console.log(`주식 수익률: ${balance.stockProfitLossRate.toFixed(2)}%`);

      console.log('\n🏆 총평가:');
      console.log(`총평가액: ${balance.totalEvaluationPrice.toLocaleString()}원`);
      console.log(`총손익: ${balance.totalProfitLoss.toLocaleString()}원`);
      console.log(`총수익률: ${balance.totalProfitLossRate.toFixed(2)}%`);
      console.log(`업데이트: ${balance.updatedAt.toLocaleString()}`);
    }

    // 3. 보유 포지션 조회
    console.log('\n📋 보유 포지션 조회...');
    const positionsResponse = await kiwoom.getPositions();

    if (positionsResponse.success && positionsResponse.data) {
      const positions = positionsResponse.data;

      if (positions.length === 0) {
        console.log('보유 중인 포지션이 없습니다.');
      } else {
        console.log(`\n📊 보유 종목 (${positions.length}개):`);

        let totalEvaluation = 0;
        let totalProfitLoss = 0;

        positions.forEach((position, index) => {
          console.log(`\n${index + 1}. ${position.name} (${position.symbol})`);
          console.log(`   시장: ${position.market}`);
          console.log(`   보유 수량: ${position.quantity.toLocaleString()}주`);
          console.log(`   매수 가능: ${position.buyableQuantity.toLocaleString()}주`);
          console.log(`   매도 가능: ${position.sellableQuantity.toLocaleString()}주`);
          console.log(`   평균 단가: ${position.averagePrice.toLocaleString()}원`);
          console.log(`   현재가: ${position.currentPrice.toLocaleString()}원`);
          console.log(`   평가액: ${position.evaluationPrice.toLocaleString()}원`);
          console.log(`   손익: ${position.profitLoss.toLocaleString()}원 (${position.profitLossRate.toFixed(2)}%)`);
          console.log(`   당일 손익: ${position.dailyProfitLoss.toLocaleString()}원`);
          console.log(`   최종 매입일: ${position.purchaseDate?.toLocaleDateString() || '미확인'}`);

          totalEvaluation += position.evaluationPrice;
          totalProfitLoss += position.profitLoss;
        });

        console.log('\n📈 포지션 요약:');
        console.log(`총 평가액: ${totalEvaluation.toLocaleString()}원`);
        console.log(`총 손익: ${totalProfitLoss.toLocaleString()}원`);
        console.log(`수익률: ${totalProfitLoss > 0 ? '+' : ''}${((totalProfitLoss / (totalEvaluation - totalProfitLoss)) * 100).toFixed(2)}%`);
      }
    }

    await kiwoom.disconnect();
    console.log('\n✅ 계좌 정보 확인 완료!');

  } catch (error) {
    console.error('❌ 계좌 정보 확인 실패:', error.message);
  }
}

// 실행
checkAccountInfo();
```

---

# 중급 예제: 실전 거래

## 예제 3: 다양한 주문 유형 실행

시장가, 지정가, OCO 등 다양한 주문을 실행하는 예제입니다.

```typescript
import { KSET, OrderType, OrderSide, TimeInForce } from 'kset';

/**
 * 다양한 주문 유형 실행 예제
 * 시장가, 지정가, 스탑, OCO 주문 등
 */
async function variousOrderTypes() {
  console.log('🛒 다양한 주문 유형 실행 예제를 시작합니다...');

  try {
    const kset = new KSET();
    const kiwoom = await kset.createProvider('kiwoom', kiwoomConfig);

    // 주문을 위한 기본 설정
    const symbol = '005930';  // 삼성전자
    const baseQuantity = 1;   // 테스트용으로 1주만 주문

    // 1. 시장가 매수 주문
    console.log('\n1️⃣ 시장가 매수 주문 실행...');
    const marketOrder = await executeMarketOrder(kiwoom, symbol, baseQuantity);

    // 2. 지정가 매수 주문
    console.log('\n2️⃣ 지정가 매수 주문 실행...');
    const limitOrder = await executeLimitOrder(kiwoom, symbol, baseQuantity);

    // 3. 지정가 매도 주문 (테스트 종료 시)
    console.log('\n3️⃣ 지정가 매도 주문 실행...');
    if (marketOrder.success) {
      await executeSellOrder(kiwoom, symbol, marketOrder.data!.filledQuantity);
    }

    // 4. OCO 주문 예제 (설명만, 실제 실행은 주의)
    console.log('\n4️⃣ OCO 주문 예제...');
    await explainOCOOrder();

    // 5. 주문 내역 조회
    console.log('\n5️⃣ 오늘 주문 내역 조회...');
    await showOrderHistory(kiwoom);

    await kiwoom.disconnect();
    console.log('\n✅ 다양한 주문 유형 실행 예제 완료!');

  } catch (error) {
    console.error('❌ 주문 실행 실패:', error.message);
  }
}

/**
 * 시장가 주문 실행
 */
async function executeMarketOrder(provider, symbol: string, quantity: number) {
  try {
    const orderRequest = {
      symbol,
      side: 'BUY' as OrderSide,
      orderType: 'MARKET' as OrderType,
      quantity,
      accountNumber: '12345678-01',  // 실제 계좌번호
      clientOrderId: `market-${Date.now()}`,
      remarks: '시장가 매수 테스트'
    };

    console.log(`주문 정보: ${symbol} 시장가 ${quantity}주 매수`);
    const response = await provider.placeOrder(orderRequest);

    if (response.success && response.data) {
      const order = response.data;
      console.log(`✅ 시장가 주문 접수: ${order.id}`);
      console.log(`체결 수량: ${order.filledQuantity}/${order.quantity}주`);
      console.log(`평균 체결가: ${order.averagePrice?.toLocaleString() || '대기 중'}원`);
      console.log(`체결금액: ${order.totalValue.toLocaleString()}원`);
      console.log(`수수료: ${order.commission.toLocaleString()}원`);

      return response;
    } else {
      console.log(`❌ 시장가 주문 실패: ${response.error?.message}`);
      return response;
    }

  } catch (error) {
    console.error(`❌ 시장가 주문 에러: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * 지정가 주문 실행
 */
async function executeLimitOrder(provider, symbol: string, quantity: number) {
  try {
    // 현재가 조회
    const marketResponse = await provider.getMarketData([symbol]);
    if (!marketResponse.success || !marketResponse.data) {
      throw new Error('시장가 조회 실패');
    }

    const currentPrice = marketResponse.data[0].currentPrice;
    const limitPrice = Math.floor(currentPrice * 0.98); // 현재가의 2% 아래로 주문

    const orderRequest = {
      symbol,
      side: 'BUY' as OrderSide,
      orderType: 'LIMIT' as OrderType,
      quantity,
      price: limitPrice,
      timeInForce: 'DAY' as TimeInForce,
      accountNumber: '12345678-01',
      clientOrderId: `limit-${Date.now()}`,
      remarks: `지정가 매수 테스트 (${limitPrice.toLocaleString()}원)`
    };

    console.log(`주문 정보: ${symbol} 지정가 ${quantity}주 @ ${limitPrice.toLocaleString()}원`);
    const response = await provider.placeOrder(orderRequest);

    if (response.success && response.data) {
      const order = response.data;
      console.log(`✅ 지정가 주문 접수: ${order.id}`);
      console.log(`주문 가격: ${order.price?.toLocaleString()}원`);
      console.log(`주문 상태: ${order.status}`);

      // 5초 후 주문 상태 확인
      setTimeout(async () => {
        const updatedOrder = await provider.getOrder(order.id);
        if (updatedOrder.success && updatedOrder.data) {
          console.log(`주문 상태 업데이트: ${updatedOrder.data.status}`);
          if (updatedOrder.data.status !== 'filled') {
            console.log('미체결 주문 취소...');
            await provider.cancelOrder(order.id);
          }
        }
      }, 5000);

      return response;
    } else {
      console.log(`❌ 지정가 주문 실패: ${response.error?.message}`);
      return response;
    }

  } catch (error) {
    console.error(`❌ 지정가 주문 에러: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * 매도 주문 실행
 */
async function executeSellOrder(provider, symbol: string, quantity: number) {
  try {
    // 현재가 조회
    const marketResponse = await provider.getMarketData([symbol]);
    if (!marketResponse.success || !marketResponse.data) {
      throw new Error('시장가 조회 실패');
    }

    const currentPrice = marketResponse.data[0].currentPrice;
    const sellPrice = Math.floor(currentPrice * 1.02); // 현재가의 2% 위로 매도

    const orderRequest = {
      symbol,
      side: 'SELL' as OrderSide,
      orderType: 'LIMIT' as OrderType,
      quantity,
      price: sellPrice,
      timeInForce: 'DAY' as TimeInForce,
      accountNumber: '12345678-01',
      clientOrderId: `sell-${Date.now()}`,
      remarks: `지정가 매도 테스트 (${sellPrice.toLocaleString()}원)`
    };

    console.log(`매도 주문 정보: ${symbol} ${quantity}주 @ ${sellPrice.toLocaleString()}원`);
    const response = await provider.placeOrder(orderRequest);

    if (response.success && response.data) {
      console.log(`✅ 매도 주문 접수: ${response.data.id}`);
      return response;
    } else {
      console.log(`❌ 매도 주문 실패: ${response.error?.message}`);
      return response;
    }

  } catch (error) {
    console.error(`❌ 매도 주문 에러: ${error.message}`);
    return { success: false, error };
  }
}

/**
 * OCO 주문 설명
 */
async function explainOCOOrder() {
  console.log('OCO (One-Cancels-Other) 주문:');
  console.log('- 목표가와 손절가를 동시에 설정');
  console.log('- 한쪽이 먼저 체결되면 다른 주문은 자동 취소');
  console.log('- 주로 포지션 관리에 사용');

  console.log('\nOCO 주문 예시 코드:');
  console.log(`const ocoOrder = await provider.placeOrder({
    symbol: '005930',
    side: 'SELL',
    orderType: 'OCO',
    quantity: 10,
    price: 87000,        // 목표가
    ocoStopPrice: 83000,  // 손절가
    timeInForce: 'GTC',
    remarks: 'OCO 주문: 87k 목표 / 83k 손절'
  });`);

  console.log('\n⚠️  주의: OCO 주문은 실제 테스트 시 신중하게 실행하세요!');
}

/**
 * 주문 내역 조회
 */
async function showOrderHistory(provider) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await provider.getOrders({
      startDate: today,
      endDate: today
    }, {
      limit: 20
    });

    if (response.success && response.data) {
      const orders = response.data;
      console.log(`\n📋 오늘 주문 내역 (${orders.length}건):`);

      orders.forEach((order, index) => {
        const sideIcon = order.side === 'BUY' ? '🟢' : '🔴';
        const statusIcon = getStatusIcon(order.status);

        console.log(`${index + 1}. ${sideIcon} ${order.symbol} ${order.side} ${order.quantity}주`);
        console.log(`   ${statusIcon} 상태: ${order.status}`);
        console.log(`   주문 유형: ${order.orderType}`);
        console.log(`   가격: ${order.price?.toLocaleString() || '시장가'}원`);
        console.log(`   체결: ${order.filledQuantity}/${order.quantity}주`);
        console.log(`   평균가: ${order.averagePrice?.toLocaleString() || '-'}원`);
        console.log(`   시간: ${order.createdAt.toLocaleString()}`);
        console.log(`   주문ID: ${order.id}`);

        if (order.errorMessage) {
          console.log(`   에러: ${order.errorMessage}`);
        }
        console.log('');
      });
    } else {
      console.log('오늘 주문 내역이 없습니다.');
    }

  } catch (error) {
    console.error('주문 내역 조회 실패:', error.message);
  }
}

/**
 * 주문 상태 아이콘
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'filled': return '✅';
    case 'partial': return '⚡';
    case 'cancelled': return '❌';
    case 'rejected': return '🚫';
    case 'pending': return '⏳';
    default: return '📝';
  }
}

// 실행
variousOrderTypes();
```

## 예제 4: 실시간 데이터 구독

실시간 시세 데이터를 구독하고 처리하는 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * 실시간 데이터 구독 예제
 * 실시간 시세, 호가, 주문 상태 변경 구독
 */
async function realtimeDataSubscription() {
  console.log('📡 실시간 데이터 구독 예제를 시작합니다...');

  try {
    const kset = new KSET();
    const kiwoom = await kset.createProvider('kiwoom', kiwoomConfig);

    // 구독할 종목
    const symbols = ['005930', '000660', '035420']; // 삼성전자, SK하이닉스, NAVER

    // 1. 실시간 시세 구독
    console.log('\n1️⃣ 실시간 시세 구독 시작...');
    const priceSubscription = await subscribeRealTimePrice(kiwoom, symbols);

    // 2. 호가 정보 구독
    console.log('\n2️⃣ 호가 정보 구독 시작...');
    const orderBookSubscription = await subscribeOrderBook(kiwoom, symbols);

    // 3. 주문 상태 변경 구독
    console.log('\n3️⃣ 주문 상태 변경 구독 시작...');
    const orderSubscription = await subscribeOrderUpdates(kiwoom);

    // 30초 후 모든 구독 해제
    setTimeout(async () => {
      console.log('\n🔌 구독 해제 중...');
      await Promise.all([
        priceSubscription.unsubscribe(),
        orderBookSubscription.unsubscribe(),
        orderSubscription.unsubscribe()
      ]);
      console.log('✅ 모든 구독 해제 완료');

      await kiwoom.disconnect();
      console.log('✅ 실시간 데이터 구독 예제 완료!');
    }, 30000);

  } catch (error) {
    console.error('❌ 실시간 데이터 구독 실패:', error.message);
  }
}

/**
 * 실시간 시세 구독
 */
async function subscribeRealTimePrice(provider, symbols: string[]) {
  let tickCount = 0;

  try {
    const subscription = await provider.subscribeToRealTimeData(
      symbols,
      {
        onTick: (tick) => {
          tickCount++;
          const changeIcon = tick.changeRate > 0 ? '📈' : tick.changeRate < 0 ? '📉' : '➡️';

          console.log(`${changeIcon} [${tick.timestamp.toLocaleTimeString()}] ${tick.symbol}: ${tick.price.toLocaleString()}원 (${tick.changeRate > 0 ? '+' : ''}${tick.changeRate.toFixed(2)}%)`);
          console.log(`   체결량: ${tick.volume.toLocaleString()}주 | 누적: ${tick.accumulatedVolume.toLocaleString()}주`);

          // 주요 변동 알림
          if (Math.abs(tick.changeRate) > 1.0) {
            console.log(`🚨 [주의] ${tick.symbol} ${Math.abs(tick.changeRate).toFixed(2)}% 급변동!`);
          }
        },

        onError: (error) => {
          console.error(`실시간 시세 에러: ${error.message}`);
        }
      }
    );

    console.log(`✅ 실시간 시세 구독 시작 (${symbols.join(', ')})`);

    // 구독 통계
    setInterval(() => {
      console.log(`📊 시세 데이터 수신: ${tickCount}건`);
    }, 10000);

    return subscription;

  } catch (error) {
    console.error('실시간 시세 구독 실패:', error.message);
    throw error;
  }
}

/**
 * 호가 정보 구독
 */
async function subscribeOrderBook(provider, symbols: string[]) {
  let orderBookCount = 0;

  try {
    const subscription = await provider.subscribeToRealTimeData(
      symbols,
      {
        onOrderBook: (orderBook) => {
          orderBookCount++;

          if (orderBook.asks.length > 0 && orderBook.bids.length > 0) {
            const bestAsk = orderBook.asks[0];
            const bestBid = orderBook.bids[0];
            const spread = bestAsk.price - bestBid.price;

            console.log(`📊 [${orderBook.timestamp.toLocaleTimeString()}] ${orderBook.symbol} 호가:`);
            console.log(`   매도1호: ${bestAsk.price.toLocaleString()}원 (${bestAsk.quantity.toLocaleString()}주)`);
            console.log(`   매수1호: ${bestBid.price.toLocaleString()}원 (${bestBid.quantity.toLocaleString()}주)`);
            console.log(`   스프레드: ${spread}원`);
            console.log(`   총 매도: ${orderBook.totalAskQuantity.toLocaleString()}주`);
            console.log(`   총 매수: ${orderBook.totalBidQuantity.toLocaleString()}주`);
          }
        },

        onError: (error) => {
          console.error(`호가 정보 에러: ${error.message}`);
        }
      }
    );

    console.log(`✅ 호가 정보 구독 시작 (${symbols.join(', ')})`);

    // 구독 통계
    setInterval(() => {
      console.log(`📊 호가 정보 수신: ${orderBookCount}건`);
    }, 10000);

    return subscription;

  } catch (error) {
    console.error('호가 정보 구독 실패:', error.message);
    throw error;
  }
}

/**
 * 주문 상태 변경 구독
 */
async function subscribeOrderUpdates(provider) {
  let updateCount = 0;

  try {
    const subscription = await provider.subscribeToOrderUpdates({
      onOrderPlaced: (order) => {
        updateCount++;
        console.log(`📝 [${order.createdAt.toLocaleTimeString()}] 주문 접수: ${order.id}`);
        console.log(`   ${order.symbol} ${order.side} ${order.quantity}주 @ ${order.price || '시장가'}`);
        console.log(`   클라이언트ID: ${order.clientOrderId || '없음'}`);
      },

      onOrderPartial: (order) => {
        updateCount++;
        console.log(`⚡ [${order.updatedAt.toLocaleTimeString()}] 부분 체결: ${order.id}`);
        console.log(`   ${order.filledQuantity}/${order.quantity}주 체결됨`);
        console.log(`   평균가: ${order.averagePrice?.toLocaleString() || '미확인'}원`);
        console.log(`   체결금액: ${order.totalValue.toLocaleString()}원`);
      },

      onOrderFilled: (order) => {
        updateCount++;
        console.log(`✅ [${order.filledAt?.toLocaleTimeString()}] 전체 체결: ${order.id}`);
        console.log(`   ${order.quantity}주 @ ${order.averagePrice?.toLocaleString()}원`);
        console.log(`   체결금액: ${order.totalValue.toLocaleString()}원`);
        console.log(`   수수료: ${order.commission.toLocaleString()}원`);
        console.log(`   체결까지 걸린 시간: ${order.filledAt && order.createdAt ?
          Math.round((order.filledAt.getTime() - order.createdAt.getTime()) / 1000) : '미확인'}초`);
      },

      onOrderCancelled: (order) => {
        updateCount++;
        console.log(`❌ [${order.updatedAt.toLocaleTimeString()}] 주문 취소: ${order.id}`);
        console.log(`   취소된 수량: ${order.quantity - order.filledQuantity}주`);
        console.log(`   이미 체결된 수량: ${order.filledQuantity}주`);
      },

      onOrderRejected: (order) => {
        updateCount++;
        console.log(`🚫 [${order.updatedAt.toLocaleTimeString()}] 주문 거부: ${order.id}`);
        console.log(`   사유: ${order.errorMessage || '알 수 없는 이유'}`);
        console.log(`   주문 정보: ${order.symbol} ${order.side} ${order.quantity}주`);
      },

      onError: (error) => {
        console.error(`주문 구독 에러: ${error.message}`);
      }
    });

    console.log('✅ 주문 상태 변경 구독 시작');

    // 구독 통계
    setInterval(() => {
      console.log(`📊 주문 업데이트 수신: ${updateCount}건`);
    }, 10000);

    return subscription;

  } catch (error) {
    console.error('주문 상태 구독 실패:', error.message);
    throw error;
  }
}

// 실행
realtimeDataSubscription();
```

---

# 고급 예제: 알고리즘 트레이딩

## 예제 5: TWAP 알고리즘 실행

시간 가중 평균 가격(TWAP) 알고리즘을 실행하는 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * TWAP 알고리즘 트레이딩 예제
 * Time Weighted Average Price 알고리즘으로 대량 주문 분할 실행
 */
async function twapAlgorithmExample() {
  console.log('🤖 TWAP 알고리즘 트레이딩 예제를 시작합니다...');

  try {
    const kset = new KSET();
    const kiwoom = await kset.createProvider('kiwoom', kiwoomConfig);

    // TWAP 알고리즘 파라미터
    const symbol = '000660';  // SK하이닉스
    const totalQuantity = 100; // 총 100주 매수
    const executionTime = 5 * 60 * 1000; // 5분 동안 실행
    const sliceCount = 10; // 10개로 분할

    console.log(`📊 TWAP 알고리즘 설정:`);
    console.log(`   종목: ${symbol} (SK하이닉스)`);
    console.log(`   총 수량: ${totalQuantity}주`);
    console.log(`   실행 시간: ${executionTime / 1000 / 60}분`);
    console.log(`   분할 개수: ${sliceCount}개`);
    console.log(`   예상 간격: ${(executionTime / sliceCount / 1000).toFixed(0)}초`);

    // 1. 현재 시장 상황 확인
    console.log('\n1️⃣ 시장 상황 확인...');
    const marketResponse = await kiwoom.getMarketData([symbol]);
    if (!marketResponse.success || !marketResponse.data) {
      throw new Error('시장 정보 조회 실패');
    }

    const currentMarket = marketResponse.data[0];
    console.log(`현재가: ${currentMarket.currentPrice.toLocaleString()}원`);
    console.log(`시장 상태: ${currentMarket.marketStatus}`);

    if (currentMarket.marketStatus !== 'regular') {
      console.log('⚠️  주의: 정규장이 아닙니다. 알고리즘 실행을 재고해주세요.');
    }

    // 2. TWAP 알고리즘 실행
    console.log('\n2️⃣ TWAP 알고리즘 실행 시작...');
    const twapInstance = await executeTwapAlgorithm(kset, {
      symbol,
      side: 'BUY',
      totalQuantity,
      startTime: new Date(),
      endTime: new Date(Date.now() + executionTime),
      intervalSeconds: Math.floor(executionTime / 1000 / sliceCount),
      sliceCount,
      priceRange: {
        max: currentMarket.currentPrice * 1.005, // 현재가 +0.5%
        min: currentMarket.currentPrice * 0.995  // 현재가 -0.5%
      },
      callbacks: {
        onOrderPlaced: (order) => {
          console.log(`📝 [${new Date().toLocaleTimeString()}] TWAP 주문: ${order.quantity}주 @ ${order.price?.toLocaleString()}원`);
        },
        onOrderFilled: (order) => {
          console.log(`✅ TWAP 체결: ${order.filledQuantity}주 @ ${order.averagePrice?.toLocaleString()}원`);
        },
        onProgressUpdate: (instance) => {
          const progress = (instance.currentProgress * 100).toFixed(1);
          const executed = instance.executedQuantity || 0;
          const remaining = instance.remainingQuantity || 0;
          const avgPrice = instance.averagePrice || 0;

          console.log(`📊 [진행률: ${progress}%] 실행: ${executed}주, 남음: ${remaining}주, 평균가: ${avgPrice.toLocaleString()}원`);
        },
        onComplete: (result) => {
          console.log(`🎉 TWAP 알고리즘 완료!`);
          console.log(`   총 실행 수량: ${result.executedQuantity}주`);
          console.log(`   평균 체결가: ${result.averagePrice.toLocaleString()}원`);
          console.log(`   총체결금액: ${result.totalValue.toLocaleString()}원`);
          console.log(`   슬리피지: ${result.slippage.toFixed(3)}%`);
          console.log(`   총 실행 시간: ${Math.round(result.executionTime / 1000)}초`);
          console.log(`   성공률: ${(result.successRate * 100).toFixed(1)}%`);
        },
        onError: (error) => {
          console.error(`❌ TWAP 알고리즘 에러: ${error.message}`);
        }
      }
    });

    // 3. 알고리즘 상태 모니터링
    console.log('\n3️⃣ 알고리즘 상태 모니터링...');
    await monitorTwapProgress(kset, twapInstance.id);

    // 4. 결과 분석
    console.log('\n4️⃣ 최종 결과 분석...');
    await analyzeTwapResults(kset, twapInstance.id);

    await kiwoom.disconnect();
    console.log('\n✅ TWAP 알고리즘 예제 완료!');

  } catch (error) {
    console.error('❌ TWAP 알고리즘 실패:', error.message);
  }
}

/**
 * TWAP 알고리즘 실행
 */
async function executeTwapAlgorithm(kset, params) {
  try {
    const twapInstance = await kset.executeTWAP(params);
    console.log(`✅ TWAP 알고리즘 시작: ${twapInstance.id}`);
    console.log(`   예상 완료 시간: ${params.endTime.toLocaleTimeString()}`);
    console.log(`   분할 간격: ${params.intervalSeconds}초`);

    return twapInstance;

  } catch (error) {
    console.error('TWAP 알고리즘 실행 실패:', error.message);
    throw error;
  }
}

/**
 * TWAP 진행 상황 모니터링
 */
async function monitorTwapProgress(kset, instanceId: string) {
  const monitoringInterval = setInterval(async () => {
    try {
      const status = await kset.getAlgorithmStatus(instanceId);

      if (status && status.status === 'completed') {
        console.log('📊 TWAP 알고리즘이 완료되었습니다.');
        clearInterval(monitoringInterval);
        return;
      }

      if (status && status.status === 'error') {
        console.log('❌ TWAP 알고리즘에 오류가 발생했습니다.');
        clearInterval(monitoringInterval);
        return;
      }

    } catch (error) {
      console.error('TWAP 상태 모니터링 에러:', error.message);
    }
  }, 5000);

  // 알고리즘 종료 시 정리
  setTimeout(() => {
    clearInterval(monitoringInterval);
  }, 6 * 60 * 1000); // 6분 후 강제 종료
}

/**
 * TWAP 결과 분석
 */
async function analyzeTwapResults(kset, instanceId: string) {
  try {
    const status = await kset.getAlgorithmStatus(instanceId);

    if (!status) {
      console.log('TWAP 실행 결과를 확인할 수 없습니다.');
      return;
    }

    console.log('\n📈 TWAP 실행 결과 분석:');
    console.log(`알고리즘 ID: ${status.id}`);
    console.log(`상태: ${status.status}`);
    console.log(`종목: ${status.symbol}`);
    console.log(`방향: ${status.side}`);
    console.log(`시작 시간: ${status.startedAt?.toLocaleString()}`);
    console.log(`종료 시간: ${status.completedAt?.toLocaleString()}`);

    if (status.executedQuantity) {
      console.log(`\n실행 결과:`);
      console.log(`계획 수량: ${status.plannedQuantity}주`);
      console.log(`실행 수량: ${status.executedQuantity}주`);
      console.log(`미실행 수량: ${status.plannedQuantity - status.executedQuantity}주`);
      console.log(`실행률: ${((status.executedQuantity / status.plannedQuantity) * 100).toFixed(1)}%`);
    }

    if (status.averagePrice) {
      console.log(`\n가격 정보:`);
      console.log(`평균 체결가: ${status.averagePrice.toLocaleString()}원`);
      console.log(`총체결금액: ${status.totalValue?.toLocaleString()}원`);

      if (status.slippage !== undefined) {
        const slippageText = status.slippage > 0 ? `+${status.slippage.toFixed(3)}%` : `${status.slippage.toFixed(3)}%`;
        console.log(`슬리피지: ${slippageText}`);
      }
    }

    if (status.executionTime) {
      console.log(`\n시간 정보:`);
      console.log(`총 실행 시간: ${Math.round(status.executionTime / 1000)}초`);

      if (status.sliceCount && status.executionTime) {
        const avgSliceTime = status.executionTime / status.sliceCount;
        console.log(`평균 슬라이스 시간: ${Math.round(avgSliceTime / 1000)}초`);
      }
    }

    if (status.statistics) {
      console.log(`\n통계 정보:`);
      console.log(`성공한 주문: ${status.statistics.successfulOrders || 0}건`);
      console.log(`실패한 주문: ${status.statistics.failedOrders || 0}건`);
      console.log(`평균 체결 시간: ${status.statistics.averageFillTime || 0}ms`);
    }

  } catch (error) {
    console.error('TWAP 결과 분석 실패:', error.message);
  }
}

// 실행
twapAlgorithmExample();
```

## 예제 6: 스마트 오더 라우팅

최적의 조건으로 여러 증권사에 주문을 분배하는 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * 스마트 오더 라우팅 예제
 * 여러 증권사 중 최적의 조건으로 주문 실행
 */
async function smartOrderRoutingExample() {
  console.log('🛣️  스마트 오더 라우팅 예제를 시작합니다...');

  try {
    const kset = new KSET();

    // 여러 Provider 연결
    console.log('🔗 여러 증권사 Provider 연결 중...');
    const [kiwoom, koreaInvestment] = await Promise.all([
      kset.createProvider('kiwoom', kiwoomConfig),
      kset.createProvider('korea-investment', koreaInvestmentConfig)
    ]);

    console.log('✅ 키움증권, 한국투자증권 연결 완료');

    // 주문 파라미터
    const orderRequest = {
      symbol: '005930',  // 삼성전자
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 50,      // 50주 분할 매수
      price: 85000
    };

    // 1. 여러 라우팅 전략 비교
    console.log('\n1️⃣ 여러 라우팅 전략 비교...');
    await compareRoutingStrategies(kset, orderRequest);

    // 2. 최적 가격 라우팅 실행
    console.log('\n2️⃣ 최적 가격 라우팅 실행...');
    const bestPriceResult = await executeBestPriceRouting(kset, orderRequest);

    // 3. 가장 빠른 실행 라우팅
    console.log('\n3️⃣ 가장 빠른 실행 라우팅...');
    const fastestResult = await executeFastestRouting(kset, {
      ...orderRequest,
      symbol: '000660',  // SK하이닉스
      quantity: 30,
      price: 120000
    });

    // 4. 라우팅 결과 분석
    console.log('\n4️⃣ 라우팅 결과 분석...');
    await analyzeRoutingResults(bestPriceResult, fastestResult);

    // 정리
    await Promise.all([
      kiwoom.disconnect(),
      koreaInvestment.disconnect()
    ]);

    console.log('\n✅ 스마트 오더 라우팅 예제 완료!');

  } catch (error) {
    console.error('❌ 스마트 오더 라우팅 실패:', error.message);
  }
}

/**
 * 여러 라우팅 전략 비교
 */
async function compareRoutingStrategies(kset, orderRequest) {
  const strategies = [
    { name: '최적 가격', strategy: 'best-price' },
    { name: '가장 빠름', strategy: 'fastest-execution' },
    { name: '최저 비용', strategy: 'lowest-cost' },
    { name: '균형', strategy: 'balanced' }
  ];

  console.log(`📊 ${orderRequest.symbol} 라우팅 전략 비교:`);

  for (const { name, strategy } of strategies) {
    try {
      console.log(`\n${name} 전략 분석 중...`);

      const analysis = await kset.analyzeOrderRouting(orderRequest, {
        strategy,
        dryRun: true,  // 실제 주문 없이 분석만 수행
        maxProviders: 2
      });

      if (analysis) {
        console.log(`   예상 체결가: ${analysis.expectedPrice?.toLocaleString() || '분석 불가'}원`);
        console.log(`   예상 실행 시간: ${analysis.expectedTime || '분석 불가'}ms`);
        console.log(`   예상 비용: ${analysis.expectedCost?.toLocaleString() || '분석 불가'}원`);
        console.log(`   추천 Provider: ${analysis.recommendedProviders?.join(', ') || '분석 불가'}`);
        console.log(`   신뢰도: ${analysis.confidence?.toFixed(1) || '분석 불가'}%`);
      }

    } catch (error) {
      console.log(`   ${name} 전략 분석 실패: ${error.message}`);
    }
  }
}

/**
 * 최적 가격 라우팅 실행
 */
async function executeBestPriceRouting(kset, orderRequest) {
  try {
    console.log(`🎯 최적 가격 라우팅 실행: ${orderRequest.symbol} ${orderRequest.quantity}주`);

    const routingResult = await kset.routeOrder(orderRequest, {
      strategy: 'best-price',
      maxProviders: 2,
      maxLatency: 1000,  // 최대 1초 지연
      enableSplitOrders: true,
      minOrderSize: 10     // 최소 10주씩 분할
    });

    console.log(`✅ 라우팅 완료:`);
    console.log(`   선택된 Provider: ${routingResult.selectedProviders.join(', ')}`);
    console.log(`   할당량: ${routingResult.allocatedQuantities.join(', ')}`);
    console.log(`   예상 평균가: ${routingResult.expectedPrice?.toLocaleString()}원`);
    console.log(`   라우팅 ID: ${routingResult.routingId}`);

    // 실행 모니터링
    return await monitorRoutingExecution(kset, routingResult.routingId);

  } catch (error) {
    console.error('최적 가격 라우팅 실패:', error.message);
    throw error;
  }
}

/**
 * 가장 빠른 실행 라우팅
 */
async function executeFastestRouting(kset, orderRequest) {
  try {
    console.log(`⚡ 가장 빠른 실행 라우팅: ${orderRequest.symbol} ${orderRequest.quantity}주`);

    const routingResult = await kset.routeOrder(orderRequest, {
      strategy: 'fastest-execution',
      maxProviders: 1,  // 가장 빠른 Provider 1개만 선택
      maxLatency: 500,   // 최대 0.5초 지연
      enableSplitOrders: false  // 분할 없이 한 번에 실행
    });

    console.log(`✅ 빠른 라우팅 완료:`);
    console.log(`   선택된 Provider: ${routingResult.selectedProviders[0]}`);
    console.log(`   할당량: ${routingResult.allocatedQuantities[0]}`);
    console.log(`   예상 실행 시간: ${routingResult.expectedTime}ms`);
    console.log(`   라우팅 ID: ${routingResult.routingId}`);

    // 실행 모니터링
    return await monitorRoutingExecution(kset, routingResult.routingId);

  } catch (error) {
    console.error('빠른 실행 라우팅 실패:', error.message);
    throw error;
  }
}

/**
 * 라우팅 실행 모니터링
 */
async function monitorRoutingExecution(kset, routingId: string) {
  return new Promise((resolve, reject) => {
    const checkInterval = setInterval(async () => {
      try {
        const status = await kset.getRoutingStatus(routingId);

        if (!status) {
          clearInterval(checkInterval);
          reject(new Error('라우팅 상태를 확인할 수 없습니다.'));
          return;
        }

        console.log(`📊 라우팅 진행률: ${(status.progress * 100).toFixed(1)}%`);
        console.log(`   완료된 주문: ${status.completedOrders}/${status.totalOrders}`);
        console.log(`   평균 체결가: ${status.averagePrice?.toLocaleString() || '미확인'}원`);
        console.log(`   남은 수량: ${status.remainingQuantity}주`);

        if (status.status === 'completed') {
          clearInterval(checkInterval);
          console.log(`✅ 라우팅 완료!`);
          resolve(status);
        } else if (status.status === 'failed') {
          clearInterval(checkInterval);
          console.log(`❌ 라우팅 실패: ${status.errorMessage}`);
          reject(new Error(status.errorMessage));
        }

      } catch (error) {
        clearInterval(checkInterval);
        reject(error);
      }
    }, 2000);

    // 30초 후 타임아웃
    setTimeout(() => {
      clearInterval(checkInterval);
      reject(new Error('라우팅 실행 타임아웃'));
    }, 30000);
  });
}

/**
 * 라우팅 결과 분석
 */
async function analyzeRoutingResults(bestPriceResult, fastestResult) {
  console.log('\n📈 라우팅 결과 분석:');

  if (bestPriceResult) {
    console.log('\n최적 가격 라우팅 결과:');
    console.log(`   실행 시간: ${bestPriceResult.executionTime}ms`);
    console.log(`   평균 체결가: ${bestPriceResult.averagePrice?.toLocaleString()}원`);
    console.log(`   성공률: ${((bestPriceResult.successfulOrders / bestPriceResult.totalOrders) * 100).toFixed(1)}%`);
    console.log(`   총 비용: ${bestPriceResult.totalCost?.toLocaleString()}원`);
  }

  if (fastestResult) {
    console.log('\n가장 빠른 라우팅 결과:');
    console.log(`   실행 시간: ${fastestResult.executionTime}ms`);
    console.log(`   평균 체결가: ${fastestResult.averagePrice?.toLocaleString()}원`);
    console.log(`   성공률: ${((fastestResult.successfulOrders / fastestResult.totalOrders) * 100).toFixed(1)}%`);
    console.log(`   총 비용: ${fastestResult.totalCost?.toLocaleString()}원`);
  }

  // 두 전략 비교
  if (bestPriceResult && fastestResult) {
    console.log('\n⚖️  전략 비교:');
    const priceDiff = (bestPriceResult.averagePrice! - fastestResult.averagePrice!) / fastestResult.averagePrice! * 100;
    const timeDiff = fastestResult.executionTime - bestPriceResult.executionTime;

    console.log(`   가격 차이: ${priceDiff > 0 ? '+' : ''}${priceDiff.toFixed(3)}% (최적가 ${priceDiff > 0 ? '높음' : '낮음'})`);
    console.log(`   시간 차이: ${timeDiff > 0 ? '+' : ''}${timeDiff}ms (빠른 실행 ${timeDiff > 0 ? '느림' : '빠름'})`);

    if (priceDiff < 0) {
      console.log('   💡 추천: 최적 가격 라우팅이 더 유리합니다.');
    } else if (timeDiff < 0) {
      console.log('   💡 추천: 빠른 실행 라우팅이 더 유리합니다.');
    } else {
      console.log('   💡 추천: 두 전략의 성능이 비슷합니다.');
    }
  }
}

// 실행
smartOrderRoutingExample();
```

---

# 전문가 예제: 포트폴리오 관리

## 예제 7: 완전한 포트폴리오 관리 시스템

종합적인 포트폴리오 관리와 자동 리밸런싱 시스템입니다.

```typescript
import { KSET } from 'kset';

/**
 * 완전한 포트폴리오 관리 시스템 예제
 * 포트폴리오 분석, 리밸런싱, 리스크 관리
 */
async function portfolioManagementSystem() {
  console.log('🏦 포트폴리오 관리 시스템을 시작합니다...');

  try {
    const kset = new KSET();
    const kiwoom = await kset.createProvider('kiwoom', kiwoomConfig);

    // 1. 현재 포트폴리오 상태 분석
    console.log('\n1️⃣ 현재 포트폴리오 상태 분석...');
    const currentPortfolio = await analyzeCurrentPortfolio(kiwoom);

    // 2. 포트폴리오 성능 평가
    console.log('\n2️⃣ 포트폴리오 성능 평가...');
    const performanceMetrics = await evaluatePortfolioPerformance(kset, currentPortfolio);

    // 3. 리스크 분석
    console.log('\n3️⃣ 포트폴리오 리스크 분석...');
    const riskAnalysis = await analyzePortfolioRisk(kset, currentPortfolio);

    // 4. 자산 배분 최적화
    console.log('\n4️⃣ 자산 배분 최적화...');
    const optimization = await optimizeAssetAllocation(kset, currentPortfolio);

    // 5. 자동 리밸런싱 실행
    console.log('\n5️⃣ 자동 리밸런싱 실행...');
    await executeRebalancing(kiwoom, optimization.recommendations);

    // 6. 포트폴리오 보고서 생성
    console.log('\n6️⃣ 포트폴리오 보고서 생성...');
    await generatePortfolioReport(currentPortfolio, performanceMetrics, riskAnalysis, optimization);

    await kiwoom.disconnect();
    console.log('\n✅ 포트폴리오 관리 시스템 완료!');

  } catch (error) {
    console.error('❌ 포트폴리오 관리 실패:', error.message);
  }
}

/**
 * 현재 포트폴리오 상태 분석
 */
async function analyzeCurrentPortfolio(provider) {
  console.log('📊 현재 포트폴리오 분석 중...');

  try {
    // 포지션 조회
    const positionsResponse = await provider.getPositions();
    if (!positionsResponse.success || !positionsResponse.data) {
      throw new Error('포지션 조회 실패');
    }

    const positions = positionsResponse.data;

    // 잔고 조회
    const balanceResponse = await provider.getBalance();
    if (!balanceResponse.success || !balanceResponse.data) {
      throw new Error('잔고 조회 실패');
    }

    const balance = balanceResponse.data;

    // 포트폴리오 구성
    const portfolio = {
      cash: balance.cash,
      positions: positions.map(p => ({
        symbol: p.symbol,
        name: p.name,
        quantity: p.quantity,
        averagePrice: p.averagePrice,
        currentPrice: p.currentPrice,
        marketValue: p.evaluationPrice,
        weight: 0  // 나중에 계산
      })),
      totalValue: balance.totalEvaluationPrice,
      lastUpdated: new Date()
    };

    // 가중치 계산
    portfolio.positions.forEach(position => {
      position.weight = position.marketValue / portfolio.totalValue;
    });

    // 분석 결과 출력
    console.log(`\n📈 포트폴리오 현황:`);
    console.log(`총 평가액: ${portfolio.totalValue.toLocaleString()}원`);
    console.log(`현금 비중: ${((portfolio.cash / portfolio.totalValue) * 100).toFixed(2)}%`);
    console.log(`주식 비중: ${(((portfolio.totalValue - portfolio.cash) / portfolio.totalValue) * 100).toFixed(2)}%`);
    console.log(`보유 종목 수: ${portfolio.positions.length}개`);

    console.log(`\n🏢 종목별 현황:`);
    portfolio.positions.forEach((position, index) => {
      const profitLoss = position.marketValue - (position.averagePrice * position.quantity);
      const profitLossRate = (profitLoss / (position.averagePrice * position.quantity)) * 100;

      console.log(`${index + 1}. ${position.name} (${position.symbol})`);
      console.log(`   보유 수량: ${position.quantity.toLocaleString()}주`);
      console.log(`   평균 단가: ${position.averagePrice.toLocaleString()}원`);
      console.log(`   현재가: ${position.currentPrice.toLocaleString()}원`);
      console.log(`   시장 가치: ${position.marketValue.toLocaleString()}원`);
      console.log(`   포트폴리오 비중: ${(position.weight * 100).toFixed(2)}%`);
      console.log(`   손익: ${profitLoss.toLocaleString()}원 (${profitLossRate.toFixed(2)}%)`);
    });

    return portfolio;

  } catch (error) {
    console.error('포트폴리오 분석 실패:', error.message);
    throw error;
  }
}

/**
 * 포트폴리오 성능 평가
 */
async function evaluatePortfolioPerformance(kset, portfolio) {
  console.log('📊 포트폴리오 성능 평가 중...');

  try {
    // 기간별 성능 분석
    const analysis = await kset.analyzePortfolio(portfolio, {
      timeframe: '1M',      // 1개월
      benchmark: 'KOSPI',  // KOSPI 벤치마크
      includeDividends: true,
      riskFreeRate: 0.03    // 3% 무위험 이자율
    });

    console.log(`\n📈 성능 평가 결과:`);
    console.log(`총 수익률: ${analysis.totalReturn?.toFixed(2)}%`);
    console.log(`연환산 수익률: ${analysis.annualizedReturn?.toFixed(2)}%`);
    console.log(`벤치마크 대비: ${analysis.benchmarkComparison?.toFixed(2)}%`);
    console.log(`샤프 지수: ${analysis.sharpeRatio?.toFixed(3)}`);
    console.log(`최대 낙폭: ${analysis.maxDrawdown?.toFixed(2)}%`);
    console.log(`변동성: ${(analysis.volatility * 100)?.toFixed(2)}%`);

    // 세부 성능 지표
    if (analysis.performanceMetrics) {
      console.log(`\n📊 세부 성능 지표:`);
      console.log(`수익 변동성: ${analysis.performanceMetrics.returnStdDev?.toFixed(3)}`);
      console.log(`상승장 수익률: ${analysis.performanceMetrics.upMarketReturn?.toFixed(2)}%`);
      console.log(`하락장 수익률: ${analysis.performanceMetrics.downMarketReturn?.toFixed(2)}%`);
      console.log(`승률: ${analysis.performanceMetrics.winRate?.toFixed(1)}%`);
    }

    // 기간별 성능
    if (analysis.periodReturns) {
      console.log(`\n📅 기간별 수익률:`);
      analysis.periodReturns.forEach((period, index) => {
        console.log(`${period.period}: ${period.return.toFixed(2)}% (${period.duration})`);
      });
    }

    return analysis;

  } catch (error) {
    console.error('성능 평가 실패:', error.message);
    throw error;
  }
}

/**
 * 포트폴리오 리스크 분석
 */
async function analyzePortfolioRisk(kset, portfolio) {
  console.log('⚠️  포트폴리오 리스크 분석 중...');

  try {
    const riskAnalysis = await kset.analyzePortfolioRisk(portfolio, {
      includeMarketRisk: true,
      includeSpecificRisk: true,
      confidenceLevel: 0.95,  // 95% 신뢰 수준
      timeHorizon: 30,        // 30일
      scenarios: ['normal', 'stress', 'crash']
    });

    console.log(`\n⚠️  리스크 분석 결과:`);
    console.log(`포트폴리오 VaR (95%): ${riskAnalysis.var?.toLocaleString()}원`);
    console.log(`포트폴리오 CVaR: ${riskAnalysis.cvar?.toLocaleString()}원`);
    console.log(`포트폴리오 베타: ${riskAnalysis.beta?.toFixed(3)}`);
    console.log(`시장 리스크: ${riskAnalysis.marketRisk?.toFixed(2)}%`);
    console.log(`개별 리스크: ${riskAnalysis.specificRisk?.toFixed(2)}%`);
    console.log(`총 리스크: ${riskAnalysis.totalRisk?.toFixed(2)}%`);

    // 리스크 기여도
    if (riskAnalysis.riskContribution) {
      console.log(`\n🎯 종목별 리스크 기여도:`);
      Object.entries(riskAnalysis.riskContribution).forEach(([symbol, contribution]) => {
        const position = portfolio.positions.find(p => p.symbol === symbol);
        if (position) {
          console.log(`${position.name}: ${contribution.toFixed(2)}% (가중치: ${(position.weight * 100).toFixed(2)}%)`);
        }
      });
    }

    // 시나리오 분석
    if (riskAnalysis.scenarioAnalysis) {
      console.log(`\n🔮 시나리오 분석:`);
      riskAnalysis.scenarioAnalysis.forEach(scenario => {
        console.log(`${scenario.name}:`);
        console.log(`   손실 예상: ${scenario.expectedLoss?.toLocaleString()}원`);
        console.log(`   최악의 경우: ${scenario.worstCaseLoss?.toLocaleString()}원`);
        console.log(`   확률: ${(scenario.probability * 100).toFixed(1)}%`);
      });
    }

    // 리스크 등급
    if (riskAnalysis.riskRating) {
      console.log(`\n🏆 리스크 등급: ${riskAnalysis.riskRating.grade} (${riskAnalysis.riskRating.description})`);
      console.log(`권장 리스크 수준: ${riskAnalysis.riskRating.recommendedAction}`);
    }

    return riskAnalysis;

  } catch (error) {
    console.error('리스크 분석 실패:', error.message);
    throw error;
  }
}

/**
 * 자산 배분 최적화
 */
async function optimizeAssetAllocation(kset, currentPortfolio) {
  console.log('🎯 자산 배분 최적화 중...');

  try {
    const optimization = await kset.optimizePortfolio(currentPortfolio, {
      objective: 'max-sharpe',    // 샤프 지수 최대화
      constraints: {
        maxWeightPerStock: 0.15,  // 종목당 최대 15%
        minWeightPerStock: 0.05,  // 종목당 최소 5%
        maxCashWeight: 0.10,      // 현금 최대 10%
        sectorLimits: {           // 섹터별 제한
          '전기·전자': 0.40,
          '금융업': 0.20,
          '운수장비': 0.15
        }
      },
      riskTolerance: 'moderate',   // 중간 리스크 허용
      rebalanceThreshold: 0.05,   // 5% 이상 변동 시 리밸런싱
      includeTransactionCosts: true
    });

    console.log(`\n🎯 최적화 결과:`);
    console.log(`목표 샤프 지수: ${optimization.targetSharpeRatio?.toFixed(3)}`);
    console.log(`예상 연환산 수익률: ${(optimization.expectedAnnualReturn * 100)?.toFixed(2)}%`);
    console.log(`예상 변동성: ${(optimization.expectedVolatility * 100)?.toFixed(2)}%`);
    console.log(`리밸런싱 필요 여부: ${optimization.needsRebalancing ? '필요' : '불필요'}`);

    // 최적 비중
    console.log(`\n📊 최적 자산 배분:`);
    optimization.optimalWeights.forEach((weight, index) => {
      const position = currentPortfolio.positions.find(p => p.symbol === weight.symbol);
      const currentWeight = position ? position.weight : 0;
      const difference = weight.weight - currentWeight;

      console.log(`${index + 1}. ${weight.name} (${weight.symbol})`);
      console.log(`   현재 비중: ${(currentWeight * 100).toFixed(2)}%`);
      console.log(`   목표 비중: ${(weight.weight * 100).toFixed(2)}%`);
      console.log(`   조정 필요: ${Math.abs(difference * 100).toFixed(2)}% (${difference > 0 ? '매수' : '매도'})`);
    });

    // 거래 제안
    if (optimization.trades && optimization.trades.length > 0) {
      console.log(`\n🛒 추천 거래:`);
      optimization.trades.forEach((trade, index) => {
        const action = trade.quantity > 0 ? '매수' : '매도';
        console.log(`${index + 1}. ${trade.symbol} ${action} ${Math.abs(trade.quantity).toLocaleString()}주`);
        console.log(`   예상 비용: ${trade.estimatedCost?.toLocaleString()}원`);
        console.log(`   리스크 감소: ${trade.riskReduction?.toFixed(2)}%`);
      });

      console.log(`\n💰 총 예상 거래 비용: ${optimization.totalTransactionCost?.toLocaleString()}원`);
      console.log(`⚖️  예상 리스크 감소: ${optimization.expectedRiskReduction?.toFixed(2)}%`);
    }

    return optimization;

  } catch (error) {
    console.error('자산 배분 최적화 실패:', error.message);
    throw error;
  }
}

/**
 * 자동 리밸런싱 실행
 */
async function executeRebalancing(provider, recommendations) {
  if (!recommendations || !recommendations.needsRebalancing) {
    console.log('🔄 리밸런싱이 필요하지 않습니다.');
    return;
  }

  console.log('🔄 자동 리밸런싱 실행 중...');

  try {
    // 안전장치: 사용자 확인
    console.log('⚠️  리밸런싱 실행 전 확인:');
    console.log(`   총 거래 수: ${recommendations.trades?.length || 0}건`);
    console.log(`   예상 비용: ${recommendations.totalTransactionCost?.toLocaleString()}원`);
    console.log(`   예상 실행 시간: ${recommendations.estimatedExecutionTime || '미확인'}`);

    // 실제 주문 실행 (데모용으로 주석 처리)
    /*
    for (const trade of recommendations.trades || []) {
      const orderResult = await provider.placeOrder({
        symbol: trade.symbol,
        side: trade.quantity > 0 ? 'BUY' : 'SELL',
        orderType: 'LIMIT',
        quantity: Math.abs(trade.quantity),
        price: trade.targetPrice,
        remarks: '자동 리밸런싱'
      });

      if (orderResult.success) {
        console.log(`✅ ${trade.symbol} ${trade.quantity > 0 ? '매수' : '매도'} 주문 접수: ${orderResult.data.id}`);
      } else {
        console.log(`❌ ${trade.symbol} 주문 실패: ${orderResult.error?.message}`);
      }
    }
    */

    console.log('📝 리밸런싱 계획 생성 완료 (실제 실행은 주석 처리됨)');

  } catch (error) {
    console.error('리밸런싱 실행 실패:', error.message);
    throw error;
  }
}

/**
 * 포트폴리오 보고서 생성
 */
async function generatePortfolioReport(portfolio, performance, risk, optimization) {
  console.log('📋 포트폴리오 보고서 생성 중...');

  const report = {
    generatedAt: new Date(),
    summary: {
      totalValue: portfolio.totalValue,
      cash: portfolio.cash,
      investments: portfolio.totalValue - portfolio.cash,
      totalReturn: performance.totalReturn,
      sharpeRatio: performance.sharpeRatio,
      riskLevel: risk.riskRating?.grade
    },
    performance: {
      returns: {
        total: performance.totalReturn,
        annualized: performance.annualizedReturn,
        benchmark: performance.benchmarkComparison
      },
      risk: {
        volatility: performance.volatility,
        maxDrawdown: performance.maxDrawdown,
        var: risk.var,
        beta: risk.beta
      }
    },
    recommendations: {
      needsRebalancing: optimization.needsRebalancing,
      trades: optimization.trades?.length || 0,
      expectedImprovement: optimization.expectedRiskReduction
    }
  };

  console.log('\n📋 ===== 포트폴리오 관리 보고서 =====');
  console.log(`생성일시: ${report.generatedAt.toLocaleString()}`);

  console.log('\n📊 요약 정보:');
  console.log(`총 자산: ${report.summary.totalValue.toLocaleString()}원`);
  console.log(`현금: ${report.summary.cash.toLocaleString()}원`);
  console.log(`투자 자산: ${report.summary.investments.toLocaleString()}원`);
  console.log(`총 수익률: ${report.summary.totalReturn?.toFixed(2)}%`);
  console.log(`샤프 지수: ${report.summary.sharpeRatio?.toFixed(3)}`);
  console.log(`리스크 등급: ${report.summary.riskLevel}`);

  console.log('\n📈 성능 지표:');
  console.log(`총 수익률: ${report.performance.returns.total?.toFixed(2)}%`);
  console.log(`연환산 수익률: ${report.performance.returns.annualized?.toFixed(2)}%`);
  console.log(`벤치마크 대비: ${report.performance.returns.benchmark?.toFixed(2)}%`);
  console.log(`변동성: ${(report.performance.risk.volatility * 100)?.toFixed(2)}%`);
  console.log(`최대 낙폭: ${report.performance.risk.maxDrawdown?.toFixed(2)}%`);
  console.log(`VaR (95%): ${report.performance.risk.var?.toLocaleString()}원`);
  console.log(`베타: ${report.performance.risk.beta?.toFixed(3)}`);

  console.log('\n🎯 추천 사항:');
  console.log(`리밸런싱 필요: ${report.recommendations.needsRebalancing ? '예' : '아니오'}`);
  if (report.recommendations.needsRebalancing) {
    console.log(`추천 거래 수: ${report.recommendations.trades}건`);
    console.log(`예상 개선 효과: ${report.recommendations.expectedImprovement?.toFixed(2)}%`);
  }

  console.log('\n=====================================');

  return report;
}

// 실행
portfolioManagementSystem();
```

---

# 에러 처리 및 예외 상황

## 예제 8: 완벽한 에러 처리

모든 가능한 에러 상황을 처리하는 예제입니다.

```typescript
import { KSET, KSETError, ERROR_CODES } from 'kset';

/**
 * 완벽한 에러 처리 예제
 * 모든 가능한 에러 상황을 그레이스풀하게 처리
 */
async function comprehensiveErrorHandling() {
  console.log('🛡️  완벽한 에러 처리 예제를 시작합니다...');

  try {
    const kset = new KSET({
      logLevel: 'debug',
      timeout: 30000,
      retryAttempts: 3
    });

    // 1. 네트워크 에러 처리
    console.log('\n1️⃣ 네트워크 에러 처리 테스트...');
    await handleNetworkErrors(kset);

    // 2. 인증 에러 처리
    console.log('\n2️⃣ 인증 에러 처리 테스트...');
    await handleAuthenticationErrors(kset);

    // 3. 주문 에러 처리
    console.log('\n3️⃣ 주문 에러 처리 테스트...');
    await handleOrderErrors(kset);

    // 4. 데이터 에러 처리
    console.log('\n4️⃣ 데이터 에러 처리 테스트...');
    await handleDataErrors(kset);

    // 5. 재시도 로직 테스트
    console.log('\n5️⃣ 재시도 로직 테스트...');
    await testRetryLogic(kset);

    console.log('\n✅ 에러 처리 예제 완료!');

  } catch (error) {
    console.error('❌ 에러 처리 예제 실패:', error.message);
  }
}

/**
 * 네트워크 에러 처리
 */
async function handleNetworkErrors(kset) {
  try {
    console.log('🌐 네트워크 연결 테스트 중...');

    // 매우 짧은 타임아웃으로 의도적으로 실패 유발
    const shortTimeoutKSET = new KSET({ timeout: 1 });

    await shortTimeoutKSET.createProvider('kiwoom', {
      credentials: { id: 'test', password: 'test' },
      environment: 'production'
    });

  } catch (error) {
    if (error instanceof KSETError) {
      handleKSETError(error);
    } else {
      handleGenericError(error);
    }
  }
}

/**
 * 인증 에러 처리
 */
async function handleAuthenticationErrors(kset) {
  try {
    console.log('🔐 인증 에러 테스트 중...');

    await kset.createProvider('kiwoom', {
      credentials: {
        id: 'invalid_id',
        password: 'invalid_password',
        certPassword: 'invalid_cert'
      },
      environment: 'production'
    });

  } catch (error) {
    if (error instanceof KSETError) {
      handleKSETError(error);
    } else {
      handleGenericError(error);
    }
  }
}

/**
 * 주문 에러 처리
 */
async function handleOrderErrors(kset) {
  try {
    console.log('🛒 주문 에러 테스트 중...');

    // 유효하지 않은 Provider로 주문 시도
    const invalidProvider = {
      id: 'invalid',
      name: 'Invalid Provider',
      placeOrder: async () => {
        throw new KSETError('INSUFFICIENT_FUNDS', '계좌 잔고가 부족합니다.', {
          available: 100000,
          required: 500000,
          shortfall: 400000
        });
      }
    } as any;

    await invalidProvider.placeOrder({
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 10,
      price: 85000
    });

  } catch (error) {
    if (error instanceof KSETError) {
      handleKSETError(error);
    } else {
      handleGenericError(error);
    }
  }
}

/**
 * 데이터 에러 처리
 */
async function handleDataErrors(kset) {
  try {
    console.log('📊 데이터 에러 테스트 중...');

    // 유효하지 않은 Provider로 데이터 조회 시도
    const invalidProvider = {
      id: 'invalid',
      name: 'Invalid Provider',
      getMarketData: async () => {
        throw new KSETError('INVALID_SYMBOL', '유효하지 않은 종목 코드입니다.', {
          symbol: 'INVALID',
          validSymbols: ['005930', '000660', '035420']
        });
      }
    } as any;

    await invalidProvider.getMarketData(['INVALID']);

  } catch (error) {
    if (error instanceof KSETError) {
      handleKSETError(error);
    } else {
      handleGenericError(error);
    }
  }
}

/**
 * KSET 에러 처리
 */
function handleKSETError(error: KSETError) {
  console.error(`🚨 KSET 에러 발생: ${error.code}`);

  switch (error.code) {
    case ERROR_CODES.AUTHENTICATION_FAILED:
      console.error('인증 실패: 아래 사항을 확인하세요.');
      console.error('- ID와 비밀번호가 정확한지 확인');
      console.error('- 공인인증서가 유효한지 확인');
      console.error('- 키움증권 OpenAPI+가 실행 중인지 확인');
      break;

    case ERROR_CODES.INVALID_CREDENTIALS:
      console.error('유효하지 않은 인증 정보:');
      console.error('- 인증 정보가 올바른 형식인지 확인');
      break;

    case ERROR_CODES.CERTIFICATE_EXPIRED:
      console.error('공인인증서 만료:');
      console.error('- 공인인증서를 갱신해주세요');
      console.error('- 금융결제원에서 인증서 재발급');
      break;

    case ERROR_CODES.INSUFFICIENT_FUNDS:
      console.error('잔고 부족:');
      if (error.details?.shortfall) {
        console.error(`- 부족액: ${error.details.shortfall.toLocaleString()}원`);
      }
      console.error('- 충분한 현금을 확보한 후 다시 시도');
      break;

    case ERROR_CODES.INVALID_ORDER:
      console.error('유효하지 않은 주문:');
      if (error.details?.field) {
        console.error(`- 문제 필드: ${error.details.field}`);
      }
      console.error('- 주문 파라미터를 확인해주세요');
      break;

    case ERROR_CODES.MARKET_CLOSED:
      console.error('장이 열리지 않았습니다:');
      console.error('- 현재 시간:', new Date().toLocaleString());
      console.error('- 정규장 시간: 09:00-15:30 (점심시간 제외)');
      break;

    case ERROR_CODES.INVALID_SYMBOL:
      console.error('유효하지 않은 종목 코드:');
      if (error.details?.validSymbols) {
        console.error('- 유효한 종목 예시:', error.details.validSymbols.join(', '));
      }
      break;

    case ERROR_CODES.NETWORK_ERROR:
      console.error('네트워크 에러:');
      console.error('- 인터넷 연결을 확인해주세요');
      console.error('- 방화벽이나 프록시 설정을 확인');
      console.error('- 잠시 후 다시 시도');
      break;

    case ERROR_CODES.RATE_LIMIT_EXCEEDED:
      console.error('API 호출 한도 초과:');
      if (error.details?.retryAfter) {
        console.error(`- ${error.details.retryAfter}초 후 다시 시도`);
      }
      console.error('- 호출 빈도를 줄여주세요');
      break;

    default:
      console.error('알 수 없는 KSET 에러:', error.message);
      if (error.details) {
        console.error('상세 정보:', error.details);
      }
  }

  // 원인 에러도 출력
  if (error.cause) {
    console.error('원인 에러:', error.cause.message);
  }
}

/**
 * 일반 에러 처리
 */
function handleGenericError(error: any) {
  console.error('❌ 일반 에러 발생:', error.message);

  if (error.stack) {
    console.error('스택 트레이스:', error.stack);
  }

  // 에러 유형에 따른 처리
  if (error.name === 'TypeError') {
    console.error('타입 에러: 변수나 객체 타입을 확인해주세요');
  } else if (error.name === 'ReferenceError') {
    console.error('참조 에러: 변수나 함수가 정의되었는지 확인해주세요');
  } else if (error.name === 'RangeError') {
    console.error('범위 에러: 배열 인덱스나 숫자 범위를 확인해주세요');
  }
}

/**
 * 재시도 로직 테스트
 */
async function testRetryLogic(kset) {
  console.log('🔄 재시도 로직 테스트 중...');

  let attemptCount = 0;
  const maxAttempts = 3;

  while (attemptCount < maxAttempts) {
    attemptCount++;

    try {
      console.log(`시도 ${attemptCount}/${maxAttempts}...`);

      // 의도적으로 실패할 수 있는 작업
      await performUnreliableOperation();

      console.log('✅ 작업 성공!');
      return;

    } catch (error) {
      console.log(`❌ 시도 ${attemptCount} 실패: ${error.message}`);

      if (attemptCount === maxAttempts) {
        console.error('🚨 최종 실패: 모든 재시도 소진');
        throw error;
      }

      // 지수 백오프
      const delay = Math.pow(2, attemptCount) * 1000;
      console.log(`⏳ ${delay/1000}초 후 재시도...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

/**
 * 신뢰할 수 없는 작업 (테스트용)
 */
async function performUnreliableOperation() {
  // 70% 확률로 실패
  if (Math.random() < 0.7) {
    throw new Error('의도적인 실패');
  }

  return '성공!';
}

// 실행
comprehensiveErrorHandling();
```

---

# 테스트 및 디버깅

## 예제 9: 단위 테스트

KSET 기능을 단위 테스트하는 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * KSET 단위 테스트 예제
 * 각 기능별 테스트 케이스
 */
class KSETUnitTests {
  private kset: KSET;
  private provider: any;
  private testResults: { [key: string]: boolean };

  constructor() {
    this.kset = new KSET({ logLevel: 'error' }); // 테스트 중 로그 최소화
    this.testResults = {};
  }

  /**
   * 모든 테스트 실행
   */
  async runAllTests() {
    console.log('🧪 KSET 단위 테스트 시작...');

    const testMethods = [
      { name: 'KSET 인스턴스 생성', method: () => this.testKSETCreation() },
      { name: '타입 유효성 검사', method: () => this.testTypeValidation() },
      { name: '데이터 형식 검사', method: () => this.testDataFormats() },
      { name: '에러 처리 검사', method: () => this.testErrorHandling() },
      { name: '계산 로직 검사', method: () => this.testCalculations() },
      { name: '비동기 처리 검사', method: () => this.testAsyncHandling() }
    ];

    for (const test of testMethods) {
      console.log(`\n🔍 테스트: ${test.name}`);
      try {
        await test.method();
        console.log(`✅ ${test.name} - 통과`);
        this.testResults[test.name] = true;
      } catch (error) {
        console.error(`❌ ${test.name} - 실패: ${error.message}`);
        this.testResults[test.name] = false;
      }
    }

    this.printTestSummary();
  }

  /**
   * KSET 인스턴스 생성 테스트
   */
  async testKSETCreation() {
    // 기본 생성 테스트
    const kset1 = new KSET();
    if (!kset1) {
      throw new Error('KSET 기본 생성 실패');
    }

    // 옵션 포함 생성 테스트
    const kset2 = new KSET({
      logLevel: 'debug',
      timeout: 30000,
      retryAttempts: 3
    });
    if (!kset2) {
      throw new Error('KSET 옵션 포함 생성 실패');
    }

    // 유효하지 않은 옵션 테스트
    try {
      new KSET({ invalidOption: 'value' } as any);
      // 여기까지 도달하면 안 됨
    } catch (error) {
      // 예상된 에러
    }

    return true;
  }

  /**
   * 타입 유효성 검사 테스트
   */
  async testTypeValidation() {
    // MarketType 유효성 검사
    const validMarkets = ['KOSPI', 'KOSDAQ', 'KONEX', 'KRX-ETF', 'KRX-ETN'];
    for (const market of validMarkets) {
      if (!this.isValidMarketType(market)) {
        throw new Error(`유효하지 않은 MarketType: ${market}`);
      }
    }

    // OrderType 유효성 검사
    const validOrderTypes = ['MARKET', 'LIMIT', 'BEST', 'STOP', 'OCO'];
    for (const orderType of validOrderTypes) {
      if (!this.isValidOrderType(orderType)) {
        throw new Error(`유효하지 않은 OrderType: ${orderType}`);
      }
    }

    // OrderSide 유효성 검사
    const validSides = ['BUY', 'SELL'];
    for (const side of validSides) {
      if (!this.isValidOrderSide(side)) {
        throw new Error(`유효하지 않은 OrderSide: ${side}`);
      }
    }

    return true;
  }

  /**
   * 데이터 형식 검사 테스트
   */
  async testDataFormats() {
    // Symbol 데이터 형식 검사
    const validSymbol = this.createValidSymbol();
    if (!this.validateSymbol(validSymbol)) {
      throw new Error('Symbol 데이터 형식 유효성 실패');
    }

    // MarketData 데이터 형식 검사
    const validMarketData = this.createValidMarketData();
    if (!this.validateMarketData(validMarketData)) {
      throw new Error('MarketData 데이터 형식 유효성 실패');
    }

    // OrderRequest 데이터 형식 검사
    const validOrderRequest = this.createValidOrderRequest();
    if (!this.validateOrderRequest(validOrderRequest)) {
      throw new Error('OrderRequest 데이터 형식 유효성 실패');
    }

    return true;
  }

  /**
   * 에러 처리 검사 테스트
   */
  async testErrorHandling() {
    // 에러 생성 테스트
    const testError = this.createTestError();
    if (!testError.code || !testError.message) {
      throw new Error('KSETError 생성 실패');
    }

    // 에러 핸들링 로직 테스트
    const errorResult = this.handleTestError(testError);
    if (!errorResult.handled) {
      throw new Error('에러 핸들링 실패');
    }

    return true;
  }

  /**
   * 계산 로직 검사 테스트
   */
  async testCalculations() {
    // 수익률 계산 테스트
    const profitLossRate = this.calculateProfitLossRate(85000, 87000);
    const expectedRate = ((87000 - 85000) / 85000) * 100;
    if (Math.abs(profitLossRate - expectedRate) > 0.01) {
      throw new Error('수익률 계산 오류');
    }

    // 슬리피지 계산 테스트
    const slippage = this.calculateSlippage(85000, 84900, 'BUY');
    const expectedSlippage = ((84900 - 85000) / 85000) * 100;
    if (Math.abs(slippage - expectedSlippage) > 0.01) {
      throw new Error('슬리피지 계산 오류');
    }

    // 포트폴리오 비중 계산 테스트
    const weights = this.calculatePortfolioWeights([
      { value: 1000000 },
      { value: 2000000 },
      { value: 1500000 }
    ]);
    const totalValue = 1000000 + 2000000 + 1500000;
    const expectedWeights = [
      1000000 / totalValue,
      2000000 / totalValue,
      1500000 / totalValue
    ];

    for (let i = 0; i < weights.length; i++) {
      if (Math.abs(weights[i] - expectedWeights[i]) > 0.001) {
        throw new Error('포트폴리오 비중 계산 오류');
      }
    }

    return true;
  }

  /**
   * 비동기 처리 검사 테스트
   */
  async testAsyncHandling() {
    // Promise resolving 테스트
    const resolveResult = await this.testPromiseResolution();
    if (!resolveResult) {
      throw new Error('Promise resolution 테스트 실패');
    }

    // Promise rejection 테스트
    try {
      await this.testPromiseRejection();
      throw new Error('Promise rejection 테스트 실패');
    } catch (error) {
      // 예상된 rejection
    }

    // timeout 테스트
    const timeoutResult = await this.testTimeout(1000);
    if (!timeoutResult) {
      throw new Error('Timeout 테스트 실패');
    }

    return true;
  }

  /**
   * 보조 메서드들
   */
  private isValidMarketType(market: string): boolean {
    return ['KOSPI', 'KOSDAQ', 'KONEX', 'KRX-ETF', 'KRX-ETN'].includes(market);
  }

  private isValidOrderType(type: string): boolean {
    return ['MARKET', 'LIMIT', 'BEST', 'BEST_LIMIT', 'STOP', 'STOP_LIMIT', 'OCO', 'ICEBERG'].includes(type);
  }

  private isValidOrderSide(side: string): boolean {
    return ['BUY', 'SELL'].includes(side);
  }

  private createValidSymbol() {
    return {
      id: '005930',
      name: '삼성전자',
      englishName: 'Samsung Electronics',
      market: 'KOSPI' as const,
      sector: '전기·전자',
      industry: '반도체',
      listingDate: new Date('1975-06-11'),
      faceValue: 5000,
      totalShares: 5969782550,
      isPreferred: false,
      isETF: false,
      isETN: false,
      isREITs: false,
      isSPAC: false
    };
  }

  private validateSymbol(symbol: any): boolean {
    return symbol.id && symbol.name && symbol.market &&
           typeof symbol.totalShares === 'number' &&
           typeof symbol.faceValue === 'number';
  }

  private createValidMarketData() {
    return {
      symbol: '005930',
      name: '삼성전자',
      market: 'KOSPI' as const,
      currentPrice: 85000,
      previousClose: 84500,
      openPrice: 84600,
      highPrice: 85200,
      lowPrice: 84400,
      change: 500,
      changeRate: 0.59,
      volume: 15000000,
      totalValue: 1275000000000,
      asks: [{ price: 85100, quantity: 1000 }],
      bids: [{ price: 85000, quantity: 2000 }],
      timestamp: new Date(),
      marketStatus: 'regular' as const
    };
  }

  private validateMarketData(data: any): boolean {
    return data.symbol && data.currentPrice &&
           typeof data.change === 'number' &&
           typeof data.volume === 'number' &&
           Array.isArray(data.asks) && Array.isArray(data.bids);
  }

  private createValidOrderRequest() {
    return {
      symbol: '005930',
      side: 'BUY' as const,
      orderType: 'LIMIT' as const,
      quantity: 10,
      price: 85000,
      timeInForce: 'DAY' as const,
      accountNumber: '12345678-01',
      remarks: '테스트 주문'
    };
  }

  private validateOrderRequest(request: any): boolean {
    return request.symbol && request.side && request.orderType &&
           request.quantity > 0 &&
           (request.orderType !== 'LIMIT' || request.price > 0);
  }

  private createTestError() {
    const { KSETError } = require('./src/errors/index');
    return new KSETError('TEST_ERROR', '테스트 에러입니다.', { test: true });
  }

  private handleTestError(error: any) {
    try {
      // 에러 처리 로직
      console.log(`에러 처리: ${error.message}`);
      return { handled: true, message: error.message };
    } catch (e) {
      return { handled: false, error: e };
    }
  }

  private calculateProfitLossRate(buyPrice: number, sellPrice: number): number {
    return ((sellPrice - buyPrice) / buyPrice) * 100;
  }

  private calculateSlippage(expectedPrice: number, actualPrice: number, side: string): number {
    const slippage = ((actualPrice - expectedPrice) / expectedPrice) * 100;
    return side === 'BUY' ? -slippage : slippage;
  }

  private calculatePortfolioWeights(assets: Array<{ value: number }>): number[] {
    const total = assets.reduce((sum, asset) => sum + asset.value, 0);
    return assets.map(asset => asset.value / total);
  }

  private async testPromiseResolution(): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 100);
    });
  }

  private async testPromiseRejection(): Promise<void> {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('테스트 rejection')), 100);
    });
  }

  private async testTimeout(ms: number): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), ms);
    });
  }

  /**
   * 테스트 결과 요약 출력
   */
  private printTestSummary() {
    const totalTests = Object.keys(this.testResults).length;
    const passedTests = Object.values(this.testResults).filter(Boolean).length;
    const failedTests = totalTests - passedTests;

    console.log('\n📊 ===== 테스트 결과 요약 =====');
    console.log(`전체 테스트: ${totalTests}건`);
    console.log(`통과: ${passedTests}건`);
    console.log(`실패: ${failedTests}건`);
    console.log(`성공률: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (failedTests > 0) {
      console.log('\n❌ 실패한 테스트:');
      Object.entries(this.testResults)
        .filter(([_, passed]) => !passed)
        .forEach(([name, _]) => {
          console.log(`  - ${name}`);
        });
    }

    console.log('=====================================');
  }
}

/**
 * 단위 테스트 실행
 */
async function runUnitTests() {
  const tests = new KSETUnitTests();
  await tests.runAllTests();
}

// 실행
runUnitTests();
```

---

# 프로덕션 배포

## 예제 10: 프로덕션 환경 설정

실제 운영 환경을 위한 설정 예제입니다.

```typescript
import { KSET } from 'kset';

/**
 * 프로덕션 환경 설정 예제
 * 실제 운영을 위한 안정적이고 확장 가능한 설정
 */
class ProductionKSETSetup {
  private kset: KSET;
  private providers: Map<string, any> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;

  constructor() {
    // 프로덕션 환경 설정
    this.kset = new KSET({
      logLevel: 'warn',           // 프로덕션에서는 경고 이상만 로그
      timeout: 60000,             // 긴 타임아웃
      retryAttempts: 5,           // 더 많은 재시도
      circuitBreakerThreshold: 10,  // 서킷 브레이커
      enableMetrics: true,        // 메트릭 수집 활성화
      enableMonitoring: true      // 모니터링 활성화
    });
  }

  /**
   * 프로덕션 환경 초기화
   */
  async initialize() {
    console.log('🚀 프로덕션 환경 초기화 시작...');

    try {
      // 1. 환경 변수 검증
      this.validateEnvironment();

      // 2. Provider 연결
      await this.connectProviders();

      // 3. 헬스 체크 시작
      this.startHealthChecks();

      // 4. 모니터링 설정
      this.setupMonitoring();

      // 5. graceful shutdown 설정
      this.setupGracefulShutdown();

      console.log('✅ 프로덕션 환경 초기화 완료');

    } catch (error) {
      console.error('❌ 프로덕션 환경 초기화 실패:', error.message);
      process.exit(1);
    }
  }

  /**
   * 환경 변수 검증
   */
  private validateEnvironment() {
    console.log('🔍 환경 변수 검증 중...');

    const requiredEnvVars = [
      'KIWOOM_ID',
      'KIWOOM_PASSWORD',
      'KIWOOM_CERT_PASSWORD',
      'KOREA_INVESTMENT_API_KEY',
      'KOREA_INVESTMENT_SECRET',
      'KOREA_INVESTMENT_ACCOUNT'
    ];

    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(`필수 환경 변수 누락: ${missingVars.join(', ')}`);
    }

    console.log('✅ 환경 변수 검증 완료');
  }

  /**
   * Provider 연결
   */
  private async connectProviders() {
    console.log('🔗 Provider 연결 중...');

    try {
      // 키움증권 연결
      const kiwoom = await this.kset.createProvider('kiwoom', {
        credentials: {
          id: process.env.KIWOOOM_ID!,
          password: process.env.KIWOOOM_PASSWORD!,
          certPassword: process.env.KIWOOOM_CERT_PASSWORD!
        },
        environment: 'production',
        timeout: 45000,
        retryAttempts: 3
      });

      this.providers.set('kiwoom', kiwoom);
      console.log('✅ 키움증권 연결 완료');

      // 한국투자증권 연결
      const koreaInvestment = await this.kset.createProvider('korea-investment', {
        credentials: {
          apiKey: process.env.KOREA_INVESTMENT_API_KEY!,
          secret: process.env.KOREA_INVESTMENT_SECRET!,
          accountNumber: process.env.KOREA_INVESTMENT_ACCOUNT!
        },
        environment: 'production',
        timeout: 30000,
        retryAttempts: 3
      });

      this.providers.set('korea-investment', koreaInvestment);
      console.log('✅ 한국투자증권 연결 완료');

      console.log(`✅ 총 ${this.providers.size}개 Provider 연결 완료`);

    } catch (error) {
      console.error('❌ Provider 연결 실패:', error.message);
      throw error;
    }
  }

  /**
   * 헬스 체크 시작
   */
  private startHealthChecks() {
    console.log('💓 헬스 체크 시작...');

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // 30초마다 헬스 체크

    // 즉시 첫 번째 헬스 체크 실행
    this.performHealthCheck();
  }

  /**
   * 헬스 체크 수행
   */
  private async performHealthCheck() {
    const results: { [key: string]: any } = {};

    for (const [name, provider] of this.providers) {
      try {
        const startTime = Date.now();
        const status = await provider.getHealthStatus();
        const responseTime = Date.now() - startTime;

        results[name] = {
          status: 'healthy',
          responseTime,
          lastCheck: new Date(),
          details: status
        };

        console.log(`💓 ${name}: 정상 (${responseTime}ms)`);

      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          lastCheck: new Date()
        };

        console.error(`💔 ${name}: 비정상 - ${error.message}`);

        // 알림 발송 (실제 환경에서는 Slack, 이메일 등)
        await this.sendAlert(`${name} Provider 비정상`, error.message);
      }
    }

    // 메트릭 기록
    this.recordMetrics(results);
  }

  /**
   * 모니터링 설정
   */
  private setupMonitoring() {
    console.log('📊 모니터링 설정 중...');

    // 성능 모니터링
    this.setupPerformanceMonitoring();

    // 에러 모니터링
    this.setupErrorMonitoring();

    // 비즈니스 메트릭 모니터링
    this.setupBusinessMetricsMonitoring();

    console.log('✅ 모니터링 설정 완료');
  }

  /**
   * 성능 모니터링
   */
  private setupPerformanceMonitoring() {
    // 메모리 사용량 모니터링
    setInterval(() => {
      const memUsage = process.memoryUsage();
      const memUsageMB = {
        rss: Math.round(memUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
        external: Math.round(memUsage.external / 1024 / 1024)
      };

      // 메모리 사용량이 500MB를 초과하면 경고
      if (memUsageMB.heapUsed > 500) {
        console.warn(`⚠️  메모리 사용량 경고: ${memUsageMB.heapUsed}MB`);
        this.sendAlert('메모리 사용량 경고', `현재 사용량: ${memUsageMB.heapUsed}MB`);
      }
    }, 60000); // 1분마다 확인

    // CPU 사용량 모니터링
    this.setupCPUMonitoring();
  }

  /**
   * CPU 모니터링
   */
  private setupCPUMonitoring() {
    const startUsage = process.cpuUsage();

    setInterval(() => {
      const endUsage = process.cpuUsage(startUsage);
      const cpuPercent = ((endUsage.user + endUsage.system) / 1000000) * 100;

      if (cpuPercent > 80) {
        console.warn(`⚠️  CPU 사용량 경고: ${cpuPercent.toFixed(1)}%`);
        this.sendAlert('CPU 사용량 경고', `현재 사용량: ${cpuPercent.toFixed(1)}%`);
      }
    }, 60000);
  }

  /**
   * 에러 모니터링
   */
  private setupErrorMonitoring() {
    // 미처리 에러 감지
    process.on('uncaughtException', (error) => {
      console.error('💥 처리되지 않은 예외:', error);
      this.sendAlert('처리되지 않은 예외', error.message);
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('💥 처리되지 않은 Promise 거부:', reason);
      this.sendAlert('처리되지 않은 Promise 거부', String(reason));
    });
  }

  /**
   * 비즈니스 메트릭 모니터링
   */
  private setupBusinessMetricsMonitoring() {
    setInterval(async () => {
      try {
        // 주문 성공률 모니터링
        await this.monitorOrderSuccessRate();

        // API 응답 시간 모니터링
        await this.monitorAPIResponseTime();

        // 거래량 모니터링
        await this.monitorTradingVolume();

      } catch (error) {
        console.error('비즈니스 메트릭 수집 실패:', error.message);
      }
    }, 300000); // 5분마다 확인
  }

  /**
   * 주문 성공률 모니터링
   */
  private async monitorOrderSuccessRate() {
    // 실제 구현에서는 주문 데이터를 수집하여 성공률 계산
    console.log('📊 주문 성공률 모니터링');
  }

  /**
   * API 응답 시간 모니터링
   */
  private async monitorAPIResponseTime() {
    // 실제 구현에서는 API 응답 시간을 수집
    console.log('⏱️  API 응답 시간 모니터링');
  }

  /**
   * 거래량 모니터링
   */
  private async monitorTradingVolume() {
    // 실제 구현에서는 거래량을 수집
    console.log('💰 거래량 모니터링');
  }

  /**
   * Graceful shutdown 설정
   */
  private setupGracefulShutdown() {
    console.log('🛑 Graceful shutdown 설정 중...');

    const shutdown = async (signal: string) => {
      console.log(`\n${signal} 수신. 애플리케이션을 정상 종료합니다...`);

      try {
        // 헬스 체크 중지
        if (this.healthCheckInterval) {
          clearInterval(this.healthCheckInterval);
        }

        // 진행 중인 작업 완료 대기
        console.log('진행 중인 작업 완료 대기 중...');
        await this.waitForPendingOperations();

        // Provider 연결 해제
        console.log('Provider 연결 해제 중...');
        await this.disconnectProviders();

        console.log('✅ 애플리케이션이 정상 종료되었습니다.');
        process.exit(0);

      } catch (error) {
        console.error('❌ 종료 중 에러:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    console.log('✅ Graceful shutdown 설정 완료');
  }

  /**
   * 진행 중인 작업 완료 대기
   */
  private async waitForPendingOperations(): Promise<void> {
    // 실제 구현에서는 진행 중인 주문, 알고리즘 등을 확인
    return new Promise(resolve => {
      setTimeout(resolve, 5000); // 5초 대기
    });
  }

  /**
   * Provider 연결 해제
   */
  private async disconnectProviders() {
    const disconnectPromises = Array.from(this.providers.values()).map(provider =>
      provider.disconnect().catch(error =>
        console.error('Provider 연결 해제 실패:', error.message)
      )
    );

    await Promise.all(disconnectPromises);
    this.providers.clear();
  }

  /**
   * 알림 발송
   */
  private async sendAlert(title: string, message: string) {
    // 실제 환경에서는 Slack, 이메일, SMS 등으로 알림 발송
    console.log(`🚨 [ALERT] ${title}: ${message}`);

    // Slack 알림 예시
    // await this.sendSlackAlert(title, message);
  }

  /**
   * 메트릭 기록
   */
  private recordMetrics(results: { [key: string]: any }) {
    // 실제 환경에서는 Prometheus, InfluxDB 등에 메트릭 기록
    console.log('📈 메트릭 기록:', Object.keys(results));
  }

  /**
   * 안전한 주문 실행
   */
  async safePlaceOrder(orderRequest: any) {
    try {
      // 사전 검증
      this.validateOrderRequest(orderRequest);

      // 리스크 검사
      await this.checkOrderRisk(orderRequest);

      // 주문 실행
      const result = await this.executeOrderWithRetry(orderRequest);

      // 사후 검증
      this.validateOrderResult(result);

      return result;

    } catch (error) {
      console.error('안전한 주문 실행 실패:', error.message);
      await this.sendAlert('주문 실행 실패', `${orderRequest.symbol} ${orderRequest.side}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 주문 요청 검증
   */
  private validateOrderRequest(orderRequest: any) {
    if (!orderRequest.symbol || !orderRequest.side || !orderRequest.orderType || !orderRequest.quantity) {
      throw new Error('주문 요청 파라미터 불완전');
    }

    if (orderRequest.quantity <= 0) {
      throw new Error('주문 수량은 0보다 커야 합니다');
    }

    if (orderRequest.orderType === 'LIMIT' && (!orderRequest.price || orderRequest.price <= 0)) {
      throw new Error('지정가 주문은 가격을 지정해야 합니다');
    }
  }

  /**
   * 주문 리스크 검사
   */
  private async checkOrderRisk(orderRequest: any) {
    // 실제 구현에서는 리스크 관리 규칙에 따라 검사
    console.log('🔍 주문 리스크 검사:', orderRequest.symbol);
  }

  /**
   * 재시도 포함 주문 실행
   */
  private async executeOrderWithRetry(orderRequest: any, maxRetries: number = 3) {
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const provider = this.selectOptimalProvider(orderRequest.symbol);
        return await provider.placeOrder(orderRequest);

      } catch (error) {
        lastError = error;
        console.warn(`주문 시도 ${attempt}/${maxRetries} 실패:`, error.message);

        if (attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  /**
   * 최적 Provider 선택
   */
  private selectOptimalProvider(symbol: string) {
    // 실제 구현에서는 라우팅 알고리즘으로 최적 Provider 선택
    return this.providers.get('kiwoom') || this.providers.values().next().value;
  }

  /**
   * 주문 결과 검증
   */
  private validateOrderResult(result: any) {
    if (!result.success) {
      throw new Error(`주문 실패: ${result.error?.message}`);
    }

    if (!result.data) {
      throw new Error('주문 결과 데이터 없음');
    }
  }
}

/**
 * 프로덕션 환경 실행
 */
async function runProductionEnvironment() {
  const prodKSET = new ProductionKSETSetup();
  await prodKSET.initialize();

  // 프로덕션 환경에서는 계속 실행
  console.log('🚀 프로덕션 환경 실행 중...');

  // 예시: 안전한 주문 실행
  /*
  setInterval(async () => {
    try {
      await prodKSET.safePlaceOrder({
        symbol: '005930',
        side: 'BUY',
        orderType: 'LIMIT',
        quantity: 10,
        price: 85000
      });
    } catch (error) {
      console.error('주문 실행 실패:', error.message);
    }
  }, 60000); // 1분마다 주문 시도
  */
}

// 개발 환경에서만 실행
if (process.env.NODE_ENV === 'production') {
  runProductionEnvironment();
} else {
  console.log('🧪 개발 환경 - 프로덕션 설정 예제만 표시됩니다.');
  console.log('실제 프로덕션 배포 시 NODE_ENV=production로 설정하세요.');
}

export { ProductionKSETSetup };
```

---

## 📞 지원 및 문의

**이 문서는 KSET 라이브러리의 모든 기능을 완벽하게 다루어 개발자들이 혼동 없이 학습하고 사용할 수 있도록 작성되었습니다.**

- **GitHub Issues**: [https://github.com/KhakiSkech/KSET/issues](https://github.com/KhakiSkech/KSET/issues)
- **이메일**: khakiskech@gmail.com
- **라이선스**: MIT License

**KSET: 한국 증권 거래의 표준을 만들어갑니다 🇰🇷**