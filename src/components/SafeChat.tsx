import { useEffect, useRef, useState } from "react";
import { scan } from "@/lib/scanner";

type Msg = { role: "user" | "assistant"; content: string; original?: string | undefined; found?: string[] };
type Thread = { id: string; title: string; messages: Msg[] };

const newThread = (): Thread => ({ id: crypto.randomUUID(), title: "New chat", messages: [] });

export function SafeChat() {
  const [threads, setThreads] = useState<Thread[]>(() => [newThread()]);
  const [activeId, setActiveId] = useState(threads[0]!.id);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("gemma3");
  const [host, setHost] = useState("http://localhost:11434");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const active = (threads.find((t) => t.id === activeId) ?? threads[0])!;
  const live = scan(input);

  const [installed, setInstalled] = useState<string[]>([]);
  const [status, setStatus] = useState<"checking" | "ok" | "down">("checking");
  const checkOllama = async () => {
    setStatus("checking");
    try {
      const res = await fetch(`${host.replace(/\/$/, "")}/api/tags`);
      if (!res.ok) throw new Error();
      const j = await res.json();
      const names: string[] = (j.models ?? []).map((m: { name: string }) => m.name.replace(/:latest$/, ""));
      setInstalled(names);
      if (names.length && !names.includes(model)) setModel(names[0]!);
      setStatus("ok");
    } catch { setStatus("down"); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { checkOllama(); }, []);

  useEffect(() => { taRef.current?.focus(); }, [activeId, busy]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active.messages.length, busy]);

  const update = (id: string, fn: (t: Thread) => Thread) =>
    setThreads((ts) => ts.map((t) => (t.id === id ? fn(t) : t)));

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    const r = scan(text);
    const userMsg: Msg = {
      role: "user",
      content: r.redacted,
      original: r.findings.length ? text : undefined,
      found: r.findings.map((f) => f.type),
    };
    const id = active.id;
    const history = [...active.messages, userMsg];
    update(id, (t) => ({ ...t, title: t.messages.length ? t.title : r.redacted.slice(0, 32), messages: history }));
    setInput(""); setErr(""); setBusy(true);
    try {
      const res = await fetch(`${host.replace(/\/$/, "")}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          messages: [
            { role: "system", content: "You are a helpful assistant. Some user text contains placeholders like [REDACTED_EMAIL]; the real values were removed for privacy. Never ask the user to reveal them." },
            ...history.map((m) => ({ role: m.role, content: m.content })),
          ],
        }),
      });
      if (!res.ok) throw new Error(`Ollama returned ${res.status}`);
      const j = await res.json();
      update(id, (t) => ({ ...t, messages: [...t.messages, { role: "assistant", content: j.message?.content ?? "" }] }));
    } catch (e) {
      setErr(`Could not reach Ollama at ${host}. Run: OLLAMA_ORIGINS="*" ollama serve, then ollama pull ${model}. (${(e as Error).message})`);
    } finally {
      setBusy(false);
    }
  };

  const addThread = () => { const t = newThread(); setThreads((ts) => [t, ...ts]); setActiveId(t.id); };
  const removeThread = (id: string) => {
    setThreads((ts) => {
      const rest = ts.filter((t) => t.id !== id);
      const next = rest.length ? rest : [newThread()];
      if (id === activeId) setActiveId(next[0]!.id);
      return next;
    });
  };

  return (
    <div className="grid lg:grid-cols-[240px_1fr] gap-6">
      <aside className="panel">
        <button onClick={addThread} className="btn-primary w-full mb-4">+ New chat</button>
        <ul className="space-y-1">
          {threads.map((t) => (
            <li key={t.id} className={`flex items-center gap-1 rounded-md ${t.id === active.id ? "bg-muted" : ""}`}>
              <button onClick={() => setActiveId(t.id)} className="flex-1 text-left text-sm px-2 py-1.5 truncate">{t.title}</button>
              <button onClick={() => removeThread(t.id)} aria-label="Delete chat" className="px-2 text-muted-foreground hover:text-destructive">×</button>
            </li>
          ))}
        </ul>
        <p className="font-mono text-[10px] text-muted-foreground mt-4">Chats are not saved — they disappear on reload.</p>
      </aside>

      <section className="panel flex flex-col h-[70vh]">
        <div className="flex gap-2 mb-2">
          <select value={model} onChange={(e) => setModel(e.target.value)} className="input">
            {[...new Set([...installed, "gemma3", "qwen3", "gemma3:1b", "qwen3:1.7b"])].map((m) => (
              <option key={m} value={m}>{m}{installed.includes(m) ? " ✓" : ""}</option>
            ))}
          </select>
          <input value={host} onChange={(e) => setHost(e.target.value)} className="input flex-1" />
          <button onClick={checkOllama} className="btn-primary text-xs">Check</button>
        </div>
        <p className={`font-mono text-xs mb-4 ${status === "ok" ? "text-primary" : status === "down" ? "text-destructive" : "text-muted-foreground"}`}>
          {status === "ok" && `● Ollama connected — ${installed.length} model(s) installed${installed.length ? "" : ". Run: ollama pull gemma3"}`}
          {status === "down" && `● Ollama not reachable. Open a terminal and run: set OLLAMA_ORIGINS=* && ollama serve (Windows CMD) — or $env:OLLAMA_ORIGINS="*"; ollama serve (PowerShell). Then click Check.`}
          {status === "checking" && "● Checking Ollama…"}
        </p>

        <div className="flex-1 overflow-auto space-y-4 pr-1">
          {active.messages.length === 0 && (
            <p className="text-muted-foreground text-sm">Type anything. Passwords, keys, emails, phone numbers and card numbers are removed automatically before the AI sees them.</p>
          )}
          {active.messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "flex flex-col items-end" : ""}>
              {m.found && m.found.length > 0 && (
                <div className="mb-1 max-w-[80%] text-xs font-mono border border-destructive/40 text-destructive rounded-md px-2 py-1">
                  ⚠ Sanitized before sending: {[...new Set(m.found)].join(", ")}
                </div>
              )}
              <div className={m.role === "user"
                ? "max-w-[80%] bg-primary text-primary-foreground rounded-lg px-3 py-2 text-sm whitespace-pre-wrap"
                : "text-sm whitespace-pre-wrap"}>
                {m.content}
              </div>
            </div>
          ))}
          {busy && <p className="text-muted-foreground text-sm animate-pulse">Thinking…</p>}
          {err && <p className="text-destructive text-xs font-mono">{err}</p>}
          <div ref={endRef} />
        </div>

        {live.findings.length > 0 && (
          <div className="mt-3 text-xs font-mono border border-destructive/40 text-destructive rounded-md px-2 py-1.5">
            ⚠ Aap sensitive details share kar rahe ho ({[...new Set(live.findings.map((f) => f.type))].join(", ")}). Bhejne par ye apne aap sanitize ho jayenge.
          </div>
        )}
        <div className="flex gap-2 mt-3">
          <textarea ref={taRef} value={input} onChange={(e) => setInput(e.target.value)} rows={2}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="Message… (Enter to send)"
            className="flex-1 bg-background border rounded-md p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring" />
          <button onClick={send} disabled={busy || !input.trim()} className="btn-primary self-end">Send</button>
        </div>
      </section>
    </div>
  );
}
