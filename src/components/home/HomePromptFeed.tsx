import { PublicPromptCard } from "@/components/home/PublicPromptCard";
import type { PromptListItem } from "@/lib/prompts/queries";

type Props = {
  id: string;
  title: string;
  subtitle: string;
  items: PromptListItem[];
  canLike: boolean;
  emptyText: string;
};

export function HomePromptFeed({
  id,
  title,
  subtitle,
  items,
  canLike,
  emptyText,
}: Props) {
  return (
    <section id={id} className="scroll-mt-20 space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
          {emptyText}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((prompt) => (
            <li key={prompt.id}>
              <PublicPromptCard prompt={prompt} canLike={canLike} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
