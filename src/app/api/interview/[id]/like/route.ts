import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/interview/[id]/like — toggle лайка публичного интервью.
 * Ответ: { liked, likesCount }
 */
export async function POST(_request: Request, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Войдите, чтобы поставить лайк", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const { id: interviewId } = await context.params;

    const interview = await prisma.prompt.findUnique({
      where: { id: interviewId },
      select: { id: true, isPublic: true },
    });

    if (!interview || !interview.isPublic) {
      return NextResponse.json(
        { error: "Публичное интервью не найдено", code: "NOT_FOUND" },
        { status: 404 },
      );
    }

    const existing = await prisma.interviewLike.findUnique({
      where: {
        userId_interviewId: {
          userId: session.user.id,
          interviewId,
        },
      },
    });

    let liked: boolean;
    if (existing) {
      await prisma.interviewLike.delete({ where: { id: existing.id } });
      liked = false;
    } else {
      await prisma.interviewLike.create({
        data: {
          userId: session.user.id,
          interviewId,
        },
      });
      liked = true;
    }

    const likesCount = await prisma.interviewLike.count({
      where: { interviewId },
    });

    return NextResponse.json({ liked, likesCount });
  } catch (error) {
    console.error("interview like error:", error);
    return NextResponse.json(
      { error: "Попробуйте позже", code: "SERVER_ERROR" },
      { status: 503 },
    );
  }
}
