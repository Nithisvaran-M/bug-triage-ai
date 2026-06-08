import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: false,
    message: "Bug detail history is disabled in no-database mode. Use the current workspace analysis pages instead.",
  }, { status: 410 });
}

export async function PATCH() {
  return NextResponse.json({
    ok: false,
    message: "Bug updates are handled in the current session workspace and not stored on the server.",
  }, { status: 410 });
}
