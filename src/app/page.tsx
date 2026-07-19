import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function Home() {
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
}
