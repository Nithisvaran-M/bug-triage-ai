import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: false,
    comments: [],
    message: "Comments are disabled in no-database mode.",
  }, { status: 410 });
}

export async function POST() {
  return NextResponse.json({
    ok: false,
    message: "Comment persistence is disabled. Use the workspace chat for session-only notes.",
  }, { status: 410 });
}
