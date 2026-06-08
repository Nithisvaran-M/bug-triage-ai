"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { Icons } from "./icons";
import { aiRunChat, detectProvider, type AIProvider } from "@/lib/ai-service";
import { EMPTY_WORKSPACE, readWorkspace, saveWorkspace } from "@/lib/workspace-store";
import type { AnalysisItem, AnalysisSummary } from "@/lib/triage-utils";
import type { Team } from "@/types/models";

export type RoleName = "Manager" | "Developer" | "QA" | "Security" | "DevOps" | "Product";

const ROLE_THEMES: Record<RoleName, { title: string; subtitle: string; hero: string; accent: string; help: string }> = {
  Manager: {
    title: "Command Center",
    subtitle: "Route work, clear duplicates, and keep the board moving.",
    hero: "from-indigo-700 via-violet-700 to-fuchsia-700",
    accent: "indigo",
    help: "Managers see the whole board, with one-click assignment for every team.",
  },
  Developer: {
    title: "Engineering Cockpit",
    subtitle: "Focus on root cause, priority fixes, and clean handoffs.",
    hero: "from-slate-900 via-slate-800 to-emerald-700",
    accent: "emerald",
    help: "Developers get the technical details, confidence scores, and actionable bug signals.",
  },
  QA: {
    title: "Quality Lab",
    subtitle: "Strengthen reproduction steps, test coverage, and issue clarity.",
    hero: "from-amber-600 via-orange-600 to-rose-600",
    accent: "amber",
    help: "QA sees gaps, duplicates, and the fastest way to reproduce each item.",
  },
  Security: {
    title: "Security Watch",
    subtitle: "Spot exploit risks early and secure the blast radius.",
    hero: "from-violet-700 via-fuchsia-700 to-rose-700",
    accent: "violet",
    help: "Security gets the critical-risk items first, with a defense-first view.",
  },
  DevOps: {
    title: "Ops Radar",
    subtitle: "Track build, deploy, and infrastructure-related regressions.",
    hero: "from-cyan-700 via-sky-700 to-slate-900",
    accent: "cyan",
    help: "DevOps sees release blockers, deployment issues, and environment-level patterns.",
  },
  Product: {
    title: "Experience Studio",
    subtitle: "Prioritize what users feel, what they need, and what should ship next.",
    hero: "from-pink-700 via-rose-600 to-orange-500",
    accent: "pink",
    help: "Product gets a user-impact view, grouped by urgency and customer value.",
  },
};

const ROLE_ORDER: RoleName[] = ["Manager", "Developer", "QA", "Security", "DevOps", "Product"];
const STATUS_OPTIONS = ["New", "Triaged", "Assigned", "In Progress", "Resolved", "Closed"];
const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#ca8a04",
  Low: "#16a34a",
};

function readSettings() {
  if (typeof window === "undefined") return { provider: detectProvider(), openaiKey: "", anthropicKey: "", groqKey: "" };
  try {
    const raw = localStorage.getItem("bt_settings");
    if (!raw) return { provider: detectProvider(), openaiKey: "", anthropicKey: "", groqKey: "" };
    const parsed = JSON.parse(raw) as Partial<{ provider: AIProvider; openaiKey: string; anthropicKey: string; groqKey: string }>;
    return {
      provider: parsed.provider || detectProvider(),
      openaiKey: parsed.openaiKey || "",
      anthropicKey: parsed.anthropicKey || "",
      groqKey: parsed.groqKey || "",
    };
  } catch {
    return { provider: detectProvider(), openaiKey: "", anthropicKey: "", groqKey: "" };
  }
}

