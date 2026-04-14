import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBatchQuotes } from '@/lib/market-data';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  // Get draft with positions
  const draft = await prisma.portfolioDraft.findFirst({
    where: { portfolioId: id },
    include: {
      positions: {
        include: { asset: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!draft || draft.positions.length === 0) {
    return NextResponse.json(
      { error: 'No positions to save' },
      { status: 400 }
    );
  }

  // Fetch fresh quotes for all positions
  const symbols = draft.positions.map((p) => p.asset.symbol);
  const quotes = await getBatchQuotes(symbols);

  // Calculate baseline value
  let baselineValue = 0;
  const positionData = draft.positions.map((pos) => {
    const quote = quotes.get(pos.asset.symbol);
    const price = quote?.price ?? 0;
    const value = pos.shares * price;
    baselineValue += value;

    return {
      assetId: pos.assetId,
      shares: pos.shares,
      baselinePrice: price,
      targetPct: pos.targetPct,
    };
  });

  // Get next version number
  const lastVersion = await prisma.portfolioVersion.findFirst({
    where: { portfolioId: id },
    orderBy: { versionNumber: 'desc' },
  });
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;

  // Get portfolio benchmark
  const portfolio = await prisma.portfolio.findUnique({
    where: { id },
    select: { benchmark: true },
  });

  // Atomic create: version + positions
  const version = await prisma.portfolioVersion.create({
    data: {
      portfolioId: id,
      versionNumber,
      label: body.label || `v${versionNumber}`,
      notes: body.notes || null,
      benchmark: portfolio?.benchmark ?? 'SPY',
      baselineValue,
      positions: {
        create: positionData,
      },
    },
    include: {
      positions: {
        include: { asset: true },
      },
    },
  });

  // Write-through: update asset quotes in DB
  for (const [symbol, quote] of quotes) {
    const asset = await prisma.asset.findUnique({ where: { symbol } });
    if (asset) {
      await prisma.assetQuote.create({
        data: {
          assetId: asset.id,
          price: quote.price,
          priceLabel: quote.priceLabel,
        },
      });
    }
  }

  return NextResponse.json(version, { status: 201 });
}
