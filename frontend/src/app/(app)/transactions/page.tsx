"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { useCategories } from "@/components/CategoryPicker";
import { TransactionList } from "@/components/TransactionList";
import { api } from "@/lib/api";
import type { AccountsResponse, TransactionsPage } from "@/lib/finance-types";

function TransactionsPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState(() => searchParams.get("category_id") ?? "");
  const startDate = searchParams.get("start_date") ?? "";
  const endDate = searchParams.get("end_date") ?? "";
  const excluded = searchParams.get("excluded") ?? "";
  const { data: categories } = useCategories();
  const { data: accounts } = useQuery({
    queryKey: ["accounts"],
    queryFn: () => api<AccountsResponse>("/accounts"),
  });
  const [accountId, setAccountId] = useState("");

  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (categoryId) params.set("category_id", categoryId);
  if (accountId) params.set("account_id", accountId);
  if (startDate) params.set("start_date", startDate);
  if (endDate) params.set("end_date", endDate);
  if (excluded) params.set("excluded", excluded);

  const { data, fetchNextPage, hasNextPage, isFetching, isLoading } = useInfiniteQuery({
    queryKey: ["transactions", search, categoryId, accountId, startDate, endDate, excluded],
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

  const transactions = data?.pages.flatMap((page) => page.transactions) ?? [];

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
      {!isLoading && transactions.length === 0 && (
        <p className="text-sm text-ink-3">No transactions found.</p>
      )}

      <TransactionList transactions={transactions} />

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

export default function TransactionsPage() {
  return (
    <Suspense fallback={<p className="text-sm text-ink-3">Loading transactions…</p>}>
      <TransactionsPageContent />
    </Suspense>
  );
}
