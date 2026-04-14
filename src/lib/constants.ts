// Chart color palette (from prototype lines 90-94)
export const CHART_COLORS: string[] = [
  '#1A7A4A', '#2563EB', '#7C3AED', '#D97706', '#B83232',
  '#0891B2', '#BE185D', '#65A30D', '#EA580C', '#4338CA',
  '#047857', '#1E40AF', '#9333EA', '#B45309', '#9B1C1C',
];

// Mock prices (from prototype lines 70-80)
export const MOCK_PRICES: Record<string, number> = {
  AAPL: 213.18, MSFT: 418.32, GOOGL: 172.54, AMZN: 226.40, NVDA: 875.39,
  META: 596.81, TSLA: 248.23, JPM: 258.70, V: 318.45, MA: 528.90,
  SPY: 578.22, QQQ: 492.10, VTI: 287.64, IWM: 198.43, GLD: 242.18,
  PLTR: 82.44, AMD: 162.55, NFLX: 1024.60, DIS: 112.38, CRM: 298.54,
  BRKB: 482.50, WMT: 98.32, COST: 958.70, UNH: 512.44, HOOD: 38.72,
  COIN: 285.44, SOFI: 14.22, UBER: 82.10, SNAP: 8.22, PINS: 32.10,
  RBLX: 44.20, INTC: 22.14, MU: 92.44, QCOM: 162.88, VZ: 41.22,
  T: 19.88, BAC: 44.12, WFC: 68.90, GS: 582.30, MS: 128.44,
  XOM: 120.55, CVX: 152.10, PFE: 26.88, JNJ: 154.20, LLY: 768.44,
};

// Asset types
export const ASSET_TYPES = ['Stock', 'ETF', 'Bond', 'Crypto', 'Other'] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

// Intent tags for portfolios
export const INTENT_TAGS = [
  'Growth',
  'Income',
  'Balanced',
  'Speculative',
  'Defensive',
  'Index',
  'Sector',
  'Thematic',
] as const;
export type IntentTag = (typeof INTENT_TAGS)[number];

// Price freshness labels
export type PriceLabel = 'Live' | 'Delayed' | 'EOD NAV' | 'Mock';
