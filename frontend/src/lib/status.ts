import {
  CheckCircle2,
  Clock,
  FileEdit,
  ShieldCheck,
  SendHorizontal,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { QuoteStatus } from "../api/quotes";

export type StatusMeta = {
  label: string;
  icon: LucideIcon;
  pill: string;       // small badge background
  ring: string;       // colored border for cards
  swatch: string;     // big color swatch (e.g. for stats card icon background)
  hint?: string;
};

export const STATUS_META: Record<QuoteStatus, StatusMeta> = {
  draft: {
    label: "Draft",
    icon: FileEdit,
    pill: "bg-slate-100 text-slate-700",
    ring: "border-slate-200",
    swatch: "bg-slate-100 text-slate-600",
  },
  submitted: {
    label: "Submitted",
    icon: SendHorizontal,
    pill: "bg-blue-100 text-blue-700",
    ring: "border-blue-200",
    swatch: "bg-blue-100 text-blue-600",
  },
  pending_manager: {
    label: "Pending manager",
    icon: Clock,
    pill: "bg-amber-100 text-amber-800",
    ring: "border-amber-200",
    swatch: "bg-amber-100 text-amber-700",
    hint: "Awaiting manager review",
  },
  auto_approved: {
    label: "Auto-approved",
    icon: ShieldCheck,
    pill: "bg-green-100 text-green-800",
    ring: "border-green-200",
    swatch: "bg-green-100 text-green-700",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    pill: "bg-emerald-100 text-emerald-800",
    ring: "border-emerald-200",
    swatch: "bg-emerald-100 text-emerald-700",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    pill: "bg-red-100 text-red-800",
    ring: "border-red-200",
    swatch: "bg-red-100 text-red-700",
    hint: "AE action required",
  },
};

export function currency(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n.toFixed(0)}`;
}

export function currencyFull(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function waitLabel(hours: number): string {
  if (!hours || hours < 1) return "just now";
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = Math.floor(hours / 24);
  const rem = Math.round(hours - days * 24);
  return rem === 0 ? `${days}d` : `${days}d ${rem}h`;
}

export const PRIORITY_META: Record<
  "low" | "medium" | "high",
  { label: string; pill: string; dot: string; badge: string }
> = {
  high: {
    label: "High",
    pill: "bg-red-100 text-red-800 border border-red-200",
    dot: "bg-red-500",
    badge: "bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-red-200",
  },
  medium: {
    label: "Medium",
    pill: "bg-amber-100 text-amber-800 border border-amber-200",
    dot: "bg-amber-500",
    badge: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-200",
  },
  low: {
    label: "Low",
    pill: "bg-slate-100 text-slate-700 border border-slate-200",
    dot: "bg-slate-400",
    badge: "bg-gradient-to-br from-slate-400 to-slate-500 text-white shadow-slate-200",
  },
};
