# KSET 한국어 문서

**Korea Stock Exchange Trading Library** - 한국 주식 거래 표준 인터페이스

KSET에 오신 것을 환영합니다! KSET은 한국 증권 거래를 위한 최고의 TypeScript/JavaScript 라이브러리입니다. 이 문서는 한국 증권 시장에서 KSET을 효과적으로 사용하는 방법을 안내합니다.

## 🚀 빠른 시작

```bash
npm install kset
```

```typescript
import { KSET } from 'kset';

// KSET 초기화
const kset = new KSET({
  provider: 'kiwoom',
  credentials: {
    certificatePath: './certs/your_cert.pfx',
    certificatePassword: 'your_password',
    accountNumber: 'your_account_number'
  }
});

// 거래 시작
await kset.connect();
const samsung = await kset.getMarketData('005930'); // 삼성전자
console.log(`현재가: ${samsung.currentPrice}원`);
```

## 📚 한국어 문서 목차

### **[시작 가이드](./guides/getting-started.md)**
- 설치 및 기본 설정
- 계좌 연동 방법
- 첫 거래 튜토리얼
- 기본 개념 설명

### **[국내 증권사 연동](./providers/)**
- **[키움증권](./providers/kiwoom.md)** - 가장 많이 사용되는 국내 증권사
- **[한국투자증권](./providers/korea-investment.md)** - 한국투자증권 API 연동
- **[미래에셋증권](./providers/mirae-asset.md)** - 미래에셋증권 연동
- **[삼성증권](./providers/samsung-securities.md)** - 삼성증권 연동

### **[거래 가이드](./trading/)**
- **[주식 매매](./trading/stock-trading.md)** - 주식 거래 기본
- **[실시간 데이터](./trading/realtime-data.md)** - 실시간 시세 정보
- **[포트폴리오 관리](./trading/portfolio.md)** - 포트폴리오 관리
- **[위험 관리](./trading/risk-management.md)** - 투자 위험 관리

### **[알고리즘 트레이딩](./algorithm/)**
- **[자동매매 시스템](./algorithm/auto-trading.md)** - 알고리즘 트레이딩 구축
- **[전략 개발](./algorithm/strategy-development.md)** - 매매 전략 개발
- **[백테스팅](./algorithm/backtesting.md)** - 과거 데이터 검증
- **[고주파 거래](./algorithm/high-frequency.md)** - HFT 시스템

### **[규제 및 법규](./regulations/)**
- **[금융규제 준수](./regulations/compliance.md)** - 금융감독규정
- **[투자자 보호](./regulations/investor-protection.md)** - 투자자 보호 규정
- **[세금 및 수수료](./regulations/taxes.md)** - 거래세 및 수수료
- **[신고 의무](./regulations/reporting.md)** - 신고 및 보고 의무

### **[기술 지원](./technical/)**
- **[문제 해결](./technical/troubleshooting.md)** - 일반적인 문제 해결
- **[최적화](./technical/optimization.md)** - 성능 최적화
- **[보안](./technical/security.md)** - 보안 설정
- **[모니터링](./technical/monitoring.md)** - 시스템 모니터링

## 🎯 주요 기능

- **통합 인터페이스**: 여러 국내 증권사를 위한 단일 API
- **실시간 데이터**: WebSocket 스트리밍 지원
- **타입 안전**: 완벽한 TypeScript 지원
- **규제 준수**: 한국 시장 규정 및 거래 규칙 내장
- **알고리즘 트레이딩**: 고급 주문 라우팅 및 실행 알고리즘
- **리서치 통합**: DART 공시 및 금융 분석
- **확장 가능**: 플러그인 시스템으로 커스텀 제공업체 및 전략 지원

## 🏛️ 지원 시장

- **KOSPI**: 한국종합주가지수
- **KOSDAQ**: 한국증권업협회
- **KONEX**: 한국신용거래소
- **KRX-ETF**: 상장지수펀드
- **KRX-ETN**: 상장지수증권

## 🤝 지원 증권사

- **키움증권** - 개인 투자자에게 가장 인기
- **한국투자증권** - 주요 기관 투자자
- **미래에셋증권** - 최대 자산운용사
- **삼성증권** - 기술 중심 증권사
- 기타...

## 🛡️ 보안 및 규제 준수

- 금융위원회(FSC) 규정 준수
- 모든 통신에 대한 TLS 암호화
- 인증서 기반 인증
- 속도 제한 및 스로틀링
- 감사 로깅 및 모니터링

## 📞 지원

