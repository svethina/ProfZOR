import Link from "next/link";
import {
  Bookmark,
  History,
  MessageSquare,
  Settings,
  Star,
} from "lucide-react";
import { signOut } from "@/auth";
import clsx from "clsx";

const NAV = [
  { href: "/dashboard", label: "Промты", icon: MessageSquare, match: "mine" },
  {
    href: "/dashboard/public",
    label: "Готовое интервью",
    icon: Bookmark,
    match: "public",
  },
  {
    href: "/dashboard/favorites",
    label: "Избранное",
    icon: Star,
    match: "favorites",
  },
  {
    href: "/dashboard/history",
    label: "История",
    icon: History,
    match: "history",
  },
  {
    href: "/dashboard/settings",
    label: "Настройки",
    icon: Settings,
    match: "settings",
  },
] as const;

type Props = {
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  active: "mine" | "public" | "favorites" | "history" | "settings";
};

function shortName(name?: string | null, email?: string | null) {
  if (name?.trim()) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[1]![0]}.`;
  }
  if (email) return email.split("@")[0];
  return "Пользователь";
}

export function DashboardSidebar({ user, active }: Props) {
  const display = shortName(user.name, user.email);

  return (
    <aside className="flex w-full flex-col gap-8 bg-gradient-to-b from-sky-100 via-sky-50 to-blue-50 px-5 py-8 md:min-h-screen md:w-[280px] md:shrink-0">
      <div className="flex items-center gap-3">
        {user.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-12 w-12 rounded-full object-cover ring-2 ring-white"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sky-200 text-sm font-semibold text-sky-900">
            {display.slice(0, 1).toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-semibold text-slate-800">{display}</p>
          <p className="text-xs text-slate-500">ProfZOR</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const isActive = active === match;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition",
                isActive
                  ? "bg-white/90 font-medium text-sky-900 shadow-sm"
                  : "text-slate-600 hover:bg-white/50",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 text-sm">
        <Link href="/" className="block text-slate-500 underline">
          На главную
        </Link>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button type="submit" className="text-slate-500 underline">
            Выйти
          </button>
        </form>
      </div>
    </aside>
  );
}
