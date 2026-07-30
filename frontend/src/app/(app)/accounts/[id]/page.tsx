"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { use } from "react";

import { Sparkline } from "@/components/Sparkline";
import { api } from "@/lib/api";
import { formatCents } from "@/lib/format";

type HistoryPoint = { date: string; current_balance_cents: number | null };

export default function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () =>
      api<{ accounts: { id: string; name: string; current_balance_cents: number | null }[] }>(
        "/accounts",
      ),
  });
  const { data: history } = useQuery({
    queryKey: ["account-history", id],
    queryFn: () => api<HistoryPoint[]>(`/accounts/${id}/history`),
  });

  const account = accounts?.accounts.find((a) => a.id === id);

  return (
    <div className="max-w-3xl">
      <Link href="/accounts" className="text-xs text-ink-3 hover:text-ink">
        ← Accounts
      </Link>
      <h1 className="mb-1 mt-3 figure text-2xl font-bold">{account?.name ?? "Account"}</h1>
      <div className="mb-8 text-lg tabular-nums text-ink-2">
        {account?.current_balance_cents != null
          ? formatCents(account.current_balance_cents)
          : ""}
      </div>

      <div className="rounded-xl border border-line bg-card p-5">
        <h2 className="mb-4 text-sm font-medium text-ink-2">Balance history</h2>
        <Sparkline
          values={(history ?? [])
            .filter((p) => p.current_balance_cents != null)
            .map((p) => p.current_balance_cents as number)}
          height={80}
          stroke="#175a43"
        />
      </div>
    </div>
  );
}
