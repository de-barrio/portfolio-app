import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBatchQuotes } from '@/lib/market-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const version = await prisma.portfolioVersion.findUnique({
    where: { id },
    include: {
      positions: {
        include: { asset: true },
      },
      portfolio: {
        select: { name: true, id: true },
      },
    },
  });

  if (!version) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Enrich with current prices
  const symbols = version.positions.map((p) => p.asset.symbol);
  const quotes = await getBatchQuotes(symbols);

  let currentValue = 0;
  const enrichedPositions = version.positions.map((pos) => {
    const quote = quotes.get(pos.asset.symbol);
    const currentPrice = quote?.price ?? pos.baselinePrice;
    const currentVal = pos.shares * currentPrice;
    const baselineVal = pos.shares * pos.baselinePrice;
    currentValue += currentVal;

    return {
      id: pos.id,
      symbol: pos.asset.symbol,
      name: pos.asset.name,
      type: pos.asset.type,
      shares: pos.shares,
      baselinePrice: pos.baselinePrice,
      currentPrice,
      baselineValue: baselineVal,
      currentValue: currentVal,
      targetPct: pos.targetPct,
      returnPct:
        baselineVal > 0 ? ((currentVal - baselineVal) / baselineVal) * 100 : 0,
    };
  });

  const gainLoss = currentValue - version.baselineValue;
  const returnPct =
    version.baselineValue > 0
      ? (gainLoss / version.baselineValue) * 100
      : 0;

  return NextResponse.json({
    ...version,
    positions: enrichedPositions,
    currentValue,
    gainLoss,
    returnPct,
  });
}
