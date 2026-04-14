export function returnSinceSave(baselineValue: number, currentValue: number): number {
  if (baselineValue <= 0) return 0;
  return ((currentValue - baselineValue) / baselineValue) * 100;
}

export function cagr(baselineValue: number, currentValue: number, days: number): number {
  if (baselineValue <= 0 || days <= 0) return 0;
  const years = days / 365.25;
  if (years < 0.01) return returnSinceSave(baselineValue, currentValue);
  return (Math.pow(currentValue / baselineValue, 1 / years) - 1) * 100;
}
