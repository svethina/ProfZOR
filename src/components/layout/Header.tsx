import Link from "next/link";
import { Plus } from "lucide-react";
import { signOut } from "@/auth";
import { getOptionalSession } from "@/lib/session";

function shortName(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1]![0]}.`;
  }
  if (email) return email.split("@")[0];
  return "Профиль";
}

export async function Header() {
  const session = await getOptionalSession();
  const user = session?.user;
  const isAuthed = Boolean(user?.id);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 text-lg font-semibold tracking-tight text-slate-900"
        >
          PROFZOR
        </Link>

        <nav className="hidden items-center gap-1 text-sm sm:flex">
          <a
            href="/#recent"
            className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Свежие
          </a>
          <a
            href="/#popular"
            className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
          >
            Популярные
          </a>
          {isAuthed ? (
            <Link
              href="/dashboard"
              className="rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              Кабинет
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {isAuthed ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Создать</span>
              </Link>
              <span className="hidden max-w-[10rem] truncate text-sm text-slate-600 md:inline">
                {shortName(user?.name, user?.email)}
              </span>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-lg px-2.5 py-1.5 text-sm text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                >
                  Выйти
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-xl bg-slate-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-slate-800"
            >
              Войти
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
