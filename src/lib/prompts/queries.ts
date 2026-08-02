import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type PromptListMode = "mine" | "public" | "favorites";
export type PromptSort = "recent" | "popular";

const PAGE_SIZE = 10;

export type PromptListItem = {
  id: string;
  title: string;
  content: string;
  isPublic: boolean;
  isFavorite: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  likesCount: number;
  likedByMe: boolean;
  user: { id: string; name: string | null; image: string | null };
};

export async function listPrompts(options: {
  mode: PromptListMode;
  userId: string;
  page?: number;
  q?: string;
  sort?: PromptSort;
}): Promise<{
  items: PromptListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}> {
  const page = Math.max(1, options.page ?? 1);
  const q = options.q?.trim() ?? "";
  const sort: PromptSort =
    options.mode === "public" && options.sort === "popular"
      ? "popular"
      : "recent";

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

  const orderBy: Prisma.PromptOrderByWithRelationInput[] =
    sort === "popular"
      ? [{ likes: { _count: "desc" } }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const [total, rows] = await Promise.all([
    prisma.prompt.count({ where }),
    prisma.prompt.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        user: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true } },
        likes: {
          where: { userId: options.userId },
          select: { id: true },
          take: 1,
        },
      },
    }),
  ]);

  const items: PromptListItem[] = rows.map((row) => ({
    id: row.id,
    title: row.title,
    content: row.content,
    isPublic: row.isPublic,
    isFavorite: row.isFavorite,
    userId: row.userId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    likesCount: row._count.likes,
    likedByMe: row.likes.length > 0,
    user: row.user,
  }));

  return {
    items,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}
