import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };
type Doc = { id: number; filename: string; row_count: number };

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedContext, setUsedContext] = useState<string[]>([]);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function loadDocs() {
    try {
      const res = await fetch("/api/documents");
      if (!res.ok) throw new Error(`List failed: ${res.status}`);
      setDocs(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  useEffect(() => {
    loadDocs();
  }, []);

  async function send() {
    const text = input.trim();
    if (!text || loading) return;

    const next: Message[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      const data: { reply: string; used_context: string[] } = await res.json();
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setUsedContext(data.used_context || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/documents", { method: "POST", body: fd });
      if (!res.ok) {
        const detail = await res.json().catch(() => ({}));
        throw new Error(detail.detail || `Upload failed: ${res.status}`);
      }
      await loadDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function deleteDoc(id: number) {
    try {
      const res = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      await loadDocs();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <h1 className="text-xl font-semibold tracking-tight">Nexlara</h1>
        <p className="text-sm text-slate-500">
          Azure OpenAI chat with CSV RAG
        </p>
      </header>

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-6 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-sm font-medium mb-2">Knowledge base</div>
            <input
              ref={fileInput}
              type="file"
              accept=".csv,text/csv"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
              }}
              className="block w-full text-xs text-slate-600 file:mr-2 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-1.5 file:text-blue-700 hover:file:bg-blue-100"
            />
            {uploading && (
              <div className="text-xs text-slate-500 mt-2">
                Embedding and storing…
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white border border-slate-200 p-4">
            <div className="text-sm font-medium mb-2">
              Documents ({docs.length})
            </div>
            {docs.length === 0 && (
              <div className="text-xs text-slate-400">
                No documents yet. Upload a CSV to enable RAG.
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {docs.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <span className="truncate" title={d.filename}>
                    {d.filename}
                    <span className="text-slate-400">
                      {" "}
                      · {d.row_count} rows
                    </span>
                  </span>
                  <button
                    onClick={() => deleteDoc(d.id)}
                    className="text-red-600 hover:underline"
                  >
                    delete
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {usedContext.length > 0 && (
            <div className="rounded-2xl bg-white border border-slate-200 p-4">
              <div className="text-sm font-medium mb-2">Last context used</div>
              <ul className="flex flex-col gap-1 text-xs text-slate-600 max-h-64 overflow-y-auto">
                {usedContext.map((c, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-blue-300 pl-2 whitespace-pre-wrap"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>

        <section className="flex flex-col gap-4">
          <div className="flex-1 flex flex-col gap-3 overflow-y-auto min-h-[50vh]">
            {messages.length === 0 && (
              <div className="text-slate-400 text-sm text-center mt-12">
                Start a conversation. Uploaded CSVs will be searched
                automatically.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                className={
                  m.role === "user"
                    ? "self-end max-w-[80%] rounded-2xl bg-blue-600 text-white px-4 py-2"
                    : "self-start max-w-[80%] rounded-2xl bg-white border border-slate-200 px-4 py-2"
                }
              >
                <div className="whitespace-pre-wrap text-sm">{m.content}</div>
              </div>
            ))}
            {loading && (
              <div className="self-start text-sm text-slate-400 px-2">…</div>
            )}
            {error && (
              <div className="self-center text-sm text-red-600">{error}</div>
            )}
          </div>

          <div className="flex gap-2 border-t border-slate-200 pt-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask something about your CSV…"
              className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
