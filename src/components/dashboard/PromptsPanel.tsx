"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { PromptCard, type PromptCardData } from "./PromptCard";
import { PromptDialog } from "./PromptDialog";

type Props = {
  title: string;
  subtitle: string;
  currentUserId: string;
  items: PromptCardData[];
  page: number;
  totalPages: number;
  total: number;
  q: string;
  showCreate?: boolean;
  emptyText: string;
};

export function PromptsPanel({
  title,
  subtitle,
  currentUserId,
  items,
  page,
  totalPages,
  total,
  q,
  showCreate = false,
  emptyText,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(q);
  const [createOpen, setCreateOpen] = useState(false);

  // Debounce поиска
  useEffect(() => {
    const t = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (query.trim()) params.set("q", query.trim());
      else params.delete("q");
      params.delete("page");
      const next = params.toString();
      router.replace(next ? `${pathname}?${next}` : pathname);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function goPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(nextPage));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-1 flex-col gap-6 px-6 py-8 md:px-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {title}
        </h1>
        <h2 className="text-lg text-slate-600">{subtitle}</h2>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <input
          className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
          placeholder="Поиск по заголовку и тексту…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        {showCreate ? (
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white"
            onClick={() => setCreateOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Новый вопрос
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-10 text-center text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <PromptCard prompt={item} currentUserId={currentUserId} />
            </li>
          ))}
        </ul>
      )}

      {total > 0 ? (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>
            Стр. {page} из {totalPages} · {total} записей
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
              disabled={page <= 1}
              onClick={() => goPage(page - 1)}
            >
              Назад
            </button>
            <button
              type="button"
              className="rounded-lg border border-slate-200 px-3 py-1 disabled:opacity-40"
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            >
              Вперёд
            </button>
          </div>
        </div>
      ) : null}

      {showCreate ? (
        <PromptDialog
          mode="create"
          open={createOpen}
          onOpenChange={setCreateOpen}
        />
      ) : null}
    </div>
  );
}
