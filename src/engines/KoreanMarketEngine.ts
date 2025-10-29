/**
 * Korean Market Engine
 * Korea Stock Exchange Trading Library - Korea's Standard Trading Interface
 */

import {
  MarketType,
  MarketStatus,
  TradingHours,
  OrderRequest,
  ValidationResult,
  OrderType,
  TimeInForce
} from '@/types';

import {
  MarketInfo,
  Holiday
} from '@/interfaces';

import {
  KSETErrorFactory,
  ERROR_CODES
} from '@/errors';

import * as moment from 'moment-timezone';

/**
 * 한국 시장 엔진
 * KRX 시장 구조, 거래 규칙, 규제 준수 등을 처리
 */
export class KoreanMarketEngine {
  private readonly timezone = 'Asia/Seoul';
  private readonly marketStructure: Map<MarketType, MarketStructure>;
  private holidays: Holiday[] = [];
  private marketStatusCache = new Map<MarketType, { status: MarketStatus; cachedAt: Date }>();
  private readonly cacheTimeout = 60000; // 1분

  constructor() {
    this.marketStructure = this.initializeMarketStructure();
    this.loadMarketHolidays();
  }

  // ==========================================================================
  // MARKET STRUCTURE & RULES
  // ==========================================================================

  /**
   * 시장 구조 초기화
   */
  private initializeMarketStructure(): Map<MarketType, MarketStructure> {
    const structure = new Map<MarketType, MarketStructure>();

    // KOSPI 구조
    structure.set('KOSPI', {
      name: 'KOSPI',
      description: 'Korea Composite Stock Price Index',
      currency: 'KRW',
      tradingHours: {
        preMarket: { open: '08:30', close: '09:00' },
        regular: { open: '09:00', close: '15:30' },
        break: { start: '12:00', end: '13:00' },
        afterHours: { open: '15:30', close: '16:00' }
      },
      tickSizeRules: [
        { minPrice: 0, maxPrice: 1000, tickSize: 1 },
        { minPrice: 1000, maxPrice: 5000, tickSize: 5 },
        { minPrice: 5000, maxPrice: 10000, tickSize: 10 },
        { minPrice: 10000, maxPrice: 50000, tickSize: 50 },
        { minPrice: 50000, maxPrice: 100000, tickSize: 100 },
        { minPrice: 100000, maxPrice: 500000, tickSize: 500 },
        { minPrice: 500000, maxPrice: Infinity, tickSize: 1000 }
      ],
      priceLimits: {
        upperLimit: 30,  // +30%
        lowerLimit: -30, // -30%
        circuitBreaker: {
          level1: 20, // 20% halt
          level2: 25  // 25% halt
        }
      },
      boardLot: 1,
      settlementCycle: 'T+2'
    });

    // KOSDAQ 구조
    structure.set('KOSDAQ', {
      name: 'KOSDAQ',
      description: 'Korean Securities Dealers Automated Quotations',
      currency: 'KRW',
      tradingHours: {
        preMarket: { open: '08:30', close: '09:00' },
        regular: { open: '09:00', close: '15:30' },
        break: { start: '12:00', end: '13:00' },
        afterHours: { open: '15:30', close: '16:00' }
      },
      tickSizeRules: [
        { minPrice: 0, maxPrice: 5000, tickSize: 1 },
        { minPrice: 5000, maxPrice: 10000, tickSize: 5 },
        { minPrice: 10000, maxPrice: 50000, tickSize: 10 },
        { minPrice: 50000, maxPrice: 100000, tickSize: 50 },
        { minPrice: 100000, maxPrice: 500000, tickSize: 100 },
        { minPrice: 500000, maxPrice: Infinity, tickSize: 1000 }
      ],
      priceLimits: {
        upperLimit: 30,
        lowerLimit: -30,
        circuitBreaker: {
          level1: 20,
          level2: 25
        }
      },
      boardLot: 1,
      settlementCycle: 'T+2'
    });

    // KONEX 구조
    structure.set('KONEX', {
      name: 'KONEX',
      description: 'Korea New Exchange',
      currency: 'KRW',
      tradingHours: {
        regular: { open: '09:00', close: '15:30' },
        break: { start: '12:00', end: '13:00' }
      },
      tickSizeRules: [
        { minPrice: 0, maxPrice: 1000, tickSize: 1 },
        { minPrice: 1000, maxPrice: 5000, tickSize: 5 },
        { minPrice: 5000, maxPrice: 10000, tickSize: 10 },
        { minPrice: 10000, maxPrice: 50000, tickSize: 50 },
        { minPrice: 50000, maxPrice: Infinity, tickSize: 100 }
      ],
      priceLimits: {
        upperLimit: 30,
        lowerLimit: -30,
        circuitBreaker: {
          level1: 20,
          level2: 25
        }
      },
      boardLot: 1,
      settlementCycle: 'T+2'
    });

    return structure;
  }

