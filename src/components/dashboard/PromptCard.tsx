"use client";

import { useEffect, useState, useTransition } from "react";
import {
  Globe,
  Lock,
  MessageSquare,
  Pencil,
  Star,
  Trash2,
} from "lucide-react";
import {
  deletePrompt,
  toggleFavorite,
  togglePublic,
} from "@/lib/prompts/actions";
import { PromptDialog } from "./PromptDialog";

export type PromptCardData = {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  isFavorite: boolean;
  userId: string;
};

type Props = {
  prompt: PromptCardData;
  currentUserId: string;
};

export function PromptCard({ prompt, currentUserId }: Props) {
  const isOwner = prompt.userId === currentUserId;
  const [pending, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useState(prompt);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => {
    setOptimistic(prompt);
  }, [prompt]);

  return (
    <>
      <article className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-700">
          <MessageSquare className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-slate-900">{optimistic.title}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-500">
            {optimistic.content}
          </p>
        </div>

        <div className="flex shrink-0 items-start gap-1">
          {isOwner ? (
            <button
              type="button"
              title="Избранное"
              disabled={pending}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-amber-500"
              onClick={() => {
                setOptimistic((p) => ({ ...p, isFavorite: !p.isFavorite }));
                startTransition(async () => {
                  try {
                    await toggleFavorite(prompt.id);
                  } catch {
                    setOptimistic(prompt);
                  }
                });
              }}
            >
              <Star
                className={`h-4 w-4 ${optimistic.isFavorite ? "fill-amber-400 text-amber-500" : ""}`}
              />
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              title={optimistic.isPublic ? "Сделать приватным" : "Сделать публичным"}
              disabled={pending}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-sky-700"
              onClick={() => {
                setOptimistic((p) => ({ ...p, isPublic: !p.isPublic }));
                startTransition(async () => {
                  try {
                    await togglePublic(prompt.id);
                  } catch {
                    setOptimistic(prompt);
                  }
                });
              }}
            >
              {optimistic.isPublic ? (
                <Globe className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              title="Редактировать"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-700"
              onClick={() => setEditOpen(true)}
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}

          {isOwner ? (
            <button
              type="button"
              title="Удалить"
              disabled={pending}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              onClick={() => {
                if (!window.confirm("Удалить этот вопрос?")) return;
                startTransition(async () => {
                  await deletePrompt(prompt.id);
                });
              }}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </article>

      {isOwner && editOpen ? (
        <PromptDialog
          mode="edit"
          initial={optimistic}
          open={editOpen}
          onOpenChange={setEditOpen}
        />
      ) : null}
    </>
  );
}
