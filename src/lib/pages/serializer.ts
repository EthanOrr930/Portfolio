import type { PageData } from "./types";

export function validatePageData(data: unknown): data is PageData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (d.version !== 1) return false;
  if (!d.settings || typeof d.settings !== "object") return false;
  if (!Array.isArray(d.keyframes) || d.keyframes.length === 0) return false;
  return true;
}

export function serializePageData(data: PageData): string {
  return JSON.stringify(data, null, 2);
}

export function deserializePageData(json: string): PageData {
  const parsed = JSON.parse(json);
  if (!validatePageData(parsed)) {
    throw new Error("Invalid page data format");
  }
  return parsed;
}
