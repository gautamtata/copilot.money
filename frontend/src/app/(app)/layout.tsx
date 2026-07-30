import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { Sidebar } from "@/components/Sidebar";
import { Providers } from "@/app/providers";
import { auth } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  return (
    <Providers>
      <div className="flex min-h-screen bg-neutral-950 text-neutral-100">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </Providers>
  );
}
