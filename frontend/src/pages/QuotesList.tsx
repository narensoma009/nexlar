import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertOctagon,
  ClipboardList,
  Clock,
  FileText,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
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
import { useAuth } from "../auth/AuthContext";
import StatusBadge from "../components/StatusBadge";
import StatCard from "../components/StatCard";
import { currencyFull } from "../lib/status";

type UploadKind = "catalogue" | "phasing" | "asc606" | "dhi";

const UPLOADERS: Record<
  UploadKind,
  { label: string; fn: (f: File) => Promise<{ inserted: number; updated: number }> }
> = {
  catalogue: { label: "Catalogue", fn: uploadCatalogue },
  phasing: { label: "Phasing rules", fn: uploadPhasingRules },
  asc606: { label: "ASC-606 rules", fn: uploadAsc606Rules },
  dhi: { label: "DHI codes", fn: uploadDhiCodes },
};

export default function QuotesList() {
  const { user, logout } = useAuth();
  const isAE = user?.role === "ae";
  const isManager = user?.role === "manager";

  const [quotes, setQuotes] = useState<QuoteSummary[]>([]);
  const [customer, setCustomer] = useState("");
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
      const q = await createQuote(customer.trim(), user?.email ?? "");
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

  const drafts = quotes.filter((q) => q.status === "draft" || q.status === "submitted");
  const pending = quotes.filter((q) => q.status === "pending_manager");
  const auto = quotes.filter((q) => q.status === "auto_approved");
  const approved = quotes.filter((q) => q.status === "approved");
  const rejected = quotes.filter((q) => q.status === "rejected");

  const pipelineValue = pending.reduce((s, q) => s + q.subtotal, 0);
  const approvedValue = approved.reduce((s, q) => s + q.subtotal, 0) +
    auto.reduce((s, q) => s + q.subtotal, 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-200">
        <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles size={18} />
            </div>
            <div>
              <div className="text-base font-semibold tracking-tight">Nexlara</div>
              <div className="text-[11px] text-slate-500">Quote workspace</div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {(Object.keys(UPLOADERS) as UploadKind[]).map((k) => (
              <label
                key={k}
                className="inline-flex items-center gap-1.5 text-xs cursor-pointer rounded-lg border border-slate-300 px-2.5 py-1.5 bg-white hover:bg-slate-50 shadow-sm"
              >
                <Upload size={13} />
                {UPLOADERS[k].label}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) onUpload(k, f);
                    e.target.value = "";
                  }}
                />
              </label>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-6 flex flex-col gap-6">
        {uploadStatus && (
          <div className="text-xs text-slate-500 bg-white border border-slate-200 rounded-lg px-3 py-1.5 inline-flex w-fit">
            {uploadStatus}
          </div>
        )}

        {/* Stats hero */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {isAE && (
            <StatCard
              icon={AlertOctagon}
              label="Action required (rejected)"
              value={rejected.length}
              tone="red"
              sub={rejected.length === 0 ? "All clear" : "Open and resubmit"}
            />
          )}
          <StatCard
            icon={Clock}
            label={isManager ? "Awaiting your decision" : "Pending manager"}
            value={pending.length}
            tone="amber"
            sub={pipelineValue > 0 ? currencyFull(pipelineValue) + " in pipeline" : "—"}
          />
          {isAE && (
            <StatCard
              icon={ShieldCheck}
              label="Auto-approved"
              value={auto.length}
              tone="green"
            />
          )}
          <StatCard
            icon={ClipboardList}
            label={isManager ? "Approved by you" : "Approved"}
            value={approved.length}
            tone="emerald"
            sub={approvedValue > 0 ? currencyFull(approvedValue) + " booked" : "—"}
          />
          {isAE ? (
            <StatCard
              icon={FileText}
              label="Drafts"
              value={drafts.length}
              tone="slate"
            />
          ) : (
            <StatCard
              icon={AlertOctagon}
              label="Rejected by you"
              value={rejected.length}
              tone="red"
            />
          )}
        </div>

        {/* New quote (AE only) */}
        {isAE && (
          <section className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                <Plus size={16} />
              </div>
              <div className="text-sm font-medium">New quote</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                placeholder="Customer"
                className="flex-1 min-w-[220px] rounded-lg border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={onCreate}
                disabled={busy || !customer.trim()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
              >
                <Plus size={16} /> Create
              </button>
            </div>
          </section>
        )}

        {/* Sections — order varies by role */}
        {isManager ? (
          <>
            <Section
              title="Awaiting your decision"
              subtitle="Open each quote to see the AI approver brief with risk score."
              tone="amber"
              count={pending.length}
              empty="Inbox zero — no quotes waiting on you."
            >
              {pending.map((q) => (
                <QuoteRow key={q.id} q={q} canDelete={false} onDelete={() => onDelete(q.id)} />
              ))}
            </Section>

            {approved.length > 0 && (
              <Section title="Approved by you" tone="emerald" count={approved.length}>
                {approved.map((q) => (
                  <QuoteRow key={q.id} q={q} canDelete={false} onDelete={() => onDelete(q.id)} />
                ))}
              </Section>
            )}

            {rejected.length > 0 && (
              <Section title="Rejected by you" tone="red" count={rejected.length}>
                {rejected.map((q) => (
                  <QuoteRow key={q.id} q={q} canDelete={false} onDelete={() => onDelete(q.id)} />
                ))}
              </Section>
            )}
          </>
        ) : (
          <>
            <Section
              title="Action required — rejected"
              subtitle="Open each quote to address the manager's notes, then re-submit."
              tone="red"
              count={rejected.length}
              empty="No rejected quotes — nothing to act on."
            >
              {rejected.map((q) => (
                <QuoteRow key={q.id} q={q} onDelete={() => onDelete(q.id)} />
              ))}
            </Section>

            <Section
              title="Pending manager"
              subtitle="Submitted and waiting on a decision."
              tone="amber"
              count={pending.length}
              empty="Nothing waiting on a manager."
            >
              {pending.map((q) => (
                <QuoteRow key={q.id} q={q} onDelete={() => onDelete(q.id)} />
              ))}
            </Section>

            <Section
              title="Auto-approved"
              tone="green"
              count={auto.length}
              empty="No auto-approved quotes yet."
            >
              {auto.map((q) => (
                <QuoteRow key={q.id} q={q} onDelete={() => onDelete(q.id)} />
              ))}
            </Section>

            {approved.length > 0 && (
              <Section title="Approved" tone="emerald" count={approved.length}>
                {approved.map((q) => (
                  <QuoteRow key={q.id} q={q} onDelete={() => onDelete(q.id)} />
                ))}
              </Section>
            )}

            {drafts.length > 0 && (
              <Section title="Drafts" tone="slate" count={drafts.length}>
                {drafts.map((q) => (
                  <QuoteRow key={q.id} q={q} onDelete={() => onDelete(q.id)} />
                ))}
              </Section>
            )}
          </>
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

const TONE: Record<string, { ring: string; dot: string }> = {
  amber: { ring: "border-amber-200", dot: "bg-amber-500" },
  green: { ring: "border-green-200", dot: "bg-green-500" },
  emerald: { ring: "border-emerald-200", dot: "bg-emerald-500" },
  slate: { ring: "border-slate-200", dot: "bg-slate-400" },
  red: { ring: "border-red-200", dot: "bg-red-500" },
};

function Section({
  title,
  subtitle,
  tone,
  count,
  empty,
  children,
}: {
  title: string;
  subtitle?: string;
  tone: keyof typeof TONE;
  count: number;
  empty?: string;
  children: React.ReactNode;
}) {
  const childArr = Array.isArray(children) ? children : [children];
  const isEmpty = childArr.flat().filter(Boolean).length === 0;
  return (
    <section className={"rounded-2xl bg-white p-4 border shadow-sm " + TONE[tone].ring}>
      <div className="flex items-baseline gap-2 mb-3">
        <span className={"inline-block h-2 w-2 rounded-full " + TONE[tone].dot} />
        <div className="text-sm font-semibold">{title}</div>
        <span className="text-xs text-slate-400">({count})</span>
        {subtitle && <div className="text-xs text-slate-500 ml-auto">{subtitle}</div>}
      </div>
      {isEmpty && empty ? (
        <div className="text-sm text-slate-400 italic px-1">{empty}</div>
      ) : (
        <ul className="flex flex-col gap-2">{children}</ul>
      )}
    </section>
  );
}

function QuoteRow({
  q,
  onDelete,
  canDelete = true,
}: {
  q: QuoteSummary;
  onDelete: () => void;
  canDelete?: boolean;
}) {
  return (
    <li>
      <Link
        to={`/quotes/${q.id}`}
        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50/40 transition"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
              {q.number}
            </span>
            <span className="text-sm font-medium text-slate-900 truncate">{q.customer}</span>
            <StatusBadge status={q.status} />
          </div>
          <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
            <span>{q.line_count} line{q.line_count === 1 ? "" : "s"}</span>
            <span>{currencyFull(q.subtotal)}</span>
            {q.ae && <span>AE {q.ae}</span>}
            {q.decided_by && <span>decided by {q.decided_by}</span>}
          </div>
          {q.status === "pending_manager" && q.routing_reasons.length > 0 && (
            <div className="text-xs text-amber-700 mt-1 line-clamp-1">
              {q.routing_reasons.join("; ")}
            </div>
          )}
          {q.status === "rejected" && q.decision_comment && (
            <div className="text-xs text-red-700 mt-1 line-clamp-1">
              Manager: {q.decision_comment}
            </div>
          )}
        </div>
        {canDelete && (
          <button
            onClick={(e) => {
              e.preventDefault();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-red-600 p-1"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        )}
      </Link>
    </li>
  );
}
