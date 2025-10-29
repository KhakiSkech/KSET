/**
 * Unit tests for KoreanMarketEngine
 */

import { KoreanMarketEngine } from '../../../src/engines/KoreanMarketEngine';
import { KSETErrorFactory, ERROR_CODES } from '../../../src/errors';

describe('KoreanMarketEngine', () => {
  let marketEngine: KoreanMarketEngine;

  beforeEach(() => {
    marketEngine = new KoreanMarketEngine();
  });

  describe('Market Hours', () => {
    it('should check if market is open during trading hours', () => {
      // Create a time during market hours (10:00 AM on a weekday)
      const marketTime = new Date(2024, 0, 15, 10, 0, 0); // Monday 10:00 AM
      jest.spyOn(Date, 'now').mockReturnValue(marketTime.getTime());

      expect(marketEngine.isMarketOpen()).toBe(true);
    });

    it('should check if market is closed before trading hours', () => {
      // Create a time before market hours (8:00 AM)
      const beforeMarketTime = new Date(2024, 0, 15, 8, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(beforeMarketTime.getTime());

      expect(marketEngine.isMarketOpen()).toBe(false);
    });

    it('should check if market is closed after trading hours', () => {
      // Create a time after market hours (4:00 PM)
      const afterMarketTime = new Date(2024, 0, 15, 16, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(afterMarketTime.getTime());

      expect(marketEngine.isMarketOpen()).toBe(false);
    });

    it('should check if market is closed on weekends', () => {
      // Create a time on Saturday
      const saturdayTime = new Date(2024, 0, 13, 10, 0, 0); // Saturday 10:00 AM
      jest.spyOn(Date, 'now').mockReturnValue(saturdayTime.getTime());

      expect(marketEngine.isMarketOpen()).toBe(false);
    });

    it('should check if market is closed on holidays', () => {
      // Test with Lunar New Year holiday
      const lunarNewYear = new Date(2024, 1, 12, 10, 0, 0); // Monday (Lunar New Year)
      jest.spyOn(Date, 'now').mockReturnValue(lunarNewYear.getTime());

      expect(marketEngine.isMarketOpen()).toBe(false);
    });

    it('should get market status with detailed information', () => {
      const marketTime = new Date(2024, 0, 15, 10, 0, 0);
      jest.spyOn(Date, 'now').mockReturnValue(marketTime.getTime());

      const status = marketEngine.getMarketStatus();

      expect(status.isOpen).toBe(true);
      expect(status.market).toBe('KOSPI');
      expect(status.currentTime).toBeInstanceOf(Date);
      expect(status.openTime).toBe('09:00');
      expect(status.closeTime).toBe('15:30');
      expect(status.breakStart).toBe('12:00');
      expect(status.breakEnd).toBe('13:00');
      expect(status.nextOpenTime).toBeInstanceOf(Date);
      expect(status.timeUntilOpen).toBeGreaterThanOrEqual(0);
      expect(status.timeUntilClose).toBeGreaterThanOrEqual(0);
    });

    it('should handle lunch break correctly', () => {
      // Create a time during lunch break (12:30 PM)
      const lunchTime = new Date(2024, 0, 15, 12, 30, 0);
      jest.spyOn(Date, 'now').mockReturnValue(lunchTime.getTime());

      expect(marketEngine.isMarketOpen()).toBe(false);

      const status = marketEngine.getMarketStatus();
      expect(status.isLunchBreak).toBe(true);
    });
  });

  describe('Market Types', () => {
    it('should identify KOSPI market correctly', () => {
      const kospiStocks = ['005930', '000660', '035420', '051910'];

      kospiStocks.forEach(symbol => {
        expect(marketEngine.getMarketType(symbol)).toBe('KOSPI');
      });
    });

    it('should identify KOSDAQ market correctly', () => {
      const kosdaqStocks = ['068270', '035720', '251270', '247540'];

      kosdaqStocks.forEach(symbol => {
        expect(marketEngine.getMarketType(symbol)).toBe('KOSDAQ');
      });
    });

    it('should identify KONEX market correctly', () => {
      const konexStocks = ['258270', '900110', '900260'];

      konexStocks.forEach(symbol => {
        expect(marketEngine.getMarketType(symbol)).toBe('KONEX');
      });
    });

    it('should handle unknown symbols', () => {
      const unknownSymbol = '999999';
      expect(marketEngine.getMarketType(unknownSymbol)).toBe('UNKNOWN');
    });

    it('should validate symbol format', () => {
      expect(marketEngine.isValidSymbol('005930')).toBe(true);
      expect(marketEngine.isValidSymbol('000660')).toBe(true);
      expect(marketEngine.isValidSymbol('068270')).toBe(true);
      expect(marketEngine.isValidSymbol('251270')).toBe(true);

      expect(marketEngine.isValidSymbol('00593')).toBe(false); // Too short
      expect(marketEngine.isValidSymbol('0059300')).toBe(false); // Too long
      expect(marketEngine.isValidSymbol('A05930')).toBe(false); // Contains letter
      expect(marketEngine.isValidSymbol('')).toBe(false); // Empty
      expect(marketEngine.isValidSymbol(null as any)).toBe(false); // Null
    });
  });

  describe('Trading Rules', () => {
    it('should validate order quantity for different markets', () => {
      // KOSPI - should be multiple of 10, minimum 10
      expect(marketEngine.isValidOrderQuantity('005930', 10)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('005930', 20)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('005930', 100)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('005930', 5)).toBe(false); // Not multiple of 10
      expect(marketEngine.isValidOrderQuantity('005930', 0)).toBe(false); // Zero

      // KOSDAQ - should be multiple of 1, minimum 1
      expect(marketEngine.isValidOrderQuantity('068270', 1)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('068270', 10)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('068270', 15)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('068270', 0)).toBe(false); // Zero

      // KONEX - should be multiple of 100, minimum 100
      expect(marketEngine.isValidOrderQuantity('258270', 100)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('258270', 200)).toBe(true);
      expect(marketEngine.isValidOrderQuantity('258270', 50)).toBe(false); // Not multiple of 100
    });

    it('should validate order price', () => {
      // Test price range for KOSPI (typically 100 - 1,000,000 KRW)
      expect(marketEngine.isValidOrderPrice('005930', 50000)).toBe(true);
      expect(marketEngine.isValidOrderPrice('005930', 100)).toBe(true);
      expect(marketEngine.isValidOrderPrice('005930', 1000000)).toBe(true);
      expect(marketEngine.isValidOrderPrice('005930', 50)).toBe(false); // Too low
      expect(marketEngine.isValidOrderPrice('005930', 2000000)).toBe(false); // Too high
      expect(marketEngine.isValidOrderPrice('005930', 0)).toBe(false); // Zero
      expect(marketEngine.isValidOrderPrice('005930', -1000)).toBe(false); // Negative
    });

    it('should calculate trading fees', () => {
      const orderValue = 1000000; // 1,000,000 KRW

      const fees = marketEngine.calculateTradingFees(orderValue);

      expect(fees).toHaveProperty('commission');
      expect(fees).toHaveProperty('tax');
      expect(fees).toHaveProperty('total');

      expect(fees.commission).toBeGreaterThan(0);
      expect(fees.tax).toBeGreaterThan(0);
      expect(fees.total).toBeGreaterThan(0);
      expect(fees.total).toBeLessThan(orderValue * 0.01); // Should be less than 1%
    });

    it('should calculate settlement date', () => {
      const tradeDate = new Date(2024, 0, 15, 10, 0, 0); // Monday
      jest.spyOn(Date, 'now').mockReturnValue(tradeDate.getTime());

      const settlementDate = marketEngine.getSettlementDate(tradeDate);

      // Settlement should be T+2 business days
      expect(settlementDate.getDay()).toBe(3); // Wednesday
      expect(settlementDate.getDate()).toBe(17);
    });

    it('should handle weekend in settlement date calculation', () => {
      const tradeDate = new Date(2024, 0, 11, 10, 0, 0); // Thursday
      jest.spyOn(Date, 'now').mockReturnValue(tradeDate.getTime());

      const settlementDate = marketEngine.getSettlementDate(tradeDate);

      // Thursday + 2 business days = Monday (skipping weekend)
      expect(settlementDate.getDay()).toBe(1); // Monday
      expect(settlementDate.getDate()).toBe(15);
    });
  });

  describe('Market Data Processing', () => {
    it('should normalize market data format', () => {
      const rawData = {
        symbol: '005930',
        name: '삼성전자',
        price: '85000',
        change: '-500',
        changeRate: '-0.58',
        volume: '12345678',
        market: 'KOSPI',
        timestamp: '20240115100000'
      };

      const normalizedData = marketEngine.normalizeMarketData(rawData);

      expect(normalizedData.symbol).toBe('005930');
      expect(normalizedData.price).toBe(85000);
      expect(normalizedData.change).toBe(-500);
      expect(normalizedData.changePercent).toBe(-0.58);
      expect(normalizedData.volume).toBe(12345678);
      expect(normalizedData.market).toBe('KOSPI');
      expect(normalizedData.timestamp).toBeInstanceOf(Date);
    });

    it('should validate market data completeness', () => {
      const validData = {
        symbol: '005930',
        price: 85000,
        volume: 1000000,
        timestamp: new Date()
      };

      expect(marketEngine.validateMarketData(validData)).toBe(true);

      const invalidData = {
        symbol: '', // Empty symbol
        price: -1000, // Negative price
        volume: 0 // Zero volume
      };

      expect(marketEngine.validateMarketData(invalidData)).toBe(false);
    });

    it('should calculate price change percentage', () => {
      const currentPrice = 85000;
      const previousPrice = 84500;

      const changePercent = marketEngine.calculatePriceChangePercent(
        currentPrice,
        previousPrice
      );

      expect(changePercent).toBeCloseTo(0.59, 2); // 0.59%
    });

    it('should handle zero previous price', () => {
      const currentPrice = 85000;
      const previousPrice = 0;

      expect(() => {
        marketEngine.calculatePriceChangePercent(currentPrice, previousPrice);
      }).toThrow();
    });
  });

  describe('Market Information', () => {
    it('should get market holidays for a year', () => {
      const holidays = marketEngine.getMarketHolidays(2024);

      expect(Array.isArray(holidays)).toBe(true);
      expect(holidays.length).toBeGreaterThan(0);

      holidays.forEach(holiday => {
        expect(holiday).toBeInstanceOf(Date);
        expect(holiday.getFullYear()).toBe(2024);
      });
    });

    it('should check if date is a market holiday', () => {
      const lunarNewYear = new Date(2024, 1, 12); // Lunar New Year
      expect(marketEngine.isMarketHoliday(lunarNewYear)).toBe(true);

      const regularDay = new Date(2024, 0, 16); // Regular Tuesday
      expect(marketEngine.isMarketHoliday(regularDay)).toBe(false);
    });

    it('should get market trading calendar', () => {
      const year = 2024;
      const calendar = marketEngine.getTradingCalendar(year);

      expect(calendar).toHaveProperty('year');
      expect(calendar.year).toBe(year);
      expect(calendar).toHaveProperty('holidays');
      expect(calendar).toHaveProperty('earlyClosings');
      expect(Array.isArray(calendar.holidays)).toBe(true);
      expect(Array.isArray(calendar.earlyClosings)).toBe(true);
    });

    it('should get market statistics', () => {
      const stats = marketEngine.getMarketStatistics();

      expect(stats).toHaveProperty('totalListedCompanies');
      expect(stats).toHaveProperty('kospiCount');
      expect(stats).toHaveProperty('kosdaqCount');
      expect(stats).toHaveProperty('konexCount');
      expect(stats).toHaveProperty('marketCapitalization');
      expect(stats).toHaveProperty('averagePER');
      expect(stats).toHaveProperty('averagePBR');
      expect(stats).toHaveProperty('updatedAt');

      expect(typeof stats.totalListedCompanies).toBe('number');
      expect(typeof stats.marketCapitalization).toBe('number');
      expect(stats.updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid symbol in market type detection', () => {
      expect(() => {
        marketEngine.getMarketType(null as any);
      }).not.toThrow();

      expect(marketEngine.getMarketType(null as any)).toBe('UNKNOWN');
    });

    it('should handle invalid date in settlement calculation', () => {
      expect(() => {
        marketEngine.getSettlementDate(null as any);
      }).toThrow();
    });

    it('should handle edge cases in price calculation', () => {
      expect(() => {
        marketEngine.calculatePriceChangePercent(0, 100);
      }).not.toThrow(); // Should return -100%
    });
  });

  describe('Market Events', () => {
    it('should detect market opening events', () => {
      const justBeforeOpen = new Date(2024, 0, 15, 8, 59, 59);
      const marketOpen = new Date(2024, 0, 15, 9, 0, 1);

      expect(marketEngine.isMarketOpeningEvent(justBeforeOpen, marketOpen)).toBe(true);
    });

    it('should detect market closing events', () => {
      const justBeforeClose = new Date(2024, 0, 15, 15, 29, 59);
      const marketClose = new Date(2024, 0, 15, 15, 30, 1);

      expect(marketEngine.isMarketClosingEvent(justBeforeClose, marketClose)).toBe(true);
    });

    it('should detect lunch break events', () => {
      const beforeLunch = new Date(2024, 0, 15, 11, 59, 59);
      const lunchBreak = new Date(2024, 0, 15, 12, 0, 1);

      expect(marketEngine.isLunchBreakEvent(beforeLunch, lunchBreak)).toBe(true);
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});