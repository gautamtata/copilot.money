"use client";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950">
      <div className="flex flex-col items-center gap-6 rounded-2xl border border-neutral-800 bg-neutral-900 p-10">
        <h1 className="text-2xl font-semibold text-neutral-100">copilot.money</h1>
        <p className="text-sm text-neutral-400">Personal finance, your way.</p>
        <button
          onClick={() =>
            authClient.signIn.social({ provider: "google", callbackURL: "/dashboard" })
          }
          className="rounded-lg bg-neutral-100 px-5 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-white"
        >
          Continue with Google
        </button>
      </div>
    </main>
  );
}
