import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: false,
    items: [],
    message: "Historical runs are disabled in no-database mode. Use the current workspace analysis pages instead.",
  }, { status: 410 });
}
