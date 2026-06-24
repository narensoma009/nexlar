import { type ApprovalBrief } from "../../api/quotes";

const LEVEL_BG: Record<ApprovalBrief["risk_level"], string> = {
  low: "bg-green-50 border-green-200",
  medium: "bg-amber-50 border-amber-200",
  high: "bg-red-50 border-red-200",
};
const LEVEL_BADGE: Record<ApprovalBrief["risk_level"], string> = {
  low: "bg-green-600 text-white",
  medium: "bg-amber-500 text-white",
  high: "bg-red-600 text-white",
};
const REC_LABEL: Record<ApprovalBrief["recommendation"], string> = {
  approve: "Likely approve",
  review_then_approve: "Review then approve",
  consider_rejecting: "Consider rejecting",
};

type Props = { brief: ApprovalBrief | null; loading: boolean };

export default function ApproverBrief({ brief, loading }: Props) {
  if (loading) {
    return (
      <div className="border-y border-slate-200 bg-slate-50 px-6 py-3 text-xs text-slate-500">
        Generating approver brief…
      </div>
    );
  }
  if (!brief) return null;
  const risks = brief.factors.filter((f) => f.kind === "risk");
  const strengths = brief.factors.filter((f) => f.kind === "strength");
  return (
    <div className={"border-y px-6 py-3 " + LEVEL_BG[brief.risk_level]}>
      <div className="flex items-start gap-4 flex-wrap">
        <div className="flex flex-col items-center min-w-[80px]">
          <div
            className={
              "w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold " +
              LEVEL_BADGE[brief.risk_level]
            }
          >
            {brief.risk_score}
          </div>
          <div className="text-[11px] text-slate-600 mt-1 uppercase tracking-wide">
            {brief.risk_level} risk
          </div>
        </div>
        <div className="flex-1 min-w-[280px]">
          <div className="text-sm font-semibold mb-1">
            Recommendation: {REC_LABEL[brief.recommendation]}
          </div>
          <div className="text-sm text-slate-700 mb-2">{brief.rationale}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {risks.length > 0 && (
              <div>
                <div className="font-medium text-red-700 mb-1">Reasons to reject / push back</div>
                <ul className="flex flex-col gap-0.5">
                  {risks.map((f, i) => (
                    <li key={i} className="text-slate-700">
                      • {f.label}
                      {f.weight > 0 && <span className="text-slate-400"> (+{f.weight})</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {strengths.length > 0 && (
              <div>
                <div className="font-medium text-green-700 mb-1">Reasons to approve</div>
                <ul className="flex flex-col gap-0.5">
                  {strengths.map((f, i) => (
                    <li key={i} className="text-slate-700">
                      • {f.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
