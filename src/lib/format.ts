// Formatting helpers ported from prototype lines 97-101

export const f2 = (n: number | null | undefined): string =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const f1 = (n: number | null | undefined): string =>
  n == null ? '—' : n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export const usd = (n: number | null | undefined): string =>
  n == null ? '—' : '$' + f2(n);

export const pct = (n: number | null | undefined): string =>
  n == null ? '—' : f1(n) + '%';

export const sign = (n: number | null | undefined): string =>
  n == null ? '—' : (n > 0 ? '+' : '') + f1(n) + '%';

export const signUsd = (n: number | null | undefined): string =>
  n == null ? '---' : (n > 0 ? '+' : '') + usd(n);

export const compactUsd = (n: number | null | undefined): string => {
  if (n == null) return '—';
  if (Math.abs(n) >= 1_000_000_000_000) return '$' + (n / 1_000_000_000_000).toFixed(1) + 'T';
  if (Math.abs(n) >= 1_000_000_000) return '$' + (n / 1_000_000_000).toFixed(1) + 'B';
  if (Math.abs(n) >= 1_000_000) return '$' + (n / 1_000_000).toFixed(1) + 'M';
  if (Math.abs(n) >= 1_000) return '$' + (n / 1_000).toFixed(1) + 'K';
  return usd(n);
};
