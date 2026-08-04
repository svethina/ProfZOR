import { Suspense } from "react";
import Link from "next/link";
import {
  HomeFeeds,
  HomeFeedsSkeleton,
} from "@/components/home/HomeFeeds";
import { getOptionalSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const session = await getOptionalSession();
  const userId = session?.user?.id ?? null;
  const canLike = Boolean(userId);

  const ctaHref = canLike ? "/dashboard" : "/login";
  const ctaLabel = canLike ? "Создать вопрос" : "Войти и начать";

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16 pt-10 sm:px-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sky-100 via-sky-50 to-blue-50 px-6 py-12 sm:px-10 sm:py-16">
        <div className="relative z-10 max-w-xl space-y-4">
          <p className="text-sm font-medium uppercase tracking-wide text-sky-800/70">
            PROFZOR
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Профиль за один разговор
          </h1>
          <p className="text-base text-slate-600 sm:text-lg">
            Публичные вопросы для интервью: смотрите свежие и популярные ленты,
            ставьте лайки и собирайте свою подборку в кабинете.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-sky-700"
            >
              {ctaLabel}
            </Link>
            <a
              href="#recent"
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white/80 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
            >
              Смотреть ленту
            </a>
          </div>
        </div>
      </section>

      <Suspense fallback={<HomeFeedsSkeleton />}>
        <HomeFeeds userId={userId} canLike={canLike} />
      </Suspense>
    </main>
  );
}
