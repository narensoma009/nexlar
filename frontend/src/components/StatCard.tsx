import type { LucideIcon } from "lucide-react";

type Props = {
  icon: LucideIcon;
  label: string;
  value: number | string;
  sub?: string;
  tone: "slate" | "blue" | "amber" | "green" | "emerald" | "red";
};

const SWATCH: Record<Props["tone"], string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  green: "bg-green-100 text-green-700",
  emerald: "bg-emerald-100 text-emerald-700",
  red: "bg-red-100 text-red-700",
};

const RING: Record<Props["tone"], string> = {
  slate: "border-slate-200",
  blue: "border-blue-200",
  amber: "border-amber-200",
  green: "border-green-200",
  emerald: "border-emerald-200",
  red: "border-red-200",
};

export default function StatCard({ icon: Icon, label, value, sub, tone }: Props) {
  return (
    <div
      className={
        "flex items-center gap-3 rounded-2xl bg-white border px-4 py-3 shadow-sm hover:shadow transition " +
        RING[tone]
      }
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${SWATCH[tone]}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-slate-500 truncate">{label}</div>
        <div className="text-xl font-semibold text-slate-900 leading-tight">{value}</div>
        {sub && <div className="text-[11px] text-slate-400 truncate">{sub}</div>}
      </div>
    </div>
  );
}
