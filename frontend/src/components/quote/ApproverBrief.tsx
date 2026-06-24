import { Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { type ApprovalBrief } from "../../api/quotes";

const LEVEL_BG: Record<ApprovalBrief["risk_level"], string> = {
  low: "bg-gradient-to-r from-green-50 to-emerald-50 border-y border-green-200",
  medium: "bg-gradient-to-r from-amber-50 to-orange-50 border-y border-amber-200",
  high: "bg-gradient-to-r from-red-50 to-rose-50 border-y border-red-200",
};
const LEVEL_BADGE: Record<ApprovalBrief["risk_level"], string> = {
  low: "bg-gradient-to-br from-green-500 to-emerald-600 text-white shadow-green-200",
  medium: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200",
  high: "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200",
};
const REC_META: Record<
  ApprovalBrief["recommendation"],
  { label: string; tone: string; icon: typeof ThumbsUp }
> = {
  approve: { label: "Likely approve", tone: "text-green-700", icon: ThumbsUp },
  review_then_approve: {
    label: "Review then approve",
    tone: "text-amber-700",
    icon: ThumbsUp,
  },
  consider_rejecting: {
    label: "Consider rejecting",
    tone: "text-red-700",
    icon: ThumbsDown,
  },
};

export default function ApproverBrief({
  brief,
  loading,
}: {
  brief: ApprovalBrief | null;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="border-y border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-3 text-xs text-slate-500 flex items-center gap-2">
          <Sparkles size={14} className="animate-pulse" /> Generating approver brief…
        </div>
      </div>
    );
  }
  if (!brief) return null;
  const RecIcon = REC_META[brief.recommendation].icon;
  const risks = brief.factors.filter((f) => f.kind === "risk");
  const strengths = brief.factors.filter((f) => f.kind === "strength");

  return (
    <div className={LEVEL_BG[brief.risk_level]}>
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-start gap-5 flex-wrap">
        <div className="flex flex-col items-center min-w-[88px]">
          <div
            className={
              "w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg " +
              LEVEL_BADGE[brief.risk_level]
            }
          >
            {brief.risk_score}
          </div>
          <div className="text-[11px] text-slate-700 mt-1.5 uppercase tracking-wider font-medium">
            {brief.risk_level} risk
          </div>
        </div>

        <div className="flex-1 min-w-[280px]">
          <div className={`text-sm font-semibold inline-flex items-center gap-1.5 ${REC_META[brief.recommendation].tone}`}>
            <Sparkles size={14} />
            Recommendation: {REC_META[brief.recommendation].label}
            <RecIcon size={14} className="ml-1" />
          </div>
          <div className="text-sm text-slate-800 mt-1.5 leading-relaxed">{brief.rationale}</div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 text-xs">
            {risks.length > 0 && (
              <div className="rounded-lg bg-white/70 border border-red-200 p-2">
                <div className="font-semibold text-red-700 mb-1 inline-flex items-center gap-1">
                  <ThumbsDown size={12} /> Reasons to reject / push back
                </div>
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
              <div className="rounded-lg bg-white/70 border border-green-200 p-2">
                <div className="font-semibold text-green-700 mb-1 inline-flex items-center gap-1">
                  <ThumbsUp size={12} /> Reasons to approve
                </div>
                <ul className="flex flex-col gap-0.5">
                  {strengths.map((f, i) => (
                    <li key={i} className="text-slate-700">• {f.label}</li>
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
