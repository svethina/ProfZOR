import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type PromptListMode = "mine" | "public" | "favorites";

const PAGE_SIZE = 10;

export async function listPrompts(options: {
  mode: PromptListMode;
  userId: string;
  page?: number;
  q?: string;
}) {
  const page = Math.max(1, options.page ?? 1);
  const q = options.q?.trim() ?? "";

  const where: Prisma.PromptWhereInput = {};

  if (options.mode === "mine") {
    where.userId = options.userId;
  } else if (options.mode === "public") {
    where.isPublic = true;
  } else if (options.mode === "favorites") {
    where.userId = options.userId;
    where.isFavorite = true;
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { content: { contains: q, mode: "insensitive" } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.prompt.count({ where }),
    prisma.prompt.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, image: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
