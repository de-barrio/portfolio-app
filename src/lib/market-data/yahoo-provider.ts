import YahooFinance from 'yahoo-finance2';
import type { Quote as YFQuote } from 'yahoo-finance2/modules/quote';
import type { SearchQuoteYahoo } from 'yahoo-finance2/modules/search';
import type {
  MarketDataProvider,
  Quote,
  DailyBar,
  AssetSearchResult,
  PriceLabel,
} from './types';

const yf = new YahooFinance();

function mapQuoteType(quoteType?: string): string {
  switch (quoteType) {
    case 'EQUITY':
      return 'Stock';
    case 'ETF':
      return 'ETF';
    case 'CRYPTOCURRENCY':
      return 'Crypto';
    case 'MUTUALFUND':
      return 'Mutual Fund';
    default:
      return 'Other';
  }
}

function derivePriceLabel(quoteType?: string, marketState?: string): PriceLabel {
  if (quoteType === 'MUTUALFUND') return 'EOD NAV';
  if (marketState === 'REGULAR') return 'Live';
  return 'Delayed';
}

function yfQuoteToQuote(q: YFQuote, fallbackSymbol?: string): Quote | null {
  if (q.regularMarketPrice == null) return null;
  return {
    symbol: q.symbol,
    price: q.regularMarketPrice,
    priceLabel: derivePriceLabel(q.quoteType, q.marketState),
    change: q.regularMarketChange ?? undefined,
    changePercent: q.regularMarketChangePercent ?? undefined,
    name: q.longName ?? q.shortName ?? fallbackSymbol ?? q.symbol,
    type: mapQuoteType(q.quoteType),
    marketCap: (q as Record<string, unknown>).marketCap as number | undefined,
    trailingPE: (q as Record<string, unknown>).trailingPE as number | undefined,
    dividendYield: (q as Record<string, unknown>).dividendYield as number | undefined,
    fiftyTwoWeekHigh: (q as Record<string, unknown>).fiftyTwoWeekHigh as number | undefined,
    fiftyTwoWeekLow: (q as Record<string, unknown>).fiftyTwoWeekLow as number | undefined,
    fetchedAt: new Date(),
  };
}

export class YahooFinanceProvider implements MarketDataProvider {
  async getQuote(symbol: string): Promise<Quote | null> {
    try {
      const result: YFQuote = await yf.quote(symbol);
      return yfQuoteToQuote(result, symbol);
    } catch (error) {
      console.error(`[YahooFinance] getQuote failed for ${symbol}:`, error);
      return null;
    }
  }

  async getBatchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
    const result = new Map<string, Quote>();
    if (symbols.length === 0) return result;

    try {
      const quotes: YFQuote[] = await yf.quote(symbols);

      for (const q of quotes) {
        const mapped = yfQuoteToQuote(q);
        if (mapped) result.set(mapped.symbol, mapped);
      }
    } catch (error) {
      console.error('[YahooFinance] getBatchQuotes failed, falling back to individual calls:', error);
      for (const sym of symbols) {
        const quote = await this.getQuote(sym);
        if (quote) result.set(quote.symbol, quote);
      }
    }

    return result;
  }

  async getDailyHistory(symbol: string, from: Date, to: Date): Promise<DailyBar[]> {
    try {
      const rows = await yf.historical(symbol, {
        period1: from,
        period2: to,
      });

      return rows.map((row) => ({
        date: row.date.toISOString().slice(0, 10),
        open: row.open,
        high: row.high,
        low: row.low,
        close: row.close,
        volume: row.volume,
      }));
    } catch (error) {
      console.error(`[YahooFinance] getDailyHistory failed for ${symbol}:`, error);
      return [];
    }
  }

  async searchAssets(query: string): Promise<AssetSearchResult[]> {
    try {
      const result = await yf.search(query);
      const quotes = result.quotes ?? [];

      const results: AssetSearchResult[] = [];
      for (const q of quotes) {
        if (!q.isYahooFinance) continue;
        const yq = q as SearchQuoteYahoo;
        results.push({
          symbol: yq.symbol,
          name: (yq.longname as string | undefined) ?? (yq.shortname as string | undefined) ?? yq.symbol,
          type: 'quoteType' in yq ? mapQuoteType(yq.quoteType as string) : 'Other',
          exchange: yq.exchDisp,
        });
        if (results.length >= 10) break;
      }
      return results;
    } catch (error) {
      console.error(`[YahooFinance] searchAssets failed for "${query}":`, error);
      return [];
    }
  }

}
