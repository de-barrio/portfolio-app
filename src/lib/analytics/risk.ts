export function volatility(dailyReturns: number[]): number {
  if (dailyReturns.length < 2) return 0;
  const mean = dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length;
  const variance =
    dailyReturns.reduce((s, r) => s + (r - mean) ** 2, 0) /
    (dailyReturns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252) * 100; // Annualized
}

export function maxDrawdown(values: number[]): number {
  if (values.length < 2) return 0;
  let peak = values[0];
  let maxDd = 0;
  for (const val of values) {
    if (val > peak) peak = val;
    const dd = ((peak - val) / peak) * 100;
    if (dd > maxDd) maxDd = dd;
  }
  return maxDd;
}

export function sharpeRatio(
  dailyReturns: number[],
  riskFreeRate: number = 0.05
): number {
  if (dailyReturns.length < 2) return 0;
  const annualReturn =
    (dailyReturns.reduce((s, r) => s + r, 0) / dailyReturns.length) * 252 * 100;
  const vol = volatility(dailyReturns);
  if (vol === 0) return 0;
  return (annualReturn - riskFreeRate * 100) / vol;
}
