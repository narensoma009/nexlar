import { useState } from "react";
import { deleteLine, updateLine, type QuoteLine } from "../../api/quotes";

type Props = {
  quoteId: number;
  lines: QuoteLine[];
  onChange: () => void;
  onAttachDhi?: (lineId: number) => void;
};

export default function LinesPanel({ quoteId, lines, onChange, onAttachDhi }: Props) {
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
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="text-sm font-medium">Lines ({lines.length})</div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {lines.length === 0 ? (
          <div className="p-3 text-xs text-slate-400">
            Click a catalogue item on the left to add a line.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {lines.map((ln) => {
              const phaseOk =
                ln.allowed_phases.length === 0 ||
                ln.allowed_phases.includes(ln.phase);
              return (
                <li key={ln.id} className="p-3 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">
                        {ln.sku_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {ln.sku_id} · {ln.family} · ${ln.unit_price.toFixed(2)} ea
                      </div>
                    </div>
                    <div className="text-sm font-medium whitespace-nowrap">
                      ${ln.line_total.toFixed(2)}
                    </div>
                    <div className="flex flex-col items-end gap-1 text-xs">
                      {onAttachDhi && (
                        <button
                          onClick={() => onAttachDhi(ln.id)}
                          className="text-slate-500 hover:underline"
                        >
                          + DHI code
                        </button>
                      )}
                      <button
                        disabled={busy === ln.id}
                        onClick={() => remove(ln.id)}
                        className="text-red-600 hover:underline disabled:opacity-50"
                      >
                        remove
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <label className="flex items-center gap-1">
                      qty
                      <input
                        type="number"
                        min={1}
                        value={ln.qty}
                        onChange={(e) =>
                          patch(ln.id, { qty: Number(e.target.value) || 1 })
                        }
                        className="w-16 rounded border border-slate-300 px-2 py-0.5"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      phase
                      <input
                        type="number"
                        min={1}
                        value={ln.phase}
                        onChange={(e) =>
                          patch(ln.id, { phase: Number(e.target.value) || 1 })
                        }
                        className={
                          "w-14 rounded border px-2 py-0.5 " +
                          (phaseOk
                            ? "border-slate-300"
                            : "border-amber-400 bg-amber-50")
                        }
                      />
                      {ln.allowed_phases.length > 0 && (
                        <span className="text-slate-400">
                          ({ln.allowed_phases.join(",")})
                        </span>
                      )}
                    </label>
                  </div>
                  <textarea
                    value={ln.justification}
                    onChange={(e) =>
                      patch(ln.id, { justification: e.target.value })
                    }
                    placeholder="Why is this line included?"
                    rows={2}
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
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
