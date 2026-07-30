"use client";

import { useQuery } from "@tanstack/react-query";

import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { api } from "@/lib/api";
import { formatCents } from "@/lib/format";

type Holding = {
  id: string;
  account_name: string;
  ticker: string | null;
  security_name: string | null;
  security_type: string | null;
  quantity: number;
  close_price: number | null;
  cost_basis_cents: number | null;
  value_cents: number | null;
};

type Investments = {
  total_value_cents: number;
  holdings: Holding[];
  allocation: { label: string; value_cents: number; percent: number }[];
};

export default function InvestmentsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["investments"],
    queryFn: () => api<Investments>("/investments"),
  });

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="figure text-2xl font-bold">Investments</h1>
        <PlaidLinkButton kind="investment" label="Connect brokerage" />
      </div>

      {isLoading && <p className="text-sm text-ink-3">Loading…</p>}
      {!isLoading && (data?.holdings.length ?? 0) === 0 && (
        <p className="text-sm text-ink-3">
          No holdings yet — connect a brokerage (Robinhood, Wealthfront, …) to see your
          portfolio.
        </p>
      )}

      {data && data.holdings.length > 0 && (
        <>
          <div className="mb-8 rounded-xl border border-line bg-card p-5">
            <div className="text-xs text-ink-3">Total value</div>
            <div className="mb-4 figure text-3xl font-bold">
              {formatCents(data.total_value_cents)}
            </div>
            <div className="flex flex-col gap-2">
              {data.allocation.map((slice) => (
                <div key={slice.label} className="flex items-center gap-2">
                  <span className="w-28 text-xs text-ink-2">{slice.label}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-moss">
                    <div
                      className="h-full rounded-full bg-pine"
                      style={{ width: `${slice.percent}%` }}
                    />
                  </div>
                  <span className="w-14 text-right text-xs tabular-nums text-ink-2">
                    {slice.percent.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>

          <h2 className="mb-3 eyebrow">
            Holdings
          </h2>
          <div className="divide-y divide-line rounded-xl border border-line bg-card">
            {data.holdings.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">
                    {h.ticker ?? h.security_name ?? "—"}
                    {h.ticker && h.security_name && (
                      <span className="ml-2 truncate text-xs font-normal text-ink-3">
                        {h.security_name}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3">
                    {h.account_name}
                    {h.quantity !== 1 && ` · ${h.quantity.toLocaleString()} shares`}
                    {h.close_price != null && ` @ $${h.close_price.toLocaleString()}`}
                  </div>
                </div>
                <span className="text-sm tabular-nums">
                  {h.value_cents != null ? formatCents(h.value_cents) : "—"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
