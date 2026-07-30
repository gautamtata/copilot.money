"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usePlaidLink, type PlaidLinkOnSuccess } from "react-plaid-link";

import { api } from "@/lib/api";

// OAuth institutions (Chase, Amex, ...) redirect back here mid-Link; we resume
// the session with the original link_token plus the full redirect URL.
export default function PlaidOAuthPage() {
  const router = useRouter();
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("plaid_link_token");
    if (token) setLinkToken(token);
    else setFailed(true);
  }, []);

  const onSuccess: PlaidLinkOnSuccess = async (publicToken, metadata) => {
    await api("/plaid/exchange", {
      method: "POST",
      body: JSON.stringify({
        public_token: publicToken,
        institution_id: metadata.institution?.institution_id ?? null,
        institution_name: metadata.institution?.name ?? null,
      }),
    });
    localStorage.removeItem("plaid_link_token");
    router.replace("/accounts");
  };

  const { open, ready } = usePlaidLink({
    token: linkToken,
    receivedRedirectUri: typeof window !== "undefined" ? window.location.href : undefined,
    onSuccess,
    onExit: () => router.replace("/accounts"),
  });

  useEffect(() => {
    if (ready && linkToken) open();
  }, [ready, linkToken, open]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper">
      <p className="text-sm text-ink-2">
        {failed
          ? "Couldn't resume the bank connection — please start again from Accounts."
          : "Finishing your bank connection…"}
      </p>
    </main>
  );
}
