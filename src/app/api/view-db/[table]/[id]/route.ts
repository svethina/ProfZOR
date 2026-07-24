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

type RouteContext = { params: Promise<{ table: string; id: string }> };

function parseTarget(value: string | null): DbTarget {
  if (value === "local" || value === "working") return value;
  throw new Error('Параметр target должен быть "local" или "working"');
}

export async function PATCH(request: Request, context: RouteContext) {
  let target: DbTarget | undefined;
  try {
    assertViewDbAllowed();
    const { table, id } = await context.params;
    const tableDef = getTableDef(table);
    if (!tableDef) {
      return NextResponse.json({ error: `Таблица не найдена: ${table}` }, { status: 404 });
    }

    const body = (await request.json()) as {
      target?: string;
      data?: Record<string, unknown>;
    };
    target = parseTarget(body.target ?? null);
    const data = buildWriteData(tableDef, body.data ?? {}, "update");

    const prisma = getViewDbPrisma(target);
    const delegate = getDelegate(prisma, table);
    const row = await delegate.update({ where: { id }, data });

    return NextResponse.json({ row: serializeRows([row])[0] });
  } catch (error) {
    if (target) await dropViewDbClient(target);
    return NextResponse.json(
      { error: formatViewDbError(error, target) },
      { status: 400 },
    );
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  let target: DbTarget | undefined;
  try {
    assertViewDbAllowed();
    const { table, id } = await context.params;
    const tableDef = getTableDef(table);
    if (!tableDef) {
      return NextResponse.json({ error: `Таблица не найдена: ${table}` }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    target = parseTarget(searchParams.get("target"));

    const prisma = getViewDbPrisma(target);
    const delegate = getDelegate(prisma, table);
    await delegate.delete({ where: { id } });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (target) await dropViewDbClient(target);
    return NextResponse.json(
      { error: formatViewDbError(error, target) },
      { status: 400 },
    );
  }
}
