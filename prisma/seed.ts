import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaLibSql } from '@prisma/adapter-libsql';

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const tursoUrl = process.env.TURSO_DATABASE_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN;

// Use Turso if configured, otherwise local SQLite file
const url = tursoUrl ?? `file:${path.resolve(__dirname2, 'dev.db')}`;

const adapter = new PrismaLibSql({ url, authToken: tursoToken });
const prisma = new PrismaClient({ adapter });

const MOCK_PRICES: Record<string, number> = {
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

const ASSET_NAMES: Record<string, { name: string; type: string }> = {
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

const PORTFOLIOS = [
  {
    name: 'Core Growth',
    description: 'Concentrated in mega-cap tech + broad market ETF anchor',
    intentTag: 'Growth',
    baseCapital: 100000,
    positions: [
      { ticker: 'AAPL', shares: 50, targetPct: 25 },
      { ticker: 'MSFT', shares: 30, targetPct: 20 },
      { ticker: 'NVDA', shares: 12, targetPct: 15 },
      { ticker: 'SPY', shares: 25, targetPct: 20 },
      { ticker: 'PLTR', shares: 100, targetPct: 10 },
      { ticker: 'META', shares: 8, targetPct: 10 },
    ],
  },
  {
    name: 'Defensive Income',
    description: 'Lower volatility, dividend payers + broad ETF',
    intentTag: 'Income',
    baseCapital: 75000,
    positions: [
      { ticker: 'VTI', shares: 80, targetPct: 30 },
      { ticker: 'JPM', shares: 40, targetPct: 20 },
      { ticker: 'JNJ', shares: 30, targetPct: 15 },
      { ticker: 'V', shares: 20, targetPct: 15 },
      { ticker: 'GLD', shares: 25, targetPct: 10 },
      { ticker: 'VZ', shares: 100, targetPct: 10 },
    ],
  },
  {
    name: 'Trade Ideas',
    description: 'Shorter-term ideas and new position sizing sandbox — no targets set',
    intentTag: 'Speculative',
    baseCapital: 25000,
    positions: [
      { ticker: 'COIN', shares: 20, targetPct: null },
      { ticker: 'HOOD', shares: 150, targetPct: null },
      { ticker: 'AMD', shares: 30, targetPct: null },
      { ticker: 'RBLX', shares: 80, targetPct: null },
    ],
  },
];

async function main() {
  console.log('Seeding database...');

  // Clear existing data
  await prisma.portfolioVersionPosition.deleteMany();
  await prisma.portfolioVersion.deleteMany();
  await prisma.portfolioDraftPosition.deleteMany();
  await prisma.portfolioDraft.deleteMany();
  await prisma.assetQuote.deleteMany();
  await prisma.assetDailyHistory.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.researchNote.deleteMany();
  await prisma.researchRun.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.setting.deleteMany();

  // Seed assets + mock quotes
  const assetMap: Record<string, string> = {};
  for (const [symbol, price] of Object.entries(MOCK_PRICES)) {
    const info = ASSET_NAMES[symbol] ?? { name: symbol, type: 'Stock' };
    const asset = await prisma.asset.create({
      data: {
        symbol,
        name: info.name,
        type: info.type,
        quotes: {
          create: { price, priceLabel: 'Mock' },
        },
      },
    });
    assetMap[symbol] = asset.id;
  }
  console.log(`  Created ${Object.keys(assetMap).length} assets with mock quotes`);

  // Seed portfolios with drafts
  for (const p of PORTFOLIOS) {
    const portfolio = await prisma.portfolio.create({
      data: {
        name: p.name,
        description: p.description,
        intentTag: p.intentTag,
        draft: {
          create: {
            baseCapital: p.baseCapital,
            positions: {
              create: p.positions.map((pos, i) => ({
                assetId: assetMap[pos.ticker],
                shares: pos.shares,
                targetPct: pos.targetPct,
                sortOrder: i,
              })),
            },
          },
        },
      },
    });
    console.log(`  Created portfolio: ${portfolio.name}`);
  }

  // Seed default settings
  await prisma.setting.createMany({
    data: [
      { key: 'riskFreeRate', value: '0.05' },
      { key: 'defaultBenchmark', value: 'SPY' },
      { key: 'currency', value: 'USD' },
      { key: 'dateFormat', value: 'MM/DD/YYYY' },
      { key: 'refreshInterval', value: '300' },
    ],
  });
  console.log('  Created default settings');

  console.log('Seed complete!');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
