import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import {
  addLine,
  approveQuote,
  getApprovalBrief,
  getQuote,
  rejectQuote,
  submitQuote,
  type ApprovalBrief,
  type QuoteDetail,
} from "../api/quotes";
import { type CatalogueItem } from "../api/catalogue";
import {
  attachDhi,
  listValidations,
  runValidation,
  type Validation,
} from "../api/validations";
import CatalogueBrowser from "../components/quote/CatalogueBrowser";
import LinesPanel from "../components/quote/LinesPanel";
import IssuesPanel from "../components/quote/IssuesPanel";
import ApproverBrief from "../components/quote/ApproverBrief";
import StatusBadge from "../components/StatusBadge";
import { currencyFull } from "../lib/status";
import { useAuth } from "../auth/AuthContext";

export default function QuoteWorkspace() {
  const { user } = useAuth();
  const isAE = user?.role === "ae";
  const isManager = user?.role === "manager";

  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [brief, setBrief] = useState<ApprovalBrief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [q, v] = await Promise.all([
        getQuote(quoteId),
        listValidations(quoteId),
      ]);
      setQuote(q);
      setValidations(v);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }, [quoteId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (quote?.status !== "pending_manager") {
      setBrief(null);
      return;
    }
    setBriefLoading(true);
    getApprovalBrief(quoteId)
      .then(setBrief)
      .catch((e) => setError(e instanceof Error ? e.message : "Brief failed"))
      .finally(() => setBriefLoading(false));
  }, [quote?.status, quote?.updated_at, quoteId]);

  async function onAdd(item: CatalogueItem) {
    try {
      const initialPhase = item.allowed_phases[0] ?? 1;
      const next = await addLine(quoteId, {
        sku_id: item.sku_id,
        phase: initialPhase,
      });
      setQuote(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onValidate() {
    setValidating(true);
    setError(null);
    setInfo(null);
    try {
      const v = await runValidation(quoteId);
      setValidations(v);
      const openCount = v.filter((x) => x.state === "open").length;
      if (openCount === 0) setInfo("Validated — no open issues.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setValidating(false);
    }
  }

  async function onAttachDhi(lineId: number) {
    const code = prompt("DHI code (e.g. E1042)");
    if (!code) return;
    try {
      await attachDhi(quoteId, lineId, code.trim());
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onSubmit() {
    if (!quote) return;
    if (quote.lines.length === 0) {
      setError("Add at least one line before submitting.");
      return;
    }
    const comment = prompt(
      "Submit comment for management (required):",
      quote.submit_comment || "",
    );
    if (comment === null) return;
    if (!comment.trim()) {
      setError("Submit comment is required.");
      return;
    }
    setError(null);
    setInfo(null);
    try {
      await runValidation(quoteId);
      const updated = await submitQuote(quoteId, comment.trim());
      await refresh();
      if (updated.status === "auto_approved") setInfo("Auto-approved.");
      else if (updated.status === "pending_manager")
        setInfo("Routed to manager queue: " + updated.routing_reasons.join("; "));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onApprove() {
    const decision_comment = prompt("Approval comment (optional):") ?? "";
    setError(null);
    try {
      await approveQuote(quoteId, user?.name ?? "", decision_comment);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onReject() {
    const decision_comment = prompt("Rejection comment (required):");
    if (decision_comment === null || !decision_comment.trim()) {
      setError("Rejection comment is required");
      return;
    }
    setError(null);
    try {
      await rejectQuote(quoteId, user?.name ?? "", decision_comment);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  const lineLabelMap = useMemo(() => {
    const m = new Map<number, string>();
    quote?.lines.forEach((ln) => m.set(ln.id, `${ln.sku_id} (${ln.sku_name})`));
    return m;
  }, [quote]);
  const lineLabel = (id: number | null) =>
    id === null ? "" : (lineLabelMap.get(id) ?? `#${id}`);

  const isPending = quote?.status === "pending_manager";
  const canSubmit =
    isAE &&
    quote &&
    (quote.status === "draft" ||
      quote.status === "pending_manager" ||
      quote.status === "rejected");
  const canDecide = isManager && isPending;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 backdrop-blur bg-white/85 border-b border-slate-200">
        <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-wrap min-w-0">
            <Link
              to="/"
              className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800"
            >
              <ArrowLeft size={14} /> Quotes
            </Link>
            <div className="h-5 w-px bg-slate-300" />
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles size={16} className="text-blue-600 shrink-0" />
              <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {quote?.number ?? "…"}
              </span>
              <span className="text-sm font-semibold truncate">{quote?.customer ?? "…"}</span>
              {quote && <StatusBadge status={quote.status} size="md" />}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm">
              <span className="text-slate-500">Subtotal</span>{" "}
              <span className="font-semibold text-slate-900">
                {currencyFull(quote?.subtotal ?? 0)}
              </span>
            </div>
            {canSubmit && (
              <button
                onClick={onSubmit}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-blue-700"
              >
                <Send size={14} /> Submit for approval
              </button>
            )}
            {canDecide && (
              <>
                <button
                  onClick={onApprove}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-emerald-700"
                >
                  <Check size={14} /> Approve
                </button>
                <button
                  onClick={onReject}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white shadow hover:bg-red-700"
                >
                  <X size={14} /> Reject
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {isPending && <ApproverBrief brief={brief} loading={briefLoading} />}

      {quote && (quote.submit_comment || quote.routing_reasons.length > 0 || quote.decision_comment) && (
        <div className="bg-white border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 py-3 text-xs text-slate-600 flex flex-col gap-1">
            {quote.submit_comment && (
              <div>
                <span className="font-medium text-slate-700">Submit comment:</span> {quote.submit_comment}
              </div>
            )}
            {quote.routing_reasons.length > 0 && !isPending && (
              <div className="text-amber-700">
                <span className="font-medium">Routing reasons:</span> {quote.routing_reasons.join("; ")}
              </div>
            )}
            {quote.decision_comment && (
              <div>
                <span className="font-medium text-slate-700">
                  {quote.status === "rejected" ? "Rejection" : "Approval"} note
                  {quote.decided_by && ` (by ${quote.decided_by})`}:
                </span>{" "}
                {quote.decision_comment}
              </div>
            )}
          </div>
        </div>
      )}

      <main className="flex-1 min-h-0">
        <div
          className={
            "mx-auto max-w-7xl p-4 grid grid-cols-1 gap-4 min-h-[70vh] " +
            (isAE
              ? "lg:grid-cols-[340px_1fr_380px]"
              : "lg:grid-cols-[1fr_380px]")
          }
        >
          {isAE && (
            <aside className="min-h-[60vh]">
              <CatalogueBrowser onAdd={onAdd} />
            </aside>
          )}
          <section className="min-h-[60vh]">
            {quote && (
              <LinesPanel
                quoteId={quoteId}
                lines={quote.lines}
                onChange={refresh}
                onAttachDhi={onAttachDhi}
                readOnly={!isAE}
              />
            )}
          </section>
          <aside className="min-h-[60vh]">
            <IssuesPanel
              validations={validations}
              lineLabel={lineLabel}
              onChange={refresh}
              onRunValidate={onValidate}
              validating={validating}
            />
          </aside>
        </div>
      </main>

      {error && (
        <Toast tone="red" onClose={() => setError(null)}>
          {error}
        </Toast>
      )}
      {info && !error && (
        <Toast tone="blue" onClose={() => setInfo(null)}>
          {info}
        </Toast>
      )}
    </div>
  );
}

function Toast({
  children,
  tone,
  onClose,
}: {
  children: React.ReactNode;
  tone: "red" | "blue";
  onClose: () => void;
}) {
  const cls =
    tone === "red"
      ? "bg-red-50 border-red-200 text-red-700"
      : "bg-blue-50 border-blue-200 text-blue-700";
  return (
    <div className={`fixed top-20 right-6 z-30 rounded-xl border px-3 py-2 text-sm shadow-lg max-w-sm ${cls}`}>
      <div className="flex items-start gap-2">
        <span className="flex-1">{children}</span>
        <button onClick={onClose} className="text-current/60 hover:text-current">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
