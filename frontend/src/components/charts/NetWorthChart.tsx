"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { formatCents } from "@/lib/format";

type Point = { date: string; net_cents: number };

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: Point }[];
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2 shadow-md">
      <div className="eyebrow">{p.date}</div>
      <div className="figure text-sm font-semibold text-ink">
        {formatCents(p.net_cents)}
      </div>
    </div>
  );
}

export function NetWorthChart({ series }: { series: Point[] }) {
  if (series.length < 2) {
    return (
      <div className="flex h-24 items-center text-xs text-ink-3">
        Your net worth line starts drawing tomorrow — one point lands here every day.
      </div>
    );
  }
  return (
    <div className="h-40">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={series} margin={{ top: 6, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="nw" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#175a43" stopOpacity={0.18} />
              <stop offset="100%" stopColor="#175a43" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="date" hide />
          <YAxis hide domain={["dataMin", "dataMax"]} />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: "#c9d2c7", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="net_cents"
            stroke="#175a43"
            strokeWidth={2}
            fill="url(#nw)"
            dot={false}
            activeDot={{ r: 4, fill: "#175a43", stroke: "#ffffff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
