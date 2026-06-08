import { NextResponse } from "next/server";
import { parseBugCsv } from "@/lib/csv-parser";
import { aiTriage, detectProvider, type AIProvider } from "@/lib/ai-service";
import {
  buildDuplicateGroups,
  buildChatContext,
  summarizeAnalysis,
  suggestTeam,
  type AnalysisItem,
} from "@/lib/triage-utils";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const rawText = String(form.get("rawText") || "").trim();
    const provider = (form.get("provider") as AIProvider) || detectProvider();
    const apiKey = String(form.get("apiKey") || "").trim() || undefined;

    const inputText = rawText || (file && file.size > 0 ? await file.text() : "");
    if (!inputText) {
      return NextResponse.json({ error: "Paste a CSV row or upload a CSV file" }, { status: 400 });
    }

    const rows = parseBugCsv(inputText).filter((row) => row.title || row.description || Object.keys(row).length > 0);
    if (!rows.length) {
      return NextResponse.json({ error: "No bug data found" }, { status: 400 });
    }

    const items: AnalysisItem[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const title = String(row.title || row.summary || row.Subject || row.subject || `Bug ${i + 1}`);
      const description = String(row.description || row.details || row.body || row.Description || "");
      const { result, provider: used } = await aiTriage(title, description, provider, apiKey);
      const suggestedTeam = suggestTeam(result.area, title, result.severity);
      items.push({
        id: row.id ? String(row.id) : `BUG-${String(i + 1).padStart(3, "0")}`,
        title,
        description,
        severity: result.severity,
        area: result.area,
        priority: result.priority,
        estimatedHours: result.estimatedHours,
        tags: result.tags,
        missingInfo: result.missingInfo,
        clarifyingMessage: result.clarifyingMessage,
        confidenceScore: result.confidenceScore,
        analysisSource: used,
        suggestedTeam,
        isDuplicate: false,
        recommendedAction: result.missingInfo
          ? "Request more details before coding starts."
          : result.severity === "Critical"
          ? "Escalate immediately and assign a senior owner."
          : result.severity === "High"
          ? "Assign to the owning team and triage today."
          : "Queue for normal workflow.",
      });
    }

    buildDuplicateGroups(items);
    const summary = summarizeAnalysis(items);

    return NextResponse.json({
      analysisId: `analysis_${Date.now()}`,
      provider,
      summary,
      items,
      context: buildChatContext(items, summary, "Developer"),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Upload failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    provider: detectProvider(),
    providersAvailable: {
      openai: !!process.env.OPENAI_API_KEY,
      anthropic: !!process.env.ANTHROPIC_API_KEY,
      groq: !!process.env.GROQ_API_KEY,
      heuristic: true,
    },
  });
}
