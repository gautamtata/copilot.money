"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";

import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { api } from "@/lib/api";
import { formatCents } from "@/lib/format";

type Account = {
  id: string;
  name: string;
  mask: string | null;
  type: string;
  subtype: string | null;
  current_balance_cents: number | null;
  is_hidden: boolean;
  institution_name: string | null;
};

const TYPE_LABELS: Record<string, string> = {
  credit: "Credit cards",
  depository: "Cash",
  investment: "Investments",
  loan: "Loans",
  other: "Other",
};

export default function AccountsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<{ accounts: Account[] }>("/accounts"),
  });

  const toggleHidden = useMutation({
    mutationFn: (account: Account) =>
      api(`/accounts/${account.id}`, {
        method: "PATCH",
        body: JSON.stringify({ is_hidden: !account.is_hidden }),
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["accounts"] }),
  });

  const groups = new Map<string, Account[]>();
  for (const account of data?.accounts ?? []) {
    const key = TYPE_LABELS[account.type] ?? "Other";
    groups.set(key, [...(groups.get(key) ?? []), account]);
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="figure text-2xl font-bold">Accounts</h1>
        <PlaidLinkButton />
      </div>

      {isLoading && <p className="text-sm text-ink-3">Loading…</p>}
      {!isLoading && groups.size === 0 && (
        <p className="text-sm text-ink-3">
          No accounts yet — connect your first bank to get started.
        </p>
      )}

      {[...groups.entries()].map(([label, accounts]) => (
        <section key={label} className="mb-8">
          <h2 className="mb-3 eyebrow">
            {label}
          </h2>
          <div className="divide-y divide-line rounded-xl border border-line bg-card">
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between px-4 py-3">
                <Link
                  href={`/accounts/${account.id}`}
                  className={account.is_hidden ? "opacity-40" : ""}
                >
                  <div className="text-sm font-medium hover:underline">
                    {account.name}
                    {account.mask && (
                      <span className="ml-2 text-xs text-ink-3">••{account.mask}</span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3">{account.institution_name}</div>
                </Link>
                <div className="flex items-center gap-4">
                  <span className={`text-sm tabular-nums ${account.is_hidden ? "opacity-40" : ""}`}>
                    {account.current_balance_cents != null
                      ? formatCents(account.current_balance_cents)
                      : "—"}
                  </span>
                  <button
                    onClick={() => toggleHidden.mutate(account)}
                    className="text-xs text-ink-3 hover:text-ink"
                  >
                    {account.is_hidden ? "Show" : "Hide"}
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
