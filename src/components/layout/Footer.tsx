import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p>© {year} PROFZOR</p>
        <nav className="flex flex-wrap gap-4">
          <Link href="/" className="hover:text-slate-800">
            Главная
          </Link>
          <Link href="/login" className="hover:text-slate-800">
            Вход
          </Link>
          <Link href="/dashboard" className="hover:text-slate-800">
            Кабинет
          </Link>
        </nav>
      </div>
    </footer>
  );
}
