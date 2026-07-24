import { PrismaClient } from "@prisma/client";
import { type DbTarget, resolveDatabaseUrl } from "./config";

type CachedClient = {
  url: string;
  client: PrismaClient;
};

const globalForViewDb = globalThis as unknown as {
  viewDbClients?: Partial<Record<DbTarget, CachedClient>>;
};

export function getViewDbPrisma(target: DbTarget): PrismaClient {
  const url = resolveDatabaseUrl(target);

  if (!globalForViewDb.viewDbClients) {
    globalForViewDb.viewDbClients = {};
  }

  const cached = globalForViewDb.viewDbClients[target];
  if (cached && cached.url === url) {
    return cached.client;
  }

  if (cached) {
    void cached.client.$disconnect().catch(() => undefined);
  }

  const client = new PrismaClient({
    datasources: { db: { url } },
    // Не логируем ошибки в консоль — иначе Next.js рисует красный overlay
    log: [],
  });

  globalForViewDb.viewDbClients[target] = { url, client };
  return client;
}

export async function dropViewDbClient(target: DbTarget) {
  const cached = globalForViewDb.viewDbClients?.[target];
  if (!cached) return;
  delete globalForViewDb.viewDbClients?.[target];
  await cached.client.$disconnect().catch(() => undefined);
}
