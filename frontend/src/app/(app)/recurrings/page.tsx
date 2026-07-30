"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { formatCents } from "@/lib/format";

type Recurring = {
  id: string;
  name: string;
  merchant_name: string | null;
  category: { emoji: string; name: string } | null;
  cadence: string;
  average_amount_cents: number | null;
  next_expected_date: string | null;
  is_active: boolean;
  monthly_cents: number;
};

type RecurringsData = {
  monthly_total_cents: number;
  recurrings: Recurring[];
};

const CADENCE_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Every 2 weeks",
  semi_monthly: "Twice a month",
  monthly: "Monthly",
  quarterly: "Quarterly",
  annually: "Yearly",
  unknown: "Irregular",
};

const CADENCE_ORDER = [
  "weekly",
  "biweekly",
  "semi_monthly",
  "monthly",
  "quarterly",
  "annually",
  "unknown",
];

export default function RecurringsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["recurrings"],
    queryFn: () => api<RecurringsData>("/recurrings"),
  });

  const toggleActive = useMutation({
    mutationFn: (r: Recurring) =>
      api(`/recurrings/${r.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_active: !r.is_active }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["recurrings"] }),
  });

  const groups = new Map<string, Recurring[]>();
  for (const r of data?.recurrings ?? []) {
    groups.set(r.cadence, [...(groups.get(r.cadence) ?? []), r]);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Recurrings</h1>
        {data && (
          <span className="text-sm text-neutral-400">
            ≈ {formatCents(data.monthly_total_cents, { whole: true })}/month
          </span>
        )}
      </div>

      {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
      {!isLoading && groups.size === 0 && (
        <p className="text-sm text-neutral-500">
          No recurring payments detected yet — they appear as Plaid analyzes your
          transaction history.
        </p>
      )}

      {CADENCE_ORDER.filter((c) => groups.has(c)).map((cadence) => (
        <section key={cadence} className="mb-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-neutral-500">
            {CADENCE_LABELS[cadence]}
          </h2>
          <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
            {groups.get(cadence)!.map((r) => (
              <div
                key={r.id}
                className={`flex items-center justify-between px-4 py-3 ${r.is_active ? "" : "opacity-40"}`}
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">
                    {r.category && <span className="mr-2">{r.category.emoji}</span>}
                    {r.merchant_name ?? r.name}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {r.next_expected_date
                      ? `Next ~${new Date(`${r.next_expected_date}T00:00:00`).toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric" },
                        )}`
                      : "No prediction"}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm tabular-nums">
                    {r.average_amount_cents != null
                      ? formatCents(r.average_amount_cents)
                      : "—"}
                  </span>
                  <button
                    onClick={() => toggleActive.mutate(r)}
                    className="text-xs text-neutral-500 hover:text-neutral-300"
                  >
                    {r.is_active ? "Dismiss" : "Restore"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
