import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBatchQuotes } from '@/lib/market-data';

export async function GET() {
  const items = await prisma.watchlistItem.findMany({
    include: { asset: true },
    orderBy: { createdAt: 'desc' },
  });

  const symbols = items.map((item) => item.asset.symbol);
  const quotes = await getBatchQuotes(symbols);

  const enriched = items.map((item) => {
    const quote = quotes.get(item.asset.symbol);
    return {
      id: item.id,
      assetId: item.assetId,
      symbol: item.asset.symbol,
      name: item.asset.name,
      type: item.asset.type,
      price: quote?.price ?? 0,
      priceLabel: quote?.priceLabel ?? 'Mock',
      change: quote?.change ?? 0,
      changePercent: quote?.changePercent ?? 0,
      marketCap: quote?.marketCap ?? null,
      trailingPE: quote?.trailingPE ?? null,
      dividendYield: quote?.dividendYield ?? null,
      fiftyTwoWeekHigh: quote?.fiftyTwoWeekHigh ?? null,
      fiftyTwoWeekLow: quote?.fiftyTwoWeekLow ?? null,
      note: item.note,
      createdAt: item.createdAt,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { symbol, name, type } = body;

  if (!symbol) {
    return NextResponse.json({ error: 'Symbol required' }, { status: 400 });
  }

  // Ensure asset exists
  let asset = await prisma.asset.findUnique({
    where: { symbol: symbol.toUpperCase() },
  });
  if (!asset) {
    asset = await prisma.asset.create({
      data: {
        symbol: symbol.toUpperCase(),
        name: name || symbol.toUpperCase(),
        type: type || 'Stock',
      },
    });
  }

  // Check if already in watchlist
  const existing = await prisma.watchlistItem.findUnique({
    where: { assetId: asset.id },
  });
  if (existing) {
    return NextResponse.json({ error: 'Already in watchlist' }, { status: 409 });
  }

  const item = await prisma.watchlistItem.create({
    data: { assetId: asset.id },
    include: { asset: true },
  });

  return NextResponse.json(item, { status: 201 });
}
