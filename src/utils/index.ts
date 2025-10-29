/**
 * KSET Utilities
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 *
 * 공통 유틸리티 함수들을 제공합니다.
 */

// ============================================================================
// DATA TRANSFORMATION UTILITIES
// ============================================================================

/**
 * 숫자를 한국 금액 형식으로 변환
 */
export function formatKoreanCurrency(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * 숫자를 한국식 표기법으로 변환 (만, 억, 조)
 */
export function formatKoreanNumber(num: number): string {
  if (num < 10000) {
    return num.toLocaleString('ko-KR');
  }

  const units = ['', '만', '억', '조', '경'];
  let result = '';
  let unitIndex = 0;

  while (num >= 1 && unitIndex < units.length) {
    const remainder = num % 10000;
    if (remainder > 0) {
      result = `${remainder.toLocaleString('ko-KR')}${units[unitIndex]} ${result}`;
    }
    num = Math.floor(num / 10000);
    unitIndex++;
  }

  return result.trim();
}

/**
 * 퍼센트 포맷팅
 */
export function formatPercentage(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 가격 포맷팅
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('ko-KR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * 수량 포맷팅
 */
export function formatQuantity(quantity: number): string {
  return quantity.toLocaleString('ko-KR');
}

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

/**
 * 종목 코드 유효성 검증
 */
export function validateStockCode(code: string): boolean {
  // 6자리 숫자 (대체 가능한 형식도 고려)
  const stockCodePattern = /^[0-9]{6}$/;
  return stockCodePattern.test(code);
}

/**
 * 계좌번호 유효성 검증
 */
export function validateAccountNumber(accountNumber: string): boolean {
  // XXXXXX-XX 또는 XXXXXX-XX-XX 형식
  const accountPattern = /^[0-9]{6}-[0-9]{2}(-[0-9]{2})?$/;
  return accountPattern.test(accountNumber);
}

/**
 * 사업자등록번호 유효성 검증
 */
export function validateBusinessNumber(businessNumber: string): boolean {
  // XXX-XX-XXXXX 형식
  const businessPattern = /^[0-9]{3}-[0-9]{2}-[0-9]{5}$/;
  return businessPattern.test(businessNumber);
}

/**
 * 이메일 유효성 검증
 */
export function validateEmail(email: string): boolean {
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email);
}

/**
 * 전화번호 유효성 검증 (한국)
 */
export function validateKoreanPhoneNumber(phone: string): boolean {
  // 하이픈 제거
  const cleanPhone = phone.replace(/-/g, '');

  // 010으로 시작하는 11자리 또는 01X으로 시작하는 10-11자리
  const phonePattern = /^01[016789][0-9]{7,8}$/;
  return phonePattern.test(cleanPhone);
}

// ============================================================================
// TIME & DATE UTILITIES
// ============================================================================

/**
 * 한국 시간으로 변환
 */
export function toKoreanTime(date: Date): Date {
  return new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
}

/**
 * 한국 시간 문자열로 변환
 */
export function toKoreanTimeString(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
  const koreanTime = toKoreanTime(date);

  // 간단한 날짜 포맷팅 (moment 없이)
  const year = koreanTime.getFullYear();
  const month = String(koreanTime.getMonth() + 1).padStart(2, '0');
  const day = String(koreanTime.getDate()).padStart(2, '0');
  const hours = String(koreanTime.getHours()).padStart(2, '0');
  const minutes = String(koreanTime.getMinutes()).padStart(2, '0');
  const seconds = String(koreanTime.getSeconds()).padStart(2, '0');

  return format
    .replace('YYYY', String(year))
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes)
    .replace('ss', seconds);
}

/**
 * 장 운영 시간 여부 확인
 */
export function isMarketHours(date: Date = new Date()): boolean {
  const koreanTime = toKoreanTime(date);
  const hours = koreanTime.getHours();
  const minutes = koreanTime.getMinutes();
  const day = koreanTime.getDay();

  // 주말 제외
  if (day === 0 || day === 6) {
    return false;
  }

  // 09:00 - 15:30 (점심시간 포함)
  const currentMinutes = hours * 60 + minutes;
  const openMinutes = 9 * 60; // 09:00
  const closeMinutes = 15 * 60 + 30; // 15:30

  return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
}

/**
 * 다음 영업일 계산
 */
export function getNextBusinessDay(date: Date = new Date()): Date {
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  // 주말이면 다음 월요일로
  while (nextDay.getDay() === 0 || nextDay.getDay() === 6) {
    nextDay.setDate(nextDay.getDate() + 1);
  }

  // TODO: 공휴일 확인 필요
  return nextDay;
}

/**
 * 날짜 차이 계산 (영업일 기준)
 */
export function getBusinessDaysBetween(startDate: Date, endDate: Date): number {
  let businessDays = 0;
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // 주말 제외
      businessDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return businessDays;
}

// ============================================================================
// STOCK CALCULATION UTILITIES
// ============================================================================

/**
 * 틱 사이즈 계산
 */
export function calculateTickSize(price: number, market: 'KOSPI' | 'KOSDAQ' | 'KONEX' = 'KOSPI'): number {
  if (market === 'KOSPI') {
    if (price < 1000) return 1;
    if (price < 5000) return 5;
    if (price < 10000) return 10;
    if (price < 50000) return 50;
    if (price < 100000) return 100;
    if (price < 500000) return 500;
    return 1000;
  } else if (market === 'KOSDAQ') {
    if (price < 5000) return 1;
    if (price < 10000) return 5;
    if (price < 50000) return 10;
    if (price < 100000) return 50;
    if (price < 500000) return 100;
    return 1000;
  } else { // KONEX
    if (price < 1000) return 1;
    if (price < 5000) return 5;
    if (price < 10000) return 10;
    if (price < 50000) return 50;
    return 100;
  }
}

/**
 * 가격 제한 계산
 */
export function calculatePriceLimits(currentPrice: number, limitPercent: number = 30): {
  upperLimit: number;
  lowerLimit: number;
} {
  const upperLimit = currentPrice * (1 + limitPercent / 100);
  const lowerLimit = currentPrice * (1 - limitPercent / 100);

  return {
    upperLimit: Math.round(upperLimit),
    lowerLimit: Math.round(lowerLimit)
  };
}

/**
 * 수익률 계산
 */
export function calculateReturnRate(
  currentValue: number,
  originalValue: number
): {
  rate: number;
  isProfit: boolean;
} {
  if (originalValue === 0) {
    return { rate: 0, isProfit: true };
  }

  const rate = ((currentValue - originalValue) / originalValue) * 100;
  return {
    rate: Math.round(rate * 100) / 100, // 소수점 2자리까지
    isProfit: rate >= 0
  };
}

/**
 * 변동률 계산
 */
export function calculateChangeRate(
  currentPrice: number,
  previousPrice: number
): {
  amount: number;
  rate: number;
  isUp: boolean;
} {
  const amount = currentPrice - previousPrice;
  const rate = previousPrice === 0 ? 0 : (amount / previousPrice) * 100;

  return {
    amount,
    rate: Math.round(rate * 100) / 100, // 소수점 2자리까지
    isUp: amount > 0
  };
}

/**
 * 총평가금액 계산
 */
export function calculateTotalValue(quantity: number, price: number): number {
  return quantity * price;
}

/**
 * 평균 단가 계산
 */
export function calculateAveragePrice(
  totalValue: number,
  totalQuantity: number
): number {
  if (totalQuantity === 0) return 0;
  return totalValue / totalQuantity;
}

// ============================================================================
// TAX CALCULATION UTILITIES
// ============================================================================

/**
 * 증권거래세 계산
 */
export function calculateSecuritiesTransactionTax(
  sellValue: number,
  isKosdaqPreferred: boolean = false
): number {
  const taxRate = isKosdaqPreferred ? 0.002 : 0.0025; // 0.2% or 0.25%
  return Math.round(sellValue * taxRate);
}

/**
 * 양도소득세 계산
 */
export function calculateCapitalGainsTax(
  gains: number,
  holdingPeriodDays: number,
  isMajorShareholder: boolean = false
): number {
  let taxRate: number;

  if (isMajorShareholder) {
    taxRate = 0.3; // 30%
  } else if (holdingPeriodDays >= 365) {
    taxRate = 0.2; // 20%
  } else {
    taxRate = 0.22; // 22%
  }

  // 소액 과세 면제 (연간 250만원 이하)
  if (gains <= 2500000) {
    return 0;
  }

  return Math.round(gains * taxRate);
}

// ============================================================================
// STRING UTILITIES
// ============================================================================

/**
 * 문자열에서 숫자만 추출
 */
export function extractNumbers(str: string): string {
  return str.replace(/[^0-9]/g, '');
}

/**
 * 종목명에서 괄호 내용 제거
 */
export function cleanStockName(name: string): string {
  return name.replace(/\s*\([^)]*\)/g, '').trim();
}

