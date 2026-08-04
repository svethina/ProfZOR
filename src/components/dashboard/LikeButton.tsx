"use client";

import { useState } from "react";
import { ThumbsUp } from "lucide-react";
import { useRouter } from "next/navigation";

type Props = {
  interviewId: string;
  initialLiked: boolean;
  initialCount: number;
  /** Куда вернуть после логина при 401 */
  loginCallbackUrl?: string;
};

export function LikeButton({
  interviewId,
  initialLiked,
  initialCount,
  loginCallbackUrl = "/dashboard/public",
}: Props) {
  const router = useRouter();
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    if (loading) return;
    setError(null);

    const prevLiked = liked;
    const prevCount = count;
    // Оптимистичное обновление
    setLiked(!prevLiked);
    setCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    setLoading(true);

    try {
      const res = await fetch(`/api/interview/${interviewId}/like`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        liked?: boolean;
        likesCount?: number;
        error?: string;
        code?: string;
      };

      if (res.status === 401) {
        setLiked(prevLiked);
        setCount(prevCount);
        router.push(
          `/login?callbackUrl=${encodeURIComponent(loginCallbackUrl)}`,
        );
        return;
      }

      if (!res.ok) {
        setLiked(prevLiked);
        setCount(prevCount);
        setError(data.error ?? "Не удалось поставить лайк");
        return;
      }

      setLiked(Boolean(data.liked));
      setCount(Number(data.likesCount ?? 0));
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
      setError("Попробуйте позже");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        title={liked ? "Убрать лайк" : "Лайк"}
        disabled={loading}
        onClick={() => void onClick()}
        className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition disabled:opacity-50 ${
          liked
            ? "bg-sky-50 text-sky-700"
            : "text-slate-400 hover:bg-slate-50 hover:text-sky-700"
        }`}
      >
        <ThumbsUp className={`h-4 w-4 ${liked ? "fill-sky-600" : ""}`} />
        <span className="min-w-[1ch] tabular-nums">{count}</span>
      </button>
      {error ? <span className="text-[11px] text-red-600">{error}</span> : null}
    </div>
  );
}
