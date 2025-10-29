# Trading Hours & Market Sessions

Understanding Korean market trading hours is essential for building successful trading applications. This guide covers all trading sessions, holidays, and special considerations for Korean securities markets.

## 🕐 Regular Trading Hours

### **Standard Market Hours (Monday - Friday)**

| Session | Time (KST) | Description | Available Operations |
|---------|------------|-------------|---------------------|
| **Pre-market** | 08:30 - 09:00 | Opening auction | Order placement/cancellation |
| **Morning Session** | 09:00 - 12:00 | Regular trading | Full trading operations |
| **Lunch Break** | 12:00 - 13:00 | Market closed | No trading |
| **Afternoon Session** | 13:00 - 15:30 | Regular trading | Full trading operations |
| **After-hours** | 15:30 - 16:00 | Closing auction | Limited operations |

### **Extended Hours for ETFs**
```
ETF Trading: 09:00 - 16:00 KST
Regular Stocks: 09:00 - 15:30 KST
```

## 📊 Market Session Details

### **Pre-market Session (08:30-09:00)**

**Purpose:**
- Opening price determination
- Pre-market order collection
- Imbalance calculation

**Available Operations:**
- ✅ Order placement
- ✅ Order cancellation
- ✅ Order modification
- ❌ Trade execution (only at 09:00)

**Characteristics:**
- **Single-price auction** at 09:00
- **No partial executions** during session
- **Order book** builds continuously
- **Opening price** calculated at end

**Example Code:**
```typescript
import { KSET } from 'kset';

const kset = new KSET({ /* config */ });

async function preMarketTrading() {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  // Pre-market: 8:30 AM = 8 * 60 + 30 = 510 minutes
  if (currentTime >= 510 && currentTime < 540) {
    console.log('📅 Pre-market session active');

    // Place pre-market orders
    const order = await kset.createOrder({
      symbol: '005930',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 10,
      price: 80000
    });

    console.log('Pre-market order placed:', order.id);
  }
}
```

### **Regular Session (09:00-12:00, 13:00-15:30)**

**Purpose:**
- Continuous double auction trading
- Real-time price discovery
- Liquidity provision

**Available Operations:**
- ✅ All order types
- ✅ Real-time market data
- ✅ Order modifications
- ✅ Immediate executions

**Characteristics:**
- **Price-time priority** matching
- **Dynamic tick sizes** based on price
- **Continuous trading** during session
- **Real-time order book** updates

**Tick Size Table:**
```typescript
function getTickSize(price: number): number {
  if (price < 1000) return 1;
  if (price < 5000) return 5;
  if (price < 10000) return 10;
  if (price < 50000) return 50;
  if (price < 100000) return 100;
  if (price < 500000) return 500;
  return 1000;
}
```

### **Closing Auction (15:20-15:30)**

**Purpose:**
- Closing price determination
- Final liquidity provision
- Portfolio rebalancing

**Available Operations:**
- ✅ Order placement (market-on-close)
- ✅ Order cancellation
- ❌ Regular limit orders (restricted)

**Characteristics:**
- **Single-price auction** at 15:30
- **Market-on-close** orders accepted
- **Volume-weighted** price calculation
- **Reduced volatility** at close

## 🏖️ Market Holidays

### **2024 Korean Market Holidays**

| Date | Day | Holiday | Market Status |
|------|-----|---------|---------------|
| January 1 | Monday | New Year's Day | ❌ Closed |
| February 9-12 | Thu-Sun | Lunar New Year | ❌ Closed |
| March 1 | Friday | Independence Movement Day | ❌ Closed |
| April 10 | Wednesday | Parliamentary Election | ❌ Closed |
| May 1 | Wednesday | Labor Day | ❌ Closed |
| May 15 | Wednesday | Buddha's Birthday | ❌ Closed |
| June 6 | Thursday | Memorial Day | ❌ Closed |
| August 15 | Thursday | Liberation Day | ❌ Closed |
| September 16-18 | Mon-Wed | Chuseok (Thanksgiving) | ❌ Closed |
| October 3 | Thursday | National Foundation Day | ❌ Closed |
| October 9 | Wednesday | Hangul Day | ❌ Closed |
| December 25 | Wednesday | Christmas | ❌ Closed |