/**
 * 종목 코드 포맷팅
 */
export function formatStockCode(code: string): string {
  // 숫자만 추출하여 6자리로 포맷팅
  const numbers = extractNumbers(code);
  return numbers.padStart(6, '0');
}

/**
 * 계좌번호 포맷팅
 */
export function formatAccountNumber(accountNumber: string): string {
  const numbers = extractNumbers(accountNumber);

  if (numbers.length <= 6) {
    return numbers;
  } else if (numbers.length <= 8) {
    return `${numbers.slice(0, 6)}-${numbers.slice(6)}`;
  } else {
    return `${numbers.slice(0, 6)}-${numbers.slice(6, 8)}-${numbers.slice(8, 10)}`;
  }
}

// ============================================================================
// ASYNC UTILITIES
// ============================================================================

/**
 * 비동기 함수 지연 실행
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 비동기 함수 재시도
 */
export async function retryAsync<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxAttempts) {
        break;
      }

      await delay(delayMs * attempt);
    }
  }

  throw lastError!;
}

/**
 * 비동기 함수 타임아웃
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

// ============================================================================
// CACHING UTILITIES
// ============================================================================

/**
 * 간단한 메모리 캐시
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiresAt: number }>();

  constructor(private defaultTtl: number = 60000) {} // 1분

  set(key: string, value: T, ttl?: number): void {
    const expiresAt = Date.now() + (ttl || this.defaultTtl);
    this.cache.set(key, { value, expiresAt });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // 만료된 항목 정리
  cleanup(): number {
    const now = Date.now();
    let deletedCount = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        deletedCount++;
      }
    }

    return deletedCount;
  }

  size(): number {
    return this.cache.size;
  }
}

// ============================================================================
// ENCRYPTION UTILITIES (Basic)
// ============================================================================

/**
 * 간단한 문자열 인코딩 (Base64)
 */
export function encodeBase64(str: string): string {
  return Buffer.from(str, 'utf8').toString('base64');
}

/**
 * 간단한 문자열 디코딩 (Base64)
 */
export function decodeBase64(encoded: string): string {
  return Buffer.from(encoded, 'base64').toString('utf8');
}

/**
 * 해시 함수 (간단한 용도)
 */
export function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // 32비트 정수로 변환
  }
  return hash.toString(36);
}

// ============================================================================
// TYPE GUARD UTILITIES
// ============================================================================

/**
 * 객체가 null/undefined이 아닌지 확인
 */
export function isNotNull<T>(value: T | null | undefined): value is T {
  return value != null;
}

/**
 * 문자열이 비어있지 않은지 확인
 */
export function isNotEmptyString(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * 배열이 비어있지 않은지 확인
 */
export function isNotEmptyArray<T>(value: T[] | null | undefined): value is T[] {
  return Array.isArray(value) && value.length > 0;
}

/**
 * 숫자인지 확인
 */
export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * 날짜인지 확인
 */
export function isDate(value: any): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}