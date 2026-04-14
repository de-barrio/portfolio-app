import type { DailyBar } from '@/lib/market-data/types';

export function normalizeToBase(values: number[], base: number = 100): number[] {
  if (values.length === 0) return [];
  const start = values[0];
  if (start === 0) return values.map(() => base);
  return values.map((v) => (v / start) * base);
}

export function calculateAlpha(
  portfolioReturn: number,
  benchmarkReturn: number
): number {
  return portfolioReturn - benchmarkReturn;
}

export function buildIndexedSeries(
  portfolioBars: DailyBar[],
  benchmarkBars: DailyBar[]
): { date: string; portfolio: number; benchmark: number }[] {
  const benchmarkMap = new Map<string, number>();
  for (const bar of benchmarkBars) {
    benchmarkMap.set(bar.date, bar.close);
  }

  const result: { date: string; portfolio: number; benchmark: number }[] = [];
  const portStart = portfolioBars[0]?.close ?? 1;
  const benchStart = benchmarkBars[0]?.close ?? 1;

  for (const bar of portfolioBars) {
    const benchClose = benchmarkMap.get(bar.date);
    if (benchClose !== undefined) {
      result.push({
        date: bar.date,
        portfolio: (bar.close / portStart) * 100,
        benchmark: (benchClose / benchStart) * 100,
      });
    }
  }

  return result;
}
