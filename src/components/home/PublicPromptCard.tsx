import { MessageSquare, ThumbsUp } from "lucide-react";
import { LikeButton } from "@/components/dashboard/LikeButton";
import { formatRelativeRu } from "@/lib/format-relative";
import type { PromptListItem } from "@/lib/prompts/queries";

type Props = {
  prompt: PromptListItem;
  /** Показывать интерактивный лайк (только для авторизованных) */
  canLike: boolean;
};

function authorLabel(name: string | null, fallbackId: string) {
  if (name?.trim()) return name.trim();
  return `Участник ${fallbackId.slice(-4)}`;
}

export function PublicPromptCard({ prompt, canLike }: Props) {
  const author = authorLabel(prompt.user.name, prompt.user.id);

  return (
    <article className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-50 text-sky-700">
        {prompt.user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={prompt.user.image}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <MessageSquare className="h-4 w-4" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <h3 className="font-semibold text-slate-900">{prompt.title}</h3>
          {prompt.isPublic ? (
            <span className="rounded-md bg-sky-50 px-1.5 py-0.5 text-[11px] font-medium text-sky-700">
              Публичный
            </span>
          ) : null}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
          {prompt.content}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          {author}
          <span className="mx-1.5">·</span>
          {formatRelativeRu(prompt.createdAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-start">
        {canLike ? (
          <LikeButton
            interviewId={prompt.id}
            initialLiked={prompt.likedByMe}
            initialCount={prompt.likesCount}
            loginCallbackUrl="/"
          />
        ) : (
          <div
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm text-slate-400"
            title="Войдите, чтобы поставить лайк"
          >
            <ThumbsUp className="h-4 w-4" />
            <span className="min-w-[1ch] tabular-nums">{prompt.likesCount}</span>
          </div>
        )}
      </div>
    </article>
  );
}
