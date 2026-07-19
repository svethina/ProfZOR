import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
  const hasDatabaseUrl = Boolean(process.env.DATABASE_URL);
  const hasDirectUrl = Boolean(process.env.DIRECT_URL);

  try {
    const notes = await prisma.note.findMany({
      orderBy: { createdAt: "desc" },
    });

    return (
      <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-6 py-16">
        <header className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">ProfZOR Notes</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Данные читаются из PostgreSQL (Neon) через Prisma.
          </p>
        </header>

        {notes.length === 0 ? (
          <p className="text-zinc-500">
            Заметок пока нет. Запустите seed:{" "}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-sm dark:bg-zinc-900">
              npx prisma db seed
            </code>
          </p>
        ) : (
          <ul className="space-y-3">
            {notes.map((note) => (
              <li
                key={note.id}
                className="border-b border-zinc-200 pb-3 dark:border-zinc-800"
              >
                <p className="font-medium">{note.title}</p>
                <p className="mt-1 text-sm text-zinc-500">
                  {note.createdAt.toLocaleString("ru-RU")} · {note.id}
                </p>
              </li>
            ))}
          </ul>
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
