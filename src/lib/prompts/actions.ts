"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { promptFormSchema } from "@/lib/prompts/schema";

function revalidateDashboard() {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/public");
  revalidatePath("/dashboard/favorites");
}

/** Создать вопрос интервью для текущего пользователя */
export async function createPrompt(input: unknown) {
  const session = await requireSession();
  const data = promptFormSchema.parse(input);

  await prisma.prompt.create({
    data: {
      userId: session.user.id,
      title: data.title,
      content: data.content,
      isPublic: data.isPublic,
    },
  });

  revalidateDashboard();
  return { ok: true as const };
}

/** Обновить свой вопрос */
export async function updatePrompt(id: string, input: unknown) {
  const session = await requireSession();
  const data = promptFormSchema.parse(input);

  const existing = await prisma.prompt.findUnique({ where: { id } });
  // Проверка прав: только владелец
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Нет доступа к этому вопросу");
  }

  await prisma.prompt.update({
    where: { id },
    data: {
      title: data.title,
      content: data.content,
      isPublic: data.isPublic,
    },
  });

  revalidateDashboard();
  return { ok: true as const };
}

/** Удалить свой вопрос */
export async function deletePrompt(id: string) {
  const session = await requireSession();
  const existing = await prisma.prompt.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Нет доступа к этому вопросу");
  }

  await prisma.prompt.delete({ where: { id } });
  revalidateDashboard();
  return { ok: true as const };
}

/** Переключить публичность (только владелец) */
export async function togglePublic(id: string) {
  const session = await requireSession();
  const existing = await prisma.prompt.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Нет доступа к этому вопросу");
  }

  await prisma.prompt.update({
    where: { id },
    data: { isPublic: !existing.isPublic },
  });

  revalidateDashboard();
  return { ok: true as const };
}

/** Переключить избранное (только владелец) */
export async function toggleFavorite(id: string) {
  const session = await requireSession();
  const existing = await prisma.prompt.findUnique({ where: { id } });
  if (!existing || existing.userId !== session.user.id) {
    throw new Error("Нет доступа к этому вопросу");
  }

  await prisma.prompt.update({
    where: { id },
    data: { isFavorite: !existing.isFavorite },
  });

  revalidateDashboard();
  return { ok: true as const };
}
