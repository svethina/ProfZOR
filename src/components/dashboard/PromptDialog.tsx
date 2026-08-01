"use client";

import { useEffect, useState, useTransition } from "react";
import { createPrompt, updatePrompt } from "@/lib/prompts/actions";
import type { PromptFormValues } from "@/lib/prompts/schema";

type Props = {
  mode: "create" | "edit";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: {
    id: string;
    title: string;
    content: string;
    isPublic: boolean;
  };
};

export function PromptDialog({ mode, open, onOpenChange, initial }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [isPublic, setIsPublic] = useState(initial?.isPublic ?? false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? "");
      setContent(initial?.content ?? "");
      setIsPublic(initial?.isPublic ?? false);
      setError(null);
    }
  }, [open, initial]);

  if (!open) return null;

  function submit() {
    setError(null);
    const payload: PromptFormValues = { title, content, isPublic };
    startTransition(async () => {
      try {
        if (mode === "create") {
          await createPrompt(payload);
        } else if (initial?.id) {
          await updatePrompt(initial.id, payload);
        }
        onOpenChange(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Ошибка сохранения");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Закрыть"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === "create" ? "Новый вопрос" : "Редактировать вопрос"}
        </h2>

        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            <span className="text-slate-600">Заголовок (радикал / тема)</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </label>

          <label className="block text-sm">
            <span className="text-slate-600">Текст / подсказки</span>
            <textarea
              className="mt-1 min-h-28 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-400"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={10000}
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
            />
            Публичный (видно в «Готовое интервью»)
          </label>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Отмена
          </button>
          <button
            type="button"
            className="rounded-xl bg-sky-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            onClick={submit}
            disabled={pending}
          >
            {pending ? "Сохранение…" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
