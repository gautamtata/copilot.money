"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";

import { Sparkline } from "@/components/Sparkline";
import { api } from "@/lib/api";
import type { BudgetSummary, CashflowMonth, TransactionsPageData } from "@/lib/budget-types";
import { formatCents } from "@/lib/format";

type NetWorth = {
  current_assets_cents: number;
  current_liabilities_cents: number;
  current_net_cents: number;
  series: { date: string; net_cents: number }[];
};

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-300">{title}</h2>
        {action}
      </div>
      {children}
    </section>
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

  return (
    <div className="grid max-w-5xl grid-cols-1 gap-6 lg:grid-cols-2">
      <Card
        title="Net worth"
        action={
          <Link href="/accounts" className="text-xs text-neutral-500 hover:text-neutral-300">
            Accounts →
          </Link>
        }
      >
        <div className="mb-1 text-3xl font-semibold tabular-nums">
          {formatCents(netWorth?.current_net_cents ?? 0, { whole: true })}
        </div>
        <div className="mb-3 flex gap-4 text-xs">
          <span className="text-neutral-500">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-green-500" />
            Assets {formatCents(netWorth?.current_assets_cents ?? 0, { whole: true })}
          </span>
          <span className="text-neutral-500">
            <span className="mr-1 inline-block h-2 w-2 rounded-full bg-orange-500" />
            Debt {formatCents(netWorth?.current_liabilities_cents ?? 0, { whole: true })}
          </span>
        </div>
        <Sparkline values={netWorth?.series.map((p) => p.net_cents) ?? []} />
      </Card>

      <Card
        title="Monthly spending"
        action={
          <Link href="/transactions" className="text-xs text-neutral-500 hover:text-neutral-300">
            Transactions →
          </Link>
        }
      >
        {summary?.total_budget_cents ? (
          <>
            <div className="mb-1 text-3xl font-semibold tabular-nums">
              {formatCents(Math.max(0, left), { whole: true })}{" "}
              <span className="text-base font-normal text-neutral-500">left</span>
            </div>
            <div className="mb-3 text-sm text-neutral-500">
              of {formatCents(summary.total_budget_cents, { whole: true })} budgeted
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
              <div
                className={`h-full rounded-full ${left < 0 ? "bg-red-500" : "bg-green-500"}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            {left < 0 && (
              <div className="mt-2 text-xs text-red-400">
                {formatCents(-left)} over budget
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-neutral-500">
            No budgets yet — set monthly amounts on the{" "}
            <Link href="/categories" className="underline">
              Categories
            </Link>{" "}
            page.
          </p>
        )}
        {spendDelta !== null && (
          <div className="mt-4 text-xs text-neutral-500">
            {spendDelta <= 0 ? "▼" : "▲"} {formatCents(Math.abs(spendDelta), { whole: true })}{" "}
            vs last month
          </div>
        )}
      </Card>

      <Card
        title="Top categories"
        action={
          <Link href="/categories" className="text-xs text-neutral-500 hover:text-neutral-300">
            View all →
          </Link>
        }
      >
        {topCategories.length === 0 && (
          <p className="text-sm text-neutral-500">No spending this month yet.</p>
        )}
        <div className="flex flex-col gap-3">
          {topCategories.map(({ category, spent_cents, budget_cents }) => (
            <div key={category.id}>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span>
                  {category.emoji} {category.name}
                </span>
                <span className="tabular-nums text-neutral-400">
                  {formatCents(spent_cents, { whole: true })}
                  {budget_cents ? (
                    <span className="text-neutral-600">
                      {" "}
                      / {formatCents(budget_cents, { whole: true })}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className="h-full rounded-full bg-neutral-500"
                  style={{ width: `${(spent_cents / maxSpent) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card
        title="Recent transactions"
        action={
          <Link href="/transactions" className="text-xs text-neutral-500 hover:text-neutral-300">
            View all →
          </Link>
        }
      >
        <div className="flex flex-col gap-2.5">
          {recent?.transactions.map((txn) => (
            <div key={txn.id} className="flex items-center justify-between text-sm">
              <span className="min-w-0 flex-1 truncate">
                {txn.category && <span className="mr-2">{txn.category.emoji}</span>}
                {txn.merchant_name ?? txn.name}
              </span>
              <span
                className={`ml-4 tabular-nums ${txn.amount_cents < 0 ? "text-green-400" : "text-neutral-300"}`}
              >
                {txn.amount_cents < 0
                  ? `+${formatCents(-txn.amount_cents)}`
                  : formatCents(txn.amount_cents)}
              </span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="This month">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="text-xs text-neutral-500">Income</div>
            <div className="text-xl font-semibold tabular-nums text-green-400">
              {formatCents(thisMonth?.income_cents ?? 0, { whole: true })}
            </div>
          </div>
          <div>
            <div className="text-xs text-neutral-500">Spending</div>
            <div className="text-xl font-semibold tabular-nums">
              {formatCents(thisMonth?.expense_cents ?? 0, { whole: true })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
