import { NextResponse } from "next/server";
import { aiRunChat, detectProvider, type AIProvider } from "@/lib/ai-service";
import { buildChatContext, type AnalysisItem, type AnalysisSummary } from "@/lib/triage-utils";

export const dynamic = "force-dynamic";

type ChatBody = {
  question: string;
  provider?: AIProvider;
  apiKey?: string;
  role?: string;
  analysis?: AnalysisItem[];
  summary?: AnalysisSummary;
  assignments?: Record<string, string>;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ChatBody;
    const question = String(body.question || "").trim();
    if (!question) {
      return NextResponse.json({ error: "question is required" }, { status: 400 });
    }

    const provider = body.provider || detectProvider();
    const analysis = Array.isArray(body.analysis) ? body.analysis : [];
    const summary = body.summary || {
      total: analysis.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      duplicates: 0,
      missingInfo: 0,
      averageConfidence: 0,
      topTeams: [],
    };
    const context = buildChatContext(analysis, summary, body.role || "Developer", body.assignments || {});
    const result = await aiRunChat(context, question, provider, body.apiKey);

    return NextResponse.json({ answer: result.answer, provider: result.provider });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Chat failed" }, { status: 500 });
  }
}
