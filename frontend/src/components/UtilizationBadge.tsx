import { utilizationFillClass, utilizationPct } from "@/lib/utilization";

export function UtilizationBadge({
  balanceCents,
  limitCents,
}: {
  balanceCents: number | null | undefined;
  limitCents: number | null | undefined;
}) {
  const pct = utilizationPct(balanceCents, limitCents);
  if (pct == null) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-moss px-2 py-0.5 text-xs tabular-nums text-ink-2">
      <span className={`h-1.5 w-1.5 rounded-full ${utilizationFillClass(pct)}`} />
      {pct.toFixed(1)}%
    </span>
  );
}
