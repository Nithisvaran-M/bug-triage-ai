// AI service with multi-provider support and heuristic fallback
// Supported providers: openai, anthropic, groq, heuristic (rule-based fallback)
// Configure via env vars: OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY
// If no keys are present, falls back to deterministic heuristic analysis.

export type Severity = "Critical" | "High" | "Medium" | "Low";
export type TriageResult = {
  severity: Severity;
  area: string;
  priority: number; // 1-5
  estimatedHours: number;
  tags: string[];
  isDuplicate: boolean;
  missingInfo: boolean;
  clarifyingMessage: string;
  confidenceScore: number;
  analysisSource: AIProvider;
};

const SEVERITY_KEYWORDS: Record<string, Severity> = {
  crash: "Critical",
  "data loss": "Critical",
  "blue screen": "Critical",
  panic: "Critical",
  corruption: "Critical",
  exploit: "Critical",
  ransomware: "Critical",
  "security breach": "Critical",
  broken: "High",
  failure: "High",
  fail: "High",
  error: "High",
  "cannot login": "High",
  "unable to": "High",
  stuck: "High",
  freeze: "High",
  slow: "Medium",
  performance: "Medium",
  ui: "Medium",
  layout: "Medium",
  styling: "Low",
  typo: "Low",
  cosmetic: "Low",
  suggestion: "Low",
  enhancement: "Low",
};

const AREA_KEYWORDS: Array<{ area: string; keywords: string[] }> = [
  { area: "Frontend / UI", keywords: ["button", "ui", "css", "style", "layout", "render", "react", "dropdown", "modal", "tooltip", "responsive"] },
  { area: "Backend / API", keywords: ["api", "server", "endpoint", "500", "502", "503", "timeout", "database", "query", "node", "backend"] },
  { area: "Authentication", keywords: ["login", "logout", "auth", "password", "token", "jwt", "session", "signup", "register", "otp"] },
  { area: "Database / Storage", keywords: ["database", "db", "postgres", "mysql", "sqlite", "mongo", "query", "migration", "schema", "storage"] },
  { area: "Performance", keywords: ["slow", "performance", "latency", "lag", "memory leak", "cpu", "memory", "optimize"] },
  { area: "Security", keywords: ["security", "xss", "csrf", "injection", "exploit", "vulnerability", "cve", "breach"] },
  { area: "Mobile", keywords: ["ios", "android", "mobile", "phone", "tablet", "touch", "apk"] },
  { area: "Payments", keywords: ["payment", "stripe", "paypal", "billing", "invoice", "charge", "card"] },
  { area: "DevOps / Build", keywords: ["build", "deploy", "ci", "cd", "docker", "pipeline", "webpack", "compile"] },
];

function scoreText(text: string) {
  const lower = text.toLowerCase();
  let sevScore = 0;
  let sev: Severity = "Medium";
  for (const [kw, s] of Object.entries(SEVERITY_KEYWORDS)) {
    if (lower.includes(kw)) {
      sevScore++;
      sev = sevRank(sev) < sevRank(s) ? s : sev;
    }
  }
  if (sevScore === 0) sev = "Low";

  let bestArea = "General";
  let bestAreaCount = 0;
  for (const { area, keywords } of AREA_KEYWORDS) {
    const c = keywords.filter((k) => lower.includes(k)).length;
    if (c > bestAreaCount) {
      bestAreaCount = c;
      bestArea = area;
    }
  }

  const hasSteps = /step|reproduce|how to|1\.\s|2\.\s|click|navigate|go to/i.test(text);
  const hasEnv = /browser|version|os|chrome|firefox|safari|windows|mac|linux/i.test(text);
  const hasExpected = /expected|should|want/i.test(text);
  const missingInfo = !(hasSteps && hasEnv && hasExpected) && text.length < 400;

  const tags: string[] = [];
  if (/crash|broken|fail/i.test(text)) tags.push("needs-investigation");
  if (/ui|layout|style|css/i.test(text)) tags.push("ui-ux");
  if (/slow|performance|latency/i.test(text)) tags.push("performance");
  if (/security|exploit|vulnerab/i.test(text)) tags.push("security");
  if (missingInfo) tags.push("needs-more-info");

  const priority = sev === "Critical" ? 5 : sev === "High" ? 4 : sev === "Medium" ? 3 : 2;
  const estimatedHours = sev === "Critical" ? 16 : sev === "High" ? 8 : sev === "Medium" ? 4 : 2;
  const confidenceScore = clamp(
    30 + sevScore * 10 + bestAreaCount * 8 + (hasSteps ? 12 : 0) + (hasEnv ? 10 : 0) + (hasExpected ? 10 : 0) - (missingInfo ? 15 : 0),
    25,
    98
  );

  return {
    severity: sev,
    area: bestArea,
    priority,
    estimatedHours,
    tags,
    missingInfo,
    sevScore,
    confidenceScore,
    hasSteps,
    hasEnv,
    hasExpected,
  };
}

