import { NextResponse } from "next/server";
import {
  assertViewDbAllowed,
  getAvailableTargets,
  VIEW_DB_TABLES,
} from "@/lib/view-db/config";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    assertViewDbAllowed();
    return NextResponse.json({
      targets: getAvailableTargets(),
      tables: VIEW_DB_TABLES.map(({ name, label, fields, idField }) => ({
        name,
        label,
        idField,
        fields,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 403 });
  }
}
