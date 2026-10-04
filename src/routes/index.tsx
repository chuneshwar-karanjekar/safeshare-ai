import { createFileRoute, Link } from "@tanstack/react-router";
import { SafeChat } from "@/components/SafeChat";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SafeShare AI — Redact before you share" },
      { name: "description", content: "Detect secrets and PII, redact, and review with a local Gemma or Qwen model. Your data never leaves your machine." },
      { property: "og:title", content: "SafeShare AI — Redact before you share" },
      { property: "og:description", content: "Local secret & PII scanner with on-device AI review via Ollama." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const STEPS = ["User input", "Local security scanner", "Redaction", "Local LLM · Gemma / Qwen", "Contextual analysis", "Risk scoring", "Human review", "SAFE COPY"];

function Index() {
  return (
    <main className="min-h-screen">
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12">
        <p className="font-mono text-xs text-primary mb-4">// mode 1 · safe chat</p>
        <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.02] max-w-4xl">
          Chat freely.<br />We strip the <span className="text-primary">sensitive</span> parts.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Safe Chat is below — type away and passwords, keys, emails, phone numbers and card numbers are removed
          automatically before your local Gemma or Qwen model ever sees them.
        </p>
        <div className="mt-8 flex gap-3">
          <a href="#safe-chat" className="btn-primary">Start Safe Chat ↓</a>
          <Link to="/scan" className="btn-ghost">Open scanner →</Link>
        </div>
      </section>

      <section id="safe-chat" className="max-w-7xl mx-auto px-6 pb-16">
        <h2 className="font-display text-3xl font-bold mb-2">Safe Chat</h2>
        <p className="text-muted-foreground text-sm mb-6 font-mono">Redaction happens right here in your browser — nothing sensitive is ever sent.</p>
        <SafeChat />
      </section>

      <section id="how" className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-2 gap-12">
        <div>
          <h2 className="font-display text-3xl font-bold mb-4">The pipeline</h2>
          <ol className="space-y-2 font-mono text-sm">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3 panel py-3">
                <span className="text-primary">{String(i + 1).padStart(2, "0")}</span>{s}
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-6">
          {[
            ["Regex scanner", "Secrets, tokens, private keys, PII (incl. Aadhaar & PAN) and IPs — instant, in the browser."],
            ["Gemma 3 / Qwen3", "Served by Ollama on localhost. Spots context regex can't: names, hostnames, codenames."],
            ["Risk score", "Weighted 0–100 score so you know at a glance whether to share."],
            ["Human in the loop", "SAFE COPY unlocks only after you approve the redacted text."],
          ].map(([t, d]) => (
            <div key={t} className="panel">
              <h3 className="font-display text-xl font-semibold">{t}</h3>
              <p className="text-muted-foreground mt-1">{d}</p>
            </div>
          ))}
          <div className="panel font-mono text-xs">
            <p className="label">Run locally</p>
            <pre className="whitespace-pre-wrap">{`ollama pull gemma3
OLLAMA_ORIGINS="*" ollama serve`}</pre>
          </div>
        </div>
      </section>
    </main>
  );
}
