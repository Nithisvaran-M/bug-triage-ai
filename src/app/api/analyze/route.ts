import { NextResponse } from "next/server";
import { aiTriage, detectProvider, type AIProvider } from "@/lib/ai-service";
import { parseBugCsv, sampleCsvText } from "@/lib/csv-parser";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const provider = (body.provider as AIProvider) || detectProvider();
    const apiKey = typeof body.apiKey === "string" ? body.apiKey : undefined;
    const rawText = String(body.rawText || "").trim();
    let title = String(body.title || "");
    let description = String(body.description || "");

    if (rawText) {
      const parsedRows = parseBugCsv(rawText);
      if (parsedRows.length > 0 && parsedRows[0].title) {
        title = parsedRows[0].title || title;
        description = parsedRows[0].description || description || rawText;
      } else {
        const lines = rawText.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        title = title || lines[0] || "Bug report";
        description = description || rawText;
      }
    }

    const { result, provider: used } = await aiTriage(title, description, provider, apiKey);
    return NextResponse.json({ result, provider: used });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    sampleCsv: sampleCsvText(),
    provider: detectProvider(),
    providersAvailable: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      heuristic: true,
    },
  });
}
