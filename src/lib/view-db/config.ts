import { PrismaClient, Role } from "@prisma/client";

export type DbTarget = "local" | "working";

export type FieldType = "string" | "int" | "boolean" | "datetime" | "enum";

export type FieldDef = {
  name: string;
  type: FieldType;
  optional?: boolean;
  enumValues?: string[];
  /** Не показывать в форме создания (генерируется БД/Prisma) */
  autoOnCreate?: boolean;
  /** Только чтение в UI */
  readOnly?: boolean;
};

export type TableDef = {
  name: string;
  label: string;
  idField: string;
  fields: FieldDef[];
};

export const VIEW_DB_TABLES: TableDef[] = [
  {
    name: "Radical",
    label: "Radical",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "slug", type: "string" },
      { name: "nameRu", type: "string" },
      { name: "sortOrder", type: "int" },
      { name: "createdAt", type: "datetime", autoOnCreate: true, readOnly: true },
    ],
  },
  {
    name: "User",
    label: "User",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "email", type: "string", optional: true },
      { name: "name", type: "string", optional: true },
      { name: "image", type: "string", optional: true },
      { name: "passwordHash", type: "string", optional: true },
      {
        name: "role",
        type: "enum",
        enumValues: Object.values(Role),
      },
      { name: "createdAt", type: "datetime", autoOnCreate: true, readOnly: true },
      { name: "updatedAt", type: "datetime", autoOnCreate: true, readOnly: true },
    ],
  },
  {
    name: "Card",
    label: "Card",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "authorId", type: "string" },
      { name: "radicalId", type: "string" },
      { name: "title", type: "string" },
      { name: "body", type: "string" },
      { name: "isHidden", type: "boolean" },
      { name: "isPrivate", type: "boolean" },
      { name: "createdAt", type: "datetime", autoOnCreate: true, readOnly: true },
      { name: "updatedAt", type: "datetime", autoOnCreate: true, readOnly: true },
    ],
  },
  {
    name: "Comment",
    label: "Comment",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "cardId", type: "string" },
      { name: "authorId", type: "string" },
      { name: "body", type: "string" },
      { name: "isHidden", type: "boolean" },
      { name: "createdAt", type: "datetime", autoOnCreate: true, readOnly: true },
      { name: "updatedAt", type: "datetime", autoOnCreate: true, readOnly: true },
    ],
  },
  {
    name: "Like",
    label: "Like",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "userId", type: "string" },
      { name: "cardId", type: "string" },
      { name: "createdAt", type: "datetime", autoOnCreate: true, readOnly: true },
    ],
  },
  {
    name: "Account",
    label: "Account",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "userId", type: "string" },
      { name: "type", type: "string" },
      { name: "provider", type: "string" },
      { name: "providerAccountId", type: "string" },
    ],
  },
  {
    name: "Session",
    label: "Session",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "sessionToken", type: "string" },
      { name: "userId", type: "string" },
      { name: "expires", type: "datetime" },
    ],
  },
  {
    name: "Prompt",
    label: "Prompt",
    idField: "id",
    fields: [
      { name: "id", type: "string", autoOnCreate: true, readOnly: true },
      { name: "userId", type: "string" },
      { name: "title", type: "string" },
      { name: "content", type: "string" },
      { name: "isPublic", type: "boolean" },
      { name: "isFavorite", type: "boolean" },
      { name: "createdAt", type: "datetime", autoOnCreate: true, readOnly: true },
      { name: "updatedAt", type: "datetime", autoOnCreate: true, readOnly: true },
    ],
  },
];

export function getTableDef(name: string): TableDef | undefined {
  return VIEW_DB_TABLES.find((t) => t.name === name);
}

export function assertViewDbAllowed() {
  if (process.env.VIEW_DB_ENABLED === "true") return;
  if (process.env.NODE_ENV === "development") return;
  throw new Error("view-db доступен только в development или при VIEW_DB_ENABLED=true");
}

export function resolveDatabaseUrl(target: DbTarget): string {
  if (target === "local") {
    const url = process.env.LOCAL_DATABASE_URL?.trim();
    if (!url) {
      throw new Error(
        "Локальная БД не настроена: добавьте LOCAL_DATABASE_URL в .env или выберите «Рабочая БД».",
      );
    }
    return url;
  }

  const url = process.env.DATABASE_URL?.trim();
  if (!url) {
    throw new Error("DATABASE_URL не задан в .env");
  }
  return url;
}

