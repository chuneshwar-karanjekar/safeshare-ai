import { createFileRoute, Link } from "@tanstack/react-router";
import { SafeChat } from "@/components/SafeChat";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Safe Chat — SafeShare AI" },
      { name: "description", content: "Chat with Gemma or Qwen locally. Secrets and personal details are redacted before every message is sent." },
      { property: "og:title", content: "Safe Chat — SafeShare AI" },
      { property: "og:description", content: "Local AI chat with automatic redaction of sensitive details." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Chat,
});

function Chat() {
  return (
    <main className="min-h-screen px-6 py-8 max-w-7xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <Link to="/" className="font-display text-xl font-bold">Safe<span className="text-primary">Share</span> AI</Link>
        <nav className="flex gap-4 font-mono text-xs">
          <Link to="/scan" className="text-muted-foreground hover:text-foreground">Scanner</Link>
          <span className="text-primary">Safe Chat</span>
        </nav>
      </header>
      <SafeChat />
    </main>
  );
}
