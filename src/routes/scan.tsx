import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { scan, level, ollamaAnalyze } from "@/lib/scanner";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Scanner — SafeShare AI" },
      { name: "description", content: "Scan and redact secrets and PII locally, then review with Gemma or Qwen via Ollama." },
      { property: "og:title", content: "Scanner — SafeShare AI" },
      { property: "og:description", content: "Local secret and PII redaction with on-device AI review." },
    ],
  }),
  component: Scan,
});

const SAMPLE = `Hi team, deploy creds below:
AWS key AKIAIOSFODNN7EXAMPLE
password = hunter2!
Contact ravi.k@acme-internal.com or +91 9876543210
DB at 10.0.12.45, card 4111 1111 1111 1111`;

function Scan() {
  const [text, setText] = useState(SAMPLE);
  const [model, setModel] = useState("gemma3");
  const [host, setHost] = useState("http://localhost:11434");
  const [ai, setAi] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [approved, setApproved] = useState(false);
  const [copied, setCopied] = useState(false);
  const r = useMemo(() => scan(text), [text]);
  const lv = level(r.score);

  const runAi = async () => {
    setBusy(true); setErr(""); setAi("");
    try { setAi(await ollamaAnalyze(r.redacted, model, host)); }
    catch (e) { setErr(`Could not reach Ollama at ${host}. Run: OLLAMA_ORIGINS="*" ollama serve, then ollama pull ${model}. (${(e as Error).message})`); }
    finally { setBusy(false); }
  };

  return (
    <main className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-8">
        <Link to="/" className="font-display text-xl font-bold">Safe<span className="text-primary">Share</span> AI</Link>
        <Link to="/chat" className="btn-primary text-xs">Safe Chat →</Link>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <section className="panel">
          <h2 className="label">01 · Input</h2>
          <textarea value={text} onChange={(e) => { setText(e.target.value); setApproved(false); }}
            className="w-full h-72 bg-background border rounded-md p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <h2 className="label mt-6">02 · Findings ({r.findings.length})</h2>
          <ul className="space-y-1 max-h-56 overflow-auto font-mono text-xs">
            {r.findings.length === 0 && <li className="text-muted-foreground">Nothing sensitive detected.</li>}
            {r.findings.map((f, i) => (
              <li key={i} className="flex gap-2 items-center">
                <span className="chip">{f.category}</span>
                <span className="text-foreground">{f.type}</span>
                <span className="text-muted-foreground truncate">{f.value}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="flex items-center justify-between">
            <h2 className="label">03 · Risk score</h2>
            <span className={`risk risk-${lv.toLowerCase()}`}>{lv}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-6">
            <div className="h-full bg-primary transition-all" style={{ width: `${r.score}%` }} />
          </div>
          <h2 className="label">04 · Redacted output</h2>
          <pre className="bg-background border rounded-md p-3 font-mono text-sm whitespace-pre-wrap h-40 overflow-auto">{r.redacted}</pre>

          <h2 className="label mt-6">05 · Local AI review (Ollama)</h2>
          <div className="flex gap-2 mb-2">
            <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
              <option value="gemma3">gemma3</option><option value="qwen3">qwen3</option>
              <option value="gemma3:1b">gemma3:1b</option><option value="qwen3:1.7b">qwen3:1.7b</option>
            </select>
            <input value={host} onChange={(e) => setHost(e.target.value)} className="input flex-1" />
            <button onClick={runAi} disabled={busy} className="btn-primary">{busy ? "Thinking…" : "Analyze"}</button>
          </div>
          {err && <p className="text-destructive text-xs font-mono">{err}</p>}
          {ai && <pre className="bg-background border rounded-md p-3 text-sm whitespace-pre-wrap max-h-48 overflow-auto">{ai}</pre>}

          <h2 className="label mt-6">06 · Human review</h2>
          <label className="flex items-center gap-2 text-sm mb-3">
            <input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} />
            I reviewed the redacted text and it's safe to share.
          </label>
          <button disabled={!approved} className="btn-primary w-full"
            onClick={async () => { await navigator.clipboard.writeText(r.redacted); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
            {copied ? "Copied ✓" : "SAFE COPY"}
          </button>
        </section>
      </div>
    </main>
  );
}
