import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBatchQuotes } from '@/lib/market-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const versions = await prisma.portfolioVersion.findMany({
    where: { portfolioId: id },
    include: {
      positions: {
        include: { asset: true },
      },
    },
    orderBy: { versionNumber: 'desc' },
  });

  // Enrich with current values
  const allSymbols = new Set<string>();
  for (const v of versions) {
    v.positions.forEach((p) => allSymbols.add(p.asset.symbol));
  }
  const quotes = await getBatchQuotes([...allSymbols]);

  const enriched = versions.map((v) => {
    let currentValue = 0;
    for (const pos of v.positions) {
      const quote = quotes.get(pos.asset.symbol);
      currentValue += pos.shares * (quote?.price ?? pos.baselinePrice);
    }

    const gainLoss = currentValue - v.baselineValue;
    const returnPct = v.baselineValue > 0 ? (gainLoss / v.baselineValue) * 100 : 0;

    return {
      id: v.id,
      versionNumber: v.versionNumber,
      label: v.label,
      notes: v.notes,
      benchmark: v.benchmark,
      baselineValue: v.baselineValue,
      currentValue,
      gainLoss,
      returnPct,
      positionCount: v.positions.length,
      createdAt: v.createdAt,
    };
  });

  return NextResponse.json(enriched);
}
