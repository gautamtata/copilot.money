"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Card } from "@/components/Card";
import { Guilloche } from "@/components/Guilloche";
import { NetWorthChart } from "@/components/charts/NetWorthChart";
import { api } from "@/lib/api";
import type { BudgetSummary, CashflowMonth, TransactionsPageData } from "@/lib/budget-types";
import { categoryColor } from "@/lib/colors";
import { formatCents } from "@/lib/format";

type NetWorth = {
  current_assets_cents: number;
  current_liabilities_cents: number;
  current_net_cents: number;
  series: { date: string; net_cents: number }[];
};

type Recurring = {
  id: string;
  name: string;
  merchant_name: string | null;
  category: { emoji: string } | null;
  average_amount_cents: number | null;
  next_expected_date: string | null;
  is_active: boolean;
};

function CardLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-xs text-ink-3 transition-colors hover:text-pine">
      {children}
    </Link>
  );
}

function UpcomingCharges() {
  const { data } = useQuery({
    queryKey: ["recurrings"],
    queryFn: () => api<{ recurrings: Recurring[] }>("/recurrings"),
  });

  const horizon = new Date(Date.now() + 14 * 24 * 3600 * 1000);
  const upcoming = (data?.recurrings ?? [])
    .filter(
      (r) =>
        r.is_active &&
        r.next_expected_date &&
        new Date(`${r.next_expected_date}T00:00:00`) <= horizon,
    )
    .sort((a, b) => (a.next_expected_date! < b.next_expected_date! ? -1 : 1))
    .slice(0, 6);

  if (upcoming.length === 0) {
    return <p className="text-sm text-ink-3">No payments due in the next two weeks.</p>;
  }
  return (
    <div className="flex flex-col gap-3">
      {upcoming.map((r) => (
        <div key={r.id} className="flex items-center justify-between text-sm">
          <span className="min-w-0 flex-1 truncate">
            {r.category && <span className="mr-2">{r.category.emoji}</span>}
            {r.merchant_name ?? r.name}
            <span className="ml-2 font-mono text-[11px] text-ink-3">
              {new Date(`${r.next_expected_date}T00:00:00`).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </span>
          </span>
          <span className="ml-4 tabular-nums text-ink-2">
            {r.average_amount_cents != null ? formatCents(r.average_amount_cents) : "—"}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary } = useQuery({
    queryKey: ["budget-summary"],
    queryFn: () => api<BudgetSummary>("/budgets/summary"),
  });
  const { data: cashflow } = useQuery({
    queryKey: ["cashflow", 2],
    queryFn: () => api<CashflowMonth[]>("/cashflow?months=2"),
  });
  const { data: recent } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: () => api<TransactionsPageData>("/transactions?limit=6"),
  });
  const { data: netWorth } = useQuery({
    queryKey: ["net-worth"],
    queryFn: () => api<NetWorth>("/net-worth/history"),
  });

  const left = summary ? summary.total_budget_cents - summary.total_spent_cents : 0;
  const pct = summary?.total_budget_cents
    ? Math.min(100, (summary.total_spent_cents / summary.total_budget_cents) * 100)
    : 0;
  const topCategories = [...(summary?.categories ?? [])]
    .filter((c) => c.spent_cents > 0)
    .sort((a, b) => b.spent_cents - a.spent_cents)
    .slice(0, 6);
  const maxSpent = topCategories[0]?.spent_cents ?? 1;

  const thisMonth = cashflow?.at(-1);
  const lastMonth = cashflow?.at(-2);
  const spendDelta =
    thisMonth && lastMonth && lastMonth.expense_cents > 0
      ? thisMonth.expense_cents - lastMonth.expense_cents
      : null;

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="mx-auto max-w-5xl">
      <div className="eyebrow mb-6">{today}</div>

      {/* Hero: the engraved net-worth note */}
      <section className="relative mb-6 overflow-hidden rounded-2xl border border-line bg-card p-6 shadow-[0_1px_2px_rgba(24,36,32,0.04)] md:p-8">
        <Guilloche
          size={480}
          rings={16}
          opacity={0.12}
          className="pointer-events-none absolute -right-40 -top-40 hidden w-[480px] text-pine sm:block"
        />
        <div className="relative">
          <div className="eyebrow mb-2">Net worth</div>
          <div className="figure text-4xl font-bold text-pine-deep md:text-5xl">
            {formatCents(netWorth?.current_net_cents ?? 0, { whole: true })}
          </div>
          <div className="mt-3 flex gap-5 text-xs text-ink-2">
            <span>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pos" />
              Assets{" "}
              <span className="tabular-nums">
                {formatCents(netWorth?.current_assets_cents ?? 0, { whole: true })}
              </span>
            </span>
            <span>
              <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-neg" />
              Debt{" "}
              <span className="tabular-nums">
                {formatCents(netWorth?.current_liabilities_cents ?? 0, { whole: true })}
              </span>
            </span>
          </div>
          <div className="mt-4">
            <NetWorthChart series={netWorth?.series ?? []} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Monthly spending" action={<CardLink href="/transactions">Transactions →</CardLink>}>
          {summary?.total_budget_cents ? (
            <>
              <div className="figure mb-1 text-3xl font-bold text-ink">
                {formatCents(Math.max(0, left), { whole: true })}
                <span className="ml-2 font-sans text-sm font-normal text-ink-3">left</span>
              </div>
              <div className="mb-3 text-sm text-ink-2">
                of {formatCents(summary.total_budget_cents, { whole: true })} budgeted
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-moss">
                <div
                  className={`h-full rounded-full ${left < 0 ? "bg-neg" : "bg-pos"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {left < 0 && (
                <div className="mt-2 text-xs text-neg">{formatCents(-left)} over budget</div>
              )}
            </>
          ) : (
            <p className="text-sm text-ink-3">
              No budgets yet — set monthly amounts on the{" "}
              <Link href="/categories" className="text-pine underline">
                Categories
              </Link>{" "}
              page.
            </p>
          )}
          {spendDelta !== null && (
            <div className="mt-4 font-mono text-[11px] text-ink-3">
              {spendDelta <= 0 ? "▼" : "▲"} {formatCents(Math.abs(spendDelta), { whole: true })}{" "}
              vs last month
            </div>
          )}
        </Card>

        <Card title="Top categories" action={<CardLink href="/categories">View all →</CardLink>}>
          {topCategories.length === 0 && (
            <p className="text-sm text-ink-3">No spending this month yet.</p>
          )}
          <div className="flex flex-col gap-3">
            {topCategories.map(({ category, spent_cents, budget_cents }) => (
              <div key={category.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span>
                    {category.emoji} {category.name}
                  </span>
                  <span className="tabular-nums text-ink-2">
                    {formatCents(spent_cents, { whole: true })}
                    {budget_cents ? (
                      <span className="text-ink-3">
                        {" "}
                        / {formatCents(budget_cents, { whole: true })}
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-moss">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(spent_cents / maxSpent) * 100}%`,
                      background: categoryColor(category.sort_order),
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Next two weeks" action={<CardLink href="/recurrings">Recurrings →</CardLink>}>
          <UpcomingCharges />
        </Card>

        <Card title="Recent transactions" action={<CardLink href="/transactions">View all →</CardLink>}>
          <div className="flex flex-col gap-3">
            {recent?.transactions.map((txn) => (
              <div key={txn.id} className="flex items-center justify-between text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {txn.category && <span className="mr-2">{txn.category.emoji}</span>}
                  {txn.merchant_name ?? txn.name}
                </span>
                <span
                  className={`ml-4 tabular-nums ${txn.amount_cents < 0 ? "font-medium text-pos" : "text-ink-2"}`}
                >
                  {txn.amount_cents < 0
                    ? `+${formatCents(-txn.amount_cents)}`
                    : formatCents(txn.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="This month" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-4 md:max-w-sm">
            <div>
              <div className="eyebrow mb-1">Income</div>
              <div className="figure text-2xl font-bold text-pos">
                {formatCents(thisMonth?.income_cents ?? 0, { whole: true })}
              </div>
            </div>
            <div>
              <div className="eyebrow mb-1">Spending</div>
              <div className="figure text-2xl font-bold text-ink">
                {formatCents(thisMonth?.expense_cents ?? 0, { whole: true })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
