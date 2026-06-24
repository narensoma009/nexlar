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
