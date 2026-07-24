import { NextResponse } from "next/server";
import {
  assertViewDbAllowed,
  buildWriteData,
  formatViewDbError,
  getDelegate,
  getTableDef,
  serializeRows,
  type DbTarget,
} from "@/lib/view-db/config";
import { dropViewDbClient, getViewDbPrisma } from "@/lib/view-db/prisma";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ table: string }> };

function parseTarget(value: string | null): DbTarget {
  if (value === "local" || value === "working") return value;
  throw new Error('Параметр target должен быть "local" или "working"');
}

export async function GET(request: Request, context: RouteContext) {
  let target: DbTarget | undefined;
  try {
    assertViewDbAllowed();
    const { table } = await context.params;
    const tableDef = getTableDef(table);
    if (!tableDef) {
      return NextResponse.json({ error: `Таблица не найдена: ${table}` }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    target = parseTarget(searchParams.get("target"));
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(100, Math.max(1, Number(searchParams.get("pageSize") ?? "15") || 15));

    const prisma = getViewDbPrisma(target);
    const delegate = getDelegate(prisma, table);

    const [total, rows] = await Promise.all([
      delegate.count(),
      delegate.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { [tableDef.idField]: "asc" },
      }),
    ]);

    return NextResponse.json({
      table: tableDef.name,
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
      rows: serializeRows(rows),
    });
  } catch (error) {
    if (target) await dropViewDbClient(target);
    return NextResponse.json(
      { error: formatViewDbError(error, target) },
      { status: 400 },
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  let target: DbTarget | undefined;
  try {
    assertViewDbAllowed();
    const { table } = await context.params;
    const tableDef = getTableDef(table);
    if (!tableDef) {
      return NextResponse.json({ error: `Таблица не найдена: ${table}` }, { status: 404 });
    }

    const body = (await request.json()) as {
      target?: string;
      data?: Record<string, unknown>;
    };
    target = parseTarget(body.target ?? null);
    const data = buildWriteData(tableDef, body.data ?? {}, "create");

    const prisma = getViewDbPrisma(target);
    const delegate = getDelegate(prisma, table);
    const row = await delegate.create({ data });

    return NextResponse.json({ row: serializeRows([row])[0] }, { status: 201 });
  } catch (error) {
    if (target) await dropViewDbClient(target);
    return NextResponse.json(
      { error: formatViewDbError(error, target) },
      { status: 400 },
    );
  }
}
