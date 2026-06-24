import { useState } from "react";
import { Hash, Layers, ListChecks, Tag, Trash2 } from "lucide-react";
import { deleteLine, updateLine, type QuoteLine } from "../../api/quotes";
import { currencyFull } from "../../lib/status";

type Props = {
  quoteId: number;
  lines: QuoteLine[];
  onChange: () => void;
  onAttachDhi?: (lineId: number) => void;
  readOnly?: boolean;
};

export default function LinesPanel({
  quoteId,
  lines,
  onChange,
  onAttachDhi,
  readOnly = false,
}: Props) {
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function patch(lineId: number, patch: Partial<QuoteLine>) {
    setBusy(lineId);
    setError(null);
    try {
      await updateLine(quoteId, lineId, patch as any);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(lineId: number) {
    setBusy(lineId);
    try {
      await deleteLine(quoteId, lineId);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 rounded-2xl bg-white border border-slate-200 shadow-sm p-3">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
          <ListChecks size={16} />
        </div>
        <div className="text-sm font-semibold">Lines</div>
        <span className="text-xs text-slate-400">({lines.length})</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-400">
            {readOnly ? "This quote has no lines." : "Click a catalogue item on the left to add a line."}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {lines.map((ln) => {
              const phaseOk =
                ln.allowed_phases.length === 0 || ln.allowed_phases.includes(ln.phase);
              const justOk = (ln.justification || "").trim().length > 0;
              const qtyOk = ln.qty >= 1;
              return (
                <li
                  key={ln.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col gap-2 hover:border-slate-300 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold truncate text-slate-900">
                        {ln.sku_name}
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap gap-x-2 mt-0.5">
                        <span className="font-mono">{ln.sku_id}</span>
                        <span>·</span>
                        <span>{ln.family}</span>
                        <span>·</span>
                        <span>{currencyFull(ln.unit_price)} ea</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900 whitespace-nowrap">
                        {currencyFull(ln.line_total)}
                      </div>
                      <div className="mt-1 flex justify-end gap-2">
                        {onAttachDhi && !readOnly && (
                          <button
                            onClick={() => onAttachDhi(ln.id)}
                            className="text-[11px] text-slate-500 hover:text-blue-600 hover:underline"
                          >
                            + DHI code
                          </button>
                        )}
                        {!readOnly && (
                          <button
                            disabled={busy === ln.id}
                            onClick={() => remove(ln.id)}
                            className="text-slate-400 hover:text-red-600 disabled:opacity-50"
                            title="Remove line"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 bg-slate-50">
                      <Hash size={11} className="text-slate-400" />
                      <span className="text-slate-500">qty</span>
                      <input
                        type="number"
                        min={1}
                        value={ln.qty}
                        disabled={readOnly}
                        onChange={(e) =>
                          patch(ln.id, { qty: Number(e.target.value) || 1 })
                        }
                        className={
                          "w-14 rounded border px-1 py-0.5 text-center " +
                          (qtyOk ? "border-slate-300" : "border-red-400 bg-red-50") +
                          (readOnly ? " bg-slate-50 cursor-not-allowed" : "")
                        }
                      />
                    </label>
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 bg-slate-50">
                      <Layers size={11} className="text-slate-400" />
                      <span className="text-slate-500">phase</span>
                      <input
                        type="number"
                        min={1}
                        value={ln.phase}
                        disabled={readOnly}
                        onChange={(e) =>
                          patch(ln.id, { phase: Number(e.target.value) || 1 })
                        }
                        className={
                          "w-12 rounded border px-1 py-0.5 text-center " +
                          (phaseOk
                            ? "border-slate-300"
                            : "border-amber-400 bg-amber-50") +
                          (readOnly ? " bg-slate-50 cursor-not-allowed" : "")
                        }
                      />
                      {ln.allowed_phases.length > 0 && (
                        <span className="text-slate-400">
                          ({ln.allowed_phases.join(",")})
                        </span>
                      )}
                    </label>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-500">
                      <Tag size={11} /> Justification
                      {!justOk && !readOnly && (
                        <span className="text-amber-700 ml-1">· required for auto-approval</span>
                      )}
                    </div>
                    <textarea
                      value={ln.justification}
                      disabled={readOnly}
                      onChange={(e) =>
                        patch(ln.id, { justification: e.target.value })
                      }
                      placeholder={readOnly ? "(no justification provided)" : "Why is this line included?"}
                      rows={2}
                      className={
                        "rounded-lg border px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 " +
                        (justOk
                          ? "border-slate-300"
                          : "border-amber-300 bg-amber-50/40") +
                        (readOnly ? " bg-slate-50 cursor-not-allowed" : "")
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {error && <div className="text-xs text-red-600">{error}</div>}
    </div>
  );
}
