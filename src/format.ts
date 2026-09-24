export function formatPercent(p: number): string {
  if (p > 0 && p < 0.001) return '<0.1%';
  if (p > 0.999 && p < 1) return '>99.9%';
  return `${(p * 100).toFixed(1).replace(/\.0$/, '')}%`;
}
