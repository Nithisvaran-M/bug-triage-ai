"use client";

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
import SettingsModal, { type AppSettings } from "./settings-modal";
import AnalysisItemModal from "./analysis-item-modal";
import type { Team } from "@/types/models";
import { DEFAULT_TEAMS, summarizeAnalysis, type AnalysisItem, type AnalysisSummary } from "@/lib/triage-utils";
import { sampleCsvText } from "@/lib/csv-parser";
import { clearWorkspace, readWorkspace, saveWorkspace } from "@/lib/workspace-store";
import type { AIProvider } from "@/lib/ai-service";

const ROLES = ["Manager", "Developer", "QA", "Security", "DevOps", "Product"] as const;
type Role = (typeof ROLES)[number];

type ChatMessage = { role: "user" | "assistant"; content: string };
type Tab = "overview" | "severity" | "duplicates" | "missing" | "teams" | "assignments" | "chat" | "settings" | "export";

const DEFAULT_SETTINGS: AppSettings = {
  provider: "heuristic",
  openaiKey: "",
  anthropicKey: "",
  groqKey: "",
};

const EMPTY_SUMMARY: AnalysisSummary = {
  total: 0,
  critical: 0,
  high: 0,
  medium: 0,
  low: 0,
  duplicates: 0,
  missingInfo: 0,
  averageConfidence: 0,
  topTeams: [],
};

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "#dc2626",
  High: "#ea580c",
  Medium: "#ca8a04",
  Low: "#16a34a",
};

const STATUS_COLORS: Record<string, string> = {
  New: "#6366f1",
  Triaged: "#06b6d4",
  Assigned: "#8b5cf6",
  "In Progress": "#f59e0b",
  Resolved: "#10b981",
  Closed: "#64748b",
};

const TABS: Array<{ id: Tab; label: string; icon: keyof typeof Icons }> = [
  { id: "overview", label: "Overview", icon: "BarChart3" },
  { id: "severity", label: "Severity", icon: "AlertTriangle" },
  { id: "duplicates", label: "Duplicates", icon: "Copy" },
  { id: "missing", label: "Missing Info", icon: "AlertCircle" },
  { id: "teams", label: "Teams", icon: "Users" },
  { id: "assignments", label: "Assignments", icon: "Workflow" },
  { id: "chat", label: "Chat", icon: "MessageSquare" },
  { id: "settings", label: "Settings", icon: "Settings2" },
  { id: "export", label: "Export", icon: "Download" },
];

function readSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem("bt_settings");
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      provider:
        parsed.provider === "openai" || parsed.provider === "anthropic" || parsed.provider === "groq"
          ? parsed.provider
          : "heuristic",
      openaiKey: parsed.openaiKey || "",
      anthropicKey: parsed.anthropicKey || "",
      groqKey: parsed.groqKey || "",
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function readStatusMap() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    return JSON.parse(sessionStorage.getItem("bt_status_map") || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function readAssignmentMap() {
  if (typeof window === "undefined") return {} as Record<string, string>;
  try {
    return JSON.parse(sessionStorage.getItem("bt_assignment_map") || "{}") as Record<string, string>;
  } catch {
    return {};
  }
}

function saveSessionMaps(statusMap: Record<string, string>, assignmentMap: Record<string, string>) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem("bt_status_map", JSON.stringify(statusMap));
  sessionStorage.setItem("bt_assignment_map", JSON.stringify(assignmentMap));
}

