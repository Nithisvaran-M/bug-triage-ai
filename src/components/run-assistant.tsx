"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Icons } from "./icons";
import type { AIProvider } from "@/lib/ai-service";
import type { Bug, Run } from "@/types/models";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const PROMPTS = [
  "Give me a triage summary of this run.",
  "Which bugs should be handled first?",
  "Are there any duplicate clusters?",
  "What information is missing from these reports?",
  "Suggest next steps for the manager and developers.",
];

export default function RunAssistant({
  run,
  bugs,
  role,
  provider,
  apiKey,
}: {
  run: Run | undefined;
  bugs: Bug[];
  role: "Manager" | "Developer";
  provider: AIProvider;
  apiKey?: string;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "I’m your run assistant. Ask anything about the uploaded CSV — duplicates, priorities, missing info, assignment suggestions, or what to fix next.",
    },
  ]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([
      {
        role: "assistant",
        content:
          "I’m your run assistant. Ask anything about the uploaded CSV — duplicates, priorities, missing info, assignment suggestions, or what to fix next.",
      },
    ]);
    setQuestion("");
  }, [run?.id]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const summary = useMemo(() => {
    if (!run) return "No run selected yet.";
    return `${run.name} · total=${run.totalBugs}, critical=${run.criticalCount}, high=${run.highCount}, medium=${run.mediumCount}, low=${run.lowCount}, duplicates=${run.duplicateCount}, missing=${run.missingInfoCount}, confidence=${run.averageConfidence ?? 0}%`;
  }, [run]);

  async function ask(nextQuestion?: string) {
    const q = (nextQuestion || question).trim();
    if (!q || !run) return;
    setQuestion("");
    setMessages((prev) => [...prev, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          runId: run.id,
          question: q,
          provider,
          apiKey,
          role,
        }),
      });
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error || "No response" }]);
    } catch (e: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: e?.message || "Chat failed" }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white card-shadow overflow-hidden">
      <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-indigo-700 text-white flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-[0.12em] text-white/70 font-semibold">Run Assistant</div>
          <h3 className="text-lg font-bold flex items-center gap-2 mt-1">
            <Icons.MessageSquare className="w-5 h-5" /> Ask about this analysis
          </h3>
          <p className="text-sm text-white/80 mt-1">
            Role-aware chat for the selected CSV analysis. Current view: <b>{role}</b> · Provider: <b>{provider}</b>
          </p>
        </div>
        <div className="text-right text-xs text-white/75 max-w-[230px] hidden sm:block">
          <div className="font-semibold text-white">Selected run</div>
          <div className="truncate">{run ? summary : "No run selected"}</div>
        </div>
      </div>

      <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-2">
        {PROMPTS.map((p) => (
          <button
            key={p}
            onClick={() => ask(p)}
            disabled={!run || loading}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:text-indigo-700 disabled:opacity-50"
          >
            {p}
          </button>
        ))}
      </div>

      <div ref={listRef} className="max-h-[380px] overflow-y-auto scrollbar-thin p-4 sm:p-5 space-y-3 bg-white">
        {messages.map((m, idx) => (
          <div key={idx} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] sm:max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "bg-indigo-600 text-white rounded-br-md"
                  : "bg-slate-100 text-slate-800 rounded-bl-md"
              }`}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm bg-slate-100 text-slate-500 rounded-bl-md inline-flex items-center gap-2">
              <Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Thinking...
            </div>
          </div>
        )}
      </div>

      <div className="p-4 sm:p-5 border-t border-slate-200 bg-white">
        <div className="flex items-end gap-2">
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={run ? "Ask a question about this run..." : "Select a run first"}
            rows={2}
            className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
          <button
            onClick={() => ask()}
            disabled={!run || !question.trim() || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
          >
            <Icons.Send className="w-4 h-4" /> Ask
          </button>
        </div>
      </div>
    </div>
  );
}
