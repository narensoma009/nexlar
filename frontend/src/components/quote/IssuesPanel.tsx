import { useState } from "react";
import { AlertOctagon, AlertTriangle, Info, Play, ShieldAlert } from "lucide-react";
import { setValidationState, type Validation } from "../../api/validations";

type Props = {
  validations: Validation[];
  lineLabel: (lineId: number | null) => string;
  onChange: () => void;
  onRunValidate: () => void;
  validating: boolean;
};

const SEV_STYLE: Record<Validation["severity"], { card: string; chip: string }> = {
  block: {
    card: "border-l-4 border-l-red-500 bg-red-50/60",
    chip: "bg-red-100 text-red-800",
  },
  warn: {
    card: "border-l-4 border-l-amber-500 bg-amber-50/60",
    chip: "bg-amber-100 text-amber-800",
  },
  info: {
    card: "border-l-4 border-l-slate-400 bg-slate-50",
    chip: "bg-slate-100 text-slate-700",
  },
};

const SEV_ICON = {
  block: AlertOctagon,
  warn: AlertTriangle,
  info: Info,
} as const;

export default function IssuesPanel({
  validations,
  lineLabel,
  onChange,
  onRunValidate,
  validating,
}: Props) {
  const [busy, setBusy] = useState<number | null>(null);

  async function setState(id: number, state: "resolved" | "accepted" | "open") {
    setBusy(id);
    try {
      await setValidationState(id, state);
      onChange();
    } finally {
      setBusy(null);
    }
  }

  const open = validations.filter((v) => v.state === "open");
  const resolved = validations.filter((v) => v.state !== "open");
  const blockCount = open.filter((v) => v.severity === "block").length;
  const warnCount = open.filter((v) => v.severity === "warn").length;

  return (
    <div className="flex flex-col gap-2 h-full min-h-0 rounded-2xl bg-white border border-slate-200 shadow-sm p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
            <ShieldAlert size={16} />
          </div>
          <div>
            <div className="text-sm font-semibold">Issues</div>
            <div className="text-[11px] text-slate-500">
              {open.length} open
              {blockCount > 0 && <span className="text-red-600"> · {blockCount} block</span>}
              {warnCount > 0 && <span className="text-amber-700"> · {warnCount} warn</span>}
            </div>
          </div>
        </div>
        <button
          disabled={validating}
          onClick={onRunValidate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-blue-700 disabled:opacity-50"
        >
          <Play size={12} />
          {validating ? "Validating…" : "Validate"}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {validations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-xs text-slate-500">
            Click <em>Validate</em> to check this quote against catalogue, phasing, and ASC-606 rules.
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {open.map((v) => {
              const Icon = SEV_ICON[v.severity];
              const sty = SEV_STYLE[v.severity];
              return (
                <li
                  key={v.id}
                  className={"rounded-lg border border-slate-200 p-3 " + sty.card}
                >
                  <div className="flex items-center gap-1.5 text-[11px] font-medium">
                    <Icon size={13} />
                    <span className={"rounded px-1.5 py-0.5 uppercase tracking-wide " + sty.chip}>
                      {v.severity}
                    </span>
                    <span className="text-slate-400 font-mono">{v.rule}</span>
                  </div>
                  <div className="text-sm text-slate-800 mt-1.5">{v.message}</div>
                  {v.line_id !== null && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      on line: {lineLabel(v.line_id)}
                    </div>
                  )}
                  <div className="mt-2 flex gap-2 text-[11px]">
                    <button
                      disabled={busy === v.id}
                      onClick={() => setState(v.id, "resolved")}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 hover:bg-slate-50"
                    >
                      Mark resolved
                    </button>
                    <button
                      disabled={busy === v.id}
                      onClick={() => setState(v.id, "accepted")}
                      className="rounded border border-slate-300 bg-white px-2 py-0.5 hover:bg-slate-50"
                    >
                      Accept w/ justification
                    </button>
                  </div>
                </li>
              );
            })}
            {resolved.length > 0 && (
              <li className="text-[11px] font-medium text-slate-500 mt-1">
                Closed ({resolved.length})
              </li>
            )}
            {resolved.map((v) => (
              <li key={v.id} className="text-[11px] text-slate-500 line-through px-1">
                {v.message}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
