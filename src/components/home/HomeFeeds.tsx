import { HomePromptFeed } from "@/components/home/HomePromptFeed";
import { listHomePublicFeeds } from "@/lib/prompts/queries";

export async function HomeFeeds({
  userId,
  canLike,
}: {
  userId: string | null;
  canLike: boolean;
}) {
  let recent: Awaited<ReturnType<typeof listHomePublicFeeds>>["recent"] = [];
  let popular: Awaited<ReturnType<typeof listHomePublicFeeds>>["popular"] = [];
  let dbError: string | null = null;

  try {
    const feeds = await listHomePublicFeeds({ userId, take: 12 });
    recent = feeds.recent;
    popular = feeds.popular;
  } catch (error) {
    dbError = error instanceof Error ? error.message : String(error);
  }

  if (dbError) {
    return (
      <div className="mt-10 space-y-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-sm text-red-800">
        <p className="font-medium">Не удалось загрузить публичные вопросы</p>
        <pre className="overflow-x-auto text-xs opacity-80">{dbError}</pre>
        <p className="text-red-700/80">
          Проверьте DATABASE_URL / DIRECT_URL и доступность Postgres.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-2 lg:gap-10">
      <HomePromptFeed
        id="recent"
        title="Свежие"
        subtitle="Недавно опубликованные вопросы"
        items={recent}
        canLike={canLike}
        emptyText="Пока нет публичных вопросов. Станьте первым — создайте в кабинете."
      />
      <HomePromptFeed
        id="popular"
        title="Популярные"
        subtitle="Топ по количеству лайков"
        items={popular}
        canLike={canLike}
        emptyText="Ещё нет лайков — появятся вместе с активностью сообщества."
      />
    </div>
  );
}

export function HomeFeedsSkeleton() {
  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-2">
      {[0, 1].map((col) => (
        <div key={col} className="space-y-4">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-slate-100" />
          <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-100 bg-slate-50"
            />
          ))}
        </div>
      ))}
    </div>
  );
}
