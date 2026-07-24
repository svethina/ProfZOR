/**
 * Короткая проверка схемы: User → Card → Like.
 * Запуск: npm run db:verify
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const radical = await prisma.radical.findFirst({
    orderBy: { sortOrder: "asc" },
  });

  if (!radical) {
    throw new Error("Нет радикалов. Сначала: npx prisma db seed");
  }

  const email = `verify-${Date.now()}@example.com`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: "test-hash-not-for-login",
      name: "Тестовый пользователь",
    },
  });

  const card = await prisma.card.create({
    data: {
      authorId: user.id,
      radicalId: radical.id,
      title: "Тестовый вопрос",
      body: "Как вы обычно реагируете на критику?",
    },
  });

  const like = await prisma.like.create({
    data: {
      userId: user.id,
      cardId: card.id,
    },
  });

  console.log("OK: созданы user, card, like");
  console.log({
    userId: user.id,
    email: user.email,
    cardId: card.id,
    radical: radical.slug,
    likeId: like.id,
  });
}

main()
  .catch((error) => {
    console.error("VERIFY FAILED:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
