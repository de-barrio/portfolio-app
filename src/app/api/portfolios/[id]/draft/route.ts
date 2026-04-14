import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getBatchQuotes } from '@/lib/market-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const draft = await prisma.portfolioDraft.findFirst({
    where: { portfolioId: id },
    include: {
      positions: {
        include: { asset: true },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  // Fetch latest saved version for baseline prices
  const latestVersion = await prisma.portfolioVersion.findFirst({
    where: { portfolioId: id },
    orderBy: { versionNumber: 'desc' },
    include: { positions: { include: { asset: true } } },
  });

  const baselinePriceMap = new Map<string, number>();
  if (latestVersion) {
    for (const vp of latestVersion.positions) {
      baselinePriceMap.set(vp.asset.symbol, vp.baselinePrice);
    }
  }

  // Enrich with prices
  const symbols = draft.positions.map((p) => p.asset.symbol);
  const quotes = await getBatchQuotes(symbols);

  const enrichedPositions = draft.positions.map((pos) => {
    const quote = quotes.get(pos.asset.symbol);
    const baselinePrice = baselinePriceMap.get(pos.asset.symbol) ?? null;
    return {
      id: pos.id,
      assetId: pos.assetId,
      symbol: pos.asset.symbol,
      name: pos.asset.name,
      type: pos.asset.type,
      shares: pos.shares,
      targetPct: pos.targetPct,
      sortOrder: pos.sortOrder,
      price: quote?.price ?? 0,
      priceLabel: quote?.priceLabel ?? 'Mock',
      value: pos.shares * (quote?.price ?? 0),
      change: quote?.change ?? null,
      changePercent: quote?.changePercent ?? null,
      baselinePrice,
    };
  });

  const totalValue = enrichedPositions.reduce((sum, p) => sum + p.value, 0);

  // Day change totals
  const totalDayChange = enrichedPositions.reduce(
    (sum, p) => sum + p.shares * (p.change ?? 0),
    0
  );
  const totalDayChangePct = totalValue > 0 ? (totalDayChange / totalValue) * 100 : 0;

  // Baseline total (from latest saved version)
  const baselineTotal = latestVersion
    ? enrichedPositions.reduce(
        (sum, p) => sum + p.shares * (p.baselinePrice ?? p.price),
        0
      )
    : null;

  return NextResponse.json({
    id: draft.id,
    portfolioId: draft.portfolioId,
    baseCapital: draft.baseCapital,
    mode: draft.mode,
    updatedAt: draft.updatedAt,
    positions: enrichedPositions,
    totalValue,
    totalDayChange,
    totalDayChangePct,
    baselineTotal,
    latestVersionNumber: latestVersion?.versionNumber ?? null,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const draft = await prisma.portfolioDraft.findFirst({
    where: { portfolioId: id },
  });

  if (!draft) {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 });
  }

  // Update draft-level fields
  if (body.baseCapital !== undefined || body.mode !== undefined) {
    await prisma.portfolioDraft.update({
      where: { id: draft.id },
      data: {
        ...(body.baseCapital !== undefined && { baseCapital: body.baseCapital }),
        ...(body.mode !== undefined && { mode: body.mode }),
      },
    });
  }

  // Update positions if provided
  if (body.positions) {
    // Delete existing positions
    await prisma.portfolioDraftPosition.deleteMany({
      where: { draftId: draft.id },
    });

    // Ensure assets exist
    for (const pos of body.positions) {
      const existing = await prisma.asset.findUnique({
        where: { symbol: pos.symbol.toUpperCase() },
      });
      if (!existing) {
        await prisma.asset.create({
          data: {
            symbol: pos.symbol.toUpperCase(),
            name: pos.name || pos.symbol.toUpperCase(),
            type: pos.type || 'Stock',
          },
        });
      }
    }

    // Create new positions
    for (let i = 0; i < body.positions.length; i++) {
      const pos = body.positions[i];
      const asset = await prisma.asset.findUnique({
        where: { symbol: pos.symbol.toUpperCase() },
      });
      if (asset) {
        await prisma.portfolioDraftPosition.create({
          data: {
            draftId: draft.id,
            assetId: asset.id,
            shares: pos.shares ?? 0,
            targetPct: pos.targetPct ?? null,
            sortOrder: i,
          },
        });
      }
    }
  }

  return NextResponse.json({ success: true, updatedAt: new Date() });
}
