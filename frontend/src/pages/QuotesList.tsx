import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listQuotes,
  createQuote,
  deleteQuote,
  type QuoteSummary,
} from "../api/quotes";
import { uploadCatalogue } from "../api/catalogue";
import {
  uploadAsc606Rules,
  uploadDhiCodes,
  uploadPhasingRules,
} from "../api/validations";

type UploadKind = "catalogue" | "phasing" | "asc606" | "dhi";

const UPLOADERS: Record<UploadKind, { label: string; fn: (f: File) => Promise<{ inserted: number; updated: number }> }> = {
  catalogue: { label: "Catalogue", fn: uploadCatalogue },
  phasing: { label: "Phasing rules", fn: uploadPhasingRules },
  asc606: { label: "ASC-606 rules", fn: uploadAsc606Rules },
  dhi: { label: "DHI codes", fn: uploadDhiCodes },
};

export default function QuotesList() {
  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [customer, setCustomer] = useState("");
  const [ae, setAe] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const navigate = useNavigate();

  async function refresh() {
    try {
      setQuotes(await listQuotes());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function onCreate() {
    if (!customer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const q = await createQuote(customer.trim(), ae.trim());
      navigate(`/quotes/${q.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: number) {
    if (!confirm("Delete this quote?")) return;
    try {
      await deleteQuote(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onUpload(kind: UploadKind, file: File) {
    const uploader = UPLOADERS[kind];
    setUploadStatus(`${uploader.label}: uploading…`);
    setError(null);
    try {
      const r = await uploader.fn(file);
      setUploadStatus(`${uploader.label}: inserted ${r.inserted}, updated ${r.updated}`);
    } catch (e) {
      setError(`${uploader.label}: ${e instanceof Error ? e.message : "Unknown error"}`);
      setUploadStatus(null);
    }
  }

  function UploadButton({ kind }: { kind: UploadKind }) {
    return (
      <label className="text-xs cursor-pointer rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-100">
        {UPLOADERS[kind].label}
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(kind, f);
            e.target.value = "";
          }}
        />
      </label>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Nexlara</h1>
          <p className="text-sm text-slate-500">Quote workspace</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-400 mr-1">Upload CSV:</span>
          <UploadButton kind="catalogue" />
          <UploadButton kind="phasing" />
          <UploadButton kind="asc606" />
          <UploadButton kind="dhi" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl px-4 py-6 flex flex-col gap-6">
        {uploadStatus && <div className="text-xs text-slate-500">{uploadStatus}</div>}

        <section className="rounded-2xl bg-white border border-slate-200 p-4 flex flex-col gap-2">
          <div className="text-sm font-medium">New quote</div>
          <div className="flex flex-wrap gap-2">
            <input
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
              placeholder="Customer"
              className="flex-1 min-w-[200px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <input
              value={ae}
              onChange={(e) => setAe(e.target.value)}
              placeholder="AE (optional)"
              className="min-w-[160px] rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              onClick={onCreate}
              disabled={busy || !customer.trim()}
              className="rounded-lg bg-blue-600 px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </section>

        <section className="rounded-2xl bg-white border border-slate-200 p-4">
          <div className="text-sm font-medium mb-2">Quotes ({quotes.length})</div>
          {quotes.length === 0 && (
            <div className="text-sm text-slate-400">No quotes yet.</div>
          )}
          <ul className="flex flex-col divide-y divide-slate-100">
            {quotes.map((q) => (
              <li key={q.id} className="flex items-center justify-between py-2">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/quotes/${q.id}`}
                    className="text-sm font-medium text-blue-700 hover:underline"
                  >
                    {q.number}
                  </Link>
                  <span className="text-sm text-slate-700"> · {q.customer}</span>
                  <span className="text-xs text-slate-400">
                    {" "}
                    · {q.line_count} line{q.line_count === 1 ? "" : "s"} · $
                    {q.subtotal.toFixed(2)} · {q.status}
                  </span>
                </div>
                <button
                  onClick={() => onDelete(q.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  delete
                </button>
              </li>
            ))}
          </ul>
        </section>

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}
