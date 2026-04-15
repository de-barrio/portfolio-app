export type PriceLabel = 'Live' | 'Delayed' | 'EOD NAV' | 'Mock';

export interface Quote {
  symbol: string;
  price: number;
  priceLabel: PriceLabel;
  change?: number;
  changePercent?: number;
  name?: string;
  type?: string;
  marketCap?: number;
  trailingPE?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  fetchedAt: Date;
}

export interface DailyBar {
  date: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface MarketDataProvider {
  getQuote(symbol: string): Promise<Quote | null>;
  getBatchQuotes(symbols: string[]): Promise<Map<string, Quote>>;
  getDailyHistory(symbol: string, from: Date, to: Date): Promise<DailyBar[]>;
  searchAssets(query: string): Promise<AssetSearchResult[]>;
}

export interface AssetSearchResult {
  symbol: string;
  name: string;
  type: string;
  exchange?: string;
}
