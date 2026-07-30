"use client";

import { Guilloche } from "@/components/Guilloche";
import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-6">
      <Guilloche
        size={720}
        rings={18}
        opacity={0.1}
        className="pointer-events-none absolute -top-56 left-1/2 w-[720px] -translate-x-1/2 text-pine"
      />
      <div className="relative flex w-full max-w-sm flex-col items-center gap-8 text-center">
        <div>
          <div className="eyebrow mb-3">Private ledger · est. 2026</div>
          <h1 className="figure text-4xl font-bold text-pine-deep">
            copilot<span className="text-ink-3">.money</span>
          </h1>
          <p className="mt-3 text-sm text-ink-2">
            Every account, transaction, and dollar — in one place, on your terms.
          </p>
        </div>
        <button
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })
          }
          className="w-full rounded-xl bg-pine px-5 py-3 text-sm font-medium text-white shadow-sm transition hover:bg-pine-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pine"
        >
          Continue with Google
        </button>
        <p className="text-xs text-ink-3">Single-seat access. This ledger is yours alone.</p>
      </div>
    </main>
  );
}
