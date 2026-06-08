export interface Run {
  id: number;
  name: string;
  totalBugs: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  duplicateCount: number;
  missingInfoCount: number;
  assignedCount: number;
  closedCount: number;
  averageConfidence: number;
  aiProvider?: string | null;
  createdAt: string | Date;
}

export interface Bug {
  id: number;
  runId: number;
  title: string;
  description: string;
  severity: "Critical" | "High" | "Medium" | "Low" | string;
  area: string;
  priority: number;
  estimatedHours: number;
  status: string;
  assigneeType?: string | null;
  assigneeName?: string | null;
  isDuplicate: boolean;
  duplicateOfId?: number | null;
  duplicateGroup?: string | null;
  missingInfo: boolean;
  clarifyingMessage?: string | null;
  confidenceScore: number;
  analysisSource?: string | null;
  closeReason?: string | null;
  tags?: string[] | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Team {
  id: number;
  name: string;
  description: string;
  color: string;
  memberCount: number;
  createdAt?: string | Date;
}

export interface Comment {
  id: number;
  bugId: number;
  author: string;
  role: string;
  content: string;
  isInternal: boolean;
  createdAt: string | Date;
}

export interface ActivityLog {
  id: number;
  bugId: number;
  actor: string;
  action: string;
  detail?: string | null;
  createdAt: string | Date;
}
