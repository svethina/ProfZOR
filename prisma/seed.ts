import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RADICALS = [
  { slug: "hysteroid", nameRu: "Истероид", sortOrder: 1 },
  { slug: "epileptoid", nameRu: "Эпилептоид", sortOrder: 2 },
  { slug: "paranoid", nameRu: "Паранойял", sortOrder: 3 },
  { slug: "emotive", nameRu: "Эмотив", sortOrder: 4 },
  { slug: "schizoid", nameRu: "Шизоид", sortOrder: 5 },
  { slug: "hyperthym", nameRu: "Гипертим", sortOrder: 6 },
  { slug: "anxious", nameRu: "Тревожный", sortOrder: 7 },
] as const;

async function main() {
  for (const radical of RADICALS) {
    await prisma.radical.upsert({
      where: { slug: radical.slug },
      create: radical,
      update: {
        nameRu: radical.nameRu,
        sortOrder: radical.sortOrder,
      },
    });
  }

  console.log(`Seed complete: ${RADICALS.length} radicals upserted.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
