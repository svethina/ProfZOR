/**
 * Применяет auth-миграцию на Neon по одному statement с ретраями.
 */
import { randomUUID } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL не задан");
  process.exit(1);
}

const sqlPath = resolve("prisma/migrations/20260724100000_auth_google/migration.sql");
const raw = readFileSync(sqlPath, "utf8");

function splitSql(input: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let inDo = false;
  for (const line of input.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") || trimmed === "") continue;
    if (trimmed.startsWith("DO $$")) inDo = true;
    buf += `${line}\n`;
    if (inDo) {
      if (trimmed.endsWith("$$;")) {
        parts.push(buf.trim());
        buf = "";
        inDo = false;
      }
      continue;
    }
    if (trimmed.endsWith(";")) {
      parts.push(buf.trim());
      buf = "";
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts.filter(Boolean);
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function execWithRetry(stmt: string, label: string) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 6; attempt++) {
    const prisma = new PrismaClient({ datasources: { db: { url } } });
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log(`OK: ${label}`);
      await prisma.$disconnect();
      return;
    } catch (e) {
      lastError = e;
      const msg = e instanceof Error ? e.message : String(e);
      console.warn(`Retry ${attempt}/6 for ${label}: ${msg.slice(0, 120)}`);
      await prisma.$disconnect().catch(() => undefined);
      await sleep(2000 * attempt);
    }
  }
  throw lastError;
}

async function main() {
  const statements = splitSql(raw);
  console.log(`Statements: ${statements.length}`);

  for (const [i, stmt] of statements.entries()) {
    const label = `${i + 1}/${statements.length} ${stmt.replace(/\s+/g, " ").slice(0, 70)}`;
    await execWithRetry(stmt, label);
  }

  await execWithRetry(
    `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
     SELECT '${randomUUID()}', 'manual-pooled-apply', NOW(), '20260724100000_auth_google', NULL, NULL, NOW(), 1
     WHERE NOT EXISTS (
       SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = '20260724100000_auth_google'
     )`,
    "mark migration",
  );

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    const n = await prisma.account.count();
    console.log(`DONE. Account count=${n}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
