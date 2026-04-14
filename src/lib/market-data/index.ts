import type { MarketDataProvider, Quote } from './types';
import { MockMarketDataProvider } from './mock-provider';

export type { Quote, DailyBar, AssetSearchResult, PriceLabel, MarketDataProvider } from './types';

// In-memory cache with TTL
const quoteCache = new Map<string, { quote: Quote; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getProvider(): MarketDataProvider {
  // Future: check for Yahoo Finance API key and return YahooProvider
  return new MockMarketDataProvider();
}

const provider = getProvider();

export async function getQuote(symbol: string): Promise<Quote | null> {
  const upper = symbol.toUpperCase();
  const cached = quoteCache.get(upper);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.quote;
  }

  const quote = await provider.getQuote(upper);
  if (quote) {
    quoteCache.set(upper, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
  }
  return quote;
}

export async function getBatchQuotes(symbols: string[]): Promise<Map<string, Quote>> {
  const result = new Map<string, Quote>();
  const uncached: string[] = [];

  for (const sym of symbols) {
    const upper = sym.toUpperCase();
    const cached = quoteCache.get(upper);
    if (cached && cached.expiresAt > Date.now()) {
      result.set(upper, cached.quote);
    } else {
      uncached.push(upper);
    }
  }

  if (uncached.length > 0) {
    const freshQuotes = await provider.getBatchQuotes(uncached);
    for (const [sym, quote] of freshQuotes) {
      quoteCache.set(sym, { quote, expiresAt: Date.now() + CACHE_TTL_MS });
      result.set(sym, quote);
    }
  }

  return result;
}

export async function getDailyHistory(symbol: string, from: Date, to: Date) {
  return provider.getDailyHistory(symbol, from, to);
}

export async function searchAssets(query: string) {
  return provider.searchAssets(query);
}
