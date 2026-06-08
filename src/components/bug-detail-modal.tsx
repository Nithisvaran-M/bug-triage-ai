"use client";

import { useEffect, useState } from "react";
import { Icons } from "./icons";
import type { Bug, Comment, ActivityLog, Team } from "@/types/models";

type Props = {
  bug: Bug;
  teams: Team[];
  actorName: string;
  actorRole: "Manager" | "Developer";
  onClose: () => void;
  onUpdated: () => void;
};

const STATUSES = ["New", "Triaged", "Assigned", "In Progress", "Resolved", "Closed"];
const SEVERITIES = ["Critical", "High", "Medium", "Low"];

const SEVERITY_STYLES: Record<string, string> = {
  Critical: "bg-red-100 text-red-700 border-red-200",
  High: "bg-orange-100 text-orange-700 border-orange-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Low: "bg-emerald-100 text-emerald-700 border-emerald-200",
};

export default function BugDetailModal({
  bug,
  teams,
  actorName,
  actorRole,
  onClose,
  onUpdated,
}: Props) {
  const [activity, setActivity] = useState<ActivityLog[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [tab, setTab] = useState<"overview" | "activity" | "comments" | "actions">("overview");
  const [newComment, setNewComment] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentBug, setCurrentBug] = useState<Bug>(bug);
  const [toast, setToast] = useState<string>("");
  const visibleTabs =
    actorRole === "Manager" ? (["overview", "actions"] as const) : (["overview", "actions", "comments", "activity"] as const);
  const showSensitiveDetails = actorRole === "Developer";

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/bugs/${bug.id}?role=${actorRole}`);
      const data = await res.json();
      if (data.bug) setCurrentBug(data.bug);
      if (data.activity) setActivity(data.activity);
      if (data.comments) setComments(data.comments);
    })();
  }, [bug.id]);

  async function patchBug(updates: Record<string, any>) {
    setBusy(true);
    try {
      const res = await fetch(`/api/bugs/${bug.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ actor: `${actorName} (${actorRole})`, role: actorRole, ...updates }),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setCurrentBug(updated);
      setToast("Updated");
      setTimeout(() => setToast(""), 1500);
      onUpdated();
      // refresh activity
      const res2 = await fetch(`/api/bugs/${bug.id}`);
      const d = await res2.json();
      if (d.activity) setActivity(d.activity);
      if (d.comments) setComments(d.comments);
    } finally {
      setBusy(false);
    }
  }

  async function postComment() {
    if (!newComment.trim()) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/bugs/${bug.id}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          author: actorName,
          role: actorRole,
          content: newComment,
          isInternal,
        }),
      });
      const c = await res.json();
      setComments((prev) => [c, ...prev]);
      setNewComment("");
      setToast("Comment added");
      setTimeout(() => setToast(""), 1500);
    } finally {
      setBusy(false);
    }
  }

  async function closeBug() {
    if (!closeReason.trim()) {
      setToast("Please enter a close reason");
      setTimeout(() => setToast(""), 1500);
      return;
    }
    await patchBug({ status: "Closed", closeReason });
    setCloseReason("");
  }

  const b = currentBug;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/50 backdrop-blur-sm animate-float-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden rounded-3xl bg-white card-shadow flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-white">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-100 px-2 py-1 rounded-full">
                #{b.id}
              </span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${SEVERITY_STYLES[b.severity]}`}>
                {b.severity}
              </span>
              <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-full">
                {b.status}
              </span>
              {b.isDuplicate && (
                <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded-full">
                  Possible Duplicate
                </span>
              )}
              {b.missingInfo && (
                <span className="text-xs font-semibold text-amber-700 bg-amber-100 px-2 py-1 rounded-full">
                  Needs Info
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{b.title}</h2>
            <p className="text-xs text-slate-500 mt-1">
              Area: <span className="font-medium text-slate-700">{b.area}</span> · Priority{" "}
              <span className="font-medium text-slate-700">{b.priority}/5</span> · Est.{" "}
              <span className="font-medium text-slate-700">{b.estimatedHours}h</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 shrink-0"
            aria-label="Close"
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 px-4 sm:px-6 pt-3 border-b border-slate-200 overflow-x-auto scrollbar-thin">
          {visibleTabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 sm:px-4 py-2 text-sm font-medium capitalize whitespace-nowrap border-b-2 transition ${
                tab === t
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto scrollbar-thin p-4 sm:p-6">
          {tab === "overview" && (
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icons.FileText className="w-4 h-4 text-indigo-600" /> Description
                  </h3>
                  {showSensitiveDetails ? (
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {b.description || "(no description provided)"}
                    </p>
                  ) : (
                    <div className="text-sm text-slate-600 rounded-xl bg-slate-50 border border-slate-200 p-3">
                      Manager view keeps this condensed. Open the developer view to read the full repro details, AI analysis, and supporting notes.
                    </div>
                  )}
                </div>

                {showSensitiveDetails && b.clarifyingMessage && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="text-sm font-semibold text-amber-900 mb-2 flex items-center gap-2">
                      <Icons.Sparkles className="w-4 h-4 text-amber-700" /> AI-Generated Clarifying Message
                    </h3>
                    <p className="text-sm text-amber-900 leading-relaxed">{b.clarifyingMessage}</p>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(b.clarifyingMessage || "");
                        setToast("Copied to clipboard");
                        setTimeout(() => setToast(""), 1500);
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-800 hover:text-amber-900"
                    >
                      <Icons.Copy className="w-3.5 h-3.5" /> Copy message
                    </button>
                  </div>
                )}

                {b.closeReason && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <h3 className="text-sm font-semibold text-emerald-900 mb-1 flex items-center gap-2">
                      <Icons.CheckCircle2 className="w-4 h-4" /> Close Reason
                    </h3>
                    <p className="text-sm text-emerald-900">{b.closeReason}</p>
                  </div>
                )}

                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                    <Icons.Tag className="w-4 h-4 text-indigo-600" /> Tags
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {(b.tags as unknown as string[] | null)?.length ? (
                      (b.tags as unknown as string[]).map((t) => (
                        <span key={t} className="text-xs font-medium bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full border border-indigo-100">
                          #{t}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">No tags</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Current Assignment</h3>
                  <div className="text-sm">
                    <div className="text-slate-500">Team</div>
                    <div className="font-semibold text-slate-900">{b.assigneeType || "—"}</div>
                    <div className="text-slate-500 mt-2">Assignee</div>
                    <div className="font-semibold text-slate-900">{b.assigneeName || "—"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Analysis Quality</h3>
                  <div className="text-sm">
                    <div className="text-slate-500">Confidence</div>
                    <div className="font-semibold text-slate-900">{b.confidenceScore ?? 0}%</div>
                    <div className="text-slate-500 mt-2">Source</div>
                    <div className="font-semibold text-slate-900">{b.analysisSource || "heuristic"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Duplicate Info</h3>
                  <div className="text-sm">
                    <div className="text-slate-500">Flagged</div>
                    <div className="font-semibold text-slate-900">{b.isDuplicate ? "Yes" : "No"}</div>
                    <div className="text-slate-500 mt-2">Group</div>
                    <div className="font-semibold text-slate-900">{b.duplicateGroup ?? "—"}</div>
                    <div className="text-slate-500 mt-2">Master bug</div>
                    <div className="font-semibold text-slate-900">{b.duplicateOfId ? `#${b.duplicateOfId}` : "—"}</div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3">Timestamps</h3>
                  <div className="text-sm text-slate-600 space-y-1">
                    <div>Created: {b.createdAt ? new Date(b.createdAt).toLocaleString() : "—"}</div>
                    <div>Updated: {b.updatedAt ? new Date(b.updatedAt).toLocaleString() : "—"}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "actions" && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Icons.Workflow className="w-4 h-4 text-indigo-600" /> Change Status
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      disabled={busy}
                      onClick={() => patchBug({ status: s })}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                        b.status === s
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-4">
                  <Icons.Sparkles className="w-4 h-4 text-indigo-600" />
                  <span className="text-xs text-slate-600">Tip: Manager role can assign & close. Developers update status.</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Icons.Users className="w-4 h-4 text-indigo-600" /> Assign to Team
                </h3>
                <label className="text-xs text-slate-500">Team</label>
                <select
                  value={b.assigneeType || ""}
                  onChange={(e) => patchBug({ assigneeType: e.target.value })}
                  className="w-full mt-1 mb-3 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">— Unassigned —</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <label className="text-xs text-slate-500">Assignee name (optional)</label>
                <input
                  defaultValue={b.assigneeName || ""}
                  onBlur={(e) => patchBug({ assigneeName: e.target.value })}
                  placeholder="e.g., Alex Johnson"
                  className="w-full mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                  <Icons.AlertTriangle className="w-4 h-4 text-indigo-600" /> Severity & Priority
                </h3>
                <div className="flex flex-wrap gap-2 mb-3">
                  {SEVERITIES.map((s) => (
                    <button
                      key={s}
                      disabled={busy}
                      onClick={() => patchBug({ severity: s })}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition ${
                        b.severity === s
                          ? "bg-slate-900 text-white border-slate-900"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <label className="text-xs text-slate-500">Priority ({b.priority}/5)</label>
                <input
                  type="range"
                  min={1}
                  max={5}
                  value={b.priority}
                  onChange={(e) => patchBug({ priority: Number(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4">
                <h3 className="text-sm font-semibold text-emerald-900 mb-3 flex items-center gap-2">
                  <Icons.CheckCircle2 className="w-4 h-4" /> Close Bug
                </h3>
                <textarea
                  value={closeReason}
                  onChange={(e) => setCloseReason(e.target.value)}
                  placeholder="Resolution summary / reason for closing"
                  rows={3}
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
                <button
                  onClick={closeBug}
                  disabled={busy}
                  className="mt-3 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                >
                  <Icons.CheckCircle2 className="w-4 h-4" /> Mark as Closed
                </button>
              </div>
            </div>
          )}

          {tab === "comments" && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-4 bg-white">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Add Comment</h3>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share analysis, findings, or questions..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600">
                    <input
                      type="checkbox"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Internal note (not visible to reporter)
                  </label>
                  <button
                    onClick={postComment}
                    disabled={busy || !newComment.trim()}
                    className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
                  >
                    <Icons.Send className="w-4 h-4" /> Post
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {comments.length === 0 && (
                  <div className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                    No comments yet.
                  </div>
                )}
                {comments.map((c) => (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-4 ${
                      c.isInternal ? "bg-amber-50 border-amber-200" : "bg-white border-slate-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-900">{c.author}</span>
                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          {c.role}
                        </span>
                        {c.isInternal && (
                          <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                            Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-slate-500">
                        {new Date(c.createdAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{c.content}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === "activity" && (
            <div className="relative pl-6">
              <div className="absolute left-2 top-2 bottom-2 w-px bg-slate-200" />
              {activity.length === 0 && (
                <div className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 p-6 text-center">
                  No activity yet.
                </div>
              )}
              {activity.map((a) => (
                <div key={a.id} className="relative mb-4">
                  <div className="absolute -left-[18px] top-1.5 w-3 h-3 rounded-full bg-indigo-500 ring-4 ring-indigo-100" />
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-semibold text-slate-800">{a.actor}</span>
                    <span>· {a.action}</span>
                    <span>· {new Date(a.createdAt).toLocaleString()}</span>
                  </div>
                  {a.detail && <p className="text-sm text-slate-700 mt-0.5">{a.detail}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {toast && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-sm px-4 py-2 rounded-full shadow-lg animate-float-in">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
