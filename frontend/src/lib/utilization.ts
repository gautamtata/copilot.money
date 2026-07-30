export function utilizationPct(
  balanceCents: number | null | undefined,
  limitCents: number | null | undefined,
): number | null {
  if (balanceCents == null || limitCents == null || limitCents <= 0) return null;
  return Math.max(0, (balanceCents / limitCents) * 100);
}

export function utilizationFillClass(pct: number): string {
  if (pct >= 70) return "bg-neg";
  if (pct >= 30) return "bg-warn";
  return "bg-pos";
}
