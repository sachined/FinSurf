export function fmtUsd(value: number | null | undefined, prefix = '$'): string {
  if (value === null || value === undefined) return 'N/A';
  return `${prefix}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'N/A';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}
