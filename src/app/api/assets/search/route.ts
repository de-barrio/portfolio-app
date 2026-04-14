import { NextRequest, NextResponse } from 'next/server';
import { searchAssets } from '@/lib/market-data';
import { prisma } from '@/lib/db';

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q');
  if (!q || q.length < 1) {
    return NextResponse.json([]);
  }

  const results = await searchAssets(q);

  // Also check DB for existing assets
  const dbAssets = await prisma.asset.findMany({
    where: {
      OR: [
        { symbol: { contains: q.toUpperCase() } },
        { name: { contains: q } },
      ],
    },
    take: 10,
  });

  // Merge: prefer search results, add any DB-only assets
  const symbolSet = new Set(results.map((r) => r.symbol));
  for (const asset of dbAssets) {
    if (!symbolSet.has(asset.symbol)) {
      results.push({
        symbol: asset.symbol,
        name: asset.name ?? asset.symbol,
        type: asset.type,
        exchange: asset.exchange ?? undefined,
      });
    }
  }

  return NextResponse.json(results.slice(0, 15));
}
