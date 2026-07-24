import { requireSession } from "@/lib/session";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

/**
 * Личный кабинет — только для авторизованных (также защищён proxy).
 */
export default async function DashboardPage() {
  const session = await requireSession();

  const cardsCount = await prisma.card.count({
    where: { authorId: session.user.id },
  });

  return (
    <main className="mx-auto flex min-h-full w-full max-w-2xl flex-col gap-8 px-6 py-16">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">Личный кабинет</h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            {session.user.name ?? session.user.email}
          </p>
        </div>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700"
          >
            Выйти
          </button>
        </form>
      </header>

      <ul className="space-y-2 text-sm">
        <li>
          <span className="text-zinc-500">userId: </span>
          <code className="rounded bg-zinc-100 px-1.5 py-0.5 dark:bg-zinc-900">
            {session.user.id}
          </code>
        </li>
        <li>
          <span className="text-zinc-500">email: </span>
          {session.user.email ?? "—"}
        </li>
        <li>
          <span className="text-zinc-500">роль: </span>
          {session.user.role}
        </li>
        <li>
          <span className="text-zinc-500">моих карточек: </span>
          {cardsCount}
        </li>
      </ul>

      <nav className="flex flex-wrap gap-4 text-sm">
        <Link href="/my-prompts" className="underline">
          Мои карточки
        </Link>
        <Link href="/" className="underline">
          На главную
        </Link>
      </nav>
    </main>
  );
}
