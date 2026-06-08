import type { AnalysisItem, AnalysisSummary } from "@/lib/triage-utils";

export type WorkspaceState = {
  analysis: AnalysisItem[];
  summary: AnalysisSummary;
  statusMap: Record<string, string>;
  assignmentMap: Record<string, string>;
  role: string;
  updatedAt: number;
};

const KEY = "bt_workspace_state";

export const EMPTY_WORKSPACE: WorkspaceState = {
  analysis: [],
  summary: {
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    duplicates: 0,
    missingInfo: 0,
    averageConfidence: 0,
    topTeams: [],
  },
  statusMap: {},
  assignmentMap: {},
  role: "Manager",
  updatedAt: 0,
};

export function readWorkspace(): WorkspaceState {
  if (typeof window === "undefined") return EMPTY_WORKSPACE;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return EMPTY_WORKSPACE;
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>;
    return {
      analysis: Array.isArray(parsed.analysis) ? parsed.analysis : [],
      summary: parsed.summary || EMPTY_WORKSPACE.summary,
      statusMap: parsed.statusMap || {},
      assignmentMap: parsed.assignmentMap || {},
      role: parsed.role || "Manager",
      updatedAt: parsed.updatedAt || 0,
    };
  } catch {
    return EMPTY_WORKSPACE;
  }
}

export function saveWorkspace(state: WorkspaceState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify({ ...state, updatedAt: Date.now() }));
}

export function clearWorkspace() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
