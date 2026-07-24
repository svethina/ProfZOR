import { auth } from "@/auth";
import { redirect } from "next/navigation";

/**
 * Server-side проверка сессии.
 * Возвращает сессию или редиректит на /login.
 */
export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session;
}

/**
 * Опциональная сессия (гость = null).
 */
export async function getOptionalSession() {
  return auth();
}
