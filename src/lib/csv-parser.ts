import Papa from "papaparse";

export type RawBugRow = {
  id?: string;
  title?: string;
  description?: string;
  summary?: string;
  details?: string;
  severity?: string;
  area?: string;
  priority?: string;
  status?: string;
  reporter?: string;
  environment?: string;
  expected?: string;
  actual?: string;
  steps?: string;
  [k: string]: any;
};

const HEADER_HINTS = /(^|\b)(id|title|summary|subject|description|details|steps|expected|actual|severity|priority|status|area|component|environment|browser|os)(\b|$)/i;
const SEVERITIES = new Set(["critical", "high", "medium", "low"]);

export function parseBugCsv(text: string): RawBugRow[] {
  const normalized = text.trim().replace(/\r\n/g, "\n");
  if (!normalized) return [];

  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const firstLine = lines[0];
  const firstCells = parseCells(firstLine);

  // If it looks like a header row, parse as CSV with headers.
  if (looksLikeHeader(firstLine, firstCells)) {
    const parsed = Papa.parse<Record<string, string>>(normalized, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    }) as unknown as { data: Record<string, string>[] };

    return (parsed.data || [])
      .map((row) => normalizeRow(row))
      .filter((row) => hasMeaningfulContent(row));
  }

  // Otherwise parse as raw CSV rows without headers.
  if (lines.length > 1 || firstLine.includes(",") || firstLine.includes("\t")) {
    const parsed = Papa.parse<string[]>(normalized, {
      header: false,
      skipEmptyLines: true,
      dynamicTyping: false,
    }) as unknown as { data: string[][] };

    const rows = (parsed.data || [])
      .map((cells) => inferRowFromCells(cells))
      .filter((row) => hasMeaningfulContent(row));

    if (rows.length > 0) return rows;
  }

  // Final fallback: plain text report, one item.
  return [inferRowFromPlainText(normalized)];
}

function looksLikeHeader(line: string, cells: string[]) {
  const lowered = line.toLowerCase();
  if (HEADER_HINTS.test(lowered)) return true;

  const headerScore = cells.reduce((score, cell) => {
    const normalized = cell.trim().toLowerCase();
    if (["id", "title", "summary", "subject", "description", "details", "steps", "expected", "actual", "severity", "priority", "status", "area", "component", "environment"].includes(normalized)) {
      return score + 1;
    }
    return score;
  }, 0);

  return headerScore >= Math.max(2, Math.ceil(cells.length / 3));
}

function parseCells(line: string) {
  const parsed = Papa.parse<string>(line, {
    header: false,
    skipEmptyLines: true,
    dynamicTyping: false,
  }) as unknown as { data: string[][] };
  return parsed.data?.[0] || [line];
}

function normalizeRow(row: Record<string, string>): RawBugRow {
  const r: RawBugRow = { ...row };
  r.id = firstDefined(row, ["id", "ID", "bug_id", "Bug ID", "ticket", "Ticket", "issue_id"]);
  r.title = firstDefined(row, ["title", "Title", "summary", "Summary", "subject", "Subject", "Issue Title", "issue_title"]);
  r.description = firstDefined(row, ["description", "Description", "details", "Details", "body", "Body", "report", "Report"]);
  r.severity = firstDefined(row, ["severity", "Severity"]) || inferSeverityFromText(Object.values(row).join(" "));
  r.area = firstDefined(row, ["area", "Area", "component", "Component", "module", "Module"]);
  r.priority = firstDefined(row, ["priority", "Priority"]);
  r.status = firstDefined(row, ["status", "Status"]);
  r.environment = firstDefined(row, ["environment", "Environment", "browser", "Browser", "os", "OS"]);
  r.expected = firstDefined(row, ["expected", "Expected", "expected result", "Expected Result"]);
  r.actual = firstDefined(row, ["actual", "Actual", "actual result", "Actual Result"]);
  r.steps = firstDefined(row, ["steps", "Steps", "reproduction steps", "Reproduction Steps"]);
  r.reporter = firstDefined(row, ["reporter", "Reporter", "author", "Author"]);

  // Fill description if only step fields exist.
  if (!r.description) {
    r.description = [r.environment, r.steps, r.expected, r.actual, r.status].filter(Boolean).join(" | ");
  }

  if (!r.title) {
    r.title = r.summary || r.description || "Bug report";
  }

  return r;
}

