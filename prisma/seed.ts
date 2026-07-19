import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.note.count();

  if (count > 0) {
    console.log(`Seed skipped: already have ${count} note(s).`);
    return;
  }

  await prisma.note.createMany({
    data: [
      { title: "Первая заметка" },
      { title: "Вторая заметка" },
      { title: "Третья заметка" },
    ],
  });

  console.log("Seed complete: created 3 notes.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
