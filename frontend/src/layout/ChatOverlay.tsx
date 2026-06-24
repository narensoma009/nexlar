import { useEffect, useRef, useState } from "react";
import { chat, deleteDoc, listDocs, uploadDoc, type Doc, type Message } from "../api/chat";

type Props = { onClose: () => void };

export default function ChatOverlay({ onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedContext, setUsedContext] = useState<string[]>([]);

  const [docs, setDocs] = useState<Doc[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listDocs().then(setDocs).catch((e) => setError(e.message));
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
      const data = await chat(next);
      setMessages([...next, { role: "assistant", content: data.reply }]);
      setUsedContext(data.used_context ?? []);
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
      await uploadDoc(file);
      setDocs(await listDocs());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function remove(id: number) {
    try {
      await deleteDoc(id);
      setDocs(await listDocs());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div className="fixed bottom-20 right-6 w-[420px] h-[600px] max-h-[80vh] bg-white border border-slate-200 rounded-2xl shadow-2xl flex flex-col z-40">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <div>
          <div className="text-sm font-semibold">QuoteIQ Chat</div>
          <div className="text-xs text-slate-500">Azure OpenAI · RAG over uploaded CSVs</div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-xl leading-none">
          ×
        </button>
      </div>

      <div className="border-b border-slate-200 px-4 py-2">
        <div className="text-xs font-medium mb-1">Knowledge ({docs.length})</div>
        <div className="flex gap-2 items-center">
          <input
            ref={fileInput}
            type="file"
            accept=".csv,text/csv"
            disabled={uploading}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) upload(f);
            }}
            className="text-xs"
          />
          {uploading && <span className="text-xs text-slate-500">embedding…</span>}
        </div>
        {docs.length > 0 && (
          <ul className="mt-1 flex flex-col gap-0.5 max-h-20 overflow-y-auto">
            {docs.map((d) => (
              <li key={d.id} className="flex items-center justify-between text-xs text-slate-600">
                <span className="truncate" title={d.filename}>
                  {d.filename} <span className="text-slate-400">· {d.row_count}</span>
                </span>
                <button onClick={() => remove(d.id)} className="text-red-600 hover:underline">
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex-1 flex flex-col gap-2 p-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-slate-400 text-sm text-center mt-8">Start a conversation.</div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-2xl bg-blue-600 text-white px-3 py-2 text-sm"
                : "self-start max-w-[85%] rounded-2xl bg-slate-100 px-3 py-2 text-sm"
            }
          >
            <div className="whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {loading && <div className="self-start text-xs text-slate-400 px-2">…</div>}
        {error && <div className="self-center text-xs text-red-600">{error}</div>}
        {usedContext.length > 0 && (
          <details className="text-xs text-slate-500 mt-2">
            <summary>context used ({usedContext.length})</summary>
            <ul className="mt-1 flex flex-col gap-1">
              {usedContext.map((c, i) => (
                <li key={i} className="border-l-2 border-blue-300 pl-2 whitespace-pre-wrap">
                  {c}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      <div className="flex gap-2 border-t border-slate-200 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Ask…"
          className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
