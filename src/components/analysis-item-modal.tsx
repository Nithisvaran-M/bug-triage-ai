"use client";

import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Icons } from "./icons";
import type { AnalysisItem } from "@/lib/triage-utils";
import type { Team } from "@/types/models";

const STATUS_OPTIONS = ["New", "Triaged", "Assigned", "In Progress", "Resolved", "Closed"] as const;

type Props = {
  item: AnalysisItem;
  teams: Team[];
  role: string;
  assignedTeam: string;
  status: string;
  onClose: () => void;
  onAssign: (team: string) => void;
  onStatusChange: (status: string) => void;
};

export default function AnalysisItemModal({
  item,
  teams,
  role,
  assignedTeam,
  status,
  onClose,
  onAssign,
  onStatusChange,
}: Props) {
  const [tab, setTab] = useState<"overview" | "assignment" | "signals" | "fix">("overview");
  const isManager = role === "Manager";
  const teamLabel = assignedTeam || item.suggestedTeam;

  const duplicateNote = useMemo(() => {
    if (!item.isDuplicate) return "This item is not currently marked as a duplicate.";
    if (item.duplicateOfId) return `This item looks like a duplicate of ${item.duplicateOfId}. Keep one master issue and close the duplicate.`;
    return "This item belongs to a duplicate cluster. Keep the best written report as the master issue.";
  }, [item]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 backdrop-blur-sm p-4 animate-float-in">
      <div className="w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-white card-shadow flex flex-col">
        <div className="p-5 sm:p-6 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 text-white flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.14em] text-white/75 font-semibold">Analysis detail</div>
            <h2 className="mt-1 text-xl sm:text-2xl font-extrabold leading-tight">{item.title}</h2>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <Chip>{item.severity}</Chip>
              <Chip>{item.area}</Chip>
              <Chip>{item.confidenceScore}% confidence</Chip>
              <Chip>{item.analysisSource}</Chip>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10" aria-label="Close detail">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        <div className="border-b border-slate-200 bg-slate-50 px-4 sm:px-6 overflow-x-auto scrollbar-thin">
          <div className="flex gap-2 py-3 min-w-max">
            {(["overview", "signals", "assignment", "fix"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-full text-sm font-semibold transition capitalize ${
                  tab === t ? "bg-indigo-600 text-white" : "bg-white text-slate-700 border border-slate-200 hover:border-indigo-300"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6 bg-white">
          {tab === "overview" && (
            <div className="grid lg:grid-cols-3 gap-4">
              <Panel className="lg:col-span-2">
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.FileText className="w-4 h-4 text-indigo-600" /> Description
                </h3>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {item.description || "No description provided."}
                </p>
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Recommended action</div>
                  <div className="mt-1 text-sm text-slate-700">{item.recommendedAction}</div>
                </div>
              </Panel>

              <div className="space-y-4">
                <Panel>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Routing</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">Suggested team</div>
                  <div className="text-sm text-slate-600">{item.suggestedTeam}</div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">Current team</div>
                  <div className="text-sm text-slate-600">{teamLabel || "Unassigned"}</div>
                </Panel>
                <Panel>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Workflow</div>
                  <div className="mt-2 text-sm font-semibold text-slate-900">Status</div>
                  <div className="text-sm text-slate-600">{status}</div>
                  <div className="mt-3 text-sm font-semibold text-slate-900">Priority</div>
                  <div className="text-sm text-slate-600">{item.priority}/5 · Estimated {item.estimatedHours}h</div>
                </Panel>
              </div>
            </div>
          )}

          {tab === "signals" && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Panel>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.BrainCircuit className="w-4 h-4 text-indigo-600" /> Analysis signals
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  <li>Severity: {item.severity}</li>
                  <li>Area: {item.area}</li>
                  <li>Confidence: {item.confidenceScore}%</li>
                  <li>Source: {item.analysisSource}</li>
                  <li>Tags: {item.tags.length ? item.tags.join(", ") : "—"}</li>
                </ul>
              </Panel>
              <Panel>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.AlertCircle className="w-4 h-4 text-amber-600" /> Duplicate / missing info
                </h3>
                <div className="mt-3 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                  {duplicateNote}
                </div>
                {item.missingInfo && (
                  <div className="mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                    <div className="font-semibold mb-1">Clarifying message</div>
                    <div>{item.clarifyingMessage}</div>
                  </div>
                )}
              </Panel>
            </div>
          )}

          {tab === "assignment" && (
            <div className="grid lg:grid-cols-2 gap-4">
              <Panel>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.Users className="w-4 h-4 text-indigo-600" /> Assignment
                </h3>
                <div className="mt-3 text-sm text-slate-600">
                  Manager can assign this task to a team. Developer can still propose the best owner.
                </div>
                <label className="mt-4 block text-xs font-semibold uppercase tracking-wider text-slate-500">Team</label>
                <select
                  value={teamLabel}
                  onChange={(e) => onAssign(e.target.value)}
                  disabled={!isManager && item.suggestedTeam !== teamLabel}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none disabled:bg-slate-50"
                >
                  <option value="">Unassigned</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.name}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <div className="mt-4 flex flex-wrap gap-2">
                  {teams.map((team) => (
                    <button
                      key={team.id}
                      onClick={() => onAssign(team.name)}
                      className="rounded-full px-3 py-1.5 text-xs font-semibold border border-slate-200 bg-white hover:border-indigo-300 hover:text-indigo-700 transition"
                    >
                      Assign to {team.name}
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.Workflow className="w-4 h-4 text-indigo-600" /> Status
                </h3>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {["New", "Triaged", "Assigned", "In Progress", "Resolved", "Closed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => onStatusChange(s)}
                      className={`rounded-xl border px-3 py-2 text-xs font-semibold transition ${
                        status === s ? "bg-indigo-600 text-white border-indigo-600" : "bg-white border-slate-200 text-slate-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-4 rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                  Use the status buttons above to move the task through the workflow.
                </div>
              </Panel>
            </div>
          )}

          {tab === "fix" && (
            <div className="grid md:grid-cols-2 gap-4">
              <Panel>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.Sparkles className="w-4 h-4 text-indigo-600" /> Fix recommendations
                </h3>
                <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc pl-5">
                  <li>Confirm the bug with the current team owner first.</li>
                  <li>Keep the confidence score as a guide, not a guarantee.</li>
                  <li>Close duplicates only after one master issue is chosen.</li>
                  <li>Request missing reproduction details before coding if needed.</li>
                </ul>
              </Panel>
              <Panel>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Icons.CheckCircle2 className="w-4 h-4 text-emerald-600" /> Closing guidance
                </h3>
                <p className="mt-3 text-sm text-slate-700 leading-relaxed">
                  When closing, record the root cause, the fix version, and the verification steps. This helps the next
                  team member understand the resolution without needing history storage.
                </p>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/15 px-3 py-1 backdrop-blur border border-white/20">{children}</span>;
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm ${className}`}>{children}</div>;
}
