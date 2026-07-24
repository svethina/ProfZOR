import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * «Мои промты» из PROMPT.md → в ProfZOR это карточки текущего пользователя.
 * Приватные (isPrivate) и публичные свои карточки видны только здесь владельцу
 * (публичная лента не показывает чужие приватные).
 */
export default async function MyPromptsPage() {
  const session = await requireSession();

  const cards = await prisma.card.findMany({
    where: { authorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: { radical: true },
  });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Мои карточки</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Карточки, связанные с вашим userId. Приватные видите только вы.
        </p>
      </header>

      {cards.length === 0 ? (
        <p className="text-zinc-500">У вас пока нет карточек.</p>
      ) : (
        <ul className="space-y-4">
          {cards.map((card) => (
            <li
              key={card.id}
              className="border-b border-zinc-200 pb-4 dark:border-zinc-800"
            >
              <p className="font-medium">{card.title}</p>
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {card.radical.nameRu}
                {card.isPrivate ? " · приватная" : " · публичная"}
                {card.isHidden ? " · скрыта модерацией" : ""}
              </p>
            </li>
          ))}
        </ul>
      )}

      <nav className="flex gap-4 text-sm">
        <Link href="/dashboard" className="underline">
          Кабинет
        </Link>
        <Link href="/" className="underline">
          На главную
        </Link>
      </nav>
    </main>
  );
}