export function formatViewDbError(error: unknown, target?: DbTarget): string {
  const raw = error instanceof Error ? error.message : String(error);
  const unreachable = /Can't reach database server at `([^`]+)`/i.exec(raw);

  if (unreachable) {
    const host = unreachable[1];
    if (target === "local") {
      return `Не удалось подключиться к локальной БД (${host}). Запустите PostgreSQL или выберите «Рабочая БД (Neon)».`;
    }
    return `Не удалось подключиться к БД (${host}). Проверьте DATABASE_URL в .env.`;
  }

  return raw.replace(/\s+/g, " ").trim();
}

export function getAvailableTargets(): { target: DbTarget; label: string; configured: boolean }[] {
  return [
    {
      target: "local",
      label: "Локальная БД",
      configured: Boolean(process.env.LOCAL_DATABASE_URL?.trim()),
    },
    {
      target: "working",
      label: "Рабочая БД (Neon)",
      configured: Boolean(process.env.DATABASE_URL?.trim()),
    },
  ];
}

type Delegate = {
  findMany: (args: unknown) => Promise<unknown[]>;
  count: (args?: unknown) => Promise<number>;
  create: (args: { data: unknown }) => Promise<unknown>;
  update: (args: { where: { id: string }; data: unknown }) => Promise<unknown>;
  delete: (args: { where: { id: string } }) => Promise<unknown>;
};

export function getDelegate(prisma: PrismaClient, tableName: string): Delegate {
  const map: Record<string, Delegate> = {
    Radical: prisma.radical as unknown as Delegate,
    User: prisma.user as unknown as Delegate,
    Card: prisma.card as unknown as Delegate,
    Comment: prisma.comment as unknown as Delegate,
    Like: prisma.like as unknown as Delegate,
    Prompt: prisma.prompt as unknown as Delegate,
    Account: prisma.account as unknown as Delegate,
    Session: prisma.session as unknown as Delegate,
  };

  const delegate = map[tableName];
  if (!delegate) {
    throw new Error(`Неизвестная таблица: ${tableName}`);
  }
  return delegate;
}

export function coerceFieldValue(field: FieldDef, raw: unknown): unknown {
  if (raw === undefined) return undefined;
  if (field.optional && (raw === "" || raw === null)) return null;

  switch (field.type) {
    case "int": {
      const n = typeof raw === "number" ? raw : Number(raw);
      if (Number.isNaN(n)) throw new Error(`Поле ${field.name}: ожидается число`);
      return n;
    }
    case "boolean":
      if (typeof raw === "boolean") return raw;
      if (raw === "true" || raw === "1") return true;
      if (raw === "false" || raw === "0") return false;
      throw new Error(`Поле ${field.name}: ожидается boolean`);
    case "datetime":
      if (raw instanceof Date) return raw;
      if (typeof raw === "string" && raw) return new Date(raw);
      if (field.optional && !raw) return null;
      throw new Error(`Поле ${field.name}: ожидается дата`);
    case "enum":
    case "string":
      return raw === null ? null : String(raw);
    default:
      return raw;
  }
}

export function buildWriteData(
  table: TableDef,
  body: Record<string, unknown>,
  mode: "create" | "update",
): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of table.fields) {
    if (mode === "create" && field.autoOnCreate) continue;
    if (mode === "update" && field.readOnly) continue;
    if (!(field.name in body)) {
      if (mode === "create" && !field.optional && !field.autoOnCreate) {
        throw new Error(`Не хватает поля: ${field.name}`);
      }
      continue;
    }

    data[field.name] = coerceFieldValue(field, body[field.name]);
  }

  return data;
}

export function serializeRows(rows: unknown[]): Record<string, unknown>[] {
  return rows.map((row) => {
    const obj = row as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value instanceof Date) {
        out[key] = value.toISOString();
      } else if (typeof value === "bigint") {
        out[key] = value.toString();
      } else {
        out[key] = value;
      }
    }
    return out;
  });
}
