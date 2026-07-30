"use client";

import { TransactionRow } from "@/components/TransactionRow";
import type { Transaction } from "@/lib/finance-types";

export function TransactionList({
  transactions,
  hideAccount = false,
}: {
  transactions: Transaction[];
  hideAccount?: boolean;
}) {
  const byDate = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    byDate.set(txn.date, [...(byDate.get(txn.date) ?? []), txn]);
  }

  return (
    <>
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
              <TransactionRow key={txn.id} txn={txn} hideAccount={hideAccount} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