### **Holiday Detection Code**

```typescript
import { KSET } from 'kset';

class KoreanMarketCalendar {
  private holidays2024 = [
    new Date('2024-01-01'), // New Year
    new Date('2024-02-09'), new Date('2024-02-12'), // Lunar New Year
    new Date('2024-03-01'), // Independence Day
    new Date('2024-04-10'), // Election Day
    new Date('2024-05-01'), // Labor Day
    new Date('2024-05-15'), // Buddha's Birthday
    new Date('2024-06-06'), // Memorial Day
    new Date('2024-08-15'), // Liberation Day
    new Date('2024-09-16'), new Date('2024-09-18'), // Chuseok
    new Date('2024-10-03'), // Foundation Day
    new Date('2024-10-09'), // Hangul Day
    new Date('2024-12-25'), // Christmas
  ];

  isMarketOpen(date: Date = new Date()): boolean {
    // Check if weekend
    if (date.getDay() === 0 || date.getDay() === 6) {
      return false;
    }

    // Check if holiday
    const isHoliday = this.holidays2024.some(holiday =>
      date.toDateString() === holiday.toDateString()
    );

    return !isHoliday;
  }

  getCurrentSession(date: Date = new Date()): MarketSession {
    if (!this.isMarketOpen(date)) {
      return 'CLOSED';
    }

    const hours = date.getHours();
    const minutes = date.getMinutes();
    const currentTime = hours * 60 + minutes;

    if (currentTime >= 510 && currentTime < 540) return 'PRE_MARKET';
    if (currentTime >= 540 && currentTime < 720) return 'MORNING';
    if (currentTime >= 780 && currentTime < 930) return 'AFTERNOON';
    if (currentTime >= 930 && currentTime < 960) return 'CLOSING';
    if (currentTime >= 960 && currentTime < 960) return 'AFTER_HOURS';

    return 'CLOSED';
  }

  getNextOpenTime(date: Date = new Date()): Date {
    const nextOpen = new Date(date);

    // Move to next day if after trading hours
    if (date.getHours() >= 16) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }

    // Set to 9:00 AM
    nextOpen.setHours(9, 0, 0, 0);

    // Find next open day (not weekend or holiday)
    while (!this.isMarketOpen(nextOpen)) {
      nextOpen.setDate(nextOpen.getDate() + 1);
    }

    return nextOpen;
  }
}

type MarketSession = 'PRE_MARKET' | 'MORNING' | 'AFTERNOON' | 'CLOSING' | 'AFTER_HOURS' | 'CLOSED';

// Usage
const calendar = new KoreanMarketCalendar();
const currentSession = calendar.getCurrentSession();
const nextOpen = calendar.getNextOpenTime();

console.log('Current session:', currentSession);
console.log('Next market open:', nextOpen.toLocaleString());
```

## 📱 Time Zone Considerations

### **Korea Standard Time (KST)**
- **UTC+9** year-round (no daylight saving)
- **Server timing** critical for order submissions
- **Client time zones** need conversion

### **Time Zone Conversion**

```typescript
import { KSET } from 'kset';

class TimezoneHelper {
  // Convert local time to KST
  static toKST(date: Date = new Date()): Date {
    const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
    return new Date(utc + (9 * 3600000)); // UTC+9
  }

  // Convert KST to local time
  static fromKST(kstDate: Date): Date {
    const utc = kstDate.getTime() - (9 * 3600000);
    return new Date(utc - (new Date().getTimezoneOffset() * 60000));
  }

  // Check if Korean market is open
  static isKoreanMarketOpen(date: Date = new Date()): boolean {
    const kstTime = this.toKST(date);
    const hours = kstTime.getHours();
    const day = kstTime.getDay();

    // Weekend check
    if (day === 0 || day === 6) return false;

    // Trading hours check
    if ((hours >= 9 && hours < 12) || (hours >= 13 && hours < 15.5)) {
      return true;
    }

    return false;
  }
}

// Usage
const localTime = new Date();
const kstTime = TimezoneHelper.toKST(localTime);
const marketOpen = TimezoneHelper.isKoreanMarketOpen();

console.log('Local time:', localTime.toLocaleString());
console.log('KST time:', kstTime.toLocaleString());
console.log('Market open:', marketOpen);
```

