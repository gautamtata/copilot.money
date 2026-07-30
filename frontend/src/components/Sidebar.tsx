"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { authClient } from "@/lib/auth-client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/cash-flow", label: "Cash Flow" },
  { href: "/accounts", label: "Accounts" },
  { href: "/investments", label: "Investments" },
  { href: "/categories", label: "Categories" },
  { href: "/recurrings", label: "Recurrings" },
  { href: "/settings", label: "Settings" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-800 bg-neutral-950 p-4">
      <div className="mb-6 px-2 text-lg font-semibold text-neutral-100">copilot.money</div>
      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              pathname.startsWith(href)
                ? "bg-neutral-800 text-neutral-100"
                : "text-neutral-400 hover:bg-neutral-900 hover:text-neutral-200"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <button
        onClick={async () => {
          await authClient.signOut();
          window.location.href = "/login";
        }}
        className="rounded-lg px-3 py-2 text-left text-sm text-neutral-500 transition hover:bg-neutral-900 hover:text-neutral-300"
      >
        Sign out
      </button>
    </aside>
  );
}
