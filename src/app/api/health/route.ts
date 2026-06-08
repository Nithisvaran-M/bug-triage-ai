export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    ok: true,
    mode: "no-database",
    message: "Stateless workspace is healthy.",
  });
}
