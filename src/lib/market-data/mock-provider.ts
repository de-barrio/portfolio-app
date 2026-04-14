import { MOCK_PRICES } from '@/lib/constants';
import type { MarketDataProvider, Quote, DailyBar, AssetSearchResult } from './types';

const ASSET_INFO: Record<string, { name: string; type: string }> = {
  AAPL: { name: 'Apple Inc.', type: 'Stock' },
  MSFT: { name: 'Microsoft Corporation', type: 'Stock' },
  GOOGL: { name: 'Alphabet Inc.', type: 'Stock' },
  AMZN: { name: 'Amazon.com Inc.', type: 'Stock' },
  NVDA: { name: 'NVIDIA Corporation', type: 'Stock' },
  META: { name: 'Meta Platforms Inc.', type: 'Stock' },
  TSLA: { name: 'Tesla Inc.', type: 'Stock' },
  JPM: { name: 'JPMorgan Chase & Co.', type: 'Stock' },
  V: { name: 'Visa Inc.', type: 'Stock' },
  MA: { name: 'Mastercard Inc.', type: 'Stock' },
  SPY: { name: 'SPDR S&P 500 ETF Trust', type: 'ETF' },
  QQQ: { name: 'Invesco QQQ Trust', type: 'ETF' },
  VTI: { name: 'Vanguard Total Stock Market ETF', type: 'ETF' },
  IWM: { name: 'iShares Russell 2000 ETF', type: 'ETF' },
  GLD: { name: 'SPDR Gold Shares', type: 'ETF' },
  PLTR: { name: 'Palantir Technologies Inc.', type: 'Stock' },
  AMD: { name: 'Advanced Micro Devices Inc.', type: 'Stock' },
  NFLX: { name: 'Netflix Inc.', type: 'Stock' },
  DIS: { name: 'The Walt Disney Company', type: 'Stock' },
  CRM: { name: 'Salesforce Inc.', type: 'Stock' },
  BRKB: { name: 'Berkshire Hathaway Inc.', type: 'Stock' },
  WMT: { name: 'Walmart Inc.', type: 'Stock' },
  COST: { name: 'Costco Wholesale Corporation', type: 'Stock' },
  UNH: { name: 'UnitedHealth Group Inc.', type: 'Stock' },
  HOOD: { name: 'Robinhood Markets Inc.', type: 'Stock' },
  COIN: { name: 'Coinbase Global Inc.', type: 'Stock' },
  SOFI: { name: 'SoFi Technologies Inc.', type: 'Stock' },
  UBER: { name: 'Uber Technologies Inc.', type: 'Stock' },
  SNAP: { name: 'Snap Inc.', type: 'Stock' },
  PINS: { name: 'Pinterest Inc.', type: 'Stock' },
  RBLX: { name: 'Roblox Corporation', type: 'Stock' },
  INTC: { name: 'Intel Corporation', type: 'Stock' },
  MU: { name: 'Micron Technology Inc.', type: 'Stock' },
  QCOM: { name: 'Qualcomm Inc.', type: 'Stock' },
  VZ: { name: 'Verizon Communications Inc.', type: 'Stock' },
  T: { name: 'AT&T Inc.', type: 'Stock' },
  BAC: { name: 'Bank of America Corporation', type: 'Stock' },
  WFC: { name: 'Wells Fargo & Company', type: 'Stock' },
  GS: { name: 'Goldman Sachs Group Inc.', type: 'Stock' },
  MS: { name: 'Morgan Stanley', type: 'Stock' },
  XOM: { name: 'Exxon Mobil Corporation', type: 'Stock' },
  CVX: { name: 'Chevron Corporation', type: 'Stock' },
  PFE: { name: 'Pfizer Inc.', type: 'Stock' },
  JNJ: { name: 'Johnson & Johnson', type: 'Stock' },
  LLY: { name: 'Eli Lilly and Company', type: 'Stock' },
};

function jitter(base: number): number {
  return +(base * (1 + (Math.random() - 0.5) * 0.003)).toFixed(2);
}

function generateDailyHistory(symbol: string, from: Date, to: Date): DailyBar[] {
  const base = MOCK_PRICES[symbol];
  if (!base) return [];

  const bars: DailyBar[] = [];
  const current = new Date(from);
  let price = base * 0.95;

  while (current <= to) {
    if (current.getDay() !== 0 && current.getDay() !== 6) {
      const change = (Math.random() - 0.48) * 0.02;
      price = +(price * (1 + change)).toFixed(2);
      const high = +(price * (1 + Math.random() * 0.015)).toFixed(2);
      const low = +(price * (1 - Math.random() * 0.015)).toFixed(2);
      const open = +(low + Math.random() * (high - low)).toFixed(2);

      bars.push({
        date: current.toISOString().slice(0, 10),
        open,
        high,
        low,
        close: price,
        volume: Math.floor(1_000_000 + Math.random() * 50_000_000),
      });
    }
    current.setDate(current.getDate() + 1);
  }
  return bars;
}

export class MockMarketDataProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote | null> {
    const upper = symbol.toUpperCase();
    const base = MOCK_PRICES[upper];
    if (!base) return null;
    const info = ASSET_INFO[upper];

    return {
      symbol: upper,
      price: jitter(base),
      priceLabel: 'Mock',
      change: +(Math.random() * 4 - 2).toFixed(2),
      changePercent: +((Math.random() * 2 - 1)).toFixed(2),
      name: info?.name ?? upper,
      type: info?.type ?? 'Stock',
      fetchedAt: new Date(),
    };
  }

  async getBatchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const result = new Map<string, Quote>();
    for (const sym of symbols) {
      const quote = await this.getQuote(sym);
      if (quote) result.set(quote.symbol, quote);
    }
    return result;
  }

  async getDailyHistory(symbol: string, from: Date, to: Date): Promise<DailyBar[]> {
    return generateDailyHistory(symbol.toUpperCase(), from, to);
  }

  async searchAssets(query: string): Promise<AssetSearchResult[]> {
    const q = query.toUpperCase();
    return Object.entries(ASSET_INFO)
      .filter(([sym, info]) =>
        sym.includes(q) || info.name.toUpperCase().includes(q)
      )
      .map(([sym, info]) => ({
        symbol: sym,
        name: info.name,
        type: info.type,
      }))
      .slice(0, 10);
  }
}