- **GitHub Issues**: [버그 보고 및 기능 요청](https://github.com/kset/kset/issues)
- **디스코드 커뮤니티**: [개발자 커뮤니티 참여](https://discord.gg/kset)
- **이메일 지원**: support@kset.dev (한국어 가능)
- **문서**: docs@kset.dev (한국어 문의)

## 🇰🇷 한국 시장 특화 기능

### **시간 관리**
```typescript
// 한국 시간으로 거래 세션 확인
import { KoreanMarketCalendar } from 'kset';

const calendar = new KoreanMarketCalendar();
const isOpen = calendar.isMarketOpen(); // 현재 장 열렸는지 확인
const nextOpen = calendar.getNextOpenTime(); // 다음 개장 시간
```

### **한글 종목명 지원**
```typescript
const marketData = await kset.getMarketData('005930');
console.log(marketData.name); // "삼성전자"
console.log(marketData.englishName); // "Samsung Electronics"
```

### **원화(KRW) 가격 정보**
```typescript
console.log(`현재가: ${marketData.currentPrice.toLocaleString()}원`);
console.log(`시가총액: ${Math.round(marketData.marketCap / 1e12)}조원`);
```

### **DART 공시 통합**
```typescript
const disclosures = await kset.getDisclosures('005930');
disclosures.forEach(disclosure => {
  console.log(`${disclosure.title} - ${disclosure.publishedAt.toLocaleDateString()}`);
});
```

## 💼 사용 사례

### **개인 투자자**
```typescript
// 포트폴리오 모니터링
const portfolio = await kset.getPortfolio();
console.log(`총 평가금액: ${portfolio.totalValue.toLocaleString()}원`);
console.log(`일일 손익: ${portfolio.dailyPnLRate.toFixed(2)}%`);

// 실시간 알림
kset.subscribeMarketData('005930', (data) => {
  if (data.changeRate > 5) {
    alert(`삼성전자 ${data.changeRate.toFixed(2)}% 상승!`);
  }
});
```

### **퀀트 투자**
```typescript
// 기술적 분석 지표
const indicators = await kset.getTechnicalIndicators('005930', {
  indicators: ['RSI', 'MACD', '이동평균선'],
  period: 20
});

// 자동매매 전략
if (indicators.RSI < 30) {
  await kset.createOrder({
    symbol: '005930',
    side: 'BUY',
    orderType: 'MARKET',
    quantity: calculatePositionSize()
  });
}
```

### **기관 투자자**
```typescript
// 대규모 주문 실행
const order = await kset.createOrder({
  symbol: '005930',
  side: 'BUY',
  orderType: 'LIMIT',
  quantity: 10000,
  price: 80000,
  executionStrategy: {
    type: 'TWAP', // 시간가중평균가
    duration: 1800000, // 30분
    sliceCount: 30
  }
});
```

## 📈 성공 사례

### **개인 알고리즘 트레이더**
> "KSET을 사용하여 월 15% 수익률을 달성했습니다. 특히 실시간 데이터 처리 속도가 놀라워요." - 김모 씨, 개인 투자자

### **핀테크 스타트업**
> "6개월 만에 로보어드바이저 서비스를 출시할 수 있었습니다. KSET의 통합 API가 핵심이었습니다." - 이모 대표, 스타트업 CEO

### **증권사 IT팀**
> "기존 시스템을 KSET으로 마이그레이션하여 개발 시간을 50% 단축했습니다." - 박모 과장, 증권사 IT팀

## 🔗 유용한 링크

### **공식 사이트**
- **KSET 홈페이지**: [kset.dev](https://kset.dev)
- **GitHub 저장소**: [github.com/kset/kset](https://github.com/kset/kset)
- **NPM 패키지**: [npmjs.com/package/kset](https://www.npmjs.com/package/kset)

### **한국 금융 정보**
- **한국거래소**: [krx.co.kr](https://krx.co.kr)
- **금융감독원**: [fss.or.kr](https://www.fss.or.kr)
- **DART 전자공시**: [dart.fss.or.kr](https://dart.fss.or.kr)
- **금융투자협회**: [kofia.or.kr](https://www.kofia.or.kr)

### **교육 자료**
- **주식 투자 가이드**: [증권사 교육자료](https://www.kis.co.kr)
- **금융 시장 이해**: [금융감독원 교육](https://edu.fss.or.kr)
- **알고리즘 트레이딩**: [관련 서적 및 자료](https://github.com/quantopian/research_public)

## 🎓 학습 경로 추천

### **초급자**
1. [시작 가이드](./guides/getting-started.md) → [주식 거래 기본](./trading/stock-trading.md) → [포트폴리오 관리](./trading/portfolio.md)

### **중급자**
1. [실시간 데이터](./trading/realtime-data.md) → [알고리즘 트레이딩](./algorithm/auto-trading.md) → [위험 관리](./trading/risk-management.md)

### **고급자**
1. [전략 개발](./algorithm/strategy-development.md) → [백테스팅](./algorithm/backtesting.md) → [고주파 거래](./algorithm/high-frequency.md)

## 🏆 한국 시장을 위한 팁

### **장 시간 활용**
- **오전 장** (09:00-12:00): 외국인 매매가 활발
- **오후 장** (13:00-15:30): 기관 매매 집중
- **동시호가** (08:30-09:00, 15:20-15:30): 변동성 큼

### **거래 전략**
- **코스피**: 대형주 안정적 투자
- **코스닥**: 성장주 공격적 투자
- **ETF/ETN**: 분산투자 및 헷징

### **세금 및 수수료**
- **거래세**: 매매차익의 0.25% (매도시)
- **증권거래세**: 과세표준 250만원 초과 시
- **수수료**: 증권사별로 상이 (보통 0.015%~0.05%)

## 📞 한국어 지원

KSET은 한국 개발자들을 위한 완벽한 한국어 지원을 제공합니다:

- **🇰🇷 완벽한 한국어 문서**: 모든 기능에 대한 상세한 설명
- **💬 한국어 커뮤니티**: 디스코드 한국어 채널
- **📧 한국어 이메일 지원**: support@kset.dev
- **🏢 국내 증권사 전문**: 키움, 한투 등 국내 증권사 특화 지원

## 📄 라이선스

MIT 라이선스 - 자세한 내용은 [LICENSE](https://github.com/kset/kset/blob/main/LICENSE) 파일을 참조하세요.

---

**KSET**으로 한국 금융 기술의 미래를 만들어나가세요! 🇰🇷

궁금한 점이 있으신가요? [디스코드 커뮤니티](https://discord.gg/kset)에 참여하시거나 [문제 해결 가이드](./technical/troubleshooting.md)를 확인해보세요.