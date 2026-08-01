import { Suspense } from "react";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { requireSession } from "@/lib/session";

type Active = "mine" | "public" | "favorites" | "history" | "settings";

export async function DashboardShell({
  active,
  children,
}: {
  active: Active;
  children: React.ReactNode;
}) {
  const session = await requireSession();

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900 md:flex-row">
      <DashboardSidebar user={session.user} active={active} />
      <main className="min-w-0 flex-1">
        <Suspense
          fallback={
            <div className="px-6 py-10 text-sm text-slate-500">Загрузка…</div>
          }
        >
          {children}
        </Suspense>
      </main>
    </div>
  );
}
