import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Страница входа: Google OAuth.
 * Если уже авторизован — редирект в личный кабинет (/dashboard).
 */
export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <main className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center gap-8 px-6 py-16">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Вход в ProfZOR</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Войдите через Google, чтобы создавать карточки, комментировать и лайкать.
        </p>
      </header>

      {/* Server Action: запуск OAuth Google */}
      <form
        action={async () => {
          "use server";
          await signIn("google", { redirectTo: "/dashboard" });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-md bg-zinc-900 px-4 py-3 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
        >
          Войти через Google
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500">
        <a href="/" className="underline">
          На главную
        </a>
      </p>
    </main>
  );
}
