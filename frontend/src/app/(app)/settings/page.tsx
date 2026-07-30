"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { PlaidLinkButton } from "@/components/PlaidLinkButton";
import { api } from "@/lib/api";

type PlaidItem = {
  id: string;
  institution_name: string | null;
  status: string;
  error_code: string | null;
  last_synced_at: string | null;
  account_count: number;
};

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: items, isLoading } = useQuery({
    queryKey: ["plaid-items"],
    queryFn: () => api<PlaidItem[]>("/plaid/items"),
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => api(`/plaid/items/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plaid-items"] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });

  return (
    <div className="max-w-3xl">
      <h1 className="mb-8 text-2xl font-semibold">Settings</h1>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Bank connections
          </h2>
          <PlaidLinkButton label="Connect a bank" />
        </div>

        {isLoading && <p className="text-sm text-neutral-500">Loading…</p>}
        {!isLoading && (items?.length ?? 0) === 0 && (
          <p className="text-sm text-neutral-500">No banks connected yet.</p>
        )}

        <div className="divide-y divide-neutral-800 rounded-xl border border-neutral-800 bg-neutral-900">
          {items?.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <div className="text-sm font-medium">
                  {item.institution_name ?? "Unknown institution"}
                  <span className="ml-2 text-xs text-neutral-500">
                    {item.account_count} account{item.account_count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="text-xs text-neutral-500">
                  {item.status === "active" ? (
                    item.last_synced_at ? (
                      `Last synced ${new Date(item.last_synced_at).toLocaleString()}`
                    ) : (
                      "Connected"
                    )
                  ) : (
                    <span className="text-amber-500">
                      Needs attention{item.error_code ? ` (${item.error_code})` : ""}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {item.status !== "active" && (
                  <PlaidLinkButton itemId={item.id} label="Reconnect" />
                )}
                <button
                  onClick={() => {
                    if (confirm("Remove this bank and all its accounts?")) {
                      removeItem.mutate(item.id);
                    }
                  }}
                  className="text-xs text-neutral-500 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
