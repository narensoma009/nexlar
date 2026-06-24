import { api } from "./client";

export type CatalogueItem = {
  sku_id: string;
  name: string;
  family: string;
  description: string;
  unit_price: number;
  allowed_phases: number[];
  asc606_class: string;
};

export type UploadResult = { inserted: number; updated: number };

export function uploadCatalogue(file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  return api<UploadResult>("/api/catalogue", { method: "POST", body: fd });
}

export function searchCatalogue(params: {
  q?: string;
  family?: string;
  limit?: number;
}): Promise<CatalogueItem[]> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.family) qs.set("family", params.family);
  if (params.limit) qs.set("limit", String(params.limit));
  return api<CatalogueItem[]>(`/api/catalogue?${qs}`);
}

export const listFamilies = () => api<string[]>("/api/catalogue/families");