function inferRowFromCells(cells: string[]): RawBugRow {
  const cleaned = cells.map((cell) => String(cell ?? "").trim()).filter((cell, index, arr) => !(cell === "" && arr.length === 1));
  const row: RawBugRow = {};
  if (cleaned.length === 0) return row;

  const first = cleaned[0] || "";
  const second = cleaned[1] || "";
  const firstLooksLikeId = looksLikeIssueId(first);
  const firstLooksLikeTitle = looksLikeSentence(first);
  const secondLooksLikeTitle = looksLikeSentence(second);

  if (firstLooksLikeId && cleaned.length > 1) {
    row.id = first;
    row.title = second || first;
    row.description = cleaned.slice(2).join(" | ");
  } else if (!firstLooksLikeTitle && secondLooksLikeTitle) {
    row.id = first;
    row.title = second;
    row.description = cleaned.slice(2).join(" | ");
  } else {
    row.title = first;
    row.description = cleaned.slice(1).join(" | ");
  }

  const severity = cleaned.find((cell) => SEVERITIES.has(cell.toLowerCase()));
  row.severity = severity || inferSeverityFromText(cleaned.join(" "));

  row.priority = cleaned.find((cell) => /^p(?:riority)?\s*[:=]?\s*[1-5]$/i.test(cell) || /^[1-5]$/.test(cell));
  row.status = cleaned.find((cell) => /^(new|triaged|assigned|in progress|resolved|closed|open)$/i.test(cell));

  const areaCandidates = cleaned.filter((cell) => /frontend|backend|ui|ux|api|auth|security|devops|performance|database|mobile|payment|checkout|build|deploy|qa|testing/i.test(cell));
  row.area = areaCandidates[0] || inferAreaFromText(cleaned.join(" "));

  const envCandidate = cleaned.find((cell) => /android|ios|windows|mac|linux|chrome|firefox|safari|edge|version|app version|browser/i.test(cell));
  row.environment = envCandidate;

  const stepsCandidate = cleaned.find((cell) => /step|click|tap|reproduce|open|navigate/i.test(cell));
  row.steps = stepsCandidate;

  const expectedCandidate = cleaned.find((cell) => /expected|should|want|confirm/i.test(cell));
  row.expected = expectedCandidate;

  const actualCandidate = cleaned.find((cell) => /actual|crash|freeze|error|fail|hang|broken/i.test(cell));
  row.actual = actualCandidate;

  // Preserve the original row as an extra field for debugging or export.
  row.raw = cleaned;

  if (!row.description) {
    row.description = [row.environment, row.steps, row.expected, row.actual, row.status].filter(Boolean).join(" | ");
  }

  if (!row.title) {
    row.title = row.description || "Bug report";
  }

  return row;
}

function inferRowFromPlainText(text: string): RawBugRow {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const title = lines[0] || "Bug report";
  return {
    title,
    description: lines.slice(1).join(" | ") || title,
    severity: inferSeverityFromText(text),
    area: inferAreaFromText(text),
    raw: lines,
  };
}

function inferSeverityFromText(text: string): string {
  const lowered = text.toLowerCase();
  if (/\bcritical\b|crash|data loss|security breach|exploit|vulnerability|panic|corruption/.test(lowered)) return "Critical";
  if (/\bhigh\b|error|fail|broken|cannot|unable|freeze|hang/.test(lowered)) return "High";
  if (/\bmedium\b|slow|performance|lag|ui|layout/.test(lowered)) return "Medium";
  return "Low";
}

function inferAreaFromText(text: string): string {
  const lowered = text.toLowerCase();
  if (/frontend|ui|layout|button|responsive|css|render/.test(lowered)) return "Frontend / UI";
  if (/backend|api|server|endpoint|query|database|db/.test(lowered)) return "Backend / API";
  if (/auth|login|password|session|token|register/.test(lowered)) return "Authentication";
  if (/security|xss|csrf|exploit|vulnerability/.test(lowered)) return "Security";
  if (/mobile|ios|android|phone|tablet/.test(lowered)) return "Mobile";
  if (/deploy|build|ci|cd|docker|pipeline/.test(lowered)) return "DevOps / Build";
  if (/payment|billing|checkout|invoice/.test(lowered)) return "Payments";
  if (/performance|slow|latency|lag/.test(lowered)) return "Performance";
  return "General";
}

function looksLikeIssueId(value: string) {
  return /^(bug[-_ ]?\d+|issue[-_ ]?\d+|[a-z]{1,8}-\d+)$/i.test(value) || /^\d+$/.test(value);
}

function looksLikeSentence(value: string) {
  return /\s/.test(value) && value.length > 8;
}

function firstDefined(row: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    const direct = row[key];
    if (direct && String(direct).trim()) return String(direct).trim();
    const match = Object.entries(row).find(([entryKey]) => entryKey.toLowerCase() === key.toLowerCase());
    if (match?.[1] && String(match[1]).trim()) return String(match[1]).trim();
  }
  return "";
}

function hasMeaningfulContent(row: RawBugRow) {
  return Boolean(row.title || row.description || row.severity || row.area || row.status || row.environment || row.steps);
}

export function sampleCsvText(): string {
  const rows = [
    "title,description,severity,area",
    "Login button crashes on mobile iOS 17,Clicking login in Safari on iPhone 14 causes a white screen crash. No error messages shown.,Critical,Authentication",
    "Payment page hangs on submit,User reports that after clicking Pay Now the spinner runs forever and no confirmation is shown. Happens in Chrome on Windows 11.,High,Payments",
    "Dashboard slow to load with 100+ items,Dashboard takes 6 seconds to render when the account has more than 100 items. Profiler shows repeated re-renders.,Medium,Performance",
    "Minor typo on pricing page,\"Subscribe\" button shows \"Subscibe\" on pricing page. Cosmetic issue only.,Low,Frontend / UI",
    "Cannot reset password,Reset password link in email leads to 404 page. Affects all users trying to recover accounts.,High,Authentication",
    "Search returns duplicate results,Typing a query in the top search bar returns the same item 2-3 times. Seems related to pagination.,Medium,Backend / API",
    "Data not saving on profile edit,After editing user profile and clicking Save, changes disappear on refresh. Browser console shows 500 error.,Critical,Backend / API",
    "XSS vulnerability in comment box,User can inject script tags in public comment fields which execute for other viewers.,Critical,Security",
  ];
  return rows.join("\n");
}