function sevRank(s: Severity) {
  return s === "Critical" ? 4 : s === "High" ? 3 : s === "Medium" ? 2 : 1;
}

export function heuristicTriage(title: string, description: string): TriageResult {
  const combined = `${title}\n${description}`;
  const r = scoreText(combined);

  let clarifyingMessage = "";
  if (r.missingInfo) {
    const missing: string[] = [];
    if (!/step|reproduce|1\.\s|2\.\s|click/i.test(combined))
      missing.push("step-by-step reproduction steps");
    if (!/browser|version|os|chrome|firefox/i.test(combined))
      missing.push("browser/OS and version");
    if (!/expected|should|want/i.test(combined))
      missing.push("expected vs. actual behavior");
    clarifyingMessage =
      `Hi there — thanks for reporting! To help our team reproduce and fix this quickly, could you share ${missing.join(
        ", "
      )}? A short screen recording or screenshot also helps.`;
  }

  return {
    severity: r.severity,
    area: r.area,
    priority: r.priority,
    estimatedHours: r.estimatedHours,
    tags: r.tags,
    isDuplicate: false,
    missingInfo: r.missingInfo,
    clarifyingMessage,
    confidenceScore: r.confidenceScore,
    analysisSource: "heuristic",
  };
}

// Simple token-based similarity for duplicate detection (no external embeddings needed)
export function similarity(a: string, b: string): number {
  const tokenize = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 2);
  const ta = new Set(tokenize(a));
  const tb = new Set(tokenize(b));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter++;
  });
  const union = ta.size + tb.size - inter;
  return inter / union;
}

export type AIProvider = "openai" | "anthropic" | "groq" | "heuristic";

export type AIKeys = Partial<Record<Exclude<AIProvider, "heuristic">, string>>;

export function detectProvider(): AIProvider {
  if (process.env.OPENAI_API_KEY) return "openai";
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.GROQ_API_KEY) return "groq";
  return "heuristic";
}

function resolveKey(provider: AIProvider, apiKey?: string, keys?: AIKeys): string | undefined {
  if (provider === "heuristic") return undefined;
  return apiKey || keys?.[provider] || process.env[`${provider.toUpperCase()}_API_KEY` as "OPENAI_API_KEY"];
}

