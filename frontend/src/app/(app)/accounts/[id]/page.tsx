"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";

import { Sparkline } from "@/components/Sparkline";
import { TransactionList } from "@/components/TransactionList";
import { UtilizationBadge } from "@/components/UtilizationBadge";
import { api } from "@/lib/api";
import type { AccountsResponse, TransactionsPage } from "@/lib/finance-types";
import { formatCents } from "@/lib/format";
import { utilizationFillClass, utilizationPct } from "@/lib/utilization";

type HistoryPoint = { date: string; current_balance_cents: number | null };

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<AccountsResponse>("/accounts"),
  });
  const { data: history } = useQuery({
    queryKey: ["account-history", id],
    queryFn: () => api<HistoryPoint[]>(`/accounts/${id}/history`),
  });
  const {
    data: txnPages,
    fetchNextPage,
    hasNextPage,
    isFetching,
    isLoading: txnsLoading,
  } = useInfiniteQuery({
    queryKey: ["transactions", { accountId: id }],
    queryFn: ({ pageParam }) =>
      api<TransactionsPage>(
        `/transactions?account_id=${id}${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const account = accounts?.accounts.find((a) => a.id === id);
  const utilization =
    account?.type === "credit"
      ? utilizationPct(account.current_balance_cents, account.credit_limit_cents)
      : null;
  const transactions = txnPages?.pages.flatMap((p) => p.transactions) ?? [];

  return (
    <div className="max-w-3xl">
      <Link href="/accounts" className="text-xs text-ink-3 hover:text-ink">
        ← Accounts
      </Link>
      <h1 className="mt-3 figure text-2xl font-bold">
        {account?.name ?? "Account"}
        {account?.mask && (
          <span className="ml-2 font-sans text-sm font-normal text-ink-3">••{account.mask}</span>
        )}
      </h1>
      {account?.institution_name && (
        <div className="mt-1 text-xs text-ink-3">{account.institution_name}</div>
      )}
      <div className="mt-2 mb-8 flex items-center gap-3">
        <span className="text-lg tabular-nums text-ink-2">
          {account?.current_balance_cents != null
            ? formatCents(account.current_balance_cents)
            : ""}
          {utilization != null && (
            <span className="text-ink-3">
              {" "}
              / {formatCents(account!.credit_limit_cents!)}
            </span>
          )}
        </span>
        {account?.type === "credit" && (
          <UtilizationBadge
            balanceCents={account.current_balance_cents}
            limitCents={account.credit_limit_cents}
          />
        )}
      </div>

      {utilization != null && (
        <div className="mb-8">
          <div className="h-2 overflow-hidden rounded-full bg-moss">
            <div
              className={`h-full rounded-full ${utilizationFillClass(utilization)}`}
              style={{ width: `${Math.min(100, utilization)}%` }}
            />
          </div>
          <div className="mt-2 text-xs text-ink-3">
            {utilization.toFixed(1)}% of your {formatCents(account!.credit_limit_cents!)} limit
            in use
          </div>
        </div>
      )}

      <div className="mb-8 rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 eyebrow">Balance history</h2>
        <Sparkline
          values={(history ?? [])
            .filter((p) => p.current_balance_cents != null)
            .map((p) => p.current_balance_cents as number)}
          height={80}
          stroke="#175a43"
        />
      </div>

      <h2 className="mb-3 eyebrow">Transactions</h2>
      {txnsLoading && <p className="text-sm text-ink-3">Loading…</p>}
      {!txnsLoading && transactions.length === 0 && (
        <p className="text-sm text-ink-3">No transactions yet.</p>
      )}
      <TransactionList transactions={transactions} hideAccount />

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetching}
          className="mb-8 w-full rounded-lg border border-line py-2 text-sm text-ink-2 transition hover:border-line-strong disabled:opacity-50"
        >
          {isFetching ? "Loading…" : "Load more"}
        </button>
      )}
    </div>
  );
}
