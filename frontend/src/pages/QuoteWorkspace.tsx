import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addLine, getQuote, type QuoteDetail } from "../api/quotes";
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

export default function QuoteWorkspace() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const v = await runValidation(quoteId);
      setValidations(v);
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

  const lineLabelMap = useMemo(() => {
    const m = new Map<number, string>();
    quote?.lines.forEach((ln) => m.set(ln.id, `${ln.sku_id} (${ln.sku_name})`));
    return m;
  }, [quote]);
  const lineLabel = (id: number | null) =>
    id === null ? "" : (lineLabelMap.get(id) ?? `#${id}`);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-sm text-slate-500 hover:text-slate-800">
            ← Quotes
          </Link>
          <div className="text-sm font-semibold">
            {quote?.number ?? "…"} · {quote?.customer ?? "…"}
          </div>
          <span className="text-xs text-slate-500">{quote?.status}</span>
        </div>
        <div className="text-sm font-medium">
          Subtotal: ${(quote?.subtotal ?? 0).toFixed(2)}
        </div>
      </header>

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
        <div className="fixed bottom-24 left-6 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 z-30">
          {error}
        </div>
      )}
    </div>
  );
}
