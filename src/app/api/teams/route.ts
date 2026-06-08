import { NextResponse } from "next/server";
import { DEFAULT_TEAMS } from "@/lib/triage-utils";

export const dynamic = "force-dynamic";

type Team = {
  id: number;
  name: string;
  description: string;
  color: string;
  memberCount: number;
};

let inMemoryTeams: Team[] = DEFAULT_TEAMS.map((team, index) => ({
  id: index + 1,
  name: team.name,
  description: team.description,
  color: team.color,
  memberCount: team.memberCount,
}));

export async function GET() {
  return NextResponse.json(inMemoryTeams);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const team: Team = {
      id: Date.now(),
      name: String(body.name || "New Team").slice(0, 100),
      description: String(body.description || ""),
      color: String(body.color || "#6366f1"),
      memberCount: Number(body.memberCount) || 3,
    };
    inMemoryTeams = [...inMemoryTeams, team];
    return NextResponse.json(team);
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unable to create team" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = Number(searchParams.get("id"));
    if (!Number.isFinite(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });
    inMemoryTeams = inMemoryTeams.filter((team) => team.id !== id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unable to delete team" }, { status: 500 });
  }
}
