"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";

import { api } from "@/lib/api";

type Props = {
  itemId?: string; // set for update-mode reconnects
  label?: string;
};

export function PlaidLinkButton({ itemId, label = "Add account" }: Props) {
  const queryClient = useQueryClient();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: useCallback<PlaidLinkOnSuccess>(
      async (publicToken, metadata) => {
        if (!itemId) {
          await api("/plaid/exchange", {
            method: "POST",
            body: JSON.stringify({
              public_token: publicToken,
              institution_id: metadata.institution?.institution_id ?? null,
              institution_name: metadata.institution?.name ?? null,
            }),
          });
        }
        setLinkToken(null);
        queryClient.invalidateQueries({ queryKey: ["accounts"] });
        queryClient.invalidateQueries({ queryKey: ["plaid-items"] });
      },
      [itemId, queryClient],
    ),
  });

  // Plaid Link needs a token before it can open; fetch on first click, then
  // open as soon as the SDK reports ready.
  useEffect(() => {
    if (linkToken && ready) open();
  }, [linkToken, ready, open]);

  return (
    <button
      onClick={async () => {
        if (linkToken) return;
        setLoading(true);
        try {
          const { link_token } = await api<{ link_token: string }>("/plaid/link_token", {
            method: "POST",
            body: JSON.stringify({ item_id: itemId ?? null }),
          });
          // OAuth banks redirect the whole page; /plaid-oauth resumes Link
          // with this token after the bank sends the user back.
          localStorage.setItem("plaid_link_token", link_token);
          setLinkToken(link_token);
        } finally {
          setLoading(false);
        }
      }}
      disabled={loading}
      className="rounded-lg bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900 transition hover:bg-white disabled:opacity-50"
    >
      {loading ? "Connecting…" : label}
    </button>
  );
}
