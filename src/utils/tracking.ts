// utils/tracking.ts
export type TrackingEntry = { url?: string; number?: string; company?: string };

export function extractTrackingLinks(val: unknown): { url: string; number?: string; company?: string }[] {
  if (!Array.isArray(val)) return [];
  const seen = new Set<string>();
  const out: { url: string; number?: string; company?: string }[] = [];

  for (const item of val as unknown[]) {
    if (item && typeof item === "object") {
      const { url, number, company } = item as TrackingEntry;
      if (typeof url === "string" && url.startsWith("http") && !seen.has(url)) {
        seen.add(url);
        out.push({ url, number, company });
      }
    } else if (typeof item === "string" && item.startsWith("http") && !seen.has(item)) {
      seen.add(item);
      out.push({ url: item });
    }
  }
  return out;
}
