import { api } from "./client";

export type Validation = {
  id: number;
  quote_id: number;
  line_id: number | null;
  rule: string;
  severity: "info" | "warn" | "block";
  message: string;
  raw_code: string | null;
  state: "open" | "resolved" | "accepted";
};

export const listValidations = (quoteId: number) =>
  api<Validation[]>(`/api/quotes/${quoteId}/validations`);

export const runValidation = (quoteId: number) =>
  api<Validation[]>(`/api/quotes/${quoteId}/validate`, { method: "POST" });

export const attachDhi = (quoteId: number, lineId: number, code: string) =>
  api<Validation>(`/api/quotes/${quoteId}/dhi`, {
    method: "POST",
    json: { line_id: lineId, code },
  });

export const setValidationState = (
  validationId: number,
  state: "open" | "resolved" | "accepted",
) =>
  api<Validation>(`/api/validations/${validationId}`, {
    method: "PUT",
    json: { state },
  });

type UploadResult = { inserted: number; updated: number };

function uploadCsv(path: string, file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  return api<UploadResult>(path, { method: "POST", body: fd });
}

export const uploadPhasingRules = (f: File) => uploadCsv("/api/phasing-rules", f);
export const uploadAsc606Rules = (f: File) => uploadCsv("/api/asc606-rules", f);
export const uploadDhiCodes = (f: File) => uploadCsv("/api/dhi-codes", f);
