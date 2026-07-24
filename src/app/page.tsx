import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);

  try {
    const radicals = await prisma.radical.findMany({
      orderBy: { sortOrder: "asc" },
    });

    return (
      <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">ProfZOR</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Профиль за один разговор
          </p>
          <p className="text-sm">
            <a href="/login" className="underline">
              Войти через Google
            </a>
            {" · "}
            <a href="/dashboard" className="underline">
              Кабинет
            </a>
          </p>
        </header>

        {radicals.length === 0 ? (
          <p className="text-zinc-500">
            Радикалов пока нет. Запустите seed:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
              npx prisma db seed
            </code>
          </p>
        ) : (
          <ol className="list-decimal space-y-2 pl-5">
            {radicals.map((radical) => (
              <li key={radical.id} className="border-b border-zinc-200 pb-2 dark:border-zinc-800">
                <span className="font-medium">{radical.nameRu}</span>
              </li>
            ))}
          </ol>
        )}
      </main>
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return (
      <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">Ошибка подключения к БД</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Страница не смогла прочитать данные из Neon. Обычно это значит, что на
          Vercel не заданы переменные окружения.
        </p>

        <ul className="space-y-1 text-sm">
          <li>
            DATABASE_URL:{" "}
            <strong>{hasDatabaseUrl ? "задана" : "НЕ задана"}</strong>
          </li>
          <li>
            DIRECT_URL: <strong>{hasDirectUrl ? "задана" : "НЕ задана"}</strong>
          </li>
        </ul>

        <pre className="overflow-x-auto rounded-md bg-zinc-100 p-4 text-xs dark:bg-zinc-900">
          {message}
        </pre>

        <ol className="list-decimal space-y-2 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
          <li>Vercel → проект prof-zor → Settings → Environment Variables</li>
          <li>
            Добавьте DATABASE_URL (с -pooler) и DIRECT_URL (без -pooler) для
            Production
          </li>
          <li>Deployments → верхний деплой → Redeploy</li>
        </ol>
      </main>
    );
  }
}