export default function Dashboard() {
  const [role, setRole] = useState<Role>("Manager");
  const [tab, setTab] = useState<Tab>("overview");
  const [teamTab, setTeamTab] = useState<string>("All Teams");
  const [teams, setTeams] = useState<Team[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisItem[]>([]);
  const [summary, setSummary] = useState<AnalysisSummary>(EMPTY_SUMMARY);
  const [selectedItem, setSelectedItem] = useState<AnalysisItem | null>(null);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [assignmentMap, setAssignmentMap] = useState<Record<string, string>>({});
  const [providers, setProviders] = useState<Record<string, boolean>>({});
  const [appSettings, setAppSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ask anything about the current analysis. I can summarize risk, teams, duplicates, missing info, and what should happen next.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [toast, setToast] = useState("");
   const [mounted, setMounted] = useState(false);
   const workspaceReadyRef = useRef(false);
   const fileInputRef = useRef<HTMLInputElement>(null);

  const activeProvider = appSettings.provider;
  const activeApiKey =
    activeProvider === "openai"
      ? appSettings.openaiKey
      : activeProvider === "anthropic"
      ? appSettings.anthropicKey
      : activeProvider === "groq"
      ? appSettings.groqKey
      : undefined;

   useEffect(() => {
    setMounted(true);
    const saved = readSettings();
    setAppSettings(saved);
    const workspace = readWorkspace();
    if (workspace.analysis.length > 0) {
      setAnalysis(workspace.analysis);
      setSummary(workspace.summary);
      setStatusMap(workspace.statusMap);
      setAssignmentMap(workspace.assignmentMap);
      setRole((workspace.role as Role) || "Manager");
    } else {
      saveWorkspace({
        analysis: [],
        summary: EMPTY_SUMMARY,
        statusMap: {},
        assignmentMap: {},
        role: "Manager",
        updatedAt: Date.now(),
      });
    }
    saveSessionMaps(readStatusMap(), readAssignmentMap());
    fetch("/api/upload")
      .then((r) => r.json())
      .then((d) => {
        if (d?.providersAvailable) setProviders(d.providersAvailable);
      })
      .catch(() => undefined);
    fetch("/api/teams")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d) && d.length > 0) setTeams(d as Team[]);
        else setTeams(DEFAULT_TEAMS as unknown as Team[]);
      })
      .catch(() => setTeams(DEFAULT_TEAMS as unknown as Team[]));
    workspaceReadyRef.current = true;
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("bt_settings", JSON.stringify(appSettings));
  }, [appSettings, mounted]);

  useEffect(() => {
    if (!workspaceReadyRef.current) return;
    saveSessionMaps(statusMap, assignmentMap);
    if (analysis.length) {
      saveWorkspace({
        analysis,
        summary,
        statusMap,
        assignmentMap,
        role,
        updatedAt: Date.now(),
      });
    }
  }, [statusMap, assignmentMap, analysis, summary, role]);

  useEffect(() => {
    if (!analysis.length) return;
    const nextStatus: Record<string, string> = {};
    const nextAssignments: Record<string, string> = {};
    analysis.forEach((item) => {
      nextStatus[item.id] = statusMap[item.id] || "New";
      nextAssignments[item.id] = assignmentMap[item.id] || item.suggestedTeam || "";
    });
    setStatusMap(nextStatus);
    setAssignmentMap(nextAssignments);
  }, [analysis]);

  const assignedCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    analysis.forEach((item) => {
      const assigned = assignmentMap[item.id] || item.suggestedTeam || "Unassigned";
      counts[assigned] = (counts[assigned] || 0) + 1;
    });
    return counts;
  }, [analysis, assignmentMap]);

  const severityData = useMemo(() => {
    const counts: Record<string, number> = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    analysis.forEach((item) => (counts[item.severity] += 1));
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [analysis]);

  const teamData = useMemo(() => {
    const counts: Record<string, number> = {};
    analysis.forEach((item) => {
      const team = assignmentMap[item.id] || item.suggestedTeam || "Unassigned";
      counts[team] = (counts[team] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [analysis, assignmentMap]);

  const duplicateGroups = useMemo(() => {
    const groups = new Map<number, AnalysisItem[]>();
    analysis.forEach((item) => {
      if (typeof item.duplicateGroup === "number") {
        if (!groups.has(item.duplicateGroup)) groups.set(item.duplicateGroup, []);
        groups.get(item.duplicateGroup)!.push(item);
      }
    });
    return [...groups.entries()].sort((a, b) => a[0] - b[0]);
  }, [analysis]);

  const missingItems = useMemo(() => analysis.filter((item) => item.missingInfo), [analysis]);
  const roleGuidance = useMemo(() => {
    const map: Record<Role, string> = {
      Manager: "Use the Assignments tab to route work, then close duplicates and high-risk issues first.",
      Developer: "Use the analysis tabs to understand root cause, then update status and confirm fixes.",
      QA: "Prioritize missing info, reproduction quality, and deterministic test steps.",
      Security: "Escalate exploit-like issues first and verify the blast radius before closing.",
      DevOps: "Watch build/deploy failures and validate infra-related regressions quickly.",
      Product: "Focus on user impact, prioritization, and any scope or UX follow-ups.",
    };
    return map[role];
  }, [role]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2300);
  }

  function applyAnalysis(items: AnalysisItem[], summaryData: AnalysisSummary) {
    setAnalysis(items);
    setSummary(summaryData);
    const nextStatus: Record<string, string> = {};
    const nextAssignments: Record<string, string> = {};
    items.forEach((item) => {
      nextStatus[item.id] = item.missingInfo ? "Triaged" : item.isDuplicate ? "Closed" : "New";
      nextAssignments[item.id] = item.suggestedTeam || "";
    });
    setStatusMap(nextStatus);
    setAssignmentMap(nextAssignments);
    setSelectedItem(null);
    setTab("overview");
    setTeamTab("All Teams");
    saveWorkspace({
      analysis: items,
      summary: summaryData,
      statusMap: nextStatus,
      assignmentMap: nextAssignments,
      role,
      updatedAt: Date.now(),
    });
  }

  async function analyzeInput() {
    if (!rawText.trim() && !fileInputRef.current?.files?.[0]) {
      showToast("Paste a bug report or upload a CSV first.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const form = new FormData();
      const file = fileInputRef.current?.files?.[0];
      if (file) form.append("file", file);
      if (rawText.trim()) form.append("rawText", rawText.trim());
      form.append("provider", activeProvider);
      if (activeApiKey) form.append("apiKey", activeApiKey);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Analysis failed");
      applyAnalysis(data.items as AnalysisItem[], data.summary as AnalysisSummary);
      showToast(`Analyzed ${data.summary.total} items with ${data.provider}`);
    } catch (e: any) {
      showToast(e?.message || "Analysis failed");
    } finally {
      setIsAnalyzing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function sendChat(question: string) {
    const q = question.trim();
    if (!q || !analysis.length) return;
    setChatLoading(true);
    setChatMessages((prev) => [...prev, { role: "user", content: q }]);
    setChatInput("");
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          question: q,
          provider: activeProvider,
          apiKey: activeApiKey,
          role,
          analysis,
          summary,
          assignments: assignmentMap,
        }),
      });
      const data = await res.json();
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.answer || data.error || "No response" }]);
    } catch (e: any) {
      setChatMessages((prev) => [...prev, { role: "assistant", content: e?.message || "Chat failed" }]);
    } finally {
      setChatLoading(false);
    }
  }

  function updateAssignment(itemId: string, team: string) {
    setAssignmentMap((prev) => ({ ...prev, [itemId]: team }));
    showToast(`Assigned ${itemId} to ${team || "Unassigned"}`);
  }

  function updateStatus(itemId: string, status: string) {
    setStatusMap((prev) => ({ ...prev, [itemId]: status }));
    showToast(`Status updated to ${status}`);
  }

  function assignTeamBulk(teamName: string) {
    const next = { ...assignmentMap };
    analysis.forEach((item) => {
      if ((item.suggestedTeam || "") === teamName || teamName === "All Teams") {
        next[item.id] = teamName === "All Teams" ? item.suggestedTeam : teamName;
      }
    });
    setAssignmentMap(next);
    showToast(`Bulk assignment applied for ${teamName}`);
  }

  function exportAnalysis(format: "json" | "csv") {
    if (!analysis.length) return;
    const rows = analysis.map((item) => ({
      id: item.id,
      title: item.title,
      severity: item.severity,
      area: item.area,
      priority: item.priority,
      confidenceScore: item.confidenceScore,
      team: assignmentMap[item.id] || item.suggestedTeam,
      status: statusMap[item.id] || "New",
      duplicate: item.isDuplicate,
      missingInfo: item.missingInfo,
    }));
      const blob =
      format === "json"
        ? new Blob([JSON.stringify({ summary, rows }, null, 2)], { type: "application/json" })
        : new Blob(
            [
              ["id", "title", "severity", "area", "priority", "confidenceScore", "team", "status", "duplicate", "missingInfo"].join(","),
              ...rows.map((row) =>
                [row.id, row.title, row.severity, row.area, row.priority, row.confidenceScore, row.team, row.status, row.duplicate, row.missingInfo]
                  .map((v) => `"${String(v).replace(/"/g, '""')}"`)
                  .join(",")
              ),
            ].join("\n")
              .split("\n"),
            { type: "text/csv" }
          );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bugtriage-analysis.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const visibleItems = useMemo(() => {
    if (tab === "duplicates") return analysis.filter((item) => item.isDuplicate);
    if (tab === "missing") return missingItems;
    if (tab === "teams") return analysis;
    if (tab === "assignments") return analysis;
    return analysis;
  }, [analysis, missingItems, tab]);

  const currentTeamColumns = useMemo(() => {
    const names = teams.length ? teams.map((t) => t.name) : [...DEFAULT_TEAMS].map((t) => t.name);
    if (teamTab === "All Teams") return names;
    return names.includes(teamTab) ? [teamTab] : names;
  }, [teams, teamTab]);

  const appProviderButtons = ["heuristic", "openai", "anthropic", "groq"] as const;
  const providerAvailable = (p: AIProvider) => (p === "heuristic" ? true : !!providers[p]);

  return (
    <div className="min-h-screen text-slate-900">
      <header className="sticky top-0 z-40 glass border-b border-white/60">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-fuchsia-600 text-white grid place-items-center shadow-lg shadow-indigo-500/30">
              <Icons.Bug className="w-6 h-6" />
            </div>
            <div>
              <div className="text-sm font-bold leading-tight">BugTriage AI</div>
              <div className="text-[11px] text-slate-500">Zero-history triage workspace · GitHub-ready</div>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-1 ml-2 bg-white border border-slate-200 rounded-full p-1 text-xs font-semibold">
            {ROLES.map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`px-3 py-1.5 rounded-full transition ${role === r ? "bg-indigo-600 text-white" : "text-slate-600 hover:text-slate-900"}`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Icons.Settings2 className="w-4 h-4" /> Settings
            </button>
            <a
              href="/roles"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Icons.Users className="w-4 h-4" /> Role pages
            </a>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700"
            >
              <Icons.UploadCloud className="w-4 h-4" /> Upload CSV
            </button>
            <button
              onClick={analyzeInput}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800"
            >
              <Icons.Sparkles className="w-4 h-4" /> Analyze pasted text
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section className="rounded-[2rem] overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white card-shadow relative">
          <div className="absolute inset-0 opacity-40 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,.24),transparent_25%),radial-gradient(circle_at_80%_10%,rgba(255,255,255,.16),transparent_20%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,.12),transparent_20%)]" />
          <div className="relative p-5 sm:p-8 grid lg:grid-cols-[1.2fr_0.8fr] gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 border border-white/20 text-xs font-semibold">
                <Icons.BrainCircuit className="w-4 h-4" /> Free APIs · No stored history · Role-based tabs
              </div>
              <h1 className="mt-4 text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
                Turn raw bug reports into a clean, assignment-ready triage board.
              </h1>
              <p className="mt-3 text-white/85 max-w-2xl text-sm sm:text-base leading-relaxed">
                Paste a bug row, upload a CSV, or drop in raw text. The app analyzes severity, detects duplicates,
                flags missing information, recommends a team, and gives you a confidence score for every item.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white text-indigo-700 text-sm font-semibold hover:bg-indigo-50"
                >
                  <Icons.UploadCloud className="w-4 h-4" /> Choose CSV
                </button>
                <button
                  onClick={analyzeInput}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 border border-white/20 text-white text-sm font-semibold hover:bg-white/25"
                >
                  <Icons.Sparkles className="w-4 h-4" /> Run analysis
                </button>
                <button
                  onClick={() => exportAnalysis("json")}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-white/90 text-sm font-semibold hover:bg-white/10"
                >
                  <Icons.Download className="w-4 h-4" /> Export JSON
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="hidden" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatTile label="Items" value={summary.total} />
              <StatTile label="Confidence" value={`${summary.averageConfidence}%`} />
              <StatTile label="Critical" value={summary.critical} danger />
              <StatTile label="Assigned" value={analysis.filter((a) => (assignmentMap[a.id] || a.suggestedTeam) !== "").length} success />
              <StatTile label="Duplicates" value={summary.duplicates} />
              <StatTile label="Missing" value={summary.missingInfo} />
            </div>
          </div>
        </section>

        <section className="grid xl:grid-cols-[1.5fr_0.9fr] gap-6 items-start">
          <div className="rounded-3xl bg-white border border-slate-200 card-shadow p-4 sm:p-5 space-y-4">
            <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-4">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-700">Paste bug row or raw report</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={6}
                  placeholder='BUG-001,"Application crashes on checkout",...'
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setRawText('BUG-001,"Application crashes on checkout","Android 14 / App Version 2.4.1","Critical","High","1. Add item to cart\n2. Tap checkout icon\n3. Tap \'Pay Now\' button","App processes payment and shows confirmation screen","App freezes for 3 seconds and abruptly crashes to home screen","Open"')}
                    className="text-xs font-semibold px-3 py-2 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 hover:bg-indigo-100"
                  >
                    Load sample row
                  </button>
                  <button
                    onClick={() => setRawText(sampleCsvText())}
                    className="text-xs font-semibold px-3 py-2 rounded-full bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200"
                  >
                    Load sample CSV
                  </button>
                </div>
                <div className="text-[11px] text-slate-500">Smart parser works with CSV rows, plain bug text, or pasted summaries.</div>
              </div>
              <div className="space-y-3">
                <div>
                  <div className="text-xs font-semibold text-slate-700 mb-2">Role tabs</div>
                  <div className="flex flex-wrap gap-2">
                    {ROLES.map((r) => (
                      <button
                        key={r}
                        onClick={() => setRole(r)}
                        className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${
                          role === r ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current role</div>
                  <div className="mt-1 text-lg font-bold text-slate-900">{role}</div>
                  <p className="mt-2 text-sm text-slate-600">{roleGuidance}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={analyzeInput}
                disabled={isAnalyzing}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50"
              >
                <Icons.Sparkles className="w-4 h-4" /> {isAnalyzing ? "Analyzing..." : "Analyze input"}
              </button>
              <button
                onClick={() => setRawText("")}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Icons.X className="w-4 h-4" /> Clear text
              </button>
              <div className="ml-auto flex flex-wrap gap-2">
                {appProviderButtons.map((p) => {
                  const enabled = providerAvailable(p);
                  return (
                    <button
                      key={p}
                      onClick={() => enabled && setAppSettings((s) => ({ ...s, provider: p }))}
                      disabled={!enabled}
                      className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${
                        activeProvider === p ? "bg-slate-900 text-white border-slate-900" : enabled ? "bg-white text-slate-700 border-slate-200 hover:border-indigo-300" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white border border-slate-200 card-shadow p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Icons.Activity className="w-4 h-4 text-indigo-600" /> Summary
              </h2>
              <span className="text-[11px] font-semibold px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 capitalize">
                {activeProvider}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Critical" value={summary.critical} tone="red" />
              <MiniStat label="High" value={summary.high} tone="orange" />
              <MiniStat label="Medium" value={summary.medium} tone="amber" />
              <MiniStat label="Low" value={summary.low} tone="green" />
            </div>
            <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Top team suggestions</div>
              <div className="mt-2 space-y-2">
                {summary.topTeams.slice(0, 4).map((team) => (
                  <div key={team.team} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{team.team}</span>
                    <span className="font-semibold text-slate-900">{team.count}</span>
                  </div>
                ))}
                {summary.topTeams.length === 0 && <div className="text-sm text-slate-500">No data yet.</div>}
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-600">
              No CSV history is stored. Each analysis lives only in the current workspace and can be exported.
            </div>
          </div>
        </section>

        <section className="rounded-3xl bg-white border border-slate-200 card-shadow overflow-hidden">
          <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-5 overflow-x-auto scrollbar-thin">
            <div className="flex gap-2 py-3 min-w-max">
              {TABS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setTab(item.id)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border transition ${
                    tab === item.id ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                  }`}
                >
                  {Icons[item.icon] ? (() => { const Icon = Icons[item.icon]; return <Icon className="w-4 h-4" />; })() : null}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-6">
            {tab === "overview" && (
              <div className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Icons.Bug className="w-4 h-4 text-indigo-600" /> Current analysis
                  </h3>
                  <div className="mt-4 grid sm:grid-cols-2 gap-3">
                    <InfoCard label="Items" value={summary.total} />
                    <InfoCard label="Average confidence" value={`${summary.averageConfidence}%`} />
                    <InfoCard label="Duplicates" value={summary.duplicates} />
                    <InfoCard label="Missing info" value={summary.missingInfo} />
                  </div>
                  <div className="mt-4 text-sm text-slate-600">{roleGuidance}</div>
                </div>

                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h3 className="text-sm font-bold text-slate-900">Quick action list</h3>
                  <div className="mt-4 space-y-3">
                    {analysis.slice(0, 5).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{item.confidenceScore}%</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">
                          <span>{item.suggestedTeam}</span>
                          <span>·</span>
                          <span>{item.severity}</span>
                          <span>·</span>
                          <span>{statusMap[item.id] || "New"}</span>
                        </div>
                      </button>
                    ))}
                    {analysis.length === 0 && <div className="text-sm text-slate-500">No analysis yet. Paste a bug report above.</div>}
                  </div>
                </div>
              </div>
            )}

            {tab === "severity" && (
              <div className="grid xl:grid-cols-2 gap-4 items-start">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Icons.BarChart3 className="w-4 h-4 text-indigo-600" /> Severity distribution
                  </h3>
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={severityData}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} width={30} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                        {severityData.map((d) => (
                          <Cell key={d.name} fill={SEVERITY_COLORS[d.name] || "#6366f1"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">High-priority items</h3>
                  <div className="space-y-3 max-h-[320px] overflow-y-auto scrollbar-thin pr-1">
                    {analysis
                      .filter((item) => item.severity === "Critical" || item.severity === "High")
                      .map((item) => (
                        <BugLine key={item.id} item={item} assigned={assignmentMap[item.id] || item.suggestedTeam} onOpen={() => setSelectedItem(item)} />
                      ))}
                    {!analysis.filter((item) => item.severity === "Critical" || item.severity === "High").length && (
                      <div className="text-sm text-slate-500">No high-priority items yet.</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "duplicates" && (
              <div className="space-y-4">
                {duplicateGroups.length > 0 ? (
                  duplicateGroups.map(([groupId, items]) => (
                    <div key={groupId} className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Duplicate group #{groupId}</div>
                          <div className="text-sm text-slate-600">Keep one master issue and close or merge the rest.</div>
                        </div>
                        <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white border border-slate-200">{items.length} items</span>
                      </div>
                      <div className="mt-4 grid md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => setSelectedItem(item)}
                            className="rounded-2xl border border-slate-200 bg-white p-4 text-left hover:border-indigo-300 transition"
                          >
                            <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                            <div className="mt-1 text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                            <div className="mt-2 text-xs text-slate-500">Confidence {item.confidenceScore}% · {item.suggestedTeam}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))
                ) : (
                  <EmptyState title="No duplicates found" description="When duplicates are detected, they will appear here with a master issue suggestion." />
                )}
              </div>
            )}

            {tab === "missing" && (
              <div className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Icons.AlertCircle className="w-4 h-4 text-amber-600" /> Missing information
                  </h3>
                  <div className="space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                    {missingItems.map((item) => (
                      <button key={item.id} onClick={() => setSelectedItem(item)} className="w-full rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left hover:bg-amber-100 transition">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-xs font-mono text-amber-700">{item.id}</div>
                            <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                          </div>
                          <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-white border border-amber-200 text-amber-700">{item.confidenceScore}%</span>
                        </div>
                        <div className="mt-2 text-xs text-slate-600">{item.clarifyingMessage}</div>
                      </button>
                    ))}
                    {!missingItems.length && <EmptyState title="No missing-info items" description="Reports with missing steps or context will show here." compact />}
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-900 mb-3">Suggested clarifying message template</h3>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-700 leading-relaxed">
                    Thanks for the report. Could you share the exact reproduction steps, browser/OS version, and expected vs actual behavior? A screenshot or short recording will help us validate faster.
                  </div>
                </div>
              </div>
            )}

            {tab === "teams" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin pb-1">
                  <TeamTabButton active={teamTab === "All Teams"} onClick={() => setTeamTab("All Teams")} label="All Teams" />
                  {teams.map((team) => (
                    <TeamTabButton key={team.id} active={teamTab === team.name} onClick={() => setTeamTab(team.name)} label={team.name} />
                  ))}
                </div>
                <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(teamTab === "All Teams" ? teams : teams.filter((team) => team.name === teamTab)).map((team) => {
                    const assigned = analysis.filter((item) => (assignmentMap[item.id] || item.suggestedTeam) === team.name);
                    return (
                      <div key={team.id} className="rounded-3xl border border-slate-200 p-4 bg-white">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{team.name}</div>
                            <div className="text-xs text-slate-500">{team.description}</div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{assigned.length} bugs</span>
                        </div>
                        <div className="mt-3 space-y-2 max-h-[420px] overflow-y-auto scrollbar-thin pr-1">
                          {assigned.length ? (
                            assigned.map((item) => (
                              <TeamBugRow
                                key={item.id}
                                item={item}
                                team={team.name}
                                status={statusMap[item.id] || "New"}
                                onOpen={() => setSelectedItem(item)}
                              />
                            ))
                          ) : (
                            <div className="text-sm text-slate-500 rounded-2xl border border-dashed border-slate-200 p-4 text-center">No assigned bugs yet.</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "assignments" && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {['All Teams', ...teams.map((team) => team.name)].map((name) => (
                    <TeamTabButton key={name} active={teamTab === name} onClick={() => setTeamTab(name)} label={name} />
                  ))}
                  {role === "Manager" && teamTab !== "All Teams" && (
                    <button onClick={() => assignTeamBulk(teamTab)} className="ml-auto inline-flex items-center gap-2 px-3 py-2 rounded-full bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700">
                      <Icons.Sparkles className="w-4 h-4" /> Auto-assign team
                    </button>
                  )}
                </div>

                <div className="grid xl:grid-cols-3 gap-4">
                  {(teamTab === "All Teams" ? teams : teams.filter((team) => team.name === teamTab)).map((team) => {
                    const bugsForTeam = analysis.filter((item) => (assignmentMap[item.id] || item.suggestedTeam) === team.name || teamTab === "All Teams");
                    return (
                      <div key={team.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-bold text-slate-900">{team.name}</div>
                            <div className="text-xs text-slate-500">Members: {team.memberCount}</div>
                          </div>
                          <span className="text-xs font-semibold px-2 py-1 rounded-full bg-white border border-slate-200">{assignedCounts[team.name] || 0}</span>
                        </div>
                        <div className="mt-3 space-y-2 max-h-[460px] overflow-y-auto scrollbar-thin pr-1">
                          {bugsForTeam.filter((item) => teamTab === "All Teams" ? true : (assignmentMap[item.id] || item.suggestedTeam) === team.name).map((item) => (
                            <div key={item.id} className="rounded-2xl bg-white border border-slate-200 p-3 shadow-sm">
                              <button onClick={() => setSelectedItem(item)} className="w-full text-left">
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="text-xs text-slate-400 font-mono">{item.id}</div>
                                    <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
                                  </div>
                                  <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{item.confidenceScore}%</span>
                                </div>
                              </button>
                              <div className="mt-3 flex flex-wrap gap-2 items-center">
                                <select value={assignmentMap[item.id] || item.suggestedTeam} onChange={(e) => updateAssignment(item.id, e.target.value)} className="flex-1 min-w-[150px] rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white">
                                  <option value="">Unassigned</option>
                                  {teams.map((teamOption) => <option key={teamOption.id} value={teamOption.name}>{teamOption.name}</option>)}
                                </select>
                                <select value={statusMap[item.id] || 'New'} onChange={(e) => updateStatus(item.id, e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-xs bg-white">
                                  {['New', 'Triaged', 'Assigned', 'In Progress', 'Resolved', 'Closed'].map((status) => <option key={status} value={status}>{status}</option>)}
                                </select>
                              </div>
                              <div className="mt-3 text-[11px] text-slate-500 flex flex-wrap gap-2">
                                <span>{item.severity}</span>
                                <span>·</span>
                                <span>{item.area}</span>
                                <span>·</span>
                                <span>{item.recommendedAction}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {tab === "chat" && (
              <div className="grid xl:grid-cols-[0.9fr_1.1fr] gap-4 items-start">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Icons.MessageSquare className="w-4 h-4 text-indigo-600" /> Analysis assistant</h3>
                  <p className="text-sm text-slate-600">Ask about risk, duplicates, assignment plans, and what to do next.</p>
                  <div className="flex flex-wrap gap-2">
                    {['Summary', 'Critical bugs', 'Duplicates', 'Missing info', 'Best assignment'].map((q) => (
                      <button key={q} onClick={() => sendChat(q)} className="text-xs font-semibold px-3 py-2 rounded-full bg-white border border-slate-200 hover:border-indigo-300">
                        {q}
                      </button>
                    ))}
                  </div>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 text-xs text-slate-500">
                    The assistant uses the current in-memory analysis only. Nothing is stored as history.
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Chat</div>
                    <div className="text-sm font-bold text-slate-900">Current workspace assistant</div>
                  </div>
                  <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto scrollbar-thin">
                    {chatMessages.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
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
                        placeholder="Ask a question about this analysis..."
                        className="flex-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
                      />
                      <button onClick={() => sendChat(chatInput)} disabled={!chatInput.trim() || chatLoading || !analysis.length} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
                        <Icons.Send className="w-4 h-4 inline mr-2" /> Send
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {tab === "settings" && (
              <div className="grid xl:grid-cols-[1fr_0.8fr] gap-4">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Icons.Settings2 className="w-4 h-4 text-indigo-600" /> API settings</h3>
                      <p className="text-sm text-slate-600 mt-1">Paste your API keys here. Heuristic fallback works if you leave them empty.</p>
                    </div>
                    <button onClick={() => setShowSettings(true)} className="px-3 py-2 rounded-full bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800">Open modal</button>
                  </div>
                  <ProviderButtons provider={activeProvider} available={providers} onChange={(provider) => setAppSettings((s) => ({ ...s, provider }))} />
                  <div className="grid gap-3">
                    <ApiField label="OpenAI API key" value={appSettings.openaiKey} onChange={(v) => setAppSettings((s) => ({ ...s, openaiKey: v }))} />
                    <ApiField label="Anthropic API key" value={appSettings.anthropicKey} onChange={(v) => setAppSettings((s) => ({ ...s, anthropicKey: v }))} />
                    <ApiField label="Groq API key" value={appSettings.groqKey} onChange={(v) => setAppSettings((s) => ({ ...s, groqKey: v }))} />
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900">GitHub hosting guidance</h3>
                  <ol className="space-y-2 text-sm text-slate-700 list-decimal pl-5">
                    <li>Commit this repo to a public GitHub repository.</li>
                    <li>Push source code, README, and sample submission files.</li>
                    <li>Connect the GitHub repo to Vercel or another Node host for live deployment.</li>
                    <li>Use this app’s Settings tab to paste API keys after deployment.</li>
                  </ol>
                  <div className="rounded-2xl bg-white border border-slate-200 p-4 text-sm text-slate-600">
                    GitHub is best used as the source repository. For a working Next.js app with server routes and PostgreSQL, use Vercel/Render/Railway for hosting.
                  </div>
                </div>
              </div>
            )}

            {tab === "export" && (
              <div className="grid xl:grid-cols-2 gap-4">
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-slate-50">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Icons.Download className="w-4 h-4 text-indigo-600" /> Export workspace</h3>
                  <p className="mt-2 text-sm text-slate-600">Download the current analysis as JSON or CSV for GitHub submission or demo sharing.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button onClick={() => exportAnalysis('json')} className="px-4 py-2 rounded-2xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700">Download JSON</button>
                    <button onClick={() => exportAnalysis('csv')} className="px-4 py-2 rounded-2xl bg-white border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50">Download CSV</button>
                  </div>
                </div>
                <div className="rounded-3xl border border-slate-200 p-4 sm:p-5 bg-white">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Icons.RefreshCcw className="w-4 h-4 text-indigo-600" /> Workspace reset</h3>
                  <p className="mt-2 text-sm text-slate-600">Clear the current in-memory analysis if you want to start a fresh session without any stored history.</p>
                  <button onClick={() => { clearWorkspace(); setAnalysis([]); setSummary(EMPTY_SUMMARY); setStatusMap({}); setAssignmentMap({}); setChatMessages([{ role: 'assistant', content: 'Workspace cleared. Paste a new bug report to begin.' }]); setTab('overview'); }} className="mt-4 px-4 py-2 rounded-2xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800">
                    Clear current analysis
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      {selectedItem && (
        <AnalysisItemModal
          item={selectedItem}
          teams={teams}
          role={role}
          assignedTeam={assignmentMap[selectedItem.id] || selectedItem.suggestedTeam}
          status={statusMap[selectedItem.id] || "New"}
          onClose={() => setSelectedItem(null)}
          onAssign={(team) => updateAssignment(selectedItem.id, team)}
          onStatusChange={(status) => updateStatus(selectedItem.id, status)}
        />
      )}

      {showSettings && (
        <SettingsModal
          initialSettings={appSettings}
          onClose={() => setShowSettings(false)}
          onSave={(next) => {
            setAppSettings(next);
            setShowSettings(false);
            showToast("Settings saved");
          }}
        />
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full bg-slate-900 text-white px-4 py-2.5 text-sm shadow-xl animate-float-in">
          {toast}
        </div>
      )}
    </div>
  );
}

function StatTile({ label, value, danger, success }: { label: string; value: string | number; danger?: boolean; success?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 border ${danger ? "bg-red-500/15 border-white/20" : success ? "bg-emerald-500/15 border-white/20" : "bg-white/15 border-white/20"}`}>
      <div className="text-xs font-semibold uppercase tracking-wider text-white/80">{label}</div>
      <div className="mt-2 text-2xl font-extrabold text-white">{value}</div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: number; tone: "red" | "orange" | "amber" | "green" }) {
  const toneMap = {
    red: "bg-red-50 text-red-700 border-red-100",
    orange: "bg-orange-50 text-orange-700 border-orange-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-emerald-50 text-emerald-700 border-emerald-100",
  };
  return (
    <div className={`rounded-2xl border p-4 ${toneMap[tone]}`}>
      <div className="text-xs font-semibold uppercase tracking-wider">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function InfoCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-extrabold text-slate-900">{value}</div>
    </div>
  );
}

function EmptyState({ title, description, compact }: { title: string; description: string; compact?: boolean }) {
  return (
    <div className={`rounded-3xl border border-dashed border-slate-200 bg-white ${compact ? "p-4" : "p-6"} text-center`}>
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-sm text-slate-500">{description}</div>
    </div>
  );
}

function BugLine({ item, assigned, onOpen }: { item: AnalysisItem; assigned?: string; onOpen: () => void }) {
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-slate-200 p-4 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-slate-400 font-mono">{item.id}</div>
          <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{item.confidenceScore}%</span>
      </div>
      <div className="mt-2 text-xs text-slate-500 flex flex-wrap gap-2">
        <span>{item.severity}</span>
        <span>·</span>
        <span>{assigned || item.suggestedTeam}</span>
        <span>·</span>
        <span>{item.area}</span>
      </div>
    </button>
  );
}

function TeamBugRow({
  item,
  team,
  status,
  onOpen,
}: {
  item: AnalysisItem;
  team: string;
  status: string;
  onOpen: () => void;
}) {
  return (
    <button onClick={onOpen} className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-300 hover:bg-indigo-50/30 transition">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-xs text-slate-400 font-mono">{item.id}</div>
          <div className="text-sm font-semibold text-slate-900 line-clamp-2">{item.title}</div>
        </div>
        <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-indigo-100 text-indigo-700">{item.confidenceScore}%</span>
      </div>
      <div className="mt-2 text-xs text-slate-500">{team} · {item.severity} · {status || "New"}</div>
    </button>
  );
}

function TeamTabButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${active ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"}`}>
      {label}
    </button>
  );
}

function ProviderButtons({ provider, available, onChange }: { provider: AIProvider; available: Record<string, boolean>; onChange: (provider: AIProvider) => void }) {
  const items: AIProvider[] = ["heuristic", "openai", "anthropic", "groq"];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((p) => {
        const enabled = p === "heuristic" ? true : !!available[p];
        return (
          <button key={p} onClick={() => enabled && onChange(p)} disabled={!enabled} className={`px-3 py-2 rounded-full text-xs font-semibold border transition ${provider === p ? "bg-slate-900 text-white border-slate-900" : enabled ? "bg-white text-slate-700 border-slate-200 hover:border-indigo-300" : "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"}`}>
            {p}
          </button>
        );
      })}
    </div>
  );
}

function ApiField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold text-slate-700 block mb-1">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} type="password" placeholder="Paste key here" className="w-full rounded-2xl border border-slate-200 px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
    </div>
  );
}
