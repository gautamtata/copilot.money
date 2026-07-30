"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { CategoryPicker } from "@/components/CategoryPicker";
import { api } from "@/lib/api";
import type { Category, Transaction, TransactionsPage } from "@/lib/finance-types";
import { formatCents } from "@/lib/format";

export function TransactionRow({
  txn,
  hideAccount = false,
}: {
  txn: Transaction;
  hideAccount?: boolean;
}) {
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
        {!hideAccount && <div className="truncate text-xs text-ink-3">{txn.account_name}</div>}
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
