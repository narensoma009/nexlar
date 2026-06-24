import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { addLine, getQuote, type QuoteDetail } from "../api/quotes";
import { type CatalogueItem } from "../api/catalogue";
import CatalogueBrowser from "../components/quote/CatalogueBrowser";
import LinesPanel from "../components/quote/LinesPanel";

export default function QuoteWorkspace() {
  const { id } = useParams<{ id: string }>();
  const quoteId = Number(id);
  const [quote, setQuote] = useState<QuoteDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setQuote(await getQuote(quoteId));
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
      const next = await addLine(quoteId, { sku_id: item.sku_id, phase: initialPhase });
      setQuote(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="border-b border-slate-200 bg-white px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="text-sm text-slate-500 hover:text-slate-800"
          >
            ← Quotes
          </Link>
          <div className="text-sm font-semibold">
            {quote?.number ?? "…"} · {quote?.customer ?? "…"}
          </div>
          <span className="text-xs text-slate-500">{quote?.status}</span>
        </div>
        <div className="text-sm font-medium">
          Subtotal: $
          {(quote?.subtotal ?? 0).toFixed(2)}
        </div>
      </header>

      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4 p-4">
        <aside className="min-h-[60vh]">
          <CatalogueBrowser onAdd={onAdd} />
        </aside>
        <section className="min-h-[60vh]">
          {quote && <LinesPanel quoteId={quoteId} lines={quote.lines} onChange={refresh} />}
        </section>
      </main>

      {error && (
        <div className="fixed bottom-24 left-6 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700 z-30">
          {error}
        </div>
      )}
    </div>
  );
}
