"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { MOBILE_OVERFLOW, MOBILE_PRIMARY } from "@/components/nav";
import { authClient } from "@/lib/auth-client";

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = MOBILE_OVERFLOW.some((i) => pathname.startsWith(i.href));

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-30 bg-ink/30 md:hidden"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="absolute bottom-16 left-3 right-3 rounded-2xl border border-line bg-card p-2 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {MOBILE_OVERFLOW.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMoreOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                  pathname.startsWith(href) ? "bg-moss text-ink" : "text-ink-2"
                }`}
              >
                <Icon size={17} strokeWidth={1.8} />
                {label}
              </Link>
            ))}
            <button
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/login";
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm text-ink-3"
            >
              <X size={17} strokeWidth={1.8} />
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-line bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {MOBILE_PRIMARY.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${
                active ? "text-pine" : "text-ink-3"
              }`}
            >
              <Icon size={19} strokeWidth={active ? 2.2 : 1.8} />
              {label}
            </Link>
          );
        })}
        <button
          onClick={() => setMoreOpen((v) => !v)}
          className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] ${
            moreActive || moreOpen ? "text-pine" : "text-ink-3"
          }`}
        >
          <Menu size={19} strokeWidth={1.8} />
          More
        </button>
      </nav>
    </>
  );
}
