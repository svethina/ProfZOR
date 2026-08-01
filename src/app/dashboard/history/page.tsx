import { DashboardShell } from "@/components/dashboard/DashboardShell";

export const dynamic = "force-dynamic";

export default function HistoryPage() {
  return (
    <DashboardShell active="history">
      <div className="px-6 py-8 md:px-10">
        <h1 className="text-3xl font-semibold text-slate-900">Личный кабинет</h1>
        <h2 className="mt-1 text-lg text-slate-600">История</h2>
        <p className="mt-8 rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-slate-500">
          Скоро…
        </p>
      </div>
    </DashboardShell>
  );
}
