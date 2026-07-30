"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

import { api } from "@/lib/api";
import type { CashflowMonth } from "@/lib/budget-types";
import { formatCents } from "@/lib/format";

export default function CashFlowPage() {
  const [months, setMonths] = useState(6);
  const { data, isLoading } = useQuery({
    queryKey: ["cashflow", months],
    queryFn: () => api<CashflowMonth[]>(`/cashflow?months=${months}`),
  });

  const max = Math.max(1, ...(data ?? []).flatMap((m) => [m.income_cents, m.expense_cents]));

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Cash Flow</h1>
        <select
          value={months}
          onChange={(e) => setMonths(Number(e.target.value))}
          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm"
        >
          <option value={3}>3 months</option>
          <option value={6}>6 months</option>
          <option value={12}>12 months</option>
        </select>
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}

      <div className="flex flex-col gap-4">
        {data?.map((m) => {
          const savingsRate =
            m.income_cents > 0 ? Math.round((m.net_cents / m.income_cents) * 100) : null;
          return (
            <div
              key={m.month}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">
                  {new Date(`${m.month}T00:00:00`).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`text-sm tabular-nums ${m.net_cents >= 0 ? "text-green-400" : "text-red-400"}`}
                >
                  {m.net_cents >= 0 ? "+" : ""}
                  {formatCents(m.net_cents, { whole: true })} net
                  {savingsRate !== null && (
                    <span className="ml-2 text-xs text-neutral-500">
                      {savingsRate}% saved
                    </span>
                  )}
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-neutral-500">Income</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-800">
                    <div
                      className="h-full rounded bg-green-600/70"
                      style={{ width: `${(m.income_cents / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs tabular-nums text-neutral-400">
                    {formatCents(m.income_cents, { whole: true })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-16 text-xs text-neutral-500">Spending</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-800">
                    <div
                      className="h-full rounded bg-red-500/60"
                      style={{ width: `${(m.expense_cents / max) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 text-right text-xs tabular-nums text-neutral-400">
                    {formatCents(m.expense_cents, { whole: true })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
