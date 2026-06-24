import { api } from "./client";

export type Message = { role: "user" | "assistant"; content: string };
export type ChatResponse = { reply: string; used_context: string[] };

export function chat(messages: Message[]): Promise<ChatResponse> {
  return api<ChatResponse>("/api/chat", {
    method: "POST",
    json: { messages },
  });
}

export type Doc = { id: number; filename: string; row_count: number };

export const listDocs = () => api<Doc[]>("/api/documents");

export function uploadDoc(file: File): Promise<Doc> {
  const fd = new FormData();
  fd.append("file", file);
  return api<Doc>("/api/documents", { method: "POST", body: fd });
}

export const deleteDoc = (id: number) =>
  api<void>(`/api/documents/${id}`, { method: "DELETE" });
