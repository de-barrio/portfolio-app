import { NextRequest, NextResponse } from 'next/server';
import { getDailyHistory } from '@/lib/market-data';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params;
  const searchParams = request.nextUrl.searchParams;
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const fromDate = from ? new Date(from) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
  const toDate = to ? new Date(to) : new Date();

  const history = await getDailyHistory(symbol, fromDate, toDate);
  return NextResponse.json(history);
}
