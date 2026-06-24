import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  listQuotes,
  createQuote,
  deleteQuote,
  type QuoteStatus,
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

const STATUS_LABEL: Record<QuoteStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_manager: "Pending manager",
  auto_approved: "Auto-approved",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_PILL: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-50 text-blue-700",
  pending_manager: "bg-amber-50 text-amber-700 border border-amber-200",
  auto_approved: "bg-green-50 text-green-700 border border-green-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
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

  function QuoteRow({ q }: { q: QuoteSummary }) {
    return (
      <li className="flex items-center justify-between py-2 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              to={`/quotes/${q.id}`}
              className="text-sm font-medium text-blue-700 hover:underline"
            >
              {q.number}
            </Link>
            <span className="text-sm text-slate-700">{q.customer}</span>
            <span className={"text-xs rounded-full px-2 py-0.5 " + STATUS_PILL[q.status]}>
              {STATUS_LABEL[q.status]}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            {q.line_count} line{q.line_count === 1 ? "" : "s"} ·
            ${q.subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            {q.ae && <> · AE {q.ae}</>}
            {q.decided_by && <> · decided by {q.decided_by}</>}
          </div>
          {q.status === "pending_manager" && q.routing_reasons.length > 0 && (
            <div className="text-xs text-amber-700 mt-0.5">
              {q.routing_reasons.join("; ")}
            </div>
          )}
        </div>
        <button
          onClick={() => onDelete(q.id)}
          className="text-xs text-red-600 hover:underline"
        >
          delete
        </button>
      </li>
    );
  }

  const drafts = quotes.filter((q) => q.status === "draft" || q.status === "submitted");
  const pending = quotes.filter((q) => q.status === "pending_manager");
  const auto = quotes.filter((q) => q.status === "auto_approved");
  const approved = quotes.filter((q) => q.status === "approved");
  const rejected = quotes.filter((q) => q.status === "rejected");

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4 flex items-center justify-between flex-wrap gap-3">
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

        <Section
          title={`Pending manager approval (${pending.length})`}
          tone="amber"
          empty="Nothing waiting on a manager."
        >
          <ul className="flex flex-col divide-y divide-slate-100">
            {pending.map((q) => (
              <QuoteRow key={q.id} q={q} />
            ))}
          </ul>
        </Section>

        <Section
          title={`Auto-approved (${auto.length})`}
          tone="green"
          empty="No auto-approved quotes yet."
        >
          <ul className="flex flex-col divide-y divide-slate-100">
            {auto.map((q) => (
              <QuoteRow key={q.id} q={q} />
            ))}
          </ul>
        </Section>

        {approved.length > 0 && (
          <Section title={`Approved (${approved.length})`} tone="emerald">
            <ul className="flex flex-col divide-y divide-slate-100">
              {approved.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </ul>
          </Section>
        )}

        {drafts.length > 0 && (
          <Section title={`Drafts (${drafts.length})`} tone="slate">
            <ul className="flex flex-col divide-y divide-slate-100">
              {drafts.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </ul>
          </Section>
        )}

        {rejected.length > 0 && (
          <Section title={`Rejected (${rejected.length})`} tone="red">
            <ul className="flex flex-col divide-y divide-slate-100">
              {rejected.map((q) => (
                <QuoteRow key={q.id} q={q} />
              ))}
            </ul>
          </Section>
        )}

        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
      </main>
    </div>
  );
}

const TONE: Record<string, string> = {
  amber: "border-amber-200",
  green: "border-green-200",
  emerald: "border-emerald-200",
  slate: "border-slate-200",
  red: "border-red-200",
};

function Section({
  title,
  tone,
  empty,
  children,
}: {
  title: string;
  tone: keyof typeof TONE;
  empty?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={"rounded-2xl bg-white p-4 border " + TONE[tone]}>
      <div className="text-sm font-medium mb-2">{title}</div>
      {empty && (children as any)?.props?.children?.length === 0 ? (
        <div className="text-sm text-slate-400">{empty}</div>
      ) : (
        children
      )}
    </section>
  );
}
