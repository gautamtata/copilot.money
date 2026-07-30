"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/components/nav";
import { authClient } from "@/lib/auth-client";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-paper px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 px-2">
        <span className="figure text-xl font-bold text-pine-deep">copilot</span>
        <span className="figure text-xl font-bold text-ink-3">.money</span>
      </Link>
      <nav className="flex flex-1 flex-col gap-0.5">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-pine text-white shadow-sm"
                  : "text-ink-2 hover:bg-moss hover:text-ink"
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={async () => {
          await authClient.signOut();
          window.location.href = "/login";
        }}
        className="rounded-xl px-3 py-2 text-left text-sm text-ink-3 transition-colors hover:bg-moss hover:text-ink"
      >
        Sign out
      </button>
    </aside>
  );
}
