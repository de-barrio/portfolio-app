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

  // Enrich with prices
  const symbols = draft.positions.map((p) => p.asset.symbol);
  const quotes = await getBatchQuotes(symbols);

  const enrichedPositions = draft.positions.map((pos) => {
    const quote = quotes.get(pos.asset.symbol);
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
    };
  });

  const totalValue = enrichedPositions.reduce((sum, p) => sum + p.value, 0);

  return NextResponse.json({
    id: draft.id,
    portfolioId: draft.portfolioId,
    baseCapital: draft.baseCapital,
    mode: draft.mode,
    updatedAt: draft.updatedAt,
    positions: enrichedPositions,
    totalValue,
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
