import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PromptsPanel } from "@/components/dashboard/PromptsPanel";
import { listPrompts, type PromptSort } from "@/lib/prompts/queries";
import { requireSession } from "@/lib/session";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ page?: string; q?: string; sort?: string }>;
};

export default async function PublicPromptsPage({ searchParams }: Props) {
  const session = await requireSession();
  const params = await searchParams;
  const page = Number(params.page ?? "1") || 1;
  const q = params.q ?? "";
  const sort: PromptSort =
    params.sort === "popular" ? "popular" : "recent";

  const data = await listPrompts({
    mode: "public",
    userId: session.user.id,
    page,
    q,
    sort,
  });

  return (
    <DashboardShell active="public">
      <PromptsPanel
        title="Личный кабинет"
        subtitle="Готовое интервью"
        currentUserId={session.user.id}
        items={data.items}
        page={data.page}
        totalPages={data.totalPages}
        total={data.total}
        q={q}
        sort={sort}
        showLike
        showSort
        emptyText="Публичных вопросов пока нет"
      />
    </DashboardShell>
  );
}