## 🔄 Session Transition Handling

### **Session Change Detection**

```typescript
import { KSET, MarketStatus } from 'kset';

class SessionManager {
  private currentSession: MarketStatus = 'closed';
  private sessionCheckInterval: NodeJS.Timeout | null = null;

  constructor(private kset: KSET) {}

  startMonitoring(): void {
    // Check session every minute
    this.sessionCheckInterval = setInterval(() => {
      this.checkAndHandleSessionChange();
    }, 60000);
  }

  stopMonitoring(): void {
    if (this.sessionCheckInterval) {
      clearInterval(this.sessionCheckInterval);
      this.sessionCheckInterval = null;
    }
  }

  private async checkAndHandleSessionChange(): Promise<void> {
    const newSession = this.getCurrentMarketSession();

    if (newSession !== this.currentSession) {
      await this.handleSessionChange(this.currentSession, newSession);
      this.currentSession = newSession;
    }
  }

  private getCurrentMarketSession(): MarketStatus {
    const now = new Date();
    const kst = TimezoneHelper.toKST(now);
    const hours = kst.getHours();
    const minutes = kst.getMinutes();
    const currentTime = hours * 60 + minutes;
    const day = kst.getDay();

    // Weekend or holiday
    if (day === 0 || day === 6 || !this.isBusinessDay(kst)) {
      return 'holiday';
    }

    // Determine session
    if (currentTime >= 510 && currentTime < 540) return 'pre-market';
    if (currentTime >= 540 && currentTime < 720) return 'regular';
    if (currentTime >= 720 && currentTime < 780) return 'lunch-break';
    if (currentTime >= 780 && currentTime < 930) return 'regular';
    if (currentTime >= 930 && currentTime < 960) return 'after-hours';

    return 'closed';
  }

  private async handleSessionChange(
    fromSession: MarketStatus,
    toSession: MarketStatus
  ): Promise<void> {
    console.log(`🔄 Session change: ${fromSession} → ${toSession}`);

    switch (toSession) {
      case 'pre-market':
        console.log('📅 Pre-market session started');
        await this.handlePreMarketStart();
        break;

      case 'regular':
        if (fromSession === 'pre-market') {
          console.log('🔔 Market opened - executing opening auction');
          await this.handleMarketOpen();
        } else if (fromSession === 'lunch-break') {
          console.log('🔔 Afternoon session started');
          await this.handleAfternoonStart();
        }
        break;

      case 'lunch-break':
        console.log('🍱 Lunch break started');
        await this.handleLunchBreak();
        break;

      case 'after-hours':
        console.log('🔔 Market closed - closing auction executed');
        await this.handleMarketClose();
        break;

      case 'closed':
        console.log('🌙 Market closed for the day');
        await this.handleDayEnd();
        break;
    }
  }

  private async handlePreMarketStart(): Promise<void> {
    // Start collecting pre-market orders
    // Resume strategy calculations
    // Send notifications to users
  }

  private async handleMarketOpen(): Promise<void> {
    // Execute opening auction orders
    // Start real-time data subscriptions
    // Activate trading strategies
  }

  private async handleLunchBreak(): Promise<void> {
    // Pause active strategies
    // Send market summaries
    // Perform risk calculations
  }

  private async handleAfternoonStart(): Promise<void> {
    // Resume trading strategies
    // Check for after-hours catalysts
    // Continue real-time monitoring
  }

  private async handleMarketClose(): Promise<void> {
    // Execute closing auction
    // Calculate daily P&L
    // Generate end-of-day reports
  }

  private async handleDayEnd(): Promise<void> {
    // Cancel unfilled orders (if configured)
    // Disconnect real-time feeds
    // Save daily data
    // Prepare for next trading day
  }

  private isBusinessDay(date: Date): boolean {
    // Check against Korean holidays list
    // Implementation from previous section
    return true; // Simplified for example
  }
}

// Usage
const sessionManager = new SessionManager(kset);
sessionManager.startMonitoring();
```

