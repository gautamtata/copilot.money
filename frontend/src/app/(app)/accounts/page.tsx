"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Card } from "@/components/Card";
import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { UtilizationBadge } from "@/components/UtilizationBadge";
import { AssetsDebtChart } from "@/components/charts/AssetsDebtChart";
import { api } from "@/lib/api";
import type { Account, AccountsResponse, NetWorth } from "@/lib/finance-types";
import { formatCents } from "@/lib/format";

const GROUPS: { type: string; label: string }[] = [
  { type: "credit", label: "Credit cards" },
  { type: "depository", label: "Cash" },
  { type: "investment", label: "Investments" },
  { type: "loan", label: "Loans" },
  { type: "other", label: "Other" },
];

const RANGES: { label: string; days: number | "ytd" }[] = [
  { label: "1W", days: 7 },
  { label: "1M", days: 30 },
  { label: "3M", days: 90 },
  { label: "YTD", days: "ytd" },
  { label: "1Y", days: 365 },
  { label: "ALL", days: 3650 },
];

function ytdDays(): number {
  const startOfYear = new Date(new Date().getFullYear(), 0, 1);
  return Math.max(7, Math.ceil((Date.now() - startOfYear.getTime()) / 86_400_000));
}

function OverviewHero() {
  const [range, setRange] = useState("1M");
  const days = RANGES.find((r) => r.label === range)?.days ?? 30;
  const resolvedDays = days === "ytd" ? ytdDays() : days;

  const { data } = useQuery({
    queryKey: ["net-worth", resolvedDays],
    queryFn: () => api<NetWorth>(`/net-worth/history?days=${resolvedDays}`),
  });

  return (
    <Card className="mb-8">
      <div className="mb-2 flex gap-8">
        <div>
          <div className="eyebrow mb-1">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-pos" />
            Assets
          </div>
          <div className="figure text-2xl font-bold text-ink">
            {formatCents(data?.current_assets_cents ?? 0, { whole: true })}
          </div>
        </div>
        <div>
          <div className="eyebrow mb-1">
            <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-neg" />
            Debt
          </div>
          <div className="figure text-2xl font-bold text-ink">
            {formatCents(data?.current_liabilities_cents ?? 0, { whole: true })}
          </div>
        </div>
      </div>
      <AssetsDebtChart series={data?.series ?? []} />
      <div className="mt-3 flex justify-center gap-1">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.label)}
            className={`rounded-lg px-2.5 py-1 font-mono text-[11px] transition ${
              range === r.label ? "bg-moss font-medium text-ink" : "text-ink-3 hover:text-ink"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </Card>
  );
}

function AccountRow({
  account,
  onToggleHidden,
}: {
  account: Account;
  onToggleHidden: (account: Account) => void;
}) {
  const dimmed = account.is_hidden ? "opacity-40" : "";
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <Link href={`/accounts/${account.id}`} className={`min-w-0 flex-1 ${dimmed}`}>
        <div className="truncate text-sm font-medium hover:underline">
          {account.name}
          {account.mask && <span className="ml-2 text-xs text-ink-3">••{account.mask}</span>}
        </div>
        <div className="truncate text-xs text-ink-3">{account.institution_name}</div>
      </Link>
      <div className={`flex items-center gap-3 ${dimmed}`}>
        {account.type === "credit" && (
          <UtilizationBadge
            balanceCents={account.current_balance_cents}
            limitCents={account.credit_limit_cents}
          />
        )}
        <span className="text-sm tabular-nums">
          {account.current_balance_cents != null
            ? formatCents(account.current_balance_cents)
            : "—"}
        </span>
      </div>
      <button
        onClick={() => onToggleHidden(account)}
        className="text-xs text-ink-3 hover:text-ink"
      >
        {account.is_hidden ? "Show" : "Hide"}
      </button>
    </div>
  );
}

function GroupTotal({ type, accounts }: { type: string; accounts: Account[] }) {
  const visible = accounts.filter((a) => !a.is_hidden);
  const total = visible.reduce((sum, a) => sum + (a.current_balance_cents ?? 0), 0);
  const withLimit = visible.filter((a) => (a.credit_limit_cents ?? 0) > 0);
  const balanceWithLimit = withLimit.reduce((sum, a) => sum + (a.current_balance_cents ?? 0), 0);
  const limit = withLimit.reduce((sum, a) => sum + (a.credit_limit_cents ?? 0), 0);

  return (
    <div className="flex items-center justify-between gap-4 bg-moss/40 px-4 py-3">
      <span className="text-xs text-ink-3">Total</span>
      <div className="flex items-center gap-3">
        {type === "credit" && (
          <UtilizationBadge balanceCents={balanceWithLimit} limitCents={limit} />
        )}
        <span className="text-sm font-medium tabular-nums">{formatCents(total)}</span>
      </div>
    </div>
  );
}

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<AccountsResponse>("/accounts"),
  });

  const toggleHidden = useMutation({
    mutationFn: (account: Account) =>
      api(`/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_hidden: !account.is_hidden }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const byType = new Map<string, Account[]>();
  for (const account of data?.accounts ?? []) {
    const key = GROUPS.some((g) => g.type === account.type) ? account.type : "other";
    byType.set(key, [...(byType.get(key) ?? []), account]);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="figure text-2xl font-bold">Accounts</h1>
        <PlaidLinkButton />
      </div>

      <OverviewHero />

      {isLoading && <p className="text-sm text-ink-3">Loading…</p>}
      {!isLoading && byType.size === 0 && (
        <p className="text-sm text-ink-3">
          No accounts yet — connect your first bank to get started.
        </p>
      )}

      {GROUPS.filter((g) => byType.has(g.type)).map(({ type, label }) => {
        const accounts = byType.get(type)!;
        return (
          <section key={type} className="mb-8">
            <h2 className="mb-3 eyebrow">{label}</h2>
            <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-card">
              {accounts.map((account) => (
                <AccountRow
                  key={account.id}
                  account={account}
                  onToggleHidden={toggleHidden.mutate}
                />
              ))}
              {accounts.length > 1 && <GroupTotal type={type} accounts={accounts} />}
            </div>
          </section>
        );
      })}
    </div>
  );
}
