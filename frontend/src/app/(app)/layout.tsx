import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { MobileNav } from "@/components/MobileNav";
import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/app/providers";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="flex min-h-screen bg-paper text-ink">
        <Sidebar />
        <main className="min-w-0 flex-1 px-4 pb-24 pt-6 md:px-10 md:pb-12 md:pt-10">
          {children}
        </main>
        <MobileNav />
      </div>
    </Providers>
  );
}
