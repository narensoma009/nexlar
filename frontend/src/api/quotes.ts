import { api } from "./client";

export type QuoteStatus =
  | "draft"
  | "submitted"
  | "auto_approved"
  | "pending_manager"
  | "approved"
  | "rejected";

export type PriorityLevel = "low" | "medium" | "high";

export type QuoteSummary = {
  id: number;
  number: string;
  customer: string;
  ae: string;
  status: QuoteStatus;
  created_at: string;
  updated_at: string;
  line_count: number;
  subtotal: number;
  submit_comment: string;
  submitted_at: string | null;
  routing_reasons: string[];
  decided_by: string;
  decided_at: string | null;
  decision_comment: string;
  priority_score: number;
  priority_level: PriorityLevel;
  wait_hours: number;
};

export type QuoteLine = {
  id: number;
  sku_id: string;
  sku_name: string;
  family: string;
  qty: number;
  phase: number;
  justification: string;
  unit_price: number;
  unit_price_override: number | null;
  line_total: number;
  allowed_phases: number[];
};

export type QuoteDetail = QuoteSummary & { lines: QuoteLine[] };

export const listQuotes = () => api<QuoteSummary[]>("/api/quotes");

export const createQuote = (customer: string, ae: string) =>
  api<QuoteDetail>("/api/quotes", { method: "POST", json: { customer, ae } });

export const getQuote = (id: number) => api<QuoteDetail>(`/api/quotes/${id}`);

export const updateQuote = (
  id: number,
  patch: Partial<{ customer: string; ae: string; status: string }>,
) => api<QuoteDetail>(`/api/quotes/${id}`, { method: "PUT", json: patch });

export const deleteQuote = (id: number) =>
  api<void>(`/api/quotes/${id}`, { method: "DELETE" });

export const addLine = (
  quoteId: number,
  body: { sku_id: string; qty?: number; phase?: number; justification?: string },
) => api<QuoteDetail>(`/api/quotes/${quoteId}/lines`, { method: "POST", json: body });

export const updateLine = (
  quoteId: number,
  lineId: number,
  patch: Partial<{
    qty: number;
    phase: number;
    justification: string;
    unit_price_override: number | null;
  }>,
) =>
  api<QuoteDetail>(`/api/quotes/${quoteId}/lines/${lineId}`, {
    method: "PUT",
    json: patch,
  });

export const deleteLine = (quoteId: number, lineId: number) =>
  api<void>(`/api/quotes/${quoteId}/lines/${lineId}`, { method: "DELETE" });

export const submitQuote = (id: number, submit_comment: string) =>
  api<QuoteDetail>(`/api/quotes/${id}/submit`, {
    method: "POST",
    json: { submit_comment },
  });

export const approveQuote = (id: number, decided_by: string, decision_comment: string) =>
  api<QuoteDetail>(`/api/quotes/${id}/approve`, {
    method: "POST",
    json: { decided_by, decision_comment },
  });

export const rejectQuote = (id: number, decided_by: string, decision_comment: string) =>
  api<QuoteDetail>(`/api/quotes/${id}/reject`, {
    method: "POST",
    json: { decided_by, decision_comment },
  });

export type ApprovalFactor = {
  label: string;
  weight: number;
  kind: "risk" | "strength";
};

export type ApprovalBrief = {
  risk_score: number;
  risk_level: "low" | "medium" | "high";
  recommendation: "approve" | "review_then_approve" | "consider_rejecting";
  rationale: string;
  factors: ApprovalFactor[];
};

export const getApprovalBrief = (id: number) =>
  api<ApprovalBrief>(`/api/quotes/${id}/approval-brief`);
