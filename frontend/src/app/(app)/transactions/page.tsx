"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useState } from "react";

import { CategoryPicker, useCategories } from "@/components/CategoryPicker";
import { api } from "@/lib/api";
import type { Category, Transaction, TransactionsPage } from "@/lib/finance-types";
import { formatCents } from "@/lib/format";

function TransactionRow({ txn }: { txn: Transaction }) {
  const queryClient = useQueryClient();

  const setCategory = useMutation({
    mutationFn: async ({ category, createRule }: { category: Category; createRule: boolean }) => {
      if (createRule) {
        await api("/category_rules", {
          method: "POST",
          body: JSON.stringify({
            merchant_pattern: txn.merchant_name ?? txn.name,
            match_type: "exact",
            category_id: category.id,
            apply_to_existing: true,
          }),
        });
      } else {
        await api(`/transactions/${txn.id}`, {
          method: "PATCH",
          body: JSON.stringify({ category_id: category.id }),
        });
      }
    },
    onMutate: async ({ category }) => {
      // Optimistically swap the category chip in every cached page.
      await queryClient.cancelQueries({ queryKey: ["transactions"] });
      queryClient.setQueriesData<{ pages: TransactionsPage[]; pageParams: unknown[] }>(
        { queryKey: ["transactions"] },
        (old) =>
          old && {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              transactions: page.transactions.map((t) =>
                t.id === txn.id ? { ...t, category, categorized_by: "user" } : t,
              ),
            })),
          },
      );
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  const income = txn.amount_cents < 0;
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className={`truncate text-sm ${txn.pending ? "italic text-ink-2" : ""}`}>
          {txn.merchant_name ?? txn.name}
          {txn.pending && <span className="ml-2 text-xs text-ink-3">pending</span>}
        </div>
        <div className="truncate text-xs text-ink-3">{txn.account_name}</div>
      </div>
      <CategoryPicker
        value={txn.category}
        merchantLabel={txn.merchant_name ?? txn.name}
        onSelect={(category, createRule) => setCategory.mutate({ category, createRule })}
      />
      <span className={`w-24 text-right text-sm tabular-nums ${income ? "text-pos" : ""}`}>
        {income ? `+${formatCents(-txn.amount_cents)}` : formatCents(txn.amount_cents)}
      </span>
    </div>
  );
}

export default function TransactionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const { data: categories } = useCategories();
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<{ accounts: { id: string; name: string }[] }>("/accounts"),
  });
  const [accountId, setAccountId] = useState("");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (categoryId) params.set("category_id", categoryId);
  if (accountId) params.set("account_id", accountId);

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteQuery({
    queryKey: ["transactions", search, categoryId, accountId],
    queryFn: ({ pageParam }) =>
      api<TransactionsPage>(
        `/transactions?${params.toString()}${pageParam ? `&cursor=${pageParam}` : ""}`,
      ),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.next_cursor,
  });

  const syncNow = useMutation({
    mutationFn: () => api("/sync", { method: "POST" }),
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
      }, 4000);
    },
  });

  const byDate = new Map<string, Transaction[]>();
  for (const page of data?.pages ?? []) {
    for (const txn of page.transactions) {
      byDate.set(txn.date, [...(byDate.get(txn.date) ?? []), txn]);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="figure text-2xl font-bold">Transactions</h1>
        <button
          onClick={() => syncNow.mutate()}
          disabled={syncNow.isPending}
          className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink-2 transition hover:border-line-strong disabled:opacity-50"
        >
          {syncNow.isPending ? "Syncing…" : "Sync now"}
        </button>
      </div>

      <div className="mb-6 flex gap-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search transactions…"
          className="flex-1 rounded-lg border border-line-strong bg-card px-3 py-2 text-sm outline-none placeholder:text-ink-3 focus:border-pine"
        />
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-lg border border-line-strong bg-card px-2 py-2 text-sm"
        >
          <option value="">All categories</option>
          {categories?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.emoji} {c.name}
            </option>
          ))}
        </select>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="rounded-lg border border-line-strong bg-card px-2 py-2 text-sm"
        >
          <option value="">All accounts</option>
          {accounts?.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-ink-3">Loading…</p>}
      {!isLoading && byDate.size === 0 && (
        <p className="text-sm text-ink-3">No transactions found.</p>
      )}

      {[...byDate.entries()].map(([date, txns]) => (
        <section key={date} className="mb-6">
          <h2 className="mb-2 eyebrow">
            {new Date(`${date}T00:00:00`).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </h2>
          <div className="divide-y divide-line rounded-xl border border-line bg-card">
            {txns.map((txn) => (
              <TransactionRow key={txn.id} txn={txn} />
            ))}
          </div>
        </section>
      ))}

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