  /**
   * 시장 정보 조회
   */
  getMarketInfo(market?: MarketType): MarketInfo {
    if (!market) {
      market = 'KOSPI'; // 기본값
    }

    const structure = this.marketStructure.get(market);
    if (!structure) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_MARKET,
        `Unsupported market: ${market}`
      );
    }

    return {
      name: structure.name,
      code: market,
      currency: structure.currency,
      timezone: this.timezone,
      tradingHours: structure.tradingHours,
      tickSize: structure.tickSizeRules[0].tickSize,
      priceLimits: structure.priceLimits,
      boardLot: structure.boardLot
    };
  }

  /**
   * 현재 시장 상태 조회
   */
  getMarketStatus(market: MarketType, dateTime: Date = new Date()): MarketStatus {
    const cacheKey = market;
    const cached = this.marketStatusCache.get(cacheKey);

    // 캐시 확인
    if (cached && (Date.now() - cached.cachedAt.getTime()) < this.cacheTimeout) {
      return cached.status;
    }

    const koreanTime = moment(dateTime).tz(this.timezone);
    const currentTime = koreanTime.format('HH:mm');
    const currentDay = koreanTime.day();

    // 주말 체크
    if (currentDay === 0 || currentDay === 6) { // 일요일(0) 또는 토요일(6)
      const status = 'holiday';
      this.updateStatusCache(market, status);
      return status;
    }

    // 휴장일 체크
    if (this.isMarketHoliday(dateTime)) {
      const status = 'holiday';
      this.updateStatusCache(market, status);
      return status;
    }

    const structure = this.marketStructure.get(market);
    if (!structure) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_MARKET,
        `Unsupported market: ${market}`
      );
    }

    const tradingHours = structure.tradingHours;

    // 장전 시간
    if (tradingHours.preMarket) {
      if (this.isTimeInRange(currentTime, tradingHours.preMarket.open, tradingHours.preMarket.close)) {
        const status = 'pre-market';
        this.updateStatusCache(market, status);
        return status;
      }
    }

    // 정규장 시간
    if (this.isTimeInRange(currentTime, tradingHours.regular.open, tradingHours.break?.start || tradingHours.regular.close)) {
      const status = 'regular';
      this.updateStatusCache(market, status);
      return status;
    }

    // 점심시간
    if (tradingHours.break && this.isTimeInRange(currentTime, tradingHours.break.start, tradingHours.break.end)) {
      const status = 'lunch-break';
      this.updateStatusCache(market, status);
      return status;
    }

    // 점심시간 이후 정규장
    if (tradingHours.break && this.isTimeInRange(currentTime, tradingHours.break.end, tradingHours.regular.close)) {
      const status = 'regular';
      this.updateStatusCache(market, status);
      return status;
    }

    // 장후 시간
    if (tradingHours.afterHours) {
      if (this.isTimeInRange(currentTime, tradingHours.afterHours.open, tradingHours.afterHours.close)) {
        const status = 'after-hours';
        this.updateStatusCache(market, status);
        return status;
      }
    }

    // 장 종료
    const status = 'closed';
    this.updateStatusCache(market, status);
    return status;
  }

  /**
   * 시장 개장 여부 확인
   */
  isMarketOpen(market: MarketType, dateTime: Date = new Date()): boolean {
    const status = this.getMarketStatus(market, dateTime);
    return status === 'regular' || status === 'pre-market' || status === 'after-hours';
  }

  /**
   * 다음 개장 시간 조회
   */
  getNextMarketOpen(market: MarketType, from: Date = new Date()): Date {
    const koreanTime = moment(from).tz(this.timezone);
    let nextOpen = koreanTime.clone();

    // 오늘 남은 개장 시간이 있는지 확인
    const todayStatus = this.getMarketStatus(market, from);
    if (todayStatus !== 'closed' && todayStatus !== 'holiday') {
      // 이미 개장 중이면 현재 시간 반환
      return from;
    }

    // 내일 09:00으로 설정
    nextOpen.add(1, 'day').hours(9).minutes(0).seconds(0).milliseconds(0);

    // 주말이면 다음 월요일로 조정
    while (nextOpen.day() === 0 || nextOpen.day() === 6) { // 일요일 또는 토요일
      nextOpen.add(1, 'day');
    }

    // 휴장일이면 다음 영업일로 조정
    while (this.isMarketHoliday(nextOpen.toDate())) {
      nextOpen.add(1, 'day');
    }

    return nextOpen.toDate();
  }

  /**
   * 현재가 기준 가격 제한 조회
   */
  getPriceLimits(symbol: string, currentPrice: number, market: MarketType): PriceLimits {
    const structure = this.marketStructure.get(market);
    if (!structure) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_MARKET,
        `Unsupported market: ${market}`
      );
    }

    const priceLimits = structure.priceLimits;
    const upperLimit = currentPrice * (1 + priceLimits.upperLimit / 100);
    const lowerLimit = currentPrice * (1 + priceLimits.lowerLimit / 100);

    return {
      upperLimit,
      lowerLimit,
      circuitBreaker: {
        level1: currentPrice * (1 + priceLimits.circuitBreaker.level1 / 100),
        level2: currentPrice * (1 + priceLimits.circuitBreaker.level2 / 100)
      },
      currentPrice,
      limitPercentage: priceLimits
    };
  }

  // ==========================================================================
  // ORDER VALIDATION
  // ==========================================================================

  /**
   * 주문 유효성 검증
   */
  validateOrder(order: OrderRequest, market: MarketType, currentPrice?: number): ValidationResult {
    // 1. 시장 상태 확인
    const marketStatus = this.getMarketStatus(market);
    if (!this.isMarketOpen(market)) {
      return {
        valid: false,
        error: `Market is ${marketStatus}. Trading is not allowed.`,
        errorCode: ERROR_CODES.MARKET_CLOSED
      };
    }

    // 2. 가격 유효성 검증
    if (order.price) {
      const priceValidation = this.validatePrice(order.price, market);
      if (!priceValidation.valid) {
        return priceValidation;
      }
    }

    // 3. 가격 제한 검증
    if (order.price && currentPrice) {
      const priceLimits = this.getPriceLimits(order.symbol, currentPrice, market);
      if (order.price > priceLimits.upperLimit || order.price < priceLimits.lowerLimit) {
        return {
          valid: false,
          error: `Order price ${order.price} is outside price limits (${priceLimits.lowerLimit} - ${priceLimits.upperLimit})`,
          errorCode: ERROR_CODES.PRICE_LIMIT_VIOLATION,
          details: { priceLimits }
        };
      }
    }

    // 4. 주문 수량 검증
    const quantityValidation = this.validateQuantity(order.quantity, market);
    if (!quantityValidation.valid) {
      return quantityValidation;
    }

    // 5. 주문 유형 검증
    const orderTypeValidation = this.validateOrderType(order.orderType, market);
    if (!orderTypeValidation.valid) {
      return orderTypeValidation;
    }

    // 6. 유효기간 검증
    if (order.timeInForce) {
      const tifValidation = this.validateTimeInForce(order.timeInForce, market);
      if (!tifValidation.valid) {
        return tifValidation;
      }
    }

    return { valid: true };
  }

  /**
   * 가격 유효성 검증
   */
  private validatePrice(price: number, market: MarketType): ValidationResult {
    if (price <= 0) {
      return {
        valid: false,
        error: 'Price must be greater than 0',
        errorCode: ERROR_CODES.INVALID_ORDER
      };
    }

    const structure = this.marketStructure.get(market);
    if (!structure) {
      return {
        valid: false,
        error: `Unsupported market: ${market}`,
        errorCode: ERROR_CODES.INVALID_MARKET
      };
    }

    // 최소 가격 단위 검증
    const tickSize = this.getTickSize(price, market);
    if (price % tickSize !== 0) {
      return {
        valid: false,
        error: `Price must be a multiple of tick size ${tickSize}`,
        errorCode: ERROR_CODES.INVALID_ORDER,
        details: { price, tickSize }
      };
    }

    return { valid: true };
  }

  /**
   * 수량 유효성 검증
   */
  private validateQuantity(quantity: number, market: MarketType): ValidationResult {
    if (quantity <= 0) {
      return {
        valid: false,
        error: 'Quantity must be greater than 0',
        errorCode: ERROR_CODES.INVALID_ORDER
      };
    }

    const structure = this.marketStructure.get(market);
    if (!structure) {
      return {
        valid: false,
        error: `Unsupported market: ${market}`,
        errorCode: ERROR_CODES.INVALID_MARKET
      };
    }

    // 거래 단위 검증
    if (quantity % structure.boardLot !== 0) {
      return {
        valid: false,
        error: `Quantity must be a multiple of board lot ${structure.boardLot}`,
        errorCode: ERROR_CODES.INVALID_ORDER,
        details: { quantity, boardLot: structure.boardLot }
      };
    }

    return { valid: true };
  }

  /**
   * 주문 유형 유효성 검증
   */
  private validateOrderType(orderType: OrderType, market: MarketType): ValidationResult {
    const structure = this.marketStructure.get(market);
    if (!structure) {
      return {
        valid: false,
        error: `Unsupported market: ${market}`,
        errorCode: ERROR_CODES.INVALID_MARKET
      };
    }

    // KONEX은 일부 주문 유형 제한
    if (market === 'KONEX') {
      const restrictedTypes = ['STOP', 'STOP_LIMIT', 'ICEBERG', 'TIME_IN_FORCE'];
      if (restrictedTypes.includes(orderType)) {
        return {
          valid: false,
          error: `Order type ${orderType} is not supported in KONEX market`,
          errorCode: ERROR_CODES.INVALID_ORDER
        };
      }
    }

    return { valid: true };
  }

  /**
   * 유효기간 유효성 검증
   */
  private validateTimeInForce(timeInForce: TimeInForce, market: MarketType): ValidationResult {
    // KONEX은 GTC, GTD 미지원
    if (market === 'KONEX') {
      if (timeInForce === 'GTC' || timeInForce === 'GTD') {
        return {
          valid: false,
          error: `Time in force ${timeInForce} is not supported in KONEX market`,
          errorCode: ERROR_CODES.INVALID_ORDER
        };
      }
    }

    return { valid: true };
  }

  // ==========================================================================
  // TICK SIZE & CALCULATIONS
  // ==========================================================================

  /**
   * 가격별 최소 호가 단위 조회
   */
  getTickSize(price: number, market: MarketType): number {
    const structure = this.marketStructure.get(market);
    if (!structure) {
      throw KSETErrorFactory.create(
        ERROR_CODES.INVALID_MARKET,
        `Unsupported market: ${market}`
      );
    }

    for (const rule of structure.tickSizeRules) {
      if (price >= rule.minPrice && price < rule.maxPrice) {
        return rule.tickSize;
      }
    }

    return structure.tickSizeRules[structure.tickSizeRules.length - 1].tickSize;
  }

  /**
   * 호가 단위에 맞게 가격 조정
   */
  adjustPriceToTickSize(price: number, market: MarketType, direction: 'up' | 'down' | 'nearest' = 'nearest'): number {
    const tickSize = this.getTickSize(price, market);
    const adjustedPrice = Math.round(price / tickSize) * tickSize;

    switch (direction) {
      case 'up':
        return adjustedPrice >= price ? adjustedPrice : adjustedPrice + tickSize;
      case 'down':
        return adjustedPrice <= price ? adjustedPrice : adjustedPrice - tickSize;
      case 'nearest':
      default:
        return adjustedPrice;
    }
  }

  /**
   * 수수료 계산
   */
  calculateCommission(tradeValue: number, market: MarketType, orderType: OrderType): CommissionCalculation {
    // 기본 수수료율
    let commissionRate = 0.00015; // 0.015% (기본)
    let minimumCommission = 100; // 최소 수수료

    // KOSPI/KOSDAQ 우선주 수수료율
    // TODO: 실제 수수료 정책에 맞게 수정 필요

    // 계산
    const commission = Math.max(tradeValue * commissionRate, minimumCommission);

    return {
      commissionRate,
      commission,
      minimumCommission,
      tradeValue,
      market
    };
  }

  /**
   * 증권거래세 계산
   */
  calculateSecuritiesTransactionTax(sellValue: number, isPreferred: boolean, market: MarketType): TaxCalculation {
    // 매도 세금 (증권거래세)
    let taxRate = 0.0025; // 0.25% (기본)

    // KOSDAQ 우선주 및 중소·중견기업 우대
    if (market === 'KOSDAQ' && isPreferred) {
      taxRate = 0.0020; // 0.20%
    }

    // TODO: 실제 세금 정책에 맞게 수정 필요

    const tax = sellValue * taxRate;

    return {
      taxRate,
      tax,
      taxableAmount: sellValue,
      taxType: 'securities-transaction-tax',
      market
    };
  }

  // ==========================================================================
  // HOLIDAY MANAGEMENT
  // ==========================================================================

  /**
   * 시장 휴장일 로드
   */
  private loadMarketHolidays(): void {
    const currentYear = new Date().getFullYear();
    this.holidays = this.generateMarketHolidays(currentYear);
  }

  /**
   * 휴장일 생성
   */
  private generateMarketHolidays(year: number): Holiday[] {
    const holidays: Holiday[] = [];

    // 고정 휴장일
    const fixedHolidays = [
      { month: 0, day: 1, name: '신정' }, // 1월 1일
      { month: 2, day: 1, name: '삼일절' }, // 3월 1일
      { month: 4, day: 5, name: '어린이날' }, // 5월 5일
      { month: 5, day: 6, name: '현충일' }, // 6월 6일
      { month: 7, day: 15, name: '광복절' }, // 8월 15일
      { month: 9, day: 3, name: '개천절' }, // 10월 3일
      { month: 11, day: 25, name: '성탄절' }, // 12월 25일
    ];

    for (const holiday of fixedHolidays) {
      const date = new Date(year, holiday.month, holiday.day);
      // 주말이면 평일로 대체 (대체공휴일)
      if (date.getDay() === 0) { // 일요일
        date.setDate(date.getDate() + 1); // 다음 날로 대체
      } else if (date.getDay() === 6) { // 토요일
        date.setDate(date.getDate() + 2); // 다음 다음 날로 대체
      }

      holidays.push({
        date,
        name: holiday.name,
        type: 'holiday',
        isBusinessDay: false
      });
    }

    // 설날, 추석 등 음력 휴장일
    // TODO: 음력 휴장일 계산 로직 추가 필요

    // 대체공휴일 처리를 위한 주말 제거
    return holidays.filter(holiday => holiday.date.getDay() !== 0 && holiday.date.getDay() !== 6);
  }

  /**
   * 휴장일 여부 확인
   */
  isMarketHoliday(date: Date): boolean {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    return this.holidays.some(holiday => {
      const holidayDate = new Date(holiday.date);
      holidayDate.setHours(0, 0, 0, 0);
      return holidayDate.getTime() === checkDate.getTime();
    });
  }

  /**
   * 휴장일 정보 조회
   */
  getMarketHolidays(year: number, month?: number): Holiday[] {
    let holidays = this.holidays.filter(holiday => holiday.date.getFullYear() === year);

    if (month !== undefined) {
      holidays = holidays.filter(holiday => holiday.date.getMonth() === month);
    }

    return holidays.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * 시간 범위 확인
   */
  private isTimeInRange(currentTime: string, startTime: string, endTime: string): boolean {
    const [currentHour, currentMinute] = currentTime.split(':').map(Number);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    const [endHour, endMinute] = endTime.split(':').map(Number);

    const currentMinutes = currentHour * 60 + currentMinute;
    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;

    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  /**
   * 상태 캐시 업데이트
   */
  private updateStatusCache(market: MarketType, status: MarketStatus): void {
    this.marketStatusCache.set(market, {
      status,
      cachedAt: new Date()
    });
  }

  /**
   * 캐시 만료 처리
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    for (const [market, cached] of this.marketStatusCache.entries()) {
      if (now - cached.cachedAt.getTime() > this.cacheTimeout) {
        this.marketStatusCache.delete(market);
      }
    }
  }

  /**
   * 한국 시간으로 변환
   */
  toKoreanTime(date: Date): Date {
    return moment(date).tz(this.timezone).toDate();
  }

  /**
   * 한국 시간 문자열로 변환
   */
  toKoreanTimeString(date: Date, format: string = 'YYYY-MM-DD HH:mm:ss'): string {
    return moment(date).tz(this.timezone).format(format);
  }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface MarketStructure {
  name: string;
  description: string;
  currency: string;
  tradingHours: TradingHours;
  tickSizeRules: TickSizeRule[];
  priceLimits: PriceLimitConfig;
  boardLot: number;
  settlementCycle: string;
}

interface TickSizeRule {
  minPrice: number;
  maxPrice: number;
  tickSize: number;
}

interface PriceLimitConfig {
  upperLimit: number;
  lowerLimit: number;
  circuitBreaker: {
    level1: number;
    level2: number;
  };
}

interface PriceLimits {
  upperLimit: number;
  lowerLimit: number;
  circuitBreaker: {
    level1: number;
    level2: number;
  };
  currentPrice: number;
  limitPercentage: PriceLimitConfig;
}

interface CommissionCalculation {
  commissionRate: number;
  commission: number;
  minimumCommission: number;
  tradeValue: number;
  market: MarketType;
}

interface TaxCalculation {
  taxRate: number;
  tax: number;
  taxableAmount: number;
  taxType: string;
  market: MarketType;
}