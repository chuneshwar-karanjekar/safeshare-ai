export type Finding = { type: string; category: "Secret" | "PII" | "Network"; value: string; weight: number };

const RULES: { type: string; category: Finding["category"]; re: RegExp; weight: number }[] = [
  { type: "AWS Access Key", category: "Secret", re: /\bAKIA[0-9A-Z]{16}\b/g, weight: 30 },
  { type: "GitHub Token", category: "Secret", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g, weight: 30 },
  { type: "OpenAI Key", category: "Secret", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g, weight: 30 },
  { type: "Google API Key", category: "Secret", re: /\bAIza[0-9A-Za-z_-]{35}\b/g, weight: 25 },
  { type: "Slack Token", category: "Secret", re: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g, weight: 25 },
  { type: "JWT", category: "Secret", re: /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, weight: 25 },
  { type: "Private Key", category: "Secret", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, weight: 40 },
  { type: "Password", category: "Secret", re: /\b(?:password|passwd|pwd|secret)\s*[:=]\s*\S+/gi, weight: 25 },
  { type: "Email", category: "PII", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, weight: 8 },
  { type: "Phone", category: "PII", re: /(?:\+\d{1,3}[\s-]?)?\b\d{10}\b|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g, weight: 8 },
  { type: "Credit Card", category: "PII", re: /\b(?:\d[ -]?){13,16}\b/g, weight: 25 },
  { type: "Aadhaar", category: "PII", re: /\b\d{4}\s\d{4}\s\d{4}\b/g, weight: 20 },
  { type: "Bank Account", category: "PII", re: /\b\d{9,18}\b/g, weight: 25 },
  { type: "PAN", category: "PII", re: /\b[A-Z]{5}\d{4}[A-Z]\b/g, weight: 15 },
  { type: "Social Handle", category: "PII", re: /\b(?:insta(?:gram)?|fb|facebook|twitter|x|snap(?:chat)?|telegram|tg|reddit|discord|github|linkedin|username|user\s*name|handle|id)\s*(?:is|:|=)?\s*@[A-Za-z0-9._-]{2,}\b|(?<![\w.+-])@[A-Za-z0-9._-]{2,}\b/gi, weight: 10 },
  { type: "Username", category: "PII", re: /\b(?:my\s+)?(?:insta(?:gram)?|fb|facebook|twitter|snap(?:chat)?|telegram|reddit|discord|github|linkedin)?\s*username\s+(?:is\s+)?[A-Za-z0-9._@-]{3,}\b/gi, weight: 10 },
  { type: "IPv4", category: "Network", re: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g, weight: 6 },
];

export function scan(text: string) {
  const findings: Finding[] = [];
  let redacted = text;
  const seen = new Set<string>();
  for (const r of RULES) {
    for (const m of text.matchAll(r.re)) {
      const v = m[0];
      if (seen.has(v)) continue;
      seen.add(v);
      findings.push({ type: r.type, category: r.category, value: v, weight: r.weight });
      redacted = redacted.split(v).join(`[REDACTED_${r.type.toUpperCase().replace(/\s+/g, "_")}]`);
    }
  }
  const score = Math.min(100, findings.reduce((s, f) => s + f.weight, 0));
  return { findings, redacted, score };
}

export function level(score: number) {
  if (score >= 60) return "High";
  if (score >= 25) return "Medium";
  if (score > 0) return "Low";
  return "Clean";
}

export async function ollamaAnalyze(redacted: string, model: string, host: string) {
  const res = await fetch(`${host.replace(/\/$/, "")}/api/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      prompt: `You are a data-leak reviewer. The text below was already regex-redacted. Point out any remaining sensitive context (names, internal hostnames, project codenames, business secrets) and give a 1-line verdict: SAFE or REVIEW. Be brief, bullet points.\n\n---\n${redacted}`,
    }),
  });
  if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
  const j = await res.json();
  return j.response as string;
}
