import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBatchQuotes } from '@/lib/market-data';

export async function GET() {
  const portfolios = await prisma.portfolio.findMany({
    include: {
      draft: {
        include: {
          positions: {
            include: { asset: true },
            orderBy: { sortOrder: 'asc' },
          },
        },
      },
      versions: {
        orderBy: { versionNumber: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  // Enrich with current prices
  const allSymbols = new Set<string>();
  for (const p of portfolios) {
    p.draft?.positions.forEach((pos) => allSymbols.add(pos.asset.symbol));
  }

  const quotes = await getBatchQuotes([...allSymbols]);

  const enriched = portfolios.map((p) => {
    let totalValue = 0;
    const positions = p.draft?.positions.map((pos) => {
      const quote = quotes.get(pos.asset.symbol);
      const price = quote?.price ?? 0;
      const value = pos.shares * price;
      totalValue += value;
      return {
        ...pos,
        price,
        priceLabel: quote?.priceLabel ?? 'Mock',
        value,
      };
    }) ?? [];

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      intentTag: p.intentTag,
      benchmark: p.benchmark,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      totalValue,
      positionCount: positions.filter((pos) => pos.shares > 0).length,
      latestVersion: p.versions[0] ?? null,
      baseCapital: p.draft?.baseCapital ?? 0,
    };
  });

  return NextResponse.json(enriched);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, description, intentTag, benchmark } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }

  const portfolio = await prisma.portfolio.create({
    data: {
      name: name.trim(),
      description: description?.trim() || null,
      intentTag: intentTag || null,
      benchmark: benchmark || 'SPY',
      draft: {
        create: {
          baseCapital: body.baseCapital || 100000,
        },
      },
    },
    include: { draft: true },
  });

  return NextResponse.json(portfolio, { status: 201 });
}
