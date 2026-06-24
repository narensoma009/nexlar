import { api } from "./client";

export type QuoteSummary = {
  id: number;
  number: string;
  customer: string;
  ae: string;
  status: string;
  created_at: string;
  updated_at: string;
  line_count: number;
  subtotal: number;
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

export const updateQuote = (id: number, patch: Partial<{ customer: string; ae: string; status: string }>) =>
  api<QuoteDetail>(`/api/quotes/${id}`, { method: "PUT", json: patch });

export const deleteQuote = (id: number) =>
  api<void>(`/api/quotes/${id}`, { method: "DELETE" });

export const addLine = (
  quoteId: number,
  body: { sku_id: string; qty?: number; phase?: number; justification?: string },
) =>
  api<QuoteDetail>(`/api/quotes/${quoteId}/lines`, { method: "POST", json: body });

export const updateLine = (
  quoteId: number,
  lineId: number,
  patch: Partial<{ qty: number; phase: number; justification: string; unit_price_override: number | null }>,
) =>
  api<QuoteDetail>(`/api/quotes/${quoteId}/lines/${lineId}`, { method: "PUT", json: patch });

export const deleteLine = (quoteId: number, lineId: number) =>
  api<void>(`/api/quotes/${quoteId}/lines/${lineId}`, { method: "DELETE" });
