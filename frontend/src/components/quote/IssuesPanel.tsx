import { useState } from "react";
import { setValidationState, type Validation } from "../../api/validations";

type Props = {
  validations: Validation[];
  lineLabel: (lineId: number | null) => string;
  onChange: () => void;
  onRunValidate: () => void;
  validating: boolean;
};

const severityBadge: Record<Validation["severity"], string> = {
  block: "bg-red-50 text-red-700 border-red-200",
  warn: "bg-amber-50 text-amber-700 border-amber-200",
  info: "bg-slate-50 text-slate-700 border-slate-200",
};

const severityIcon: Record<Validation["severity"], string> = {
  block: "⛔",
  warn: "⚠",
  info: "ℹ",
};

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
    <div className="flex flex-col gap-2 h-full min-h-0">
      <div className="flex items-center justify-between">
        <div className="text-sm font-medium">
          Issues ({open.length} open
          {blockCount > 0 && <span className="text-red-600"> · {blockCount} block</span>}
          {warnCount > 0 && <span className="text-amber-600"> · {warnCount} warn</span>}
          )
        </div>
        <button
          disabled={validating}
          onClick={onRunValidate}
          className="rounded-lg bg-blue-600 px-3 py-1 text-xs font-medium text-white disabled:opacity-50"
        >
          {validating ? "Validating…" : "Validate"}
        </button>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-slate-200 bg-white">
        {validations.length === 0 ? (
          <div className="p-3 text-xs text-slate-400">
            Click <em>Validate</em> to check this quote against catalogue, phasing, and ASC-606 rules.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {open.map((v) => (
              <li key={v.id} className={"p-3 border-l-4 " + severityBadge[v.severity]}>
                <div className="text-xs font-medium flex items-center gap-1">
                  <span>{severityIcon[v.severity]}</span>
                  <span className="uppercase">{v.severity}</span>
                  <span className="text-slate-400">· {v.rule}</span>
                </div>
                <div className="text-sm mt-1">{v.message}</div>
                {v.line_id !== null && (
                  <div className="text-xs text-slate-500 mt-1">
                    on line: {lineLabel(v.line_id)}
                  </div>
                )}
                <div className="mt-2 flex gap-2 text-xs">
                  <button
                    disabled={busy === v.id}
                    onClick={() => setState(v.id, "resolved")}
                    className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
                  >
                    Mark resolved
                  </button>
                  <button
                    disabled={busy === v.id}
                    onClick={() => setState(v.id, "accepted")}
                    className="rounded border border-slate-300 px-2 py-0.5 hover:bg-slate-50"
                  >
                    Accept w/ justification
                  </button>
                </div>
              </li>
            ))}
            {resolved.length > 0 && (
              <li className="bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
                Closed ({resolved.length})
              </li>
            )}
            {resolved.map((v) => (
              <li key={v.id} className="p-3 text-xs text-slate-500 line-through">
                <div className="flex items-center gap-1">
                  <span>{severityIcon[v.severity]}</span>
                  <span>{v.message}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
