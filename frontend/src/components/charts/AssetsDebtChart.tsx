"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { NetWorthPoint } from "@/lib/finance-types";
import { formatCents } from "@/lib/format";

const POS = "#1e7a4f";
const NEG = "#a63a2c";

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: NetWorthPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 shadow-md">
      <div className="eyebrow">{p.date}</div>
      <div className="mt-1 flex flex-col gap-0.5 text-sm tabular-nums text-ink">
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pos" />
          Assets {formatCents(p.assets_cents)}
        </span>
        <span>
          <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-neg" />
          Debt {formatCents(p.liabilities_cents)}
        </span>
      </div>
    </div>
  );
}

export function AssetsDebtChart({ series }: { series: NetWorthPoint[] }) {
  if (series.length < 2) {
    return (
      <div className="flex h-24 items-center text-xs text-ink-3">
        Assets and debt lines start drawing tomorrow — one point lands here every day.
      </div>
    );
  }
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="assets" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={POS} stopOpacity={0.14} />
              <stop offset="100%" stopColor={POS} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="debt" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={NEG} stopOpacity={0.14} />
              <stop offset="100%" stopColor={NEG} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "#c9d2c7", strokeWidth: 1 }} />
          <Area
            type="monotone"
            dataKey="assets_cents"
            stroke={POS}
            strokeWidth={2}
            fill="url(#assets)"
            dot={false}
            activeDot={{ r: 4, fill: POS, stroke: "#ffffff", strokeWidth: 2 }}
          />
          <Area
            type="monotone"
            dataKey="liabilities_cents"
            stroke={NEG}
            strokeWidth={2}
            fill="url(#debt)"
            dot={false}
            activeDot={{ r: 4, fill: NEG, stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
