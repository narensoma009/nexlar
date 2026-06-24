import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addLine,
  approveQuote,
  getApprovalBrief,
  getQuote,
  rejectQuote,
  submitQuote,
  type ApprovalBrief,
  type QuoteDetail,
  type QuoteStatus,
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

const STATUS_PILL: Record<QuoteStatus, string> = {
  draft: "bg-slate-100 text-slate-700",
  submitted: "bg-blue-50 text-blue-700",
  pending_manager: "bg-amber-50 text-amber-700 border border-amber-200",
  auto_approved: "bg-green-50 text-green-700 border border-green-200",
  approved: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  rejected: "bg-red-50 text-red-700 border border-red-200",
};

export default function QuoteWorkspace() {
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
      if (openCount === 0) {
        setInfo("Validated — no open issues.");
      }
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
      await runValidation(quoteId); // refresh validations so routing uses latest
      const updated = await submitQuote(quoteId, comment.trim());
      await refresh();
      if (updated.status === "auto_approved") {
        setInfo("Auto-approved.");
      } else if (updated.status === "pending_manager") {
        setInfo("Routed to manager queue: " + updated.routing_reasons.join("; "));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onApprove() {
    const decided_by = prompt("Manager name:");
    if (decided_by === null) return;
    const decision_comment = prompt("Approval comment (optional):") ?? "";
    setError(null);
    try {
      await approveQuote(quoteId, decided_by, decision_comment);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  async function onReject() {
    const decided_by = prompt("Manager name:");
    if (decided_by === null) return;
    const decision_comment = prompt("Rejection comment (required):");
    if (decision_comment === null || !decision_comment.trim()) {
      setError("Rejection comment is required");
      return;
    }
    setError(null);
    try {
      await rejectQuote(quoteId, decided_by, decision_comment);
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
    quote &&
    (quote.status === "draft" ||
      quote.status === "pending_manager" ||
      quote.status === "rejected");

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Quotes
          </Link>
          <div className="text-sm font-semibold">
            {quote?.number ?? "…"} · {quote?.customer ?? "…"}
          </div>
          {quote && (
            <span className={"text-xs rounded-full px-2 py-0.5 " + STATUS_PILL[quote.status]}>
              {quote.status}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">
            Subtotal: ${(quote?.subtotal ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
          {canSubmit && (
            <button
              onClick={onSubmit}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
            >
              Submit for approval
            </button>
          )}
          {isPending && (
            <>
              <button
                onClick={onApprove}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Approve
              </button>
              <button
                onClick={onReject}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white"
              >
                Reject
              </button>
            </>
          )}
        </div>
      </header>

      {isPending && <ApproverBrief brief={brief} loading={briefLoading} />}

      {quote && (quote.submit_comment || quote.routing_reasons.length > 0 || quote.decision_comment) && (
        <div className="bg-white border-b border-slate-200 px-6 py-3 text-xs text-slate-600 flex flex-col gap-1">
          {quote.submit_comment && (
            <div>
              <span className="font-medium text-slate-700">Submit comment:</span> {quote.submit_comment}
            </div>
          )}
          {quote.routing_reasons.length > 0 && (
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
      )}

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr_360px] gap-4 p-4">
        <aside className="min-h-[60vh]">
          <CatalogueBrowser onAdd={onAdd} />
        </aside>
        <section className="min-h-[60vh]">
          {quote && (
            <LinesPanel
              quoteId={quoteId}
              lines={quote.lines}
              onChange={refresh}
              onAttachDhi={onAttachDhi}
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
      </main>

      {error && (
        <div className="fixed top-20 right-6 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 z-30 shadow max-w-sm">
          <div className="flex items-start gap-2">
            <span className="flex-1">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-700">
              ×
            </button>
          </div>
        </div>
      )}
      {info && !error && (
        <div className="fixed top-20 right-6 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-sm text-blue-700 z-30 shadow max-w-sm">
          <div className="flex items-start gap-2">
            <span className="flex-1">{info}</span>
            <button onClick={() => setInfo(null)} className="text-blue-400 hover:text-blue-700">
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