## ⚡ Real-time Session Monitoring

### **WebSocket Integration**

```typescript
import { KSET } from 'kset';

class RealtimeSessionMonitor {
  private kset: KSET;
  private sessionCallbacks: Map<string, Function[]> = new Map();

  constructor(kset: KSET) {
    this.kset = kset;
    this.setupDefaultCallbacks();
  }

  private setupDefaultCallbacks(): void {
    this.on('market-open', () => {
      console.log('🔔 Market opened! Starting trading strategies...');
    });

    this.on('market-close', () => {
      console.log('🌙 Market closed. Stopping strategies...');
    });

    this.on('lunch-start', () => {
      console.log('🍱 Lunch break. Pausing strategies...');
    });

    this.on('lunch-end', () => {
      console.log('☕ Lunch break ended. Resuming strategies...');
    });
  }

  on(event: string, callback: Function): void {
    if (!this.sessionCallbacks.has(event)) {
      this.sessionCallbacks.set(event, []);
    }
    this.sessionCallbacks.get(event)!.push(callback);
  }

  async startMonitoring(): Promise<void> {
    await this.kset.connect();

    // Monitor market status changes
    const subscription = await this.kset.subscribeMarketStatus((status) => {
      this.handleStatusChange(status);
    });

    // Check session every 30 seconds
    setInterval(async () => {
      const currentSession = this.getCurrentSession();
      await this.checkSessionChange(currentSession);
    }, 30000);
  }

  private async handleStatusChange(status: string): Promise<void> {
    // Handle real-time status updates from broker
    console.log('📡 Market status update:', status);

    // Trigger appropriate callbacks
    this.triggerCallbacks(status);
  }

  private async checkSessionChange(expectedSession: string): Promise<void> {
    // Additional verification logic
    const brokerStatus = await this.kset.getMarketStatus();

    if (brokerStatus !== expectedSession) {
      console.log('⚠️ Session mismatch detected');
      console.log(`Expected: ${expectedSession}, Broker: ${brokerStatus}`);
    }
  }

  private triggerCallbacks(event: string): void {
    const callbacks = this.sessionCallbacks.get(event) || [];
    callbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error(`Error in callback for ${event}:`, error);
      }
    });
  }

  private getCurrentSession(): string {
    // Implementation from previous section
    return 'regular'; // Simplified
  }
}

// Usage
const monitor = new RealtimeSessionMonitor(kset);
await monitor.startMonitoring();

// Add custom callbacks
monitor.on('market-open', () => {
  // Start your trading strategies
});

monitor.on('lunch-start', () => {
  // Save current positions
  // Send lunch break notifications
});
```

## 🔧 Best Practices

### **Time Management**
1. **Always use KST** for Korean market operations
2. **Implement session monitoring** for automatic strategy management
3. **Handle time zone conversions** properly
4. **Cache holiday schedules** to avoid repeated calculations

### **Session Transitions**
1. **Monitor session changes** in real-time
2. **Implement graceful degradation** during session transitions
3. **Handle opening/closing auctions** separately from regular trading
4. **Save state** before market closes

### **Error Handling**
1. **Verify market status** before placing orders
2. **Handle session transitions** gracefully
3. **Implement retry logic** for temporary disconnections
4. **Log session changes** for debugging

### **Performance Optimization**
1. **Batch operations** within session windows
2. **Pre-load data** before market opens
3. **Use efficient polling** for session checks
4. **Cache session state** to reduce API calls

## 📞 Support

For questions about Korean market hours and sessions:

- **KSET Documentation**: [Main docs](../)
- **Discord Community**: [Live discussion](https://discord.gg/kset)
- **KRX Website**: [Official schedule](https://krx.co.kr)
- **Trading Calendar**: [Interactive calendar](https://krx.co.kr/main)

---

**Master Korean market hours** to build reliable trading applications that respect market schedules and optimize trading opportunities. 🕐