export default function RoleReportPage({ role }: { role: RoleName }) {
  const theme = ROLE_THEMES[role];
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary>(EMPTY_WORKSPACE.summary);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});
  const [teams, setTeams] = useState<Team[]>([]);
  const [tab, setTab] = useState<"report" | "board" | "signals" | "chat" | "export">("report");
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    { role: "assistant", content: `Welcome to the ${role} page. Ask about the current workspace and I’ll summarize it for your role.` },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState(readSettings());
  const workspaceReadyRef = useRef(false);

  const activeProvider = settings.provider;
  const activeApiKey =
    activeProvider === "openai"
      ? settings.openaiKey
      : activeProvider === "anthropic"
      ? settings.anthropicKey
      : activeProvider === "groq"
      ? settings.groqKey
      : undefined;

  useEffect(() => {
    const workspace = readWorkspace();
    setAnalysis(workspace.analysis || []);
    setSummary(workspace.summary || EMPTY_WORKSPACE.summary);
    setStatusMap(workspace.statusMap || {});
    setAssignmentMap(workspace.assignmentMap || {});
    fetch("/api/upload")
      .then((r) => r.json())
      .then((d) => d?.providersAvailable && setProviders(d.providersAvailable))
      .catch(() => undefined);
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) setTeams(d as Team[]);
      })
      .catch(() => undefined);
    workspaceReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!workspaceReadyRef.current) return;
    saveWorkspace({
      analysis,
      summary,
      statusMap,
      assignmentMap,
      role,
      updatedAt: Date.now(),
    });
  }, [analysis, summary, statusMap, assignmentMap, role]);

  const roleItems = useMemo(() => filterRoleItems(role, analysis), [role, analysis]);
  const roleSummary = useMemo(() => summarizeRole(role, summary, roleItems), [role, summary, roleItems]);
  const severityData = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    roleItems.forEach((item) => {
      counts[item.severity] = (counts[item.severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [roleItems]);
  const teamData = useMemo(() => {
    const counts = new Map<string, number>();
    roleItems.forEach((item) => {
      const team = assignmentMap[item.id] || item.suggestedTeam || "Unassigned";
      counts.set(team, (counts.get(team) || 0) + 1);
    });
    return [...counts.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [roleItems, assignmentMap]);
  const pendingCount = useMemo(
    () => roleItems.filter((item) => (statusMap[item.id] || "New") !== "Closed").length,
    [roleItems, statusMap]
  );
  const highRisk = useMemo(() => roleItems.filter((item) => item.severity === "Critical" || item.severity === "High").slice(0, 5), [roleItems]);
  const filteredByRole = roleItems.length ? roleItems : analysis;
  const roleBoard = roleItems.length ? roleItems : analysis;

  async function askChat(prompt: string) {
    if (!filteredByRole.length) return;
    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: prompt }]);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          provider: activeProvider,
          apiKey: activeApiKey,
          role,
          analysis: filteredByRole,
          summary,
          assignments: assignmentMap,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error || "No response" }]);
    } finally {
      setChatLoading(false);
      setChatInput("");
    }
  }

  function updateAssignment(id: string, team: string) {
    setAssignmentMap((prev) => ({ ...prev, [id]: team }));
  }

  function updateStatus(id: string, status: string) {
    setStatusMap((prev) => ({ ...prev, [id]: status }));
  }

  function exportData(format: "json" | "csv") {
    const rows = filteredByRole.map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      area: item.area,
      confidenceScore: item.confidenceScore,
      team: assignmentMap[item.id] || item.suggestedTeam,
      status: statusMap[item.id] || "New",
      duplicate: item.isDuplicate,
      missingInfo: item.missingInfo,
    }));
    const payload =
      format === "json"
        ? JSON.stringify({ role, summary: roleSummary, rows }, null, 2)
        : [
            ["id", "title", "severity", "area", "confidenceScore", "team", "status", "duplicate", "missingInfo"].join(","),
            ...rows.map((row) =>
              [row.id, row.title, row.severity, row.area, row.confidenceScore, row.team, row.status, row.duplicate, row.missingInfo]
                .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                .join(",")
            ),
          ].join("\n");
    const blob = new Blob([payload], { type: format === "json" ? "application/json" : "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `role-${role.toLowerCase()}-report.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!analysis.length) {
    return (
      <WorkspaceEmptyState
        role={role}
        help={theme.help}
        hero={theme.hero}
      />
    );
  }

  return (
    <div className={`min-h-screen text-slate-900 bg-gradient-to-br ${theme.hero} relative overflow-x-hidden`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.16),transparent_20%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,.10),transparent_18%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,.08),transparent_18%)] pointer-events-none" />
      <div className="relative max-w-[1600px] mx-auto px-4 sm:px-6 py-5 sm:py-6 space-y-6">
        <header className="glass rounded-[1.75rem] border border-white/30 px-4 sm:px-5 py-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-slate-900 grid place-items-center shadow-lg">
              <Icons.Bug className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-extrabold text-white">{role} · {theme.title}</div>
              <div className="text-xs text-white/80">{theme.subtitle}</div>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full bg-white text-slate-900 px-3 py-2 text-xs font-semibold hover:bg-slate-50">
              <Icons.ChevronRight className="w-4 h-4 rotate-180" /> Workspace
            </Link>
            <Link href="/roles" className="inline-flex items-center gap-2 rounded-full bg-white/15 text-white px-3 py-2 text-xs font-semibold hover:bg-white/20 border border-white/20">
              <Icons.Users className="w-4 h-4" /> All roles
            </Link>
          </div>
        </header>

        <section className="grid xl:grid-cols-[1.35fr_0.65fr] gap-5 items-stretch">
          <div className="rounded-[2rem] bg-white/10 border border-white/20 backdrop-blur-xl p-5 sm:p-8 text-white card-shadow">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold">
              <Icons.Sparkles className="w-4 h-4" /> Live workspace · no stored history · current session only
            </div>
            <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">{theme.title}</h1>
            <p className="mt-3 max-w-3xl text-white/85 text-sm sm:text-base leading-relaxed">{theme.subtitle}</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {ROLE_ORDER.map((r) => (
                <Link
                  key={r}
                  href={`/roles/${r.toLowerCase()}`}
                  className={`rounded-full px-3 py-2 text-xs font-semibold border transition ${r === role ? "bg-white text-slate-900 border-white" : "bg-white/15 text-white border-white/20 hover:bg-white/20"}`}
                >
                  {r}
                </Link>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <HeroStat label="Items" value={roleSummary.total} />
            <HeroStat label="Confidence" value={`${roleSummary.averageConfidence}%`} />
            <HeroStat label="Pending" value={pendingCount} />
            <HeroStat label="Critical" value={roleSummary.critical} danger />
          </div>
        </section>

        <section className="rounded-[2rem] bg-white/95 backdrop-blur-xl border border-white/40 shadow-2xl overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50/80 px-4 sm:px-6 overflow-x-auto scrollbar-thin">
            <div className="flex gap-2 py-3 min-w-max">
              {(["report", "board", "signals", "chat", "export"] as const).map((id) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold border transition capitalize ${tab === id ? "bg-slate-900 text-white border-slate-900" : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"}`}
                >
                  {id}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-5">
            {tab === "report" && (
              <div className="grid xl:grid-cols-[1.05fr_0.95fr] gap-4">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Icons.BarChart3 className="w-4 h-4 text-indigo-600" /> Role report
                    </h2>
                    <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-white border border-slate-200">{roleItems.length} relevant</span>
                  </div>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <SmallStat label="Duplicates" value={roleSummary.duplicates} />
                    <SmallStat label="Missing info" value={roleSummary.missingInfo} />
                    <SmallStat label="Open risk" value={highRisk.length} />
                    <SmallStat label="Teams" value={teamData.length} />
                  </div>
                  <div className="mt-4 h-[260px] rounded-2xl bg-white border border-slate-200 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={severityData}>
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} width={24} />
                        <Tooltip />
                        <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                          {severityData.map((d) => (
                            <Cell key={d.name} fill={SEVERITY_COLORS[d.name]} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">Priority items</h2>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                    {highRisk.length ? highRisk.map((item) => <ItemCard key={item.id} item={item} status={statusMap[item.id] || "New"} team={assignmentMap[item.id] || item.suggestedTeam} onOpen={() => setTab("board")} />) : <EmptyNote text="No high-risk items in this role slice." />}
                  </div>
                </div>
              </div>
            )}

            {tab === "board" && (
              <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Icons.Users className="w-4 h-4 text-indigo-600" /> Team assignment board
                  </h2>
                  <div className="mt-4 space-y-3 max-h-[540px] overflow-y-auto scrollbar-thin pr-1">
                    {(teams.length ? teams : []).map((team) => {
                      const teamItems = filteredByRole.filter((item) => (assignmentMap[item.id] || item.suggestedTeam) === team.name);
                      return (
                        <div key={team.id} className="rounded-2xl bg-white border border-slate-200 p-4">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-bold text-slate-900">{team.name}</div>
                              <div className="text-xs text-slate-500">{teamItems.length} items</div>
                            </div>
                            <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{team.memberCount} members</span>
                          </div>
                          <div className="mt-3 space-y-2">
                            {teamItems.length ? teamItems.slice(0, 4).map((item) => (
                              <button key={item.id} onClick={() => setTab("signals")} className="w-full rounded-2xl border border-slate-200 p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/40 transition">
                                <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                                <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                                <div className="mt-1 text-xs text-slate-500">{statusMap[item.id] || "New"} · {item.confidenceScore}% confidence</div>
                              </button>
                            )) : <EmptyNote text="No items assigned to this team yet." compact />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">
                    {role === "Manager" ? "Manage assignments and workflow" : "Role-specific task list"}
                  </h2>
                  <div className="space-y-3 max-h-[540px] overflow-y-auto scrollbar-thin pr-1">
                    {roleBoard.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{item.confidenceScore}%</span>
                        </div>
                        <div className="mt-3 grid sm:grid-cols-2 gap-2">
                          <label className="text-xs text-slate-500">
                            Team
                            {role === "Manager" ? (
                              <select value={assignmentMap[item.id] || item.suggestedTeam} onChange={(e) => updateAssignment(item.id, e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                                <option value="">Unassigned</option>
                                {teams.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}
                              </select>
                            ) : (
                              <div className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">{assignmentMap[item.id] || item.suggestedTeam}</div>
                            )}
                          </label>
                          <label className="text-xs text-slate-500">
                            Status
                            <select value={statusMap[item.id] || "New"} onChange={(e) => updateStatus(item.id, e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm bg-white">
                              {STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
                            </select>
                          </label>
                        </div>
                        <div className="mt-3 text-xs text-slate-600 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white border border-slate-200 px-2 py-1">{item.severity}</span>
                          <span className="rounded-full bg-white border border-slate-200 px-2 py-1">{item.area}</span>
                          <span className="rounded-full bg-white border border-slate-200 px-2 py-1">{item.recommendedAction}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {tab === "signals" && (
              <div className="grid xl:grid-cols-[0.95fr_1.05fr] gap-4 items-start">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-900 mb-3">Role-specific signals</h2>
                  <div className="space-y-3 max-h-[540px] overflow-y-auto scrollbar-thin pr-1">
                    {filteredByRole.map((item) => (
                      <ItemCard key={item.id} item={item} status={statusMap[item.id] || "New"} team={assignmentMap[item.id] || item.suggestedTeam} onOpen={() => setTab("board")} />
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Icons.BarChart3 className="w-4 h-4 text-indigo-600" /> Team mix
                  </h2>
                  <div className="h-[300px] rounded-2xl border border-slate-200 p-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={teamData} dataKey="value" nameKey="name" outerRadius={100} paddingAngle={2}>
                          {teamData.map((entry, index) => (
                            <Cell key={entry.name} fill={ENTRY_COLORS[index % ENTRY_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            )}

            {tab === "chat" && (
              <div className="grid xl:grid-cols-[0.8fr_1.2fr] gap-4 items-start">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50 space-y-3">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Icons.MessageSquare className="w-4 h-4 text-indigo-600" /> Role assistant</h2>
                  <p className="text-sm text-slate-600">Ask a role-aware question about the current workspace.</p>
                  <div className="flex flex-wrap gap-2">
                    {["Summarize this role view", "What should be assigned first?", "Show the biggest risk", "What is missing?"].map((q) => (
                      <button key={q} onClick={() => askChat(q)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold hover:border-indigo-300">
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-500">
                    {theme.help}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chat</div>
                    <div className="text-sm font-bold text-slate-900">Current workspace conversation</div>
                  </div>
                  <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-800"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatLoading && <div className="text-sm text-slate-500 inline-flex items-center gap-2"><Icons.RefreshCcw className="w-4 h-4 animate-spin" /> Thinking...</div>}
                  </div>
                  <div className="p-4 border-t border-slate-200">
                    <div className="flex gap-2">
                      <textarea
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        rows={2}
                        placeholder="Ask a question about this role workspace..."
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                      />
                      <button onClick={() => askChat(chatInput)} disabled={!chatInput.trim() || chatLoading} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                        <Icons.Send className="w-4 h-4 inline mr-2" /> Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "export" && (
              <div className="grid xl:grid-cols-[0.85fr_1.15fr] gap-4 items-start">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Icons.Download className="w-4 h-4 text-indigo-600" /> Export role report</h2>
                  <p className="mt-2 text-sm text-slate-600">Download this role’s filtered analysis as JSON or CSV.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => exportData("json")} className="rounded-2xl bg-slate-900 text-white px-4 py-2 text-sm font-semibold hover:bg-slate-800">JSON</button>
                    <button onClick={() => exportData("csv")} className="rounded-2xl bg-white border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">CSV</button>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h2 className="text-sm font-bold text-slate-900">Submission advice</h2>
                  <ul className="mt-3 space-y-2 text-sm text-slate-600 list-disc pl-5">
                    <li>Use GitHub for the source repository.</li>
                    <li>Deploy the Next.js app on Vercel for a live demo.</li>
                    <li>Keep the workspace data session-only to avoid history storage.</li>
                    <li>Show each role page during the demo video.</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function summarizeRole(role: RoleName, summary: AnalysisSummary, items: AnalysisItem[]): AnalysisSummary {
  if (role === "Manager") return summary;
  const counts = items.reduce(
    (acc, item) => {
      acc.total++;
      acc.averageConfidence += item.confidenceScore;
      acc[item.severity.toLowerCase() as "critical" | "high" | "medium" | "low"]++;
      if (item.isDuplicate) acc.duplicates++;
      if (item.missingInfo) acc.missingInfo++;
      return acc;
    },
    {
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      duplicates: 0,
      missingInfo: 0,
      averageConfidence: 0,
    }
  );
  return {
    total: counts.total,
    critical: counts.critical,
    high: counts.high,
    medium: counts.medium,
    low: counts.low,
    duplicates: counts.duplicates,
    missingInfo: counts.missingInfo,
    averageConfidence: counts.total ? Math.round(counts.averageConfidence / counts.total) : 0,
    topTeams: summary.topTeams,
  };
}

function filterRoleItems(role: RoleName, items: AnalysisItem[]) {
  const filtered = items.filter((item) => {
    const text = `${item.title} ${item.description} ${item.area} ${item.tags.join(" ")}`.toLowerCase();
    const team = item.suggestedTeam.toLowerCase();
    switch (role) {
      case "Manager":
        return true;
      case "Developer":
        return team.includes("frontend") || team.includes("backend") || team.includes("devops") || item.priority >= 4;
      case "QA":
        return item.missingInfo || item.isDuplicate || team.includes("qa") || item.severity !== "Low";
      case "Security":
        return team.includes("security") || text.includes("security") || text.includes("xss") || text.includes("exploit") || item.severity === "Critical";
      case "DevOps":
        return team.includes("devops") || text.includes("build") || text.includes("deploy") || text.includes("pipeline") || text.includes("ci") || text.includes("cd");
      case "Product":
        return team.includes("product") || text.includes("ui") || text.includes("ux") || item.severity !== "Critical";
      default:
        return true;
    }
  });
  return filtered.length ? filtered : items;
}

const ENTRY_COLORS = ["#4f46e5", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

function HeroStat({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className={`rounded-3xl border border-white/20 bg-white/15 backdrop-blur p-4 text-white ${danger ? "shadow-[0_12px_40px_rgba(239,68,68,.2)]" : ""}`}>
      <div className="text-[11px] uppercase tracking-wider text-white/80 font-semibold">{label}</div>
      <div className="mt-2 text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function SmallStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="mt-1 text-2xl font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function ItemCard({ item, status, team, onOpen }: { item: AnalysisItem; status: string; team?: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full rounded-3xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-mono text-slate-400">{item.id}</div>
          <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{item.confidenceScore}%</span>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
        <span>{item.severity}</span>
        <span>·</span>
        <span>{team}</span>
        <span>·</span>
        <span>{status}</span>
      </div>
    </button>
  );
}

function EmptyNote({ text, compact }: { text: string; compact?: boolean }) {
  return <div className={`rounded-2xl border border-dashed border-slate-200 bg-white ${compact ? "p-3" : "p-4"} text-sm text-slate-500 text-center`}>{text}</div>;
}

function WorkspaceEmptyState({ role, help, hero }: { role: RoleName; help: string; hero: string }) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${hero} text-white flex items-center justify-center p-4`}>
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/20 bg-white/10 backdrop-blur-xl p-6 sm:p-8 text-center card-shadow">
        <div className="inline-flex items-center gap-2 rounded-full bg-white/15 border border-white/20 px-3 py-1 text-xs font-semibold">
          <Icons.Bug className="w-4 h-4" /> {role} page ready
        </div>
        <h1 className="mt-4 text-3xl font-extrabold">No current analysis found</h1>
        <p className="mt-3 text-white/80">{help}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/" className="rounded-2xl bg-white text-slate-900 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50">Go to workspace</Link>
          <Link href="/roles" className="rounded-2xl bg-white/15 border border-white/20 px-4 py-2.5 text-sm font-semibold hover:bg-white/20">Browse all roles</Link>
        </div>
      </div>
    </div>
  );
}
