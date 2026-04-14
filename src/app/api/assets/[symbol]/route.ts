import { NextRequest, NextResponse } from 'next/server';
import { getQuote } from '@/lib/market-data';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const quote = await getQuote(symbol);

  if (!quote) {
    return NextResponse.json({ error: 'Symbol not found' }, { status: 404 });
  }

  return NextResponse.json(quote);
}
