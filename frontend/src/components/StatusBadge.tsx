import { STATUS_META } from "../lib/status";
import type { QuoteStatus } from "../api/quotes";

export default function StatusBadge({ status, size = "sm" }: { status: QuoteStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const pad = size === "md" ? "px-2.5 py-1 text-xs" : "px-2 py-0.5 text-[11px]";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-medium ${meta.pill} ${pad}`}>
      <Icon size={size === "md" ? 14 : 12} />
      {meta.label}
    </span>
  );
}