async function callOpenAI(prompt: string, key?: string): Promise<string> {
  const apiKey = key || process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OpenAI API key");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(prompt: string, key?: string): Promise<string> {
  const apiKey = key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing Anthropic API key");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-haiku-20240307",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic failed: ${res.status}`);
  const data = await res.json();
  return data.content?.[0]?.text ?? "";
}

async function callGroq(prompt: string, key?: string): Promise<string> {
  const apiKey = key || process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("Missing Groq API key");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Groq failed: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function extractJson(text: string): any {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function callProviderPrompt(provider: AIProvider, prompt: string, apiKey?: string): Promise<string> {
  const key = resolveKey(provider, apiKey);
  if (provider === "openai") return callOpenAI(prompt, key);
  if (provider === "anthropic") return callAnthropic(prompt, key);
  if (provider === "groq") return callGroq(prompt, key);
  return "";
}

export async function aiTriage(
  title: string,
  description: string,
  provider: AIProvider = detectProvider(),
  apiKey?: string
): Promise<{ result: TriageResult; provider: AIProvider }> {
  const prompt = `You are a bug-triage agent. Analyze this bug report and return a single JSON object with keys: severity ("Critical"|"High"|"Medium"|"Low"), area (string short category), priority (1-5 integer), estimatedHours (integer), tags (string[]), missingInfo (boolean), clarifyingMessage (string, empty if not missing), confidenceScore (integer 0-100).

Title: ${title}
Description: ${description || "(no description)"}

Return only JSON.`;

  let raw = "";
  try {
    raw = await callProviderPrompt(provider, prompt, apiKey);
  } catch (e) {
    console.warn("AI call failed, falling back to heuristic:", e);
  }

  if (raw) {
    const parsed = extractJson(raw);
    if (parsed) {
      const sev = ["Critical", "High", "Medium", "Low"].includes(parsed.severity)
        ? (parsed.severity as Severity)
        : "Medium";
        return {
        provider,
        result: {
          severity: sev,
          area: String(parsed.area || "General").slice(0, 80),
          priority: clamp(Number(parsed.priority) || 3, 1, 5),
          estimatedHours: Math.max(1, Number(parsed.estimatedHours) || 4),
          tags: Array.isArray(parsed.tags) ? (parsed.tags as string[]).slice(0, 5) : [],
          isDuplicate: false,
          missingInfo: Boolean(parsed.missingInfo),
          clarifyingMessage: String(parsed.clarifyingMessage || "").slice(0, 600),
          confidenceScore: clamp(Number(parsed.confidenceScore) || 72, 25, 98),
          analysisSource: provider,
        },
      };
    }
  }

  return { provider: "heuristic", result: heuristicTriage(title, description) };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export type RunChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export async function aiRunChat(
  context: string,
  question: string,
  provider: AIProvider = detectProvider(),
  apiKey?: string
): Promise<{ answer: string; provider: AIProvider }> {
  const prompt = `You are an expert bug triage assistant embedded in a dashboard.
Use the run context below to answer the user's question clearly, helpfully, and concisely.
If the user asks for recommendations, provide actionable next steps.
If you do not know something from the context, say what is missing.

RUN CONTEXT:
${context}

USER QUESTION:
${question}

Answer in plain text. Use bullet points when useful.`;

  try {
    const raw = await callProviderPrompt(provider, prompt, apiKey);
    if (raw.trim()) return { answer: raw.trim(), provider };
  } catch (e) {
    console.warn("Chat AI failed, using heuristic reply:", e);
  }

  const lower = question.toLowerCase();
  if (lower.includes("summary") || lower.includes("overview")) {
    return {
      provider: "heuristic",
      answer:
        "This run contains a mixture of severities. Focus first on Critical and High bugs, then resolve duplicates and request missing information for unclear reports.",
    };
  }
  if (lower.includes("duplicate")) {
    return {
      provider: "heuristic",
      answer:
        "Look for title/description overlap, repeated steps, and matching areas. Start by closing lower-confidence duplicates and keep one master issue for the group.",
    };
  }
  if (lower.includes("missing") || lower.includes("info")) {
    return {
      provider: "heuristic",
      answer:
        "Ask for reproduction steps, browser/OS version, expected vs actual behavior, and screenshots or a short recording to reduce back-and-forth.",
    };
  }
  return {
    provider: "heuristic",
    answer:
      "I can help with severity, assignment, duplicates, missing info, and close recommendations. Ask about the run summary, a specific bug, or the next best action.",
  };
}
