import { similarity } from "./ai-service";

export type AnalysisItem = {
  id: string;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low";
  area: string;
  priority: number;
  estimatedHours: number;
  tags: string[];
  missingInfo: boolean;
  clarifyingMessage: string;
  confidenceScore: number;
  analysisSource: string;
  suggestedTeam: string;
  duplicateGroup?: number;
  duplicateOfId?: string | null;
  isDuplicate: boolean;
  recommendedAction: string;
};

export type AnalysisSummary = {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  duplicates: number;
  missingInfo: number;
  averageConfidence: number;
  topTeams: Array<{ team: string; count: number }>;
};

export const DEFAULT_TEAMS = [
  { name: "Frontend", color: "#6366f1", description: "UI, responsive layouts, client-side bugs", memberCount: 4 },
  { name: "Backend", color: "#10b981", description: "APIs, server logic, database and integrations", memberCount: 5 },
  { name: "QA / Testing", color: "#f59e0b", description: "Reproduction, test cases, verification", memberCount: 3 },
  { name: "DevOps", color: "#ef4444", description: "Builds, deployments, CI/CD, infra", memberCount: 3 },
  { name: "Security", color: "#8b5cf6", description: "Vulnerability triage and hardening", memberCount: 2 },
  { name: "Product", color: "#06b6d4", description: "Scope, UX, prioritization, follow-up", memberCount: 2 },
] as const;

const AREA_TEAM_MAP: Array<{ match: RegExp; team: string }> = [
  { match: /ui|frontend|css|layout|button|responsive|render/i, team: "Frontend" },
  { match: /api|backend|server|database|db|query|endpoint/i, team: "Backend" },
  { match: /test|qa|reproduce|repro|steps|verification/i, team: "QA / Testing" },
  { match: /deploy|build|ci|cd|docker|pipeline|release/i, team: "DevOps" },
  { match: /security|xss|csrf|exploit|vulnerab|auth/i, team: "Security" },
  { match: /billing|product|ux|flow|feature|scope|priority/i, team: "Product" },
];

export function suggestTeam(area: string, title: string, severity: string) {
  const haystack = `${area} ${title} ${severity}`;
  const found = AREA_TEAM_MAP.find((m) => m.match.test(haystack));
  return found?.team || "Backend";
}

export function buildDuplicateGroups(items: AnalysisItem[]) {
  const groups: number[][] = [];
  const groupOf: Record<number, number> = {};
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const a = `${items[i].title} ${items[i].description}`;
      const b = `${items[j].title} ${items[j].description}`;
      const sim = similarity(a, b);
      if (sim >= 0.54) {
        const gi = groupOf[i];
        const gj = groupOf[j];
        if (gi == null && gj == null) {
          const idx = groups.length;
          groups.push([i, j]);
          groupOf[i] = idx;
          groupOf[j] = idx;
        } else if (gi != null && gj == null) {
          groups[gi].push(j);
          groupOf[j] = gi;
        } else if (gj != null && gi == null) {
          groups[gj].push(i);
          groupOf[i] = gj;
        } else if (gi !== gj) {
          const merged = [...groups[gi], ...groups[gj]];
          groups[gi] = merged;
          merged.forEach((k) => (groupOf[k] = gi));
          groups[gj] = [];
        }
      }
    }
  }

  groups.forEach((group, idx) => {
    if (group.length < 2) return;
    const masterIdx = group[0];
    group.forEach((itemIdx, pos) => {
      items[itemIdx].duplicateGroup = idx;
      items[itemIdx].duplicateOfId = pos === 0 ? null : items[masterIdx].id;
      items[itemIdx].isDuplicate = pos > 0;
    });
  });

  return { groups, groupOf };
}

export function summarizeAnalysis(items: AnalysisItem[]): AnalysisSummary {
  const counts = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  const teamCounts = new Map<string, number>();
  let dupes = 0;
  let missingInfo = 0;
  let confidenceTotal = 0;

  for (const item of items) {
    counts[item.severity]++;
    teamCounts.set(item.suggestedTeam, (teamCounts.get(item.suggestedTeam) || 0) + 1);
    if (item.isDuplicate) dupes++;
    if (item.missingInfo) missingInfo++;
    confidenceTotal += item.confidenceScore || 0;
  }

  const topTeams = [...teamCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([team, count]) => ({ team, count }));

  return {
    total: items.length,
    critical: counts.Critical,
    high: counts.High,
    medium: counts.Medium,
    low: counts.Low,
    duplicates: dupes,
    missingInfo,
    averageConfidence: items.length ? Math.round(confidenceTotal / items.length) : 0,
    topTeams,
  };
}

export function buildChatContext(
  items: AnalysisItem[],
  summary: AnalysisSummary,
  role: string,
  assignments: Record<string, string> = {}
) {
  const top = items.slice(0, 12).map((item) => {
    const assigned = assignments[item.id] || item.suggestedTeam || "Unassigned";
    return `- ${item.id} ${item.title} | ${item.severity} | ${item.area} | assigned:${assigned} | confidence:${item.confidenceScore}% | duplicate:${item.isDuplicate ? "yes" : "no"} | missing:${item.missingInfo ? "yes" : "no"}`;
  });

  return [
    `Role: ${role}`,
    `Total: ${summary.total}`,
    `Critical: ${summary.critical}, High: ${summary.high}, Medium: ${summary.medium}, Low: ${summary.low}`,
    `Duplicates: ${summary.duplicates}`,
    `Missing info: ${summary.missingInfo}`,
    `Average confidence: ${summary.averageConfidence}%`,
    `Team counts: ${summary.topTeams.map((t) => `${t.team}=${t.count}`).join(", ")}`,
    `Top bugs:\n${top.join("\n")}`,
  ].join("\n");
}
