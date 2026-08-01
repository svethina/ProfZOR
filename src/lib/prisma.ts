import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaUrl?: string;
};

/**
 * В development, если задан LOCAL_DATABASE_URL — используем локальный Postgres.
 * Так Google-вход не падает, когда Neon недоступен / без миграции auth.
 * Для принудительно Neon: USE_NEON_DB=true
 */
function resolveDatabaseUrl(): string | undefined {
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.USE_NEON_DB !== "true" &&
    process.env.LOCAL_DATABASE_URL
  ) {
    return process.env.LOCAL_DATABASE_URL;
  }
  return process.env.DATABASE_URL;
}

function createPrismaClient() {
  const url = resolveDatabaseUrl();
  return new PrismaClient({
    ...(url ? { datasources: { db: { url } } } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const url = resolveDatabaseUrl();
if (
  !globalForPrisma.prisma ||
  (url && globalForPrisma.prismaUrl !== url)
) {
  if (globalForPrisma.prisma) {
    void globalForPrisma.prisma.$disconnect().catch(() => undefined);
  }
  globalForPrisma.prisma = createPrismaClient();
  globalForPrisma.prismaUrl = url;
}

export const prisma = globalForPrisma.prisma;
